// The watermark tile of the public design previews (src/core/showcase.js), shared with the studio's Branding sample
// (Website → Branding) so both draw exactly the same thing.
//   op    0-100: the logo's strength (60 = the original look: white at 60 % with a thin outline)
//   img   a data: URL of an uploaded watermark logo, drawn in place of the traced Nimtto logo ('' = the traced logo)
//   intl  the International website's deep sage outline instead of the plum one
import TILE_SVG from './showcase-tile.svg?raw';

export const OP_DEFAULT = 60;
export const BRAND_URL = /^\/uploads\/_site\/brand\/[A-Za-z0-9_-]{24}\.(?:svg|png|webp)$/;
export const opOf = (v) => { const n = Number.parseInt(v, 10); return Number.isInteger(n) && n >= 0 && n <= 100 ? n : OP_DEFAULT; };
const r3 = (x) => String(Math.round(Math.max(0, Math.min(1, x)) * 1000) / 1000);
const TEXT_RE = /<text[\s\S]*?<\/text>/;

/** The tile as SVG markup. */
export function tileSvg({ op = OP_DEFAULT, img = '', intl = false } = {}) {
  const a = opOf(op) / 100;
  const text = (TILE_SVG.match(TEXT_RE) || [''])[0]
    .replace('fill-opacity="0.66"', `fill-opacity="${r3(a * 1.1)}"`).replace('stroke-opacity="0.4"', `stroke-opacity="${r3((a * 2) / 3)}"`);
  const svg = img
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="260" viewBox="0 0 420 260"><g transform="translate(210 130) rotate(-16)"><image href="${img.replace(/"/g, '%22')}" x="-110" y="-36" width="220" height="54" preserveAspectRatio="xMidYMid meet" opacity="${r3(a)}"/>${text}</g></svg>`
    : TILE_SVG.replace(TEXT_RE, text).replace('fill-opacity="0.6"', `fill-opacity="${r3(a)}"`).replace('stroke-opacity="0.5"', `stroke-opacity="${r3((a * 5) / 6)}"`);
  return svg.replaceAll('#2A1A1D', intl ? '#1F3A2A' : '#2A1A1D');
}

/** The tile as a CSS url(), ready for background-image. */
export const tileUrl = (o) => `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(tileSvg(o))}")`;

/** An uploaded logo as a data: URL (an SVG used as a background cannot load another URL itself). */
export function logoDataUrl(url, fetcher = window.fetch.bind(window)) {
  if (!BRAND_URL.test(url || '')) return Promise.reject(new Error('not a logo'));
  return fetcher(url, { credentials: 'same-origin' })
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('logo'))))
    .then((b) => new Promise((ok, fail) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result)); fr.onerror = fail; fr.readAsDataURL(b); }))
    .then((d) => (/^data:image\/(?:svg\+xml|png|webp)/.test(d) ? d : Promise.reject(new Error('logo'))));
}
