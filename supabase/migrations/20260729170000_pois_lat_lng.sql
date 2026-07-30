-- ============================================================
-- `pois.lat` y `pois.lng` como columnas generadas
--
-- El cliente necesita la coordenada para decir "estás a 3 cuadras" y para
-- encender el botón de chapar. Pedía `pois(ubicacion)` y recibía esto:
--
--     "0101000020E6100000FDF675E09C4153C05CC98E8D404C28C0"
--
-- PostgREST serializa `geography` como WKB hexadecimal, no como GeoJSON. El
-- código leía `.coordinates` sobre un string, obtenía `undefined`, y la
-- distancia quedaba en null PARA SIEMPRE: el botón se quedaba en "Buscando
-- dónde estás…" sin error, sin log y sin forma de darse cuenta mirando el
-- código. Lo encontró David probando la app en la calle, no un test.
--
-- Se arregla del lado de la base y no parseando WKB en el cliente, por dos
-- razones: la app no tiene por qué saber cómo PostGIS serializa, y cualquier
-- otra pantalla que necesite la coordenada se toparía con lo mismo.
--
-- `stored` y no `virtual`: se leen en toda lista de Vueltas y se escriben una
-- vez por sync. Vale el espacio.
-- ============================================================

alter table public.pois
  add column if not exists lat double precision
    generated always as (extensions.st_y(ubicacion::extensions.geometry)) stored,
  add column if not exists lng double precision
    generated always as (extensions.st_x(ubicacion::extensions.geometry)) stored;

comment on column public.pois.lat is
  'Latitud derivada de `ubicacion`. Existe porque PostgREST serializa geography como WKB hex y el cliente necesita números.';
comment on column public.pois.lng is
  'Longitud derivada de `ubicacion`. Ojo al orden: PostGIS trabaja en (lng, lat).';
