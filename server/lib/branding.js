// Branding (Studio → Website → Branding; permission 'website'): the watermark's opacity on the public design
// previews (src/core/showcase.js) and three optional logos, stored in the site settings (lib/site.js `branding`):
//   branding = { wmOpacity: 0-100, logos: { watermark, site, intl } }   '' = the bundled file
//     watermark  the logo tiled over the watermarked previews (else the traced Nimtto logo, src/core/showcase-tile.svg)
//     site       the header and footer logo of both websites, the studio's brand mark and the preview badge
//     intl       the International website's logo (else `site`, else the bundled sage logo)
// A logo is uploaded first (POST /api/admin/brand/logo), then chosen by saving the settings with its URL. Every
// upload gets a new random name, so a URL is a version: it is served immutable and a replaced logo shows at once.
// Uploads: PNG or WebP (decoded and re-encoded by sharp, metadata stripped) or SVG (rebuilt from a strict allowlist
// below: no script, no event handlers, no foreign objects, no external references), at most 1 MB.
import sanitizeHtml from 'sanitize-html';
import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { UPLOAD_DIR } from './env.js';
import { readMultipart, receiving, withSlot } from './uploads.js';
import { rateLimiter } from './security.js';

export const BRAND_DIR = resolve(UPLOAD_DIR, '_site', 'brand');
export const BRAND_URL_RE = /^\/uploads\/_site\/brand\/[A-Za-z0-9_-]{24}\.(?:svg|png|webp)$/;
export const BRAND_FILE_RE = /^[A-Za-z0-9_-]{24}\.(?:svg|png|webp)$/;
export const LOGO_KINDS = ['watermark', 'site', 'intl'];
export const WM_OPACITY_DEFAULT = 60; // the look the previews had before this setting: the tile's logo at 60 %
export const LOGO_MAX_BYTES = 1024 * 1024;
const MAX_SIDE = 1600;

export const defaultBranding = () => ({ wmOpacity: WM_OPACITY_DEFAULT, logos: { watermark: '', site: '', intl: '' } });

/** The stored value with every part present (anything odd reads as the default). */
export function brandingOf(b) {
  const d = defaultBranding();
  if (!b || typeof b !== 'object') return d;
  if (Number.isInteger(b.wmOpacity) && b.wmOpacity >= 0 && b.wmOpacity <= 100) d.wmOpacity = b.wmOpacity;
  for (const k of LOGO_KINDS) if (typeof b.logos?.[k] === 'string' && BRAND_URL_RE.test(b.logos[k])) d.logos[k] = b.logos[k];
  return d;
}

/** Validates `branding` from PUT /api/site; fail(path, message) collects the errors as lib/site.js does. */
export function cleanBranding(input, fail) {
  const out = defaultBranding();
  if (input == null) return out;
  if (typeof input !== 'object' || Array.isArray(input)) { fail('branding', 'must be an object'); return out; }
  const op = input.wmOpacity;
  if (op != null && op !== '') {
    if (typeof op === 'number' && Number.isInteger(op) && op >= 0 && op <= 100) out.wmOpacity = op;
    else fail('branding.wmOpacity', 'must be a whole number from 0 to 100');
  }
  const logos = input.logos == null ? {} : input.logos;
  if (typeof logos !== 'object' || Array.isArray(logos)) { fail('branding.logos', 'must be an object'); return out; }
  for (const k of Object.keys(logos)) if (!LOGO_KINDS.includes(k)) fail(`branding.logos.${k.slice(0, 20)}`, 'is not a logo slot');
  for (const k of LOGO_KINDS) {
    const v = logos[k];
    if (v == null || v === '') continue;
    if (typeof v === 'string' && BRAND_URL_RE.test(v)) out.logos[k] = v;
    else fail(`branding.logos.${k}`, 'must be an uploaded logo');
  }
  return out;
}

/** The public part (GET /api/site, the preview pages): which logos to show and the watermark's opacity. */
export function publicBranding(b) {
  const x = brandingOf(b);
  return { wmOpacity: x.wmOpacity, logos: { watermark: x.logos.watermark, site: x.logos.site, intl: x.logos.intl || x.logos.site } };
}

/* ---------------- SVG: rebuilt from an allowlist ---------------- */

const SVG_TAGS = ['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'title', 'desc',
  'defs', 'use', 'symbol', 'clipPath', 'mask', 'linearGradient', 'radialGradient', 'stop', 'pattern', 'style', 'image'];
const PRESENTATION = ['id', 'class', 'style', 'transform', 'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity',
  'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'opacity', 'clip-path', 'clip-rule',
  'mask', 'color', 'display', 'visibility', 'paint-order', 'vector-effect', 'shape-rendering', 'font-family', 'font-size', 'font-weight',
  'font-style', 'letter-spacing', 'text-anchor', 'dominant-baseline', 'stop-color', 'stop-opacity'];
const GEOMETRY = ['x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'fx', 'fy', 'width', 'height', 'd', 'points', 'dx', 'dy',
  'viewBox', 'preserveAspectRatio', 'offset', 'gradientUnits', 'gradientTransform', 'spreadMethod', 'patternUnits', 'patternContentUnits',
  'patternTransform', 'clipPathUnits', 'maskUnits', 'maskContentUnits', 'href', 'xlink:href', 'xmlns', 'xmlns:xlink', 'version'];
const ATTRS = new Set([...PRESENTATION, ...GEOMETRY]);
const DATA_IMAGE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/;
// CSS (a style attribute or a <style> element): no external references or old script hooks; url() only to an id
const BAD_CSS = /@import|@font-face|@namespace|expression\s*\(|javascript:|behavior\s*:|-moz-binding|\\|<\//i;
const badUrl = (v) => /url\s*\(/i.test(v) && /url\s*\(\s*(?!['"]?#)/i.test(v);

/** A safe copy of an SVG document, or throws a 415 with the reason. */
export function sanitizeSvg(text) {
  let s = String(text || '').replace(/^﻿/, '');
  if (/<!ENTITY|<!\[CDATA\[[\s\S]*?<script/i.test(s)) throw httpError(415, 'That SVG declares entities, which logos never need. Please export it again as plain SVG.');
  s = s.replace(/<\?xml[\s\S]*?\?>/gi, '').replace(/<!DOCTYPE[^>[]*(\[[\s\S]*?\])?\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  if (!/^<svg[\s>]/i.test(s)) throw httpError(415, 'That file is not an SVG logo.');
  let styleBad = false;
  const out = sanitizeHtml(s, {
    parser: { xmlMode: true, lowerCaseTags: false, lowerCaseAttributeNames: false, recognizeSelfClosing: true },
    allowedTags: SVG_TAGS,
    allowedAttributes: { '*': [...ATTRS] },
    allowVulnerableTags: true, // <style>: checked below (BAD_CSS), and the file is only ever shown by <img> or with a CSP
    allowedSchemes: [], allowedSchemesAppliedToAttributes: [], allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    nonTextTags: ['script', 'textarea', 'option', 'noscript', 'foreignObject', 'iframe', 'object', 'embed'],
    transformTags: {
      '*': (tag, attribs) => {
        const a = {};
        for (const [k, v0] of Object.entries(attribs)) {
          const v = String(v0);
          if (/^on/i.test(k) || /javascript:|vbscript:|data:text/i.test(v)) continue;
          if (k === 'href' || k === 'xlink:href') {
            if (/^#[A-Za-z_][\w.-]{0,80}$/.test(v) && tag !== 'image') a[k] = v;
            else if (tag === 'image' && DATA_IMAGE.test(v) && v.length < 900_000) a[k] = v.replace(/\s+/g, '');
            continue;
          }
          if (k === 'style' && (BAD_CSS.test(v) || badUrl(v))) continue;
          if (badUrl(v)) continue;
          a[k] = v;
        }
        return { tagName: tag, attribs: a };
      },
    },
    exclusiveFilter: (frame) => {
      if (frame.tag === 'style' && (BAD_CSS.test(frame.text) || badUrl(frame.text))) { styleBad = true; return true; }
      return frame.tag === 'image' && !frame.attribs.href && !frame.attribs['xlink:href'];
    },
    textFilter: (t) => t,
  });
  if (!/^<svg[\s>]/.test(out) || !/<\/svg>\s*$/.test(out)) throw httpError(415, 'That SVG could not be read. Please export it again as plain SVG.');
  if (!/\bviewBox="[\d.\s,-]+"/.test(out) && !/\bwidth="[\d.]+(?:px)?"/.test(out)) throw httpError(415, 'That SVG has no size (viewBox). Please export it again with a viewBox.');
  if (!/<(?:path|rect|circle|ellipse|polygon|polyline|line|text|image|use)\b/.test(out)) throw httpError(415, 'That SVG has nothing to draw.');
  const svg = /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(out) ? out : out.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  return { svg, styleDropped: styleBad };
}

/* ---------------- upload and serving ---------------- */

const httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });
const uploadLimit = rateLimiter({ windowMs: 60 * 60 * 1000, max: 40 });

const looksSvg = (buf) => /^\s*(?:<\?xml[\s\S]{0,200}?\?>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(buf.subarray(0, 4096).toString('utf8').replace(/^﻿/, ''));

/** POST /api/admin/brand/logo (multipart: file): stores a logo and answers { url, format, width?, height? }. */
export async function uploadLogo(req, res) {
  const hit = uploadLimit.hit('admin');
  if (!hit.ok) {
    res.set('Retry-After', String(hit.retryAfter));
    return res.status(429).json({ error: 'Too many logo uploads in the last hour. Please wait a little and try again.' });
  }
  const len = Number(req.get('content-length') || 0);
  if (len > LOGO_MAX_BYTES + 64 * 1024) { res.set('Connection', 'close'); return res.status(413).json({ error: 'That logo is larger than 1 MB.' }); }
  const { file } = await receiving.run(() => readMultipart(req, { maxBytes: LOGO_MAX_BYTES, fields: 2 }));
  const { body, ext, info } = await processLogo(file.buffer);
  await fs.mkdir(BRAND_DIR, { recursive: true });
  const id = randomBytes(18).toString('base64url');
  await fs.writeFile(resolve(BRAND_DIR, `${id}.${ext}`), body, { mode: 0o644 });
  console.info(`[admin] brand logo uploaded format=${ext}`);
  res.status(201).json({ url: `/uploads/_site/brand/${id}.${ext}`, format: ext, ...info });
}

/** The bytes to store for an uploaded logo: { body, ext, info }. Throws 415 for anything that is not a logo. */
export async function processLogo(buf) {
  if (looksSvg(buf)) {
    let text;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch { throw httpError(415, 'That SVG is not UTF-8 text.'); }
    const { svg, styleDropped } = sanitizeSvg(text);
    return { body: Buffer.from(svg, 'utf8'), ext: 'svg', info: styleDropped ? { note: 'Some styling with external references was removed.' } : {} };
  }
  let meta;
  try { meta = await sharp(buf, { limitInputPixels: 40_000_000, failOn: 'error' }).metadata(); } catch { meta = null; }
  if (!meta || !['png', 'webp'].includes(meta.format)) throw httpError(415, 'Please upload the logo as SVG, PNG or WebP.');
  const out = await withSlot(() => {
    const img = sharp(buf, { limitInputPixels: 40_000_000, failOn: 'error' }).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true });
    return (meta.format === 'png' ? img.png({ compressionLevel: 9 }) : img.webp({ quality: 92, alphaQuality: 100 })).toBuffer({ resolveWithObject: true });
  });
  return { body: out.data, ext: meta.format, info: { width: out.info.width, height: out.info.height } };
}

/** GET /uploads/_site/brand/<id>.<svg|png|webp>: immutable (the name is the version); an SVG cannot run anything. */
export function serveLogo(req, res, next) {
  const name = req.params[0];
  if (!BRAND_FILE_RE.test(name)) return next();
  const headers = {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
    'Cross-Origin-Resource-Policy': 'same-origin',
  };
  res.sendFile(resolve(BRAND_DIR, name), { dotfiles: 'deny', headers }, (err) => {
    if (err && !res.headersSent) res.status(404).end();
  });
}
