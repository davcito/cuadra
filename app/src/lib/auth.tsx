/**
 * Contexto de sesión de Cuadra. Supabase ya persiste la sesión en
 * AsyncStorage; este provider solo la expone a la UI y al guard de rutas
 * (expo-router Stack.Protected). Una sola fuente de verdad: supabase.auth.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "./supabase";

type AuthValue = { session: Session | null; isLoading: boolean };

const AuthContext = createContext<AuthValue>({ session: null, isLoading: true });

export function useSession(): AuthValue {
  return useContext(AuthContext);
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Estado inicial (lee la sesión persistida si existe).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    // Cambios en vivo: login, logout, refresh de token.
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
