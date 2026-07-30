import { useEffect, useState } from "react";
import { AccessibilityInfo, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Image } from "expo-image";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { esc } from "@/lib/theme";

/**
 * Calato animado con un ATLAS DE SPRITES.
 *
 * Por qué existe, habiendo ya un componente de clips: el WebP animado NO llega.
 * Se midió en el equipo — el mismo saludo a 668×660, a 344×340 y a 223×220 se
 * traba IGUAL en los tres. Como a 223×220 cada cuadro es trivial de decodificar,
 * el cuello no son los píxeles: es que el reproductor descomprime los 121 cuadros
 * uno por uno, y en WebP animado cada cuadro depende del anterior, así que no
 * puede saltarse ninguno. Subir los cuadros a 48 fps lo empeoró: iba lento, que
 * es la firma de un decodificador que no llega (si solo perdiera cuadros,
 * duraría lo mismo).
 *
 * El atlas esquiva ese decodificador entero. Todos los cuadros viven en UNA
 * imagen estática que se descomprime una sola vez; animar es correr esa imagen
 * dentro de una ventana recortada. Eso es un `transform`, y los transforms de
 * Reanimated corren en el hilo de UI, que es donde los 60 fps están garantizados
 * — el hilo de JS puede estar ocupado y la animación no se entera.
 *
 * Es el patrón de los videojuegos, y de yapa pesa menos: 2613 KB de atlas contra
 * 3931 KB del WebP animado del mismo clip.
 *
 * SOBRE EL HORMIGUEO: el atlas se arma desde los PNG del mateo, sin pasar por un
 * WebP animado intermedio. Se midió y la cadena vieja —matear, guardar WebP con
 * pérdida, reescalar, volver a guardar— DUPLICABA el temblor del origen (11,10
 * contra 5,68 medido como |f[i+1] − 2·f[i] + f[i−1]|). O sea: la mitad del
 * hormigueo lo ponía nuestra propia recompresión, no el modelo de video.
 *
 * El costo es memoria de textura: ~3900×3500×4 bytes ≈ 55 MB por atlas mientras
 * está en pantalla. Por eso hay DOS y no cinco — `saludo` y `culpa`, que son los
 * Calato grandes y protagonistas. Los gestos chicos (`atento`, 96 pt) siguen en
 * <CalatoClip>: a ese tamaño el tirón no se percibe y no justifica la textura.
 */

/**
 * Los atlas y su geometría. Los números salen del script que arma cada uno y
 * TIENEN que coincidir: si se regenera un atlas, se copian de su salida.
 *
 * Ojo con la celda: no la elige el tamaño de pantalla sino el LÍMITE DE TEXTURA.
 * `culpa` es más ancho que `saludo`, así que con 11 columnas su celda tiene que
 * ser más chica para que el atlas no pase de ~4000 px.
 */
const ATLAS = {
  saludo: {
    fuente: require("../../assets/calato/atlas-saludo.webp"),
    ancho: 348,
    alto: 344,
    columnas: 11,
    filas: 11,
    cuadros: 121,
    etiqueta: "Calato te saluda",
  },
  culpa: {
    fuente: require("../../assets/calato/atlas-culpa.webp"),
    ancho: 360,
    alto: 304,
    columnas: 11,
    filas: 11,
    cuadros: 121,
    etiqueta: "Calato, con cara de culpa",
  },
} as const;

export type ClipSprite = keyof typeof ATLAS;

const FPS = 24;

export function CalatoSprite({
  clip = "saludo",
  alto = 252,
  style,
  etiqueta,
}: {
  clip?: ClipSprite;
  /**
   * Alto en unidades del PROTOTIPO. El `esc()` lo aplica este componente adentro,
   * así que el llamador pasa el número CRUDO: `alto={252}`, nunca `alto={esc(252)}`.
   * Envolverlo afuera escala dos veces y agranda 64 % sin que se note en el diff.
   */
  alto?: number;
  style?: StyleProp<ViewStyle>;
  etiqueta?: string;
}) {
  const A = ATLAS[clip];
  const { ancho: CELDA_ANCHO, alto: CELDA_ALTO, columnas: COLUMNAS, filas: FILAS, cuadros: CUADROS } = A;

  const h = esc(alto);
  const escala = h / CELDA_ALTO;
  const w = CELDA_ANCHO * escala;

  const cuadro = useSharedValue(0);
  const [quieto, setQuieto] = useState(false);

  useEffect(() => {
    // "Reducir movimiento" del sistema: con esa opción activa el personaje se
    // queda en su primer cuadro en vez de animar (regla de movimiento del plan).
    let vivo = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((r) => {
      if (vivo) setQuieto(r);
    });
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setQuieto);
    return () => {
      vivo = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (quieto) {
      cancelAnimation(cuadro);
      cuadro.value = 0;
      return;
    }
    cuadro.value = 0;
    cuadro.value = withRepeat(
      withTiming(CUADROS, {
        duration: (CUADROS / FPS) * 1000,
        easing: Easing.linear, // el tiempo del clip ya trae su propio ritmo
      }),
      -1,
      false
    );
    return () => cancelAnimation(cuadro);
  }, [quieto, cuadro, CUADROS]);

  /**
   * El desplazamiento va en PÍXELES ENTEROS DEL ATLAS, sin escalar.
   *
   * Escalar acá era lo que producía el hormigueo: con un factor no entero, cada
   * cuadro caía en una posición subpíxel distinta, el filtro de textura muestreaba
   * distinto en cada uno y la imagen "caminaba". Con offsets enteros, los 121
   * cuadros se muestrean exactamente igual y la imagen queda quieta.
   *
   * El tamaño de pantalla lo pone UN solo `scale` sobre el conjunto (abajo), no
   * este transform.
   */
  const animado = useAnimatedStyle(() => {
    "worklet";
    const k = Math.min(CUADROS - 1, Math.floor(cuadro.value));
    return {
      transform: [
        { translateX: -(k % COLUMNAS) * CELDA_ANCHO },
        { translateY: -Math.floor(k / COLUMNAS) * CELDA_ALTO },
      ],
    };
  });

  return (
    <View
      style={[{ width: w, height: h }, styles.ventana, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={etiqueta ?? A.etiqueta}
    >
      {/*
        Esta caja mide UNA celda en píxeles nativos y se escala desde su centro.
        Al centrarla en la ventana, la celda escalada la llena exacto — y como el
        escalado es uno solo para todos los cuadros, el muestreo es idéntico en
        todos. Ahí muere el hormigueo.
      */}
      <View
        style={[
          styles.celda,
          {
            width: CELDA_ANCHO,
            height: CELDA_ALTO,
            left: (w - CELDA_ANCHO) / 2,
            top: (h - CELDA_ALTO) / 2,
            transform: [{ scale: escala }],
          },
        ]}
      >
        <Animated.View style={animado}>
          <Image
            source={A.fuente}
            style={{ width: CELDA_ANCHO * COLUMNAS, height: CELDA_ALTO * FILAS }}
            contentFit="fill"
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ventana: { overflow: "hidden" },
  // `overflow: hidden` ES la animación: recorta el atlas a una sola celda.
  celda: { position: "absolute", overflow: "hidden" },
});
