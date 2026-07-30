/**
 * Contrato de salida del generador de Vueltas (documento maestro §7.3).
 * Regla dura #1: la IA nunca inventa lugares — toda vuelta referencia un
 * poi_id que DEBE existir en el lote de POIs enviado en el prompt.
 * Si el JSON no cumple el schema: descartar y reintentar, nunca insertar parcial.
 */
import { z } from "zod";

export const TIPOS_VUELTA = ["observacion", "consumo", "social", "patrimonio"] as const;
export const CATEGORIAS = ["huarique", "caleta", "huaca", "casero"] as const;
export const VENTANAS = ["mañana", "tarde", "noche"] as const;

export const VueltaSchema = z
  .object({
    poi_id: z.number().int().positive(),
    titulo: z.string().min(1).max(60),
    descripcion: z.string().min(1).max(280),
    tipo: z.enum(TIPOS_VUELTA),
    categoria: z.enum(CATEGORIAS),
    dificultad: z.number().int().min(1).max(3),
    calle_xp: z.number().int().positive(),
    ventana_horaria: z.array(z.enum(VENTANAS)).nonempty(),
    requiere_foto: z.boolean(),
    instruccion_verificacion: z.string().min(1),
  })
  .strict();

export const LoteVueltasSchema = z.array(VueltaSchema);

export type Vuelta = z.infer<typeof VueltaSchema>;

/**
 * Rangos de Calle por dificultad — regla 7 del prompt de generación.
 *
 * Vive acá y no solo en el prompt porque un rango que únicamente existe como
 * instrucción es una sugerencia: el modelo la cumple casi siempre, y el "casi"
 * entra a la base sin que nadie lo note. Con esto, una vuelta de dificultad 1
 * que reparte 55 de Calle se rechaza igual que un poi_id inventado.
 *
 * Se detectó con una prueba de humo del camino --desde-archivo: `calle_xp: 55`
 * con `dificultad: 1` pasaba entero, porque el zod solo pedía entero positivo.
 */
export const RANGOS_CALLE: Record<number, readonly [number, number]> = {
  1: [10, 15],
  2: [20, 30],
  3: [40, 60],
};

/**
 * Una DISTANCIA expresada en unidades métricas — regla 5 del prompt.
 *
 * Dos correcciones, las dos salidas de correrlo contra el primer lote real:
 *
 * 1. **`\b` en JavaScript es ASCII.** Entre "í" y "metros" ve un límite de
 *    palabra, así que `centímetros` matcheaba `metros`. El test que creía cubrir
 *    esto usaba "geométrico", que pasa por otro motivo (no contiene "metro"), o
 *    sea que no probaba lo que decía probar. Se usan lookarounds con `\p{L}`,
 *    que sí entienden acentos.
 *
 * 2. **La regla habla de DISTANCIAS, no de dimensiones.** "Una escultura de
 *    metro y medio" es un tamaño y es correcto decirlo así; "a 200 metros del
 *    parque" es una distancia y rompe la firma de marca. Por eso se exige una
 *    cantidad pegada a la unidad: es lo que distingue medir el camino de medir
 *    un objeto.
 */
/**
 * Palabras que el jugador NO puede leer nunca — dos familias distintas.
 *
 * **1. El glosario es LEY** (CLAUDE.md, tabla de dominio). En el código se llama
 * `missions`; en la UI se llama **Vuelta**, siempre. Una descripción que dice
 * "esta misión es fácil" rompe la regla de marca más visible que tiene el
 * proyecto, y la rompe en el texto que la gente efectivamente lee.
 *
 * **2. La fuga del pipeline.** Esta apareció sola, y es más interesante: al
 * corregir las invenciones, el remedio se volvió fórmula — "el mapa no dice
 * nada", "en el mapa ni número tiene", "no figura en el registro". Seis de diez
 * descripciones de una celda terminaron hablando de la base de datos. Al jugador
 * no le importa que el POI viniera de OSM con dos tags: para él eso no es un
 * lugar con poca información, es un lugar. Peor todavía, una de esas frases era
 * falsa contra sus propios datos ("no dice ni qué venden" en un POI con
 * `shop=bakery`).
 *
 * Convertir el vacío de datos en gancho SÍ funciona —"toca caminar la cuadra
 * hasta dar con él"— pero se hace sin nombrar el mapa.
 */
const VOCABULARIO_PROHIBIDO: ReadonlyArray<{ patron: RegExp; que: string }> = [
  {
    patron: /(?<![\p{L}])misi[óo]n(?:es)?(?![\p{L}])/iu,
    que: 'el glosario es LEY: de cara al jugador se llama "Vuelta", nunca "misión"',
  },
  {
    patron: /(?<![\p{L}])(POIs?|OSM|OpenStreetMap|geofence|h3|tags?)(?![\p{L}])/u,
    que: "vocabulario interno del pipeline en texto que lee el jugador",
  },
  {
    patron:
      /(?:en\s+)?el\s+mapa\s+(?:no\s+\w+|ni\s+\w+)|no\s+(?:dice|trae|figura|aparece)\s+(?:nada\s+)?(?:en\s+)?el\s+mapa|figura\s+(?:en\s+el\s+mapa|como)\s/iu,
    que: "fuga del pipeline: el jugador no sabe ni le importa qué trae la base de datos",
  },
];

const CANTIDAD = String.raw`(?:\d+(?:[.,]\d+)?|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|veinte|cincuenta|cien|mil)`;
const UNIDAD = String.raw`(?:mts?|metros?|km|kil[óo]metros?)`;
const DISTANCIA_METRICA = new RegExp(`(?<![\\p{L}])${CANTIDAD}\\s*${UNIDAD}(?![\\p{L}])`, "iu");

/**
 * Revisión de lote que NO rechaza: devuelve avisos.
 *
 * **Dónde está la línea, y por qué se movió.** `validarLoteVueltas` rechaza lo
 * que rompe el juego o miente: un lugar que no existe (regla dura #1) o una
 * economía incoherente (regla 7). Acá van las reglas de calidad y de voz, donde
 * un falso positivo cuesta más que un falso negativo: tirar un lote bueno obliga
 * a regenerarlo, mientras que una frase off-brand que se cuela es una mancha
 * recuperable.
 *
 * La regla 5 empezó del lado de los rechazos y se movió acá tras correrla contra
 * el primer lote real: rechazó "una escultura de metro y medio" y "una Mafalda
 * de 80 centímetros", que son TAMAÑOS, no distancias. Rechazar una celda entera
 * por eso es exactamente el error caro.
 */
export function revisarLote(lote: Vuelta[]): string[] {
  const avisos: string[] = [];

  for (const v of lote) {
    const texto = `${v.titulo} ${v.descripcion}`;

    // Regla 5: las distancias se cuentan en cuadras.
    const m = DISTANCIA_METRICA.exec(texto);
    if (m) avisos.push(`"${v.titulo}" mide en "${m[0]}" en vez de cuadras (regla 5)`);

    // Glosario (CLAUDE.md, tabla LEY) y fuga del pipeline.
    for (const { patron, que } of VOCABULARIO_PROHIBIDO) {
      const hit = patron.exec(`${texto} ${v.instruccion_verificacion}`);
      if (hit) avisos.push(`"${v.titulo}": ${que} — dice "${hit[0]}"`);
    }
  }

  if (lote.length < 4) return avisos; // en lotes chicos la diversidad no dice nada

  const contar = <K extends keyof Vuelta>(campo: K) => {
    const m = new Map<string, number>();
    for (const v of lote) m.set(String(v[campo]), (m.get(String(v[campo])) ?? 0) + 1);
    return m;
  };

  for (const campo of ["tipo", "categoria"] as const) {
    const conteo = contar(campo);
    const [dominante, n] = [...conteo].sort((a, b) => b[1] - a[1])[0]!;
    if (n / lote.length > 0.6) {
      avisos.push(`el ${Math.round((n / lote.length) * 100)}% del lote es ${campo}="${dominante}" (regla 9: repartí)`);
    }
    if (conteo.size === 1) avisos.push(`todas las vueltas tienen el mismo ${campo}: "${dominante}"`);
  }

  const conNoche = lote.filter((v) => v.ventana_horaria.includes("noche")).length;
  if (conNoche === 0) avisos.push("ninguna vuelta sirve de noche: el lote deja sin contenido esa ventana");
  if (conNoche === lote.length) avisos.push("TODAS las vueltas son de noche — revisá, choca con el modo seguro");

  const dificultades = new Set(lote.map((v) => v.dificultad));
  if (dificultades.size === 1) avisos.push(`todas las vueltas son dificultad ${[...dificultades][0]}`);

  const titulos = new Set(lote.map((v) => v.titulo.toLowerCase().trim()));
  if (titulos.size < lote.length) avisos.push(`${lote.length - titulos.size} título(s) repetidos en el lote`);

  return avisos;
}

/**
 * Valida el lote completo y las dos reglas que el schema por sí solo no cubre:
 *
 *  1. **Anti-alucinación (regla dura #1):** cada poi_id pertenece al conjunto de
 *     POIs reales que se le dio al modelo.
 *  2. **Economía coherente (regla 7 del prompt):** calle_xp cae en el rango de su
 *     dificultad. Sin esto, el balance del juego lo decide el humor del modelo.
 *
 * Devuelve el lote válido o lanza con el detalle (el caller descarta y reintenta;
 * nunca inserción parcial).
 */
export function validarLoteVueltas(json: unknown, poiIdsReales: Set<number>): Vuelta[] {
  const lote = LoteVueltasSchema.parse(json);

  const inventados = lote.filter((v) => !poiIdsReales.has(v.poi_id));
  if (inventados.length > 0) {
    throw new Error(
      `La IA referenció ${inventados.length} poi_id inexistentes: ` +
        inventados.map((v) => `${v.poi_id} ("${v.titulo}")`).join(", ")
    );
  }

  const descuadradas = lote.filter((v) => {
    const r = RANGOS_CALLE[v.dificultad];
    return !r || v.calle_xp < r[0] || v.calle_xp > r[1];
  });
  if (descuadradas.length > 0) {
    throw new Error(
      `${descuadradas.length} vuelta(s) con calle_xp fuera del rango de su dificultad (regla 7): ` +
        descuadradas
          .map((v) => {
            const r = RANGOS_CALLE[v.dificultad];
            return `"${v.titulo}" d${v.dificultad} pide ${r ? `${r[0]}-${r[1]}` : "?"}, tiene ${v.calle_xp}`;
          })
          .join("; ")
    );
  }

  return lote;
}
