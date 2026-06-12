# Worker de Cuadra

Corre en el VPS via cron (mismo patrón que el bot de DavcStore). Es el ÚNICO componente con `service_role` y el único que llama a la API de Claude (reglas duras #2 y #3).

```bash
npm install
cp .env.example .env   # completar credenciales (jamás commitear)

npm test               # contrato de Vueltas (zod + anti-alucinación)
npm run typecheck

npm run sync-pois -- --distrito=barranco            # paso 1 (esqueleto)
npm run generate-missions -- --celda=<h3> --dry-run  # paso 2 (esqueleto)
npm run verify-photos                                # paso 3 (stub)
```

| Pieza | Estado |
|---|---|
| `pipeline/schema.ts` | **Real** — contrato §7.3 con validación anti-poi-inventado, testeado |
| `prompts/generacion-vueltas.md` | **v1 completa** — versionada como código (regla #8) |
| `pipeline/1-sync-pois.ts` | Esqueleto con plan — implementación en sesión "pipeline de contenido" |
| `pipeline/2-generate-missions.ts` | Esqueleto que ya valida el contrato — ídem |
| `pipeline/3-verify-photos.ts` | Stub — llega con el loop completable (fotos en R2) |
| `admin/` | Vacío — panel admin mínimo llega en semanas 3–4 |

Crons previstos (se registran en el VPS cuando el pipeline esté implementado): sync semanal, generación semanal, verificación diaria.
