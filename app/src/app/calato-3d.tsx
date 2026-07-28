import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Image } from "expo-image";
import { useRouter } from "expo-router";

import { Etiqueta, Tarjeta } from "@/components/ui";
import { calato3dHtml } from "@/lib/calato-3d-html";
import { colores, esc, fuentes } from "@/lib/theme";

/**
 * Banco de pruebas de Calato en 3D.
 *
 * Responde la última pregunta abierta del spike: ¿un personaje riggeado de
 * ~31k triángulos corre a 60 fps en el iPhone 15 Pro Max? Eso NO se supone,
 * se mide en el equipo — igual que las safe areas.
 *
 * Es una pantalla de trabajo, no de producto: no está en la barra de pestañas
 * y no la ve un usuario. Sale del repo cuando el ADR-0008 esté cerrado.
 */

const GLB =
  "https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/82f0c5bd-5cc2-4d4e-bdef-36293e2a3432.glb";

type Medicion = { fps: number; min: number; dibujadas: number; triangulos: number };
type Info = { triangulos: number; huesos: number; clips: string[] };

const AMORTIGUACIONES = [0, 0.5, 0.8] as const;

/** Clip pre-renderizado desde el MISMO modelo: 30 cuadros, 10 fps, 343 KB. */
const CLIP_SALUDO = require("../../assets/calato/saludo.webp");
type Modo = "vivo" | "clip";

export default function Calato3dScreen() {
  const router = useRouter();
  const webRef = useRef<WebView>(null);
  const html = useMemo(() => calato3dHtml(GLB), []);

  const [info, setInfo] = useState<Info | null>(null);
  const [medicion, setMedicion] = useState<Medicion | null>(null);
  const [peor, setPeor] = useState<number | null>(null);
  // Contador en ref, no en estado: dentro de onMessage el estado llega
  // desactualizado y los primeros segundos de carga se colaban en el mínimo
  // (por eso aparecía un "6" que no significaba nada).
  const muestras = useRef(0);
  const [amortiguacion, setAmortiguacion] = useState<number>(0);
  const [transparente, setTransparente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modo, setModo] = useState<Modo>("vivo");

  function onMessage(e: WebViewMessageEvent) {
    try {
      const m = JSON.parse(e.nativeEvent.data);
      if (m.type === "listo") setInfo(m);
      else if (m.type === "error") setError(m.mensaje);
      else if (m.type === "fps") {
        setMedicion(m);
        muestras.current += 1;
        // Los 3 primeros segundos incluyen carga del modelo y compilación de
        // shaders: no representan el rendimiento y no cuentan para el mínimo.
        if (muestras.current > 3) {
          setPeor((p) => (p === null ? m.min : Math.min(p, m.min)));
        }
      }
    } catch {
      // mensajes no-JSON se ignoran
    }
  }

  function inyectar(js: string) {
    webRef.current?.injectJavaScript(`${js} true;`);
  }

  const color = (fps: number) =>
    fps >= 55 ? colores.exito : fps >= 40 ? colores.categorias.huacas : colores.error;

  return (
    <View style={styles.raiz}>
      {modo === "vivo" ? (
        <WebView
          ref={webRef}
          originWhitelist={["*"]}
          source={{ html }}
          style={styles.web}
          onMessage={onMessage}
          domStorageEnabled
          javaScriptEnabled
          startInLoadingState
          // Sin esto iOS pausa el bucle de render al salir del foco y el fps miente.
          mediaPlaybackRequiresUserAction={false}
        />
      ) : (
        // Mismo personaje, misma animación — pero renderizada fuera del teléfono.
        // La app solo reproduce cuadros: cero costo de GPU, cero three.js.
        <View style={styles.clip}>
          <Image source={CLIP_SALUDO} style={styles.clipImg} contentFit="contain" />
        </View>
      )}

      {modo === "vivo" && !info && !error && (
        <View style={styles.cargando} pointerEvents="none">
          <ActivityIndicator color={colores.naranja} />
          <Text style={styles.cargandoTexto}>Cargando a Calato…</Text>
        </View>
      )}

      <SafeAreaView edges={["top"]} style={styles.arriba} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.volver}>
          <Text style={styles.volverTexto}>← Volver</Text>
        </Pressable>

        {modo === "clip" && (
          <Tarjeta style={styles.panel}>
            <View style={styles.panelCuerpo}>
              <View style={styles.fpsFila}>
                <Text style={[styles.fps, { color: colores.exito }]}>0</Text>
                <View>
                  <Etiqueta>COSTO DE RENDER</Etiqueta>
                  <Text style={styles.dato}>no hay motor 3D corriendo</Text>
                </View>
              </View>
              <Text style={styles.dato}>
                30 cuadros · 10 fps · 343 KB · renderizado desde el MISMO modelo, pero fuera del
                teléfono
              </Text>
            </View>
          </Tarjeta>
        )}

        {modo === "vivo" && medicion && (
          <Tarjeta style={styles.panel}>
            <View style={styles.panelCuerpo}>
              <View style={styles.fpsFila}>
                <Text style={[styles.fps, { color: color(medicion.fps) }]}>{medicion.fps}</Text>
                <View>
                  <Etiqueta>FPS</Etiqueta>
                  <Text style={styles.dato}>
                    peor del segundo: {medicion.min}
                    {peor !== null ? `  ·  mínimo estable: ${peor}` : "  ·  midiendo…"}
                  </Text>
                </View>
              </View>
              <Text style={styles.dato}>
                {medicion.triangulos.toLocaleString()} triángulos · {medicion.dibujadas} llamadas
                de dibujo{info ? ` · ${info.huesos} huesos` : ""}
              </Text>
            </View>
          </Tarjeta>
        )}

        {modo === "vivo" && error && (
          <Tarjeta style={styles.panel}>
            <View style={styles.panelCuerpo}>
              <Etiqueta color={colores.error}>NO CARGÓ</Etiqueta>
              <Text style={styles.dato}>{error}</Text>
            </View>
          </Tarjeta>
        )}
      </SafeAreaView>

      <SafeAreaView edges={["bottom"]} style={styles.abajo} pointerEvents="box-none">
        <Tarjeta style={styles.panel}>
          <View style={styles.panelCuerpo}>
            <Etiqueta>CÓMO SE DIBUJA</Etiqueta>
            <View style={styles.botonera}>
              {(["vivo", "clip"] as Modo[]).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setModo(m)}
                  style={[styles.opcion, modo === m && styles.opcionActiva]}
                >
                  <Text style={[styles.opcionTexto, modo === m && styles.opcionTextoActivo]}>
                    {m === "vivo" ? "3D en vivo" : "clip pre-renderizado"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Tarjeta>

        <Tarjeta style={[styles.panel, modo === "clip" && styles.panelApagado]}>
          <View style={styles.panelCuerpo}>
            <Etiqueta>AMORTIGUAR CADERA Y COLUMNA</Etiqueta>
            <Text style={styles.ayuda}>
              Los clips son captura humana: en un personaje de patas cortas el tronco se tumba
              hasta 40°. Esto lo suaviza sin tocar brazos ni cabeza.
            </Text>
            <View style={styles.botonera}>
              {AMORTIGUACIONES.map((v) => (
                <Pressable
                  key={v}
                  onPress={() => {
                    setAmortiguacion(v);
                    inyectar(`window.setAmortiguacion(${v});`);
                  }}
                  style={[styles.opcion, amortiguacion === v && styles.opcionActiva]}
                >
                  <Text style={[styles.opcionTexto, amortiguacion === v && styles.opcionTextoActivo]}>
                    {v === 0 ? "sin tocar" : `${Math.round(v * 100)} %`}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => {
                const t = !transparente;
                setTransparente(t);
                inyectar(`window.setFondo('${t ? "transparente" : "papel"}');`);
              }}
              style={[styles.opcion, styles.opcionAncha, transparente && styles.opcionActiva]}
            >
              <Text style={[styles.opcionTexto, transparente && styles.opcionTextoActivo]}>
                fondo {transparente ? "transparente" : "papel"}
              </Text>
            </Pressable>
          </View>
        </Tarjeta>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: colores.papel },
  web: { flex: 1, backgroundColor: colores.papel },
  cargando: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: esc(10),
  },
  cargandoTexto: { color: colores.metadato, fontSize: esc(15), fontFamily: fuentes.regular },
  arriba: { position: "absolute", top: 0, left: 0, right: 0, gap: esc(8), padding: esc(14) },
  abajo: { position: "absolute", bottom: 0, left: 0, right: 0, padding: esc(14), gap: esc(8) },
  panelApagado: { opacity: 0.4 },
  clip: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colores.papel },
  clipImg: { width: "88%", height: "62%" },
  volver: { alignSelf: "flex-start" },
  volverTexto: { fontSize: esc(14), fontFamily: fuentes.bold, color: colores.tinta },
  panel: { backgroundColor: colores.papel },
  panelCuerpo: { padding: esc(13), gap: esc(7) },
  fpsFila: { flexDirection: "row", alignItems: "center", gap: esc(12) },
  fps: { fontSize: esc(38), lineHeight: esc(42), fontFamily: fuentes.display },
  dato: { fontSize: esc(11), lineHeight: esc(16), fontFamily: fuentes.regular, color: colores.textoSuave },
  ayuda: { fontSize: esc(11), lineHeight: esc(16), fontFamily: fuentes.regular, color: colores.metadato },
  botonera: { flexDirection: "row", gap: esc(8) },
  opcion: {
    flex: 1,
    borderWidth: esc(2),
    borderColor: colores.tinta,
    borderRadius: esc(10),
    paddingVertical: esc(9),
    alignItems: "center",
  },
  opcionAncha: { flex: 0 },
  opcionActiva: { backgroundColor: colores.tinta },
  opcionTexto: { fontSize: esc(12), fontFamily: fuentes.bold, color: colores.tinta },
  opcionTextoActivo: { color: colores.papel },
});
