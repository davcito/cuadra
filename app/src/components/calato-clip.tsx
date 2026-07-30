import { useMemo } from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import Animated, { FadeIn } from "react-native-reanimated";

import { esc } from "@/lib/theme";

/**
 * Calato animado con clips PRE-RENDERIZADOS.
 *
 * Por qué pre-renderizado y no 3D en vivo: se midió. Un Calato 3D corriendo en
 * el teléfono da 60 fps con una WebView + three.js, pero pre-renderizar da la
 * misma animación con CERO costo de GPU, mejor calidad (el render se hace fuera
 * del teléfono, sin límite de 16 ms por cuadro) y sin dependencias nativas. Es
 * el patrón de Supercell: modelar en 3D, empaquetar secuencias.
 *
 * De dónde salen los cuadros: `saludo`, `atento`, `culpa` y `chapada` se generan
 * con Seedance anclado a las imágenes de identidad y se recortan por doble fondo
 * — receta completa en `scripts/clip-desde-video.md`. `caminar` todavía viene del
 * modelo 3D riggeado (`scripts/inspector`), que es la única fuente de un ciclo de
 * caminata con encuadre exacto.
 *
 * Los de video no tienen el estiramiento del hombro que arrastra el modelo 3D:
 * no hay rig, así que no hay pesos mal asignados.
 */

/**
 * Los clips disponibles. Agregar acá al sumar uno nuevo a assets/calato/.
 *
 * Lo que NO está acá y es a propósito:
 * · `saludo` y `culpa` pasaron a <CalatoSprite> — son los Calato grandes, y a ese
 *   tamaño el tirón del WebP animado se nota.
 * · `chapada` existe en assets/ pero todavía no tiene pantalla (entra en E2);
 *   `require` lo metería en el paquete igual, 5,5 MB por nada.
 */
const CLIPS = {
  atento: require("../../assets/calato/atento.webp"),
  caminar: require("../../assets/calato/caminar24.webp"),
} as const;

export type ClipCalato = keyof typeof CLIPS;

/**
 * Proporción de cada clip (ancho/alto), medida del render. Sirve para reservar
 * el espacio correcto sin que la imagen salte al cargar: el salto ocupa más
 * ancho que el idle porque los brazos se abren.
 */
const PROPORCION: Record<ClipCalato, number> = {
  atento: 414 / 420,
  caminar: 298 / 468, // recorte re-medido con 124 muestras: el anterior cortaba poses extremas
};

export function CalatoClip({
  clip = "atento",
  alto = 120,
  style,
  etiqueta,
}: {
  clip?: ClipCalato;
  /**
   * Alto en unidades del PROTOTIPO. El `esc()` lo aplica este componente adentro,
   * así que el llamador pasa el número CRUDO: `alto={252}`, nunca `alto={esc(252)}`.
   * Envolverlo afuera escala dos veces y agranda 64 % sin que se note en el diff.
   */
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
