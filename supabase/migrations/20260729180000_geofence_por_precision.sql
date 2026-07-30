-- ============================================================
-- El geofence deja de castigar el error del GPS
--
-- Los 75 m de la regla dura #5 no se mueven: son los que sostienen la promesa
-- B2B. Lo que cambia es qué se hace con la INCERTIDUMBRE de la medición.
--
-- El GPS urbano, entre edificios, tiene 20-65 m de error típico. Alguien parado
-- EN la puerta puede leer 60 m. Con un umbral duro, esa persona rebota por culpa
-- del teléfono y lo lee como app rota. Absorber el error del instrumento NO es
-- ser más laxo — es no cobrarle al usuario una imprecisión que no es suya.
--
-- Tres cambios, y el tercero es el que más importa a futuro.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Una chapada de prueba no puede parecerse a una real
--
-- El día que le muestres a un negocio "vinieron 40 personas", esas 40 tienen que
-- ser 40 personas. Si las pruebas entran con el mismo sello que lo real, no hay
-- forma de separarlas después — y nadie se acuerda cuáles eran cuáles.
-- ------------------------------------------------------------
alter table public.mission_completions
  drop constraint if exists mission_completions_verificacion_check;
alter table public.mission_completions
  add constraint mission_completions_verificacion_check
  check (verificacion in ('auto', 'revisar', 'prueba', 'ia_ok', 'ia_rechazada', 'manual'));

comment on column public.mission_completions.verificacion is
  'auto = verificada por las capas del servidor · revisar = aceptada pero con sospecha · prueba = radio ampliado a mano, NO cuenta como visita real · ia_* = verificación visual · manual = revisada por humano';

-- ------------------------------------------------------------
-- 2. La escotilla de prueba: explícita, con dueño, con vencimiento
--
-- No es un umbral configurable. Un umbral configurable lo afloja alguien para
-- probar y queda flojo para siempre, sin que nadie se entere. Esto exige una
-- fila, dice quién y por qué, y se apaga solo.
-- ------------------------------------------------------------
create table if not exists public.checkin_pruebas (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  radio_m    numeric not null check (radio_m between 75 and 20000),
  motivo     text not null,
  expira_en  timestamptz not null,
  creado_en  timestamptz not null default now()
);

comment on table public.checkin_pruebas is
  'Radio ampliado para probar el check-in sin viajar. Toda chapada hecha bajo esta fila queda marcada verificacion=prueba y NO cuenta como visita real. Vence sola.';

alter table public.checkin_pruebas enable row level security;
-- Sin políticas: nadie la lee ni la escribe desde el cliente. Solo `chapar()`
-- (security definer) y quien tenga service_role.

-- ------------------------------------------------------------
-- 3. La función
-- ------------------------------------------------------------
create or replace function public.chapar(
  p_mission_id    bigint,
  p_lat           double precision,
  p_lng           double precision,
  p_foto_path     text default null,
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
  v_hoy_lima  date := (v_ahora at time zone 'America/Lima')::date;
  v_hora_lima int  := extract(hour from (v_ahora at time zone 'America/Lima'))::int;
  v_ventana   text;
  v_es_de_dia boolean;
  v_punto     extensions.geography;
  v_m         record;
  v_dist      numeric;
  v_radio     numeric;
  v_prueba    record;
  v_esPrueba  boolean := false;
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

  perform pg_advisory_xact_lock(hashtextextended(v_user::text, 0));

  if p_mock_location then
    insert into checkin_intentos (user_id, mission_id, resultado, detalle)
      values (v_user, p_mission_id, 'mock_location',
              jsonb_build_object('precision_m', p_precision_m));
    return jsonb_build_object('ok', false, 'motivo', 'mock_location',
      'mensaje', 'Detectamos ubicación simulada. Desactivala para chapar.');
  end if;

  select count(*) into v_intentos from checkin_intentos
   where user_id = v_user and created_at > v_ahora - interval '10 minutes';
  if v_intentos > 20 then
    insert into checkin_intentos (user_id, mission_id, resultado)
      values (v_user, p_mission_id, 'demasiados_intentos');
    return jsonb_build_object('ok', false, 'motivo', 'demasiados_intentos',
      'mensaje', 'Demasiados intentos. Esperá un momento.');
  end if;

  if p_lat is null or p_lng is null
     or p_lat not between -90 and 90
     or p_lng not between -180 and 180 then
    insert into checkin_intentos (user_id, mission_id, resultado, detalle)
      values (v_user, p_mission_id, 'coordenadas_invalidas',
              jsonb_build_object('lat', p_lat, 'lng', p_lng, 'precision_m', p_precision_m));
    return jsonb_build_object('ok', false, 'motivo', 'coordenadas_invalidas',
      'mensaje', 'No pudimos leer tu ubicación. Probá de nuevo.');
  end if;

  -- ── GPS demasiado impreciso ──────────────────────────────────────────
  -- Arriba de 100 m de error la lectura no ubica a nadie: el círculo de duda
  -- es más grande que la cuadra. Ampliar el radio para compensarlo sería
  -- convertir "no sé dónde estás" en "te dejo pasar igual", que es la forma
  -- exacta de romper el anti-fraude creyendo que se está siendo amable.
  -- Se rechaza con un motivo ACCIONABLE: esperar suele arreglarlo solo.
  if p_precision_m is not null and p_precision_m > 100 then
    insert into checkin_intentos (user_id, mission_id, resultado, ubicacion, detalle)
      values (v_user, p_mission_id, 'gps_impreciso',
              extensions.st_makepoint(p_lng, p_lat)::extensions.geography,
              jsonb_build_object('precision_m', p_precision_m));
    return jsonb_build_object('ok', false, 'motivo', 'gps_impreciso',
      'mensaje', 'Tu GPS está muy impreciso ahora. Esperá unos segundos al aire libre.',
      'precision_m', round(p_precision_m));
  end if;

  v_ventana   := case when v_hora_lima between 5 and 11 then 'mañana'
                      when v_hora_lima between 12 and 18 then 'tarde'
                      else 'noche' end;
  v_es_de_dia := v_hora_lima between 6 and 17;
  v_punto     := extensions.st_makepoint(p_lng, p_lat)::extensions.geography;

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

  if v_m.ventana_horaria is null or array_position(v_m.ventana_horaria, v_ventana) is null then
    insert into checkin_intentos (user_id, mission_id, resultado, ubicacion, detalle)
      values (v_user, p_mission_id, 'fuera_de_ventana', v_punto,
              jsonb_build_object('ventana_actual', v_ventana, 'ventanas', v_m.ventana_horaria));
    return jsonb_build_object('ok', false, 'motivo', 'fuera_de_ventana',
      'mensaje', 'Esta Vuelta no se puede chapar a esta hora.',
      'ventanas', to_jsonb(v_m.ventana_horaria));
  end if;

  -- ── Capa 2: geofence, ahora consciente del instrumento ───────────────
  -- Base 75 m (regla dura #5) + hasta 25 m por el error que el propio GPS
  -- declara. Sin precisión reportada NO se amplía: no saber cuánto te
  -- equivocás no es motivo para darte más margen.
  v_radio := 75 + least(coalesce(p_precision_m, 0), 25);

  -- La escotilla de prueba pisa el radio, y deja dicho que lo hizo.
  select * into v_prueba from checkin_pruebas
   where user_id = v_user and expira_en > v_ahora;
  if found then
    v_radio := greatest(v_radio, v_prueba.radio_m);
    v_esPrueba := true;
  end if;

  v_dist := extensions.st_distance(v_punto, v_m.poi_ubicacion);
  if v_dist is null or v_dist > v_radio then
    insert into checkin_intentos (user_id, mission_id, resultado, distancia_m, ubicacion, detalle)
      values (v_user, p_mission_id, 'lejos', v_dist, v_punto,
              jsonb_build_object('precision_m', p_precision_m, 'radio_m', v_radio));
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

    if p_foto_path like 'http%' or p_foto_path like 'chapas/%'
       or (storage.foldername(p_foto_path))[1] is distinct from v_user::text then
      insert into checkin_intentos (user_id, mission_id, resultado, distancia_m, ubicacion, detalle)
        values (v_user, p_mission_id, 'foto_ruta_invalida', v_dist, v_punto,
                jsonb_build_object('recibido', left(p_foto_path, 120)));
      return jsonb_build_object('ok', false, 'motivo', 'foto_ruta_invalida',
        'mensaje', 'La foto no se subió como corresponde. Sacala de nuevo desde la app.');
    end if;

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

  -- ── Se acepta ────────────────────────────────────────────────────────
  begin
    insert into mission_completions
      (user_id, mission_id, foto_url, ubicacion_checkin, distancia_m, verificacion, sospecha_fraude)
    values
      (v_user, p_mission_id,
       case when v_m.requiere_foto then p_foto_path else null end,
       v_punto, v_dist,
       -- 'prueba' gana sobre 'revisar': lo primero que hay que saber de esta
       -- fila es que no cuenta como visita real.
       case when v_esPrueba then 'prueba'
            when v_sospecha then 'revisar'
            else 'auto' end,
       v_sospecha);
  exception when unique_violation then
    insert into checkin_intentos (user_id, mission_id, resultado, distancia_m, ubicacion)
      values (v_user, p_mission_id, 'ya_chapada', v_dist, v_punto);
    return jsonb_build_object('ok', false, 'motivo', 'ya_chapada',
      'mensaje', 'Esta Vuelta ya la chapaste.');
  end;

  select id into v_card from cards
   where poi_id = v_m.poi_id
     and (valida_desde is null or v_hoy_lima >= valida_desde)
     and (valida_hasta is null or v_hoy_lima <= valida_hasta)
   order by id
   limit 1;

  if v_card is not null then
    insert into user_cards (user_id, card_id) values (v_user, v_card)
      on conflict (user_id, card_id) do nothing;
    v_nueva := found;
  end if;

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

  update profiles set calle_xp = calle_xp + v_m.calle_xp
   where id = v_user
   returning calle_xp into v_xp;

  insert into checkin_intentos (user_id, mission_id, resultado, distancia_m, ubicacion, detalle)
    values (v_user, p_mission_id, case when v_esPrueba then 'ok_prueba' else 'ok' end,
            v_dist, v_punto,
            jsonb_build_object('sospecha', v_sospecha, 'calle_xp', v_m.calle_xp,
                               'precision_m', p_precision_m, 'radio_m', v_radio,
                               'kmh', round(coalesce(v_kmh, 0), 1)));

  return jsonb_build_object(
    'ok', true,
    'distancia_m', round(v_dist),
    'radio_m', round(v_radio),
    'calle_xp', v_m.calle_xp,
    'calle_total', v_xp,
    'racha', v_dias,
    'figurita_id', case when v_nueva then v_card else null end,
    'en_revision', v_sospecha,
    -- La app tiene que poder decirlo en pantalla: una chapada de prueba que se
    -- ve igual que una real engaña también a quien la está probando.
    'es_prueba', v_esPrueba
  );

exception when others then
  insert into checkin_intentos (user_id, mission_id, resultado, detalle)
    values (v_user, p_mission_id, 'error_interno',
            jsonb_build_object('sqlstate', sqlstate, 'mensaje', sqlerrm));
  return jsonb_build_object('ok', false, 'motivo', 'error_interno',
    'mensaje', 'Algo falló de nuestro lado. Probá de nuevo.');
end;
$$;

revoke execute on function public.chapar(bigint, double precision, double precision, text, boolean, numeric) from public;
revoke execute on function public.chapar(bigint, double precision, double precision, text, boolean, numeric) from anon;
grant  execute on function public.chapar(bigint, double precision, double precision, text, boolean, numeric) to authenticated;
