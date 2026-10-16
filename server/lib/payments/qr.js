// Payment QR codes (manual pay flow, docs/PAYMENTS.md):
//   - read the payload of a QR image (zxing-wasm; its .wasm is loaded from node_modules, never from a CDN),
//   - recognise the format (EMVCo merchant QR as used by NepalPay/Fonepay bank codes, the eSewa/Khalti personal
//     JSON codes, PayPal links),
//   - build a per-order code with the amount and a remark where the format supports it,
//   - clean an uploaded screenshot down to just the code (a white quiet zone, square, crisp PNG).
// Only EMV and paypal.me links are spec-based, so only they fill the amount in by default. The wallets' personal
// JSON codes get amount/remarks keys only when the owner turns "Try auto-amount" on after testing with the app.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import QRCode from 'qrcode';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';

const require = createRequire(import.meta.url);
let zxingReady = false;
function zxing() {
  if (zxingReady) return;
  // The default would fetch the .wasm from jsDelivr at run time: load our own copy instead.
  const wasmBinary = readFileSync(require.resolve('zxing-wasm/reader/zxing_reader.wasm'));
  prepareZXingModule({ overrides: { wasmBinary }, fireImmediately: true });
  zxingReady = true;
}

// ── EMVCo merchant-presented QR (TLV: 2-digit tag, 2-digit length, value) ──

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) over the UTF-8 bytes, as 4 upper-case hex digits. */
export function crc16(str) {
  let crc = 0xffff;
  for (const byte of Buffer.from(str, 'utf8')) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** [{ tag, value }] or null when the string is not well-formed TLV. */
export function parseTlv(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const tag = s.slice(i, i + 2);
    const len = s.slice(i + 2, i + 4);
    if (!/^\d\d$/.test(tag) || !/^\d\d$/.test(len)) return null;
    const n = Number(len);
    if (i + 4 + n > s.length) return null;
    out.push({ tag, value: s.slice(i + 4, i + 4 + n) });
    i += 4 + n;
  }
  return out;
}

const tlv = (tag, value) => {
  if (value.length > 99) throw new Error(`EMV field ${tag} is longer than 99 characters`);
  return `${tag}${String(value.length).padStart(2, '0')}${value}`;
};

/** True for a well-formed EMV payload with a correct CRC. */
export function isEmv(s) {
  if (typeof s !== 'string' || !s.startsWith('000201')) return false;
  const t = parseTlv(s);
  if (!t || t.at(-1)?.tag !== '63' || t.at(-1).value.length !== 4) return false;
  return crc16(s.slice(0, -4)) === t.at(-1).value.toUpperCase();
}

/** An EMV amount: digits with an optional '.' and two decimals, at most 13 characters. */
export function emvAmount(n) {
  if (!Number.isFinite(n) || n <= 0) return null;
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return s.length <= 13 ? s : null;
}

/**
 * The EMV payload made dynamic: point of initiation 12, transaction amount (54) and the remark as the
 * reference label (62-05), CRC recomputed. Every other field is kept as it was.
 */
export function emvWithAmount(payload, { amount, remark }) {
  const fields = parseTlv(payload).filter((f) => f.tag !== '63');
  const map = new Map(fields.map((f) => [f.tag, f.value]));
  map.set('01', '12');
  const a = emvAmount(amount);
  if (a) map.set('54', a);
  if (remark) {
    const sub = parseTlv(map.get('62') || '') || [];
    const subs = new Map(sub.map((f) => [f.tag, f.value]));
    const room = 99 - [...subs].filter(([t]) => t !== '05').reduce((n, [, v]) => n + 4 + v.length, 0) - 4;
    const r = remark.slice(0, Math.min(25, room));
    if (r) subs.set('05', r);
    map.set('62', [...subs].sort(([x], [y]) => x.localeCompare(y)).map(([t, v]) => tlv(t, v)).join(''));
  }
  const ordered = [...map].sort(([x], [y]) => (x === '00' ? -1 : y === '00' ? 1 : x.localeCompare(y)));
  const body = `${ordered.map(([t, v]) => tlv(t, v)).join('')}6304`;
  return body + crc16(body);
}

// ── Formats ───────────────────────────────────────────────────────────────

const parseJson = (s) => { try { const v = JSON.parse(s); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch { return null; } };
const PAYPALME_RE = /^https?:\/\/(?:www\.)?(?:paypal\.me|paypal\.com\/paypalme)\/([A-Za-z0-9]{1,40})(?:\/[^?#]*)?\/?(?:[?#].*)?$/i;
export const PAYPALME_USER_RE = /^[A-Za-z0-9]{1,40}$/;

/**
 * What a payload is, and whether a per-order amount can go into it.
 * canAuto: the format has an amount field at all. autoDefault: we trust it without a test on a phone.
 */
export function detectFormat(payload) {
  if (typeof payload !== 'string' || !payload) return { format: 'none', canAuto: false, autoDefault: false, label: 'No readable code' };
  if (isEmv(payload)) {
    const t = parseTlv(payload);
    const nchl = t.some((f) => /^(2[6-9]|[3-4]\d|5[01])$/.test(f.tag) && /NCHL|fonepay/i.test(f.value));
    return { format: 'emv', canAuto: true, autoDefault: true, label: nchl ? 'NepalPay / Fonepay bank QR (EMV)' : 'EMV merchant QR' };
  }
  const j = parseJson(payload);
  if (j && 'eSewa_id' in j) return { format: 'esewa', canAuto: true, autoDefault: false, label: 'eSewa wallet QR' };
  if (j && Object.keys(j).some((k) => /^khalti_?id$/i.test(k))) return { format: 'khalti', canAuto: true, autoDefault: false, label: 'Khalti wallet QR' };
  if (j) return { format: 'json', canAuto: false, autoDefault: false, label: 'Wallet QR' };
  if (PAYPALME_RE.test(payload)) return { format: 'paypalme', canAuto: true, autoDefault: true, label: 'PayPal.me link' };
  if (/^https:\/\/(?:www\.)?paypal\.com\//i.test(payload)) return { format: 'paypal', canAuto: false, autoDefault: false, label: 'PayPal QR (no preset amount)' };
  if (/^https?:\/\//i.test(payload)) return { format: 'url', canAuto: false, autoDefault: false, label: 'Link' };
  return { format: 'text', canAuto: false, autoDefault: false, label: 'Text' };
}

// ── Remarks ───────────────────────────────────────────────────────────────

export const REMARK_MAX = 25; // EMV 62 sub-fields are at most 25 characters; the same cap everywhere keeps it simple
export const PRINTABLE_RE = /^[\x20-\x7E]*$/;

/** Printable ASCII only (accents dropped, anything else removed), single spaces, at most max characters. */
export function asciiRemark(s, max = REMARK_MAX) {
  return String(s ?? '').normalize('NFKD').replace(/\s+/g, ' ').replace(/[^\x20-\x7E]/g, '').replace(/ +/g, ' ').trim().slice(0, max).trim();
}

/** The remark template with {ref}, {plan} and {name} filled in, made safe for a QR. */
export function fillRemark(template, { ref, plan, name }) {
  const first = asciiRemark(String(name || '').split(/\s+/)[0], 20);
  const s = String(template || 'Nimtto {ref}').replace(/\{(ref|plan|name)\}/g, (_, k) => ({ ref, plan: asciiRemark(plan, 20), name: first })[k] || '');
  return asciiRemark(s) || ref;
}

// ── Building a per-order payload ──────────────────────────────────────────

/**
 * The code to show for one method and order. Returns { payload, dynamic }: dynamic is true only when the
 * amount is inside the code. method: { autoAmount, paypalMe, currency }.
 */
export function buildPayload(basePayload, method, { amount, remark }) {
  const user = method.paypalMe && PAYPALME_USER_RE.test(method.paypalMe) ? method.paypalMe : null;
  if (user && method.kind === 'paypal') {
    if (!(amount > 0) || !method.autoAmount) return { payload: `https://www.paypal.com/paypalme/${user}`, dynamic: false };
    return { payload: `https://www.paypal.com/paypalme/${user}/${Number.isInteger(amount) ? amount : amount.toFixed(2)}${method.currency || 'USD'}`, dynamic: true };
  }
  const f = detectFormat(basePayload);
  if (!method.autoAmount || !f.canAuto || !(amount > 0)) return { payload: basePayload || null, dynamic: false };
  if (f.format === 'emv') return { payload: emvWithAmount(basePayload, { amount, remark }), dynamic: true };
  if (f.format === 'esewa' || f.format === 'khalti') {
    const j = parseJson(basePayload);
    return { payload: JSON.stringify({ ...j, amount: String(amount), remarks: remark }), dynamic: true };
  }
  if (f.format === 'paypalme') {
    const u = PAYPALME_RE.exec(basePayload)[1];
    return { payload: `https://www.paypal.com/paypalme/${u}/${Number.isInteger(amount) ? amount : amount.toFixed(2)}${method.currency || 'USD'}`, dynamic: true };
  }
  return { payload: basePayload, dynamic: false };
}

/** A crisp PNG QR (black on white, 4-module quiet zone), about 800 px. */
export function qrPng(text) {
  return QRCode.toBuffer(text, { type: 'png', errorCorrectionLevel: 'M', margin: 4, width: 800, color: { dark: '#000000', light: '#ffffff' } });
}

// ── Reading and cleaning QR images ───────────────────────────────────────

const MAX_PIXELS = 40_000_000;

async function rgba(input, maxSide) {
  const { data, info } = await sharp(input, { limitInputPixels: MAX_PIXELS, failOn: 'error' })
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize({ width: maxSide, height: maxSide, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function readFrom({ data, width, height }) {
  zxing();
  const res = await readBarcodes({ data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), width, height, colorSpace: 'srgb' },
    { formats: ['QRCode'], tryHarder: true, maxNumberOfSymbols: 1 });
  const r = res.find((x) => x.isValid && x.text);
  return r ? { text: r.text, position: r.position, version: Number(r.version) || 0 } : null;
}

/** The payload of the QR code in an image buffer, or null. */
export async function decodeQr(buffer) {
  return readFrom(await rgba(buffer, 1600));
}

/**
 * Just the code from an image (e.g. a phone screenshot): cropped to the symbol, a white quiet zone of 4+ modules,
 * square, scaled with nearest-neighbour to about 900 px, PNG. The crop must decode to the same payload, else the
 * whole image is kept (re-encoded). Returns { png, payload|null, cropped }.
 */
export async function cleanQrImage(buffer) {
  const img = await rgba(buffer, 1600);
  const found = await readFrom(img);
  const whole = async () => sharp(buffer, { limitInputPixels: MAX_PIXELS }).rotate().flatten({ background: '#ffffff' })
    .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
  if (!found) return { png: await whole(), payload: null, cropped: false };
  const p = found.position;
  const xs = [p.topLeft.x, p.topRight.x, p.bottomRight.x, p.bottomLeft.x];
  const ys = [p.topLeft.y, p.topRight.y, p.bottomRight.y, p.bottomLeft.y];
  const x0 = Math.min(...xs); const x1 = Math.max(...xs); const y0 = Math.min(...ys); const y1 = Math.max(...ys);
  const dim = found.version ? 17 + 4 * found.version : 25;
  const mod = Math.max(1, (x1 - x0) / dim);
  const raw = { raw: { width: img.width, height: img.height, channels: 4 } };
  for (const padMods of [0.15, 0, 0.5]) {
    const pad = Math.round(mod * padMods);
    const left = Math.max(0, Math.floor(x0 - pad)); const top = Math.max(0, Math.floor(y0 - pad));
    const right = Math.min(img.width, Math.ceil(x1 + pad + 1)); const bottom = Math.min(img.height, Math.ceil(y1 + pad + 1));
    const w = right - left; const h = bottom - top;
    if (w < 21 || h < 21) continue;
    const side = Math.max(w, h);
    const qz = Math.ceil(mod * 4.5);
    const total = side + 2 * qz;
    const k = Math.max(1, Math.round(900 / total));
    const target = total * k >= 700 && total * k <= 1100 ? total * k : 900;
    const sq = await sharp(img.data, raw).extract({ left, top, width: w, height: h })
      .extend({ top: qz + Math.floor((side - h) / 2), bottom: qz + Math.ceil((side - h) / 2), left: qz + Math.floor((side - w) / 2), right: qz + Math.ceil((side - w) / 2), background: '#ffffff' })
      .raw().toBuffer({ resolveWithObject: true });
    const png = await sharp(sq.data, { raw: { width: sq.info.width, height: sq.info.height, channels: sq.info.channels } })
      .resize(target, target, { kernel: 'nearest' }).removeAlpha().png({ compressionLevel: 9, palette: true, colors: 64, dither: 0 }).toBuffer();
    const again = await decodeQr(png);
    if (again?.text === found.text) return { png, payload: found.text, cropped: true };
  }
  return { png: await whole(), payload: found.text, cropped: false };
}
