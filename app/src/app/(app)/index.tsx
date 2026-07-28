import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useRouter } from "expo-router";

import { CalatoVivo } from "@/components/calato-vivo";
import { MapaCuadra } from "@/components/mapa-cuadra";
import { Boton, Chip, Dificultad, Etiqueta } from "@/components/ui";
import { colores, fuentes } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type VueltaHoy = {
  id: number;
  titulo: string;
  categoria: string;
  dificultad: number;
  pois: { nombre: string } | null;
};

/**
 * Home: el mapa de tu ciudad a pantalla completa (ADR-0004) con un header
 * flotante. Calato saluda UNA vez al entrar (tarjeta, no flotando sobre el
 * mapa — regla de dosis del ADR-0006) y la salida la tapa la cortina.
 */
export default function HomeScreen() {
  const router = useRouter();
  const [saludo, setSaludo] = useState(true);
  const [vuelta, setVuelta] = useState<VueltaHoy | null>(null);

  // El saludo es un momento, no un mueble: se va solo a los 5 s.
  useEffect(() => {
    const t = setTimeout(() => setSaludo(false), 5200);
    return () => clearTimeout(t);
  }, []);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("missions")
      .select("id, titulo, categoria, dificultad, pois(nombre)")
      .eq("estado", "activa")
      .limit(1)
      .maybeSingle();
    setVuelta((data as unknown as VueltaHoy) ?? null);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <View style={styles.cont}>
      <MapaCuadra />

      <SafeAreaView style={styles.header} edges={["top"]} pointerEvents="box-none">
        <View style={styles.chip}>
          <Text style={styles.marca}>Cuadra</Text>
        </View>
        <View style={[styles.chip, styles.chipRacha]}>
          <View style={styles.llama} />
          <Text style={styles.rachaTexto}>0</Text>
        </View>
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
      ) : vuelta ? (
        <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.saludo}>
          <View style={styles.tarjetaVuelta}>
            <View style={styles.vueltaTop}>
              <Chip fondo={colores.naranja} color={colores.tinta}>
                VUELTA DE HOY
              </Chip>
              <Dificultad nivel={vuelta.dificultad} />
            </View>
            <Text style={styles.vueltaTitulo}>{vuelta.titulo}</Text>
            <Etiqueta>{vuelta.pois?.nombre ?? "Barranco"}</Etiqueta>
            <Boton
              style={{ marginTop: 6 }}
              onPress={() =>
                router.push({ pathname: "/vuelta/[id]", params: { id: String(vuelta.id) } })
              }
            >
              Llévame
            </Boton>
          </View>
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
  marca: { fontSize: 20, fontFamily: fuentes.extrabold, color: colores.tinta, letterSpacing: -0.5 },
  chipRacha: {
    backgroundColor: colores.tinta,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
  },
  llama: {
    width: 11,
    height: 13,
    backgroundColor: colores.naranja,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  rachaTexto: { fontSize: 13, fontFamily: fuentes.extrabold, color: colores.papel },
  saludo: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 92, // sobre la barra de pestañas
  },
  tarjetaVuelta: {
    backgroundColor: colores.papel,
    borderWidth: 2,
    borderColor: colores.tinta,
    borderRadius: 18,
    padding: 15,
    gap: 6,
    shadowColor: colores.tinta,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 3 },
    elevation: 5,
  },
  vueltaTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  vueltaTitulo: { fontSize: 16, fontFamily: fuentes.extrabold, color: colores.tinta },
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
  saludoTitulo: { fontSize: 15, fontFamily: fuentes.extrabold, color: colores.tinta },
  saludoDetalle: { fontSize: 12, color: colores.textoSuave },
});
