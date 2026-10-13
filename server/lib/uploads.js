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

export const MAX_BYTES = 15 * 1024 * 1024;
const MAX_PIXELS = 80_000_000; // decompression-bomb guard

sharp.cache(false);
sharp.concurrency(2);

const httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });

/** Reads the single multipart file field "file" into memory (≤ 15 MB) plus small text fields. */
function readMultipart(req) {
  return new Promise((resolveP, reject) => {
    let bb;
    try {
      bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_BYTES, files: 1, fields: 4, fieldSize: 200, parts: 6 } });
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
      if (tooBig) return reject(httpError(413, 'That file is larger than 15 MB.'));
      if (!file || !file.size) return reject(httpError(400, 'No file was received.'));
      resolveP({ fields, file });
    });
    req.pipe(bb);
  });
}

const newId = () => randomBytes(18).toString('base64url'); // 24 chars, unguessable

async function saveImage(slug, buffer) {
  let meta;
  try {
    meta = await sharp(buffer, { limitInputPixels: MAX_PIXELS, failOn: 'error' }).metadata();
  } catch {
    throw httpError(415, 'That file is not an image we can read. Please upload a JPEG, PNG, WebP, HEIC or AVIF photo.');
  }
  if (!meta.width || !meta.height || !['jpeg', 'png', 'webp', 'avif', 'heif', 'tiff', 'gif'].includes(meta.format)) {
    throw httpError(415, 'Please upload a JPEG, PNG, WebP, HEIC or AVIF photo.');
  }
  const dir = uploadDir(slug);
  await fs.mkdir(dir, { recursive: true });
  const id = newId();
  // .rotate() bakes in the EXIF orientation; sharp drops EXIF/GPS/XMP/ICC by default on output.
  const base = sharp(buffer, { limitInputPixels: MAX_PIXELS, failOn: 'error' }).rotate().toColourspace('srgb');
  let lgInfo;
  try {
    lgInfo = await base.clone().resize({ width: 2560, withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toFile(resolve(dir, `${id}-lg.webp`));
    await base.clone().resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 80, effort: 4 }).toFile(resolve(dir, `${id}-sm.webp`));
  } catch {
    await Promise.all(['lg', 'sm'].map((s) => fs.rm(resolve(dir, `${id}-${s}.webp`), { force: true })));
    throw httpError(415, 'That image could not be processed.');
  }
  const photo = {
    lg: `/uploads/${slug}/${id}-lg.webp`,
    sm: `/uploads/${slug}/${id}-sm.webp`,
    focal: [0.5, 0.5],
    alt: '',
    w: lgInfo.width,
    h: lgInfo.height,
  };
  queueDepth(slug, id);
  return photo;
}

/** MP3: an ID3v2 tag or an MPEG audio frame sync at the start, and a second frame sync later. */
function looksLikeMp3(b) {
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
  const { fields, file } = await readMultipart(req);
  const kind = fields.kind === 'audio' ? 'audio' : 'image';
  const out = kind === 'audio' ? await saveAudio(req.params.slug, file.buffer) : await saveImage(req.params.slug, file.buffer);
  console.info(`[admin] upload ${kind} slug=${req.params.slug} bytes=${file.size}`);
  res.status(201).json(out);
}
