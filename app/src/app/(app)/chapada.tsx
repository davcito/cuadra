import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import { Boton, COLOR_CATEGORIA, NOMBRE_CATEGORIA, SombraDura, Tarjeta } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { colores, esc, fuentes, radios, sombras } from "@/lib/theme";

/**
 * ¡Chapada! — pantalla 9 del prototipo. El momento compartible del producto.
 *
 * Llega por `router.replace` desde la cámara, así que el botón de atrás NO
 * vuelve al visor: la chapada ya ocurrió y volver a la cámara invitaría a
 * repetirla. De acá se sale para adelante.
 */
export default function ChapadaScreen() {
  const router = useRouter();
  const { calle, racha, figurita, revision } = useLocalSearchParams<{
    calle?: string;
    racha?: string;
    figurita?: string;
    revision?: string;
  }>();

  const [carta, setCarta] = useState<{ nombre: string; barrio: string; categoria: string; id: number } | null>(null);

  useEffect(() => {
    if (!figurita) return;
    let vivo = true;
    void (async () => {
      const { data } = await supabase
        .from("cards")
        .select("id, nombre, barrio, pois(categoria)")
        .eq("id", Number(figurita))
        .single();
      if (!vivo || !data) return;
      const d = data as unknown as { id: number; nombre: string; barrio: string; pois?: { categoria: string } };
      setCarta({ id: d.id, nombre: d.nombre, barrio: d.barrio, categoria: d.pois?.categoria ?? "huarique" });
    })();
    return () => {
      vivo = false;
    };
  }, [figurita]);

  // Confeti SOLO en colores de marca (guía de identidad). Se calcula una vez:
  // si se recalculara en cada render, saltaría con cada cambio de estado.
  const confeti = useMemo(() => sembrarConfeti(34), []);

  const color = carta ? (COLOR_CATEGORIA[carta.categoria] ?? colores.categorias.huariques) : colores.categorias.huariques;

  return (
    <View style={s.pantalla}>
      {confeti.map((c, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[
            s.papelito,
            {
              left: `${c.x}%`,
              top: `${c.y}%`,
              width: c.w,
              height: c.h,
              backgroundColor: c.color,
              borderRadius: c.redondo ? c.w / 2 : esc(1),
              transform: [{ rotate: `${c.giro}deg` }],
            },
          ]}
        />
      ))}

      <SafeAreaView edges={["top"]} style={s.centro}>
        <Text style={s.titulo}>¡Chapada!</Text>

        {/* Figurita troquelada. RN no tiene clip-path, así que el troquel del
            prototipo se aproxima con el borde redondeado y la inclinación. Es
            una disparidad conocida: el diente del troquel necesitaría un SVG
            con máscara, y no vale trabarse acá. */}
        {carta ? (
          <View style={s.giro}>
            <SombraDura offset={esc(4)} radio={radios.tarjeta} color="rgba(31,27,22,.3)">
              <View style={s.carta}>
                <View style={[s.arte, { backgroundColor: color }]} />
                <Text style={s.cartaNombre}>{carta.nombre}</Text>
                <Text style={s.cartaMeta}>
                  N.º {String(carta.id).padStart(3, "0")} ·{" "}
                  {(NOMBRE_CATEGORIA[carta.categoria] ?? "Huariques").toUpperCase()}
                </Text>
              </View>
            </SombraDura>
          </View>
        ) : null}

        <View style={s.chips}>
          {calle ? (
            <View style={s.chip}>
              <Text style={s.chipTexto}>+{calle} CALLE</Text>
            </View>
          ) : null}
          {racha ? (
            <View style={s.chip}>
              <Text style={s.chipTexto}>
                RACHA {racha} {racha === "1" ? "DÍA" : "DÍAS"}
              </Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>

      <SafeAreaView edges={["bottom"]} style={s.abajo}>
        <Tarjeta style={s.aviso}>
          <View style={s.avisoCuerpo}>
            <View style={s.calato} />
            <Text style={s.avisoTexto}>
              {revision
                ? "Se registró, pero la vamos a revisar: te moviste muy rápido entre dos Vueltas."
                : "Calato ya le ladró la noticia a todo el barrio."}
            </Text>
          </View>
        </Tarjeta>
        <Boton variante="linea" onPress={() => router.replace("/(app)")}>
          Seguir
        </Boton>
      </SafeAreaView>
    </View>
  );
}

/**
 * El confeti del prototipo, sembrado en colores de marca.
 *
 * `Math.random` acá es correcto y no un descuido: el confeti no tiene que ser
 * reproducible, tiene que verse distinto cada vez que alguien chapa.
 */
function sembrarConfeti(cuantos: number) {
  const paleta = [
    colores.papel,
    colores.tinta,
    colores.categorias.huariques,
    colores.categorias.caletas,
    colores.categorias.huacas,
    colores.categorias.caseros,
  ];
  return Array.from({ length: cuantos }, () => {
    const w = esc(5 + Math.random() * 7);
    return {
      x: Math.random() * 96,
      y: Math.random() * 88,
      w,
      h: esc(4 + Math.random() * 9),
      color: paleta[Math.floor(Math.random() * paleta.length)]!,
      giro: Math.round(Math.random() * 360),
      redondo: Math.random() < 0.3,
    };
  });
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.naranja },
  papelito: { position: "absolute" },

  centro: { alignItems: "center", paddingTop: esc(26), gap: esc(14) },
  titulo: { fontFamily: fuentes.display, fontSize: esc(46), lineHeight: esc(52), color: colores.tinta },

  giro: { transform: [{ rotate: "2deg" }] },
  carta: {
    width: esc(172),
    height: esc(226),
    backgroundColor: "#FFFFFF",
    borderRadius: radios.tarjeta,
    padding: esc(12),
    gap: esc(7),
  },
  arte: { flex: 1, borderRadius: esc(5) },
  cartaNombre: { fontFamily: fuentes.extrabold, fontSize: esc(12), lineHeight: esc(14.4), color: colores.tinta },
  cartaMeta: {
    fontFamily: fuentes.extrabold,
    fontSize: esc(9),
    letterSpacing: esc(0.72), // .08em sobre 9px
    color: colores.metadato,
  },

  chips: { flexDirection: "row", gap: esc(9) },
  chip: {
    backgroundColor: colores.tinta,
    borderRadius: radios.chip,
    paddingVertical: esc(7),
    paddingHorizontal: esc(13),
  },
  chipTexto: {
    fontFamily: fuentes.extrabold,
    fontSize: esc(12),
    letterSpacing: esc(1.08), // .09em sobre 12px
    color: colores.papel,
  },

  abajo: { position: "absolute", left: 0, right: 0, bottom: esc(24), paddingHorizontal: esc(18), gap: esc(12) },
  aviso: { padding: 0 },
  avisoCuerpo: { flexDirection: "row", alignItems: "center", gap: esc(11), padding: esc(11) },
  calato: {
    width: esc(38),
    height: esc(38),
    borderRadius: esc(19),
    borderWidth: esc(2),
    borderColor: colores.tinta,
    backgroundColor: colores.papelVivo,
  },
  avisoTexto: { flex: 1, fontFamily: fuentes.regular, fontSize: esc(12), lineHeight: esc(17), color: colores.textoSuave },
});
