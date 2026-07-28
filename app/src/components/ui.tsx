import { type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";

import { colores, esc, escala, fuentes, medidas, radios, sombras } from "@/lib/theme";

/**
 * Kit de UI de Cuadra — la traducción a código de los componentes de la
 * guía de identidad V1.3 (secciones 05 y 06) y del prototipo de pantallas.
 * Regla de marca: borde tinta 2px + sombra DURA desplazada (sin blur),
 * texto tinta sobre naranja (nunca blanco), radio 14/16.
 */

/** Sombra dura de marca: una View desplazada detrás, sin blur. */
export function SombraDura({
  children,
  offset = sombras.tarjeta,
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
  // La variante de línea NUNCA se rellena, ni siquiera deshabilitada:
  // solo se apaga el borde y el texto. Rellenarla la haría leer como un
  // botón primario apagado y competiría con el de verdad.
  const esLinea = variante === "linea";
  const fondo = esLinea
    ? "transparent"
    : deshabilitado
      ? "#E2D6BF"
      : variante === "oro"
        ? colores.categorias.huacas
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
        <SombraDura offset={sombras.boton} radio={radios.boton}>
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

/**
 * Toldo a rayas — el toldo del mercado como recurso de marca. Separa
 * secciones y corona la pantalla de entrada (prototipo, pantallas 2 y 5).
 */
export function Toldo({ style }: { style?: StyleProp<ViewStyle> }) {
  // Rayas de ANCHO FIJO 14 (prototipo: `repeating-linear-gradient(90deg,
  // var(--hua) 0 14px, #FFFDF8 14px 28px)`). Antes eran 14 rayas con `flex: 1`,
  // así que en un iPhone de 430 pt cada raya medía 31 pt — más del doble de
  // la spec, y encima cambiaba de ancho según el equipo. Se dibujan de más y
  // el `overflow: hidden` del contenedor las recorta.
  return (
    <View style={[styles.toldo, style]}>
      {Array.from({ length: 40 }, (_, i) => (
        <View
          key={i}
          style={{
            width: medidas.toldoRaya,
            backgroundColor: i % 2 === 0 ? colores.categorias.huariques : colores.papelVivo,
          }}
        />
      ))}
    </View>
  );
}

/**
 * Isotipo "La Vuelta" (dirección A de la guía, sección 01): la manzana con
 * el trazo abierto — la vuelta que falta caminar — y el punto naranja que
 * sos vos. Va junto al wordmark y como pin del mapa.
 */
export function Isotipo({ size = 42 }: { size?: number }) {
  // El prototipo usa pathLength=100 (dash 82/18, offset -34), pero
  // react-native-svg no soporta pathLength: se traduce a unidades absolutas.
  // Perímetro del rect redondeado = 2(w−2r) + 2(h−2r) + 2πr con w=h=34, r=10.
  const perimetro = 2 * (34 - 20) + 2 * (34 - 20) + 2 * Math.PI * 10; // ≈ 118.83
  const trazo = perimetro * 0.82;
  const hueco = perimetro * 0.18;

  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Rect
        x={7}
        y={7}
        width={34}
        height={34}
        rx={10}
        fill="none"
        stroke={colores.tinta}
        strokeWidth={6}
        strokeDasharray={`${trazo} ${hueco}`}
        strokeDashoffset={-perimetro * 0.34}
        strokeLinecap="round"
      />
      <Circle cx={40} cy={8} r={6} fill={colores.naranja} />
    </Svg>
  );
}

/** Campo de formulario con su etiqueta encima (prototipo, pantalla 2). */
export function Campo({
  etiqueta,
  style,
  ...props
}: TextInputProps & { etiqueta: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 7 }, style]}>
      <Etiqueta>{etiqueta}</Etiqueta>
      <TextInput
        style={styles.campo}
        placeholderTextColor="#B8AC9A"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sombra: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: colores.tinta,
  },
  tarjeta: {
    // El prototipo pinta `.card` de papel. Sin esto la tarjeta es transparente
    // y sobre el mapa se ve el mapa a través — por eso la pantalla del mapa se
    // dibujaba su propia tarjeta con fondo en vez de usar el kit.
    backgroundColor: colores.papel,
    borderWidth: esc(2),
    borderColor: colores.tinta,
    borderRadius: radios.tarjeta,
    overflow: "hidden",
  },
  boton: {
    borderWidth: esc(2),
    borderColor: colores.tinta,
    borderRadius: radios.boton,
    // El prototipo dice `padding: 13px` parejo; teníamos 14/20.
    paddingVertical: esc(13),
    paddingHorizontal: esc(13),
    alignItems: "center",
    justifyContent: "center",
    // 13 + 18 (línea de 15 px) + 13 + 4 de borde = 48, el alto natural del
    // prototipo. Sigue por encima del mínimo táctil de 44 pt de Apple.
    minHeight: esc(48),
  },
  botonTexto: {
    fontSize: esc(15),
    fontFamily: fuentes.extrabold,
    color: colores.tinta, // nunca blanco sobre naranja (guía 06)
  },
  chip: {
    borderRadius: radios.chip,
    paddingHorizontal: esc(10),
    paddingVertical: esc(4),
    alignSelf: "flex-start",
    // `.chip` es `inline-flex; align-items:center; gap:5px` — hace falta para
    // los chips con icono, como la llamita de la racha.
    flexDirection: "row",
    alignItems: "center",
    gap: esc(5),
  },
  chipTexto: { fontSize: esc(10), fontFamily: fuentes.extrabold, letterSpacing: esc(0.9) },
  dificultad: { flexDirection: "row", alignItems: "center", gap: esc(4) },
  punto: {
    width: esc(7),
    height: esc(7),
    borderRadius: esc(4),
    backgroundColor: colores.tinta,
  },
  puntoOff: {
    width: esc(7),
    height: esc(7),
    borderRadius: esc(4),
    borderWidth: esc(2),
    borderColor: colores.tinta,
  },
  dificultadTexto: {
    fontSize: esc(10),
    fontFamily: fuentes.bold,
    color: colores.textoSuave,
    marginLeft: esc(3),
  },
  display: {
    ...escala.h1, // Alfa Slab One 28/32 — el titular de pantalla de la guía
    color: colores.tinta,
  },
  etiqueta: { fontSize: esc(10), fontFamily: fuentes.extrabold, letterSpacing: esc(1.2) },
  toldo: {
    // 14 = 10 de raya + 2 + 2 de borde. En CSS el `.toldo` es content-box
    // (height:10 MÁS los bordes); en RN el borde va dentro de la caja, así que
    // el alto total tiene que declararse sumado. Antes decía 12 = 2 px menos.
    height: esc(14),
    flexDirection: "row",
    overflow: "hidden",
    borderTopWidth: esc(2),
    borderBottomWidth: esc(2),
    borderColor: colores.tinta,
  },
  campo: {
    backgroundColor: "#FFFFFF",
    borderWidth: esc(2),
    borderColor: colores.tinta,
    borderRadius: radios.campo,
    // Spec del prototipo: `padding: 12px 14px; font-size: 14px`.
    paddingHorizontal: esc(14),
    paddingVertical: esc(12),
    fontSize: esc(14),
    fontFamily: fuentes.regular,
    color: colores.tinta,
  },
});
