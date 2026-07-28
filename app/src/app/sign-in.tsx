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

import { useCalato } from "@/components/calato-cortina";
import { CalatoVivo } from "@/components/calato-vivo";
import { Boton, Campo, Isotipo, Tarjeta, Toldo } from "@/components/ui";
import { colores, fuentes } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

/**
 * Entrar / Crear cuenta — pantalla 2 del prototipo.
 * Paridad exigida (E0): toldo, isotipo + wordmark CUADRA, tagline de marca,
 * campos con etiqueta, botón primario con sombra dura y secundario ghost,
 * y la tarjeta de Calato al pie. Todo sale del kit: acá no se dibuja UI a mano.
 */
export default function SignInScreen() {
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

  async function crear() {
    if (!puedeEnviar) return;
    setCargando(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (!data.session) {
        Alert.alert(
          "Casi listo",
          "Te mandamos un correo para confirmar tu cuenta. Ábrelo y vuelve a entrar."
        );
      } else {
        void cortina("Bienvenido a la cuadra");
      }
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "Algo salió mal, intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

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
              <Isotipo size={42} />
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
              <Boton variante="linea" onPress={crear} deshabilitado={!puedeEnviar}>
                Crear cuenta
              </Boton>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SafeAreaView edges={["bottom"]} style={styles.pie}>
        <Tarjeta fondo="#FFFFFF">
          <View style={styles.avisoFila}>
            <CalatoVivo estado="atento" size={40} />
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
  toldo: { marginTop: 8 },
  // Contenido alineado ARRIBA (no centrado): así lo fija el prototipo.
  scroll: { paddingHorizontal: 22, paddingTop: 26, paddingBottom: 20, gap: 34 },
  encabezado: { gap: 7 },
  marcaFila: { flexDirection: "row", alignItems: "center", gap: 11 },
  marca: { fontSize: 38, lineHeight: 46, fontFamily: fuentes.display, color: colores.tinta },
  tagline: { fontSize: 15, fontFamily: fuentes.bold, color: colores.naranja },
  form: { gap: 11 },
  botones: { gap: 11, marginTop: 16 },
  cargando: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  pie: { paddingHorizontal: 22, paddingBottom: 12 },
  avisoFila: { flexDirection: "row", alignItems: "center", gap: 11, padding: 13 },
  avisoTexto: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fuentes.regular,
    color: colores.textoSuave,
  },
});
