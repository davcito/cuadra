#!/usr/bin/env python3
"""
Quita el HORMIGUEO de una secuencia promediando en el tiempo, sin borronear el movimiento.

El problema: un modelo de video genera cada cuadro por su cuenta, así que hasta las
zonas donde no pasa nada cambian un poco entre cuadro y cuadro. Medido en el saludo
de Calato: los pies, que están plantados, variaban 11,88 niveles sobre 255 entre
cuadros consecutivos, y los bordes semitransparentes 16,10. Eso es lo que el ojo lee
como hormigas. (Para comparar: el ruido de comprimir el atlas era 3,4.)

La idea: para cada píxel, mirar la misma posición en los cuadros vecinos. Si ahí
apenas cambió, es ruido y se promedia. Si cambió mucho, es movimiento real y se deja
intacto. Así se calma el fondo del personaje sin arrastrar la mano que saluda.

Es un filtro bilateral en el eje del tiempo: el peso de cada vecino cae con lo
distinto que es, no con lo lejos que está.

  python calmar-cuadros.py entrada.webp salida.webp [--umbral 16] [--ventana 2]

--umbral  : diferencia (0-255) a partir de la cual se considera MOVIMIENTO y no se toca.
            Bajarlo conserva más movimiento y calma menos.
--ventana : cuántos cuadros a cada lado se miran (2 = cinco cuadros en total).
"""
import sys

import numpy as np
from PIL import Image, ImageSequence


def calmar(cuadros, umbral=16.0, ventana=2):
    """Promedio temporal con peso bilateral. `cuadros`: lista de arrays RGBA float32."""
    n = len(cuadros)
    pila = np.stack(cuadros)  # (n, H, W, 4)
    salida = np.empty_like(pila)

    for i in range(n):
        # La secuencia es un BUCLE: los vecinos del último son los del principio.
        # Sin el módulo, el primero y el último se quedarían sin calmar y el
        # hormigueo reaparecería justo en la costura del loop.
        idx = [(i + d) % n for d in range(-ventana, ventana + 1)]
        vecinos = pila[idx]                      # (2v+1, H, W, 4)
        centro = pila[i]

        # Distancia de cada vecino al centro, por píxel (sobre el color visible).
        dist = np.abs(vecinos[..., :3] - centro[None, ..., :3]).mean(axis=-1)  # (2v+1, H, W)
        peso = np.clip(1.0 - dist / umbral, 0.0, 1.0)[..., None]               # 1 igual, 0 distinto
        peso[ventana] = 1.0                      # el propio cuadro siempre pesa entero

        salida[i] = (vecinos * peso).sum(axis=0) / np.maximum(peso.sum(axis=0), 1e-6)

    return [salida[i] for i in range(n)]


def medir(cuadros, nombre):
    """Variación media entre cuadros consecutivos: el número que hay que bajar."""
    d = [np.abs(cuadros[i + 1][..., :3] - cuadros[i][..., :3]).mean() for i in range(len(cuadros) - 1)]
    print(f"  {nombre:<10} variación entre cuadros: {np.mean(d):.2f}")
    return float(np.mean(d))


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    ent, sal = sys.argv[1], sys.argv[2]
    arg = lambda n, d: float(sys.argv[sys.argv.index(n) + 1]) if n in sys.argv else d
    umbral, ventana = arg("--umbral", 16.0), int(arg("--ventana", 2))

    src = Image.open(ent)
    dur = src.info.get("duration", 42)
    fr = [np.asarray(f.convert("RGBA")).astype(np.float32) for f in ImageSequence.Iterator(src)]
    print(f"{ent}: {len(fr)} cuadros de {fr[0].shape[1]}×{fr[0].shape[0]}")

    antes = medir(fr, "antes")
    fr2 = calmar(fr, umbral=umbral, ventana=ventana)
    despues = medir(fr2, "después")
    print(f"  reducción: {100 * (1 - despues / antes):.0f} %")

    ims = [Image.fromarray(np.clip(f, 0, 255).astype(np.uint8), "RGBA") for f in fr2]
    ims[0].save(sal, save_all=True, append_images=ims[1:], duration=dur, loop=0,
                format="WEBP", quality=80, method=4)
    print(f"  guardado {sal}")


if __name__ == "__main__":
    main()
