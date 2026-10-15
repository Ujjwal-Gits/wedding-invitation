// The studio's live preview, inside the theme page. Loaded only with ?preview=1 inside the studio's
// iframe (docs/PLATFORM.md "Live preview protocol"); data.js validates every message first.
//
// It finds what the client is editing (their words, a photo, or a part of the invitation), brings it
// into view and outlines it. It works on every theme without theme code: it relies on the shared markup
// (ids, data attributes, the gate's buttons) and on what is actually visible, and it moves the page
// through Lenis and GSAP ScrollTrigger (pins, scrubbed and horizontal journeys) when a theme uses them.
import { config } from '../config.js';

let ST = null;
let lenisOf = () => null;
const libs = Promise.all([
  import('gsap/ScrollTrigger').then((m) => { ST = m.ScrollTrigger; }).catch(() => {}),
  import('./smooth.js').then((m) => { lenisOf = m.getLenis; }).catch(() => {}),
]);

/** The studio skips the opening (?open) for every module except Opening. */
const SKIP = new URLSearchParams(location.search).has('open');
const post = (msg) => { try { window.parent.postMessage(msg, location.origin); } catch { /* detached */ } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => {
  const t = setTimeout(r, 120); // rAF does not run in a hidden iframe
  requestAnimationFrame(() => { clearTimeout(t); r(); });
});
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const vh = () => window.innerHeight;
const vw = () => window.innerWidth;

let ready = false;
let played = false; // Opening module: the client pressed "Play opening"
/** In the Opening module the page shows the closed gate as it is: never scroll it until the opening has played. */
const frozen = () => !SKIP && !played;
let pending = null;
let current = null; // { t, el, align } shown last; kept in place while late layout settles
let userMoved = false;
let refreshed = false;
let showRun = 0;
let resolveMounted;
const mountedP = new Promise((r) => { resolveMounted = r; });

// ── Visibility ─────────────────────────────────────────────────────────────

const rects = (el) => el.getClientRects().length > 0;
function isShown(el) {
  if (!el || !rects(el)) return false;
  const vis = el.checkVisibility ? el.checkVisibility({ visibilityProperty: true }) : getComputedStyle(el).visibility !== 'hidden';
  if (vis) return true;
  // Hidden only until it scrolls into view (GSAP autoAlpha and scroll reveals set an inline visibility): it counts.
  for (let e = el; e && e !== document.body; e = e.parentElement) if (e.style?.visibility === 'hidden') return true;
  return false;
}
/** Shown and not faded out (opacity counts here). */
const isOpaque = (el) => isShown(el) && (!el.checkVisibility || el.checkVisibility({ opacityProperty: true, visibilityProperty: true }));
function opacityOf(el) {
  let o = 1;
  for (let e = el; e && e !== document.documentElement && o > 0.02; e = e.parentElement) o *= Number(getComputedStyle(e).opacity) || 0;
  return o;
}
const covers = (el) => {
  const r = el.getBoundingClientRect();
  const w = Math.max(0, Math.min(r.right, vw()) - Math.max(r.left, 0));
  const h = Math.max(0, Math.min(r.bottom, vh()) - Math.max(r.top, 0));
  return w * h > vw() * vh() * 0.55;
};
const gateEl = () => document.getElementById('gate');
/** The opening still covers the page (the page cannot be scrolled yet). */
function isGated() {
  if (/(^|\s)(is-gated|is-locked|[a-z]{1,8}-locked)(\s|$)/.test(document.body.className)) return true;
  const g = gateEl();
  return Boolean(g && isOpaque(g) && covers(g));
}
const GATE_SEL = '#gate, .su-gate, [id^="gate"], [class*="gate"]';
/** While the opening is shown, an element that sits behind it (or below it) cannot be pointed at. */
const inView = (el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < vh() && r.right > 0 && r.left < vw(); };
function isCovered(el) {
  if (!isGated()) return false;
  const g = el.closest(GATE_SEL);
  if (g && g !== document.body) return false;
  const r = el.getBoundingClientRect();
  if (r.bottom <= 0 || r.top >= vh() || r.right <= 0 || r.left >= vw()) return true;
  const hit = document.elementFromPoint(clamp(r.left + r.width / 2, 1, vw() - 1), clamp(r.top + r.height / 2, 1, vh() - 1));
  if (!hit || el.contains(hit) || hit.contains(el)) return false;
  return Boolean(hit.closest(GATE_SEL));
}

// ── Our own clicks (they pass through "click to edit") ─────────────────────

let bypass = false;
function press(el) {
  bypass = true;
  try { el.click(); } finally { bypass = false; }
}

// ── The opening ────────────────────────────────────────────────────────────

const QUIET = ['quiet', 'enter-quiet', 'open-quiet'];
const LOUD = ['open', 'enter-music', 'seal', 'enter'];
/** Presses the opening's own button (the quiet one first: no music while editing). */
function pressEnter(quietOnly) {
  for (const id of quietOnly ? QUIET : [...QUIET, ...LOUD]) {
    const b = document.getElementById(id);
    if (b && !b.disabled && b.isConnected) { press(b); return true; }
  }
  if (quietOnly) return false;
  const any = document.querySelector('#gate button:not([disabled]), .su-gate button:not([disabled])');
  if (any) { press(any); return true; }
  return false;
}

/** Waits until the opening has finished; a theme that ignores ?open is opened with its quiet button. */
async function untilOpen(maxMs = 9000) {
  const t0 = performance.now();
  let pressed = false;
  while (performance.now() - t0 < maxMs) {
    if (!isGated()) return true;
    if (!pressed && performance.now() - t0 > 500) pressed = pressEnter(true);
    await wait(100);
  }
  return false;
}

// ── Finding things ─────────────────────────────────────────────────────────

const norm = (s) => String(s).normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
const SKIP_UI = 'script, style, noscript, template, .hud, .chapters, .skip, .svg-defs, .sr-only, [data-nimtto-ring], .su-lb, #lightbox';
const first = (sels, root = document) => {
  let fallback = null;
  for (const s of sels) {
    let list;
    try { list = root.querySelectorAll(s); } catch { continue; }
    for (const el of list) {
      if (el.closest('[data-nimtto-ring]')) continue;
      if (isShown(el)) return el;
      fallback ||= el;
    }
  }
  return fallback && isShown(fallback) ? fallback : null;
};

/** Where each part of an invitation lives, most specific first ('@x' = fall back to part x). */
const SECTIONS = {
  gate: ['#gate', '.su-gate'],
  hero: ['#top', '#hero', '#welcome', '.su-hero', '#st-arrival', 'main > section:first-of-type', 'main'],
  couple: ['#couple', '.su-couple', '#us', '#two', '#pair', '#bond', '#st-vows', '#blessing', '@families', '@hero'],
  families: ['#families', '.su-fam', '#ch-fam', '#fam-title', '[id^="fam"]', '@couple'],
  date: ['#date', '.su-date', '#ch-date', '[data-countdown]', '#countdown', '#count', '@events'],
  countdown: ['[data-countdown]', '#countdown', '#count', '#countgrid', '#ch-count', '@date'],
  scratch: ['[data-scratch]', '#scratch', '@date'],
  events: ['#programme', '.su-prog', '#events', '#days', '#ceremonies', '#rites', '#ch-ev-0', '[id^="prog"]', '.su-ev', '[id^="ev-"]', '[id^="pg-"]', '@event:0', '#journey'],
  gallery: ['#photos', '.su-gal', '#gallery', '#album', '#album-grid', '#galgrid', '#ch-photos', '#grid', '#stills', '#stripview', '[data-lb-idx]', '[id^="st-easel"]', '[id^="st-frame"]', '#film', '@album', '@couple'],
  card: ['[data-open-card]', '#open-card', '.su-card', '#card', '#inv-card', '#words', '@closing'],
  rsvp: ['#rsvp', '#rsvp-form', 'form.rsvp', '#finale-root'],
  closing: ['.su-close', '#close', '#closing', '#end', 'footer'],
  info: ['.su-more', '#info', '#travel', '@events'],
  story: ['#story', '#line-stage', '#us', '@couple'],
  map: ['.su-ev__venue a', 'a[href*="google.com/maps"]', '@events'],
  music: ['#music-pill'],
};

function eventEl(i, seen = new Set()) {
  const ev = (config.events || [])[i];
  const id = ev?.id && /^[A-Za-z0-9_-]{1,64}$/.test(ev.id) ? ev.id : null;
  const byId = id ? [`#ev-${id}`, `#pg-${id}`, `#st-ev-${id}`, `#t-${id}`, `[data-event="${id}"]`, `[data-id="${id}"]`] : [];
  const el = first([...byId, `#ch-ev-${i}`]);
  if (el) return el;
  for (const sel of ['.su-ev', '[id^="ev-"]', '[id^="pg-"]', '[id^="st-ev-"]']) {
    const list = [...document.querySelectorAll(sel)].filter(isShown);
    if (list[i]) return list[i];
  }
  const title = ev?.title;
  if (title?.en || title?.ne) {
    const scope = seen.has('events') ? null : sectionEl('events', seen);
    return findText(title.en || title.ne, scope)?.el || findText(title.ne || '', scope)?.el || null;
  }
  return null;
}

/** The part of the page that shows the album: where its first photos appear. */
function albumEl() {
  const refs = (config.gallery || []).slice(0, 6).map((g) => g?.photo).filter(Boolean);
  for (const ref of refs) {
    const list = typeof ref === 'string' ? [ref] : [ref.lg, ref.sm].filter(Boolean);
    const hit = findImage(list, null);
    if (hit) return hit.el.closest('section') || hit.el;
  }
  return null;
}

function sectionEl(name, seen = new Set()) {
  if (!name || seen.has(name)) return null;
  seen.add(name);
  if (name === 'album') return albumEl();
  const ev = /^event:(\d{1,3})$/.exec(name);
  if (ev) return eventEl(Number(ev[1]), seen) || sectionEl('events', seen);
  const sels = SECTIONS[name];
  if (!sels) return null;
  for (const s of sels) {
    const el = s.startsWith('@') ? sectionEl(s.slice(1), seen) : first([s]);
    if (el) return el;
  }
  return null;
}

/** Elements whose own text contains `text` (innermost first), or the longest piece of it shown. */
function textMatches(text) {
  const needle = norm(text);
  if (needle.length < 2) return [];
  const cache = new Map();
  const textOf = (el) => { if (!cache.has(el)) cache.set(el, norm(el.textContent || '')); return cache.get(el); };
  const full = [];
  const partial = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.nodeValue.trim()) continue;
    let el = n.parentElement;
    if (!el || el.closest(SKIP_UI)) continue;
    for (let i = 0; el && el !== document.body && i < 6; i++, el = el.parentElement) {
      if (seen.has(el)) break;
      seen.add(el);
      const t = textOf(el);
      if (!t) continue;
      if (t.includes(needle)) { full.push(el); break; } // innermost: its ancestors match too
      if (t.length >= Math.min(4, needle.length) && needle.includes(t)) partial.push(el);
    }
  }
  // Drop matches that contain another match.
  const inner = full.filter((el) => !full.some((o) => o !== el && el.contains(o)));
  if (inner.length) return inner.map((el) => ({ el, len: textOf(el).length, partial: false }));
  return partial.map((el) => ({ el, len: -textOf(el).length, partial: true }));
}

const DIALOG = '[role="dialog"], dialog, .su-modal, [class*="modal"], [id*="dialog"], [id$="modal"], #letter, .letter';
/** How a match can be shown: itself, after opening a <details>, its bilingual wrapper, or inside its dialog. */
function displayOf(el) {
  if (isShown(el) && el.getBoundingClientRect().width * el.getBoundingClientRect().height > 4) return { el, rank: 0 };
  const det = el.closest('details:not([open])');
  if (det && isShown(det)) return { el, rank: 1, details: det };
  const dlg = el.closest(DIALOG);
  if (dlg && !isShown(dlg)) return { el, rank: 3, dialog: dlg };
  // The other language: its nearest visible wrapper, if that is still a small piece of the page.
  let a = el.parentElement;
  for (let i = 0; a && a !== document.body && i < 3; i++, a = a.parentElement) {
    if (isShown(a)) {
      const r = a.getBoundingClientRect();
      return r.height < vh() * 0.9 && r.height > 1 ? { el: a, rank: 2 } : null;
    }
  }
  return null;
}

function findText(text, scope) {
  const list = [];
  for (const m of textMatches(text)) {
    const d = displayOf(m.el);
    if (d) list.push({ ...d, len: m.len, partial: m.partial });
  }
  if (!list.length) return null;
  const score = (c) => (scope && scope.contains(c.el) ? 0 : 100) + c.rank * 10 + (!SKIP && isCovered(c.el) ? 5 : 0);
  list.sort((a, b) => score(a) - score(b) || a.len - b.len);
  return list[0];
}

/** The photo's URLs as paths, for matching against img src/srcset and CSS backgrounds. */
function photoKeys(list) {
  const out = new Set();
  for (const x of list) {
    if (/^(\/|https:\/\/)/.test(x)) {
      try { out.add(decodeURI(new URL(x, location.href).pathname)); } catch { /* bad URL */ }
    } else {
      out.add(`/photos/${x}-lg.webp`);
      out.add(`/photos/${x}-sm.webp`);
    }
  }
  return [...out].filter((k) => k.length > 4);
}

function imageMatches(keys) {
  const has = (s) => {
    if (!s) return false;
    let v = s;
    try { v = decodeURI(s); } catch { /* keep */ }
    return keys.some((k) => v.includes(k));
  };
  const out = new Set();
  for (const img of document.querySelectorAll('img')) {
    if (has(img.currentSrc) || has(img.getAttribute('src')) || has(img.getAttribute('srcset')) || has(img.dataset.src)) out.add(img);
  }
  for (const s of document.querySelectorAll('picture source[srcset]')) {
    const img = s.parentElement?.querySelector('img');
    if (img && has(s.getAttribute('srcset'))) out.add(img);
  }
  for (const im of document.querySelectorAll('image')) if (has(im.getAttribute('href') || im.getAttribute('xlink:href'))) out.add(im);
  for (const v of document.querySelectorAll('video[poster]')) if (has(v.getAttribute('poster'))) out.add(v);
  if (!out.size) {
    const all = document.body.getElementsByTagName('*');
    for (const el of all) {
      if (el.closest(SKIP_UI)) continue;
      const st = el.getAttribute('style');
      if ((st && st.includes('url(') && has(st)) || has(getComputedStyle(el).backgroundImage)) out.add(el);
    }
    if (!out.size) {
      for (const el of all) {
        if (el.closest(SKIP_UI)) continue;
        if (has(getComputedStyle(el, '::before').backgroundImage) || has(getComputedStyle(el, '::after').backgroundImage)) out.add(el);
      }
    }
  }
  return [...out].filter((el) => !el.closest(SKIP_UI));
}

function findImage(list, scope) {
  const keys = photoKeys(list);
  if (!keys.length) return null;
  const cands = imageMatches(keys).map((el) => {
    // A photo inside a link/button/figure: outline the frame the guest sees.
    const box = el.closest('button, a, figure') || el;
    const shownEl = isShown(el) ? el : null;
    const r = (shownEl || box).getBoundingClientRect();
    return { el: shownEl && box !== el && isShown(box) && box.getBoundingClientRect().width < vw() * 1.05 ? box : shownEl, area: r.width * r.height };
  }).filter((c) => c.el && c.area > 16);
  if (!cands.length) return null;
  const score = (c) => (scope && scope.contains(c.el) ? 0 : 100) + (!SKIP && isCovered(c.el) ? 50 : 0);
  cands.sort((a, b) => score(a) - score(b) || b.area - a.area);
  return { el: cands[0].el, rank: 0 };
}

/** Where to look, in order: the photo, the words, then the part of the page. */
function resolve(t) {
  let scope = null;
  if (t.section === 'music') {
    const pill = document.getElementById('music-pill');
    return pill ? { el: pill, how: 'music', music: true } : null;
  }
  if (t.section) scope = sectionEl(t.section);
  if (t.image?.length) {
    const im = findImage(t.image, scope);
    if (im) return { ...im, how: 'image' };
  }
  if (t.text) {
    const m = findText(t.text, scope);
    if (m) return { ...m, how: 'text' };
  }
  if (scope) return { el: scope, how: 'section' };
  return null;
}

// ── Showing it ─────────────────────────────────────────────────────────────

function openerFor(dlg) {
  const id = dlg.id;
  const sels = ['[data-open-card]', '#open-card'];
  if (id) sels.unshift(`[aria-controls="${id}"]`, `[data-dialog="${id}"]`, `[href="#${id}"]`);
  return first(sels);
}

let opened = null; // the dialog or sheet a previous target opened (closed again before the next one)
function closeOpened(keep) {
  const o = opened;
  if (!o || (keep && o.contains(keep))) return false;
  opened = null;
  const x = o.querySelector('[data-close], [data-act="close"], .sheet__close, [class*="close"]:is(button, a)');
  if (x && isShown(x)) press(x);
  else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  return true;
}

/** Opens what hides the match: a <details>, the invitation card, or the music sheet. */
async function reveal(found) {
  if (found.details) {
    for (let d = found.el.closest('details:not([open])'); d; d = d.parentElement?.closest('details:not([open])')) d.open = true;
    return true;
  }
  if (found.dialog) {
    if (isShown(found.dialog)) return true;
    const b = openerFor(found.dialog);
    if (!b) return false;
    press(b);
    opened = found.dialog;
    for (let i = 0; i < 24 && !isShown(found.el); i++) await wait(60);
    await wait(260); // let it settle before measuring
    if (isShown(found.el)) return true;
    closeOpened(); // it did not show these words after all: put the page back
    await wait(300);
    return false;
  }
  if (found.music) {
    const sheet = document.getElementById('music-sheet');
    if (sheet?.hidden) { press(found.el); await wait(380); }
    opened = sheet;
    const panel = sheet?.querySelector('.sheet__panel') || sheet;
    if (panel && isShown(panel)) found.el = panel;
    return true;
  }
  return true;
}

function scrollY() { return window.scrollY || document.documentElement.scrollTop || 0; }
function maxY() { return Math.max(0, (document.scrollingElement || document.documentElement).scrollHeight - vh()); }

/** Scrolls the page now, keeping Lenis and every ScrollTrigger (scrubbed ones included) in step. */
function jump(y) {
  const l = lenisOf();
  if (l) { try { l.scrollTo(y, { immediate: true, force: true }); } catch { window.scrollTo(0, y); } } else window.scrollTo({ top: y, left: 0, behavior: 'instant' });
  if (ST) {
    try {
      ST.update();
      for (const st of ST.getAll()) st.getTween?.()?.progress(1);
    } catch { /* older GSAP */ }
  }
}
function glide(y) {
  const l = lenisOf();
  if (l) { try { l.scrollTo(y, { duration: 0.9, force: true, easing: (t) => 1 - (1 - t) ** 3 }); return; } catch { /* fall through */ } }
  window.scrollTo({ top: y, left: 0, behavior: 'smooth' });
}

/** Centres the element inside any scrolling box around it (a photo strip, a dialog). */
function innerScroll(el, instant) {
  for (let a = el.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
    const s = getComputedStyle(a);
    const sx = /(auto|scroll)/.test(s.overflowX) && a.scrollWidth > a.clientWidth + 2;
    const sy = /(auto|scroll)/.test(s.overflowY) && a.scrollHeight > a.clientHeight + 2;
    if (!sx && !sy) continue;
    const r = el.getBoundingClientRect();
    const ar = a.getBoundingClientRect();
    a.scrollTo({
      left: sx ? a.scrollLeft + (r.left - ar.left) - (a.clientWidth - r.width) / 2 : a.scrollLeft,
      top: sy ? a.scrollTop + (r.top - ar.top) - (a.clientHeight - Math.min(r.height, a.clientHeight)) / 2 : a.scrollTop,
      behavior: instant ? 'instant' : 'smooth',
    });
  }
}

const idealTop = (r, align) => (align === 'start' ? vh() * 0.06 : r.height > vh() * 0.8 ? vh() * 0.1 : (vh() - r.height) / 2);
function placed(r, align) {
  if (r.width * r.height <= 0) return false;
  const cx = r.left + r.width / 2;
  if (cx < 0 || cx > vw()) return false;
  if (align === 'start') return r.top > -vh() * 0.05 && r.top < vh() * 0.35;
  const cy = r.top + Math.min(r.height, vh()) / 2;
  return cy > vh() * 0.18 && cy < vh() * 0.82;
}
function score(el, align) {
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const top = idealTop(r, align);
  const off = Math.abs(cx - vw() / 2) / vw() + Math.abs(r.top - top) / vh();
  const inView = r.right > 0 && r.left < vw() && r.bottom > 0 && r.top < vh();
  let s = off + (inView ? 0 : 4) + (1 - opacityOf(el)) * 2;
  if (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true })) s += 2;
  if (inView) {
    // Something drawn over it (a page still turning, a curtain): less good.
    const hit = document.elementFromPoint(clamp(cx, 1, vw() - 1), clamp(r.top + Math.min(r.height, vh()) / 2, 1, vh() - 1));
    if (hit && !el.contains(hit) && !hit.contains(el)) s += 0.5;
  }
  return s;
}

/** The scroll range of the journey the element rides in: a pinned/scrubbed ScrollTrigger or a tall sticky track. */
function journeyOf(el) {
  if (ST) {
    let best = null;
    for (const st of ST.getAll()) {
      const pin = st.pin && st.pin.contains(el);
      const scrub = st.trigger?.contains?.(el) && st.animation && st.vars?.scrub;
      if (!pin && !scrub) continue;
      if (!best || st.end - st.start < best.end - best.start) best = st;
    }
    if (best) return { a: Math.max(0, best.start - vh() * 0.6), b: Math.min(maxY(), best.end) };
  }
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    if (a.tagName === 'MAIN') break;
    if (a.offsetHeight > vh() * 1.6) {
      const top = a.getBoundingClientRect().top + scrollY();
      return { a: Math.max(0, top - vh()), b: Math.min(maxY(), top + a.offsetHeight) };
    }
  }
  return null;
}

function search(el, { a, b }, align) {
  if (!(b > a)) return null;
  const N = 24;
  const samples = [];
  // A spot where it is still turning or sliding (its box changes as the page scrolls on) is less good: a theme
  // may snap away from it when the scroll stops.
  const at = (y) => {
    jump(Math.min(b, y + 8));
    const q = el.getBoundingClientRect();
    jump(y);
    const r = el.getBoundingClientRect();
    const dt = q.top - r.top;
    const moving = Math.abs(q.width - r.width) + Math.abs(q.height - r.height) + Math.min(Math.abs(dt), Math.abs(dt + (Math.min(b, y + 8) - y))) > 2;
    samples.push({ y, s: score(el, align) + (moving ? 1 : 0) });
  };
  for (let i = 0; i <= N; i++) at(a + ((b - a) * i) / N);
  const step = (b - a) / N;
  let best = samples.reduce((m, x) => (x.s < m.s ? x : m));
  for (let i = -3; i <= 3; i++) if (i) at(clamp(best.y + (step * i) / 4, a, b));
  best = samples.reduce((m, x) => (x.s < m.s ? x : m));
  if (best.s >= 3) return null;
  // Where it holds still (a pinned page between turns), land in the middle of that stretch: no snap moves it away.
  const flat = samples.filter((x) => x.s <= best.s + 0.03).map((x) => x.y).sort((p, q) => p - q);
  let lo = best.y; let hi = best.y;
  for (const y of flat) { if (y < lo && lo - y <= step * 1.01) lo = y; }
  for (const y of flat) { if (y > hi && y - hi <= step * 1.01) hi = y; }
  for (let k = 0; k < 3; k++) for (const y of flat) { if (y < lo && lo - y <= step * 1.01) lo = y; if (y > hi && y - hi <= step * 1.01) hi = y; }
  return (lo + hi) / 2;
}

/** Brings the element to the centre (or the top, for a whole part) of the view. */
async function bring(el, { instant, align }) {
  await libs;
  if (ST && !refreshed) {
    refreshed = true;
    try { if (ST.getAll().length) ST.refresh(); } catch { /* ignore */ }
  }
  innerScroll(el, instant);
  const y0 = scrollY();
  const r0 = el.getBoundingClientRect();
  let y = clamp(y0 + r0.top - idealTop(r0, align), 0, maxY());
  jump(y);
  let r = el.getBoundingClientRect();
  if (placed(r, align) && opacityOf(el) > 0.3) {
    // Parallax and scrubbed motion move things as the page scrolls: correct once.
    const dy = r.top - idealTop(r, align);
    if (Math.abs(dy) > 12) { y = clamp(y + dy, 0, maxY()); jump(y); r = el.getBoundingClientRect(); }
  } else {
    // Not where it should be, or faded out there: search the journey it rides in (or the screens around it).
    const span = journeyOf(el) || { a: Math.max(0, y - vh() * 1.5), b: Math.min(maxY(), y + vh() * 1.5) };
    const s = span && search(el, span, align);
    if (s != null) y = s;
  }
  if (instant) { jump(y); return; }
  jump(y0);
  glide(y);
}

// ── The outline ────────────────────────────────────────────────────────────

let ringRun = 0;
function ring(el) {
  document.querySelectorAll('[data-nimtto-ring]').forEach((r) => r.remove());
  const box = document.createElement('div');
  box.setAttribute('data-nimtto-ring', '');
  box.setAttribute('aria-hidden', 'true');
  document.body.append(box);
  const pad = 6;
  let size = '';
  const place = () => {
    const r = el.getBoundingClientRect();
    const next = `${Math.round(r.width)}x${Math.round(r.height)}`;
    if (next !== size) { // sized once (and again only if the element itself resizes)
      size = next;
      box.style.width = `${Math.round(r.width + pad * 2)}px`;
      box.style.height = `${Math.round(r.height + pad * 2)}px`;
    }
    box.style.transform = `translate3d(${Math.round(r.left - pad)}px, ${Math.round(r.top - pad)}px, 0)`;
  };
  place();
  // Fade in, hold while the scroll settles, then fade out over 1.6 s (opacity only).
  const anim = box.animate(
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
    if (run !== ringRun || !box.isConnected) return;
    if (el.isConnected) place();
    requestAnimationFrame(track);
  };
  requestAnimationFrame(track);
  anim.finished.then(() => { if (run === ringRun) box.remove(); }).catch(() => {});
}

// ── Hot patches: the client's edit appears in place, without reloading the page ──

const BAD_KEY = new Set(['__proto__', 'prototype', 'constructor']);
function setIn(obj, path, value) {
  let o = obj;
  for (const k of path.slice(0, -1)) {
    if (BAD_KEY.has(k) || o == null || typeof o !== 'object') return;
    o = o[k];
  }
  const last = path[path.length - 1];
  if (o && typeof o === 'object' && !BAD_KEY.has(last)) o[last] = value;
}

const NO_TEXT = 'script, style, noscript, template, [data-nimtto-ring], .svg-defs';
function textNodes() {
  const out = [];
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.trim() && !n.parentElement?.closest(NO_TEXT)) out.push(n);
  return out;
}

const memory = new Map(); // field path -> the text nodes it was last written into

/** Replaces the old words with the new ones wherever the page shows them (hidden language and dialogs too). */
function patchText(path, old, value) {
  const key = JSON.stringify(path);
  const from = old.trim();
  const to = value.trim();
  const touched = new Set();
  if (from.length < 2) return [];
  let nodes = (memory.get(key) || []).filter((n) => n.isConnected && n.nodeValue.includes(from));
  if (!nodes.length) {
    const short = from.length < 4; // a letter or two: whole words only, never inside other text
    nodes = textNodes().filter((n) => (short ? n.nodeValue.trim() === from : n.nodeValue.includes(from)));
  }
  for (const n of nodes) {
    n.nodeValue = n.nodeValue.split(from).join(to);
    touched.add(n.parentElement);
  }
  // Words a theme split into pieces (a span per word or line): replace the whole element's text.
  const want = norm(from);
  const seen = new Set();
  for (const n of textNodes()) {
    const piece = norm(n.nodeValue);
    if (!piece || !want.includes(piece) || piece === want) continue;
    let el = n.parentElement;
    for (let i = 0; el && el !== document.body && i < 4; i++, el = el.parentElement) {
      if (seen.has(el)) break;
      seen.add(el);
      if (norm(el.textContent) === want) {
        el.textContent = to;
        touched.add(el);
        nodes.push(el.firstChild);
        break;
      }
    }
  }
  memory.set(key, nodes.filter((n) => n && n.nodeType === 3));
  return [...touched].filter(Boolean);
}

const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Swaps a photo for another one: img src/srcset, SVG images and CSS backgrounds. */
function patchImage(pairs) {
  const map = new Map();
  for (const [a, b] of pairs) {
    let from = a;
    try { from = decodeURI(new URL(a, location.href).pathname); } catch { /* keep */ }
    if (from.length > 4 && from !== b) map.set(from, b);
  }
  if (!map.size) return [];
  const re = new RegExp([...map.keys()].map(esc).join('|'), 'g');
  const swap = (v) => {
    if (!v) return v;
    let s = v;
    try { s = decodeURI(v); } catch { /* keep */ }
    return re.test(s) ? (re.lastIndex = 0, s.replace(re, (m) => map.get(m))) : null;
  };
  const touched = new Set();
  const attr = (el, name) => {
    const v = swap(el.getAttribute(name));
    if (v != null) { el.setAttribute(name, v); touched.add(el); }
  };
  for (const el of document.querySelectorAll('img')) { attr(el, 'src'); attr(el, 'srcset'); attr(el, 'data-src'); }
  for (const el of document.querySelectorAll('source[srcset]')) { attr(el, 'srcset'); if (touched.has(el)) touched.add(el.parentElement?.querySelector('img')); }
  for (const el of document.querySelectorAll('image')) { attr(el, 'href'); attr(el, 'xlink:href'); }
  for (const el of document.querySelectorAll('video[poster]')) attr(el, 'poster');
  for (const el of document.body.getElementsByTagName('*')) {
    if (el.closest(NO_TEXT)) continue;
    const st = el.getAttribute('style');
    if (st && st.includes('url(')) attr(el, 'style');
    if (touched.has(el)) continue;
    const bg = getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none') {
      const v = swap(bg);
      if (v != null) { el.style.backgroundImage = v; touched.add(el); }
    }
  }
  return [...touched].filter((el) => el && el.tagName !== 'SOURCE');
}

/** The patched element nearest the middle of the view (the page does not move). */
function ringNearest(list) {
  let best = null;
  let bd = Infinity;
  for (const el of list) {
    if (!isShown(el) || (!SKIP && isCovered(el))) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh() || r.width * r.height < 4) continue;
    const d = Math.abs(r.top + r.height / 2 - vh() / 2);
    if (d < bd) { bd = d; best = el; }
  }
  if (best) ring(best.closest('button, a, figure') && best.tagName === 'IMG' ? best.closest('button, a, figure') : best);
}

/** Applies the studio's text and photo changes in place. Anything not found asks the studio for a full render. */
export function patch(changes) {
  const all = [];
  let missed = 0;
  for (const c of changes) {
    let got = [];
    if (c.kind === 'text') {
      got = patchText(c.path, c.old, c.value);
      setIn(config, c.path, c.value);
    } else if (c.kind === 'image') got = patchImage(c.pairs);
    if (!got.length) missed += 1;
    all.push(...got);
  }
  if (all.length) ringNearest(all);
  post({ type: 'nimtto:patched', ok: missed === 0, missed });
}

/** The theme's colours, live (the same inline custom properties data.js sets on load). */
export function colors(map) {
  for (const [name, value] of Object.entries(map)) {
    if (value) document.body.style.setProperty(name, value);
    else document.body.style.removeProperty(name);
  }
}

// ── Click to edit: a click in the preview tells the studio what to edit ───

let picking = false;
let hoverBox = null;
let hoverEl = null;
const PHOTO_URL = /url\(["']?([^"')]+)["']?\)/;
const photoish = (u) => /\/(photos|uploads)\//.test(u || '');

/** The photo an element shows (an <img>, or a CSS background from the photo library or an upload). */
function photoOf(el) {
  const img = el.closest('img') || (el.matches('button, a, figure, picture') ? el.querySelector('img') : null);
  if (img && photoish(img.currentSrc || img.getAttribute('src'))) return { el: img.closest('button, a, figure') || img, url: img.currentSrc || img.getAttribute('src') };
  for (let e = el, i = 0; e && e !== document.body && i < 3; e = e.parentElement, i++) {
    const m = PHOTO_URL.exec(getComputedStyle(e).backgroundImage || '');
    if (m && photoish(m[1])) return { el: e, url: m[1] };
  }
  return null;
}

/** The smallest block of words around the pointer (a bilingual wrapper counts as one). */
function wordsOf(el) {
  for (let e = el, i = 0; e && e !== document.body && i < 5; e = e.parentElement, i++) {
    if (e.closest(SKIP_UI)) return null;
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim().length > 1);
    if (!own) continue;
    const r = e.getBoundingClientRect();
    if (r.height > vh() * 0.6 || r.width * r.height < 30) return null;
    const lang = e.closest('.l-ne, [lang="ne"]') ? 'ne' : 'en';
    const text = (e.textContent || '').replace(/\s+/g, ' ').trim();
    return text.length >= 2 ? { el: e, text: text.slice(0, 300), lang } : null;
  }
  return null;
}

/** Which part of the invitation an element belongs to (the nimtto:focus vocabulary). */
function partOf(el) {
  if (el.closest('#music-pill, #music-sheet')) return 'music';
  const ev = el.closest('.su-ev, [id^="ev-"], [id^="pg-"], [id^="st-ev-"], [id^="ch-ev-"]');
  if (ev) {
    const list = config.events || [];
    const id = ev.id.replace(/^(ev|pg|st-ev)-/, '');
    let i = list.findIndex((e) => e?.id === id);
    if (i < 0 && /^ch-ev-\d+$/.test(ev.id)) i = Number(ev.id.slice(6));
    if (i < 0) i = [...document.querySelectorAll('.su-ev')].indexOf(ev);
    if (i >= 0) return `event:${i}`;
  }
  const PARTS = [
    ['countdown', '[data-countdown], #countdown, #count'], ['scratch', '[data-scratch], #scratch'],
    ['rsvp', '#rsvp, form.rsvp, #finale-root'], ['gallery', '[data-lb-idx], #photos, #gallery, #album, #stills, #stripview'],
    ['card', '[data-open-card], #cardmodal, .su-modal, #card-dialog, .mg-modal'], ['families', '#families, .su-fam'],
    ['couple', '#couple, .su-couple, #us, #two'], ['date', '#date, .su-date'], ['events', '#programme, .su-prog, #events, #days'],
    ['closing', '.su-close, footer'], ['gate', '#gate, .su-gate, [id^="gate"]'], ['hero', '#top, #hero, #welcome, .su-hero'],
  ];
  for (const [name, sel] of PARTS) if (el.closest(sel)) return name;
  return null;
}

function pickOf(target) {
  if (!(target instanceof Element) || target.closest('[data-nimtto-ring], [data-nimtto-hover], #lang-toggle')) return null;
  const section = partOf(target);
  const ph = photoOf(target);
  if (ph) {
    let url = ph.url;
    try { url = decodeURI(new URL(url, location.href).pathname); } catch { /* keep */ }
    const lb = target.closest('[data-lb-idx]');
    return { el: ph.el, target: { image: [url], ...(lb ? { index: Number(lb.dataset.lbIdx) } : {}), ...(section ? { section } : {}) } };
  }
  const w = wordsOf(target);
  if (w) return { el: w.el, target: { text: w.text, lang: w.lang, ...(section ? { section } : {}) } };
  if (section) return { el: target.closest('#music-pill') || sectionEl(section) || target, target: { section } };
  return null;
}

/** What is under the pointer: words or a photo even below a transparent layer (a flap, a glint), else the part. */
function pickAt(x, y, target) {
  const stack = typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(x, y).slice(0, 8) : [];
  for (const el of stack) {
    if (el === document.documentElement || el === document.body) break;
    const p = pickOf(el);
    if (p && (p.target.text || p.target.image)) return p;
  }
  return pickOf(target);
}

function hover(el) {
  if (el === hoverEl) return;
  hoverEl = el;
  if (!hoverBox) {
    hoverBox = document.createElement('div');
    hoverBox.setAttribute('data-nimtto-hover', '');
    hoverBox.setAttribute('aria-hidden', 'true');
    hoverBox.innerHTML = '<span>Edit</span>';
    document.body.append(hoverBox);
  }
  if (!el) { hoverBox.style.opacity = '0'; return; }
  const r = el.getBoundingClientRect();
  hoverBox.style.width = `${Math.round(r.width + 8)}px`;
  hoverBox.style.height = `${Math.round(r.height + 8)}px`;
  hoverBox.style.transform = `translate3d(${Math.round(r.left - 4)}px, ${Math.round(r.top - 4)}px, 0)`;
  hoverBox.style.opacity = '1';
}

const ownUi = (e) => e.target instanceof Element && e.target.closest('#lang-toggle');
function onBlock(e) {
  if (!picking || bypass || !e.isTrusted || ownUi(e)) return;
  e.stopPropagation();
  e.stopImmediatePropagation();
}
function onClick(e) {
  if (!picking || bypass || !e.isTrusted || ownUi(e)) return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  const p = pickAt(e.clientX, e.clientY, e.target);
  if (!p) return;
  ring(p.el);
  post({ type: 'nimtto:pick', target: p.target });
}

/** "Click to edit" on or off ("Try it": the page behaves exactly as it does for guests). */
export function setPicking(on) {
  picking = Boolean(on);
  document.documentElement.classList.toggle('nimtto-pick', picking);
  if (!picking) hover(null);
}
for (const t of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'touchstart', 'touchend', 'dblclick', 'auxclick', 'submit']) {
  window.addEventListener(t, onBlock, { capture: true });
}
window.addEventListener('click', onClick, { capture: true });
let moveQueued = null;
window.addEventListener('pointermove', (e) => {
  if (!picking) return;
  if (!moveQueued) requestAnimationFrame(() => { const m = moveQueued; moveQueued = null; const p = pickAt(m.x, m.y, m.t); hover(p ? p.el : null); });
  moveQueued = { x: e.clientX, y: e.clientY, t: e.target };
}, { capture: true, passive: true });
window.addEventListener('scroll', () => { if (hoverEl) { const el = hoverEl; hoverEl = null; hover(el); } }, { capture: true, passive: true });
document.documentElement.addEventListener('pointerleave', () => hover(null));

// ── The flow ───────────────────────────────────────────────────────────────

function snap(on) { document.documentElement.classList.toggle('nimtto-snap', on); }

async function show(t, { instant }) {
  const run = ++showRun;
  let found = resolve(t);
  // A card or sheet opened for the previous target: close it first (it locks the page's scroll).
  if (opened && !(found?.music && opened.id === 'music-sheet') && closeOpened(found?.dialog || found?.el)) {
    // Wait for the page to be scrollable again (a dialog unlocks the page, and restores its scroll, as it closes).
    const t0 = performance.now();
    do await wait(80); while (document.body.style.position === 'fixed' && performance.now() - t0 < 1200);
    await wait(120);
    if (run !== showRun) return;
    found = resolve(t);
  }
  if (found && (found.details || found.dialog || found.music)) {
    const ok = await reveal(found);
    if (run !== showRun) return;
    if (!ok) found = t.section ? (sectionEl(t.section) ? { el: sectionEl(t.section), how: 'section' } : null) : null;
  }
  if (!found) {
    current = null;
    if (Number.isFinite(t.y) && !frozen()) jump(clamp(t.y, 0, maxY()));
    post({ type: 'nimtto:focused', ok: false, reason: 'missing' });
    return;
  }
  const el = found.el;
  const gated = frozen();
  if (gated && (isCovered(el) || !inView(el))) { current = null; post({ type: 'nimtto:focused', ok: false, reason: 'opening' }); return; }
  const align = found.how === 'section' ? 'start' : 'center';
  const quick = instant || reduce();
  if (!gated && !found.music) {
    if (quick) snap(true);
    await bring(el, { instant: quick, align });
    if (quick) setTimeout(() => snap(false), 320);
  }
  if (run !== showRun) return;
  current = { t, el, align };
  window.__nimttoFocus = { el, how: found.how }; // for the studio's own checks
  const r = el.getBoundingClientRect();
  if (found.how !== 'section' || (!gated && r.height < vh() * 0.7)) ring(el);
  post({ type: 'nimtto:focused', ok: true, how: found.how });
}

/** Keeps the shown element in place while late images and fonts move the layout (until the user scrolls). */
async function settle() {
  if (!current || userMoved || frozen()) return;
  let { el } = current;
  if (!el.isConnected) {
    const again = resolve(current.t);
    if (!again) return;
    el = current.el = again.el;
  }
  if (placed(el.getBoundingClientRect(), current.align)) return;
  snap(true);
  await bring(el, { instant: true, align: current.align });
  setTimeout(() => snap(false), 320);
}

/** For the studio (same origin): where this page is, and whether the client scrolled it themselves. */
window.__nimttoState = () => ({ y: scrollY(), moved: userMoved });

function watchUser() {
  const stop = () => { userMoved = true; };
  for (const ev of ['wheel', 'touchstart', 'keydown', 'pointerdown']) window.addEventListener(ev, stop, { passive: true, capture: true });
}

/** Called once the theme has rendered. `target` came with the data (re-shown after every reload). */
export async function start({ target }) {
  await libs;
  await frame();
  await frame();
  if (SKIP) await untilOpen();
  else await Promise.race([mountedP, wait(1500)]);
  ready = true;
  watchUser();
  const t = pending || target;
  pending = null;
  try {
    if (t) await show(t, { instant: true });
  } finally {
    document.documentElement.classList.remove('nimtto-hold');
    post({ type: 'nimtto:settled' });
  }
  for (const ms of [700, 1600]) setTimeout(settle, ms);
  window.addEventListener('load', () => setTimeout(settle, 60), { once: true });
}

export function mounted() {
  resolveMounted();
  if (ready) setTimeout(settle, 30);
}

export function focus(t) {
  userMoved = false;
  if (!ready) { pending = t; return; }
  show(t, { instant: Boolean(t.instant) }).then(() => { for (const ms of [1100, 2200]) setTimeout(settle, ms); });
}

/** "Play opening": runs the opening once, then shows the last thing pointed at. */
export async function play() {
  if (!pressEnter(false)) return;
  played = true;
  const t = current?.t;
  current = null;
  const t0 = performance.now();
  while (isGated() && performance.now() - t0 < 9000) await wait(120);
  await wait(400);
  if (t && !userMoved) show(t, { instant: false });
}
