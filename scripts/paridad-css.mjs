#!/usr/bin/env node
/**
 * paridad-css — compara la SPEC del prototipo contra los estilos del código.
 *
 * Por qué existe: el 2026-07-28 aparecieron 8 disparidades con el prototipo en
 * una sola tarde (alto de la barra inventado, padding asimétrico, gap 1 vs 3,
 * icono de Perfil espejado, toldo liso, toldo 2 px más bajo, rayas del doble de
 * ancho, blanco equivocado). SIETE de las ocho eran comparables sin correr la
 * app: estaban en el CSS del prototipo y en el StyleSheet, en archivos distintos.
 * Encontrarlas a ojo cuesta una tarde; este script tarda 200 ms.
 *
 *   node scripts/paridad-css.mjs           # todos los pares
 *   node scripts/paridad-css.mjs toldo     # uno
 *   node scripts/paridad-css.mjs --json    # para encadenar
 *
 * Sale con código 1 si hay alguna diferencia — sirve de puerta antes de un commit.
 *
 * Lo que NO puede: nada que dependa de correr (el padding interno que React
 * Navigation le mete a su tab item y que empujó los rótulos fuera del panel).
 * Para eso hace falta el auditor de runtime — ver `auditar-runtime.mjs`.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PROTOTIPO = join(RAIZ, "docs/identidad/CUADRA-Prototipo-v1.dc.html");
const TEMA = join(RAIZ, "app/src/lib/theme.ts");

/**
 * Los pares que vigilamos. Agregar acá cuando una pantalla nueva tome una
 * pieza del prototipo. `notas` documenta desvíos DELIBERADOS para que el
 * script no los reporte como error cada corrida.
 */
const PARES = [
  {
    nombre: "boton",
    css: ".btn",
    archivo: "app/src/components/ui.tsx",
    // En RN una regla CSS se parte en contenedor + texto: se comparan juntos.
    estilos: ["boton", "botonTexto"],
    notas: {
      backgroundColor: "lo pone la variante del <Boton>, no el estilo base",
      width: "en RN el botón ya ocupa el ancho de su columna",
    },
  },
  {
    nombre: "tarjeta",
    css: ".card",
    archivo: "app/src/components/ui.tsx",
    estilos: ["tarjeta"],
  },
  {
    nombre: "chip",
    css: ".chip",
    archivo: "app/src/components/ui.tsx",
    estilos: ["chip", "chipTexto"],
    notas: {
      backgroundColor: "cada chip trae su color por prop (categoría, racha, etc.)",
      color: "idem: viene por prop",
    },
  },
  {
    nombre: "campo",
    css: ".campo",
    archivo: "app/src/components/ui.tsx",
    // La caja y el texto están separados para poder meter el botón del ojo.
    estilos: ["campoCaja", "campoTexto"],
    notas: {
      color: "el CSS pinta el PLACEHOLDER; en la app este es el color del texto escrito",
    },
  },
  {
    nombre: "toldo",
    css: ".toldo",
    archivo: "app/src/components/ui.tsx",
    estilos: ["toldo"],
    notas: {
      backgroundColor: "las rayas son Views hijas de ancho fijo 14, no un degradado",
    },
  },
  {
    nombre: "barra",
    css: ".tabs",
    archivo: "app/src/app/(app)/_layout.tsx",
    estilos: ["barra"],
    notas: {
      bottom:
        "el prototipo dibuja teléfonos sin indicador de home: el margen sale de insets, no de 14 fijo",
      justifyContent: "los items usan flex:1, que reparte igual que space-around",
    },
  },
  {
    nombre: "barraItem",
    css: ".tab",
    archivo: "app/src/app/(app)/_layout.tsx",
    estilos: ["item", "rotulo"],
    notas: {
      color: "activo/inactivo se decide por prop",
      fontWeight: "por prop: bold cuando está inactivo, extrabold cuando está activo",
    },
  },
];

/** Valores que RN ya aplica por defecto: si el código los omite, está bien. */
const DEFECTOS_RN = {
  flexDirection: "column",
  position: "relative",
  alignItems: "stretch",
  justifyContent: "flex-start",
  overflow: "visible",
};

/** El `font-weight` del CSS se vuelve una FAMILIA en RN (una por peso). */
const PESO_A_FUENTE = {
  400: "regular",
  500: "medium",
  600: "semibold",
  700: "bold",
  800: "extrabold",
  900: "black",
};

// ── CSS ────────────────────────────────────────────────────────────────────

function leerCss(html) {
  const bloque = html.match(/<style>([\s\S]*?)<\/style>/);
  if (!bloque) throw new Error("El prototipo no tiene bloque <style>");
  const texto = bloque[1];

  const vars = {};
  const raiz = texto.match(/:root\s*\{([\s\S]*?)\}/);
  if (raiz) {
    for (const [, k, v] of raiz[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      vars[k] = v.trim();
    }
  }

  const reglas = {};
  for (const [, selector, cuerpo] of texto.matchAll(/([.#][\w-]+(?:\.[\w-]+)?)\s*\{([^}]*)\}/g)) {
    const props = {};
    for (const decl of cuerpo.split(";")) {
      const i = decl.indexOf(":");
      if (i === -1) continue;
      props[decl.slice(0, i).trim()] = decl
        .slice(i + 1)
        .trim()
        .replace(/var\(--([\w-]+)\)/g, (_, n) => vars[n] ?? `var(--${n})`);
    }
    // Un selector repetido (.btn y .btn.ghost) no pisa al primero.
    if (!reglas[selector]) reglas[selector] = props;
  }
  return reglas;
}

const px = (v) => {
  const m = String(v).trim().match(/^(-?[\d.]+)px$/);
  return m ? Number(m[1]) : null;
};

/** Convierte declaraciones CSS al vocabulario de React Native. */
function cssARn(props) {
  const r = {};
  const set = (k, v) => {
    if (v !== null && v !== undefined) r[k] = v;
  };

  for (const [prop, valorCrudo] of Object.entries(props)) {
    const valor = valorCrudo.trim();
    switch (prop) {
      case "padding": {
        const partes = valor.split(/\s+/).map(px);
        if (partes.length === 1) set("padding", partes[0]);
        else if (partes.length === 2) {
          set("paddingVertical", partes[0]);
          set("paddingHorizontal", partes[1]);
        } else if (partes.length === 4) {
          set("paddingTop", partes[0]);
          set("paddingRight", partes[1]);
          set("paddingBottom", partes[2]);
          set("paddingLeft", partes[3]);
        }
        break;
      }
      case "border-radius": {
        const partes = valor.split(/\s+/);
        if (partes.length === 1) set("borderRadius", px(partes[0]) ?? valor);
        else {
          // TL TR BR BL — el orden que tenía espejado el icono de Perfil.
          const [tl, tr, br, bl] = partes;
          set("borderTopLeftRadius", px(tl) ?? tl);
          set("borderTopRightRadius", px(tr) ?? tr);
          set("borderBottomRightRadius", px(br) ?? br);
          set("borderBottomLeftRadius", px(bl) ?? bl);
        }
        break;
      }
      case "border":
      case "border-top":
      case "border-bottom": {
        const [ancho, estilo, ...color] = valor.split(/\s+/);
        const sufijo = prop === "border" ? "" : prop === "border-top" ? "Top" : "Bottom";
        set(`border${sufijo}Width`, px(ancho));
        if (color.length) set("borderColor", color.join(" ").toUpperCase());
        if (estilo && estilo !== "solid") set("borderStyle", estilo);
        break;
      }
      case "box-shadow": {
        // Sombra dura de marca: X Y 0 color, sin blur.
        const m = valor.match(/^(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px/);
        if (m) {
          set("sombraX", Number(m[1]));
          set("sombraY", Number(m[2]));
          set("sombraBlur", Number(m[3]));
        }
        break;
      }
      case "font-size":
        set("fontSize", px(valor));
        break;
      case "font-weight":
        set("fontWeight", Number(valor) || valor);
        break;
      case "letter-spacing": {
        const em = valor.match(/^([\d.]+)em$/);
        if (em) set("letterSpacingEm", Number(em[1]));
        else set("letterSpacing", px(valor));
        break;
      }
      case "background":
      case "background-color":
        if (!valor.includes("gradient")) set("backgroundColor", valor.toUpperCase());
        else set("backgroundColor", "«degradado»");
        break;
      case "color":
        set("color", valor.toUpperCase());
        break;
      case "height":
      case "width":
      case "gap":
      case "top":
      case "left":
      case "right":
      case "bottom":
        set(prop, px(valor) ?? valor);
        break;
      case "flex-direction":
        set("flexDirection", valor);
        break;
      case "align-items":
        set("alignItems", valor === "flex-start" ? "flex-start" : valor);
        break;
      case "justify-content":
        set("justifyContent", valor);
        break;
      case "overflow":
        set("overflow", valor);
        break;
      case "position":
        set("position", valor);
        break;
      case "box-sizing":
        set("_boxSizing", valor);
        break;
      default:
        break;
    }
  }

  // CSS por defecto es content-box: el alto declarado NO incluye los bordes.
  // En RN el borde va DENTRO de la caja. Esta corrección es la que faltaba
  // en <Toldo> (decía 12 donde la spec da 10 + 2 + 2 = 14).
  if (r.height != null && r._boxSizing !== "border-box") {
    const bordes =
      (r.borderTopWidth ?? r.borderWidth ?? 0) + (r.borderBottomWidth ?? r.borderWidth ?? 0);
    if (bordes > 0) {
      r.height = r.height + bordes;
      r._altoAjustado = `content-box: ${r.height - bordes} + ${bordes} de borde`;
    }
  }
  // letter-spacing en em necesita el tamaño de fuente para volverse px.
  if (r.letterSpacingEm != null && r.fontSize != null) {
    r.letterSpacing = Number((r.letterSpacingEm * r.fontSize).toFixed(2));
  }
  delete r.letterSpacingEm;
  delete r._boxSizing;
  return r;
}

// ── Código ─────────────────────────────────────────────────────────────────

/**
 * Evalúa los objetos de theme.ts sin compilarlo (es TS pero son literales).
 *
 * Le inyectamos un `Dimensions` con el ANCHO DEL PROTOTIPO (336): así
 * `factorEscala` da 1 y `esc(n) === n`, o sea que el script compara la spec del
 * prototipo contra las medidas del prototipo. Si comparara contra las del
 * equipo, marcaría como error justamente la escala que queremos.
 */
function leerTema() {
  const ts = readFileSync(TEMA, "utf8")
    .replace(/^\s*import[^;]+;/gm, "")
    .replace(/\bas const\b/g, "")
    .replace(/export const/g, "const")
    // anotaciones de tipo en parámetros: `(n: number) =>` → `(n) =>`
    .replace(/\(\s*(\w+)\s*:\s*[\w[\]<>|. ]+\s*\)/g, "($1)");
  const nombres = [...ts.matchAll(/^const (\w+)\s*=/gm)].map((m) => m[1]);
  const Dimensions = { get: () => ({ width: 336, height: 718 }) };
  const fn = new Function("Dimensions", `${ts}\nreturn { ${nombres.join(", ")} };`);
  return fn(Dimensions);
}

/** Extrae UN objeto de estilo de un StyleSheet.create, ya con tokens resueltos. */
function leerEstilo(rutaArchivo, nombreEstilo, tema) {
  const src = readFileSync(join(RAIZ, rutaArchivo), "utf8");
  const i = src.indexOf("StyleSheet.create(");
  if (i === -1) throw new Error(`${rutaArchivo}: no encontré StyleSheet.create`);

  // Recorte con balance de llaves: el objeto puede tener anidados.
  let j = src.indexOf("{", i);
  let nivel = 0;
  let fin = j;
  for (; fin < src.length; fin++) {
    if (src[fin] === "{") nivel++;
    else if (src[fin] === "}") {
      nivel--;
      if (nivel === 0) break;
    }
  }
  const cuerpo = src.slice(j, fin + 1).replace(/\bas const\b/g, "");

  const fn = new Function(
    ...Object.keys(tema),
    "StyleSheet",
    `return ${cuerpo};`
  );
  const todos = fn(...Object.values(tema), { create: (x) => x, hairlineWidth: 1 });
  if (!(nombreEstilo in todos)) {
    throw new Error(`${rutaArchivo}: no existe el estilo "${nombreEstilo}"`);
  }
  return todos[nombreEstilo];
}

// ── Comparación ────────────────────────────────────────────────────────────

const norm = (v) => (typeof v === "string" ? v.toUpperCase().trim() : v);

function comparar(par, reglasCss, tema) {
  const props = reglasCss[par.css];
  if (!props) return { ...par, error: `el prototipo no tiene ${par.css}` };

  const esperado = cssARn(props);
  const nota = esperado._altoAjustado;
  delete esperado._altoAjustado;

  let real = {};
  try {
    for (const nombre of par.estilos) {
      real = { ...real, ...leerEstilo(par.archivo, nombre, tema) };
    }
  } catch (e) {
    return { ...par, error: e.message };
  }

  const filas = [];
  for (const [prop, valorEsperado] of Object.entries(esperado)) {
    if (prop.startsWith("sombra")) continue; // la sombra dura se dibuja aparte en RN

    let valorReal = real[prop];
    let esperadoMostrado = valorEsperado;

    // font-weight ↔ fontFamily: en RN cada peso es una familia propia.
    if (prop === "fontWeight" && valorReal === undefined) {
      const familia = tema.fuentes?.[PESO_A_FUENTE[valorEsperado]];
      if (familia) {
        valorReal = real.fontFamily;
        esperadoMostrado = familia;
      }
    }
    // `padding: 13px` en CSS suele escribirse partido en RN.
    if (prop === "padding" && valorReal === undefined) {
      const v = real.paddingVertical ?? real.paddingTop;
      const h = real.paddingHorizontal ?? real.paddingLeft;
      if (v !== undefined || h !== undefined) valorReal = v === h ? v : `V:${v} H:${h}`;
    }
    // Lo que RN ya hace por defecto no hace falta declararlo.
    if (valorReal === undefined && DEFECTOS_RN[prop] === valorEsperado) {
      valorReal = `${valorEsperado} (defecto de RN)`;
    }

    const justificado = par.notas?.[prop];
    const igual = norm(valorReal) === norm(esperadoMostrado) || String(valorReal).startsWith(String(esperadoMostrado));
    filas.push({
      prop,
      esperado: esperadoMostrado,
      real: valorReal === undefined ? "—" : valorReal,
      estado: igual ? "ok" : justificado ? "nota" : "dif",
      justificado,
    });
  }
  return { ...par, filas, nota, diferencias: filas.filter((f) => f.estado === "dif").length };
}

// ── Salida ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const json = args.includes("--json");
const filtro = args.find((a) => !a.startsWith("--"));

const reglasCss = leerCss(readFileSync(PROTOTIPO, "utf8"));
const tema = leerTema();
const resultados = PARES.filter((p) => !filtro || p.nombre === filtro).map((p) =>
  comparar(p, reglasCss, tema)
);

if (json) {
  console.log(JSON.stringify(resultados, null, 2));
  process.exit(resultados.some((r) => r.error || r.diferencias) ? 1 : 0);
}

const ICONO = { ok: "  ", dif: "✗ ", nota: "· " };
let totalDif = 0;

for (const r of resultados) {
  if (r.error) {
    console.log(`\n\x1b[31m✗ ${r.nombre}\x1b[0m — ${r.error}`);
    totalDif++;
    continue;
  }
  const cabecera = `${r.nombre}  ${r.css} → ${r.archivo.split("/").pop()}#${r.estilos.join("+")}`;
  console.log(`\n\x1b[1m${cabecera}\x1b[0m`);
  if (r.nota) console.log(`  \x1b[2m${r.nota}\x1b[0m`);
  for (const f of r.filas) {
    const color = f.estado === "dif" ? "\x1b[31m" : f.estado === "nota" ? "\x1b[2m" : "\x1b[32m";
    console.log(
      `  ${color}${ICONO[f.estado]}${f.prop.padEnd(24)} prototipo: ${String(f.esperado).padEnd(14)} código: ${f.real}\x1b[0m` +
        (f.justificado ? `\n      \x1b[2m↳ ${f.justificado}\x1b[0m` : "")
    );
  }
  totalDif += r.diferencias;
}

console.log(
  totalDif === 0
    ? `\n\x1b[32m✓ paridad de estilos: ${resultados.length} piezas, 0 diferencias\x1b[0m`
    : `\n\x1b[31m✗ ${totalDif} diferencia(s) con el prototipo en ${resultados.length} piezas\x1b[0m`
);
process.exit(totalDif === 0 ? 0 : 1);
