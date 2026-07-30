import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import * as Location from "expo-location";

import { MAPA_HTML } from "@/lib/mapa-html";
import { colores, esc, fuentes } from "@/lib/theme";

type Ubicacion = { lng: number; lat: number };
type EstadoGps = "pidiendo" | "ok" | "denegado" | "error";

/**
 * Mapa de Cuadra (ADR-0004): MapLibre GL JS + OpenFreeMap en WebView,
 * centrado en la ubicación real del usuario (expo-location).
 * Coordina dos asincronías: el GPS y la carga del mapa; inyecta la
 * posición solo cuando ambos están listos.
 */
export function MapaCuadra() {
  const webRef = useRef<WebView>(null);
  const [coords, setCoords] = useState<Ubicacion | null>(null);
  const [mapaListo, setMapaListo] = useState(false);
  const [gps, setGps] = useState<EstadoGps>("pidiendo");

  // Pedir permiso y obtener la ubicación.
  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!activo) return;
        if (status !== "granted") {
          setGps("denegado");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!activo) return;
        setCoords({ lng: pos.coords.longitude, lat: pos.coords.latitude });
        setGps("ok");
      } catch {
        if (activo) setGps("error");
      }
    })();
    return () => {
      activo = false;
    };
  }, []);

  // Inyectar la posición cuando el mapa terminó de cargar Y tenemos coords.
  useEffect(() => {
    if (mapaListo && coords) {
      webRef.current?.injectJavaScript(
        `window.setUser(${coords.lng}, ${coords.lat}); true;`
      );
    }
  }, [mapaListo, coords]);

  function onMessage(e: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "mapaListo") setMapaListo(true);
    } catch {
      // mensajes no-JSON se ignoran
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
        geolocationEnabled
        domStorageEnabled
        javaScriptEnabled
        startInLoadingState
      />

      {!mapaListo && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color={colores.naranja} />
          <Text style={styles.overlayTexto}>Cargando tu cuadra…</Text>
        </View>
      )}

      {gps === "denegado" && (
        <View style={styles.aviso}>
          <Text style={styles.avisoTexto}>
            Activa la ubicación para verte en el mapa.
          </Text>
        </View>
      )}
    </View>
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
    bottom: esc(24),
    left: esc(16),
    right: esc(16),
    backgroundColor: colores.tinta,
    borderRadius: esc(12),
    paddingVertical: esc(12),
    paddingHorizontal: esc(16),
  },
  avisoTexto: { color: colores.papel, fontSize: esc(14), textAlign: "center", fontFamily: fuentes.regular },
});
