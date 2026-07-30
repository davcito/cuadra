import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

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
import { IlustracionLugar, type Vuelta } from "@/app/(app)/vueltas";
import { GEOFENCE_M, ubicacionActual, type Ubicacion } from "@/lib/chapar";
import { haversineMetros, textoCuadras } from "@/lib/geo";
import { colores, esc, fuentes, radios } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

/**
 * Detalle de la Vuelta: el lugar, para qué sirve ir, y qué hay que hacer
 * para chaparla. El check-in llega en el hito del loop completable
 * (semanas 5–6): entra por la RPC `chapar()` server-side (ADR-0001).
 */
export default function DetalleVueltaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [v, setV] = useState<Vuelta | null>(null);
  const [cargando, setCargando] = useState(true);
  const [donde, setDonde] = useState<Ubicacion | null>(null);
  const [sinPermiso, setSinPermiso] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("missions")
      .select(
        "id, titulo, descripcion, categoria, dificultad, calle_xp, instruccion_verificacion, pois(nombre, categoria, ubicacion)"
      )
      .eq("id", Number(id))
      .single();

    setV((data as unknown as Vuelta) ?? null);
    setCargando(false);
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Distancia viva al lugar. Es INFORMATIVA: enciende el botón y nada más. El
  // geofence que cuenta corre en `chapar()`, sobre la ubicación que se manda
  // (ADR-0001) — acá solo evitamos abrir la cámara para un check-in que ya
  // sabemos que va a rebotar.
  useEffect(() => {
    let vivo = true;
    // El primer intento PIDE el permiso; los siguientes solo leen. Sin esta
    // distinción, o el diálogo del sistema aparece cada 5 s, o —como pasaba
    // antes— no aparece nunca y la pantalla se queda "calculando" sin decir
    // que le falta un permiso.
    const leer = async (pedir: boolean) => {
      try {
        const u = await ubicacionActual({ pedir });
        if (!vivo) return;
        setDonde(u);
        setSinPermiso(u === null);
      } catch {
        if (vivo) setDonde(null);
      }
    };
    void leer(true);
    const t = setInterval(() => void leer(false), 5000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  if (cargando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={colores.naranja} />
      </View>
    );
  }

  if (!v) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centro}>
          <Text style={styles.meta}>Esa vuelta ya no está disponible.</Text>
          <Boton variante="linea" onPress={() => router.back()}>
            Volver
          </Boton>
        </View>
      </SafeAreaView>
    );
  }

  const color = COLOR_CATEGORIA[v.categoria] ?? colores.categorias.huariques;

  // `lat`/`lng` son columnas generadas de `pois`. NO se pide `ubicacion`: PostgREST
  // serializa `geography` como WKB hexadecimal ("0101000020E610…"), no como GeoJSON,
  // y leerle `.coordinates` a un string da undefined en silencio — la distancia
  // quedaba en null para siempre y el botón decía "calculando" sin fin.
  const p = v.pois as { lat?: number; lng?: number } | undefined;
  const lugar = typeof p?.lat === "number" && typeof p?.lng === "number" ? { lat: p.lat, lng: p.lng } : null;
  const distancia = donde && lugar ? haversineMetros(donde, lugar) : null;
  const enRango = distancia !== null && distancia <= GEOFENCE_M;
  // Más allá del distrito, la cuenta de cuadras deja de significar algo: "a 151
  // cuadras" cumple la regla de marca y no le sirve a nadie.
  const otraZona = distancia !== null && distancia > 4000;

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* El color de la categoría se extiende bajo el notch: la
            ilustración nunca queda tapada por la isla dinámica. */}
        <View style={[styles.hero, { backgroundColor: color, paddingTop: insets.top }]}>
          <IlustracionLugar categoria={v.categoria} alto={210} />
          <SafeAreaView edges={["top"]} style={styles.volverCaja}>
            <Pressable style={styles.volver} onPress={() => router.back()} hitSlop={10}>
              <Text style={styles.volverTexto}>‹</Text>
            </Pressable>
          </SafeAreaView>
        </View>

        <View style={styles.cuerpo}>
          <View style={styles.filaTop}>
            <Chip fondo={color} color={colores.papel}>
              {NOMBRE_CATEGORIA[v.categoria] ?? v.categoria.toUpperCase()}
            </Chip>
            <Dificultad nivel={v.dificultad} />
          </View>

          <TituloDisplay>{v.titulo}</TituloDisplay>
          <Text style={styles.meta}>{v.pois?.nombre ?? "Barranco"}</Text>
          <Text style={styles.descripcion}>{v.descripcion}</Text>

          {v.instruccion_verificacion ? (
            <View style={styles.cupon}>
              <Etiqueta color={color}>PARA CHAPARLA</Etiqueta>
              <Text style={styles.cuponTexto}>{v.instruccion_verificacion}</Text>
            </View>
          ) : null}

          <View style={styles.premios}>
            <Tarjeta style={styles.premio} fondo="#FFFFFF">
              <View style={styles.premioCuerpo}>
                <Etiqueta>GANÁS</Etiqueta>
                <Text style={[styles.premioValor, { color: colores.naranja }]}>
                  +{v.calle_xp} Calle
                </Text>
              </View>
            </Tarjeta>
            <Tarjeta style={styles.premio} fondo="#FFFFFF">
              <View style={styles.premioCuerpo}>
                <Etiqueta>FIGURITA</Etiqueta>
                <Text style={styles.premioValor}>N.º {String(v.id).padStart(3, "0")}</Text>
              </View>
            </Tarjeta>
          </View>

          {/* El botón nace apagado y se enciende solo al llegar (E2, punto 5).
              Que diga POR QUÉ está apagado importa: un botón gris sin motivo se
              lee como app rota, no como "todavía no llegaste". */}
          <Boton
            onPress={() => router.push(`/(app)/vuelta/${v.id}/camara`)}
            deshabilitado={!enRango}
          >
            {enRango
              ? "Chapala"
              : sinPermiso
                ? "Activá la ubicación"
                : distancia === null
                  ? "Buscando dónde estás…"
                  : "Acercate para chapar"}
          </Boton>
          <Boton variante="linea">Llévame</Boton>
          <Text style={styles.pie}>
            {sinPermiso
              ? "Necesitamos tu ubicación para saber cuándo llegaste. Nunca se publica: se usa para las Vueltas y nada más."
              : distancia === null
                ? "El check-in se abre cuando llegues: la foto se toma en el lugar, con la cámara de la app."
                : enRango
                  ? "Ya estás. La foto se toma acá, con la cámara de la app."
                  : otraZona
                    ? "Esta Vuelta te queda lejos. El check-in se abre cuando estés en la cuadra."
                    : `Estás a ${textoCuadras(distancia)}. El check-in se abre cuando llegues.`}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colores.papel },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: esc(14), padding: esc(24) },
  scroll: { paddingBottom: esc(110) },
  hero: { borderBottomWidth: esc(3), borderBottomColor: colores.tinta },
  volverCaja: { position: "absolute", top: 0, left: esc(16) },
  volver: {
    width: esc(34),
    height: esc(34),
    borderRadius: radios.chip,
    backgroundColor: colores.papel,
    borderWidth: esc(2),
    borderColor: colores.tinta,
    alignItems: "center",
    justifyContent: "center",
    marginTop: esc(8),
  },
  volverTexto: { fontSize: esc(20), fontFamily: fuentes.extrabold, color: colores.tinta, marginTop: esc(-3) },
  cuerpo: { padding: esc(18), gap: esc(10) },
  filaTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  meta: { fontSize: esc(13), color: colores.textoSuave, fontFamily: fuentes.medium },
  descripcion: { fontSize: esc(14), lineHeight: esc(21), color: colores.textoSuave, marginTop: esc(2), fontFamily: fuentes.regular },
  cupon: {
    borderWidth: esc(2),
    borderStyle: "dashed",
    borderColor: colores.tinta,
    borderRadius: esc(14),
    backgroundColor: "#FFFFFF",
    padding: esc(14),
    gap: esc(5),
    transform: [{ rotate: "-1.1deg" }],
    marginTop: esc(4),
  },
  cuponTexto: { fontSize: esc(13), lineHeight: esc(19), color: colores.tinta, fontFamily: fuentes.regular },
  premios: { flexDirection: "row", gap: esc(11), marginTop: esc(4) },
  premio: { flex: 1 },
  premioCuerpo: { padding: esc(12), gap: esc(2) },
  premioValor: { fontSize: esc(16), fontFamily: fuentes.extrabold, color: colores.tinta },
  pie: { fontSize: esc(11), color: colores.metadato, lineHeight: esc(16), textAlign: "center", fontFamily: fuentes.regular },
});
