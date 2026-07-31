import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import {
  ALCANCES_VUELTAS,
  datosAlcance,
  type AlcanceVueltas,
} from "@/lib/alcance-vueltas";
import { colores, esc, fuentes, radios } from "@/lib/theme";

const CLAVE_AYUDA = "cuadra:selector-alcance-visto:v1";

export function SelectorAlcance({
  valor,
  onChange,
  sobreMapa = false,
}: {
  valor: AlcanceVueltas;
  onChange: (valor: AlcanceVueltas) => void;
  sobreMapa?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const actual = datosAlcance(valor);

  // El mapa explica el control abriéndolo una sola vez. Luego queda compacto:
  // la flecha, el valor actual y el estado de accesibilidad indican que se toca.
  useEffect(() => {
    if (!sobreMapa) return;
    let activo = true;

    void AsyncStorage.getItem(CLAVE_AYUDA)
      .then((visto) => {
        if (!activo || visto === "si") return;
        setAbierto(true);
        return AsyncStorage.setItem(CLAVE_AYUDA, "si");
      })
      .catch(() => {
        if (activo) setAbierto(true);
      });

    return () => {
      activo = false;
    };
  }, [sobreMapa]);

  return (
    <Animated.View
      entering={FadeInDown.duration(240)}
      style={[styles.caja, sobreMapa && styles.cajaMapa]}
    >
      <Pressable
        onPress={() => setAbierto((valorActual) => !valorActual)}
        style={({ pressed }) => [
          styles.disparador,
          !sobreMapa && styles.disparadorFueraMapa,
          pressed && styles.presionado,
        ]}
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        accessibilityLabel={`Hasta dónde vamos: ${actual.nombre}, ${actual.detalle}`}
        accessibilityHint={abierto ? "Oculta las distancias" : "Muestra las distancias"}
      >
        <View style={styles.disparadorTextos}>
          <Text style={styles.pregunta}>¿Hasta dónde vamos?</Text>
          <Text style={styles.valorActual} numberOfLines={1}>
            {actual.nombre} · {actual.detalle}
          </Text>
        </View>
        <View style={[styles.chevron, abierto && styles.chevronAbierto]}>
          <Svg width={esc(20)} height={esc(20)} viewBox="0 0 24 24">
            <Path
              d="m6 9 6 6 6-6"
              fill="none"
              stroke={colores.tinta}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      </Pressable>

      {abierto ? (
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOutUp.duration(150)}
          style={[styles.panel, !sobreMapa && styles.panelFueraMapa]}
          accessibilityRole="radiogroup"
        >
          {ALCANCES_VUELTAS.map((opcion) => {
            const activa = opcion.id === valor;
            return (
              <Pressable
                key={opcion.id}
                onPress={() => {
                  onChange(opcion.id);
                  setAbierto(false);
                }}
                style={({ pressed }) => [
                  styles.opcion,
                  activa && styles.opcionActiva,
                  pressed && styles.presionado,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: activa }}
                accessibilityLabel={`${opcion.nombre}, ${opcion.detalle}`}
              >
                <View style={styles.opcionTextos}>
                  <Text style={[styles.opcionNombre, activa && styles.opcionNombreActiva]}>
                    {opcion.nombre}
                  </Text>
                  <Text style={styles.opcionDetalle}>{opcion.detalle}</Text>
                </View>
                {activa ? <IconoCheck /> : null}
              </Pressable>
            );
          })}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function IconoCheck() {
  return (
    <View style={styles.check}>
      <Svg width={esc(16)} height={esc(16)} viewBox="0 0 20 20">
        <Path
          d="m4 10 4 4 8-9"
          fill="none"
          stroke={colores.papelVivo}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { gap: esc(7) },
  cajaMapa: {
    backgroundColor: "rgba(251,247,240,0.96)",
    borderWidth: esc(1),
    borderColor: "rgba(31,27,22,0.18)",
    borderRadius: radios.flotante,
    shadowColor: colores.tinta,
    shadowOpacity: 0.15,
    shadowRadius: esc(9),
    shadowOffset: { width: 0, height: esc(3) },
    elevation: 7,
  },
  disparador: {
    minHeight: esc(58),
    flexDirection: "row",
    alignItems: "center",
    gap: esc(10),
    paddingVertical: esc(8),
    paddingLeft: esc(13),
    paddingRight: esc(11),
    borderRadius: radios.flotante,
  },
  disparadorFueraMapa: {
    borderWidth: esc(2),
    borderColor: colores.tinta,
    backgroundColor: colores.papelVivo,
  },
  disparadorTextos: { flex: 1, minWidth: 0, gap: esc(2) },
  pregunta: { fontSize: esc(11), color: colores.textoSuave, fontFamily: fuentes.bold },
  valorActual: { fontSize: esc(13), color: colores.tinta, fontFamily: fuentes.extrabold },
  chevron: {
    width: esc(36),
    height: esc(36),
    borderRadius: esc(18),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colores.naranja,
    borderWidth: esc(2),
    borderColor: colores.tinta,
  },
  chevronAbierto: { transform: [{ rotate: "180deg" }] },
  panel: {
    marginHorizontal: esc(7),
    marginBottom: esc(7),
    padding: esc(5),
    gap: esc(3),
    borderTopWidth: esc(1),
    borderTopColor: "rgba(31,27,22,0.16)",
  },
  panelFueraMapa: {
    marginHorizontal: 0,
    marginBottom: 0,
    borderWidth: esc(2),
    borderColor: colores.tinta,
    borderRadius: radios.flotante,
    backgroundColor: colores.papelVivo,
  },
  opcion: {
    minHeight: esc(48),
    flexDirection: "row",
    alignItems: "center",
    gap: esc(10),
    paddingHorizontal: esc(10),
    paddingVertical: esc(6),
    borderRadius: radios.campo,
  },
  opcionActiva: { backgroundColor: "rgba(232,98,44,0.16)" },
  opcionTextos: { flex: 1, minWidth: 0 },
  opcionNombre: { fontSize: esc(12), color: colores.tinta, fontFamily: fuentes.bold },
  opcionNombreActiva: { fontFamily: fuentes.extrabold },
  opcionDetalle: { fontSize: esc(10), color: colores.textoSuave, fontFamily: fuentes.medium },
  check: {
    width: esc(26),
    height: esc(26),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: esc(13),
    backgroundColor: colores.tinta,
  },
  presionado: { opacity: 0.8, transform: [{ scale: 0.98 }] },
});
