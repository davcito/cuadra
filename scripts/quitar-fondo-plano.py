#!/usr/bin/env python3
"""
Recorta un personaje sobre fondo PLANO calculando el alfa por distancia de color.

Por qué no un quitador de fondo neuronal: esos deciden "sujeto sí / fondo no" y
en los bordes finos —el mechón de llama de Calato, la cola, el pelo del hocico—
o se comen el detalle o dejan un halo. Con fondo plano el problema es más fácil
y tiene solución exacta: el alfa es la distancia del píxel al color de fondo,
normalizada. Eso conserva los bordes suaves POR CONSTRUCCIÓN, que es lo que un
recorte duro pierde.

Además des-premultiplica: sin ese paso, un píxel de borde al 40 % de opacidad
arrastra 60 % de crema y el personaje queda con un aura clara al ponerlo sobre
naranja. Es el defecto típico del recorte casero y se ve enseguida.

  python quitar-fondo-plano.py entrada.png salida.png [--tol 42] [--suelo 12]
  python quitar-fondo-plano.py cuadros/ salida/            # carpeta entera

--tol   : distancia (0-255) a partir de la cual el píxel es 100 % opaco.
--suelo : distancia por debajo de la cual es 100 % fondo. Sube si queda ruido.
--duro  : distancia que define el NÚCLEO del personaje (default 48). Bajalo si se
          come partes claras del sujeto; subilo si sobrevive la sombra de piso.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def color_fondo(a):
    """El color del fondo = la mediana del marco de 6 px del borde."""
    borde = np.concatenate([
        a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3),
        a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3),
    ])
    return np.median(borde, axis=0)


def calcular_alfa(a, bg, tol, suelo, duro, dilatar):
    """
    Alfa en dos capas, porque un solo umbral no puede resolver dos problemas opuestos.

    La capa SUAVE (distancia normalizada) conserva los bordes finos —el mechón de
    llama, la cola— que un recorte duro se come. Pero también se queda con la sombra
    de piso, que es un degradé flojo lejos del cuerpo.

    La capa NÚCLEO marca lo que sin duda es personaje (distancia > `duro`), le rellena
    los agujeros —el brillo de la panza puede coincidir con el fondo y abriría un hueco
    transparente en la barriga— y se dilata unos píxeles. Multiplicar una por otra deja
    el borde suave del personaje y descarta la sombra por lejanía.
    """
    d = np.sqrt(((a - bg) ** 2).sum(axis=2))
    suave = np.clip((d - suelo) / max(1.0, tol - suelo), 0.0, 1.0)

    nucleo = Image.fromarray(((d > duro) * 255).astype(np.uint8))
    inundado = nucleo.copy()
    ImageDraw.floodfill(inundado, (0, 0), 128)  # marca el exterior conectado al borde
    lleno = (np.array(inundado) != 128) | (np.array(nucleo) > 0)
    mascara = Image.fromarray((lleno * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(dilatar))

    return suave * (np.array(mascara).astype(np.float32) / 255.0)


def recortar(ruta_in, ruta_out, tol, suelo, fondo=None, duro=48.0, dilatar=9):
    a = np.asarray(Image.open(ruta_in).convert("RGB")).astype(np.float32)
    bg = color_fondo(a) if fondo is None else fondo
    alfa = calcular_alfa(a, bg, tol, suelo, duro, dilatar)

    # Des-premultiplicar: recuperar el color REAL del sujeto en los bordes.
    #   observado = alfa*sujeto + (1-alfa)*fondo   →   sujeto = (obs - (1-alfa)*fondo) / alfa
    a3 = alfa[..., None]
    with np.errstate(divide="ignore", invalid="ignore"):
        limpio = np.where(a3 > 0.02, (a - (1 - a3) * bg) / np.maximum(a3, 1e-6), a)
    limpio = np.clip(limpio, 0, 255)

    rgba = np.dstack([limpio, alfa * 255]).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(ruta_out)
    return bg, float(alfa.mean())


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    ent, sal = Path(sys.argv[1]), Path(sys.argv[2])
    arg = lambda n, d: float(sys.argv[sys.argv.index(n) + 1]) if n in sys.argv else d
    tol, suelo, duro = arg("--tol", 42.0), arg("--suelo", 12.0), arg("--duro", 48.0)

    if ent.is_dir():
        sal.mkdir(parents=True, exist_ok=True)
        archivos = sorted(p for p in ent.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"})
        # El fondo se mide UNA vez, en el primer cuadro, y se reusa: si cada
        # cuadro midiera el suyo, el recorte parpadearía al variar la mediana.
        bg = color_fondo(np.asarray(Image.open(archivos[0]).convert("RGB")).astype(np.float32))
        for p in archivos:
            recortar(p, sal / f"{p.stem}.png", tol, suelo, fondo=bg, duro=duro)
        print(f"{len(archivos)} cuadros recortados · fondo {bg.round().astype(int).tolist()} → {sal}")
    else:
        bg, cob = recortar(ent, sal, tol, suelo, duro=duro)
        print(f"{sal} · fondo {bg.round().astype(int).tolist()} · {cob * 100:.1f} % de píxeles con tinta")


if __name__ == "__main__":
    main()
