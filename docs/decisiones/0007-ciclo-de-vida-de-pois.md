# 0007 — Ciclo de vida de los POIs: cuatro orígenes, una tabla, la sync no destruye

**Fecha:** 2026-07-29 · **Estado:** aceptada y aplicada

## Contexto

El documento maestro (§7.3) describe el paso 1 del pipeline como "sincronizar POIs desde
OpenStreetMap" y nada más. Eso alcanza para la primera carga y se rompe en la segunda, porque
OSM no es la única fuente ni es estable:

1. **Los mejores huariques no están en OSM.** El producto se apoya en lugares que un vecino
   conoce y un mapa colaborativo no registra. Si el catálogo es solo OSM, Cuadra es un
   directorio de restaurantes con GPS.
2. **El riel B2B necesita una puerta.** Un negocio que paga por tráfico verificado tiene que
   poder entrar sin esperar a que alguien lo mapee en OSM.
3. **OSM cambia y a veces miente.** Un local cierra, otro cambia de nombre, y un `amenity`
   mal puesto manda un POI a la categoría equivocada.

Lo que hace peligroso al paso 1 no es traer datos: es **volver a traerlos**. Dos formas
obvias de arruinar el catálogo en la segunda corrida:

- Si la sync **borra lo que no está en OSM**, los POIs curados a mano desaparecen cada semana.
- Si la sync **pisa todas las columnas**, el nombre que un humano corrigió vuelve a estar mal
  cada lunes.

### Lo que el esquema ya resuelve (verificado, no supuesto)

```sql
create table public.pois (
  id        bigint generated always as identity primary key,
  osm_id    bigint unique,          -- NULLABLE
  nombre    text not null,
  categoria text not null,          -- texto libre, sin CHECK
  ubicacion geography(point, 4326) not null,
  h3_index  text references public.cells(h3_index),
  metadata  jsonb not null default '{}',
  activo    boolean not null default true
);
```

Tres cosas ya están bien y no hay que tocarlas:

- **`osm_id` es nullable y unique.** Postgres admite muchos `NULL` en una columna unique, así
  que los POIs manuales conviven sin chocar y los de OSM se hacen upsert por su id. El
  modelo multi-origen ya cabe.
- **`activo` es un borrado suave**, que es exactamente lo que hace falta para no perder un
  lugar por un error de red.
- **`pois.categoria` es texto libre y `missions.categoria` tiene CHECK sobre las 4.** Son
  dominios distintos **a propósito**: un POI puede ser `mercado` o `parque` aunque la Vuelta
  que lo usa sea `huarique`. El mapeo OSM→categoría no tiene que forzar todo a cuatro cajones.

## Decisión

### 1. Cuatro orígenes, una columna

```sql
alter table public.pois
  add column origen text not null default 'osm'
    check (origen in ('osm', 'curado', 'negocio', 'sugerido'));
```

| Origen | Quién lo crea | La sync lo toca |
|---|---|---|
| `osm` | el cron semanal | **sí** |
| `curado` | David o un curador | **nunca** |
| `negocio` | alta B2B | **nunca** |
| `sugerido` | un jugador, tras moderación | **nunca** |

**La sync opera exclusivamente sobre `where origen = 'osm'`.** Es una condición, no una
convención: ningún otro origen puede ser modificado por el pipeline aunque su `osm_id`
coincida con algo.

### 2. La sync no borra nunca

```sql
alter table public.pois add column visto_en_osm_at timestamptz;
```

En vez de borrar lo que dejó de aparecer, la sync estampa `visto_en_osm_at`. Un POI que falta
**tres corridas seguidas** pasa a `activo = false` y queda para revisión humana. Nunca se
elimina la fila: perder el `id` rompería las Vueltas y las figuritas que lo referencian.

### 3. Guardarraíl contra la sync catastrófica

**Si una corrida trae menos del 70 % de los POIs de la anterior, aborta sin escribir.**

Sin esto, una respuesta parcial de Overpass —un timeout, un rate limit, un bbox mal armado—
se parece exactamente a "cerraron todos los locales del distrito". Es el modo de falla que
convierte un problema de red en una pérdida de catálogo.

### 4. Los arreglos a mano sobreviven

```sql
alter table public.pois add column campos_curados text[] not null default '{}';
```

Cuando un humano corrige un campo de un POI de origen `osm`, el nombre de esa columna entra
en `campos_curados`. **La sync saltea esos campos para siempre.** Corregís "Cevichería Don
Pepe" una vez y no vuelve nunca más.

Es la pieza que hace que curar valga la pena: sin ella, el trabajo manual tiene fecha de
vencimiento y nadie lo hace dos veces.

### 5. Una celda nueva nace APAGADA (esto es seguridad, no plomería)

`pois.h3_index` tiene FK a `cells(h3_index)` y el seed trae 38 celdas de Barranco. Los POIs
reales de Overpass van a caer en celdas que no están sembradas: sin resolverlo, el primer
insert revienta contra la FK.

La salida fácil es que el sync cree la celda que falta. **El default de `cells` la haría
nacer `nivel_seguridad = 1` (libre) y `activa = true`** — o sea, el pipeline estaría
declarando *"acá se puede caminar de noche"* sobre cualquier cuadra donde OSM tenga un local,
sin que nadie la haya mirado. Eso viola la regla dura #4 del proyecto (*modo seguro es
feature de primera clase*) y lo hace en silencio.

**Decisión: el sync crea la celda faltante con `activa = false`.**

```sql
insert into public.cells (h3_index, distrito, ciudad, pais, nivel_seguridad, activa)
values ($1, $2, $3, $4, 3, false)      -- 3 = excluida, hasta que un humano la revise
on conflict (h3_index) do nothing;      -- nunca pisa la revisión de una celda existente
```

El POI entra y queda bien ubicado; su celda no genera Vueltas hasta que alguien la promueva.
El `do nothing` es la otra mitad: una celda ya revisada **jamás** vuelve a bajar de nivel por
una corrida del pipeline.

Consecuencia operativa: aparece una segunda cola de revisión humana (celdas nuevas), además
de la de POIs dudosos. Es trabajo real y es el precio correcto — la alternativa es que el
catálogo crezca marcando zonas como seguras sin que nadie las haya visto.

### 6. El mapeo OSM→categoría vive en un solo archivo

El proyecto **nunca decidió** qué tag va a qué categoría — el documento maestro solo nombra
familias (`amenity`, `shop`, `tourism`, `historic`, `leisure`). Se decide ahora, en
`worker/pipeline/categorias-osm.ts`, con dos reglas:

- **El catálogo es lista blanca**: un tag sin mapa NO entra.
- **La tabla de mapeo es dato, no código**: se lee, se testea y se puede corregir sin tocar
  la lógica del pipeline.

> **Revisión de esta regla, hecha corriendo el sync contra Barranco de verdad.**
> La versión original decía lo contrario: *"un tag sin mapa entra crudo y queda para curar"*.
> Se implementó y se midió: **1110 de 1466 sin mapear** — 48 escuelas, 46 jardines de
> infantes, 15 farmacias, bancos, gomerías, paraderos de bus. Nada de eso es un lugar al que
> mandar a alguien a caminar, y con esa regla el criterio de aceptación "100+ POIs" se cumple
> con paraderos. Cambiada a lista blanca: **388 POIs, todos clasificados**.
>
> Dos cosas más salieron de esa corrida:
>
> - **Se piden filtros `clave=valor`, nunca la familia entera.** Pedir `["building"]` porque
>   el mapa tiene `building=church` arrastra cada edificio con nombre del distrito: 758
>   inútiles de 1466. Además de ensuciar, es descortés con un servidor comunitario.
> - **La lista blanca tiene un punto ciego**: si solo pedimos lo que ya conocemos, nunca nos
>   enteramos de lo que nos falta. Se resuelve con `--descubrir`, que pide las familias
>   enteras, **no escribe nada** y reporta qué tags quedan afuera y cuántas veces. Es la forma
>   deliberada de agrandar el mapa, sin castigar a Overpass todas las semanas.

## Consecuencias

**A favor**

- Curar deja de ser trabajo perecedero.
- El riel B2B tiene puerta desde el día uno, sin migración extra.
- Una caída de Overpass no puede vaciar el catálogo.
- Tres columnas y un archivo de mapeo: sin tablas nuevas ni joins nuevos.

**En contra**

- Tres columnas más en la tabla más consultada del sistema. `origen` va a querer índice
  cuando el catálogo crezca.
- `campos_curados` es un contrato por convención: guarda nombres de columna como strings, y
  si alguien renombra una columna sin actualizarlo, la protección se pierde en silencio.
  **Mitigación:** un test que cruce los valores de `campos_curados` contra las columnas
  reales de `pois`.
- Alguien tiene que revisar la cola de `activo = false`. Sin ese hábito, el catálogo acumula
  lugares muertos que igual no se muestran, pero ensucian los conteos.

**Reevaluaciones hechas sobre este mismo ADR** (2026-07-29, antes de implementar)

- **`campos_curados text[]` vs. un `curado jsonb` de superposición.** Se evaluó guardar los
  valores corregidos en un jsonb y aplicarlos ENCIMA de los de OSM. Es más auditable, pero
  convierte la columna real en un valor derivado: un `UPDATE` directo a `pois.nombre` se
  perdería en la siguiente corrida, y eso es una trampa peor que la que resuelve. **Se queda
  la lista de skip**, con el test que la ata a las columnas reales.
- **El umbral del 70 % necesita dos casos borde** que la primera versión no contemplaba: en
  la corrida inicial no hay conteo anterior contra qué comparar (no aplica el guardarraíl), y
  un distrito con pocos POIs hace que el umbral salte por variaciones normales. El umbral es
  **configurable por bandera** y solo aplica arriba de 20 POIs previos.
- **Los 3 POIs del seed tienen `osm_id` inventados (9001-9003).** Con `origen` default `'osm'`
  quedarían huérfanos: el sync real no los encuentra y a las tres corridas se apagan solos.
  El seed pasa a declararlos `origen = 'curado'` explícitamente.

**Lo que esta decisión NO resuelve** (y hay que decidir aparte)

- Deduplicación: el mismo local cargado a mano y después mapeado en OSM son dos filas.
- Moderación de `sugerido`: quién aprueba, con qué criterio y en qué interfaz.
- Si un POI `curado` puede "adoptar" un `osm_id` cuando OSM finalmente lo registra.

## Mantenibilidad — las cinco reglas que este pipeline sí o sí cumple

Esto no es aspiracional: es criterio de aceptación de E1.

1. **Todo paso es idempotente.** Correrlo dos veces deja la base igual que correrlo una.
2. **`--dry-run` obligatorio** en todo lo que escriba o gaste plata, e imprime lo que haría.
3. **Test de contrato entre el prompt y el zod.** Hoy `prompts/generacion-vueltas.md` y
   `pipeline/schema.ts` son dos archivos que nadie obliga a coincidir. Si el prompt pide un
   campo que el validador rechaza, tiene que fallar en el test — no en producción después de
   pagar el lote.
4. **Cada corrida deja rastro**: cuántos POIs, cuántas Vueltas, cuánto costó.
5. **Un solo lugar por concepto.** Hoy las categorías viven en el seed, en el prompt y en
   `ui.tsx` por separado: tres verdades que van a divergir.

### Deuda que E1 arrastra y hay que cerrar en el camino

Detectada al mapear el worker, toda verificada en disco:

- Los tres scripts **terminan en `exit(0)` siempre**. Un cron los da por exitosos aunque no
  hagan nada.
- El parser de argumentos toma `--distrito` sin valor como el string `"true"` y sigue.
- El contrato `Vuelta` **no incluye `h3_index`**, pero `missions.h3_index` es `not null` con
  FK a `cells`. El zod no lo va a atrapar: hay que inyectarlo en el insert.
- El prompt vive dentro de fences ` ``` ` de un markdown, **sin loader**. Parsearlo es frágil
  y duplicarlo en TS rompe la regla dura #8.
- El seed: el POI 9002 es `huaca` y su Vuelta dice `caleta`; los `insert` no tienen target de
  conflicto, así que re-ejecutarlo duplica filas.
