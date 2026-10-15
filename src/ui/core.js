// Shared plumbing for the Nimtto form controls: the native bridge (the real <select>/<input>
// stays in the DOM as the source of truth) and one popover that places itself, flips,
// closes on outside click or scroll-away, and turns into a bottom sheet on phones.

let uid = 0;
export const nextId = (p) => `ui-${p}-${(++uid).toString(36)}`;

const mq = (q) => (typeof matchMedia === 'function' ? matchMedia(q) : { matches: false });
export const PHONE = mq('(max-width: 600px)');
export const COARSE = mq('(pointer: coarse)');

/** Tiny element builder: el('div.a.b', { attrs }, ...children). */
export function el(tag, attrs, ...kids) {
  const [name, ...cls] = tag.split('.');
  const n = document.createElement(name || 'div');
  if (cls.length) n.className = cls.join(' ');
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = `${n.className} ${v}`.trim();
    else if (k === 'html') n.innerHTML = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) n.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return n;
}

export const ICONS = {
  calendar: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 6.5h12M5.5 1.75v2.5M10.5 1.75v2.5"/></svg>',
  clock: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><circle cx="8" cy="8" r="6.25"/><path d="M8 4.75V8l2.25 1.5"/></svg>',
  chevron: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 6.25 8 9.75l3.5-3.5"/></svg>',
  left: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.75 4.5 6.25 8l3.5 3.5"/></svg>',
  right: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.25 4.5 9.75 8l-3.5 3.5"/></svg>',
  check: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3.5 8.25 3 3 6-6.5"/></svg>',
  search: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg>',
};
export const icon = (name, cls = 'ui-ic') => el('span', { class: cls, 'aria-hidden': 'true', html: ICONS[name] });

// ── Native bridge ─────────────────────────────────────────────────────────

const protoOf = (n) => (n instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype);
const desc = (n, p) => Object.getOwnPropertyDescriptor(protoOf(n), p);

/** Writes a property with the browser's own setter (bypassing our patch). */
export const setNative = (n, prop, v) => desc(n, prop).set.call(n, v);

/** Fires input then change, bubbling, exactly as a user edit of the native control does. */
export function fire(n) {
  n.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  n.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Hides the native control behind the custom trigger and keeps the two in step:
 * programmatic .value (and friends) writes, attribute changes, option changes, form resets,
 * labels, focus (label clicks, validation, .focus()) and aria-invalid.
 */
export function bridge(native, trigger, { props = ['value'], subtree = false, sync }) {
  for (const p of props) {
    const d = desc(native, p);
    if (!d?.set || Object.prototype.hasOwnProperty.call(native, p)) continue;
    Object.defineProperty(native, p, {
      configurable: true,
      enumerable: d.enumerable,
      get() { return d.get.call(this); },
      set(v) { d.set.call(this, v); sync(); },
    });
  }
  native.classList.add('ui-native');
  native.tabIndex = -1;
  native.setAttribute('aria-hidden', 'true');
  native.addEventListener('focus', () => { if (!trigger.disabled) trigger.focus(); });
  native.addEventListener('click', (e) => e.preventDefault());
  native.form?.addEventListener('reset', () => setTimeout(sync));

  const aria = () => {
    trigger.disabled = native.disabled;
    for (const a of ['aria-invalid', 'aria-describedby', 'aria-label', 'aria-required', 'title']) {
      const v = native.getAttribute(a);
      if (v == null) trigger.removeAttribute(a); else trigger.setAttribute(a, v);
    }
    if (native.required) trigger.setAttribute('aria-required', 'true');
    const ids = native.getAttribute('aria-labelledby')?.split(/\s+/) || [];
    for (const l of native.labels || []) { if (!l.id) l.id = nextId('lb'); if (!ids.includes(l.id)) ids.push(l.id); }
    if (ids.length) trigger.setAttribute('aria-labelledby', ids.join(' '));
  };
  aria();
  const mo = new MutationObserver((ms) => {
    if (ms.some((m) => m.type === 'attributes' && m.target === native && m.attributeName !== 'class')) aria();
    sync();
  });
  mo.observe(native, subtree
    ? { subtree: true, childList: true, characterData: true, attributes: true }
    : { attributes: true, attributeFilter: ['disabled', 'required', 'min', 'max', 'step', 'aria-invalid', 'aria-describedby', 'aria-label', 'aria-labelledby', 'title', 'value'] });
  // Labels created after the control (or re-rendered) are picked up on first focus.
  trigger.addEventListener('focus', aria);
}

/** Wraps the native control: <wrap>[...parts, native]</wrap>, keeping focus if it had it. */
export function mount(native, wrap) {
  const had = document.activeElement === native;
  native.before(wrap);
  wrap.append(native);
  return had;
}

/** Text a label gives the control, for the phone sheet's title. */
export const labelText = (native) => {
  const l = native.labels?.[0] || (native.getAttribute('aria-labelledby') && document.getElementById(native.getAttribute('aria-labelledby').split(' ')[0]));
  const t = (l?.textContent || native.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim();
  return t.replace(/\s*\*$/, '').replace(/\s*optional$/i, '');
};

/** After a change re-renders the page, focus the control that replaced ours (same id). */
export function refocus(trigger, native) {
  if (trigger.isConnected) { trigger.focus({ preventScroll: true }); return; }
  const id = native.id;
  if (!id) return;
  setTimeout(() => { const n = document.getElementById(id); n?.__ui?.trigger?.focus({ preventScroll: true }); }, 0);
}

// ── Popover ───────────────────────────────────────────────────────────────

const scrollPane = (node) => {
  for (let p = node.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const s = getComputedStyle(p);
    if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 1) return p;
  }
  return null;
};

let current = null; // one popover at a time

/**
 * Opens a popover anchored to `anchor` (the control's wrapper).
 * opts: { content, label (sheet title), role, labelledby, cls, match (min-width = anchor), onClose(reason), owner }
 */
export function openPopover(anchor, opts) {
  current?.close('other');
  const sheet = PHONE.matches;
  // A control half off-screen (a label click, a smooth scroll still running) is brought into view first.
  const ar = anchor.getBoundingClientRect();
  if (!sheet && (ar.top < 0 || ar.bottom > window.innerHeight)) anchor.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  const host = anchor.closest('dialog[open]') || document.body;
  const pop = el(`div.ui-pop${sheet ? '.ui-pop--sheet' : ''}`, {
    id: opts.id, role: opts.role || 'dialog', 'aria-label': opts.labelledby ? null : opts.ariaLabel, 'aria-labelledby': opts.labelledby, class: opts.cls,
    'data-lenis-prevent': '',
  });
  if (sheet) {
    pop.append(el('div.ui-pop__grab', { 'aria-hidden': 'true' }));
    if (opts.label) pop.append(el('p.ui-pop__title', { 'aria-hidden': 'true' }, opts.label));
  }
  pop.append(opts.content);
  const scrim = sheet ? el('div.ui-scrim', { 'aria-hidden': 'true' }) : null;
  const probe = el('div.ui-probe', { 'aria-hidden': 'true' });
  host.append(...[scrim, pop, probe].filter(Boolean));

  let closed = false;
  const place = () => {
    if (closed || sheet) return;
    if (!anchor.isConnected) { api.close('detached'); return; }
    const a = anchor.getBoundingClientRect();
    const vw = document.documentElement.clientWidth; const vh = window.innerHeight;
    const view = { top: 8, bottom: vh - 8, left: 8, right: vw - 8 };
    const pane = scrollPane(anchor);
    let box = view;
    if (pane) {
      const r = pane.getBoundingClientRect();
      box = { top: Math.max(view.top, r.top + 4), bottom: Math.min(view.bottom, r.bottom - 4), left: Math.max(view.left, r.left + 4), right: Math.min(view.right, r.right - 4) };
      // Scrolled away: the control has left its pane.
      if (a.bottom < r.top + 4 || a.top > r.bottom - 4) { api.close('scroll'); return; }
    } else if (a.bottom < 0 || a.top > vh) { api.close('scroll'); return; }
    if (opts.match) pop.style.minWidth = `${Math.round(a.width)}px`;
    pop.style.maxHeight = ''; pop.style.top = '0px'; pop.style.bottom = 'auto';
    const w = pop.offsetWidth; const h = pop.offsetHeight;
    const gap = 6;
    const fits = (b) => ({ below: b.bottom - a.bottom - gap, above: a.top - b.top - gap });
    let f = fits(box);
    if (h > f.below && h > f.above) { box = view; f = fits(box); } // the pane is too small: use the viewport
    let top; let side = 'bottom'; let maxH = null;
    if (h <= f.below) top = a.bottom + gap;
    else if (h <= f.above) { top = a.top - gap - h; side = 'top'; }
    else if (f.below >= f.above) { top = a.bottom + gap; maxH = f.below; }
    else { maxH = f.above; top = a.top - gap - maxH; side = 'top'; }
    const left = Math.max(view.left, Math.min(a.left, view.right - w));
    const o = probe.getBoundingClientRect(); // fixed elements inside a transformed host are offset by it
    pop.style.left = `${Math.round(left - o.left)}px`;
    // Above the control the popover hangs from its bottom edge, so a list that shrinks (search) stays attached.
    if (side === 'top') { pop.style.top = 'auto'; pop.style.bottom = `${Math.round(vh - (a.top - gap) + o.top)}px`; } else pop.style.top = `${Math.round(top - o.top)}px`;
    if (maxH != null) pop.style.maxHeight = `${Math.max(160, Math.floor(maxH))}px`;
    pop.dataset.side = side;
  };

  const onDown = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) api.close('outside'); };
  const onScroll = (e) => { if (!pop.contains(e.target)) place(); };
  const onResize = () => { if (PHONE.matches !== sheet) api.close('resize'); else place(); };
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('scroll', onScroll, { capture: true, passive: true });
  window.addEventListener('resize', onResize);
  scrim?.addEventListener('click', () => api.close('outside'));

  const api = {
    el: pop,
    sheet,
    place,
    close(reason = 'close') {
      if (closed) return;
      closed = true;
      if (current === api) current = null;
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onResize);
      pop.classList.remove('is-open'); scrim?.classList.remove('is-open');
      probe.remove();
      const gone = () => { pop.remove(); scrim?.remove(); };
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) gone(); else { pop.addEventListener('transitionend', gone, { once: true }); setTimeout(gone, 260); }
      opts.onClose?.(reason);
    },
  };
  current = api;
  place();
  pop.getBoundingClientRect(); // start the entrance from the closed state
  requestAnimationFrame(() => { pop.classList.add('is-open'); scrim?.classList.add('is-open'); });
  return api;
}

/** Keeps Tab inside a popover (the calendar is a small dialog). */
export function trapTab(e, root) {
  if (e.key !== 'Tab') return;
  const f = [...root.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex="0"]')].filter((n) => n.offsetParent !== null || n === document.activeElement);
  if (!f.length) return;
  const i = f.indexOf(document.activeElement);
  const next = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1);
  e.preventDefault();
  f[next].focus();
}

/** Scrolls an option into the middle (or just into view) of its list without moving the page. */
export function revealIn(list, item, center = false) {
  if (!item) return;
  const top = item.offsetTop; const h = item.offsetHeight;
  if (center) { list.scrollTop = top - (list.clientHeight - h) / 2; return; }
  if (top < list.scrollTop) list.scrollTop = top - 4;
  else if (top + h > list.scrollTop + list.clientHeight) list.scrollTop = top + h - list.clientHeight + 4;
}
