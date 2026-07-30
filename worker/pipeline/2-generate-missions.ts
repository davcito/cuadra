/**
 * Pipeline paso 2 — Generar Vueltas con Claude sobre POIs REALES de una celda.
 * Documento maestro §7.3 · plan RUP E1, punto 2.
 *
 *   npm run generate-missions -- --celda=89e6624b257ffff --dry-run
 *   npm run generate-missions -- --celda=89e6624b257ffff --cantidad=12
 *
 * ESTE ES EL ÚNICO SCRIPT DEL WORKER QUE GASTA PLATA. Todo lo que sigue está
 * diseñado alrededor de esa frase:
 *
 *  · `--dry-run` NO llama al modelo. Cuenta los tokens de entrada con la API de
 *    conteo (gratis) y te dice cuánto costaría antes de que decidas gastarlo.
 *  · El JSON lo fuerza el servidor (structured outputs) con el schema derivado
 *    del MISMO zod que valida después. No pueden divergir.
 *  · Los reintentos no son ciegos: se le devuelve al modelo el error exacto del
 *    validador. Reintentar a ciegas es pagar dos veces por el mismo error.
 *  · Cada corrida imprime el costo REAL medido, no el estimado.
 *
 * Reglas duras que este archivo hace cumplir:
 *   #1 la IA nunca inventa lugares → `validarLoteVueltas` cruza cada poi_id
 *      contra los POIs que realmente se enviaron.
 *   #2 esto corre SOLO en el worker; la app jamás llama a la API de Claude.
 *   #8 el prompt vive en `prompts/generacion-vueltas.md` y se carga de ahí.
 */

import { readFileSync } from "node:fs";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

import { env, leerArgs, morir, supabase, terminar, terminarSinTrabajo } from "./base.js";
import { cargarPrompt } from "./prompt.js";
import { avisosDeProximidad } from "./proximidad.js";
import { revisarLote, validarLoteVueltas, VueltaSchema, type Vuelta } from "./schema.js";

const PASO = "generate-missions";

/**
 * Precios por millón de tokens (USD), al 2026-07-29.
 *
 * Están acá y no dispersos porque el número que importa es el que se imprime
 * en pantalla: si el precio cambia y esta tabla no, el script miente sobre la
 * plata, que es la peor forma de mentir.
 *
 * Sonnet 5 tiene precio de intro ($2/$10) hasta el 2026-08-31; después pasa a
 * $3/$15. Se usa el precio de LISTA a propósito: preferimos que el número que
 * mostramos sea el techo y no una sorpresa en septiembre.
 */
const PRECIOS: Record<string, { entrada: number; salida: number }> = {
  "claude-sonnet-5": { entrada: 3.0, salida: 15.0 },
  "claude-opus-5": { entrada: 5.0, salida: 25.0 },
  "claude-haiku-4-5": { entrada: 1.0, salida: 5.0 },
};

/**
 * El modelo de la generación semanal. El documento maestro §7.4 decía Haiku 4.5;
 * el plan RUP lo cambió a Sonnet 5 por calidad de copy en español peruano.
 * El desvío está registrado en `docs/decisiones/0008-modelo-de-generacion.md`.
 */
const MODELO_POR_DEFECTO = "claude-sonnet-5";

/**
 * El lote va envuelto en un objeto, no suelto como array.
 *
 * Structured outputs quiere un objeto en la raíz. Es un cambio de forma respecto
 * de la v1 del prompt (que pedía un array pelado), y por eso el prompt subió a
 * v1.1 en el mismo commit: si el prompt dijera "array" y el servidor forzara un
 * objeto, el modelo recibiría dos instrucciones contradictorias.
 */
const LoteSchema = z.object({ vueltas: z.array(VueltaSchema) }).strict();

/* ─────────────────────────────── argumentos ────────────────────────────── */

const args = leerArgs();

/**
 * Modo "el lote ya está escrito": lee las Vueltas de un JSON en vez de pedírselas
 * al modelo, y las inserta por EXACTAMENTE el mismo camino.
 *
 * POR QUÉ EXISTE: la generación desatendida (un cron a las 3am) necesita una
 * clave de API, pero E1 no necesita generación desatendida — necesita contenido
 * en la base para la demo. Ese contenido se puede escribir en una sesión de
 * Claude Code, que es uso interactivo y no consume API.
 *
 * Lo valioso es que el camino de inserción es el MISMO: mismo validador, misma
 * regla anti-alucinación, misma inyección de h3_index, mismo insert. Así E1
 * ejercita de punta a punta la maquinaria que después va a usar el modelo, y
 * cuando llegue la clave lo único nuevo es de dónde sale el JSON.
 *
 *   # validar sin base y sin API (esto se puede hacer hoy):
 *   npm run generate-missions -- --desde-archivo=v.json --pois=barranco.json --dry-run
 *
 *   # insertar (necesita SUPABASE_*):
 *   npm run generate-missions -- --desde-archivo=v.json
 */
const desdeArchivo = args.textoOpcional("desde-archivo", "");
/** El volcado de `sync-pois --volcar`. Da los POIs reales para validar sin base. */
const archivoPois = args.textoOpcional("pois", "");

// En modo archivo la celda es opcional: el archivo ya la trae, y sin --celda se
// procesan todas. Con --celda se filtra a una sola.
const celda = desdeArchivo ? args.textoOpcional("celda", "") : args.texto("celda", "89e6624b257ffff");
const cantidad = args.numero("cantidad", 12, 1, 25);
const modelo = args.textoOpcional("modelo", MODELO_POR_DEFECTO);
const esfuerzo = args.textoOpcional("esfuerzo", "medium");
const maxReintentos = args.numero("reintentos", 2, 0, 3);
const dryRun = args.bandera("dry-run");
const forzar = args.bandera("forzar");

if (!PRECIOS[modelo]) {
  morir(`No conozco el precio de "${modelo}". Agregalo a PRECIOS o usá: ${Object.keys(PRECIOS).join(", ")}`);
}

/* ─────────────────────────────── utilidades ────────────────────────────── */

function costoUSD(modeloId: string, entrada: number, salida: number): number {
  const p = PRECIOS[modeloId]!;
  return (entrada / 1_000_000) * p.entrada + (salida / 1_000_000) * p.salida;
}

const usd = (n: number) => `US$${n.toFixed(4)}`;

/* ──────────────────────────────── el trabajo ───────────────────────────── */

type PoiFila = { id: number; nombre: string; categoria: string; metadata: Record<string, unknown> | null };

/* ─────────────────────── modo archivo (sin modelo) ─────────────────────── */

/**
 * Las Vueltas escritas a mano referencian POIs por `osm_id`, no por `poi_id`.
 *
 * No es un capricho: `pois.id` lo asigna Postgres al insertar (`generated always
 * as identity`), así que al escribir el contenido ese número todavía no existe.
 * El `osm_id` sí es estable y conocido desde el volcado de Overpass. Resolver
 * osm_id → id acá es lo que permite escribir el contenido ANTES de que la base
 * exista, que es exactamente la situación de E1.
 */
const ArchivoVueltas = z.object({
  distrito: z.string().optional(),
  generado_por: z.string().optional(),
  celdas: z.array(
    z.object({
      h3_index: z.string().min(1),
      vueltas: z.array(VueltaSchema.omit({ poi_id: true }).extend({ osm_id: z.number().int() })),
    })
  ),
});

function leerJson(ruta: string, que: string): unknown {
  try {
    return JSON.parse(readFileSync(ruta, "utf8"));
  } catch (e) {
    return morir(`No pude leer ${que} en ${ruta}: ${e instanceof Error ? e.message : e}`);
  }
}

async function modoDesdeArchivo(): Promise<never> {
  const parseo = ArchivoVueltas.safeParse(leerJson(desdeArchivo, "el archivo de vueltas"));
  if (!parseo.success) {
    morir(
      `El archivo de vueltas no tiene la forma esperada:\n` +
        parseo.error.issues.map((i) => `    ${i.path.join(".")}: ${i.message}`).join("\n")
    );
  }
  const archivo = parseo.data;
  const celdas = celda ? archivo.celdas.filter((c) => c.h3_index === celda) : archivo.celdas;
  if (celdas.length === 0) morir(`El archivo no tiene la celda ${celda}.`);

  const totalVueltas = celdas.reduce((n, c) => n + c.vueltas.length, 0);
  console.log(`\n[${PASO}] desde archivo: ${desdeArchivo}`);
  console.log(`  ${celdas.length} celda(s) · ${totalVueltas} vuelta(s)`);
  if (archivo.generado_por) console.log(`  generado por: ${archivo.generado_por}`);

  /* ── Validación sin base: el caso de E1 ──────────────────────────────── */
  // Con --pois se valida contra el volcado de Overpass, así que no hace falta ni
  // credencial ni clave de API. Es la única forma de comprobar el contenido
  // ANTES de que exista la base, y es justo lo que hay que poder hacer hoy.
  if (archivoPois) {
    const dump = leerJson(archivoPois, "el volcado de POIs") as {
      celdas: Array<{ h3_index: string; pois: Array<{ osm_id: number; nombre: string; lat: number; lon: number }> }>;
    };
    const porCelda = new Map(dump.celdas.map((c) => [c.h3_index, c.pois]));

    let ok = 0;
    const problemas: string[] = [];
    for (const c of celdas) {
      const pois = porCelda.get(c.h3_index);
      if (!pois) {
        problemas.push(`celda ${c.h3_index} no está en el volcado`);
        continue;
      }
      // El truco: para validar offline se usan los osm_id COMO si fueran poi_id.
      // El validador solo comprueba "este id pertenece al conjunto que le pasé",
      // así que la regla anti-alucinación se ejercita igual de verdad.
      const reales = new Set(pois.map((p) => p.osm_id));
      const comoLote = c.vueltas.map(({ osm_id, ...resto }) => ({ ...resto, poi_id: osm_id }));
      try {
        const validas = validarLoteVueltas(comoLote, reales);
        ok += validas.length;
        // Avisos de regla 9: no invalidan el lote, pero si nadie los imprime da
        // igual haberlos calculado.
        for (const aviso of revisarLote(validas)) console.warn(`      ⚠ ${c.h3_index}: ${aviso}`);

        // Proximidad: el volcado trae lat/lon, así que acá —y solo acá— se puede
        // comprobar que el lote de verdad obligue a caminar.
        const ubicacion = new Map(pois.map((p) => [p.osm_id, p]));
        const ubicadas = c.vueltas
          .map((v) => {
            const p = ubicacion.get(v.osm_id);
            return p ? { titulo: v.titulo, osm_id: v.osm_id, lat: p.lat, lon: p.lon } : null;
          })
          .filter((x): x is NonNullable<typeof x> => x !== null);
        for (const aviso of avisosDeProximidad(ubicadas)) console.warn(`      ⚠ ${c.h3_index}: ${aviso}`);
      } catch (e) {
        problemas.push(`celda ${c.h3_index}: ${e instanceof Error ? e.message : e}`);
      }
    }

    if (problemas.length > 0) {
      console.error(`\n  ✗ ${problemas.length} problema(s):`);
      problemas.forEach((p) => console.error(`      ${p}`));
      terminarSinTrabajo(PASO, `${problemas.length} celda(s) con vueltas inválidas`);
    }

    console.log(`\n  ✓ ${ok} vuelta(s) válidas contra el schema y contra los POIs reales del volcado`);
    console.log(`    (sin base y sin API — para insertar, sacá --pois y poné SUPABASE_* en worker/.env)`);
    terminar(PASO, { modo: "validar-archivo", celdas: celdas.length, vueltas: ok, costo_usd: 0 });
  }

  /* ── Inserción de verdad ─────────────────────────────────────────────── */
  const db = supabase();
  let insertadas = 0;
  const saltadas: string[] = [];

  for (const c of celdas) {
    const osmIds = c.vueltas.map((v) => v.osm_id);
    // lat/lng viajan para poder correr el chequeo de proximidad también acá. Sin
    // eso, los dos revisores —estilo y proximidad— solo corrían en la rama
    // `--pois`, que es justamente la que NO escribe: el lote que se inserta de
    // verdad entraba sin que nadie lo mirara. Un control que solo se ejecuta en
    // el camino inofensivo no es un control.
    const { data: pois, error } = await db
      .from("pois")
      .select("id, osm_id, lat, lng")
      .in("osm_id", osmIds);
    if (error) morir(`No pude resolver los POIs de ${c.h3_index}: ${error.message}`);

    const mapa = new Map((pois ?? []).map((p) => [p.osm_id as number, p.id as number]));
    const faltantes = osmIds.filter((o) => !mapa.has(o));
    if (faltantes.length > 0) {
      // Sin el POI en la base el insert reventaría contra la FK. Se dice cuál y
      // se salta la celda entera: nunca inserción parcial (regla dura #1).
      saltadas.push(`${c.h3_index}: faltan ${faltantes.length} POI(s) en la base (osm_id ${faltantes.slice(0, 5).join(", ")})`);
      continue;
    }

    const comoLote = c.vueltas.map(({ osm_id, ...resto }) => ({ ...resto, poi_id: mapa.get(osm_id)! }));
    let lote: Vuelta[];
    try {
      lote = validarLoteVueltas(comoLote, new Set(mapa.values()));
    } catch (e) {
      saltadas.push(`${c.h3_index}: ${e instanceof Error ? e.message : e}`);
      continue;
    }

    // Los mismos dos revisores de la rama offline. Avisan, no bloquean: el
    // glosario y la regla 9 marcan contenido flojo, no contenido peligroso, y
    // frenar la corrida entera por una palabra obligaría a elegir entre publicar
    // con el aviso o no publicar nada.
    for (const aviso of revisarLote(lote)) console.warn(`      ⚠ ${c.h3_index}: ${aviso}`);
    const ubicadas = c.vueltas
      .map((v) => {
        const p = (pois ?? []).find((x) => x.osm_id === v.osm_id);
        return p?.lat != null && p?.lng != null
          ? { titulo: v.titulo, osm_id: v.osm_id, lat: p.lat as number, lon: p.lng as number }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    for (const aviso of avisosDeProximidad(ubicadas)) console.warn(`      ⚠ ${c.h3_index}: ${aviso}`);

    if (dryRun) {
      console.log(`  DRY-RUN ${c.h3_index}: se insertarían ${lote.length}`);
      insertadas += lote.length;
      continue;
    }

    const filas = lote.map((v) => ({ ...v, h3_index: c.h3_index, estado: "draft" as const }));
    const { data: hechas, error: errIns } = await db.from("missions").insert(filas).select("id");
    if (errIns) morir(`Insert falló en ${c.h3_index}: ${errIns.message}`);
    insertadas += hechas?.length ?? 0;
    console.log(`  ${c.h3_index}: ${hechas?.length ?? 0} insertadas`);
  }

  if (saltadas.length > 0) {
    console.error(`\n  ⚠ ${saltadas.length} celda(s) saltadas:`);
    saltadas.forEach((s) => console.error(`      ${s}`));
  }
  if (insertadas === 0) terminarSinTrabajo(PASO, "ninguna vuelta se pudo insertar");

  terminar(PASO, {
    modo: dryRun ? "archivo-dry-run" : "archivo",
    celdas: celdas.length,
    vueltas: insertadas,
    saltadas: saltadas.length,
    costo_usd: 0,
  });
}

async function main(): Promise<never> {
  // El modo archivo se atiende primero: no necesita prompt, ni modelo, ni —con
  // --pois— base. Bajar a construir el cliente de Supabase antes de saber si hace
  // falta obligaría a tener credenciales para una validación que no las usa.
  if (desdeArchivo) return modoDesdeArchivo();

  const prompt = cargarPrompt();
  const db = supabase();

  console.log(`\n[${PASO}] celda=${celda} cantidad=${cantidad} modelo=${modelo} ${dryRun ? "(DRY-RUN)" : ""}`);
  console.log(`  prompt: ${prompt.version}`);

  // ── 1. La celda ────────────────────────────────────────────────────────
  // `missions.h3_index` es NOT NULL con FK a `cells`. El contrato `Vuelta` NO
  // incluye h3_index: se inyecta acá, desde --celda. Si la celda no existe, el
  // insert reventaría contra la FK recién al final, después de haber pagado.
  // Por eso se comprueba ANTES de gastar un centavo.
  const { data: cell, error: errCelda } = await db
    .from("cells")
    .select("h3_index, distrito, activa, nivel_seguridad")
    .eq("h3_index", celda)
    .maybeSingle();

  if (errCelda) morir(`No pude leer la celda: ${errCelda.message}`);
  if (!cell) {
    morir(
      `La celda ${celda} no existe en \`cells\`.\n` +
        `  Corré primero: npm run sync-pois -- --distrito=<distrito>\n` +
        `  (el sync crea las celdas faltantes, apagadas, según ADR-0007 §5)`
    );
  }

  if (!cell.activa) {
    // No es motivo para abortar —las vueltas nacen 'draft' igual— pero sí para
    // que quede dicho: nadie las va a ver hasta que un humano revise la celda.
    console.warn(
      `  ⚠ la celda está APAGADA (activa=false, nivel_seguridad=${cell.nivel_seguridad}).\n` +
        `    Las vueltas se van a generar como draft, pero la celda no sirve contenido\n` +
        `    hasta que alguien la revise. Regla dura #4: modo seguro primero.`
    );
  }

  // ── 2. Los POIs ────────────────────────────────────────────────────────
  const { data: pois, error: errPois } = await db
    .from("pois")
    .select("id, nombre, categoria, metadata")
    .eq("h3_index", celda)
    .eq("activo", true)
    .order("id");

  if (errPois) morir(`No pude leer los POIs: ${errPois.message}`);
  const lista = (pois ?? []) as PoiFila[];

  if (lista.length < 3) {
    terminarSinTrabajo(
      PASO,
      `la celda ${celda} tiene ${lista.length} POI(s) activos y hacen falta 3+ para un lote decente`
    );
  }
  console.log(`  POIs activos en la celda: ${lista.length}`);

  // ── 3. Idempotencia (regla de mantenibilidad #1) ────────────────────────
  // `missions` no tiene índice único, así que dos corridas seguidas duplicarían
  // el contenido en silencio. El guard vive acá y no en la base porque tocar el
  // esquema es una migración, y esto se arregla sin pedir permiso a Postgres.
  const { count: yaHay, error: errCount } = await db
    .from("missions")
    .select("id", { count: "exact", head: true })
    .eq("h3_index", celda);

  if (errCount) morir(`No pude contar las vueltas existentes: ${errCount.message}`);
  if ((yaHay ?? 0) > 0 && !forzar) {
    terminarSinTrabajo(
      PASO,
      `la celda ${celda} ya tiene ${yaHay} vuelta(s). Usá --forzar si querés generar más igual.`
    );
  }

  // ── 4. El payload ──────────────────────────────────────────────────────
  const payload = {
    celda,
    distrito: cell.distrito,
    pois: lista.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      categoria: p.categoria,
      tags: (p.metadata as Record<string, unknown> | null)?.osm_tags ?? {},
    })),
    contexto: { ventanas: ["mañana", "tarde", "noche"] },
    cantidad,
  };

  const cliente = new Anthropic({ apiKey: env("ANTHROPIC_API_KEY") });

  const mensajes: Anthropic.MessageParam[] = [
    { role: "user", content: JSON.stringify(payload) },
  ];
  const sistema: Anthropic.TextBlockParam[] = [
    // El SYSTEM es idéntico en todas las celdas y todas las corridas: si supera
    // el mínimo cacheable, las llamadas siguientes lo leen a ~1/10 del precio.
    // Si no lo supera, el servidor simplemente no cachea y no pasa nada.
    { type: "text", text: prompt.system, cache_control: { type: "ephemeral" } },
  ];
  const formato = zodOutputFormat(LoteSchema);

  // ── 5. Cuánto va a costar, ANTES de gastarlo ───────────────────────────
  const conteo = await cliente.messages.countTokens({
    model: modelo,
    system: sistema,
    messages: mensajes,
  });

  // ~190 tokens por vuelta, medido sobre los ejemplos canónicos del prompt.
  // Es una estimación declarada como tal: el número que manda es el REAL que se
  // imprime al final, salido de `usage`.
  const salidaEstimada = cantidad * 190;
  const estimado = costoUSD(modelo, conteo.input_tokens, salidaEstimada);

  console.log(`\n  Tokens de entrada (medidos): ${conteo.input_tokens}`);
  console.log(`  Tokens de salida (estimados): ~${salidaEstimada}`);
  console.log(`  Costo estimado del lote: ${usd(estimado)}`);

  // La proyección se cuenta, no se supone. Un multiplicador inventado ("×38
  // celdas") es exactamente el tipo de número que después nadie verifica y que
  // termina en una estimación de presupuesto — que es de dónde venía el $11/mes.
  const { data: filasCeldas } = await db.from("pois").select("h3_index").eq("activo", true);
  const celdasConPois = new Set((filasCeldas ?? []).map((p) => p.h3_index as string)).size;
  if (celdasConPois > 1) {
    console.log(
      `  Proyección: ${usd(estimado * celdasConPois)} para las ${celdasConPois} celdas con POIs activos\n` +
        `    (asume lotes de tamaño parecido; esta celda tiene ${lista.length} POIs)`
    );
  }

  if (dryRun) {
    console.log(`\n  DRY-RUN: no se llamó al modelo, no se gastó nada, no se insertó nada.`);
    console.log(`  POIs que se habrían enviado:`);
    for (const p of payload.pois.slice(0, 8)) console.log(`    ${p.id}  ${p.nombre}  [${p.categoria}]`);
    if (payload.pois.length > 8) console.log(`    … y ${payload.pois.length - 8} más`);
    terminar(PASO, { celda, pois: lista.length, dry_run: true, costo_estimado_usd: Number(estimado.toFixed(4)) });
  }

  // ── 6. La llamada, con reintentos que aprenden del error ───────────────
  let lote: Vuelta[] | null = null;
  let entradaTotal = 0;
  let salidaTotal = 0;
  let cacheLeido = 0;
  let intentos = 0;
  const fallas: string[] = [];
  const idsReales = new Set(lista.map((p) => p.id));

  for (let intento = 0; intento <= maxReintentos; intento++) {
    intentos = intento + 1;
    process.stdout.write(`\n  → intento ${intentos}/${maxReintentos + 1} … `);

    // Se transmite en streaming por una razón práctica: con 25 vueltas más el
    // razonamiento, la respuesta puede tardar minutos y una petición común se
    // cortaría por timeout HTTP a mitad de camino.
    const stream = cliente.messages.stream({
      model: modelo,
      max_tokens: 16000,
      system: sistema,
      messages: mensajes,
      output_config: { effort: esfuerzo as "low" | "medium" | "high", format: formato },
    });
    const respuesta = await stream.finalMessage();

    entradaTotal += respuesta.usage.input_tokens;
    salidaTotal += respuesta.usage.output_tokens;
    cacheLeido += respuesta.usage.cache_read_input_tokens ?? 0;

    if (respuesta.stop_reason === "refusal") {
      morir(`El modelo rechazó la petición (${respuesta.stop_details?.category ?? "sin categoría"}). Revisá el prompt.`);
    }
    if (respuesta.stop_reason === "max_tokens") {
      // Cortado a la mitad: el JSON está incompleto por definición. Reintentar
      // con el mismo max_tokens daría lo mismo, así que se dice y se corta.
      morir(`La respuesta se cortó por max_tokens. Bajá --cantidad o subí max_tokens.`);
    }

    const texto = respuesta.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    try {
      const crudo = LoteSchema.parse(JSON.parse(texto));
      // Acá está la regla dura #1: valida el schema Y que ningún poi_id sea
      // inventado. Si algo falla, se descarta el LOTE ENTERO — nunca parcial.
      lote = validarLoteVueltas(crudo.vueltas, idsReales);
      console.log(`OK — ${lote.length} vuelta(s) válidas`);
      // Regla 9: no invalida, avisa. Un lote monótono es pobre, no inválido, y
      // tirarlo costaría otra llamada por una cuestión de criterio.
      for (const aviso of revisarLote(lote)) console.warn(`     ⚠ ${aviso}`);
      break;
    } catch (e) {
      const detalle = e instanceof Error ? e.message : String(e);
      fallas.push(detalle);
      console.log(`RECHAZADO`);
      console.log(`     ${detalle.slice(0, 300)}`);

      if (intento === maxReintentos) break;

      // El reintento le devuelve el error exacto. Reintentar a ciegas es pagar
      // otra vez por el mismo error; devolverle el detalle le da con qué
      // corregir, y es el uso honesto del presupuesto de reintentos.
      mensajes.push({ role: "assistant", content: respuesta.content });
      mensajes.push({
        role: "user",
        content:
          `El lote anterior fue RECHAZADO por el validador:\n${detalle}\n\n` +
          `Devolvé el lote completo corregido. Recordá: cada poi_id tiene que ser ` +
          `uno de los "id" del input, exacto.`,
      });
    }
  }

  const costoReal = costoUSD(modelo, entradaTotal, salidaTotal);
  console.log(
    `\n  Costo REAL: ${usd(costoReal)}  (entrada ${entradaTotal}, salida ${salidaTotal}` +
      (cacheLeido ? `, ${cacheLeido} leídos de caché` : "") +
      `, ${intentos} intento(s))`
  );

  if (!lote) {
    console.error(`\n  Ningún intento produjo un lote válido. Errores:`);
    fallas.forEach((f, i) => console.error(`    ${i + 1}. ${f.slice(0, 200)}`));
    terminarSinTrabajo(PASO, `${intentos} intento(s) y ningún lote válido — no se insertó nada`);
  }

  // ── 7. Insertar como draft ─────────────────────────────────────────────
  // h3_index se inyecta acá: el modelo nunca lo ve ni lo decide.
  const filas = lote.map((v) => ({ ...v, h3_index: celda, estado: "draft" as const }));

  const { data: insertadas, error: errInsert } = await db.from("missions").insert(filas).select("id");
  if (errInsert) morir(`El lote validó pero el insert falló: ${errInsert.message}`);

  console.log(`\n  Insertadas ${insertadas?.length ?? 0} vuelta(s) como draft:`);
  for (const v of lote.slice(0, 5)) console.log(`    [${v.categoria}/d${v.dificultad}] ${v.titulo}`);
  if (lote.length > 5) console.log(`    … y ${lote.length - 5} más`);
  console.log(`\n  Siguiente: revisalas y activalas con activar.ts`);

  terminar(PASO, {
    celda,
    pois: lista.length,
    vueltas: lote.length,
    intentos,
    modelo,
    prompt: prompt.version,
    costo_usd: Number(costoReal.toFixed(4)),
  });
}

main().catch((e) => morir(e instanceof Error ? e.message : String(e)));
