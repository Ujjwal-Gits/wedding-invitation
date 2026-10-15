// Nimtto time field over a native <input type="time">: type "10:30", "1030", "7pm", "19:00",
// or pick from a quiet list of quarter hours. The native input keeps "HH:MM" and fires the events.
import { el, icon, nextId, bridge, mount, setNative, fire, openPopover, labelText, refocus, revealIn, COARSE } from './core.js';

const pad = (n) => String(n).padStart(2, '0');
const toMin = (v) => { const r = /^(\d{2}):(\d{2})/.exec(v || ''); return r ? +r[1] * 60 + +r[2] : null; };
const toVal = (m) => (m == null ? '' : `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`);
export const fmtTime = (m) => (m == null ? '' : `${(Math.floor(m / 60) % 12) || 12}:${pad(m % 60)} ${m < 720 ? 'AM' : 'PM'}`);

/** Reads a typed time into minutes after midnight, or null. */
export function parseTime(text) {
  const s = String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!s) return null;
  if (s === 'noon') return 720;
  if (s === 'midnight') return 0;
  const r = /^(\d{1,2})(?:[:.\s]?(\d{2}))?\s*(a|am|a\.m\.|p|pm|p\.m\.)?$/.exec(s);
  if (!r) return null;
  let h = +r[1]; const m = r[2] ? +r[2] : 0; const ap = r[3]?.[0];
  if (m > 59 || h > 23 || (ap && (h < 1 || h > 12))) return null;
  if (ap === 'p' && h < 12) h += 12;
  if (ap === 'a' && h === 12) h = 0;
  return h * 60 + m;
}

export function enhanceTime(native) {
  if (native.__ui) return native.__ui;
  const listId = nextId('tl');
  const input = el('input', {
    type: 'text', class: `${native.className} ui-field__input`.trim(), role: 'combobox', 'aria-haspopup': 'listbox', 'aria-autocomplete': 'none',
    'aria-expanded': 'false', 'aria-controls': listId, autocomplete: 'off', spellcheck: 'false', placeholder: native.getAttribute('placeholder') || 'Pick a time', inputmode: 'text', size: 1,
  });
  const wrap = el('div.ui-ctl.ui-field.ui-time', icon('clock', 'ui-ic ui-field__ic'), input);
  const hadFocus = mount(native, wrap);
  if (COARSE.matches) input.readOnly = true;

  let pop = null; let list = null; let opts = []; let active = -1;
  const every = () => { const st = Number(native.step) || 60; return st >= 900 && st % 60 === 0 ? st / 60 : 15; };
  const bounds = () => ({ lo: toMin(native.min) ?? 0, hi: toMin(native.max) ?? 1439 });
  const ok = (m) => { const { lo, hi } = bounds(); return m >= lo && m <= hi; };

  function sync() {
    if (document.activeElement !== input || !input.dataset.dirty) input.value = fmtTime(toMin(native.value));
    wrap.classList.toggle('is-empty', !native.value);
    if (pop) mark();
  }

  function setActive(i, center = false) {
    opts[active]?.classList.remove('is-active');
    active = i;
    const n = opts[i];
    if (!n) { input.removeAttribute('aria-activedescendant'); return; }
    n.classList.add('is-active');
    input.setAttribute('aria-activedescendant', n.id);
    revealIn(list, n, center);
  }
  const nearest = (m) => { if (m == null) return -1; let best = 0; opts.forEach((n, i) => { if (Math.abs(+n.dataset.m - m) < Math.abs(+opts[best].dataset.m - m)) best = i; }); return best; };
  function mark() {
    const v = toMin(native.value);
    opts.forEach((n) => { const on = +n.dataset.m === v; n.setAttribute('aria-selected', String(on)); });
  }

  function open() {
    if (pop || input.disabled) return;
    const g = every();
    list = el('div.ui-list.ui-list--time', { id: listId, role: 'listbox', 'aria-label': labelText(native) || 'Times' });
    opts = [];
    for (let m = 0; m < 1440; m += g) {
      if (!ok(m)) continue;
      const n = el('div.ui-opt', { id: nextId('t'), role: 'option', 'aria-selected': 'false', 'data-m': m }, el('span.ui-opt__t', fmtTime(m)), icon('check', 'ui-ic ui-opt__check'));
      list.append(n); opts.push(n);
    }
    mark();
    list.addEventListener('pointerdown', (e) => e.preventDefault());
    list.addEventListener('pointermove', (e) => { const n = e.target.closest('.ui-opt'); if (n) { opts[active]?.classList.remove('is-active'); active = opts.indexOf(n); n.classList.add('is-active'); } });
    list.addEventListener('click', (e) => { const n = e.target.closest('.ui-opt'); if (n) choose(+n.dataset.m); });
    pop = openPopover(wrap, { content: el('div.ui-selpop', list), label: labelText(native), role: 'presentation', match: true, cls: 'ui-pop--list ui-pop--time', onClose });
    input.setAttribute('aria-expanded', 'true');
    wrap.classList.add('is-open');
    const cur = parseTime(input.value) ?? toMin(native.value) ?? 600;
    setActive(nearest(cur), true);
    pop.place();
    revealIn(list, opts[active], true);
  }
  function onClose() {
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    wrap.classList.remove('is-open');
    pop = null; list = null; opts = []; active = -1;
  }
  const close = () => pop?.close('close');

  function choose(m) {
    const v = toVal(m);
    close();
    delete input.dataset.dirty;
    input.value = fmtTime(m);
    input.focus({ preventScroll: true });
    if (native.value !== v) {
      setNative(native, 'value', v);
      sync();
      fire(native);
      refocus(input, native);
    }
  }

  function commitTyped() {
    if (!input.dataset.dirty) return;
    delete input.dataset.dirty;
    const text = input.value.trim();
    if (!text) { if (!native.required) choose(null); else input.value = fmtTime(toMin(native.value)); return; }
    const m = parseTime(text);
    if (m != null && ok(m)) { if (toVal(m) !== native.value) choose(m); else input.value = fmtTime(m); return; }
    input.value = fmtTime(toMin(native.value));
    wrap.classList.remove('is-shake'); void wrap.offsetWidth; wrap.classList.add('is-shake');
  }

  input.addEventListener('input', (e) => {
    e.stopPropagation();
    input.dataset.dirty = '1';
    const m = parseTime(input.value);
    if (pop && m != null) setActive(nearest(m), true);
  });
  input.addEventListener('change', (e) => e.stopPropagation());
  input.addEventListener('click', () => { if (!pop) open(); });
  input.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowDown' || k === 'ArrowUp') {
      e.preventDefault();
      if (!pop) { open(); return; }
      if (e.altKey && k === 'ArrowUp') { if (opts[active]) choose(+opts[active].dataset.m); return; }
      setActive(Math.max(0, Math.min(opts.length - 1, active + (k === 'ArrowDown' ? 1 : -1))));
    } else if ((k === 'PageDown' || k === 'PageUp') && pop) {
      e.preventDefault(); setActive(Math.max(0, Math.min(opts.length - 1, active + (k === 'PageDown' ? 4 : -4))));
    } else if ((k === 'Home' || k === 'End') && pop && !input.dataset.dirty) {
      e.preventDefault(); setActive(k === 'Home' ? 0 : opts.length - 1);
    } else if (k === 'Enter') {
      e.preventDefault();
      if (input.dataset.dirty) { commitTyped(); close(); } else if (pop && opts[active]) choose(+opts[active].dataset.m); else open();
    } else if (k === 'Escape') {
      if (pop) { e.preventDefault(); e.stopPropagation(); close(); } else if (input.dataset.dirty) { e.preventDefault(); delete input.dataset.dirty; input.value = fmtTime(toMin(native.value)); }
    } else if (k === 'Tab' && pop) {
      if (!input.dataset.dirty && opts[active] && +opts[active].dataset.m !== toMin(native.value) && list.querySelector('.is-active') && input.dataset.nav) choose(+opts[active].dataset.m);
      close();
    }
    if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'PageDown' || k === 'PageUp') input.dataset.nav = '1'; else if (k.length === 1) delete input.dataset.nav;
  });
  wrap.addEventListener('focusout', (e) => {
    if (e.relatedTarget && wrap.contains(e.relatedTarget)) return;
    commitTyped();
    close();
  });

  bridge(native, input, { props: ['value', 'valueAsDate', 'valueAsNumber'], sync });
  sync();
  if (hadFocus) input.focus({ preventScroll: true });
  const ui = { trigger: input, wrap, open, close, sync };
  native.__ui = ui;
  return ui;
}
