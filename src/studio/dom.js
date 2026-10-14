// Tiny DOM helpers. User data only ever reaches the page as text nodes or attributes,
// never through innerHTML. Icons are constant SVG markup defined below.

/** h('div.card#main', { onclick, attrs... }, ...children) */
export function h(spec, props, ...children) {
  if (props == null || typeof props !== 'object' || props instanceof Node || Array.isArray(props)) {
    if (props != null) children.unshift(props);
    props = {};
  }
  const m = /^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i.exec(spec);
  const el = document.createElement(m?.[1] || 'div');
  for (const part of (m?.[2] || '').match(/[.#][\w-]+/g) || []) {
    if (part[0] === '.') el.classList.add(part.slice(1));
    else el.id = part.slice(1);
  }
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.classList.add(...String(v).split(/\s+/).filter(Boolean));
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'value' && 'value' in el) el.value = v;
    else if (k === 'checked' || k === 'selected' || k === 'disabled' || k === 'hidden' || k === 'multiple' || k === 'required' || k === 'open') el[k] = Boolean(v);
    else if (k === 'ref' && typeof v === 'function') v(el);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  append(el, children);
  return el;
}

export function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false || c === true) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const clear = (el) => { while (el.firstChild) el.firstChild.remove(); return el; };

const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  right: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="15.5" cy="8.5" r="1.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h9"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  desktop: '<rect x="2" y="4" width="20" height="13" rx="1.5"/><path d="M8 21h8M12 17v4"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  send: '<path d="M21 3L10 14"/><path d="M21 3l-7 18-4-7-7-4 18-7z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/>',
  history: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
  dots: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
};

export function icon(name, size = 18) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', size);
  s.setAttribute('height', size);
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.7');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  s.innerHTML = ICONS[name] || ''; // constant markup only
  return s;
}

/** Icon button with an accessible label (shown as a tooltip). */
export const iconBtn = (name, label, onclick, cls = '') =>
  h('button.btn.btn--icon', { type: 'button', class: cls, 'aria-label': label, title: label, onclick }, icon(name));

let toastTimer;
export function toast(message, kind = 'info') {
  const box = document.getElementById('toasts');
  const t = h('div.toast', { class: `toast--${kind}` }, message);
  box.append(t);
  requestAnimationFrame(() => t.classList.add('is-in'));
  clearTimeout(toastTimer);
  setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 300); }, kind === 'error' ? 6000 : 3200);
}

// While a dialog is open the page behind must not scroll (same technique as src/core/modal.js,
// without pulling Lenis into the studio): fix the body in place, then restore the offset.
let locks = 0;
let savedY = 0;
const lockedScrollers = [];
function lockScroll() {
  if (locks++ > 0) return;
  savedY = window.scrollY;
  Object.assign(document.body.style, { position: 'fixed', top: `-${savedY}px`, left: '0', right: '0', width: '100%', overflow: 'hidden' });
  document.documentElement.style.overscrollBehavior = 'none';
  // The editor's own scroll columns too.
  for (const el of document.querySelectorAll('.ed__center, .ed__nav')) {
    lockedScrollers.push([el, el.style.overflow]);
    el.style.overflow = 'hidden';
  }
}
function unlockScroll() {
  if (--locks > 0) return;
  locks = 0;
  Object.assign(document.body.style, { position: '', top: '', left: '', right: '', width: '', overflow: '' });
  document.documentElement.style.overscrollBehavior = '';
  window.scrollTo(0, savedY);
  for (const [el, v] of lockedScrollers.splice(0)) el.style.overflow = v;
}

/** Modal dialog built on <dialog>. Returns { el, close }. */
export function openDialog({ title, body, actions = [], wide = false, onClose, cls = '' }) {
  const titleId = `dlg-${Math.random().toString(36).slice(2, 8)}`;
  const dlg = h('dialog.dialog', { class: `${wide ? 'dialog--wide' : ''} ${cls}`, 'aria-labelledby': titleId },
    h('div.dialog__head', h('h2.dialog__title', { id: titleId }, title), iconBtn('close', 'Close', () => close())),
    h('div.dialog__body', body),
    actions.length ? h('div.dialog__actions', actions) : null,
  );
  const close = () => { dlg.close(); };
  dlg.setAttribute('data-lenis-prevent', '');
  dlg.addEventListener('close', () => { unlockScroll(); dlg.remove(); onClose?.(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  document.body.append(dlg);
  lockScroll();
  dlg.showModal();
  return { el: dlg, close };
}

export function confirmDialog({ title, message, confirm = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    let ok = false;
    const d = openDialog({
      title,
      body: h('p.dialog__text', message),
      actions: [
        h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'),
        h('button.btn', { type: 'button', class: danger ? 'btn--danger' : 'btn--primary', onclick: () => { ok = true; d.close(); } }, confirm),
      ],
      onClose: () => resolve(ok),
    });
  });
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Link copied', 'success');
  } catch {
    toast('Could not copy. Select the link and copy it by hand.', 'error');
  }
}

export const fmtDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { timeZone: 'Asia/Kathmandu', ...opts });
};

export const fmtRelative = (iso) => {
  if (!iso) return '';
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return fmtDate(iso);
};
