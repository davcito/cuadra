import { Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colores, fuentes } from "@/lib/theme";

/**
 * Barra de pestañas de Cuadra: panel tinta flotante con radio 18,
 * calcado del prototipo (sección 02). Cuatro destinos fijos:
 * Mapa · Vueltas · Álbum · Perfil.
 */

function Icono({ nombre, activo }: { nombre: string; activo: boolean }) {
  const color = activo ? colores.naranja : colores.metadato;
  const base = { borderColor: color, borderWidth: 3 } as const;

  return (
    <View style={styles.iconoCaja}>
      {nombre === "mapa" ? (
        <View style={[styles.ico, base, { borderRadius: 5 }]} />
      ) : nombre === "vueltas" ? (
        <View
          style={[
            styles.ico,
            base,
            { borderRadius: 99, borderRightColor: "transparent" },
          ]}
        />
      ) : nombre === "album" ? (
        <View style={[styles.ico, base, { borderRadius: 3, borderStyle: "dashed" }]} />
      ) : (
        <View
          style={[
            styles.ico,
            { backgroundColor: color, borderRadius: 99, borderBottomLeftRadius: 2 },
          ]}
        />
      )}
    </View>
  );
}

function Rotulo({ children, activo }: { children: string; activo: boolean }) {
  return (
    <Text
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

export default function AppLayout() {
  // El indicador de home (iPhone) y la navegación por gestos (Android) miden
  // distinto en cada equipo: la barra se separa del borde con el inset REAL,
  // nunca con un número fijo. Piso de 12 px para equipos sin inset.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.barra, { bottom: Math.max(insets.bottom, 12) }],
        tabBarItemStyle: styles.item,
        tabBarShowLabel: true,
        tabBarBackground: () => null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Mapa",
          tabBarIcon: ({ focused }) => <Icono nombre="mapa" activo={focused} />,
          tabBarLabel: ({ focused }) => <Rotulo activo={focused}>Mapa</Rotulo>,
        }}
      />
      <Tabs.Screen
        name="vueltas"
        options={{
          title: "Vueltas",
          tabBarIcon: ({ focused }) => <Icono nombre="vueltas" activo={focused} />,
          tabBarLabel: ({ focused }) => <Rotulo activo={focused}>Vueltas</Rotulo>,
        }}
      />
      <Tabs.Screen
        name="album"
        options={{
          title: "Álbum",
          tabBarIcon: ({ focused }) => <Icono nombre="album" activo={focused} />,
          tabBarLabel: ({ focused }) => <Rotulo activo={focused}>Álbum</Rotulo>,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ focused }) => <Icono nombre="perfil" activo={focused} />,
          tabBarLabel: ({ focused }) => <Rotulo activo={focused}>Perfil</Rotulo>,
        }}
      />
      {/* Detalle de vuelta: navegable, fuera de la barra */}
      <Tabs.Screen name="vuelta/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barra: {
    position: "absolute",
    left: 14,
    right: 14,
    height: 62,
    backgroundColor: colores.tinta,
    borderRadius: 18,
    borderTopWidth: 0,
    paddingBottom: 6,
    paddingTop: 8,
    elevation: 8,
  },
  item: { paddingTop: 2 },
  iconoCaja: { height: 20, alignItems: "center", justifyContent: "center" },
  ico: { width: 17, height: 17 },
  rotulo: { fontSize: 9, marginTop: 1 },
});
