/**
 * Radiografía de la base — SOLO LECTURA.
 *
 *   npm run estado
 *
 * Existe porque antes de escribir en una base compartida hay que saber en qué
 * estado está, y "creo que la migración se aplicó" no es saber. Responde tres
 * preguntas que deciden si el pipeline puede correr:
 *
 *   1. ¿Están las columnas del ADR-0007? Sin ellas el sync revienta a mitad.
 *   2. ¿Cuánto hay ya? El guardarraíl del 70 % compara contra el conteo previo.
 *   3. ¿Las celdas están activas? Una celda apagada no sirve contenido.
 *
 * No escribe nada. Nunca.
 */

import { supabase, terminar } from "./base.js";

const PASO = "estado";

async function main(): Promise<never> {
  const db = supabase();

  console.log(`\n[${PASO}] radiografía (solo lectura)\n`);

  // ── ¿Está aplicada la migración del ADR-0007? ──────────────────────────
  // Se pregunta por las columnas pidiéndolas: si no existen, PostgREST devuelve
  // un error de columna desconocida. Es la comprobación más directa que hay sin
  // acceso al catálogo de Postgres.
  const columnas: Record<string, boolean> = {};
  for (const col of ["origen", "visto_en_osm_at", "campos_curados"]) {
    const { error } = await db.from("pois").select(col).limit(1);
    columnas[col] = !error;
  }
  const migracionAplicada = Object.values(columnas).every(Boolean);

  console.log(`  Migración ADR-0007 (ciclo de vida de POIs): ${migracionAplicada ? "✓ aplicada" : "✗ FALTA"}`);
  for (const [col, ok] of Object.entries(columnas)) {
    console.log(`    ${ok ? "✓" : "✗"} pois.${col}`);
  }

  // ── ¿Cuánto hay? ───────────────────────────────────────────────────────
  console.log(`\n  Conteos:`);
  for (const tabla of ["cells", "pois", "missions", "cards", "profiles"]) {
    const { count, error } = await db.from(tabla).select("*", { count: "exact", head: true });
    console.log(`    ${String(count ?? "?").padStart(6)}  ${tabla}${error ? `  (${error.message})` : ""}`);
  }

  // ── Celdas: ¿sirven contenido? ─────────────────────────────────────────
  const { data: celdas } = await db.from("cells").select("h3_index, distrito, activa, nivel_seguridad");
  if (celdas?.length) {
    const activas = celdas.filter((c) => c.activa).length;
    const porNivel = new Map<number, number>();
    for (const c of celdas) porNivel.set(c.nivel_seguridad, (porNivel.get(c.nivel_seguridad) ?? 0) + 1);
    console.log(`\n  Celdas: ${activas}/${celdas.length} activas`);
    console.log(`    por nivel_seguridad: ${[...porNivel].sort().map(([n, c]) => `${n}→${c}`).join("  ")}`);
    const distritos = new Set(celdas.map((c) => c.distrito));
    console.log(`    distritos: ${[...distritos].join(", ")}`);
  }

  // ── Vueltas por estado ─────────────────────────────────────────────────
  const { data: ms } = await db.from("missions").select("estado, h3_index");
  if (ms?.length) {
    const porEstado = new Map<string, number>();
    for (const m of ms) porEstado.set(m.estado, (porEstado.get(m.estado) ?? 0) + 1);
    console.log(`\n  Vueltas: ${[...porEstado].map(([e, n]) => `${e}=${n}`).join("  ")}`);
    console.log(`    en ${new Set(ms.map((m) => m.h3_index)).size} celda(s)`);
  } else {
    console.log(`\n  Vueltas: ninguna`);
  }

  // ── POIs por origen, si la columna existe ──────────────────────────────
  if (columnas.origen) {
    const { data: ps } = await db.from("pois").select("origen, activo");
    if (ps?.length) {
      const porOrigen = new Map<string, number>();
      for (const p of ps) porOrigen.set(p.origen, (porOrigen.get(p.origen) ?? 0) + 1);
      console.log(`\n  POIs por origen: ${[...porOrigen].map(([o, n]) => `${o}=${n}`).join("  ")}`);
      console.log(`    activos: ${ps.filter((p) => p.activo).length}/${ps.length}`);
    }
  }

  terminar(PASO, { migracion_aplicada: migracionAplicada });
}

main().catch((e) => {
  console.error(`\n✗ ${e instanceof Error ? e.message : e}\n`);
  process.exit(1);
});
