// Loads the invitation data. With ?id=<slug> it comes from the studio server
// (/api/invitations/<slug>/public); otherwise the demo in src/config.js is used.
// Every theme must `await loadInvitation()` before rendering.
//
// Live preview (docs/PLATFORM.md): with ?preview=1 inside an iframe, the page asks the
// studio (same origin only) for the unsaved model first, tells it when the theme has
// rendered, and outlines the text the client just edited when asked.
import { config } from '../config.js';

const SLUG = /^[a-z0-9-]{3,64}$/;
const COLOR_NAME = /^--[a-z0-9-]+$/;
const COLOR_HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const PREVIEW_WAIT_MS = 1500;

const params = new URLSearchParams(location.search);
const inFrame = (() => { try { return window.parent !== window; } catch { return true; } })();
const PREVIEW = inFrame && params.get('preview') === '1';

/** The bundled demo music, kept before any invitation replaces the config (YouTube fallback). */
export const bundledTracks = structuredClone(config.music?.tracks ?? []);
const demo = structuredClone(config);

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const post = (msg) => { try { window.parent.postMessage(msg, location.origin); } catch { /* detached */ } };

function replaceConfig(data) {
  for (const key of Object.keys(config)) delete config[key];
  Object.assign(config, data);
}

/** The studio sends its raw draft model: fill the few things the public endpoint adds. */
function normalisePreview(data, id) {
  const out = structuredClone(data);
  for (const key of Object.keys(demo)) if (!(key in out)) out[key] = structuredClone(demo[key]);
  if (!isPlain(out.music)) out.music = structuredClone(demo.music);
  if (!Array.isArray(out.music.tracks) || !out.music.tracks.length) out.music.tracks = structuredClone(bundledTracks);
  if (isPlain(out.rsvp) && id && !out.rsvp.endpoint) out.rsvp.endpoint = `/api/invitations/${id}/rsvp`;
  if (Array.isArray(out.events)) {
    for (const e of out.events) {
      if (isPlain(e) && e.start && !e.end) {
        const t = Date.parse(e.start);
        if (Number.isFinite(t)) { e.end = new Date(t + 5 * 3600e3).toISOString().replace(/\.\d{3}Z$/, '+00:00'); e.openEnded = true; }
      }
    }
  }
  return out;
}

/** Asks the studio for the unsaved model; resolves null after 1.5 s or on anything unexpected. */
function requestPreviewData() {
  return new Promise((resolve) => {
    let timer;
    const onMessage = (e) => {
      if (e.origin !== location.origin || e.source !== window.parent) return;
      const m = e.data;
      if (!isPlain(m) || m.type !== 'nimtto:data' || !isPlain(m.data) || !isPlain(m.data.couple)) return;
      finish(m.data);
    };
    const finish = (value) => {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      resolve(value);
    };
    window.addEventListener('message', onMessage);
    timer = setTimeout(() => finish(null), PREVIEW_WAIT_MS);
    post({ type: 'nimtto:ready' });
  });
}

/** Inline custom properties on <body> override the theme's tokens (strictly validated). */
function applyThemeColors() {
  const all = config.themeColors;
  if (!isPlain(all)) return;
  const pageTheme = location.pathname.split('/')[1];
  const colors = (SLUG.test(pageTheme) && isPlain(all[pageTheme])) ? all[pageTheme] : all[config.theme];
  if (!isPlain(colors)) return;
  for (const [name, value] of Object.entries(colors)) {
    if (COLOR_NAME.test(name) && typeof value === 'string' && COLOR_HEX.test(value)) {
      document.body.style.setProperty(name, value);
    }
  }
}

export async function loadInvitation() {
  const id = params.get('id');
  const validId = Boolean(id && SLUG.test(id));
  let fromStudio = null;
  if (PREVIEW) {
    startPreviewListener();
    fromStudio = await requestPreviewData();
  }
  if (fromStudio) {
    replaceConfig(normalisePreview(fromStudio, validId ? id : ''));
  } else if (validId) {
    try {
      const res = await fetch(`/api/invitations/${id}/public`, { headers: { Accept: 'application/json' } });
      if (res.ok) replaceConfig(await res.json());
    } catch (err) {
      console.warn('Could not load the invitation; showing the demo.', err);
    }
  }
  applyThemeColors();
  if (PREVIEW) announceMounted();
  return config;
}

// ---------------------------------------------------------------------------------------------
// Preview: "mounted" hook and the focus outline

let mountedSent = false;
const frame = () => new Promise((r) => {
  const t = setTimeout(r, 120); // rAF does not run in a hidden iframe
  requestAnimationFrame(() => { clearTimeout(t); r(); });
});

/** After the theme renders: fonts ready, two frames, then the DOM quiet for 200 ms (max 4 s). */
function announceMounted() {
  if (mountedSent) return;
  mountedSent = true;
  setTimeout(async () => {
    try { await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 3000))]); } catch { /* no font API */ }
    await frame();
    await frame();
    await new Promise((resolve) => {
      let quiet;
      const obs = new MutationObserver(() => { clearTimeout(quiet); quiet = setTimeout(done, 200); });
      const cap = setTimeout(done, 4000);
      function done() { obs.disconnect(); clearTimeout(quiet); clearTimeout(cap); resolve(); }
      obs.observe(document.body, { childList: true, subtree: true });
      quiet = setTimeout(done, 200);
    });
    post({ type: 'nimtto:mounted' });
  }, 0);
}

let listening = false;
function startPreviewListener() {
  if (listening) return;
  listening = true;
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.source !== window.parent) return;
    const m = e.data;
    if (!isPlain(m) || m.type !== 'nimtto:focus' || typeof m.text !== 'string') return;
    const text = m.text.slice(0, 500);
    const el = findText(text);
    if (el) focusElement(el);
  });
}

const norm = (s) => String(s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
const SKIP = 'script, style, noscript, template, .hud, #music-sheet, .chapters, .skip, .svg-defs, [data-nimtto-ring]';

const isVisible = (el) => {
  if (!el.getClientRects().length) return false;
  if (el.checkVisibility) return el.checkVisibility({ visibilityProperty: true });
  return getComputedStyle(el).visibility !== 'hidden';
};

/** The visible element whose own text best contains `text` (smallest such element wins). */
function findText(text) {
  const needle = norm(text);
  if (needle.length < 2) return null;
  const cache = new Map();
  const textOf = (el) => {
    if (!cache.has(el)) cache.set(el, norm(el.textContent || ''));
    return cache.get(el);
  };
  const candidates = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    let el = n.parentElement;
    if (!el || el.closest(SKIP)) continue;
    for (let i = 0; el && el !== document.body && i < 6; i++, el = el.parentElement) candidates.add(el);
  }
  let best = null; let bestScore = Infinity; let bestVisible = false;
  let partial = null; let partialLen = 0;
  for (const el of candidates) {
    const t = textOf(el);
    if (!t) continue;
    if (t.includes(needle)) {
      const visible = isVisible(el);
      const score = t.length;
      if ((visible && !bestVisible) || (visible === bestVisible && score < bestScore)) {
        best = el; bestScore = score; bestVisible = visible;
      }
    } else if (!best && t.length >= Math.min(4, needle.length) && needle.includes(t) && t.length > partialLen && isVisible(el)) {
      partial = el; partialLen = t.length; // e.g. only the first name of an edited full name is shown
    }
  }
  let el = best || partial;
  // A match in the hidden language: outline its nearest visible ancestor instead.
  while (el && el !== document.body && !isVisible(el)) el = el.parentElement;
  return el && el !== document.body ? el : null;
}

const RING_STYLE = `
[data-nimtto-ring]{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;box-sizing:border-box;
border:2px solid #D4A24C;border-radius:6px;box-shadow:0 0 0 3px rgba(212,162,76,.22);opacity:0;will-change:transform,opacity}`;

let ringRun = 0;
function focusElement(el) {
  if (!document.getElementById('nimtto-ring-style')) {
    const s = document.createElement('style');
    s.id = 'nimtto-ring-style';
    s.textContent = RING_STYLE;
    document.head.append(s);
  }
  document.querySelectorAll('[data-nimtto-ring]').forEach((r) => r.remove());
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reduce ? 'auto' : 'smooth' }); } catch { el.scrollIntoView(); }

  const ring = document.createElement('div');
  ring.setAttribute('data-nimtto-ring', '');
  ring.setAttribute('aria-hidden', 'true');
  document.body.append(ring);
  const pad = 6;
  let size = '';
  const place = () => {
    const r = el.getBoundingClientRect();
    const next = `${Math.round(r.width + pad * 2)}x${Math.round(r.height + pad * 2)}`;
    if (next !== size) { // sized once (and again only if the element itself resizes)
      size = next;
      ring.style.width = `${Math.round(r.width + pad * 2)}px`;
      ring.style.height = `${Math.round(r.height + pad * 2)}px`;
    }
    ring.style.transform = `translate3d(${Math.round(r.left - pad)}px, ${Math.round(r.top - pad)}px, 0)`;
  };
  place();
  // Fade in, hold while the scroll settles, then fade out over 1.6 s (opacity only).
  const anim = ring.animate(
    [
      { opacity: 0, easing: 'cubic-bezier(0.22, 0.8, 0.24, 1)' },
      { opacity: 1, offset: 0.08 },
      { opacity: 1, offset: 0.33, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      { opacity: 0 },
    ],
    { duration: 2400, fill: 'forwards' },
  );
  const run = ++ringRun;
  const track = () => {
    if (run !== ringRun || !ring.isConnected) return;
    place();
    requestAnimationFrame(track);
  };
  requestAnimationFrame(track);
  anim.finished.then(() => { if (run === ringRun) ring.remove(); }).catch(() => {});
}

export { config };
