import { useMemo } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeIn } from "react-native-reanimated";

import { esc } from "@/lib/theme";

/**
 * Calato animado con clips PRE-RENDERIZADOS.
 *
 * Por qué así y no 3D en vivo: se midió. Un Calato 3D corriendo en el teléfono
 * da 60 fps con una WebView + three.js, pero pre-renderizar da la misma
 * animación con CERO costo de GPU, mejor calidad (el render se hace fuera del
 * teléfono, sin límite de 16 ms por cuadro) y sin dependencias nativas. Es el
 * patrón de Supercell: modelar en 3D, empaquetar secuencias.
 *
 * Cada clip salió del mismo modelo riggeado, renderizado cuadro a cuadro con
 * `scripts/inspector` y exportado a WebP con transparencia.
 */

/** Los clips disponibles. Agregar acá al sumar uno nuevo a assets/calato/. */
const CLIPS = {
  saludo: require("../../assets/calato/saludo.webp"),
  caminar: require("../../assets/calato/caminar.webp"),
  celebrar: require("../../assets/calato/celebrar.webp"),
} as const;

export type ClipCalato = keyof typeof CLIPS;

/**
 * Proporción de cada clip (ancho/alto), medida del render. Sirve para reservar
 * el espacio correcto sin que la imagen salte al cargar: el salto ocupa más
 * ancho que el idle porque los brazos se abren.
 */
const PROPORCION: Record<ClipCalato, number> = {
  saludo: 430 / 397,
  caminar: 299 / 470,
  celebrar: 397 / 485,
};

export function CalatoClip({
  clip = "saludo",
  alto = 120,
  style,
  etiqueta,
}: {
  clip?: ClipCalato;
  /** Alto en puntos del prototipo; pasa por `esc()` como todo lo demás. */
  alto?: number;
  style?: StyleProp<ViewStyle>;
  /** Para lectores de pantalla: qué está haciendo Calato. */
  etiqueta?: string;
}) {
  const h = esc(alto);
  const w = useMemo(() => h * PROPORCION[clip], [h, clip]);

  return (
    <Animated.View entering={FadeIn.duration(220)} style={[{ width: w, height: h }, style]}>
      <Image
        source={CLIPS[clip]}
        style={styles.img}
        contentFit="contain"
        accessibilityLabel={etiqueta ?? `Calato ${clip}`}
        // Los clips son animados: expo-image los reproduce en bucle solo.
        // `recyclingKey` evita que se mezclen cuadros al cambiar de clip.
        recyclingKey={clip}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  img: { width: "100%", height: "100%" },
});
