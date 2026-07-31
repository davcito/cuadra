import assert from "node:assert/strict";
import { test } from "node:test";

import {
  ALCANCE_PREDETERMINADO,
  filtrarVueltasPorAlcance,
  siguienteAlcance,
} from "./alcance-vueltas.js";
import type { VueltaCerca } from "./vueltas-cerca.js";

function vuelta(id: number, distancia_m: number): VueltaCerca {
  return {
    id,
    titulo: `Vuelta ${id}`,
    descripcion: "",
    categoria: "huarique",
    dificultad: 1,
    calle_xp: 20,
    instruccion_verificacion: null,
    poi_nombre: `Lugar ${id}`,
    lat: -12.1,
    lng: -77,
    distancia_m,
  };
}

const catalogo = [
  vuelta(1, 600),
  vuelta(2, 1_000),
  vuelta(3, 2_500),
  vuelta(4, 7_500),
  vuelta(5, 12_000),
];

test("Por acá nomás es el alcance predeterminado y llega a 10 cuadras", () => {
  assert.equal(ALCANCE_PREDETERMINADO, "aca");
  assert.deepEqual(
    filtrarVueltasPorAlcance(catalogo, "aca").map((v) => v.id),
    [1, 2]
  );
});

test("los alcances son acumulativos: ampliar nunca pierde resultados cercanos", () => {
  assert.deepEqual(
    filtrarVueltasPorAlcance(catalogo, "vuelta").map((v) => v.id),
    [1, 2, 3]
  );
  assert.deepEqual(
    filtrarVueltasPorAlcance(catalogo, "barrio").map((v) => v.id),
    [1, 2, 3, 4]
  );
  assert.deepEqual(
    filtrarVueltasPorAlcance(catalogo, "lejos").map((v) => v.id),
    [1, 2, 3, 4, 5]
  );
});

test("la ampliación termina en Toda Lima", () => {
  assert.equal(siguienteAlcance("aca"), "vuelta");
  assert.equal(siguienteAlcance("vuelta"), "barrio");
  assert.equal(siguienteAlcance("barrio"), "lejos");
  assert.equal(siguienteAlcance("lejos"), null);
});
