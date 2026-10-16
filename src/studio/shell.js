// The studio frame: left module nav (icons on tablets, a bottom tab bar on phones), the page in the
// middle, and an optional live preview on the right (a full-screen sheet on smaller screens).
import { h, icon, clear, fill } from './dom.js';
import { hrefOf } from './nav.js';

const WIDE = matchMedia('(min-width: 1180px)');
const PHONE = matchMedia('(max-width: 760px)');
const NAV_KEY = 'nimtto-studio-nav';

const pref = (v) => { try { if (v === undefined) return localStorage.getItem(NAV_KEY); localStorage.setItem(NAV_KEY, v); } catch { /* storage off */ } return null; };

/**
 * opts: { brand: Node, context: Node|null, groups: [{ label?, items: [{ id, label, ne?, icon, href, badge? }] }],
 *         foot: Node, tabs: [ids shown in the phone tab bar] }
 */
export function createShell(opts) {
  const items = opts.groups.flatMap((g) => g.items);
  let preview = null;
  let sheetOpen = false;
  let wantPreview = false;

  const navLinks = new Map();
  const navList = h('div.sh__groups', opts.groups.map((g) => h('div.navgroup',
    g.label ? h('p.navgroup__label', g.label) : null,
    h('ul.navgroup__list', g.items.map((it) => {
      const a = h('a.navlink', { href: hrefOf(it.href), title: it.label, 'data-id': it.id },
        h('span.navlink__icon', icon(it.icon, 19)),
        h('span.navlink__text', h('span.navlink__en', it.label), it.ne ? h('span.navlink__ne', { lang: 'ne' }, it.ne) : null),
        it.badge ? h('span.navlink__badge', it.badge) : null);
      navLinks.set(it.id, a);
      return h('li', a);
    })))));

  const collapseBtn = h('button.btn.btn--icon.btn--ghost.sh__collapse', { type: 'button', 'aria-label': 'Collapse the menu', title: 'Collapse the menu', onclick: () => setCollapsed(!root.classList.contains('is-collapsed')) }, icon('collapse', 18));
  const nav = h('nav.sh__nav', { 'aria-label': 'Studio' },
    h('div.sh__brandrow', opts.brand, collapseBtn),
    opts.context || null,
    navList,
    h('div.sh__foot', opts.foot || null));

  // Phone tab bar: the most-used modules. The owner's bar ends with "More"; the couple's studio has a top bar instead
  // (their names go Home; Preview and the full list sit on the right), so nothing floats over the page.
  const mob = opts.mobile || null;
  const tabIds = opts.tabs || items.slice(0, 4).map((i) => i.id);
  const tabLinks = new Map();
  const moreBtn = mob ? null : h('button.tab', { type: 'button', onclick: () => openMore() }, icon('more', 20), h('span.tab__t', 'More'));
  const tabs = h('nav.sh__tabs', { 'aria-label': 'Studio sections', class: mob ? 'sh__tabs--top' : '' },
    tabIds.map((id) => {
      const it = items.find((x) => x.id === id);
      if (!it) return null;
      const a = h('a.tab', { href: hrefOf(it.href) }, h('span.tab__i', icon(it.icon, 21)), h('span.tab__t', it.short || it.label));
      tabLinks.set(id, a);
      return a;
    }), moreBtn);
  let mbar = null;
  let mNames = null;
  let mPv = null;
  let mMore = null;
  if (mob) {
    mNames = h('span.mbar__names', mob.title || '');
    mPv = h('button.mbar__pv', { type: 'button', hidden: true, onclick: () => openSheet() }, icon('eye', 17), h('span', 'Preview'));
    mMore = h('button.mbar__more', { type: 'button', 'aria-label': 'All sections', title: 'All sections', 'aria-haspopup': 'dialog', onclick: () => openMore() }, icon('menu', 20));
    mbar = h('header.mbar',
      h('a.mbar__home', { href: hrefOf(mob.home), title: 'Home' }, h('img.brand__mark', { src: '/site/brand/nimtto-mark.svg', alt: '', 'aria-hidden': 'true', width: 31, height: 28 }), h('span.mbar__text', mNames, h('span.mbar__sub', 'Home'))),
      h('div.mbar__right', mob.save || null, mPv, mMore));
  }

  const kicker = h('p.page__kicker');
  const title = h('h1.page__title');
  const sub = h('p.page__sub');
  const actions = h('div.page__actions');
  const strip = h('div.page__strip', { hidden: true });
  const pvBtn = h('button.btn.btn--quiet.page__pv', { type: 'button', onclick: () => openSheet(), hidden: true }, icon('eye', 17), h('span', 'Preview'));
  const topbar = h('header.page__bar', h('div.page__barin', h('div.page__heading', kicker, title, sub), strip, h('div.page__right', actions, pvBtn)));
  const content = h('div.page__content');
  const main = h('main.sh__main#main', { tabindex: -1 }, h('div.page', topbar, content));
  const pvSlot = h('div.sh__preview');
  const scrim = h('div.sh__scrim', { onclick: () => closeSheet() });
  const root = h('div.sh', { class: [opts.kind ? `sh--${opts.kind}` : '', mob ? 'sh--mbar' : ''].filter(Boolean).join(' ') }, mbar, nav, main, pvSlot, tabs, scrim);

  // Phones: while the keyboard is up the tab bar steps aside (opacity/transform only), so it never covers the field.
  const isTextField = (el) => el instanceof HTMLElement && el.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=color]):not([type=range]), textarea, select');
  main.addEventListener('focusin', (e) => { if (isTextField(e.target)) root.classList.add('is-typing'); });
  main.addEventListener('focusout', () => { setTimeout(() => { if (!isTextField(document.activeElement)) root.classList.remove('is-typing'); }, 60); });

  function setCollapsed(on) {
    root.classList.toggle('is-collapsed', on);
    collapseBtn.setAttribute('aria-label', on ? 'Expand the menu' : 'Collapse the menu');
    collapseBtn.title = collapseBtn.getAttribute('aria-label');
    pref(on ? '1' : '0');
    requestAnimationFrame(() => preview?.fit());
  }
  if (pref() === '1') setCollapsed(true);

  function layoutPreview() {
    if (!preview) { root.classList.remove('has-preview'); pvBtn.hidden = true; return; }
    const docked = WIDE.matches && wantPreview;
    root.classList.toggle('has-preview', docked);
    pvBtn.hidden = !wantPreview || docked;
    if (mPv) mPv.hidden = !wantPreview || docked;
    if (!wantPreview && sheetOpen) closeSheet();
    preview.setActive(wantPreview && (docked || sheetOpen));
    requestAnimationFrame(() => preview.fit());
  }

  function openSheet() {
    if (!preview) return;
    sheetOpen = true;
    root.classList.add('is-sheet');
    layoutPreview();
    preview.el.querySelector('.pv__close')?.focus();
  }
  function closeSheet() {
    if (!sheetOpen) return;
    sheetOpen = false;
    root.classList.remove('is-sheet');
    layoutPreview();
    (PHONE.matches && mPv ? mPv : pvBtn).focus({ preventScroll: true });
  }
  const onKey = (e) => { if (e.key === 'Escape' && sheetOpen) closeSheet(); };
  document.addEventListener('keydown', onKey);
  const onMedia = () => { if (WIDE.matches && sheetOpen) { sheetOpen = false; root.classList.remove('is-sheet'); } layoutPreview(); };
  WIDE.addEventListener('change', onMedia);

  let more = null;
  function openMore() {
    if (more) return;
    const list = h('div.more-sheet__list', opts.groups.map((g) => h('div',
      g.label ? h('p.navgroup__label', g.label) : null,
      h('ul.navgroup__list', g.items.map((it) => h('li', h('a.navlink', { href: hrefOf(it.href), 'aria-current': navLinks.get(it.id)?.getAttribute('aria-current') || null, onclick: () => closeMore() },
        h('span.navlink__icon', icon(it.icon, 19)), h('span.navlink__text', h('span.navlink__en', it.label), it.ne ? h('span.navlink__ne', { lang: 'ne' }, it.ne) : null))))))));
    more = h('div.more-sheet', { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'All sections' },
      h('div.more-sheet__scrim', { onclick: () => closeMore() }),
      h('div.more-sheet__panel',
        h('div.more-sheet__head', h('span.more-sheet__title', 'All sections'), h('button.btn.btn--icon.btn--ghost', { type: 'button', 'aria-label': 'Close', onclick: () => closeMore() }, icon('close', 18))),
        opts.context ? opts.context.cloneNode(true) : null,
        list,
        h('div.more-sheet__foot', opts.foot ? opts.foot.cloneNode(true) : null)));
    more.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () => { closeMore(); opts.onAction?.(b.dataset.action); }));
    more.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMore(); });
    document.body.append(more);
    requestAnimationFrame(() => more?.classList.add('is-in'));
    more.querySelector('.navlink')?.focus();
  }
  function closeMore() {
    if (!more) return;
    const m = more;
    more = null;
    m.classList.remove('is-in');
    setTimeout(() => m.remove(), 220);
    (moreBtn || mMore)?.focus({ preventScroll: true });
  }

  return {
    root,
    content,
    main,
    setActive(id) {
      root.dataset.mod = id;
      for (const [k, a] of navLinks) { if (k === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }
      let inTabs = false;
      for (const [k, a] of tabLinks) { if (k === id) { a.setAttribute('aria-current', 'page'); inTabs = true; } else a.removeAttribute('aria-current'); }
      moreBtn?.classList.toggle('is-current', !inTabs);
    },
    setBadge(id, text) {
      const a = navLinks.get(id);
      if (!a) return;
      a.querySelector('.navlink__badge')?.remove();
      if (text) a.append(h('span.navlink__badge', text));
    },
    /** Page heading and right-hand actions. */
    setPage({ kicker: k = '', title: t = '', sub: s = '', actions: acts = [] }) {
      kicker.textContent = k;
      kicker.hidden = !k;
      title.textContent = t;
      sub.textContent = s;
      sub.hidden = !s;
      fill(actions, ...[acts].flat().filter(Boolean));
      clear(strip);
      strip.hidden = true;
    },
    /** The couple's names in the phone top bar. */
    setTitle(t) { if (mNames) mNames.textContent = t || ''; },
    /** Scrolls the page to the top (the main column on larger screens, the window on phones). */
    toTop() { main.scrollTo({ top: 0 }); if (PHONE.matches) window.scrollTo(0, 0); },
    /** Replace the short context line under the title. */
    setSub(s2) { sub.textContent = s2 || ''; sub.hidden = !s2; },
    /** A compact strip of key figures in the page header (or null to remove it). */
    setStrip(node) { clear(strip); if (node) strip.append(node); strip.hidden = !node; },
    /** Attach a preview controller (or null). */
    attachPreview(p) {
      preview = p;
      clear(pvSlot);
      if (p) {
        pvSlot.append(p.el);
        p.el.addEventListener('pv-close', closeSheet);
      }
      layoutPreview();
    },
    /** Whether the current page wants the preview. */
    wantPreview(on) { wantPreview = Boolean(on); layoutPreview(); },
    isPhone: () => PHONE.matches,
    destroy() {
      document.removeEventListener('keydown', onKey);
      WIDE.removeEventListener('change', onMedia);
      preview?.setActive(false);
      closeMore();
    },
  };
}
