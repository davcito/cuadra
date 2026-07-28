import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
// Import por subruta, NO desde la raíz del paquete: importar de
// "@expo-google-fonts/archivo" arrastra las 18 variantes (~2,3 MB) al bundle
// porque su index re-exporta todas con require(). Así entran solo estas 6.
import { AlfaSlabOne_400Regular } from "@expo-google-fonts/alfa-slab-one/400Regular";
import { Archivo_400Regular } from "@expo-google-fonts/archivo/400Regular";
import { Archivo_500Medium } from "@expo-google-fonts/archivo/500Medium";
import { Archivo_600SemiBold } from "@expo-google-fonts/archivo/600SemiBold";
import { Archivo_700Bold } from "@expo-google-fonts/archivo/700Bold";
import { Archivo_800ExtraBold } from "@expo-google-fonts/archivo/800ExtraBold";

import { CalatoProvider } from "@/components/calato-cortina";
import { SessionProvider, useSession } from "@/lib/auth";

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, isLoading } = useSession();

  // Alfa Slab One para titulares, Archivo (5 pesos) para la UI — guía §03.
  // En RN cada peso es una familia propia: fontWeight no aplica a fuentes propias.
  const [fuentesListas] = useFonts({
    AlfaSlabOne_400Regular,
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
  });

  const cargando = isLoading || !fuentesListas;

  useEffect(() => {
    if (!cargando) SplashScreen.hideAsync();
  }, [cargando]);

  // Splash visible hasta tener sesión resuelta Y fuentes cargadas: así la app
  // nunca se ve un instante con la tipografía del sistema.
  if (cargando) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SessionProvider>
        <CalatoProvider>
          <RootNavigator />
        </CalatoProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
