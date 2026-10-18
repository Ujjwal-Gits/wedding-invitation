// The primary way to pay (docs/PAYMENTS.md): order first, then pay by scanning a QR code, then upload a screenshot
// that the owner checks and confirms in the dashboard.
//   GET  /api/orders/:ref/pay?t=                 pay info for the customer (only their own order)
//   GET  /api/orders/:ref/qr/:method.png?t=      a per-order QR (amount + remark inside where the format allows)
//   POST /api/orders/:ref/proof?t=               a payment screenshot (multipart), at most 3 per order
//   GET  /api/admin/orders/:id/proof/:n          the screenshot, admin only, never cached
//   POST /api/admin/pay/qr                       the admin uploads/replaces a method's QR image
// Screenshots live in data/proofs/<order id>/ (never under public/, dist/ or uploads/), re-encoded as JPEG with
// every bit of metadata (EXIF, GPS) dropped.
import { promises as fs, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { IS_PROD, DIST_DIR, ROOT_DIR, UPLOAD_DIR } from '../env.js';
import { getDoc, putDoc } from '../store.js';
import { rateLimiter, originAllowed, clientIp } from '../security.js';
import { readSite, publicMethods, setMethodDescriber, QR_URL_RE } from '../site.js';
import { readMultipart, receiving, withSlot, looksLikeHeic } from '../uploads.js';
import {
  orderByRefAndToken, orderForCustomer, getOrder, mutateOrder, planView, whatsappFor, historyAdd, clean, PROOF_DIR, ID_RE,
} from '../orders.js';
import { orderMarket } from '../market.js';
import { payments } from './routes.js';
import { decodeQr, cleanQrImage, buildPayload, detectFormat, fillRemark, qrPng, REMARK_MAX, PRINTABLE_RE } from './qr.js';

export const MAX_PROOFS = 3;
export const PROOF_MAX_BYTES = 8 * 1024 * 1024;
const MAX_PIXELS = 60_000_000;
export const SITE_QR_DIR = resolve(UPLOAD_DIR, '_site', 'pay');
const httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });
const NOT_FOUND = 'We could not find this order. Check the link you were sent.';

// Per IP: reading pay info and QR images (a page shows ~5 images), proofs per IP and per order, QR uploads.
const devX = IS_PROD ? 1 : 20;
const infoLimit = rateLimiter({ windowMs: 10 * 60 * 1000, max: 300 * devX });
const proofIpLimit = rateLimiter({ windowMs: 60 * 60 * 1000, max: 10 * devX });
const proofOrderLimit = rateLimiter({ windowMs: 60 * 60 * 1000, max: 20 });
const qrUploadLimit = rateLimiter({ windowMs: 60 * 60 * 1000, max: 60 });

function limited(lim, key, res) {
  const r = lim.hit(key);
  if (r.ok) return false;
  res.set('Retry-After', String(r.retryAfter));
  res.status(429).json({ error: 'Too many tries. Please wait a little and try again.' });
  return true;
}

/** The customer's order from :ref and ?t=, or null after answering 404 (wrong token = unknown order). */
async function customerOrder(req, res) {
  res.set('Cache-Control', 'private, no-store');
  res.set('Referrer-Policy', 'no-referrer');
  const t = typeof req.query.t === 'string' ? req.query.t : '';
  // The pay token, or (no token) the signed-in customer account that placed the order.
  const o = t || req.session?.role !== 'customer' ? await orderByRefAndToken(req.params.ref, t) : await orderForCustomer(req.params.ref, req.customer?.id);
  if (!o) { res.status(404).json({ error: NOT_FOUND }); return null; }
  return o;
}

// ── QR payloads: the shipped defaults are decoded from their images once; uploads are recorded when uploaded ──

const defaultPayloads = new Map();
async function defaultPayload(url) {
  if (defaultPayloads.has(url)) return defaultPayloads.get(url);
  const rel = url.replace(/^\//, '');
  const file = [resolve(DIST_DIR, rel), resolve(ROOT_DIR, 'public', rel)].find((f) => existsSync(f));
  let payload = null;
  if (file) { try { payload = (await decodeQr(await fs.readFile(file)))?.text || null; } catch { payload = null; } }
  defaultPayloads.set(url, payload);
  return payload;
}
const uploadedPayloads = async () => (await getDoc('payqr'))?.value || {};

/** The payload inside a method's QR image, or null. */
export async function payloadFor(url) {
  if (!url || !QR_URL_RE.test(url)) return null;
  if (url.startsWith('/site/')) return defaultPayload(url);
  return (await uploadedPayloads())[url]?.payload || null;
}

/** What a method's QR can do: { format, label, decoded, canAuto, autoDefault, dynamic }. */
async function qrInfo(m) {
  if (m.kind === 'paypal' && m.paypalMe) {
    return { format: 'paypalme', label: 'PayPal.me link', decoded: true, canAuto: true, autoDefault: true, dynamic: m.autoAmount === true };
  }
  const payload = await payloadFor(m.qr);
  const f = detectFormat(payload);
  return { format: f.format, label: f.label, decoded: Boolean(payload), canAuto: f.canAuto, autoDefault: f.autoDefault, dynamic: m.autoAmount === true && f.canAuto };
}
setMethodDescriber(async (methods) => Promise.all(methods.map(async (m) => ({ ...m, qrInfo: await qrInfo(m) }))));

// ── Customer: pay info, QR, proof ─────────────────────────────────────────

const amountIn = (order, currency) => (currency === 'USD' ? order.amount?.usd : order.amount?.npr) ?? null;
const remarkOf = (order, site) => fillRemark(site.payRemark, { ref: order.ref, plan: order.planName, name: order.name });
const statusOf = (o) => o.pay?.status || (o.payment?.status === 'paid' ? 'confirmed' : 'awaiting_payment');

/** The PayPal payment as the customer's receipt: status, transaction number, amount, when, test or real. */
function paypalReceipt(o) {
  const p = o.payment;
  if (!p || p.provider !== 'paypal' || !['paid', 'partially_refunded', 'refunded', 'pending'].includes(p.status)) return null;
  return { status: p.status, transactionId: p.captureId || null, amount: p.amount, currency: p.currency, paidAt: p.paidAt || null, test: p.env !== 'live' };
}

/** GET /api/orders/:ref/pay?t= */
export async function payInfo(req, res) {
  if (limited(infoLimit, clientIp(req), res)) return;
  const o = await customerOrder(req, res);
  if (!o) return;
  const site = await readSite();
  const remark = remarkOf(o, site);
  const tq = `?t=${typeof req.query.t === 'string' ? encodeURIComponent(req.query.t) : ''}`; // empty t: the customer's session
  const paymentMethods = await Promise.all(publicMethods(site).map(async (pm) => {
    const m = site.paymentMethods.find((x) => x.id === pm.id);
    const amount = amountIn(o, m.currency);
    const base = await payloadFor(m.qr);
    const built = buildPayload(base, m, { amount, remark });
    const hasCode = Boolean(m.qr || built.payload);
    return { ...pm, amount, remark, remarkMax: REMARK_MAX, dynamic: built.dynamic, qr: hasCode ? `/api/orders/${o.ref}/qr/${m.id}.png${tq}` : null, staticQr: m.qr || null };
  }));
  const status = statusOf(o);
  const proofs = (o.pay?.proofs || []).map((p) => ({ n: p.n, at: p.at, method: p.method, amountPaid: p.amountPaid }));
  res.json({
    ref: o.ref, status, reason: status === 'rejected' ? o.pay?.reason || null : null,
    plan: planView(o), amount: o.amount || { npr: null, usd: null }, name: o.name, market: orderMarket(o), ...(o.enquiry ? { enquiry: true } : {}),
    ...(o.weddingDate ? { weddingDate: o.weddingDate } : {}), createdAt: o.at,
    proofs, maxProofs: MAX_PROOFS,
    canUpload: !['confirmed', 'refunded', 'comped'].includes(status) && proofs.length < MAX_PROOFS, // comped: free access, nothing to pay
    remark, paymentMethods,
    paypalCheckout: { enabled: Boolean(payments.config.enabled && o.kind === 'order' && o.amount?.usd && status !== 'comped') },
    paypal: paypalReceipt(o),
    whatsapp: whatsappFor(o, site),
  });
}

/** GET /api/orders/:ref/qr/:file (file = <method id>.png) ?t=&remark= */
export async function payQr(req, res) {
  if (limited(infoLimit, clientIp(req), res)) return;
  const m0 = /^([a-z0-9-]{1,32})\.png$/.exec(req.params.file || '');
  if (!m0) return res.status(404).json({ error: 'Not found.' });
  let remarkIn = null;
  if (req.query.remark !== undefined) {
    if (typeof req.query.remark !== 'string' || !PRINTABLE_RE.test(req.query.remark) || req.query.remark.trim().length > REMARK_MAX) {
      return res.status(400).json({ error: `The remark can have at most ${REMARK_MAX} plain letters, digits and spaces.` });
    }
    remarkIn = req.query.remark.replace(/\s+/g, ' ').trim();
  }
  const o = await customerOrder(req, res);
  if (!o) return;
  const site = await readSite();
  const m = site.paymentMethods.find((x) => x.id === m0[1] && x.enabled !== false);
  if (!m) return res.status(404).json({ error: 'Not found.' });
  const remark = remarkIn || remarkOf(o, site);
  const built = buildPayload(await payloadFor(m.qr), m, { amount: amountIn(o, m.currency), remark });
  if (!built.dynamic && m.qr) return res.redirect(302, m.qr); // the static code, as uploaded
  if (!built.payload) return res.status(404).json({ error: 'This payment method has no QR code.' });
  const png = await qrPng(built.payload);
  res.set('Content-Type', 'image/png');
  res.set('Content-Disposition', `inline; filename="nimtto-${o.ref}-${m.id}.png"`);
  res.send(png);
}

/**
 * The pixel count an iPhone HEIC declares (the largest 'ispe' image-size box in its header), or 0 when none is found.
 * Read before decoding: heic-convert decodes the whole image in memory, so a huge declared size is refused first.
 */
export function heicPixels(buffer) {
  let max = 0;
  const head = buffer.subarray(0, Math.min(buffer.length, 1024 * 1024)); // the meta box sits at the start
  for (let i = head.indexOf('ispe', 4, 'latin1'); i >= 4 && i + 16 <= head.length; i = head.indexOf('ispe', i + 4, 'latin1')) {
    const w = head.readUInt32BE(i + 8);
    const h = head.readUInt32BE(i + 12);
    if (w > 0 && h > 0) max = Math.max(max, w * h);
  }
  return max;
}
const HEIC_BAD = 'That iPhone photo could not be read. Please send a screenshot (PNG or JPEG) instead.';

/** Decodes and re-encodes an uploaded image (by its bytes, not its name) into a metadata-free JPEG. */
export async function proofImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length > PROOF_MAX_BYTES) throw httpError(413, 'That file is larger than 8 MB.');
  const heic = looksLikeHeic(buffer);
  if (heic) {
    const px = heicPixels(buffer);
    if (!px) throw httpError(415, HEIC_BAD);
    if (px > MAX_PIXELS) throw httpError(413, 'That photo has too many pixels. Please send a screenshot instead.');
  }
  // one image slot for the whole job, the HEIC conversion included (it is the heaviest part)
  return withSlot(async () => {
    let input = buffer;
    if (heic) {
      try {
        const { default: convert } = await import('heic-convert');
        input = Buffer.from(await convert({ buffer, format: 'JPEG', quality: 0.9 }));
      } catch {
        throw httpError(415, HEIC_BAD);
      }
    }
    let meta;
    try { meta = await sharp(input, { limitInputPixels: MAX_PIXELS, failOn: 'error' }).metadata(); } catch { meta = null; }
    if (!meta || !['jpeg', 'png', 'webp'].includes(meta.format) || !meta.width || !meta.height) {
      throw httpError(415, 'Please upload a screenshot or photo (JPEG, PNG, WebP or iPhone HEIC).');
    }
    const base = sharp(input, { limitInputPixels: MAX_PIXELS, failOn: 'error' }).rotate().flatten({ background: '#ffffff' }).toColourspace('srgb');
    // .jpeg() without withMetadata(): no EXIF, GPS, XMP or ICC profile is written
    const [full, thumb] = await Promise.all([
      base.clone().resize({ width: 2000, height: 2400, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85, mozjpeg: true }).toBuffer({ resolveWithObject: true }),
      base.clone().resize({ width: 480, height: 640, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toBuffer(),
    ]);
    return { full: full.data, thumb, w: full.info.width, h: full.info.height };
  });
}

/** POST /api/orders/:ref/proof?t= (multipart: file, method, amountPaid, note?) */
export async function submitProof(req, res) {
  res.set('Cache-Control', 'private, no-store');
  if (!originAllowed(req)) return res.status(403).json({ error: 'Cross-site request refused.' });
  if (limited(proofIpLimit, clientIp(req), res)) return;
  const len = Number(req.get('content-length') || 0);
  if (len > PROOF_MAX_BYTES + 64 * 1024) { res.set('Connection', 'close'); return res.status(413).json({ error: 'That file is larger than 8 MB.' }); }
  const o = await customerOrder(req, res);
  if (!o) return;
  if (limited(proofOrderLimit, o.id, res)) return;
  const status = statusOf(o);
  if (status === 'confirmed' || status === 'refunded') return res.status(409).json({ error: 'This order is already paid. Thank you!' });
  if (status === 'comped') return res.status(409).json({ error: 'There is nothing to pay for this order.' });
  if ((o.pay?.proofs || []).length >= MAX_PROOFS) return res.status(409).json({ error: 'We already have 3 screenshots for this order. Please message us on WhatsApp.' });

  let parsed;
  try {
    parsed = await receiving.run(() => readMultipart(req, { maxBytes: PROOF_MAX_BYTES, fields: 4, fieldSize: 400 }));
  } catch (err) {
    if (err.status === 503 || err.status === 413) res.set('Connection', 'close');
    throw err;
  }
  const { fields, file } = parsed;
  const site = await readSite();
  const method = site.paymentMethods.find((m) => m.id === fields.method);
  const amountPaid = clean(fields.amountPaid, 33);
  const note = clean(fields.note, 301, true);
  const bad = [];
  if (!method) bad.push('method');
  if (!amountPaid || amountPaid.length > 32) bad.push('amountPaid');
  if (note.length > 300) bad.push('note');
  if (bad.length) return res.status(400).json({ error: 'Please say how you paid and how much.', fields: bad });

  const img = await proofImage(file.buffer);
  const dir = resolve(PROOF_DIR, o.id);
  await fs.mkdir(dir, { recursive: true });
  const name = randomBytes(12).toString('base64url');
  const fileName = `${name}.jpg`;
  const thumbName = `${name}-sm.jpg`;
  await Promise.all([fs.writeFile(resolve(dir, fileName), img.full, { mode: 0o600 }), fs.writeFile(resolve(dir, thumbName), img.thumb, { mode: 0o600 })]);
  let saved;
  try {
    saved = await mutateOrder(o.id, (x) => {
      const pay = x.pay || (x.pay = { status: 'awaiting_payment', reason: null, proofs: [], history: [] });
      if (pay.status === 'confirmed' || pay.status === 'refunded') throw httpError(409, 'This order is already paid. Thank you!');
      if (pay.status === 'comped') throw httpError(409, 'There is nothing to pay for this order.');
      if (pay.proofs.length >= MAX_PROOFS) throw httpError(409, 'We already have 3 screenshots for this order. Please message us on WhatsApp.');
      const n = pay.proofs.reduce((a, p) => Math.max(a, p.n), 0) + 1;
      pay.proofs.push({ n, at: new Date().toISOString(), method: method.id, methodLabel: method.label, currency: method.currency, amountPaid, ...(note ? { note } : {}), file: fileName, thumb: thumbName, w: img.w, h: img.h });
      pay.status = 'proof_submitted';
      pay.reason = null;
      historyAdd(pay, 'proof_submitted', 'customer', `screenshot ${n} (${method.label}, ${amountPaid})`);
    });
  } catch (err) {
    await Promise.all([fileName, thumbName].map((f) => fs.rm(resolve(dir, f), { force: true })));
    throw err;
  }
  console.info(`[pay] proof ref=${o.ref} n=${saved.pay.proofs.length} method=${method.id} bytes=${file.size}`);
  res.status(201).json({ ok: true, status: saved.pay.status, proofs: saved.pay.proofs.length });
}

// ── Admin ─────────────────────────────────────────────────────────────────

/** GET /api/admin/orders/:id/proof/:n(?size=sm) */
export async function adminProof(req, res) {
  res.set('Cache-Control', 'private, no-store');
  const { id } = req.params;
  const n = Number(req.params.n);
  if (!ID_RE.test(id) || !Number.isInteger(n) || n < 1 || n > 99) return res.status(404).json({ error: 'Not found.' });
  const o = await getOrder(id);
  const p = o?.pay?.proofs?.find((x) => x.n === n);
  const file = req.query.size === 'sm' ? p?.thumb : p?.file;
  if (!file || !/^[A-Za-z0-9_-]{16}(?:-sm)?\.jpg$/.test(file)) return res.status(404).json({ error: 'Not found.' });
  res.set('Content-Type', 'image/jpeg');
  res.set('Content-Disposition', `inline; filename="${o.ref || o.id}-payment-${n}.jpg"`);
  res.sendFile(resolve(PROOF_DIR, id, file), { dotfiles: 'deny', headers: { 'Cache-Control': 'private, no-store' }, lastModified: false }, (err) => {
    if (err && !res.headersSent) res.status(err.statusCode === 404 || err.code === 'ENOENT' ? 404 : 500).json({ error: 'Not found.' });
  });
}

/** POST /api/admin/pay/qr (multipart: file): a new QR image for a payment method. */
export async function uploadQr(req, res) {
  if (limited(qrUploadLimit, 'admin', res)) return;
  const len = Number(req.get('content-length') || 0);
  if (len > PROOF_MAX_BYTES + 64 * 1024) { res.set('Connection', 'close'); return res.status(413).json({ error: 'That file is larger than 8 MB.' }); }
  const { file } = await receiving.run(() => readMultipart(req, { maxBytes: PROOF_MAX_BYTES, fields: 2 }));
  let meta;
  try { meta = await sharp(file.buffer, { limitInputPixels: MAX_PIXELS, failOn: 'error' }).metadata(); } catch { meta = null; }
  if (!meta || !['jpeg', 'png', 'webp'].includes(meta.format)) throw httpError(415, 'Please upload a screenshot of the QR code (PNG, JPEG or WebP).');
  const out = await withSlot(() => cleanQrImage(file.buffer));
  await fs.mkdir(SITE_QR_DIR, { recursive: true });
  const id = randomBytes(18).toString('base64url');
  await fs.writeFile(resolve(SITE_QR_DIR, `${id}.png`), out.png, { mode: 0o644 });
  const url = `/uploads/_site/pay/${id}.png`;
  if (out.payload) {
    const cur = await uploadedPayloads();
    const next = Object.fromEntries([...Object.entries(cur), [url, { payload: out.payload, at: new Date().toISOString() }]].slice(-60));
    await putDoc('payqr', next);
  }
  const f = detectFormat(out.payload);
  console.info(`[admin] payment QR uploaded format=${f.format} cropped=${out.cropped}`);
  res.status(201).json({ qr: url, decoded: Boolean(out.payload), cropped: out.cropped, qrInfo: { format: f.format, label: f.label, decoded: Boolean(out.payload), canAuto: f.canAuto, autoDefault: f.autoDefault } });
}
