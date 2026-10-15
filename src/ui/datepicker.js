// Nimtto date picker over a native <input type="date">: a typed trigger ("Fri, 12 Feb 2027")
// and a small calendar dialog with month/year jumps, today, min/max, clear and the
// matching Bikram Sambat date. The native input keeps the ISO value and fires the events.
import { bsDateOf } from '../core/i18n.js';
import { el, icon, nextId, bridge, mount, setNative, fire, openPopover, labelText, refocus, trapTab, COARSE } from './core.js';

const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WD2 = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Dates are { y, m (0-11), d } handled in UTC so no time zone can shift a day.
const mk = (y, m, d) => { const t = new Date(Date.UTC(y, m, d)); return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() }; };
const ms = (x) => Date.UTC(x.y, x.m, x.d);
const add = (x, days) => mk(x.y, x.m, x.d + days);
const dim = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const addMonths = (x, n) => { const t = mk(x.y, x.m + n, 1); return { ...t, d: Math.min(x.d, dim(t.y, t.m)) }; };
const wd = (x) => new Date(ms(x)).getUTCDay();
const same = (a, b) => a && b && a.y === b.y && a.m === b.m && a.d === b.d;
const pad = (n) => String(n).padStart(2, '0');
export const toISO = (x) => (x ? `${String(x.y).padStart(4, '0')}-${pad(x.m + 1)}-${pad(x.d)}` : '');
export const fromISO = (s) => {
  const r = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!r) return null;
  const x = { y: +r[1], m: +r[2] - 1, d: +r[3] };
  return x.m < 12 && x.d >= 1 && x.d <= dim(x.y, x.m) ? x : null;
};
export const fmtDate = (x) => (x ? `${WD[wd(x)]}, ${x.d} ${MON[x.m].slice(0, 3)} ${x.y}` : '');
const todayNPT = () => { const t = new Date(Date.now() + 345 * 60000); return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate() }; };
const today = () => {
  const n = new Date();
  // The studio speaks Nepal time; elsewhere a visitor's own day is right.
  return Math.abs(n.getTimezoneOffset() + 345) < 1 ? todayNPT() : { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
};

/**
 * Reads what someone typed: 2027-02-12, 12/2/2027 (day first, as in Nepal), 12 Feb 2027,
 * Feb 12 2027, "Fri, 12 Feb", today, tomorrow. A missing year means the next such day.
 */
export function parseDate(text, ref = today()) {
  const s = String(text || '').trim().toLowerCase().replace(/(\d)(st|nd|rd|th)\b/g, '$1');
  if (!s) return null;
  if (s === 'today') return today();
  if (s === 'tomorrow') return add(today(), 1);
  let r = /^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})$/.exec(s);
  let y; let m; let d;
  if (r) { y = +r[1]; m = +r[2] - 1; d = +r[3]; } else if ((r = /^(\d{1,2})[-/. ](\d{1,2})(?:[-/. ](\d{2,4}))?$/.exec(s))) {
    d = +r[1]; m = +r[2] - 1; y = r[3] ? +r[3] : null;
  } else {
    const words = s.replace(/[,.]/g, ' ').split(/\s+/).filter(Boolean)
      .filter((w) => !WD.some((x) => w.startsWith(x.toLowerCase()) && /^[a-z]+$/.test(w) && !MON.some((mo) => w.startsWith(mo.slice(0, 3).toLowerCase()))));
    for (const w of words) {
      if (/^[a-z]+$/.test(w)) { const i = MON.findIndex((mo) => w.length >= 3 && mo.toLowerCase().startsWith(w)); if (i < 0) return null; m = i; } else if (/^\d+$/.test(w)) {
        if (w.length >= 3 || (d != null && +w > 31)) y = +w; else if (d == null) d = +w; else y = +w;
      } else return null;
    }
    if (m == null || d == null) return null;
  }
  if (y != null && y < 100) y += 2000;
  if (m < 0 || m > 11 || !d) return null;
  if (y == null) { y = ref.y; if (ms({ y, m, d: Math.min(d, dim(y, m)) }) < ms(today())) y += 1; }
  if (d > dim(y, m)) return null;
  return { y, m, d };
}

export function enhanceDate(native) {
  if (native.__ui) return native.__ui;
  const popId = nextId('cal');
  const input = el('input', {
    type: 'text', class: `${native.className} ui-field__input`.trim(), role: 'combobox', 'aria-haspopup': 'dialog',
    'aria-expanded': 'false', 'aria-controls': popId, autocomplete: 'off', spellcheck: 'false', placeholder: native.getAttribute('placeholder') || 'Pick a date', size: 1,
  });
  const wrap = el('div.ui-ctl.ui-field.ui-date', icon('calendar', 'ui-ic ui-field__ic'), input);
  const hadFocus = mount(native, wrap);
  if (COARSE.matches) { input.readOnly = true; input.classList.add('ui-field__input--tap'); } // phones pick from the sheet, no keyboard

  const range = () => ({ min: fromISO(native.min), max: fromISO(native.max) });
  const inRange = (x) => { const { min, max } = range(); return (!min || ms(x) >= ms(min)) && (!max || ms(x) <= ms(max)); };
  const clamp = (x) => { const { min, max } = range(); if (min && ms(x) < ms(min)) return min; if (max && ms(x) > ms(max)) return max; return x; };

  let pop = null; let view = 'days'; let cur = null; let body = null; let bsLine = null; let title = null; let prevB = null; let nextB = null; let todayB = null;

  // A narrow field (two columns on a phone) drops the weekday: "13 Feb 2027".
  const show = (x) => (x && input.clientWidth && input.clientWidth < 172 ? fmtDate(x).slice(5) : fmtDate(x));
  function sync() {
    const v = fromISO(native.value);
    if (document.activeElement !== input || !input.dataset.dirty) input.value = show(v);
    wrap.classList.toggle('is-empty', !v);
    if (pop && v && !same(v, cur)) { cur = v; render(false); }
  }

  // ── Calendar ──
  const cell = (x, sel, t) => {
    const out = !inRange(x);
    const b = el('button', {
      type: 'button', class: 'ui-day', tabindex: same(x, cur) ? '0' : '-1', 'data-iso': toISO(x),
      'aria-label': `${fmtDate(x)}${same(x, t) ? ', today' : ''}`,
      disabled: out || null,
    }, String(x.d));
    if (x.m !== cur.m) b.classList.add('is-outside');
    if (same(x, t)) b.classList.add('is-today');
    if (same(x, sel)) b.classList.add('is-selected');
    return el('td', { role: 'gridcell', 'aria-selected': same(x, sel) ? 'true' : 'false' }, b);
  };

  function render(focus = true) {
    const sel = fromISO(native.value);
    const t = today();
    const { min, max } = range();
    body.replaceChildren();
    body.dataset.view = view;
    if (view === 'days') {
      title.firstChild.textContent = `${MON[cur.m]} ${cur.y}`;
      title.setAttribute('aria-label', `${MON[cur.m]} ${cur.y}, choose month and year`);
      prevB.setAttribute('aria-label', 'Previous month'); nextB.setAttribute('aria-label', 'Next month');
      prevB.disabled = Boolean(min) && ms(mk(cur.y, cur.m, 0)) < ms(min);
      nextB.disabled = Boolean(max) && ms(mk(cur.y, cur.m + 1, 1)) > ms(max);
      const first = mk(cur.y, cur.m, 1);
      let x = add(first, -wd(first));
      const head = el('tr', WD2.map((w, i) => el('th', { scope: 'col', abbr: WD[i] }, w)));
      const rows = [];
      for (let r = 0; r < 6; r++) {
        const tr = el('tr');
        for (let c = 0; c < 7; c++) { tr.append(cell(x, sel, t)); x = add(x, 1); }
        rows.push(tr);
      }
      body.append(el('table.ui-grid', { role: 'grid', 'aria-labelledby': title.id }, el('thead', head), el('tbody', rows)));
    } else if (view === 'months') {
      title.firstChild.textContent = String(cur.y);
      title.setAttribute('aria-label', `${cur.y}, choose year`);
      prevB.setAttribute('aria-label', 'Previous year'); nextB.setAttribute('aria-label', 'Next year');
      prevB.disabled = Boolean(min) && cur.y - 1 < min.y;
      nextB.disabled = Boolean(max) && cur.y + 1 > max.y;
      body.append(el('div.ui-mgrid', { role: 'group', 'aria-label': `Months of ${cur.y}` }, MON.map((name, i) => {
        const off = (min && (cur.y < min.y || (cur.y === min.y && i < min.m))) || (max && (cur.y > max.y || (cur.y === max.y && i > max.m)));
        return el('button', {
          type: 'button', class: `ui-mcell${sel && sel.y === cur.y && sel.m === i ? ' is-selected' : ''}${t.y === cur.y && t.m === i ? ' is-today' : ''}`,
          tabindex: i === cur.m ? '0' : '-1', 'data-m': i, disabled: off || null, 'aria-label': `${name} ${cur.y}`,
        }, name.slice(0, 3));
      })));
    } else {
      const start = cur.y - (cur.y % 12);
      title.firstChild.textContent = `${start} – ${start + 11}`;
      title.setAttribute('aria-label', `Years ${start} to ${start + 11}`);
      prevB.setAttribute('aria-label', 'Earlier years'); nextB.setAttribute('aria-label', 'Later years');
      prevB.disabled = Boolean(min) && start - 1 < min.y;
      nextB.disabled = Boolean(max) && start + 12 > max.y;
      body.append(el('div.ui-mgrid', { role: 'group', 'aria-label': 'Years' }, Array.from({ length: 12 }, (_, i) => {
        const y = start + i;
        return el('button', {
          type: 'button', class: `ui-mcell${sel && sel.y === y ? ' is-selected' : ''}${t.y === y ? ' is-today' : ''}`,
          tabindex: y === cur.y ? '0' : '-1', 'data-y': y, disabled: (min && y < min.y) || (max && y > max.y) || null,
        }, String(y));
      })));
    }
    title.setAttribute('aria-expanded', String(view !== 'days'));
    todayB.disabled = !inRange(t);
    drawBs();
    if (focus) body.querySelector('[tabindex="0"]')?.focus({ preventScroll: true });
  }

  function drawBs() {
    const x = view === 'days' ? cur : fromISO(native.value);
    if (!x) { bsLine.replaceChildren(); return; }
    try {
      const bs = bsDateOf(`${toISO(x)}T12:00:00+05:45`).short;
      bsLine.replaceChildren(el('span.ui-cal__bsk', 'B.S.'), el('span', bs.en), el('span.ui-cal__bsdot', { 'aria-hidden': 'true' }, '·'), el('span', { lang: 'ne' }, bs.ne));
    } catch { bsLine.replaceChildren(); } // outside the converter's years
  }

  const moveTo = (x) => {
    const n = clamp(x);
    const redraw = n.y !== cur.y || n.m !== cur.m;
    cur = n;
    if (redraw) render(true);
    else {
      body.querySelectorAll('.ui-day').forEach((b) => { b.tabIndex = b.dataset.iso === toISO(cur) ? 0 : -1; });
      body.querySelector(`[data-iso="${toISO(cur)}"]`)?.focus({ preventScroll: true });
      drawBs();
    }
  };

  function step(dir) {
    if (view === 'days') { cur = clamp(addMonths(cur, dir)); render(false); } else if (view === 'months') { cur = clamp(addMonths(cur, dir * 12)); render(false); } else { cur = clamp(mk(cur.y + dir * 12, cur.m, Math.min(cur.d, 28))); render(false); }
  }

  function onGridKey(e) {
    const t = e.target;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (view !== 'days') { view = 'days'; render(); } else { close(); input.focus(); } return; }
    if (e.key === 'Tab') { trapTab(e, pop.el); return; }
    if (view === 'days' && t.classList.contains('ui-day')) {
      const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      if (map[e.key]) { e.preventDefault(); moveTo(add(cur, map[e.key])); return; }
      if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); moveTo(addMonths(cur, (e.key === 'PageUp' ? -1 : 1) * (e.shiftKey ? 12 : 1))); return; }
      if (e.key === 'Home') { e.preventDefault(); moveTo(add(cur, -wd(cur))); return; }
      if (e.key === 'End') { e.preventDefault(); moveTo(add(cur, 6 - wd(cur))); return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (inRange(cur)) choose(cur); }
      return;
    }
    if (view !== 'days' && t.classList.contains('ui-mcell')) {
      const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 };
      if (map[e.key]) {
        e.preventDefault();
        if (view === 'months') { const m = cur.m + map[e.key]; cur = clamp(mk(cur.y, m, Math.min(cur.d, dim(cur.y + Math.floor(m / 12), ((m % 12) + 12) % 12)))); } else cur = clamp(mk(cur.y + map[e.key], cur.m, Math.min(cur.d, dim(cur.y + map[e.key], cur.m))));
        render();
      }
    }
  }

  function onGridClick(e) {
    const d = e.target.closest('.ui-day');
    if (d && !d.disabled) { choose(fromISO(d.dataset.iso)); return; }
    const c = e.target.closest('.ui-mcell');
    if (!c || c.disabled) return;
    if (c.dataset.m != null) { cur = clamp(mk(cur.y, +c.dataset.m, Math.min(cur.d, dim(cur.y, +c.dataset.m)))); view = 'days'; } else { const y = +c.dataset.y; cur = clamp(mk(y, cur.m, Math.min(cur.d, dim(y, cur.m)))); view = 'months'; }
    render();
  }

  function open(focusGrid) {
    if (pop || input.disabled) return;
    cur = clamp(parseDate(input.value) || fromISO(native.value) || today());
    view = 'days';
    const titleId = nextId('ct');
    title = el('button', { type: 'button', class: 'ui-cal__title', id: titleId, 'aria-expanded': 'false', onclick: () => { view = view === 'days' ? 'months' : view === 'months' ? 'years' : 'days'; render(); } }, el('span'), icon('chevron', 'ui-ic ui-cal__tchev'));
    prevB = el('button', { type: 'button', class: 'ui-cal__nav', onclick: () => step(-1) }, icon('left'));
    nextB = el('button', { type: 'button', class: 'ui-cal__nav', onclick: () => step(1) }, icon('right'));
    body = el('div.ui-cal__body');
    bsLine = el('p.ui-cal__bs', { 'aria-live': 'polite' });
    todayB = el('button', { type: 'button', class: 'ui-cal__act', onclick: () => { const t = today(); if (view !== 'days') view = 'days'; cur = clamp(t); render(); } }, 'Today');
    const clearB = el('button', { type: 'button', class: 'ui-cal__act ui-cal__act--quiet', onclick: () => choose(null) }, 'Clear');
    const content = el('div.ui-cal',
      el('div.ui-cal__head', prevB, title, nextB),
      body,
      bsLine,
      el('div.ui-cal__foot', clearB, todayB));
    content.addEventListener('keydown', onGridKey);
    body.addEventListener('click', onGridClick);
    pop = openPopover(wrap, { content, id: popId, ariaLabel: `Choose ${labelText(native) || 'a date'}`.trim(), label: labelText(native), cls: 'ui-pop--cal', onClose });
    pop.el.setAttribute('aria-modal', 'false');
    input.setAttribute('aria-expanded', 'true');
    wrap.classList.add('is-open');
    render(Boolean(focusGrid));
    pop.place();
  }

  function onClose() {
    input.setAttribute('aria-expanded', 'false');
    wrap.classList.remove('is-open');
    const inside = pop?.el.contains(document.activeElement);
    pop = null;
    if (inside) input.focus({ preventScroll: true });
  }
  const close = () => pop?.close('close');

  function choose(x) {
    const v = x ? toISO(x) : '';
    close();
    delete input.dataset.dirty;
    input.value = show(x);
    input.focus({ preventScroll: true });
    if (native.value !== v) {
      setNative(native, 'value', v);
      sync();
      fire(native);
      refocus(input, native);
    }
  }

  /** Commits what was typed. Returns false (and restores the shown date) when it cannot be read. */
  function commitTyped() {
    if (!input.dataset.dirty) return true;
    delete input.dataset.dirty;
    const text = input.value.trim();
    if (!text) { choose(null); return true; }
    const x = parseDate(text, fromISO(native.value) || today());
    if (x && inRange(x)) { if (toISO(x) !== native.value) choose(x); else input.value = show(x); return true; }
    input.value = show(fromISO(native.value));
    wrap.classList.remove('is-shake'); void wrap.offsetWidth; wrap.classList.add('is-shake');
    return false;
  }

  input.addEventListener('input', (e) => {
    e.stopPropagation();
    input.dataset.dirty = '1';
    const x = parseDate(input.value, fromISO(native.value) || today());
    if (pop && x && view === 'days' && !same(x, cur)) { cur = clamp(x); render(false); }
  });
  input.addEventListener('change', (e) => e.stopPropagation());
  input.addEventListener('click', () => { if (!pop) open(COARSE.matches); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || (e.altKey && e.key === 'ArrowDown')) { e.preventDefault(); if (pop) render(true); else open(true); } else if (e.key === 'Enter') {
      e.preventDefault();
      if (input.dataset.dirty) { commitTyped(); close(); } else if (pop) render(true); else open(true);
    } else if (e.key === 'Escape') {
      if (pop) { e.preventDefault(); e.stopPropagation(); close(); } else if (input.dataset.dirty) { e.preventDefault(); delete input.dataset.dirty; input.value = show(fromISO(native.value)); }
    } else if (e.key === 'Tab' && pop && !e.shiftKey && !input.dataset.dirty) {
      e.preventDefault(); render(true);
    }
  });
  wrap.addEventListener('focusout', (e) => {
    const to = e.relatedTarget;
    if (to && (wrap.contains(to) || pop?.el.contains(to))) return;
    commitTyped();
    if (pop && to) close();
  });

  bridge(native, input, { props: ['value', 'valueAsDate', 'valueAsNumber'], sync });
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => { if (!input.dataset.dirty) input.value = show(fromISO(native.value)); }).observe(input);
  sync();
  if (hadFocus) input.focus({ preventScroll: true });
  const ui = { trigger: input, wrap, open, close, sync };
  native.__ui = ui;
  return ui;
}
