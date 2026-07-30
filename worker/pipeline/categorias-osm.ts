/**
 * Mapeo de tags de OpenStreetMap a las categorías de Cuadra.
 *
 * El proyecto nunca lo había decidido: el documento maestro (§3.2) define las
 * cuatro categorías en una línea cada una y nombra las FAMILIAS de tags
 * (`amenity`, `shop`, `tourism`, `historic`, `leisure`), pero nunca dice qué
 * valor concreto cae en qué categoría. Se decide acá, y en un solo lugar.
 *
 * DOS REGLAS QUE HACEN QUE ESTO NO MIENTA:
 *
 * 1. **Un tag sin mapa no se inventa una categoría.** Entra con su valor de OSM
 *    crudo y queda visible para curar. `pois.categoria` es texto libre justamente
 *    para eso: el dominio de las 4 vive en `missions.categoria` (CHECK), no acá.
 *    Forzar todo a cuatro cajones llenaría el catálogo de mentiras convincentes.
 *
 * 2. **Esto es DATO, no lógica.** Se lee, se testea y se corrige sin tocar el
 *    pipeline. Cuando aparezca un tag nuevo, se agrega una línea acá y nada más.
 *
 * Las definiciones salen del documento maestro §3.2, tabla "Capa local v1 — Perú":
 *   huarique — comida escondida        caleta  — lugares secretos
 *   huaca    — patrimonio e historia   casero  — social, el sitio del barrio
 */

/** Las cuatro de la marca. Coincide con el CHECK de `missions.categoria`. */
export const CATEGORIAS_CUADRA = ["huarique", "caleta", "huaca", "casero"] as const;
export type CategoriaCuadra = (typeof CATEGORIAS_CUADRA)[number];

/**
 * `clave=valor` de OSM → categoría de Cuadra.
 *
 * El orden importa: se evalúa de arriba abajo y gana la primera que coincida, así
 * que lo más específico va primero. Un museo es `tourism=museum` y también podría
 * ser `amenity=arts_centre`; queremos que gane huaca.
 */
export const MAPA_OSM: ReadonlyArray<readonly [string, string, CategoriaCuadra]> = [
  // ── HUACAS · patrimonio e historia ──────────────────────────────────────
  // Van primero porque un sitio patrimonial suele traer también tags de turismo
  // o de comercio, y su identidad es el patrimonio.
  ["historic", "*", "huaca"], // ruins, monument, memorial, archaeological_site…
  ["tourism", "museum", "huaca"],
  ["tourism", "artwork", "huaca"],
  ["amenity", "place_of_worship", "huaca"],
  ["building", "church", "huaca"],
  ["man_made", "lighthouse", "huaca"],

  // ── HUARIQUES · comida escondida ────────────────────────────────────────
  // El documento dice "comida ESCONDIDA": el puesto, la fonda, el mercado. Un
  // restaurante de mantel largo entra igual y se cura después si no corresponde;
  // dejarlo afuera nos costaría los huariques reales mal etiquetados en OSM.
  ["amenity", "restaurant", "huarique"],
  ["amenity", "fast_food", "huarique"],
  ["amenity", "food_court", "huarique"],
  ["amenity", "ice_cream", "huarique"],
  ["shop", "bakery", "huarique"],
  ["shop", "butcher", "huarique"],
  ["shop", "greengrocer", "huarique"],
  ["shop", "seafood", "huarique"],
  ["shop", "deli", "huarique"],
  ["shop", "pastry", "huarique"],
  ["amenity", "marketplace", "huarique"],

  // ── CASEROS · social, el sitio del barrio ───────────────────────────────
  // Donde te sentás y saludás al de al lado. El café y el bar son casero, no
  // huarique: no vas por la comida, vas por el rato.
  ["amenity", "cafe", "casero"],
  ["amenity", "bar", "casero"],
  ["amenity", "pub", "casero"],
  ["amenity", "biergarten", "casero"],
  ["shop", "coffee", "casero"],
  ["shop", "hairdresser", "casero"],
  ["shop", "kiosk", "casero"],
  ["shop", "convenience", "casero"],
  ["shop", "books", "casero"],
  ["amenity", "community_centre", "casero"],
  ["amenity", "library", "casero"],

  // ── CALETAS · lugares secretos ──────────────────────────────────────────
  // El mirador, el pasaje, la escalera que da al mar. Lo que no tiene puerta ni
  // dueño y aun así vale la caminata.
  ["tourism", "viewpoint", "caleta"],
  ["tourism", "attraction", "caleta"],
  ["leisure", "park", "caleta"],
  ["leisure", "garden", "caleta"],
  ["leisure", "nature_reserve", "caleta"],
  ["natural", "beach", "caleta"],
  ["highway", "steps", "caleta"],
  ["man_made", "pier", "caleta"],

  // ── CULTURA · se reparte entre huaca y casero ───────────────────────────
  // Salieron de correr el sync contra Barranco de verdad: 8 teatros, 9 galerías
  // y 6 centros culturales quedaban afuera. En un distrito que ES el barrio
  // cultural de Lima, dejarlos fuera del catálogo era un error del mapa.
  ["tourism", "gallery", "huaca"],
  ["amenity", "theatre", "huaca"],
  ["amenity", "arts_centre", "casero"],
  ["amenity", "nightclub", "casero"],
] as const;

export type Clasificacion = {
  /** La categoría de Cuadra, o el valor crudo de OSM si no hay mapa. */
  categoria: string;
  /** false = ningún mapa coincidió; entra con su tag de OSM y espera curación. */
  mapeada: boolean;
  /** El `clave=valor` que decidió, para poder auditar por qué quedó así. */
  porque: string;
};

/**
 * Clasifica un POI por sus tags de OSM.
 *
 * `mapeada: false` significa que ningún mapa coincidió. El pipeline NO lo guarda
 * —ver la nota de abajo— pero sí lo cuenta, y ese conteo es lo que dice qué tag
 * agregar al mapa la próxima vez.
 *
 * POR QUÉ NO ENTRA (revisión del ADR-0007 §6, tras correrlo contra Barranco):
 * la regla original era "un tag sin mapa entra crudo y queda para curar". Se
 * probó y da 1110 de 1466 sin mapear: 48 escuelas, 45 jardines de infantes, 15
 * farmacias, bancos, gomerías, paraderos. Nada de eso es un lugar al que mandar
 * a alguien a caminar. Con esa regla, "100+ POIs" se cumple con paraderos de bus
 * y el criterio de aceptación pierde sentido. **El catálogo es lista blanca**, y
 * lo que queda afuera se reporta por tag para poder agrandar el mapa a propósito.
 */
export function clasificar(tags: Record<string, string>): Clasificacion {
  for (const [clave, valor, categoria] of MAPA_OSM) {
    const suyo = tags[clave];
    if (suyo === undefined) continue;
    if (valor === "*" || suyo === valor) {
      return { categoria, mapeada: true, porque: `${clave}=${suyo}` };
    }
  }

  // Sin mapa: se devuelve el tag más informativo para poder contarlo en el informe.
  for (const clave of ["amenity", "shop", "tourism", "leisure", "historic", "natural", "man_made"]) {
    const suyo = tags[clave];
    if (suyo) return { categoria: suyo, mapeada: false, porque: `${clave}=${suyo} (sin mapa)` };
  }

  return { categoria: "sin_clasificar", mapeada: false, porque: "sin tags útiles" };
}

/**
 * Los filtros exactos que se le piden a Overpass, derivados del propio MAPA_OSM.
 *
 * Se piden `clave=valor` y NO la familia entera. La diferencia es enorme: pedir
 * `["building"]` porque el mapa tiene `building=church` arrastra CADA edificio con
 * nombre del distrito — medido en Barranco, 758 elementos inútiles de 1466. Además
 * de ensuciar, es descortés con un servidor comunitario y gratuito.
 *
 * Sale del mapa para que no se puedan desincronizar: si alguien agrega una
 * categoría y olvida pedirla, esos POIs nunca llegarían y el bug sería invisible.
 */
/**
 * Las familias enteras, para el modo --descubrir del sync. Pedirlas en la corrida
 * normal traería cada edificio y cada calle con nombre del distrito (medido: 758
 * inútiles de 1466 en Barranco); pedirlas a propósito, de vez en cuando, es lo
 * que permite ver qué tags nos estamos perdiendo.
 */
export function familiasParaOverpass(): string[] {
  return [...new Set(MAPA_OSM.map(([clave]) => clave))].sort();
}

export function filtrosParaOverpass(): Array<{ clave: string; valor: string | null }> {
  const vistos = new Set<string>();
  const filtros: Array<{ clave: string; valor: string | null }> = [];

  // Primero los comodines: si una clave se pide entera, sus valores puntuales
  // sobran y pedirlos de nuevo solo duplica trabajo del servidor.
  for (const [clave, valor] of MAPA_OSM) {
    if (valor !== "*" || vistos.has(clave)) continue;
    vistos.add(clave);
    filtros.push({ clave, valor: null });
  }
  for (const [clave, valor] of MAPA_OSM) {
    if (valor === "*" || vistos.has(clave)) continue;
    const k = `${clave}=${valor}`;
    if (vistos.has(k)) continue;
    vistos.add(k);
    filtros.push({ clave, valor });
  }
  return filtros;
}
