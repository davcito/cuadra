import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";

import { Boton, Tarjeta } from "@/components/ui";
import { colores, esc, fuentes, radios } from "@/lib/theme";

/**
 * Permisos — pantalla 3 del prototipo (onboarding 3/3).
 * Explica ANTES de pedir: el prompt del sistema llega recién cuando el
 * usuario entendió para qué sirve cada permiso.
 *
 * La cámara se pide en su momento (al chapar), no acá: pedir dos permisos
 * de golpe dispara más rechazos. Acá se explica; se solicita en E2.
 */
export default function PermisosScreen() {
  const router = useRouter();
  const [pidiendo, setPidiendo] = useState(false);

  async function permitir() {
    setPidiendo(true);
    try {
      await Location.requestForegroundPermissionsAsync();
    } finally {
      setPidiendo(false);
      router.replace("/sign-in");
    }
  }

  return (
    <View style={styles.raiz}>
      <SafeAreaView edges={["top"]} style={styles.cuerpo}>
        <Text style={styles.titulo}>Para jugar necesito{"\n"}dos permisos</Text>

        <Tarjeta>
          <View style={styles.fila}>
            <View style={[styles.icono, { backgroundColor: colores.naranja }]}>
              <View style={styles.iconoUbicacion} />
            </View>
            <View style={styles.filaTextos}>
              <Text style={styles.filaTitulo}>Tu ubicación</Text>
              <Text style={styles.filaMeta}>
                Para saber qué tenés a pocas cuadras y confirmar que llegaste.
              </Text>
            </View>
          </View>
        </Tarjeta>

        <Tarjeta>
          <View style={styles.fila}>
            <View style={[styles.icono, { backgroundColor: colores.categorias.caletas }]}>
              <View style={styles.iconoCamara} />
            </View>
            <View style={styles.filaTextos}>
              <Text style={styles.filaTitulo}>La cámara</Text>
              <Text style={styles.filaMeta}>
                La foto se toma en el momento, en el lugar. No se sube de la galería.
              </Text>
            </View>
          </View>
        </Tarjeta>

        <View style={styles.privacidad}>
          <Text style={styles.privacidadTexto}>
            Nunca vas a ver tu ubicación publicada. Se usa para las Vueltas y nada más.
          </Text>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={["bottom"]} style={styles.pie}>
        <Boton onPress={permitir} deshabilitado={pidiendo}>
          {pidiendo ? "Pidiendo…" : "Dale, permitir"}
        </Boton>
        <Pressable onPress={() => router.replace("/sign-in")} hitSlop={12}>
          <Text style={styles.link}>Ahora no</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.papel },
  cuerpo: { paddingHorizontal: esc(22), paddingTop: esc(46), gap: esc(16) },
  titulo: {
    fontSize: esc(28),
    lineHeight: esc(32),
    fontFamily: fuentes.display,
    color: colores.tinta,
  },
  fila: { flexDirection: "row", gap: esc(13), alignItems: "flex-start", padding: esc(16) },
  icono: {
    width: esc(38),
    height: esc(38),
    borderRadius: esc(11),
    borderWidth: esc(2),
    borderColor: colores.tinta,
    alignItems: "center",
    justifyContent: "center",
  },
  iconoUbicacion: {
    width: esc(13),
    height: esc(13),
    borderWidth: esc(3),
    borderColor: colores.tinta,
    borderRadius: esc(4),
  },
  iconoCamara: {
    width: esc(15),
    height: esc(12),
    borderWidth: esc(3),
    borderColor: colores.papel,
    borderRadius: esc(3),
  },
  filaTextos: { flex: 1, gap: esc(3) },
  filaTitulo: { fontSize: esc(15), fontFamily: fuentes.extrabold, color: colores.tinta },
  filaMeta: {
    fontSize: esc(12),
    lineHeight: esc(17),
    fontFamily: fuentes.regular,
    color: colores.textoSuave,
  },
  privacidad: {
    borderWidth: esc(2),
    borderStyle: "dashed",
    borderColor: "#C9BCA3",
    borderRadius: radios.boton,
    paddingHorizontal: esc(14),
    paddingVertical: esc(12),
  },
  privacidadTexto: {
    fontSize: esc(11),
    lineHeight: esc(16),
    fontFamily: fuentes.regular,
    color: colores.textoSuave,
  },
  pie: { position: "absolute", left: esc(22), right: esc(22), bottom: esc(26), gap: esc(11) },
  link: {
    textAlign: "center",
    fontSize: esc(13),
    fontFamily: fuentes.bold,
    color: colores.textoSuave,
  },
});
