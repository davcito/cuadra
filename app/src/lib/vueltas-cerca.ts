import type { Coordenada } from "@/lib/geo";
import { haversineMetros } from "@/lib/geo";
import { MODO_PRUEBA_VUELTAS } from "@/lib/modo-prueba";
import { supabase } from "@/lib/supabase";

export type VueltaCerca = {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: string;
  dificultad: number;
  calle_xp: number;
  instruccion_verificacion: string | null;
  poi_nombre: string | null;
  lat: number | null;
  lng: number | null;
  distancia_m: number | null;
  vista_prueba?: boolean;
};

type FilaPrueba = Omit<VueltaCerca, "poi_nombre" | "lat" | "lng" | "distancia_m"> & {
  pois: { nombre: string; lat: number; lng: number } | null;
};

/**
 * Fuente única de descubrimiento para Mapa y Vueltas.
 *
 * Normal: usa la RPC jugable, con horario y modo seguro server-side.
 * Prueba local: lee todas las Vueltas activas de celdas encendidas sin aplicar
 * horario ni nivel de seguridad. Así se pueden probar los cuatro alcances con
 * Morales Duárez cerca y Barranco lejos. La cámara propaga el modo y `chapar()`
 * devuelve un resultado local sin subir la foto ni escribir completaciones.
 */
export async function buscarVueltasDisponibles(
  donde: Coordenada,
  limite: number
): Promise<VueltaCerca[]> {
  if (MODO_PRUEBA_VUELTAS) {
    const { data, error } = await supabase
      .from("missions")
      .select(
        "id, titulo, descripcion, categoria, dificultad, calle_xp, instruccion_verificacion, pois!inner(nombre, lat, lng), cells!inner(distrito, activa, nivel_seguridad)"
      )
      .eq("estado", "activa")
      .eq("cells.activa", true);

    if (error) throw error;

    return ((data ?? []) as unknown as FilaPrueba[])
      .filter((v) => typeof v.pois?.lat === "number" && typeof v.pois?.lng === "number")
      .map((v) => ({
        ...v,
        poi_nombre: v.pois?.nombre ?? null,
        lat: v.pois?.lat ?? null,
        lng: v.pois?.lng ?? null,
        distancia_m: haversineMetros(donde, {
          lat: v.pois!.lat,
          lng: v.pois!.lng,
        }),
        vista_prueba: true,
      }))
      .sort((a, b) => (a.distancia_m ?? Infinity) - (b.distancia_m ?? Infinity))
      .slice(0, Math.max(1, limite));
  }

  const { data, error } = await supabase.rpc("vueltas_cerca", {
    p_lat: donde.lat,
    p_lng: donde.lng,
    p_limite: limite,
  });
  if (error) throw error;

  return (data ?? []) as VueltaCerca[];
}
