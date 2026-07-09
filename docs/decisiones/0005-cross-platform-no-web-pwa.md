# ADR-0005 — Cuadra es cross-platform (Expo/React Native), no una app web/PWA

**Fecha:** 2026-07-09 · **Estado:** aceptada · **Sesión:** revisión de stack

## Contexto

El stack está congelado en React Native + Expo (CLAUDE.md), pero surgió la pregunta de fondo — para un fundador solo, ¿no conviene una **app web / PWA** (un solo código, más barata) en vez de cross-platform o nativo puro (Android Studio + Xcode)? El requisito no negociable es estar **instalable en App Store *y* Google Play**. No había registro del porqué se descarta la web, así que un futuro "¿y si lo hacemos web?" costaría re-investigar. Este ADR deja la decisión asentada (evaluado y descartado).

Dato duro de las tiendas (2026): Google Play acepta PWAs empaquetadas (TWA/Bubblewrap), pero **Apple no** — una PWA envuelta se rechaza bajo la Guideline 4.2 "Minimum Functionality" ("no es suficientemente distinta a navegar en Safari"). Sin binario nativo genuino, no hay App Store.

## Decisión

Seguir en **cross-platform con Expo/React Native** (un código → dos apps nativas reales). **Web pura/PWA descartada** para el producto. Razones decisivas *para Cuadra en concreto*:

1. **App Store:** una PWA queda fuera de iOS (Guideline 4.2). El requisito de dos tiendas ya la elimina.
2. **Anti-fraude (regla dura #5, §7.6):** exige cámara in-app, detección de mock-location (API **nativa** de Android), geofence < 75 m y magnetómetro (radar). La web no da esos con fiabilidad — Safari restringe sensores y no hay forma web de detectar GPS falso. Sin ellos, la promesa B2B ("visitas verificadas") se cae.
3. **Background + push:** ubicación en background y push notifications son limitadísimos en web, sobre todo en iOS.

## Consecuencias

- (+) Un código para ambas tiendas, con acceso nativo completo al hardware; el anti-fraude y la facturación B2B se sostienen. ~Mitad del costo de nativo puro (dos bases de código).
- (+) Cierra la puerta a re-litigar "¿y si es web?": ya está evaluado y por qué.
- (−) Se paga el ciclo de review de las tiendas y no se aprovechan las ventajas de la web (instalar sin tienda, deploy instantáneo).
- (·) Excepción puntual, ya documentada en **ADR-0004**: el *mapa* corre en una WebView (MapLibre GL JS) dentro de la app nativa. Eso es una superficie acotada, no la arquitectura — la app sigue siendo nativa (RN).
