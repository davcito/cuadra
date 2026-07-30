-- ============================================================================
-- vueltas_cerca(lat, lng, limite) — las Vueltas chapables desde donde estás.
--
-- POR QUÉ EXISTE
--
-- La pantalla principal pedía esto:
--
--     .from("missions").select(...).eq("estado","activa").limit(1).maybeSingle()
--
-- Sin orden y sin ubicación. Con 72 Vueltas activas eso devuelve la que el
-- planner tenga más a mano —en la práctica, la de id más bajo— así que a alguien
-- parado en Cercado de Lima la app le ofrecía una Vuelta de Barranco, a 15 km.
-- El síntoma que se veía era otro: tocabas la tarjeta, decía "calculando dónde
-- estás" y ahí se quedaba. Nunca iba a pasar de ahí: estaba a 15 km.
--
-- Y hacía algo peor, en silencio: no miraba `cells.nivel_seguridad` ni
-- `missions.ventana_horaria`. La regla dura #4 dice que ninguna query de Vueltas
-- puede ignorarlas, y ésta —la única query de Vueltas que existe en la app— las
-- ignoraba las dos.
--
-- EL CONTRATO QUE IMPORTA
--
-- Todo lo que esta función devuelve, `chapar()` lo tiene que aceptar cuando el
-- jugador llegue. Una lista más permisiva que el validador es la peor forma de
-- mentir de una app de caminar: mandás a alguien quince cuadras y al llegar le
-- decís que no. Por eso las puertas de acá son las mismas de `chapar()`, en el
-- mismo orden, y hay una prueba que las cruza contra la función real en vez de
-- confiar en que estos dos archivos no se separen con el tiempo.
--
-- `distancia_m` sale acá y no en el cliente porque el cliente no puede: PostGIS
-- mide sobre el esferoide y JS haría haversine sobre una esfera. Diferencias de
-- metros no importan para pintar "a 2 cuadras", pero sí importan cuando el
-- número que ve el jugador y el que decide `chapar()` no salen del mismo lugar.
-- ============================================================================

create or replace function public.vueltas_cerca(
  p_lat double precision,
  p_lng double precision,
  p_limite int default 10
)
returns table (
  id bigint,
  titulo text,
  descripcion text,
  categoria text,
  dificultad smallint,
  calle_xp int,
  requiere_foto boolean,
  instruccion_verificacion text,
  poi_id bigint,
  poi_nombre text,
  lat double precision,
  lng double precision,
  distancia_m double precision,
  figurita text,
  ya_chapada boolean
)
language plpgsql
stable
security definer
-- PostGIS vive en `extensions`; sin esto una función SECURITY DEFINER no lo ve.
set search_path = public, extensions, pg_temp
as $$
declare
  v_user     uuid := auth.uid();
  v_ahora    timestamptz := now();
  v_hora     int  := extract(hour from (v_ahora at time zone 'America/Lima'))::int;
  v_hoy      date := (v_ahora at time zone 'America/Lima')::date;
  v_ventana  text;
  v_de_dia   boolean;
  v_punto    geography;
begin
  -- Coordenadas inválidas: se devuelve vacío en vez de reventar. Esta función
  -- corre mientras el GPS todavía está fijando posición, así que recibir basura
  -- es un estado normal del arranque, no un error del que haya que avisar.
  if p_lat is null or p_lng is null
     or p_lat < -90 or p_lat > 90 or p_lng < -180 or p_lng > 180 then
    return;
  end if;

  v_punto := st_makepoint(p_lng, p_lat)::geography;

  -- MISMAS franjas que chapar() (líneas 176-181 de su migración). Si algún día
  -- cambian allá y no acá, la prueba `probar-vueltas-cerca.mjs` falla: compara
  -- esta lista contra el veredicto real de chapar(), hora por hora.
  v_ventana := case when v_hora between 5 and 11 then 'mañana'
                    when v_hora between 12 and 18 then 'tarde'
                    else 'noche' end;
  v_de_dia  := v_hora between 6 and 17;

  return query
  select m.id,
         m.titulo,
         m.descripcion,
         m.categoria,
         m.dificultad,
         m.calle_xp,
         m.requiere_foto,
         m.instruccion_verificacion,
         p.id,
         p.nombre,
         p.lat,
         p.lng,
         st_distance(v_punto, p.ubicacion) as distancia_m,
         ca.nombre,
         mc.id is not null as ya_chapada
    from missions m
    join pois  p  on p.id = m.poi_id
    join cells c  on c.h3_index = m.h3_index
    left join lateral (
      select ca.nombre from cards ca
       where ca.poi_id = p.id
         and (ca.valida_desde is null or v_hoy >= ca.valida_desde)
         and (ca.valida_hasta is null or v_hoy <= ca.valida_hasta)
       order by ca.id limit 1
    ) ca on true
    left join mission_completions mc
      on mc.mission_id = m.id and mc.user_id = v_user
   where m.estado = 'activa'
     and p.activo
     and c.activa
     -- Temporada de la Vuelta.
     and (m.valida_desde is null or v_hoy >= m.valida_desde)
     and (m.valida_hasta is null or v_hoy <= m.valida_hasta)
     -- Modo seguro. `is distinct from 1` y no `>= 3`, igual que chapar(): la
     -- columna no tiene dominio, y un valor raro por error de carga tiene que
     -- cerrar la puerta, no abrirla.
     and c.nivel_seguridad is not null
     and (c.nivel_seguridad = 1 or (c.nivel_seguridad = 2 and v_de_dia))
     -- Ventana horaria. `array_position(...) is not null` y no `= any`: con un
     -- NULL adentro del array, `= any` devuelve NULL y la fila se colaría.
     and m.ventana_horaria is not null
     and array_position(m.ventana_horaria, v_ventana) is not null
   order by distancia_m
   limit greatest(coalesce(p_limite, 10), 1);
end;
$$;

comment on function public.vueltas_cerca(double precision, double precision, int) is
  'Vueltas chapables desde un punto, ordenadas por distancia. Aplica las MISMAS puertas que chapar() (modo seguro, ventana horaria, temporada) para que la app nunca ofrezca algo que el servidor vaya a rechazar.';

revoke all on function public.vueltas_cerca(double precision, double precision, int) from public, anon;
grant execute on function public.vueltas_cerca(double precision, double precision, int) to authenticated;
