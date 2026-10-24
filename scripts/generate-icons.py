"""Gera os ícones do PWA (public/icons/*.png) a partir do desenho do logo do Fluxa.

Uso: python3 scripts/generate-icons.py   (requer Pillow)
O desenho é o mesmo de public/icons/icon.svg: gradiente índigo→ciano com duas ondas.
"""
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

C1 = (129, 140, 248)  # #818cf8
C2 = (34, 211, 238)  # #22d3ee
BASE = 512  # sistema de coordenadas do desenho
SS = 2  # supersampling


def bezier(p0, p1, p2, p3, n=400):
    pts = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        x = u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


def wave(dy):
    # M112 210 C160 150 208 150 256 210 S352 270 400 210  (+ dy)
    a = bezier((112, 210 + dy), (160, 150 + dy), (208, 150 + dy), (256, 210 + dy))
    # reflexão do segundo controle para a curva suave "S"
    b = bezier((256, 210 + dy), (304, 270 + dy), (352, 270 + dy), (400, 210 + dy))
    return a + b[1:]


def render(size, rounded):
    s = size * SS
    k = s / BASE
    grad = Image.frombytes(
        "L", (s, s), bytes((x + y) * 255 // (2 * s - 2) for y in range(s) for x in range(s))
    )
    img = Image.composite(Image.new("RGB", (s, s), C2), Image.new("RGB", (s, s), C1), grad).convert("RGBA")

    d = ImageDraw.Draw(img)
    r = 18 * k  # metade da espessura do traço (36)
    for dy in (0, 100):
        # "carimba" círculos ao longo da curva: traço liso e pontas arredondadas
        for x, y in wave(dy):
            d.ellipse((x * k - r, y * k - r, x * k + r, y * k + r), fill="white")

    if rounded:
        mask = Image.new("L", (s, s), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, s - 1, s - 1), radius=112 * k, fill=255)
        img.putalpha(mask)

    return img.resize((size, size), Image.LANCZOS)


render(192, True).save(OUT / "icon-192.png")
render(512, True).save(OUT / "icon-512.png")
render(512, False).save(OUT / "icon-maskable-512.png")  # sem cantos: o sistema recorta
render(180, False).save(OUT / "apple-touch-icon.png")
print("ok:", sorted(p.name for p in OUT.glob("*.png")))
