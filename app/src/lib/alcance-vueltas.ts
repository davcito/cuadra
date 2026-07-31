import { CUADRA_METROS } from "@/lib/geo";
import type { VueltaCerca } from "@/lib/vueltas-cerca";

/**
 * El alcance amplía el catálogo de forma acumulativa: al abrir el radio nunca
 * desaparece una Vuelta que ya estaba cerca. La UI habla en cuadras; los
 * metros quedan como detalle interno para filtrar sin redondeos ambiguos.
 */
export const ALCANCES_VUELTAS = [
  {
    id: "aca",
    nombre: "Por acá nomás",
    detalle: "Hasta 10 cuadras",
    radioM: 10 * CUADRA_METROS,
  },
  {
    id: "vuelta",
    nombre: "Me doy una vuelta",
    detalle: "Hasta 30 cuadras",
    radioM: 30 * CUADRA_METROS,
  },
  {
    id: "barrio",
    nombre: "Cruzo el barrio",
    detalle: "Hasta 80 cuadras",
    radioM: 80 * CUADRA_METROS,
  },
  {
    id: "lejos",
    nombre: "Hoy me voy lejos",
    detalle: "Toda Lima",
    radioM: null,
  },
] as const;

export type AlcanceVueltas = (typeof ALCANCES_VUELTAS)[number]["id"];

export const ALCANCE_PREDETERMINADO: AlcanceVueltas = "aca";

export function esAlcanceVueltas(valor: unknown): valor is AlcanceVueltas {
  return ALCANCES_VUELTAS.some((alcance) => alcance.id === valor);
}

export function datosAlcance(id: AlcanceVueltas) {
  return ALCANCES_VUELTAS.find((alcance) => alcance.id === id)!;
}

export function filtrarVueltasPorAlcance(
  vueltas: VueltaCerca[],
  alcanceId: AlcanceVueltas
): VueltaCerca[] {
  const alcance = datosAlcance(alcanceId);
  if (alcance.radioM == null) return vueltas;

  return vueltas.filter(
    (vuelta) =>
      typeof vuelta.distancia_m === "number" &&
      Number.isFinite(vuelta.distancia_m) &&
      vuelta.distancia_m >= 0 &&
      vuelta.distancia_m <= alcance.radioM
  );
}

export function siguienteAlcance(id: AlcanceVueltas): AlcanceVueltas | null {
  const indice = ALCANCES_VUELTAS.findIndex((alcance) => alcance.id === id);
  return ALCANCES_VUELTAS[indice + 1]?.id ?? null;
}
