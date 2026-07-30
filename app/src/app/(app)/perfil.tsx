import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useCalato } from "@/components/calato-cortina";
import { CalatoClip } from "@/components/calato-clip";
import { Boton, Chip, Etiqueta, Tarjeta, TituloDisplay } from "@/components/ui";
import { useSession } from "@/lib/auth";
import { colores, esc, fuentes, radios } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

/** Rangos por Calle acumulada (documento maestro §3.2). */
const RANGOS: { clave: string; nombre: string; desde: number }[] = [
  { clave: "nuevo_en_la_cuadra", nombre: "Nuevo en la cuadra", desde: 0 },
  { clave: "vecino", nombre: "Vecino/a", desde: 250 },
  { clave: "callejero", nombre: "Callejero/a", desde: 750 },
  { clave: "casero", nombre: "Casero/a", desde: 2000 },
  { clave: "cronista", nombre: "Cronista", desde: 5000 },
  { clave: "leyenda", nombre: "Leyenda del barrio", desde: 12000 },
];

function rangoDe(xp: number) {
  const i = Math.max(0, RANGOS.filter((r) => xp >= r.desde).length - 1);
  return { actual: RANGOS[i], siguiente: RANGOS[i + 1] ?? null };
}

export default function PerfilScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { cortina } = useCalato();
  const [perfil, setPerfil] = useState<{ display_name: string | null; username: string; calle_xp: number } | null>(null);
  const [racha, setRacha] = useState(0);
  const [figuritas, setFiguritas] = useState(0);

  const cargar = useCallback(async () => {
    const uid = session?.user.id;
    if (!uid) return;

    const [{ data: p }, { data: s }, { count }] = await Promise.all([
      supabase.from("profiles").select("display_name, username, calle_xp").eq("id", uid).single(),
      supabase.from("streaks").select("dias_actual").eq("user_id", uid).maybeSingle(),
      supabase.from("user_cards").select("card_id", { count: "exact", head: true }),
    ]);

    if (p) setPerfil(p);
    if (s) setRacha(s.dias_actual ?? 0);
    setFiguritas(count ?? 0);
  }, [session]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const xp = perfil?.calle_xp ?? 0;
  const { actual, siguiente } = rangoDe(xp);
  const progreso = siguiente
    ? Math.min(100, ((xp - actual.desde) / (siguiente.desde - actual.desde)) * 100)
    : 100;

  async function salir() {
    await cortina("Hasta mañana");
    supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.cabecera}>
          <CalatoClip clip="atento" alto={96} etiqueta="Calato, atento" />
          <TituloDisplay>{perfil?.display_name ?? perfil?.username ?? "Vecino"}</TituloDisplay>
          <View style={styles.rangoFila}>
            <Chip>{actual.nombre.toUpperCase()}</Chip>
            <View style={styles.sello}>
              <Text style={styles.selloTexto}>
                RANGO {RANGOS.findIndex((r) => r.clave === actual.clave) + 1}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.progresoCaja}>
          <View style={styles.progresoTop}>
            <Etiqueta>CALLE</Etiqueta>
            <Etiqueta color={colores.naranja}>
              {xp}{siguiente ? ` / ${siguiente.desde} A ${siguiente.nombre.toUpperCase()}` : " · MÁXIMO"}
            </Etiqueta>
          </View>
          <View style={styles.barra}>
            <View style={[styles.barraLlena, { width: `${progreso}%` }]} />
          </View>
        </View>

        <View style={styles.stats}>
          <Tarjeta style={styles.stat}>
            <View style={styles.statCuerpo}>
              <Text style={styles.statNumero}>{figuritas}</Text>
              <Etiqueta>FIGURITAS</Etiqueta>
            </View>
          </Tarjeta>
          <Tarjeta style={styles.stat}>
            <View style={styles.statCuerpo}>
              <Text style={styles.statNumero}>{xp}</Text>
              <Etiqueta>CALLE</Etiqueta>
            </View>
          </Tarjeta>
          <Tarjeta style={styles.stat}>
            <View style={styles.statCuerpo}>
              <Text style={[styles.statNumero, { color: colores.naranja }]}>{racha}</Text>
              <Etiqueta>RACHA</Etiqueta>
            </View>
          </Tarjeta>
        </View>

        <Tarjeta fondo="#FFFFFF">
          <View style={styles.filaAjuste}>
            <Text style={styles.ajusteTitulo}>Modo seguro</Text>
            <Text style={styles.ajusteMeta}>Solo cuadras curadas</Text>
          </View>
        </Tarjeta>
        <Tarjeta fondo="#FFFFFF">
          <View style={styles.filaAjuste}>
            <Text style={styles.ajusteTitulo}>Que Calato me insista</Text>
            <Text style={styles.ajusteMeta}>Máx. 2 avisos al día</Text>
          </View>
        </Tarjeta>

        <Boton variante="oro">Conseguir La Llave</Boton>
        <Boton variante="linea" onPress={salir}>
          Cerrar sesión
        </Boton>

        <Text style={styles.pie}>
          Cuadra no publica dónde estás. Las visitas se verifican y se borran del mapa público.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colores.papel },
  scroll: { padding: esc(18), paddingBottom: esc(110), gap: esc(12) },
  cabecera: { alignItems: "center", gap: esc(9) },
  rangoFila: { flexDirection: "row", alignItems: "center", gap: esc(9) },
  sello: {
    borderWidth: esc(2),
    borderStyle: "dashed",
    borderColor: colores.naranja,
    borderRadius: radios.chip,
    paddingHorizontal: esc(12),
    paddingVertical: esc(5),
    transform: [{ rotate: "-4deg" }],
  },
  selloTexto: { fontSize: esc(10), fontFamily: fuentes.extrabold, letterSpacing: esc(1), color: colores.naranja },
  progresoCaja: { gap: esc(5), marginTop: esc(4) },
  progresoTop: { flexDirection: "row", justifyContent: "space-between" },
  barra: {
    height: esc(11),
    borderWidth: esc(2),
    borderColor: colores.tinta,
    borderRadius: esc(9),
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  barraLlena: { height: "100%", backgroundColor: colores.naranja },
  stats: { flexDirection: "row", gap: esc(9) },
  stat: { flex: 1 },
  statCuerpo: { alignItems: "center", paddingVertical: esc(12), gap: esc(2) },
  statNumero: { fontSize: esc(23), fontFamily: fuentes.extrabold, color: colores.tinta },
  filaAjuste: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: esc(14),
  },
  ajusteTitulo: { fontSize: esc(14), fontFamily: fuentes.extrabold, color: colores.tinta },
  ajusteMeta: { fontSize: esc(12), color: colores.textoSuave, fontFamily: fuentes.medium },
  pie: {
    fontSize: esc(11),
    fontFamily: fuentes.regular,
    color: colores.metadato,
    textAlign: "center",
    lineHeight: esc(16),
    marginTop: esc(4),
  },
});
