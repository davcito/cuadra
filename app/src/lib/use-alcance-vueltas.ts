import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import {
  ALCANCE_PREDETERMINADO,
  esAlcanceVueltas,
  type AlcanceVueltas,
} from "@/lib/alcance-vueltas";

const CLAVE = "cuadra:alcance-vueltas:v1";

/** Preferencia local compartida por el Mapa y la pestaña Vueltas. */
export function useAlcanceVueltas() {
  const [alcance, setAlcance] = useState<AlcanceVueltas>(ALCANCE_PREDETERMINADO);

  useEffect(() => {
    let activo = true;
    void AsyncStorage.getItem(CLAVE)
      .then((guardado) => {
        if (activo && esAlcanceVueltas(guardado)) setAlcance(guardado);
      })
      .catch(() => {
        // La preferencia es una comodidad; si el storage falla, manda el default.
      });
    return () => {
      activo = false;
    };
  }, []);

  const cambiarAlcance = useCallback((nuevo: AlcanceVueltas) => {
    setAlcance(nuevo);
    void AsyncStorage.setItem(CLAVE, nuevo).catch(() => {
      // No se bloquea la exploración por no poder recordar un filtro.
    });
  }, []);

  return { alcance, cambiarAlcance };
}
