/**
 * Tests del contrato de Vueltas (§12.3.5: testear lo crítico).
 * Corre con: npm test  (node test runner via tsx)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarLoteVueltas, VueltaSchema } from "./schema.js";

const vueltaValida = {
  poi_id: 1,
  titulo: "El dato de la caserita",
  descripcion: "Pregunta en el mercado cuál es la fruta más vendida.",
  tipo: "social",
  categoria: "casero",
  dificultad: 2,
  calle_xp: 25,
  ventana_horaria: ["mañana"],
  requiere_foto: true,
  instruccion_verificacion: "Foto dentro del mercado",
};

test("acepta una vuelta válida", () => {
  assert.doesNotThrow(() => VueltaSchema.parse(vueltaValida));
});

test("rechaza poi_id inventado (regla dura #1: la IA nunca inventa lugares)", () => {
  assert.throws(
    () => validarLoteVueltas([vueltaValida], new Set([99])),
    /poi_id inexistentes/
  );
});

test("acepta el lote cuando todos los poi_id son reales", () => {
  const lote = validarLoteVueltas([vueltaValida], new Set([1]));
  assert.equal(lote.length, 1);
});

test("rechaza titulo de más de 60 caracteres", () => {
  assert.throws(() => VueltaSchema.parse({ ...vueltaValida, titulo: "x".repeat(61) }));
});

test("rechaza descripcion de más de 280 caracteres", () => {
  assert.throws(() => VueltaSchema.parse({ ...vueltaValida, descripcion: "x".repeat(281) }));
});

test("rechaza tipo fuera del enum", () => {
  assert.throws(() => VueltaSchema.parse({ ...vueltaValida, tipo: "aventura" }));
});

test("rechaza dificultad fuera de 1-3", () => {
  assert.throws(() => VueltaSchema.parse({ ...vueltaValida, dificultad: 4 }));
  assert.throws(() => VueltaSchema.parse({ ...vueltaValida, dificultad: 0 }));
});

test("rechaza ventana_horaria vacía o inválida", () => {
  assert.throws(() => VueltaSchema.parse({ ...vueltaValida, ventana_horaria: [] }));
  assert.throws(() => VueltaSchema.parse({ ...vueltaValida, ventana_horaria: ["madrugada"] }));
});

test("rechaza campos extra (salida del modelo debe ser exacta)", () => {
  assert.throws(() => VueltaSchema.parse({ ...vueltaValida, propina: 5 }));
});

test("rechaza JSON que no es array en el lote", () => {
  assert.throws(() => validarLoteVueltas({ vueltas: [vueltaValida] }, new Set([1])));
});
