/**
 * Pipeline paso 1 — Traer POIs reales de OpenStreetMap. Corre semanal (cron VPS).
 * Documento maestro §7.3 · ADR-0007 (ciclo de vida de POIs).
 *
 *   npm run sync-pois -- --distrito=barranco [--dry-run] [--umbral=0.7]
 *
 * LO QUE HACE, y por qué en este orden:
 *
 *   1. Le pide a Overpass los POIs del distrito.
 *   2. Los clasifica con el mapa de `categorias-osm.ts`.
 *   3. **Crea las celdas H3 que falten, APAGADAS.** Va antes que los POIs porque
 *      `pois.h3_index` tiene FK a `cells`. Y apagadas porque encender una celda
 *      es declarar "acá se puede caminar", y eso lo decide un humano (ADR-0007 §5).
 *   4. Hace upsert de los POIs, tocando SOLO los de origen 'osm'.
 *   5. Apaga los que llevan 3 corridas sin aparecer. Nunca borra.
 *
 * EL GUARDARRAÍL: si una corrida trae menos del 70 % de POIs que la anterior,
 * ABORTA SIN ESCRIBIR. Una respuesta parcial de Overpass —un timeout, un rate
 * limit, un bbox mal armado— se parece exactamente a "cerraron todos los locales
 * del distrito". Es el modo de falla que convierte un problema de red en pérdida
 * de catálogo.
 */

import { writeFileSync } from "node:fs";

import { latLngToCell } from "h3-js";

import { hayCredenciales, leerArgs, morir, supabase, terminar, terminarSinTrabajo } from "./base.js";
import { buscarDistrito, clavesDeDistritos } from "./distritos.js";
import { clasificar, familiasParaOverpass, filtrosParaOverpass } from "./categorias-osm.js";
import { armarConsulta, consultar, coordenada, idCuadra, type ElementoOsm } from "./overpass.js";

const PASO = "sync-pois";
const RESOLUCION_H3 = 9; // documento maestro: res 9 (~174 m de arista)
const CORRIDAS_PARA_APAGAR = 3;

const args = leerArgs();
const clave = args.texto("distrito");
const seco = args.bandera("dry-run");
const umbral = args.numero("umbral", 0.7, 0, 1);
/**
 * Modo descubrimiento: pide las FAMILIAS enteras en vez de los filtros exactos,
 * no escribe nada, y reporta qué tags están quedando fuera del mapa y cuántas
 * veces.
 *
 * Existe porque la lista blanca tiene un punto ciego evidente una vez que lo ves:
 * si solo pedimos los tags que ya conocemos, todo lo que vuelve está mapeado por
 * definición y el catálogo no puede avisarnos de lo que nos estamos perdiendo.
 * Esta bandera es la forma deliberada de mirar afuera, sin ensuciar la corrida
 * semanal ni castigar a un servidor comunitario todas las semanas.
 *
 *   npm run sync-pois -- --distrito=barranco --descubrir
 */
const descubrir = args.bandera("descubrir");
/**
 * Vuelca los POIs clasificados a un JSON y no toca la base.
 *
 * Existe porque Overpass es gratis y sin credenciales, pero Supabase no: hasta
 * que el `.env` esté armado, los POIs reales quedaban atrapados dentro de un
 * `console.log` del dry-run. Con esto salen a un archivo y el paso 2 puede
 * trabajar sobre datos de verdad sin que haya base todavía.
 *
 *   npm run sync-pois -- --distrito=barranco --volcar=barranco.json
 */
const volcarA = args.textoOpcional("volcar", "");

const distrito = buscarDistrito(clave);
if (!distrito) morir(`No conozco el distrito "${clave}". Conocidos: ${clavesDeDistritos()}`);

console.log(`[${PASO}] ${distrito.nombre} · caja ${distrito.caja.join(", ")}${seco ? " · DRY-RUN" : ""}`);

/* ── 1. Overpass ─────────────────────────────────────────────────────────── */

const filtros = descubrir
  ? familiasParaOverpass().map((clave) => ({ clave, valor: null }))
  : filtrosParaOverpass();
const consulta = armarConsulta(distrito.caja, filtros);
console.log(
  descubrir
    ? `[${PASO}] DESCUBRIR: pidiendo ${filtros.length} familias enteras (no escribe nada)`
    : `[${PASO}] pidiendo ${filtros.length} filtros exactos de tags`
);

const { elementos, endpoint, intentos } = await consultar(consulta);
console.log(`[${PASO}] ${elementos.length} elementos de ${endpoint} (intento ${intentos})`);

/* ── 2. Filtrar y clasificar ─────────────────────────────────────────────── */

type Candidato = {
  osm_id: number;
  nombre: string;
  categoria: string;
  mapeada: boolean;
  lat: number;
  lon: number;
  h3: string;
  tags: Record<string, string>;
};

const candidatos: Candidato[] = [];
const sinMapa = new Map<string, number>();
const descartes = { sinNombre: 0, sinCoordenada: 0 };

for (const e of elementos as ElementoOsm[]) {
  const tags = e.tags ?? {};
  // Sin nombre no sirve: una Vuelta que dice "andá al lugar sin nombre" no existe.
  const nombre = tags.name?.trim();
  if (!nombre) {
    descartes.sinNombre++;
    continue;
  }
  const c = coordenada(e);
  if (!c) {
    descartes.sinCoordenada++;
    continue;
  }
  const { categoria, mapeada } = clasificar(tags);
  if (!mapeada) {
    // Lista blanca (ADR-0007 §6, revisado): sin mapa no entra. Se cuenta para
    // saber qué tag conviene agregar, pero el catálogo no se llena de paraderos.
    sinMapa.set(categoria, (sinMapa.get(categoria) ?? 0) + 1);
    continue;
  }
  candidatos.push({
    osm_id: idCuadra(e),
    nombre,
    categoria,
    mapeada,
    lat: c.lat,
    lon: c.lon,
    h3: latLngToCell(c.lat, c.lon, RESOLUCION_H3),
    tags,
  });
}

const sinMapear = [...sinMapa.values()].reduce((a, b) => a + b, 0);
console.log(`[${PASO}] ${candidatos.length} entran al catálogo · ${sinMapear} quedaron fuera por no tener mapa`);
if (sinMapa.size) {
  // Este informe ES el mecanismo para agrandar el mapa: dice exactamente qué tag
  // se está perdiendo y cuántas veces, así la decisión se toma con el número.
  const top = [...sinMapa].sort((a, b) => b[1] - a[1]).slice(0, 12);
  console.log(`[${PASO}] fuera del mapa (top): ${top.map(([k, n]) => `${k}×${n}`).join(", ")}`);
}
console.log(`[${PASO}] descartados: ${descartes.sinNombre} sin nombre, ${descartes.sinCoordenada} sin coordenada`);

if (descubrir) {
  console.log(`
[${PASO}] TAGS FUERA DEL MAPA — candidatos a agregar en categorias-osm.ts:
`);
  for (const [tag, n] of [...sinMapa].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(n).padStart(4)}  ${tag}`);
  }
  console.log(`
   (ya mapeados: ${candidatos.length})`);
  terminar(PASO, { modo: "descubrir", mapeados: candidatos.length, fuera: sinMapear, tags_distintos: sinMapa.size });
}

if (candidatos.length === 0) {
  terminarSinTrabajo(PASO, "Overpass no devolvió ningún POI con nombre y coordenada");
}

/* ── 2b. Volcado a archivo (sin base) ────────────────────────────────────── */

if (volcarA) {
  // Se agrupa por celda porque así es como lo consume el paso 2: una llamada al
  // modelo por celda. Volcar una lista plana obligaría a reagrupar del otro lado,
  // y esa clase de trabajo duplicado es justo donde dos lados se desincronizan.
  const porCelda = new Map<string, typeof candidatos>();
  for (const c of candidatos) {
    const g = porCelda.get(c.h3);
    if (g) g.push(c);
    else porCelda.set(c.h3, [c]);
  }

  const salida = {
    distrito: distrito.nombre,
    generado: new Date().toISOString(),
    total_pois: candidatos.length,
    celdas: [...porCelda.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([h3, pois]) => ({
        h3_index: h3,
        pois: pois.map((p) => ({
          osm_id: p.osm_id,
          nombre: p.nombre,
          categoria: p.categoria,
          lat: p.lat,
          lon: p.lon,
          tags: p.tags,
        })),
      })),
  };

  writeFileSync(volcarA, JSON.stringify(salida, null, 2), "utf8");
  console.log(`\n[${PASO}] volcados ${candidatos.length} POIs en ${porCelda.size} celdas → ${volcarA}`);
  terminar(PASO, { modo: "volcar", archivo: volcarA, pois: candidatos.length, celdas: porCelda.size });
}

/* ── 3. Guardarraíl: ¿esto se parece a un catálogo o a una caída? ────────── */

// El informe de lo que trae OSM se imprime ANTES de tocar la base, para que un
// `--dry-run` sirva sin credenciales: mirar qué devuelve Overpass y cómo quedaría
// clasificado es justo lo que uno quiere hacer antes de tener el .env armado.
function informeSeco(): void {
  const porCategoria = new Map<string, number>();
  for (const c of candidatos) porCategoria.set(c.categoria, (porCategoria.get(c.categoria) ?? 0) + 1);
  console.log(`\n[${PASO}] DRY-RUN — así quedaría:`);
  for (const [cat, n] of [...porCategoria].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(n).padStart(4)}  ${cat}`);
  }
  console.log(`\n   celdas H3 distintas: ${new Set(candidatos.map((c) => c.h3)).size}`);
  console.log("   Ejemplos:");
  for (const c of candidatos.slice(0, 8)) console.log(`     ${c.categoria.padEnd(16)} ${c.nombre}`);
}

if (seco && !hayCredenciales()) {
  informeSeco();
  console.log(`\n[${PASO}] sin credenciales: no se pudo comprobar el guardarraíl contra la base.`);
  terminar(PASO, { modo: "dry-run-sin-base", candidatos: candidatos.length, sin_mapear: sinMapear });
}

const db = supabase();

/* ── 3b. ¿Está el esquema que este script necesita? ──────────────────────── */

// El sync escribe `origen`, `visto_en_osm_at` y `campos_curados` (ADR-0007). Si
// la migración no corrió, PostgREST rechaza el upsert con un error de columna
// desconocida a mitad de la corrida — después de haber pedido 500 elementos a un
// servidor comunitario, y con un mensaje que no dice qué hacer.
//
// Se pregunta antes, y se dice exactamente qué falta y cómo arreglarlo.
{
  const faltantes: string[] = [];
  for (const col of ["origen", "visto_en_osm_at", "campos_curados"]) {
    const { error } = await db.from("pois").select(col).limit(1);
    if (error) faltantes.push(col);
  }
  if (faltantes.length > 0) {
    morir(
      `A la tabla \`pois\` le faltan ${faltantes.length} columna(s) que este script escribe: ${faltantes.join(", ")}\n` +
        `  Falta aplicar la migración del ADR-0007:\n` +
        `    supabase/migrations/20260729000000_ciclo_de_vida_pois.sql\n\n` +
        `  Con el CLI enlazado:  npx supabase db push\n` +
        `  Sin CLI: pegá ese archivo en el editor SQL de Supabase (es idempotente).\n\n` +
        `  Comprobá con: npm run estado`
    );
  }
}

// TAMBIÉN ACOTADO AL DISTRITO. Contaba todos los POIs de OSM de la base, así que
// al sumar un segundo distrito comparaba peras con manzanas: 131 POIs de esta
// zona contra 388 de Barranco daban 34 %, por debajo del umbral, y el sync
// abortaba "protegiendo" un catálogo que nadie estaba tocando. El guardarraíl
// tiene sentido comparando un distrito contra sí mismo; global, solo estorba.
const { count: previos, error: eConteo } = await db
  .from("pois")
  .select("id, cells!inner(distrito)", { count: "exact", head: true })
  .eq("origen", "osm")
  .eq("cells.distrito", distrito.nombre);
if (eConteo) morir(`No pude contar los POIs existentes: ${eConteo.message}`);

// El guardarraíl no aplica en la primera corrida (no hay contra qué comparar) ni
// con catálogos chicos, donde una variación normal lo dispararía siempre.
const anterior = previos ?? 0;
if (anterior > 20) {
  const proporcion = candidatos.length / anterior;
  if (proporcion < umbral) {
    morir(
      `ABORTO SIN ESCRIBIR: esta corrida trae ${candidatos.length} POIs y la anterior tenía ${anterior} ` +
        `(${Math.round(proporcion * 100)} %, umbral ${Math.round(umbral * 100)} %).\n` +
        `  Esto se parece más a una respuesta parcial de Overpass que a que hayan cerrado todos.\n` +
        `  Si el desplome es real, volvé a correr con --umbral=0.4`
    );
  }
  console.log(
    `[${PASO}] guardarraíl OK: ${candidatos.length} vs ${anterior} previos (${Math.round(proporcion * 100)} %)`
  );
} else {
  console.log(`[${PASO}] guardarraíl no aplica: ${anterior} POIs previos (hace falta > 20)`);
}

if (seco) {
  informeSeco();
  terminar(PASO, { modo: "dry-run", candidatos: candidatos.length, sin_mapear: sinMapear });
}

/* ── 4. Celdas primero: la FK lo exige, y nacen APAGADAS ─────────────────── */

const celdas = [...new Set(candidatos.map((c) => c.h3))];
const { data: celdasExistentes, error: eCeldas } = await db
  .from("cells")
  .select("h3_index")
  .in("h3_index", celdas);
if (eCeldas) morir(`No pude leer las celdas: ${eCeldas.message}`);

const conocidas = new Set((celdasExistentes ?? []).map((c) => c.h3_index as string));
const nuevas = celdas.filter((h) => !conocidas.has(h));

if (nuevas.length) {
  // nivel_seguridad 3 = excluida, activa = false. Un humano las promueve.
  // `ignoreDuplicates` para que NUNCA pise la revisión de una celda que ya
  // existe: bajarle el nivel a una celda revisada sería un bug de seguridad.
  const { error } = await db.from("cells").upsert(
    nuevas.map((h3_index) => ({
      h3_index,
      distrito: distrito.nombre,
      ciudad: distrito.ciudad,
      pais: distrito.pais,
      nivel_seguridad: 3,
      activa: false,
    })),
    { onConflict: "h3_index", ignoreDuplicates: true }
  );
  if (error) morir(`No pude crear las celdas nuevas: ${error.message}`);
}
console.log(
  `[${PASO}] celdas: ${conocidas.size} ya existían · ${nuevas.length} nuevas creadas APAGADAS (a revisar)`
);

/* ── 5. POIs: upsert respetando lo curado ────────────────────────────────── */

const ahora = new Date().toISOString();

// Traemos lo que ya está para saber qué campos NO podemos pisar.
const { data: existentes, error: eExistentes } = await db
  .from("pois")
  .select("osm_id, campos_curados, origen")
  .in(
    "osm_id",
    candidatos.map((c) => c.osm_id)
  );
if (eExistentes) morir(`No pude leer los POIs existentes: ${eExistentes.message}`);

const curadoPorOsmId = new Map<number, string[]>();
const ajenos = new Set<number>(); // origen != 'osm': intocables
for (const p of existentes ?? []) {
  if ((p.origen as string) !== "osm") ajenos.add(p.osm_id as number);
  else curadoPorOsmId.set(p.osm_id as number, (p.campos_curados as string[]) ?? []);
}

const filas = candidatos
  .filter((c) => !ajenos.has(c.osm_id)) // un POI adoptado a mano no vuelve a ser de OSM
  .map((c) => {
    const curados = curadoPorOsmId.get(c.osm_id) ?? [];
    const fila: Record<string, unknown> = {
      osm_id: c.osm_id,
      ubicacion: `POINT(${c.lon} ${c.lat})`,
      h3_index: c.h3,
      metadata: { tags: c.tags, categoria_mapeada: c.mapeada },
      origen: "osm",
      visto_en_osm_at: ahora,
      activo: true,
    };
    // Acá vive la promesa del ADR: lo que un humano corrigió, no se pisa nunca.
    if (!curados.includes("nombre")) fila.nombre = c.nombre;
    if (!curados.includes("categoria")) fila.categoria = c.categoria;
    return fila;
  });

const LOTE = 500;
let escritos = 0;
for (let i = 0; i < filas.length; i += LOTE) {
  const { error } = await db.from("pois").upsert(filas.slice(i, i + LOTE), { onConflict: "osm_id" });
  if (error) morir(`Falló el upsert de POIs (lote ${i / LOTE + 1}): ${error.message}`);
  escritos += Math.min(LOTE, filas.length - i);
  process.stdout.write(`\r[${PASO}] escritos ${escritos}/${filas.length}`);
}
process.stdout.write("\n");

const protegidos = [...curadoPorOsmId.values()].filter((c) => c.length > 0).length;
if (protegidos) console.log(`[${PASO}] ${protegidos} POIs tenían campos curados: se respetaron`);
if (ajenos.size) console.log(`[${PASO}] ${ajenos.size} POIs ya no son de OSM (adoptados a mano): intactos`);

/* ── 6. Los que se cayeron de OSM: apagar, nunca borrar ──────────────────── */

const vistos = new Set(candidatos.map((c) => c.osm_id));

// ACOTADO AL DISTRITO QUE SE ESTÁ SINCRONIZANDO. Sin el `!inner` y el filtro,
// esta consulta traía TODOS los POIs de OSM de la base, y como `vistos` solo
// contiene los de esta corrida, los de cualquier otro distrito quedaban
// marcados como ausentes. No se apagaban al toque —hace falta que lleven 3
// semanas sin verse— así que el daño no aparecía el día del cambio: aparecía
// tres semanas después, apagando el distrito que no se hubiera sincronizado
// esa semana. Un bug con mecha larga.
//
// Se acota por `cells.distrito` porque `pois` no tiene distrito propio; su
// celda sí. Ojo: compara por NOMBRE, así que dos entradas de `distritos.ts`
// con el mismo `nombre` se pisarían.
const { data: todosOsm, error: eTodos } = await db
  .from("pois")
  .select("id, osm_id, nombre, visto_en_osm_at, cells!inner(distrito)")
  .eq("origen", "osm")
  .eq("activo", true)
  .eq("cells.distrito", distrito.nombre);
if (eTodos) morir(`No pude revisar los POIs que faltan: ${eTodos.message}`);

const ausentes = (todosOsm ?? []).filter((p) => !vistos.has(p.osm_id as number));
// Semanal × 3 corridas. Se compara contra la fecha, no contra un contador: así
// no hace falta una columna extra y el criterio queda legible en la consulta.
const corte = new Date(Date.now() - CORRIDAS_PARA_APAGAR * 7 * 24 * 3600 * 1000).toISOString();
const paraApagar = ausentes.filter(
  (p) => (p.visto_en_osm_at as string | null) && (p.visto_en_osm_at as string) < corte
);

if (paraApagar.length) {
  const { error } = await db
    .from("pois")
    .update({ activo: false })
    .in(
      "id",
      paraApagar.map((p) => p.id)
    );
  if (error) morir(`No pude apagar los POIs ausentes: ${error.message}`);
  console.log(
    `[${PASO}] ${paraApagar.length} POIs llevan ${CORRIDAS_PARA_APAGAR}+ corridas sin aparecer: APAGADOS (no borrados)`
  );
  for (const p of paraApagar.slice(0, 5)) console.log(`     · ${p.nombre}`);
}

terminar(PASO, {
  distrito: distrito.clave,
  traidos: candidatos.length,
  escritos,
  sin_mapear: sinMapear,
  celdas_nuevas: nuevas.length,
  ausentes: ausentes.length,
  apagados: paraApagar.length,
  protegidos,
});
