-- ============================================================
-- E2 · `chapar()` — el check-in verificado en el servidor
--
-- Pieza de mayor riesgo arquitectónico del proyecto (riesgo #4). Si el check-in
-- no es confiable DESDE EL SERVIDOR, la promesa B2B —"te demuestro con GPS que
-- la gente vino"— no existe. ADR-0001: el cliente nunca escribe estas tablas.
--
-- Esta versión incorpora una revisión adversarial de cinco ángulos que encontró
-- 3 bloqueantes y 10 defectos serios sobre el primer borrador. Los arreglos que
-- no se explican solos están anotados donde viven.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Dos agujeros que esta función destapa y que no son suyos
-- ------------------------------------------------------------

-- (a) El jugador podía escribirse su propia Calle.
--     Supabase concede por default privileges TODAS las columnas a
--     `authenticated`, y la política de perfil solo filtra por fila
--     (`auth.uid() = id`), no por columna. Un `PATCH /rest/v1/profiles` con
--     `{"calle_xp": 999999}` devolvía 204. Toda la aritmética de esta función
--     era decorativa mientras eso siguiera abierto — y como `profiles.calle_xp`
--     se lee en rankings y alcaldías, el número inflado además era público.
revoke update (calle_xp, rango, id, created_at) on public.profiles from anon, authenticated;

-- (b) La capa 4 no podía marcar nada.
--     El CHECK existente no admite 'revisar', así que el INSERT con ese valor
--     levantaba `check_violation` (23514), que ningún handler atrapaba: la
--     transacción entera abortaba y el rollback se llevaba puesta la fila de
--     `checkin_intentos`. O sea: el único evento que la capa 4 sabe detectar
--     era el único que garantizaba no quedar registrado.
alter table public.mission_completions
  drop constraint if exists mission_completions_verificacion_check;
alter table public.mission_completions
  add constraint mission_completions_verificacion_check
  check (verificacion in ('auto', 'revisar', 'ia_ok', 'ia_rechazada', 'manual'));

-- ------------------------------------------------------------
-- 1. Bitácora de intentos
--
-- Los rechazos no pueden ir a `mission_completions`: su `unique(user_id,
-- mission_id)` bloquearía el reintento legítimo de quien se acercó mal.
--
-- SIN FK a `missions` a propósito: la rama que registra un intento contra una
-- vuelta inexistente es, por definición, la que viola esa FK. Una bitácora de
-- intentos tiene que poder anotar intentos contra ids que no existen — es su
-- razón de ser. La integridad referencial la aporta `mission_completions`, que
-- sí es el registro de hechos.
-- ------------------------------------------------------------
create table if not exists public.checkin_intentos (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles(id),
  mission_id  bigint,
  resultado   text not null,
  distancia_m numeric,
  ubicacion   extensions.geography(point, 4326),
  detalle     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

alter table public.checkin_intentos drop constraint if exists checkin_intentos_mission_id_fkey;

create index if not exists checkin_intentos_user_idx
  on public.checkin_intentos (user_id, created_at desc);
create index if not exists checkin_intentos_rechazos_idx
  on public.checkin_intentos (resultado, created_at desc)
  where resultado <> 'ok';

alter table public.checkin_intentos enable row level security;

drop policy if exists "intentos propios" on public.checkin_intentos;
create policy "intentos propios" on public.checkin_intentos
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2. La función
--
-- `search_path = public, extensions, pg_temp` no es decorativo: PostGIS está en
-- `extensions` (verificado con pg_extension), y un security definer con
-- `search_path = public` a secas falla en RUNTIME con "st_distance does not
-- exist" aunque el mismo SQL ande en el editor. `pg_temp` va último para que una
-- tabla temporal no pueda suplantar a una real.
-- ------------------------------------------------------------
create or replace function public.chapar(
  p_mission_id    bigint,
  p_lat           double precision,
  p_lng           double precision,
  -- No es una URL: es el `name` del objeto DENTRO del bucket `chapas`, con
  -- formato `<uid>/<mission_id>/<archivo>`. El nombre viejo (`p_foto_url`) hacía
  -- que el cliente mandara `fullPath` o una URL firmada y el rechazo se leyera
  -- como fraude en vez de como contrato mal entendido.
  p_foto_path     text default null,
  -- Capa 3 del anti-fraude. Se reserva en el contrato AHORA, antes de que
  -- exista `app/src/lib/chapar.ts`: si el parámetro no está desde el principio,
  -- agregarlo después obliga a versionar la firma con clientes ya en la calle.
  p_mock_location boolean default false,
  p_precision_m   numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user      uuid := auth.uid();
  v_ahora     timestamptz := now();
  -- current_date es UTC en Supabase: una chapada a las 20:00 de Lima cae al día
  -- siguiente y la racha se rompe sola, con el usuario jurando que jugó.
  v_hoy_lima  date := (v_ahora at time zone 'America/Lima')::date;
  v_hora_lima int  := extract(hour from (v_ahora at time zone 'America/Lima'))::int;
  v_ventana   text;
  v_es_de_dia boolean;
  v_punto     extensions.geography;
  v_m         record;
  v_dist      numeric;
  v_ultimo    record;
  v_seg       numeric;
  v_kmh       numeric;
  v_card      bigint;
  v_nueva     boolean := false;
  v_dias      int;
  v_xp        int;
  v_intentos  int;
  v_sospecha  boolean := false;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'motivo', 'sin_sesion',
      'mensaje', 'Tenés que iniciar sesión para chapar.');
  end if;

  -- Serializa las chapadas de UN usuario. Sin esto, N llamadas simultáneas leen
  -- la misma línea de base y ninguna ve a las otras: la capa 4 (velocidad
  -- imposible) se anula sola disparando en paralelo, y `streaks` corre carrera.
  -- Cuesta una chapada por usuario a la vez, que para este producto es nada.
  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));

  -- Capa 3. Se rechaza duro: un GPS falseado no es un borde, es la definición
  -- del fraude que el producto vende que detecta.
  if p_mock_location then
    insert into checkin_intentos (user_id, mission_id, resultado, detalle)
      values (v_user, p_mission_id, 'mock_location',
              jsonb_build_object('precision_m', p_precision_m));
    return jsonb_build_object('ok', false, 'motivo', 'mock_location',
      'mensaje', 'Detectamos ubicación simulada. Desactivala para chapar.');
  end if;

  -- Tope de intentos. La bitácora se escribía en diez lugares y no se leía en
  -- ninguno: el encabezado prometía detectar "a alguien probando 40 veces desde
  -- su casa" y nada lo frenaba.
  select count(*) into v_intentos from checkin_intentos
   where user_id = v_user and created_at > v_ahora - interval '10 minutes';
  if v_intentos > 20 then
    insert into checkin_intentos (user_id, mission_id, resultado)
      values (v_user, p_mission_id, 'demasiados_intentos');
    return jsonb_build_object('ok', false, 'motivo', 'demasiados_intentos',
      'mensaje', 'Demasiados intentos. Esperá un momento.');
  end if;

  -- Coordenadas. `st_makepoint` es STRICT: con NULL devuelve NULL, y
  -- `NULL > 75` es NULL, así que el `if` del geofence no entra y la capa 2 se
  -- apaga sola con un parámetro. Y PostGIS NO valida rangos: envuelve
  -- (verificado: st_makepoint(500,200) → POINT(140 -20)), así que un lng de 500
  -- se convierte en un lugar del planeta en vez de en un error.
  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90
     or p_lng not between -180 and 180 then
    insert into checkin_intentos (user_id, mission_id, resultado, detalle)
      values (v_user, p_mission_id, 'coordenadas_invalidas',
              jsonb_build_object('lat', p_lat, 'lng', p_lng, 'precision_m', p_precision_m));
    return jsonb_build_object('ok', false, 'motivo', 'coordenadas_invalidas',
      'mensaje', 'No pudimos leer tu ubicación. Probá de nuevo.');
  end if;

  -- El documento maestro nombra las tres ventanas pero nunca define sus bordes.
  -- Se fijan acá, en un solo lugar.
  v_ventana   := case when v_hora_lima between 5 and 11 then 'mañana'
                      when v_hora_lima between 12 and 18 then 'tarde'
                      else 'noche' end;
  -- Lima casi no tiene variación estacional: amanece ~06:00 y oscurece ~18:15
  -- todo el año, y Perú no cambia de hora. 06-17 es "de día" con margen.
  v_es_de_dia := v_hora_lima between 6 and 17;

  -- st_makepoint toma (lng, lat). Invertirlos manda al usuario al Atlántico y
  -- todo check-in da "lejos" — un bug que se lee como GPS malo, no como bug.
  v_punto := extensions.st_makepoint(p_lng, p_lat)::extensions.geography;

  -- security definer saltea RLS: cada condición se re-chequea a mano.
  select m.id, m.estado, m.ventana_horaria, m.calle_xp, m.requiere_foto,
         m.valida_desde, m.valida_hasta,
         p.id as poi_id, p.activo as poi_activo, p.ubicacion as poi_ubicacion, p.nombre as poi_nombre,
         c.activa as celda_activa, c.nivel_seguridad
    into v_m
    from missions m
    join pois  p on p.id = m.poi_id
    join cells c on c.h3_index = m.h3_index
   where m.id = p_mission_id;

  if not found then
    insert into checkin_intentos (user_id, mission_id, resultado, ubicacion)
      values (v_user, p_mission_id, 'vuelta_inexistente', v_punto);
    return jsonb_build_object('ok', false, 'motivo', 'vuelta_inexistente',
      'mensaje', 'Esa Vuelta no existe.');
  end if;

  if v_m.estado <> 'activa' or not v_m.poi_activo then
    insert into checkin_intentos (user_id, mission_id, resultado, ubicacion)
      values (v_user, p_mission_id, 'vuelta_no_disponible', v_punto);
    return jsonb_build_object('ok', false, 'motivo', 'vuelta_no_disponible',
      'mensaje', 'Esta Vuelta ya no está disponible.');
  end if;

  if (v_m.valida_desde is not null and v_hoy_lima < v_m.valida_desde)
     or (v_m.valida_hasta is not null and v_hoy_lima > v_m.valida_hasta) then
    insert into checkin_intentos (user_id, mission_id, resultado, ubicacion)
      values (v_user, p_mission_id, 'fuera_de_temporada', v_punto);
    return jsonb_build_object('ok', false, 'motivo', 'fuera_de_temporada',
      'mensaje', 'Esta Vuelta es de temporada y hoy no corre.');
  end if;

  -- Modo seguro (regla dura #4). `nivel_seguridad is distinct from 1` en vez de
  -- `>= 3`: la columna no tiene dominio declarado, y un 7 por error de carga
  -- debe cerrar la puerta, no abrirla.
  if not v_m.celda_activa
     or v_m.nivel_seguridad is null
     or (v_m.nivel_seguridad is distinct from 1
         and not (v_m.nivel_seguridad = 2 and v_es_de_dia)) then
    insert into checkin_intentos (user_id, mission_id, resultado, ubicacion, detalle)
      values (v_user, p_mission_id, 'zona_no_habilitada', v_punto,
              jsonb_build_object('nivel_seguridad', v_m.nivel_seguridad, 'hora_lima', v_hora_lima));
    return jsonb_build_object('ok', false, 'motivo', 'zona_no_habilitada',
      'mensaje', 'Esta cuadra no está habilitada a esta hora.');
  end if;

  -- `array_position(...) is null` en vez de `= any`: con un NULL adentro del
  -- array, `= any` devuelve NULL y el `not (...)` no entra — la vuelta quedaría
  -- abierta las 24 horas en silencio.
  if v_m.ventana_horaria is null or array_position(v_m.ventana_horaria, v_ventana) is null then
    insert into checkin_intentos (user_id, mission_id, resultado, ubicacion, detalle)
      values (v_user, p_mission_id, 'fuera_de_ventana', v_punto,
              jsonb_build_object('ventana_actual', v_ventana, 'ventanas', v_m.ventana_horaria));
    return jsonb_build_object('ok', false, 'motivo', 'fuera_de_ventana',
      'mensaje', 'Esta Vuelta no se puede chapar a esta hora.',
      'ventanas', to_jsonb(v_m.ventana_horaria));
  end if;

  -- ── Capa 2: geofence ─────────────────────────────────────────────────
  v_dist := extensions.st_distance(v_punto, v_m.poi_ubicacion);
  -- Fail-closed: si por lo que sea la distancia no se pudo calcular, se rechaza.
  -- Una capa de anti-fraude que ante la duda deja pasar no es una capa.
  if v_dist is null or v_dist > 75 then
    insert into checkin_intentos (user_id, mission_id, resultado, distancia_m, ubicacion, detalle)
      values (v_user, p_mission_id, 'lejos', v_dist, v_punto,
              jsonb_build_object('precision_m', p_precision_m));
    return jsonb_build_object('ok', false, 'motivo', 'lejos',
      'mensaje', 'Estás muy lejos. Acercate a ' || v_m.poi_nombre || '.',
      'distancia_m', round(coalesce(v_dist, -1)));
  end if;

  -- ── Capa 4: velocidad imposible ──────────────────────────────────────
  select created_at, ubicacion_checkin into v_ultimo
    from mission_completions
   where user_id = v_user
   order by created_at desc
   limit 1;

  if found then
    v_seg := extract(epoch from (v_ahora - v_ultimo.created_at));
    if v_seg > 0 then
      v_kmh := (extensions.st_distance(v_punto, v_ultimo.ubicacion_checkin) / 1000.0) / (v_seg / 3600.0);
      -- 90 km/h: imposible a pie y también en el tráfico de Lima. Se MARCA, no
      -- se rechaza: un rechazo duro castigaría a quien se movió en auto entre
      -- dos vueltas, y preferimos revisar a bloquear a un usuario real.
      if v_kmh > 90 then v_sospecha := true; end if;
    end if;
  end if;

  -- ── Capa 1: la foto ──────────────────────────────────────────────────
  if v_m.requiere_foto then
    if p_foto_path is null then
      insert into checkin_intentos (user_id, mission_id, resultado, distancia_m, ubicacion)
        values (v_user, p_mission_id, 'falta_foto', v_dist, v_punto);
      return jsonb_build_object('ok', false, 'motivo', 'falta_foto',
        'mensaje', 'Esta Vuelta pide foto.');
    end if;

    -- Se distingue "el cliente mandó la forma equivocada" de "no verificamos la
    -- foto". Sin esto, un `fullPath` o una URL firmada se leen como fraude.
    if p_foto_path like 'http%' or p_foto_path like 'chapas/%'
       or (storage.foldername(p_foto_path))[1] is distinct from v_user::text then
      insert into checkin_intentos (user_id, mission_id, resultado, distancia_m, ubicacion, detalle)
        values (v_user, p_mission_id, 'foto_ruta_invalida', v_dist, v_punto,
                jsonb_build_object('recibido', left(p_foto_path, 120)));
      return jsonb_build_object('ok', false, 'motivo', 'foto_ruta_invalida',
        'mensaje', 'La foto no se subió como corresponde. Sacala de nuevo desde la app.');
    end if;

    -- Se usa `owner_id`, no `owner`: la propia base marca `owner` como
    -- deprecada ("Field is deprecated, use owner_id instead"). Y el predicado
    -- de ruta es cinturón que no depende de ninguna columna del proveedor.
    --
    -- La foto queda atada a ESTA vuelta por el segundo segmento de la ruta, y
    -- se le exige peso y tipo: sin eso, una subida de 1 byte chapaba las 63
    -- vueltas activas, porque `allowed_mime_types` lo aplica el storage-api
    -- contra el Content-Type que declara el cliente, sin mirar los bytes.
    if not exists (
      select 1 from storage.objects o
       where o.name = p_foto_path
         and o.bucket_id = 'chapas'
         and o.owner_id = v_user::text
         and (storage.foldername(o.name))[2] = p_mission_id::text
         and o.created_at > v_ahora - interval '5 minutes'
         and o.metadata->>'mimetype' in ('image/jpeg', 'image/png', 'image/webp')
         and (o.metadata->>'size')::bigint between 50000 and 8388608
    ) then
      insert into checkin_intentos (user_id, mission_id, resultado, distancia_m, ubicacion)
        values (v_user, p_mission_id, 'foto_no_verificable', v_dist, v_punto);
      return jsonb_build_object('ok', false, 'motivo', 'foto_no_verificable',
        'mensaje', 'No pudimos verificar la foto. Sacala de nuevo desde la app.');
    end if;
  end if;

  -- ── Se acepta. De acá en más, todo o nada. ───────────────────────────
  begin
    insert into mission_completions
      (user_id, mission_id, foto_url, ubicacion_checkin, distancia_m, verificacion, sospecha_fraude)
    values
      (v_user, p_mission_id,
       case when v_m.requiere_foto then p_foto_path else null end,  -- no se guarda basura si no pide foto
       v_punto, v_dist,
       case when v_sospecha then 'revisar' else 'auto' end, v_sospecha);
  exception when unique_violation then
    insert into checkin_intentos (user_id, mission_id, resultado, distancia_m, ubicacion)
      values (v_user, p_mission_id, 'ya_chapada', v_dist, v_punto);
    return jsonb_build_object('ok', false, 'motivo', 'ya_chapada',
      'mensaje', 'Esta Vuelta ya la chapaste.');
  end;

  -- Figurita. Puede no existir: hay 3 cards para 391 POIs, así que la ausencia
  -- es lo normal hoy y no puede tumbar la chapada. `order by id` porque sin él
  -- qué figurita te toca lo decide el planner.
  select id into v_card from cards
   where poi_id = v_m.poi_id
     and (valida_desde is null or v_hoy_lima >= valida_desde)
     and (valida_hasta is null or v_hoy_lima <= valida_hasta)
   order by id
   limit 1;

  if v_card is not null then
    insert into user_cards (user_id, card_id) values (v_user, v_card)
      on conflict (user_id, card_id) do nothing;
    v_nueva := found;  -- solo es "nueva" si de verdad se insertó
  end if;

  -- Racha. Upsert atómico, como pedía la trampa del plan: `streaks` no tiene
  -- fila (el trigger de alta solo crea `profiles`), y un select-y-después-insert
  -- pierde la carrera contra sí mismo. El `greatest(..., 1)` evita que una fila
  -- con `dias_actual = 0` haga que una chapada aceptada devuelva racha 0.
  insert into streaks as s (user_id, dias_actual, record, ultima_vuelta)
  values (v_user, 1, 1, v_hoy_lima)
  on conflict (user_id) do update
     set dias_actual = greatest(case
           when s.ultima_vuelta = v_hoy_lima     then s.dias_actual
           when s.ultima_vuelta = v_hoy_lima - 1 then s.dias_actual + 1
           else 1
         end, 1),
         record = greatest(s.record, greatest(case
           when s.ultima_vuelta = v_hoy_lima     then s.dias_actual
           when s.ultima_vuelta = v_hoy_lima - 1 then s.dias_actual + 1
           else 1
         end, 1)),
         ultima_vuelta = v_hoy_lima
  returning s.dias_actual into v_dias;

  -- Calle. El `rango` NO se toca: la progresión está nombrada en el documento
  -- maestro pero sus umbrales de XP nunca se decidieron, y una función que
  -- reparte economía de juego no es lugar para inventarlos.
  update profiles set calle_xp = calle_xp + v_m.calle_xp
   where id = v_user
   returning calle_xp into v_xp;

  insert into checkin_intentos (user_id, mission_id, resultado, distancia_m, ubicacion, detalle)
    values (v_user, p_mission_id, 'ok', v_dist, v_punto,
            jsonb_build_object('sospecha', v_sospecha, 'calle_xp', v_m.calle_xp,
                               'precision_m', p_precision_m, 'kmh', round(coalesce(v_kmh, 0), 1)));

  return jsonb_build_object(
    'ok', true,
    'distancia_m', round(v_dist),
    'calle_xp', v_m.calle_xp,
    'calle_total', v_xp,
    'racha', v_dias,
    'figurita_id', case when v_nueva then v_card else null end,  -- no se revela un duplicado
    'en_revision', v_sospecha
  );

-- Red de seguridad: ningún camino puede romper el contrato "siempre devuelve un
-- motivo" ni evaporar el rastro. El handler de plpgsql abre una subtransacción,
-- así que este INSERT persiste aunque el cuerpo haya abortado.
exception when others then
  insert into checkin_intentos (user_id, mission_id, resultado, detalle)
    values (v_user, p_mission_id, 'error_interno',
            jsonb_build_object('sqlstate', sqlstate, 'mensaje', sqlerrm));
  return jsonb_build_object('ok', false, 'motivo', 'error_interno',
    'mensaje', 'Algo falló de nuestro lado. Probá de nuevo.');
end;
$$;

-- Postgres concede EXECUTE a PUBLIC por defecto, y el default ACL de Supabase
-- además se lo concede explícitamente a `anon`: revocar solo de uno no alcanza.
revoke execute on function public.chapar(bigint, double precision, double precision, text, boolean, numeric) from public;
revoke execute on function public.chapar(bigint, double precision, double precision, text, boolean, numeric) from anon;
grant  execute on function public.chapar(bigint, double precision, double precision, text, boolean, numeric) to authenticated;

-- La firma vieja quedaría colgada y ejecutable si no se la borra.
drop function if exists public.chapar(bigint, double precision, double precision, text);

comment on function public.chapar is
  'Check-in verificado en servidor (ADR-0001). p_foto_path es el `name` del objeto dentro del bucket `chapas`, con formato <uid>/<mission_id>/<archivo> — NO una URL. Valida mock-location, tope de intentos, coordenadas, modo seguro, ventana horaria, geofence 75 m, velocidad imposible y existencia real de la foto; inserta completion, otorga figurita, actualiza racha y Calle. Devuelve veredicto con motivo, siempre.';
