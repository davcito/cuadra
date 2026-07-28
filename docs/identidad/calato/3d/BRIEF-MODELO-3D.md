# Calato · Brief para el modelo 3D de producción

> Documento para contratar o dirigir a un modelador 3D de personajes.
> Última revisión: 2026-07-28.

## 1. Qué es esto y para qué sirve

**Calato** es la mascota de **Cuadra**, una app móvil de exploración urbana en Lima. No es un
personaje decorativo: es quien le enseña a jugar al usuario, lo celebra cuando completa una
Vuelta y lo extraña cuando pierde la racha.

**El modelo NO se renderiza en el teléfono.** Se usa como **fuente** para producir clips
pre-renderizados que la app reproduce (patrón Supercell: modelar en 3D, empaquetar secuencias).
El mismo modelo alimenta además el contenido de TikTok/Instagram y la papelería de marca.

Consecuencia directa para quien modele: **no optimizar para tiempo real**. No importa el conteo
de polígonos ni el peso. Importa que **deforme bien**, que **se pueda animar cualquier gesto** y
que **el equipo pueda modificarlo** sin rehacerlo.

## 2. El canon — lo que NO se puede cambiar

Tres rasgos son innegociables. Si alguno se pierde, el personaje deja de ser Calato:

1. **Orejas de murciélago asimétricas** — una parada, la otra doblada hacia adelante. La
   asimetría es intencional: **no espejar**.
2. **Mechón de UNA sola llama naranja** en la coronilla. Una llama, no una cresta de púas. Es
   además el glifo de la racha dentro de la app.
3. **Lengua de costado**, saliendo por un lado del hocico.

Además, sin ser innegociables, definen al personaje: viringo peruano (piel marrón cálida sin
pelaje), panza redonda, patas cortas, mochila beige de explorador con hebillas, y pañuelo con
patrón andino de llamitas. Expresión **tonta y amistosa** — mirada al frente, no de reojo.

Paleta oficial: piel marrón cálido · llama `#E8622C` (Naranja Chicha) · trazo `#1F1B16` · fondo
`#FBF7F0`. Guía completa en `docs/identidad/CUADRA-Identidad-v1.3.dc.html`.

## 3. Material de referencia que entregamos

| Archivo | Qué es |
|---|---|
| `turnaround-calato.png` | **Turnaround de 4 vistas** (frente, perfil, espalda, tres cuartos), cámara ortográfica, misma escala, con líneas de piso y cabeza |
| `calato-tpose-fuente.png` | Calato en **pose T**, vista frontal — la mejor referencia de proporciones con los brazos separados |
| `calato-rig-v1.glb` | **Modelo 3D generado automáticamente.** Sirve como boceto de volúmenes y proporciones, para no partir de cero. **NO es el punto de partida de la malla** — su topología y UV no sirven (ver §6) |
| `docs/identidad/calato/*.jpg` | 7 renders oficiales del personaje en distintas poses y emociones — la referencia de estilo y acabado |
| Guía de identidad V1.3 | Paleta, tipografía, tono, uso de la mascota |

## 4. Entregables exigidos

### 4.1 Malla
- **Retopología manual en cuadriláteros**, con anillos de aristas alrededor de **ojos, boca,
  hombros, codos, caderas y rodillas**.
- Malla base limpia + **subdivisión** disponible. Rango orientativo: 15–40 k triángulos en el
  nivel base (no es un límite duro: no corre en el teléfono).
- Geometría separada y nombrada para **mochila** y **pañuelo**, de modo que se puedan ocultar.

### 4.2 UV y texturas
- **Despliegue UV hecho por artista.** Requisito explícito: **la cara completa en UNA sola isla
  contigua**, con margen alrededor. *(El modelo automático reparte un solo ojo en 15 islas
  desperdigadas — eso hace imposible cualquier variación de expresión por textura.)*
- Texturas PBR: color base, normal, rugosidad. **2048 px o más.**
- **La cara en su propio set de UV / textura aparte**, para poder intercambiar expresiones sin
  tocar el resto del cuerpo.

### 4.3 Rig
- Esqueleto de cuerpo **compatible con el estándar humanoide de Mixamo** (nombres de huesos
  incluidos), para poder retargetear bibliotecas de animación existentes.
- **Rig facial**: mandíbula, párpados superiores e inferiores, ojos con rotación independiente,
  cejas.
- **2–3 huesos por oreja** y **2–3 en la cola**. Las orejas son el rasgo más expresivo del
  personaje: tienen que poder caerse de tristeza y pararse de alerta.
- **Pesos pintados a mano.** Criterio de aceptación explícito abajo.
- Controladores usables por un animador (no huesos pelados).

### 4.4 Expresiones
- **Blendshapes / morph targets** mínimos: parpadeo, sonrisa, sorpresa, tristeza, enojo suave,
  guiño, boca abierta, ojos entrecerrados.
- Deben poder combinarse entre sí.

### 4.5 Archivos a entregar
- **Fuente editable** (`.blend` preferido, o `.ma`/`.max`) con todo dentro y organizado.
- **FBX** con rig y blendshapes, listo para Mixamo.
- **GLB** con rig y texturas embebidas.
- Texturas sueltas en PNG.
- Un render de prueba de cada expresión y una vuelta de cámara de 360°.

## 5. Criterios de aceptación (medibles, no de opinión)

1. **Los tres innegociables** presentes y correctos desde las cuatro vistas.
2. **Sin estiramientos**: con el brazo levantado a 90°, ninguna arista del flanco puede crecer
   más de **1,3×** respecto de la pose de reposo. *(El modelo automático llega a 2,84× — se ve
   como una deformación rara debajo del brazo.)*
3. **Rig funcional**: al aplicar un clip humanoide de Mixamo, todos los huesos responden y
   ninguna parte queda soldada al torso.
4. **La cara en una isla de UV**, verificable abriendo el despliegue.
5. **Blendshapes**: las ocho expresiones se activan de 0 a 100 % sin romper la malla.
6. La expresión general sigue siendo **tonta y amistosa**, con la mirada al frente.

## 6. Advertencias aprendidas (leer antes de empezar)

- **No partir de la topología del GLB adjunto.** Es generación automática: triangulación
  desordenada y atlas por parches. Sirve como boceto de volúmenes, nada más.
- **La simetría automática destruye al personaje**: las orejas son distintas a propósito y la
  lengua sale por un lado.
- **Ojo con las proporciones al aplicar mocap humano**: Calato tiene patas cortas y cabeza
  grande. Un clip humano de captura le hace inclinar el tronco 40°. El rig tiene que aguantar
  eso, y conviene entregar los controles para amortiguar cadera y columna.

## 7. Licencia

El trabajo se entrega como **obra por encargo**: la propiedad intelectual del modelo, el rig,
las texturas y los archivos fuente queda del cliente, sin restricciones de uso comercial,
modificación ni redistribución. **No se aceptan entregas bajo licencias abiertas** tipo CC BY:
Calato es una marca en trámite de registro y su modelo no puede quedar reutilizable por terceros.
