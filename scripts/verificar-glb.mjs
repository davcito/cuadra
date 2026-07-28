#!/usr/bin/env node
/**
 * Verifica un GLB ANTES de invertir tiempo en renderizarlo.
 *
 * Por qué existe: el 2026-07-28 se generaron 4 clips con la vía barata
 * (`3d_rigging`, 8 créditos) y los 4 volvieron con la malla colapsada a 95
 * triángulos — el archivo pesaba 6,4 MB porque traía la textura de alta, pero
 * envolvía una malla de origami. Se descubrió DESPUÉS de renderizar 114
 * cuadros. Este script lo habría cazado en 2 segundos.
 *
 * Lee el JSON del GLB sin cargar three.js: cuenta triángulos por primitiva,
 * skins, animaciones e imágenes.
 *
 *   node scripts/verificar-glb.mjs <archivo.glb|url> [--min-triangulos 20000]
 *
 * Sale con código 1 si no cumple el mínimo: sirve de puerta antes de renderizar.
 */

import { readFileSync } from "node:fs";

const MIN_POR_DEFECTO = 20000;

function leerJson(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error("no es un GLB (falta magic glTF)");
  const largoJson = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + largoJson).toString("utf8"));
}

function analizar(j, bytes) {
  let triangulos = 0;
  const primitivas = [];
  for (const [i, m] of (j.meshes ?? []).entries()) {
    for (const p of m.primitives ?? []) {
      const acc = p.indices != null ? j.accessors[p.indices] : j.accessors[p.attributes?.POSITION];
      const n = acc ? Math.floor(acc.count / 3) : 0;
      triangulos += n;
      primitivas.push({ mesh: i, nombre: m.name ?? `mesh_${i}`, triangulos: n });
    }
  }
  return {
    tamano_kb: Math.round(bytes / 1024),
    triangulos,
    primitivas,
    skins: (j.skins ?? []).length,
    huesos: (j.skins ?? []).reduce((s, k) => s + (k.joints?.length ?? 0), 0),
    animaciones: (j.animations ?? []).map((a) => a.name ?? "(sin nombre)"),
    imagenes: (j.images ?? []).length,
    materiales: (j.materials ?? []).length,
  };
}

const args = process.argv.slice(2);
const origen = args.find((a) => !a.startsWith("--"));
const min = args.includes("--min-triangulos")
  ? Number(args[args.indexOf("--min-triangulos") + 1])
  : MIN_POR_DEFECTO;

if (!origen) {
  console.error("Uso: node scripts/verificar-glb.mjs <archivo.glb|url> [--min-triangulos N]");
  process.exit(1);
}

const buf = /^https?:\/\//.test(origen)
  ? Buffer.from(await (await fetch(origen)).arrayBuffer())
  : readFileSync(origen);

const r = analizar(leerJson(buf), buf.length);

const ok = r.triangulos >= min;
const marca = (b) => (b ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m");

console.log(`\n\x1b[1m${origen.split("/").pop()}\x1b[0m  (${r.tamano_kb} KB)`);
console.log(`  ${marca(ok)} triángulos   ${r.triangulos.toLocaleString()}   (mínimo ${min.toLocaleString()})`);
console.log(`  ${marca(r.skins > 0)} skin         ${r.skins}  ·  ${r.huesos} huesos`);
console.log(`  ${marca(r.animaciones.length > 0)} animación    ${r.animaciones.join(", ") || "ninguna"}`);
console.log(`  ${marca(r.imagenes > 0)} texturas     ${r.imagenes} imagen(es), ${r.materiales} material(es)`);

if (!ok) {
  console.log(
    `\n\x1b[31mLa malla no llega al mínimo. Casi seguro vino de una vía que la decima\n` +
      `(3d_rigging colapsa a ~95 triángulos). NO la renderices: regenerá con\n` +
      `image_to_3d completo.\x1b[0m`
  );
}
process.exit(ok ? 0 : 1);
