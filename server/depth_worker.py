"""Depth-map worker for uploaded photos (adapted from scripts/depth.py).

Started once by the Node server and kept alive, so the model loads only once.
Reads one JSON job per line on stdin:   {"src": ".../<id>-lg.webp", "out": ".../<id>-depth.webp"}
Writes one JSON result per line:        {"ok": true, "out": "..."}  or  {"ok": false, "error": "..."}

Depth Anything V2 Small (Apache-2.0) on CPU. White = near. The map is softened and near edges
dilated so foreground pixels stretch at depth discontinuities when the stage camera moves.
Paths come only from the server (random file names it generated), never from users.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageFilter, ImageOps
from scipy import ndimage
from transformers import pipeline

Image.MAX_IMAGE_PIXELS = 80_000_000
pipe = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device=-1)
print(json.dumps({"ready": True}), flush=True)


def depth(src, out):
    img = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    work = img.copy()
    work.thumbnail((1280, 1280))
    pred = pipe(work)["predicted_depth"].squeeze().numpy().astype(np.float32)
    lo, hi = np.percentile(pred, 1), np.percentile(pred, 99.5)
    d = np.clip((pred - lo) / max(hi - lo, 1e-6), 0, 1)
    d = ndimage.grey_dilation(d, size=(5, 5))
    d = ndimage.gaussian_filter(d, sigma=2.2)
    d = d ** 1.15
    m = Image.fromarray((d * 255).astype(np.uint8), mode="L")
    m = m.resize((1024, round(1024 * img.height / img.width)), Image.BICUBIC)
    m = m.filter(ImageFilter.GaussianBlur(1.2))
    m.save(out, "WEBP", quality=90)


for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        job = json.loads(line)
        depth(job["src"], job["out"])
        print(json.dumps({"ok": True, "out": job["out"]}), flush=True)
    except Exception as exc:  # report and keep serving
        print(json.dumps({"ok": False, "error": str(exc)[:300]}), flush=True)
