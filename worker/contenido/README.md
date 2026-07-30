# `worker/contenido/` — Vueltas escritas, versionadas como dato

Acá viven lotes de Vueltas en JSON que entran a la base por
`2-generate-missions.ts --desde-archivo`, sin pasar por el modelo.

## Por qué existe esta carpeta

El pipeline normal genera Vueltas llamando a la API de Claude desde el VPS. Eso necesita una
clave de API con facturación propia, porque una suscripción de Claude Code cubre trabajo
interactivo, no un cron a las 3am.

Pero **E1 no necesita generación desatendida**: necesita contenido en la base para la demo, una
vez. Ese contenido se escribió en una sesión interactiva y quedó acá.

Lo importante es que **el camino de inserción es el mismo**: el archivo pasa por
`validarLoteVueltas()`, la regla anti-alucinación, la regla 7 (Calle coherente con dificultad),
la regla 5 (distancias en cuadras) y la misma inyección de `h3_index`. Cuando llegue la clave de
API, lo único nuevo es de dónde sale el JSON.

Ver `docs/decisiones/0008-modelo-de-generacion.md`.

## Formato

```json
{
  "distrito": "Barranco",
  "generado_por": "quién y cómo — que se sepa leyendo el archivo",
  "celdas": [
    {
      "h3_index": "898e62c5277ffff",
      "vueltas": [
        {
          "osm_id": 2474848392,
          "titulo": "...",
          "descripcion": "...",
          "tipo": "observacion | consumo | social | patrimonio",
          "categoria": "huarique | caleta | huaca | casero",
          "dificultad": 1,
          "calle_xp": 12,
          "ventana_horaria": ["tarde", "noche"],
          "requiere_foto": true,
          "instruccion_verificacion": "..."
        }
      ]
    }
  ]
}
```

**Se referencia por `osm_id`, no por `poi_id`.** No es un capricho: `pois.id` lo asigna Postgres
al insertar (`generated always as identity`), así que al escribir el contenido ese número
todavía no existe. El `osm_id` sí es estable y conocido desde el volcado de Overpass. El
insertador resuelve `osm_id → poi_id` contra la base.

## Uso

```bash
# 1. Sacar los POIs reales de Overpass a un archivo (gratis, sin credenciales)
npm run sync-pois -- --distrito=barranco --volcar=/tmp/barranco-pois.json

# 2. Validar el lote sin base y sin API — esto se puede hacer siempre
npm run generate-missions -- --desde-archivo=contenido/barranco-vueltas.json \
                             --pois=/tmp/barranco-pois.json --dry-run

# 3. Insertar como draft (necesita SUPABASE_* en worker/.env, y los POIs ya sincronizados)
npm run generate-missions -- --desde-archivo=contenido/barranco-vueltas.json

# 4. Revisar y activar (la celda tiene que estar activa: regla dura #4)
npm run activar -- --celda=898e62c5277ffff
```

El paso 2 valida los `osm_id` contra el volcado en vez de contra la base, así que la regla
anti-alucinación se ejercita de verdad aunque todavía no exista la tabla `pois`.

## Lo que este contenido NO es

**No es reproducible por el pipeline.** Lo escribió una sesión, no un script: si mañana se
regenera Barranco con el modelo, va a dar otra cosa. Por eso el archivo se versiona — es
reproducible como *dato*, aunque no como *proceso*.
