#!/usr/bin/env node
/**
 * Crea el bucket `chapas` con la Storage API. Idempotente.
 *
 * POR QUÉ NO ES UNA MIGRACIÓN (y por qué eso tuerce la regla dura #7):
 * `storage.buckets` pertenece a `supabase_storage_admin`, y el rol que aplica
 * migraciones no puede asumirlo — verificado contra esta base:
 * `set role supabase_storage_admin` devuelve `42501: permission denied`.
 * Un `insert into storage.buckets` dentro de un `db push` aborta el archivo
 * entero, y como corre en una transacción no queda ni el bucket ni nada de lo
 * que viniera después.
 *
 * Las POLÍTICAS sí se pueden crear desde SQL (probado), así que viven en
 * `supabase/migrations/20260729150000_storage_chapas.sql`. Acá queda solo lo
 * que la migración no puede hacer.
 *
 *   node scripts/setup-storage.mjs            # crea/actualiza y verifica
 *   node scripts/setup-storage.mjs --verificar # solo comprueba, no escribe
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOLO_VERIFICAR = process.argv.includes("--verificar");

const BUCKET = {
  id: "chapas",
  name: "chapas",
  // Privado: son fotos sacadas en la calle, a veces con caras. No pueden ser
  // legibles por URL para cualquiera; el Álbum las sirve con URL firmada.
  public: false,
  file_size_limit: 8_388_608, // 8 MB — sobra para una foto de celular
  allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
};

function env() {
  const txt = readFileSync(join(RAIZ, "worker", ".env"), "utf8");
  const leer = (k) => {
    const m = txt.match(new RegExp(`^${k}=(.+)$`, "m"));
    if (!m) throw new Error(`Falta ${k} en worker/.env`);
    return m[1].trim();
  };
  return { url: leer("SUPABASE_URL"), key: leer("SUPABASE_SERVICE_ROLE_KEY") };
}

const { url, key } = env();
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

async function buckets() {
  const r = await fetch(`${url}/storage/v1/bucket`, { headers: H });
  if (!r.ok) throw new Error(`No pude listar buckets: ${r.status} ${await r.text()}`);
  return r.json();
}

const existentes = await buckets();
const actual = existentes.find((b) => b.id === BUCKET.id);

if (SOLO_VERIFICAR) {
  if (!actual) {
    console.error(`\n✗ El bucket "${BUCKET.id}" NO existe.`);
    console.error(`  Sin él, chapar() rechaza toda foto y la capa 1 del anti-fraude no existe.`);
    console.error(`  Corré: node scripts/setup-storage.mjs\n`);
    process.exit(1);
  }
  const mal = [];
  if (actual.public !== false) mal.push(`público (debería ser privado)`);
  if (actual.file_size_limit !== BUCKET.file_size_limit) mal.push(`límite ${actual.file_size_limit}`);
  console.log(`✓ bucket "${BUCKET.id}" existe · privado=${!actual.public} · ${actual.file_size_limit} bytes`);
  if (mal.length) {
    console.error(`✗ pero está mal configurado: ${mal.join(", ")}`);
    process.exit(1);
  }
  process.exit(0);
}

if (!actual) {
  const r = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: H,
    body: JSON.stringify(BUCKET),
  });
  if (!r.ok) throw new Error(`No pude crear el bucket: ${r.status} ${await r.text()}`);
  console.log(`✓ bucket "${BUCKET.id}" creado`);
} else {
  // Idempotente: si ya existe, se reconcilia la configuración en vez de fallar.
  const r = await fetch(`${url}/storage/v1/bucket/${BUCKET.id}`, {
    method: "PUT",
    headers: H,
    body: JSON.stringify({
      public: BUCKET.public,
      file_size_limit: BUCKET.file_size_limit,
      allowed_mime_types: BUCKET.allowed_mime_types,
    }),
  });
  if (!r.ok) throw new Error(`No pude actualizar el bucket: ${r.status} ${await r.text()}`);
  console.log(`✓ bucket "${BUCKET.id}" ya existía — configuración reconciliada`);
}

const final = (await buckets()).find((b) => b.id === BUCKET.id);
console.log(`  privado: ${!final.public}`);
console.log(`  límite:  ${final.file_size_limit} bytes`);
console.log(`  tipos:   ${(final.allowed_mime_types ?? []).join(", ")}`);
console.log(`\n  Las políticas RLS van aparte, en supabase/migrations/20260729150000_storage_chapas.sql`);
