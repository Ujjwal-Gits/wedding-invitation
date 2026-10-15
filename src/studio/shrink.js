// Makes big phone photos small in the browser before upload (4–8 MB originals are slow on mobile data).
// Long edge capped at 2560 px; JPEG 0.88 for photos, WebP for images that may have transparency.

const MAX_EDGE = 2560;
const SKIP_BYTES = 1.5 * 1024 * 1024;

export const HEIC_MSG = 'This photo format (HEIC) isn’t supported, please choose ‘Most Compatible’ in your iPhone camera settings or send it as JPEG';
const isHeic = (f) => /^image\/hei[cf]/i.test(f.type || '') || /\.hei[cf]$/i.test(f.name || '');
const mayHaveAlpha = (f) => /png|webp|avif|gif/i.test(f.type || '') || /\.(png|webp|avif|gif)$/i.test(f.name || '');

async function encode(bmp, w, h, type, quality) {
  if (typeof OffscreenCanvas !== 'undefined') {
    const c = new OffscreenCanvas(w, h);
    c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    return c.convertToBlob({ type, quality });
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').drawImage(bmp, 0, 0, w, h);
  return new Promise((resolve) => c.toBlob(resolve, type, quality));
}

/**
 * Resolves to the file to upload: a smaller copy (same name), or the original when it is already
 * small, cannot be decoded here (the server then decides), or would not get smaller.
 * Rejects with Error(HEIC_MSG) for a HEIC photo the browser cannot read.
 */
export async function shrinkImage(file) {
  if (typeof createImageBitmap !== 'function' || /svg|gif/i.test(file.type || '')) return file;
  let bmp;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    if (isHeic(file)) throw new Error(HEIC_MSG);
    return file;
  }
  try {
    const long = Math.max(bmp.width, bmp.height);
    if (long <= MAX_EDGE && file.size <= SKIP_BYTES && !isHeic(file)) return file;
    const k = Math.min(1, MAX_EDGE / long);
    const w = Math.max(1, Math.round(bmp.width * k));
    const h = Math.max(1, Math.round(bmp.height * k));
    let blob = null;
    if (mayHaveAlpha(file)) {
      blob = await encode(bmp, w, h, 'image/webp', 0.9);
      if (blob && blob.type !== 'image/webp') blob = null; // no WebP encoder: keep the original (and its transparency)
    } else {
      blob = await encode(bmp, w, h, 'image/jpeg', 0.88);
    }
    if (!blob || (blob.size >= file.size && !isHeic(file))) return file;
    return new File([blob], file.name, { type: blob.type, lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    bmp.close?.();
  }
}
