import { type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { colores, escala, radios } from "@/lib/theme";

/**
 * Kit de UI de Cuadra — la traducción a código de los componentes de la
 * guía de identidad V1.3 (secciones 05 y 06) y del prototipo de pantallas.
 * Regla de marca: borde tinta 2px + sombra DURA desplazada (sin blur),
 * texto tinta sobre naranja (nunca blanco), radio 14/16.
 */

/** Sombra dura de marca: una View desplazada detrás, sin blur. */
export function SombraDura({
  children,
  offset = 3,
  radio = radios.tarjeta,
  style,
}: {
  children: ReactNode;
  offset?: number;
  radio?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style}>
      <View
        style={[
          styles.sombra,
          { top: offset, left: offset, borderRadius: radio },
        ]}
      />
      {children}
    </View>
  );
}

export function Tarjeta({
  children,
  style,
  fondo = colores.papel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  fondo?: string;
}) {
  return (
    <SombraDura style={style}>
      <View style={[styles.tarjeta, { backgroundColor: fondo }]}>{children}</View>
    </SombraDura>
  );
}

type BotonProps = {
  children: string;
  onPress?: () => void;
  variante?: "naranja" | "oro" | "linea";
  deshabilitado?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Boton({
  children,
  onPress,
  variante = "naranja",
  deshabilitado,
  style,
}: BotonProps) {
  const fondo =
    deshabilitado
      ? "#E2D6BF"
      : variante === "oro"
        ? colores.categorias.huacas
        : variante === "linea"
          ? "transparent"
          : colores.naranja;

  const cuerpo = (
    <View
      style={[
        styles.boton,
        { backgroundColor: fondo },
        deshabilitado && { borderColor: "#C9BCA3" },
      ]}
    >
      <Text
        style={[
          styles.botonTexto,
          deshabilitado && { color: colores.metadato },
        ]}
      >
        {children}
      </Text>
    </View>
  );

  // La variante de línea no lleva sombra (guía 05).
  return (
    <Pressable onPress={deshabilitado ? undefined : onPress} style={style} disabled={deshabilitado}>
      {variante === "linea" || deshabilitado ? (
        cuerpo
      ) : (
        <SombraDura offset={4} radio={radios.boton}>
          {cuerpo}
        </SombraDura>
      )}
    </Pressable>
  );
}

export function Chip({
  children,
  fondo = colores.tinta,
  color = colores.papel,
  style,
}: {
  children: ReactNode;
  fondo?: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: fondo }, style]}>
      <Text style={[styles.chipTexto, { color }]}>{children}</Text>
    </View>
  );
}

/** Dificultad en jerga propia: Tranqui · Piernas · Leyenda (1–3). */
export function Dificultad({ nivel }: { nivel: number }) {
  const nombres = ["Tranqui", "Piernas", "Leyenda"];
  return (
    <View style={styles.dificultad}>
      {[1, 2, 3].map((n) => (
        <View key={n} style={n <= nivel ? styles.punto : styles.puntoOff} />
      ))}
      <Text style={styles.dificultadTexto}>{nombres[Math.min(nivel, 3) - 1]}</Text>
    </View>
  );
}

export const COLOR_CATEGORIA: Record<string, string> = {
  huarique: colores.categorias.huariques,
  caleta: colores.categorias.caletas,
  huaca: colores.categorias.huacas,
  casero: colores.categorias.caseros,
};

export const NOMBRE_CATEGORIA: Record<string, string> = {
  huarique: "HUARIQUES",
  caleta: "CALETAS",
  huaca: "HUACAS",
  casero: "CASEROS",
};

/** Título display de pantalla (Alfa Slab One cuando las fuentes estén cableadas). */
export function TituloDisplay({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.display, style]}>{children}</Text>;
}

export function Etiqueta({ children, color = colores.metadato }: { children: ReactNode; color?: string }) {
  return <Text style={[styles.etiqueta, { color }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  sombra: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: colores.tinta,
  },
  tarjeta: {
    borderWidth: 2,
    borderColor: colores.tinta,
    borderRadius: radios.tarjeta,
    overflow: "hidden",
  },
  boton: {
    borderWidth: 2,
    borderColor: colores.tinta,
    borderRadius: radios.boton,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  botonTexto: {
    fontSize: 15,
    fontWeight: "800",
    color: colores.tinta, // nunca blanco sobre naranja (guía 06)
  },
  chip: {
    borderRadius: radios.chip,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  chipTexto: { fontSize: 10, fontWeight: "800", letterSpacing: 0.9 },
  dificultad: { flexDirection: "row", alignItems: "center", gap: 4 },
  punto: { width: 7, height: 7, borderRadius: 4, backgroundColor: colores.tinta },
  puntoOff: {
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colores.tinta,
  },
  dificultadTexto: {
    fontSize: 10,
    fontWeight: "700",
    color: colores.textoSuave,
    marginLeft: 3,
  },
  display: {
    fontSize: escala.h1.fontSize,
    lineHeight: escala.h1.lineHeight,
    fontWeight: "900",
    color: colores.tinta,
    letterSpacing: -0.5,
  },
  etiqueta: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
});
