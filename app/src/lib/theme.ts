/**
 * Tokens de la identidad visual de Cuadra — V1.2 (ADR-0006).
 * Fuente de verdad de diseño: docs/identidad/CUADRA-Identidad-v1.2.dc.html
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

// Display solo para titulares/celebraciones (nunca <20 px ni párrafos); Archivo para todo el cuerpo.
// Carga de fuentes (expo-font / @expo-google-fonts) pendiente de cablear en la app.
export const tipografia = {
  display: "AlfaSlabOne",
  ui: "Archivo",
} as const;

// Escala tipográfica móvil (fontSize/lineHeight) — guía sección 03.
export const escala = {
  display: { fontSize: 40, lineHeight: 44 },
  h1: { fontSize: 28, lineHeight: 32 },
  h2: { fontSize: 22, lineHeight: 26 },
  titulo: { fontSize: 18, lineHeight: 24 },
  cuerpo: { fontSize: 16, lineHeight: 24 },
  secundario: { fontSize: 14, lineHeight: 20 },
  pie: { fontSize: 12, lineHeight: 16 },
} as const;

// Sombra dura de marca: View desplazada plana en tinta, sin blur (guía sección 05).
export const radios = {
  tarjeta: 16,
  boton: 14,
  chip: 999,
} as const;

// Calato (ADR-0006): assets oficiales en docs/identidad/calato/.
export const calato = {
  piel: "#6E5142",
  panza: "#C9A88C",
  mechon: "#E8622C", // el mechón SIEMPRE en el naranja de marca
} as const;
