-- ============================================================
-- SEED de desarrollo — generado por scripts/generar-celdas-barranco.mjs
-- 37 celdas H3 res. 9 de Barranco + datos de PRUEBA.
-- NO usar en producción sin curación de seguridad a pie (§13).
-- ============================================================

-- Celdas (nivel_seguridad=1 provisional; curación pendiente)
insert into public.cells (h3_index, distrito, ciudad, pais, nivel_seguridad, activa) values
  ('898e62c5277ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c5273ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c5263ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c5267ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c522bffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c523bffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c520fffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c520bffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c5247ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c527bffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c526bffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c526fffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62cec9bffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62cec93ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c522fffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c5223ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c5233ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c5207ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c5203ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c521bffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c5257ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c5243ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c524fffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62ce1b7ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62ce1a7ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62cecd3ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62cecd7ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62cec8bffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62cec83ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62cec97ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c535bffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c5227ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c5237ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c52afffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c52abffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c5217ffff', 'Barranco', 'Lima', 'PE', 1, true),
  ('898e62c5213ffff', 'Barranco', 'Lima', 'PE', 1, true)
on conflict (h3_index) do nothing;

-- POIs de prueba (coordenadas aproximadas — el sync real es via OSM)
insert into public.pois (osm_id, nombre, categoria, ubicacion, h3_index) values
  (9001, 'Puente de los Suspiros', 'huaca', st_point(-77.0252, -12.14893)::geography, '898e62c5273ffff')
on conflict (osm_id) do nothing;
insert into public.pois (osm_id, nombre, categoria, ubicacion, h3_index) values
  (9002, 'Plaza de Armas de Barranco', 'huaca', st_point(-77.0205, -12.1494)::geography, '898e62c5277ffff')
on conflict (osm_id) do nothing;
insert into public.pois (osm_id, nombre, categoria, ubicacion, h3_index) values
  (9003, 'Mercado N°1 de Barranco', 'huarique', st_point(-77.0177, -12.1462)::geography, '898e62c5207ffff')
on conflict (osm_id) do nothing;

-- Vueltas de prueba (estado='activa' para que la app tenga qué mostrar)
insert into public.missions (poi_id, h3_index, titulo, descripcion, tipo, categoria, dificultad, calle_xp, ventana_horaria, requiere_foto, instruccion_verificacion, estado)
select p.id, p.h3_index, v.titulo, v.descripcion, v.tipo, v.categoria, v.dificultad, v.calle_xp, v.ventana, true, v.verif, 'activa'
from (values
  (9001, 'El puente que pide un deseo', 'Dicen que si cruzas el Puente de los Suspiros aguantando la respiración, se te cumple un deseo. Inténtalo y de paso mira el Bajada de Baños desde arriba.', 'patrimonio', 'huaca', 1, 12, array['mañana','tarde','noche'], 'Foto sobre el puente de madera con la bajada visible'),
  (9002, 'La plaza de siempre', 'Siéntate un toque en una banca de la plaza y encuentra el detalle de la biblioteca municipal que casi nadie nota: su reloj. ¿Qué hora marca?', 'observacion', 'caleta', 1, 10, array['mañana','tarde'], 'Foto de la fachada de la biblioteca donde se vea el reloj'),
  (9003, 'El dato de la caserita', 'En el Mercado N°1 pregúntale a una caserita cuál es la fruta que más vende esta semana. Si te animas, pruébala.', 'social', 'casero', 2, 25, array['mañana'], 'Foto dentro del mercado con un puesto de frutas visible')
) as v(osm_id, titulo, descripcion, tipo, categoria, dificultad, calle_xp, ventana, verif)
join public.pois p on p.osm_id = v.osm_id
on conflict do nothing;

-- Figuritas de prueba (página 'Barranco' del Álbum)
insert into public.cards (poi_id, nombre, barrio, rareza)
select p.id, c.nombre, 'Barranco', c.rareza
from (values
  (9001, 'Puente de los Suspiros', 'rara'),
  (9002, 'Plaza de Barranco', 'comun'),
  (9003, 'Mercado N°1', 'poco_comun')
) as c(osm_id, nombre, rareza)
join public.pois p on p.osm_id = c.osm_id
on conflict do nothing;

