import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { useRouter } from "expo-router";

import { CalatoVivo } from "@/components/calato-vivo";
import { MapaCuadra } from "@/components/mapa-cuadra";
import { SelectorAlcance } from "@/components/selector-alcance";
import { Boton, Chip, Dificultad, Etiqueta } from "@/components/ui";
import {
  filtrarVueltasPorAlcance,
  siguienteAlcance,
} from "@/lib/alcance-vueltas";
import { colores, esc, fuentes, medidas, radios } from "@/lib/theme";
import { textoCuadras } from "@/lib/geo";
import { ubicacionActual } from "@/lib/chapar";
import { esModoSeguroNocturno } from "@/lib/disponibilidad";
import {
  MODO_PRUEBA_VUELTAS,
  NOMBRE_ZONA_PRUEBA,
} from "@/lib/modo-prueba";
import { useAlcanceVueltas } from "@/lib/use-alcance-vueltas";
import { buscarVueltasDisponibles, type VueltaCerca } from "@/lib/vueltas-cerca";

type VueltaHoy = VueltaCerca;

/**
 * Home: el mapa de tu ciudad a pantalla completa (ADR-0004) con un header
 * flotante. Calato saluda UNA vez al entrar (tarjeta, no flotando sobre el
 * mapa — regla de dosis del ADR-0006) y la salida la tapa la cortina.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { alcance, cambiarAlcance } = useAlcanceVueltas();
  const [saludo, setSaludo] = useState(true);
  const [catalogo, setCatalogo] = useState<VueltaHoy[]>([]);
  const [ubicacion, setUbicacion] = useState<Awaited<ReturnType<typeof ubicacionActual>>>(null);
  const [seleccionadaId, setSeleccionadaId] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sinUbicacion, setSinUbicacion] = useState(false);

  const vueltasVisibles = useMemo(
    () => filtrarVueltasPorAlcance(catalogo, alcance),
    [alcance, catalogo]
  );
  const vuelta =
    vueltasVisibles.find((item) => item.id === seleccionadaId) ??
    vueltasVisibles[0] ??
    null;

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
    setCargando(true);
    setError(null);
    // `pedir: true` acá y no en otro lado: ésta es la primera pantalla y el
    // producto entero es un mapa de dónde estás. Pedir el permiso más tarde
    // significaría abrir con el mapa centrado en una plaza que no es la tuya.
    try {
      const donde = await ubicacionActual({ pedir: true });
      setUbicacion(donde);
      if (!donde) {
        setCatalogo([]);
        setSeleccionadaId(null);
        setSinUbicacion(true);
        return;
      }
      setSinUbicacion(false);

      // Hoy hay 69 Vueltas activas. Pedimos el catálogo jugable ordenado por
      // distancia una sola vez y los alcances lo recortan sin repetir GPS ni
      // red. Cuando Lima supere este lote, el ADR-0010 manda pasar a bbox.
      const disponibles = await buscarVueltasDisponibles(donde, 200);
      setCatalogo(disponibles);
      setSeleccionadaId(disponibles[0]?.id ?? null);
    } catch (e) {
      setCatalogo([]);
      setSeleccionadaId(null);
      setError(e instanceof Error ? e.message : "No pudimos buscar Vueltas.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const nocheSegura = !MODO_PRUEBA_VUELTAS && esModoSeguroNocturno();
  const alcanceSiguiente = siguienteAlcance(alcance);

  return (
    <View style={styles.cont}>
      <MapaCuadra
        ubicacion={ubicacion}
        vueltas={vueltasVisibles}
        alcance={alcance}
        seleccionadaId={vuelta?.id ?? null}
        onSeleccionar={(id) => {
          setSaludo(false);
          setSeleccionadaId(id);
        }}
      />

      <SafeAreaView style={styles.header} edges={["top"]} pointerEvents="box-none">
        <View style={styles.chip}>
          <Text style={styles.marca}>Cuadra</Text>
        </View>
        <View style={[styles.chip, styles.chipRacha]}>
          <View style={styles.llama} />
          <Text style={styles.rachaTexto}>0</Text>
        </View>
      </SafeAreaView>

      <View style={[styles.alcance, { top: insets.top + esc(58) }]}>
        <SelectorAlcance
          valor={alcance}
          sobreMapa
          onChange={(nuevo) => {
            setSaludo(false);
            setSeleccionadaId(null);
            cambiarAlcance(nuevo);
          }}
        />
      </View>

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
      ) : cargando ? (
        <Animated.View
          entering={FadeInDown.springify().damping(16)}
          style={[styles.saludo, { bottom: sobreLaBarra }]}
        >
          <View style={[styles.tarjetaVuelta, styles.cargandoFila]}>
            <ActivityIndicator color={colores.naranja} />
            <View style={styles.cargandoTextos}>
              <Text style={styles.vueltaTitulo}>Calato está buscando</Text>
              <Etiqueta>Ordenando las Vueltas por distancia</Etiqueta>
            </View>
          </View>
        </Animated.View>
      ) : vuelta ? (
        <Animated.View
          entering={FadeInDown.springify().damping(16)}
          style={[styles.saludo, { bottom: sobreLaBarra }]}
        >
          <View style={styles.tarjetaVuelta}>
            <View style={styles.vueltaTop}>
              <Chip fondo={colores.naranja} color={colores.tinta}>
                {MODO_PRUEBA_VUELTAS
                  ? `DESARROLLO · ${NOMBRE_ZONA_PRUEBA.toUpperCase()}`
                  : "VUELTA DE HOY"}
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
                router.push({
                  pathname: "/vuelta/[id]",
                  params: {
                    id: String(vuelta.id),
                    ...(MODO_PRUEBA_VUELTAS ? { prueba: "1" } : {}),
                  },
                })
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
      ) : error ? (
        <Animated.View
          entering={FadeInDown.springify().damping(16)}
          style={[styles.saludo, { bottom: sobreLaBarra }]}
        >
          <View style={styles.tarjetaVuelta}>
            <Text style={styles.vueltaTitulo}>La búsqueda se trabó</Text>
            <Etiqueta>{error}</Etiqueta>
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
            <Text style={styles.vueltaTitulo}>
              {nocheSegura
                ? "La cuadra está descansando"
                : alcanceSiguiente
                  ? "Por acá no salió ninguna"
                  : "Todavía no hay Vueltas publicadas"}
            </Text>
            <Etiqueta>
              {nocheSegura
                ? "Modo seguro nocturno · las Vueltas vuelven desde las 6 a.m."
                : alcanceSiguiente
                  ? "Podés abrir el mapa sin perder los lugares cercanos."
                  : "Calato está olfateando nuevas zonas de Lima."}
            </Etiqueta>
            {alcanceSiguiente ? (
              <Boton
                style={{ marginTop: esc(6) }}
                onPress={() => cambiarAlcance(alcanceSiguiente)}
              >
                Abrir un poco el mapa
              </Boton>
            ) : null}
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
  alcance: {
    position: "absolute",
    left: esc(14),
    right: esc(14),
    zIndex: 20,
    elevation: 20,
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
  cargandoFila: { flexDirection: "row", alignItems: "center", gap: esc(12) },
  cargandoTextos: { flex: 1, gap: esc(4) },
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
