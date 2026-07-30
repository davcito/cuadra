#!/usr/bin/env node
/**
 * Prueba `chapar()` contra la base REAL sin dejar rastro.
 *
 * Cada caso corre dentro de `begin ... rollback`, así que las completions,
 * figuritas, rachas y Calle que se crean se deshacen al terminar. Es la única
 * forma honesta de probar una función que escribe en cinco tablas: mockear el
 * esquema probaría el mock, y probar sin revertir dejaría la base sucia con
 * chapadas que nadie caminó — justo el dato que el producto vende como confiable.
 *
 * El contexto de usuario se simula como lo hace PostgREST: `set local role
 * authenticated` + `request.jwt.claims`, que es de donde `auth.uid()` lee.
 *
 *   node scripts/probar-chapar.mjs
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const TMP = mkdtempSync(join(tmpdir(), "chapar-"));

function sql(query) {
  const f = join(TMP, "q.json");
  writeFileSync(f, JSON.stringify({ query }));
  const out = execFileSync("node", [join(RAIZ, "scripts", "mcp-supabase.mjs"), "call", "execute_sql", `@${f}`], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  const m = out.match(/\[.*\]/s);
  if (!m) throw new Error(out.slice(0, 400));
  return JSON.parse(m[0].replace(/\\"/g, '"'));
}

// Datos reales de la base: el primer perfil y la primera vuelta activa.
const [base] = sql(`
  select p.id::text as user_id, m.id as mission_id, m.titulo,
         extensions.st_y(po.ubicacion::extensions.geometry) as lat,
         extensions.st_x(po.ubicacion::extensions.geometry) as lng
    from profiles p
    cross join missions m
    join pois po on po.id = m.poi_id
   where m.estado = 'activa'
   order by m.id limit 1`);

console.log(`usuario  ${base.user_id}`);
console.log(`vuelta   ${base.mission_id} · "${base.titulo}"`);
console.log(`POI      ${base.lat}, ${base.lng}\n`);

/** Corre `chapar()` como el usuario, dentro de una transacción que revierte. */
function chapar({ mission = base.mission_id, lat = base.lat, lng = base.lng, foto = null, mock = false, precision = null, antes = "" } = {}) {
  const args = [mission, lat === null ? "null" : lat, lng === null ? "null" : lng,
                foto === null ? "null" : `'${foto}'`, mock, precision === null ? "null" : precision].join(", ");
  // `antes` corre ANTES del cambio de rol, a propósito: prepara el escenario con
  // privilegios plenos. Corriéndolo como `authenticated` fallaba — y esa falla
  // era correcta, porque el cliente no puede escribir `mission_completions`
  // (ADR-0001). El test estaba mal, no el sistema.
  const filas = sql(`
    begin;
    ${antes}
    set local role authenticated;
    set local request.jwt.claims = '{"sub":"${base.user_id}","role":"authenticated"}';
    select public.chapar(${args}) as r;
    rollback;`);
  return filas.at(-1)?.r ?? filas[0]?.r;
}

/**
 * Objeto de storage sintético para el caso feliz.
 *
 * Subirlo de verdad por la API lo dejaría con `owner_id` del service_role, no
 * del usuario, así que no probaría lo que importa. Se inserta la fila directo
 * —dentro de la transacción que revierte— con exactamente los campos que mira
 * `chapar()`: dueño, ruta con el mission_id, tipo y peso.
 */
/** Latitud desplazada N metros al norte. 1° de latitud ≈ 110.574 m. */
const mover = (metros) => base.lat + metros / 110_574;

/** Fila de la escotilla de prueba, dentro de la transacción que revierte. */
const prueba = (radio, vence) => `
  insert into checkin_pruebas (user_id, radio_m, motivo, expira_en)
  values ('${base.user_id}', ${radio}, 'test automatizado', now() + interval '${vence}')
  on conflict (user_id) do update set radio_m = excluded.radio_m, expira_en = excluded.expira_en;`;

const fotoValida = `${base.user_id}/${base.mission_id}/prueba.jpg`;
const insertarFoto = `
  insert into storage.objects (bucket_id, name, owner_id, metadata)
  values ('chapas', '${fotoValida}', '${base.user_id}',
          '{"mimetype":"image/jpeg","size":250000}'::jsonb);`;

const casos = [
  ["caso feliz (sin foto: la vuelta la pide, así que debe rechazar)", () => chapar(), "falta_foto"],
  ["fuera de rango — 3 km al norte", () => chapar({ lat: base.lat + 0.027 }), "lejos"],
  ["coordenadas NULL (la capa 2 no se puede apagar con un parámetro)", () => chapar({ lat: null }), "coordenadas_invalidas"],
  ["longitud fuera de rango (PostGIS la envolvería en silencio)", () => chapar({ lng: 500 }), "coordenadas_invalidas"],
  ["vuelta inexistente (la rama que la FK hacía inalcanzable)", () => chapar({ mission: 999999999 }), "vuelta_inexistente"],
  ["ubicación simulada — capa 3", () => chapar({ mock: true }), "mock_location"],
  ["foto como URL en vez de ruta (contrato, no fraude)", () => chapar({ foto: "https://x/y.jpg" }), "foto_ruta_invalida"],
  ["foto en carpeta ajena", () => chapar({ foto: "00000000-0000-0000-0000-000000000000/1/a.jpg" }), "foto_ruta_invalida"],
  ["foto con ruta válida pero objeto inexistente", () => chapar({ foto: `${base.user_id}/${base.mission_id}/no-existe.jpg` }), "foto_no_verificable"],
  ["ya chapada (unique(user, mission))", () =>
    chapar({ foto: fotoValida, antes: insertarFoto + `
      insert into mission_completions (user_id, mission_id, ubicacion_checkin, distancia_m)
      values ('${base.user_id}', ${base.mission_id},
              extensions.st_makepoint(${base.lng}, ${base.lat})::extensions.geography, 1);` }),
    "ya_chapada"],
  ["CASO FELIZ — parado en el POI, con foto válida", () =>
    chapar({ foto: fotoValida, antes: insertarFoto }), "ok"],
  ["foto demasiado chica (1 byte chapaba las 63 vueltas)", () =>
    chapar({ foto: fotoValida, antes: `
      insert into storage.objects (bucket_id, name, owner_id, metadata)
      values ('chapas', '${fotoValida}', '${base.user_id}',
              '{"mimetype":"image/jpeg","size":1}'::jsonb);` }), "foto_no_verificable"],
  ["foto de OTRA vuelta (la ruta la ata a ésta)", () =>
    chapar({ foto: `${base.user_id}/999/prueba.jpg`, antes: `
      insert into storage.objects (bucket_id, name, owner_id, metadata)
      values ('chapas', '${base.user_id}/999/prueba.jpg', '${base.user_id}',
              '{"mimetype":"image/jpeg","size":250000}'::jsonb);` }), "foto_no_verificable"],

  // ── Geofence consciente del instrumento ──────────────────────────────
  ["GPS con 300 m de error: no se amplía, se rechaza", () =>
    chapar({ precision: 300 }), "gps_impreciso"],
  ["a 90 m SIN precisión reportada: radio 75, rebota", () =>
    chapar({ lat: mover(90) }), "lejos"],
  ["a 90 m CON 20 m de error de GPS: radio 95, entra", () =>
    chapar({ lat: mover(90), precision: 20, foto: fotoValida, antes: insertarFoto }), "ok"],
  ["a 110 m con 20 m de error: el tope de +25 no alcanza, rebota", () =>
    chapar({ lat: mover(110), precision: 20 }), "lejos"],

  // ── La escotilla de prueba ───────────────────────────────────────────
  ["sin fila de prueba, a 3 km rebota", () => chapar({ lat: mover(3000) }), "lejos"],
  ["con fila de prueba vigente, a 3 km entra", () =>
    chapar({ lat: mover(3000), foto: fotoValida, antes: insertarFoto + prueba(5000, "+1 hour") }), "ok"],
  ["la fila vencida NO sirve", () =>
    chapar({ lat: mover(3000), antes: prueba(5000, "-1 minute") }), "lejos"],
];

let ok = 0;
for (const [nombre, correr, esperado] of casos) {
  let r;
  try {
    r = correr();
  } catch (e) {
    console.log(`✗ ${nombre}\n    EXCEPCIÓN: ${String(e.message).slice(0, 200)}`);
    continue;
  }
  const motivo = r?.motivo ?? (r?.ok ? "ok" : "(sin motivo)");
  const bien = motivo === esperado;
  if (bien) ok++;
  console.log(`${bien ? "✓" : "✗"} ${nombre}`);
  console.log(`    esperaba ${esperado} · obtuvo ${motivo}${bien ? "" : `  →  ${JSON.stringify(r)}`}`);
}

console.log(`\n${ok}/${casos.length} casos correctos`);
process.exit(ok === casos.length ? 0 : 1);
