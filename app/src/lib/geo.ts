/**
 * Geometría propia de Cuadra (documento maestro §7.7).
 * Doble uso a propósito: el radar (distancia + flecha) y la capa 4 del
 * anti-fraude (velocidad imposible) comparten esta misma matemática.
 * Sin dependencias: puro TypeScript testeable.
 */

export type Coordenada = { lat: number; lng: number };

/** Radio medio terrestre en metros. */
const RADIO_TIERRA_M = 6_371_000;

/** Largo de una cuadra limeña en metros — la unidad de distancia de TODA la UI (§3.1). */
export const CUADRA_METROS = 100;

const aRadianes = (grados: number) => (grados * Math.PI) / 180;

/** Distancia en metros entre dos coordenadas (fórmula de haversine). */
export function haversineMetros(a: Coordenada, b: Coordenada): number {
  const dLat = aRadianes(b.lat - a.lat);
  const dLng = aRadianes(b.lng - a.lng);
  const lat1 = aRadianes(a.lat);
  const lat2 = aRadianes(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(h));
}

/**
 * Rumbo inicial en grados [0, 360) desde `desde` hacia `hasta`.
 * 0 = norte, 90 = este. La flecha del radar = bearing − heading del
 * magnetómetro del teléfono.
 */
export function bearingGrados(desde: Coordenada, hasta: Coordenada): number {
  const lat1 = aRadianes(desde.lat);
  const lat2 = aRadianes(hasta.lat);
  const dLng = aRadianes(hasta.lng - desde.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const grados = (Math.atan2(y, x) * 180) / Math.PI;
  return (grados + 360) % 360;
}

/** Metros → cuadras (número crudo; la UI decide el redondeo del copy). */
export function metrosACuadras(metros: number): number {
  return metros / CUADRA_METROS;
}

/**
 * Copy de distancia con la voz de la marca: en cuadras, nunca en km.
 * "a media cuadra", "a 1 cuadra", "a 23 cuadras".
 */
export function textoCuadras(metros: number): string {
  const cuadras = metrosACuadras(metros);
  if (cuadras < 0.75) return "a media cuadra";
  const enteras = Math.round(cuadras);
  return enteras === 1 ? "a 1 cuadra" : `a ${enteras} cuadras`;
}

/**
 * Velocidad media en m/s entre dos check-ins (anti-fraude capa 4).
 * El umbral lo define quien llama (worker / RPC), no esta función.
 */
export function velocidadMs(
  a: Coordenada,
  b: Coordenada,
  msEntreChecks: number
): number {
  if (msEntreChecks <= 0) return Number.POSITIVE_INFINITY;
  return haversineMetros(a, b) / (msEntreChecks / 1000);
}
