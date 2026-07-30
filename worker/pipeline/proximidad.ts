/**
 * ¿Se pueden chapar dos Vueltas sin moverse del mismo lugar?
 *
 * El producto vende caminar. La regla dura #5 del proyecto pone el geofence del
 * check-in en **menos de 75 m**, así que dos Vueltas cuyos POIs estén más cerca
 * que eso se completan las dos parado en el mismo punto. La caminata es la
 * promesa; si el contenido la anula, el problema no es de texto.
 *
 * Esto salió de una auditoría del primer lote de Barranco: tres Vueltas de una
 * celda caían dentro de 57 m del mismo parque. Ningún validador de schema podía
 * verlo —el JSON era perfecto— porque el defecto no vive en una Vuelta sino en
 * la RELACIÓN entre dos. Por eso es un chequeo aparte y no un campo más del zod.
 *
 * Avisa, no rechaza: un par cercano puede ser deliberado (dos piezas distintas
 * del mismo museo al aire libre). Lo que no puede es pasar inadvertido.
 */

/** Radio del geofence de check-in, en metros (regla dura #5). */
export const GEOFENCE_M = 75;

const R_TIERRA_M = 6_371_000;
const rad = (g: number) => (g * Math.PI) / 180;

/** Distancia haversine en metros entre dos coordenadas. */
export function metrosEntre(a: Punto, b: Punto): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type Punto = { lat: number; lon: number };

export type VueltaUbicada = {
  titulo: string;
  osm_id: number;
  lat: number;
  lon: number;
};

export type ParCercano = {
  a: string;
  b: string;
  metros: number;
  /** true = los dos POIs son literalmente el mismo lugar duplicado en OSM. */
  probableDuplicado: boolean;
};

/**
 * Pares de Vueltas que se chapan sin caminar.
 *
 * `radio` es el diámetro efectivo del problema, no el del geofence: dos POIs a
 * 74 m con geofence de 75 m se chapan ambos desde el punto medio, pero también
 * dos a 140 m si el jugador se para justo en el medio. Se usa el geofence tal
 * cual porque el caso que importa —"no me moví"— es el de los muy cercanos, y
 * ensanchar el radio llenaría el informe de pares que sí exigen caminar.
 */
export function paresQueNoObliganACaminar(
  vueltas: VueltaUbicada[],
  radio = GEOFENCE_M
): ParCercano[] {
  const pares: ParCercano[] = [];
  for (let i = 0; i < vueltas.length; i++) {
    for (let j = i + 1; j < vueltas.length; j++) {
      const a = vueltas[i]!;
      const b = vueltas[j]!;
      const m = metrosEntre(a, b);
      if (m >= radio) continue;
      pares.push({
        a: a.titulo,
        b: b.titulo,
        metros: Math.round(m),
        // Mismo nombre a menos de 30 m casi siempre es OSM con la entidad
        // cargada dos veces (pasó en Barranco: un parque duplicado a 67 m).
        probableDuplicado: m < 30,
      });
    }
  }
  return pares.sort((x, y) => x.metros - y.metros);
}

/** Los avisos ya redactados, para imprimir. */
export function avisosDeProximidad(vueltas: VueltaUbicada[], radio = GEOFENCE_M): string[] {
  return paresQueNoObliganACaminar(vueltas, radio).map(
    (p) =>
      `"${p.a}" y "${p.b}" están a ${p.metros} m: con el geofence de ${radio} m se chapan las dos sin caminar` +
      (p.probableDuplicado ? " (¿el mismo lugar duplicado en OSM?)" : "")
  );
}
