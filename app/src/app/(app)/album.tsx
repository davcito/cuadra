import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLOR_CATEGORIA, Chip, Etiqueta, Tarjeta, TituloDisplay } from "@/components/ui";
import { colores, fuentes } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Figurita = {
  id: number;
  nombre: string;
  barrio: string;
  rareza: string;
  pois: { categoria: string } | null;
  chapada: boolean;
};

/**
 * El Álbum — páginas por barrio. Única pantalla con textura de papel
 * (guía 06). Las figuritas van pegadas medio torcidas; las que faltan
 * se ven como silueta: el hueco es el que tira a salir.
 */
export default function AlbumScreen() {
  const [figuritas, setFiguritas] = useState<Figurita[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const [{ data: cards }, { data: mias }] = await Promise.all([
      supabase.from("cards").select("id, nombre, barrio, rareza, pois(categoria)"),
      supabase.from("user_cards").select("card_id"),
    ]);

    const chapadas = new Set((mias ?? []).map((m: { card_id: number }) => m.card_id));
    setFiguritas(
      ((cards ?? []) as unknown as Omit<Figurita, "chapada">[]).map((c) => ({
        ...c,
        chapada: chapadas.has(c.id),
      }))
    );
    setCargando(false);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const barrio = figuritas[0]?.barrio ?? "Barranco";
  const tengo = figuritas.filter((f) => f.chapada).length;
  const total = Math.max(figuritas.length, 30); // la página completa son 30

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.encabezado}>
          <TituloDisplay>El Álbum</TituloDisplay>
          <Etiqueta>
            {tengo} DE {total}
          </Etiqueta>
        </View>

        <View style={styles.barrios}>
          <Chip>{barrio.toUpperCase()}</Chip>
          <Chip fondo="transparent" color={colores.textoSuave} style={styles.chipOff}>
            MIRAFLORES
          </Chip>
          <Chip fondo="transparent" color={colores.textoSuave} style={styles.chipOff}>
            CERCADO
          </Chip>
        </View>

        <View style={styles.progresoCaja}>
          <View style={styles.progresoTop}>
            <Etiqueta>PÁGINA DE {barrio.toUpperCase()}</Etiqueta>
            <Etiqueta color={colores.naranja}>
              {tengo} / {total}
            </Etiqueta>
          </View>
          <View style={styles.barra}>
            <View style={[styles.barraLlena, { width: `${(tengo / total) * 100}%` }]} />
          </View>
        </View>

        {cargando ? (
          <ActivityIndicator color={colores.naranja} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.grilla}>
            {Array.from({ length: 9 }, (_, i) => {
              const f = figuritas[i];
              const rot = [-2.2, 1.6, -1.2, 2.2, -1.8, 1.2, 2.6, -1.5, 1.9][i];
              const tiene = f?.chapada ?? false;
              const color = f?.pois?.categoria
                ? (COLOR_CATEGORIA[f.pois.categoria] ?? colores.categorias.huariques)
                : "#DCD1BC";

              return (
                <View
                  key={f?.id ?? `hueco-${i}`}
                  style={[
                    styles.figurita,
                    {
                      transform: [{ rotate: `${tiene ? rot : rot * 0.3}deg` }],
                      backgroundColor: tiene ? "#FFFFFF" : "#EFE7D8",
                    },
                  ]}
                >
                  <View
                    style={[styles.arte, { backgroundColor: tiene ? color : "#DCD1BC" }]}
                  />
                  <Text style={[styles.numero, { color: tiene ? colores.metadato : "#BCAF97" }]}>
                    {tiene ? `N.º ${String(f.id).padStart(3, "0")}` : "— — —"}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <Tarjeta style={{ marginTop: 6 }} fondo="#FFFFFF">
          <View style={styles.nota}>
            <Text style={styles.notaTexto}>
              <Text style={{ fontFamily: fuentes.extrabold }}>Completá {barrio}</Text> y desbloqueás la
              figurita de barrio, la que no se consigue de otra forma.
            </Text>
          </View>
        </Tarjeta>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // textura de papel: solo acá (guía 06)
  safe: { flex: 1, backgroundColor: "#FFFDF8" },
  scroll: { padding: 18, paddingBottom: 110, gap: 12 },
  encabezado: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  barrios: { flexDirection: "row", gap: 7 },
  chipOff: { borderWidth: 2, borderColor: "#D8CBB4" },
  progresoCaja: { gap: 5 },
  progresoTop: { flexDirection: "row", justifyContent: "space-between" },
  barra: {
    height: 11,
    borderWidth: 2,
    borderColor: colores.tinta,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  barraLlena: { height: "100%", backgroundColor: colores.naranja },
  grilla: { flexDirection: "row", flexWrap: "wrap", gap: 11, marginTop: 4 },
  figurita: {
    width: "30%",
    height: 118,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colores.tinta,
    padding: 7,
    gap: 3,
    justifyContent: "flex-end",
  },
  arte: { flex: 1, borderRadius: 4 },
  numero: { fontSize: 8, fontFamily: fuentes.extrabold, letterSpacing: 0.5 },
  nota: { padding: 13 },
  notaTexto: { fontSize: 12, color: colores.textoSuave, lineHeight: 17 },
});
