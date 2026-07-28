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

import { useCalato } from "@/components/calato-cortina";
import { CalatoVivo } from "@/components/calato-vivo";
import { supabase } from "@/lib/supabase";
import { colores, fuentes, radios } from "@/lib/theme";

type Modo = "entrar" | "crear";

export default function SignInScreen() {
  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const { cortina } = useCalato();

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
        // La cortina cubre la pantalla ANTES de autenticar: el cambio
        // sign-in → home (guard del layout) ocurre tapado por Calato.
        void cortina("Bienvenido a la cuadra");
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

          <View style={styles.avisoCalato}>
            <CalatoVivo estado="tranqui" size={46} />
            <Text style={styles.avisoTexto}>
              Tu Álbum se guarda en tu cuenta. Sin correo, las figuritas se te pierden.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colores.papel },
  flex: { flex: 1 },
  contenido: { flex: 1, justifyContent: "center", paddingHorizontal: 28, gap: 36 },
  encabezado: { alignItems: "center", gap: 6 },
  // La marca en display (Alfa Slab One): es el único lugar donde grita.
  marca: { fontSize: 52, lineHeight: 60, fontFamily: fuentes.display, color: colores.tinta },
  bienvenida: { fontSize: 16, fontFamily: fuentes.medium, color: colores.naranja },
  form: { gap: 14 },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: colores.tinta,
    borderRadius: radios.campo,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    fontFamily: fuentes.regular,
    color: colores.tinta,
  },
  boton: {
    backgroundColor: colores.naranja,
    borderWidth: 2,
    borderColor: colores.tinta,
    borderRadius: radios.boton,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
    minHeight: 52,
    justifyContent: "center",
  },
  botonOff: { backgroundColor: "#E2D6BF", borderColor: "#C9BCA3" },
  // Texto TINTA sobre naranja, nunca blanco (guía §06: el blanco falla AA).
  botonTexto: { color: colores.tinta, fontSize: 16, fontFamily: fuentes.extrabold },
  botonGoogle: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colores.tinta,
    borderRadius: radios.boton,
    paddingVertical: 15,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  botonGoogleTexto: { color: colores.tinta, fontSize: 15, fontFamily: fuentes.bold },
  toggle: {
    textAlign: "center",
    color: colores.naranja,
    fontSize: 14,
    fontFamily: fuentes.bold,
    marginTop: 8,
  },
  avisoCalato: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#1F1B16",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  avisoTexto: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fuentes.regular,
    color: colores.textoSuave,
  },
});
