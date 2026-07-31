/**
 * Vista controlada para probar descubrimiento fuera del horario de una zona.
 * Lee Vueltas activas sin el filtro horario/seguridad y permite recorrer una
 * Chapada simulada. La simulación no sube fotos ni escribe en Supabase; una
 * build de producción nunca puede habilitarla aunque la variable quede puesta.
 */
const esDesarrollo =
  typeof __DEV__ === "boolean" ? __DEV__ : process.env.NODE_ENV !== "production";

export const MODO_PRUEBA_VUELTAS =
  esDesarrollo && process.env.EXPO_PUBLIC_CUADRA_MODO_PRUEBA === "on";

export const NOMBRE_ZONA_PRUEBA = "Lima de prueba";
