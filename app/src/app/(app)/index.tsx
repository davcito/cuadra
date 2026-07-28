import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";

import { useCalato } from "@/components/calato-cortina";
import { CalatoVivo } from "@/components/calato-vivo";
import { MapaCuadra } from "@/components/mapa-cuadra";
import { colores } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

/**
 * Home: el mapa de tu ciudad a pantalla completa (ADR-0004) con un header
 * flotante. Calato saluda UNA vez al entrar (tarjeta, no flotando sobre el
 * mapa — regla de dosis del ADR-0006) y la salida la tapa la cortina.
 */
export default function HomeScreen() {
  const { cortina } = useCalato();
  const [saludo, setSaludo] = useState(true);

  // El saludo es un momento, no un mueble: se va solo a los 5 s.
  useEffect(() => {
    const t = setTimeout(() => setSaludo(false), 5200);
    return () => clearTimeout(t);
  }, []);

  async function salir() {
    await cortina("Hasta mañana"); // resuelve con la pantalla cubierta
    supabase.auth.signOut();
  }

  return (
    <View style={styles.cont}>
      <MapaCuadra />

      <SafeAreaView style={styles.header} edges={["top"]} pointerEvents="box-none">
        <View style={styles.chip}>
          <Text style={styles.marca}>Cuadra</Text>
        </View>
        <Pressable style={styles.chip} onPress={salir} hitSlop={8}>
          <Text style={styles.salir}>Salir</Text>
        </Pressable>
      </SafeAreaView>

      {saludo ? (
        <Animated.View
          entering={FadeInDown.springify().damping(14)}
          exiting={FadeOutDown.duration(260)}
          style={styles.saludo}
        >
          <Pressable style={styles.saludoFila} onPress={() => setSaludo(false)}>
            <CalatoVivo estado="tranqui" size={52} />
            <View style={styles.saludoTextos}>
              <Text style={styles.saludoTitulo}>Bienvenido a la cuadra</Text>
              <Text style={styles.saludoDetalle}>
                Calato ya olfateó vueltas nuevas por acá.
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cont: { flex: 1, backgroundColor: colores.papel },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  chip: {
    backgroundColor: "rgba(251,247,240,0.92)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
    shadowColor: colores.tinta,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  marca: { fontSize: 20, fontWeight: "800", color: colores.tinta, letterSpacing: -0.5 },
  salir: { fontSize: 14, fontWeight: "600", color: colores.naranja },
  saludo: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 28,
  },
  saludoFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: colores.papel,
    borderWidth: 2,
    borderColor: colores.tinta,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: colores.tinta,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 3 },
    elevation: 5,
  },
  saludoTextos: { flex: 1, gap: 2 },
  saludoTitulo: { fontSize: 15, fontWeight: "800", color: colores.tinta },
  saludoDetalle: { fontSize: 12, color: colores.textoSuave },
});
