# Paridad con el prototipo — estado real de las 21 pantallas

**Este documento dice la verdad sobre qué está construido, no la memoria de nadie.**

Regla (plan RUP, iteración E0): el prototipo `CUADRA-Prototipo-v1.dc.html` **es la especificación**, no inspiración. Una pantalla se marca ✅ solo cuando, puesta al lado de su teléfono del prototipo, **no hay diferencias visibles**.

Estados: ✅ idéntico · 🟡 existe pero difiere (con la lista de deltas) · ❌ no existe todavía

Última verificación: **2026-07-28** · rama `main`

---

## Flujo 01 · Entrar

| # | Pantalla | Estado | Notas |
|---|---|---|---|
| 1 | **Bienvenida (onboarding 1/3)** | ✅ | Construida en E0.2. Es la ruta de entrada sin sesión (`unstable_settings.initialRouteName`) |
| 2 | **Entrar / Crear cuenta** | ✅ | Corregida en E0.1 — ver detalle abajo |
| 3 | **Permisos (ubicación + cámara)** | ✅ | Construida en E0.2 |
| 19 | **Crear cuenta** | 🟡 | **Construida** el 2026-07-28 (`crear-cuenta.tsx`). Campo NOMBRE → `options.data.username` → el trigger `handle_new_user` ya lo leía: **sin migración**. Medida en navegador a 430 × 932; falta la captura del iPhone |
| 20 | **Revisá tu correo** (post-registro) | 🟡 | **Construida** (`revisa-correo.tsx`) — reemplaza el `Alert.alert("Casi listo", …)`. Calato en la puerta + sello con el correo + reenviar. Falta la captura del iPhone |
| 21 | **Crear cuenta · errores en línea** | 🟡 | **Construida** como ESTADOS de la 19, no como pantalla aparte: `<Campo error>` pinta el borde de rojo y reemplaza la nota. Los errores de Supabase se traducen a la voz de marca (venían crudos y en inglés) |

**Flujo completo verificado:** Bienvenida → *Date una vuelta* → Permisos → *Dale, permitir* (pide ubicación de verdad) → Entrar → *Crear cuenta* → registro → *Revisá tu correo*. El atajo *Ya tengo cuenta* salta directo al login.

**Verificación en navegador (nueva capacidad, 2026-07-28):** el registro es una ruta SIN sesión, así que se puede auditar en la build web. Con `npm run web:preview` a 430 × 932 quedó comprobado el ciclo entero: botón apagado con el formulario vacío → contraseña corta muestra **"Te faltan 3 caracteres."** en el campo (no un popup) → al completar y aceptar términos el botón enciende naranja con su sombra dura. Cero errores de consola. Lo que la web NO prueba sigue siendo lo mismo: las safe areas.

**Medición contra el prototipo** (leída del DOM, no a ojo):

| Elemento | Prototipo | Medido |
|---|---|---|
| Título Bienvenida | Alfa Slab One 34 px | ✅ `AlfaSlabOne_400Regular 34px` |
| Párrafo Bienvenida | 15 px | ✅ `Archivo_400Regular 15px` |
| Botón principal | 800, 15 px | ✅ `Archivo_800ExtraBold 15px` |
| Link secundario | 700, 13 px | ✅ `Archivo_700Bold 13px` |
| Título Permisos | Alfa Slab One 28 px | ✅ `AlfaSlabOne_400Regular 28px` |
| Título de tarjeta | 800, 15 px | ✅ `Archivo_800ExtraBold 15px` |
| Meta de tarjeta | 12 px | ✅ `Archivo_400Regular 12px` |
| Caja de privacidad | borde `2px dashed #C9BCA3` | ✅ `dashed 2px rgb(201,188,163)` |

**Decisión de producto en Permisos:** la pantalla explica los dos permisos, pero **solo solicita ubicación**. La cámara se pide en su momento (al chapar, iteración E2): pedir dos permisos de golpe dispara más rechazos y el de cámara sin contexto no se entiende. El prototipo no dice lo contrario — muestra la explicación, no el momento de la solicitud.

**Pendiente menor:** hoy la Bienvenida aparece cada vez que no hay sesión (también al cerrar sesión). Falta la marca "ya la vi" en AsyncStorage para que sea solo de primera vez.

### Detalle de la pantalla 2 (corregida el 2026-07-28)

| Elemento del prototipo | Antes | Ahora |
|---|---|---|
| Toldo a rayas arriba | ❌ faltaba | ✅ `<Toldo>` en el kit |
| Isotipo "La Vuelta" | ❌ faltaba | ✅ `<Isotipo>` en SVG real (react-native-svg) |
| Wordmark **CUADRA** 38 px alineado a la izquierda | "Cuadra" 52 px centrado | ✅ |
| Tagline "Tu ciudad, cuadra por cuadra." | "Bienvenido a la cuadra." | ✅ |
| Etiquetas CORREO / CONTRASEÑA | ❌ faltaban | ✅ `<Campo etiqueta=…>` |
| Botón primario con sombra dura 4 px | plano | ✅ usa `<Boton>` del kit |
| Botón secundario "Crear cuenta" (ghost) | era "Continuar con Google" | ✅ |
| Contenido alineado arriba | centrado vertical | ✅ |
| Tarjeta de Calato al pie | sin sombra dura | ✅ usa `<Tarjeta>` |

**Causa raíz que se corrigió:** la pantalla **no importaba el kit de UI** — se dibujaba sus botones a mano sin la sombra dura de marca.

**Nota de producto:** se quitó "Continuar con Google" porque no está en el diseño y solo mostraba un `Alert("Pronto")`. El roadmap sí contempla auth con Google (§8, semanas 1–2): cuando se implemente de verdad, **primero se agrega al prototipo y después al código**, no al revés.

---

## Flujo 02 · Descubrir

| # | Pantalla | Estado | Notas |
|---|---|---|---|
| 4 | Mapa (home) | 🟡 | **Corregido el 2026-07-28** (2 capturas del iPhone): la tarjeta de la vuelta se dibujaba **arriba, bajo la barra de estado**, tapando los chips — regresión del propio fix de safe areas (ver abajo); y la barra de pestañas no cumplía la spec (alto y iconos). Pendiente: usa estilos propios de tarjeta en vez del kit (5 casos); el chip de racha muestra `0` fijo; el mapa no dibuja pins de POIs ni la ruta punteada. E0.3 |
| 5 | Las vueltas de hoy | 🟡 | **Corregido el 2026-07-28:** el separador dibujaba una barra lisa roja en vez del **toldo a rayas** del prototipo. Pendiente: "0 de N chapadas" es literal; falta el recap del día. E0.3 |
| 6 | Detalle de la vuelta | 🟡 | Sin auditar en detalle. Sabido: el botón "Llévame" no tiene acción. E0.3 |

## Flujo 03 · Chapar

| # | Pantalla | Estado | Notas |
|---|---|---|---|
| 7 | Radar | ❌ | No existe. Iteración E3 |
| 8 | Cámara in-app | ❌ | No existe. Iteración E2 |
| 9 | ¡Chapada! | ❌ | No existe. Iteración E2 |

## Flujo 04 · Colección

| # | Pantalla | Estado | Notas |
|---|---|---|---|
| 10 | El Álbum | 🟡 | Sin auditar en detalle. Sabido: grilla fija de 9 celdas, chips de barrio decorativos, no usa `arte_url`. E0.3 |
| 11 | Figurita (detalle) | ❌ | No existe. Iteración E3 |
| 12 | Alcaldía de la cuadra | ❌ | No existe. Construcción C3 |

## Flujo 05 · Vos

| # | Pantalla | Estado | Notas |
|---|---|---|---|
| 13 | Perfil | 🟡 | Sin auditar en detalle. Sabido: los toggles de ajustes no configuran nada. E0.3 |
| 14 | La Llave (suscripción) | ❌ | No existe. Construcción C3 |
| 15 | Ajustes + modo seguro | ❌ | No existe como pantalla propia (hay dos filas inertes dentro de Perfil). Construcción C2 |

## Flujo 06 · Estados y avisos

| # | Pantalla | Estado | Notas |
|---|---|---|---|
| 16 | Estado vacío (sin vueltas) | 🟡 | Existe dentro de `vueltas.tsx`, falta el recap del día (figuritas, cuadras, cuenta regresiva). E0.3 |
| 17 | Racha en riesgo | ❌ | No existe. Iteración E3 |
| 18 | Modo seguro / fuera de horario | ❌ | No existe. Iteración E3 |

---

## Seguridad de dispositivo (safe areas)

El prototipo dibuja teléfonos idealizados: **no tiene notch, ni isla dinámica, ni indicador de home**. Copiar sus medidas al pie de la letra produce pantallas rotas en equipos reales. Regla: **ninguna medida vertical se hardcodea contra el borde de la pantalla** — sale de `useSafeAreaInsets()`.

Hallado con una captura del iPhone de David (2026-07-28): **la isla dinámica le tapaba el mechón a Calato** en la Bienvenida — uno de los tres rasgos innegociables del personaje.

| Pantalla / pieza | Defecto | Corrección |
|---|---|---|
| Bienvenida | El hero arrancaba en y=0: el notch tapaba la cabeza de Calato | `height: 300 + insets.top` con `paddingTop: insets.top`; fondo en papel para continuar sin costura el propio fondo del render |
| Detalle de vuelta | El hero ilustrado también arrancaba en y=0 | `paddingTop: insets.top` con el color de la categoría extendido bajo el notch |
| Barra de pestañas | `bottom` fijo en 26 (iOS) / 16 (Android) | `Math.max(insets.bottom, 12)` — el indicador de home y la navegación por gestos miden distinto en cada equipo |
| Tarjeta del mapa | `bottom: 92` fijo → **quedaba detrás de la barra** en iPhone con indicador de home | Se calcula sobre el alto real de la barra |

### Segunda tanda (2026-07-28, tarde) — lo que la primera rompió y lo que no se había medido

| Pieza | Defecto | Corrección |
|---|---|---|
| Tarjeta de la vuelta (mapa) | **Regresión del fix anterior:** `bottom: 92` vivía en el estilo compartido `saludo`, que usan DOS tarjetas. Al sacarlo del StyleSheet para calcularlo, se re-inyectó solo en la rama del saludo de Calato → la tarjeta de la vuelta quedó en `position:absolute` **sin `top` ni `bottom`** = pegada arriba, bajo la barra de estado, tapando los chips | La rama de la tarjeta recibe el mismo `bottom` calculado |
| Barra de pestañas · alto | `height: 62` inventado; el prototipo **no fija alto** (`padding: 9px 6px`) y el padding estaba asimétrico (8/6) → se veía ahogada | Alto exacto **49** = 9+17+3+11+9, padding simétrico, todo desde `medidas` en `theme.ts` |
| Barra · icono Perfil | El prototipo es `border-radius: 50% 50% 0 50%` (esquina recta **abajo-derecha**) y 16×16; el código tenía la esquina recta abajo-**izquierda** y 17×17: **estaba espejado** | 16×16 con `borderBottomRightRadius: 0` |
| Barra · icono Álbum | `borderStyle:"dashed"` de RN no dibuja como el `dashed` de CSS: saca 2 trazos gordos por lado y se leía como corchetes | Redibujado en **`react-native-svg`** con `strokeDasharray` |
| Barra · rótulos | El prototipo usa `gap: 3px`; el código `marginTop: 1`. Además escalaban con el texto del sistema y desbordaban una barra de alto exacto | `marginTop: 3` + `allowFontScaling={false}` |

**Causa raíz de la regresión (vale para toda pieza flotante):** un mismo número (el alto de la barra) vivía copiado en dos archivos. Ahora es **un token** (`medidas` en `theme.ts`) y las piezas que se apoyan en la barra lo leen de ahí.

### Tercera tanda (2026-07-28, noche) — 4 capturas, las 4 pestañas

| Pieza | Defecto | Corrección |
|---|---|---|
| Barra de pestañas | **Segunda regresión mía:** con el alto exacto de la spec (49), los rótulos "Mapa/Vueltas/Álbum/Perfil" quedaban **FUERA del panel negro**, dibujados sobre el mapa. Causa: `BottomTabItem` de React Navigation trae `padding: 5` y `paddingVertical: 7` **en su propio StyleSheet**, que `tabBarItemStyle` no alcanza | La barra la dibujamos nosotros con `tabBar={…}`: `<BarraCuadra>` propia, sin alto fijo (el alto sale del contenido, como en el CSS) → es **imposible** que un rótulo se salga |
| Vueltas · separador | El prototipo pone el **toldo a rayas** bajo el encabezado (línea 325); la pantalla dibujaba una **barra lisa roja** con estilo propio. Se leía como una barra de progreso llena al 100 % junto a "0 de 3 chapadas" | Usa `<Toldo>` del kit |
| Kit · `<Toldo>` alto | 12 px. En CSS `.toldo` es **content-box**: `height:10` + 2 + 2 de borde = **14** de alto real. En RN el borde va dentro de la caja | `height: 14` |
| Kit · `<Toldo>` rayas | 14 rayas con `flex: 1` → en un iPhone de 430 pt cada raya medía **31 pt**, más del doble de la spec, y cambiaba de ancho según el equipo | Rayas de **ancho fijo 14** dibujadas de más y recortadas por `overflow: hidden` |
| Kit · `<Toldo>` color claro | Usaba `--papel` `#FBF7F0`; el prototipo usa `#FFFDF8` | Token nuevo `colores.papelVivo` |

**Lección de las dos regresiones seguidas:** las dos nacieron de *calcular* un alto y confiar en que el framework respetara la cuenta. Cuando la spec fija el interior de un contenedor, la forma robusta no es acertar el número: es **quitarle el alto fijo** y dejar que salga del contenido — que es, además, lo que dice el CSS.

### Cuarta tanda — lo que encontró el detector automático en su PRIMERA corrida

Ya no a ojo: `npm run paridad` cruza el CSS del prototipo contra los `StyleSheet` del código.
Estas cuatro estaban escritas desde siempre y nadie las había cruzado:

| Pieza del kit | Prototipo | Estaba | Consecuencia |
|---|---|---|---|
| `<Tarjeta>` | `.card { background: var(--papel) }` | **sin fondo** | Una tarjeta del kit sobre el mapa sería transparente — **por eso la pantalla del mapa se dibujaba su propia tarjeta con fondo** en vez de usar el kit |
| `<Boton>` | `padding: 13px` | `14 / 20` + `minHeight: 52` | Botón 4 px más alto que el diseño |
| `<Chip>` | `align-items:center; gap:5px` | sin ninguno de los dos | Los chips con icono (la llamita de la racha) no alinean |
| `<Campo>` | `padding: 12px 14px; font-size: 14px` | `15 / 16` y `16 px` | El campo salía **6 px más alto** y con la letra más grande — en la pantalla de login que estaba marcada ✅ |

El detector cerró en **0 diferencias sobre 7 piezas**. Lo que aún no cubre (y por eso el
segundo bug del día se escapó) es todo lo que solo aparece corriendo: el `padding: 5` interno
de `BottomTabItem` no vive en ningún archivo nuestro.

**Limitación de verificación:** esto **no se puede comprobar en el navegador** — `useSafeAreaInsets()` devuelve 0 sin notch. Lo único que valida la web es que no haya regresión con inset 0. **La prueba real es el dispositivo**, y por eso cada tajada que toque posicionamiento vertical se cierra con una captura del iPhone.

---

## Resumen honesto

**3 de 21 verificadas idénticas** · 9 existen pero difieren o esperan la captura del dispositivo · 9 no existen todavía.

El denominador **subió de 18 a 21** el 2026-07-28: al auditar el botón "Crear cuenta" apareció que la pantalla nunca existió — ni en el código ni en el prototipo. Se diseñaron las 3 que faltaban (19, 20, 21). Un denominador que crece no es un retroceso: es dejar de contar sobre un mapa incompleto.

| Momento | Idénticas | Difieren / sin auditar | No existen | Total |
|---|---|---|---|---|
| Antes de E0 (reportado como "6 funcionales") | **0** | 6 | 12 | 18 |
| Después de E0.1 | 1 | 6 | 11 | 18 |
| Después de E0.2 | **3** | 6 | 9 | 18 |
| Hoy · registro diseñado + barra corregida | **3** | 6 | 12 | 21 |
| **Hoy · registro CONSTRUIDO (19, 20, 21)** | **3** | **9** | **9** | **21** |

El error de criterio que originó esta tabla fue confundir *"trae datos"* con *"cumple el diseño"*. Se corrige midiendo, no prometiendo.
