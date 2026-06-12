/**
 * Cliente Supabase de la app (anon key + RLS: el cliente solo puede lo
 * que las políticas permiten; la escritura de contenido vive en el worker).
 * Patrón oficial de Supabase para React Native: AsyncStorage persiste la
 * sesión y AppState refresca el token mientras la app está en primer plano.
 */
import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copia app/.env.example a app/.env y completa con los valores del proyecto."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresca la sesión automáticamente mientras la app está activa; la detiene
// en segundo plano (patrón recomendado por Supabase para RN).
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
