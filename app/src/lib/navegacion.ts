import type { Coordenada } from "@/lib/geo";

/**
 * URL para caminar hasta un POI usando el navegador instalado en el equipo.
 *
 * No embebe otro SDK de mapas: Cuadra conserva MapLibre + OpenFreeMap. En iOS
 * se abre Apple Maps; Android resuelve el esquema `geo:` con la app que el
 * usuario haya elegido; web cae en OpenStreetMap.
 */
export function urlParaLlegar(
  destino: Coordenada,
  nombre: string,
  plataforma: string
): string {
  const punto = `${destino.lat},${destino.lng}`;
  const rotulo = encodeURIComponent(nombre);

  if (plataforma === "ios") {
    return `http://maps.apple.com/?daddr=${punto}&dirflg=w&q=${rotulo}`;
  }
  if (plataforma === "android") {
    return `geo:${punto}?q=${punto}(${rotulo})`;
  }
  return `https://www.openstreetmap.org/?mlat=${destino.lat}&mlon=${destino.lng}#map=18/${destino.lat}/${destino.lng}`;
}
