// The studio's brand mark follows Website → Branding: the uploaded site logo (GET /api/site branding.logos.site),
// else the bundled Nimtto mark. setBrandLogo() is called after the Website page saves, so it changes at once.
import { h } from './dom.js';

const RE = /^\/uploads\/_site\/brand\/[A-Za-z0-9_-]{24}\.(?:svg|png|webp)$/;
const BUNDLED = '/site/brand/nimtto-mark.svg';
let custom = '';

const apply = (img) => {
  img.src = custom || BUNDLED;
  if (custom) img.dataset.custom = '1'; else delete img.dataset.custom;
  return img;
};

/** The brand mark image (the uploaded logo once it is known). */
export const brandMark = () => apply(h('img.brand__mark', { src: BUNDLED, alt: '', 'aria-hidden': 'true', width: 31, height: 28 }));

/** Shows this logo URL ('' = the bundled mark) in every brand mark on the page. */
export function setBrandLogo(url) {
  custom = RE.test(url || '') ? url : '';
  document.querySelectorAll('img.brand__mark').forEach(apply);
}

fetch('/api/site', { credentials: 'same-origin' })
  .then((r) => (r.ok ? r.json() : null))
  .then((s) => { if (s?.branding?.logos?.site) setBrandLogo(s.branding.logos.site); })
  .catch(() => { /* the bundled mark stays */ });
