import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { CalatoVivo } from "@/components/calato-vivo";
import { colores, esc, fuentes } from "@/lib/theme";

/**
 * La CORTINA de Calato (ADR-0006, fase 1): en vez de spinners genéricos,
 * las transiciones importantes las tapa un panel papel que cruza la pantalla
 * con Calato trotando encima — el truco de identidad de Duolingo, en criollo.
 *
 * Uso: const { cortina } = useCalato();
 *      await cortina("Bienvenido a la cuadra");  // resuelve al CUBRIR:
 *      // ahí hacés el cambio de pantalla/estado y la salida la tapa sola.
 */

type Cortina = (mensaje?: string) => Promise<void>;

const Ctx = createContext<{ cortina: Cortina } | null>(null);

export function useCalato() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCalato necesita <CalatoProvider> en el árbol");
  return ctx;
}

export function CalatoProvider({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [activa, setActiva] = useState(false);
  const x = useSharedValue(0);

  const ocultar = useCallback(() => {
    setActiva(false);
    setMensaje(null);
  }, []);

  const cortina = useCallback<Cortina>(
    (msg) => {
      return new Promise((resolver) => {
        setMensaje(msg ?? null);
        setActiva(true);
        // entra desde la izquierda (cubre) → espera → sale por la derecha
        x.value = -width;
        x.value = withSequence(
          withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }, (fin) => {
            if (fin) runOnJS(resolver)();
          }),
          withDelay(
            950,
            withTiming(width, { duration: 400, easing: Easing.in(Easing.cubic) }, (fin) => {
              if (fin) runOnJS(ocultar)();
            })
          )
        );
      });
    },
    [ocultar, width, x]
  );

  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const valor = useMemo(() => ({ cortina }), [cortina]);

  return (
    <Ctx.Provider value={valor}>
      {children}
      {activa ? (
        <Animated.View style={[styles.cortina, anim]} pointerEvents="auto">
          <View style={[styles.barra, styles.barraArriba]} />
          <CalatoVivo estado="trotando" size={esc(132)} />
          {mensaje ? <Text style={styles.mensaje}>{mensaje}</Text> : null}
          <Text style={styles.pie}>CUADRA</Text>
          <View style={[styles.barra, styles.barraAbajo]} />
        </Animated.View>
      ) : null}
    </Ctx.Provider>
  );
}

const styles = StyleSheet.create({
  cortina: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colores.papel,
    alignItems: "center",
    justifyContent: "center",
    gap: esc(16),
    zIndex: 99,
    elevation: 20,
  },
  barra: {
    position: "absolute",
    left: 0,
    right: 0,
    height: esc(6),
    backgroundColor: colores.naranja,
  },
  barraArriba: { top: 0 },
  barraAbajo: { bottom: 0 },
  mensaje: { fontSize: esc(17), fontFamily: fuentes.extrabold, color: colores.tinta },
  pie: {
    fontSize: esc(11),
    fontFamily: fuentes.extrabold,
    letterSpacing: esc(3),
    color: colores.metadato,
    marginTop: esc(2),
  },
});
