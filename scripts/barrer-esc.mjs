#!/usr/bin/env node
/**
 * Encuentra todo número de GEOMETRÍA que no pasa por `esc()`.
 *
 * Por qué existe: se le pidió a once agentes que enumeraran, archivo por archivo, los
 * números a migrar. Ocho de los once SUBCONTARON — `index.tsx` declaró 15 cambios y
 * tiene 37; `vueltas.tsx` declaró 32 y tiene 56. Aplicar esas listas dejaría entre 4 y
 * 22 números crudos por archivo, o sea una migración a medias: la caja de una pieza
 * escala y sus tripas no, y la pieza queda deformada. Peor que no migrar.
 *
 * O sea: enumerar a ojo no sirve, ni humano ni modelo. Esto lo hace el parser.
 *
 * REGLA (extraída del código ya migrado, no inventada): `esc()` traduce GEOMETRÍA
 * VISIBLE en unidades del prototipo. Si en un equipo 28 % más grande esa cosa debe
 * verse 28 % más grande, pasa por `esc()`. No importa si el número vino del mockup o
 * lo inventó el código.
 *
 *   node scripts/barrer-esc.mjs            # lista lo que falta
 *   node scripts/barrer-esc.mjs --todo     # detalle número por número
 *   node scripts/barrer-esc.mjs --aplicar  # los envuelve
 *
 * El modo `--aplicar` vive en este mismo archivo A PROPÓSITO: si el que detecta y
 * el que corrige fueran dos scripts, podrían divergir y el barredor daría verde
 * sobre algo que el fixer nunca tocó. Comparten la lista, así que no pueden.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(BASE, "app", "src");
const VERBOSO = process.argv.includes("--todo");
const APLICAR = process.argv.includes("--aplicar");

/** Propiedades que SON geometría visible: su número tiene que escalar. */
const GEOMETRIA = new RegExp(
  "\\b(fontSize|lineHeight|letterSpacing" +
    "|padding|paddingTop|paddingBottom|paddingLeft|paddingRight|paddingHorizontal|paddingVertical" +
    "|margin|marginTop|marginBottom|marginLeft|marginRight|marginHorizontal|marginVertical" +
    "|gap|rowGap|columnGap" +
    "|borderWidth|borderTopWidth|borderBottomWidth|borderLeftWidth|borderRightWidth" +
    "|borderRadius|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius" +
    "|width|height|minWidth|minHeight|maxWidth|maxHeight" +
    "|top|bottom|left|right|shadowRadius)\\s*:\\s*(-?\\d+(?:\\.\\d+)?)\\b",
  "g"
);

/**
 * Lo que NO escala, y por qué. Cada entrada es una decisión tomada con evidencia;
 * si alguien la cambia, que sea a sabiendas.
 */
const EXCEPCIONES = [
  {
    prueba: (arch) => /-html\.ts$/.test(arch),
    porque:
      "es una plantilla de CSS para WebView, no un StyleSheet de React Native. " +
      "Ahí el navegador ya maneja sus propias unidades y `esc()` no aplica.",
  },
  {
    prueba: (arch) => arch.includes("calato-sprite"),
    porque:
      "píxeles del ATLAS, no del prototipo. El propio archivo documenta que escalarlos " +
      "es lo que producía el hormigueo: el desplazamiento de celda va en enteros del atlas.",
  },
  {
    prueba: (arch) => arch.includes("calato-clip"),
    porque: "las PROPORCION son ratios medidos del render; escalar un lado deforma a Calato.",
  },
  {
    prueba: (arch, linea) => arch.includes("components/ui.tsx") && /<(Svg|Rect|Path|Circle|G)\b/.test(linea),
    porque: "coordenadas internas de un <Svg> CON viewBox: son unidades del viewBox, no px.",
  },
];

/** Valores que nunca se envuelven, cualquiera sea la propiedad. */
function valorExento(prop, valor, linea) {
  if (Number(valor) === 0) return "el 0 no es una medida (0 × factor = 0)";
  // Centinela de píldora: "redondo del todo". theme.ts lo declara literal.
  if (/^border(Top|Bottom)?(Left|Right)?Radius$/.test(prop) && Number(valor) >= 99)
    return "centinela de píldora (usar radios.chip)";
  // Los insets de safe-area ya vienen en px reales del equipo.
  if (/insets\./.test(linea)) return "convive con un inset de safe-area (px reales)";
  return null;
}

function listar(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? listar(p) : p.endsWith(".tsx") || p.endsWith(".ts") ? [p] : [];
  });
}

const crudos = [];
const exentos = [];
// Un `fontSize: esc(15)` no matchea GEOMETRIA (después del `:` no hay un número
// pelado), así que lo ya migrado simplemente no aparece. Para poder decir cuánto
// se lleva hecho, se cuentan aparte las llamadas a esc().
let yaMigrados = 0;

for (const archivo of listar(SRC)) {
  const rel = relative(BASE, archivo).replace(/\\/g, "/");
  const lineas = readFileSync(archivo, "utf8").split("\n");

  const saltar = EXCEPCIONES.find((e) => e.prueba(rel, ""));
  if (saltar && saltar.prueba(rel, "")) {
    if (VERBOSO) console.log(`· ${rel} — omitido: ${saltar.porque}`);
    continue;
  }

  yaMigrados += (readFileSync(archivo, "utf8").match(/\besc\(/g) ?? []).length;

  lineas.forEach((linea, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(linea)) return; // comentarios
    const porRegion = EXCEPCIONES.find((e) => e.prueba(rel, linea));
    for (const m of linea.matchAll(GEOMETRIA)) {
      const [, prop, valor] = m;
      const exento = porRegion ? porRegion.porque : valorExento(prop, valor, linea);
      if (exento) {
        exentos.push({ rel, n: i + 1, prop, valor, porque: exento });
        continue;
      }
      crudos.push({ rel, n: i + 1, prop, valor, linea: linea.trim().slice(0, 76), archivo });
    }
  });
}

if (APLICAR && crudos.length) {
  // Se reescribe de atrás para adelante dentro de cada línea para que envolver un
  // número no corra la posición de los siguientes de la misma línea.
  const porArch = new Map();
  for (const c of crudos) {
    if (!porArch.has(c.archivo)) porArch.set(c.archivo, []);
    porArch.get(c.archivo).push(c);
  }
  let tocados = 0;
  for (const [archivo, lista] of porArch) {
    const lineas = readFileSync(archivo, "utf8").split("\n");
    const porLinea = new Map();
    for (const c of lista) {
      if (!porLinea.has(c.n)) porLinea.set(c.n, []);
      porLinea.get(c.n).push(c);
    }
    for (const [n, cs] of porLinea) {
      let linea = lineas[n - 1];
      // Una sola pasada con reemplazo por función: envuelve cada aparición de las
      // propiedades pendientes en ESA línea, sin recalcular índices a mano.
      const pendientes = new Set(cs.map((c) => `${c.prop}:${c.valor}`));
      linea = linea.replace(GEOMETRIA, (todo, prop, valor) =>
        pendientes.has(`${prop}:${valor}`) ? `${prop}: esc(${valor})` : todo
      );
      lineas[n - 1] = linea;
    }
    writeFileSync(archivo, lineas.join("\n"));
    tocados++;
  }
  console.log(`✓ ${crudos.length} números envueltos en ${tocados} archivos.`);
  console.log("  Ahora: revisar imports de esc, correr tsc y volver a barrer.");
  process.exit(0);
}

// Invariante que no se puede romper: escalar dos veces agranda de más y en silencio.
const dobles = [];
for (const archivo of listar(SRC)) {
  const rel = relative(BASE, archivo).replace(/\\/g, "/");
  readFileSync(archivo, "utf8")
    .split("\n")
    .forEach((l, i) => {
      if (/esc\(\s*esc\(/.test(l)) dobles.push(`${rel}:${i + 1}  ${l.trim().slice(0, 70)}`);
    });
}

const porArchivo = new Map();
for (const c of crudos) porArchivo.set(c.rel, (porArchivo.get(c.rel) ?? 0) + 1);

if (dobles.length) {
  console.error(`\n✗ DOBLE esc() — agranda de más y no se ve en el diff:\n`);
  for (const d of dobles) console.error(`   ${d}`);
}

if (crudos.length === 0) {
  console.log(`✓ geometría: ${yaMigrados} números pasan por esc(), 0 crudos.`);
} else {
  console.log(`\n✗ ${crudos.length} números de geometría SIN esc() en ${porArchivo.size} archivos:\n`);
  for (const [rel, n] of [...porArchivo].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(n).padStart(3)}  ${rel}`);
  }
  console.log(`\n   (${yaMigrados} ya migrados · ${exentos.length} exentos con motivo)`);
  if (VERBOSO) {
    console.log("\nDetalle:");
    for (const c of crudos) console.log(`   ${c.rel}:${c.n}  ${c.prop}: ${c.valor}   ${c.linea}`);
    console.log("\nExentos:");
    for (const e of exentos) console.log(`   ${e.rel}:${e.n}  ${e.prop}: ${e.valor} — ${e.porque}`);
  }
}

process.exit(crudos.length || dobles.length ? 1 : 0);
