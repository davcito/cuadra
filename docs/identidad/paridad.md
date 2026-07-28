# Paridad con el prototipo — estado real de las 18 pantallas

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

**Flujo completo verificado:** Bienvenida → *Date una vuelta* → Permisos → *Dale, permitir* (pide ubicación de verdad) → Entrar. El atajo *Ya tengo cuenta* salta directo al login.

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
| 4 | Mapa (home) | 🟡 | Sin auditar en detalle. Sabido: usa estilos propios de tarjeta en vez del kit (5 casos); el chip de racha muestra `0` fijo; el mapa no dibuja pins de POIs ni la ruta punteada. E0.3 |
| 5 | Las vueltas de hoy | 🟡 | Sin auditar en detalle. Sabido: "0 de N chapadas" es literal. E0.3 |
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

## Resumen honesto

**3 de 18 verificadas idénticas** (todo el flujo 01 · Entrar) · 6 existen pero difieren o están sin auditar · 9 no existen todavía.

| Momento | Idénticas | Difieren / sin auditar | No existen |
|---|---|---|---|
| Antes de E0 (reportado como "6 funcionales") | **0** | 6 | 12 |
| Después de E0.1 | 1 | 6 | 11 |
| **Después de E0.2 (hoy)** | **3** | 6 | 9 |

El error de criterio que originó esta tabla fue confundir *"trae datos"* con *"cumple el diseño"*. Se corrige midiendo, no prometiendo.
