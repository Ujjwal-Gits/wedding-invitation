// The owner's dashboard modules. One content system for all of them: a page header with a hairline,
// then hairline-divided lists and real tables. Borders only on things that are objects (theme cards, plans).
import { h, icon, iconBtn, toast, openDialog, confirmDialog, fmtDate, fmtRelative, copyText, emptyState, toggle, debounce, fill } from './dom.js';
import { api } from './api.js';
import { photoUrl } from '../photos.js';
import { deleteDialog, actionMenu, whenText } from './manage.js';
import { accessPanel, accessSummary, permsText, linkUrl, resetPasswordDialog } from './admin-access.js';
import { repliesView, when } from './m-replies.js';
import { shareUrl } from './m-send.js';
import { coupleName } from './session.js';

const TZ = 'Asia/Kathmandu';
const nameOf = (i) => coupleName(i.bride, i.groom);
const ordersOf = (r) => (Array.isArray(r) ? r : r?.orders || []);
const listInvitations = () => api('/invitations').then((r) => r.invitations || []);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ── Small shared pieces ───────────────────────────────────────────────────

/** A status: a dot and a word. tone: ok | warn | muted | danger | accent */
const st = (tone, text, title) => h('span.st', { class: `st--${tone}`, title }, h('span.st__dot', { 'aria-hidden': 'true' }), h('span.st__t', text));
const statusOf = (i) => (i.status === 'published'
  ? (i.changed ? st('warn', 'Live · changes', 'Live, with changes not yet published') : st('ok', 'Live'))
  : st('muted', 'Draft'));
const thumb = (i) => h('span.ithumb', i.hero ? h('img', { src: photoUrl(i.hero, 'sm'), alt: '', loading: 'lazy', decoding: 'async' }) : icon('heart', 15));
const themeOf = (ctx, slug) => ctx.meta.themes.find((t) => t.slug === slug);
const tthumb = (t) => h('span.tthumb', t?.thumb ? h('img', { src: t.thumb, alt: '', loading: 'lazy', decoding: 'async' }) : null);

const todayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
const daysUntil = (ymd) => {
  if (!ymd) return null;
  const a = Date.parse(String(ymd).slice(0, 10));
  return Number.isFinite(a) ? Math.round((a - Date.parse(todayKey())) / 864e5) : null;
};
const daysText = (n) => (n == null ? '' : n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n > 0 ? `in ${n} days` : n === -1 ? 'Yesterday' : `${-n} days ago`);

/** A section: a quiet title row (with an optional count and a link) over its rows. */
const sectHead = (title, { count, more, id } = {}) => h('header.sect__head',
  h('h2.sect__title', { id }, title, count != null ? h('span.sect__count', String(count)) : null),
  more || null);
const more = (href, text) => h('a.sect__more', { href }, text, icon('right', 14));

const kpi = (k, v, cls = '') => h('div.kpi', { class: cls }, h('dt.kpi__k', k), h('dd.kpi__v', v == null ? '—' : String(v)));
const kpiSkel = (n) => Array.from({ length: n }, () => h('div.kpi.is-loading', h('dt.kpi__k', h('span.skel__line')), h('dd.kpi__v', h('span.skel__line'))));
const rowsSkel = (n = 3) => h('div.rows-skel', { 'aria-hidden': 'true' }, Array.from({ length: n }, (_, i) => h('div.rows-skel__row', h('span.skel__line', { style: { width: `${[38, 54, 46, 60, 42][i % 5]}%` } }))));
const quietEmpty = (ic, title, text, ...actions) => h('div.qempty', h('span.qempty__icon', icon(ic, 18)), h('div', h('p.qempty__title', title), text ? h('p.qempty__text', text) : null), actions.length ? h('div.qempty__acts', actions) : null);

/** Toolbar filter tabs. items: [[value, label, count]] */
function ftabs(items, current, onPick, label = 'Filter') {
  const wrap = h('div.ftabs', { role: 'group', 'aria-label': label });
  const draw = (cur, counts) => fill(wrap, items.map(([v, t]) => h('button.ftab', { type: 'button', 'aria-pressed': String(cur === v), onclick: () => onPick(v) },
    t, counts?.[v] != null ? h('span.ftab__n', String(counts[v])) : null)));
  draw(current);
  return { el: wrap, draw };
}

/** A sortable header cell. */
function sortTh(label, key, sort, onSort, cls = '') {
  const on = sort.key === key;
  return h('th', { scope: 'col', class: cls, 'aria-sort': on ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none' },
    h('button.sortbtn', { type: 'button', onclick: () => onSort(key) }, label, h('span.sortbtn__i', { class: on ? 'is-on' : '' }, icon(on && sort.dir > 0 ? 'up' : 'down', 13))));
}

const searchBox = (placeholder, onInput) => h('label.search', icon('search', 15),
  h('input.input.input--sm', { type: 'search', placeholder, 'aria-label': placeholder, oninput: (e) => onInput(e.target.value) }));

// ── New invitation ────────────────────────────────────────────────────────

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);

export function newInvitation(ctx) {
  let slugTouched = false;
  const err = h('p.form-error', { role: 'alert' });
  const bride = h('input.input', { id: 'n-bride', maxlength: 60, autocomplete: 'off', required: true, placeholder: 'Aarati' });
  const groom = h('input.input', { id: 'n-groom', maxlength: 60, autocomplete: 'off', required: true, placeholder: 'Sameer' });
  const slug = h('input.input', { id: 'n-slug', maxlength: 64, autocomplete: 'off', required: true, spellcheck: 'false' });
  const themes = ctx.meta.themes.filter((t) => t.ready !== false);
  const theme = h('select.input', { id: 'n-theme' }, themes.map((t) => h('option', { value: t.slug }, t.name)));
  const auto = () => { if (!slugTouched) slug.value = slugify(`${bride.value} ${groom.value}`.trim()); };
  bride.addEventListener('input', auto);
  groom.addEventListener('input', auto);
  slug.addEventListener('input', () => { slugTouched = true; slug.value = slug.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'); });
  const submit = h('button.btn.btn--primary', { type: 'submit', form: 'new-inv' }, 'Create');
  const form = h('form#new-inv.stack', { novalidate: true },
    h('div.pair',
      h('div.field', h('label.label', { for: 'n-bride' }, 'Bride’s first name'), bride),
      h('div.field', h('label.label', { for: 'n-groom' }, 'Groom’s first name'), groom)),
    h('div.pair',
      h('div.field', h('label.label', { for: 'n-theme' }, 'Design'), theme),
      h('div.field', h('label.label', { for: 'n-slug' }, 'Link name'), slug, h('p.hint', 'Lowercase letters, numbers, hyphens. Cannot change later.'))),
    err);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    if (!bride.value.trim() || !groom.value.trim()) { err.textContent = 'Please enter both first names.'; return; }
    if (!/^[a-z0-9-]{3,64}$/.test(slug.value)) { err.textContent = 'The link name needs 3 to 64 lowercase letters, numbers or hyphens.'; return; }
    submit.disabled = true;
    try {
      const doc = await api('/invitations', { method: 'POST', body: { bride: bride.value, groom: groom.value, slug: slug.value, theme: theme.value, sample: true } });
      d.close();
      toast('Invitation created', 'success');
      ctx.go(`#/i/${doc.slug}/home`);
    } catch (ex) {
      err.textContent = ex.status === 409 ? 'That link name is taken. Choose another.' : ex.message;
    } finally { submit.disabled = false; }
  });
  const d = openDialog({ title: 'New invitation', body: [h('p.dialog__text', 'Start with the couple’s first names. It begins with sample details you can change.'), form], actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), submit] });
  bride.focus();
}

const newBtn = (ctx) => h('button.btn.btn--primary', { type: 'button', onclick: () => newInvitation(ctx) }, icon('plus', 16), 'New invitation');

// ── Overview: a work queue ────────────────────────────────────────────────

const STAGES = [['new', 'New'], ['contacted', 'Contacted'], ['done', 'Done'], ['archived', 'Archived']];
const digits = (p) => String(p || '').replace(/[^\d+]/g, '');
const waNumber = (p) => { let d = digits(p).replace(/^\+/, ''); if (/^9[78]\d{8}$/.test(d)) d = `977${d}`; return d; };

async function repliesFor(list) {
  const withR = list.filter((i) => i.rsvpCount > 0).slice(0, 40);
  const res = await Promise.all(withR.map((i) => api(`/invitations/${i.slug}/rsvps`).then((r) => ({ i, r })).catch(() => null)));
  return new Map(res.filter(Boolean).map((x) => [x.i.slug, x.r]));
}

async function publishNow(ctx, i, btn, after) {
  if (!(await confirmDialog({ title: `Publish ${nameOf(i)}’s changes?`, message: 'Guests opening the link will see the latest version straight away.', confirm: 'Publish' }))) return;
  btn.disabled = true;
  try {
    await api(`/invitations/${i.slug}/publish`, { method: 'POST' });
    toast(`${nameOf(i)}: changes are live`, 'success');
    after();
  } catch (err) {
    btn.disabled = false;
    if (err.status === 422) { toast('A few things are missing before it can go live.', 'error'); ctx.go(`#/i/${i.slug}/send`); } else toast(err.message, 'error');
  }
}

function overview(ctx) {
  const strip = h('dl.kpis', kpiSkel(5));
  ctx.shell.setStrip(strip);
  const needsCount = h('span.sect__count', { hidden: true });
  const needs = h('div', rowsSkel(3));
  const upcoming = h('div', rowsSkel(3));
  const feed = h('div', rowsSkel(5));
  const dateLine = new Date().toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
  let alive = true;
  ctx.cleanup(() => { alive = false; });

  const load = async () => {
    const [list, orders, site, stats] = await Promise.all([
      listInvitations().catch(() => null),
      api('/orders').then(ordersOf).catch(() => null),
      loadSite().catch(() => ({ plans: [] })),
      api('/admin/stats').catch(() => null),
    ]);
    if (!alive) return;
    if (!list) {
      fill(needs, quietEmpty('alert', 'Could not load the overview', 'Check the connection, then try again.', h('button.btn.btn--sm', { type: 'button', onclick: load }, icon('refresh', 15), 'Try again')));
      fill(upcoming); fill(feed);
      return;
    }
    const rsvps = await repliesFor(list);
    if (!alive) return;
    const planName = (id) => site.plans?.find((p) => p.id === id)?.name || id;
    const fresh = (orders || []).filter((o) => o.status === 'new');
    ctx.shell.setBadge('orders', fresh.length ? String(fresh.length) : '');

    // Key figures
    const s = stats || {
      published: list.filter((i) => i.status === 'published').length,
      drafts: list.filter((i) => i.status !== 'published').length,
      rsvps: list.reduce((a, i) => a + (i.rsvpCount || 0), 0),
      attending: [...rsvps.values()].reduce((a, r) => a + (r.totals?.guests || 0), 0),
      newOrders: orders ? fresh.length : null,
    };
    fill(strip,
      kpi('Live', s.published),
      kpi('Drafts', s.drafts),
      kpi('Guests coming', s.attending),
      kpi('Replies', s.rsvps),
      kpi('New orders', s.newOrders, s.newOrders ? 'is-accent' : ''));

    // Needs you
    const tasks = [];
    const dayAgo = Date.now() - 864e5;
    for (const i of list.filter((x) => x.clientLink && !x.clientLink.hasPassword)) {
      tasks.push({ ic: 'lock', tone: 'warn', title: [h('b', nameOf(i)), ': the couple’s link has no password'], meta: 'Anyone with the link can open and edit it. Set a password, then send it separately.',
        acts: [h('button.btn.btn--sm', { type: 'button', onclick: () => accessDialog(ctx, i, load) }, 'Set password')] });
    }
    for (const o of fresh.slice(0, 5)) {
      const markBtn = h('button.btn.btn--sm.btn--quiet', { type: 'button', onclick: async () => {
        markBtn.disabled = true;
        try { await api(`/orders/${encodeURIComponent(o.id)}`, { method: 'PATCH', body: { status: 'contacted' } }); toast(`${o.name} moved to Contacted`, 'success'); load(); } catch (err) { markBtn.disabled = false; toast(err.message, 'error'); }
      } }, icon('check', 15), 'Contacted');
      tasks.push({ ic: o.kind === 'custom' ? 'wand' : 'call', title: [`Call back `, h('b', o.name)],
        meta: [o.kind === 'custom' ? 'Custom design request' : 'Order', o.plan ? planName(o.plan) : null, o.weddingDate ? `wedding ${fmtDate(o.weddingDate)}` : null, fmtRelative(o.at)].filter(Boolean).join(' · '),
        acts: [
          h('a.btn.btn--sm', { href: `tel:${digits(o.phone)}`, 'aria-label': `Call ${o.name}, ${o.phone}` }, icon('call', 15), h('span.tnum', o.phone)),
          h('a.btn.btn--sm.btn--icon-sm', { href: `https://wa.me/${waNumber(o.phone)}`, target: '_blank', rel: 'noopener', 'aria-label': `WhatsApp ${o.name}`, title: 'WhatsApp' }, icon('chat', 15)),
          markBtn] });
    }
    if (fresh.length > 5) tasks.push({ ic: 'inbox', title: [`${fresh.length - 5} more new orders`], meta: 'Waiting in Orders & requests.', acts: [h('a.btn.btn--sm', { href: '#/orders' }, 'Open orders')] });
    for (const i of list.filter((x) => x.changed)) {
      const pub = h('button.btn.btn--sm.btn--ink', { type: 'button' }, 'Publish');
      pub.addEventListener('click', () => publishNow(ctx, i, pub, load));
      const by = i.lastEdit?.by === 'couple' ? 'The couple edited it' : 'Edited';
      tasks.push({ ic: 'edit', title: [h('b', nameOf(i)), ' has unpublished changes'], meta: `${by} ${i.lastEdit?.at ? fmtRelative(i.lastEdit.at) : ''}. Guests still see the last published version.`, dot: i.unseen,
        acts: [h('a.btn.btn--sm', { href: `#/i/${i.slug}/send` }, 'Review'), pub] });
    }
    for (const i of list) {
      const n = daysUntil(i.weddingDate);
      if (i.status !== 'published' && n != null && n >= 0 && n <= 21) {
        tasks.push({ ic: 'calendar', tone: 'warn', title: [h('b', nameOf(i)), `: wedding ${n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`}, still a draft`], meta: 'Guests cannot open it until it is published.',
          acts: [h('a.btn.btn--sm', { href: `#/i/${i.slug}/send` }, 'Publish…')] });
      }
    }
    for (const i of list) {
      const rs = (rsvps.get(i.slug)?.replies || []).filter((r) => new Date(r.at).getTime() >= dayAgo);
      if (!rs.length) continue;
      const coming = rs.filter((r) => r.attending === 'yes').reduce((a, r) => a + (Number(r.guests) || 0), 0);
      tasks.push({ ic: 'chat', title: [`${plural(rs.length, 'new reply', 'new replies')} for `, h('b', nameOf(i))],
        meta: `${rs.slice(0, 3).map((r) => r.name).join(', ')}${rs.length > 3 ? ` and ${rs.length - 3} more` : ''}${coming ? ` · ${plural(coming, 'guest')} coming` : ''}`,
        acts: [h('a.btn.btn--sm', { href: `#/replies?i=${encodeURIComponent(i.slug)}` }, 'See replies')] });
    }
    needsCount.textContent = String(tasks.length);
    needsCount.hidden = !tasks.length;
    needsCount.classList.toggle('is-accent', tasks.length > 0);
    ctx.shell.setSub(`${dateLine} · ${tasks.length ? `${plural(tasks.length, 'thing needs', 'things need')} you` : 'nothing needs you right now'}`);
    fill(needs, tasks.length
      ? h('ul.rows', tasks.map((t) => h('li.task',
        h('span.task__icon', { class: t.tone ? `is-${t.tone}` : '' }, icon(t.ic, 16)),
        h('div.task__main', h('p.task__title', t.title, t.dot ? h('span.dot', { title: 'New since you last looked', 'aria-label': 'new' }) : null), t.meta ? h('p.task__meta', t.meta) : null),
        h('div.task__acts', t.acts))))
      : quietEmpty('check', 'All clear', list.length ? 'No orders to call back, no unpublished changes and no new replies. New work shows up here.' : 'Create the first invitation; it starts with sample details.', list.length ? null : newBtn(ctx)));

    // Upcoming weddings
    const up = list.map((i) => ({ i, n: daysUntil(i.weddingDate) })).filter((x) => x.n != null && x.n >= 0).sort((a, b) => a.n - b.n);
    const noDate = list.filter((i) => !i.weddingDate).length;
    fill(upcoming, up.length
      ? h('ol.rows', up.slice(0, 8).map(({ i, n }) => {
        const t = themeOf(ctx, i.theme);
        const r = rsvps.get(i.slug)?.totals;
        return h('li', h('a.wed', { href: `#/i/${i.slug}/home` },
          h('span.dblock', { 'aria-hidden': 'true' }, h('span.dblock__d', fmtDate(i.weddingDate, { day: 'numeric' })), h('span.dblock__m', fmtDate(i.weddingDate, { month: 'short' }))),
          tthumb(t),
          h('span.wed__main', h('b', nameOf(i)), h('small', `${fmtDate(i.weddingDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${t?.name || i.theme}`)),
          h('span.wed__days', { class: n <= 14 ? 'is-soon' : '' }, daysText(n)),
          h('span.wed__st', statusOf(i)),
          h('span.wed__rsvp', r && r.replies
            ? [h('b.tnum', String(r.guests)), ` coming`, h('small', ` · ${plural(r.replies, 'reply', 'replies')}`)]
            : h('small', 'No replies yet')),
          h('span.wed__go', { 'aria-hidden': 'true' }, icon('chevron', 16))));
      }))
      : quietEmpty('calendar', 'No weddings coming up', list.length ? 'Invitations with a future wedding date are listed here, nearest first.' : 'Create an invitation to see it here.'));
    if (up.length > 8 || noDate) {
      upcoming.append(h('p.sect__foot', [up.length > 8 ? `${up.length - 8} more later. ` : '', noDate ? `${plural(noDate, 'invitation has', 'invitations have')} no wedding date yet.` : ''].join('')));
    }

    // Recent activity
    const ev = [];
    for (const i of list) {
      if (i.createdAt) ev.push({ at: i.createdAt, ic: 'plus', text: ['You created ', h('b', nameOf(i))], href: `#/i/${i.slug}/home` });
      if (i.publishedAt) ev.push({ at: i.publishedAt, ic: 'send', text: [h('b', nameOf(i)), ' went live'], href: `#/i/${i.slug}/send` });
      if (i.lastEdit?.at && i.lastEdit.type !== 'publish') ev.push({ at: i.lastEdit.at, ic: 'edit', couple: i.lastEdit.by === 'couple', text: [i.lastEdit.by === 'couple' ? 'The couple edited ' : 'You edited ', h('b', nameOf(i))], href: `#/i/${i.slug}/home` });
    }
    for (const [slug, r] of rsvps) {
      const i = list.find((x) => x.slug === slug);
      for (const x of (r.replies || []).slice(0, 30)) ev.push({ at: x.at, ic: 'chat', text: [h('b', x.name), x.attending === 'yes' ? ` is coming${x.guests > 1 ? `, ${x.guests} guests` : ''}` : ' can’t come', h('span.act__ctx', ` · ${nameOf(i)}`)], href: `#/replies?i=${encodeURIComponent(slug)}` });
    }
    for (const o of (orders || []).slice(0, 20)) ev.push({ at: o.at, ic: 'inbox', text: [o.kind === 'custom' ? 'Custom design request from ' : 'New order from ', h('b', o.name)], href: '#/orders' });
    ev.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const dayKey = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });
    const today = todayKey();
    const yest = new Date(Date.now() - 864e5).toLocaleDateString('en-CA', { timeZone: TZ });
    const groups = [];
    for (const e of ev.slice(0, 14)) {
      const k = dayKey(e.at);
      const lab = k === today ? 'Today' : k === yest ? 'Yesterday' : fmtDate(e.at, { weekday: 'short', day: 'numeric', month: 'short' });
      if (groups.at(-1)?.lab !== lab) groups.push({ lab, items: [] });
      groups.at(-1).items.push(e);
    }
    const timeOf = (iso) => new Date(iso).toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).toLowerCase();
    fill(feed, groups.length
      ? groups.map((g) => h('div.actgroup', h('p.actgroup__day', g.lab), h('ul.acts', g.items.map((e) => h('li', h('a.act', { href: e.href },
        h('span.act__icon', { class: e.couple ? 'is-couple' : '' }, icon(e.ic, 14)),
        h('span.act__text', e.text),
        h('time.act__when', { datetime: e.at, title: whenText(e.at) }, timeOf(e.at))))))))
      : quietEmpty('history', 'Nothing yet', 'Replies, edits and orders show up here as they happen.'));
  };
  load();

  return h('div.ov',
    h('div.ov__main',
      h('section.sect', { 'aria-labelledby': 'ov-needs' }, h('header.sect__head', h('h2.sect__title#ov-needs', 'Needs you', needsCount)), needs),
      h('section.sect', { 'aria-labelledby': 'ov-up' }, sectHead('Upcoming weddings', { id: 'ov-up', more: more('#/invitations', 'All invitations') }), upcoming)),
    h('aside.ov__side', { 'aria-labelledby': 'ov-act' },
      h('section.sect', sectHead('Recent activity', { id: 'ov-act' }), feed)));
}

// ── Invitations ───────────────────────────────────────────────────────────

function invitations(ctx) {
  let items = [];
  let q = '';
  let f = 'all';
  const sort = { key: 'updated', dir: -1 };
  const themeName = (slug) => themeOf(ctx, slug)?.name || slug;
  const tabs = ftabs([['all', 'All'], ['live', 'Live'], ['draft', 'Drafts'], ['changed', 'Unpublished changes']], f, (v) => { f = v; draw(); }, 'Show');
  const search = searchBox('Search couple, link or design', debounce((v) => { q = v; draw(); }, 120));
  const body = h('div.tablebox', rowsSkel(5));
  const onSort = (key) => { sort.dir = sort.key === key ? -sort.dir : (key === 'couple' || key === 'wedding' ? 1 : -1); sort.key = key; draw(); };
  const val = {
    couple: (i) => nameOf(i).toLowerCase(),
    wedding: (i) => i.weddingDate || '9999',
    replies: (i) => i.rsvpCount || 0,
    updated: (i) => i.updatedAt || '',
  };

  const load = async () => {
    try { items = await listInvitations(); draw(); } catch (err) { fill(body, quietEmpty('alert', 'Could not load invitations', err.message, h('button.btn.btn--sm', { type: 'button', onclick: load }, icon('refresh', 15), 'Try again'))); }
  };
  function draw() {
    const counts = { all: items.length, live: items.filter((i) => i.status === 'published').length, draft: items.filter((i) => i.status !== 'published').length, changed: items.filter((i) => i.changed).length };
    tabs.draw(f, counts);
    const rows = items.filter((i) => {
      if (f === 'draft' && i.status === 'published') return false;
      if (f === 'live' && i.status !== 'published') return false;
      if (f === 'changed' && !i.changed) return false;
      if (!q) return true;
      return `${nameOf(i)} ${i.slug} ${themeName(i.theme)}`.toLowerCase().includes(q.toLowerCase());
    }).sort((a, b) => { const x = val[sort.key](a); const y = val[sort.key](b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; });
    if (!items.length) { fill(body, quietEmpty('cards', 'No invitations yet', 'Create one; it starts with sample details you can change.', newBtn(ctx))); return; }
    const table = h('table.dtable.dtable--inv',
      h('caption.sr-only', `Invitations, ${rows.length} shown`),
      h('thead', h('tr',
        sortTh('Couple', 'couple', sort, onSort),
        h('th', { scope: 'col', class: 'col-design' }, 'Design'),
        sortTh('Wedding', 'wedding', sort, onSort),
        h('th', { scope: 'col' }, 'Status'),
        sortTh('Replies', 'replies', sort, onSort, 'num'),
        h('th', { scope: 'col' }, 'Client link'),
        sortTh('Updated', 'updated', sort, onSort, 'col-upd'),
        h('th', { scope: 'col', class: 'cell-act' }, h('span.sr-only', 'Actions')))),
      h('tbody', rows.map((i) => {
        const live = i.status === 'published';
        const names = nameOf(i);
        const t = themeOf(ctx, i.theme);
        const n = daysUntil(i.weddingDate);
        return h('tr',
          h('td.cell-couple', h('a.cell-main', { href: `#/i/${i.slug}/home` }, thumb(i),
            h('span.cell-main__t', h('b', names, i.unseen ? h('span.dot', { title: 'New changes by the couple', 'aria-label': 'new changes' }) : null), h('small.mono', `/${i.slug}`)))),
          h('td.col-design', { 'data-label': 'Design' }, h('span.cell-design', tthumb(t), h('span', t?.name || i.theme))),
          h('td', { 'data-label': 'Wedding' }, i.weddingDate ? h('span.cell-2', h('span.tnum', fmtDate(i.weddingDate)), h('small', daysText(n))) : h('span.muted', 'No date')),
          h('td', { 'data-label': 'Status' }, statusOf(i)),
          h('td.num', { 'data-label': 'Replies' }, h('span.tnum', String(i.rsvpCount || 0))),
          h('td', { 'data-label': 'Client link' }, accessSummary(i.clientLink)),
          h('td.col-upd', { 'data-label': 'Updated' }, h('span.cell-2', h('span', fmtRelative(i.updatedAt)), i.lastEdit?.by === 'couple' ? h('small', 'by the couple') : null)),
          h('td.cell-act', h('div.cell-act__in',
            h('a.btn.btn--sm', { href: `#/i/${i.slug}/home` }, 'Open'),
            actionMenu([
              { label: 'Open', icon: 'edit', href: `#/i/${i.slug}/home` },
              { label: live ? 'Open the live invitation' : 'Preview', icon: 'external', href: live ? shareUrl(ctx.meta, i.slug, i.theme) : `/${i.theme}/?id=${encodeURIComponent(i.slug)}`, newTab: true },
              { label: 'Copy the guest link', icon: 'copy', onSelect: () => copyText(shareUrl(ctx.meta, i.slug, i.theme)) },
              { label: 'Client access', icon: 'key', onSelect: () => accessDialog(ctx, i, draw) },
              { label: 'Replies', icon: 'chat', href: `#/replies?i=${encodeURIComponent(i.slug)}` },
              { label: 'Delete', icon: 'trash', danger: true, onSelect: async () => { if (await deleteDialog({ slug: i.slug, names })) load(); } },
            ], { label: `More for ${names}` }))));
      })));
    fill(body, rows.length ? table : quietEmpty('search', 'No invitations match', q ? `Nothing matches “${q}”.` : 'Try another filter.'));
  }
  load();
  return [h('div.toolbar2', tabs.el, h('div.toolbar2__end', search)), body];
}

function accessDialog(ctx, i, after) {
  openDialog({
    title: `Client access · ${nameOf(i)}`, wide: true,
    body: accessPanel({ slug: i.slug, names: nameOf(i), meta: ctx.meta, clientLink: i.clientLink, theme: i.theme, onChange: (l) => { i.clientLink = l; } }),
    onClose: () => after?.(),
  });
}

// ── Clients & access ──────────────────────────────────────────────────────

function access(ctx) {
  let q = '';
  let f = 'all';
  let items = [];
  const tabs = ftabs([['all', 'All'], ['active', 'Active'], ['nopw', 'No password'], ['none', 'No link']], f, (v) => { f = v; draw(); }, 'Show');
  const search = searchBox('Search couples', debounce((v) => { q = v; draw(); }, 120));
  const notice = h('div');
  const body = h('div.tablebox', rowsSkel(4));
  const yesNo = (v) => (v ? h('span.yn.is-yes', icon('check', 14), 'Yes') : h('span.yn', 'No'));
  function draw() {
    const kind = (i) => (!i.clientLink ? 'none' : !i.clientLink.hasPassword ? 'nopw' : 'active');
    const counts = { all: items.length, active: 0, nopw: 0, none: 0 };
    items.forEach((i) => { counts[kind(i)] += 1; });
    tabs.draw(f, counts);
    fill(notice, counts.nopw ? h('div.banner.banner--warn', icon('alert', 16),
      h('span', h('b', `${plural(counts.nopw, 'link opens', 'links open')} without a password. `), 'Anyone holding the link can edit. Open it and set a password.'),
      f !== 'nopw' ? h('button.btn.btn--sm', { type: 'button', onclick: () => { f = 'nopw'; draw(); } }, 'Show them') : null) : null);
    const rows = items.filter((i) => (f === 'all' || kind(i) === f) && (!q || `${nameOf(i)} ${i.slug}`.toLowerCase().includes(q.toLowerCase())));
    if (!items.length) { fill(body, quietEmpty('key', 'No invitations yet', 'Create an invitation first, then give the couple access.', newBtn(ctx))); return; }
    if (!rows.length) { fill(body, quietEmpty('search', 'No couples match', '')); return; }
    fill(body, h('table.dtable.dtable--acc',
      h('caption.sr-only', 'Client access per invitation'),
      h('thead', h('tr', ['Couple', 'Link', 'Designs', 'Can switch design', 'Colours', 'Since'].map((c, k) => h('th', { scope: 'col', class: k >= 3 && k <= 4 ? 'col-perm' : k === 5 ? 'col-upd' : '' }, c)), h('th', { scope: 'col', class: 'cell-act' }, h('span.sr-only', 'Actions')))),
      h('tbody', rows.map((i) => {
        const l = i.clientLink;
        const designs = !l ? '—' : l.themes === 'all' || !Array.isArray(l.themes) ? 'All designs' : plural(l.themes.length, 'design');
        return h('tr',
          h('td.cell-couple', h('span.cell-main', thumb(i), h('span.cell-main__t', h('b', nameOf(i)), h('small.mono', `/${i.slug}`)))),
          h('td', { 'data-label': 'Link' }, h('span.cell-2', accessSummary(l),
            l?.url ? h('button.link.link--quiet', { type: 'button', title: 'Copy the couple’s link', onclick: () => copyText(linkUrl(l)) }, 'Copy link')
              : l ? h('small', { title: 'Made before links could be shown again. Make a new link (Manage) to copy it.' }, 'Older link') : null)),
          h('td', { 'data-label': 'Designs', title: l ? permsText(l) : '' }, designs),
          h('td.col-perm', { 'data-label': 'Switch design' }, l ? yesNo(l.canChangeTheme) : '—'),
          h('td.col-perm', { 'data-label': 'Colours' }, l ? yesNo(l.canChangeColors) : '—'),
          h('td.col-upd', { 'data-label': 'Since' }, l ? h('span.tnum', fmtDate(l.createdAt)) : '—'),
          h('td.cell-act', h('div.cell-act__in',
            l ? iconBtn('key', l.hasPassword ? 'Reset password' : 'Set password', async () => {
              const out = await resetPasswordDialog(i.slug, l.hasPassword);
              if (out) { i.clientLink = out; draw(); toast('Password changed. Send the new password to the couple.', 'success'); }
            }, 'btn--ghost') : null,
            h('button.btn.btn--sm', { type: 'button', class: l && !l.hasPassword ? 'btn--ink' : '', onclick: () => accessDialog(ctx, i, draw) }, l ? 'Manage' : 'Create link'))));
      }))));
  }
  listInvitations().then((l) => { items = l; draw(); }).catch((err) => fill(body, quietEmpty('alert', 'Could not load', err.message)));
  const how = h('aside.howto', { 'aria-labelledby': 'acc-how' },
    h('h2.howto__title#acc-how', 'How client access works'),
    h('ol.howto__list',
      h('li', h('b', 'Create a link'), h('span', 'with a password you choose, per invitation.')),
      h('li', h('b', 'Send them apart'), h('span', 'the link in one message, the password in another (or by phone).')),
      h('li', h('b', 'Set what they may do'), h('span', 'which designs they see, and whether they can switch design or change colours.')),
      h('li', h('b', 'Lost or leaked?'), h('span', 'make a new link; the old one stops at once.'))));
  return [notice, h('div.withaside', h('div.withaside__main', h('div.toolbar2', tabs.el, h('div.toolbar2__end', search)), body), how)];
}

// ── Orders & requests ─────────────────────────────────────────────────────

function orders(ctx) {
  let list = [];
  let tab = 'new';
  let planNames = {};
  const stages = h('div.stages', { role: 'group', 'aria-label': 'Stage' });
  const body = h('div', rowsSkel(4));
  const patch = async (o, b) => {
    try {
      const out = await api(`/orders/${encodeURIComponent(o.id)}`, { method: 'PATCH', body: b });
      Object.assign(o, out.order || b);
      return true;
    } catch (err) { toast(err.message, 'error'); return false; }
  };
  const orderRow = (o) => {
    const notes = h('textarea.input', { rows: 2, maxlength: 2000, placeholder: 'Notes only you see: what they want, when to call…', value: o.notes || '', 'aria-label': `Notes for ${o.name}` });
    const saved = h('span.hint', { 'aria-live': 'polite' });
    const saveNotes = debounce(async () => { if (notes.value === (o.notes || '')) return; saved.textContent = 'Saving…'; if (await patch(o, { notes: notes.value })) saved.textContent = 'Saved'; }, 800);
    notes.addEventListener('input', saveNotes);
    notes.addEventListener('blur', () => saveNotes());
    const idx = STAGES.findIndex(([s]) => s === o.status);
    const facts = [
      o.weddingDate ? ['Wedding', fmtDate(o.weddingDate)] : null,
      o.plan ? ['Plan', planNames[o.plan] || o.plan] : null,
      o.theme ? ['Design', themeOf(ctx, o.theme)?.name || o.theme] : null,
      o.email ? ['Email', h('a', { href: `mailto:${o.email}` }, o.email)] : null,
      o.invitation ? ['Invitation', h('a', { href: `#/i/${o.invitation}/home` }, `/${o.invitation}`)] : null,
    ].filter(Boolean);
    return h('li.ord',
      h('div.ord__who',
        h('p.ord__name', h('b', o.name), h('span.tag', { class: o.kind === 'custom' ? 'tag--accent' : '' }, o.kind === 'custom' ? 'Custom design' : 'Order')),
        h('p.ord__when', h('time', { datetime: o.at, title: whenText(o.at) }, fmtRelative(o.at))),
        h('div.ord__contact',
          h('a.btn.btn--sm', { href: `tel:${digits(o.phone)}` }, icon('call', 15), h('span.tnum', o.phone)),
          h('a.btn.btn--sm.btn--wa', { href: `https://wa.me/${waNumber(o.phone)}`, target: '_blank', rel: 'noopener' }, icon('chat', 15), 'WhatsApp')),
        o.message ? h('blockquote.ord__msg', o.message) : h('p.ord__nomsg', 'No message.')),
      h('div.ord__side',
        facts.length ? h('dl.kv', facts.map(([k, v]) => h('div', h('dt', k), h('dd', v)))) : null,
        h('div.ord__notes', notes, saved),
        h('div.ord__foot',
          h('div.stepper', { role: 'group', 'aria-label': `Stage for ${o.name}` }, STAGES.map(([s, t], k) => h('button.stepper__b', {
            type: 'button', class: k < idx ? 'is-past' : k === idx ? 'is-on' : '', 'aria-pressed': String(k === idx),
            onclick: async () => { if (s === o.status) return; if (await patch(o, { status: s })) { toast(`${o.name} moved to ${t}`, 'success'); draw(); } },
          }, t))),
          iconBtn('trash', `Delete the order from ${o.name}`, async () => {
            if (!(await confirmDialog({ title: 'Delete this order?', message: `The request from ${o.name} is removed for good.`, confirm: 'Delete', danger: true }))) return;
            try { await api(`/orders/${encodeURIComponent(o.id)}`, { method: 'DELETE' }); list = list.filter((x) => x !== o); toast('Order deleted', 'success'); draw(); } catch (err) { toast(err.message, 'error'); }
          }, 'btn--ghost ord__del'))));
  };
  function draw() {
    const counts = Object.fromEntries(STAGES.map(([s]) => [s, list.filter((o) => o.status === s).length]));
    ctx.shell.setBadge('orders', counts.new ? String(counts.new) : '');
    fill(stages, STAGES.map(([s, t], k) => [h('button.stage', { type: 'button', 'aria-pressed': String(tab === s), onclick: () => { tab = s; draw(); } },
      h('span.stage__n', { class: s === 'new' && counts.new ? 'is-accent' : '' }, String(counts[s])), h('span.stage__t', t)),
    k < STAGES.length - 1 ? h('span.stage__arrow', { 'aria-hidden': 'true' }, icon('chevron', 14)) : null]));
    const rows = list.filter((o) => o.status === tab);
    fill(body, rows.length ? h('ul.ords', rows.map(orderRow))
      : quietEmpty('inbox', tab === 'new' ? 'No new orders' : `Nothing in ${STAGES.find(([s]) => s === tab)[1].toLowerCase()}`, tab === 'new' ? 'Orders and custom design requests from the website arrive here. Call them back, then move them along.' : 'Orders you move to this stage show up here.'));
  }
  loadSite().then((site) => { planNames = Object.fromEntries((site.plans || []).map((p) => [p.id, p.name])); if (list.length) draw(); }).catch(() => {});
  api('/orders').then((r) => { list = ordersOf(r); draw(); }).catch((err) => fill(body, quietEmpty('inbox', err.status === 404 ? 'Orders are not available yet' : 'Could not load orders', err.status === 404 ? 'They will appear here once the server supports them.' : err.message)));
  return [stages, body];
}

// ── Replies (all invitations or one) ──────────────────────────────────────

function replies(ctx) {
  const body = h('div', rowsSkel(5));
  const sel = h('select.input.input--sm', { id: 'rep-inv', 'aria-label': 'Invitation' }, h('option', { value: '' }, 'All invitations'));
  let items = [];
  const showAll = async () => {
    fill(body, rowsSkel(5));
    const strip = h('dl.kpis', kpiSkel(4));
    ctx.shell.setStrip(strip);
    const withR = items.filter((i) => i.rsvpCount > 0);
    const res = await Promise.all(withR.map((i) => api(`/invitations/${i.slug}/rsvps`).then((r) => ({ i, r })).catch(() => null)));
    if (sel.value) return; // switched meanwhile
    const ok = res.filter(Boolean);
    const tot = ok.reduce((a, { r }) => ({ guests: a.guests + (r.totals.guests || 0), replies: a.replies + (r.totals.replies || 0), declined: a.declined + (r.totals.declined || 0) }), { guests: 0, replies: 0, declined: 0 });
    fill(strip, kpi('Guests coming', tot.guests), kpi('Replies', tot.replies), kpi('Can’t come', tot.declined), kpi('Invitations', ok.length));
    if (!ok.length) { fill(body, quietEmpty('chat', 'No replies yet', 'Once invitations are shared, every guest reply shows up here.')); return; }
    const all = ok.flatMap(({ i, r }) => (r.replies || []).map((x) => ({ ...x, inv: i }))).sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const pick = (slug) => { sel.value = slug; sel.dispatchEvent(new Event('change')); };
    fill(body, h('div.withaside.withaside--wide',
      h('section.sect.withaside__main', sectHead('Latest replies', { count: all.length }),
        h('ul.rlist.rlist--rows', all.slice(0, 60).map((x) => h('li.ritem',
          h('span.ritem__avatar', { class: x.attending === 'yes' ? 'is-yes' : '' }, (x.name || '?').trim().slice(0, 1).toUpperCase()),
          h('div.ritem__main',
            h('p.ritem__head', h('b', x.name), x.attending === 'yes' ? st('ok', `Coming · ${x.guests}`) : st('muted', 'Can’t come')),
            h('p.ritem__meta', h('button.link.link--quiet', { type: 'button', onclick: () => pick(x.inv.slug) }, nameOf(x.inv)), h('span', when(x.at))),
            x.message ? h('p.ritem__msg', x.message) : null))))),
      h('section.sect.byinv', sectHead('By invitation'),
        h('ul.rows', ok.sort((a, b) => b.r.totals.guests - a.r.totals.guests).map(({ i, r }) => h('li', h('button.byinv__row', { type: 'button', onclick: () => pick(i.slug) },
          thumb(i), h('span.byinv__main', h('b', nameOf(i)), h('small', `${plural(r.totals.replies, 'reply', 'replies')} · ${r.totals.declined} can’t come`)),
          h('span.byinv__n', h('b.tnum', String(r.totals.guests)), h('small', 'coming')), icon('chevron', 16))))))));
  };
  sel.addEventListener('change', () => {
    history.replaceState(null, '', sel.value ? `#/replies?i=${encodeURIComponent(sel.value)}` : '#/replies');
    if (sel.value) { ctx.shell.setStrip(null); fill(body, repliesView(sel.value)); } else showAll();
  });
  listInvitations().then((l) => {
    items = l;
    sel.append(...l.map((i) => h('option', { value: i.slug }, `${nameOf(i)} (${i.rsvpCount || 0})`)));
    const want = ctx.params.get('i');
    if (want && l.some((i) => i.slug === want)) { sel.value = want; sel.dispatchEvent(new Event('change')); } else showAll();
  }).catch((err) => fill(body, quietEmpty('alert', 'Could not load', err.message)));
  return [h('div.toolbar2', h('label.toolbar2__label', { for: 'rep-inv' }, 'Showing'), sel), body];
}

// ── Site settings (themes visibility, pricing, contact) ───────────────────

const DEFAULT_SITE = () => ({
  plans: [
    { id: 'classic', name: 'Classic', price: null, currency: 'NPR', note: '', features: [], highlight: false },
    { id: 'premium', name: 'Premium', price: null, currency: 'NPR', note: '', features: [], highlight: true },
    { id: 'custom', name: 'Custom', price: null, currency: 'NPR', note: '', features: [], highlight: false },
  ],
  contact: { phone: '', whatsapp: '', email: '', address: '' },
  hero: { title: '', subtitle: '' },
  hiddenThemes: [],
  featuredThemes: [],
});
async function loadSite() {
  try { return { ...DEFAULT_SITE(), ...(await api('/site')) }; } catch (err) { if (err.status === 404) return { ...DEFAULT_SITE(), missing: true }; throw err; }
}
const putSite = (site) => { const { missing, ...body } = site; return api('/site', { method: 'PUT', body }); };

/** A settings row: what it is on the left, the controls on the right. */
const setting = (title, help, ...children) => h('section.setrow',
  h('header.setrow__aside', h('h2.setrow__title', title), help ? h('p.setrow__help', help) : null),
  h('div.setrow__body', ...children));

function themesAdmin(ctx) {
  const root = h('div', rowsSkel(4));
  const status = h('span.savechip', { 'data-state': 'saved', role: 'status', 'aria-live': 'polite' }, h('span.savechip__dot', { 'aria-hidden': 'true' }), h('span.savechip__t', 'Saved'));
  ctx.shell.setPage({ title: 'Themes', sub: 'Choose which designs the website shows, and which are featured.', actions: [status] });
  let f = 'all';
  loadSite().then((site) => {
    const setState = (s, t) => { status.dataset.state = s; status.lastChild.textContent = t; };
    const save = debounce(async () => {
      setState('saving', 'Saving…');
      try { const out = await putSite(site); Object.assign(site, out); setState('saved', 'Saved'); } catch (err) { setState('error', err.status === 404 ? 'Not available yet' : 'Not saved'); toast(err.message, 'error'); }
    }, 500);
    const list = ctx.meta.themes;
    const tabs = ftabs([['all', 'All'], ['shown', 'On the website'], ['hidden', 'Hidden'], ['featured', 'Featured']], f, (v) => { f = v; draw(); }, 'Show');
    const grid = h('ul.tgrid.tgrid--admin');
    const note = h('p.toolbar2__note');
    const draw = () => {
      const hidden = new Set(site.hiddenThemes || []);
      const feat = new Set(site.featuredThemes || []);
      note.textContent = `${list.length - hidden.size} of ${list.length} on the website${feat.size ? ` · ${feat.size} featured` : ''}`;
      tabs.draw(f, { all: list.length, shown: list.length - hidden.size, hidden: hidden.size, featured: feat.size });
      const rows = list.filter((t) => f === 'all' || (f === 'shown' && !hidden.has(t.slug)) || (f === 'hidden' && hidden.has(t.slug)) || (f === 'featured' && feat.has(t.slug)));
      fill(grid, rows.length ? rows.map((t) => h('li.tadmin', { class: hidden.has(t.slug) ? 'is-hidden' : '' },
        h('a.tcard', { href: `/${t.slug}/`, target: '_blank', rel: 'noopener', 'aria-label': `${t.name}: open the demo in a new tab` },
          h('span.tcard__img', t.thumb ? h('img', { src: t.thumb, alt: '', loading: 'lazy' }) : h('span.thumb-ph', t.name),
            feat.has(t.slug) ? h('span.tcard__on', icon('star', 12), 'Featured') : null,
            h('span.tcard__view', icon('external', 13), 'Demo'),
            t.ready === false ? h('span.tcard__soon', 'Not ready') : null),
          h('span.tcard__name', t.name), t.concept ? h('span.tcard__concept', t.concept) : null),
        h('div.tadmin__toggles',
          toggle({ label: 'On the website', checked: !hidden.has(t.slug), onChange: (v) => {
            site.hiddenThemes = v ? site.hiddenThemes.filter((x) => x !== t.slug) : [...new Set([...site.hiddenThemes, t.slug])];
            if (!v) site.featuredThemes = site.featuredThemes.filter((x) => x !== t.slug); // a hidden design cannot be featured
            draw(); save();
          } }),
          (() => {
            const fe = toggle({ label: 'Featured', checked: feat.has(t.slug), onChange: (v) => { site.featuredThemes = v ? [...new Set([...site.featuredThemes, t.slug])] : site.featuredThemes.filter((x) => x !== t.slug); draw(); save(); } });
            if (hidden.has(t.slug)) { fe.querySelector('input').disabled = true; fe.classList.add('is-disabled'); fe.title = 'Show it on the website first.'; }
            return fe;
          })())))
        : h('li.tgrid__empty', quietEmpty('palette', 'No designs here', 'Try another filter.')));
    };
    draw();
    fill(root, h('div.toolbar2', tabs.el, h('div.toolbar2__end', note)), grid);
  }).catch((err) => fill(root, quietEmpty('alert', 'Could not load the website settings', err.message)));
  return root;
}

function website(ctx) {
  const root = h('div', rowsSkel(6));
  loadSite().then((site) => {
    let dirty = false;
    const saveBtn = h('button.btn.btn--primary', { type: 'button', disabled: true, onclick: async () => {
      const err = validate();
      if (err) { toast(err, 'error'); [...root.querySelectorAll('input[id^="pl-name-"]')].find((x) => !x.value.trim())?.focus(); return; }
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      try { const out = await putSite(site); Object.assign(site, out); dirty = false; toast('Website updated', 'success'); draw(); } catch (ex) { toast(ex.status === 404 ? 'Saving is not available yet.' : ex.message, 'error'); saveBtn.disabled = false; }
      saveBtn.textContent = 'Save changes';
    } }, 'Save changes');
    const bar = h('div.savebar', { hidden: true, role: 'region', 'aria-label': 'Unsaved changes' },
      h('span.savebar__t', icon('info', 16), 'Unsaved changes. The website shows them after you save.'),
      h('div.row', h('button.btn.btn--sm', { type: 'button', onclick: async () => { Object.assign(site, await loadSite()); dirty = false; draw(); } }, 'Discard'),
        h('button.btn.btn--sm.btn--primary', { type: 'button', onclick: () => saveBtn.click() }, 'Save changes')));
    const touch = () => { dirty = true; saveBtn.disabled = false; bar.hidden = false; };
    const beforeUnload = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    ctx.cleanup(() => { window.removeEventListener('beforeunload', beforeUnload); if (dirty) toast('Your website changes were not saved.', 'error'); });
    ctx.shell.setPage({ title: 'Website', sub: 'Pricing, contact details and the headline on the public website.', actions: [h('a.btn', { href: '/', target: '_blank', rel: 'noopener' }, icon('external', 15), 'View site'), saveBtn] });
    const validate = () => {
      const ids = new Set();
      for (const p of site.plans) {
        if (!p.name.trim()) return 'Every plan needs a name.';
        if (p.price != null && (!Number.isInteger(p.price) || p.price < 0)) return `The price of ${p.name} must be a whole number.`;
        p.id = p.id || slugify(p.name) || `plan-${ids.size + 1}`;
        while (ids.has(p.id)) p.id = `${p.id}-2`;
        ids.add(p.id);
      }
      return null;
    };
    const fieldIn = (id, labelText, value, set, opts = {}) => {
      const el = h(opts.multiline ? 'textarea.input' : 'input.input', { id, value: value ?? '', maxlength: opts.max, rows: opts.rows, type: opts.type || (opts.multiline ? undefined : 'text'), inputmode: opts.inputmode, placeholder: opts.placeholder, oninput: (e) => { set(e.target.value); touch(); } });
      return h('div.field', { class: opts.cls }, h('label.label', { for: id }, labelText), el, opts.hint ? h('p.hint', opts.hint) : null);
    };
    const planCard = (p, i) => {
      const price = h('input.input', { id: `pl-price-${i}`, inputmode: 'numeric', value: p.price ?? '', placeholder: 'Ask for price', oninput: (e) => { const v = e.target.value.replace(/[^\d]/g, ''); e.target.value = v; p.price = v === '' ? null : Number(v); touch(); } });
      return h('article.plan', { class: p.highlight ? 'is-highlight' : '' },
        h('header.plan__head', h('span.plan__n', `Plan ${i + 1}`),
          h('span.plan__tools',
            iconBtn('up', `Move plan ${i + 1} up`, () => { if (i) { [site.plans[i - 1], site.plans[i]] = [site.plans[i], site.plans[i - 1]]; touch(); draw(); } }, i === 0 ? 'is-disabled' : ''),
            iconBtn('down', `Move plan ${i + 1} down`, () => { if (i < site.plans.length - 1) { [site.plans[i + 1], site.plans[i]] = [site.plans[i], site.plans[i + 1]]; touch(); draw(); } }, i === site.plans.length - 1 ? 'is-disabled' : ''),
            iconBtn('trash', `Remove plan ${i + 1}`, async () => { if (await confirmDialog({ title: `Remove ${p.name || 'this plan'}?`, message: 'It disappears from the website after you save.', confirm: 'Remove', danger: true })) { site.plans.splice(i, 1); touch(); draw(); } }))),
        fieldIn(`pl-name-${i}`, 'Name', p.name, (v) => { p.name = v; }, { max: 60 }),
        h('div.field', h('label.label', { for: `pl-price-${i}` }, 'Price (NPR)'), h('div.inputrow.inputrow--prefix', h('span.prefix', 'Rs'), price), h('p.hint', 'Empty shows “Ask for price”.')),
        fieldIn(`pl-note-${i}`, 'Short note', p.note, (v) => { p.note = v; }, { max: 160, placeholder: 'e.g. Most couples choose this' }),
        fieldIn(`pl-feat-${i}`, 'Included (one per line)', (p.features || []).join('\n'), (v) => { p.features = v.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 20); }, { multiline: true, rows: 4 }),
        toggle({ label: 'Recommended', hint: 'Highlighted on the website.', checked: p.highlight, onChange: (v) => { site.plans.forEach((x) => { x.highlight = false; }); p.highlight = v; touch(); draw(); } }));
    };
    const draw = () => {
      fill(root,
        site.missing ? h('div.banner', icon('info', 16), h('span', 'The website settings are not available on the server yet. You can prepare them; saving will work once it is.')) : null,
        setting('Pricing plans', 'Shown on the public website in this order. Leave a price empty to show “Ask for price”.',
          h('div.plans', site.plans.map(planCard)),
          site.plans.length < 8 ? h('button.btn.btn--add', { type: 'button', onclick: () => { site.plans.push({ id: '', name: '', price: null, currency: 'NPR', note: '', features: [], highlight: false }); touch(); draw(); root.querySelectorAll('.plan').item(site.plans.length - 1)?.querySelector('input')?.focus(); } }, icon('plus', 16), 'Add a plan') : null),
        setting('Contact details', 'In the website footer and contact section. Orders also link here.',
          h('div.pair',
            fieldIn('ct-phone', 'Phone', site.contact.phone, (v) => { site.contact.phone = v; }, { type: 'tel', inputmode: 'tel', max: 20, placeholder: '+977 98…' }),
            fieldIn('ct-wa', 'WhatsApp', site.contact.whatsapp, (v) => { site.contact.whatsapp = v; }, { type: 'tel', inputmode: 'tel', max: 20, placeholder: '+977 98…' })),
          h('div.pair',
            fieldIn('ct-email', 'Email', site.contact.email, (v) => { site.contact.email = v; }, { type: 'email', max: 254 }),
            fieldIn('ct-addr', 'Address', site.contact.address, (v) => { site.contact.address = v; }, { max: 300 }))),
        setting('Website headline', 'Optional. Leave empty to keep the built-in words.',
          fieldIn('hero-title', 'Headline', site.hero?.title, (v) => { site.hero = { ...site.hero, title: v }; }, { max: 120 }),
          fieldIn('hero-sub', 'Line under it', site.hero?.subtitle, (v) => { site.hero = { ...site.hero, subtitle: v }; }, { max: 300, multiline: true, rows: 2 })),
        bar);
      saveBtn.disabled = !dirty;
      bar.hidden = !dirty;
    };
    draw();
  }).catch((err) => fill(root, quietEmpty('alert', 'Could not load the website settings', err.message)));
  return root;
}

// ── Settings & help ───────────────────────────────────────────────────────

function settings(ctx) {
  return [
    setting('Your account', 'The owner account has full access to every invitation, client link and order.',
      h('dl.kv.kv--rows', h('div', h('dt', 'Signed in as'), h('dd', ctx.me.email || 'Owner')), h('div', h('dt', 'Role'), h('dd', 'Owner, full access'))),
      h('p.hint', icon('info', 14), 'To change the owner email or password, update the server settings (.env) and restart.')),
    setting('Quick help', 'Where things live.',
      h('dl.kv.kv--rows',
        h('div', h('dt', 'New couple'), h('dd', 'Invitations → New invitation, then Clients & access → Create link. Send the link and, separately, the password.')),
        h('div', h('dt', 'Lost link'), h('dd', 'Make a new one; the old link stops working at once.')),
        h('div', h('dt', 'Prices, contact'), h('dd', h('a', { href: '#/website' }, 'Website'), '. Designs on the website: ', h('a', { href: '#/themes' }, 'Themes'), '.')),
        h('div', h('dt', 'Credits'), h('dd', 'Photo and music credits are on ', h('a', { href: '/credits/', target: '_blank', rel: 'noopener' }, 'the credits page'), '.')))),
  ];
}

export const ADMIN_MODULES = [
  { id: 'overview', title: 'Overview', icon: 'grid', group: 'main', render: overview, sub: ' ', actions: (ctx) => [newBtn(ctx)] },
  { id: 'invitations', title: 'Invitations', icon: 'cards', group: 'main', render: invitations, sub: 'Every invitation: its status, replies and the couple’s access.', actions: (ctx) => [newBtn(ctx)] },
  { id: 'access', title: 'Clients & access', short: 'Access', icon: 'key', group: 'main', render: access, sub: 'Private links and passwords that let couples edit their invitation.' },
  { id: 'replies', title: 'Replies', icon: 'chat', group: 'main', render: replies, sub: 'Guest replies across all invitations, or one at a time.' },
  { id: 'orders', title: 'Orders & requests', short: 'Orders', icon: 'inbox', group: 'business', render: orders, sub: 'From the website order form. Call back, then move each one along.' },
  { id: 'themes', title: 'Themes', icon: 'palette', group: 'business', render: themesAdmin, sub: 'Choose which designs the website shows, and which are featured.' },
  { id: 'website', title: 'Website', icon: 'globe', group: 'business', render: website, sub: 'Pricing, contact details and the headline on the public website.' },
  { id: 'settings', title: 'Settings & help', short: 'Settings', icon: 'settings', group: 'business', render: settings, sub: 'Your account and where things live.' },
];
