# ADR-0004 — El mapa es MapLibre GL JS en WebView (no MapLibre nativo)

**Fecha:** 2026-06-12 · **Estado:** aceptada · **Sesión:** 3 (mapa)

## Contexto

El stack congelado exige **MapLibre GL + OpenFreeMap** (nunca Google Maps ni Mapbox). Pero `@maplibre/maplibre-react-native` es un módulo **nativo**, y Expo Go (el cliente que usamos para la beta — ADR-0003) solo incluye un set fijo de módulos nativos; MapLibre no está. Usarlo obligaría a un **development build** (EAS Build / prebuild), justo lo que el roadmap evita para no pagar Apple Developer antes del lanzamiento (§10 riesgo 9) y que en Windows + iPhone sin Mac es especialmente engorroso.

## Decisión

Renderizar el mapa con **MapLibre GL JS (la versión web)** dentro de un **`react-native-webview`**, con tiles de **OpenFreeMap** (estilo `liberty`, sin API key). La ubicación se obtiene con **`expo-location`** (nativo, sí disponible en Expo Go) y se inyecta en la WebView vía `injectJavaScript`. La WebView avisa a RN cuando el mapa cargó (`postMessage`).

Ambas piezas (`react-native-webview`, `expo-location`) son compatibles con Expo Go → seguimos iterando sin builds nativos.

## Consecuencias

- (+) Cumple el stack (MapLibre + OpenFreeMap, cero Google/Mapbox) y mantiene la beta en Expo Go.
- (+) El mismo HTML del mapa sirve para verificación web (Claude exporta y captura).
- (−) Una WebView rinde algo menos que un mapa nativo; aceptable para MVP/beta. Si el rendimiento lo exige (muchos marcadores, animaciones del radar), reevaluar MapLibre nativo cuando se haga el build nativo para publicar.
- (·) La comunicación RN↔mapa es por `injectJavaScript` (RN→mapa) y `postMessage` (mapa→RN); contrato simple y tipado en el componente.
