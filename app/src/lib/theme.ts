/**
 * Tokens de la identidad visual de Cuadra — V1.3 (ADR-0006).
 * Fuente de verdad de diseño: docs/identidad/CUADRA-Identidad-v1.3.dc.html
 * (guía viva en Claude Design). El código NO inventa colores fuera de esta paleta.
 */
import { Dimensions } from "react-native";

/**
 * ESCALA DEL PROTOTIPO → EQUIPO REAL.
 *
 * El prototipo dibuja sus teléfonos en un lienzo de **336 × 718**. Un iPhone 15
 * Pro Max mide **430 × 932**: copiar sus números tal cual encoge la app un 22 %,
 * y así se veía la barra de pestañas "apretada" el 2026-07-28.
 *
 * `esc()` traduce una medida del prototipo a la escala del equipo. TODO número
 * que salga del prototipo pasa por acá — alto, padding, radio, fuente. Los que
 * NO pasan son los que no vienen del diseño (flex, opacidad, duraciones).
 *
 * Con el lienzo del prototipo el factor es 1, así que `scripts/paridad-css.mjs`
 * (que corre en Node con un ancho de 336) compara spec contra spec.
 */
const ANCHO_PROTOTIPO = 336;

/**
 * El piso de 0,8 no es cosmético: el factor se calcula UNA vez al cargar el
 * módulo, y hay contextos donde `Dimensions` todavía devuelve 0 de ancho. Sin
 * piso, el factor sería 0 y la app entera se renderizaría a tamaño cero — un
 * fallo total y difícil de leer, porque no hay error, solo una pantalla vacía.
 */
export const factorEscala = Math.min(
  Math.max(Dimensions.get("window").width / ANCHO_PROTOTIPO, 0.8),
  1.4 // tope: en una tablet no queremos una app gigante
);

/** Una medida del prototipo, a la escala del equipo. */
export const esc = (n: number) => Math.round(n * factorEscala * 10) / 10;

export const colores = {
  papel: "#FBF7F0", // fondo
  papelVivo: "#FFFDF8", // la raya clara del toldo y del papel del Álbum
  tinta: "#1F1B16", // texto y trazos
  naranja: "#E8622C", // Naranja Chicha — UNA acción principal por pantalla
  categorias: {
    huariques: "#C93B2C",
    caletas: "#157F6D",
    huacas: "#C4841D", // también el dorado de La Llave
    caseros: "#CE3E78",
  },
  exito: "#2F8F4E",
  error: "#A4211B",
  textoSuave: "#5C5347",
  metadato: "#8A7E6E",
} as const;

// Modo oscuro: papel sobre tinta; categorías suben un paso de luminosidad.
export const coloresOscuro = {
  fondo: "#1F1B16",
  superficie: "#2C241C",
  texto: "#F6EFE4",
  naranja: "#F0703D", // mantiene AA sobre #1F1B16
  caletas: "#2FA98F",
  huacas: "#E0A94B",
} as const;

/**
 * Familias tipográficas. En React Native `fontWeight` NO aplica a fuentes
 * personalizadas: cada peso es una familia propia. Por eso los estilos usan
 * `fontFamily: fuentes.bold` en vez de `fontWeight: "700"`.
 * Se cargan en src/app/_layout.tsx con useFonts.
 *
 * Display (Alfa Slab One) solo para titulares, números grandes y celebraciones
 * — nunca en párrafos ni bajo 20 px (guía, sección 06).
 */
export const fuentes = {
  display: "AlfaSlabOne_400Regular",
  regular: "Archivo_400Regular",
  medium: "Archivo_500Medium",
  semibold: "Archivo_600SemiBold",
  bold: "Archivo_700Bold",
  extrabold: "Archivo_800ExtraBold",
} as const;

/** Alias legado; preferir `fuentes`. */
export const tipografia = {
  display: fuentes.display,
  ui: fuentes.regular,
} as const;

/**
 * Escala tipográfica móvil (guía sección 03). Cada escalón trae su familia,
 * así un estilo se aplica con un solo spread: `style={escala.titulo}`.
 */
export const escala = {
  display: { fontSize: esc(40), lineHeight: esc(44), fontFamily: fuentes.display },
  h1: { fontSize: esc(28), lineHeight: esc(32), fontFamily: fuentes.display },
  h2: { fontSize: esc(22), lineHeight: esc(26), fontFamily: fuentes.display },
  titulo: { fontSize: esc(18), lineHeight: esc(24), fontFamily: fuentes.bold },
  cuerpo: { fontSize: esc(16), lineHeight: esc(24), fontFamily: fuentes.regular },
  secundario: { fontSize: esc(14), lineHeight: esc(20), fontFamily: fuentes.medium },
  pie: {
    fontSize: esc(12),
    lineHeight: esc(16),
    fontFamily: fuentes.bold,
    letterSpacing: esc(0.96),
  },
} as const;

export const radios = {
  tarjeta: esc(16),
  boton: esc(14),
  chip: 999, // píldora: no escala, es "redondo del todo"
  campo: esc(12),
  flotante: esc(18),
} as const;

/**
 * Medidas calcadas del prototipo (sección 02). Viven acá y NO en la pantalla
 * porque hay piezas flotantes que se apoyan unas en otras: la tarjeta del mapa
 * necesita saber cuánto mide la barra de pestañas. Un número suelto en dos
 * archivos ya nos costó un bug — el token es la única copia.
 *
 * `barra` = 9 (padding) + 17 (icono) + 3 (gap) + 11 (rótulo) + 9 (padding), todo
 * en medidas del prototipo — `esc()` las lleva a la escala del equipo (63 en el
 * iPhone 15 Pro Max).
 */
export const medidas = {
  barra: esc(49),
  barraMargen: esc(14),
  barraPaddingV: esc(9),
  barraPaddingH: esc(6),
  iconoBarra: esc(17),
  gapBarra: esc(3),
  rotuloBarra: esc(9),
  rotuloBarraAlto: esc(11),
  iconoPerfil: esc(16),
  toldoRaya: esc(14),
} as const;

/**
 * Sombra dura de marca: plana, desplazada, en tinta, SIN blur (guía sección 05).
 * En RN se dibuja con una View detrás — ver <SombraDura> en components/ui.tsx.
 */
export const sombras = {
  boton: esc(4),
  tarjeta: esc(3),
  flotante: esc(3),
  modal: esc(6),
} as const;

// Calato (ADR-0006): assets oficiales en docs/identidad/calato/.
export const calato = {
  piel: "#6E5142",
  panza: "#C9A88C",
  mechon: "#E8622C", // el mechón SIEMPRE en el naranja de marca
} as const;
