# Cuadra

**Tu ciudad, cuadra por cuadra.** App móvil de exploración urbana gamificada: vueltas diarias generadas por IA sobre lugares reales (OSM), álbum de figuritas de tu ciudad, modo seguro nativo. Mercado inicial: Lima.

📕 **Fuente de verdad:** [docs/documento-maestro.md](docs/documento-maestro.md) · Contexto para Claude Code: [CLAUDE.md](CLAUDE.md) · Decisiones: [docs/decisiones/](docs/decisiones/)

## Mapa del repo

| Carpeta | Qué es | Estado |
|---|---|---|
| `app/` | App Expo (RN + TS estricto, expo-router, SDK 56). Lógica compartida en `src/lib/` | esqueleto + geo testeada |
| `supabase/migrations/` | Esquema Postgres + PostGIS con RLS en todas las tablas | migración inicial lista |
| `supabase/seed/` | Seed de dev: 37 celdas H3 reales de Barranco + datos de prueba | generado |
| `worker/` | Pipeline del VPS (cron): sync POIs → generar vueltas → verificar fotos | contratos + stubs |
| `worker/prompts/` | Prompts versionados como código (regla dura #8) | v1 |
| `scripts/` | Utilidades (generador de celdas H3, etc.) | — |

## Arrancar

```bash
# App (requiere Expo Go en el teléfono)
cd app && npm install && npm start

# Tests (geo + contrato de vueltas)
cd app && npm test
cd worker && npm install && npm test

# Base de datos (requiere proyecto Supabase creado y linkeado)
npx supabase link --project-ref TU_REF
npx supabase db push          # aplica supabase/migrations/
# seed de dev: pegar supabase/seed/seed.sql en el SQL editor o psql

# Regenerar seed de celdas
node scripts/generar-celdas-barranco.mjs > supabase/seed/seed.sql
```

## Reglas de oro (detalle en CLAUDE.md)

1. La IA **nunca** inventa lugares — toda vuelta referencia un `poi_id` real.
2. La app **nunca** llama a la API de Claude — generación solo en el worker.
3. RLS en toda tabla; escritura de contenido solo `service_role`.
4. El modo seguro no se puede ignorar en ninguna query de vueltas.
5. Distancias en **cuadras**, jamás en km.
