import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Boton } from "@/components/ui";
import { colores, esc, fuentes } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

/**
 * Revisá tu correo — teléfono 20 del prototipo.
 *
 * Reemplaza el `Alert.alert("Casi listo", …)` que salía tras registrarse. Es
 * una espera con destino, no un aviso: Calato espera en la puerta.
 */
export default function RevisaCorreoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { correo } = useLocalSearchParams<{ correo?: string }>();

  const [reenviando, setReenviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function reenviar() {
    if (!correo || reenviando) return;
    setReenviando(true);
    setAviso(null);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: correo });
      if (error) throw error;
      setAviso("Listo, te lo mandamos de nuevo.");
    } catch {
      setAviso("No pudimos reenviarlo ahora. Probá en un minuto.");
    } finally {
      setReenviando(false);
    }
  }

  return (
    <View style={styles.raiz}>
      {/*
        Mismo hero que la Bienvenida: 300 px MÁS el inset real. Sin eso el
        notch le tapa el mechón a Calato (ADR-0006).
      */}
      <View style={[styles.hero, { height: esc(300) + insets.top, paddingTop: insets.top }]}>
        <Image
          source={require("../../assets/calato/puerta.jpg")}
          style={styles.heroImg}
          contentFit="cover"
          contentPosition={{ left: "50%", top: "42%" }}
          accessibilityLabel="Calato esperando en la puerta"
        />
      </View>

      <View style={styles.cuerpo}>
        <Text style={styles.titulo}>Te mandamos{"\n"}un correo</Text>
        <Text style={styles.parrafo}>
          Ábrelo y confirmá tu cuenta. Después volvés acá y entrás — Calato te espera en la
          puerta.
        </Text>
        {correo ? <Text style={styles.sello}>{correo.toUpperCase()}</Text> : null}
        {aviso ? <Text style={styles.aviso}>{aviso}</Text> : null}
      </View>

      <SafeAreaView edges={["bottom"]} style={styles.pie}>
        <Boton onPress={() => router.replace("/sign-in")}>Ya confirmé, entrar</Boton>
        <Boton variante="linea" onPress={reenviar} deshabilitado={!correo || reenviando}>
          {reenviando ? "Mandando…" : "Reenviar correo"}
        </Boton>
        <Pressable onPress={() => router.replace("/crear-cuenta")} hitSlop={12}>
          <Text style={styles.link}>Cambiar de correo</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.papel },
  hero: { backgroundColor: colores.papel, borderBottomWidth: esc(3), borderBottomColor: colores.tinta, overflow: "hidden" },
  heroImg: { width: "100%", height: "100%" },
  cuerpo: { paddingHorizontal: esc(18), paddingTop: esc(24), gap: esc(12) },
  titulo: {
    fontSize: esc(34),
    lineHeight: esc(36),
    fontFamily: fuentes.display,
    color: colores.tinta,
  },
  parrafo: {
    fontSize: esc(15),
    lineHeight: esc(23),
    fontFamily: fuentes.regular,
    color: colores.textoSuave,
  },
  // El sello punteado del prototipo (`.sello`).
  sello: {
    alignSelf: "flex-start",
    borderWidth: esc(2),
    borderStyle: "dashed",
    borderColor: colores.tinta,
    borderRadius: 999,
    paddingHorizontal: esc(12),
    paddingVertical: esc(5),
    fontSize: esc(10),
    letterSpacing: esc(1),
    fontFamily: fuentes.extrabold,
    color: colores.tinta,
    marginTop: esc(2),
  },
  aviso: {
    fontSize: esc(12),
    lineHeight: esc(17),
    fontFamily: fuentes.bold,
    color: colores.exito,
  },
  pie: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: esc(18),
    paddingBottom: esc(10),
    gap: esc(11),
  },
  link: {
    textAlign: "center",
    fontSize: esc(13),
    fontFamily: fuentes.bold,
    color: colores.textoSuave,
  },
});
