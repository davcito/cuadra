/**
 * Tests del chequeo de proximidad.
 *
 * Este chequeo existe porque una auditoría del primer lote de Barranco encontró
 * tres Vueltas dentro de 57 m del mismo parque. El zod las daba por buenas —el
 * JSON era impecable— porque el defecto no está en ninguna Vuelta sino entre dos.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  GEOFENCE_M,
  avisosDeProximidad,
  metrosEntre,
  paresQueNoObliganACaminar,
  type VueltaUbicada,
} from "./proximidad.js";

// Barranco, para que los números sean del mismo orden que el caso real.
const BASE = { lat: -12.1489, lon: -77.0252 };
const desplazada = (metrosNorte: number) => ({
  lat: BASE.lat + metrosNorte / 110_574, // 1° de latitud ≈ 110.574 m
  lon: BASE.lon,
});

const v = (titulo: string, p: { lat: number; lon: number }, osm_id = 1): VueltaUbicada => ({
  titulo,
  osm_id,
  lat: p.lat,
  lon: p.lon,
});

test("la distancia entre un punto y sí mismo es cero", () => {
  assert.equal(Math.round(metrosEntre(BASE, BASE)), 0);
});

test("haversine da la distancia esperada en el orden correcto", () => {
  // Si esto se desvía, todos los umbrales de abajo mienten.
  assert.ok(Math.abs(metrosEntre(BASE, desplazada(100)) - 100) < 1, "100 m al norte");
  assert.ok(Math.abs(metrosEntre(BASE, desplazada(57)) - 57) < 1, "57 m — el caso real de Barranco");
});

test("la distancia es simétrica", () => {
  const a = BASE;
  const b = desplazada(64);
  assert.equal(metrosEntre(a, b).toFixed(6), metrosEntre(b, a).toFixed(6));
});

test("marca el par que se chapa sin caminar", () => {
  // El caso que motivó todo: tres vueltas alrededor del mismo parque.
  const pares = paresQueNoObliganACaminar([
    v("El busto", BASE, 1),
    v("El parque", desplazada(23), 2),
    v("La banca", desplazada(57), 3),
  ]);
  assert.equal(pares.length, 3, "los tres pares están dentro del geofence");
  assert.equal(pares[0]!.metros, 23, "se ordena del más cercano al más lejano");
});

test("no marca lo que sí obliga a caminar", () => {
  assert.deepEqual(paresQueNoObliganACaminar([v("A", BASE, 1), v("B", desplazada(200), 2)]), []);
});

test("el borde exacto del geofence NO se marca", () => {
  // A 75 m justos ya no se chapan las dos desde el mismo punto: el geofence es
  // "menos de 75 m". Un off-by-one acá llenaría el informe de falsos positivos.
  const pares = paresQueNoObliganACaminar([v("A", BASE, 1), v("B", desplazada(GEOFENCE_M), 2)]);
  assert.equal(pares.length, 0, `a ${GEOFENCE_M} m exactos no debería marcar`);
});

test("distingue un duplicado de OSM de dos lugares distintos pero pegados", () => {
  const casi = paresQueNoObliganACaminar([v("Parque", BASE, 1), v("Parque", desplazada(12), 2)]);
  assert.equal(casi[0]!.probableDuplicado, true, "12 m con el mismo nombre huele a duplicado");

  const vecinos = paresQueNoObliganACaminar([v("Café", BASE, 1), v("Librería", desplazada(60), 2)]);
  assert.equal(vecinos[0]!.probableDuplicado, false, "60 m son dos locales distintos");
});

test("el aviso dice los dos títulos y los metros", () => {
  // Un aviso que no nombra el par obliga a buscarlo a mano entre 74 vueltas.
  const [aviso] = avisosDeProximidad([v("El busto", BASE, 1), v("El parque", desplazada(23), 2)]);
  assert.match(aviso!, /El busto/);
  assert.match(aviso!, /El parque/);
  assert.match(aviso!, /23 m/);
});

test("un lote de una sola vuelta no puede tener pares", () => {
  assert.deepEqual(paresQueNoObliganACaminar([v("Sola", BASE, 1)]), []);
  assert.deepEqual(paresQueNoObliganACaminar([]), []);
});
