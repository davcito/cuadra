# CUADRA
## Documento Maestro del Proyecto
### PRD · Especificación Técnica · Plan de Ejecución

| Campo | Valor |
|---|---|
| Proyecto | Cuadra — exploración urbana gamificada |
| Versión | 1.0 |
| Fecha | Junio 2026 |
| Autor | David (fundador) |
| Estado | Pre-desarrollo — listo para iniciar MVP |
| Dominio | appcuadra.com |
| Mercado inicial | Lima, Perú → LatAm → global |
| Uso de este documento | Fuente de verdad del proyecto. Referencia principal para sesiones de desarrollo con Claude Code (ver §12). |

---

## Índice

1. Resumen ejecutivo
2. Visión y tesis del producto
3. Identidad de marca e identidad verbal
4. Especificación del producto
5. Modelo de negocio
6. Modelo financiero (proyección 12 meses)
7. Arquitectura técnica
8. Roadmap de desarrollo
9. Métricas y criterios de decisión
10. Riesgos y mitigaciones
11. Plan de estudio del fundador
12. Estructura del repositorio y flujo de trabajo con Claude Code
13. Checklist de arranque (próximos 7 días)

---

# 1. Resumen ejecutivo

**Cuadra** es una aplicación móvil de exploración urbana gamificada. Genera misiones diarias mediante IA, ancladas a lugares reales de la ciudad del usuario, que se completan caminando, observando e interactuando con el entorno. Al completar misiones, el usuario colecciona **figuritas digitales** de su ciudad en un álbum personal, inspirado en la cultura latinoamericana del álbum de cromos.

A diferencia de Randonautica (misterio y coordenadas aleatorias) o Pokémon GO (realidad aumentada sobre ficción), Cuadra gamifica **la ciudad real**: sus huariques, mercados, murales, parques y personas. El misterio se reemplaza por **coleccionismo, orgullo de barrio y descubrimiento verificable**.

**Modelo de ingresos:** suscripción premium ("La Llave", S/ 9.90–14.90/mes) + B2B (negocios locales pagan por ser destino de misiones con tráfico físico verificado por GPS) + comisión sobre rutas creadas por usuarios. La proyección financiera indica que **el B2B será el ingreso principal los primeros 18–24 meses**; las suscripciones escalan con la base de usuarios.

**Estrategia geográfica:** lanzamiento en 3–4 distritos de Lima, expansión a Lima completa y provincias, luego LatAm (Brasil incluido: "quadra" funciona idéntico en portugués). El nombre, la arquitectura y el vocabulario están diseñados desde el día uno para localización por país.

**Inversión inicial:** < $250 USD en costos únicos. Infraestructura mensual: $15–40 en fase de validación. El costo real del proyecto es el tiempo del fundador.

**Criterio de éxito del MVP (semana 12):** retención D30 > 8% y más de 2 misiones completadas por usuario activo por semana en beta cerrada de 50–100 usuarios.

---

# 2. Visión y tesis del producto

## 2.1 El problema

Las personas viven en ciudades que no conocen. Recorren los mismos 4 trayectos (casa–trabajo/universidad–centro comercial) mientras a tres cuadras existen huariques de 40 años, murales, miradores y personajes de barrio que nunca verán. Las apps existentes no resuelven esto:

- **Google Maps / TripAdvisor:** herramientas de búsqueda, no de descubrimiento. Requieren saber qué buscas.
- **Randonautica:** demostró la demanda por exploración gamificada (pico viral 2020) pero colapsó: el misterio sin estructura no retiene, y enviar gente a coordenadas aleatorias es inviable en ciudades latinoamericanas por seguridad.
- **Pokémon GO:** demostró que la gente camina kilómetros por coleccionar, pero el contenido es ficción superpuesta; la ciudad es solo escenario.
- **Geocaching:** nicho, fricción alta, sin loop diario.

## 2.2 La tesis

> La gente no necesita una razón mística para salir a la calle. Necesita una razón **coleccionable, social y segura**.

Cuadra combina tres motores de comportamiento probados:

1. **Coleccionismo con escasez** (álbum de figuritas, rarezas temporales) — el motor de Panini y Pokémon.
2. **Identidad territorial** (orgullo de cuadra, barrio y distrito; rankings; alcaldías) — el motor de Foursquare en su mejor época.
3. **Contenido fresco infinito a costo marginal cero** (misiones generadas por IA sobre lugares reales) — la ventaja estructural que no existía cuando murieron Foursquare y Randonautica.

## 2.3 Por qué Perú primero

- Cultura de álbum de figuritas profundamente instalada (Panini, mundiales).
- Cultura gastronómica de "huariques" y del "dato": recomendar lugares escondidos es deporte nacional.
- Orgullo distrital real y verbalizado (Miraflores vs. Barranco vs. Los Olivos) — motor de competencia gratis.
- La cuadra es unidad oficial de dirección ("cuadra 5 de la Av. Arequipa") — el nombre de la marca es infraestructura mental ya instalada.
- Mercado desatendido: ninguna app global está diseñada para la realidad de seguridad y pagos (Yape/Plin) de una ciudad latinoamericana.

## 2.4 Por qué es exportable

El molde se replica por ciudad: extraer lugares reales (OpenStreetMap) → generar misiones por IA → localizar el vocabulario (huarique→fonda→boteco). La identidad peruana vive en el ADN de diseño y tono, no en barreras idiomáticas. "Cuadra/quadra" es palabra cotidiana en toda Hispanoamérica y Brasil.

## 2.5 Diferenciación (resumen competitivo)

| | Randonautica | Pokémon GO | Geocaching | **Cuadra** |
|---|---|---|---|---|
| Contenido | Coordenadas aleatorias | Ficción AR | Cachés físicos | **Ciudad real, generado por IA** |
| Seguridad | Nula | Parcial | Parcial | **Modo seguro nativo (zonas/horarios)** |
| Loop diario | No | Sí | No | **Sí (vueltas diarias + rachas)** |
| Coleccionismo | No | Criaturas | Logros | **Figuritas de la ciudad real** |
| Modelo B2B local | No | Patrocinios globales | No | **Negocios de barrio, tráfico verificado** |
| Costo de contenido | Cero (aleatorio) | Altísimo | Comunidad | **Marginal ≈ cero (IA + OSM)** |

---

# 3. Identidad de marca e identidad verbal

## 3.1 Fundamentos

| Elemento | Definición |
|---|---|
| Nombre | **Cuadra** |
| Dominio | appcuadra.com (asegurar cuadra.app si está libre; comprar quadra variante para redirect anglo) |
| Handles | @appcuadra (TikTok, Instagram — verificar y reservar) |
| Tagline | **Tu ciudad, cuadra por cuadra.** |
| Tagline PT | Sua cidade, quadra por quadra. |
| Tagline EN | Your city, block by block. |
| CTA corto | "Date una vuelta." |
| Unidad de distancia | **Cuadras, no kilómetros** ("Hoy recorriste 23 cuadras") — firma de marca inimitable |

**Pendiente legal:** búsqueda fonética en Indecopi, clases 9 (software) y 42 (servicios tecnológicos). Nota de coexistencia: CUADRA (botas, México, clase 25) opera en categoría legalmente distinta; relevante solo para ASO si México entra al roadmap temprano. En España "cuadra" = establo; mercado no prioritario, riesgo aceptado.

## 3.2 Glosario de dominio (NO renombrar — vocabulario canónico del producto y del código)

### Capa global (idéntica en todos los países)

| Término | Concepto técnico | Notas |
|---|---|---|
| **Vuelta** | Misión | "Las vueltas de hoy". Verbo natural: "date una vuelta" |
| **Calle** | XP / puntos de experiencia | "Tener calle" = idiom panhispánico de experiencia. Brasil: **Estrada** ("ter estrada") |
| **Racha** | Streak de días consecutivos | Copy de sabor localizable |
| **Recado** | Cápsula geoanclada (nota/audio que solo se abre en el lugar) | Brasil: nostalgia Orkut gratis |
| **La Llave** | Suscripción premium | "La llave de la ciudad". Nunca llamarla "Pro" ni "Premium" en UI |
| **Alcalde/Alcaldesa de la cuadra** | Usuario con más actividad en una cuadra | Mecánica heredada de Foursquare; motor de competencia hiperlocal |
| **El Álbum** | Colección de figuritas | Páginas = barrios. Completar página = "Barrio completo" |
| **Cuadra** (unidad) | Celda geográfica mínima de juego | También unidad de distancia en toda la UI |

### Capa local v1 — Perú (localizable por país)

| Término | Concepto | Localización futura |
|---|---|---|
| **Figurita** | Cromo coleccionable | figus (AR), estampas (MX), figurinhas (BR), barajitas (VE) |
| **Chapar** | Acción de capturar figurita — "¡Chapada!" | Fallback neutro: "Atrapar" |
| **Huariques** | Categoría: comida escondida | fondas (CL), botecos (BR) |
| **Caletas** | Categoría: lugares secretos | jerga local por país |
| **Huacas** | Categoría: patrimonio e historia | monumentos/patrimonio |
| **Caseros** | Categoría: misiones sociales (interacción con personas) | "Conocidos" como neutro |

### Rangos de usuario (progresión por Calle acumulada)

Nuevo/a en la cuadra → Vecino/a → Callejero/a → Casero/a → Cronista → **Leyenda del barrio**

## 3.3 Voz y tono

Cercana, callejera sin vulgaridad, juguetona, con cariño de barrio. Habla como un amigo limeño que conoce datos, nunca como una corporación. Micro-copy canónico de referencia:

- Push matutino: *"Hay 3 vueltas nuevas a menos de 10 cuadras."*
- Racha en riesgo: *"Tu racha cumple 6 días. No la dejes morir en la puerta."*
- Alcaldía perdida: *"Te quitaron la alcaldía de tu cuadra. ¿Lo vas a permitir?"*
- Onboarding: *"Bienvenido a la cuadra."*
- Captura: *"¡Chapada!"*

## 3.4 Identidad visual (brief para diseño, fase 1)

Dirección: gráfica urbana latinoamericana — paleta inspirada en fachadas limeñas y cartelería popular (chicha moderada, sin caer en cliché), ilustración flat de lugares, tipografía display con carácter + sans legible para UI. El álbum debe sentirse álbum: texturas de papel, figuritas con marco troquelado. Referencias a explorar: cartelería de mercado, azulejos, mototaxis, Sarita Colonia pop. **Anti-referencias:** estética corporativa fintech, gradientes genéricos de startup.

**Actualización 2026-07-27 — brief EJECUTADO:** identidad **V1.2** completa (logo 3 direcciones, paleta con modo oscuro, Alfa Slab One + Archivo, componentes, guía de uso) + **mascota oficial: Calato**, viringo 3D tonto-amistoso con kit de explorador. Guía viva en Claude Design, archivo en `docs/identidad/CUADRA-Identidad-v1.2.dc.html`, assets en `docs/identidad/calato/`, tokens en `app/src/lib/theme.ts`. Decisiones y reglas de la mascota: **ADR-0006** (la mascota es render 3D sobre UI flat — patrón Duolingo).

---

# 4. Especificación del producto

## 4.1 Loop principal (core loop)

```
Abrir app → ver "Las vueltas de hoy" (2-3 misiones cercanas, adaptadas a
hora/clima/perfil) → caminar guiado por radar → llegar al lugar → completar
(foto in-app + GPS) → "¡Chapada!" (figurita + Calle + racha) → ver progreso
del Álbum y ranking de barrio → volver mañana (racha + vueltas nuevas)
```

Tiempo objetivo de una vuelta: 15–45 minutos puerta a puerta. El producto debe ser divertido **con cero amigos dentro** (valor single-player desde el día 1); lo social amplifica, no sostiene.

## 4.2 Mecánicas — MVP (Fase 1)

**Vueltas diarias.** 2–3 misiones/día (free) ancladas a POIs reales en un radio caminable. Tipos: observación ("fotografía una puerta de más de 50 años"), consumo ligero ("prueba un emoliente en X"), social ligera ("pregúntale a la caserita del mercado cuál es su fruta más vendida"). Filtradas por hora, clima y nivel de seguridad de la zona.

**Verificación.** Foto tomada solo con cámara in-app (galería bloqueada) + GPS dentro del geofence del POI + timestamp. Detalle completo anti-fraude en §7.6.

**El Álbum.** Cada POI emblemático es una figurita. Rarezas: común / poco común / rara / **de temporada** (solo obtenible en fechas-lugares específicos: la figurita del Señor de los Milagros existe solo en octubre en la ruta de la procesión). La escasez temporal crea urgencia y calendario de contenido gratis.

**Racha + Calle.** Racha de días con al menos 1 vuelta completada. Calle (XP) por vuelta, con bonus por dificultad, rareza y racha. Rangos según §3.2.

**Radar de navegación.** Distancia en cuadras + flecha de dirección (brújula). **Sin navegación paso a paso por diseño**: el callejeo es el juego. Botón "Cómo llegar" (deep link a Google Maps/Waze) disponible como opción de seguridad. Detalle en §7.7.

**Modo seguro.** Cada celda del mapa tiene nivel de seguridad (1 = libre, 2 = solo horario diurno, 3 = excluida). Las vueltas solo se generan en celdas activas según hora. Curado manualmente al inicio (el fundador conoce Lima); editable desde panel admin. Este es el diferenciador estructural frente a Randonautica en LatAm — tratarlo como feature de primera clase, no como filtro.

## 4.3 Mecánicas — Fase 2

- **Alcaldías:** el usuario con más actividad en una cuadra en ventana móvil de 30 días ostenta "Alcalde de la cuadra". Notificación de destronamiento (la push de mayor retención esperada).
- **Rankings distritales:** tabla semanal Miraflores vs. Barranco vs. Los Olivos vs. San Miguel. Reset semanal.
- **Recados:** notas/audios geoanclados que solo se desbloquean físicamente en el lugar. Visibilidad: privado (para alguien), de amigos, o público. Costo de desarrollo bajo, potencial viral alto ("te dejé algo en el parque donde nos conocimos").
- **Figuritas de temporada** programadas (calendario anual limeño: procesiones, aniversarios distritales, fiestas patrias).
- **Quests grupales privadas** (feature de La Llave): un grupo de amigos compite en una ruta privada.

## 4.4 Mecánicas — Fase 3

- **Rutas de creadores:** cualquier usuario arma una quest-ruta ("Ruta del pan en el Centro", "Murales de Barranco"). Gratuitas o pagadas; en pagadas, la app retiene 20–30% de comisión.
- **Dashboard B2B:** panel web para negocios (ver §5.3) con métricas de visitas verificadas.
- **Vueltas patrocinadas:** misiones cuyo destino es un negocio pagante, marcadas como patrocinadas, con beneficio para el usuario (descuento/regalo).
- Expansión: Lima completa → provincias (Arequipa, Cusco, Trujillo) → LatAm.

## 4.5 Fuera de alcance del MVP (decisión explícita)

Realidad aumentada, chat entre usuarios, feed social, eventos en vivo, marketplace. Cada uno es un proyecto en sí mismo; el MVP valida el loop caminar→chapar→volver.

---

# 5. Modelo de negocio

## 5.1 Estructura de ingresos

| Stream | Qué es | Cuándo activa | Peso esperado año 1 |
|---|---|---|---|
| **La Llave** (suscripción) | S/ 9.90–14.90/mes | Desde lanzamiento público | 10–20% |
| **B2B local** | Negocios pagan por ser destino de vueltas | Mes 4–6 (con data de beta) | **60–80%** |
| **B2B institucional** | Municipalidades, PromPerú: rutas oficiales | Año 1 tardío / año 2 | Variable (contratos S/ 3,000–15,000) |
| **Comisión rutas de creadores** | 20–30% sobre rutas pagadas | Fase 3 | Marginal año 1 |

**Tesis de monetización:** las suscripciones solas no pagan ni el servidor el primer año (ver §6). El B2B alcanza break-even con 5–7 negocios pagando S/ 150/mes. Por tanto: el B2B no es "nice to have", es el plan A de ingresos de los primeros 18–24 meses.

## 5.2 La Llave (premium) — qué incluye

| Free | La Llave (S/ 9.90–14.90/mes) |
|---|---|
| 2 vueltas/día | Vueltas ilimitadas |
| Álbum básico | Figuritas exclusivas y de temporada extendida |
| — | 3 vueltas personalizadas en tiempo real/día (generadas por IA a pedido, según gustos) |
| — | Quests grupales privadas |
| — | Estadísticas avanzadas (mapa de calor personal, historial) |
| Con anuncios (fase 2+) | Sin anuncios |

Precio de lanzamiento: **S/ 9.90** con ancla en S/ 14.90. Test de precio en mes 6.

## 5.3 B2B — el motor real

**Propuesta de valor:** "Te mando clientes a la puerta y te lo demuestro con GPS." Ningún anuncio de Instagram puede demostrar visitas físicas; Cuadra sí (check-in verificado con foto + geofence + timestamp).

**Pricing inicial:**

| Plan | Precio | Incluye |
|---|---|---|
| Bodega/Huarique | S/ 150/mes | Ser destino de vueltas, perfil destacado, dashboard de visitas |
| Negocio Plus | S/ 200–300/mes | Lo anterior + figurita propia + vueltas con beneficio (descuento) |
| Institucional | S/ 3,000–15,000/campaña | Ruta oficial temática, figuritas conmemorativas, reporte de impacto |

**Estrategia de venta (playbook):**
1. Beta (sem 11–12): identificar los 10 POIs más visitados orgánicamente.
2. Mes 4: regalar 1 mes a 5 huariques/cafés de Barranco con dashboard activo.
3. Mes 5: convertir con data real ("32 visitas verificadas este mes, 70% nuevos clientes").
4. Mes 6+: vender a los siguientes 20 con casos de éxito impresos. Venta presencial, caminando — el fundador conoce el terreno.
5. Año 2: municipalidades y PromPerú con números agregados en mano.

## 5.4 Pagos — decisión no negociable

Doble riel desde el día uno:

| Riel | Comisión | Neto sobre S/ 9.90 | Por qué |
|---|---|---|---|
| In-app purchase (Google/Apple) | 15% (small business program) | ~S/ 8.40 | Obligatorio para suscripción en app |
| **Checkout web con Yape/Plin** (vía Culqi o Mercado Pago) | ~3.5–4% | ~S/ 9.20 | Gran parte del mercado peruano no tiene tarjeta vinculada a la store. Sin Yape/Plin, la conversión peruana se desploma |

El B2B se cobra 100% por riel web (factura + Yape/transferencia).

---

# 6. Modelo financiero (proyección a 12 meses)

## 6.1 Supuestos

- Lanzamiento público: mes 4 (post-beta).
- Conversión a La Llave: **2–3%** de MAU (estándar de apps casuales; no asumir más).
- Churn mensual de suscriptores: 10%.
- MAU ≈ 20% de descargas acumuladas (mezcla de cohortes activas; el umbral de cohorte D30 del §9 es métrica distinta y más estricta).
- Ticket medio neto: S/ 8.80 (mezcla de rieles).
- Tipo de cambio referencial: S/ 3.80 = $1.

## 6.2 Escenarios al mes 12

| | Pesimista | **Base** | Optimista (viral TikTok) |
|---|---|---|---|
| Descargas acumuladas | 4,000 | 15,000 | 80,000 |
| MAU | 800 | 3,000 | 16,000 |
| Suscriptores activos | 16 | 75 | 480 |
| Ingreso suscripciones/mes | S/ 140 | S/ 650 | S/ 4,200 |
| Negocios B2B activos | 5 × S/150 | 15 × S/150 + 1 municipal | 40 × S/200 + institucional |
| Ingreso B2B/mes | S/ 750 | S/ 3,950 | S/ 11,000 |
| **Ingreso total/mes** | **S/ 890** | **S/ 4,600 (~$1,200)** | **S/ 15,200 (~$4,000)** |
| Costo infra/mes | ~S/ 150 | ~S/ 450 | ~S/ 1,100 |

## 6.3 Lecturas clave

1. Con 2.5% de conversión se necesitan ~30,000 MAU para que el premium sea negocio por sí solo. Eso es año 2–3, no año 1.
2. **Break-even operativo: 5–7 negocios B2B.** Alcanzable caminando Barranco una semana con el dashboard funcionando.
3. El escenario pesimista sigue siendo un proyecto vivo y barato de mantener (~S/ 740/mes de margen) — hay espacio para iterar sin quemar capital.
4. Inversión única total para lanzar: Google Play $25 + Apple Developer $99/año + dominios ~$30 ≈ **< $250**.

---

# 7. Arquitectura técnica

## 7.1 Stack (decisiones tomadas y justificación)

| Capa | Tecnología | Justificación |
|---|---|---|
| App móvil | **React Native + Expo** (TypeScript) | El fundador domina JS; Expo elimina fricción de builds nativos (EAS Build), da push y OTA updates. Flutter implicaría aprender Dart sin beneficio para validar |
| Backend core | **Supabase** (Postgres + PostGIS, Auth, Storage, Realtime) | Free tier hasta 50k usuarios auth; PostGIS resuelve todas las queries geoespaciales; RLS para seguridad por filas |
| Workers/cron | **VPS propio** (Node.js) | Ya pagado y conocido. Mismo patrón que el bot de WhatsApp de DavcStore: scripts programados llamando APIs |
| Almacenamiento de fotos | **Cloudflare R2** | 10 GB gratis, cero costo de egreso; el fundador ya opera Cloudflare |
| Mapas (tiles) | **MapLibre GL + OpenFreeMap** | $0 sin límite de MAU. Mapbox cobra >25k MAU; Google Maps es el rubro que mata apps de geo |
| Indexación espacial | **H3** (h3-js, Uber) | Celdas hexagonales para generar misiones por zona y modelar niveles de seguridad |
| Datos de lugares | **OpenStreetMap vía Overpass API** | POIs reales gratis; base del pipeline de misiones |
| Generación de misiones | **API de Claude — Haiku 4.5** | Calidad suficiente para redacción de misiones; costo marginal ≈ cero (ver 7.4) |
| Pagos | **RevenueCat** (IAP) + **Culqi o Mercado Pago** (web/Yape/Plin) | RevenueCat unifica Google/Apple; riel web obligatorio para Perú |
| Analytics / errores | PostHog (free tier) + Sentry (free tier) | Retención por cohortes y embudos sin costo inicial |

## 7.2 Diagrama de arquitectura

```
┌─────────────────┐         ┌──────────────────────────────┐
│   App (Expo RN) │◄───────►│   SUPABASE                   │
│  - mapa MapLibre│  auth,  │  - Postgres + PostGIS        │
│  - radar/brújula│  REST,  │  - Auth (RLS en cada tabla)  │
│  - cámara in-app│ realtime│  - Storage refs              │
└───────┬─────────┘         └──────────▲───────────────────┘
        │ subida directa                │ escribe misiones,
        ▼ (URL firmada)                 │ lee POIs/celdas
┌─────────────────┐         ┌──────────┴───────────────────┐
│ Cloudflare R2   │         │   VPS (workers Node, cron)   │
│ fotos de vueltas│         │ 1. sync POIs ← Overpass/OSM  │
└─────────────────┘         │ 2. genera vueltas ← Claude   │
                            │ 3. verificación IA (muestreo)│
┌─────────────────┐         │ 4. rankings, rachas, alcaldías│
│ OpenFreeMap     │         │ 5. panel admin (web)         │
│ tiles a la app  │         └──────────────────────────────┘
└─────────────────┘
```

Principio rector: **la app nunca llama a la API de Claude directamente.** Toda generación corre en el VPS por batch; el cliente solo lee de Postgres. Esto hace el costo de IA independiente del número de usuarios.

## 7.3 Pipeline de misiones (el corazón del sistema)

**Regla de diseño crítica:** la IA nunca inventa lugares. Redacta misiones **solo** sobre POIs reales extraídos de OSM. Una sola misión hacia un lugar inexistente destruye la confianza del usuario.

```
[Semanal, cron en VPS]
1. Celdas H3 res. 9 (~0.1 km²) agrupadas por zona de juego; activas según
   modo seguro. MVP: 3-4 distritos ≈ 150 zonas.
2. Por celda: query a Overpass API → POIs (mercados, parques, murales,
   panaderías, iglesias, miradores, cafés...) → upsert en tabla pois.
3. Por celda: 1 llamada a Claude (Haiku 4.5) con la lista de POIs reales
   → 25 vueltas en JSON estricto → validación de schema (zod) → insert
   en missions con estado draft → activación automática o revisión admin.
4. El cliente consulta vueltas por celda + hora + clima + nivel usuario.
   Personalizadas en tiempo real: solo La Llave (3/día, endpoint dedicado).
```

**Plantilla de prompt (resumen funcional — versión completa vive en `worker/prompts/`):**

```
SYSTEM:
Eres el generador de Vueltas (misiones urbanas) de Cuadra. Escribes en
español peruano cercano y juguetón (voz de marca). REGLAS DURAS:
1. SOLO puedes crear misiones sobre los POIs del input. Nunca inventes
   lugares, nombres ni detalles no presentes en los datos.
2. Responde ÚNICAMENTE con JSON válido según el schema. Sin prosa.
3. Misiones sociales: respetuosas, sin pedir datos personales, sin
   involucrar menores, interacción siempre opcional y en espacio público.
4. Nada que implique riesgo físico, propiedad privada o transacciones
   obligatorias (consumir es opcional salvo vuelta patrocinada).

USER:
{ "celda": "898f...", "distrito": "Barranco",
  "pois": [ { "id": 1041, "nombre": "Mercado N°1 de Barranco",
              "categoria": "mercado", "tags": {...} }, ... ],
  "contexto": { "clima_tipos": ["soleado","nublado"],
                "ventanas": ["mañana","tarde","noche"] },
  "cantidad": 25 }

SCHEMA de salida (por elemento):
{ "poi_id": int, "titulo": str(<60), "descripcion": str(<280),
  "tipo": "observacion|consumo|social|patrimonio",
  "categoria": "huarique|caleta|huaca|casero",
  "dificultad": 1-3, "calle_xp": int,
  "ventana_horaria": ["mañana"|"tarde"|"noche"],
  "requiere_foto": bool, "instruccion_verificacion": str }
```

## 7.4 Costos de IA (Haiku 4.5: $1 input / $5 output por millón de tokens)

| Concepto | Cálculo | Costo |
|---|---|---|
| Generación semanal | ~150 celdas × ~$0.018/celda | ~$11/mes (**~$5.50 con Batch API**) |
| Vuelta personalizada (La Llave) | ~$0.005/u, máx 3/día/suscriptor | Cubierto de sobra por S/ 9.90 |
| Verificación visual por muestreo | ~$0.002/foto × 10% de check-ins | 500 verif./día = ~$30/mes |

Conclusión: **la IA no es un costo, es la ventaja estructural.** Contenido fresco semanal para una ciudad entera por el precio de dos menús.

## 7.5 Esquema de base de datos (migración inicial)

```sql
create extension if not exists postgis;

-- Perfiles (extiende auth.users de Supabase)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 20),
  display_name text,
  avatar_url text,
  calle_xp int not null default 0,
  rango text not null default 'nuevo_en_la_cuadra',
  distrito_casa text,
  created_at timestamptz not null default now()
);

-- Celdas H3 (zonas de juego + modo seguro)
create table public.cells (
  h3_index text primary key,
  distrito text not null,
  ciudad text not null default 'Lima',
  pais text not null default 'PE',
  nivel_seguridad smallint not null default 1, -- 1 libre, 2 solo día, 3 excluida
  activa boolean not null default true
);

-- POIs reales (desde OSM)
create table public.pois (
  id bigint generated always as identity primary key,
  osm_id bigint unique,
  nombre text not null,
  categoria text not null,           -- huarique, caleta, huaca, parque...
  ubicacion geography(point, 4326) not null,
  h3_index text references public.cells(h3_index),
  metadata jsonb not null default '{}',
  activo boolean not null default true
);
create index pois_geo_idx on public.pois using gist (ubicacion);

-- Vueltas (misiones)
create table public.missions (
  id bigint generated always as identity primary key,
  poi_id bigint not null references public.pois(id),
  h3_index text not null references public.cells(h3_index),
  titulo text not null,
  descripcion text not null,
  tipo text not null check (tipo in ('observacion','consumo','social','patrimonio')),
  categoria text not null check (categoria in ('huarique','caleta','huaca','casero')),
  dificultad smallint not null check (dificultad between 1 and 3),
  calle_xp int not null,
  ventana_horaria text[] not null default '{mañana,tarde}',
  requiere_foto boolean not null default true,
  instruccion_verificacion text,
  patrocinada boolean not null default false,
  business_id bigint,                -- FK a businesses (fase 3)
  estado text not null default 'draft' check (estado in ('draft','activa','archivada')),
  valida_desde date, valida_hasta date,   -- temporadas
  created_at timestamptz not null default now()
);

-- Completaciones (check-ins verificados)
create table public.mission_completions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id),
  mission_id bigint not null references public.missions(id),
  foto_url text,
  ubicacion_checkin geography(point, 4326) not null,
  distancia_m numeric,               -- distancia al POI al momento del check-in
  verificacion text not null default 'auto' check (verificacion in ('auto','ia_ok','ia_rechazada','manual')),
  sospecha_fraude boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, mission_id)
);

-- Figuritas y álbum
create table public.cards (
  id bigint generated always as identity primary key,
  poi_id bigint references public.pois(id),
  nombre text not null,
  barrio text not null,              -- página del álbum
  rareza text not null check (rareza in ('comun','poco_comun','rara','temporada')),
  arte_url text,
  valida_desde date, valida_hasta date
);
create table public.user_cards (
  user_id uuid references public.profiles(id),
  card_id bigint references public.cards(id),
  chapada_en timestamptz not null default now(),
  primary key (user_id, card_id)
);

-- Rachas
create table public.streaks (
  user_id uuid primary key references public.profiles(id),
  dias_actual int not null default 0,
  record int not null default 0,
  ultima_vuelta date
);

-- Recados (fase 2)
create table public.geo_notes (
  id bigint generated always as identity primary key,
  autor_id uuid not null references public.profiles(id),
  ubicacion geography(point, 4326) not null,
  radio_m int not null default 30,
  contenido text not null,
  audio_url text,
  visibilidad text not null default 'privado' check (visibilidad in ('privado','amigos','publico')),
  destinatario_id uuid references public.profiles(id),
  expira timestamptz,
  created_at timestamptz not null default now()
);

-- Negocios B2B (fase 3)
create table public.businesses (
  id bigint generated always as identity primary key,
  poi_id bigint references public.pois(id),
  nombre text not null, contacto jsonb,
  plan text check (plan in ('basico','plus','institucional')),
  activo_desde date, activo_hasta date
);

-- RLS: activar en TODAS las tablas. Patrón base:
alter table public.profiles enable row level security;
create policy "leer perfiles públicos" on public.profiles for select using (true);
create policy "editar solo el propio" on public.profiles for update using (auth.uid() = id);
-- (políticas análogas por tabla; completions/user_cards: insert solo del propio usuario;
--  missions/pois/cells/cards: select público, escritura solo service_role desde el VPS)
```

**Query central del producto** (vueltas cercanas, con PostGIS):

```sql
select m.*, p.nombre as poi, p.ubicacion,
       st_distance(p.ubicacion, st_point(:lng,:lat)::geography) as metros
from missions m join pois p on p.id = m.poi_id
join cells c on c.h3_index = m.h3_index
where m.estado = 'activa'
  and c.activa and (c.nivel_seguridad = 1 or (c.nivel_seguridad = 2 and :es_de_dia))
  and st_dwithin(p.ubicacion, st_point(:lng,:lat)::geography, 1200)
  and :ventana = any(m.ventana_horaria)
order by metros limit 10;
```

## 7.6 Anti-fraude (en capas, de gratis a barato)

| Capa | Mecanismo | Costo | Cubre |
|---|---|---|---|
| 1 | Cámara in-app obligatoria (sin galería) + EXIF/timestamp | $0 | ~80% del fraude casual |
| 2 | Geofence: check-in válido solo a < 75 m del POI | $0 | GPS remoto |
| 3 | Flag de mock location (Android lo expone) + jailbreak/root check básico | $0 | GPS falso |
| 4 | Velocidad imposible entre check-ins consecutivos (haversine/tiempo > umbral) | $0 | Teletransporte |
| 5 | Verificación visual con IA: muestreo 10% + 100% en figuritas raras/temporada | ~$0.002/foto | Foto no corresponde |
| 6 | Reporte comunitario + revisión admin | $0 | Cola larga |

Filosofía: no perseguir el 100%. El fraude residual de un free user cuesta cero; las figuritas raras y todo lo que toque B2B (visitas facturables) van con verificación reforzada.

## 7.7 Navegación y geolocalización

- **Radar (MVP):** distancia por **haversine** + rumbo por **bearing** entre coordenadas, flecha rotada con el magnetómetro del teléfono (expo-sensors). ~50 líneas de código, $0, y preserva la exploración. La misma haversine alimenta la capa 4 de anti-fraude: doble uso, mismo código.
- **"Cómo llegar" (MVP):** deep link `https://www.google.com/maps/dir/?api=1&destination=LAT,LNG&travelmode=walking` (gratis: abre la app de Google Maps, no consume API). Pieza del modo seguro.
- **Rutas dibujadas in-app (fase 3, rutas de creadores):** OSRM self-hosted en el VPS con extracto de Perú de Geofabrik (~300 MB, perfil peatonal, Docker). Alternativa para validar sin tocar el VPS: OpenRouteService (gratis hasta ~2k rutas/día). Evitar Google Directions (~$5–10/1,000).
- **Permisos:** ubicación solo en primer plano ("while using"). No pedir background location en MVP: fricción de permisos + revisión de stores más dura, sin beneficio para el loop.

## 7.8 Costos de infraestructura por etapa

| Rubro | Validación (0–1k usuarios) | Crecimiento (10k MAU) |
|---|---|---|
| Supabase | $0 | $25–60 |
| VPS (ya pagado) | $0 extra | $10–20 upgrade |
| R2 + CDN | $0–3 | $10–25 |
| API Claude | $10–20 | $60–150 |
| Mapas | $0 | $0 |
| Push/analytics/errores | $0 | $0–30 |
| **Total/mes** | **$15–40** | **$120–280** |

Únicos: Google Play $25 · Apple Developer $99/año · dominios ~$30/año.

---

# 8. Roadmap de desarrollo

## Fase 0 — Preparación (esta semana)

Checklist completo en §13. Resultado: dominios, cuentas, repo inicializado con este documento y `CLAUDE.md`.

## Fase 1 — MVP (12 semanas, dedicación parcial compatible con UPN y DavcStore)

| Semanas | Entregable | Detalle |
|---|---|---|
| 1–2 | Fundaciones | Migración SQL (§7.5) en Supabase + RLS; repo Expo TS; auth (email + Google); mapa MapLibre con ubicación; curación inicial de celdas y modo seguro de 3–4 distritos |
| 3–4 | Pipeline de contenido | Worker en VPS: Overpass → pois; generación con Claude → missions (con validación zod); panel admin mínimo para revisar/activar; pantalla "Las vueltas de hoy" con query §7.5 |
| 5–6 | Loop completable | Radar (haversine + bearing + magnetómetro); cámara in-app; subida a R2 con URL firmada; check-in con geofence; Álbum v1 (páginas por barrio) |
| 7–8 | Retención | Rachas; Calle y rangos; rarezas; 10 figuritas de temporada hechas a mano; push notifications (Expo) con el copy de §3.3 |
| 9–10 | Pulido y distribución | Onboarding ("Bienvenido a la cuadra"); modo seguro visible al usuario; capas anti-fraude 1–4; TestFlight + internal testing Android |
| 11–12 | **Beta cerrada** | 50–100 usuarios de UPN (el campus = laboratorio gratis de early adopters); instrumentación PostHog; medición contra §9 |

## Fase 2 — Retención y social (meses 4–6)

Lanzamiento público en Lima (mes 4) · Alcaldías + rankings distritales · Recados · calendario de temporadas · checkout web Yape/Plin + RevenueCat · primeros 5 negocios B2B en piloto regalado.

## Fase 3 — Monetización y expansión (meses 7–12)

Dashboard B2B self-service · vueltas patrocinadas · rutas de creadores con comisión · Lima completa + 1 ciudad de provincia · preparación de localización (capa de vocabulario por país, §3.2).

## Puertas de decisión (go/no-go)

- **Semana 12:** D30 de cohorte > 8% **y** > 2 vueltas/semana por usuario activo → invertir más tiempo. Entre 4–8% → iterar el loop 4 semanas más. 
- **Mes 6:** si tras 2 meses de iteración la retención no levanta de 3–4%, el loop no funciona: **pivotar barato** (candidatos: solo-B2B turístico, white-label municipal) antes que escalar algo muerto.
- **Mes 6:** ≥ 5 negocios B2B pagando → validación comercial; formalizar (RUC/RER) si no se hizo antes de la primera factura.

---

# 9. Métricas y criterios de decisión

**North star: vueltas completadas por semana.** Todo lo demás es diagnóstico de esa métrica.

| Métrica | Definición | Meta MVP |
|---|---|---|
| Activación | % de registros que completa su 1ª vuelta en 24 h | > 40% |
| D1 / D7 / D30 | Retención por cohorte | 35% / 15% / **8%** |
| Frecuencia | Vueltas por usuario activo por semana | > 2 |
| Integridad | % de check-ins marcados fraude | < 5% |
| Conversión (post-lanzamiento) | MAU → La Llave | 2–3% |
| B2B | Visitas verificadas por negocio/mes | > 25 (umbral de renovación) |

Instrumentar desde el día 1 con PostHog: funnel registro → 1ª vuelta → 2ª sesión → racha de 3.

---

# 10. Riesgos y mitigaciones

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| 1 | **Retención** — el cementerio del género (Randonautica colapsó tras el pico de 2020) | Alta | Crítico | Rachas + escasez temporal + alcaldías; puertas go/no-go de §8; presupuesto emocional para pivotar |
| 2 | Conversión a pago baja en Perú | Alta | Alto | Yape/Plin desde el día uno; B2B como plan A de ingresos |
| 3 | Cold start (app vacía sin usuarios) | Media | Alto | Valor single-player vía IA desde el día 1; lo social es amplificador, no requisito |
| 4 | Fraude en check-ins (afecta credibilidad B2B) | Media | Medio | §7.6 en capas; verificación reforzada en todo lo facturable |
| 5 | **Tiempo del fundador** (UPN + DavcStore compiten por horas) | Alta | Crítico | Roadmap a tiempo parcial; Claude Code como multiplicador; alcance MVP congelado (§4.5) |
| 6 | Incidente de seguridad de un usuario en una vuelta | Baja | Crítico | Modo seguro curado + disclaimer legal + misiones solo en espacio público + ventanas horarias; revisar T&C con abogado antes del lanzamiento público |
| 7 | Marca (búsqueda completa 9/41/35/42 del 2026-06-11): **cl. 42 bloqueada** (QUADRA `S00148186` heading completo, 2033); **cl. 35 ocupada por CUADRA idéntica** de botas MX (`T00010459`, 2035) + QUADRO en trámite (`68133-2025`); cl. 41 con QUADRA BAR (`S00159701`, 2034); **cl. 9 despejada**. Indecopi examina confusión de oficio | Media | Medio | Núcleo registral = **cl. 9 (+ 41 con especificación fina)**; cl. 35/42 con abogado pre-lanzamiento público (especificación, mixta, APPCUADRA para el B2B, cancelación por no uso). Beta cerrada = riesgo práctico bajo. Pendiente: detalle Producto/Servicio de `T00010459` (cl. 35) y `S00159701` (cl. 41); vigilar trámite de QUADRO |
| 8 | Dependencia de OSM (cobertura irregular en algunos distritos) | Media | Medio | Curación manual complementaria; el panel admin permite agregar POIs a mano; a futuro, los propios usuarios sugieren POIs |
| 9 | Costo de Apple ($99/año) antes de validar | — | Bajo | MVP beta puede ser Android-first (Perú es ~85% Android); iOS al lanzamiento público |

---

# 11. Plan de estudio del fundador

Punto de partida real: JS sólido, C#, infraestructura VPS, Cloudflare, API de Claude y Claude Code. Lo que falta, en orden de necesidad:

## Prioridad 1 — antes de la semana 1 (≈ 1 semana de estudio)

| Tema | Qué aprender exactamente | Recurso |
|---|---|---|
| React Native + Expo | Componentes, navegación (expo-router), hooks, ciclo de vida; correr el template en tu teléfono | Tutorial oficial de Expo (docs.expo.dev/tutorial) — completo, gratis |
| Supabase | Auth, cliente JS, Storage, y **RLS a fondo** (es tu modelo de seguridad; un RLS mal hecho expone datos de usuarios) | Docs de Supabase + su curso "Supabase in 100 seconds → deep dive" |

## Prioridad 2 — durante semanas 1–4 (se aprende haciendo)

| Tema | Qué aprender | Para qué |
|---|---|---|
| PostGIS básico | `geography` vs `geometry`, `ST_DWithin`, `ST_Distance`, índices GiST | La query central del producto (§7.5) |
| H3 | Concepto de resolución (usarás res. 9), `latLngToCell`, `gridDisk` en h3-js | Zonas de juego y modo seguro |
| Overpass QL | Sintaxis de queries por bounding box y tags (`amenity`, `shop`, `tourism`, `historic`) | Pipeline de POIs; probar en overpass-turbo.eu |
| expo-location y expo-sensors | Permisos foreground, accuracy, watchPosition; magnetómetro | Radar y check-in |
| Structured outputs con Claude | Forzar JSON estricto, validar con zod, manejo de reintentos | Ya dominas la API; esto es el ajuste fino del pipeline |

## Prioridad 3 — semanas 5–12

| Tema | Para qué |
|---|---|
| MapLibre React Native | Render del mapa, marcadores, estilo custom |
| EAS Build + publicación | Internal testing en Play Console, TestFlight |
| RevenueCat + Culqi/Mercado Pago | Los dos rieles de pago de §5.4 |
| ASO básico | Ficha de Play Store: keywords, screenshots, conversión |
| PostHog | Eventos, funnels, cohortes de retención |

## Transversal (mentalidad)

- **Mobile ≠ web:** estados de permiso, app en background, GPS impreciso bajo techo, batería. La mitad de los bugs vendrán de ahí.
- Leer un post-mortem de Foursquare y otro de Randonautica: este proyecto compite contra las razones por las que murieron, no contra sus features.

---

# 12. Estructura del repositorio y flujo de trabajo con Claude Code

## 12.1 Estructura de carpetas

```
cuadra/
├── CLAUDE.md                  # Contexto operativo para Claude Code (ver 12.2)
├── docs/
│   ├── documento-maestro.md   # ESTE documento — fuente de verdad
│   └── decisiones/            # ADRs: una decisión técnica = un archivo corto
├── app/                       # Expo (React Native + TypeScript)
│   ├── app/                   # rutas (expo-router)
│   ├── components/
│   ├── lib/                   # supabase client, geo (haversine/bearing), h3
│   └── ...
├── supabase/
│   ├── migrations/            # SQL versionado (empieza con §7.5)
│   └── seed/                  # celdas curadas, POIs iniciales, cards de prueba
├── worker/                    # Corre en el VPS
│   ├── pipeline/              # 1-sync-pois.ts, 2-generate-missions.ts, 3-verify-photos.ts
│   ├── prompts/               # prompt de generación (versionado: cambios de prompt = commits)
│   └── admin/                 # panel admin mínimo (web)
└── scripts/                   # utilidades (importar celdas, estadísticas)
```

## 12.2 CLAUDE.md (va en la raíz del repo — archivo adjunto listo para copiar)

Contiene: misión del proyecto en 3 líneas, stack congelado, glosario de dominio canónico (los nombres de §3.2 son ley en el código: la tabla se llama `missions` pero el concepto en UI siempre es "Vuelta"), convenciones (TypeScript estricto, zod en toda frontera de datos, RLS en toda tabla nueva), comandos frecuentes y referencias a `docs/`.

## 12.3 Cómo trabajar las primeras sesiones con Claude Code

1. **Sesión 0:** crear repo, copiar `CLAUDE.md` y este documento a `docs/`. Pedir: *"Lee CLAUDE.md y docs/documento-maestro.md. Genera el proyecto Expo con TypeScript y la migración SQL inicial de §7.5"*.
2. **Una sesión = un entregable del roadmap.** No mezclar ("hoy: pipeline Overpass→pois del §7.3, solo eso").
3. Cada decisión técnica que se desvíe de este documento → ADR corto en `docs/decisiones/` y, si aplica, actualizar el documento maestro. El documento vive; no se abandona.
4. Usar `/compact` con criterio (ya conoces sus límites): mejor sesiones cortas y enfocadas que una sesión eterna.
5. Pedir tests de lo crítico: haversine/bearing, validación de schema de misiones, reglas RLS (Supabase permite testearlas con `anon` vs `service_role`).

---

# 13. Checklist de arranque (próximos 7 días)

- [x] Comprar **appcuadra.com** (decidido). Verificar y comprar **cuadra.app** si está libre; comprar variante **quadra** barata como redirect. *(Hecho 2026-06-11 — dominios reservados por David.)*
- [x] Reservar **@appcuadra** en TikTok e Instagram. *(Hecho 2026-06-11.)*
- [x] Búsqueda fonética en **Indecopi** — hecha 2026-06-11, clases **9, 42, 41 y 35**. Panorama para CUADRA denominativa:
  - **Cl. 9 (app descargable): ✅ despejada** — lo más cercano: KUADRE (`P00392254`), no idéntica.
  - **Cl. 41 (entretenimiento/juegos): 🟡 viable con especificación fina** — obstáculo: QUADRA BAR (`S00159701`, vigente 2034; elemento dominante idéntico, servicios distinguibles). Pendiente ver su detalle Producto/Servicio.
  - **Cl. 42 (software/SaaS): 🔴 bloqueada** — QUADRA (`S00148186`, vigente 2033) cubre el encabezado completo de la clase, incl. "diseño y desarrollo de equipos informáticos y de software".
  - **Cl. 35 (publicidad/B2B): 🟠 riesgo medio-alto** — CUADRA idéntica de Manufacturera de Botas Cuadra S.A. de C.V. (`T00010459`, vigente 2035) + FRANCO CUADRA (mismo grupo, `T00010458`) + solicitud **QUADRO en trámite** (`68133-2025`). Pendiente ver detalle de servicios del T00010459.
  - *Conclusión: el producto se protege por **cl. 9 (+ 41)**; para 35 y 42, estrategia con abogado antes del lanzamiento público (especificación fina, marca mixta, APPCUADRA, cancelación por no uso). Nada de esto frena MVP ni beta cerrada.*
- [ ] Crear cuenta **Google Play Console** ($25). Apple puede esperar al lanzamiento público (§10, riesgo 9).
- [ ] Crear proyecto en **Supabase** (free tier) y correr la migración de §7.5.
- [ ] Instalar **Expo** y correr el template en tu propio teléfono (validar el entorno antes de escribir una línea de Cuadra).
- [ ] Crear el repo con la estructura de §12.1, `CLAUDE.md` y este documento en `docs/`.
- [ ] Primera caminata de curación: mapear a pie 20–30 POIs y los niveles de seguridad de las celdas del primer distrito (Barranco recomendado: denso, seguro, fotogénico, lleno de huariques).

---

*Cuadra v1.0 — Tu ciudad, cuadra por cuadra.*
