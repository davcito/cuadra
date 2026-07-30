# 0008 — El modelo de generación: no es Haiku, y cuál es se decide después

**Fecha:** 2026-07-29 · **Estado:** aceptada (revisada el mismo día, ver §Revisión)

## Contexto

El documento maestro (§7.4) fijó **Claude Haiku 4.5** para el pipeline de generación, y ese
número mandó la estimación de costos: **~$11/mes**. La elección era razonable cuando se escribió
—el pipeline era un esqueleto y lo que importaba era que la arquitectura cerrara— pero se tomó
sin haber generado una sola Vuelta.

Al implementar `2-generate-missions.ts` de verdad aparece lo que la estimación no podía ver: el
producto **no está pidiendo JSON, está pidiendo copy**. Las dos cosas que definen si una Vuelta
sirve son:

1. **La voz de marca es la mitad del producto.** El documento maestro §3.3 no pide "español
   neutro correcto": pide *"español peruano cercano y juguetón, con cariño de barrio, jamás
   corporativo"*. `"Descubre experiencias únicas"` está explícitamente prohibido en el prompt.
   Esa distinción —entre sonar a un amigo limeño y sonar a un folleto— es exactamente donde los
   modelos se separan, y es lo que el usuario lee. Una Vuelta con datos correctos y voz de
   folleto es una Vuelta fallada.
2. **Es contenido que se escribe una vez y se lee muchas.** Un lote generado el lunes lo ven
   todos los usuarios de esa celda durante semanas. El costo es por generación; el daño de una
   mala generación es por lectura.

## Decisión

### 1. Haiku queda descartado

Por el punto 1 de arriba. Esto sí está decidido y no depende de nada más.

### 2. El contenido de E1 se escribe en sesión, sin API

La generación desatendida —un cron a las 3am en el VPS— necesita una clave de API con
facturación propia: una suscripción de Claude Code cubre el trabajo interactivo, no un proceso
sin nadie delante. Pero **E1 no necesita generación desatendida**: necesita contenido en la base
para la demo, una vez.

Ese contenido se escribe en una sesión de Claude Code y entra por `--desde-archivo`, que lo pasa
por **el mismo** `validarLoteVueltas()`, la misma regla anti-alucinación, la misma inyección de
`h3_index` y el mismo insert que usaría el modelo. Consecuencia útil: E1 ejercita de punta a
punta la maquinaria de inserción sin gastar un centavo, y cuando llegue la clave lo único nuevo
es de dónde sale el JSON.

Como el contenido lo escribe Opus 5, E1 arranca además con la calidad que el plan quería
reservar para el "set dorado".

### 3. Qué modelo usa el pipeline recurrente: **decisión diferida**

No se decide acá, a propósito. Se decide cuando exista lo que hace falta para decidirla bien:
copy real de ambos modelos sobre las mismas celdas, y volumen real que valorizar.

## Los números, para cuando toque decidir

Medidos, no estimados: el SYSTEM del prompt son ~850 tokens y el sync real da 9.5 POIs por celda
(388 POIs en 41 celdas de Barranco). Con ~1.170 tokens de entrada y ~3.780 de salida por celda:

| | por celda | Barranco (41 celdas, 1 vez) | Lima (150 celdas, semanal) |
|---|---|---|---|
| Sonnet 5 ($3/$15) | $0.060 | $2.47 | **$38.84/mes** |
| Opus 5 ($5/$25) | $0.100 | $4.11 | **$64.74/mes** |
| diferencia | $0.040 | **$1.65** | $25.89/mes |

Dos lecturas, y la segunda es la que importa:

- **A escala de E1 el costo es irrelevante.** $1.65 de diferencia por todo Barranco. Cualquier
  argumento de costo para elegir modelo en esta etapa es ruido.
- **A escala Lima el costo manda.** El presupuesto de §7.8 para validación es $15–40/mes:
  Sonnet entra raspando ($39, o sea el techo) y Opus se pasa ($65). Ahí entra la **Batch API**
  (50 % de descuento, y el pipeline es semanal y no sensible a latencia): Opus con Batch daría
  ~$32/mes, dentro del presupuesto. Eso reabre Opus incluso para el caso recurrente — pero es
  aritmética, no medición, y no se afirma hasta correrlo.

> **Corrección de este mismo ADR.** La primera versión decía "~$33/mes con Sonnet, cómodamente
> dentro del presupuesto". El cálculo por celda da **$39/mes**, que es el techo del rango, no el
> medio. El $33 salía de escalar ×3 la estimación de Haiku del maestro en vez de calcularlo.
> Escalar una estimación no la convierte en una medición.

## Cómo se evita que esto vuelva a ser una estimación

La lección del $11/mes es que un número sin medición es una opinión con decimales. El script
mide:

- **`--dry-run` cuenta los tokens de entrada reales** con la API de conteo (gratis, no llama al
  modelo) e imprime el costo del lote **y** la proyección a las celdas con POIs activos —
  contadas, no supuestas— antes de gastar nada.
- **Toda corrida real imprime el costo medido** de `usage`, y lo deja en el rastro (`costo_usd`).
- **El modelo es una bandera** (`--modelo`), así que comparar Sonnet contra Opus sobre las mismas
  celdas no requiere tocar código. Ese es el experimento que resuelve la decisión diferida.

## Consecuencias

**A favor**

- E1 avanza sin depender de una clave de API ni de una decisión de costo recurrente.
- El camino de inserción se prueba entero antes de que haya un solo peso en juego.
- La decisión cara se toma cuando haya evidencia, no ahora.

**En contra**

- El contenido de E1 no es reproducible por el pipeline: lo escribió una sesión, no un script.
  Si se regenera Barranco con el modelo, va a dar otra cosa. **Mitigación:** el archivo queda
  versionado en `worker/contenido/`, así que es reproducible como dato aunque no como proceso.
- Queda una decisión abierta, que es deuda hasta que se cierre.

**Lo que esta decisión NO resuelve**

- El modelo del pipeline recurrente (por diseño).
- El endpoint de vueltas personalizadas de La Llave (regla dura #2) es interactivo y sensible a
  latencia: va a querer su propia decisión, probablemente distinta.
- No hay evaluación sistemática de calidad de copy. Hoy el criterio es leerlas, más una
  auditoría adversarial contra invención de datos. Con varias decenas de Vueltas va a hacer
  falta algo mejor que el ojo.

## Archivos que cambian con esta decisión

- `worker/pipeline/2-generate-missions.ts` — modo `--desde-archivo`, tabla `PRECIOS`, medición.
- `worker/pipeline/1-sync-pois.ts` — `--volcar`, para tener POIs reales sin base.
- `worker/prompts/generacion-vueltas.md` — v1.1: el encabezado declaraba Haiku.
- `CLAUDE.md` y `docs/documento-maestro.md` §7.4 — la línea "(Haiku 4.5)" queda desactualizada.
