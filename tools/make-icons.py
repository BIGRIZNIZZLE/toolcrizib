"""Build all ToolLog icons from brand/icon-source.jpg (1024x1024, full bleed)."""
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = Image.open(root / 'brand/icon-source.jpg').convert('RGB')
out = root / 'icons'
NAVY = tuple(Image.open(pathlib.Path(__file__).resolve().parent.parent / "brand/icon-source.jpg").convert("RGB").getpixel((6, 6)))

def sized(im, n, sharpen=False):
    r = im.resize((n, n), Image.LANCZOS)
    if sharpen: r = r.filter(ImageFilter.UnsharpMask(radius=1, percent=60, threshold=2))
    return r

# full-bleed "any" icons + Apple touch icon (opaque RGB, no transparency)
sized(src, 512).save(out / 'icon-512.png', optimize=True)
sized(src, 192, True).save(out / 'icon-192.png', optimize=True)
sized(src, 180, True).save(out / 'apple-touch-icon.png', optimize=True)

# maskable: subject scaled to 74% and centred on navy, edges feathered so the pad blends in
M = 1024; inner = int(M * 0.74)
canvas = Image.new('RGB', (M, M), NAVY)
art = src.resize((inner, inner), Image.LANCZOS)
mask = Image.new('L', (inner, inner), 0)
f = 40; ImageDraw.Draw(mask).rectangle([f, f, inner - f, inner - f], fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(f / 2))
off = (M - inner) // 2
canvas.paste(art, (off, off), mask)
canvas.resize((512, 512), Image.LANCZOS).save(out / 'icon-maskable-512.png', optimize=True)

# small sizes: tighter crop on the car face, a touch more contrast so it reads at 16-64 px
face = src.crop((60, 70, 960, 970))
face = ImageEnhance.Contrast(face).enhance(1.15)
sized(face, 32, True).save(out / 'favicon-32.png', optimize=True)
sized(face, 16, True).save(out / 'favicon-16.png', optimize=True)
sized(face, 256).save(root / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])

# in-app header logo (rounded via CSS), 2x/3x for sharp phones
sized(face, 192, True).save(out / 'logo-192.png', optimize=True)

# preview: 180 apple-touch icon with iOS-style rounded corners (supersampled mask)
ic = Image.open(out / 'apple-touch-icon.png').convert('RGBA')
S = 4; m = Image.new('L', (180 * S, 180 * S), 0)
ImageDraw.Draw(m).rounded_rectangle([0, 0, 180 * S - 1, 180 * S - 1], radius=int(180 * 0.2237 * S), fill=255)
ic.putalpha(m.resize((180, 180), Image.LANCZOS))
prev = Image.new('RGB', (300, 300), (232, 236, 244))
prev.paste(ic, (60, 60), ic)
prev.save(root / 'brand/icon-preview.png')
print('ok')
