-- ============================================================
-- E2 · Políticas del bucket `chapas`
--
-- EL BUCKET NO SE CREA ACÁ. `storage.buckets` y `storage.objects` pertenecen a
-- `supabase_storage_admin`, y el rol que aplica migraciones no puede asumirlo
-- (verificado: `set role supabase_storage_admin` → 42501). El bucket se crea con
-- la Storage API usando `service_role`, desde `scripts/setup-storage.mjs`.
--
-- Las POLÍTICAS sí se pueden crear desde SQL: se probó contra esta base y
-- funcionan. Por eso viven acá, versionadas como manda la regla dura #7, y solo
-- la creación del bucket queda fuera.
--
-- Esto es la capa 1 del anti-fraude (documento maestro §7.6), y solo es real
-- porque Postgres puede VER el objeto: `chapar()` consulta `storage.objects`
-- para comprobar que la foto existe, es del usuario, es de ESTA vuelta y es
-- reciente. Ver docs/decisiones/0009-storage-de-fotos.md.
-- ============================================================

-- La convención de ruta es `<uid>/<mission_id>/<archivo>`. Que el primer
-- segmento sea el uid no es cosmético: sin eso cualquiera escribiría en la
-- carpeta de otro y el bucket sería un buzón abierto. El segundo segmento ata
-- la foto a la vuelta, y lo verifica `chapar()`.
drop policy if exists "chapas: subir en carpeta propia" on storage.objects;
create policy "chapas: subir en carpeta propia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'chapas'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- `owner_id`, no `owner`: la propia base marca `owner` como deprecada
-- ("Field is deprecated, use owner_id instead").
drop policy if exists "chapas: ver las propias" on storage.objects;
create policy "chapas: ver las propias" on storage.objects
  for select to authenticated
  using (bucket_id = 'chapas' and owner_id = (select auth.uid()::text));

-- Sin UPDATE: una chapa no se edita.
--
-- Y el DELETE va condicionado, que es el punto fino: prohibir UPDATE pero dejar
-- DELETE libre no protege nada, porque borrar y volver a subir en la misma ruta
-- reemplaza la prueba igual. Se conserva el "borrá la que salió mal" solo
-- mientras esa foto no respalde una chapada; una vez que respalda, es evidencia.
drop policy if exists "chapas: borrar las propias" on storage.objects;
create policy "chapas: borrar las propias" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'chapas'
    and owner_id = (select auth.uid()::text)
    and not exists (
      select 1 from public.mission_completions mc where mc.foto_url = name
    )
  );
