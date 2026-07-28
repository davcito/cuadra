/**
 * Tokens de la identidad visual de Cuadra — V1.3 (ADR-0006).
 * Fuente de verdad de diseño: docs/identidad/CUADRA-Identidad-v1.3.dc.html
 * (guía viva en Claude Design). El código NO inventa colores fuera de esta paleta.
 */

export const colores = {
  papel: "#FBF7F0", // fondo
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
  display: { fontSize: 40, lineHeight: 44, fontFamily: fuentes.display },
  h1: { fontSize: 28, lineHeight: 32, fontFamily: fuentes.display },
  h2: { fontSize: 22, lineHeight: 26, fontFamily: fuentes.display },
  titulo: { fontSize: 18, lineHeight: 24, fontFamily: fuentes.bold },
  cuerpo: { fontSize: 16, lineHeight: 24, fontFamily: fuentes.regular },
  secundario: { fontSize: 14, lineHeight: 20, fontFamily: fuentes.medium },
  pie: { fontSize: 12, lineHeight: 16, fontFamily: fuentes.bold, letterSpacing: 0.96 },
} as const;

export const radios = {
  tarjeta: 16,
  boton: 14,
  chip: 999,
  campo: 12,
  flotante: 18,
} as const;

/**
 * Sombra dura de marca: plana, desplazada, en tinta, SIN blur (guía sección 05).
 * En RN se dibuja con una View detrás — ver <SombraDura> en components/ui.tsx.
 */
export const sombras = {
  boton: 4,
  tarjeta: 3,
  flotante: 3,
  modal: 6,
} as const;

// Calato (ADR-0006): assets oficiales en docs/identidad/calato/.
export const calato = {
  piel: "#6E5142",
  panza: "#C9A88C",
  mechon: "#E8622C", // el mechón SIEMPRE en el naranja de marca
} as const;
