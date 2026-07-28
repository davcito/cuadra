import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { colores } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

/**
 * Detalle de la Vuelta: el lugar, para qué sirve ir, y qué hay que hacer
 * para chaparla. El check-in llega en el hito del loop completable
 * (semanas 5–6): entra por la RPC `chapar()` server-side (ADR-0001).
 */
export default function DetalleVueltaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [v, setV] = useState<Vuelta | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("missions")
      .select(
        "id, titulo, descripcion, categoria, dificultad, calle_xp, instruccion_verificacion, pois(nombre, categoria)"
      )
      .eq("id", Number(id))
      .single();

    setV((data as unknown as Vuelta) ?? null);
    setCargando(false);
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

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

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
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

          <Boton>Llévame</Boton>
          <Text style={styles.pie}>
            El check-in se abre cuando estés a menos de 75 metros: la foto se toma en el
            lugar, con la cámara de la app.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colores.papel },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  scroll: { paddingBottom: 110 },
  hero: { borderBottomWidth: 3, borderBottomColor: colores.tinta },
  volverCaja: { position: "absolute", top: 0, left: 16 },
  volver: {
    width: 34,
    height: 34,
    borderRadius: 99,
    backgroundColor: colores.papel,
    borderWidth: 2,
    borderColor: colores.tinta,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  volverTexto: { fontSize: 20, fontWeight: "800", color: colores.tinta, marginTop: -3 },
  cuerpo: { padding: 18, gap: 10 },
  filaTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  meta: { fontSize: 13, color: colores.textoSuave, fontWeight: "500" },
  descripcion: { fontSize: 14, lineHeight: 21, color: colores.textoSuave, marginTop: 2 },
  cupon: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colores.tinta,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 5,
    transform: [{ rotate: "-1.1deg" }],
    marginTop: 4,
  },
  cuponTexto: { fontSize: 13, lineHeight: 19, color: colores.tinta },
  premios: { flexDirection: "row", gap: 11, marginTop: 4 },
  premio: { flex: 1 },
  premioCuerpo: { padding: 12, gap: 2 },
  premioValor: { fontSize: 16, fontWeight: "800", color: colores.tinta },
  pie: { fontSize: 11, color: colores.metadato, lineHeight: 16, textAlign: "center" },
});
