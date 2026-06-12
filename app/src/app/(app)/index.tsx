import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MapaCuadra } from "@/components/mapa-cuadra";
import { supabase } from "@/lib/supabase";

/**
 * Home: el mapa de tu ciudad a pantalla completa (ADR-0004) con un header
 * flotante. La identidad visual final es fase de diseño (§3.4).
 */
export default function HomeScreen() {
  return (
    <View style={styles.cont}>
      <MapaCuadra />

      <SafeAreaView style={styles.header} edges={["top"]} pointerEvents="box-none">
        <View style={styles.chip}>
          <Text style={styles.marca}>Cuadra</Text>
        </View>
        <Pressable style={styles.chip} onPress={() => supabase.auth.signOut()} hitSlop={8}>
          <Text style={styles.salir}>Salir</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  cont: { flex: 1, backgroundColor: "#FBF7F0" },
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
    shadowColor: "#1F1B16",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  marca: { fontSize: 20, fontWeight: "800", color: "#1F1B16", letterSpacing: -0.5 },
  salir: { fontSize: 14, fontWeight: "600", color: "#E8622C" },
});
