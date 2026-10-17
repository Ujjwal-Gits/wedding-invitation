// Loads the invitation data. With ?id=<slug> it comes from the studio server
// (/api/invitations/<slug>/public); otherwise the demo in src/config.js is used.
// Every theme must `await loadInvitation()` before rendering.
//
// The demo couple (src/config.js) shows ONLY on a theme page without an id (development, the owner's design browsing,
// the thumbnails) and in the watermarked showcase. A real invitation (?id=, /i/<slug>, the studio preview) never
// falls back to it: anything missing is blank (blankModel), and an invitation that cannot be loaded shows a small
// "not available" card instead of the design (docs/PLATFORM.md "No demo on real invitations").
//
// Live preview (docs/PLATFORM.md): with ?preview=1 inside an iframe, the page asks the
// studio (same origin only) for the unsaved model first, tells it when the theme has
// rendered, and points at what the client is editing (words, a photo or a part of the page; see
// live-preview.js, loaded only then). Every message is same-origin only and validated here.
// The model's `design` ({ gate?, hero? }, docs/MIX.md) travels with it: mix.js reads it from the config.
import { config } from '../config.js';
import { LIBRARY_SRC_RE } from './music-library.js';
import { religionOf, symbolsFor, VERSIONS, SHLOKA, swapWords, isHinduInvocation, startFaithDom } from './faith.js';
import { setTimeZone } from './i18n.js';
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
  setTimeZone(config.timeZone); // times show at the venue (absent = Nepal, as before)
}

/**
 * The empty invitation a real page falls back to, field by field: no demo names, families, venues, dates, story,
 * hashtag or photos. Only the generic words every new card starts with (salutation, request, sign-off, closing,
 * shloka, the seven vows) and the bundled music. weddingDate is a placeholder (themes need a date to lay out).
 */
export function blankModel() {
  const b = () => ({ en: '', ne: '' });
  const person = () => ({ name: b(), fullName: b(), parents: b(), home: b(), photo: null });
  const soon = new Date(Date.now() + 182 * 864e5).toISOString().slice(0, 10);
  return {
    couple: { bride: person(), groom: person(), portraits: [], hashtag: '' },
    hosts: b(),
    weddingDate: `${soon}T10:30:00+05:45`,
    weddingDateBS: b(),
    city: b(),
    invitation: {
      shloka: structuredClone(demo.invitation.shloka), salutation: structuredClone(demo.invitation.salutation),
      body: b(), request: structuredClone(demo.invitation.request), signoff: structuredClone(demo.invitation.signoff),
    },
    story: [],
    events: [],
    saptapadi: structuredClone(demo.saptapadi),
    gallery: [],
    info: { travel: b(), stays: [], contacts: [], livestream: '' },
    rsvp: { enabled: true, deadline: b(), maxGuests: demo.rsvp.maxGuests, endpoint: '' },
    music: { volume: demo.music.volume, tracks: structuredClone(bundledTracks) },
    closing: structuredClone(demo.closing),
    theme: SLUG.test(location.pathname.split('/')[1] || '') ? location.pathname.split('/')[1] : demo.theme,
    themeContent: {},
    content: { images: {}, texts: {} },
    share: { title: '', description: '', image: '', siteUrl: '' },
  };
}

/** The studio sends its raw draft model: fill the few things the public endpoint adds (never from the demo). */
function normalisePreview(data, id) {
  const out = structuredClone(data);
  const blank = blankModel();
  for (const key of Object.keys(blank)) if (!(key in out)) out[key] = blank[key];
  if (!isPlain(out.music)) out.music = blank.music;
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

/**
 * The planner's Music library (GET /api/music: on, in their order) decides the music. The website's preview plays
 * the library, first song first; a real invitation keeps the couple's songs but drops library songs the planner
 * turned off or deleted (their own uploads stay), and falls back to the library when none are left.
 */
/**
 * Data the server put in a guest's page (lib/gate.js: <script type="application/json">), read once and removed, so
 * the first screen does not wait for the API. null when absent or unreadable: the page then asks the API as before.
 */
function pageData(elId, id) {
  const el = document.getElementById(elId);
  if (!el) return null;
  el.remove();
  if (id != null && el.dataset.id !== id) return null;
  try { return JSON.parse(el.textContent); } catch { return null; }
}

/** The music list: from the page, or one request started once (in parallel with the invitation's own data). */
let musicList = null;
const loadMusicList = () => (musicList ||= (async () => {
  const inPage = pageData('nimtto-music');
  if (isPlain(inPage)) return inPage;
  const res = await fetch('/api/music', { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(3000) });
  return res.ok ? res.json() : null;
})().catch(() => null));

async function applyLibraryMusic(real) {
  let lib;
  try {
    const out = await loadMusicList();
    if (!out) return;
    const moods = new Map((out.moods || []).map((m) => [m.id, m]));
    lib = (out.tracks || []).filter((t) => t?.src).map((t) => ({ title: { en: t.title || '', ne: t.titleNe || '' }, mood: { en: moods.get(t.mood)?.en || '', ne: moods.get(t.mood)?.ne || '' }, src: t.src, credit: t.credit || '' }));
  } catch { return; } // offline: keep what the page has
  if (!lib.length) return;
  bundledTracks.splice(0, bundledTracks.length, ...structuredClone(lib));
  if (!isPlain(config.music)) config.music = { volume: demo.music.volume, tracks: [] };
  if (!real) { config.music.tracks = structuredClone(lib); return; }
  const on = new Set(lib.map((t) => t.src));
  const isLibrary = (src) => typeof src === 'string' && (src.startsWith('/audio/') || LIBRARY_SRC_RE.test(src));
  const kept = (Array.isArray(config.music.tracks) ? config.music.tracks : []).filter((t) => !isLibrary(t?.src) || on.has(t.src));
  config.music.tracks = kept.length ? kept : structuredClone(lib);
}

/**
 * Resolves once the browser has painted what is on the page now. A theme awaits it after its opening is in place and
 * before heavy setup the guest cannot see yet, so a phone shows the opening first. (rAF does not run in a hidden tab.)
 */
export const afterPaint = () => new Promise((resolve) => {
  const t = setTimeout(resolve, 500);
  requestAnimationFrame(() => setTimeout(() => { clearTimeout(t); resolve(); }, 0));
});

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
  } else if (params.has('id')) {
    // A real invitation: its own data, or a "not available" card. Never the demo couple.
    let problem = 'missing';
    loadMusicList(); // starts now, read below
    const inPage = validId ? pageData('nimtto-data', id) : null;
    if (isPlain(inPage) && isPlain(inPage.couple)) {
      replaceConfig(normalisePreview(inPage, id));
      problem = null;
    } else if (validId) {
      try {
        const res = await fetch(`/api/invitations/${id}/public`, { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          if (isPlain(data) && isPlain(data.couple)) { replaceConfig(normalisePreview(data, id)); problem = null; }
        } else if (res.status >= 500 || res.status === 429) problem = 'offline';
      } catch (err) {
        console.warn('Could not load the invitation.', err);
        problem = 'offline';
      }
    }
    if (problem) return notAvailable(problem);
  }
  await applyLibraryMusic(Boolean(fromStudio || params.has('id')));
  applyFaith();
  applyThemeColors();
  if (fromStudio || params.has('id')) realPage();
  if (PREVIEW) {
    announceMounted();
    // Runs after the theme's own rendering (the caller continues first).
    live?.then((m) => { m.setPicking(firstPick); return m.start({ target: firstTarget }); }).catch(() => document.documentElement.classList.remove('nimtto-hold'));
  }
  return config;
}

const BRAND_TITLE = 'Wedding invitation · Nimtto';
const AMP = new Set(['&', '&amp;', 'र', 'and', 'weds', 'Weds', 'संग', 'सँग']);
/**
 * A real invitation: the tab title is its own (never the build's), and while a first name is still empty the lone
 * "&" between the names is hidden (kept in the layout, so nothing jumps), so the page reads blank, not broken.
 */
function realPage() {
  const nm = (p) => String(p?.name?.en || p?.name?.ne || '').trim();
  const b = nm(config.couple?.bride);
  const g = nm(config.couple?.groom);
  const t = String(config.share?.title || '').trim();
  document.title = t || (b && g ? `${b} & ${g}` : BRAND_TITLE);
  if (b && g) return;
  const style = document.createElement('style');
  style.textContent = '[data-nimtto-blank]{visibility:hidden!important}';
  document.head.append(style);
  const sweep = () => {
    for (const el of document.body?.querySelectorAll('span, b, i, em, p, div, h1, h2, h3, small, strong, text, tspan') || []) {
      if (el.childElementCount || el.hasAttribute('data-nimtto-blank')) continue;
      if (AMP.has(String(el.textContent).trim())) el.setAttribute('data-nimtto-blank', '');
    }
  };
  let n = 0;
  const run = () => { sweep(); if (++n < 40) setTimeout(run, 250); };
  setTimeout(run, 0);
  // late renders (a gate opening, a lazy section): watched for the first 20 s
  const obs = new MutationObserver(() => { clearTimeout(realPage.t); realPage.t = setTimeout(sweep, 60); });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => obs.disconnect(), 20000);
}

/**
 * A real invitation that cannot be shown (unknown, not published yet, no access, or offline): a calm card in place of
 * the design, and the theme never renders (the promise never resolves), so nothing of the demo can appear.
 */
function notAvailable(kind) {
  const ink = '#121116';
  const card = document.createElement('main');
  card.setAttribute('data-nimtto-unavailable', kind);
  card.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:32px 16px;background:#fff;color:' + ink
    + ';font:400 16.5px/1.6 Geist,"Segoe UI",Arial,sans-serif;text-align:left;overflow:auto';
  const offline = kind === 'offline';
  card.innerHTML = `<div style="width:min(100%,440px)">
<a href="/" style="font:500 24px/1 Gambetta,'Iowan Old Style',Georgia,serif;letter-spacing:-.03em;color:${ink};text-decoration:none">Nimtto</a>
<h1 style="margin:40px 0 0;font:400 clamp(30px,7vw,44px)/1.08 Gambetta,'Iowan Old Style',Georgia,serif;letter-spacing:-.028em">${offline ? 'This invitation could not load.' : 'This invitation isn’t available.'}</h1>
<p lang="ne" style="margin:8px 0 0;color:#66636E;font-family:Mukta,'Nirmala UI',sans-serif">${offline ? 'निम्तो खुल्न सकेन। फेरि प्रयास गर्नुहोस्।' : 'यो निम्तो अहिले उपलब्ध छैन।'}</p>
<p style="margin:16px 0 0;color:#45434C">${offline ? 'Please check your connection and try again.' : 'The link may be mistyped, or the invitation is not shared yet. Please ask the family for their link.'}</p>
<button type="button" style="margin-top:28px;min-height:48px;padding:0 22px;border:0;border-radius:6px;background:#B3122F;color:#fff;font:500 16px/1 Geist,'Segoe UI',Arial,sans-serif;cursor:pointer">Try again</button>
</div>`;
  card.querySelector('button').addEventListener('click', () => location.reload());
  const show = () => { document.body.append(card); document.documentElement.classList.remove('nimtto-hold'); };
  if (document.body) show(); else addEventListener('DOMContentLoaded', show, { once: true });
  document.title = 'Invitation not available · Nimtto';
  if (PREVIEW) { post({ type: 'nimtto:mounted' }); post({ type: 'nimtto:settled' }); }
  return new Promise(() => {});
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
