#!/usr/bin/env python3
"""
Cierra los ojos de Calato EN 2D, sobre el cuadro ya renderizado.

Por qué en 2D y no en 3D: los tres intentos 3D fallaron porque un plano recibe
su propia luz y se lee como sticker. En el PNG final la luz YA está resuelta, así
que si tapamos el ojo con piel MUESTREADA DEL PROPIO CUADRO, el color y la luz
calzan por construcción. Un párpado real es la piel de arriba bajando: eso es
justo lo que hacemos.

Uso: python cerrar-ojos-2d.py <frame.png> <salida.png> [--fraccion 1.0]
     --fraccion 0.0 = ojo abierto · 1.0 = cerrado · valores intermedios = a medio parpadeo
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# Cajas de esclera medidas en el cuadro frontal de 560x560 (x0,y0,x1,y1).
OJOS = [(200, 424, 284, 479), (456, 424, 545, 479)]


def cerrar_ojo(img, caja, fraccion):
    """Baja el 'párpado' (una banda de piel de arriba del ojo) sobre el ojo."""
    x0, y0, x1, y1 = caja
    w, h = x1 - x0, y1 - y0
    m = int(w * 0.22)  # margen lateral: el párpado es más ancho que la esclera
    x0 -= m
    x1 += m
    w = x1 - x0

    # Banda de piel INMEDIATAMENTE ARRIBA del ojo — la fuente del párpado.
    banda_alto = max(6, int(h * 0.9))
    piel = img.crop((x0, y0 - banda_alto, x1, y0)).resize((w, int(h * fraccion) + banda_alto))

    # Máscara con borde inferior curvo (un párpado cerrado es una curva, no una recta).
    baja = int(h * fraccion)
    mask = Image.new("L", (w, piel.height), 0)
    d = ImageDraw.Draw(mask)
    d.rectangle((0, 0, w, baja), fill=255)
    # panza de la curva del borde del párpado
    d.chord((0, baja - h // 2, w, baja + h // 3), 0, 180, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(2.5))

    img.paste(piel, (x0, y0 - banda_alto), mask)

    # La línea del párpado, solo cuando está bastante cerrado.
    if fraccion > 0.55:
        d2 = ImageDraw.Draw(img)
        yb = y0 - banda_alto + baja
        pts = [(x0 + int(w * t), yb + int((1 - (2 * t - 1) ** 2) * h * 0.16)) for t in np.linspace(0.12, 0.88, 16)]
        d2.line(pts, fill=(58, 34, 30), width=max(2, int(h * 0.09)), joint="curve")


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    entrada, salida = sys.argv[1], sys.argv[2]
    fraccion = 1.0
    if "--fraccion" in sys.argv:
        fraccion = float(sys.argv[sys.argv.index("--fraccion") + 1])

    img = Image.open(entrada).convert("RGBA")
    if fraccion > 0.01:
        for caja in OJOS:
            cerrar_ojo(img, caja, min(1.0, fraccion))
    img.save(salida)
    print(f"guardado {salida} (fraccion={fraccion})")


if __name__ == "__main__":
    main()
