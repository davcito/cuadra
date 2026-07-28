#!/usr/bin/env python3
"""
parpadeo.py — cierra los ojos de Calato en un cuadro YA renderizado.

Por qué en 2D y no en 3D: se intentó tres veces en el modelo (textura, atlas,
planos pegados al hueso) y las tres fallaron por la misma raíz — el modelo
generado no tiene huesos faciales y su UV es inutilizable. El cuarto intento
cambia de dominio: en el PNG final la iluminación YA está resuelta, así que
el párpado se construye estirando hacia abajo la piel del párpado superior
DEL PROPIO CUADRO. El color y la luz calzan por construcción.

Cómo funciona, por cuadro:
  1. Detecta la esclera (píxeles claros poco saturados) y agrupa en 2 ojos.
  2. Envolvente convexa de cada grupo → incluye el iris interior.