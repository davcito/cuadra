#!/usr/bin/env node
/**
 * Sirve `app/dist` (el export web de Expo) con fallback de SPA.
 *
 * Por qué no `python -m http.server`: el export usa `web.output: "single"`, así
 * que sólo existe `index.html`. Un servidor estático común devuelve 404 en
 * `/crear-cuenta` y no se puede auditar una ruta directa — que es justo lo que
 * hace falta para revisar una pantalla sin sesión en el navegador.
 *
 *   node scripts/servir-web.mjs [puerto]     # por defecto 8090
 */

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "dist");
const PUERTO = Number(process.argv[2]) || 8090;

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
};

if (!existsSync(RAIZ)) {
  console.error(`No existe ${RAIZ}. Corré primero:  cd app && npx expo export --platform web`);
  process.exit(1);
}

createServer((req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  // normalize + prefijo: nadie sale de dist con "../"
  let archivo = normalize(join(RAIZ, ruta));
  if (!archivo.startsWith(RAIZ)) archivo = RAIZ;

  if (existsSync(archivo) && statSync(archivo).isFile()) {
    res.writeHead(200, { "content-type": TIPOS[extname(archivo)] ?? "application/octet-stream" });
    createReadStream(archivo).pipe(res);
    return;
  }
  // Fallback de SPA: cualquier ruta desconocida la resuelve expo-router.
  res.writeHead(200, { "content-type": TIPOS[".html"] });
  createReadStream(join(RAIZ, "index.html")).pipe(res);
}).listen(PUERTO, () => {
  console.log(`Sirviendo app/dist en http://localhost:${PUERTO} (fallback SPA activo)`);
});
