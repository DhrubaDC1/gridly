"""Render the Home BrandMark tile cluster into Gridly's app icon assets.
Usage: python3 scripts/gen-icon.py [out_dir=assets]   (needs Pillow)
Mirrors src/ui/components/Cell.js (lip, gradient face, sheen, glint) and
src/ui/components/BrandMark.js (TILES layout, step = 1.06 * tile)."""
from PIL import Image, ImageChops, ImageDraw, ImageFilter
import sys

OUT = sys.argv[1] if len(sys.argv) > 1 else 'assets'
SS = 4  # supersample
BG = (0x0E, 0x12, 0x18, 255)

GLAZE = {  # light palette, as on the homepage: base, top, edge
    0: ('#3D6FE0', '#5A88F0', '#2448A8'),  # Cobalt
    1: ('#2FA87A', '#4DC294', '#1B7655'),  # Jade
    2: ('#F06A4D', '#FF8A6E', '#B4402A'),  # Persimmon
    3: ('#F2B33D', '#FFCB62', '#96660F'),  # Saffron
    4: ('#8B6CF0', '#A48BFA', '#5A40C0'),  # Iris
}
TILES = [(1, 0, 0.62, -10), (0, 1.0, 0, 8), (2, 1.95, 0.7, -6), (3, 0.85, 1.25, 6), (4, 1.8, 1.75, -10)]
STEP = 1.06
GAP = 4 * 11 + 1  # monochrome gap (odd MaxFilter size, supersampled px)


def hex2rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def vgrad(w, h, c0, c1):
    g = Image.new('RGBA', (w, h))
    px = g.load()
    for y in range(h):
        t = y / max(1, h - 1)
        c = tuple(round(c0[i] * (1 - t) + c1[i] * t) for i in range(4))
        for x in range(w):
            px[x, y] = c
    return g


def rrect_mask(w, h, box, r):
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle(box, radius=r, fill=255)
    return m


def tile(s, glaze, mono=False):
    """One tile of size s on a transparent (pad-sized) canvas so rotation never clips."""
    pad = s // 2
    W = s + 2 * pad
    img = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    x, y = pad, pad
    r = s * 0.16
    e = s * 0.06
    face = s - e
    if mono:
        img.paste((255, 255, 255, 255), mask=rrect_mask(W, W, (x, y, x + s, y + s), r))
        return img
    base, top, edge = (hex2rgb(c) + (255,) for c in GLAZE[glaze])
    img.paste(edge, mask=rrect_mask(W, W, (x, y, x + s, y + s), r))
    img.paste(_face(W, x, y, s, face, top, base),
              mask=rrect_mask(W, W, (x, y, x + s, y + face), r))
    inset = s * 0.04
    sheen_h = face * 0.45
    sheen = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    sheen.paste(vgrad(int(s - 2 * inset), int(sheen_h), (255, 255, 255, 56), (255, 255, 255, 0)),
                (int(x + inset), int(y + inset)))
    sheen_mask = rrect_mask(W, W, (x + inset, y + inset, x + s - inset, y + inset + sheen_h), max(0, r - inset))
    img.alpha_composite(Image.composite(sheen, Image.new('RGBA', (W, W), (0, 0, 0, 0)), sheen_mask))
    glint = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    ImageDraw.Draw(glint).rounded_rectangle(
        (x + s * 0.14, y + s * 0.12, x + s * 0.36, y + s * 0.19), radius=s * 0.035, fill=(255, 255, 255, 140))
    img.alpha_composite(glint)
    return img


def _face(W, x, y, s, face, top, base):
    f = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    f.paste(vgrad(int(s), int(face), top, base), (int(x), int(y)))
    return f


def cluster(tile_px, mono=False):
    """Cluster on a transparent canvas, tightly sized around the tiles (+ rotation margin)."""
    s = tile_px * SS
    step = s * STEP
    pad = s // 2
    w = int(1.95 * step + s + 2 * pad)
    h = int(1.75 * step + s + 2 * pad)
    canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for glaze, gx, gy, rot in TILES:
        t = tile(s, glaze, mono).rotate(-rot, resample=Image.BICUBIC)  # RN rotate is clockwise
        pos = (int(gx * step), int(gy * step))
        if mono:
            # Single-colour silhouettes merge where tiles overlap; cut a gap around each new tile
            cutter = Image.new('L', canvas.size, 0)
            cutter.paste(t.split()[3].filter(ImageFilter.MaxFilter(GAP)), pos)
            canvas.putalpha(ImageChops.subtract(canvas.split()[3], cutter))
        canvas.alpha_composite(t, pos)
    return canvas.crop(canvas.getbbox())


def place(size, cl, frac, bg=None):
    """Centre cluster `cl` (supersampled) so its longer side is `frac` of `size`."""
    S = size * SS
    img = Image.new('RGBA', (S, S), bg or (0, 0, 0, 0))
    k = frac * S / max(cl.size)
    c = cl.resize((round(cl.width * k), round(cl.height * k)), Image.LANCZOS)
    img.alpha_composite(c, ((S - c.width) // 2, (S - c.height) // 2))
    return img.resize((size, size), Image.LANCZOS)


color = cluster(220)
mono = cluster(220, mono=True)

# iOS / store icon: opaque, full bleed (iOS applies its own corner mask)
place(1024, color, 0.70, BG).convert('RGB').save(f'{OUT}/icon.png')
# Android adaptive: keep the cluster inside the 66/108 safe circle
place(1024, color, 0.49).save(f'{OUT}/android-icon-foreground.png')
Image.new('RGBA', (1024, 1024), BG).save(f'{OUT}/android-icon-background.png')
place(1024, mono, 0.49).save(f'{OUT}/android-icon-monochrome.png')
# Splash mark (transparent) and web favicon
place(1024, color, 0.80).save(f'{OUT}/splash-icon.png')
place(48, color, 0.84, BG).save(f'{OUT}/favicon.png')
print('ok')
