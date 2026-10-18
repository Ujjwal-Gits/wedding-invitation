"""Sanjhi art: turns the Canva black-on-white papercut silhouettes into coloured, textured paper layers.

The Canva AI art (docs/THEMES-NEXT-10.md, "Sanjhi") is generated as solid black silhouettes on white, exported at full
size from the "Sanjhi art board" (copy-design route, see README). The originals are not committed (each is a few MB);
this script only runs again if the art changes:

    python -I src/themes/sanjhi/build_art.py <raw-dir>

For every layer it keys the black paper out of the white (soft edge, specks removed), crops it to its ground strip,
colours it as one sheet of hand-cut paper (the theme's palette, a fibre texture, a lit top-left edge, a shaded
bottom-right edge and a soft contact shadow), and writes a wide WebP (desktop) and a narrow one composed for phones.
The stencil gives the gate's black stencil and the coloured powder that sifts through it (split in three colour groups).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as nd

RAW = Path(sys.argv[1])
OUT = Path(__file__).resolve().parents[3] / 'public' / 'themes' / 'sanjhi' / 'art'
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255


def load_alpha(name):
    g = np.asarray(Image.open(RAW / f'{name}.png').convert('L'), dtype=np.float32)
    g = nd.gaussian_filter(g, 0.8)  # the art board upscales: soften the steps before keying
    a = np.clip((190 - g) / 120, 0, 1)
    lab, n = nd.label(a > 0.5)
    if n:
        sizes = nd.sum(np.ones_like(a), lab, range(1, n + 1))
        small = np.isin(lab, np.nonzero(sizes < 90)[0] + 1)
        a[small] = 0
    return a


def crop_ground(a, keep=9):
    """crop to the ground strip, and thin the strip to `keep` px: the layer stands on a fine paper tab, not a band"""
    rows = np.nonzero((a > 0.5).sum(1) > 4)[0]
    cols = np.nonzero((a > 0.5).sum(0) > 0)[0]
    a = a[:rows[-1] + 3, :]
    c0, c1 = cols[0], cols[-1]
    n = 0
    for r in range(a.shape[0] - 1, -1, -1):
        if (a[r, c0:c1] > 0.5).mean() > 0.72:
            n += 1
        elif n:
            break
    if n > keep:
        a = a[:a.shape[0] - (n - keep)]
    return a, (c0, c1)


def fibre(h, w):
    """multiplicative paper texture around 0: fine grain plus long soft fibres"""
    t = rng.normal(0, 1, (h, w)).astype(np.float32)
    grain = nd.gaussian_filter(t, 1.6) * 0.5
    f = nd.gaussian_filter(rng.normal(0, 1, (h, w)).astype(np.float32), (1.2, 9)) * 3.2
    blot = nd.gaussian_filter(rng.normal(0, 1, (h // 8 + 1, w // 8 + 1)).astype(np.float32), 3)
    blot = np.kron(blot, np.ones((8, 8), np.float32))[:h, :w] * 2.5
    return (grain + f + blot) * 0.018


def shift(a, dx, dy):
    return nd.shift(a, (dy, dx), order=1, mode='constant', cval=0)


def trim_top(a, pad=8):
    rows = np.nonzero((a > 0.5).sum(1) > 0)[0]
    return a[max(0, rows[0] - pad):]


def paper(a, color, shadow=0.42, light=0.22, shade=0.16, s=1.0):
    """one sheet of coloured paper cut to alpha `a` (s = pixel scale of the edge effects)"""
    h, w = a.shape
    c = hexrgb(color)
    rgb = np.ones((h, w, 3), np.float32) * c
    rgb *= (1 + fibre(h, w))[..., None]
    k = max(1, round(2.5 * s))
    lit = np.clip(a - shift(a, k, k), 0, 1)  # edges facing the light (top-left)
    dark = np.clip(a - shift(a, -k, -k), 0, 1)
    rgb = rgb + (1 - rgb) * (lit * light)[..., None]
    rgb = rgb * (1 - dark * shade)[..., None]
    sh = shift(nd.gaussian_filter(a, 7 * s), 7 * s, 11 * s) * shadow
    sc = hexrgb('#120F22')
    oa = a + sh * (1 - a)
    out = (rgb * a[..., None] + sc * (sh * (1 - a))[..., None]) / np.maximum(oa, 1e-4)[..., None]
    return np.dstack([np.clip(out, 0, 1), oa])


def save(arr, name, width, q=76):
    im = Image.fromarray((arr * 255 + 0.5).astype(np.uint8), 'RGBA')
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    p = OUT / f'{name}.webp'
    im.save(p, 'WEBP', quality=q, alpha_quality=50, method=6)
    print(f'{p.name:28s} {im.width}x{im.height}  {p.stat().st_size // 1024} KB')
    return im.size


def phone(a, mode, keep):
    """the narrow composition: 'pack' slides the two halves together over the empty middle, 'mid' crops the centre"""
    h, w = a.shape
    if mode == 'mid':
        W = int(w * keep)
        x0 = (w - W) // 2
        return a[:, x0:x0 + W]
    W = int(w * keep)
    out = np.zeros((h, W), np.float32)
    half = w // 2
    out[:, :half] = np.maximum(out[:, :half], a[:, :half])
    out[:, W - (w - half):] = np.maximum(out[:, W - (w - half):], a[:, half:])
    return out


# name, colour, phone mode, phone keep
LAYERS = [
    ('grove-kadamba', '#E3A0B4', 'mid', 0.6),
    ('grove-mango', '#4F8A45', 'pack', 0.66),
    ('grove-cows', '#1B1620', 'mid', 0.62),
    ('pond-front', '#3F7A3E', 'mid', 0.62),
    ('village', '#B58AB0', 'mid', 0.6),
    ('houses', '#FBF0DC', 'pack', 0.7),
    ('fence', '#4F8A45', 'mid', 0.62),
    ('pavilion', '#7C76B2', 'mid', 0.6),
    ('lotus', '#E89AB0', 'mid', 0.6),
    ('ghat-skyline', '#4A4880', 'mid', 0.6),
    ('river', '#17141F', 'mid', 0.62),
    ('reeds', '#2F5A33', 'mid', 0.62),
    ('garden', '#3B6A3A', 'pack', 0.68),
    ('mandap', '#FBF0DC', 'mid', 0.72),
    ('kalash', '#E7882A', 'mid', 0.66),
]

only = set(sys.argv[2:])
for name, col, mode, keep in LAYERS:
    if only and name not in only:
        continue
    if not (RAW / f'{name}.png').exists():
        print('missing', name)
        continue
    a = load_alpha(name)
    a, _ = crop_ground(a)
    save(paper(trim_top(a), col, s=1.0), name, 1600)
    save(paper(trim_top(phone(a, mode, keep)), col, s=1.0), f'{name}-m', 1100)


def toran():
    """the toran: its lace band runs across the top of page one; on a wide page its two outer marigold swags with
    their bells hang in the corners (the words stand between them, never on the flowers)"""
    a = load_alpha('toran')
    h, w = a.shape
    rows = np.nonzero((a > 0.5).sum(1) > 4)[0]
    a = a[rows[0]:rows[-1] + 3]
    h = a.shape[0]
    band = a[:int(h * 0.235)]
    col = '#E7882A'
    save(paper(band, col), 'toran-band', 1600)
    save(paper(phone(band, 'mid', 0.6), col), 'toran-band-m', 1100)
    cut = int(w * 0.255)
    save(paper(a[:, :cut], col), 'toran-l', 520)
    save(paper(a[:, w - cut:], col), 'toran-r', 520)


def stencil():
    a = load_alpha('stencil')
    ys, xs = np.nonzero(a > 0.5)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    a = a[y0:y1 + 1, x0:x1 + 1]
    h, w = a.shape
    # the black stencil itself (kohl paper, no shadow: it lies flat on the cover)
    save(paper(a, '#151217', shadow=0.0, light=0.10, shade=0.0), 'stencil', 1000, q=84)
    # the holes: every white region inside the sheet that is not the outside
    holes = a < 0.5
    lab, n = nd.label(holes)
    outside = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    cy, cx = h / 2, w / 2
    centre = lab[int(cy), int(cx)]
    groups = {'warm': np.zeros((h, w), np.float32), 'peacock': np.zeros((h, w), np.float32), 'leaf': np.zeros((h, w), np.float32)}
    colmap = np.zeros((h, w, 3), np.float32)
    objs = nd.find_objects(lab)
    WARM = ['#E7882A', '#F2B33D', '#E5A2B2', '#C9405F', '#E7882A', '#D9623A']
    PEA = ['#1F7A8A', '#2C9A86', '#2F6FA0']
    LEAF = ['#5C8A48', '#7AA653', '#4E7A3E']
    for i, sl in enumerate(objs, start=1):
        if sl is None or i in outside or i == centre:
            continue
        m = lab[sl] == i
        area = m.sum()
        if area < 30:
            continue
        yy, xx = np.nonzero(m)
        my = (yy.mean() + sl[0].start) / h
        mx = (xx.mean() + sl[1].start) / w
        # elongation from the second moments
        cov = np.cov(np.vstack([yy, xx])) if area > 2 else np.eye(2)
        ev = np.sort(np.linalg.eigvalsh(cov))
        elong = np.sqrt(ev[1] / max(ev[0], 1e-3))
        border = min(mx, 1 - mx, my, 1 - my) < 0.085
        side = (mx < 0.36 or mx > 0.64) and 0.2 < my < 0.92
        if border:
            g = 'warm'; c = WARM[(i * 7) % 3 if (i % 2) else 3]
        elif side and not elong > 3.2:
            g = 'peacock'; c = PEA[i % 3]
        elif elong > 2.4:
            g = 'leaf'; c = LEAF[i % 3]
        else:
            g = 'warm'; c = WARM[i % len(WARM)]
        sub = groups[g][sl]
        sub[m] = 1
        colmap[sl][m] = hexrgb(c)
    for g, m in groups.items():
        # powder: a little short of the knife edge, soft and grainy, never a hard print
        m = nd.binary_erosion(m > 0.5, iterations=2).astype(np.float32)
        m = nd.gaussian_filter(m, 1.4)
        speck = rng.random((h, w)).astype(np.float32)
        m = np.clip(m * 1.25 - (speck < 0.10) * 0.55 * (m < 0.95), 0, 1)
        lum = 1 + nd.gaussian_filter(rng.normal(0, 1, (h, w)).astype(np.float32), 0.6) * 0.09
        rgb = np.clip(colmap * lum[..., None], 0, 1)
        save(np.dstack([rgb, m]), f'powder-{g}', 1000, q=82)
    print('stencil box', w, h)


if not only or 'toran' in only:
    toran()
if not only or 'stencil' in only:
    stencil()
