# Plan de ejecución RUP — Cuadra: de la demo al producto escalado

> **Estado al 2026-07-28** · Fase 2 (Elaboración) en curso.
> **Al retomar, empezar por acá:** el flujo 01 ya está construido, pero **la app no enseña a
> jugar** — ver la sección «PRIMER USO» y la iteración **E4**, con la investigación de
> Pokémon GO / Geocaching / Duolingo ya hecha y lo que falta mirar con la app en la mano.
> Hecho: **E1.1** (fuentes de marca) · **E0.1** (login idéntico al mockup + kit ampliado) ·
> **E0.2** (Bienvenida y Permisos) · fix de safe areas.
> Siguiente: **E0.3** — auditar y corregir las 5 pantallas restantes.
> El avance real por pantalla se lleva en [`identidad/paridad.md`](identidad/paridad.md).

## Contexto

**Por qué existe este plan.** Cuadra tiene una identidad de marca terminada (guía V1.3, mascota Calato, ícono) y un prototipo de 18 pantallas dibujado, pero el código real tiene **6 pantallas y es 100% de solo lectura**: no se puede completar una Vuelta. La base de datos vive con el seed mínimo (37 celdas de Barranco, 3 POIs, 3 vueltas). El worker que genera contenido con IA son tres esqueletos con `console.log`.

Dicho en una línea: **el proyecto tiene cimientos sólidos y cero loop jugable.**

**Qué resuelve este plan.** Ordena el trabajo restante con metodología **RUP** (iterativo e incremental, dirigido por riesgo) desde la **demo funcional** hasta el **producto escalado**, con hitos verificables y criterios de aceptación que no dependen de mi opinión.

**Decisiones del dueño que gobiernan el plan:**
- **Meta:** demo funcional primero, después iterar/parchar hasta el producto final.
- **Capacidad real:** 4 horas/día (~28 h/semana).
- **Modelo de IA:** el mejor disponible, no Haiku (decisión que cambia §7.4 del documento maestro).
- **Modo de trabajo:** implementamos juntos, paso a paso — cada tajada incluye explicación del *por qué*, no solo código.

---

## Estado real verificado (línea base)

Medido en código y contra la base viva, no leído de la documentación.

### Lo que YA funciona
| Pieza | Estado |
|---|---|
| Auth email/password | Funcional (`sign-in.tsx` + `lib/auth.tsx`) |
| Navegación 4 pestañas | Funcional, barra tinta del prototipo |
| 6 pantallas leyendo Supabase real | Mapa, Vueltas, Álbum, Perfil, Detalle, Login |
| Mapa MapLibre en WebView + GPS | Funcional (te ves en el mapa) |
| Calato vivo (6 estados) + cortina | Funcional, Reanimated, corre en Expo Go |
| Kit de UI (`components/ui.tsx`) | Sombra dura, tarjeta, botón, chip, dificultad |
| `lib/geo.ts` | Haversine/bearing/cuadras/velocidad — **13 tests verdes, ningún consumidor** |
| `worker/pipeline/schema.ts` | Validación zod estricta + regla anti-alucinación — **10 tests verdes** |
| DB: 10 tablas + 12 políticas RLS | Migración aplicada y verificada |
| Identidad en `theme.ts` | 100% de colores, escala y radios |

### Los 5 huecos que bloquean la demo
1. **No se puede chapar.** No existe la RPC `chapar()`, ni cámara, ni storage de fotos. La app no escribe nada salvo auth.
2. **No hay contenido.** 3 POIs y 3 vueltas. El pipeline OSM→IA es un esqueleto: `1-sync-pois.ts` no llama a Overpass, `2-generate-missions.ts` no llama a ningún modelo (tiene 2 POIs falsos hardcodeados para demostrar el contrato).
3. **Faltan 12 de 18 pantallas:** bienvenida, permisos, radar, cámara, ¡Chapada!, figurita detalle, alcaldía, La Llave, ajustes, y los 3 estados de Calato.
4. **No se ve como el prototipo.** Las fuentes (Alfa Slab One + Archivo) están declaradas en `theme.ts` pero **nunca se cargan** — la app usa las del sistema. El splash sigue azul `#208AEF` del template de Expo.
5. **Hardcodes que mienten al usuario:** el chip de racha dice `0` literal, "0 de N chapadas" es texto fijo, el Álbum siempre dibuja 9 celdas, los chips "MIRAFLORES/CERCADO" son decorativos, los toggles de Ajustes no configuran nada, y varios botones no tienen `onPress`.

### Deuda técnica menor detectada
- `app/dist/` está commiteado (build viejo, debería estar ignorado).
- 10 assets sobrantes del template Expo (`react-logo`, `tabIcons/`, `expo-badge`…).
- Bug de datos en el seed: el POI 9002 es `huaca` pero su Vuelta dice `categoria: 'caleta'`; los `insert` de `missions`/`cards` no tienen target de conflicto → re-ejecutar el seed duplica filas.
- `theme.ts` dice "V1.2" y apunta a un archivo que ya se llama `v1.3`.
- Colores hardcodeados repetidos en 6 archivos en vez de importar `colores`.

---

---

## 🔴 REGLA DE FIDELIDAD (no negociable)

**El prototipo no es "inspiración": es la especificación.** Una pantalla está terminada solo cuando es **idéntica** a su teléfono del prototipo (`docs/identidad/CUADRA-Prototipo-v1.dc.html`) — mismos elementos, mismo orden, mismo copy, mismas sombras duras, mismas etiquetas.

**Corolario de proceso, aprendido a los golpes:** *nada de lo ya construido se da por hecho.* Antes de marcar una pantalla como lista hay que **abrirla al lado de su mockup y listar las diferencias**. En la auditoría inicial de este plan yo di 6 pantallas por "funcionales" mirando solo si traían datos — sin compararlas con el prototipo. Estaban a medias. Si una tajada dice "ya está hecho", la respuesta correcta es **verificarlo**, no creerlo.

### 🔎 Regla del 2026-07-28 (David): TODO idéntico, y la disparidad se arregla, no se anota

**"No podemos perdernos en detalles."** *Todo* elemento debe ser idéntico al mockup —
incluidos los que parecen menores: iconos de la barra, tamaños de 1 px, la esquina
recta de un blob, el `gap` entre icono y rótulo. Un detalle que se deja pasar es deuda
de marca que después nadie vuelve a mirar.

**Obligación operativa, no opcional:** cuando aparezca una disparidad con el prototipo
—la traiga una captura de David, la encuentre yo auditando, o me la cruce de paso
haciendo otra cosa— hay que **(1) decirla explícitamente y (2) arreglarla en el momento**.
No vale dejarla "para E0.3" salvo que David lo decida.

**Cómo se mide, para que no sea opinión:** la spec sale del CSS del prototipo
(`docs/identidad/CUADRA-Prototipo-v1.dc.html`), leído literal — no a ojo. Ejemplo del día
que se escribió esta regla: la barra de pestañas decía `padding: 9px 6px` sin alto fijo,
y el código tenía `height: 62` con padding asimétrico 8/6; y el icono de Perfil, que en el
prototipo es `border-radius: 50% 50% 0 50%` (esquina recta **abajo-derecha**), en el código
tenía la esquina recta abajo-izquierda: **estaba espejado**.

**Cuando la plataforma no puede copiar al navegador, se cambia de técnica, no de spec.**
`borderStyle: "dashed"` en React Native no dibuja como el `dashed` de CSS (saca dos trazos
gordos por lado). Eso no autoriza a aceptar un icono distinto: se pasa a `react-native-svg`,
que sí da el guion exacto. Regla general: si la primitiva no alcanza, se sube de herramienta.

### 📐 El prototipo es un LIENZO, no una lista de píxeles (decisión del 2026-07-28)

**Hallazgo que costó tres "correcciones" equivocadas mías.** El prototipo dibuja sus teléfonos
en un lienzo de **336 × 718**; el iPhone 15 Pro Max mide **430 × 932**. Copiar sus números
tal cual **encoge la app un 22 %** — y así se veía la barra "apretada".

La prueba de que es sistémico está en los números que había **antes** de que yo los tocara:

| Pieza | Spec | × 1.28 | El código decía |
|---|---|---|---|
| Alto de la barra | 49 | **63** | **62** |
| Campo · padding vertical | 12 | **15** | **15** |

Quien escribió esos valores los había ajustado a ojo al equipo real. Yo los reemplacé por la
lectura literal del CSS y encogí la app. **Las disparidades eran reales como proporción**
(padding asimétrico, icono espejado, toldo liso, rayas del doble de ancho); lo que apliqué mal
fueron los valores absolutos. El código además mezclaba criterios: la barra escalada (62) pero
el icono y el rótulo literales (17 y 9) — por eso se veía rara de dos maneras a la vez.

**Regla:** todo número que salga del prototipo pasa por **`esc()`** de `theme.ts`, que lo
multiplica por `ancho_del_equipo / 336` (tope ×1.4 para que en tablet no sea gigante). No pasan
por ahí los que no vienen del diseño: `flex`, opacidades, duraciones de animación.

**Y el detector lo respeta:** `scripts/paridad-css.mjs` evalúa `theme.ts` inyectando un
`Dimensions` de **336**, así el factor da 1 y compara **spec contra spec**. Si comparara contra
las medidas del equipo, marcaría como error justamente la escala que queremos.

**Pendiente de barrido:** los tokens (`theme.ts`), el kit (`ui.tsx`) y la barra ya están
escalados. Los números sueltos DENTRO de cada pantalla se convierten en E0.3, cuando cada
pantalla se audita de todos modos.

### 📱 Dispositivo de referencia: iPhone 15 Pro Max

La verificación en equipo real se hace contra el **iPhone 15 Pro Max** de David
(430 × 932 pt · isla dinámica · `insets.top ≈ 59`, `insets.bottom ≈ 34`). Todo lo que se
construya tiene que verse correcto **ahí primero**, y adaptarse por token/inset al resto.

Consecuencias que ya son ley:
- **Medidas verticales:** siempre de `useSafeAreaInsets()`, nunca contra el borde.
- **Piezas flotantes que se apoyan entre sí** (la tarjeta del mapa sobre la barra de
  pestañas) **no repiten el número**: sale de `medidas` en `theme.ts`. Un `62` suelto en
  dos archivos ya nos costó un bug.
- **El texto de la UI de tamaño fijo no escala con el sistema** (`allowFontScaling={false}`
  en rótulos de 9–12 px dentro de contenedores de alto exacto): con el texto grande de iOS
  la barra se desbordaba.

### 📱 Segunda regla, del mismo golpe: el prototipo dibuja teléfonos idealizados

El prototipo **no tiene notch, ni isla dinámica, ni indicador de home**. Copiar sus medidas verticales al pie de la letra **rompe en equipos reales**: una captura del iPhone de David mostró la isla dinámica tapándole el mechón a Calato — uno de los tres rasgos innegociables del personaje.

**Regla:** ninguna medida vertical se hardcodea contra el borde de la pantalla. Sale de `useSafeAreaInsets()`. Y cuando una pieza flotante depende de otra (la tarjeta del mapa se apoya sobre la barra de pestañas), su posición **se calcula**, no se copia a ojo.

Cuatro defectos de este tipo, ya corregidos (commit `2054d42`): hero de Bienvenida y de Detalle arrancando en `y=0`; barra de pestañas con `bottom` fijo 26/16; tarjeta del mapa en `bottom: 92` que quedaba **detrás** de la barra al volverla dinámica.

**Limitación que condiciona la verificación:** esto **no se puede comprobar en el navegador** — sin notch, `useSafeAreaInsets()` devuelve 0. La web solo prueba que no haya regresión. **Toda tajada que toque posicionamiento vertical se cierra con una captura del dispositivo de David**, no con un export web.

**Causa raíz detectada:** las pantallas que no se ven como el prototipo **no usan el kit de UI**. Medido:

| Pantalla | ¿Importa `components/ui`? | ¿Usa `Tarjeta`/`SombraDura`? | Estilos de borde/sombra propios |
|---|---|---|---|
| `sign-in.tsx` | ❌ **no** | ❌ 0 | 4 |
| `(app)/index.tsx` | sí | ❌ 0 | 5 |
| `vueltas.tsx` | sí | 7 | 2 |
| `album.tsx` | sí | 3 | 3 |
| `perfil.tsx` | sí | 11 | 2 |
| `vuelta/[id].tsx` | sí | 5 | 2 |

`sign-in.tsx` se dibuja sus propios botones con `Pressable` + estilos locales **sin sombra dura** — por eso la pantalla se ve plana en el teléfono. La regla operativa que sale de acá: **ninguna pantalla dibuja un botón, tarjeta o chip a mano. Todo sale de `components/ui.tsx`.** Si el kit no tiene algo, se agrega al kit, no a la pantalla.

---

## 🎬 REGLA DE MOVIMIENTO (decisión de David, 2026-07-28)

**Todo tiene que tener buenas animaciones.** No es pulido de última fase: en un juego el
movimiento *es* producto. Una figurita que aparece de golpe y una que se revela con peso se
sienten dos apps distintas, y la segunda es la que hace volver mañana. El prototipo dibuja
estados quietos; **el movimiento entre esos estados también es especificación** y se decide
acá, no improvisando en el momento de codear.

**Principios (de la guía de identidad, sección 05 — sombra dura, sin blur):**
- **Con peso, no flotando.** Muelle (`spring`), no `linear`. La marca es de papel y tinta con
  sombra dura: las cosas caen y rebotan un poco, no se desvanecen.
- **Corta.** 150–320 ms para UI; solo las celebraciones pasan de 600 ms.
- **Una por momento.** Igual que "una acción principal por pantalla": una animación protagonista
  por pantalla, el resto se calla.
- **Siempre en el hilo de UI** (Reanimated, `useSharedValue`/`withSpring`), nunca `setState`
  por frame. 60 fps en el equipo de referencia o no entra.
- **Respetar "reducir movimiento"** del sistema (`AccessibilityInfo.isReduceMotionEnabled`):
  con esa opción activa, las transiciones se vuelven cortes y las celebraciones, estáticas.

### Lo que YA se mueve (verificado en código)

| Pieza | Qué hace | Dónde |
|---|---|---|
| **Calato vivo** — 6 estados | `tranqui` respira · `atento` respira corto · `trotando` rebota · `chapada` salta con `Easing.bounce` · `culpa` se encoge y se mece · `juzgando` te mira | `components/calato-vivo.tsx` (Reanimated, corre en Expo Go) |
| **Cortina de Calato** | Tapa los saltos de navegación con sesión (login → home, cerrar sesión) para que el guard del layout no se vea | `components/calato-cortina.tsx` · usada en `sign-in.tsx` y `perfil.tsx` |
| Tarjetas flotantes del mapa | `FadeInDown.springify()` al entrar, `FadeOutDown` al salir el saludo | `(app)/index.tsx` |

### Lo que falta, con su iteración (no se posterga a "pulido")

| Momento | Animación | Entra en |
|---|---|---|
| Cambio de pestaña | Icono y rótulo transicionan de metadato a naranja con muelle; el icono activo "asienta" 2 px | **E0.3** (barra propia, ya la dibujamos nosotros) |
| Lista de Vueltas | Entrada escalonada de las 3 tarjetas (~60 ms de retraso entre cada una) + `Layout` animado al refrescar | **E0.3** |
| Radar | Anillos punteados que laten hacia afuera · la flecha interpola suave al girar el equipo (nunca salta) · la cifra de cuadras cuenta hacia abajo, no parpadea | **E3** |
| Obturador de la cámara | Destello + contracción del marco de esquinas al disparar | **E2** |
| **¡Chapada!** — el momento compartible | Secuencia: cortina → la figurita entra girando y **aterriza con sombra dura** → confeti SOLO en colores de marca → `+N Calle` contando → el chip de racha late una vez → Calato salta | **E2** |
| Figurita al Álbum | La celda vacía se voltea y revela la figurita cuando volvés del ¡Chapada! | **E3** |
| Racha y Calle | Los números **cuentan** hasta su valor, no aparecen puestos; la barra de Calle crece con muelle | **E3** |
| Rango nuevo | Sello que cae y rebota, con la escala de 6 niveles | **C1** |
| Racha en riesgo | Calato en `culpa` + latido lento del chip: urgencia sin pánico | **E3** |

### 🐕 Calato en 3D — hallazgos del spike (2026-07-28)

David pidió animaciones «tipo Duo» y señaló lo correcto: **con imágenes no alcanza.** Duo no
son imágenes, es un **rig con máquina de estados**. Sin esqueleto no hay gesto nuevo sin volver
a dibujar. Se corrió un spike: pose A generada con IA → `image_to_3d` con rigging y animación.

**Funcionó.** 31.126 triángulos, **24 huesos**, malla con piel, clip de saludo de 5,37 s, altura
0,700 m exacta. Los tres innegociables sobrevivieron en 3D (orejas asimétricas, mechón de una
llama, lengua de costado) y la mochila salió modelada en volumen real. Medido con
`scripts/inspector/index.html`: **los 24 huesos se mueven**, la mano del saludo recorre 35,8 cm
sobre un personaje de 70 cm. Nada quedó soldado.

**Tres problemas encontrados, con su causa y su arreglo:**

| Problema | Medido | Causa | Arreglo |
|---|---|---|---|
| **Se tumba al saludar** | tronco de −3,3° en reposo a **+40,8°** en el pico | Los 678 clips son **captura de movimiento humana**; Calato tiene patas cortas y la rotación de cadera se amplifica | Amortiguar las pistas de `Hips`/`Spine` al cargar el clip (unas 15 líneas en three.js), o elegir clips contenidos |
| **Se estira debajo del brazo** (lo vio David antes que yo) | mediana de estiramiento 0,988 — pero **3 aristas > 2×**, la peor **2,84×**, a 0,26 m de altura y 0,12 m de lado: el flanco, bajo el hombro | El auto-rigger pinta pesos por cercanía; con **panza grande y brazos cortos**, el hueso del brazo se lleva un pedazo de torso | Regenerar desde una **pose en T** (más aire para el rigger) y, si hace falta, repintar pesos en Blender |
| **La cara no se mueve** | de los 24 huesos, **ninguno es facial** | El auto-rigger solo produce esqueleto de cuerpo | Ver abajo |

### 😊 La cara: sin esto no hay «natural y amigable»

Calato hoy solo puede **girar la cabeza entera**. No puede parpadear, ni sonreír, ni mover una
oreja. Y la cara es justamente donde vive la amabilidad de un personaje — es lo que hace que
Duo funcione. **Decisión de David: hay que resolverlo.**

**El atlas de expresiones se descartó por medición, no por opinión.** Era la vía más barata y
se probó primero. El despliegue UV que produce el generador automático es **atlas por parches**:
midiendo los vértices alrededor de un ojo del modelo, sus coordenadas de textura caen en

| Radio alrededor del ojo | Vértices | **Islas distintas del atlas** |
|---|---|---|
| 6 mm | 12 | **2** |
| 12 mm | 30 | **5** |
| 22 mm | 95 | **15** |

Un solo ojo vive repartido en **15 fragmentos** desperdigados por toda la imagen de 2048×2048,
cada uno con su propia rotación. Pintar una expresión exigiría editar esos quince pedazos y que
las costuras coincidan. No es difícil: es inviable. *(Se intentó igual: se localizaron las islas
de la esclera y se pintaron párpados; el render mostró el iris intacto porque estaba en otra
isla. Ese callejón está cerrado y documentado para no volver a entrar.)*

| Vía | Qué es | Estado |
|---|---|---|
| ~~Atlas de expresiones~~ | Intercambiar la región de la cara en la textura | ❌ **descartado** — UV fragmentado en 15 islas por ojo |
| **Plano de cara superpuesto** ⬅️ *lo viable hoy* | Un cuadro plano pegado al hueso de la cabeza, con su propia textura limpia de ojos y boca, que **tapa** los horneados. **No depende del UV del modelo**, y se hace entero en three.js sin Blender | Necesita que alguien dibuje las expresiones |
| **Re-desplegar UV en Blender** | Rehacer el mapa para que la cara quede en una isla | Habilita el atlas, pero hay que rehacerlo cada vez que se regenere el modelo |
| **Huesos extra** (orejas, cola, mandíbula) | 2-3 huesos por oreja: se caen de tristeza, se paran de alerta | Trabajo de Blender; enorme ganancia de expresividad |
| Blendshapes | El estándar de animación facial 3D | Caro: modelado por expresión |

### 🧱 La conclusión incómoda del spike

Los problemas encontrados **no son independientes: todos salen de que el modelo es generado
automáticamente**. Pesos de piel que estiran el flanco, cero huesos faciales, UV inutilizable,
el rig perdido al regenerar, licencia CC BY que no puede ir a producción, y una cara que derivó
del original.

El modelo auto-generado **sirvió para lo que servía**: probar que un Calato 3D riggeado corre a
**60 fps con una sola llamada de dibujo** en el equipo de referencia, conservando el canon. Eso
está demostrado y es un resultado real.

Pero **como activo de producto, este modelo no es el definitivo.** Para que Calato pueda
expresar —que es lo que David pidió y tiene razón— el modelo tiene que estar **construido**, no
generado: retopología, UV de artista, huesos de cara, orejas y cola. Es trabajo de un modelador
3D, una vez, para un activo que después sirve a la app, a TikTok y a la papelería.

**Interino sin costo de artista:** el **plano de cara superpuesto** funciona a pesar del UV malo
y se programa entero en three.js. Sirve para tener parpadeo y expresiones básicas mientras se
decide la inversión en el modelo definitivo.

**Las orejas son el rasgo más expresivo de Calato** — una parada y una doblada ya cuentan algo
sin que él haga nada. Con dos huesos cada una se caen de tristeza o se paran de alerta, y eso
es *movimiento secundario*: lo que separa un personaje vivo de un muñeco que se traslada.

**Combinación elegida: atlas de caras + huesos de orejas y cola.** Da expresividad de nivel Duo
sin rig facial completo.

**Punto de reevaluación (Rive):** el camino 3D conserva el canon de identidad y corre en Expo Go
(`expo-gl` está incluido en SDK 54, verificado en docs). **Rive** vuelve a la mesa solo si el
render en dispositivo no llega a 60 fps, o si el atlas de caras resulta insuficiente. Sale un
**ADR-0008** cuando estén los fps medidos en el iPhone 15 Pro Max.

**Criterio de aceptación del movimiento:** se verifica **grabando la pantalla del iPhone 15
Pro Max**, no en el navegador. Si en el video se ve un salto, un parpadeo o un elemento que
aparece de golpe donde debía entrar, la tajada no está terminada.

---

## 🎓 PRIMER USO — hoy la app no enseña a jugar (pendiente abierto por David, 2026-07-28)

**El problema, en sus palabras:** *"apps parecidas tienen una introducción y cosas que te
expliquen; acá entramos de una y no sabemos ni cómo funciona."*

**Diagnóstico honesto de lo que hace Cuadra hoy:** Bienvenida (una frase) → Permisos →
**registro obligatorio** → mapa. El usuario llega al mapa sin saber qué es una Vuelta, qué es
Chapar, qué es la Calle, qué es una figurita ni por qué debería caminar. El vocabulario de
marca —que es una fortaleza— se vuelve un muro cuando nadie lo tradujo. Y el paginador de la
Bienvenida dibuja **3 puntos** pero solo existen 2 pantallas: la tercera nunca se definió.

### Lo que hacen las apps parecidas (investigado el 2026-07-28)

| Hallazgo | Fuente | Qué implica para Cuadra |
|---|---|---|
| **Deferred account creation**: usar el producto ANTES de registrarse sube la activación 10-30 % y la retención del día siguiente ~20 % | Duolingo | Hoy pedimos cuenta antes de mostrar nada. El momento natural de pedirla ya está escrito en nuestro propio copy: *"Tu Álbum se guarda en tu cuenta"* → pedirla **en la primera chapada**, no en la puerta |
| **Los muros de tutorial (4-5 pantallas deslizables) los saltea la mayoría**; los tooltips contextuales, en cambio, se leen | Best practices móviles | NO construir las "3 pantallas de onboarding" que insinúa el paginador. Enseñar **en el lugar**, la primera vez que se usa cada cosa |
| **Divulgación progresiva / just-in-time**: el Profesor de Pokémon GO explica de a una línea, y las reglas aparecen cuando hacen falta | Pokémon GO | **Calato ya es nuestro Profesor**: tiene 6 estados y una cortina. Él enseña, no un modal de texto |
| **La primera interacción ES el bucle principal**: te hacen atrapar tu primer Pokémon durante el onboarding | Pokémon GO | El equivalente es **chapar la primera Vuelta**, no leerla. Hace falta una "vuelta de práctica" alcanzable desde donde estés |
| Recomiendan un **primer caché concreto** y expanden su detalle para que aprendas | Geocaching | Marcar una de las 3 Vueltas del día como **"tu primera"**, con más explicación que las otras |
| Un permiso pedido **en frío** convierte <30 %; pedido **después de una acción con sentido** y con su porqué, 60-70 % | Best practices iOS | Nuestra pantalla de Permisos explica bien, pero llega **antes** de haber dado valor. Moverla después del primer momento útil |
| Máximo **3-5 pasos obligatorios**; el "momento ajá" dentro de los primeros **60 segundos** | Retención | Hoy son 3 pasos y ninguno es el momento ajá. El ajá de Cuadra es **ver una Vuelta real de tu barrio**, y eso puede pasar en 15 s |

Fuentes: [Chameleon · teardown de Pokémon GO](https://www.chameleon.io/blog/ux-teardown-pokemon-go-takes-over-the-world) · [Krystal Higgins · first-run UX](https://first-run-ux.kryshiggins.com/pokemon-go-ios-first-time-user-experience-the/) · [Geocaching · geocacher en entrenamiento](https://www.geocaching.com/blog/2017/10/caution-geocacher-in-training/) · [Appcues · onboarding de Duolingo](https://goodux.appcues.com/blog/duolingo-user-onboarding) · [Appcues · buenas prácticas móviles](https://www.appcues.com/blog/mobile-onboarding-best-practices) · [UXCam · ejemplos 2026](https://uxcam.com/blog/10-apps-with-great-user-onboarding/)

### Iteración E4 — "Aprender jugando" (~2 sesiones / 8 h)

**Riesgo que ataca:** el #1 del documento maestro, *retención*. Un usuario que no entiende el
juego en la primera sesión no vuelve, por buena que sea la app.

1. **Invertir el orden: valor antes que trámite.** Bienvenida → Permisos (con su porqué) →
   **mapa con 3 Vueltas reales de tu barrio, sin cuenta**. El registro se pide en el momento en
   que de verdad hace falta: al chapar, con el argumento que ya está escrito ("sin cuenta, las
   figuritas se te pierden"). Decisión técnica a resolver: sesión anónima de Supabase que
   después se enlaza al correo, o guardar la primera chapada en el equipo y subirla al
   registrarse.
2. **Calato como Profesor, con divulgación progresiva.** Nada de modales de texto: la primera
   vez que aparece cada concepto, Calato lo dice en UNA línea, en su voz. *"Eso es una Vuelta:
   te llevo, sacás la foto, te llevás la figurita."* Máximo un mensaje por pantalla nueva, y
   nunca dos seguidos.
3. **La Vuelta de práctica.** La primera de las 3 es alcanzable desde donde estés (radio
   generoso, dificultad *Tranqui*) y está marcada como **"tu primera"** con más explicación,
   como el primer caché de Geocaching. El momento ajá completo —caminar, chapar, ver la
   figurita— tiene que caber en la primera sesión.
4. **Enseñar el vocabulario en su sitio.** Vuelta, Chapar, Calle, Racha, Figurita, La Llave: la
   primera vez que cada palabra aparece en pantalla lleva su micro-explicación (un toque sobre
   la palabra, o una línea de Calato). NO un glosario aparte que nadie abre.
5. **Estados vacíos que enseñan.** Ya lo hacemos bien en el Álbum (*"Completá Barranco y
   desbloqueás la figurita de barrio"*): extender ese criterio a Vueltas y Perfil, donde hoy
   hay números en cero sin decir cómo se suben.
6. **Resolver el tercer punto del paginador.** O son 3 pantallas de verdad, o el paginador baja
   a 2. Hoy miente — y eso hay que decidirlo **en el prototipo primero**, no en el código.

**Criterio de aceptación:** alguien que no conoce el proyecto abre la app y, **sin que vos le
expliques nada**, en su primera sesión: entiende qué es una Vuelta, camina hasta una, la chapa,
y sabe decir qué ganó. Se mide con una persona real, grabando la pantalla — no con mi opinión.

**Dónde entra:** después de E2 (chapar de verdad), porque la vuelta de práctica necesita que
chapar funcione. Antes del hito LCA no es obligatorio, pero **sí antes de mostrarle la demo a
alguien que no seas vos**: hoy la demo solo se entiende si la narra su autor.

### Pendiente de investigación, para cuando lo retomemos

Falta mirar de cerca, con la app en la mano y no solo artículos: **Pokémon GO** (el flujo real
de 2026, no el de 2016), **Geocaching**, **Zombies, Run!**, **Strava** (segmentos y su
onboarding social), **Swarm/Foursquare** (check-ins, el pariente más cercano de Chapar) y
**Duolingo** (el estándar de enseñar jugando). De cada una: qué te dicen en los primeros 60
segundos, cuándo te piden la cuenta, cuándo te piden permisos, y cómo te enseñan su vocabulario
propio. Anotar lo aplicable acá antes de diseñar las pantallas.

---

## Estructura RUP

Cuatro fases, cada una cerrada por un **hito verificable**. Las iteraciones se ordenan por **riesgo**, no por comodidad: primero lo que puede matar el proyecto.

| Fase RUP | Hito | Qué prueba | Estado |
|---|---|---|---|
| **Inicio** | LCO — Objetivos del ciclo de vida | Visión, alcance congelado (§4.5), riesgos, identidad | ✅ **COMPLETA** |
| **Elaboración** | LCA — Arquitectura ejecutable | **El loop se puede jugar de punta a punta con datos reales** = LA DEMO | 🔨 4 iteraciones (E0–E3) + **E4 primer uso** |
| **Construcción** | IOC — Capacidad operativa inicial | Producto completo, listo para usuarios reales | 4 iteraciones |
| **Transición** | PR — Release | En tiendas, con usuarios y métricas | 3 iteraciones |
| *(Post-MVP)* | Escala | Fase 2 y 3 del documento maestro | Ver última sección |

**Estimación a 4 h/día:** demo en ~2,5 semanas · producto en ~7 semanas · en tiendas con beta en ~10 semanas.

---

## FASE 2 · ELABORACIÓN — La demo (hito LCA)

Objetivo RUP de esta fase: **arquitectura ejecutable que mata los riesgos altos**. No es "hacer pantallas bonitas": es demostrar que las tres piezas que pueden hundir el proyecto funcionan de verdad.

### Iteración E0 — Paridad con el prototipo (~2 sesiones / 8 h) ⬅️ **VA PRIMERO**

**Riesgo que ataca:** que el producto no se parezca a la marca que construimos. Y uno más peligroso: **que sigamos apilando pantallas sobre una base que no cumple la especificación**, multiplicando la deuda de fidelidad.

**Trabajo — auditoría pantalla por pantalla contra su teléfono del prototipo, y corrección.**

**Delta medido de la pantalla 2 (Entrar), verificado en el iPhone de David:**

| # | Prototipo | Hoy en la app | Estado |
|---|---|---|---|
| 1 | Toldo a rayas arriba (rojo Huariques / papel, bordes tinta) | no existe | ❌ falta |
| 2 | Isotipo "La Vuelta" (manzana de trazo abierto + punto naranja) junto al wordmark | no existe | ❌ falta |
| 3 | Wordmark **"CUADRA"** 38 px, alineado a la izquierda junto al isotipo | "Cuadra" 52 px, centrado | ❌ difiere |
| 4 | Tagline **"Tu ciudad, cuadra por cuadra."** | "Bienvenido a la cuadra." | ❌ copy distinto |
| 5 | Etiquetas **CORREO** / **CONTRASEÑA** sobre cada campo | sin etiquetas | ❌ falta |
| 6 | Botón "Entrar" con **sombra dura 4 px** | plano, sin sombra | ❌ falta |
| 7 | Botón secundario **"Crear cuenta"** (ghost) | "Continuar con Google" | ❌ elemento no previsto |
| 8 | Contenido alineado arriba, después del toldo | centrado vertical | ❌ difiere |
| 9 | Tarjeta de Calato abajo con sombra dura | está, sin sombra dura | ⚠️ parcial |
| 10 | **Pantalla 1 — BIENVENIDA** (Calato a sangre sobre naranja, "Bienvenido a la cuadra", 3 puntos, "Date una vuelta") | **no existe: la app abre en el login** | ❌ falta entera |
| 11 | **Pantalla 3 — PERMISOS** (ubicación + cámara, con su nota de privacidad) | no existe | ❌ falta entera |

**Orden del trabajo:**
1. **Migrar `sign-in.tsx` al kit** — que use `Boton`, `Tarjeta` y `SombraDura`; agregar al kit lo que falte (`Campo` con etiqueta, `Toldo`, `Isotipo`). Corregir los 9 deltas de arriba.
2. **Construir las pantallas 1 y 3** (Bienvenida y Permisos) — mueven de E3 a acá: son parte del flujo de entrada, no un pulido posterior.
3. **Auditar las otras 5 pantallas** igual que ésta y corregir (mapa, vueltas, álbum, perfil, detalle), migrando todo estilo de borde/sombra propio al kit.
4. **Dejar constancia:** una tabla de paridad en `docs/identidad/paridad.md` con el estado de cada una de las 18 pantallas — qué está idéntico, qué difiere y qué no existe todavía. Ese documento es el que dice la verdad, no mi palabra.

**Criterio de aceptación:** poner la captura del iPhone al lado del teléfono del prototipo y que **no haya diferencias visibles** en las pantallas marcadas como listas. Las que faltan, listadas honestamente como "no existe".

---

### Iteración E1 — Barranco con vida (~3 sesiones / 12 h)

**Riesgo que ataca:** #3 *cold start* del documento maestro, y la tesis central del producto — *"la IA genera contenido creíble sobre lugares reales"*. Si esto no funciona, no hay producto.

**Trabajo:**
1. **`worker/pipeline/1-sync-pois.ts` de verdad** — Overpass API por bounding box de Barranco, tags `amenity`/`shop`/`tourism`/`historic`, mapeo a nuestras 4 categorías, `h3-js` para asignar `h3_index` (res. 9), upsert en `pois` por `osm_id` con `service_role`. Meta: **100+ POIs reales**.
2. **`worker/pipeline/2-generate-missions.ts` de verdad** — leer POIs de una celda, armar el payload del prompt que ya existe (`worker/prompts/generacion-vueltas.md`, hoy huérfano), llamar al modelo, validar con `validarLoteVueltas()` (ya testeado), insertar en `missions` como `draft`. Reintento máx. 2, nunca inserción parcial.
   - **Modelo: Claude Sonnet 5** para la generación semanal (calidad de copy en español peruano + JSON estricto). **Opus 5 una sola vez** para producir un "set dorado" de 10 vueltas ejemplares que se inyectan como few-shot en el prompt de Sonnet — sube la calidad sin subir el costo recurrente.
   - **Medir el costo real** en la primera corrida con `--dry-run` (cuenta tokens antes de gastar). El documento maestro estimaba ~$11/mes con Haiku; con Sonnet será ~3× — sigue dentro del presupuesto de §7.8 ($15–40/mes en etapa de validación).
3. **Activación** — script `worker/pipeline/activar.ts`: pasa `draft` → `activa` con revisión mínima (o `--todas` para la demo).
4. **Arreglar el seed** — corregir la categoría del POI 9002 y agregar targets de conflicto para que sea idempotente.
5. ~~**Quick win de 2 h: cablear las fuentes.**~~ **HECHO en el commit `8bad085`** (verificado 2026-07-29).
   `expo-font` carga las 6 familias reales con `useFonts` en `_layout.tsx`, y el splash se sostiene hasta que
   terminan, así que la app nunca pinta un cuadro con la tipografía del sistema. **No hay una sola declaración
   de `fontWeight` en `app/src`** — la línea anterior de este plan afirmaba lo contrario y estaba vencida.

   **Lo que SÍ queda de tipografía** (medido, no supuesto):
   - **12 estilos de texto declaran `fontSize` y se olvidaron `fontFamily`**, así que salen en la fuente del
     sistema: `album.tsx`, `(app)/index.tsx`, `perfil.tsx` ×2, `vueltas.tsx` ×3, `vuelta/[id].tsx` ×3,
     `mapa-cuadra.tsx` ×2. Casi todos en pantallas de `(app)/`.
   - **`fuentes.semibold` tiene 0 usos y no es peso muerto: falta usarlo.** El prototipo pide
     `font-weight:600` en 5 lugares — la instrucción de verificación de la vuelta (línea 499) y los cuatro
     beneficios de La Llave (753-762). Hoy esos salen con el peso equivocado.
   - **Escalas mezcladas:** `crear-cuenta`, `revisa-correo`, `ui.tsx` y `theme.ts` pasan los tamaños por
     `esc()`; `album`, `index`, `perfil`, `vueltas`, `vuelta/[id]`, `bienvenida`, `permisos`, `sign-in` y
     `mapa-cuadra` usan píxeles crudos del prototipo. En un iPhone 15 Pro Max el factor es 1,28 — esas
     pantallas se ven **22 % más chicas de lo que manda el diseño**. Es la misma disparidad que ya se corrigió
     en la barra de pestañas, sin terminar de propagar.
   - El peso `900` que la guía usa 3 veces no está cargado (`paridad-css.mjs` lo mapea a `black`, que `fuentes`
     no expone).

**Criterio de aceptación (verificable):**
- `select count(*) from pois where h3_index in (celdas de Barranco)` ≥ 100
- `select count(*) from missions where estado='activa'` ≥ 30
- Las vueltas nombran lugares que existen de verdad en Barranco (chequeo manual de 10 al azar contra Google Maps)
- La pantalla Vueltas muestra 3 vueltas distintas y creíbles; typecheck + tests verdes
- La app se ve con Alfa Slab One en los títulos

**Archivos:** `worker/pipeline/1-sync-pois.ts`, `2-generate-missions.ts`, `activar.ts` (nuevo), `worker/prompts/generacion-vueltas.md`, `supabase/seed/seed.sql`, `app/src/app/_layout.tsx`, `app/src/components/ui.tsx`, `app/app.json`, `app/package.json`.

---

### Iteración E2 — Chapar de verdad (~4 sesiones / 16 h)

**Riesgo que ataca:** #4 *fraude en check-ins*, que es el que sostiene la promesa B2B (*"te lo demuestro con GPS"*). Es la pieza de mayor riesgo arquitectónico del proyecto: si el check-in no es confiable desde el servidor, el modelo de negocio no existe.

**Trabajo:**
1. **Migración `002_rpc_chapar.sql`** — la RPC `chapar(mission_id, lat, lng, foto_url)` con `security definer`, que en una sola transacción: valida que la vuelta esté `activa` y su celda permita la hora (modo seguro), valida geofence con `ST_DWithin ≤ 75 m` contra el POI real, valida velocidad imposible contra el último check-in del usuario, inserta la completion, otorga la figurita (`missions → pois → cards`), actualiza racha (días consecutivos) y Calle, y devuelve resultado o rechazo **con motivo**. Cumple ADR-0001: el cliente sigue sin poder escribir esas tablas.
2. **Storage de fotos** — bucket en **Supabase Storage** (no R2 todavía): ya está en el stack, funciona con la sesión del usuario y RLS, y evita montar firma de URLs en el VPS para la demo. R2 entra cuando el volumen lo justifique → **ADR-0007** documentando la decisión y su punto de reevaluación.
3. **Cámara in-app** — `expo-camera` **~17.0.10** (verificado: es módulo nativo incluido en SDK 54, funciona en Expo Go sin build nativo), sin acceso a galería (capa 1 del anti-fraude). Pantalla `(app)/vuelta/[id]/camara.tsx` con el visor del prototipo: marco de esquinas, instrucción de verificación arriba, chip verde de rango, obturador naranja.
4. **Pantalla ¡Chapada!** — `(app)/chapada.tsx`: confeti **solo en colores de marca**, figurita troquelada revelada, `+N Calle`, chip de racha, Calato celebrando. Es el momento compartible del producto.
5. **Botón de check-in que nace apagado** — se enciende solo dentro de los 75 m usando `geo.ts` (cliente = informativo; el servidor manda).

**🔴 Trampas verificadas que hay que respetar al escribir la RPC** (de un diseño técnico dedicado; ignorarlas produce bugs silenciosos):
- **`current_date` es UTC en Supabase.** Una chapa a las 20:00 de Lima cae al día siguiente en UTC → **la racha se rompe sola** y el usuario jura que jugó. Usar `(now() at time zone 'America/Lima')::date` en TODO cálculo de días.
- **PostGIS vive en el esquema `extensions`** (así lo instaló la migración inicial). Un `security definer` con `set search_path = public` falla con *"st_distance does not exist"* **en runtime**, aunque funcione en el SQL Editor. Usar `set search_path = public, extensions` y calificar `auth.uid()` y `storage.objects`.
- **Postgres otorga `EXECUTE` a `PUBLIC` por defecto:** revocar solo de `anon` no sirve. Hay que `revoke ... from public, anon` y después `grant ... to authenticated`.
- **`security definer` bypasea RLS** → hay que re-chequear a mano `estado='activa'`, `pois.activo`, temporada y celda dentro de la función.
- **`streaks` no tiene fila** (el trigger solo crea `profiles`) → `insert ... on conflict do update`, no `update` pelado.
- **`st_makepoint` toma (lng, lat), no (lat, lng).** Invertirlos manda al usuario al Atlántico y todo check-in da "lejos".
- **Tabla nueva `checkin_intentos`:** los rechazos NO pueden ir a `mission_completions` (su `unique(user,mission)` bloquearía el reintento legítimo). Sin bitácora, las capas 3 y 4 son invisibles y los umbrales no se pueden calibrar.
- **Storage gana a R2 por una razón que no es el costo:** `chapar()` puede leer `storage.objects` y verificar que la foto existe y es reciente (≤15 min). Con R2, Postgres no la ve y `foto_url` queda como un claim sin verificar → la capa 1 del anti-fraude se vuelve decorativa.

**Criterio de aceptación:**
- Caminando de verdad hasta un POI de Barranco: la foto sube, la RPC acepta, la figurita aparece en el Álbum, la racha pasa a 1.
- Intentar chapar la misma vuelta dos veces → rechazo por `unique(user_id, mission_id)`.
- Intentar chapar desde casa (>75 m) → rechazo con motivo, sin escribir nada.
- Tests de la RPC: caso feliz, fuera de rango, duplicado, velocidad imposible, vuelta fuera de horario.

**Archivos:** `supabase/migrations/002_rpc_chapar.sql`, `app/src/app/(app)/vuelta/[id]/camara.tsx`, `app/src/app/(app)/chapada.tsx`, `app/src/lib/chapar.ts` (nuevo: cliente de la RPC + subida), `app/src/app/(app)/vuelta/[id].tsx`, `docs/decisiones/0007-storage-fotos.md`.

---

### Iteración E3 — El loop cierra = **DEMO** (~3 sesiones / 12 h)

**Riesgo que ataca:** #1 *retención*. El loop tiene que cerrarse y dar ganas de volver mañana.

**Trabajo:**
1. **Radar** — `(app)/vuelta/[id]/radar.tsx`: el diseño del prototipo (anillos punteados, flecha, cifra gigante en cuadras) alimentado por `geo.ts` (por fin usado) + `expo-sensors` **~15.0.8** (verificado disponible en Expo Go) para el magnetómetro. Calato trotando adelante.
2. **Onboarding + permisos** — construidos en E0.2/E0.3 (bienvenida, permisos, registro). Que *enseñen a jugar* es otra cosa y tiene iteración propia: ver **E4 · "Aprender jugando"**, arriba.
3. **Álbum real** — matar los hardcodes: grilla dinámica (no 9 fijas), páginas por barrio desde datos, progreso real, rarezas con su marco, `arte_url` cuando exista. Pantalla de figurita detalle.
4. **Racha y Calle vivos** — el chip del mapa lee `streaks`, el contador "N de 3 chapadas" lee `mission_completions`, el perfil sin números inventados.
5. **Los 3 estados de Calato** — vacío (ya está), racha en riesgo, fuera de horario/modo seguro.

**Criterio de aceptación — la demo se acepta si esto pasa en un teléfono real, caminando:**
> Abrir → onboarding → ver 3 vueltas reales de Barranco → elegir una → el radar te guía → llegar → la cámara se abre → foto → **¡Chapada!** → la figurita está en el Álbum → la racha dice 1 → mañana hay 3 vueltas nuevas.

Cerrar el hito **LCA**: grabar un video de 60 s del recorrido completo. Ese video **es** la demo presentable.

---

## FASE 3 · CONSTRUCCIÓN — El producto (hito IOC)

### C1 — Retención (~1 semana)
Rangos y Calle con sus 6 niveles y sus celebraciones · rarezas y bonus por dificultad/racha · **10 figuritas de temporada hechas a mano** · push notifications (`expo-notifications`) con el copy exacto de la escalada de Calato, respetando el tope de 2/día.

### C2 — Modo seguro y anti-fraude visibles (~1 semana)
Modo seguro visible al usuario (por qué no aparece una vuelta) · toggles de Ajustes que **de verdad** configuran · capas 1–4 del anti-fraude en runtime: mock-location (API nativa Android), velocidad imposible ya en la RPC, EXIF/timestamp · reporte comunitario básico.

### C3 — Panel admin y La Llave (~1 semana)
Panel admin mínimo (`worker/admin/`, la carpeta que el `tsconfig` ya declara y no existe): revisar/activar vueltas `draft`, agregar POIs a mano (mitiga el riesgo #8 de cobertura OSM), curar `nivel_seguridad` de celdas · pantalla La Llave completa (sin pagos aún) · alcaldías v1.

### C4 — Pulido y salud del código (~1 semana)
Modo oscuro (los tokens ya existen en `theme.ts`, nadie los usa) · contraste AA verificado · performance del mapa con 100+ pins (aquí se decide si hace falta MapLibre nativo — punto de reevaluación del ADR-0004) · **tests de pantallas** (hoy: cero) · limpieza de deuda: `dist/` fuera de git, assets del template borrados, hex hardcodeados → `colores`, tokens de sombra en `theme.ts`.

**Criterio IOC:** un usuario que no sos vos completa 3 vueltas en 3 días sin ayuda ni explicaciones.

---

## FASE 4 · TRANSICIÓN — A las tiendas (hito PR)

### T1 — Build nativo y distribución (~1 semana)
**Android primero** (riesgo #9: Perú es ~85% Android, y evita los $99 de Apple hasta validar). `eas build`, `android.package`, Play Console ($25), internal testing. Acá el ícono de Calato asomándose se ve por primera vez en un teléfono de verdad.

### T2 — Instrumentación y beta (~1 semana)
PostHog con el funnel de §9 (registro → 1ª vuelta → 2ª sesión → racha de 3) · Sentry · beta con 20–50 personas reales · loop de feedback semanal.

### T3 — Puerta go/no-go (~1 semana de medición)
Medir contra §9: **D30 > 8%** y **> 2 vueltas/semana**. Ese número decide si se invierte más, se itera 4 semanas, o se pivota barato (los candidatos ya están escritos: B2B turístico, white-label municipal). iOS entra acá si Android valida.

---

## Escala (post-MVP, Fases 2 y 3 del documento maestro)

Solo si la puerta go/no-go da verde:
- **Fase 2 (meses 4–6):** lanzamiento público en Lima · alcaldías + rankings distritales · Recados · calendario de temporadas · **pagos doble riel** (RevenueCat + Culqi/Mercado Pago para Yape/Plin — decisión no negociable de §5.4) · primeros 5 negocios B2B en piloto regalado.
- **Fase 3 (meses 7–12):** dashboard B2B self-service (el motor real de ingresos: break-even con 5–7 negocios a S/150) · vueltas patrocinadas · rutas de creadores con comisión · Lima completa + 1 ciudad de provincia · capa de vocabulario por país.
- **Escalado técnico cuando duela:** R2 en vez de Supabase Storage · Batch API para la generación · OSRM self-hosted para rutas · MapLibre nativo · Rive para animar a Calato.

---

## Reglas de ejecución (cómo trabajamos cada sesión)

0. **Verificar antes de creer.** Nada construido se da por hecho: antes de decir "esto ya está", abrirlo y compararlo contra su especificación (el prototipo, el documento maestro, el ADR). Si encuentro una inconsistencia, la reporto aunque la haya causado yo. **"Funciona" ≠ "está terminado".**
1. **Una sesión = una tajada demostrable.** Nunca dejar el repo en estado intermedio.
2. **Implementamos juntos:** cada tajada arranca con el *por qué* y las decisiones en juego; el código viene después. Donde toque PostGIS, H3 o RN nuevo, explicación breve antes.
3. **Verificación antes de cantar victoria:** typecheck + tests + export web + prueba en tu iPhone. Si no se probó, no está hecho.
4. **Riesgo primero:** ante la duda de qué hacer, gana lo que puede hundir el proyecto.
5. **Cada desvío del documento maestro → ADR.** Ya hay dos pendientes: el modelo (Sonnet en vez de Haiku) y el storage (Supabase en vez de R2).
6. **Checkpoint al cerrar cada iteración:** commit + push + actualizar el índice de checkpoints.

---

## Verificación end-to-end del plan

**Por iteración:**
```bash
cd app && npm run typecheck && npm test          # app: 13 tests
cd app && npm run paridad                        # spec del prototipo vs StyleSheet
cd worker && npm run typecheck && npm test       # worker: 10 tests
node scripts/validar-rls.mjs                     # 6 aserciones RLS contra la DB real
```

### 🔧 `npm run paridad` — el detector de disparidades (2026-07-28)

**Por qué existe:** en una sola tarde aparecieron 8 disparidades con el prototipo, y **7 eran
comparables sin correr la app** — estaban escritas en el CSS del prototipo y en el StyleSheet,
en archivos distintos. Encontrarlas a ojo costó una tarde entera; el script tarda 200 ms.
Cada vez que David tenga que hacer de detector de bugs de fidelidad, es que falta una herramienta.

Qué hace `scripts/paridad-css.mjs`: parsea el `<style>` del prototipo (resolviendo las
`var(--…)`), evalúa los `StyleSheet.create` del código **con los tokens de `theme.ts` ya
resueltos**, traduce el vocabulario CSS→RN (`padding: 9px 6px` → `paddingVertical/Horizontal`,
`border-radius: 50% 50% 0 50%` → las 4 esquinas **en su orden**, `font-weight: 800` → la
familia `Archivo_800ExtraBold`) y **corrige el `content-box`**: en CSS el `height` no incluye
los bordes y en RN sí — de ahí salían los 2 px que le faltaban al `<Toldo>`. Sale con código 1
si hay diferencias, así que sirve de puerta antes de un commit.

Un desvío deliberado no se borra: se documenta en `notas` del par y el script lo muestra en
gris con su razón (p. ej. el margen inferior de la barra sale de `insets`, no del 14 fijo del
prototipo, porque el prototipo dibuja teléfonos sin indicador de home).

**Lo que NO puede** — todo lo que solo se ve corriendo. El segundo bug del día (los rótulos
de la barra dibujándose FUERA del panel) venía del `padding: 5` interno de `BottomTabItem`
de React Navigation: eso no está en ningún archivo nuestro. Para esa clase hace falta el
auditor de runtime, que es el próximo paso de herramientas: **insets simulados en la build
web** (para que `useSafeAreaInsets()` devuelva los del iPhone 15 Pro Max en vez de 0) más un
barrido del DOM que denuncie *hijo cuya caja se sale del padre* y *absoluto sin `top` ni
`bottom`* — las dos formas exactas que tomaron los bugs de hoy.
Más: `npx expo export --platform web` sin errores de consola, y la prueba en dispositivo con `npx expo start --clear`.

**Del hito LCA (la demo):** el video de 60 segundos del loop completo, caminando, en un teléfono real. Si ese video existe, la demo está aprobada.

**Del hito PR:** la app instalada desde Play Store internal testing en un teléfono que no es el tuyo, completando una vuelta.

### Clips de Calato: de dónde salen (decidido 2026-07-28)

Los clips animados del personaje **se generan con video** (Seedance anclado a las imágenes
de identidad) y se recortan con **mateo por doble fondo**. La receta completa, con las
cuatro vías que NO funcionan, está en `scripts/clip-desde-video.md`.

Por qué el cambio: el modelo 3D auto-generado arrastra un estiramiento del flanco de 2,84×
que ninguna corrección post-hoc arregló (cuatro intentos medidos, ver §6.1 del brief). El
video no tiene rig, así que el defecto no existe. Además la imagen de identidad es más
linda que el modelo —que se reconstruyó *a partir* de ella y perdió detalle—, así que
generar desde la imagen se saltea el paso que degrada.

Lo que sigue viniendo del 3D: **`caminar`**, el único ciclo con encuadre exacto y peso
liviano. El render 3D sigue siendo mejor para loops funcionales (cargando, caminata) por
peso y control; el video gana en momentos de personaje.

| Clip | Pantalla | Origen |
|---|---|---|
| `saludo` | Bienvenida, 252 pt | video |
| `atento` | Perfil, 96 pt | video |
| `culpa` | Vueltas vacías, 118 pt | video |
| `chapada` | Celebración (E2) | video |
| `caminar` | — | render 3D |

**Pendiente medido:** los cuatro clips de video pesan 13,7 MB juntos (121 cuadros con alfa
cada uno). Es aceptable para probar en Expo Go y demasiado para producción. Las palancas,
por orden de rendimiento: acortar los clips a 2,5 s, o empaquetarlos como video con canal
alfa (HEVC en iOS / VP9 en Android), que el mismo contenido pesa ~1 MB en vez de 3.
