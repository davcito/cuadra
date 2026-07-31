import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image as ImagenNativa,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import type { Coordenada } from "@/lib/geo";
import type { AlcanceVueltas } from "@/lib/alcance-vueltas";
import { MAPA_HTML } from "@/lib/mapa-html";
import { colores, esc, fuentes, radios } from "@/lib/theme";
import type { VueltaCerca } from "@/lib/vueltas-cerca";

const ROSTRO_CALATO = require("../../assets/calato/atento.webp");

type Props = {
  ubicacion: Coordenada | null;
  vueltas: VueltaCerca[];
  alcance: AlcanceVueltas;
  seleccionadaId?: number | null;
  onSeleccionar?: (id: number) => void;
};

/**
 * Puente React Native ↔ MapLibre. La ubicación llega desde la pantalla para
 * que mapa y recomendaciones compartan UNA lectura de GPS.
 */
export function MapaCuadra({
  ubicacion,
  vueltas,
  alcance,
  seleccionadaId = null,
  onSeleccionar,
}: Props) {
  const webRef = useRef<WebView>(null);
  const [mapaListo, setMapaListo] = useState(false);
  const [mapaError, setMapaError] = useState<string | null>(null);
  const [calatoAsset, setCalatoAsset] = useState<string | null>(null);

  // Usamos el asset oficial transparente y el mapa deja visible solo la cabeza.
  // En Expo Go el URI HTTP entra directo; en un build nativo convertimos el
  // asset local a data URI para que el WebView lo pueda leer en toda plataforma.
  useEffect(() => {
    let activo = true;
    const uri = ImagenNativa.resolveAssetSource(ROSTRO_CALATO).uri;

    if (/^(https?:|data:)/.test(uri)) {
      setCalatoAsset(uri);
      return () => {
        activo = false;
      };
    }

    void fetch(uri)
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error("No se pudo leer el rostro de Calato");
        return respuesta.blob();
      })
      .then(
        (blob) =>
          new Promise<string>((resolver, rechazar) => {
            const lector = new FileReader();
            lector.onload = () => resolver(String(lector.result));
            lector.onerror = () => rechazar(lector.error);
            lector.readAsDataURL(blob);
          })
      )
      .then((dataUri) => {
        if (activo) setCalatoAsset(dataUri);
      })
      .catch(() => {
        // Fallback honesto: nunca volvemos al dibujo genérico.
        if (activo) setCalatoAsset(uri);
      });

    return () => {
      activo = false;
    };
  }, []);

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: vueltas
        .filter(
          (v) =>
            typeof v.lat === "number" &&
            typeof v.lng === "number" &&
            Number.isFinite(v.lat) &&
            Number.isFinite(v.lng)
        )
        .map((v) => ({
          type: "Feature" as const,
          id: v.id,
          geometry: {
            type: "Point" as const,
            coordinates: [v.lng as number, v.lat as number],
          },
          properties: { id: v.id, categoria: v.categoria },
        })),
    }),
    [vueltas]
  );

  useEffect(() => {
    if (!mapaListo || !ubicacion || !calatoAsset) return;
    webRef.current?.injectJavaScript(
      `window.setCalatoAsset(${JSON.stringify(calatoAsset)}); window.setUser(${ubicacion.lng}, ${ubicacion.lat}); true;`
    );
  }, [calatoAsset, mapaListo, ubicacion]);

  useEffect(() => {
    if (!mapaListo) return;
    webRef.current?.injectJavaScript(
      `window.setVueltas(${JSON.stringify(geojson)}); window.setAlcance(${JSON.stringify(alcance)}); true;`
    );
  }, [alcance, geojson, mapaListo]);

  useEffect(() => {
    if (!mapaListo) return;
    webRef.current?.injectJavaScript(
      `window.setSelected(${seleccionadaId == null ? "null" : seleccionadaId}); true;`
    );
  }, [mapaListo, seleccionadaId]);

  function onMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as {
        type?: string;
        id?: number;
        mensaje?: string;
      };
      if (msg.type === "mapaListo") {
        setMapaListo(true);
        setMapaError(null);
      } else if (msg.type === "mapaError" && !mapaListo) {
        setMapaError(msg.mensaje ?? "No pudimos cargar el mapa.");
      } else if (msg.type === "vueltaSeleccionada" && Number.isFinite(msg.id)) {
        onSeleccionar?.(Number(msg.id));
      }
    } catch {
      // Mensajes no JSON del motor se ignoran.
    }
  }

  return (
    <View style={styles.cont}>
      <WebView
        ref={webRef}
        originWhitelist={["*"]}
        source={{ html: MAPA_HTML }}
        style={styles.web}
        onMessage={onMessage}
        domStorageEnabled
        javaScriptEnabled
        startInLoadingState
      />

      {!mapaListo && !mapaError ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color={colores.naranja} />
          <Text style={styles.overlayTexto}>Desplegando la cuadra…</Text>
        </View>
      ) : null}

      {mapaError ? (
        <View style={styles.aviso} accessibilityRole="alert">
          <Text style={styles.avisoTitulo}>El mapa no terminó de cargar</Text>
          <Text style={styles.avisoTexto}>{mapaError}</Text>
        </View>
      ) : null}

      {mapaListo && ubicacion ? (
        <Pressable
          style={({ pressed }) => [styles.recentrar, pressed && styles.recentrarPresionado]}
          onPress={() =>
            webRef.current?.injectJavaScript("window.centrarUsuario(); true;")
          }
          accessibilityRole="button"
          accessibilityLabel="Volver a mi ubicación"
          hitSlop={6}
        >
          <IconoUbicacion />
        </Pressable>
      ) : null}
    </View>
  );
}

function IconoUbicacion() {
  return (
    <Svg width={esc(23)} height={esc(23)} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={4} fill={colores.naranja} />
      <Circle cx={12} cy={12} r={8} fill="none" stroke={colores.tinta} strokeWidth={2} />
      <Path d="M12 1v3M12 20v3M1 12h3M20 12h3" stroke={colores.tinta} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  cont: { flex: 1, backgroundColor: colores.papel },
  web: { flex: 1, backgroundColor: colores.papel },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: esc(10),
    backgroundColor: colores.papel,
  },
  overlayTexto: { color: colores.metadato, fontSize: esc(15), fontFamily: fuentes.medium },
  aviso: {
    position: "absolute",
    top: esc(116),
    left: esc(16),
    right: esc(16),
    backgroundColor: colores.tinta,
    borderRadius: radios.campo,
    paddingVertical: esc(11),
    paddingHorizontal: esc(14),
    gap: esc(2),
  },
  avisoTitulo: { color: colores.papel, fontSize: esc(13), fontFamily: fuentes.extrabold },
  avisoTexto: { color: colores.papel, fontSize: esc(11), lineHeight: esc(15), fontFamily: fuentes.regular },
  recentrar: {
    position: "absolute",
    right: esc(14),
    top: esc(150),
    width: esc(48),
    height: esc(48),
    borderRadius: radios.chip,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251,247,240,0.94)",
    borderWidth: esc(2),
    borderColor: colores.tinta,
    shadowColor: colores.tinta,
    shadowOpacity: 0.25,
    shadowRadius: 0,
    shadowOffset: { width: esc(2), height: esc(2) },
    elevation: 4,
  },
  recentrarPresionado: { opacity: 0.78, transform: [{ scale: 0.96 }] },
});
