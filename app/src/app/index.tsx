import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";

/**
 * Pantalla de bienvenida (provisional — la identidad visual real es fase de
 * diseño, documento maestro §3.4). Su segunda función es validar en vivo la
 * cadena app → Supabase → datos reales: cuenta las celdas de Barranco.
 */
type Estado =
  | { tipo: "cargando" }
  | { tipo: "ok"; celdas: number }
  | { tipo: "error"; mensaje: string };

export default function HomeScreen() {
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });

  useEffect(() => {
    (async () => {
      try {
        const { count, error } = await supabase
          .from("cells")
          .select("*", { count: "exact", head: true });
        if (error) {
          setEstado({ tipo: "error", mensaje: error.message });
        } else {
          setEstado({ tipo: "ok", celdas: count ?? 0 });
        }
      } catch (e) {
        setEstado({ tipo: "error", mensaje: e instanceof Error ? e.message : String(e) });
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.centro}>
        <Text style={styles.marca}>Cuadra</Text>
        <Text style={styles.tagline}>Tu ciudad, cuadra por cuadra.</Text>

        <View style={styles.tarjeta}>
          {estado.tipo === "cargando" && (
            <View style={styles.fila}>
              <ActivityIndicator color="#E8622C" />
              <Text style={styles.estadoTexto}>Conectando con tu ciudad…</Text>
            </View>
          )}
          {estado.tipo === "ok" && (
            <Text style={styles.estadoOk}>
              ✓ {estado.celdas} cuadras de Barranco listas
            </Text>
          )}
          {estado.tipo === "error" && (
            <Text style={styles.estadoError}>No pude conectar:{"\n"}{estado.mensaje}</Text>
          )}
        </View>
      </View>

      <Text style={styles.pie}>MVP en construcción · Lima</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FBF7F0" },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 8 },
  marca: { fontSize: 56, fontWeight: "800", color: "#1F1B16", letterSpacing: -1 },
  tagline: { fontSize: 17, color: "#8A7E6E", marginBottom: 28 },
  tarjeta: {
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFE6D8",
    alignSelf: "stretch",
  },
  fila: { flexDirection: "row", alignItems: "center", gap: 10 },
  estadoTexto: { fontSize: 15, color: "#8A7E6E" },
  estadoOk: { fontSize: 17, fontWeight: "600", color: "#2E7D32", textAlign: "center" },
  estadoError: { fontSize: 13, color: "#C0392B", textAlign: "center" },
  pie: { textAlign: "center", color: "#B8AC9A", fontSize: 13, paddingBottom: 16 },
});
