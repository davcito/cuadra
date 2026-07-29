import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { SlideInRight } from "react-native-reanimated";

import { CalatoClip } from "@/components/calato-clip";
import { Boton } from "@/components/ui";
import { colores, esc, fuentes } from "@/lib/theme";

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
        Hero con Calato. El relleno superior es el inset REAL del dispositivo:
        sin él, el notch / isla dinámica le tapa el mechón — uno de los tres
        rasgos innegociables del personaje (ADR-0006).

        El fondo VUELVE A SER NARANJA, como manda el prototipo. Antes era papel
        porque el render estático traía su propio fondo y lo tapaba todo; el
        clip tiene transparencia, así que ahora el naranja se ve de verdad.

        Calato ENTRA desde fuera de cuadro y saluda: la primera pantalla la da
        el personaje, no un formulario.
      */}
      <View style={[styles.hero, { height: esc(300) + insets.top, paddingTop: insets.top }]}>
        <Animated.View
          entering={SlideInRight.springify().damping(15).mass(0.9).delay(160)}
          style={styles.heroCalato}
        >
          <CalatoClip clip="saludo" alto={252} etiqueta="Calato te saluda" />
        </Animated.View>
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
    backgroundColor: colores.naranja, // el del prototipo, ahora que el clip es transparente
    borderBottomWidth: esc(3),
    borderBottomColor: colores.tinta,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  heroCalato: { alignItems: "center", justifyContent: "flex-end" },
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
