import { useCallback, useEffect, useMemo, useState } from "react";
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
import Animated, { FadeInDown } from "react-native-reanimated";

import { CalatoSprite } from "@/components/calato-sprite";
import { CalatoVivo } from "@/components/calato-vivo";
import { SelectorAlcance } from "@/components/selector-alcance";
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
import {
  filtrarVueltasPorAlcance,
  siguienteAlcance,
} from "@/lib/alcance-vueltas";
import { colores, esc, fuentes } from "@/lib/theme";
import { ubicacionActual } from "@/lib/chapar";
import { esModoSeguroNocturno } from "@/lib/disponibilidad";
import { textoCuadras } from "@/lib/geo";
import {
  MODO_PRUEBA_VUELTAS,
  NOMBRE_ZONA_PRUEBA,
} from "@/lib/modo-prueba";
import { useAlcanceVueltas } from "@/lib/use-alcance-vueltas";
import { buscarVueltasDisponibles, type VueltaCerca } from "@/lib/vueltas-cerca";

/** Una Vuelta con el POI resuelto (lo que devuelve la query). */
export type Vuelta = VueltaCerca & {
  pois?: { nombre: string; categoria: string; lat?: number; lng?: number } | null;
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
  const { alcance, cambiarAlcance } = useAlcanceVueltas();
  const [catalogo, setCatalogo] = useState<Vuelta[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const donde = await ubicacionActual({ pedir: true });
      if (!donde) {
        setCatalogo([]);
        setError("Activá la ubicación para buscar Vueltas cerca tuyo.");
        return;
      }

      // Una sola fuente de verdad para mapa y lista: esta RPC ordena por
      // distancia y aplica horario, temporada y modo seguro igual que chapar().
      setCatalogo((await buscarVueltasDisponibles(donde, 200)) as Vuelta[]);
    } catch (e) {
      setCatalogo([]);
      setError(e instanceof Error ? e.message : "No pudimos buscar Vueltas cerca tuyo.");
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const nocheSegura = !MODO_PRUEBA_VUELTAS && esModoSeguroNocturno();
  const todasEnAlcance = useMemo(
    () => filtrarVueltasPorAlcance(catalogo, alcance) as Vuelta[],
    [alcance, catalogo]
  );
  // El mapa puede mostrar todos los puntos agrupados; una lista larga no ayuda.
  const vueltas = todasEnAlcance.slice(0, 10);
  const alcanceSiguiente = siguienteAlcance(alcance);

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
            {MODO_PRUEBA_VUELTAS
              ? `MODO DESARROLLO · mostrando ${NOMBRE_ZONA_PRUEBA} · Chapada simulada`
              : `0 chapadas · ${todasEnAlcance.length} disponibles en este alcance`}
          </Text>
        </View>

        {/* Separador: el TOLDO A RAYAS del prototipo (línea 325), no una barra
            lisa. Sale del kit — la pantalla no dibuja marca a mano. */}
        <Toldo style={styles.toldoSep} />

        <SelectorAlcance valor={alcance} onChange={cambiarAlcance} />

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
              {nocheSegura ? "La cuadra está\ndescansando" : "Por acá todavía\nno hay Vueltas"}
            </TituloDisplay>
            <Text style={styles.vacioTexto}>
              {nocheSegura
                ? "El modo seguro pausa las Vueltas de esta zona entre las 6 p.m. y las 6 a.m. Vuelven cuando sea de día."
                : alcanceSiguiente
                  ? "No salió ninguna en este alcance. Abrí el mapa y conservamos también las que estaban cerca."
                  : "Calato está olfateando nuevas zonas de Lima."}
            </Text>
            {alcanceSiguiente ? (
              <Boton onPress={() => cambiarAlcance(alcanceSiguiente)}>
                Abrir un poco el mapa
              </Boton>
            ) : null}
          </View>
        ) : (
          vueltas.map((v, indice) => (
            <Animated.View
              key={v.id}
              entering={FadeInDown.delay(Math.min(indice, 8) * 38).duration(260)}
            >
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/vuelta/[id]",
                    params: {
                      id: String(v.id),
                      ...(MODO_PRUEBA_VUELTAS ? { prueba: "1" } : {}),
                    },
                  })
                }
                style={({ pressed }) => pressed && styles.tarjetaPresionada}
                accessibilityRole="button"
                accessibilityLabel={`${v.titulo}, ${v.poi_nombre ?? "Lima"}`}
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
                        {v.poi_nombre ?? v.pois?.nombre ?? "Lima"}
                        {typeof v.distancia_m === "number" ? ` · ${textoCuadras(v.distancia_m)}` : ""}
                      </Text>
                      <View style={styles.filaTop}>
                        <Etiqueta color={colores.naranja}>+{v.calle_xp} CALLE</Etiqueta>
                        <Etiqueta>N.º {String(v.id).padStart(3, "0")}</Etiqueta>
                      </View>
                    </View>
                  </View>
                </Tarjeta>
              </Pressable>
            </Animated.View>
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
  tarjetaPresionada: { opacity: 0.82, transform: [{ scale: 0.985 }] },
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
