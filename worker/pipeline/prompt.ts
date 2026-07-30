/**
 * Carga el prompt de generación desde `prompts/generacion-vueltas.md`.
 *
 * POR QUÉ HAY UN LOADER Y NO UN STRING EN TYPESCRIPT: la regla dura #8 del
 * proyecto dice que el prompt se versiona como código, y que cambiarlo es un
 * commit con justificación. Si el pipeline llevara su propia copia en un `.ts`,
 * habría DOS prompts: el que se revisa en el markdown y el que realmente se le
 * manda al modelo. Divergirían, y la divergencia sería invisible hasta que
 * alguien comparara a mano.
 *
 * El markdown es la única fuente. Esto solo lo lee.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { RAIZ_WORKER } from "./base.js";

const ARCHIVO = join(RAIZ_WORKER, "prompts", "generacion-vueltas.md");

/**
 * Saca el contenido del bloque ``` que sigue a un encabezado `## <seccion>`.
 *
 * Es un parseo deliberadamente estricto: si el markdown cambia de forma, esto
 * TIENE que romper con un mensaje claro. Un loader indulgente que devuelve texto
 * parcial le mandaría al modelo medio prompt y nadie se enteraría — el lote
 * saldría raro y perseguiríamos el bug en el lugar equivocado.
 */
function bloqueDe(md: string, seccion: string): string {
  const enc = new RegExp(`^##\\s+${seccion}\\b`, "mi");
  const m = enc.exec(md);
  if (!m) {
    throw new Error(
      `El prompt no tiene la sección "## ${seccion}".\n  Archivo: ${ARCHIVO}\n` +
        `  Si la renombraste, actualizá pipeline/prompt.ts en el mismo commit.`
    );
  }
  const resto = md.slice(m.index + m[0].length);
  const abre = resto.indexOf("```");
  if (abre === -1) throw new Error(`La sección "## ${seccion}" no tiene bloque de código.`);
  // Salta la línea del ``` (puede traer lenguaje: ```json)
  const inicio = resto.indexOf("\n", abre) + 1;
  const cierra = resto.indexOf("```", inicio);
  if (cierra === -1) throw new Error(`El bloque de "## ${seccion}" no está cerrado.`);
  const cuerpo = resto.slice(inicio, cierra).trim();
  if (!cuerpo) throw new Error(`El bloque de "## ${seccion}" está vacío.`);
  return cuerpo;
}

export type PromptVueltas = {
  /** El bloque SYSTEM, tal cual va a la API. */
  system: string;
  /** La forma del payload USER, como la documenta el prompt. Sirve para el test. */
  formaUser: unknown;
  /** El schema de salida documentado. El test lo cruza contra el zod real. */
  schemaDocumentado: Record<string, string>;
  /** Versión declarada en el título, para dejarla en el rastro de cada corrida. */
  version: string;
};

export function cargarPrompt(): PromptVueltas {
  let md: string;
  try {
    md = readFileSync(ARCHIVO, "utf8");
  } catch {
    throw new Error(`No encontré el prompt en ${ARCHIVO}`);
  }

  const version = /^#\s+.*—\s*(v[\d.]+)/m.exec(md)?.[1] ?? "sin-version";

  return {
    system: bloqueDe(md, "SYSTEM"),
    formaUser: JSON.parse(bloqueDe(md, "USER")),
    schemaDocumentado: JSON.parse(bloqueDe(md, "SCHEMA")) as Record<string, string>,
    version,
  };
}
