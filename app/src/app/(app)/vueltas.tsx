import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { CalatoVivo } from "@/components/calato-vivo";
import {
  Boton,
  Chip,
  COLOR_CATEGORIA,
  Dificultad,
  Etiqueta,
  NOMBRE_CATEGORIA,
  Tarjeta,
  TituloDisplay,
} from "@/components/ui";
import { colores } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

/** Una Vuelta con el POI resuelto (lo que devuelve la query). */
export type Vuelta = {
  id: number;
  titulo: string;
  descripcion: string;
  categoria: string;
  dificultad: number;
  calle_xp: number;
  instruccion_verificacion: string | null;
  pois: { nombre: string; categoria: string } | null;
};

/** Ilustración mínima del lugar: 3–4 formas planas sobre el color de su categoría. */
export function IlustracionLugar({ categoria, alto = 76 }: { categoria: string; alto?: number }) {
  const fondo = COLOR_CATEGORIA[categoria] ?? colores.categorias.huariques;

  return (
    <View style={[styles.ilustra, { backgroundColor: fondo, height: alto }]}>
      {categoria === "huarique" ? (
        <View style={styles.ilustraCentro}>
          <View style={styles.toldo} />
          <View style={styles.puestoBase}>
            <View style={styles.puestoBlanco} />
            <View style={styles.puestoAmarillo} />
          </View>
        </View>
      ) : categoria === "caleta" ? (
        <View style={styles.ilustraCentro}>
          <View style={styles.libreria}>
            <View style={[styles.lomo, { height: 13, backgroundColor: "#F0A73F" }]} />
            <View style={[styles.lomo, { height: 17, backgroundColor: colores.papel }]} />
            <View style={[styles.lomo, { height: 10, backgroundColor: colores.categorias.caseros }]} />
          </View>
        </View>
      ) : (
        <View style={styles.ilustraCentro}>
          <View style={[styles.escalon, { width: 26, backgroundColor: "#8A5A12" }]} />
          <View style={[styles.escalon, { width: 44, backgroundColor: "#A06915" }]} />
          <View style={[styles.escalon, { width: 62, backgroundColor: "#8A5A12" }]} />
        </View>
      )}
    </View>
  );
}

export default function VueltasScreen() {
  const router = useRouter();
  const [vueltas, setVueltas] = useState<Vuelta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    const { data, error } = await supabase
      .from("missions")
      .select(
        "id, titulo, descripcion, categoria, dificultad, calle_xp, instruccion_verificacion, pois(nombre, categoria)"
      )
      .eq("estado", "activa")
      .limit(3);

    if (error) setError(error.message);
    else setVueltas((data ?? []) as unknown as Vuelta[]);
    setCargando(false);
    setRefrescando(false);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => {
              setRefrescando(true);
              void cargar();
            }}
            tintColor={colores.naranja}
          />
        }
      >
        <View style={styles.encabezado}>
          <TituloDisplay>Las vueltas de hoy</TituloDisplay>
          <Text style={styles.sub}>
            Se renuevan a medianoche · 0 de {vueltas.length || 3} chapadas
          </Text>
        </View>

        {/* separador toldo a rayas */}
        <View style={styles.toldoSep} />

        {cargando ? (
          <ActivityIndicator color={colores.naranja} style={{ marginTop: 40 }} />
        ) : error ? (
          <Tarjeta style={styles.tarjeta}>
            <View style={styles.aviso}>
              <Etiqueta color={colores.error}>NO PUDIMOS TRAER LAS VUELTAS</Etiqueta>
              <Text style={styles.avisoTexto}>{error}</Text>
            </View>
          </Tarjeta>
        ) : vueltas.length === 0 ? (
          <View style={styles.vacio}>
            <CalatoVivo estado="culpa" size={118} />
            <TituloDisplay style={{ textAlign: "center" }}>
              Ya chapaste{"\n"}las de hoy
            </TituloDisplay>
            <Text style={styles.vacioTexto}>
              Calato dice que está bien. Lo dice con esa cara.
            </Text>
          </View>
        ) : (
          vueltas.map((v) => (
            <Pressable
              key={v.id}
              onPress={() =>
                router.push({ pathname: "/vuelta/[id]", params: { id: String(v.id) } })
              }
            >
              <Tarjeta style={styles.tarjeta}>
                <View style={styles.fila}>
                  <IlustracionLugar categoria={v.categoria} />
                  <View style={styles.filaTextos}>
                    <View style={styles.filaTop}>
                      <Chip
                        fondo={COLOR_CATEGORIA[v.categoria] ?? colores.categorias.huariques}
                        color={colores.papel}
                      >
                        {NOMBRE_CATEGORIA[v.categoria] ?? v.categoria.toUpperCase()}
                      </Chip>
                      <Dificultad nivel={v.dificultad} />
                    </View>
                    <Text style={styles.titulo} numberOfLines={2}>
                      {v.titulo}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {v.pois?.nombre ?? "Barranco"}
                    </Text>
                    <View style={styles.filaTop}>
                      <Etiqueta color={colores.naranja}>+{v.calle_xp} CALLE</Etiqueta>
                      <Etiqueta>N.º {String(v.id).padStart(3, "0")}</Etiqueta>
                    </View>
                  </View>
                </View>
              </Tarjeta>
            </Pressable>
          ))
        )}

        <Tarjeta style={styles.tarjeta} fondo="#FFFFFF">
          <View style={styles.llave}>
            <CalatoVivo estado="juzgando" size={40} />
            <Text style={styles.llaveTexto}>
              ¿Ninguna te convence? Con La Llave las pedís a medida.
            </Text>
          </View>
        </Tarjeta>
        <Boton variante="oro" style={styles.tarjeta}>
          Conseguir La Llave
        </Boton>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colores.papel },
  scroll: { padding: 18, paddingBottom: 110, gap: 13 },
  encabezado: { gap: 3 },
  sub: { fontSize: 12, color: colores.textoSuave, fontWeight: "500" },
  toldoSep: {
    height: 10,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colores.tinta,
    backgroundColor: colores.categorias.huariques,
    marginBottom: 2,
  },
  tarjeta: { marginTop: 0 },
  fila: { flexDirection: "row", gap: 11, padding: 11 },
  filaTextos: { flex: 1, gap: 4 },
  filaTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titulo: { fontSize: 15, fontWeight: "800", color: colores.tinta, lineHeight: 19 },
  meta: { fontSize: 11, color: colores.textoSuave, fontWeight: "500" },
  ilustra: {
    width: 76,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colores.tinta,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  ilustraCentro: { alignItems: "center", width: "100%" },
  toldo: {
    width: "82%",
    height: 10,
    backgroundColor: "#8F2117",
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  puestoBase: {
    width: "66%",
    height: 26,
    backgroundColor: "#8F2117",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
  },
  puestoBlanco: { width: 9, height: 16, backgroundColor: colores.papel, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  puestoAmarillo: { width: 11, height: 11, backgroundColor: "#F0A73F", borderRadius: 2 },
  libreria: {
    width: "58%",
    height: 34,
    backgroundColor: "#0C5A4C",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 3,
    paddingBottom: 5,
  },
  lomo: { width: 6 },
  escalon: { height: 10, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  aviso: { padding: 14, gap: 5 },
  avisoTexto: { fontSize: 12, color: colores.textoSuave, lineHeight: 17 },
  vacio: { alignItems: "center", gap: 10, paddingVertical: 30 },
  vacioTexto: { fontSize: 13, color: colores.textoSuave, textAlign: "center", lineHeight: 19 },
  llave: { flexDirection: "row", alignItems: "center", gap: 11, padding: 12 },
  llaveTexto: { flex: 1, fontSize: 12, color: colores.textoSuave, lineHeight: 17 },
});
