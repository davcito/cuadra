/**
 * Tests de geo (§12.3.5: haversine/bearing son código crítico —
 * alimentan el radar Y el anti-fraude).
 * Corre con: npm test  (node test runner via tsx, sin tocar Expo)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  haversineMetros,
  bearingGrados,
  esDistanciaCaminable,
  metrosACuadras,
  textoCuadras,
  velocidadMs,
} from "./geo.js";

// 1 grado de latitud ≈ 111 195 m con radio medio 6 371 000 (π·R/180).
const METROS_POR_GRADO_LAT = 111_195;

test("distancia de un punto a sí mismo es 0", () => {
  const p = { lat: -12.1494, lng: -77.0205 }; // Plaza de Barranco
  assert.equal(haversineMetros(p, p), 0);
});

test("1 grado de latitud ≈ 111.2 km", () => {
  const d = haversineMetros({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
  assert.ok(Math.abs(d - METROS_POR_GRADO_LAT) < 200, `obtuve ${d}`);
});

test("1 grado de longitud en el ecuador ≈ 111.2 km", () => {
  const d = haversineMetros({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
  assert.ok(Math.abs(d - METROS_POR_GRADO_LAT) < 200, `obtuve ${d}`);
});

test("la distancia es simétrica", () => {
  const a = { lat: -12.1494, lng: -77.0205 };
  const b = { lat: -12.121, lng: -77.03 };
  assert.ok(Math.abs(haversineMetros(a, b) - haversineMetros(b, a)) < 1e-6);
});

test("bearing hacia el norte es 0°", () => {
  assert.equal(bearingGrados({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }), 0);
});

test("bearing hacia el este es 90°", () => {
  const b = bearingGrados({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
  assert.ok(Math.abs(b - 90) < 0.01, `obtuve ${b}`);
});

test("bearing hacia el sur es 180°", () => {
  const b = bearingGrados({ lat: 1, lng: 0 }, { lat: 0, lng: 0 });
  assert.ok(Math.abs(b - 180) < 0.01, `obtuve ${b}`);
});

test("bearing hacia el oeste es 270°", () => {
  const b = bearingGrados({ lat: 0, lng: 1 }, { lat: 0, lng: 0 });
  assert.ok(Math.abs(b - 270) < 0.01, `obtuve ${b}`);
});

test("bearing siempre cae en [0, 360)", () => {
  const puntos = [
    [{ lat: 10, lng: 10 }, { lat: -5, lng: -120 }],
    [{ lat: -50, lng: 170 }, { lat: 20, lng: -170 }],
  ] as const;
  for (const [a, b] of puntos) {
    const r = bearingGrados(a, b);
    assert.ok(r >= 0 && r < 360, `obtuve ${r}`);
  }
});

test("conversión metros → cuadras (1 cuadra = 100 m)", () => {
  assert.equal(metrosACuadras(0), 0);
  assert.equal(metrosACuadras(100), 1);
  assert.equal(metrosACuadras(250), 2.5);
});

test("copy en cuadras, jamás en km (firma de marca §3.1)", () => {
  assert.equal(textoCuadras(40), "a media cuadra");
  assert.equal(textoCuadras(100), "a 1 cuadra");
  assert.equal(textoCuadras(2300), "a 23 cuadras");
  assert.ok(!textoCuadras(15000).includes("km"));
});

test("una sugerencia nunca manda al jugador a otro distrito", () => {
  assert.equal(esDistanciaCaminable(999), true);
  assert.equal(esDistanciaCaminable(1000), true);
  assert.equal(esDistanciaCaminable(1001), false);
  assert.equal(esDistanciaCaminable(12_499), false);
  assert.equal(esDistanciaCaminable(null), false);
});

test("velocidad imposible: 1 km en 10 s = 100 m/s (capa 4 anti-fraude)", () => {
  const a = { lat: 0, lng: 0 };
  const b = { lat: 0.008993, lng: 0 }; // ≈ 1000 m al norte
  const v = velocidadMs(a, b, 10_000);
  assert.ok(Math.abs(v - 100) < 1, `obtuve ${v}`);
});

test("velocidad con dt=0 es Infinity (no divide por cero)", () => {
  assert.equal(
    velocidadMs({ lat: 0, lng: 0 }, { lat: 1, lng: 1 }, 0),
    Number.POSITIVE_INFINITY
  );
});
