/**
 * Pipeline paso 2b — Una figurita por cada POI que tenga Vuelta activa.
 * Documento maestro §3 (coleccionismo) · glosario: `cards` = **Figuritas**.
 *
 *   npm run figuritas -- --distrito="Cercado de Lima" --dry-run
 *   npm run figuritas -- --distrito=Barranco
 *
 * POR QUÉ EXISTE
 *
 * La base tenía 3 figuritas para 72 Vueltas activas, y las 3 venían del
 * `seed.sql` escrito a mano. Nadie lo notaba porque `chapar()` trata la figurita
 * como opcional a propósito: si no hay, la chapada igual cuenta, suma Calle y
 * sigue la racha. Esa decisión es correcta —un dato faltante no debe tumbar una
 * caminata ya hecha— pero tiene un costo: el hueco es silencioso. El jugador
 * camina, llega, saca la foto, y el premio que el producto entero promete
 * simplemente no aparece.
 *
 * Así que este paso no inventa una mecánica nueva: cierra el paso que faltaba
 * entre "hay Vueltas" y "hay álbum".
 *
 * LA RAREZA SALE DE LOS DATOS, NO DE UN DADO
 *
 * Se deriva de la Vuelta más difícil que apunta a ese POI, porque la dificultad
 * ya la decidió alguien mirando el lugar. Sortearla haría que dos jugadores
 * discutieran sobre por qué la misma esquina vale distinto, y no habría
 * respuesta. Así, la figurita rara es rara porque llegar cuesta.
 *
 *   dificultad 3 → rara          dificultad 2 → poco_comun      dificultad 1 → comun
 *
 * `temporada` no se asigna acá: esa rareza lleva fechas (`valida_desde` /
 * `valida_hasta`) y es una decisión de campaña, no de catálogo.
 */

import { leerArgs, morir, supabase, terminar, terminarSinTrabajo } from "./base.js";

const PASO = "figuritas";

const args = leerArgs();
const distrito = args.texto("distrito", "Barranco");
const dryRun = args.bandera("dry-run");

const RAREZA_POR_DIFICULTAD = { 1: "comun", 2: "poco_comun", 3: "rara" } as const;

const db = supabase();

/* ── Qué POIs tienen Vuelta activa y todavía no tienen figurita ──────────── */

const { data: filas, error } = await db
  .from("missions")
  .select("poi_id, dificultad, pois!inner(id, nombre, activo, cells!inner(distrito))")
  .eq("estado", "activa")
  .eq("pois.activo", true)
  .eq("pois.cells.distrito", distrito);
if (error) morir(`No pude leer las Vueltas activas: ${error.message}`);
if (!filas?.length) terminarSinTrabajo(PASO, `no hay Vueltas activas en ${distrito}`);

const { data: yaHay, error: eCards } = await db.from("cards").select("poi_id");
if (eCards) morir(`No pude leer las figuritas existentes: ${eCards.message}`);
const conFigurita = new Set((yaHay ?? []).map((c) => c.poi_id as number));

// Un POI puede tener varias Vueltas; la figurita es UNA por lugar. Se queda con
// la dificultad más alta: la figurita representa el lugar, y el lugar vale por
// lo más difícil que se puede hacer en él.
type Pendiente = { poi_id: number; nombre: string; dificultad: number };
const porPoi = new Map<number, Pendiente>();
for (const f of filas) {
  const poi = f.pois as unknown as { id: number; nombre: string };
  if (conFigurita.has(poi.id)) continue;
  const previo = porPoi.get(poi.id);
  const dif = f.dificultad as number;
  if (!previo || dif > previo.dificultad) {
    porPoi.set(poi.id, { poi_id: poi.id, nombre: poi.nombre, dificultad: dif });
  }
}

const pendientes = [...porPoi.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

console.log(`\n[${PASO}] ${distrito}`);
console.log(`  ${filas.length} Vuelta(s) activa(s) · ${conFigurita.size} POI(s) ya con figurita`);
if (!pendientes.length) terminarSinTrabajo(PASO, "todos los POIs con Vuelta activa ya tienen figurita");

const nuevas = pendientes.map((p) => ({
  poi_id: p.poi_id,
  // El nombre de la figurita ES el del lugar. Inventarle un nombre de fantasía
  // rompería lo único que hace que el álbum se sienta de la ciudad y no de un
  // juego cualquiera: el jugador reconoce la esquina.
  nombre: p.nombre,
  barrio: distrito, // el glosario dice: las páginas del álbum son barrios
  rareza: RAREZA_POR_DIFICULTAD[p.dificultad as 1 | 2 | 3],
}));

const cuenta = nuevas.reduce<Record<string, number>>((a, n) => ({ ...a, [n.rareza]: (a[n.rareza] ?? 0) + 1 }), {});
console.log(`  ${nuevas.length} figurita(s) por crear: ${Object.entries(cuenta).map(([r, n]) => `${n} ${r}`).join(" · ")}\n`);
for (const n of nuevas) console.log(`  ${dryRun ? "DRY-RUN " : ""}${n.rareza.padEnd(11)} ${n.nombre}`);

if (dryRun) terminar(PASO, { modo: "dry-run", distrito, figuritas: nuevas.length });

const { data: hechas, error: eIns } = await db.from("cards").insert(nuevas).select("id");
if (eIns) morir(`Insert de figuritas falló: ${eIns.message}`);

console.log(`\n  ✓ ${hechas?.length ?? 0} figurita(s) creadas`);
console.log(`    Sin arte todavía (arte_url = null): el álbum las muestra como marco vacío.`);

terminar(PASO, { modo: "crear", distrito, figuritas: hechas?.length ?? 0 });
