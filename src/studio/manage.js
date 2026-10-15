// Owner tools: the activity log, the "⋯" menu and the delete confirmation.
import { h, icon, clear, openDialog, toast, fmtDate, fill } from './dom.js';
import { api } from './api.js';
import { areaList } from '../core/draft-areas.js';

const TZ = 'Asia/Kathmandu';

// ── Activity ───────────────────────────────────────────────────────────────

const dayKey = (d) => d.toLocaleDateString('en-CA', { timeZone: TZ });

/** "Today 3:42 pm", "Yesterday 9:05 am", "12 Oct, 3:42 pm". */
export function whenText(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).toLowerCase();
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - 864e5));
  const k = dayKey(d);
  if (k === today) return `Today ${time}`;
  if (k === yesterday) return `Yesterday ${time}`;
  return `${fmtDate(iso, { day: 'numeric', month: 'short', ...(k.slice(0, 4) !== today.slice(0, 4) ? { year: 'numeric' } : {}) })}, ${time}`;
}

/** One log entry in plain words, from the planner's point of view. */
export function activityText(e) {
  const who = e.by === 'couple' ? 'The couple' : 'You';
  if (e.type === 'publish') return `${who} published`;
  if (e.type === 'unpublish') return `${who} took it offline`;
  return `${who} changed ${areaList(e.sections) || 'some details'}`;
}

export async function activityDialog({ slug, names }) {
  const list = h('div.activity', h('p.boot', 'Loading…'));
  openDialog({ title: 'Activity', body: [h('p.dialog__text', `Who changed what on ${names}’s invitation (latest first).`), list] });
  try {
    const doc = await api(`/invitations/${slug}`);
    const items = [...(doc.activity || [])].reverse();
    fill(list, items.length
      ? h('ol.activity__list', items.map((e) => h('li.activity__item', { class: e.by === 'couple' ? 'is-couple' : '' },
        h('span.activity__text', activityText(e)),
        h('time.activity__when', { datetime: e.at }, whenText(e.at)))))
      : h('p.muted', 'Nothing yet. Every change, publish and unpublish will show here.'));
  } catch (err) {
    fill(list, h('p.notice.notice--error', err.message));
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────

const norm = (s) => String(s || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

/** Asks for the couple's names (or the link name) to be typed, then moves the invitation to the trash. */
export function deleteDialog({ slug, names }) {
  return new Promise((resolve) => {
    let done = false;
    const input = h('input.input', { id: 'del-confirm', autocomplete: 'off', spellcheck: 'false' });
    const err = h('p.form-error', { role: 'alert' });
    const btn = h('button.btn.btn--danger', { type: 'button', onclick: go }, icon('trash', 16), 'Delete');
    async function go() {
      const v = norm(input.value);
      if (!v || (v !== norm(names) && v !== slug)) { err.textContent = 'That does not match.'; input.focus(); return; }
      btn.disabled = true;
      try {
        await api(`/invitations/${slug}`, { method: 'DELETE', body: { confirm: slug } });
        done = true;
        d.close();
        toast('Invitation deleted', 'success');
      } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
    }
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
    const d = openDialog({
      title: 'Delete this invitation?',
      body: [h('p.dialog__text', 'The invitation, its photos and its replies are removed and the link stops working.'),
        h('div.field', h('label.label', { for: 'del-confirm' }, 'Type ', h('b', names), ' or ', h('b', slug), ' to confirm'), input), err],
      actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), btn],
      onClose: () => resolve(done),
    });
    input.focus();
  });
}

// ── "⋯" menu ───────────────────────────────────────────────────────────────

/**
 * A button that opens a small menu. items: { label, icon, onSelect | href (+ newTab), danger } or null.
 * The menu is positioned against the viewport (cards clip their overflow) and kept on screen.
 */
export function actionMenu(items, { label = 'More actions' } = {}) {
  const btn = h('button.btn.btn--icon.menu__btn', { type: 'button', 'aria-label': label, title: label, 'aria-haspopup': 'menu', 'aria-expanded': 'false' }, icon('dots', 20));
  let menu = null;
  const close = (focusBtn) => {
    if (!menu) return;
    menu.remove();
    menu = null;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onMove);
    if (focusBtn) btn.focus();
  };
  const outside = (e) => { if (menu && !menu.contains(e.target) && !btn.contains(e.target)) close(false); };
  let y0 = 0;
  const onResize = () => close(false);
  const onMove = () => { if (Math.abs(window.scrollY - y0) > 4) close(false); };
  const open = () => {
    const entries = items.filter(Boolean);
    menu = h('div.menu', { role: 'menu', 'aria-label': label },
      entries.map((it) => {
        const props = { role: 'menuitem', tabindex: -1, class: it.danger ? 'menu__item--danger' : '' };
        const kids = [it.icon ? icon(it.icon, 16) : h('span.menu__gap'), h('span', it.label)];
        return it.href
          ? h('a.menu__item', { ...props, href: it.href, ...(it.newTab ? { target: '_blank', rel: 'noopener' } : {}), onclick: () => close(false) }, kids)
          : h('button.menu__item', { ...props, type: 'button', onclick: () => { close(false); it.onSelect?.(); } }, kids);
      }));
    menu.addEventListener('keydown', (e) => {
      const els = [...menu.querySelectorAll('.menu__item')];
      const i = els.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); close(true); } else if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length].focus(); } else if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length].focus(); } else if (e.key === 'Home') { e.preventDefault(); els[0].focus(); } else if (e.key === 'End') { e.preventDefault(); els.at(-1).focus(); } else if (e.key === 'Tab') close(false);
    });
    document.body.append(menu);
    const r = btn.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    const pad = 8;
    const left = Math.max(pad, Math.min(r.right - m.width, window.innerWidth - m.width - pad));
    const below = r.bottom + 6;
    const top = below + m.height + pad > window.innerHeight && r.top - m.height - 6 > pad ? r.top - m.height - 6 : Math.max(pad, Math.min(below, window.innerHeight - m.height - pad));
    Object.assign(menu.style, { left: `${left}px`, top: `${top}px` });
    menu.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', outside, true);
    menu.querySelector('.menu__item')?.focus({ preventScroll: true });
    y0 = window.scrollY;
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onMove, { passive: true });
  };
  btn.addEventListener('click', () => (menu ? close(true) : open()));
  btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' && !menu) { e.preventDefault(); open(); } });
  return btn;
}
