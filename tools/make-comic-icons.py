# Comic icon set: brand/icons-src/<key>.jpg (generated originals on white) -> icons/comic/<key>.webp
# White background removed by flood fill from the edges (inner highlights stay), trimmed, centered on a square, small WebP.
import os, sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops
SRC = os.path.join(os.path.dirname(__file__), '..', 'brand', 'icons-src')
OUT = os.path.join(os.path.dirname(__file__), '..', 'icons', 'comic')
SIZE = int(os.environ.get('SIZE', 168))
os.makedirs(OUT, exist_ok=True)
for f in sorted(os.listdir(SRC)):
    if not f.endswith('.jpg'): continue
    key = f[:-4]
    im = Image.open(os.path.join(SRC, f)).convert('RGB')
    w, h = im.size
    # mark background: flood fill near-white from a frame of seed points
    m = im.copy()
    for x in range(0, w, 16):
        for y in (0, h - 1):
            if sum(m.getpixel((x, y))) > 690: ImageDraw.floodfill(m, (x, y), (255, 0, 255), thresh=40)
    for y in range(0, h, 16):
        for x in (0, w - 1):
            if sum(m.getpixel((x, y))) > 690: ImageDraw.floodfill(m, (x, y), (255, 0, 255), thresh=40)
    r, g, b = m.split()
    bg = Image.eval(ImageChops.difference(Image.merge('RGB', (r, g, b)), Image.new('RGB', (w, h), (255, 0, 255))).convert('L'), lambda v: 255 if v > 8 else 0)
    alpha = bg.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    rgba = im.copy(); rgba.putalpha(alpha)
    box = alpha.point(lambda v: 255 if v > 40 else 0).getbbox()
    rgba = rgba.crop(box)
    cw, ch = rgba.size; side = int(max(cw, ch) * 1.06)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0)); sq.paste(rgba, ((side - cw) // 2, (side - ch) // 2), rgba)
    sq = sq.resize((SIZE, SIZE), Image.LANCZOS)
    p = os.path.join(OUT, key + '.webp')
    for q in (82, 74, 66, 58, 50):
        sq.save(p, 'WEBP', quality=q, method=6, alpha_quality=80)
        if os.path.getsize(p) <= 15000: break
    print(key, os.path.getsize(p), q)
