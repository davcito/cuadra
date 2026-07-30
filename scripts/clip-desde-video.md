# Cómo se hace un clip de Calato con transparencia

Receta cerrada el 2026-07-28, después de cinco intentos fallidos. Se documenta el
**porqué** de cada paso porque cuatro de los cinco fracasos fueron por saltarse uno.

## La receta

```
1. generate_video (seedance_2_0)     → Calato animado sobre fondo crema
2. remove_background (media_type=video) → el MISMO clip sobre negro
3. mateo por doble fondo             → alfa exacto + color sin halo
4. recorte + WebP animado            → el asset que va a la app
```

### 1. Generar

`seedance_2_0`, 5 s, 720p, `mode: fast`, `generate_audio: false`, `aspect_ratio: 1:1`.

**El truco del loop:** pasar la MISMA imagen como `start_image` y `end_image`. El clip
cierra sobre sí mismo — medido, la diferencia entre el primer y el último cuadro fue de
1,73 sobre 255. Sin eso el bucle da un salto visible cada 5 segundos.

**Anclar la identidad:** la imagen de referencia va también en `image_references`. Con eso
los tres innegociables (orejas distintas, UNA llama, lengua de costado) aguantaron los 121
cuadros. Sin anclaje, un modelo de video los deriva.

**No pedir "sin sombra".** Se probó con instrucción reforzada —"NO floor, NO surface
beneath, no contact shadow, no ground ellipse"— y el modelo la puso igual, en los cuatro
clips. La sombra se resuelve en el paso 2, no en el prompt.

### 2. Quitar el fondo

`remove_background` con `media_type: "video"`. Devuelve H.264 `yuv420p`: **sin canal alfa**,
el sujeto compuesto sobre negro.

Parece una limitación y es justo lo que hace falta, porque habilita el paso 3.

### 3. Matear por doble fondo

Con el mismo sujeto sobre dos fondos conocidos, el alfa es exactamente despejable:

```
sobre crema:   C = a·S + (1-a)·bg
sobre negro:   N = a·S
restando:      C - N = (1-a)·bg     →     a = 1 - (C-N)/bg
color:         S = (C - (1-a)·bg) / a
```

Dos detalles que cuestan una ronda cada uno si se ignoran:

- **Promediar los tres canales del alfa.** El H.264 mete ruido distinto en cada canal.
- **El color se saca de CREMA, no de negro.** Se probaron los dos: con `S = N/a` queda un
  fleco claro visible alrededor de las orejas y el mechón; con `S = (C-(1-a)·bg)/a` el borde
  sale limpio. La diferencia es que la segunda fórmula RESTA la tinta de crema del borde.

### 4. Recortar y empaquetar

Caja de recorte = unión sobre TODOS los cuadros (si se calcula por cuadro, la imagen
tiembla). WebP animado, `quality≈65`, `method=4`, duración 42 ms (24 fps, que es lo que
entrega el modelo).

**Piso de ruido en el alfa, obligatorio.** El H.264 deja alfa mínimo por todo el fondo. Sin
`alfa = 0 donde alfa < 0,06`, la caja de recorte abarca el cuadro entero y el archivo pesa
**25 veces más** (11,8 MB contra 2,8 MB, medido).

**Cada clip al tamaño en que se muestra, no a resolución nativa.** `atento` se dibuja a
96 pt: con `esc()` = 1,28 en un iPhone 15 Pro Max son 123 pt, o sea 369 px reales. Empacarlo
a 900 px son tres veces los píxeles que se ven. Regla: `alto = pt_de_la_pantalla × 1,28 × 3`,
y **nunca ampliar** — si el nativo es menor, se deja como está.

**Pedir encuadre cerrado en el prompt.** Con `TIGHT CLOSE FRAMING: ... fills the entire
frame from top to bottom` Calato pasó a ocupar 713 de 720 px; sin eso ocupaba un tercio del
cuadro y el hero salía blando. Es gratis y vale más que subir la resolución.

### 5. Cadencia: 24 fps no alcanza, y el motivo no es el número

Seedance entrega **24 fps**, el estándar del cine. Igual se lee entrecortado, y la causa es
que **una película trae desenfoque de movimiento** y estos cuadros son nítidos: con
movimiento lento el ojo sigue al personaje y ve los escalones entre cuadro y cuadro.

Se arregla interpolando cuadros intermedios reales con ffmpeg, sobre los DOS videos por
igual para que sigan alineados:

```bash
ffmpeg -i in.mp4 -vf "scale=520:520,minterpolate=fps=48:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1" -c:v png out.mkv
```

Escalar ANTES de interpolar corta el tiempo a la mitad y no se nota, porque igual se empaca
más chico. Los cuadros inventados salen sin artefactos: el movimiento es lento y suave, que
es el caso ideal para compensación de movimiento. (Verificado mirando cuadros consecutivos
pares e impares.)

**El canje real no es peso contra fluidez, es píxeles contra cuadros.** A peso casi igual:
668×660 a 24 fps son 3931 KB; 424×496 a 48 fps son 4574 KB. Cuál conviene se decide MIRANDO
en el teléfono, no razonando — para eso está la pantalla `calato-fps`.

### 6. El WebP animado no llega: hace falta un ATLAS DE SPRITES

Medido en el equipo: el mismo saludo a 668×660, a 344×340 y a 223×220 **se traba igual en
los tres**. A 223×220 decodificar un cuadro es trivial, así que el cuello no son los píxeles:
el reproductor descomprime los 121 cuadros uno por uno y, como en WebP animado cada cuadro
depende del anterior, no puede saltarse ninguno. **Ningún tamaño lo arregla.**

Subir a 48 fps lo empeoró: iba *lento*, no solo entrecortado. Esa es la firma de un
decodificador que no llega — si solo perdiera cuadros, el clip duraría lo mismo.

La solución es el atlas: todos los cuadros en UNA imagen estática (se descomprime una vez) y
la animación es correrla dentro de una ventana recortada, o sea un `transform` de Reanimated,
que corre en el hilo de UI. De yapa pesa menos: 1719 KB de atlas contra 3931 KB del WebP
animado del mismo clip.

```python
cols = ceil(sqrt(n)); rows = ceil(n / cols)          # 121 cuadros -> 11x11
atlas = Image.new('RGBA', (cols*w, rows*h), (0,0,0,0))
for k, f in enumerate(cuadros):
    atlas.paste(f, ((k % cols) * w, (k // cols) * h))
```

**Dos trampas que cuestan una ronda cada una:**

- **El desplazamiento de celda va en píxeles ENTEROS del atlas, sin escalar.** Escalarlo
  produce *hormigueo*: con un factor no entero cada cuadro cae en una posición subpíxel
  distinta, el filtro de textura muestrea distinto y la imagen camina. El tamaño de pantalla
  lo pone UN solo `scale` sobre el conjunto.
- **El límite de textura son 4096 px** en los iPhone viejos. 121 celdas de 344×340 dan
  3784×3740: entra justo. Y cuesta ~57 MB de memoria de textura mientras está en pantalla,
  así que **un atlas por vez** — los gestos chicos siguen en WebP animado, donde el tirón no
  se nota.

## Lo que NO funciona (probado y medido, no reintentar)

| Intento | Por qué falla |
|---|---|
| Prohibir la sombra en el prompt | El modelo la pone igual. 4 de 4. |
| Máscara de núcleo + dilatación | La dilatación no llega: la sombra está AL COSTADO de las patas, no debajo. |
| Subir el piso del alfa | A umbral 50 la sombra sigue y ya se agujerean el hocico y la panza. Se come al personaje antes de matarla. |
| Separación temporal claro/oscuro | La panza de Calato tampoco es nunca oscura: quedan agujeros en la barriga. |

**La raíz:** la sombra y las partes claras de Calato tienen el mismo brillo y la misma
distancia al fondo. Ninguna regla que mire un píxel aislado puede separarlas — hace falta
entender *qué es perro*, y eso lo sabe el recortador semántico, no un umbral.

## Costos

| Paso | Créditos |
|---|---|
| `generate_video` 5 s 720p fast | 17,5 |
| `remove_background` video | incluido |
| **Por clip** | **17,5** |
