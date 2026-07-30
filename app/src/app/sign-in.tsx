import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useCalato } from "@/components/calato-cortina";
import { CalatoVivo } from "@/components/calato-vivo";
import { Boton, Campo, Isotipo, Tarjeta, Toldo } from "@/components/ui";
import { colores, esc, fuentes } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

/**
 * Entrar / Crear cuenta — pantalla 2 del prototipo.
 * Paridad exigida (E0): toldo, isotipo + wordmark CUADRA, tagline de marca,
 * campos con etiqueta, botón primario con sombra dura y secundario ghost,
 * y la tarjeta de Calato al pie. Todo sale del kit: acá no se dibuja UI a mano.
 */
export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const { cortina } = useCalato();

  const puedeEnviar = email.includes("@") && password.length >= 6 && !cargando;

  async function entrar() {
    if (!puedeEnviar) return;
    setCargando(true);
    try {
      // La cortina cubre ANTES de autenticar: el salto sign-in → home
      // (guard del layout) ocurre tapado por Calato.
      void cortina("Bienvenido a la cuadra");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "Algo salió mal, intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  // "Crear cuenta" ya NO registra con este formulario: el registro tiene su
  // pantalla (teléfono 19), que además pide el NOMBRE. Sin él los perfiles
  // quedaban llamados `user_ce0339eb`.

  return (
    <View style={styles.raiz}>
      <SafeAreaView edges={["top"]}>
        <Toldo style={styles.toldo} />
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.encabezado}>
            <View style={styles.marcaFila}>
              <Isotipo size={esc(42)} />
              <Text style={styles.marca}>CUADRA</Text>
            </View>
            <Text style={styles.tagline}>Tu ciudad, cuadra por cuadra.</Text>
          </View>

          <View style={styles.form}>
            <Campo
              etiqueta="CORREO"
              placeholder="tu@correo.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
            />
            <Campo
              etiqueta="CONTRASEÑA"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.botones}>
              {cargando ? (
                <View style={styles.cargando}>
                  <ActivityIndicator color={colores.naranja} />
                </View>
              ) : (
                <Boton onPress={entrar} deshabilitado={!puedeEnviar}>
                  Entrar
                </Boton>
              )}
              <Boton variante="linea" onPress={() => router.push("/crear-cuenta")}>
                Crear cuenta
              </Boton>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SafeAreaView edges={["bottom"]} style={styles.pie}>
        <Tarjeta fondo="#FFFFFF">
          <View style={styles.avisoFila}>
            <CalatoVivo estado="atento" size={esc(40)} />
            <Text style={styles.avisoTexto}>
              Tu Álbum se guarda en tu cuenta. Sin correo, las figuritas se te pierden.
            </Text>
          </View>
        </Tarjeta>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.papel },
  flex: { flex: 1 },
  toldo: { marginTop: esc(8) },
  // Contenido alineado ARRIBA (no centrado): así lo fija el prototipo.
  scroll: { paddingHorizontal: esc(22), paddingTop: esc(26), paddingBottom: esc(20), gap: esc(34) },
  encabezado: { gap: esc(7) },
  marcaFila: { flexDirection: "row", alignItems: "center", gap: esc(11) },
  marca: { fontSize: esc(38), lineHeight: esc(46), fontFamily: fuentes.display, color: colores.tinta },
  tagline: { fontSize: esc(15), fontFamily: fuentes.bold, color: colores.naranja },
  form: { gap: esc(11) },
  botones: { gap: esc(11), marginTop: esc(16) },
  cargando: {
    minHeight: esc(52),
    alignItems: "center",
    justifyContent: "center",
  },
  pie: { paddingHorizontal: esc(22), paddingBottom: esc(12) },
  avisoFila: { flexDirection: "row", alignItems: "center", gap: esc(11), padding: esc(13) },
  avisoTexto: {
    flex: 1,
    fontSize: esc(12),
    lineHeight: esc(17),
    fontFamily: fuentes.regular,
    color: colores.textoSuave,
  },
});
