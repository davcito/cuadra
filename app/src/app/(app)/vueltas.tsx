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

import { CalatoSprite } from "@/components/calato-sprite";
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
  Toldo,
} from "@/components/ui";
import { colores, esc, fuentes } from "@/lib/theme";
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
    <View style={[styles.ilustra, { backgroundColor: fondo, height: esc(alto) }]}>
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
            <View style={[styles.lomo, { height: esc(13), backgroundColor: "#F0A73F" }]} />
            <View style={[styles.lomo, { height: esc(17), backgroundColor: colores.papel }]} />
            <View style={[styles.lomo, { height: esc(10), backgroundColor: colores.categorias.caseros }]} />
          </View>
        </View>
      ) : (
        <View style={styles.ilustraCentro}>
          <View style={[styles.escalon, { width: esc(26), backgroundColor: "#8A5A12" }]} />
          <View style={[styles.escalon, { width: esc(44), backgroundColor: "#A06915" }]} />
          <View style={[styles.escalon, { width: esc(62), backgroundColor: "#8A5A12" }]} />
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

        {/* Separador: el TOLDO A RAYAS del prototipo (línea 325), no una barra
            lisa. Sale del kit — la pantalla no dibuja marca a mano. */}
        <Toldo style={styles.toldoSep} />

        {cargando ? (
          <ActivityIndicator color={colores.naranja} style={{ marginTop: esc(40) }} />
        ) : error ? (
          <Tarjeta style={styles.tarjeta}>
            <View style={styles.aviso}>
              <Etiqueta color={colores.error}>NO PUDIMOS TRAER LAS VUELTAS</Etiqueta>
              <Text style={styles.avisoTexto}>{error}</Text>
            </View>
          </Tarjeta>
        ) : vueltas.length === 0 ? (
          <View style={styles.vacio}>
            <CalatoSprite clip="culpa" alto={118} />
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
  scroll: { padding: esc(18), paddingBottom: esc(110), gap: esc(13) },
  encabezado: { gap: esc(3) },
  sub: { fontSize: esc(12), color: colores.textoSuave, fontFamily: fuentes.medium },
  // El alto, las rayas y los bordes los pone <Toldo>; acá solo su sitio
  // (prototipo: `padding: 11px 18px 0` + `border-radius: 4px`).
  toldoSep: { borderRadius: esc(4), marginBottom: esc(2) },
  tarjeta: { marginTop: 0 },
  fila: { flexDirection: "row", gap: esc(11), padding: esc(11) },
  filaTextos: { flex: 1, gap: esc(4) },
  filaTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titulo: { fontSize: esc(15), fontFamily: fuentes.extrabold, color: colores.tinta, lineHeight: esc(19) },
  meta: { fontSize: esc(11), color: colores.textoSuave, fontFamily: fuentes.medium },
  ilustra: {
    width: esc(76),
    borderRadius: esc(10),
    borderWidth: esc(2),
    borderColor: colores.tinta,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  ilustraCentro: { alignItems: "center", width: "100%" },
  toldo: {
    width: "82%",
    height: esc(10),
    backgroundColor: "#8F2117",
    borderTopLeftRadius: esc(5),
    borderTopRightRadius: esc(5),
  },
  puestoBase: {
    width: "66%",
    height: esc(26),
    backgroundColor: "#8F2117",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: esc(4),
  },
  puestoBlanco: { width: esc(9), height: esc(16), backgroundColor: colores.papel, borderTopLeftRadius: esc(2), borderTopRightRadius: esc(2) },
  puestoAmarillo: { width: esc(11), height: esc(11), backgroundColor: "#F0A73F", borderRadius: esc(2) },
  libreria: {
    width: "58%",
    height: esc(34),
    backgroundColor: "#0C5A4C",
    borderTopLeftRadius: esc(6),
    borderTopRightRadius: esc(6),
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: esc(3),
    paddingBottom: esc(5),
  },
  lomo: { width: esc(6) },
  escalon: { height: esc(10), borderTopLeftRadius: esc(3), borderTopRightRadius: esc(3) },
  aviso: { padding: esc(14), gap: esc(5) },
  avisoTexto: { fontSize: esc(12), color: colores.textoSuave, lineHeight: esc(17), fontFamily: fuentes.regular },
  vacio: { alignItems: "center", gap: esc(10), paddingVertical: esc(30) },
  vacioTexto: { fontSize: esc(13), color: colores.textoSuave, textAlign: "center", lineHeight: esc(19), fontFamily: fuentes.regular },
  llave: { flexDirection: "row", alignItems: "center", gap: esc(11), padding: esc(12) },
  llaveTexto: { flex: 1, fontSize: esc(12), color: colores.textoSuave, lineHeight: esc(17), fontFamily: fuentes.regular },
});
