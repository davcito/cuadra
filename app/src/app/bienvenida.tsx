import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { Boton } from "@/components/ui";
import { colores, fuentes } from "@/lib/theme";

/**
 * Bienvenida — pantalla 1 del prototipo (onboarding 1/3).
 * "La primera pantalla la da Calato, no un formulario: la promesa antes
 * del trámite." Por eso es la ruta inicial cuando no hay sesión.
 */
export default function BienvenidaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.raiz}>
      {/*
        Hero de 300 px con Calato. El relleno superior es el inset REAL del
        dispositivo: sin él, el notch / isla dinámica le tapa el mechón —
        que es uno de los tres rasgos innegociables del personaje (ADR-0006).
        El fondo va en papel (no naranja) porque el render ya trae su fondo
        papel: así la zona del notch continúa la imagen sin costura.
      */}
      <View style={[styles.hero, { height: 300 + insets.top, paddingTop: insets.top }]}>
        <Image
          source={require("../../assets/calato/base.jpg")}
          style={styles.heroImg}
          contentFit="cover"
          // Encuadre del prototipo: object-position center 42%
          contentPosition={{ left: "50%", top: "42%" }}
          accessibilityLabel="Calato saludando"
        />
      </View>

      <View style={styles.cuerpo}>
        <Text style={styles.titulo}>Bienvenido{"\n"}a la cuadra</Text>
        <Text style={styles.parrafo}>
          Tu ciudad está llena de huariques, caletas y huacas que nunca viste. Cada día te
          dejo tres a la vuelta de la esquina.
        </Text>

        {/* Paginador 1 de 3 */}
        <View style={styles.puntos}>
          <View style={[styles.punto, styles.puntoOn]} />
          <View style={styles.punto} />
          <View style={styles.punto} />
        </View>
      </View>

      <SafeAreaView edges={["bottom"]} style={styles.pie}>
        <Boton onPress={() => router.push("/permisos")}>Date una vuelta</Boton>
        <Pressable onPress={() => router.push("/sign-in")} hitSlop={12}>
          <Text style={styles.link}>Ya tengo cuenta</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.papel },
  hero: {
    backgroundColor: colores.papel, // continúa el fondo propio del render
    borderBottomWidth: 3,
    borderBottomColor: colores.tinta,
    overflow: "hidden",
  },
  heroImg: { width: "100%", height: "100%" },
  cuerpo: { paddingHorizontal: 22, paddingTop: 24, gap: 12 },
  titulo: {
    fontSize: 34,
    lineHeight: 38,
    fontFamily: fuentes.display,
    color: colores.tinta,
  },
  parrafo: {
    fontSize: 15,
    lineHeight: 23,
    fontFamily: fuentes.regular,
    color: colores.textoSuave,
  },
  puntos: { flexDirection: "row", gap: 6, marginTop: 6 },
  punto: { width: 9, height: 5, borderRadius: 9, backgroundColor: "#D8CBB4" },
  puntoOn: { width: 22, backgroundColor: colores.tinta },
  pie: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 26,
    gap: 11,
  },
  link: {
    textAlign: "center",
    fontSize: 13,
    fontFamily: fuentes.bold,
    color: colores.textoSuave,
  },
});
