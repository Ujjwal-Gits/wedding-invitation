// The live preview (PLATFORM.md "Live preview protocol"). The theme page runs in an iframe with
// ?preview=1; it asks for data with nimtto:ready, we answer with the unsaved model (and where to look).
//
// Edits never restart the preview. Words, photos and colours are hot-patched into the page that is
// showing (nimtto:patch / nimtto:colors). A change that re-shapes the page (a ceremony added, a date,
// the design) renders a fresh page in a second, hidden iframe that opens at the same spot; it replaces
// the visible one in one quick crossfade once it is ready. The preview follows the field being edited.
import { h, icon, debounce } from './dom.js';
import { diff, targetForField, imageTarget, sectionOfPath, MODULE_TARGETS } from './preview-sync.js';

const DEVICES = { phone: { w: 390, h: 844 }, desktop: { w: 1440, h: 900 } };
const SWAP_MS = 140;
const clone = (v) => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

/**
 * Answers one iframe's nimtto:ready with getData(). Returns a function that removes the listener.
 * (Used by the full-screen theme demo; the preview below runs its own two frames.)
 */
export function bridge(frame, getData, { onReady, onMounted } = {}) {
  const onMsg = (e) => {
    if (e.origin !== location.origin || e.source !== frame.contentWindow) return;
    const type = e.data?.type;
    if (type === 'nimtto:ready') {
      onReady?.();
      try { frame.contentWindow.postMessage({ type: 'nimtto:data', data: getData() }, location.origin); } catch (err) { console.warn('preview: could not send data', err); }
    } else if (type === 'nimtto:mounted') onMounted?.();
  };
  window.addEventListener('message', onMsg);
  return () => window.removeEventListener('message', onMsg);
}

const PICK_KEY = 'nimtto-preview-pick';
const pickPref = (v) => {
  try {
    if (v === undefined) return localStorage.getItem(PICK_KEY) !== '0';
    localStorage.setItem(PICK_KEY, v ? '1' : '0');
  } catch { /* storage off */ }
  return v !== false;
};

/**
 * opts.onPick(target): the client clicked something in the preview ("Click to edit"); the studio opens its field.
 */
export function createPreview(session, { onPick } = {}) {
  const m = session.m;
  let device = 'phone';
  let opening = false;
  let played = false;
  let active = false;
  let target = null;      // where the client is working: { text?, section?, image? }
  let cur = null;         // the frame on screen: { el, url, shown (the model it shows), mounted }
  let next = null;        // a frame rendering in the background
  let pointed = false;
  let moduleTarget = null; // the part of the invitation the open module is about
  let picking = pickPref();
  let quietUntil = 0;      // after a click in the preview the editor moves; the preview stays where it is
  const quiet = () => performance.now() < quietUntil;    // the client pointed somewhere since the page on screen was rendered

  const veil = h('div.pv__veil', { 'aria-hidden': 'true' }, h('span.pv__spin'));
  const screen = h('div.pv__screen', veil);
  const deviceEl = h('div.pv__device', { 'data-device': device }, screen);
  const stage = h('div.pv__stage', deviceEl);

  const seg = h('div.seg.seg--sm', { role: 'group', 'aria-label': 'Preview size' },
    ['phone', 'desktop'].map((d) => h('button.seg__btn', {
      type: 'button', 'aria-pressed': String(d === device), 'aria-label': d === 'phone' ? 'Phone preview' : 'Computer preview', title: d === 'phone' ? 'Phone' : 'Computer',
      onclick: () => setDevice(d),
    }, icon(d, 16), h('span.seg__t', d === 'phone' ? 'Phone' : 'Computer'))));
  const openLink = h('a.btn.btn--icon.btn--ghost', { href: '#', target: '_blank', rel: 'noopener', 'aria-label': 'Open the preview in a new tab', title: 'Open in a new tab' }, icon('external', 16));
  const closeBtn = h('button.btn.btn--icon.btn--ghost.pv__close', { type: 'button', 'aria-label': 'Close the preview', title: 'Close', onclick: () => el.dispatchEvent(new CustomEvent('pv-close')) }, icon('close', 18));
  const playBtn = h('button.btn.btn--sm.btn--quiet.pv__play', { type: 'button', hidden: true, onclick: () => togglePlay() });
  const modeSeg = h('div.seg.seg--sm.pv__mode', { role: 'group', 'aria-label': 'What a click in the preview does' },
    [[true, 'Click to edit', 'Click any words or photo in the preview to edit them'], [false, 'Try it', 'Use the invitation as guests do']].map(([v, label, title]) => h('button.seg__btn', {
      type: 'button', 'aria-pressed': String(v === picking), title,
      onclick: () => setPicking(v),
    }, label)));
  const hint = h('p.pv__hint', { 'aria-live': 'polite' }, 'Edits show here as you type.');
  const el = h('aside.pv', { 'aria-label': 'Live preview' },
    h('header.pv__head',
      h('span.pv__title', h('span.pv__live', { 'aria-hidden': 'true' }), 'Live preview'),
      seg,
      h('span.pv__tools',
        h('button.btn.btn--icon.btn--ghost', { type: 'button', 'aria-label': 'Reload the preview', title: 'Reload', onclick: () => render() }, icon('refresh', 16)),
        openLink, closeBtn)),
    h('div.pv__bar', modeSeg, playBtn),
    stage, hint);

  const url = () => {
    const base = `/${m.data.theme}/?id=${encodeURIComponent(session.slug)}&preview=1`;
    // Every theme skips its opening with one of these (suite and most themes: open; dhoka: skip; bagaicha, durbar: station).
    return opening ? base : `${base}&debug&open&skip&station`;
  };

  // ── Hint line ───────────────────────────────────────────────────────────
  let baseHint = 'Edits show here as you type.';
  let hintTimer = 0;
  const say = (text, ms = 0) => {
    clearTimeout(hintTimer);
    hint.textContent = text;
    if (ms) hintTimer = setTimeout(() => { hint.textContent = baseHint; }, ms);
  };

  // ── Sizing ──────────────────────────────────────────────────────────────
  function fit() {
    // The page inside always gets the real device size first (themes measure the viewport once, as they load).
    const { w, h: ht } = DEVICES[device];
    deviceEl.style.width = `${w}px`;
    deviceEl.style.height = `${ht}px`;
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const pad = device === 'phone' ? 28 : 16;
    const s = Math.min((r.width - pad) / w, (r.height - pad) / ht, 1);
    deviceEl.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  fit();
  new ResizeObserver(fit).observe(stage);

  function setDevice(d) {
    device = d;
    deviceEl.dataset.device = d;
    seg.querySelectorAll('.seg__btn').forEach((b, i) => b.setAttribute('aria-pressed', String(['phone', 'desktop'][i] === d)));
    fit();
  }

  // ── Frames ──────────────────────────────────────────────────────────────
  const send = (rec, msg) => { try { rec?.el.contentWindow?.postMessage(msg, location.origin); } catch { /* gone */ } };

  /** Where a fresh page should open: the spot being edited, or where the client scrolled to. */
  function landing() {
    let st = null;
    try { st = cur?.el.contentWindow?.__nimttoState?.(); } catch { /* not ready */ }
    if (target && (pointed || !st?.moved)) return { ...target, ...(st ? { y: st.y } : {}), instant: true };
    return st ? { y: st.y, instant: true } : null;
  }

  function makeFrame(u, hidden) {
    const f = h('iframe.pv__frame', { title: 'Live preview of the invitation', tabindex: hidden ? -1 : 0, 'aria-hidden': hidden ? 'true' : null });
    if (hidden) f.classList.add('is-next');
    screen.insertBefore(f, veil);
    const rec = { el: f, url: u, shown: null, mounted: false, focus: null };
    f.src = u;
    return rec;
  }

  /** A full render. The first one shows the spinner; later ones render hidden and swap in. */
  function render() {
    if (!active) return;
    const u = url();
    openLink.href = u.replace('&preview=1', '');
    if (!cur) {
      veil.classList.add('is-on');
      cur = makeFrame(u, false);
      cur.focus = target ? { ...target, instant: true } : null;
      drawPlay();
      return;
    }
    if (next) next.el.remove();
    next = makeFrame(u, true);
    next.focus = landing();
    const rec = next;
    // A page that never says it settled: show it if it rendered, otherwise give up on it (the old one stays).
    rec.timer = setTimeout(() => {
      if (next !== rec) return;
      if (rec.mounted) swap(); else { rec.el.remove(); next = null; }
    }, 12000);
  }
  const renderSoon = debounce(render, 260);

  function swap() {
    const n = next;
    if (!n) return;
    next = null;
    clearTimeout(n.timer);
    const old = cur;
    cur = n;
    n.el.classList.remove('is-next');
    n.el.removeAttribute('aria-hidden');
    n.el.tabIndex = 0;
    n.el.classList.add('is-in');
    setTimeout(() => { old?.el.remove(); n.el.classList.remove('is-in'); }, SWAP_MS + 30);
    veil.classList.remove('is-on');
    played = false;
    pointed = false;
    drawPlay();
    sync(); // anything edited while it rendered
  }

  /** Brings the page on screen up to date with the model: hot patches, or a background render. */
  function sync() {
    if (!active || !cur?.shown) return;
    const d = diff(cur.shown, m.data);
    if (!d.any) return;
    if (d.colors) send(cur, { type: 'nimtto:colors', colors: d.colors });
    for (const [theme, colors] of Object.entries(d.partColors || {})) send(cur, { type: 'nimtto:colors', colors, theme });
    const changes = [...d.text, ...d.images.map((c) => ({ kind: 'image', pairs: c.pairs }))];
    if (changes.length) send(cur, { type: 'nimtto:patch', changes });
    if (d.structural) {
      // Words, photos and colours show at once; the page re-renders (hidden) for the rest. A render already under
      // way gets the whole current model when it asks, or is patched up when it swaps in.
      for (const c of [...d.text, ...d.images]) setAt(cur.shown, c.path, clone(m.get(c.path)));
      if (d.colors || d.partColors) cur.shown.themeColors = clone(m.data.themeColors);
      if (!next) renderSoon();
      return;
    }
    cur.shown = clone(m.data); // marked as shown; a later full render always sends the whole model
  }
  let syncQueued = false;
  const syncNow = () => { if (syncQueued) return; syncQueued = true; requestAnimationFrame(() => { syncQueued = false; sync(); }); setTimeout(() => { if (syncQueued) { syncQueued = false; sync(); } }, 60); };

  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin) return;
    const rec = [cur, next].find((r) => r && e.source === r.el.contentWindow);
    if (!rec) return;
    const type = e.data?.type;
    if (type === 'nimtto:ready') {
      rec.shown = clone(m.data);
      const focus = rec === next ? rec.focus : (target ? { ...target, instant: true } : rec.focus);
      send(rec, { type: 'nimtto:data', data: m.data, focus, pick: picking });
    } else if (type === 'nimtto:mounted') {
      rec.mounted = true;
      if (rec === cur) veil.classList.remove('is-on');
    } else if (type === 'nimtto:settled') {
      if (rec === next) swap();
      else if (rec === cur) veil.classList.remove('is-on');
    } else if (type === 'nimtto:focused' && rec === cur) {
      if (e.data.ok === false && e.data.reason === 'opening') say('This appears after the opening. Press Play opening to see it.', 5000);
      else if (e.data.ok === false && target?.text) say('This design does not show these words.', 4000);
    } else if (type === 'nimtto:pick' && rec === cur && e.data.target && typeof e.data.target === 'object') {
      quietUntil = performance.now() + 1500;
      onPick?.(e.data.target);
    } else if (type === 'nimtto:patched' && rec === cur) {
      if (e.data.ok === false) renderSoon(); // words the page shows differently: render it afresh (hidden)
    }
  });

  // ── Following the client ───────────────────────────────────────────────
  /** Point the preview at a place (now, or when the next page is ready). */
  function point(t, { now = true } = {}) {
    if (!t) return;
    target = t;
    pointed = true;
    if (next) next.focus = { ...t, instant: true };
    if (now && cur?.shown) send(cur, { type: 'nimtto:focus', ...t });
  }

  // Focus moves into a field: show where its words appear.
  let lastFocusKey = '';
  const withModule = (t) => (t && !t.section && moduleTarget ? { ...t, section: moduleTarget.section } : t);
  const onFocusIn = (e) => {
    if (!el.isConnected || !(e.target instanceof HTMLElement) || !e.target.closest('.page__content')) return;
    const t = withModule(targetForField(e.target));
    if (!t) return;
    const key = JSON.stringify(t);
    if (key === lastFocusKey) return;
    lastFocusKey = key;
    if (quiet()) { target = t; return; } // the client just clicked this spot in the preview
    point(t);
  };
  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', () => { lastFocusKey = ''; });

  session.on('edit', ({ path }) => {
    const input = document.activeElement;
    const t = input?.matches?.('.page__content input, .page__content textarea') ? withModule(targetForField(input)) : null;
    if (t) { target = t; pointed = true; } else if (path) {
      const v = m.get(path);
      const sec = sectionOfPath(pathString(path));
      if (v && typeof v === 'object' && ('lg' in v || 'sm' in v)) { target = imageTarget(v, m.data, sec); pointed = true; } else if (sec) { target = { section: sec }; pointed = true; }
    }
    if (next) next.focus = landing();
    syncNow();
  });

  // ── The opening ─────────────────────────────────────────────────────────
  function setPicking(v) {
    picking = v;
    pickPref(v);
    modeSeg.querySelectorAll('.seg__btn').forEach((b, i) => b.setAttribute('aria-pressed', String((i === 0) === v)));
    send(cur, { type: 'nimtto:mode', pick: v });
    send(next, { type: 'nimtto:mode', pick: v });
  }
  function drawPlay() {
    playBtn.hidden = !opening || /&open/.test(cur?.url || ''); // only while the gate is shown
    playBtn.replaceChildren(...(played ? [icon('refresh', 15), h('span', 'Show gate again')] : [icon('play', 15), h('span', 'Play opening')]));
  }
  function togglePlay() {
    if (!played) {
      if (!cur?.mounted) return;
      played = true;
      send(cur, { type: 'nimtto:play' });
      drawPlay();
    } else {
      render(); // the gate, closed again (swaps in when ready)
    }
  }

  return {
    el,
    /** The preview is visible (or not): load lazily, themes are heavy WebGL pages. */
    setActive(on) {
      if (on === active) return;
      active = on;
      if (on) {
        requestAnimationFrame(fit);
        if (!cur || cur.url !== url()) render(); else sync();
      } else renderSoon.cancel();
    },
    /** Show the opening gate (true while the Opening module is being edited). */
    setOpening(on) {
      if (on === opening) return;
      opening = on;
      played = false;
      drawPlay();
      if (active && cur && !quiet()) render();
    },
    /** Entering a module: move the preview to its part of the invitation. */
    setModule(id) {
      const t = MODULE_TARGETS[id];
      moduleTarget = t || null;
      if (t && !quiet()) point(t);
    },
    /** Keep the preview where it is for a moment (the editor is following a click in the preview). */
    hold(ms = 1500) { quietUntil = performance.now() + ms; },
    setHint(text) { baseHint = text || 'Edits show here as you type.'; say(baseHint); },
    /** Modules call this after a photo change, so the preview shows that exact photo. */
    point,
    pointImage(ref, section) {
      const t = imageTarget(ref, m.data, section);
      point(t, { now: false });
      // After the photo has been swapped in (the hot patch goes first), go to it.
      setTimeout(() => { if (t && target === t && cur?.shown) send(cur, { type: 'nimtto:focus', ...t }); }, 160);
    },
    reload: render,
    fit,
    destroy() { document.removeEventListener('focusin', onFocusIn); },
  };
}

function setAt(obj, path, value) {
  let o = obj;
  for (const k of path.slice(0, -1)) { if (o[k] == null || typeof o[k] !== 'object') o[k] = typeof k === 'number' ? [] : {}; o = o[k]; }
  o[path[path.length - 1]] = value;
}
const pathString = (path) => path.reduce((s, k) => (typeof k === 'number' ? `${s}[${k}]` : s ? `${s}.${k}` : k), '');
