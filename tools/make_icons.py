"""Generate the app icons: three stone diamonds of the board over the night-blue abyss, the coral
hero on the front one. Run from the repository root:  python3 tools/make_icons.py  (needs Pillow).
Placeholder art, in the colours of js/config.js.
"""
from PIL import Image, ImageDraw

ABYSS_TOP, ABYSS_BOTTOM = (27, 34, 64), (9, 12, 24)
TILE, SIDE = (239, 230, 210), (168, 149, 122)
HERO, HERO_DARK, EYE = (255, 107, 90), (138, 42, 51), (27, 20, 32)


def mix(a, b, t):
    return tuple(int(x + (y - x) * t) for x, y in zip(a, b))


def icon(size, inset):
    s = 4
    W = size * s
    img = Image.new("RGB", (W, W))
    d = ImageDraw.Draw(img)
    for y in range(W):
        d.line([(0, y), (W, y)], fill=mix(ABYSS_TOP, ABYSS_BOTTOM, y / W))
    inner = W * (1 - 2 * inset)
    dx = inner / 4.2
    dy = dx * 0.82
    cx0, cy0 = W / 2, W / 2 + dy * 0.9
    k = 0.9
    thick = dx * 0.16

    def diamond(cx, cy, fill):
        d.polygon([(cx, cy - dy * k), (cx + dx * k, cy), (cx, cy + dy * k), (cx - dx * k, cy)], fill=fill)

    for (x, r) in [(-1, 1), (1, 1), (0, 0)]:  # far to near
        cx, cy = cx0 + x * dx, cy0 - r * dy
        diamond(cx, cy + thick, SIDE)
        diamond(cx, cy, TILE)
    R = dx * 0.38
    d.ellipse([cx0 - R, cy0 - R + R * 0.12, cx0 + R, cy0 + R + R * 0.12], fill=HERO_DARK)
    d.ellipse([cx0 - R, cy0 - R, cx0 + R, cy0 + R], fill=HERO)
    for side in (-1, 1):
        ex, ey = cx0 + side * R * 0.36, cy0 - R * 0.42
        d.ellipse([ex - R * 0.13, ey - R * 0.18, ex + R * 0.13, ey + R * 0.18], fill=EYE)
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    icon(192, 0.08).save("icons/icon-192.png")
    icon(512, 0.08).save("icons/icon-512.png")
    icon(512, 0.2).save("icons/icon-maskable-512.png")
    icon(180, 0.08).save("icons/apple-touch-icon.png")
