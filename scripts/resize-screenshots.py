"""Resize screenshots to 1280x800 (24-bit PNG) for Chrome Web Store.

- Preserves aspect ratio (no distortion)
- Samples top-left 5x5 region for the padding color so the letterbox blends in
- Removes alpha channel -> 24-bit PNG
- Writes to docs/screenshots/store/, leaving originals intact
"""
from pathlib import Path
from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "screenshots"
DST = SRC / "store"
DST.mkdir(exist_ok=True)

TARGET = (1280, 800)


def sample_bg(img: Image.Image) -> tuple[int, int, int]:
    sample = img.convert("RGB").crop((0, 0, 5, 5))
    r, g, b = ImageStat.Stat(sample).mean
    return (int(r), int(g), int(b))


for src in sorted(SRC.glob("*.png")):
    img = Image.open(src)
    bg = sample_bg(img)
    img.thumbnail(TARGET, Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", TARGET, bg)
    x = (TARGET[0] - img.width) // 2
    y = (TARGET[1] - img.height) // 2
    if img.mode == "RGBA":
        canvas.paste(img, (x, y), img.split()[-1])
    else:
        canvas.paste(img.convert("RGB"), (x, y))
    out = DST / src.name
    canvas.save(out, "PNG", optimize=True)
    print(f"{src.name}: scaled {img.size}, offset ({x},{y}), bg={bg} -> {out}")
