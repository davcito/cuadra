-- ============================================================
-- CUADRA — Migración inicial (documento maestro §7.5)
-- Esquema completo + RLS en TODAS las tablas (regla dura #3).
-- Escritura de contenido (cells/pois/missions/cards) SOLO via
-- service_role desde el worker del VPS; el cliente solo lee.
-- ============================================================

create extension if not exists postgis with schema extensions;

-- ------------------------------------------------------------
-- Perfiles (extiende auth.users de Supabase)
-- ------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 20),
  display_name text,
  avatar_url text,
  calle_xp int not null default 0,
  rango text not null default 'nuevo_en_la_cuadra',
  distrito_casa text,
  created_at timestamptz not null default now()
);

-- Alta automática del perfil al registrarse (patrón estándar Supabase).
-- username provisional 'user_xxxxxxxx'; el onboarding pide el definitivo.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Celdas H3 (zonas de juego + modo seguro)
-- ------------------------------------------------------------
create table public.cells (
  h3_index text primary key,
  distrito text not null,
  ciudad text not null default 'Lima',
  pais text not null default 'PE',
  nivel_seguridad smallint not null default 1, -- 1 libre, 2 solo día, 3 excluida
  activa boolean not null default true
);

-- ------------------------------------------------------------
-- POIs reales (desde OSM; la IA jamás inventa lugares)
-- ------------------------------------------------------------
create table public.pois (
  id bigint generated always as identity primary key,
  osm_id bigint unique,
  nombre text not null,
  categoria text not null,           -- huarique, caleta, huaca, parque...
  ubicacion geography(point, 4326) not null,
  h3_index text references public.cells(h3_index),
  metadata jsonb not null default '{}',
  activo boolean not null default true
);
create index pois_geo_idx on public.pois using gist (ubicacion);
create index pois_h3_idx on public.pois (h3_index) where activo;

-- ------------------------------------------------------------
-- Vueltas (misiones)
-- ------------------------------------------------------------
create table public.missions (
  id bigint generated always as identity primary key,
  poi_id bigint not null references public.pois(id),
  h3_index text not null references public.cells(h3_index),
  titulo text not null,
  descripcion text not null,
  tipo text not null check (tipo in ('observacion','consumo','social','patrimonio')),
  categoria text not null check (categoria in ('huarique','caleta','huaca','casero')),
  dificultad smallint not null check (dificultad between 1 and 3),
  calle_xp int not null,
  ventana_horaria text[] not null default '{mañana,tarde}',
  requiere_foto boolean not null default true,
  instruccion_verificacion text,
  patrocinada boolean not null default false,
  business_id bigint,                -- FK a businesses se agrega en fase 3
  estado text not null default 'draft' check (estado in ('draft','activa','archivada')),
  valida_desde date, valida_hasta date,   -- temporadas
  created_at timestamptz not null default now()
);
create index missions_celda_idx on public.missions (h3_index) where estado = 'activa';
create index missions_poi_idx on public.missions (poi_id);

-- ------------------------------------------------------------
-- Completaciones (check-ins verificados)
-- Escritura SOLO via RPC server-side `chapar()` (ADR-0001):
-- el geofence < 75 m y la velocidad imposible se validan en el
-- servidor; el cliente nunca inserta directo.
-- ------------------------------------------------------------
create table public.mission_completions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id),
  mission_id bigint not null references public.missions(id),
  foto_url text,
  ubicacion_checkin geography(point, 4326) not null,
  distancia_m numeric,               -- distancia al POI al momento del check-in
  verificacion text not null default 'auto' check (verificacion in ('auto','ia_ok','ia_rechazada','manual')),
  sospecha_fraude boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, mission_id)
);
create index completions_usuario_idx on public.mission_completions (user_id, created_at desc);

-- ------------------------------------------------------------
-- Figuritas y álbum
-- ------------------------------------------------------------
create table public.cards (
  id bigint generated always as identity primary key,
  poi_id bigint references public.pois(id),
  nombre text not null,
  barrio text not null,              -- página del álbum
  rareza text not null check (rareza in ('comun','poco_comun','rara','temporada')),
  arte_url text,
  valida_desde date, valida_hasta date
);

create table public.user_cards (
  user_id uuid references public.profiles(id),
  card_id bigint references public.cards(id),
  chapada_en timestamptz not null default now(),
  primary key (user_id, card_id)
);

-- ------------------------------------------------------------
-- Rachas
-- ------------------------------------------------------------
create table public.streaks (
  user_id uuid primary key references public.profiles(id),
  dias_actual int not null default 0,
  record int not null default 0,
  ultima_vuelta date
);

-- ------------------------------------------------------------
-- Recados (fase 2 — tabla lista, feature se activa después)
-- ------------------------------------------------------------
create table public.geo_notes (
  id bigint generated always as identity primary key,
  autor_id uuid not null references public.profiles(id),
  ubicacion geography(point, 4326) not null,
  radio_m int not null default 30,
  contenido text not null,
  audio_url text,
  visibilidad text not null default 'privado' check (visibilidad in ('privado','amigos','publico')),
  destinatario_id uuid references public.profiles(id),
  expira timestamptz,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Negocios B2B (fase 3 — contiene datos de contacto: NUNCA
-- visible al cliente; solo service_role)
-- ------------------------------------------------------------
create table public.businesses (
  id bigint generated always as identity primary key,
  poi_id bigint references public.pois(id),
  nombre text not null, contacto jsonb,
  plan text check (plan in ('basico','plus','institucional')),
  activo_desde date, activo_hasta date
);

-- ============================================================
-- RLS — regla dura #3: ninguna tabla sin políticas.
-- Sin política = denegado. service_role (worker VPS) bypasea RLS.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.cells enable row level security;
alter table public.pois enable row level security;
alter table public.missions enable row level security;
alter table public.mission_completions enable row level security;
alter table public.cards enable row level security;
alter table public.user_cards enable row level security;
alter table public.streaks enable row level security;
alter table public.geo_notes enable row level security;
alter table public.businesses enable row level security;

-- profiles: lectura pública (rankings, alcaldías), edición solo propia.
-- El insert lo hace el trigger (security definer); sin policy de insert.
create policy "perfiles visibles para todos"
  on public.profiles for select using (true);
create policy "cada quien edita su perfil"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- cells: lectura pública (el modo seguro es visible al usuario, §4.2).
-- Escritura: solo service_role (sin políticas).
create policy "celdas visibles para todos"
  on public.cells for select using (true);

-- pois: lectura pública solo de activos. Escritura: solo service_role.
create policy "pois activos visibles"
  on public.pois for select using (activo);

-- missions: el cliente solo ve vueltas activas (drafts/archivadas jamás).
-- El filtro fino de seguridad/horario vive en la query central (§7.5).
create policy "solo vueltas activas"
  on public.missions for select using (estado = 'activa');

-- mission_completions: cada quien ve su historial. INSERT denegado al
-- cliente a propósito: el check-in entra por la RPC chapar() (ADR-0001).
create policy "cada quien ve sus check-ins"
  on public.mission_completions for select using (auth.uid() = user_id);

-- cards: el álbum completo es visible (los huecos generan deseo).
create policy "figuritas visibles para todos"
  on public.cards for select using (true);

-- user_cards: cada quien ve su álbum. Otorgamiento via RPC/worker.
create policy "cada quien ve sus figuritas"
  on public.user_cards for select using (auth.uid() = user_id);

-- streaks: cada quien ve su racha. Actualización server-side.
create policy "cada quien ve su racha"
  on public.streaks for select using (auth.uid() = user_id);

-- geo_notes: ve el autor, el destinatario, o todos si es público.
-- (Visibilidad 'amigos' se implementa en fase 2 con la tabla de amigos;
-- hasta entonces un recado 'amigos' solo lo ven autor y destinatario.)
create policy "recados según visibilidad"
  on public.geo_notes for select
  using (
    visibilidad = 'publico'
    or auth.uid() = autor_id
    or auth.uid() = destinatario_id
  );
create policy "crear recados propios"
  on public.geo_notes for insert
  with check (auth.uid() = autor_id);
create policy "borrar recados propios"
  on public.geo_notes for delete using (auth.uid() = autor_id);

-- businesses: SIN políticas = invisible para anon/authenticated.
-- Contiene contacto del negocio; solo el worker (service_role) lo toca.

-- ============================================================
-- Documentación inline
-- ============================================================
comment on table public.cells is 'Celdas H3 res. 9. nivel_seguridad: 1=libre, 2=solo horario diurno, 3=excluida. Modo seguro = feature de primera clase (regla dura #4).';
comment on table public.missions is 'Vueltas. Generadas por el worker (Claude Haiku 4.5) SOLO sobre pois reales; el cliente nunca escribe aquí.';
comment on table public.mission_completions is 'Check-ins. Escritura exclusiva via RPC chapar() server-side — ver docs/decisiones/0001-checkin-via-rpc.md.';
comment on table public.businesses is 'B2B fase 3. Sin RLS de lectura: datos de contacto solo para service_role.';
