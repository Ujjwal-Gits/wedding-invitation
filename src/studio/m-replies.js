// Replies for one invitation: who is coming, counts per ceremony and per meal, a thin row per reply and a drawer
// with everything in it (each guest's name and meal, dietary needs, song request, message), and CSV export.
// Also used by the owner's Replies page; the couple's module adds the form-questions editor.
import { h, icon, iconBtn, toast, confirmDialog, skeleton, emptyState, fill, openDialog } from './dom.js';
import { api } from './api.js';
import { partyOf, mealLabel, guestName } from '../core/rsvp-rules.js';
import { rsvpQuestions } from './sections.js';

const label = (v, f = '') => (v && (v.en || v.ne)) || f;
export const when = (iso) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Kathmandu', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export const stat = (k, v, sub, cls = '') => h('div.stat', { class: cls }, h('dt.stat__k', k), h('dd.stat__v', String(v)), sub ? h('dd.stat__sub', sub) : null);

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "2 Chicken · 1 Fish" for one reply. */
function mealSummary(party, meals) {
  const counts = new Map();
  for (const g of party) if (g.meal) counts.set(g.meal, (counts.get(g.meal) || 0) + 1);
  return [...counts].map(([id, n]) => `${n} ${label(mealLabel(id, meals), id)}`).join(' · ');
}

export function repliesView(slug, { onLoad, questions } = {}) {
  const root = h('div.stack', h('section.card', skeleton(5)));
  let state = null;
  let query = '';
  let filter = 'all';

  const load = async () => {
    try {
      state = await api(`/invitations/${slug}/rsvps`);
      onLoad?.(state);
      render();
    } catch (err) {
      fill(root, h('section.card', emptyState('alert', 'Replies could not be loaded', err.message, h('button.btn', { type: 'button', onclick: load }, icon('refresh', 16), 'Try again'))));
    }
  };

  const remove = async (r, d) => {
    if (!(await confirmDialog({ title: 'Delete this reply?', message: `The reply from ${r.name} will be removed permanently.`, confirm: 'Delete', danger: true }))) return;
    try {
      await api(`/invitations/${slug}/rsvps/${r.id}`, { method: 'DELETE' });
      toast('Reply deleted', 'success');
      d?.close();
      load();
    } catch (err) { toast(err.message, 'error'); }
  };

  const questionsBtn = () => (questions ? h('button.btn.btn--sm', { type: 'button', onclick: () => {
    openDialog({ title: 'Reply form questions', body: h('div.odr__sect', h('p.hint', 'Saved as you change them. Guests see the new form when the invitation is published again.'), questions()), cls: 'dialog--drawer' });
  } }, icon('edit', 15), 'Form questions') : null);

  /** Everything in one reply, in a right-hand drawer. */
  const openReply = (r, titles) => {
    const party = partyOf(r);
    const meals = state.totals.meals || [];
    const sect = (title, ...kids) => h('section.odr__sect', h('h3.odr__h', title), ...kids);
    const facts = (rows) => h('dl.kv.kv--rows', rows.filter(Boolean).map(([k, v]) => h('div', h('dt', k), h('dd', v))));
    const body = h('div.odr',
      sect('Reply',
        h('p.odr__name', r.name, h('span.pill', { class: r.attending === 'yes' ? 'pill--ok' : 'pill--muted' }, r.attending === 'yes' ? `Coming · ${r.guests}` : 'Can’t come')),
        facts([
          r.phone ? ['Phone', h('a', { href: `tel:${r.phone.replace(/[^\d+]/g, '')}` }, r.phone)] : null,
          r.events?.length ? ['Ceremonies', r.events.map((id) => titles[id] || id).join(', ')] : null,
          ['Received', when(r.at)],
        ])),
      party.length ? sect(plural(party.length, 'guest'),
        facts(party.map((g, i) => [guestName(g, i), g.meal ? label(mealLabel(g.meal, meals), g.meal) : h('span.muted', meals.length ? 'No meal chosen' : '—')]))) : null,
      r.diet ? sect('Dietary needs and allergies', h('p.ritem__msg', r.diet)) : null,
      r.song ? sect('Song request', h('p', r.song)) : null,
      r.message ? sect('Message', h('p.ritem__msg', r.message)) : null,
      h('div.odr__danger', h('button.btn.btn--sm.btn--danger-ghost', { type: 'button', onclick: () => remove(r, d) }, icon('trash', 15), 'Delete reply')));
    const d = openDialog({ title: r.name, body, cls: 'dialog--drawer' });
  };

  const render = () => {
    const t = state.totals;
    const replies = state.replies || [];
    if (!replies.length) {
      fill(root, h('section.card', emptyState('chat', 'No replies yet', 'Once you share the invitation, every reply shows up here: who is coming, how many, what they eat, and their messages.', questionsBtn())));
      return;
    }
    const titles = Object.fromEntries((t.events || []).map((e) => [e.id, label(e.title, e.id)]));
    const meals = t.meals || [];
    const max = Math.max(1, ...(t.events || []).map((e) => e.guests));
    const mealMax = Math.max(1, ...meals.map((m) => m.guests));
    const rows = replies.filter((r) => {
      if (filter !== 'all' && r.attending !== filter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      const hay = [r.name, r.phone, r.message, r.diet, r.song, ...partyOf(r).map((g) => g.name)].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
    const list = h('ul.rlist.rlist--thin', rows.map((r) => {
      const party = partyOf(r);
      const others = party.slice(1).map((g) => g.name).filter(Boolean);
      const meta = [
        others.length ? `with ${others.join(', ')}` : null,
        mealSummary(party, meals) || null,
        r.diet ? 'Dietary note' : null,
        r.message ? 'Message' : null,
      ].filter(Boolean).join(' · ');
      return h('li', h('button.rrow', { type: 'button', onclick: () => openReply(r, titles), 'aria-label': `Open the reply from ${r.name}` },
        h('span.ritem__avatar', { class: r.attending === 'yes' ? 'is-yes' : '' }, (r.name || '?').trim().slice(0, 1).toUpperCase()),
        h('span.rrow__main',
          h('span.rrow__head', h('b', r.name), h('span.pill', { class: r.attending === 'yes' ? 'pill--ok' : 'pill--muted' }, r.attending === 'yes' ? `Coming · ${r.guests}` : 'Can’t come')),
          meta ? h('span.rrow__meta', meta) : null),
        h('span.rrow__when', when(r.at)),
        icon('chevron', 16)));
    }));
    const search = h('input.input', { type: 'search', placeholder: 'Search names, phone or notes', 'aria-label': 'Search replies', value: query, oninput: (e) => { query = e.target.value; const pos = e.target.selectionStart; render(); const s = root.querySelector('input[type=search]'); s.focus(); s.setSelectionRange(pos, pos); } });
    const bars = (items, top, num) => h('ul.bars', items.map((e) => h('li.bars__row',
      h('span.bars__name', label(e.title || e.label, e.id || '—')),
      h('span.bars__track', { 'aria-hidden': 'true' }, h('span.bars__fill', { style: { transform: `scaleX(${e.guests / top})` } })),
      h('span.bars__num', ...num(e)))));
    fill(root,
      h('dl.stats',
        stat('Guests coming', t.guests, plural(t.attendingParties, 'family', 'families'), 'stat--accent'),
        stat('Replies', t.replies),
        stat('Can’t come', t.declined),
        t.diet ? stat('Dietary notes', t.diet) : null,
        t.songs ? stat('Song requests', t.songs) : null),
      meals.length && t.guests ? h('section.card',
        h('header.card__head', h('h2.card__title', 'Meals')),
        bars(meals, mealMax, (m) => [h('b', String(m.guests)), ` guest${m.guests === 1 ? '' : 's'}`])) : null,
      (t.events || []).length ? h('section.card',
        h('header.card__head', h('h2.card__title', 'Per ceremony')),
        bars(t.events, max, (e) => [h('b', String(e.guests)), ` guest${e.guests === 1 ? '' : 's'} · ${plural(e.parties, 'family', 'families')}`])) : null,
      h('section.card',
        h('div.toolbar',
          h('div.seg', { role: 'group', 'aria-label': 'Show' },
            [['all', 'Everyone'], ['yes', 'Coming'], ['no', 'Can’t come']].map(([v, txt]) => h('button.seg__btn', { type: 'button', 'aria-pressed': String(filter === v), onclick: () => { filter = v; render(); } }, txt))),
          h('label.search', icon('search', 16), search),
          h('div.toolbar__right',
            iconBtn('refresh', 'Refresh', load),
            questionsBtn(),
            h('a.btn.btn--sm', { href: `/api/invitations/${encodeURIComponent(slug)}/rsvps.csv`, download: `replies-${slug}.csv` }, icon('download', 15), 'Export CSV'))),
        rows.length ? list : h('p.muted.pad', 'No replies match.')));
  };
  load();
  return root;
}

export function repliesModule(ctx) { return repliesView(ctx.slug, { questions: () => rsvpQuestions(ctx.m) }); }
