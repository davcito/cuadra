import assert from "node:assert/strict";
import test from "node:test";

import { esModoSeguroNocturno, horaEnLima } from "./disponibilidad";

test("el horario se calcula en Lima, no en el huso del teléfono", () => {
  assert.equal(horaEnLima(new Date("2026-07-31T11:00:00Z")), 6);
});

test("modo seguro nocturno: 18:00–05:59 de Lima", () => {
  assert.equal(esModoSeguroNocturno(new Date("2026-07-31T10:59:00Z")), true);
  assert.equal(esModoSeguroNocturno(new Date("2026-07-31T11:00:00Z")), false);
  assert.equal(esModoSeguroNocturno(new Date("2026-07-31T22:59:00Z")), false);
  assert.equal(esModoSeguroNocturno(new Date("2026-07-31T23:00:00Z")), true);
});
