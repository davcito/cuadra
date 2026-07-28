import { Tabs } from "expo-router";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect } from "react-native-svg";

import { colores, esc, fuentes, medidas } from "@/lib/theme";

/**
 * Barra de pestañas de Cuadra: panel tinta flotante con radio 18,
 * calcado del prototipo (sección 02). Cuatro destinos fijos:
 * Mapa · Vueltas · Álbum · Perfil.
 *
 * La dibujamos NOSOTROS (`tabBar=`) en vez de usar la de React Navigation:
 * su `BottomTabItem` trae `padding: 5` y `paddingVertical: 7` en su propio
 * StyleSheet, que `tabBarItemStyle` no alcanza. Con el alto exacto del
 * prototipo ese padding empujaba los rótulos FUERA del panel negro (RN no
 * recorta: se dibujaban encima del mapa). Regla del plan: si la primitiva no
 * puede copiar la spec, se sube de herramienta.
 */

const DESTINOS = [
  { ruta: "index", rotulo: "Mapa", icono: "mapa" },
  { ruta: "vueltas", rotulo: "Vueltas", icono: "vueltas" },
  { ruta: "album", rotulo: "Álbum", icono: "album" },
  { ruta: "perfil", rotulo: "Perfil", icono: "perfil" },
] as const;

function Icono({ nombre, activo }: { nombre: string; activo: boolean }) {
  const color = activo ? colores.naranja : colores.metadato;
  const base = { borderColor: color, borderWidth: esc(3) } as const;

  return (
    <View style={styles.iconoCaja}>
      {nombre === "mapa" ? (
        <View style={[styles.ico, base, { borderRadius: esc(5) }]} />
      ) : nombre === "vueltas" ? (
        <View
          style={[
            styles.ico,
            base,
            { borderRadius: 99, borderRightColor: "transparent" },
          ]}
        />
      ) : nombre === "album" ? (
        // El `borderStyle: dashed` de RN NO dibuja como el del prototipo: saca
        // dos trazos gordos por lado y el icono se lee como corchetes. SVG da
        // el guion real (prototipo: border 3px dashed, radio 3).
        <Svg width={medidas.iconoBarra} height={medidas.iconoBarra}>
          <Rect
            x={esc(1.5)}
            y={esc(1.5)}
            width={medidas.iconoBarra - esc(3)}
            height={medidas.iconoBarra - esc(3)}
            rx={esc(3)}
            fill="none"
            stroke={color}
            strokeWidth={esc(3)}
            strokeDasharray={`${esc(3)} ${esc(3)}`}
          />
        </Svg>
      ) : (
        // Perfil: 16×16 relleno con la esquina RECTA abajo-derecha
        // (prototipo: `border-radius: 50% 50% 0 50%` = TL TR BR BL).
        <View style={[styles.icoPerfil, { backgroundColor: color }]} />
      )}
    </View>
  );
}

function Rotulo({ children, activo }: { children: string; activo: boolean }) {
  return (
    <Text
      // La barra mide exacto: si el equipo tiene el texto del sistema en
      // grande, el rótulo de 9 px la desbordaría. Acá no escala.
      allowFontScaling={false}
      numberOfLines={1}
      style={[
        styles.rotulo,
        {
          color: activo ? colores.naranja : colores.metadato,
          fontFamily: activo ? fuentes.extrabold : fuentes.bold,
        },
      ]}
    >
      {children}
    </Text>
  );
}

function BarraCuadra({ state, navigation }: BottomTabBarProps) {
  // El indicador de home (iPhone) y la navegación por gestos (Android) miden
  // distinto en cada equipo: la barra se separa del borde con el inset REAL,
  // nunca con un número fijo. Piso = el margen del prototipo.
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[styles.barra, { bottom: Math.max(insets.bottom, medidas.barraMargen) }]}
    >
      {DESTINOS.map((destino) => {
        const indice = state.routes.findIndex((r) => r.name === destino.ruta);
        if (indice === -1) return null;

        const ruta = state.routes[indice];
        const activo = state.index === indice;

        return (
          <Pressable
            key={destino.ruta}
            style={styles.item}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={destino.rotulo}
            onPress={() => {
              const evento = navigation.emit({
                type: "tabPress",
                target: ruta.key,
                canPreventDefault: true,
              });
              if (!activo && !evento.defaultPrevented) {
                navigation.navigate(ruta.name);
              }
            }}
          >
            <Icono nombre={destino.icono} activo={activo} />
            <Rotulo activo={activo}>{destino.rotulo}</Rotulo>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function AppLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BarraCuadra {...props} />}>
      <Tabs.Screen name="index" options={{ title: "Mapa" }} />
      <Tabs.Screen name="vueltas" options={{ title: "Vueltas" }} />
      <Tabs.Screen name="album" options={{ title: "Álbum" }} />
      <Tabs.Screen name="perfil" options={{ title: "Perfil" }} />
      {/* Detalle de vuelta: navegable, fuera de la barra */}
      <Tabs.Screen name="vuelta/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barra: {
    position: "absolute",
    left: medidas.barraMargen,
    right: medidas.barraMargen,
    flexDirection: "row",
    alignItems: "center",
    // SIN alto fijo, igual que el prototipo (`padding: 9px 6px`): el alto sale
    // del contenido y así es IMPOSIBLE que un rótulo se salga del panel.
    // `medidas.barra` guarda el alto resultante (49) para que la tarjeta del
    // mapa sepa dónde apoyarse.
    paddingVertical: medidas.barraPaddingV,
    paddingHorizontal: medidas.barraPaddingH,
    backgroundColor: colores.tinta,
    borderRadius: 18,
    elevation: 8,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: medidas.gapBarra,
  },
  iconoCaja: {
    height: medidas.iconoBarra,
    alignItems: "center",
    justifyContent: "center",
  },
  ico: { width: medidas.iconoBarra, height: medidas.iconoBarra },
  icoPerfil: {
    width: medidas.iconoPerfil,
    height: medidas.iconoPerfil,
    borderRadius: medidas.iconoPerfil / 2, // 50%
    borderBottomRightRadius: 0, // la esquina recta va abajo-derecha
  },
  rotulo: { fontSize: medidas.rotuloBarra, lineHeight: medidas.rotuloBarraAlto },
});
