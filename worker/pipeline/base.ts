/**
 * Piso común de los scripts del pipeline: argumentos, entorno, cliente de Supabase
 * y salida del proceso.
 *
 * Existe porque cada script se lo armaba por su cuenta, y ese copy-paste traía
 * cuatro defectos que un cron no puede tolerar (todos verificados en disco, no
 * supuestos):
 *
 *  1. `--distrito` SIN valor pasaba el guard: el parser devolvía el string "true"
 *     y el script seguía como si el distrito se llamara "true".
 *  2. Los tres scripts terminaban en `exit(0)` pasara lo que pasara. Un cron los
 *     daba por exitosos aunque no hubieran hecho absolutamente nada.
 *  3. Nadie leía credenciales: cero `process.env` en todo el worker, sin dotenv y
 *     sin `--env-file`.
 *  4. Ningún script dejaba rastro de qué hizo, así que no había forma de saber si
 *     la corrida del martes trajo 3 POIs o 300.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const RAIZ_WORKER = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ────────────────────────────── argumentos ────────────────────────────── */

export type Args = {
  /**
   * Texto obligatorio. Aborta si falta o si vino como `--flag` pelado.
   * `ejemplo` es el valor que se muestra en el mensaje de error: vale la pena
   * pasarlo cuando el formato no es obvio (una celda es un índice H3, no un
   * nombre de distrito).
   */
  texto(nombre: string, ejemplo?: string): string;
  /** Texto opcional con default. */
  textoOpcional(nombre: string, porDefecto: string): string;
  /** Número obligatorio dentro de un rango. */
  numero(nombre: string, porDefecto: number, min?: number, max?: number): number;
  /** Bandera booleana: presente = true. */
  bandera(nombre: string): boolean;
};

export function leerArgs(argv: string[] = process.argv.slice(2)): Args {
  const mapa = new Map<string, string | true>();
  for (const bruto of argv) {
    if (!bruto.startsWith("--")) continue;
    const [clave, ...resto] = bruto.slice(2).split("=");
    if (!clave) continue;
    // `--x=1=2` es legítimo (el valor lleva un '='); `--x` a secas queda en true.
    mapa.set(clave, resto.length ? resto.join("=") : true);
  }

  return {
    texto(nombre, ejemplo = "barranco") {
      const v = mapa.get(nombre);
      // El `v === true` es el punto: antes `--distrito` sin valor se colaba como
      // el string "true" y el script corría contra un distrito inexistente.
      if (v === undefined) morir(`Falta --${nombre}. Ejemplo: --${nombre}=${ejemplo}`);
      if (v === true) morir(`--${nombre} necesita un valor. Ejemplo: --${nombre}=${ejemplo}`);
      return v as string;
    },
    textoOpcional(nombre, porDefecto) {
      const v = mapa.get(nombre);
      if (v === undefined || v === true) return porDefecto;
      return v;
    },
    numero(nombre, porDefecto, min = -Infinity, max = Infinity) {
      const v = mapa.get(nombre);
      if (v === undefined || v === true) return porDefecto;
      const n = Number(v);
      if (!Number.isFinite(n)) morir(`--${nombre} tiene que ser un número, llegó "${v}".`);
      if (n < min || n > max) morir(`--${nombre} tiene que estar entre ${min} y ${max}, llegó ${n}.`);
      return n;
    },
    bandera(nombre) {
      return mapa.has(nombre);
    },
  };
}

/* ─────────────────────────────── entorno ──────────────────────────────── */

/**
 * Lee `.env` a mano en vez de sumar dotenv: son 12 líneas, una dependencia menos
 * y el cron del VPS puede exportar las variables sin archivo. Lo que ya está en
 * `process.env` MANDA sobre el archivo (así el cron puede pisar sin editar nada).
 */
function cargarEnv(): void {
  try {
    const texto = readFileSync(join(RAIZ_WORKER, ".env"), "utf8");
    for (const linea of texto.split("\n")) {
      const limpia = linea.trim();
      if (!limpia || limpia.startsWith("#")) continue;
      const i = limpia.indexOf("=");
      if (i < 1) continue;
      const clave = limpia.slice(0, i).trim();
      const valor = limpia.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      if (process.env[clave] === undefined) process.env[clave] = valor;
    }
  } catch {
    // Sin .env no es error: en el VPS las variables vienen del entorno del cron.
  }
}

/**
 * ¿Hay credenciales para hablar con la base?
 *
 * Existe porque `cargarEnv()` es perezosa: se dispara dentro de `env()`. Un
 * script que preguntaba `process.env.SUPABASE_SERVICE_ROLE_KEY` antes de llamar
 * a `env()` leía un entorno todavía vacío y concluía "sin credenciales" aunque
 * el `.env` estuviera completo — así el `--dry-run` del sync se saltaba en
 * silencio la comprobación del guardarraíl, que es justo lo que uno quiere ver
 * en un dry-run.
 */
export function hayCredenciales(): boolean {
  cargarEnv();
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function env(nombre: string): string {
  cargarEnv();
  const v = process.env[nombre];
  if (!v) {
    morir(
      `Falta la variable ${nombre}.\n` +
        `  Ponela en worker/.env (mirá .env.example) o exportala antes de correr.`
    );
  }
  return v;
}

/* ────────────────────────────── Supabase ──────────────────────────────── */

let cliente: SupabaseClient | null = null;

/**
 * Cliente con `service_role`: PODER TOTAL sobre la base, salta toda RLS. Solo
 * corre en el VPS y nunca en la app (regla dura #3 del proyecto).
 */
export function supabase(): SupabaseClient {
  if (cliente) return cliente;
  cliente = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cliente;
}

/* ──────────────────────────── salida y rastro ─────────────────────────── */

export function morir(mensaje: string): never {
  console.error(`\n✗ ${mensaje}\n`);
  process.exit(1);
}

/**
 * Cierra la corrida dejando rastro y —lo importante— un código de salida que el
 * cron pueda leer. Antes todos los scripts salían 0 aunque no hicieran nada.
 */
export function terminar(paso: string, resumen: Record<string, unknown>): never {
  const linea = Object.entries(resumen)
    .map(([k, v]) => `${k}=${typeof v === "number" ? v : JSON.stringify(v)}`)
    .join(" ");
  console.log(`\n[${paso}] ${linea}`);
  process.exit(0);
}

/** Un paso que no hizo nada NO es un éxito: el cron tiene que enterarse. */
export function terminarSinTrabajo(paso: string, porque: string): never {
  console.error(`\n[${paso}] no se hizo nada: ${porque}`);
  process.exit(2);
}
