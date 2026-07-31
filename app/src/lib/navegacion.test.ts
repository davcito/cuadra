import assert from "node:assert/strict";
import test from "node:test";

import { urlParaLlegar } from "./navegacion";

const poi = { lat: -12.1412579, lng: -77.0218157 };

test("iOS abre Apple Maps a pie con el nombre del lugar", () => {
  assert.equal(
    urlParaLlegar(poi, "Don Juancito", "ios"),
    "http://maps.apple.com/?daddr=-12.1412579,-77.0218157&dirflg=w&q=Don%20Juancito"
  );
});

test("Android delega al navegador de mapas elegido por el usuario", () => {
  assert.equal(
    urlParaLlegar(poi, "Don Juancito", "android"),
    "geo:-12.1412579,-77.0218157?q=-12.1412579,-77.0218157(Don%20Juancito)"
  );
});

test("web cae en OpenStreetMap", () => {
  assert.match(urlParaLlegar(poi, "Don Juancito", "web"), /^https:\/\/www\.openstreetmap\.org\//);
});
