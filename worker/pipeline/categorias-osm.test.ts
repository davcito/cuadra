/**
 * Tests del mapeo OSM → categorías de Cuadra.
 *
 * Lo que se protege acá no es "que la función ande": es que las decisiones
 * DOCUMENTADAS del mapeo sigan siendo ciertas. Cada test nombra la decisión que
 * defiende, así que si alguien la cambia a propósito, el test le dice cuál era y
 * puede cambiarlo a sabiendas.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  CATEGORIAS_CUADRA,
  MAPA_OSM,
  clasificar,
  filtrosParaOverpass,
} from "./categorias-osm.js";

test("un restaurante es huarique", () => {
  const r = clasificar({ amenity: "restaurant", name: "El anticucho de doña Peta" });
  assert.equal(r.categoria, "huarique");
  assert.equal(r.mapeada, true);
  assert.equal(r.porque, "amenity=restaurant");
});

test("un café es CASERO, no huarique: se va por el rato, no por la comida", () => {
  assert.equal(clasificar({ amenity: "cafe" }).categoria, "casero");
  assert.equal(clasificar({ amenity: "bar" }).categoria, "casero");
});

test("historic con cualquier valor es huaca (comodín)", () => {
  assert.equal(clasificar({ historic: "ruins" }).categoria, "huaca");
  assert.equal(clasificar({ historic: "memorial" }).categoria, "huaca");
  assert.equal(clasificar({ historic: "un_valor_que_no_existia_en_2026" }).categoria, "huaca");
});

test("un mirador es caleta", () => {
  assert.equal(clasificar({ tourism: "viewpoint" }).categoria, "caleta");
});

test("REGLA 1: un tag sin mapa NO se inventa categoría, entra crudo", () => {
  const r = clasificar({ amenity: "pharmacy" });
  assert.equal(r.categoria, "pharmacy", "debe conservar el valor de OSM tal cual");
  assert.equal(r.mapeada, false, "y quedar marcado para curar");
  assert.ok(!CATEGORIAS_CUADRA.includes(r.categoria as never), "no puede colarse como una de las 4");
});

test("el patrimonio gana sobre el comercio cuando un POI trae los dos tags", () => {
  // Una iglesia con cafetería adentro no es un café: es una huaca.
  const r = clasificar({ amenity: "cafe", historic: "church" });
  assert.equal(r.categoria, "huaca", "historic va primero en MAPA_OSM a propósito");
});

test("sin ningún tag útil queda sin_clasificar, no rompe", () => {
  const r = clasificar({ name: "Algo", "addr:street": "Av. Grau" });
  assert.equal(r.categoria, "sin_clasificar");
  assert.equal(r.mapeada, false);
});

test("toda categoría mapeada es una de las 4 de la marca", () => {
  // Protege el CHECK de missions.categoria: si alguien agrega una quinta al mapa
  // sin agregarla al enum, las Vueltas de ese POI reventarían al insertar.
  for (const [clave, valor, categoria] of MAPA_OSM) {
    assert.ok(
      CATEGORIAS_CUADRA.includes(categoria),
      `${clave}=${valor} mapea a "${categoria}", que no es una de las 4`
    );
  }
});

test("no hay entradas duplicadas en el mapa", () => {
  // Una duplicada es ambigüedad silenciosa: gana la primera y la segunda es letra
  // muerta que alguien va a editar creyendo que hace algo.
  const vistas = new Set<string>();
  for (const [clave, valor] of MAPA_OSM) {
    const k = `${clave}=${valor}`;
    assert.ok(!vistas.has(k), `${k} está dos veces en MAPA_OSM`);
    vistas.add(k);
  }
});

test("los filtros de Overpass salen del mapa, no de una lista aparte", () => {
  // Si alguien agrega una categoría y olvida pedirla, esos POIs nunca llegarían
  // y el bug sería invisible: no hay error, simplemente no aparecen.
  const filtros = filtrosParaOverpass();
  for (const [clave, valor] of MAPA_OSM) {
    const cubierto = filtros.some(
      (f) => f.clave === clave && (f.valor === null || f.valor === valor)
    );
    assert.ok(cubierto, `MAPA_OSM usa ${clave}=${valor} pero Overpass no lo pide`);
  }
});

test("se piden filtros EXACTOS, no familias enteras", () => {
  // Pedir ["building"] porque el mapa tiene building=church arrastra cada edificio
  // con nombre del distrito: medido en Barranco, 758 elementos inútiles de 1466.
  // Solo `historic` es comodín a propósito (todo lo histórico nos interesa).
  const comodines = filtrosParaOverpass().filter((f) => f.valor === null);
  assert.deepEqual(
    comodines.map((f) => f.clave).sort(),
    ["historic"],
    "solo historic debería pedirse como familia entera"
  );
});

test("una clave con comodín no repite sus valores puntuales", () => {
  const filtros = filtrosParaOverpass();
  for (const f of filtros.filter((x) => x.valor === null)) {
    const repes = filtros.filter((x) => x.clave === f.clave && x.valor !== null);
    assert.equal(repes.length, 0, `${f.clave} se pide entera y además por valor: trabajo duplicado`);
  }
});

test("las 4 categorías están todas representadas en el mapa", () => {
  const cubiertas = new Set(MAPA_OSM.map(([, , c]) => c));
  for (const c of CATEGORIAS_CUADRA) {
    assert.ok(cubiertas.has(c), `ningún tag de OSM mapea a "${c}": esa categoría nunca se llenaría`);
  }
});
