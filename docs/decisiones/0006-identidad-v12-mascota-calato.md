# ADR-0006 — Identidad V1.2 en Claude Design + mascota Calato en render 3D (no flat)

**Fecha:** 2026-07-27 · **Estado:** aceptada · **Sesión:** identidad de marca

## Contexto

El brief de §3.4 (gráfica urbana latinoamericana, chicha moderada) se ejecutó con Claude Design: guía viva `CUADRA Identidad.dc.html` con logo (3 direcciones, A "La Vuelta" recomendada), paleta (Papel/Tinta/Naranja Chicha + 4 categorías + modo oscuro), tipografía (Alfa Slab One + Archivo) y componentes. David pidió además una **mascota con identidad tipo Duolingo** (insistente con cariño, potencial de meme). El primer intento de mascota en flat (SVG por código, y luego hoja 2D ilustrada) quedó por debajo de la vara: la referencia mental era Dante de Coco — es decir, **Pixar, es decir 3D**. Un personaje plano nunca iba a enamorar.

## Decisión

1. **La guía de identidad vive en Claude Design** (proyecto "Identidad Visual CUADRA"); cada versión se archiva en `docs/identidad/` (esta: `CUADRA-Identidad-v1.2.dc.html`). Los tokens se espejan en `app/src/lib/theme.ts` — el código no inventa colores fuera de la paleta.
2. **La mascota es Calato**: perro sin pelo del Perú (viringo — primo del xolo de Coco, guardián real de huacas, "tiene calle"), semi-antropomórfico, con **render 3D estilo película sobre la UI flat** (el patrón Duolingo: la mascota tiene volumen, la interfaz no; nunca mezclar los mundos). Rasgos innegociables: orejas de murciélago (una parada, una doblada) + mechón de UNA llama chica en el naranja de marca + lengua rosada SIEMPRE asomada de costado. Kit canon: mochila de explorador con brújula + pañuelo andino con llamitas. Personalidad: tonto-amistoso, insistente con cariño.
3. **Reglas de uso** (detalladas en la guía, sección 07): bípedo para posar y gesticular; al correr/trotar/esperar el paseo "se le escapa el perro" y baja a cuatro (ambas canon) · dos caras: en la app amable con culpa liviana (máx. 2 pushes/día), el Calato desquiciado SOLO en @appcuadra · escenarios y confeti siempre en paleta de marca (puerta verde Caletas, confeti de categorías).
4. **Assets oficiales:** 7 PNG 2816×1536 en `docs/identidad/calato/` (base, retrato, juzgando, chapada, culpa, trote, puerta), generados con Nano Banana Pro (Gemini) usando la técnica de **doble referencia con roles** (base = identidad, segunda imagen = pose/emoción). La inspiración (la energía de Dante) se describió por rasgos y nunca se nombró en los prompts → diseño propio, registrable en Indecopi.

## Addendum 2026-07-28 — el ícono del app (identidad V1.3)

Tras cinco rondas de exploración (archivadas en `docs/identidad/CUADRA-Iconos-v1.dc.html`), el **ícono del app es "Calato asomándose"**: la coronilla del perro emergiendo del borde inferior — orejas de murciélago (una parada, una doblada), mechón amarillo-fuego y ojos tranqui mirando al usuario — sobre Naranja Chicha `#E8622C`.

**Por qué se descartaron las marcas abstractas:** Design propuso 7 candidatos geométricos y recomendó "El Mechón" (la llamita sola). Se descartó por dos hallazgos del dueño, ambos correctos: (1) *"si no conozco el app, no sé qué es"* — una marca abstracta no comunica nada a un extraño; (2) la llama sola **se lee como Tinder** con otro color. Las variantes de curva (V1 anguloso / V2 flancos curvos / V3 fiel) se renderizaron y compararon: V1 y V2 leían como "M" de corona. Todo queda documentado, nada se tiró.

**Sistema de tres piezas:** ícono del app = cara de Calato · **la llamita del mechón = glifo de la racha DENTRO del app** (donde el contexto ya existe) · **las 3 direcciones gráficas de Design (A "La Vuelta", B, C) = pin del mapa, sellos y papelería**.

**Producción:** `docs/identidad/calato/icono-asomo.png` es el master de Nano Banana Pro; el fondo venía `#DF521C` y traía la marca de agua de Gemini — ambos corregidos en post con script determinista (`iconos-final/`). Cableado en `app.json`: `icon.png` 1024 (iOS/web), `android-icon-foreground.png` + `backgroundColor: "#E8622C"` (el hex exacto lo pone el código, no la imagen), `favicon.png`. Se eliminaron los assets del template de Expo (`assets/expo.icon`, background/monochrome de Android).

**Lección de herramientas:** el concepto se validó en vector (barato, iterable) y recién con el concepto validado se llamó a la IA de imagen para ejecutarlo en 3D. Generar antes de conceptualizar habría dado brújulas y llamas genéricas.

## Consecuencias

- (+) Identidad completa y versionada: sistema flat + mascota 3D + copy de la escalada, todo en un artefacto.
- (+) Los assets en alta resolución quedan listos para los dos pipelines futuros: **Rive** (estados animados en la app) e **imagen→3D** (Meshy/Tripo/Higgsfield) para la fábrica de contenido de redes.
- (+) La técnica y las reglas quedaron documentadas en la guía → cualquier generación futura mantiene el canon sin re-aprender.
- (−) ~41 MB de PNG entran a git; aceptable hoy, evaluar Git LFS si la carpeta crece.
- (−) La verdad viva de la guía está en Claude Design: editar allá y re-archivar acá (la copia del repo es la foto de la versión, no el editor).
- (·) El pulido final de marca (vector/limpieza pro) puede encargarse a un ilustrador humano usando el kit como brief.
