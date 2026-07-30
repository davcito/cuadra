/**
 * TEST DE CONTRATO entre el prompt y el validador.
 *
 * Este es el test que más plata ahorra de todo el worker, y por eso existe.
 *
 * Hoy `prompts/generacion-vueltas.md` y `pipeline/schema.ts` son dos archivos que
 * NADIE obliga a coincidir. El prompt le dice al modelo qué campos devolver; el
 * zod decide cuáles acepta. Si divergen —un campo que el prompt pide y el zod
 * rechaza, o un enum con un valor de más— pasa esto: se arma el lote, se paga la
 * llamada, el validador rechaza TODO, y se descubre en producción.
 *
 * Acá se descubre en `npm test`, gratis.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { cargarPrompt } from "./prompt.js";
import { CATEGORIAS, TIPOS_VUELTA, VENTANAS, VueltaSchema } from "./schema.js";

const prompt = cargarPrompt();

/**
 * Los ejemplos canónicos del SYSTEM, ya parseados.
 *
 * Se ancla en `{"poi_id"` y no en un `{` cualquiera: la v1.1 del prompt agregó
 * `{"vueltas": [ ... ]}` en la regla 2, y un regex que arrancaba en el primer
 * `{` lo agarraba como si fuera un ejemplo. Este test lo detectó — por eso el
 * ancla ahora describe lo que un ejemplo ES, no dónde suele estar.
 */
function ejemplosCanonicos(): Array<Record<string, unknown>> {
  const crudos = [...prompt.system.matchAll(/\{\s*"poi_id"[\s\S]*?"instruccion_verificacion"[\s\S]*?\}/g)];
  // El markdown corta líneas por ancho; el JSON real no lleva esos saltos.
  return crudos.map(([c]) => JSON.parse(c.replace(/\n/g, " ")) as Record<string, unknown>);
}

test("el prompt se puede cargar y trae sus tres bloques", () => {
  assert.ok(prompt.system.length > 200, "el SYSTEM parece truncado");
  assert.ok(prompt.formaUser, "falta la forma del payload USER");
  assert.ok(prompt.schemaDocumentado, "falta el SCHEMA de salida");
  assert.match(prompt.version, /^v[\d.]+$/, "el título debe declarar versión");
});

test("los campos del SCHEMA documentado son EXACTAMENTE los que exige el zod", () => {
  // El zod es `.strict()`: un campo de más y rechaza el lote entero.
  const delZod = Object.keys(VueltaSchema.shape).sort();
  const delPrompt = Object.keys(prompt.schemaDocumentado).sort();
  assert.deepEqual(
    delPrompt,
    delZod,
    "el prompt le pide al modelo campos distintos de los que el validador acepta"
  );
});

test("los enums del prompt coinciden con los del validador", () => {
  // Un valor de más en el prompt = el modelo lo usa = el lote entero se descarta.
  const sacarValores = (campo: string): string[] =>
    (prompt.schemaDocumentado[campo] ?? "")
      .split("|")
      .map((s) => s.trim())
      .filter((s) => s && !s.includes(" "));

  assert.deepEqual(sacarValores("tipo").sort(), [...TIPOS_VUELTA].sort(), "enum de tipo");
  assert.deepEqual(sacarValores("categoria").sort(), [...CATEGORIAS].sort(), "enum de categoria");

  const ventanasPrompt = (prompt.schemaDocumentado.ventana_horaria ?? "")
    .split(":")[1]
    ?.split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  assert.deepEqual(ventanasPrompt?.sort(), [...VENTANAS].sort(), "enum de ventana_horaria");
});

test("los ejemplos canónicos del SYSTEM pasan el validador de verdad", () => {
  // Si un ejemplo del prompt no valida, le estamos enseñando al modelo a fallar.
  // Es la forma más cara de romper esto: el modelo copia el ejemplo, obediente,
  // y el lote se descarta entero.
  const ejemplos = ejemplosCanonicos();
  assert.ok(ejemplos.length >= 2, `esperaba 2+ ejemplos canónicos, encontré ${ejemplos.length}`);

  for (const json of ejemplos) {
    const r = VueltaSchema.safeParse(json);
    assert.ok(
      r.success,
      `un ejemplo canónico NO pasa el validador: ${r.success ? "" : JSON.stringify(r.error.issues)}`
    );
  }
});

test("los ejemplos canónicos respetan la regla 7 (calle_xp coherente con dificultad)", () => {
  // El zod solo pide entero positivo, así que esta regla del prompt no la cubre
  // nadie. Al menos que los ejemplos —que son lo que el modelo imita— la cumplan.
  const rangos: Record<number, [number, number]> = { 1: [10, 15], 2: [20, 30], 3: [40, 60] };
  for (const crudo of ejemplosCanonicos()) {
    const v = crudo as unknown as { dificultad: number; calle_xp: number; titulo: string };
    const r = rangos[v.dificultad];
    assert.ok(r, `dificultad ${v.dificultad} fuera de 1-3`);
    assert.ok(
      v.calle_xp >= r[0] && v.calle_xp <= r[1],
      `"${v.titulo}": dificultad ${v.dificultad} pide ${r[0]}-${r[1]} de Calle, tiene ${v.calle_xp}`
    );
  }
});

test("el payload USER documentado trae las claves que el pipeline va a mandar", () => {
  const u = prompt.formaUser as Record<string, unknown>;
  for (const clave of ["celda", "distrito", "pois", "cantidad"]) {
    assert.ok(clave in u, `el prompt no documenta la clave "${clave}" del payload`);
  }
  const pois = u.pois as Array<Record<string, unknown>>;
  assert.ok(Array.isArray(pois) && pois.length > 0, "pois debe ser un array con ejemplo");
  for (const clave of ["id", "nombre", "categoria"]) {
    assert.ok(clave in pois[0]!, `el ejemplo de POI no trae "${clave}"`);
  }
});

test("el SYSTEM le prohíbe al modelo inventar lugares (regla dura #1 del proyecto)", () => {
  // No es cosmético: es la regla que impide que la app mande a alguien a un lugar
  // que no existe. Si alguien la saca del prompt, este test lo frena.
  assert.match(prompt.system, /NUNCA inventes/i);
  assert.match(prompt.system, /SOLO puedes crear misiones sobre los POIs del input/i);
});
