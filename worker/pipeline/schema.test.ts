/**
 * Tests del contrato de Vueltas (§12.3.5: testear lo crítico).
 * Corre con: npm test  (node test runner via tsx)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { revisarLote, validarLoteVueltas, VueltaSchema, type Vuelta } from "./schema.js";

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

/* ── Regla 7: la economía del juego no la decide el humor del modelo ────── */

test("rechaza calle_xp fuera del rango de su dificultad (regla 7)", () => {
  // El caso que motivó esto: d1 repartiendo 55 de Calle pasaba entero, porque el
  // zod solo pide entero positivo. Lo encontró una prueba de humo, no un test.
  assert.throws(
    () => validarLoteVueltas([{ ...vueltaValida, dificultad: 1, calle_xp: 55 }], new Set([1])),
    /calle_xp fuera del rango/
  );
  assert.throws(
    () => validarLoteVueltas([{ ...vueltaValida, dificultad: 3, calle_xp: 12 }], new Set([1])),
    /calle_xp fuera del rango/
  );
});

test("acepta calle_xp en los bordes exactos de cada dificultad", () => {
  // Los bordes son válidos: 10 y 15 para d1, no 11-14. Un off-by-one acá
  // rechazaría lotes correctos, que es la forma cara de equivocarse.
  for (const [dif, xp] of [[1, 10], [1, 15], [2, 20], [2, 30], [3, 40], [3, 60]] as const) {
    assert.doesNotThrow(
      () => validarLoteVueltas([{ ...vueltaValida, dificultad: dif, calle_xp: xp }], new Set([1])),
      `d${dif} con ${xp} de Calle debería ser válida`
    );
  }
});

/* ── Regla 5: las distancias se cuentan en cuadras (firma de marca) ─────── */

test("avisa cuando una DISTANCIA va en metros o kilómetros (regla 5)", () => {
  for (const texto of [
    "Camina 200 metros hasta la esquina y mira el mural.",
    "Está a 1 km del parque, vale la pena.",
    "Son unos 300 mts nomás, no te quejes.",
    "A dos kilómetros del malecón hay algo que ver.",
  ]) {
    const avisos = revisarLote([{ ...base, descripcion: texto }]);
    assert.ok(avisos.some((a) => /regla 5/.test(a)), `debería avisar: "${texto}"`);
  }
});

test("regla 5 avisa, NO rechaza: una frase off-brand no tira el lote", () => {
  // Un falso positivo obliga a regenerar todo un lote; una frase que se cuela es
  // una mancha recuperable. La asimetría decide la severidad.
  assert.doesNotThrow(() =>
    validarLoteVueltas([{ ...vueltaValida, descripcion: "Camina 200 metros hasta la esquina." }], new Set([1]))
  );
});

test("un TAMAÑO en metros no es una distancia y no se avisa", () => {
  // Los dos casos reales que rechazó la primera versión, contra el lote de
  // Barranco: una escultura de metro y medio y una Mafalda de 80 centímetros.
  // Son dimensiones de un objeto, y decirlas así es correcto.
  for (const texto of [
    "Hay una escultura de metro y medio, obra de Oliver Venegas.",
    "En la Sáenz Peña hay una Mafalda de 80 centímetros.",
  ]) {
    assert.deepEqual(revisarLote([{ ...base, descripcion: texto }]), [], `no debería avisar: "${texto}"`);
  }
});

test("no confunde palabras que solo CONTIENEN la unidad", () => {
  // `\b` en JavaScript es ASCII: entre "í" y "metros" ve un límite de palabra,
  // así que "centímetros" matcheaba. El test viejo usaba "geométrico", que pasa
  // por otro motivo (no contiene "metro"), o sea que no probaba lo que decía.
  for (const texto of [
    "Mira el patrón geométrico del piso, tiene lo suyo.",
    "Esta metrópoli tiene esquinas que nadie mira.",
    "El kilometraje del recorrido no importa: importa lo que ves.",
    "Son diez centímetros de nada, pero se nota.",
    "Toma el metro y bájate donde te provoque.",
  ]) {
    assert.deepEqual(revisarLote([{ ...base, descripcion: texto }]), [], `no debería avisar: "${texto}"`);
  }
});

/* ── Glosario LEY y fuga del pipeline ──────────────────────────────────── */

test('avisa cuando el texto dice "misión" en vez de Vuelta (el glosario es LEY)', () => {
  for (const texto of [
    "Misión de vereda: nada de tocar timbre.",
    "Tu misión: encontrar la puerta.",
    "Comprar no entra en la misión.",
    "Estas misiones son cortas.",
  ]) {
    const avisos = revisarLote([{ ...base, descripcion: texto }]);
    assert.ok(avisos.some((a) => /glosario/.test(a)), `debería avisar: "${texto}"`);
  }
});

test("avisa cuando se filtra el vocabulario interno del pipeline", () => {
  for (const texto of [
    "Este POI no tiene horario.",
    "Los tags de OSM no dicen más.",
    "Está fuera del geofence.",
  ]) {
    const avisos = revisarLote([{ ...base, descripcion: texto }]);
    assert.ok(avisos.some((a) => /vocabulario interno/.test(a)), `debería avisar: "${texto}"`);
  }
});

test('avisa cuando el texto le habla al jugador de "el mapa"', () => {
  // El remedio contra la invención se volvió fórmula: 6 de 10 descripciones de
  // una celda terminaron narrando qué trae la base de datos.
  for (const texto of [
    "En el mapa ni número tiene, así que toca caminar.",
    "El mapa no dice nada: ni horario ni qué venden.",
    "De este sitio no dice nada el mapa.",
  ]) {
    const avisos = revisarLote([{ ...base, descripcion: texto }]);
    assert.ok(avisos.some((a) => /fuga del pipeline/.test(a)), `debería avisar: "${texto}"`);
  }
});

test("no confunde un mapa de verdad con la fuga del pipeline", () => {
  // Mandar a mirar un mapa físico, o usar el propio mapa de la app, es legítimo.
  for (const texto of [
    "Busca el mapa del parque en la entrada y ubica dónde estás.",
    "En la pared hay un mapa viejo del distrito, míralo con calma.",
  ]) {
    assert.deepEqual(revisarLote([{ ...base, descripcion: texto }]), [], `no debería avisar: "${texto}"`);
  }
});

/* ── Regla 9: repartir tipos y ventanas (avisa, no rechaza) ─────────────── */

// `vueltaValida` es un literal suelto, así que sus campos ensanchan a `string` y
// no encajan en `Vuelta`. Los tests de arriba lo quieren así (le meten valores
// inválidos a propósito); los de acá abajo necesitan el tipo estricto.
const base = VueltaSchema.parse(vueltaValida);

test("revisarLote avisa cuando el lote es monótono, sin rechazarlo", () => {
  const iguales: Vuelta[] = Array.from({ length: 8 }, (_, i) => ({
    ...base,
    titulo: `Vuelta ${i}`,
    tipo: "observacion" as const,
    ventana_horaria: ["mañana" as const],
  }));
  const avisos = revisarLote(iguales);
  assert.ok(avisos.some((a) => /tipo/.test(a)), `esperaba aviso de tipo, hubo: ${avisos.join(" | ")}`);
  assert.ok(avisos.some((a) => /noche/.test(a)), "esperaba aviso de que nada sirve de noche");
  // Lo importante: avisa y NO tira. El lote es pobre, no inválido.
  assert.doesNotThrow(() => validarLoteVueltas(iguales, new Set([1])));
});

test("revisarLote se calla con un lote variado", () => {
  const variado: Vuelta[] = [
    { ...base, titulo: "A", tipo: "observacion", categoria: "caleta", dificultad: 1, calle_xp: 12, ventana_horaria: ["mañana"] },
    { ...base, titulo: "B", tipo: "social", categoria: "casero", dificultad: 2, calle_xp: 25, ventana_horaria: ["tarde"] },
    { ...base, titulo: "C", tipo: "patrimonio", categoria: "huaca", dificultad: 3, calle_xp: 50, ventana_horaria: ["noche"] },
    { ...base, titulo: "D", tipo: "consumo", categoria: "huarique", dificultad: 2, calle_xp: 22, ventana_horaria: ["noche"] },
  ];
  assert.deepEqual(revisarLote(variado), []);
});

test("revisarLote no opina sobre lotes de menos de 4", () => {
  assert.deepEqual(revisarLote([base]), []);
});

test("el mensaje de error dice qué vuelta y qué rango esperaba", () => {
  // Un error que no dice cuál falló obliga a leer 70 vueltas a mano.
  assert.throws(
    () => validarLoteVueltas([{ ...vueltaValida, titulo: "La sospechosa", dificultad: 1, calle_xp: 99 }], new Set([1])),
    /La sospechosa.*d1.*10-15.*99/
  );
});
