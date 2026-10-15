// The live preview (PLATFORM.md "Live preview protocol"). The theme page runs in an iframe with
// ?preview=1; it asks for data with nimtto:ready, we answer with the unsaved model, and after
// nimtto:mounted we can ask it to point at the words just edited (nimtto:focus).
import { h, icon, debounce } from './dom.js';

const RELOAD_MS = 350;
const DEVICES = { phone: { w: 390, h: 844 }, desktop: { w: 1440, h: 900 } };

/**
 * Answers one iframe's nimtto:ready with getData(). Returns a function that removes the listener.
 * onMounted runs after the theme has rendered.
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

export function createPreview(session) {
  let device = 'phone';
  let opening = false;
  let active = false;
  let protocolSeen = false;
  let focusText = '';
  let loading = false;
  let loadedOnce = false;

  const frame = h('iframe.pv__frame', { title: 'Live preview of the invitation', tabindex: 0 });
  const veil = h('div.pv__veil', { 'aria-hidden': 'true' }, h('span.pv__spin'));
  const screen = h('div.pv__screen', frame, veil);
  const deviceEl = h('div.pv__device', { 'data-device': device }, screen);
  const stage = h('div.pv__stage', deviceEl);

  const seg = h('div.seg.seg--sm', { role: 'group', 'aria-label': 'Preview size' },
    ['phone', 'desktop'].map((d) => h('button.seg__btn', {
      type: 'button', 'aria-pressed': String(d === device), 'aria-label': d === 'phone' ? 'Phone preview' : 'Computer preview', title: d === 'phone' ? 'Phone' : 'Computer',
      onclick: () => setDevice(d),
    }, icon(d, 16), h('span.seg__t', d === 'phone' ? 'Phone' : 'Computer'))));
  const openLink = h('a.btn.btn--icon.btn--ghost', { href: '#', target: '_blank', rel: 'noopener', 'aria-label': 'Open the preview in a new tab', title: 'Open in a new tab' }, icon('external', 16));
  const closeBtn = h('button.btn.btn--icon.btn--ghost.pv__close', { type: 'button', 'aria-label': 'Close the preview', title: 'Close', onclick: () => el.dispatchEvent(new CustomEvent('pv-close')) }, icon('close', 18));
  const hint = h('p.pv__hint', 'Edits show here as you type.');
  const el = h('aside.pv', { 'aria-label': 'Live preview' },
    h('header.pv__head',
      h('span.pv__title', h('span.pv__live', { 'aria-hidden': 'true' }), 'Live preview'),
      seg,
      h('span.pv__tools',
        h('button.btn.btn--icon.btn--ghost', { type: 'button', 'aria-label': 'Reload the preview', title: 'Reload', onclick: () => reload() }, icon('refresh', 16)),
        openLink, closeBtn)),
    stage, hint);

  const url = () => {
    const base = `/${session.m.data.theme}/?id=${encodeURIComponent(session.slug)}&preview=1`;
    return opening ? base : `${base}&debug&open`;
  };

  function fit() {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const { w, h: ht } = DEVICES[device];
    const pad = device === 'phone' ? 28 : 16;
    const s = Math.min((r.width - pad) / w, (r.height - pad) / ht, 1);
    deviceEl.style.width = `${w}px`;
    deviceEl.style.height = `${ht}px`;
    deviceEl.style.transform = `translate(-50%, -50%) scale(${s})`;
  }
  new ResizeObserver(fit).observe(stage);

  function setDevice(d) {
    device = d;
    deviceEl.dataset.device = d;
    seg.querySelectorAll('.seg__btn').forEach((b, i) => b.setAttribute('aria-pressed', String(['phone', 'desktop'][i] === d)));
    fit();
  }

  function reload() {
    if (!active) return;
    const u = url();
    openLink.href = u.replace('&preview=1', '');
    loading = true;
    veil.classList.add('is-on');
    // replace(): no history entries, so the browser's Back button keeps working for the studio.
    try {
      if (loadedOnce && frame.contentWindow) frame.contentWindow.location.replace(u);
      else frame.src = u;
    } catch { frame.src = u; }
    loadedOnce = true;
  }
  const soon = debounce(reload, RELOAD_MS);

  frame.addEventListener('load', () => {
    loading = false;
    // Without the protocol (older core) the page has no mounted message; lift the veil on load.
    setTimeout(() => { if (!loading) veil.classList.remove('is-on'); }, protocolSeen ? 1200 : 200);
  });

  bridge(frame, () => session.m.data, {
    onReady: () => { protocolSeen = true; },
    onMounted: () => {
      veil.classList.remove('is-on');
      if (focusText) {
        frame.contentWindow?.postMessage({ type: 'nimtto:focus', text: focusText }, location.origin);
        focusText = '';
      }
    },
  });

  session.on('edit', ({ text }) => {
    if (text && text.length >= 2) focusText = text;
    soon();
  });
  // Older theme pages read the saved draft from the server, so reload once it is saved too.
  session.on('saved', () => { if (!protocolSeen) soon(); });

  return {
    el,
    /** The preview is visible (or not): load lazily, themes are heavy WebGL pages. */
    setActive(on) {
      if (on === active) return;
      active = on;
      if (on) { requestAnimationFrame(fit); reload(); } else soon.cancel();
    },
    /** Show the opening gate (true while the Opening module is being edited). */
    setOpening(on) {
      if (on === opening) return;
      opening = on;
      if (active) reload();
    },
    setHint(text) { hint.textContent = text || 'Edits show here as you type.'; },
    reload,
    fit,
  };
}
