#!/usr/bin/env node
/**
 * Sirve `app/dist` (el export web de Expo) con fallback de SPA.
 *
 * Por qué no `python -m http.server`: el export usa `web.output: "single"`, así
 * que sólo existe `index.html`. Un servidor estático común devuelve 404 en
 * `/crear-cuenta` y no se puede auditar una ruta directa — que es justo lo que
 * hace falta para revisar una pantalla sin sesión en el navegador.
 *
 *   node scripts/servir-web.mjs [puerto] [directorio]
 *     - por defecto: puerto 8090 sirviendo `app/dist`
 *     - para el inspector de GLB: `node scripts/servir-web.mjs 8091 scripts/inspector`
 */

import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, isAbsolute, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUERTO = Number(process.argv[2]) || 8090;
const DIR = process.argv[3] || "app/dist";
const RAIZ = isAbsolute(DIR) ? DIR : resolve(BASE, DIR);

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
  console.error(
    `No existe ${RAIZ}.` +
      (DIR === "app/dist" ? "  Corré primero:  cd app && npx expo export --platform web" : "")
  );
  process.exit(1);
}

createServer((req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, "http://localhost").pathname);

  // POST /captura  ← la página manda un dataURL y lo guardamos en disco.
  // Existe porque el panel del navegador no siempre está desplegado y sin él
  // no hay captura de pantalla; así el render se puede revisar igual.
  if (req.method === "POST" && ruta === "/captura") {
    const trozos = [];
    req.on("data", (c) => trozos.push(c));
    req.on("end", () => {
      try {
        const b64 = Buffer.concat(trozos).toString().replace(/^data:image\/\w+;base64,/, "");
        // ?nombre=clips/saludo_007 permite armar secuencias en subcarpetas. Se
        // permite UN nivel de subdirectorio (sin "..") para no escapar de RAIZ.
        const pedido = new URL(req.url, "http://localhost").searchParams.get("nombre");
        const limpio = pedido
          ? pedido.replace(/\.\.+/g, "").replace(/[^\w./-]/g, "").replace(/^\/+/, "")
          : "";
        const nombre = limpio ? `${limpio}.png` : `captura-${process.hrtime.bigint()}.png`;
        const destino = join(RAIZ, nombre);
        mkdirSync(dirname(destino), { recursive: true });
        writeFileSync(destino, Buffer.from(b64, "base64"));
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(nombre);
      } catch (e) {
        res.writeHead(500);
        res.end(String(e));
      }
    });
    return;
  }
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
