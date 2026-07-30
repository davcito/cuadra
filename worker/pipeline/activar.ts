/**
 * Activación de Vueltas: `draft` → `activa`. Plan RUP E1, punto 3.
 *
 *   npm run activar -- --celda=89e6624b257ffff              # lista los drafts
 *   npm run activar -- --celda=89e6624b257ffff --ids=12,13  # activa esas
 *   npm run activar -- --celda=89e6624b257ffff --todas      # activa todas (demo)
 *   npm run activar -- --celda=89e6624b257ffff --todas --dry-run
 *
 * ESTE SCRIPT ES UNA PUERTA, NO UN INTERRUPTOR.
 *
 * `2-generate-missions.ts` inserta siempre como `draft`, así que este es el
 * único lugar donde una Vuelta se vuelve visible para un usuario. Eso lo
 * convierte en el punto donde dos decisiones del proyecto dejan de ser papel:
 *
 *  · **Regla dura #4 (modo seguro es feature de primera clase).** El ADR-0007 §5
 *    hace que una celda descubierta por el sync nazca `activa = false` y
 *    `nivel_seguridad = 3`, esperando que un humano la mire. Si activar fuera un
 *    simple UPDATE, esa protección duraría exactamente hasta la primera vez que
 *    alguien corriera `--todas`: habría contenido vivo en cuadras que nadie
 *    revisó. Acá se rechaza, y ni `--todas` lo saltea.
 *  · **Sin POI no hay Vuelta.** Un POI que el sync apagó (cerró, desapareció de
 *    OSM tres corridas seguidas) no puede tener misiones activas mandando gente
 *    a la puerta de un local que ya no existe.
 *
 * `--todas` existe para la demo y se salta la LECTURA de cada vuelta, no los
 * chequeos. Es la diferencia entre "confío en el lote" y "no me importa".
 */

import { leerArgs, morir, supabase, terminar, terminarSinTrabajo } from "./base.js";

const PASO = "activar";

const args = leerArgs();
const celda = args.texto("celda", "89e6624b257ffff");
const idsCrudos = args.textoOpcional("ids", "");
const todas = args.bandera("todas");
const dryRun = args.bandera("dry-run");

const idsPedidos = idsCrudos
  .split(",")
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isInteger(n) && n > 0);

if (idsCrudos && idsPedidos.length === 0) {
  morir(`--ids no tiene ningún número válido: "${idsCrudos}". Ejemplo: --ids=12,13,14`);
}
if (todas && idsPedidos.length > 0) {
  morir(`--todas y --ids juntas no tienen sentido: o revisás una por una, o confiás en el lote.`);
}

type Draft = {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: string;
  tipo: string;
  dificultad: number;
  calle_xp: number;
  ventana_horaria: string[];
  poi_id: number;
  pois: { nombre: string; activo: boolean } | null;
};

async function main(): Promise<never> {
  const db = supabase();

  // ── La puerta de seguridad ─────────────────────────────────────────────
  // Se pregunta ANTES de leer las vueltas: si la celda no está habilitada, no
  // hay nada que revisar, y decirlo temprano evita que alguien lea 12 vueltas
  // para después enterarse de que no puede activarlas.
  const { data: cell, error: errCelda } = await db
    .from("cells")
    .select("h3_index, distrito, activa, nivel_seguridad")
    .eq("h3_index", celda)
    .maybeSingle();

  if (errCelda) morir(`No pude leer la celda: ${errCelda.message}`);
  if (!cell) morir(`La celda ${celda} no existe en \`cells\`.`);

  if (!cell.activa) {
    morir(
      `La celda ${celda} (${cell.distrito}) está APAGADA — activa=false, nivel_seguridad=${cell.nivel_seguridad}.\n` +
        `  No se activa contenido en una cuadra que nadie revisó (regla dura #4).\n` +
        `  Las celdas nuevas nacen así a propósito: ADR-0007 §5.\n\n` +
        `  Para habilitarla hace falta que un humano la mire y la promueva en \`cells\`.\n` +
        `  Ni --todas saltea este chequeo.`
    );
  }
  if (cell.nivel_seguridad >= 3) {
    morir(
      `La celda ${celda} tiene nivel_seguridad=${cell.nivel_seguridad} (excluida), aunque figure activa.\n` +
        `  Es un estado contradictorio: revisá la fila en \`cells\` antes de activar contenido acá.`
    );
  }

  // ── Los drafts ─────────────────────────────────────────────────────────
  const { data, error } = await db
    .from("missions")
    .select("id, titulo, descripcion, categoria, tipo, dificultad, calle_xp, ventana_horaria, poi_id, pois(nombre, activo)")
    .eq("h3_index", celda)
    .eq("estado", "draft")
    .order("id");

  if (error) morir(`No pude leer los drafts: ${error.message}`);
  const drafts = (data ?? []) as unknown as Draft[];

  if (drafts.length === 0) {
    terminarSinTrabajo(PASO, `la celda ${celda} no tiene vueltas en draft`);
  }

  // ── Modo lista: sin --todas ni --ids, esto solo muestra ─────────────────
  if (!todas && idsPedidos.length === 0) {
    console.log(`\n[${PASO}] ${drafts.length} draft(s) en ${celda} (${cell.distrito}):\n`);
    for (const d of drafts) {
      const poi = d.pois?.nombre ?? `poi ${d.poi_id}`;
      const muerto = d.pois && !d.pois.activo ? "  ⚠ POI INACTIVO" : "";
      console.log(`  [${d.id}] ${d.titulo}${muerto}`);
      console.log(`       ${d.categoria}/${d.tipo} · d${d.dificultad} · ${d.calle_xp} Calle · ${d.ventana_horaria.join(", ")}`);
      console.log(`       en: ${poi}`);
      console.log(`       ${d.descripcion}\n`);
    }
    console.log(`  Activá las que quieras:  npm run activar -- --celda=${celda} --ids=<id,id,...>`);
    console.log(`  O todas de una (demo):   npm run activar -- --celda=${celda} --todas`);
    terminar(PASO, { celda, drafts: drafts.length, activadas: 0, modo: "lista" });
  }

  // ── Selección ──────────────────────────────────────────────────────────
  const porId = new Map(drafts.map((d) => [d.id, d]));
  const desconocidos = idsPedidos.filter((id) => !porId.has(id));
  if (desconocidos.length > 0) {
    morir(
      `Estos ids no son drafts de la celda ${celda}: ${desconocidos.join(", ")}\n` +
        `  (puede que ya estén activas, archivadas, o sean de otra celda)`
    );
  }

  const elegidas = todas ? drafts : idsPedidos.map((id) => porId.get(id)!);

  // ── Chequeo: sin POI vivo no hay Vuelta ────────────────────────────────
  const huerfanas = elegidas.filter((d) => d.pois && !d.pois.activo);
  if (huerfanas.length > 0) {
    morir(
      `${huerfanas.length} vuelta(s) apuntan a un POI inactivo — mandarían gente a un lugar que ya no está:\n` +
        huerfanas.map((d) => `    [${d.id}] ${d.titulo} → ${d.pois?.nombre}`).join("\n") +
        `\n  Sacalas de --ids, o archivalas.`
    );
  }

  // ── Aplicar ────────────────────────────────────────────────────────────
  if (dryRun) {
    console.log(`\n[${PASO}] DRY-RUN — se activarían ${elegidas.length} vuelta(s), no se escribió nada:`);
    for (const d of elegidas) console.log(`    [${d.id}] ${d.titulo}`);
    terminar(PASO, { celda, drafts: drafts.length, activarian: elegidas.length, dry_run: true });
  }

  const ids = elegidas.map((d) => d.id);
  const { data: hechas, error: errUpd } = await db
    .from("missions")
    .update({ estado: "activa" })
    .in("id", ids)
    .eq("estado", "draft") // por si otra corrida las tocó entre la lectura y esto
    .select("id");

  if (errUpd) morir(`El update falló: ${errUpd.message}`);

  console.log(`\n[${PASO}] activadas ${hechas?.length ?? 0} de ${ids.length}:`);
  for (const d of elegidas) console.log(`    [${d.id}] ${d.titulo}`);

  terminar(PASO, {
    celda,
    distrito: cell.distrito,
    drafts_restantes: drafts.length - (hechas?.length ?? 0),
    activadas: hechas?.length ?? 0,
    modo: todas ? "todas" : "seleccion",
  });
}

main().catch((e) => morir(e instanceof Error ? e.message : String(e)));
