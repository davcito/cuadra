import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, type CameraType, useCameraPermissions } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Boton } from "@/components/ui";
import { chapar, GEOFENCE_M, ubicacionActual, type Ubicacion } from "@/lib/chapar";
import { haversineMetros } from "@/lib/geo";
import { supabase } from "@/lib/supabase";
import { colores, esc, fuentes, radios } from "@/lib/theme";

/**
 * Cámara in-app — pantalla 8 del prototipo.
 *
 * Es la capa 1 del anti-fraude (documento maestro §7.6) y su regla es lo que NO
 * hace: **no abre la galería**. Una foto que se puede elegir del carrete no
 * prueba que alguien fue a ningún lado, y el producto vende justo eso.
 *
 * El obturador nace apagado y se enciende solo dentro del geofence. Es una
 * cortesía, no una defensa: el que decide es `chapar()` en el servidor, sobre la
 * ubicación que se manda. Acá se evita que alguien saque una foto que ya sabemos
 * que va a rebotar.
 */
export default function CamaraScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const camara = useRef<CameraView>(null);

  const [permiso, pedirPermiso] = useCameraPermissions();
  const [lente, setLente] = useState<CameraType>("back");
  const [instruccion, setInstruccion] = useState<string | null>(null);
  const [poi, setPoi] = useState<{ lat: number; lng: number } | null>(null);
  const [donde, setDonde] = useState<Ubicacion | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Datos de la vuelta: qué hay que fotografiar y dónde queda ─────────
  useEffect(() => {
    let vivo = true;
    void (async () => {
      const { data } = await supabase
        .from("missions")
        .select("instruccion_verificacion, pois(lat, lng)")
        .eq("id", Number(id))
        .single();
      if (!vivo || !data) return;
      setInstruccion(data.instruccion_verificacion ?? null);
      // Columnas generadas, NO `ubicacion`: PostgREST devuelve `geography` como
      // WKB hexadecimal, y pedirle `.coordinates` a un string da undefined sin
      // avisar. Ver la migración 20260729170000.
      const g = (data as { pois?: { lat?: number; lng?: number } }).pois;
      if (typeof g?.lat === "number" && typeof g?.lng === "number") setPoi({ lat: g.lat, lng: g.lng });
    })();
    return () => {
      vivo = false;
    };
  }, [id]);

  // ── Ubicación viva ───────────────────────────────────────────────────
  // Se refresca cada 3 s: el chip tiene que reaccionar mientras la persona
  // camina los últimos metros, que es exactamente cuando lo está mirando.
  useEffect(() => {
    let vivo = true;
    const leer = async () => {
      try {
        const u = await ubicacionActual();
        if (vivo) setDonde(u);
      } catch {
        /* el chip se queda en "buscando"; el servidor decide igual */
      }
    };
    void leer();
    const t = setInterval(() => void leer(), 3000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  const distancia = donde && poi ? haversineMetros(donde, poi) : null;
  const enRango = distancia !== null && distancia <= GEOFENCE_M;

  const disparar = useCallback(async () => {
    if (!camara.current || enviando) return;
    setError(null);
    setEnviando(true);
    try {
      const foto = await camara.current.takePictureAsync({ quality: 0.7 });
      if (!foto?.uri) {
        setError("No pudimos tomar la foto. Probá de nuevo.");
        return;
      }
      const v = await chapar(Number(id), foto.uri);
      if (v.ok) {
        router.replace({
          pathname: "/(app)/chapada",
          params: {
            calle: String(v.calle_xp),
            racha: String(v.racha),
            figurita: v.figurita_id ? String(v.figurita_id) : "",
            revision: v.en_revision ? "1" : "",
          },
        });
        return;
      }
      setError(v.mensaje);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Algo salió mal. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }, [enviando, id, router]);

  // ── Permiso ──────────────────────────────────────────────────────────
  if (!permiso) {
    return (
      <View style={s.centro}>
        <ActivityIndicator color={colores.naranja} />
      </View>
    );
  }

  if (!permiso.granted) {
    return (
      <SafeAreaView style={s.centro}>
        <Text style={s.permisoTitulo}>La cámara</Text>
        <Text style={s.permisoTexto}>
          La foto se toma en el momento, en el lugar. No se sube de la galería — así las visitas
          valen.
        </Text>
        <View style={s.permisoBotones}>
          <Boton onPress={() => void pedirPermiso()}>Dale, permitir</Boton>
          <Pressable onPress={() => router.back()} hitSlop={esc(8)}>
            <Text style={s.ahoraNo}>Ahora no</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={s.pantalla}>
      <CameraView ref={camara} style={StyleSheet.absoluteFill} facing={lente} />

      {/* Qué hay que fotografiar. Va arriba y siempre visible: si la persona
          tiene que recordar la instrucción, la foto sale mal. */}
      <SafeAreaView edges={["top"]} style={s.encabezado}>
        <View style={s.tarjeta}>
          <Text style={s.rotulo}>PARA CHAPARLA</Text>
          <Text style={s.instruccion}>{instruccion ?? "Sacale una foto al lugar."}</Text>
        </View>
      </SafeAreaView>

      {/* Marco de esquinas: encuadra sin tapar. */}
      <View pointerEvents="none" style={s.marco}>
        <View style={[s.esquina, s.esqSupIzq]} />
        <View style={[s.esquina, s.esqSupDer]} />
        <View style={[s.esquina, s.esqInfIzq]} />
        <View style={[s.esquina, s.esqInfDer]} />
      </View>

      {/* Chip de rango. El prototipo solo dibuja el estado "dentro"; los otros
          dos son necesarios igual y se distinguen por color, no solo por texto. */}
      <View pointerEvents="none" style={s.filaChip}>
        <View style={[s.chip, enRango ? s.chipOk : distancia === null ? s.chipBuscando : s.chipLejos]}>
          <Text style={s.chipTexto}>
            {distancia === null
              ? "● BUSCANDO TU UBICACIÓN"
              : enRango
                ? `● ESTÁS A ${Math.round(distancia)} M · DENTRO DE RANGO`
                : `● ESTÁS A ${Math.round(distancia)} M · ACERCATE`}
          </Text>
        </View>
      </View>

      {error ? (
        <View pointerEvents="none" style={s.filaError}>
          <Text style={s.error}>{error}</Text>
        </View>
      ) : null}

      {/* Controles. El cuadro de la izquierda es "cerrar", no la galería: en el
          prototipo está vacío, y meter ahí un acceso al carrete contradiría la
          única regla de esta pantalla. */}
      <View style={s.controles}>
        <Pressable
          onPress={() => router.back()}
          style={s.secundario}
          accessibilityLabel="Cerrar la cámara"
        >
          <Text style={s.secundarioTexto}>✕</Text>
        </Pressable>

        <Pressable
          onPress={() => void disparar()}
          disabled={!enRango || enviando}
          accessibilityLabel={enRango ? "Tomar la foto" : "Acercate para poder chapar"}
          style={[s.obturador, (!enRango || enviando) && s.obturadorApagado]}
        >
          {enviando ? <ActivityIndicator color={colores.papel} /> : null}
        </Pressable>

        <Pressable
          onPress={() => setLente((l) => (l === "back" ? "front" : "back"))}
          style={s.secundario}
          accessibilityLabel="Cambiar de cámara"
        >
          <Text style={s.secundarioTexto}>⟲</Text>
        </Pressable>
      </View>

      <SafeAreaView edges={["bottom"]} style={s.pie}>
        <Text style={s.pieTexto}>
          La cámara se abre acá. No se pueden subir fotos de la galería — así las visitas valen.
        </Text>
      </SafeAreaView>
    </View>
  );
}

const NEGRO = "#141110";
const PAPEL_TENUE = "rgba(251,247,240,.5)";

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: NEGRO },
  centro: {
    flex: 1,
    backgroundColor: NEGRO,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: esc(22),
    gap: esc(12),
  },

  permisoTitulo: { fontFamily: fuentes.extrabold, fontSize: esc(15), color: colores.papel },
  permisoTexto: {
    fontFamily: fuentes.medium,
    fontSize: esc(12),
    lineHeight: esc(18),
    color: PAPEL_TENUE,
    textAlign: "center",
  },
  permisoBotones: { marginTop: esc(10), gap: esc(11), alignItems: "center", alignSelf: "stretch" },
  ahoraNo: { fontFamily: fuentes.bold, fontSize: esc(13), color: PAPEL_TENUE },

  encabezado: { paddingHorizontal: esc(18), paddingTop: esc(12) },
  tarjeta: {
    backgroundColor: "rgba(251,247,240,.94)",
    borderWidth: esc(2),
    borderColor: colores.tinta,
    borderRadius: radios.tarjeta,
    paddingVertical: esc(11),
    paddingHorizontal: esc(13),
    gap: esc(3),
  },
  rotulo: {
    fontFamily: fuentes.extrabold,
    fontSize: esc(10),
    letterSpacing: esc(1.2), // .12em sobre 10px
    color: colores.metadato,
  },
  // El único `font-weight:600` del prototipo que faltaba usar: `fuentes.semibold`
  // estaba declarada y sin un solo uso en toda la app.
  instruccion: {
    fontFamily: fuentes.semibold,
    fontSize: esc(13),
    lineHeight: esc(18.2), // 1.4 × 13
    color: colores.tinta,
  },

  marco: { position: "absolute", left: esc(44), right: esc(44), top: esc(190), height: esc(230) },
  esquina: { position: "absolute", width: esc(32), height: esc(32), borderColor: colores.papel },
  esqSupIzq: { left: 0, top: 0, borderLeftWidth: esc(4), borderTopWidth: esc(4), borderTopLeftRadius: esc(6) },
  esqSupDer: { right: 0, top: 0, borderRightWidth: esc(4), borderTopWidth: esc(4), borderTopRightRadius: esc(6) },
  esqInfIzq: { left: 0, bottom: 0, borderLeftWidth: esc(4), borderBottomWidth: esc(4), borderBottomLeftRadius: esc(6) },
  esqInfDer: { right: 0, bottom: 0, borderRightWidth: esc(4), borderBottomWidth: esc(4), borderBottomRightRadius: esc(6) },

  filaChip: { position: "absolute", left: 0, right: 0, top: esc(436), alignItems: "center" },
  chip: {
    borderRadius: radios.chip,
    paddingVertical: esc(4),
    paddingHorizontal: esc(10),
  },
  chipOk: { backgroundColor: colores.exito },
  chipLejos: { backgroundColor: colores.error },
  chipBuscando: { backgroundColor: colores.metadato },
  chipTexto: {
    fontFamily: fuentes.extrabold,
    fontSize: esc(10),
    letterSpacing: esc(0.9), // .09em sobre 10px
    color: colores.papel,
  },

  filaError: { position: "absolute", left: esc(20), right: esc(20), top: esc(468) },
  error: {
    fontFamily: fuentes.semibold,
    fontSize: esc(12),
    lineHeight: esc(17),
    color: colores.papel,
    backgroundColor: colores.error,
    borderRadius: radios.campo,
    paddingVertical: esc(8),
    paddingHorizontal: esc(12),
    textAlign: "center",
    overflow: "hidden",
  },

  controles: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: esc(104),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: esc(34),
  },
  secundario: {
    width: esc(40),
    height: esc(40),
    borderRadius: esc(9),
    borderWidth: esc(2),
    borderColor: PAPEL_TENUE,
    alignItems: "center",
    justifyContent: "center",
  },
  secundarioTexto: { color: colores.papel, fontSize: esc(17), fontFamily: fuentes.medium },
  obturador: {
    width: esc(76),
    height: esc(76),
    borderRadius: esc(38),
    backgroundColor: colores.naranja,
    borderWidth: esc(4),
    borderColor: colores.papel,
    alignItems: "center",
    justifyContent: "center",
    // El anillo exterior del prototipo (`box-shadow: 0 0 0 3px var(--tinta)`).
    // En RN no hay spread sin blur, así que se dibuja con la sombra dura de marca.
    shadowColor: colores.tinta,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: esc(3),
  },
  obturadorApagado: { opacity: 0.45 },

  pie: { position: "absolute", left: esc(20), right: esc(20), bottom: esc(36) },
  pieTexto: {
    fontFamily: fuentes.medium,
    fontSize: esc(11),
    lineHeight: esc(16), // 1.45 × 11
    color: "rgba(251,247,240,.65)",
    textAlign: "center",
  },
});
