# CLAUDE.md — Cuadra

## Qué es este proyecto

Cuadra es una app móvil de exploración urbana gamificada (mercado inicial: Lima, Perú; diseñada para localizarse por país). Genera misiones diarias con IA ancladas a lugares reales (OpenStreetMap); el usuario las completa caminando y colecciona figuritas de su ciudad en un álbum. Monetización: suscripción "La Llave" + B2B (negocios pagan por tráfico físico verificado).

**Fuente de verdad:** `docs/documento-maestro.md`. Ante cualquier duda de producto, arquitectura o alcance, leer ese documento ANTES de proponer soluciones. Si una decisión se desvía de él, crear un ADR en `docs/decisiones/` y avisar.

## Stack (congelado — no proponer alternativas salvo bloqueo real)

- **App:** React Native + Expo (TypeScript estricto), expo-router
- **Backend:** Supabase — Postgres + PostGIS, Auth, Storage. RLS obligatorio en TODA tabla
- **Workers:** Node.js en VPS propio (cron): pipeline de misiones, verificación, rankings
- **Fotos:** Cloudflare R2 (URLs firmadas, subida directa desde la app)
- **Mapas:** MapLibre GL + OpenFreeMap (nunca Google Maps SDK ni Mapbox)
- **Geo:** h3-js (resolución 9), PostGIS para queries, haversine/bearing propios en `app/src/lib/geo.ts`
- **IA:** API de Claude (Haiku 4.5) SOLO desde el worker, nunca desde la app. Salidas en JSON estricto validado con zod
- **Pagos:** RevenueCat (IAP) + Culqi/Mercado Pago para Yape/Plin (riel web)
- **Analytics:** PostHog · Errores: Sentry

## Glosario de dominio (LEY — nombres de UI nunca se renombran)

| Código/DB | UI (es-PE) | Concepto |
|---|---|---|
| `missions` | **Vueltas** | misiones diarias |
| `calle_xp` | **Calle** | puntos de experiencia |
| `streaks` | **Racha** | días consecutivos |
| `cards` / `user_cards` | **Figuritas / El Álbum** | coleccionables; páginas = barrios |
| acción de capturar | **Chapar / "¡Chapada!"** | completar y obtener figurita |
| `geo_notes` | **Recados** | cápsulas geoancladas |
| suscripción | **La Llave** | nunca "Pro" ni "Premium" en UI |
| mayor actividad en celda | **Alcalde/Alcaldesa de la cuadra** | mecánica de competencia |
| categorías | Huariques, Caletas, Huacas, Caseros | comida / secretos / patrimonio / social |
| rangos | Nuevo en la cuadra → Vecino/a → Callejero/a → Casero/a → Cronista → Leyenda del barrio | progresión |
| distancia | **cuadras** (no km) en toda la UI | firma de marca |
| mascota | **Calato** | viringo 3D tonto-amistoso; guía `docs/identidad/` + ADR-0006; rasgos innegociables: orejas murciélago + mechón 1 llama naranja + lengua de costado |

Voz de marca: español peruano cercano y juguetón, cariño de barrio, jamás corporativo. Ejemplos canónicos en §3.3 del documento maestro.

## Reglas duras de ingeniería

1. **La IA nunca inventa lugares.** Toda misión referencia un `poi_id` existente extraído de OSM. Validar con zod; si el JSON no cumple schema, descartar y reintentar, nunca insertar parcial.
2. **La app no llama a la API de Claude.** Generación = batch en worker. Excepción única: endpoint de vueltas personalizadas para La Llave (rate-limited 3/día), también server-side.
3. **RLS primero:** ninguna tabla llega a migración sin políticas. Escritura de contenido (missions, pois, cells, cards) solo via `service_role` desde el worker.
4. **Modo seguro es feature de primera clase:** ninguna query de misiones puede ignorar `cells.nivel_seguridad` ni la ventana horaria.
5. **Anti-fraude en capas** (documento maestro §7.6): cámara in-app only, geofence < 75 m, flag mock-location, velocidad imposible. No debilitar ninguna capa por conveniencia de desarrollo; usar seeds/flags de test.
6. Fronteras de datos (API, worker, formularios) siempre tipadas + validadas con zod.
7. Migraciones SQL versionadas en `supabase/migrations/`, nunca cambios manuales en el dashboard.
8. Prompts de generación viven en `worker/prompts/` y se versionan como código: cambio de prompt = commit con justificación.

## Estructura

```
app/        Expo SDK 54 (rutas en src/app/, lógica compartida en src/lib/ — ver ADR-0002)
supabase/   migrations/ + seed/
worker/     pipeline/ (1-sync-pois, 2-generate-missions, 3-verify-photos) + prompts/ + admin/
docs/       documento-maestro.md + decisiones/ (ADRs) + identidad/ (guía V1.2 + assets Calato)
scripts/    utilidades
```

Nota SDK 54 (ver ADR-0003): el proyecto se fijó en SDK 54 por compatibilidad con el
Expo Go público. Al usar APIs de Expo, consulta las docs versionadas
(https://docs.expo.dev/versions/v54.0.0/) antes de escribir código.

## Comandos frecuentes

```bash
# App
cd app && npx expo start            # dev en dispositivo (Expo Go)
npx expo prebuild && eas build      # builds (cuando haga falta nativo)

# Supabase
npx supabase db push                # aplicar migraciones
npx supabase db reset               # reset local + seed

# Worker (en VPS via cron; local para probar)
cd worker && npm run sync-pois -- --distrito=barranco
npm run generate-missions -- --celda=<h3> --dry-run   # dry-run imprime sin insertar
```

## Contexto del fundador

Desarrollador solo, a tiempo parcial (universidad + otro negocio). Sesiones de trabajo cortas y enfocadas: **una sesión = un entregable del roadmap** (documento maestro §8). Priorizar simpleza mantenible sobre elegancia; cada dependencia nueva debe justificarse. Conoce bien JS/TS, VPS, Cloudflare y la API de Claude; está aprendiendo React Native, PostGIS y H3 — al tocar esos temas, explicar brevemente el porqué de las decisiones.
