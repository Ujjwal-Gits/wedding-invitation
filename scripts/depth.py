"""Generate depth maps for the 2.5D camera moves.

Usage:  tools/.venv/Scripts/python scripts/depth.py [slug ...]
Reads   art-src/photos/<slug>.jpg
Writes  art-src/depth/<slug>.png  (8-bit grey, white = near)

Depth Anything V2 (small) runs on CPU in a few seconds per photo. The map is then
softened and the near edges dilated, so foreground pixels (not background pixels)
get stretched at depth discontinuities when the camera moves.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps
from scipy import ndimage
from transformers import pipeline

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "art-src" / "photos"
OUT = ROOT / "art-src" / "depth"
OUT.mkdir(parents=True, exist_ok=True)

slugs = sys.argv[1:] or [p.stem for p in sorted(SRC.glob("*.jpg"))]
pipe = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device=-1)

for slug in slugs:
    src = SRC / f"{slug}.jpg"
    if not src.exists():
        print(f"skip {slug}: no source")
        continue
    img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    work = img.copy()
    work.thumbnail((1280, 1280))
    pred = pipe(work)["predicted_depth"].squeeze().numpy().astype(np.float32)

    # Normalise robustly (ignore outliers) to 0..1 where 1 = nearest.
    lo, hi = np.percentile(pred, 1), np.percentile(pred, 99.5)
    d = np.clip((pred - lo) / max(hi - lo, 1e-6), 0, 1)

    # Grow near regions a little so edges tear on the foreground side, then soften.
    d = ndimage.grey_dilation(d, size=(5, 5))
    d = ndimage.gaussian_filter(d, sigma=2.2)
    d = d ** 1.15  # keep the far field calmer

    out = Image.fromarray((d * 255).astype(np.uint8), mode="L")
    out = out.resize((1024, round(1024 * img.height / img.width)), Image.BICUBIC)
    out = out.filter(ImageFilter.GaussianBlur(1.2))
    out.save(OUT / f"{slug}.png", optimize=True)
    print(f"depth {slug}  {out.size[0]}x{out.size[1]}")
