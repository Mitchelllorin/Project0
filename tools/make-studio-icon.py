#!/usr/bin/env python3
"""Build studio.ico from the studio's own icon.

The desktop shortcut needs a .ico: Windows will not take the SVG the browser and the
tab use (frontend/public/studio-icon.svg), and a shortcut pointing at a console
executable shows a black terminal box. This draws the same mark — a dark rounded
square with the brass isometric box on it — at every size Windows asks for.

Pillow only, no network, no SVG renderer. The geometry below is the SVG's own path
data in its 40x40 viewBox, so the two icons stay in step by eye:

    rect  0 0 40 40, radius 8, #1c211d
    M20 6 33 13.5v13L20 34 7 26.5v-13Z          the box
    m7 13.5 13 7.5 13-7.5                        the top edges
    M20 21v13                                     the vertical front edge
    M13.5 10 27 17.5v8                            the inner corner

Run it from anywhere:  python3 tools/make-studio-icon.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

VIEWBOX = 40
SUPERSAMPLE = 8  # drawn oversized and reduced, which is what gives the edges their slope
SIZES = (16, 24, 32, 48, 64, 128, 256)

BACKGROUND = "#1c211d"
BRASS = "#dca55e"
STROKE = 1.6
RADIUS = 8

BOX = [(20, 6), (33, 13.5), (33, 26.5), (20, 34), (7, 26.5), (7, 13.5)]
TOP = [(7, 13.5), (20, 21), (33, 13.5)]
FRONT = [(20, 21), (20, 34)]
INNER = [(13.5, 10), (27, 17.5), (27, 25.5)]


def scale(points, size):
    return [(x / VIEWBOX * size, y / VIEWBOX * size) for x, y in points]


def render(size):
    big = size * SUPERSAMPLE
    image = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle(
        [(0, 0), (big - 1, big - 1)],
        radius=RADIUS / VIEWBOX * big,
        fill=BACKGROUND,
    )

    width = max(1, round(STROKE / VIEWBOX * big))
    for polyline in (BOX + [BOX[0]], TOP, FRONT, INNER):
        draw.line(scale(polyline, big), fill=BRASS, width=width, joint="curve")
    # PIL's line has no round cap, and the box's corners are exactly where the stroke
    # ends show, so dot every vertex to close them.
    for x, y in (BOX + [BOX[0]] + TOP + FRONT + INNER):
        px, py = scale([(x, y)], big)[0]
        draw.ellipse([px - width / 2, py - width / 2, px + width / 2, py + width / 2], fill=BRASS)

    return image.resize((size, size), Image.LANCZOS)


def main():
    root = Path(__file__).resolve().parent.parent
    # From the largest frame, and told the sizes: the ICO writer only ever scales *down*
    # from the image it is given, so saving a 16x16 frame here would produce a single-entry
    # file that Windows then stretches, which is the blurry icon this is here to avoid.
    largest = render(SIZES[-1])
    largest.save(root / "studio.ico", format="ICO", sizes=[(s, s) for s in SIZES])
    largest.resize((256, 256), Image.LANCZOS).save(root / "studio-icon-preview.png")
    print(f"wrote {root / 'studio.ico'} ({', '.join(f'{s}x{s}' for s in SIZES)})")


if __name__ == "__main__":
    main()
