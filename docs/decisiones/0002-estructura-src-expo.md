# ADR-0002 — La app usa la estructura `src/` del template Expo SDK 56

**Fecha:** 2026-06-11 · **Estado:** aceptada · **Sesión:** 1 (fundaciones)

## Contexto

El documento maestro (§12.1) esboza `app/app/` (rutas) y `app/lib/` (lógica) en la raíz del proyecto Expo. El template oficial de `create-expo-app` (SDK 56, 2026) genera en cambio `src/app/`, `src/components/`, `src/hooks/`, con alias TS `@/* → src/*`. Pelear contra el layout del template = fricción permanente con upgrades, docs y tooling de Expo.

## Decisión

Adoptar la convención del template: **rutas en `app/src/app/`, lógica compartida en `app/src/lib/`** (geo, cliente supabase), componentes en `app/src/components/`. Imports con alias `@/lib/...`.

## Consecuencias

- (+) Compatibilidad directa con docs y upgrades de Expo SDK 56+.
- (·) Donde el documento maestro diga `app/lib/...` léase `app/src/lib/...`. CLAUDE.md ya quedó actualizado.
