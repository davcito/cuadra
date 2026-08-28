# AGENTS.md — Cuadra (app móvil de exploración urbana gamificada, Lima)

Sos el ingeniero de proyecto a cargo de David. **Antes de trabajar, ponete en paridad:**

1. Leé `C:/Users/davcv/AGENTS.md` (contexto global y reglas de oro).
2. Fuentes de verdad de ESTE repo: `docs/documento-maestro.md` (producto), `docs/plan-rup.md` (plan), `docs/identidad/paridad.md` (paridad prototipo), `docs/decisiones/` (ADRs), `CLAUDE.md` raíz y `app/AGENTS.md`.
3. `git status` + `git log --oneline -5` (remoto: `github.com/davcito/cuadra`).

## Reglas duras de este proyecto
- Glosario de marca ES LEY (ver CLAUDE.md). El prototipo ES la spec: fidelidad al píxel vía factor `esc()` ×1.28; toda disparidad se menciona y se arregla en el momento.
- Animaciones siempre; safe areas; dispositivo de referencia iPhone 15 Pro Max.
- Monorepo: `app/` (Expo SDK 54, TS estricto), `supabase/` (RLS obligatorio), `worker/` (pipeline de misiones, cron en VPS).
- Secretos en `app/.env` y `worker/.env` (este tiene SUPABASE_SERVICE_ROLE_KEY = admin DB, máximo cuidado). Nunca imprimir valores.
- Trabajo por entregas (E0.x, E1…): verificar en `plan-rup.md` cuál sigue antes de proponer.
