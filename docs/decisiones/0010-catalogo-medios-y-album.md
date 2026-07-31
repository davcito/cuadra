# 0010 — Catálogo híbrido, medios con procedencia y Álbum publicable

**Fecha:** 2026-07-31 · **Estado:** aceptada · **Decisores:** David + ingeniería de Cuadra

## Contexto

Cuadra ya tiene una base real para crecer: sincronización por distrito desde OpenStreetMap,
celdas H3, POIs con borrado suave y cuatro orígenes (`osm`, `curado`, `negocio`, `sugerido`).
El pipeline puede convertir POIs reales en Vueltas revisables y crear una figurita por POI
con Vuelta activa.

Lo que **no** existe todavía es la cadena editorial completa:

- OSM da nombres, coordenadas y tags; normalmente no entrega una fotografía reutilizable.
- `cards.arte_url` existe, pero el pipeline actual lo deja en `NULL`.
- Las fotos de una Chapada son evidencia privada del jugador, no material promocional del lugar.
- El Álbum agrupa por `barrio`, pero hoy dibuja nueve casillas y completa el denominador hasta
  treinta aunque esas figuritas no existan.
- Cargar Lima entera sin deduplicación, seguridad, licencias y revisión solo escala errores.

## Decisión

### 1. Catálogo híbrido propio

Cuadra mantendrá un catálogo canónico en `pois`; ningún proveedor externo será la fuente de
verdad de la experiencia.

| Fuente | Uso | ¿Publicación automática? |
|---|---|---|
| OpenStreetMap/Overpass | descubrimiento masivo, nombre, coordenadas y tags | no |
| Curación propia | huariques y correcciones que OSM no cubre | no |
| Negocio | alta B2B con datos y medios autorizados | no |
| Sugerencia de jugador | señal de descubrimiento | nunca sin moderación |

La expansión será **distrito por distrito**, no “todo Lima” en una sola corrida. Cada distrito
pasa por: ingesta → deduplicación → revisión de celdas → curación de lugares → medios → Vueltas
→ auditoría → activación → caminata de verificación.

### 2. Una foto del lugar y el arte de una figurita son objetos distintos

- **Foto factual:** sirve en detalle, búsqueda y tarjeta de lugar. Debe representar el sitio
  real y tener procedencia/licencia verificable.
- **Arte de figurita:** es una interpretación editorial de Cuadra. Puede partir de una foto
  autorizada, pero debe ser revisada y publicada como un derivado separado.
- **Foto de Chapada:** pertenece al flujo antifraude y no se reutiliza en el catálogo sin un
  consentimiento futuro, explícito y separado.

No se usarán imágenes fotorealistas inventadas por IA para representar un lugar real. Tampoco
se rasparán ni se enlazarán imágenes de Google Maps, Instagram u otras fuentes sin permiso de
reutilización.

### 3. Fuentes de medios, por prioridad

1. Fotografías propias o de curadores, con autorización registrada.
2. Fotografías entregadas por el negocio, con declaración de derechos.
3. Wikimedia Commons, resolviendo referencias de OSM/Wikidata y conservando licencia y autor.
4. Aportes de jugadores, solo cuando exista consentimiento, moderación y reglas de uso.

Antes de mostrar una imagen, Cuadra guardará como mínimo: `poi_id`, tipo, fuente, referencia
de origen, licencia, atribución, URL original, archivo propio, hash, dimensiones, estado de
revisión y si es la principal.

La tabla prevista es `place_media`; `cards.arte_url` seguirá siendo el puntero publicado del
arte de figurita. No se sobrecargará `pois.metadata` con archivos ni licencias.

### 4. Almacenamiento y variantes

Para el MVP, los originales y derivados publicables vivirán en Supabase Storage. El worker
generará variantes WebP con tamaño reservado para evitar saltos visuales:

- miniatura: 320 px;
- tarjeta/detalle: 720 px;
- ampliación: 1440 px.

R2 se reconsiderará cuando el costo o el volumen lo justifique; cambiar de storage no altera
la procedencia almacenada en Postgres.

### 5. Puerta de publicación

Un lugar puede estar en la base sin aparecer al jugador. Para ser **publicable** necesita:

1. coordenada y nombre verificados;
2. duplicados resueltos;
3. celda activa y seguridad revisada;
4. al menos una Vuelta aprobada;
5. información que no contradiga horario/temporada;
6. medio principal con derechos claros, o un estado visual honesto sin foto.

Una figurita se publica únicamente cuando su POI y Vuelta están publicados. La ausencia de
arte nunca bloquea una Chapada ya realizada, pero debe quedar como cola editorial visible.

### 6. Presentación en el Álbum

En el MVP, el Álbum agrupará las figuritas **existentes y publicadas** por distrito/barrio:

- cada página muestra progreso real `obtenidas / publicadas`, sin completar hasta 30 de forma
  ficticia;
- la figurita bloqueada muestra una silueta de su arte, no un rectángulo genérico;
- la obtenida revela arte, nombre, rareza, lugar y fecha de Chapada;
- la fotografía factual puede aparecer en el detalle, pero no reemplaza el tratamiento de
  figurita;
- las ediciones cerradas de 12/24/30 espacios quedan para una iteración posterior con
  `album_editions` y `album_slots`.

### 7. Escala del mapa y las consultas

Mientras haya menos de 200 Vueltas activas, el cliente puede recibir el catálogo jugable
ordenado por distancia y agruparlo con GeoJSON en MapLibre. Antes de superar ese umbral se
implementará una RPC por `bbox + filtros + cursor`; la lista seguirá limitada y virtualizada,
mientras el mapa representa clusters del área visible.

## Opciones descartadas

### Solo OSM

Es barato y reproducible, pero deja fuera lugares barriales, no resuelve imágenes y hereda
duplicados/errores sin una cola editorial.

### API comercial como catálogo principal

Puede traer más fichas y fotos, pero introduce costo, dependencia, restricciones de caché y
licencias incompatibles con un catálogo propio. Puede evaluarse como señal auxiliar, nunca
como fuente canónica sin revisar sus condiciones vigentes.

### Recolección automática de imágenes web

Da cobertura rápida a costa de derechos inciertos, URLs que desaparecen y fotos que pueden no
corresponder al lugar. El riesgo de confianza y legal supera la velocidad inicial.

## Consecuencias

- El crecimiento necesita una consola de operaciones; no se sostiene solo con scripts.
- La revisión humana sigue siendo parte explícita del producto, especialmente seguridad,
  duplicados, copy y derechos de medios.
- Las imágenes dejan de ser decoración y pasan a tener procedencia auditable.
- El Álbum podrá estar incompleto, pero nunca mentirá sobre cuántas figuritas existen.
- El primer piloto de medios será pequeño: 10 lugares de Barranco antes de automatizar Lima.

## Acciones

1. Crear migración de `place_media` y bucket de medios cuando empiece la tajada de Álbum real.
2. Curar 10 POIs de Barranco con una foto factual y un arte de figurita revisados.
3. Volver dinámico el Álbum y eliminar el mínimo ficticio de 30.
4. Construir la cola admin: duplicados, celdas, POIs, licencias, Vueltas y figuritas sin arte.
5. Probar un segundo distrito completo y medir horas humanas, costo y defectos.
6. Implementar consulta por `bbox` antes de 200 Vueltas activas.
