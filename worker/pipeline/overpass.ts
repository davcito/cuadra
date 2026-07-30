/**
 * Cliente de la Overpass API.
 *
 * Overpass es un servicio comunitario y gratuito: la cortesía no es opcional.
 * Por eso acá hay User-Agent identificable, reintento con espera creciente que
 * RESPETA el `Retry-After` cuando el servidor lo manda, y un timeout propio.
 *
 * Y algo que no se ve pero importa: este módulo **no filtra ni interpreta**.
 * Devuelve lo que Overpass dijo. Quien decide qué es válido es el pipeline, con
 * sus reglas escritas — si el filtro viviera acá, un cambio de criterio obligaría
 * a tocar el cliente HTTP.
 */

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
] as const;

const AGENTE = "CuadraBot/0.1 (app de exploracion urbana; contacto: admin@davcstore.com)";

export type ElementoOsm = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/**
 * Arma la consulta.
 *
 * `out center` es la clave: un restaurante puede estar mapeado como nodo (un
 * punto) o como way (el polígono del edificio). Sin `center`, los ways vuelven
 * sin coordenada y se perdería más o menos la mitad del catálogo real.
 */
export function armarConsulta(
  caja: readonly [number, number, number, number],
  filtros: ReadonlyArray<{ clave: string; valor: string | null }>,
  timeoutSeg = 90
): string {
  const bbox = caja.join(",");
  const cuerpo = filtros
    .flatMap(({ clave, valor }) => {
      const sel = valor === null ? `["${clave}"]` : `["${clave}"="${valor}"]`;
      return [`  node${sel}(${bbox});`, `  way${sel}(${bbox});`];
    })
    .join("\n");
  return `[out:json][timeout:${timeoutSeg}];\n(\n${cuerpo}\n);\nout center tags;`;
}

export type RespuestaOverpass = {
  elementos: ElementoOsm[];
  endpoint: string;
  intentos: number;
};

export async function consultar(
  consulta: string,
  { reintentos = 3, timeoutMs = 120_000 } = {}
): Promise<RespuestaOverpass> {
  let ultimoError = "";

  for (let intento = 1; intento <= reintentos; intento++) {
    // Rota de endpoint entre intentos: si uno está saturado, el otro suele andar.
    const endpoint = ENDPOINTS[(intento - 1) % ENDPOINTS.length]!;
    const corte = AbortSignal.timeout(timeoutMs);

    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain", "User-Agent": AGENTE },
        body: consulta,
        signal: corte,
      });

      if (r.status === 429 || r.status === 504) {
        // El servidor dice cuánto esperar; hacerle caso es la diferencia entre
        // ser un cliente molesto y uno bloqueado.
        const dice = Number(r.headers.get("retry-after"));
        const espera = Number.isFinite(dice) && dice > 0 ? dice * 1000 : intento * 8000;
        ultimoError = `${endpoint} respondió ${r.status}`;
        console.warn(`  · ${ultimoError}; espero ${Math.round(espera / 1000)} s`);
        await new Promise((ok) => setTimeout(ok, espera));
        continue;
      }

      if (!r.ok) {
        ultimoError = `${endpoint} respondió ${r.status} ${r.statusText}`;
        console.warn(`  · ${ultimoError}`);
        await new Promise((ok) => setTimeout(ok, intento * 3000));
        continue;
      }

      const json = (await r.json()) as { elements?: ElementoOsm[] };
      if (!Array.isArray(json.elements)) {
        throw new Error("Overpass devolvió algo que no tiene `elements`");
      }
      return { elementos: json.elements, endpoint, intentos: intento };
    } catch (e) {
      ultimoError = e instanceof Error ? e.message : String(e);
      console.warn(`  · intento ${intento} falló: ${ultimoError}`);
      if (intento < reintentos) await new Promise((ok) => setTimeout(ok, intento * 3000));
    }
  }

  throw new Error(`Overpass no respondió tras ${reintentos} intentos. Último: ${ultimoError}`);
}

/**
 * Saca la coordenada de un elemento, venga como nodo o como way.
 * Devuelve null si no tiene ninguna: eso pasa y el pipeline lo descarta.
 */
export function coordenada(e: ElementoOsm): { lat: number; lon: number } | null {
  if (typeof e.lat === "number" && typeof e.lon === "number") return { lat: e.lat, lon: e.lon };
  if (e.center) return { lat: e.center.lat, lon: e.center.lon };
  return null;
}

/**
 * El id único de Cuadra para un elemento de OSM.
 *
 * OSM numera nodos, ways y relations por separado: el nodo 123 y el way 123 son
 * cosas distintas. Como `pois.osm_id` es un solo bigint, se le antepone el tipo:
 * los nodos quedan como están, los ways suman 10^12 y las relations 2×10^12.
 * Sin esto, un nodo y un way con el mismo número se pisarían entre sí.
 */
export function idCuadra(e: ElementoOsm): number {
  const desplazamiento = e.type === "way" ? 1_000_000_000_000 : e.type === "relation" ? 2_000_000_000_000 : 0;
  return desplazamiento + e.id;
}
