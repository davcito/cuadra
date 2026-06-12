/**
 * Genera supabase/seed/seed.sql: celdas H3 res. 9 reales de Barranco
 * (gridDisk desde la Plaza de Armas) + POIs/vueltas/figuritas de PRUEBA
 * para desarrollo local.
 *
 * Uso:  node scripts/generar-celdas-barranco.mjs > supabase/seed/seed.sql
 *
 * IMPORTANTE: las celdas salen con nivel_seguridad=1 por defecto.
 * La curación real (niveles 2/3, recorte de bordes) la hace David
 * caminando el distrito (§13, última tarea) y se edita en el panel admin.
 * Los POIs de prueba tienen coordenadas aproximadas: el sync real
 * vendrá de OSM via worker/pipeline/1-sync-pois.ts.
 */
import { createRequire } from "node:module";
const require = createRequire(new URL("../worker/package.json", import.meta.url));
const h3 = require("h3-js");

const RES = 9; // resolución de juego (documento maestro §7.1)
const PLAZA_BARRANCO = [-12.1494, -77.0205];
const K_ANILLOS = 3; // 37 celdas ≈ 3.9 km² — cubre Barranco; bordes se curan a pie

const celdas = h3.gridDisk(h3.latLngToCell(...PLAZA_BARRANCO, RES), K_ANILLOS);

// POIs de prueba (coordenadas aproximadas, SOLO para dev)
const pois = [
  { osm_id: 9001, nombre: "Puente de los Suspiros", categoria: "huaca", lat: -12.14893, lng: -77.02520 },
  { osm_id: 9002, nombre: "Plaza de Armas de Barranco", categoria: "huaca", lat: -12.14940, lng: -77.02050 },
  { osm_id: 9003, nombre: "Mercado N°1 de Barranco", categoria: "huarique", lat: -12.14620, lng: -77.01770 },
];

const sql = [];
sql.push("-- ============================================================");
sql.push("-- SEED de desarrollo — generado por scripts/generar-celdas-barranco.mjs");
sql.push(`-- ${celdas.length} celdas H3 res. ${RES} de Barranco + datos de PRUEBA.`);
sql.push("-- NO usar en producción sin curación de seguridad a pie (§13).");
sql.push("-- ============================================================");
sql.push("");
sql.push("-- Celdas (nivel_seguridad=1 provisional; curación pendiente)");
sql.push("insert into public.cells (h3_index, distrito, ciudad, pais, nivel_seguridad, activa) values");
sql.push(
  celdas.map((c) => `  ('${c}', 'Barranco', 'Lima', 'PE', 1, true)`).join(",\n") +
    "\non conflict (h3_index) do nothing;"
);
sql.push("");
sql.push("-- POIs de prueba (coordenadas aproximadas — el sync real es via OSM)");
for (const p of pois) {
  const celda = h3.latLngToCell(p.lat, p.lng, RES);
  sql.push(
    `insert into public.pois (osm_id, nombre, categoria, ubicacion, h3_index) values\n` +
      `  (${p.osm_id}, '${p.nombre.replace(/'/g, "''")}', '${p.categoria}', ` +
      `st_point(${p.lng}, ${p.lat})::geography, '${celda}')\n` +
      `on conflict (osm_id) do nothing;`
  );
}
sql.push("");
sql.push("-- Vueltas de prueba (estado='activa' para que la app tenga qué mostrar)");
sql.push(`insert into public.missions (poi_id, h3_index, titulo, descripcion, tipo, categoria, dificultad, calle_xp, ventana_horaria, requiere_foto, instruccion_verificacion, estado)
select p.id, p.h3_index, v.titulo, v.descripcion, v.tipo, v.categoria, v.dificultad, v.calle_xp, v.ventana, true, v.verif, 'activa'
from (values
  (9001, 'El puente que pide un deseo', 'Dicen que si cruzas el Puente de los Suspiros aguantando la respiración, se te cumple un deseo. Inténtalo y de paso mira el Bajada de Baños desde arriba.', 'patrimonio', 'huaca', 1, 12, array['mañana','tarde','noche'], 'Foto sobre el puente de madera con la bajada visible'),
  (9002, 'La plaza de siempre', 'Siéntate un toque en una banca de la plaza y encuentra el detalle de la biblioteca municipal que casi nadie nota: su reloj. ¿Qué hora marca?', 'observacion', 'caleta', 1, 10, array['mañana','tarde'], 'Foto de la fachada de la biblioteca donde se vea el reloj'),
  (9003, 'El dato de la caserita', 'En el Mercado N°1 pregúntale a una caserita cuál es la fruta que más vende esta semana. Si te animas, pruébala.', 'social', 'casero', 2, 25, array['mañana'], 'Foto dentro del mercado con un puesto de frutas visible')
) as v(osm_id, titulo, descripcion, tipo, categoria, dificultad, calle_xp, ventana, verif)
join public.pois p on p.osm_id = v.osm_id
on conflict do nothing;`);
sql.push("");
sql.push("-- Figuritas de prueba (página 'Barranco' del Álbum)");
sql.push(`insert into public.cards (poi_id, nombre, barrio, rareza)
select p.id, c.nombre, 'Barranco', c.rareza
from (values
  (9001, 'Puente de los Suspiros', 'rara'),
  (9002, 'Plaza de Barranco', 'comun'),
  (9003, 'Mercado N°1', 'poco_comun')
) as c(osm_id, nombre, rareza)
join public.pois p on p.osm_id = c.osm_id
on conflict do nothing;`);
sql.push("");

console.log(sql.join("\n"));
