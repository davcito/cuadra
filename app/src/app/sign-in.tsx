import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";

type Modo = "entrar" | "crear";

export default function SignInScreen() {
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);

  const puedeEnviar = email.includes("@") && password.length >= 6 && !cargando;

  async function enviar() {
    setCargando(true);
    try {
      if (modo === "crear") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Si el proyecto exige confirmar correo, no hay sesión todavía.
        if (!data.session) {
          Alert.alert(
            "Casi listo",
            "Te mandamos un correo para confirmar tu cuenta. Ábrelo y vuelve a entrar."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      // Con sesión activa, el guard del layout te lleva solo a la home.
    } catch (e) {
      Alert.alert("Ups", e instanceof Error ? e.message : "Algo salió mal, intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  function entrarConGoogle() {
    Alert.alert(
      "Pronto",
      "Entrar con Google estará disponible en breve. Por ahora usa tu correo."
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.contenido}>
          <View style={styles.encabezado}>
            <Text style={styles.marca}>Cuadra</Text>
            <Text style={styles.bienvenida}>Bienvenido a la cuadra.</Text>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="tu correo"
              placeholderTextColor="#B8AC9A"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
            />
            <TextInput
              style={styles.input}
              placeholder="tu contraseña"
              placeholderTextColor="#B8AC9A"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Pressable
              style={[styles.boton, !puedeEnviar && styles.botonOff]}
              onPress={enviar}
              disabled={!puedeEnviar}
            >
              {cargando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.botonTexto}>
                  {modo === "entrar" ? "Entrar" : "Crear cuenta"}
                </Text>
              )}
            </Pressable>

            <Pressable style={styles.botonGoogle} onPress={entrarConGoogle}>
              <Text style={styles.botonGoogleTexto}>Continuar con Google</Text>
            </Pressable>

            <Pressable
              onPress={() => setModo(modo === "entrar" ? "crear" : "entrar")}
              hitSlop={12}
            >
              <Text style={styles.toggle}>
                {modo === "entrar"
                  ? "¿Primera vez? Crea tu cuenta"
                  : "¿Ya tienes cuenta? Entra"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FBF7F0" },
  flex: { flex: 1 },
  contenido: { flex: 1, justifyContent: "center", paddingHorizontal: 28, gap: 36 },
  encabezado: { alignItems: "center", gap: 6 },
  marca: { fontSize: 48, fontWeight: "800", color: "#1F1B16", letterSpacing: -1 },
  bienvenida: { fontSize: 17, color: "#8A7E6E" },
  form: { gap: 14 },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFE6D8",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    color: "#1F1B16",
  },
  boton: {
    backgroundColor: "#E8622C",
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 4,
  },
  botonOff: { backgroundColor: "#E8C3B0" },
  botonTexto: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  botonGoogle: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EFE6D8",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  botonGoogleTexto: { color: "#1F1B16", fontSize: 15, fontWeight: "600" },
  toggle: { textAlign: "center", color: "#E8622C", fontSize: 15, marginTop: 8 },
});
