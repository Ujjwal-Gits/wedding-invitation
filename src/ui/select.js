// Nimtto dropdown: a select-only combobox (APG pattern) over a native <select>.
// The native element keeps the value, the name, form submission and the change events.
import { el, icon, nextId, bridge, mount, setNative, fire, openPopover, labelText, refocus, revealIn, COARSE } from './core.js';

const SEARCH_AT = 8; // a search box appears when a list has more options than this
const norm = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').trim();
const printable = (e) => e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;

export function enhanceSelect(native) {
  if (native.__ui) return native.__ui;
  const listId = nextId('lb');
  const val = el('span.ui-sel__val');
  const btn = el('button', {
    type: 'button', class: `${native.className} ui-sel__btn`.trim(), role: 'combobox',
    'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-controls': listId,
  }, val, icon('chevron', 'ui-ic ui-sel__chev'));
  const wrap = el('div.ui-ctl.ui-sel');
  const hadFocus = mount(native, wrap);
  wrap.prepend(btn);

  let pop = null; let list = null; let search = null; let empty = null;
  let items = []; let active = -1; let typed = ''; let typedAt = 0;

  const labelOf = (o) => (o.label || o.text || '').trim();
  const chosen = () => native.options[native.selectedIndex] || null;

  function sync() {
    const o = chosen();
    val.textContent = o ? labelOf(o) || ' ' : 'Select…';
    wrap.classList.toggle('is-empty', !o || o.value === '');
    if (pop) build(true);
  }

  const visible = () => items.filter((it) => !it.node.hidden && !it.disabled);
  const owner = () => (search && document.activeElement === search ? search : btn);

  function setActive(i, reveal = true, center = false) {
    items[active]?.node.classList.remove('is-active');
    active = i;
    const it = items[i];
    if (!it) { owner().removeAttribute('aria-activedescendant'); return; }
    it.node.classList.add('is-active');
    btn.setAttribute('aria-activedescendant', it.node.id);
    search?.setAttribute('aria-activedescendant', it.node.id);
    if (reveal) revealIn(list, it.node, center);
  }

  function move(delta) {
    const vis = visible();
    if (!vis.length) return;
    const at = vis.indexOf(items[active]);
    const next = at < 0 ? (delta > 0 ? 0 : vis.length - 1) : Math.max(0, Math.min(vis.length - 1, at + delta));
    setActive(items.indexOf(vis[next]));
  }
  const edge = (last) => { const vis = visible(); if (vis.length) setActive(items.indexOf(vis[last ? vis.length - 1 : 0])); };

  function build(keep) {
    const q = search?.value || '';
    const keepOpt = keep ? items[active]?.opt : null;
    list.replaceChildren();
    items = [];
    let lastGroup; let into = list;
    for (const opt of native.options) {
      if (opt.hidden) continue;
      const g = opt.parentElement instanceof HTMLOptGroupElement ? opt.parentElement : null;
      if (g !== lastGroup) {
        lastGroup = g;
        if (g) {
          const gid = nextId('g');
          into = el('div.ui-group', { role: 'group', 'aria-labelledby': gid }, el('div.ui-group__label', { id: gid }, g.label));
          list.append(into);
        } else into = list;
      }
      const disabled = opt.disabled || Boolean(g?.disabled);
      const label = labelOf(opt);
      const node = el('div.ui-opt', {
        id: nextId('o'), role: 'option', 'aria-selected': String(opt.selected), 'aria-disabled': disabled ? 'true' : null,
      }, el('span.ui-opt__t', label || ' '), icon('check', 'ui-ic ui-opt__check'));
      node.dataset.i = items.length;
      into.append(node);
      items.push({ opt, node, disabled, key: norm(label) });
    }
    filter(q, false);
    const i = items.findIndex((it) => it.opt === (keepOpt || chosen()));
    setActive(i >= 0 && !items[i].disabled ? i : -1, true, true);
    if (active < 0) edge(false);
  }

  function filter(q, reset = true) {
    const k = norm(q);
    for (const it of items) it.node.hidden = Boolean(k) && !it.key.includes(k);
    for (const g of list.querySelectorAll('.ui-group')) g.hidden = ![...g.querySelectorAll('.ui-opt')].some((n) => !n.hidden);
    empty.hidden = items.some((it) => !it.node.hidden);
    if (reset) {
      const cur = items[active];
      if (!cur || cur.node.hidden) edge(false); else setActive(active);
      if (k) list.scrollTop = 0;
    }
  }

  function typeahead(ch) {
    const now = Date.now();
    typed = now - typedAt > 600 ? ch : typed + ch;
    typedAt = now;
    const k = norm(typed);
    const same = [...k].every((c) => c === k[0]);
    const vis = visible();
    const at = vis.indexOf(items[active]);
    const after = [...vis.slice(at + 1), ...vis.slice(0, at + 1)];
    // Repeating one letter cycles through its matches; a word keeps the current match while it still fits.
    const hit = same ? after.find((it) => it.key.startsWith(k[0])) : [vis[at], ...after].find((it) => it?.key.startsWith(k));
    if (hit) setActive(items.indexOf(hit));
  }

  function open(at) {
    if (pop || btn.disabled) return;
    const enabled = [...native.options].filter((o) => !o.hidden && !o.disabled).length;
    list = el('div.ui-list', { id: listId, role: 'listbox', tabindex: '-1', 'aria-labelledby': btn.getAttribute('aria-labelledby'), 'aria-label': btn.getAttribute('aria-labelledby') ? null : labelText(native) || 'Options' });
    empty = el('p.ui-list__empty', { hidden: true }, 'No matches');
    search = enabled > SEARCH_AT
      ? el('input.ui-search__input', { type: 'text', role: 'combobox', 'aria-controls': listId, 'aria-expanded': 'true', 'aria-autocomplete': 'list', 'aria-label': 'Search options', placeholder: 'Search', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'done' })
      : null;
    const content = el('div.ui-selpop', search ? el('div.ui-search', icon('search', 'ui-ic ui-search__ic'), search) : null, list, empty);
    pop = openPopover(wrap, { content, label: labelText(native), role: 'presentation', match: true, cls: 'ui-pop--list', onClose });
    btn.setAttribute('aria-expanded', 'true');
    wrap.classList.add('is-open');
    build(false);
    if (at === 'first') edge(false); else if (at === 'last') edge(true);
    pop.place();
    if (active >= 0) revealIn(list, items[active].node, true);

    list.addEventListener('pointerdown', (e) => e.preventDefault()); // keep focus where it is
    list.addEventListener('pointermove', (e) => { const n = e.target.closest('.ui-opt'); if (n && !n.hasAttribute('aria-disabled') && Number(n.dataset.i) !== active) setActive(Number(n.dataset.i), false); });
    list.addEventListener('click', (e) => { const n = e.target.closest('.ui-opt'); if (n) choose(items[Number(n.dataset.i)]); });
    if (search) {
      for (const t of ['input', 'change']) search.addEventListener(t, (e) => e.stopPropagation());
      search.addEventListener('input', () => filter(search.value));
      search.addEventListener('keydown', onKey);
      if (!COARSE.matches) search.focus({ preventScroll: true });
    } else if (document.activeElement !== btn) btn.focus({ preventScroll: true });
  }

  function onClose() {
    btn.setAttribute('aria-expanded', 'false');
    btn.removeAttribute('aria-activedescendant');
    wrap.classList.remove('is-open');
    const wasIn = search && document.activeElement === search;
    pop = null; list = null; search = null; items = []; active = -1;
    if (wasIn) btn.focus({ preventScroll: true });
  }

  const close = () => { pop?.close('close'); };

  function choose(it) {
    if (!it || it.disabled) return;
    const changed = native.selectedIndex !== it.opt.index;
    close();
    btn.focus({ preventScroll: true });
    if (changed) {
      setNative(native, 'selectedIndex', it.opt.index);
      sync();
      fire(native);
      refocus(btn, native);
    }
  }

  function onKey(e) {
    if (!pop) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); return; }
      if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); open(e.key === 'Home' ? 'first' : 'last'); return; }
      if (printable(e)) {
        e.preventDefault();
        open();
        if (search && document.activeElement === search) { search.value = e.key; filter(search.value); } else typeahead(e.key);
      }
      return;
    }
    const inSearch = e.target === search;
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); move(1); break;
      case 'ArrowUp': e.preventDefault(); if (e.altKey) choose(items[active]); else move(-1); break;
      case 'PageDown': e.preventDefault(); move(10); break;
      case 'PageUp': e.preventDefault(); move(-10); break;
      case 'Home': case 'End':
        if (inSearch && search.value) return;
        e.preventDefault(); edge(e.key === 'End'); break;
      case 'Enter': e.preventDefault(); if (items[active]) choose(items[active]); else close(); break;
      case ' ': if (inSearch) return; e.preventDefault(); choose(items[active]); break;
      case 'Escape': e.preventDefault(); e.stopPropagation(); close(); btn.focus({ preventScroll: true }); break;
      case 'Tab': {
        const it = items[active];
        if (inSearch) btn.focus({ preventScroll: true }); // let Tab carry on from the control
        if (it && it.opt !== chosen()) choose(it); else close();
        break;
      }
      default: if (!inSearch && printable(e)) { e.preventDefault(); typeahead(e.key); }
    }
  }

  btn.addEventListener('click', () => { if (pop) { close(); } else open(); });
  btn.addEventListener('keydown', onKey);
  for (const t of ['input', 'change']) btn.addEventListener(t, (e) => e.stopPropagation());

  bridge(native, btn, { props: ['value', 'selectedIndex'], subtree: true, sync });
  sync();
  if (hadFocus) btn.focus({ preventScroll: true });
  const ui = { trigger: btn, wrap, open, close, sync };
  native.__ui = ui;
  return ui;
}
