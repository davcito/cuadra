# Decisiones de arquitectura (ADRs)

Una decisión técnica que se desvía del documento maestro = un archivo corto aquí (CLAUDE.md, regla del proyecto). Formato: `NNNN-titulo-corto.md` con secciones **Contexto / Decisión / Consecuencias**, fecha y estado (propuesta · aceptada · reemplazada por NNNN).

| # | Decisión | Estado |
|---|---|---|
| [0001](0001-checkin-via-rpc.md) | Check-in via RPC server-side, no insert directo del cliente | aceptada |
| [0002](0002-estructura-src-expo.md) | La app usa la estructura `src/` del template Expo | aceptada |
| [0003](0003-sdk-54-compatibilidad-expo-go.md) | El proyecto se fija en Expo SDK 54 (compatibilidad con Expo Go) | aceptada |
| [0004](0004-mapa-maplibre-webview.md) | El mapa es MapLibre GL JS en WebView (no MapLibre nativo) | aceptada |
| [0005](0005-cross-platform-no-web-pwa.md) | Cuadra es cross-platform (Expo/RN), no una app web/PWA | aceptada |
| [0006](0006-identidad-v12-mascota-calato.md) | Identidad V1.2 en Claude Design + mascota Calato en render 3D | aceptada |
| [0007](0007-ciclo-de-vida-de-pois.md) | POIs con cuatro orígenes; la sync solo toca los de OSM y nunca borra | aceptada |
| [0008](0008-modelo-de-generacion.md) | El modelo recurrente se decide con comparación real, no por supuesto de costo | aceptada |
| [0009](0009-storage-de-fotos.md) | Fotos de Chapada en Supabase Storage, verificables por la RPC | aceptada |
| [0010](0010-catalogo-medios-y-album.md) | Catálogo híbrido, medios con procedencia y Álbum publicable | aceptada |
