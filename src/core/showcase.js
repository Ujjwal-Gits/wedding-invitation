// Showcase mode: the public, watermarked preview of a design (docs/API.md "Theme pages", docs/PLATFORM.md).
// Production: the server serves /<theme>/?showcase=1 with data-showcase="1" on <html> and /showcase.css linked.
// Dev (Vite): ?showcase alone turns it on. data.js imports this module first, so it runs before any theme code:
// it drops every query key except showcase and lang (no ?id, no studio ?preview), so only the bundled demo shows.
//
// Honest limits: the web cannot stop screenshots or screen recording. The tiled watermark, copy blocking and the
// blank card on focus loss, PrintScreen and print are deterrents only.

import TILE_SVG from './showcase-tile.svg?raw';

const root = document.documentElement;
const params = new URLSearchParams(location.search);
export const SHOWCASE = root.dataset.showcase === '1' || params.has('showcase');

const SLUG_RE = /^[a-z][a-z0-9-]{1,30}$/;
const MSG = 'This is a preview. Order this design to get your own invitation.';
const MSG_NE = 'यो नमुना मात्र हो। आफ्नै निम्तोका लागि यो डिजाइन अर्डर गर्नुहोस्।';

if (SHOWCASE) start();

function start() {
  // 1) demo data only: rewrite the URL before data.js (and the theme) read it
  const lang = params.get('lang');
  const q = `?showcase=1${lang === 'ne' || lang === 'en' ? `&lang=${lang}` : ''}`;
  if (location.search !== q) history.replaceState(history.state, '', `${location.pathname}${q}${location.hash}`);

  const theme = SLUG_RE.test(location.pathname.split('/')[1] || '') ? location.pathname.split('/')[1] : '';
  const inFrame = (() => { try { return window.parent !== window; } catch { return true; } })();
  const orderUrl = `/?design=${encodeURIComponent(theme)}#order`;

  // 2) the stylesheet and the mark (the server adds both in production; dev adds them here)
  const ensureSheet = () => {
    if (!document.querySelector('link[href="/showcase.css"]')) {
      document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href: '/showcase.css' }));
    }
    if (root.dataset.showcase !== '1') root.dataset.showcase = '1';
  };
  ensureSheet();

  // 3) the watermark: the Nimtto logo (the owner's artwork, traced) tiled diagonally above everything, the gate
  //    included, never catching a tap. White with a thin plum outline, so it reads on light and dark designs alike.
  const TILE_URL = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(TILE_SVG)}")`;
  const WM_STYLE = {
    position: 'fixed', inset: '0', 'z-index': '2147483646', 'pointer-events': 'none', display: 'block',
    visibility: 'visible', opacity: '1', 'background-image': `${TILE_URL}, ${TILE_URL}`, 'background-repeat': 'repeat',
    'background-size': '420px 260px', 'background-position': '0 0, 210px 130px', filter: 'drop-shadow(0 1px 2px rgba(42,26,29,0.25))', transform: 'none',
    'clip-path': 'none', margin: '0', padding: '0', border: '0', width: 'auto', height: 'auto',
  };
  const makeWm = () => {
    const n = document.createElement('div');
    n.setAttribute(`data-wm${Math.random().toString(36).slice(2, 8)}`, '');
    n.setAttribute('aria-hidden', 'true');
    for (const [k, v] of Object.entries(WM_STYLE)) n.style.setProperty(k, v, 'important');
    n.dataset.nimttoWm = '1';
    return n;
  };
  let wm = makeWm();
  const WM_CSS = wm.style.cssText; // as the browser normalised it
  const wmOk = (n) => {
    if (!n.isConnected || n.hidden || n.childNodes.length || n.style.cssText !== WM_CSS) return false;
    const cs = getComputedStyle(n);
    return cs.display === 'block' && cs.visibility === 'visible' && Number(cs.opacity) > 0.95 && cs.backgroundImage !== 'none';
  };

  // 4) the badge (Order this design, close on a full page), the toast and the blank card
  const badge = document.createElement('div');
  badge.className = 'nimtto-sc-badge';
  badge.setAttribute('role', 'complementary');
  badge.setAttribute('aria-label', 'Nimtto preview');
  const mark = Object.assign(document.createElement('img'), { className: 'nimtto-sc-badge__mark', src: '/site/brand/nimtto-logo.svg', alt: 'Nimtto', width: 81, height: 19, draggable: false });
  const tag = Object.assign(document.createElement('span'), { className: 'nimtto-sc-badge__tag', textContent: 'Preview' });
  const order = Object.assign(document.createElement('a'), { className: 'nimtto-sc-badge__order', href: orderUrl, target: '_top', textContent: 'Order this design' });
  // in the website's phone frame the page around it has the order button: the badge is only the mark there
  if (inFrame) { badge.classList.add('nimtto-sc-badge--framed'); badge.append(mark, tag); } else badge.append(mark, tag, order);
  if (!inFrame) {
    const close = Object.assign(document.createElement('a'), { className: 'nimtto-sc-badge__close', href: '/#designs', target: '_top' });
    close.setAttribute('aria-label', 'Close the preview');
    close.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
    close.addEventListener('click', (e) => {
      let same = false;
      try { same = Boolean(document.referrer) && new URL(document.referrer).origin === location.origin; } catch { /* bad referrer */ }
      if (same && history.length > 1) { e.preventDefault(); history.back(); }
    });
    badge.append(close);
  }

  const toast = document.createElement('div');
  toast.className = 'nimtto-sc-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  let toastTimer = 0;
  const say = () => {
    toast.replaceChildren(Object.assign(document.createElement('span'), { textContent: MSG }),
      Object.assign(document.createElement('span'), { className: 'nimtto-sc-toast__ne', lang: 'ne', textContent: MSG_NE }));
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-on'), 3600);
  };

  const veil = document.createElement('div');
  veil.className = 'nimtto-sc-veil';
  veil.setAttribute('aria-hidden', 'true');
  veil.innerHTML = '<div class="nimtto-sc-veil__card"><img class="nimtto-sc-veil__mark" src="/site/brand/nimtto-logo.svg" alt="Nimtto" width="162" height="38" draggable="false">'
    + '<p class="nimtto-sc-veil__ne" lang="ne">निम्तो</p><p class="nimtto-sc-veil__t">Preview paused</p>'
    + '<p class="nimtto-sc-veil__s">Tap to continue · nimtto.com</p></div>';
  let veilTimer = 0;
  const showVeil = (ms = 0) => {
    veil.style.setProperty('display', 'grid', 'important');
    clearTimeout(veilTimer);
    if (ms) veilTimer = setTimeout(hideVeil, ms);
  };
  const hideVeil = () => { clearTimeout(veilTimer); veil.style.removeProperty('display'); };
  veil.addEventListener('pointerdown', hideVeil);

  // 5) keep everything in place: removed, hidden or restyled parts come back (anti-tamper)
  const ensure = () => {
    ensureSheet();
    if (wm.parentNode !== root) root.append(wm);
    if (!wmOk(wm)) { wm.remove(); wm = makeWm(); root.append(wm); }
    for (const n of [badge, toast, veil]) if (n.parentNode !== root) root.append(n);
    // a theme dialog sits in the top layer, above anything else: give it its own copy of the pattern
    for (const d of document.querySelectorAll('dialog[open]')) {
      if (![...d.children].some((c) => c.dataset.nimttoWm === '1' && wmOk(c))) {
        [...d.children].filter((c) => c.dataset.nimttoWm === '1').forEach((c) => c.remove());
        d.append(makeWm());
      }
    }
  };
  const shrink = (img) => {
    if (img.getAttribute('draggable') !== 'false') img.setAttribute('draggable', 'false');
    const ss = img.getAttribute('srcset');
    if (ss && /-lg\.(webp|jpe?g|png)/i.test(ss)) {
      const kept = ss.split(',').map((s) => s.trim()).filter((s) => s && !/-lg\.(webp|jpe?g|png)/i.test(s));
      if (kept.length) img.setAttribute('srcset', kept.join(', ')); else img.removeAttribute('srcset');
    }
  };
  const isMine = (n) => n === badge || n === toast || n === veil || n === wm || (n.nodeType === 1 && n.dataset?.nimttoWm === '1');
  const watched = (t) => t === root || t === document.head || t.tagName === 'DIALOG' || t.tagName === 'LINK' || isMine(t);
  ensure();
  for (const img of document.images) shrink(img);
  // cheap per record: themes animate inline styles every frame, so only our own nodes, <html>, <head> and dialogs count
  new MutationObserver((records) => {
    let need = false;
    for (const r of records) {
      if (r.type === 'childList') {
        for (const n of r.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.tagName === 'IMG') shrink(n);
          else if (n.firstElementChild) n.querySelectorAll('img').forEach(shrink);
        }
        if (r.removedNodes.length && (watched(r.target) || [...r.removedNodes].some(isMine))) need = true;
      } else if (r.target.tagName === 'IMG') shrink(r.target);
      else if (watched(r.target)) need = true;
    }
    if (need) ensure();
  }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden', 'srcset', 'open', 'data-showcase', 'href', 'draggable'] });
  setInterval(ensure, 1000); // style edits in DevTools' rule panes fire no mutation

  // 6) no copying: selection, the clipboard, the context menu and dragging are off (the form fields still type)
  const typing = (t) => t instanceof Element && t.closest('input, textarea, [contenteditable="true"]');
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
  for (const type of ['copy', 'cut', 'contextmenu', 'dragstart']) document.addEventListener(type, stop, true);
  document.addEventListener('selectstart', (e) => { if (!typing(e.target)) stop(e); }, true);

  // 7) real actions are off: RSVP, calendar download and share answer with a friendly note
  const ACTION = '#add-calendar, #share, #rsvp-submit, [data-share], a[download], #rsvp-form button[type="submit"]';
  window.addEventListener('submit', (e) => { stop(e); e.stopImmediatePropagation(); say(); }, true);
  window.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target.closest(ACTION) : null;
    if (t) { stop(e); e.stopImmediatePropagation(); say(); }
  }, true);
  const realFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const method = String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      say();
      return Promise.resolve(new Response(JSON.stringify({ error: MSG }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
    }
    return realFetch(input, init);
  };
  try { Object.defineProperty(navigator, 'share', { value: () => { say(); return Promise.resolve(); }, configurable: true }); } catch { /* read-only */ }
  try { navigator.sendBeacon = () => false; } catch { /* read-only */ }

  // 8) capture deterrents: a blank Nimtto card when the window loses focus, on PrintScreen and on print / save
  window.addEventListener('blur', () => {
    setTimeout(() => { if (document.activeElement?.tagName !== 'IFRAME') showVeil(); }, 0); // a music iframe keeps the page
  });
  window.addEventListener('focus', () => setTimeout(hideVeil, 120));
  document.addEventListener('visibilitychange', () => { if (document.hidden) showVeil(); else setTimeout(hideVeil, 120); });
  window.addEventListener('beforeprint', () => showVeil());
  window.addEventListener('afterprint', () => setTimeout(hideVeil, 400));
  const capture = (e) => {
    const k = (e.key || '').toLowerCase();
    if (inFrame && e.key === 'Escape') { try { window.parent.postMessage({ nimtto: 'close-preview' }, location.origin); } catch { /* not ours */ } }
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
      showVeil(1600);
      navigator.clipboard?.writeText?.('nimtto.com · preview').catch(() => {});
      return;
    }
    if ((e.ctrlKey || e.metaKey) && ['p', 's', 'u', 'a', 'c', 'x'].includes(k) && !(['a', 'c', 'x'].includes(k) && typing(e.target))) {
      stop(e);
      if (k === 'p' || k === 's') { showVeil(1600); say(); }
    }
  };
  window.addEventListener('keydown', capture, true);
  window.addEventListener('keyup', (e) => { if (e.key === 'PrintScreen' || e.code === 'PrintScreen') capture(e); }, true);
}
