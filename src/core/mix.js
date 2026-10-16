// Mix: one invitation, three choices (docs/MIX.md). The page is the body theme's ("host"); `config.design` may
// swap in another theme's GATE (the entry screen and its opening) and another theme's HERO (the first screen after
// the gate). Absent, the host runs exactly as before: createMix() returns { gate: null, hero: null } and touches
// nothing.
//
// Modules live next to their theme: src/themes/<slug>/gate.js and hero.js (contract in docs/MIX.md). They are
// loaded only when chosen (Vite splits each into its own chunk with its CSS). Which combinations are allowed is
// decided in mix-rules.js (shared with the studio and the server). A see-through gate (agni, janti, rangoli,
// sindoor, shree: OPENING_SCENES) is a pair module (`pair: true`) and comes only with its own first screen.
import { gsap } from 'gsap';
import './mix.css';
import { bi, esc, neNum, timeLabel } from './i18n.js';
import { useSlots } from './slots.js';
import { photoUrl } from '../photos.js';
import { guestEvents } from './finale.js';
import { reducedMotion, getLenis } from './smooth.js';
import { on, adParts, bsParts, npDay } from '../themes/_suite/kit.js';
import { normParts, resolveDesign, OPENING_SCENES } from './mix-rules.js';

const GATES = import.meta.glob('../themes/*/gate.js');
const HEROES = import.meta.glob('../themes/*/hero.js');
const COLOR_NAME = /^--[a-z0-9-]+$/;
const COLOR_HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const params = new URLSearchParams(location.search);
// ?gate=<slug>&hero=<slug> (or =own) try a combination without saving it: on the dev server, and in the studio's
// preview (preview=1 inside a same-origin frame), never on a guest's page (designs are never public live).
const studioFrame = (() => { try { return window.parent !== window && window.parent.location.origin === location.origin; } catch { return false; } })();
const OVERRIDE = Boolean(import.meta.env.DEV) || (params.get('preview') === '1' && studioFrame);

/** This page's view of a theme's `parts`: the host's from its manifest, a giver's from which modules exist. */
function partsFor(host, hostManifest) {
  return (s) => {
    if (s === host) return normParts(hostManifest?.parts, host, hostManifest || {}, { gate: Boolean(GATES[`../themes/${host}/gate.js`]), hero: Boolean(HEROES[`../themes/${host}/hero.js`]) });
    const gate = Boolean(GATES[`../themes/${s}/gate.js`]);
    return { gate: gate ? (OPENING_SCENES.includes(s) ? 'pair' : true) : false, hero: Boolean(HEROES[`../themes/${s}/hero.js`]) };
  };
}

/**
 * Which foreign parts this page shows (rules in mix-rules.js, shared with the studio and the server). Invalid,
 * unknown, own or not allowed by the host → null (the host's own). `gate === host` means the host's own gate runs
 * as its module (its own opening reaches into its own hero, which a foreign hero has replaced).
 */
export function designOf(config, host, hostManifest, { override = OVERRIDE } = {}) {
  const want = isPlain(config.design) ? { gate: config.design.gate, hero: config.design.hero } : {};
  if (override) for (const k of ['gate', 'hero']) if (params.has(k)) want[k] = params.get(k);
  const r = resolveDesign(want, host, partsFor(host, hostManifest));
  return { gate: r.ownGate ? host : r.gate, hero: r.hero };
}

// ───────── fonts: each module names its Google Fonts families; one <link> per family, never twice ─────────
const fontsDone = new Set();
function loadFonts(families = []) {
  const todo = families.filter((f) => /^[A-Za-z0-9+:;@,.]{2,120}$/.test(f) && !fontsDone.has(f));
  if (!todo.length) return Promise.resolve();
  todo.forEach((f) => fontsDone.add(f));
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${todo.map((f) => `family=${f}`).join('&')}&display=swap`;
  const p = new Promise((r) => { link.onload = r; link.onerror = r; setTimeout(r, 2500); });
  document.head.append(link);
  return p.then(() => Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 1500))]));
}

/** The module's own colours (themeColors[<its slug>]), only tokens its manifest declares, inline on its wrapper. */
function applyColors(el, config, slug, manifest) {
  const colors = config.themeColors?.[slug];
  const allowed = manifest?.colors || {};
  if (!isPlain(colors)) return;
  for (const [name, value] of Object.entries(colors)) {
    if (COLOR_NAME.test(name) && name in allowed && typeof value === 'string' && COLOR_HEX.test(value)) el.style.setProperty(name, value);
  }
}

/** What a gate or hero builds its markup from: the same helpers the suite engine gives T.gate / T.hero. */
function partCtx(config, slug, manifest) {
  const S = useSlots(manifest);
  const txt = S.txt;
  const c = config.couple;
  const events = guestEvents();
  const mainEv = events.find((e) => e?.start && npDay(e.start) === npDay(config.weddingDate)) || null;
  const mainIso = mainEv?.start || config.weddingDate;
  const ganeshRef = manifest.images?.['hero.ganesh'] && on(txt('ganesh.show')) ? S.img('hero.ganesh') : null;
  return {
    slug, config, c, S, txt, bi, esc, on, neNum, timeLabel, photoUrl, gsap,
    reduced: reducedMotion() || params.has('still'),
    mainEv, AD: adParts(mainIso), BS: bsParts(mainIso, mainEv?.dateBS || config.weddingDateBS),
    placeLine: mainEv?.venue?.en || mainEv?.venue?.ne ? mainEv.venue : config.city,
    names: (amp = '&amp;') => `<span class="su-n">${bi(c.bride.name)}</span><span class="su-amp" aria-hidden="true">${amp}</span><span class="sr-only">and</span><span class="su-n">${bi(c.groom.name)}</span>`,
    ganeshRef,
    ganesh: (cls = '', sizes = '200px') => (ganeshRef
      ? `<img class="su-ganesh ${cls}" src="${esc(photoUrl(ganeshRef, 'sm'))}" srcset="${esc(photoUrl(ganeshRef, 'sm'))} 400w, ${esc(photoUrl(ganeshRef, 'lg'))} 1000w" sizes="${sizes}" alt="${esc(S.alt('hero.ganesh') || 'Shri Ganesh')}" decoding="async" />`
      : ''),
  };
}

/**
 * Third-party art a borrowed part shows (CC BY / CC BY-SA cut-outs and the like): each module's `credits`, the same
 * list its theme's flora-credits file gives the /credits/ page. One row per source, noting the theme and the part.
 */
function creditsOf(parts) {
  const rows = new Map();
  for (const [mod, part] of parts) {
    for (const k of Array.isArray(mod?.credits) ? mod.credits : []) {
      const sourceUrl = String(k?.source_url || k?.url || '');
      if (!/^https:\/\//.test(sourceUrl)) continue; // notes such as "marigolds are cut from a library photo"
      const key = sourceUrl.replace(/[?#].*$/, '');
      const row = rows.get(key) || { title: String(k.title || ''), author: String(k.creator || ''), license: String(k.license || ''),
        licenseUrl: /^https:\/\//.test(k.license_url || '') ? k.license_url : '', sourceUrl, from: [] };
      if (!row.from.some((f) => f.theme === mod.id && f.part === part)) row.from.push({ theme: mod.id, part });
      rows.set(key, row);
    }
  }
  return [...rows.values()];
}

/** How long a host's `ready` may keep a foreign gate's buttons disabled. */
const HOST_WAIT = 12000;

/**
 * The host preloads its own gate art in its index.html (Gurans' arch, for example). Under a foreign gate nothing
 * uses it, and the browser warns about an unused preload: claim each matching one from the cache (no new request).
 */
function claimPreloads() {
  document.querySelectorAll('link[rel="preload"][as="image"]').forEach((l) => {
    if (l.media && !matchMedia(l.media).matches) return;
    const im = new Image();
    im.decoding = 'async';
    if (l.imageSrcset) { im.sizes = l.imageSizes || ''; im.srcset = l.imageSrcset; } // the same candidate the preload chose
    if (l.href) im.src = l.href;
  });
}

function wrapper(tag, kind, mod, id) {
  const el = document.createElement(tag);
  el.className = `mx-part mx-${kind} mx-${kind}--${mod.id} ${mod.suite ? 'su ' : ''}theme-${mod.id}`;
  el.dataset.mx = mod.id;
  if (id) el.id = id;
  return el;
}

/**
 * Prepare the mix for a host page. Call it right after loadInvitation(), before rendering: it loads the chosen
 * modules (their JS, CSS and fonts) so the page can render once. Without a design it resolves at once.
 */
export async function createMix({ host, manifest, config, noOverride = false }) {
  const { gate, hero } = designOf(config, host, manifest, { override: !noOverride });
  const mix = { gate, hero, gateMod: null, heroMod: null, heroInst: null, gateRun: null, credits: [] };
  if (!gate && !hero) return mix;
  if (params.has('debug')) window.__mx = mix; // screenshots: __mx.gateRun.at(t), .finish()
  const [g, h] = await Promise.all([
    gate ? GATES[`../themes/${gate}/gate.js`]().then((m) => m.default) : null,
    hero ? HEROES[`../themes/${hero}/hero.js`]().then((m) => m.default) : null,
  ]);
  // An opening scene (a see-through gate, docs/MIX.md §6.1) only travels with its own first screen.
  if (g?.pair === true && h?.id !== g.id) {
    console.warn(`[mix] ${g.id}'s gate is an opening scene: it needs its own first screen`);
    return createMix({ host, manifest, config: { ...config, design: { hero: h?.id } }, noOverride: true });
  }
  mix.gateMod = g; mix.heroMod = h;
  // The borrowed parts' third-party art: a host that lists credits on its page adds these to its own list. (No
  // invitation lists asset credits today: they are on /credits/, which lists every theme's art, wherever it travels.)
  mix.credits = creditsOf([[g, 'gate'], [h, 'hero']]);
  await loadFonts([...(g?.fonts || []), ...(h?.fonts || [])]);
  document.documentElement.classList.add('mx');
  if (g) document.documentElement.dataset.mxGate = g.id;
  if (h) document.documentElement.dataset.mxHero = h.id;
  // an opening scene: its first screen shows beneath its see-through gate (mix.css), even on a host that hides its page
  if (g?.pair === true) document.documentElement.dataset.mxPair = g.id;

  // ───────── the hero: replaces the host's first screen; the host's page continues after it ─────────
  mix.mountHero = (old) => {
    if (!h || !old) return null;
    const next = old.nextElementSibling;
    if (next && !next.id) next.id = 'mx-next';
    const sec = wrapper('section', 'hero', h, 'top');
    sec.setAttribute('aria-label', old.getAttribute('aria-label') || `${config.couple.bride.name.en} and ${config.couple.groom.name.en}`);
    applyColors(sec, config, h.id, h.manifest);
    const ctx = partCtx(config, h.id, h.manifest);
    old.replaceWith(sec);
    const inst = h.mount(sec, ctx) || {};
    if (inst.cue !== false && next) {
      sec.insertAdjacentHTML('beforeend', `<a class="mx-cue" id="cue" href="#${esc(next.id)}"><span>${bi({ en: 'Scroll', ne: 'तल हेर्नुहोस्' })}</span><i aria-hidden="true"></i></a>`);
      sec.querySelector('.mx-cue').addEventListener('click', (e) => {
        e.preventDefault();
        const y = next.getBoundingClientRect().top + window.scrollY;
        const l = getLenis();
        if (l) l.scrollTo(y); else window.scrollTo({ top: y, behavior: ctx.reduced ? 'auto' : 'smooth' });
      });
    }
    mix.heroInst = { ...inst, el: sec, ctx };
    return mix.heroInst;
  };
  /** The foreign hero's entrance, added to the opening timeline at `at`; returns when its words are in. */
  mix.heroEnter = (tl, at) => {
    const hi = mix.heroInst;
    if (!hi) return at;
    const end = hi.enter?.(tl, at) ?? at;
    const cue = hi.el.querySelector('.mx-cue');
    if (cue) tl.fromTo(cue, { opacity: 0 }, { opacity: 1, duration: 0.6 }, end + 0.3);
    return end;
  };
  /** After the opening: the hero's scroll-linked and ambient parts (call once, after the host's smooth scroll). */
  mix.afterOpen = () => {
    const hi = mix.heroInst;
    if (!hi || hi.started) return;
    hi.started = true;
    hi.el.classList.add('is-open');
    hi.after?.();
  };

  // ───────── the gate: a fixed overlay above the host page ─────────
  /**
   * host = {
   *   start(withMusic)  inside the guest's tap: unlock and start the host's music (and ring its bell)
   *   intro(tl, at)     the host's own hero entrance (not called when a foreign hero is mounted)
   *   finish()          the host's after-open: unlock scrolling, smooth scroll, reveals
   *   ready?            a Promise: the gate's buttons stay disabled until it settles too (a 3D host's scene loading);
   *                     capped at HOST_WAIT ms, after which an early tap holds on the gate's last frame as before
   * }
   */
  mix.mountGate = (hostHooks) => {
    if (!g) return null;
    claimPreloads();
    const ctx = partCtx(config, g.id, g.manifest);
    const el = wrapper('div', 'gate', g, 'gate');
    // Opening scene (docs/MIX.md §6.1): a thin gate (its line, buttons and a wash) over its own first screen, which
    // mix has already mounted beneath; its open(tl) lifts the wash and the hero's own entrance does the rest.
    if (g.pair === true) {
      el.classList.add('mx-gate--pair');
      ctx.pair = true;
      ctx.hero = mix.heroInst?.el || null;
    }
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', `${config.couple.bride.name.en} and ${config.couple.groom.name.en}`);
    applyColors(el, config, g.id, g.manifest);
    const ownUi = typeof g.ui === 'function';
    el.innerHTML = `<div class="mx-gate__scene" aria-hidden="${ownUi ? 'false' : 'true'}"></div>${ownUi ? g.ui(ctx) : `
      <div class="mx-ui">
        <p class="mx-ui__line">${bi(ctx.txt('gate.line'))}</p>
        <button class="mx-ui__open" data-mx-open type="button" disabled>${bi(ctx.txt('gate.open'))}</button>
        <button class="mx-ui__quiet" data-mx-quiet type="button" disabled>${bi(ctx.txt('gate.quiet'))}</button>
      </div>`}`;
    document.body.append(el);
    const inst = g.mount(el.querySelector('.mx-gate__scene'), ctx, el) || {};
    const openBtns = [...el.querySelectorAll('[data-mx-open]')];
    const quietBtn = el.querySelector('[data-mx-quiet]');
    // live-preview.js presses #quiet / #open: the host's own gate is gone, so these ids are free
    if (openBtns[0]) openBtns[0].id = 'open';
    if (quietBtn) quietBtn.id = 'quiet';
    let opened = false; let finished = false; let tl = null; let safety = 0;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(safety);
      inst.destroy?.();
      el.remove();
      hostHooks.finish?.();
      mix.afterOpen();
    };
    const go = (withMusic) => {
      if (opened) return tl;
      opened = true;
      try { hostHooks.start?.(withMusic); } catch { /* audio is optional */ }
      el.classList.add('is-opening');
      tl = gsap.timeline({ onComplete: done });
      let reveal;
      if (ctx.reduced) {
        tl.to(el, { autoAlpha: 0, duration: 0.5, ease: 'power1.inOut' }, 0);
        reveal = 0.2;
      } else {
        tl.to(el.querySelectorAll('.mx-ui, [data-mx-ui]'), { autoAlpha: 0, y: 10, duration: 0.4, ease: 'power2.out' }, 0);
        const at = inst.open?.(tl) ?? 0.4;
        // the neutral reveal: whatever is left of the gate fades onto the page beneath. An opening scene's wash clears
        // in its own time over its first screen (Janti's dusk lifts over 1.6 s), so there the fade ends with it.
        const fadeAt = g.pair === true ? Math.max(at, tl.duration() - 0.7) : at;
        tl.to(el, { autoAlpha: 0, duration: 0.7, ease: 'power1.inOut' }, fadeAt);
        reveal = at + 0.15;
      }
      if (mix.heroInst) mix.heroEnter(tl, reveal);
      else hostHooks.intro?.(tl, reveal);
      safety = setTimeout(() => { if (!finished) tl.progress(1); }, (tl.duration() + 2.5) * 1000);
      return tl;
    };
    const hostReady = hostHooks.ready ? Promise.race([Promise.resolve(hostHooks.ready).catch(() => {}), new Promise((r) => setTimeout(r, HOST_WAIT))]) : null;
    Promise.all([Promise.resolve(inst.ready).catch(() => {}), hostReady]).finally(() => {
      openBtns.forEach((b) => { b.disabled = false; });
      if (quietBtn) quietBtn.disabled = false;
      el.classList.add('is-ready');
    });
    openBtns.forEach((b) => b.addEventListener('click', () => go(true)));
    quietBtn?.addEventListener('click', () => go(false));
    (inst.taps || []).forEach((t) => t.addEventListener('click', () => go(true)));
    mix.gateRun = {
      el, open: go,
      timeline: () => tl,
      finish: () => { go(false); clearTimeout(safety); tl.progress(1); },
      at: (t) => { go(false); clearTimeout(safety); tl.pause(); tl.seek(t, false); return tl.duration(); },
    };
    return mix.gateRun;
  };
  return mix;
}
