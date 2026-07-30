-- Ciclo de vida de POIs — ADR-0007
--
-- Problema que resuelve: la sync de OpenStreetMap corre semanal. Sin estas tres
-- columnas, la segunda corrida destruye el trabajo humano — o borra los POIs
-- curados a mano (que son los mejores, porque los huariques buenos no están en
-- OSM), o pisa cada corrección de nombre que alguien hizo.
--
-- Nada de esto necesita tablas nuevas: `pois.osm_id` ya es nullable+unique, así
-- que los POIs sin OSM conviven sin chocar, y `activo` ya es un borrado suave.

-- 1. De dónde salió cada POI. La sync opera EXCLUSIVAMENTE sobre origen='osm';
--    los otros tres son intocables para el pipeline, pase lo que pase.
alter table public.pois
  add column if not exists origen text not null default 'osm'
    check (origen in ('osm', 'curado', 'negocio', 'sugerido'));

comment on column public.pois.origen is
  'osm = cron semanal (único que la sync modifica) · curado = humano · negocio = alta B2B · sugerido = jugador, tras moderación';

-- 2. Última vez que OSM lo devolvió. La sync NUNCA borra: si un POI falta tres
--    corridas seguidas se apaga con activo=false y espera revisión humana.
--    Borrar la fila rompería las Vueltas y figuritas que referencian su id.
alter table public.pois
  add column if not exists visto_en_osm_at timestamptz;

comment on column public.pois.visto_en_osm_at is
  'Última corrida de sync que encontró este POI en OSM. NULL en los de otro origen.';

-- 3. Columnas que un humano corrigió a mano. La sync las saltea para siempre.
--    Sin esto, curar es trabajo perecedero y nadie lo hace dos veces.
alter table public.pois
  add column if not exists campos_curados text[] not null default '{}';

comment on column public.pois.campos_curados is
  'Nombres de columna corregidos a mano; la sync no los pisa. Ojo: son strings — hay un test que los cruza contra las columnas reales de pois.';

-- La sync filtra por origen en cada corrida, y el barrido de POIs que se cayeron
-- de OSM ordena por visto_en_osm_at. Índice parcial: solo interesan los de OSM.
create index if not exists pois_origen_visto_idx
  on public.pois (origen, visto_en_osm_at)
  where origen = 'osm';

-- Los 3 POIs del seed tienen osm_id inventados (9001-9003) que OSM no conoce.
-- Con el default 'osm' quedarían huérfanos y a las tres corridas se apagarían
-- solos. Son datos de desarrollo puestos a mano: eso es exactamente 'curado'.
update public.pois set origen = 'curado' where osm_id between 9000 and 9999;
