// Uploads: one file per request, streamed with a hard size cap.
// Images are verified by decoding them with sharp (never by extension), re-encoded to WebP at two
// sizes with all metadata stripped, and saved under random names. MP3s are checked by their bytes.
import Busboy from 'busboy';
import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { uploadDir } from './store.js';
import { queueDepth } from './depth.js';
import { limiter } from './guard.js';

export const MAX_BYTES = 15 * 1024 * 1024;
const MAX_PIXELS = 80_000_000; // decompression-bomb guard

sharp.cache(false);
// libvips threads per image: the default (one per core); withSlot() bounds how many images run at once.

const httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });

/** Reads the single multipart file field "file" into memory (≤ maxBytes, default 15 MB) plus small text fields. */
export function readMultipart(req, { maxBytes = MAX_BYTES, fields: maxFields = 4, fieldSize = 200 } = {}) {
  return new Promise((resolveP, reject) => {
    let bb;
    try {
      bb = Busboy({ headers: req.headers, limits: { fileSize: maxBytes, files: 1, fields: maxFields, fieldSize, parts: maxFields + 2 } });
    } catch {
      return reject(httpError(400, 'Expected a multipart upload.'));
    }
    const fields = {};
    let file = null;
    let tooBig = false;
    bb.on('field', (name, val) => { fields[name] = val; });
    bb.on('file', (name, stream, info) => {
      if (name !== 'file' || file) { stream.resume(); return; }
      const chunks = [];
      let size = 0;
      stream.on('data', (d) => { size += d.length; chunks.push(d); });
      stream.on('limit', () => { tooBig = true; });
      stream.on('end', () => { file = { buffer: Buffer.concat(chunks, size), name: info.filename, size }; });
    });
    bb.on('error', () => reject(httpError(400, 'The upload was interrupted.')));
    bb.on('close', () => {
      if (tooBig) return reject(httpError(413, `That file is larger than ${Math.round(maxBytes / 2 ** 20)} MB.`));
      if (!file || !file.size) return reject(httpError(400, 'No file was received.'));
      resolveP({ fields, file });
    });
    req.pipe(bb);
  });
}

const newId = () => randomBytes(18).toString('base64url'); // 24 chars, unguessable

/** A HEIF container holding HEVC (iPhone HEIC). The prebuilt sharp decodes AVIF but not HEVC (patents). */
export function looksLikeHeic(b) {
  if (b.length < 16 || b.toString('latin1', 4, 8) !== 'ftyp') return false;
  const brands = b.toString('latin1', 8, Math.min(b.length, Math.max(16, b.readUInt32BE(0))));
  return /hei[cxms]|hev[cxms]/.test(brands) && !/avi[fs]/.test(brands);
}
export const HEIC_MSG = 'iPhone HEIC photos cannot be read here yet. Please upload a JPEG instead: on the iPhone choose Settings > Camera > Formats > Most Compatible, or export the photo as JPEG first.';

// WebP effort 2 encodes about twice as fast as 4 for files ~3% larger at the same quality.
const WEBP_EFFORT = 2;
// At most two photos are processed at once (each already uses every core); up to 16 more wait their turn, and
// beyond that the upload gets a 503 (try again) instead of a queue that only grows.
const images = limiter({ max: Number(process.env.IMAGE_CONCURRENCY) || 2, queue: 16, name: 'images' });
export const withSlot = (fn) => images.run(fn);
// Bodies being received at once (each is held in memory, up to 15 MB): bounds memory under a burst of uploads.
export const receiving = limiter({ max: 6, queue: 12, name: 'upload bodies' });

async function saveImage(slug, buffer) {
  let meta;
  try {
    meta = await sharp(buffer, { limitInputPixels: MAX_PIXELS, failOn: 'error' }).metadata();
  } catch {
    if (looksLikeHeic(buffer)) throw httpError(415, HEIC_MSG);
    throw httpError(415, 'That file is not an image we can read. Please upload a JPEG, PNG, WebP or AVIF photo.');
  }
  if (meta.format === 'heif' && meta.compression !== 'av1') throw httpError(415, HEIC_MSG);
  if (!meta.width || !meta.height || !['jpeg', 'png', 'webp', 'avif', 'heif', 'tiff', 'gif'].includes(meta.format)) {
    throw httpError(415, 'Please upload a JPEG, PNG, WebP or AVIF photo.');
  }
  if (meta.width * meta.height > MAX_PIXELS) throw httpError(413, 'That photo has too many pixels (over 80 megapixels).');
  const dir = uploadDir(slug);
  await fs.mkdir(dir, { recursive: true });
  const id = newId();
  let lgInfo;
  try {
    lgInfo = await withSlot(async () => {
      // Decode once: bake in the EXIF orientation, shrink (JPEG shrink-on-load keeps this cheap) and convert to
      // raw sRGB pixels. Raw pixels carry no metadata, so EXIF/GPS/XMP never reach the files. Both sizes are
      // then encoded in parallel from that one buffer.
      const { data, info } = await sharp(buffer, { limitInputPixels: MAX_PIXELS, failOn: 'error' })
        .rotate()
        .resize({ width: 2560, withoutEnlargement: true })
        .toColourspace('srgb')
        .raw()
        .toBuffer({ resolveWithObject: true });
      const raw = { raw: { width: info.width, height: info.height, channels: info.channels } };
      const [lg] = await Promise.all([
        sharp(data, raw).webp({ quality: 82, effort: WEBP_EFFORT }).toFile(resolve(dir, `${id}-lg.webp`)),
        sharp(data, raw).resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 80, effort: WEBP_EFFORT }).toFile(resolve(dir, `${id}-sm.webp`)),
      ]);
      return lg;
    });
  } catch (err) {
    if (err.status === 503) throw err; // the queue is full: "try again", not "bad image"
    await Promise.all(['lg', 'sm'].map((s) => fs.rm(resolve(dir, `${id}-${s}.webp`), { force: true })));
    throw httpError(415, looksLikeHeic(buffer) ? HEIC_MSG : 'That image could not be processed.');
  }
  const photo = {
    lg: `/uploads/${slug}/${id}-lg.webp`,
    sm: `/uploads/${slug}/${id}-sm.webp`,
    focal: [0.5, 0.5],
    alt: '',
    w: lgInfo.width,
    h: lgInfo.height,
  };
  queueDepth(slug, id); // background job, never awaited
  return photo;
}

// MPEG audio frame headers (layer III mostly; I and II for completeness): kbps by [version 1 | 2/2.5][layer].
const KBPS = {
  1: { 1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448], 2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384], 3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] },
  2: { 1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256], 2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], 3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] },
};
const RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };

/** The frame starting at i: { len, samples, rate } or null. */
function frameAt(b, i) {
  if (i + 4 > b.length || b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) return null;
  const ver = (b[i + 1] >> 3) & 3; // 3: MPEG-1, 2: MPEG-2, 0: MPEG-2.5
  const layer = 4 - ((b[i + 1] >> 1) & 3); // 1, 2, 3 (4 = reserved)
  const bi = b[i + 2] >> 4;
  const ri = (b[i + 2] >> 2) & 3;
  if (ver === 1 || layer === 4 || bi === 0 || bi === 15 || ri === 3) return null;
  const kbps = KBPS[ver === 3 ? 1 : 2][layer][bi];
  const rate = RATES[ver][ri];
  const pad = (b[i + 2] >> 1) & 1;
  const samples = layer === 1 ? 384 : layer === 3 && ver !== 3 ? 576 : 1152;
  const len = layer === 1 ? Math.floor((12 * kbps * 1000) / rate + pad) * 4 : Math.floor((samples / 8) * kbps * 1000 / rate) + pad;
  return len >= 24 ? { len, samples, rate } : null;
}

/**
 * Seconds of audio in an MP3, read by walking its frames (exact for CBR and VBR alike), or 0 when the
 * bytes are not MPEG audio. A short run of garbage between frames is skipped; a stray sync inside data is not
 * trusted unless the next frame follows it.
 */
export function mp3Duration(b) {
  let i = 0;
  if (b.length > 10 && b.toString('latin1', 0, 3) === 'ID3') {
    i = 10 + (((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f)) + ((b[5] & 0x10) ? 10 : 0);
  }
  let frames = 0;
  let seconds = 0;
  let skipped = 0;
  while (i + 4 <= b.length) {
    const f = frameAt(b, i);
    if (f && (i + f.len >= b.length - 4 || frameAt(b, i + f.len) || b.toString('latin1', i + f.len, i + f.len + 3) === 'TAG')) {
      frames += 1;
      seconds += f.samples / f.rate;
      i += f.len;
      continue;
    }
    if (b.toString('latin1', i, i + 3) === 'TAG') break; // ID3v1 at the end
    i += 1;
    if (++skipped > 64 * 1024) break; // not audio
  }
  return frames >= 8 ? Math.round(seconds * 10) / 10 : 0;
}

/** MP3: an ID3v2 tag or an MPEG audio frame sync at the start, and a second frame sync later. */
export function looksLikeMp3(b) {
  if (b.length < 1024) return false;
  let off = 0;
  if (b.toString('latin1', 0, 3) === 'ID3') {
    const size = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f);
    off = 10 + size + ((b[5] & 0x10) ? 10 : 0);
  }
  const syncAt = (i) => i + 1 < b.length && b[i] === 0xff && (b[i + 1] & 0xe0) === 0xe0 && ((b[i + 1] >> 1) & 0x03) !== 0;
  for (let i = off; i < Math.min(b.length - 4, off + 4096); i++) {
    if (syncAt(i)) {
      for (let j = i + 4; j < Math.min(b.length - 1, i + 8192); j++) if (syncAt(j)) return true;
      return false;
    }
  }
  return false;
}

async function saveAudio(slug, buffer) {
  if (!looksLikeMp3(buffer)) throw httpError(415, 'That file is not an MP3.');
  const dir = uploadDir(slug);
  await fs.mkdir(dir, { recursive: true });
  const id = newId();
  await fs.writeFile(resolve(dir, `${id}.mp3`), buffer, { mode: 0o644 });
  return { src: `/uploads/${slug}/${id}.mp3` };
}

/** POST /api/invitations/:slug/uploads  (multipart: file, kind=image|audio) */
export async function handleUpload(req, res) {
  const len = Number(req.get('content-length') || 0);
  if (len > MAX_BYTES + 64 * 1024) throw httpError(413, 'That file is larger than 15 MB.');
  let parsed;
  try {
    parsed = await receiving.run(() => readMultipart(req));
  } catch (err) {
    if (err.status === 503) res.set('Connection', 'close'); // do not read a body we refused
    throw err;
  }
  const { fields, file } = parsed;
  const kind = fields.kind === 'audio' ? 'audio' : 'image';
  const t0 = performance.now();
  const out = kind === 'audio' ? await saveAudio(req.params.slug, file.buffer) : await saveImage(req.params.slug, file.buffer);
  const ms = Math.round(performance.now() - t0);
  console.info(`[upload] ${kind} slug=${req.params.slug} bytes=${file.size} ms=${ms}`);
  res.set('Server-Timing', `process;dur=${ms}`);
  res.status(201).json(out);
}
