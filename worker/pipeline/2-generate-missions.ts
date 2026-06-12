/**
 * Pipeline paso 2 — Generar Vueltas con Claude (Haiku 4.5) sobre POIs reales.
 * Corre semanal en el VPS (cron). Documento maestro §7.3, paso 3.
 *
 * Uso:  npm run generate-missions -- --celda=<h3> --dry-run
 *       (--dry-run imprime sin insertar; SIN --dry-run inserta en missions como draft)
 *
 * ESTADO: esqueleto (sesión 1). El contrato de salida YA es real:
 * pipeline/schema.ts valida el lote y la regla anti-alucinación (poi_id
 * debe existir). La llamada al modelo llega en la sesión "pipeline de
 * contenido" (roadmap semanas 3–4). Regla dura #2: esto corre SOLO en el
 * worker; la app jamás llama a la API de Claude.
 */
import { validarLoteVueltas, type Vuelta } from "./schema.js";

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"] as const;
  })
);

const celda = args.get("celda");
const dryRun = args.get("dry-run") === "true";

if (!celda) {
  console.error("Falta --celda. Ejemplo: npm run generate-missions -- --celda=89e6624b257ffff --dry-run");
  process.exit(1);
}

console.log(`[generate-missions] celda=${celda} dryRun=${dryRun}`);

// --- Demostración del contrato (se reemplaza por datos reales de la DB) ---
const poisDeEjemplo = [
  { id: 1, nombre: "Mercado de prueba", categoria: "mercado" },
  { id: 2, nombre: "Parque de prueba", categoria: "parque" },
];
const poiIdsReales = new Set(poisDeEjemplo.map((p) => p.id));

const loteDeEjemplo: Vuelta[] = [
  {
    poi_id: 1,
    titulo: "El dato de la caserita",
    descripcion: "Pregunta en el mercado cuál es la fruta más vendida y pruébala si te animas.",
    tipo: "social",
    categoria: "casero",
    dificultad: 2,
    calle_xp: 25,
    ventana_horaria: ["mañana", "tarde"],
    requiere_foto: true,
    instruccion_verificacion: "Foto dentro del mercado con un puesto de frutas visible",
  },
];

try {
  const validas = validarLoteVueltas(loteDeEjemplo, poiIdsReales);
  console.log(`[generate-missions] contrato OK — ${validas.length} vuelta(s) de ejemplo validan contra el schema`);
} catch (e) {
  console.error(`[generate-missions] contrato ROTO:`, e);
  process.exit(1);
}

console.log(`[generate-missions] Plan (pendiente — sesión 'pipeline de contenido'):`);
console.log(`  1. Leer pois activos de la celda desde Supabase (service_role).`);
console.log(`  2. Armar payload USER según worker/prompts/generacion-vueltas.md.`);
console.log(`  3. Llamar a Claude Haiku 4.5 (ANTHROPIC_API_KEY, considerar Batch API).`);
console.log(`  4. validarLoteVueltas(); si falla -> descartar y reintentar (max 2), nunca parcial.`);
console.log(`  5. ${dryRun ? "DRY-RUN: imprimir lote." : "Insertar en missions con estado='draft'."}`);

// TODO(sesión pipeline): implementar pasos 1–5 con reintentos y métricas de costo.

process.exit(0);
