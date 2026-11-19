"""Generate the app icons: three stones of the board on the lake, the frog on the front one. Run from the repository root:  python3 tools/make_icons.py  (needs Pillow).
Placeholder art, in the colours of js/config.js.
"""
from PIL import Image, ImageDraw

ABYSS_TOP, ABYSS_BOTTOM = (45, 138, 143), (22, 80, 94)
TILE, SIDE = (214, 208, 189), (127, 122, 104)
HERO, HERO_DARK, EYE = (198, 232, 90), (44, 74, 20), (22, 32, 15)
EYE_WHITE = (245, 247, 232)


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
    R = dx * 0.62  # the frog, from above: hind legs, body, bulging eyes
    o = R * 0.09
    for side in (-1, 1):
        lx, ly = cx0 + side * R * 0.55, cy0 + R * 0.5
        d.ellipse([lx - R * 0.2 - o, ly - R * 0.42 - o, lx + R * 0.2 + o, ly + R * 0.42 + o], fill=HERO_DARK)
        d.ellipse([lx - R * 0.2, ly - R * 0.42, lx + R * 0.2, ly + R * 0.42], fill=HERO)
    d.ellipse([cx0 - R * 0.58 - o, cy0 - R * 0.72 - o, cx0 + R * 0.58 + o, cy0 + R * 0.72 + o], fill=HERO_DARK)
    d.ellipse([cx0 - R * 0.58, cy0 - R * 0.72, cx0 + R * 0.58, cy0 + R * 0.72], fill=HERO)
    for side in (-1, 1):
        ex, ey = cx0 + side * R * 0.3, cy0 - R * 0.52
        d.ellipse([ex - R * 0.2 - o, ey - R * 0.2 - o, ex + R * 0.2 + o, ey + R * 0.2 + o], fill=HERO_DARK)
        d.ellipse([ex - R * 0.2, ey - R * 0.2, ex + R * 0.2, ey + R * 0.2], fill=EYE_WHITE)
        d.ellipse([ex - R * 0.1, ey - R * 0.15, ex + R * 0.1, ey + R * 0.05], fill=EYE)
    return img.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    icon(192, 0.08).save("icons/icon-192.png")
    icon(512, 0.08).save("icons/icon-512.png")
    icon(512, 0.2).save("icons/icon-maskable-512.png")
    icon(180, 0.08).save("icons/apple-touch-icon.png")
