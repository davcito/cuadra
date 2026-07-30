#!/usr/bin/env node
/**
 * Verifica que todo `require("...")` de un asset apunte a un archivo que existe.
 *
 * Por qué existe: al reemplazar `caminar.webp` por `caminar24.webp` borré el
 * viejo y dejé el `require` apuntando al vacío. TypeScript no lo ve —el require
 * de un asset es un string opaco para el compilador— y Metro tampoco: revienta
 * recién cuando el teléfono pide esa pantalla. Es decir, el error viaja hasta el
 * dispositivo de David. Este chequeo lo mata en 200 ms.
 *
 * De paso reporta assets huérfanos (están en disco pero nadie los pide), que es
 * peso muerto en el paquete final.
 *
 *   node scripts/verificar-assets.mjs
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(BASE, "app", "src");
const ASSETS = join(BASE, "app", "assets");

/** Recorre un directorio devolviendo todos los archivos que cumplan el filtro. */
function listar(dir, ok) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? listar(p, ok) : ok(p) ? [p] : [];
  });
}

const fuentes = listar(SRC, (p) => /\.[jt]sx?$/.test(p));
const enDisco = new Set(listar(ASSETS, () => true).map((p) => resolve(p)));

const rotos = [];
const usados = new Set();

// require("...") y import ... from "..." apuntando a un archivo con extensión
// de asset (los módulos .ts/.tsx los resuelve TypeScript, esos no nos tocan).
const PATRON = /(?:require\(|from\s+)["'](\.[^"']+\.(?:png|jpe?g|webp|gif|svg|mp4|mp3|wav|ttf|otf|json|glb))["']/g;

for (const archivo of fuentes) {
  const texto = readFileSync(archivo, "utf8");
  for (const m of texto.matchAll(PATRON)) {
    const destino = resolve(dirname(archivo), m[1]);
    if (existsSync(destino)) usados.add(destino);
    else rotos.push({ archivo: relative(BASE, archivo), pedido: m[1] });
  }
}

// `app.json` referencia iconos y splash por ruta de texto, no por require. Sin
// leerlo, el ícono de la app aparecería como huérfano y el reporte no sería
// creíble — una herramienta que grita en falso deja de mirarse.
const config = join(BASE, "app", "app.json");
if (existsSync(config)) {
  for (const m of readFileSync(config, "utf8").matchAll(/["'](\.[^"']*assets\/[^"']+)["']/g)) {
    usados.add(resolve(join(BASE, "app"), m[1]));
  }
}

const huerfanos = [...enDisco].filter((p) => !usados.has(p) && /\.(png|jpe?g|webp|gif|mp4)$/i.test(p));

const kb = (p) => Math.round(statSync(p).size / 1024);

if (rotos.length) {
  console.error(`\n✗ ${rotos.length} require(s) apuntan a archivos que no existen:\n`);
  for (const r of rotos) console.error(`   ${r.archivo}\n     → ${r.pedido}`);
} else {
  console.log(`✓ ${usados.size} assets referenciados, todos existen.`);
}

if (huerfanos.length) {
  const total = huerfanos.reduce((a, p) => a + kb(p), 0);
  console.log(`\n· ${huerfanos.length} assets en disco que nadie usa (${total} KB de peso muerto):`);
  for (const p of huerfanos) console.log(`   ${relative(BASE, p)}  ${kb(p)} KB`);
}

process.exit(rotos.length ? 1 : 0);
