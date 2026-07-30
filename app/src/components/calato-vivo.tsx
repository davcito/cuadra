import { useEffect } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Image } from "expo-image";

import { calato, colores, esc } from "@/lib/theme";

/**
 * Calato "títere" — fase 1 del sistema de mascota (ADR-0006).
 * Los renders oficiales (docs/identidad/calato/) cobran vida con
 * micro-animación de Reanimated: pop de entrada con rebote, respiración
 * en reposo, trote, salto de celebración y vaivén de culpa. Compatible
 * con Expo Go (cero dependencias nativas nuevas).
 */

export type EstadoCalato =
  | "tranqui" // reposo: respira
  | "atento" // enderezado, respira más corto
  | "trotando" // camino al lugar: rebota al trote
  | "chapada" // celebración: salta
  | "culpa" // racha en riesgo/perdida: se encoge y se mece
  | "juzgando"; // segunda insistencia: respira, te mira

const ASSETS: Record<EstadoCalato, number> = {
  tranqui: require("../../assets/calato/base.jpg"),
  atento: require("../../assets/calato/retrato.jpg"),
  trotando: require("../../assets/calato/trote.jpg"),
  chapada: require("../../assets/calato/chapada.jpg"),
  culpa: require("../../assets/calato/culpa.jpg"),
  juzgando: require("../../assets/calato/juzgando.jpg"),
};

type Props = {
  estado?: EstadoCalato;
  /** Diámetro del círculo en px. */
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export function CalatoVivo({ estado = "tranqui", size = esc(96), style }: Props) {
  const entrada = useSharedValue(0.6);
  const respira = useSharedValue(1);
  const saltoY = useSharedValue(0);
  const giro = useSharedValue(0);

  // Pop de entrada: nunca aparece de golpe, siempre rebota (squash & stretch).
  useEffect(() => {
    entrada.value = 0.6;
    entrada.value = withSpring(1, { damping: 9, stiffness: 210, mass: 0.7 });
  }, [entrada]);

  // Animación continua según el estado.
  useEffect(() => {
    cancelAnimation(respira);
    cancelAnimation(saltoY);
    cancelAnimation(giro);
    respira.value = 1;
    saltoY.value = 0;
    giro.value = 0;

    switch (estado) {
      case "tranqui":
      case "juzgando":
        respira.value = withRepeat(
          withTiming(1.025, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
          -1,
          true
        );
        break;
      case "atento":
        respira.value = withRepeat(
          withTiming(1.03, { duration: 900, easing: Easing.inOut(Easing.quad) }),
          -1,
          true
        );
        break;
      case "trotando":
        saltoY.value = withRepeat(
          withTiming(-4, { duration: 270, easing: Easing.inOut(Easing.quad) }),
          -1,
          true
        );
        break;
      case "chapada":
        saltoY.value = withRepeat(
          withSequence(
            withTiming(-9, { duration: 190, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 260, easing: Easing.bounce })
          ),
          -1,
          false
        );
        giro.value = withRepeat(
          withSequence(
            withTiming(-3, { duration: 150 }),
            withTiming(3, { duration: 150 }),
            withTiming(0, { duration: 150 })
          ),
          -1,
          true
        );
        break;
      case "culpa":
        saltoY.value = withTiming(3, { duration: 500 });
        giro.value = -1.6;
        giro.value = withRepeat(
          withTiming(1.6, { duration: 2400, easing: Easing.inOut(Easing.quad) }),
          -1,
          true
        );
        break;
    }
  }, [estado, respira, saltoY, giro]);

  const anim = useAnimatedStyle(() => ({
    transform: [
      { translateY: saltoY.value },
      { scale: entrada.value * respira.value },
      { rotate: `${giro.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, anim, style]}>
      {/* sombra dura de marca: plana, desplazada, sin blur */}
      <View style={[styles.sombra, { borderRadius: size / 2 }]} />
      <View style={[styles.circulo, { borderRadius: size / 2 }]}>
        <Image
          source={ASSETS[estado]}
          style={styles.img}
          contentFit="cover"
          transition={140}
          accessibilityLabel={`Calato ${estado}`}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sombra: {
    position: "absolute",
    top: esc(3),
    left: esc(3),
    width: "100%",
    height: "100%",
    backgroundColor: colores.tinta,
  },
  circulo: {
    flex: 1,
    borderWidth: esc(2.5),
    borderColor: colores.tinta,
    overflow: "hidden",
    backgroundColor: calato.panza,
  },
  img: { width: "100%", height: "100%" },
});
