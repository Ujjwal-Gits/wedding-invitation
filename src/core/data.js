// Loads the invitation data. With ?id=<slug> it comes from the studio server
// (/api/invitations/<slug>/public); otherwise the demo in src/config.js is used.
// Every theme must `await loadInvitation()` before rendering.
//
// Live preview (docs/PLATFORM.md): with ?preview=1 inside an iframe, the page asks the
// studio (same origin only) for the unsaved model first, tells it when the theme has
// rendered, and points at what the client is editing (words, a photo or a part of the page; see
// live-preview.js, loaded only then). Every message is same-origin only and validated here.
// The model's `design` ({ gate?, hero? }, docs/MIX.md) travels with it: mix.js reads it from the config.
import { config } from '../config.js';
import { religionOf, symbolsFor, VERSIONS, SHLOKA, swapWords, isHinduInvocation, startFaithDom } from './faith.js';
import './showcase.js'; // showcase mode (docs/API.md): runs first and drops ?id / ?preview, so only the demo shows

const SLUG = /^[a-z0-9-]{3,64}$/;
const COLOR_NAME = /^--[a-z0-9-]+$/;
const COLOR_HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const PREVIEW_WAIT_MS = 1500;

const params = new URLSearchParams(location.search);
const inFrame = (() => { try { return window.parent !== window; } catch { return true; } })();
const PREVIEW = inFrame && params.get('preview') === '1';

// In the studio's phone and computer frames the page scrolls without visible scrollbars.
const PREVIEW_STYLE = `
html,body,*{scrollbar-width:none!important}
::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}
html.nimtto-hold body{opacity:0!important}
html.nimtto-snap *,html.nimtto-snap *::before,html.nimtto-snap *::after{transition-duration:0s!important;transition-delay:0s!important}
[data-nimtto-ring]{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;box-sizing:border-box;border:2px solid #D4A24C;border-radius:6px;
box-shadow:0 0 0 1px rgba(24,16,4,.55),0 0 0 5px rgba(212,162,76,.24),inset 0 0 0 1px rgba(255,255,255,.6);opacity:0;will-change:transform,opacity}
[data-nimtto-hover]{position:fixed;left:0;top:0;z-index:2147483646;pointer-events:none;box-sizing:border-box;border:1.5px solid rgba(212,162,76,.95);border-radius:6px;
box-shadow:0 0 0 1px rgba(24,16,4,.4),inset 0 0 0 1px rgba(255,255,255,.35);opacity:0;transition:opacity .16s cubic-bezier(.2,.8,.2,1);will-change:transform,opacity}
[data-nimtto-hover] span{position:absolute;left:-1.5px;bottom:100%;margin-bottom:2px;padding:0 7px;border-radius:5px;background:#b3122f;color:#fff;
font:600 11px/18px ui-sans-serif,"Segoe UI",sans-serif;letter-spacing:.02em}
html.nimtto-pick,html.nimtto-pick *{cursor:pointer!important}
html.nimtto-paused *,html.nimtto-paused *::before,html.nimtto-paused *::after{animation-play-state:paused!important}`;
let live = null;
let liveMod = null;
if (PREVIEW) {
  // The studio's editor keeps the keyboard: a page in the preview frame never takes focus (a gate button, a dialog)
  // unless the client is using the preview itself. A frame rendering in the background never steals it either.
  const nativeFocus = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function focus(opts) { if (document.hasFocus()) nativeFocus.call(this, opts); };
  const touched = () => { window.__nimttoTouchAt = Date.now(); };
  addEventListener('pointerdown', touched, true);
  addEventListener('keydown', touched, true);
  const s = document.createElement('style');
  s.id = 'nimtto-preview-style';
  s.textContent = PREVIEW_STYLE;
  document.head.append(s);
  // The studio shows this page scaled down in a device frame: more than 2 device pixels per CSS pixel is never seen,
  // and canvas and WebGL themes size their buffers from devicePixelRatio (a phone at DPR 3 drew 2.25x the pixels).
  if ((window.devicePixelRatio || 1) > 2) {
    try { Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => 2 }); } catch { /* read-only */ }
  }
  live = import('./live-preview.js');
  live.then((m) => { liveMod = m; }, (err) => console.warn('preview: helpers did not load', err));
  holdAndRelease();
}

/**
 * Pause and teardown for the studio (nimtto:pause, nimtto:teardown; the studio may also call window.__nimttoPause /
 * __nimttoTeardown directly, same origin). A paused page holds still: requestAnimationFrame loops (three.js, canvas,
 * the ribbon), CSS animations, GSAP, Lenis and sound wait until it resumes. Teardown is final, just before the studio
 * blanks the frame: WebGL contexts are lost at once (Chrome keeps only ~16 alive), sound and media stop.
 */
function holdAndRelease() {
  const gls = [];
  for (const C of [window.HTMLCanvasElement, window.OffscreenCanvas]) {
    const get = C?.prototype?.getContext;
    if (!get) continue;
    C.prototype.getContext = function getContext(type, ...rest) {
      const ctx = get.call(this, type, ...rest);
      if (ctx && /webgl/i.test(String(type)) && !gls.some((r) => r.deref() === ctx)) gls.push(new WeakRef(ctx));
      return ctx;
    };
  }
  const sounds = [];
  if (typeof window.AudioContext === 'function') {
    const AC = window.AudioContext;
    window.AudioContext = class extends AC { constructor(...a) { super(...a); sounds.push(new WeakRef(this)); } };
  }
  const raf = window.requestAnimationFrame.bind(window);
  const caf = window.cancelAnimationFrame.bind(window);
  let held = null;
  let heldId = 2 ** 30;
  window.requestAnimationFrame = (cb) => {
    if (!held) return raf(cb);
    held.set(++heldId, cb);
    return heldId;
  };
  window.cancelAnimationFrame = (id) => { if (!held?.delete(id)) caf(id); };
  const media = () => document.querySelectorAll('audio, video');
  window.__nimttoPause = (on) => {
    if (on && !held) {
      held = new Map();
      document.documentElement.classList.add('nimtto-paused');
      for (const m of media()) if (!m.paused) { m.__nimttoWas = true; m.pause(); }
      for (const r of sounds) r.deref()?.suspend?.().catch(() => {});
      liveMod?.pause(true);
    } else if (!on && held && !window.__nimttoGone) {
      const cbs = held;
      held = null;
      document.documentElement.classList.remove('nimtto-paused');
      for (const m of media()) if (m.__nimttoWas) { m.__nimttoWas = false; m.play().catch(() => {}); }
      for (const r of sounds) r.deref()?.resume?.().catch(() => {});
      liveMod?.pause(false);
      if (cbs.size) raf((t) => { for (const cb of cbs.values()) { try { cb(t); } catch (err) { console.error(err); } } });
    }
  };
  window.__nimttoTeardown = () => {
    if (window.__nimttoGone) return;
    window.__nimttoPause(true);
    window.__nimttoGone = true;
    try { window.dispatchEvent(new Event('nimtto:teardown')); } catch { /* a theme's own listener */ }
    try { liveMod?.teardown(); } catch { /* best effort */ }
    for (const m of media()) { try { m.pause(); m.removeAttribute('src'); m.load(); } catch { /* gone */ } }
    for (const r of sounds) { try { r.deref()?.close(); } catch { /* closed */ } }
    for (const r of gls) {
      const c = r.deref();
      try { if (c && !c.isContextLost()) c.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* lost */ }
    }
  };
}

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

let firstTarget = null;
let firstPick = false;

/** Asks the studio for the unsaved model; resolves null after 1.5 s or on anything unexpected. */
function requestPreviewData() {
  return new Promise((resolve) => {
    let timer;
    const onMessage = (e) => {
      if (e.origin !== location.origin || e.source !== window.parent) return;
      const m = e.data;
      if (!isPlain(m) || m.type !== 'nimtto:data' || !isPlain(m.data) || !isPlain(m.data.couple)) return;
      firstTarget = cleanTarget(m.focus);
      firstPick = m.pick === true;
      // Re-shown after a reload: keep the page hidden until it is back at the edited spot (no jump from the top).
      if (firstTarget && params.has('open')) {
        document.documentElement.classList.add('nimtto-hold');
        setTimeout(() => document.documentElement.classList.remove('nimtto-hold'), 6000);
      }
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
  applyFaith();
  applyThemeColors();
  if (PREVIEW) {
    announceMounted();
    // Runs after the theme's own rendering (the caller continues first).
    live?.then((m) => { m.setPicking(firstPick); return m.start({ target: firstTarget }); }).catch(() => document.documentElement.classList.remove('nimtto-hold'));
  }
  return config;
}

// ---------------------------------------------------------------------------------------------
// Faith (docs/PLATFORM.md "Religion", src/core/faith.js) and the bilingual fallback.

/**
 * Every {en, ne} pair with one side empty shows the side the couple did fill, in both views (a name typed only
 * in English shows in the नेपाली view too). Runs once on the loaded model; the slot layer does the same for
 * theme texts (src/core/slots.js), where the couple's words in either language beat the design's default.
 */
function fillPairs(node, depth = 0) {
  if (depth > 12 || node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const x of node) fillPairs(x, depth + 1); return; }
  if ('en' in node && 'ne' in node && (typeof node.en === 'string' || node.en == null) && (typeof node.ne === 'string' || node.ne == null)) {
    const en = String(node.en ?? '').trim();
    const ne = String(node.ne ?? '').trim();
    if (!en && ne) node.en = node.ne;
    else if (!ne && en) node.ne = node.en;
  }
  for (const v of Object.values(node)) if (v && typeof v === 'object') fillPairs(v, depth + 1);
}

/**
 * config.faith = { religion, symbols, version }: the community (config.religion, default 'hindu') and the
 * symbols this page shows. A personal guest link's ?v= (neutral | hindu | muslim | christian, validated here and
 * by the server's /i/ forward) changes only the symbol, the invocation and the card's verse.
 */
function applyFaith() {
  const religion = religionOf(config);
  const v = params.get('v');
  const version = VERSIONS.includes(v) ? v : null;
  const symbols = symbolsFor(religion, version);
  config.religion = religion;
  config.faith = { religion, symbols, version };
  fillPairs(config);
  const sh = isPlain(config.invitation) && isPlain(config.invitation.shloka) ? config.invitation.shloka : null;
  if (sh) {
    const hinduVerse = isHinduInvocation(sh.sa) || /वक्रतुण्ड|Ganesh/i.test(`${sh.sa || ''} ${sh.en || ''}`);
    const want = symbols === 'hindu' ? (version && !hinduVerse ? demo.invitation?.shloka : null) : (version || hinduVerse ? SHLOKA[symbols] : null);
    if (want) Object.assign(sh, structuredClone(want));
  }
  if (religion !== 'hindu') {
    // the untouched sample's Hindu sentences (an invitation started as Hindu, then changed)
    const fix = (o) => { if (isPlain(o)) for (const k of ['en', 'ne']) if (typeof o[k] === 'string') o[k] = swapWords(o[k], religion, { sentences: true }); };
    fix(config.invitation?.body);
    (config.story || []).forEach((s) => fix(s?.text));
    if (JSON.stringify(config.saptapadi) === JSON.stringify(demo.saptapadi)) config.saptapadi = [];
  }
  startFaithDom({ religion, symbols });
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
    live?.then((m) => m.mounted()).catch(() => {});
  }, 0);
}

let listening = false;
function startPreviewListener() {
  if (listening) return;
  listening = true;
  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.source !== window.parent) return;
    const m = e.data;
    if (!isPlain(m)) return;
    if (m.type === 'nimtto:focus') {
      const t = cleanTarget(m);
      if (t) live?.then((x) => x.focus(t)).catch(() => {});
    } else if (m.type === 'nimtto:mode' && typeof m.pick === 'boolean') {
      live?.then((x) => x.setPicking(m.pick)).catch(() => {});
    } else if (m.type === 'nimtto:pause' && typeof m.on === 'boolean') {
      window.__nimttoPause?.(m.on);
    } else if (m.type === 'nimtto:teardown') {
      window.__nimttoTeardown?.();
    } else if (m.type === 'nimtto:play') {
      live?.then((x) => x.play()).catch(() => {});
    } else if (m.type === 'nimtto:patch' && Array.isArray(m.changes)) {
      const changes = m.changes.slice(0, 60).map(cleanChange).filter(Boolean);
      if (changes.length) live?.then((x) => x.patch(changes)).catch(() => {});
    } else if (m.type === 'nimtto:colors' && isPlain(m.colors)) {
      const out = {};
      for (const [name, value] of Object.entries(m.colors).slice(0, 40)) {
        if (!COLOR_NAME.test(name)) continue;
        if (value === null || value === '') out[name] = '';
        else if (typeof value === 'string' && COLOR_HEX.test(value)) out[name] = value;
      }
      // theme: a borrowed gate or first screen (docs/MIX.md): its colours go on its own wrapper, not on <body>
      const theme = typeof m.theme === 'string' && PART_SLUG.test(m.theme) ? m.theme : null;
      live?.then((x) => x.colors(out, theme)).catch(() => {});
    }
  });
}

// A focus target: { text?, section?, image?, part?, theme?, instant? } (docs/PLATFORM.md). Anything else is dropped.
// part + theme: the words or photo sit in a gate or first screen borrowed from another theme (docs/MIX.md).
const SECTION = /^[a-z]{2,20}(?::\d{1,3})?$/;
const PART_SLUG = /^[a-z0-9-]{2,30}$/;
const IMG = /^(?:\/[^\s"'()<>\\]{1,400}|https:\/\/[^\s"'()<>\\]{1,400}|[a-z0-9][a-z0-9-]{1,79})$/i;
function cleanImage(v) {
  const out = [];
  for (const x of (Array.isArray(v) ? v.slice(0, 6) : [v])) {
    if (typeof x === 'string' && IMG.test(x)) out.push(x);
    else if (isPlain(x)) for (const k of ['lg', 'sm']) if (typeof x[k] === 'string' && IMG.test(x[k])) out.push(x[k]);
  }
  return out;
}
// A hot patch: { kind: 'text', path: [keys], old, value } or { kind: 'image', pairs: [[oldUrl, newUrl]] }.
const KEY = /^[A-Za-z0-9_.-]{1,80}$/;
const BAD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
function cleanChange(c) {
  if (!isPlain(c)) return null;
  if (c.kind === 'text') {
    if (!Array.isArray(c.path) || !c.path.length || c.path.length > 12) return null;
    const okPath = c.path.every((k) => (typeof k === 'string' && KEY.test(k) && !BAD_KEYS.has(k)) || (Number.isInteger(k) && k >= 0 && k < 1000));
    if (!okPath || typeof c.old !== 'string' || typeof c.value !== 'string' || c.old.length > 4000 || c.value.length > 4000) return null;
    const str = (v) => typeof v === 'string' && v.length <= 4000;
    const out = { kind: 'text', path: c.path, old: c.old, value: c.value, show: str(c.show) ? c.show : c.value };
    // olds: other words the page may show for an empty field (the other language, the design's original words)
    if (Array.isArray(c.olds)) out.olds = c.olds.slice(0, 4).filter(str);
    if (c.lang === 'en' || c.lang === 'ne') out.lang = c.lang;
    for (const k of ['fb', 'spill', 'link']) if (c[k] === true) out[k] = true;
    return out;
  }
  if (c.kind === 'image' && Array.isArray(c.pairs)) {
    const pairs = c.pairs.slice(0, 6).filter((p) => Array.isArray(p) && p.length === 2 && p.every((u) => typeof u === 'string' && IMG.test(u) && /^(\/|https:\/\/)/.test(u)));
    return pairs.length ? { kind: 'image', pairs } : null;
  }
  return null;
}

function cleanTarget(t) {
  if (!isPlain(t)) return null;
  const out = {};
  if (typeof t.text === 'string' && t.text.trim().length >= 2) out.text = t.text.trim().slice(0, 500);
  if (typeof t.section === 'string' && SECTION.test(t.section)) out.section = t.section;
  const img = cleanImage(t.image);
  if (img.length) out.image = img;
  if (Number.isFinite(t.y) && t.y >= 0 && t.y < 1e6) out.y = t.y;
  if (t.part === 'gate' || t.part === 'hero') out.part = t.part;
  if (typeof t.theme === 'string' && PART_SLUG.test(t.theme)) out.theme = t.theme;
  if (!out.text && !out.section && !out.image && out.y == null) return null;
  if (t.instant === true) out.instant = true;
  return out;
}

export { config };
