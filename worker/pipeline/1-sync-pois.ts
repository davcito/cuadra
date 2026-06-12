/**
 * Pipeline paso 1 — Sincronizar POIs reales desde OpenStreetMap (Overpass API).
 * Corre semanal en el VPS (cron). Documento maestro §7.3, paso 2.
 *
 * Uso:  npm run sync-pois -- --distrito=barranco [--dry-run]
 *
 * ESTADO: esqueleto (sesión 1). La implementación llega en la sesión
 * "pipeline de contenido" (roadmap semanas 3–4).
 */

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"] as const;
  })
);

const distrito = args.get("distrito");
const dryRun = args.get("dry-run") === "true";

if (!distrito) {
  console.error("Falta --distrito. Ejemplo: npm run sync-pois -- --distrito=barranco");
  process.exit(1);
}

console.log(`[sync-pois] distrito=${distrito} dryRun=${dryRun}`);
console.log(`[sync-pois] Plan (pendiente de implementar — sesión 'pipeline de contenido'):`);
console.log(`  1. Resolver bounding box / celdas H3 del distrito (tabla cells).`);
console.log(`  2. Query Overpass por tags: amenity, shop, tourism, historic, leisure.`);
console.log(`     Ej. QL: [out:json]; ( node["amenity"~"cafe|restaurant|marketplace"](bbox); ... ); out center;`);
console.log(`  3. Mapear elementos OSM -> filas pois (osm_id, nombre, categoria, ubicacion, h3_index).`);
console.log(`  4. Upsert en Supabase con service_role (el cliente JAMAS escribe pois).`);

// TODO(sesión pipeline): implementar fetch a https://overpass-api.de/api/interpreter
// TODO(sesión pipeline): mapeo tags OSM -> categorías de Cuadra (huarique/caleta/huaca/...)
// TODO(sesión pipeline): upsert con @supabase/supabase-js (SUPABASE_SERVICE_ROLE_KEY)

process.exit(0);
