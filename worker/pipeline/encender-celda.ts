/**
 * Encender una celda: `activa = false` → `true`, con un nivel de seguridad
 * declarado. ADR-0007 §5 · regla dura #4.
 *
 *   npm run encender -- --celda=898e62c01cfffff --nivel=2 --motivo="..."
 *   npm run encender -- --celda=898e62c01cfffff --nivel=2 --motivo="..." --dry-run
 *   npm run encender -- --distrito="Cercado de Lima"          # solo lista
 *
 * POR QUÉ ESTE ARCHIVO EXISTE
 *
 * `activar.ts` es la puerta de las Vueltas y rechaza las celdas apagadas —hasta
 * `--todas` la respeta—. Pero encender la celda en sí no tenía herramienta, así
 * que la única forma de hacerlo era un UPDATE suelto contra la base. Eso deja el
 * "lo mira un humano" del ADR-0007 §5 sin ningún rastro: nadie puede decir
 * después quién encendió una cuadra, cuándo ni con qué criterio.
 *
 * Acá encender cuesta escribir un motivo. Es a propósito: es el único freno que
 * queda entre "el sync descubrió 47 cuadras" y "hay gente caminando en ellas".
 *
 * LO QUE EL NIVEL SIGNIFICA (lo hace cumplir `chapar()`, no este script):
 *
 *   1  libre        se puede chapar a cualquier hora
 *   2  solo día     de noche `chapar()` rechaza con `fuera_de_horario`
 *   3  excluida     `chapar()` rechaza siempre — encenderla así no sirve de nada
 *
 * El default del sync es 3, y es deliberado: una celda recién descubierta es una
 * cuadra de la que no sabemos nada.
 */

import { leerArgs, morir, supabase, terminar, terminarSinTrabajo } from "./base.js";

const PASO = "encender";

const args = leerArgs();
const celda = args.textoOpcional("celda", "");
const distrito = args.textoOpcional("distrito", "");
const nivel = args.numero("nivel", 0, 1, 3);
const motivo = args.textoOpcional("motivo", "");
const dryRun = args.bandera("dry-run");

if (!celda && !distrito) morir("Falta --celda=<h3> o --distrito=<nombre>. Ejemplo: --celda=898e62c01cfffff");

const db = supabase();

/* ── Modo lista: sin --nivel no se enciende nada, solo se muestra ────────── */

if (nivel === 0) {
  const q = db
    .from("cells")
    .select("h3_index, distrito, nivel_seguridad, activa, pois(id)")
    .order("h3_index");
  const { data, error } = celda ? await q.eq("h3_index", celda) : await q.eq("distrito", distrito);
  if (error) morir(`No pude leer las celdas: ${error.message}`);
  if (!data?.length) terminarSinTrabajo(PASO, `no hay celdas para ${celda || distrito}`);

  console.log(`\n[${PASO}] ${data.length} celda(s) — nada se modificó (falta --nivel)\n`);
  for (const c of data) {
    const n = c.nivel_seguridad as number;
    const etiqueta = n === 1 ? "libre" : n === 2 ? "solo día" : "excluida";
    console.log(
      `  ${c.h3_index}  ${c.activa ? "ENCENDIDA" : "apagada  "}  nivel ${n} (${etiqueta})` +
        `  ${String((c.pois as unknown[]).length).padStart(3)} POIs  ${c.distrito}`
    );
  }
  console.log(`\n  Para encender:  npm run encender -- --celda=<h3> --nivel=2 --motivo="por qué"`);
  terminar(PASO, { modo: "listar", celdas: data.length });
}

/* ── Encender de verdad ─────────────────────────────────────────────────── */

// El motivo no es burocracia: es lo único que queda escrito de la decisión. Sin
// él, encender es indistinguible de un UPDATE apurado a las 2 a.m.
if (motivo.trim().length < 10) {
  morir(
    `--motivo es obligatorio para encender, y con algo más que una palabra.\n` +
      `  Es el único rastro de que un humano miró esta cuadra (ADR-0007 §5).\n` +
      `  Ejemplo: --motivo="camino por acá todos los días, es zona residencial tranquila"`
  );
}

// Nivel 3 es "excluida": `chapar()` la rechaza siempre. Encender con 3 deja una
// celda que parece viva en la base y está muerta en la práctica — el peor estado
// posible, porque nadie sabe que no funciona hasta que un jugador llega y rebota.
if (nivel === 3) {
  morir(
    `--nivel=3 significa "excluida": chapar() rechaza esa celda a cualquier hora.\n` +
      `  Encenderla así crea una celda que aparenta estar viva y no lo está.\n` +
      `  Si la cuadra no se puede caminar, dejala apagada. Si se puede, usá 1 o 2.`
  );
}

const filtro = celda ? { col: "h3_index", val: celda } : { col: "distrito", val: distrito };
const { data: antes, error: eLeer } = await db
  .from("cells")
  .select("h3_index, distrito, nivel_seguridad, activa")
  .eq(filtro.col, filtro.val);
if (eLeer) morir(`No pude leer las celdas: ${eLeer.message}`);
if (!antes?.length) terminarSinTrabajo(PASO, `no hay celdas para ${celda || distrito}`);

const yaEstaban = antes.filter((c) => c.activa && c.nivel_seguridad === nivel);
const porCambiar = antes.filter((c) => !c.activa || c.nivel_seguridad !== nivel);

console.log(`\n[${PASO}] ${celda || distrito} · nivel ${nivel} (${nivel === 1 ? "libre" : "solo día"})`);
console.log(`  motivo: ${motivo}`);
if (yaEstaban.length) console.log(`  ${yaEstaban.length} celda(s) ya estaban así, se dejan como están`);
if (!porCambiar.length) terminarSinTrabajo(PASO, "no hay nada que cambiar");

for (const c of porCambiar) {
  console.log(
    `  ${dryRun ? "DRY-RUN " : ""}${c.h3_index}: ` +
      `${c.activa ? "encendida" : "apagada"}/nivel ${c.nivel_seguridad} → encendida/nivel ${nivel}`
  );
}

if (dryRun) terminar(PASO, { modo: "dry-run", celdas: porCambiar.length, nivel });

const { data: hechas, error: eUpd } = await db
  .from("cells")
  .update({ activa: true, nivel_seguridad: nivel })
  .in(
    "h3_index",
    porCambiar.map((c) => c.h3_index)
  )
  .select("h3_index");
if (eUpd) morir(`No pude encender: ${eUpd.message}`);

console.log(`\n  ✓ ${hechas?.length ?? 0} celda(s) encendidas`);
console.log(`    Las Vueltas siguen en borrador: npm run activar -- --celda=<h3>`);

terminar(PASO, { modo: "encender", celdas: hechas?.length ?? 0, nivel, motivo });
