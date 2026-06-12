# Decisiones de arquitectura (ADRs)

Una decisión técnica que se desvía del documento maestro = un archivo corto aquí (CLAUDE.md, regla del proyecto). Formato: `NNNN-titulo-corto.md` con secciones **Contexto / Decisión / Consecuencias**, fecha y estado (propuesta · aceptada · reemplazada por NNNN).

| # | Decisión | Estado |
|---|---|---|
| [0001](0001-checkin-via-rpc.md) | Check-in via RPC server-side, no insert directo del cliente | aceptada |
| [0002](0002-estructura-src-expo.md) | La app usa la estructura `src/` del template Expo | aceptada |
| [0003](0003-sdk-54-compatibilidad-expo-go.md) | El proyecto se fija en Expo SDK 54 (compatibilidad con Expo Go) | aceptada |
| [0004](0004-mapa-maplibre-webview.md) | El mapa es MapLibre GL JS en WebView (no MapLibre nativo) | aceptada |
