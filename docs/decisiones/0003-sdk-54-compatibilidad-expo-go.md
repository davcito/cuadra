# ADR-0003 — El proyecto se fija en Expo SDK 54 (compatibilidad con Expo Go)

**Fecha:** 2026-06-11 · **Estado:** aceptada · **Sesión:** 1 (fundaciones)

## Contexto

`create-expo-app@latest` generó el proyecto en **SDK 56**, pero el cliente **Expo Go público del App Store soporta hasta SDK 54** (verificado en el iPhone del fundador: "supported SDK 54"). Al escanear el QR, Expo Go respondía *"project is incompatible with this version of Expo Go"*. Sin un dispositivo que cargue el bundle, no hay forma de iterar el MVP en la beta (que es Expo Go, no development builds — decisión del roadmap para no pagar Apple Developer hasta el lanzamiento, §10 riesgo 9).

## Decisión

Bajar el proyecto a **SDK 54** (`expo@54.0.35`, React 19.1, React Native 0.81) con `expo install --fix` + reinstalación limpia de `node_modules`. Reemplazar el template de bienvenida de Expo (que usaba APIs de navegación nativa y SF Symbols propias de SDK 56, incompatibles con 54) por una pantalla de inicio mínima y propia de Cuadra.

Cuando el Expo Go público soporte SDK 56+, se podrá reevaluar el upgrade — pero no hay prisa: SDK 54 es estable y maduro.

## Consecuencias

- (+) La app carga en Expo Go en dispositivos reales → la beta cerrada es viable sin development builds.
- (+) Se eliminó el template genérico; la home ya es de Cuadra y valida la conexión a Supabase en vivo.
- (−) Al usar APIs de Expo, consultar las docs de **v54** (`docs.expo.dev/versions/v54.0.0/`), no v56. `app/AGENTS.md` actualizado.
- (·) `geo.ts`/`supabase.ts` no se vieron afectados (no dependen del SDK); tests 13/13 y typecheck siguen en verde.
