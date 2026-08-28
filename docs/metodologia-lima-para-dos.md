# La metodología de Lima para Dos — ingeniería inversa con evidencia

**Fecha:** 2026-07-31 · **Fuente:** `davcstore.com/planes/` — `js/generator.js` (18.459 B) y
`data/places.js` (228.742 B), descargados y analizados. **Todo número de este documento sale de medir
esos dos archivos**, no de recordar.

Existe porque el prompt original de curación se perdió. Esto lo reconstruye desde su salida.

---

## Parte 1 — Por qué los planes "tienen sentido": el motor

No es un recomendador ni un ranking. Es un **compositor de itinerarios** con 11 decisiones encadenadas.
Las 5 primeras son las que producen la sensación de "esto lo podría usar de verdad".

### 1. La microzona es una restricción DURA, no una preferencia

```js
const pool = all.filter(p => p.microzona === zone.mz);   // generator.js:252
```

Todas las paradas salen de **la misma microzona caminable**. No "cerca": la misma zona con nombre
propio. Hay **14 microzonas** para 264 lugares (medido) — entre 16 y 22 lugares cada una:

| Microzona | Lugares | Banda |
|---|---|---|
| Miraflores Parque Kennedy y Malecon | 22 | superlejos |
| Magdalena y San Isidro bajo | 20 | cerca |
| San Isidro El Olivar y Financiero | 20 | lejos |
| Barranco Bohemio | 20 | superlejos |
| San Borja - Teatro Nacional y MUCEN | 20 | superlejos |
| Centro Historico de Lima | 19 | cerca |
| Pueblo Libre Museos | 19 | cerca |
| Jesus Maria - Campo de Marte | 19 | lejos |
| Centro Civico y Parque de la Exposicion | 18 | cerca |
| Callao Monumental y La Punta | 18 | lejos |
| Lince y La Victoria gastronomico | 18 | lejos |
| Chorrillos - Morro Solar y La Herradura | 18 | superlejos |
| San Miguel Costanera | 17 | cerca |
| Surco y Jockey Plaza | 16 | superlejos |

**La lección:** la microzona hace el trabajo pesado de coherencia. Un plan no puede salir incoherente
en el espacio porque el espacio se fijó ANTES de elegir nada. La banda (`cerca`/`lejos`/`superlejos`)
no mide el lugar: mide **qué tan lejos está la microzona de la base del usuario**.

### 2. La plantilla es una dramaturgia, no una lista

Cada "vibra" es una secuencia ORDENADA de slots, y cada slot tiene un **rol narrativo** (`hint`):

```js
romantico: { inicio: 18.5, slots: [
  { cats: G.comida,                         hint: 'Cena'   },
  { cats: G.noche,                          hint: 'Copas'  },
  { cats: ['mirador','actividad','parque'], hint: 'Vista'  },
  { cats: G.dulce,                          hint: 'Postre' } ] }
```

Cinco plantillas: `romantico` (arranca 18:30), `cultural` (11:00), `gastronomico` (13:00),
`fotos` (10:30), `completo` (12:00, 6 slots). El plan no es "4 lugares lindos": es
**cena → copas → vista → postre**. Ahí está la sensación de plan pensado.

### 3. El itinerario se reordena por fase del día

Después de elegir, las paradas se **re-ordenan** por una tabla de fases:

```js
PHASE = { museo:1, cultura:1, galeria_fotos:1.5, compras:2, parque:2, actividad:2.5,
          comida:3, cafe:4, postre:4.2, heladeria:4.3, mirador:5,
          cine:6, teatro:6, bar:7, discoteca:7.5, spa:2, hotel:9 }
```

Con dos correcciones finas que revelan oficio:
- **La segunda comida del plan salta a fase 6.2** → deja de ser almuerzo y se vuelve cena.
- **`momento_ideal` corrige la fase**: un lugar `noche` suma +3; uno `mañana` resta −2.

Resultado: el día fluye museo → almuerzo → café → mirador → bar, aunque se hayan elegido en desorden.

### 4. Mejor-de-N por compacidad — el optimizador que nadie ve

```js
for (const R of [1.6, 2.6, 90]) {            // radio en km
  for (let a = 0; a < 8; a++) {              // 8 intentos por radio
    const st = selectStops(R);
    const km = routeKm(orderStops(st));
    if (km < bestKm) { bestKm = km; stops = st; }   // se queda la MÁS COMPACTA
  } if (stops) break; }
```

Genera hasta 8 variantes con radio apretado (1,6 km), se queda con **la ruta más corta**, y solo
relaja el radio si la zona no da para 3 paradas. **Esto es lo que hace que las paradas queden
caminables entre sí**, no la suerte.

### 5. El presupuesto baja en cascada, no de golpe

```js
PRICE_TIERS = { barato: [[1],[1,2],[1,2,3]], medio: [[1,2],[1,2,3]], caro: [[3],[2,3],[1,2,3]] }
```

Un plan "barato" prueba primero solo precio 1; si esa categoría no tiene nada barato en la zona,
sube a 1-2, y recién después a todo. Nunca salta directo a lo caro.

### 6-11. El resto de la maquinaria

- **Caminar vs taxi:** ≤1,3 km entre paradas = caminando a 4,8 km/h; si no, taxi con costo
  `clamp(4 + 2,3×km, 6, 60)`.
- **Costo para DOS:** distingue por regex si el precio es por persona (×2) o por mesa/pareja/noche (×1).
  Categorías `PER_PERSON` predefinidas para cuando el texto no da pista.
- **Horario real:** acumula duración + traslado y estampa hora de inicio/fin por parada.
- **Rango de costo:** `min = costo×0,9 + transporte`, `max = costo×1,15 + transporte`.
- **Ruta de Google por NOMBRE, no por coordenada** — Google resuelve al negocio exacto.
- **Hoteles y spa están EXCLUIDOS del itinerario** (`LODGING`) y se ofrecen aparte como opcionales.

---

## Parte 2 — El contrato de datos: la metodología de curación reconstruida

**18 campos, presentes en los 264 lugares sin una sola excepción** (medido). Esa disciplina perfecta
es la huella del prompt.

```
id · band · microzona · nombre · categoria · tipo · distrito · direccion_aprox
lat · lng · precio · precio_rango_soles · descripcion · duracion_min
momento_ideal · ideal_pareja · tip · gmaps_query
```

### Vocabularios cerrados (medidos)

| Campo | Valores | Distribución |
|---|---|---|
| `categoria` | **16 cerrados** | comida 89 · cafe 34 · bar 27 · parque 18 · museo 17 · cultura 13 · heladeria 12 · mirador 12 · cine 10 · hotel 8 · teatro 6 · galeria_fotos 5 · postre 5 · compras 4 · actividad 2 · spa 2 |
| `tipo` | texto libre descriptivo | "plaza colonial", "bar restaurante criollo historico", "heladeria artesanal tradicional" |
| `precio` | **1 / 2 / 3** | 107 / 120 / 37 |
| `momento_ideal` | mañana/tarde/noche/cualquiera | 34 / 127 / 79 / 24 |
| `band` | cerca/lejos/superlejos | 93 / 75 / 96 |
| `duracion_min` | 20–180, en pasos de 5 | mediana 75 |

**`duracion_min` es coherente con la categoría** (media medida): cine 149 · hotel 142 · teatro 118 ·
bar 92 · comida 86 · museo 76 · parque 63 · cafe 54 · mirador 54 · heladeria 38 · galeria_fotos 38.
No es un número puesto al azar: es cuánto dura de verdad esa clase de parada.

### La regla de oro del texto: DOS campos con trabajos disjuntos

Solo **2 de 264** tips repiten algo de su descripción. Están deliberadamente separados:

| Señal medida | `descripcion` | `tip` |
|---|---|---|
| dato histórico / fecha | **18,6%** | **0,0%** |
| detalle sensorial (luz, aroma, música) | 29,2% | 10,6% |
| menciona a la pareja | **68,9%** | 18,2% |
| imperativo (pidan/lleguen/suban) | 53,0% | **77,3%** |
| consejo táctico (cola, llegar antes, reservar) | 12,9% | **36,4%** |
| día de la semana | 1,5% | **15,9%** |
| hora concreta | 2,3% | **14,4%** |
| **largo** | 288 chars · 3 oraciones | 90 chars · 1 oración |

> **`descripcion` responde POR QUÉ vale la pena.**
> **`tip` responde CÓMO no cagarla.** Cero historia, pura táctica.

### La descripción tiene 3 oraciones con roles fijos

**250 de 264 (95%) tienen exactamente 3 oraciones.** Y cada una hace un trabajo distinto —
medido por en qué oración cae cada señal:

| Señal | Oración 1 | Oración 2 | Oración 3 |
|---|---|---|---|
| dato histórico / fecha | **17%** | 2% | 0% |
| imperativo (pidan/lleguen) | 1% | **22%** | 5% |
| menciona a la pareja | 15% | **65%** | 28% |
| conexión con otro lugar | 2% | 4% | **7%** |

- **O1 — QUÉ ES:** identidad + el dato duro que lo hace único (fecha, estilo, quién lo hizo).
  *"Bar-restaurante de 1905, patrimonio cultural, con barra de madera, espejos antiguos…"*
- **O2 — QUÉ HACEN USTEDES:** el imperativo concreto, dirigido a la pareja. Es la oración que
  convierte un lugar en un plan. *"Pidan el sanguche de jamón del país con salsa criolla y una Inca
  Kola, o un capitán para compartir el ambiente bohemio."*
- **O3 — POR QUÉ EN PAREJA / QUÉ SIGUE:** el cierre que lo ancla a la cita o lo conecta con la
  siguiente parada. *"Parada obligada y económica para sentir la Lima de antaño en pareja."*

### La voz: se le habla a DOS personas

`ustedes` (plural) domina de forma abrumadora, medido: **68 vs 2** en descripción, **134 vs 15** en
tip. No es "andá al bar": es *"pidan"*, *"lleguen"*, *"suban"*, *"miren"*. Es una decisión de producto
—el usuario es una pareja— y sostenida en 264 fichas.

### El prompt reconstruido

> Para cada lugar de Lima devolvé un objeto con estos 18 campos exactos. `categoria` sale de esta
> lista cerrada de 16. `precio` es 1/2/3. `momento_ideal` es mañana/tarde/noche/cualquiera.
> `duracion_min` es cuánto dura de verdad esa visita (20–180, en pasos de 5).
> `microzona` es una zona CAMINABLE con nombre propio; todos los lugares de una microzona tienen que
> poder recorrerse a pie entre sí.
>
> `descripcion`: exactamente 3 oraciones, 280–300 caracteres, hablándole a una pareja de USTEDES.
> Oración 1: qué es y el dato duro que lo hace único (año, estilo, quién lo hizo).
> Oración 2: un imperativo concreto — qué pedir, dónde pararse, qué mirar.
> Oración 3: por qué funciona para una cita, o con qué otro lugar se encadena.
> Prohibido el relleno genérico.
>
> `tip`: UNA oración, 80–95 caracteres, **puramente táctica y sin repetir nada de la descripción**:
> la hora exacta, el día, cómo evitar la cola, qué reservar, qué pedir específicamente.
> Nada de historia acá.

---

## Parte 3 — Defectos encontrados (evidencia, no opinión)

1. **`ideal_pareja` es una palanca muerta.** Es `true` en **263 de 264**. El motor la usa para
   ponderar (`weightedPick` filtra a los "lovers"), pero como casi todos lo tienen, **no discrimina
   nada**. Es el hueco exacto donde entraría el pago del negocio en el modelo B2B.
2. **El fallback ignora precio Y momento.** `generator.js:289`: si un slot no encuentra candidatos con
   el tier de precio, cae a `pool.filter(...)` sin filtro de precio ni de horario. Un plan "barato"
   puede colar un lugar caro; uno de noche puede colar uno de mañana.
3. **`microzona` no tiene acentos y `distrito` sí** (0 vs 44 caracteres acentuados). Como `microzona`
   es la clave de agrupación, conviene que la normalización sea deliberada y no accidental.
4. **Las dos bases tienen coordenadas idénticas** (`-12.0472, -77.0625`), así que elegir entre ellas
   no cambia ningún cálculo geográfico. Hoy es una etiqueta, no una opción.
5. **`band` está congelado en el dato.** Se guarda por lugar en vez de calcularse contra la base
   elegida. Si algún día hay bases de verdad distintas, la banda queda mintiendo.

---

## Parte 4 — Qué se lleva Cuadra

| De Lima para Dos | A Cuadra | Estado |
|---|---|---|
| **microzona** como restricción dura | `h3_index` ya cumple ese rol — **pero la celda H3 res.9 (~174 m de arista) es MÁS CHICA que una microzona.** Hay que agrupar celdas vecinas en zonas caminables con nombre | a diseñar |
| **plantilla con dramaturgia** (`slots` + `hint`) | las Vueltas hoy son independientes; no hay arco | a construir |
| **PHASE + `momento_ideal`** | Cuadra ya tiene `ventana_horaria` — sirve igual | portable directo |
| **mejor-de-N por compacidad** | `proximidad.ts` ya tiene haversine y el umbral de 75 m | **medio hecho** |
| **`duracion_min` por categoría** | no existe en `pois` | falta campo |
| **`precio` 1/2/3** | no existe en `pois` | falta campo |
| **`descripcion` 3 oraciones + `tip` táctico** | las Vueltas tienen `descripcion` + `instruccion_verificacion`, que NO es lo mismo | a rediseñar |
| **`ideal_pareja` → flag de calidad** | los 522 POIs de Cuadra pesan igual: un Starbucks vale lo mismo que un huarique | **el préstamo más urgente** |
| **`gmaps_query` por nombre** | Cuadra usa coordenadas | mejora fácil |

**La diferencia de fondo, y es la que manda:** los 264 lugares de Lima para Dos están **curados a
mano, uno por uno**, con dato duro verificado. Los 522 POIs de Cuadra vienen crudos de OpenStreetMap:
tienen nombre, categoría y coordenada, y **nada más**. El motor de Lima para Dos produce planes
excelentes porque cada pieza que compone ya es excelente.

**Portar el motor sin curar los datos da recorridos mediocres.** El motor no crea calidad: la compone.
