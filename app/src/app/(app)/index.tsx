import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useRouter } from "expo-router";

import { CalatoVivo } from "@/components/calato-vivo";
import { MapaCuadra } from "@/components/mapa-cuadra";
import { Boton, Chip, Dificultad, Etiqueta } from "@/components/ui";
import { colores, esc, fuentes, medidas, radios } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { textoCuadras } from "@/lib/geo";
import { ubicacionActual } from "@/lib/chapar";

type VueltaHoy = {
  id: number;
  titulo: string;
  categoria: string;
  dificultad: number;
  poi_nombre: string | null;
  distancia_m: number | null;
};

/**
 * Home: el mapa de tu ciudad a pantalla completa (ADR-0004) con un header
 * flotante. Calato saluda UNA vez al entrar (tarjeta, no flotando sobre el
 * mapa — regla de dosis del ADR-0006) y la salida la tapa la cortina.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [saludo, setSaludo] = useState(true);
  const [vuelta, setVuelta] = useState<VueltaHoy | null>(null);
  const [sinUbicacion, setSinUbicacion] = useState(false);

  // La tarjeta se apoya JUSTO encima de la barra, en cualquier equipo. El alto
  // de la barra sale del token: si cambia allá, esto lo sigue solo.
  const sobreLaBarra =
    Math.max(insets.bottom, medidas.barraMargen) + medidas.barra + medidas.barraMargen;

  // El saludo es un momento, no un mueble: se va solo a los 5 s.
  useEffect(() => {
    const t = setTimeout(() => setSaludo(false), 5200);
    return () => clearTimeout(t);
  }, []);

  /**
   * La Vuelta de hoy = la más cercana que se pueda chapar AHORA.
   *
   * Antes esto era `.eq("estado","activa").limit(1)`: sin orden y sin ubicación.
   * Con Vueltas en más de un distrito eso devolvía la de id más bajo, así que a
   * alguien parado en Cercado le ofrecía uno de Barranco, a 15 km. Se veía como
   * "calculando dónde estás" para siempre — y era cierto: nunca iba a alcanzar.
   *
   * El RPC además respeta modo seguro y ventana horaria (regla dura #4), que la
   * consulta vieja ignoraba, y devuelve la distancia medida por PostGIS: el
   * mismo número que va a usar `chapar()` para decidir.
   */
  const cargar = useCallback(async () => {
    // `pedir: true` acá y no en otro lado: ésta es la primera pantalla y el
    // producto entero es un mapa de dónde estás. Pedir el permiso más tarde
    // significaría abrir con el mapa centrado en una plaza que no es la tuya.
    const donde = await ubicacionActual({ pedir: true });
    if (!donde) {
      // Sin permiso o sin señal todavía. No se muestra una Vuelta cualquiera:
      // ofrecer algo que no sabemos si está cerca es exactamente el defecto que
      // se acaba de arreglar.
      setVuelta(null);
      setSinUbicacion(true);
      return;
    }
    setSinUbicacion(false);
    const { data } = await supabase.rpc("vueltas_cerca", {
      p_lat: donde.lat,
      p_lng: donde.lng,
      p_limite: 1,
    });
    setVuelta((data as VueltaHoy[] | null)?.[0] ?? null);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <View style={styles.cont}>
      <MapaCuadra />

      <SafeAreaView style={styles.header} edges={["top"]} pointerEvents="box-none">
        <View style={styles.chip}>
          <Text style={styles.marca}>Cuadra</Text>
        </View>
        <View style={[styles.chip, styles.chipRacha]}>
          <View style={styles.llama} />
          <Text style={styles.rachaTexto}>0</Text>
        </View>
      </SafeAreaView>

      {saludo ? (
        <Animated.View
          entering={FadeInDown.springify().damping(14)}
          exiting={FadeOutDown.duration(260)}
          style={[styles.saludo, { bottom: sobreLaBarra }]}
        >
          <Pressable style={styles.saludoFila} onPress={() => setSaludo(false)}>
            <CalatoVivo estado="tranqui" size={52} />
            <View style={styles.saludoTextos}>
              <Text style={styles.saludoTitulo}>Bienvenido a la cuadra</Text>
              <Text style={styles.saludoDetalle}>
                Calato ya olfateó vueltas nuevas por acá.
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      ) : vuelta ? (
        <Animated.View
          entering={FadeInDown.springify().damping(16)}
          style={[styles.saludo, { bottom: sobreLaBarra }]}
        >
          <View style={styles.tarjetaVuelta}>
            <View style={styles.vueltaTop}>
              <Chip fondo={colores.naranja} color={colores.tinta}>
                VUELTA DE HOY
              </Chip>
              <Dificultad nivel={vuelta.dificultad} />
            </View>
            <Text style={styles.vueltaTitulo}>{vuelta.titulo}</Text>
            {/* Lugar y distancia juntos: "a 2 cuadras" sin decir de qué sirve
                menos que el nombre de la esquina. Cuadras, nunca metros ni km
                — es firma de marca (glosario). */}
            <Etiqueta>
              {vuelta.poi_nombre ?? "Acá cerca"}
              {vuelta.distancia_m != null ? ` · ${textoCuadras(vuelta.distancia_m)}` : ""}
            </Etiqueta>
            <Boton
              style={{ marginTop: esc(6) }}
              onPress={() =>
                router.push({ pathname: "/vuelta/[id]", params: { id: String(vuelta.id) } })
              }
            >
              Llévame
            </Boton>
          </View>
        </Animated.View>
      ) : sinUbicacion ? (
        // Sin GPS no hay Vuelta que ofrecer, pero quedarse en blanco deja al
        // jugador mirando un mapa mudo sin saber que la pelota está de su lado.
        <Animated.View
          entering={FadeInDown.springify().damping(16)}
          style={[styles.saludo, { bottom: sobreLaBarra }]}
        >
          <View style={styles.tarjetaVuelta}>
            <Text style={styles.vueltaTitulo}>Calato no sabe dónde estás</Text>
            <Etiqueta>Prende la ubicación y te busco vueltas acá cerca</Etiqueta>
            <Boton style={{ marginTop: esc(6) }} onPress={() => void cargar()}>
              Reintentar
            </Boton>
          </View>
        </Animated.View>
      ) : (
        // Con ubicación y sin resultados: hay zonas sin cuadras encendidas, y a
        // esta hora el modo seguro puede esconderlas todas. Decirlo es mejor que
        // dejar creer que la app se colgó.
        <Animated.View
          entering={FadeInDown.springify().damping(16)}
          style={[styles.saludo, { bottom: sobreLaBarra }]}
        >
          <View style={styles.tarjetaVuelta}>
            <Text style={styles.vueltaTitulo}>Por acá todavía no hay vueltas</Text>
            <Etiqueta>Calato está olfateando esta zona. Vuelve más tarde.</Etiqueta>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cont: { flex: 1, backgroundColor: colores.papel },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: esc(14),
  },
  chip: {
    backgroundColor: "rgba(251,247,240,0.92)",
    borderRadius: radios.chip,
    paddingHorizontal: esc(16),
    paddingVertical: esc(8),
    marginTop: esc(8),
    shadowColor: colores.tinta,
    shadowOpacity: 0.12,
    shadowRadius: esc(8),
    shadowOffset: { width: 0, height: esc(2) },
    elevation: 3,
  },
  marca: { fontSize: esc(20), fontFamily: fuentes.extrabold, color: colores.tinta, letterSpacing: esc(-0.5) },
  chipRacha: {
    backgroundColor: colores.tinta,
    flexDirection: "row",
    alignItems: "center",
    gap: esc(6),
    paddingHorizontal: esc(13),
  },
  llama: {
    width: esc(11),
    height: esc(13),
    backgroundColor: colores.naranja,
    borderTopLeftRadius: esc(6),
    borderTopRightRadius: esc(6),
    borderBottomLeftRadius: esc(6),
    borderBottomRightRadius: esc(6),
  },
  rachaTexto: { fontSize: esc(13), fontFamily: fuentes.extrabold, color: colores.papel },
  saludo: {
    position: "absolute",
    left: esc(14),
    right: esc(14),
    // `bottom` se calcula en el componente: depende del inset del equipo.
  },
  tarjetaVuelta: {
    backgroundColor: colores.papel,
    borderWidth: esc(2),
    borderColor: colores.tinta,
    borderRadius: esc(18),
    padding: esc(15),
    gap: esc(6),
    shadowColor: colores.tinta,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: esc(3), height: esc(3) },
    elevation: 5,
  },
  vueltaTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  vueltaTitulo: { fontSize: esc(16), fontFamily: fuentes.extrabold, color: colores.tinta },
  saludoFila: {
    flexDirection: "row",
    alignItems: "center",
    gap: esc(13),
    backgroundColor: colores.papel,
    borderWidth: esc(2),
    borderColor: colores.tinta,
    borderRadius: esc(18),
    paddingHorizontal: esc(14),
    paddingVertical: esc(12),
    shadowColor: colores.tinta,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: esc(3), height: esc(3) },
    elevation: 5,
  },
  saludoTextos: { flex: 1, gap: esc(2) },
  saludoTitulo: { fontSize: esc(15), fontFamily: fuentes.extrabold, color: colores.tinta },
  saludoDetalle: { fontSize: esc(12), color: colores.textoSuave, fontFamily: fuentes.regular },
});
