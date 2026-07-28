import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { CalatoVivo } from "@/components/calato-vivo";
import { Boton, Campo, Casilla, Isotipo, Tarjeta, Toldo } from "@/components/ui";
import { colores, esc, fuentes } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

/**
 * Crear cuenta — teléfono 19 del prototipo.
 *
 * Antes esta pantalla NO existía: el botón "Crear cuenta" del login llamaba a
 * `signUp` con el mismo formulario, sin nombre, sin confirmación y sin términos.
 * Por eso los perfiles quedaban llamados `user_ce0339eb` — el provisional que
 * la migración inicial deja anotado como "el onboarding pide el definitivo".
 *
 * El nombre viaja en `options.data.username`: el trigger `handle_new_user` ya
 * lo lee de `raw_user_meta_data`, así que no hace falta migración.
 */

const MIN_CLAVE = 6;
const MIN_NOMBRE = 3;
const MAX_NOMBRE = 20; // el `check` de profiles.username

/** Los errores de Supabase vienen en inglés y crudos: acá se vuelven de marca. */
function traducirError(mensaje: string): { campo: "nombre" | "correo" | "clave"; texto: string } {
  const m = mensaje.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered")) {
    return { campo: "correo", texto: "Ese correo ya tiene cuenta. ¿Querés entrar?" };
  }
  if (m.includes("valid email") || m.includes("invalid email")) {
    return { campo: "correo", texto: "Ese correo no parece completo." };
  }
  if (m.includes("password")) {
    return { campo: "clave", texto: `La contraseña necesita al menos ${MIN_CLAVE} caracteres.` };
  }
  if (m.includes("username") || m.includes("duplicate") || m.includes("profiles")) {
    return { campo: "nombre", texto: "Ese nombre ya está tomado. Probá con otro." };
  }
  return { campo: "correo", texto: "No pudimos crear la cuenta. Intentá de nuevo." };
}

export default function CrearCuentaScreen() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [terminos, setTerminos] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errores, setErrores] = useState<{ nombre?: string; correo?: string; clave?: string }>({});

  const nombreOk = nombre.trim().length >= MIN_NOMBRE && nombre.trim().length <= MAX_NOMBRE;
  const correoOk = /\S+@\S+\.\S+/.test(correo.trim());
  const claveOk = clave.length >= MIN_CLAVE;
  const puedeEnviar = nombreOk && correoOk && claveOk && terminos && !cargando;

  // La ayuda se convierte en error sin popup: el usuario ve POR QUÉ el botón
  // está apagado, en el campo, mientras escribe (prototipo, teléfono 21).
  const faltan = MIN_CLAVE - clave.length;
  const errorClave =
    errores.clave ?? (clave.length > 0 && !claveOk ? `Te falta${faltan > 1 ? "n" : ""} ${faltan} caracter${faltan > 1 ? "es" : ""}.` : undefined);
  const errorNombre =
    errores.nombre ??
    (nombre.length > 0 && !nombreOk
      ? nombre.trim().length < MIN_NOMBRE
        ? `El nombre necesita al menos ${MIN_NOMBRE} letras.`
        : `El nombre no puede pasar de ${MAX_NOMBRE} letras.`
      : undefined);

  async function crear() {
    if (!puedeEnviar) return;
    setCargando(true);
    setErrores({});
    try {
      const { data, error } = await supabase.auth.signUp({
        email: correo.trim(),
        password: clave,
        // El trigger handle_new_user lee de acá el username definitivo.
        options: { data: { username: nombre.trim() } },
      });
      if (error) throw error;

      // Sin sesión = Supabase pide confirmar el correo. Esa espera tiene su
      // propia pantalla (teléfono 20), no un Alert.
      if (!data.session) {
        router.replace({ pathname: "/revisa-correo", params: { correo: correo.trim() } });
      }
      // Con sesión, el guard del layout lleva solo al mapa.
    } catch (e) {
      const { campo, texto } = traducirError(e instanceof Error ? e.message : "");
      setErrores({ [campo]: texto });
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
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.encabezado}>
            <View style={styles.marcaFila}>
              <Isotipo size={esc(30)} />
              <Text style={styles.marca}>CUADRA</Text>
            </View>
            <Text style={styles.titulo}>Armá tu cuenta</Text>
          </View>

          <View style={styles.form}>
            <Campo
              etiqueta="NOMBRE"
              placeholder="¿Cómo te decimos?"
              nota="Así te van a ver cuando seas alcalde de una cuadra."
              error={errorNombre}
              value={nombre}
              onChangeText={(t) => {
                setNombre(t);
                setErrores((e) => ({ ...e, nombre: undefined }));
              }}
              autoCapitalize="words"
              maxLength={MAX_NOMBRE}
            />
            <Campo
              etiqueta="CORREO"
              placeholder="tu@correo.com"
              error={errores.correo}
              value={correo}
              onChangeText={(t) => {
                setCorreo(t);
                setErrores((e) => ({ ...e, correo: undefined }));
              }}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
            />
            <Campo
              etiqueta="CONTRASEÑA"
              placeholder="••••••••"
              nota={`Mínimo ${MIN_CLAVE} caracteres.`}
              error={errorClave}
              conOjo
              value={clave}
              onChangeText={(t) => {
                setClave(t);
                setErrores((e) => ({ ...e, clave: undefined }));
              }}
              autoCapitalize="none"
            />

            <Casilla marcada={terminos} onToggle={() => setTerminos((v) => !v)}>
              Acepto los términos y la privacidad.
            </Casilla>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <SafeAreaView edges={["bottom"]} style={styles.pie}>
        <Tarjeta fondo="#FFFFFF">
          <View style={styles.avisoFila}>
            <CalatoVivo estado="atento" size={esc(30)} />
            <Text style={styles.avisoTexto}>
              Tu Álbum se guarda acá. Sin cuenta, las figuritas se te pierden.
            </Text>
          </View>
        </Tarjeta>

        <Boton onPress={crear} deshabilitado={!puedeEnviar}>
          {cargando ? "Creando…" : "Crear mi cuenta"}
        </Boton>

        <Pressable onPress={() => router.replace("/sign-in")} hitSlop={12}>
          <Text style={styles.link}>
            ¿Ya tenés cuenta? <Text style={styles.linkFuerte}>Entrar</Text>
          </Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.papel },
  flex: { flex: 1 },
  toldo: { marginTop: esc(8) },
  scroll: { paddingHorizontal: esc(18), paddingTop: esc(22), paddingBottom: esc(16), gap: esc(16) },
  encabezado: { gap: esc(6) },
  marcaFila: { flexDirection: "row", alignItems: "center", gap: esc(9) },
  marca: {
    fontSize: esc(27),
    lineHeight: esc(33),
    fontFamily: fuentes.display,
    color: colores.tinta,
  },
  titulo: {
    fontSize: esc(28),
    lineHeight: esc(30),
    fontFamily: fuentes.display,
    color: colores.tinta,
    marginTop: esc(8),
  },
  form: { gap: esc(7) },
  pie: { paddingHorizontal: esc(18), paddingBottom: esc(10), gap: esc(10) },
  avisoFila: { flexDirection: "row", alignItems: "center", gap: esc(10), padding: esc(11) },
  avisoTexto: {
    flex: 1,
    fontSize: esc(11),
    lineHeight: esc(16),
    fontFamily: fuentes.regular,
    color: colores.textoSuave,
  },
  link: {
    textAlign: "center",
    fontSize: esc(13),
    fontFamily: fuentes.bold,
    color: colores.textoSuave,
  },
  linkFuerte: { color: colores.naranja },
});
