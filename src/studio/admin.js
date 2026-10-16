// The owner's dashboard modules. One content system for all of them: a page header with a hairline,
// then hairline-divided lists and real tables. Borders only on things that are objects (theme cards, plans).
import { h, icon, iconBtn, toast, openDialog, confirmDialog, fmtDate, fmtRelative, copyText, emptyState, toggle, debounce, fill } from './dom.js';
import { api, postForm } from './api.js';
import { photoUrl } from '../photos.js';
import { deleteDialog, actionMenu, whenText } from './manage.js';
import { accessPanel, accessSummary, permsText, linkUrl, resetPasswordDialog } from './admin-access.js';
import { clearCache } from './cache.js';
import { navigate, setUrl, current } from './nav.js';
import { customersSection } from './admin-customers.js';
import { musicLibrary } from './admin-music.js';
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
// Three short steps (docs/PLATFORM.md "Religion"): 1 the couple and their community, 2 a design made for that
// community (stills only), 3 its opening colours and the link name. Created with the community's own ceremonies
// and wording (server: starter() in lib/invitations.js).

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
// tiny marks for the four choices (constant markup); Hindu shows ॐ as a glyph
const FAITH_MARK = {
  muslim: '<path d="M15.5 4.6a8 8 0 1 0 3.9 13.3A6.6 6.6 0 0 1 15.5 4.6z"/><path d="M17.6 7.2l.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2z"/>',
  christian: '<path d="M12 3v18M7 8.5h10"/>',
  other: '<circle cx="12" cy="12" r="2"/><path d="M12 10c-1.5-3-1.2-5.6 0-6.5 1.2.9 1.5 3.5 0 6.5zM14 12c3-1.5 5.6-1.2 6.5 0-.9 1.2-3.5 1.5-6.5 0zM12 14c1.5 3 1.2 5.6 0 6.5-1.2-.9-1.5-3.5 0-6.5zM10 12c-3 1.5-5.6 1.2-6.5 0 .9-1.2 3.5-1.5 6.5 0z"/>',
};
const FAITHS = [
  ['hindu', 'Hindu', 'Ganesh and ॥ श्री गणेशाय नमः ॥'],
  ['muslim', 'Muslim', 'Bismillah, a crescent; Nikah and Walima'],
  ['christian', 'Christian', 'A verse, rings and cross; Holy Matrimony'],
  ['other', 'Other / none', 'No religious symbol'],
];
const faithMark = (k) => {
  if (k === 'hindu') return h('span.nf-mark.nf-mark--om', { 'aria-hidden': 'true', lang: 'ne' }, 'ॐ');
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [a, v] of Object.entries({ viewBox: '0 0 24 24', width: 22, height: 22, fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) s.setAttribute(a, v);
  s.innerHTML = FAITH_MARK[k]; // constant markup only
  return h('span.nf-mark', s);
};
const suitsFaith = (t, r) => (Array.isArray(t.religions) && t.religions.length ? t.religions : ['hindu']).includes(r);

/**
 * New invitation. prefill (from an order): { bride, groom, theme, email, weddingDate, venue, order }. The customer's
 * email links it to their account (it appears in their dashboard; an email with no account yet waits for one).
 */
export function newInvitation(ctx, prefill = {}) {
  const st = { step: 1, religion: 'hindu', theme: prefill.theme || '', colors: {}, slugTouched: false };
  const err = h('p.form-error', { role: 'alert' });
  const bride = h('input.input', { id: 'n-bride', maxlength: 60, autocomplete: 'off', required: true, placeholder: 'e.g. Sita', value: prefill.bride || '' });
  const groom = h('input.input', { id: 'n-groom', maxlength: 60, autocomplete: 'off', required: true, placeholder: 'e.g. Ram', value: prefill.groom || '' });
  const emails = h('datalist#n-emails');
  const email = h('input.input', { id: 'n-email', type: 'email', maxlength: 254, autocomplete: 'off', spellcheck: 'false', list: 'n-emails', placeholder: 'name@example.com', value: prefill.email || '' });
  api('/admin/customers').then((r) => fill(emails, (r.customers || []).map((c) => h('option', { value: c.email }, c.name || c.email)))).catch(() => {});
  const slug = h('input.input', { id: 'n-slug', maxlength: 64, autocomplete: 'off', required: true, spellcheck: 'false' });
  const auto = () => { if (!st.slugTouched) slug.value = slugify(`${bride.value} ${groom.value}`.trim()); };
  bride.addEventListener('input', auto);
  groom.addEventListener('input', auto);
  slug.addEventListener('input', () => { st.slugTouched = true; slug.value = slug.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'); });
  const ready = ctx.meta.themes.filter((t) => t.ready !== false);
  const themeOfSlug = (s) => ready.find((t) => t.slug === s);

  // step 1 · the couple and their community
  const faithBox = h('div.nf-faiths', { role: 'radiogroup', 'aria-label': 'Community' });
  const drawFaiths = () => fill(faithBox, FAITHS.map(([k, name, note]) => {
    const n = ready.filter((t) => suitsFaith(t, k)).length;
    return h('button.nf-faith', { type: 'button', role: 'radio', 'aria-checked': String(st.religion === k), onclick: () => { st.religion = k; if (st.theme && !suitsFaith(themeOfSlug(st.theme) || {}, k)) st.theme = ''; drawFaiths(); } },
      faithMark(k), h('span.nf-faith__t', h('b', name), h('small', note)), h('span.nf-faith__n', `${n} design${n === 1 ? '' : 's'}`));
  }));
  drawFaiths();
  const step1 = h('div.nf-step',
    h('div.pair',
      h('div.field', h('label.label', { for: 'n-bride' }, 'Bride’s first name'), bride),
      h('div.field', h('label.label', { for: 'n-groom' }, 'Groom’s first name'), groom)),
    h('div.field', h('label.label', { for: 'n-email' }, 'Customer email (optional)'), email, emails,
      h('p.hint', 'The invitation appears in their dashboard when they sign in. No account yet? It waits for them to order or sign up with this email.')),
    h('div.field', h('span.label', 'Their community'), faithBox,
      h('p.hint', 'Sets the sacred symbol, the opening words and the first ceremonies. Only designs made for it are shown next.')));

  // step 2 · a design for that community (stills only)
  const grid = h('div.nf-grid');
  const drawGrid = () => {
    const list = ready.filter((t) => suitsFaith(t, st.religion));
    if (!st.theme || !list.some((t) => t.slug === st.theme)) st.theme = list[0]?.slug || '';
    fill(grid, list.length ? list.map((t) => {
      const still = t.stills?.hero || t.stills?.gate || t.thumb;
      return h('button.nf-design', { type: 'button', 'aria-pressed': String(st.theme === t.slug), onclick: () => { st.theme = t.slug; st.colors = {}; drawGrid(); } },
        h('span.nf-design__pic', still ? h('img', { src: still, alt: '', loading: 'lazy', decoding: 'async' }) : null),
        h('span.nf-design__t', h('b', t.name), t.concept ? h('small', t.concept) : null));
    }) : h('p.hint', 'No design is marked for this community yet. Choose “Other / none”, or ask for a custom design.'));
  };
  const step2 = h('div.nf-step', h('p.nf-lead', ''), grid);

  // step 3 · opening colours and the link
  const colorsBox = h('div.nf-colors');
  const preview = h('div.nf-chosen');
  const drawColors = () => {
    const t = themeOfSlug(st.theme);
    const entries = Object.entries(t?.colors || {});
    const still = t?.stills?.gate || t?.stills?.hero || t?.thumb;
    fill(preview, still ? h('img', { src: still, alt: '' }) : null, h('div', h('b', t?.name || ''), h('small', FAITHS.find((f) => f[0] === st.religion)[1])));
    fill(colorsBox, entries.length ? entries.map(([tok, spec]) => {
      const id = `nc-${tok.replace(/[^a-z0-9]/g, '')}`;
      const inp = h('input.nf-color__in', { type: 'color', id, value: st.colors[tok] || spec.default || '#000000', oninput: (e) => { st.colors[tok] = e.target.value; } });
      return h('label.nf-color', { for: id }, inp, h('span', spec.label || tok));
    }).concat(h('button.link', { type: 'button', onclick: () => { st.colors = {}; drawColors(); } }, 'Reset to the design’s colours'))
      : h('p.hint', 'This design has no colour choices.'));
  };
  const step3 = h('div.nf-step',
    preview,
    h('div.field', h('span.label', 'Opening colours'), colorsBox, h('p.hint', 'You can change these later in Opening.')),
    h('div.field', h('label.label', { for: 'n-slug' }, 'Link name'), slug, h('p.hint', 'Lowercase letters, numbers, hyphens. Cannot change later.')));

  const steps = [['Couple', step1], ['Design', step2], ['Colours', step3]];
  const rail = h('ol.nf-rail');
  const pane = h('div.nf-pane');
  const back = h('button.btn', { type: 'button', onclick: () => go(st.step - 1) }, 'Back');
  const next = h('button.btn.btn--primary', { type: 'button', onclick: () => go(st.step + 1) }, 'Next');
  const create = h('button.btn.btn--primary', { type: 'button', onclick: () => submit() }, 'Create invitation');
  const cancel = h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel');
  function go(n) {
    err.textContent = '';
    if (n > st.step && st.step === 1) {
      if (!bride.value.trim() || !groom.value.trim()) { err.textContent = 'Please enter both first names.'; return; }
      if (email.value.trim() && !email.checkValidity()) { err.textContent = 'The customer email does not look right.'; email.focus(); return; }
    }
    if (n > st.step && st.step === 2 && !st.theme) { err.textContent = 'Choose a design first.'; return; }
    st.step = Math.max(1, Math.min(3, n));
    if (st.step === 2) { drawGrid(); step2.firstChild.textContent = st.religion === 'hindu' ? 'Every design suits a Hindu wedding. You can switch later.' : `Designs made for ${st.religion === 'other' ? 'a wedding without religious symbols' : `a ${FAITHS.find((f) => f[0] === st.religion)[1]} wedding`}. The pictures show the sample card; yours shows ${({ muslim: 'Bismillah, a crescent and Nikah', christian: 'a verse, the rings and cross, and Holy Matrimony', other: 'a flower emblem and no invocation' })[st.religion]} instead of Ganesh.`; }
    if (st.step === 3) { auto(); drawColors(); }
    fill(rail, steps.map(([name], i) => h('li', { class: i + 1 === st.step ? 'is-on' : i + 1 < st.step ? 'is-done' : '' }, h('span', String(i + 1)), name)));
    fill(pane, steps[st.step - 1][1], err);
    back.hidden = st.step === 1;
    cancel.hidden = st.step !== 1;
    next.hidden = st.step === 3;
    create.hidden = st.step !== 3;
    (st.step === 1 ? bride : st.step === 2 ? grid.querySelector('[aria-pressed="true"]') : colorsBox.querySelector('input'))?.focus({ preventScroll: true });
  }
  async function submit() {
    err.textContent = '';
    if (!/^[a-z0-9-]{3,64}$/.test(slug.value)) { err.textContent = 'The link name needs 3 to 64 lowercase letters, numbers or hyphens.'; return; }
    const t = themeOfSlug(st.theme);
    const colors = Object.fromEntries(Object.entries(st.colors).filter(([tok, v]) => /^#[0-9a-f]{6}$/i.test(v) && v.toLowerCase() !== String(t?.colors?.[tok]?.default || '').toLowerCase()));
    create.disabled = true;
    try {
      const extra = { ...(email.value.trim() ? { customerEmail: email.value.trim() } : {}), ...(prefill.weddingDate ? { weddingDate: prefill.weddingDate } : {}), ...(prefill.venue ? { venue: prefill.venue } : {}), ...(prefill.order ? { order: prefill.order } : {}) };
      const doc = await api('/invitations', { method: 'POST', body: { bride: bride.value, groom: groom.value, slug: slug.value, theme: st.theme, religion: st.religion, ...(Object.keys(colors).length ? { colors } : {}), ...extra } });
      d.close();
      toast(doc.customer ? (doc.customer.linked ? `Invitation created and added to ${doc.customer.email}’s dashboard` : `Invitation created. It appears for ${doc.customer.email} once they sign up with that email.`) : 'Invitation created', 'success');
      ctx.go(`#/i/${doc.slug}/home`);
    } catch (ex) {
      err.textContent = ex.status === 409 ? 'That link name is taken. Choose another.' : ex.message;
    } finally { create.disabled = false; }
  }
  const d = openDialog({ title: 'New invitation', wide: true, cls: 'nf', body: [rail, pane], actions: [cancel, back, h('span.nf-gap'), next, create] });
  go(1);
}

const newBtn = (ctx) => h('button.btn.btn--primary', { type: 'button', onclick: () => newInvitation(ctx) }, icon('plus', 16), 'New invitation');

/** Link now / Dismiss for an invitation waiting for an email (Overview and Customer accounts). after(): redraw. */
export function pendingActs(p, after) {
  const linkBtn = h('button.btn.btn--sm.btn--primary', { type: 'button', onclick: async () => {
    linkBtn.disabled = true;
    try { await api('/admin/pending/link', { method: 'POST', body: { email: p.email, slug: p.slug } }); toast(`Linked: it is now in ${p.email}’s dashboard`, 'success'); after?.(); } catch (err) { linkBtn.disabled = false; toast(err.message, 'error'); }
  } }, icon('link', 14), 'Link now');
  const dismissBtn = h('button.btn.btn--sm.btn--quiet', { type: 'button', onclick: async () => {
    try { await api('/admin/pending/dismiss', { method: 'POST', body: { email: p.email, slug: p.slug } }); toast('Dismissed', 'success'); after?.(); } catch (err) { toast(err.message, 'error'); }
  } }, 'Dismiss');
  return [linkBtn, dismissBtn];
}

/** One click: the order's invitation (names, design, plan and wedding details), linked to the order's customer. */
async function createFromOrder(ctx, o, btn) {
  btn.disabled = true;
  try {
    const out = await api(`/orders/${encodeURIComponent(o.id)}/invitation`, { method: 'POST', body: {} });
    o.invitation = out.slug;
    toast(out.customer?.linked ? `Invitation created and added to ${out.customer.email}’s dashboard` : out.customer?.pending ? `Invitation created. It appears for ${out.customer.email} once they sign up.` : 'Invitation created', 'success');
    ctx.go(`#/i/${out.slug}/home`);
  } catch (err) {
    btn.disabled = false;
    if (err.status === 409 && err.body?.current) { o.invitation = err.body.current; ctx.go(`#/i/${err.body.current}/home`); return; }
    toast(err.message, 'error');
  }
}

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
  const strip = h('dl.kpis', kpiSkel(6));
  ctx.shell.setStrip(strip);
  const needsCount = h('span.sect__count', { hidden: true });
  const needs = h('div', rowsSkel(3));
  const upcoming = h('div', rowsSkel(3));
  const feed = h('div', rowsSkel(5));
  const dateLine = new Date().toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });
  let alive = true;
  ctx.cleanup(() => { alive = false; });

  const load = async () => {
    const [list, orders, site, stats, pending] = await Promise.all([
      listInvitations().catch(() => null),
      api('/orders').then(ordersOf).catch(() => null),
      loadSite().catch(() => ({ plans: [] })),
      api('/admin/stats').catch(() => null),
      api('/admin/customers').then((r) => r.pending || []).catch(() => []),
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
    const toCheck = (orders || []).filter((o) => o.status !== 'archived' && (o.payStatus || o.pay?.status) === 'proof_submitted');
    const attention = new Set([...fresh, ...toCheck]).size;
    ctx.shell.setBadge('orders', attention ? String(attention) : '');

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
      kpi('New orders', s.newOrders, s.newOrders ? 'is-accent' : ''),
      kpi('Payments to check', orders ? toCheck.length : null, toCheck.length ? 'is-accent' : ''));

    // Needs you
    const tasks = [];
    const dayAgo = Date.now() - 864e5;
    for (const i of list.filter((x) => x.clientLink && !x.clientLink.hasPassword)) {
      tasks.push({ ic: 'lock', tone: 'warn', title: [h('b', nameOf(i)), ': the couple’s link has no password'], meta: 'Anyone with the link can open and edit it. Set a password, then send it separately.',
        acts: [h('button.btn.btn--sm', { type: 'button', onclick: () => accessDialog(ctx, i, load) }, 'Set password')] });
    }
    // Someone signed up with an email an invitation waits for: never linked by itself (emails are not verified)
    for (const p of pending.filter((x) => x.account)) {
      const inv = list.find((i) => i.slug === p.slug);
      tasks.push({ ic: 'key', tone: 'accent',
        title: [h('b', p.account.name || p.account.email), ` (${p.account.email}) signed up: link the invitation `, h('b', inv ? nameOf(inv) : `/${p.slug}`), '?'],
        meta: `Made for this email ${fmtRelative(p.at)} · the account was made ${fmtRelative(p.account.createdAt)}. Link it only if this is your customer.`,
        acts: pendingActs(p, load) });
    }
    // Payments to check first: money is waiting to be confirmed
    for (const o of toCheck.slice(0, 5)) {
      const p = o.pay.proofs.at(-1);
      tasks.push({ ic: 'check', tone: 'accent', thumb: p?.thumb, href: `#/orders/${o.ref || o.id}`,
        title: ['Payment to check: ', h('b', o.name)],
        meta: [o.ref, o.planName, p ? `${p.methodLabel || p.method} · says ${p.amountPaid}` : null, o.amount?.npr != null ? `expected Rs ${Number(o.amount.npr).toLocaleString('en-IN')}` : null, p ? fmtRelative(p.at) : null].filter(Boolean).join(' · '),
        acts: [h('a.btn.btn--sm.btn--primary', { href: `#/orders/${o.ref || o.id}` }, 'Check payment')] });
    }
    if (toCheck.length > 5) tasks.push({ ic: 'inbox', title: [`${toCheck.length - 5} more payments to check`], meta: 'Waiting in Orders & requests.', acts: [h('a.btn.btn--sm', { href: '#/orders?pay=check' }, 'Open')] });
    for (const o of fresh.filter((x) => !toCheck.includes(x)).slice(0, 5)) {
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
        t.thumb ? h('a.task__thumb', { href: t.href || '#/orders?f=check', 'aria-hidden': 'true', tabindex: '-1' }, h('img', { src: t.thumb, alt: '', loading: 'lazy', decoding: 'async' }))
          : h('span.task__icon', { class: t.tone ? `is-${t.tone}` : '' }, icon(t.ic, 16)),
        h('div.task__main', h('p.task__title', t.title, t.dot ? h('span.dot', { title: 'New since you last looked', 'aria-label': 'new' }) : null), t.meta ? h('p.task__meta', t.meta) : null),
        h('div.task__acts', t.acts))))
      : quietEmpty('check', 'All clear', list.length ? 'No payments to check, no orders to call back, no unpublished changes and no new replies. New work shows up here.' : 'Create the first invitation; it starts with sample details.', list.length ? null : newBtn(ctx)));

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
    for (const o of (orders || []).slice(0, 40)) for (const p of o.pay?.proofs || []) ev.push({ at: p.at, ic: 'check', text: ['Payment screenshot from ', h('b', o.name), ` (${p.methodLabel || p.method})`], href: '#/orders?pay=check' });
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
        h('th', { scope: 'col' }, 'Separate link'),
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
          h('td', { 'data-label': 'Separate link' }, accessSummary(i.clientLink)),
          h('td.col-upd', { 'data-label': 'Updated' }, h('span.cell-2', h('span', fmtRelative(i.updatedAt)), i.lastEdit?.by === 'couple' ? h('small', 'by the couple') : null)),
          h('td.cell-act', h('div.cell-act__in',
            h('a.btn.btn--sm', { href: `#/i/${i.slug}/home` }, 'Open'),
            actionMenu([
              { label: 'Open', icon: 'edit', href: `#/i/${i.slug}/home` },
              { label: live ? 'Open the live invitation' : 'Preview', icon: 'external', href: live ? shareUrl(ctx.meta, i.slug, i.theme) : `/${i.theme}/?id=${encodeURIComponent(i.slug)}`, newTab: true },
              { label: 'Copy the guest link', icon: 'copy', onSelect: () => copyText(shareUrl(ctx.meta, i.slug, i.theme)) },
              { label: 'Separate link (optional)', icon: 'key', onSelect: () => accessDialog(ctx, i, draw) },
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
    title: `Share a separate link (optional) · ${nameOf(i)}`, wide: true,
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
            h('button.btn.btn--sm', { type: 'button', class: l && !l.hasPassword ? 'btn--ink' : '', onclick: () => accessDialog(ctx, i, draw) }, l ? 'Manage' : 'Separate link'))));
      }))));
  }
  listInvitations().then((l) => { items = l; draw(); }).catch((err) => fill(body, quietEmpty('alert', 'Could not load', err.message)));
  const how = h('aside.howto', { 'aria-labelledby': 'acc-how' },
    h('h2.howto__title#acc-how', 'How couples get in'),
    h('ol.howto__list',
      h('li', h('b', 'Their account (default)'), h('span', 'make the invitation with the customer’s email, or Create invitation on their order. It appears in their dashboard; they sign in with the password they chose.')),
      h('li', h('b', 'No account yet?'), h('span', 'it waits for them and appears once they order or sign up with that email.')),
      h('li', h('b', 'Separate link (optional)'), h('span', 'for couples without an account: a link plus a password you choose. Send them apart.')),
      h('li', h('b', 'Set what they may do'), h('span', 'which designs they see, and whether they can switch design or change colours.'))));
  return [
    h('section.sect', { 'aria-labelledby': 'sep-h' }, h('header.sect__head', h('h2.sect__title#sep-h', 'Separate links (optional)')),
      notice, h('div.withaside', h('div.withaside__main', h('div.toolbar2', tabs.el, h('div.toolbar2__end', search)), body), how))];
}

// ── Orders & requests ─────────────────────────────────────────────────────

// Payment (server/lib/payments/manual.js): order.pay = { status, reason, proofs: [{ n, at, method, methodLabel,
// currency, amountPaid, note, url, thumb }], history, via, manual }, order.payStatus (PayPal included).
// PayPal Checkout, when it is on, also keeps order.payment = { provider: 'paypal', status, amount, … }.
const PAY_STATE = {
  awaiting_payment: ['muted', 'Awaiting payment'], proof_submitted: ['accent', 'Payment to check'],
  confirmed: ['ok', 'Paid'], rejected: ['warn', 'Payment rejected'], refunded: ['warn', 'Refunded'],
};
const payState = (o) => o.payStatus || o.pay?.status || null;
const npr = (n) => `Rs ${Number(n).toLocaleString('en-IN')}`;
const usd = (n) => `$${Number.isInteger(n) ? n : Number(n).toFixed(2)}`;
const priceLine = (a, from) => [a?.npr != null ? `${from ? 'from ' : ''}${npr(a.npr)}` : null, a?.usd != null ? usd(a.usd) : null].filter(Boolean).join(' · ');
const ppMoney = (p) => (p?.amount ? `${p.currency || 'USD'} ${p.amount}` : '');
const ppBase = (p) => (p?.env === 'live' ? 'https://www.paypal.com' : 'https://www.sandbox.paypal.com');

function payBadge(o) {
  const s = payState(o);
  if (!s) return o.kind === 'order' ? h('span.pill.pill--muted', { title: 'Made before payments were tracked' }, 'Unpaid') : null;
  const [tone, text] = PAY_STATE[s] || ['muted', s];
  return h('span.pill', { class: `pill--${tone}` }, text);
}
function paypalFacts(p) {
  if (!p || p.provider !== 'paypal') return [];
  const ext = (href, text) => h('a', { href, target: '_blank', rel: 'noopener noreferrer', title: 'Opens PayPal in a new tab' }, text);
  return [
    ['PayPal', `${ppMoney(p)} · ${p.status}${p.env === 'sandbox' ? ' (sandbox, test money)' : ''}`],
    p.paidAt ? ['Paid', h('time', { datetime: p.paidAt, title: whenText(p.paidAt) }, fmtRelative(p.paidAt))] : null,
    p.refunded ? ['Refunded', `${p.currency} ${p.refunded}`] : null,
    p.payerEmail ? ['Payer', h('a', { href: `mailto:${p.payerEmail}` }, p.payerEmail)] : null,
    p.captureId ? ['PayPal transaction', ext(`${ppBase(p)}/activity/payment/${encodeURIComponent(p.captureId)}`, p.captureId)] : null,
    p.problem ? ['Note', p.problem] : null,
  ].filter(Boolean);
}

/** A payment screenshot, large, in a dialog (fetched from the admin-only route; never public). */
function proofDialog(o, p) {
  const img = h('img.proofview__img', { src: p.url, alt: `Payment screenshot ${p.n} from ${o.name}` });
  openDialog({
    title: `${o.name} · screenshot ${p.n}`, wide: true, cls: 'proofview',
    body: [h('div.proofview__pic', img),
      h('dl.kv', h('div', h('dt', 'Paid with'), h('dd', p.methodLabel || p.method)), h('div', h('dt', 'They say they paid'), h('dd', p.amountPaid || '—')),
        h('div', h('dt', 'Expected'), h('dd', priceLine(o.amount, o.planFrom) || '—')), h('div', h('dt', 'Sent'), h('dd', h('time', { datetime: p.at, title: whenText(p.at) }, fmtRelative(p.at)))),
        p.note ? h('div', h('dt', 'Their note'), h('dd', p.note)) : null)],
    actions: [h('a.btn', { href: p.url, target: '_blank', rel: 'noopener' }, icon('external', 15), 'Open full size')],
  });
}

/** Reject with a reason (the customer sees it on their pay page). Resolves to the reason or null. */
function rejectDialog(o) {
  return new Promise((resolve) => {
    let out = null;
    const presets = ['The amount does not match.', 'We could not find this payment in our account.', 'The screenshot is not clear. Please send another.'];
    const ta = h('textarea.input', { id: 'rej-reason', rows: 3, maxlength: 300, placeholder: 'e.g. The amount was Rs 499, not Rs 4,999.' });
    const err = h('p.form-error', { role: 'alert' });
    const d = openDialog({
      title: `Reject ${o.name}’s payment?`,
      body: [h('p.dialog__text', 'They see this reason on their order page and can send a new screenshot.'),
        h('div.field', h('label.label', { for: 'rej-reason' }, 'Reason'), ta,
          h('div.chips', presets.map((t) => h('button.chip', { type: 'button', onclick: () => { ta.value = t; ta.focus(); } }, t)))), err],
      actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'),
        h('button.btn.btn--danger', { type: 'button', onclick: () => { if (!ta.value.trim()) { err.textContent = 'Write a short reason.'; ta.focus(); return; } out = ta.value.trim(); d.close(); } }, 'Reject payment')],
      onClose: () => resolve(out),
    });
    ta.focus();
  });
}

/** Mark paid by hand (cash, or a transfer seen elsewhere). Resolves to { method, note } or null. */
function manualDialog(o, methods) {
  return new Promise((resolve) => {
    let out = null;
    const sel = h('select.input', { id: 'man-method' }, ['Cash', ...methods.map((m) => m.label), 'Other'].map((t) => h('option', { value: t }, t)));
    const note = h('input.input', { id: 'man-note', maxlength: 500, placeholder: 'e.g. Paid at the office on Friday' });
    const d = openDialog({
      title: `Mark ${o.name}’s order as paid`,
      body: [h('p.dialog__text', `For money you received another way. Expected: ${priceLine(o.amount, o.planFrom) || 'no price set'}.`),
        h('div.field', h('label.label', { for: 'man-method' }, 'How they paid'), sel),
        h('div.field', h('label.label', { for: 'man-note' }, 'Note (only you see it)'), note)],
      actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'),
        h('button.btn.btn--primary', { type: 'button', onclick: () => { out = { method: sel.value, note: note.value.trim() }; d.close(); } }, icon('check', 15), 'Mark paid')],
      onClose: () => resolve(out),
    });
  });
}

/** The payment panel of one order: proofs, what they say they paid, and the decisions. */
function payPanel(o, { patch, redraw, methods }) {
  const s = payState(o);
  if (!s && o.kind !== 'order') return null;
  const proofs = o.pay?.proofs || [];
  const setPay = async (payment, msg) => { if (await patch(o, { payment })) { toast(msg, 'success'); redraw(); } };
  const confirmBtn = h('button.btn.btn--sm.btn--primary', { type: 'button', onclick: () => setPay({ status: 'confirmed' }, `${o.name}: payment confirmed`) }, icon('check', 15), 'Confirm payment');
  const rejectBtn = h('button.btn.btn--sm', { type: 'button', onclick: async () => { const reason = await rejectDialog(o); if (reason) setPay({ status: 'rejected', reason }, `${o.name}: payment rejected`); } }, 'Reject…');
  const manualBtn = h('button.btn.btn--sm.btn--quiet', { type: 'button', onclick: async () => { const m = await manualDialog(o, methods); if (m) setPay({ status: 'confirmed', manual: true, method: m.method, note: m.note }, `${o.name}: marked paid`); } }, 'Mark paid manually…');
  const refundBtn = h('button.btn.btn--sm.btn--quiet', { type: 'button', onclick: async () => {
    if (await confirmDialog({ title: 'Mark this payment refunded?', message: 'Only records it here. Send the money back in the app you were paid with.', confirm: 'Mark refunded' })) setPay({ status: 'refunded' }, `${o.name}: marked refunded`);
  } }, 'Mark refunded…');
  const reopenBtn = h('button.btn.btn--sm.btn--quiet', { type: 'button', onclick: () => setPay({ status: proofs.length ? 'proof_submitted' : 'awaiting_payment', note: 'reopened' }, 'Payment reopened') }, 'Undo');
  const acts = s === 'confirmed' ? [refundBtn, reopenBtn]
    : s === 'refunded' ? [reopenBtn]
      : s === 'proof_submitted' ? [confirmBtn, rejectBtn, manualBtn]
        : [manualBtn, proofs.length ? rejectBtn : null];
  const last = proofs.at(-1);
  const via = o.pay?.via === 'manual' ? `By hand${o.pay.manual?.method ? ` · ${o.pay.manual.method}` : ''}` : o.pay?.via === 'paypal' ? 'PayPal checkout' : last ? last.methodLabel || last.method : null;
  return h('section.paybox', { class: s ? `is-${s}` : '', 'aria-label': `Payment for ${o.name}` },
    h('header.paybox__head', payBadge(o), h('span.paybox__amt.tnum', priceLine(o.amount, o.planFrom) || 'No price set'), o.ref ? h('span.paybox__ref.tnum', o.ref) : null),
    proofs.length ? h('ul.proofs', proofs.map((p) => h('li', h('button.proof', { type: 'button', onclick: () => proofDialog(o, p), 'aria-label': `Open screenshot ${p.n}` },
      h('img', { src: p.thumb, alt: '', loading: 'lazy', decoding: 'async' }),
      h('span.proof__cap', h('b', p.methodLabel || p.method), h('span.tnum', p.amountPaid || '—')))))) : null,
    h('dl.kv.paybox__kv',
      via ? h('div', h('dt', s === 'confirmed' ? 'Paid with' : 'Method used'), h('dd', via)) : null,
      last ? h('div', h('dt', 'They say they paid'), h('dd.tnum', last.amountPaid)) : null,
      last?.note ? h('div', h('dt', 'Their note'), h('dd', last.note)) : null,
      s === 'rejected' && o.pay?.reason ? h('div', h('dt', 'Told them'), h('dd', o.pay.reason)) : null,
      !proofs.length && s === 'awaiting_payment' ? h('div', h('dt', 'Screenshot'), h('dd', 'Not sent yet')) : null),
    h('div.paybox__acts', acts.filter(Boolean)));
}

// One filter bar (stage and payment in plain words), a thin table (one row per order), and a drawer with everything
// about one order: #/orders/<ref> deep-links it, and Back closes it.
const ORDER_FILTERS = [
  ['all', 'All'], ['new', 'New (to call)'], ['check', 'Payment to check'], ['waiting', 'Waiting for payment'],
  ['paid', 'Paid'], ['done', 'Done'], ['archived', 'Archived'],
];
const LEGACY_PAY = { check: 'check', awaiting: 'waiting', paid: 'paid' }; // older links: #/orders?pay=…
const SHORT_PAY = { awaiting_payment: ['muted', 'Waiting'], proof_submitted: ['accent', 'To check'], confirmed: ['ok', 'Paid'], rejected: ['warn', 'Rejected'], refunded: ['warn', 'Refunded'] };
const STAGE_TONE = { new: 'accent', contacted: 'muted', done: 'ok', archived: 'muted' };
const orderMatches = (o, f) => {
  const s = payState(o);
  if (f === 'archived') return o.status === 'archived';
  if (o.status === 'archived') return false;
  if (f === 'all') return true;
  if (f === 'new') return o.status === 'new';
  if (f === 'done') return o.status === 'done';
  if (f === 'check') return s === 'proof_submitted';
  if (f === 'waiting') return o.kind === 'order' && (!s || ['awaiting_payment', 'rejected'].includes(s));
  if (f === 'paid') return s === 'confirmed';
  return true;
};
const orderKey = (o) => o.ref || o.id;
const shortPay = (o) => {
  const s = payState(o);
  if (!s) return o.kind === 'order' ? h('span.pill.pill--muted', { title: 'Made before payments were tracked' }, 'Waiting') : h('span.ocell__none', '—');
  const [tone, text] = SHORT_PAY[s] || ['muted', s];
  return h('span.pill', { class: `pill--${tone}` }, text);
};
const stageOf = (o) => st(STAGE_TONE[o.status] || 'muted', STAGES.find(([s]) => s === o.status)?.[1] || o.status);

/** The drawer: one order in plain sections. Returns { el, close, redraw }. */
function orderDrawer(ctx, o, { patch, methods, onChange, onDeleted, onClose }) {
  const body = h('div.odr');
  const notes = h('textarea.input', { id: 'odr-notes', rows: 4, maxlength: 2000, placeholder: 'What they want, when to call…', value: o.notes || '' });
  const saved = h('span.hint', { 'aria-live': 'polite' });
  const saveNotes = debounce(async () => { if (notes.value === (o.notes || '')) return; saved.textContent = 'Saving…'; if (await patch(o, { notes: notes.value })) { saved.textContent = 'Saved'; onChange(); } }, 800);
  notes.addEventListener('input', saveNotes);
  notes.addEventListener('blur', () => saveNotes());
  const sect = (title, ...kids) => h('section.odr__sect', h('h3.odr__h', title), ...kids);
  const facts = (rows) => h('dl.kv.kv--rows', rows.filter(Boolean).map(([k, v]) => h('div', h('dt', k), h('dd', v))));
  const draw = () => {
    const idx = STAGES.findIndex(([s]) => s === o.status);
    const couple = [o.bride, o.groom].filter(Boolean).join(' & ');
    const pay = payPanel(o, { patch, redraw: () => { draw(); onChange(); }, methods });
    const invBtn = o.invitation
      ? h('a.btn.btn--sm', { href: `#/i/${o.invitation}/home` }, icon('edit', 14), 'Open the invitation')
      : (() => {
        const b = h('button.btn.btn--sm.btn--primary', { type: 'button', onclick: () => createFromOrder(ctx, o, b) }, icon('plus', 14), 'Create invitation');
        return b;
      })();
    fill(body,
      sect('Customer',
        h('p.odr__name', o.name, h('span.tag', { class: o.kind === 'custom' ? 'tag--accent' : '' }, o.kind === 'custom' ? 'Custom design' : 'Order')),
        h('div.row',
          h('a.btn.btn--sm', { href: `tel:${digits(o.phone)}` }, icon('call', 15), 'Call ', h('span.tnum', o.phone)),
          h('a.btn.btn--sm.btn--wa', { href: `https://wa.me/${waNumber(o.phone)}`, target: '_blank', rel: 'noopener' }, icon('chat', 15), 'WhatsApp')),
        o.email ? facts([['Email', h('a', { href: `mailto:${o.email}` }, o.email)]]) : null),
      sect('Order',
        facts([
          ['Order no.', h('span.tnum', o.ref || '—')],
          ['Received', h('time', { datetime: o.at, title: whenText(o.at) }, `${fmtDate(o.at)} · ${fmtRelative(o.at)}`)],
          ['Plan', o.plan ? `${o.planName || o.plan}${o.amount?.npr != null ? ` · ${priceLine(o.amount, o.planFrom)}` : ''}` : '—'],
          ['Design', o.theme ? themeOf(ctx, o.theme)?.name || o.theme : 'Not chosen'],
          couple ? ['Couple', couple] : null,
          ['Wedding date', o.weddingDate ? fmtDate(o.weddingDate) : 'Not given yet'],
          o.venue ? ['Venue', o.venue] : null,
          ['Message', o.message || 'No message.'],
          ...paypalFacts(o.payment),
        ])),
      pay ? sect('Payment', pay) : null,
      sect('Next step',
        o.kind === 'order' || o.customerId ? h('div.odr__next', invBtn,
          h('p.hint', o.invitation ? `Linked to ${o.email || 'the customer'}’s dashboard.` : o.email ? `Filled with this order’s details and added to ${o.email}’s dashboard.` : 'Filled with this order’s details.')) : null,
        h('div.stepper', { role: 'group', 'aria-label': 'Stage' }, STAGES.map(([s, t], k) => h('button.stepper__b', {
          type: 'button', class: k < idx ? 'is-past' : k === idx ? 'is-on' : '', 'aria-pressed': String(k === idx),
          onclick: async () => { if (s === o.status) return; if (await patch(o, { status: s })) { toast(`${o.name} moved to ${t}`, 'success'); draw(); onChange(); } },
        }, s === 'archived' ? 'Archive' : t)))),
      sect('Private notes', h('div.field', h('label.sr-only', { for: 'odr-notes' }, 'Private notes'), notes, saved)),
      h('div.odr__danger', h('button.btn.btn--sm.btn--danger-ghost', { type: 'button', onclick: async () => {
        if (!(await confirmDialog({ title: 'Delete this order?', message: `The request from ${o.name} and any payment screenshots are removed for good.`, confirm: 'Delete', danger: true }))) return;
        try { await api(`/orders/${encodeURIComponent(o.id)}`, { method: 'DELETE' }); toast('Order deleted', 'success'); onDeleted(); d.close(); } catch (err) { toast(err.message, 'error'); }
      } }, icon('trash', 15), 'Delete order')));
  };
  draw();
  const d = openDialog({ title: `${o.ref || 'Order'} · ${o.name}`, body, cls: 'dialog--drawer', onClose });
  return { ...d, redraw: draw };
}

function orders(ctx) {
  let list = [];
  let methods = [];
  let q = '';
  const fromUrl = ctx.params.get('f') || LEGACY_PAY[ctx.params.get('pay')] || 'all';
  let f = ORDER_FILTERS.some(([v]) => v === fromUrl) ? fromUrl : 'all';
  let drawer = null; // { key, d, pushed }
  const bar = ftabs(ORDER_FILTERS, f, (v) => { f = v; setUrl(v === 'all' ? '#/orders' : `#/orders?f=${v}`); draw(); }, 'Show');
  const search = searchBox('Search name, phone, order no., email', debounce((v) => { q = v.trim().toLowerCase(); draw(); }, 120));
  const body = h('div.tablebox', rowsSkel(5));
  const patch = async (o, b) => {
    try {
      const out = await api(`/orders/${encodeURIComponent(o.id)}`, { method: 'PATCH', body: b });
      Object.assign(o, out.order || b);
      return true;
    } catch (err) { toast(err.message, 'error'); return false; }
  };

  function openOrder(key, pushed) {
    const o = list.find((x) => orderKey(x) === key);
    if (!o) { if (list.length) { toast('That order is not here any more.', 'error'); setUrl('#/orders'); } return; }
    if (drawer?.key === key) return;
    drawer?.d.close();
    const me = { key, pushed, d: null, byRoute: false };
    me.d = orderDrawer(ctx, o, {
      patch, methods,
      onChange: () => draw(),
      onDeleted: () => { list = list.filter((x) => x !== o); draw(); },
      onClose: () => {
        if (drawer === me) drawer = null;
        if (me.byRoute) return; // Back already left #/orders/<ref>
        if (current().startsWith(`#/orders/${key}`)) {
          if (me.pushed) history.back();
          else setUrl('#/orders');
        }
      },
    });
    drawer = me;
  }
  // the address bar: #/orders/<ref> opens that order, #/orders closes the drawer (the Back button)
  ctx.onRoute?.((sub) => {
    if (sub) { openOrder(sub, drawer?.pushed ?? true); return; }
    if (drawer) { drawer.byRoute = true; drawer.d.close(); }
  });

  const row = (o) => {
    const proofs = o.pay?.proofs?.length || 0;
    const go = () => navigate(`#/orders/${orderKey(o)}`);
    return h('tr.orow', { tabindex: 0, 'aria-label': `${o.ref || 'Order'} from ${o.name}: open`, onclick: go, onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } } },
      h('td.ocell--ref', h('span.tnum', o.ref || '—')),
      h('td.ocell--who', h('b', o.name), o.kind === 'custom' ? h('span.tag.tag--accent', 'Custom') : null),
      h('td.ocell--plan', o.plan ? h('span', o.planName || o.plan, o.amount?.npr != null ? h('small.tnum', ` · ${npr(o.amount.npr)}`) : null) : h('span.ocell__none', '—')),
      h('td.ocell--design', o.theme ? themeOf(ctx, o.theme)?.name || o.theme : h('span.ocell__none', '—')),
      h('td.ocell--pay', h('span.ocell__pay', shortPay(o), proofs ? h('span.ocell__proof', { title: `${plural(proofs, 'payment screenshot')}` }, icon('image', 14)) : null)),
      h('td.ocell--stage', stageOf(o)),
      h('td.ocell--when', h('time', { datetime: o.at, title: whenText(o.at) }, fmtRelative(o.at))));
  };

  function draw() {
    const counts = Object.fromEntries(ORDER_FILTERS.map(([v]) => [v, list.filter((o) => orderMatches(o, v)).length]));
    const fresh = list.filter((o) => o.status === 'new' || payState(o) === 'proof_submitted').length;
    ctx.shell.setBadge('orders', fresh ? String(fresh) : '');
    bar.draw(f, counts);
    for (const b of bar.el.children) b.classList.toggle('has-accent', (b.textContent.startsWith('Payment to check') && counts.check > 0) || (b.textContent.startsWith('New') && counts.new > 0));
    const rows = list.filter((o) => orderMatches(o, f) && (!q || `${o.name} ${o.phone} ${o.ref || ''} ${o.email || ''}`.toLowerCase().includes(q)));
    const empty = {
      all: ['No orders yet', 'Orders and custom design requests from the website arrive here.'], new: ['No new orders', 'New orders wait here until you call them back.'],
      check: ['No payments to check', 'When a customer uploads a payment screenshot, it shows up here.'], waiting: ['Nobody is waiting to pay', ''],
      paid: ['No paid orders yet', ''], done: ['Nothing done yet', ''], archived: ['Nothing archived', ''],
    };
    fill(body, rows.length ? h('table.otable',
      h('caption.sr-only', 'Orders and requests'),
      h('thead', h('tr', ['Order no.', 'Customer', 'Plan', 'Design', 'Payment', 'Stage', 'Received'].map((t, k) => h('th', { scope: 'col', class: ['ocell--ref', 'ocell--who', 'ocell--plan', 'ocell--design', 'ocell--pay', 'ocell--stage', 'ocell--when'][k] }, t)))),
      h('tbody', rows.map(row)))
      : q ? quietEmpty('search', 'No orders match', 'Try a name, a phone number or an order number.') : quietEmpty('inbox', ...empty[f]));
  }
  loadSite().then((site) => { methods = site.paymentMethods || []; }).catch(() => {});
  api('/orders').then((r) => {
    list = ordersOf(r);
    draw();
    if (ctx.sub) openOrder(ctx.sub, false); // opened from a link: closing goes to #/orders, not Back
  }).catch((err) => fill(body, quietEmpty('inbox', err.status === 404 ? 'Orders are not available yet' : 'Could not load orders', err.status === 404 ? 'They will appear here once the server supports them.' : err.message)));
  ctx.cleanup?.(() => { if (drawer) { drawer.byRoute = true; drawer.d.close(); } });
  return [h('div.toolbar2.otools', bar.el, h('div.toolbar2__end', search)), body];
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
    setUrl(sel.value ? `#/replies?i=${encodeURIComponent(sel.value)}` : '#/replies');
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
  plans: [],
  paymentMethods: [],
  payRemark: 'Nimtto {ref}',
  contact: { phone: '', whatsapp: '', email: '', address: '' },
  hero: { title: '', subtitle: '' },
  hiddenThemes: [],
  featuredThemes: [],
  themeTiers: {},
});
// Design tiers (docs/API.md "Design tiers"): the cheapest plan that includes a design.
const TIER_OPTS = [['saral', 'Saral'], ['shubha', 'Shubha'], ['shahi', 'Shahi']];
const TIER_LABEL = Object.fromEntries(TIER_OPTS);
// The full settings (admin): every payment method, with what its QR supports (qrInfo).
async function loadSite() {
  try { return { ...DEFAULT_SITE(), ...(await api('/admin/site')) }; } catch (err) { if (err.status === 404) return { ...DEFAULT_SITE(), missing: true }; throw err; }
}
const putSite = (site) => { const { missing, ...body } = site; return api('/site', { method: 'PUT', body }); };

/** A settings row: what it is on the left, the controls on the right. */
const setting = (title, help, ...children) => h('section.setrow',
  h('header.setrow__aside', h('h2.setrow__title', title), help ? h('p.setrow__help', help) : null),
  h('div.setrow__body', ...children));

function themesAdmin(ctx) {
  const root = h('div', rowsSkel(4));
  const status = h('span.savechip', { 'data-state': 'saved', role: 'status', 'aria-live': 'polite' }, h('span.savechip__dot', { 'aria-hidden': 'true' }), h('span.savechip__t', 'Saved'));
  ctx.shell.setPage({ title: 'Themes', sub: 'Choose which designs the website shows, which are featured, and the cheapest plan that includes each.', actions: [status] });
  let f = 'all';
  loadSite().then((site) => {
    const setState = (s, t) => { status.dataset.state = s; status.lastChild.textContent = t; };
    const save = debounce(async () => {
      setState('saving', 'Saving…');
      try { const out = await putSite(site); Object.assign(site, out); setState('saved', 'Saved'); ctx.refreshMeta?.(); } catch (err) { setState('error', err.status === 404 ? 'Not available yet' : 'Not saved'); toast(err.message, 'error'); }
    }, 500);
    const list = ctx.meta.themes;
    const tabs = ftabs([['all', 'All'], ['shown', 'On the website'], ['hidden', 'Hidden'], ['featured', 'Featured'], ...TIER_OPTS], f, (v) => { f = v; draw(); }, 'Show');
    site.themeTiers = site.themeTiers || {};
    const tierOf = (t) => site.themeTiers[t.slug] || t.tier || 'shubha';
    const grid = h('ul.tgrid.tgrid--admin');
    const note = h('p.toolbar2__note');
    const draw = () => {
      const hidden = new Set(site.hiddenThemes || []);
      const feat = new Set(site.featuredThemes || []);
      note.textContent = `${list.length - hidden.size} of ${list.length} on the website${feat.size ? ` · ${feat.size} featured` : ''}`;
      const tiers = { saral: 0, shubha: 0, shahi: 0 };
      list.forEach((t) => { tiers[tierOf(t)] += 1; });
      tabs.draw(f, { all: list.length, shown: list.length - hidden.size, hidden: hidden.size, featured: feat.size, ...tiers });
      const rows = list.filter((t) => f === 'all' || (f === 'shown' && !hidden.has(t.slug)) || (f === 'hidden' && hidden.has(t.slug)) || (f === 'featured' && feat.has(t.slug)) || f === tierOf(t));
      fill(grid, rows.length ? rows.map((t) => h('li.tadmin', { class: hidden.has(t.slug) ? 'is-hidden' : '' },
        h('a.tcard', { href: `/${t.slug}/`, target: '_blank', rel: 'noopener', 'aria-label': `${t.name}: open the demo in a new tab` },
          h('span.tcard__img', t.thumb ? h('img', { src: t.thumb, alt: '', loading: 'lazy' }) : h('span.thumb-ph', t.name),
            feat.has(t.slug) ? h('span.tcard__on', icon('star', 12), 'Featured') : null,
            h('span.tcard__view', icon('external', 13), 'Demo'),
            t.ready === false ? h('span.tcard__soon', 'Not ready') : null),
          h('span.tcard__name', t.name, h('span.tier', { class: `tier--${tierOf(t)}` }, TIER_LABEL[tierOf(t)])), t.concept ? h('span.tcard__concept', t.concept) : null),
        h('div.tadmin__toggles',
          h('label.tadmin__tier', h('span', 'Plan from'),
            h('select.input.input--sm', { 'aria-label': `Cheapest plan that includes ${t.name}`, onchange: (e) => { site.themeTiers = { ...site.themeTiers, [t.slug]: e.target.value }; t.tier = e.target.value; draw(); save(); } },
              TIER_OPTS.map(([v, l]) => h('option', { value: v, selected: tierOf(t) === v }, l)))),
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
    ctx.shell.setPage({ title: 'Website', sub: 'Pricing, payment methods, contact details and the headline on the public website.', actions: [h('a.btn', { href: '/', target: '_blank', rel: 'noopener' }, icon('external', 15), 'View site'), saveBtn] });
    const validate = () => {
      const ids = new Set();
      for (const p of site.plans) {
        if (!p.name.trim()) return 'Every plan needs a name.';
        if (p.price != null && (!Number.isInteger(p.price) || p.price < 0)) return `The price of ${p.name} must be a whole number.`;
        if (p.priceUsd != null && !(Number.isFinite(p.priceUsd) && p.priceUsd >= 1 && p.priceUsd <= 10000)) return `The USD price of ${p.name} must be between 1 and 10000, or empty.`;
        p.id = p.id || slugify(p.name) || `plan-${ids.size + 1}`;
        while (ids.has(p.id)) p.id = `${p.id}-2`;
        ids.add(p.id);
      }
      const mids = new Set();
      for (const m of site.paymentMethods) {
        if (!m.label.trim()) return 'Every payment method needs a name.';
        m.id = m.id || slugify(m.label).slice(0, 32) || `method-${mids.size + 1}`;
        while (mids.has(m.id)) m.id = `${m.id.slice(0, 30)}-2`;
        mids.add(m.id);
      }
      if (!/\{ref\}/.test(site.payRemark || '')) return 'The payment remark must contain {ref}.';
      if (!/^[\x20-\x7E]*$/.test(site.payRemark || '')) return 'The payment remark can only use plain letters, digits and punctuation.';
      return null;
    };
    const fieldIn = (id, labelText, value, set, opts = {}) => {
      const el = h(opts.multiline ? 'textarea.input' : 'input.input', { id, value: value ?? '', maxlength: opts.max, rows: opts.rows, type: opts.type || (opts.multiline ? undefined : 'text'), inputmode: opts.inputmode, placeholder: opts.placeholder, oninput: (e) => { set(e.target.value); touch(); } });
      return h('div.field', { class: opts.cls }, h('label.label', { for: id }, labelText), el, opts.hint ? h('p.hint', opts.hint) : null);
    };
    const planCard = (p, i) => {
      const price = h('input.input', { id: `pl-price-${i}`, inputmode: 'numeric', value: p.price ?? '', placeholder: 'Ask for price', oninput: (e) => { const v = e.target.value.replace(/[^\d]/g, ''); e.target.value = v; p.price = v === '' ? null : Number(v); touch(); } });
      const usd = h('input.input', { id: `pl-usd-${i}`, inputmode: 'decimal', value: p.priceUsd ?? '', placeholder: 'No USD price', oninput: (e) => {
        const v = e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').replace(/^(\d{0,5})\d*(\.\d{0,2})?.*$/, '$1$2');
        e.target.value = v;
        p.priceUsd = v === '' || v === '.' ? null : Number(v);
        touch();
      } });
      return h('article.plan', { class: p.highlight ? 'is-highlight' : '' },
        h('header.plan__head', h('span.plan__n', `Plan ${i + 1}`),
          h('span.plan__tools',
            iconBtn('up', `Move plan ${i + 1} up`, () => { if (i) { [site.plans[i - 1], site.plans[i]] = [site.plans[i], site.plans[i - 1]]; touch(); draw(); } }, i === 0 ? 'is-disabled' : ''),
            iconBtn('down', `Move plan ${i + 1} down`, () => { if (i < site.plans.length - 1) { [site.plans[i + 1], site.plans[i]] = [site.plans[i], site.plans[i + 1]]; touch(); draw(); } }, i === site.plans.length - 1 ? 'is-disabled' : ''),
            iconBtn('trash', `Remove plan ${i + 1}`, async () => { if (await confirmDialog({ title: `Remove ${p.name || 'this plan'}?`, message: 'It disappears from the website after you save.', confirm: 'Remove', danger: true })) { site.plans.splice(i, 1); touch(); draw(); } }))),
        fieldIn(`pl-name-${i}`, 'Name', p.name, (v) => { p.name = v; }, { max: 60 }),
        fieldIn(`pl-ne-${i}`, 'Name in Nepali', p.nameNe, (v) => { p.nameNe = v; }, { max: 40, placeholder: 'e.g. सरल', hint: 'Shown small beside the name on the website. Optional.' }),
        h('div.field', h('label.label', { for: `pl-price-${i}` }, 'Price (NPR)'), h('div.inputrow.inputrow--prefix', h('span.prefix', 'Rs'), price), h('p.hint', 'Empty shows “Ask for price”.')),
        h('div.field', h('label.label', { for: `pl-usd-${i}` }, 'Price (USD)'), h('div.inputrow.inputrow--prefix', h('span.prefix', '$'), usd), h('p.hint', 'For customers abroad (PayPal). Empty: no USD price.')),
        fieldIn(`pl-note-${i}`, 'Short note', p.note, (v) => { p.note = v; }, { max: 160, placeholder: 'e.g. Most couples choose this' }),
        fieldIn(`pl-feat-${i}`, 'Included (one per line)', (p.features || []).join('\n'), (v) => { p.features = v.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 20); }, { multiline: true, rows: 4 }),
        toggle({ label: 'Show as “from”', hint: 'For a price that can grow, like Custom.', checked: p.from === true, onChange: (v) => { p.from = v; touch(); } }),
        toggle({ label: 'Recommended', hint: 'Highlighted on the website.', checked: p.highlight, onChange: (v) => { site.plans.forEach((x) => { x.highlight = false; }); p.highlight = v; touch(); draw(); } }));
    };
    // ── Payment methods: QR codes shown on the website and on each customer's pay page ──
    const KINDS = [['khalti', 'Khalti'], ['esewa', 'eSewa'], ['bank', 'Bank (Fonepay / NepalPay)'], ['paypal', 'PayPal'], ['other', 'Other']];
    const infoOf = (m) => {
      if (m.kind === 'paypal' && m.paypalMe) return { format: 'paypalme', label: 'PayPal.me link', decoded: true, canAuto: true, autoDefault: true };
      return m.qrInfo || { format: m.qr ? 'unknown' : 'none', label: m.qr ? 'Saved' : 'No QR yet', decoded: false, canAuto: false, autoDefault: false };
    };
    const autoLine = (m) => {
      const info = infoOf(m);
      const on = m.autoAmount === true && info.canAuto;
      const status = on ? st('ok', 'Amount fills in automatically', 'The QR on each order has the amount and the remark inside')
        : st('muted', 'Customer types the amount', 'The pay page shows the amount and the remark to type');
      if (!info.canAuto) {
        return h('div.pm__auto', status, h('p.hint', info.decoded ? `${info.label}: this kind of code cannot carry an amount.` : m.qr ? 'Could not read this code, so it is shown as uploaded.' : 'Upload the QR code first.'));
      }
      const label = info.autoDefault ? 'Fill in the amount' : 'Try auto-amount';
      const hint = info.autoDefault ? `${info.label}: a standard format that carries the amount and remark.` : `${info.label}: not a published format. Turn on only after a test scan with the app shows the amount filled in (docs/PAYMENTS.md).`;
      return h('div.pm__auto', status, toggle({ label, hint, checked: m.autoAmount === true, onChange: (v) => { m.autoAmount = v; touch(); draw(); } }));
    };
    const qrPicker = (m, i) => {
      const input = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp', hidden: true, onchange: async (e) => {
        const f = e.target.files?.[0];
        e.target.value = '';
        if (!f) return;
        if (f.size > 8 * 1024 * 1024) { toast('That image is larger than 8 MB.', 'error'); return; }
        btn.disabled = true;
        btn.classList.add('is-busy');
        try {
          const fd = new FormData();
          fd.append('file', f);
          const out = await postForm('/admin/pay/qr', fd);
          m.qr = out.qr;
          m.qrInfo = out.qrInfo;
          m.autoAmount = out.qrInfo.canAuto && out.qrInfo.autoDefault;
          touch(); draw();
          toast(out.decoded ? (out.cropped ? 'QR code read and cropped. Save to use it.' : 'QR code read. Save to use it.') : 'Saved the image, but no QR code could be read in it.', out.decoded ? 'success' : 'error');
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; btn.classList.remove('is-busy'); }
      } });
      const btn = h('button.pm__qr', { type: 'button', onclick: () => input.click(), 'aria-label': `${m.qr ? 'Replace' : 'Upload'} the QR code for ${m.label || `method ${i + 1}`}` },
        m.qr ? h('img', { src: m.qr, alt: '', loading: 'lazy', decoding: 'async' }) : h('span.pm__qr-empty', icon('upload', 18)),
        h('span.pm__qr-act', m.qr ? 'Replace QR' : 'Upload QR'));
      return [btn, input];
    };
    const methodRow = (m, i) => {
      const n = site.paymentMethods.length;
      const move = (d) => { const j = i + d; if (j < 0 || j >= n) return; [site.paymentMethods[i], site.paymentMethods[j]] = [site.paymentMethods[j], site.paymentMethods[i]]; site.paymentMethods.forEach((x, k) => { x.order = k; }); touch(); draw(); };
      const sel = (id, label, value, opts, set) => h('div.field', h('label.label', { for: id }, label),
        h('select.input', { id, onchange: (e) => { set(e.target.value); touch(); draw(); } }, opts.map(([v, t]) => h('option', { value: v, selected: v === value }, t))));
      return h('li.pm', { class: m.enabled === false ? 'is-off' : '' },
        h('div.pm__qrcol', qrPicker(m, i)),
        h('div.pm__main',
          h('div.pm__grid',
            fieldIn(`pm-label-${i}`, 'Name', m.label, (v) => { m.label = v; }, { max: 40, placeholder: 'e.g. Khalti' }),
            sel(`pm-kind-${i}`, 'Type', m.kind, KINDS, (v) => { m.kind = v; if (v === 'paypal') m.currency = 'USD'; }),
            sel(`pm-cur-${i}`, 'Currency', m.currency, [['NPR', 'NPR (rupees)'], ['USD', 'USD (dollars)']], (v) => { m.currency = v; })),
          h('div.pair',
            fieldIn(`pm-acc-${i}`, 'Account name', m.accountName, (v) => { m.accountName = v; }, { max: 80, placeholder: 'Shown under the QR' }),
            fieldIn(`pm-hint-${i}`, 'Number (optional)', m.accountHint, (v) => { m.accountHint = v; }, { max: 60, placeholder: 'Wallet id, phone or account no.', hint: 'Shown only if you fill it in.' })),
          fieldIn(`pm-note-${i}`, 'Note (optional)', m.note, (v) => { m.note = v; }, { max: 160, placeholder: 'e.g. For payments from abroad' }),
          m.kind === 'paypal' ? fieldIn(`pm-ppme-${i}`, 'PayPal.me name (optional)', m.paypalMe, (v) => { m.paypalMe = v.trim(); }, { max: 40, placeholder: 'yourname', hint: 'With it, each order’s PayPal code opens paypal.me/yourname/99USD with the amount filled in.' }) : null,
          autoLine(m)),
        h('div.pm__tools',
          toggle({ label: 'On', checked: m.enabled !== false, onChange: (v) => { m.enabled = v; touch(); draw(); } }),
          h('span.pm__move',
            iconBtn('up', `Move ${m.label || 'this method'} up`, () => move(-1), i === 0 ? 'is-disabled' : ''),
            iconBtn('down', `Move ${m.label || 'this method'} down`, () => move(1), i === n - 1 ? 'is-disabled' : ''),
            iconBtn('trash', `Remove ${m.label || 'this method'}`, async () => { if (await confirmDialog({ title: `Remove ${m.label || 'this payment method'}?`, message: 'Customers stop seeing it after you save. Orders already paid keep their record.', confirm: 'Remove', danger: true })) { site.paymentMethods.splice(i, 1); site.paymentMethods.forEach((x, k) => { x.order = k; }); touch(); draw(); } }))));
    };

    const draw = () => {
      fill(root,
        site.missing ? h('div.banner', icon('info', 16), h('span', 'The website settings are not available on the server yet. You can prepare them; saving will work once it is.')) : null,
        setting('Pricing plans', 'Shown on the public website in this order. Leave a price empty to show “Ask for price”.',
          h('div.plans', site.plans.map(planCard)),
          site.plans.length < 8 ? h('button.btn.btn--add', { type: 'button', onclick: () => { site.plans.push({ id: '', name: '', price: null, priceUsd: null, from: false, currency: 'NPR', note: '', features: [], highlight: false }); touch(); draw(); root.querySelectorAll('.plan').item(site.plans.length - 1)?.querySelector('input')?.focus(); } }, icon('plus', 16), 'Add a plan') : null),
        setting('Payment methods', 'QR codes customers scan after ordering, in this order. Each order’s code has the amount and remark inside where the app allows it; otherwise the pay page tells them what to type.',
          h('ul.pms', site.paymentMethods.map(methodRow)),
          site.paymentMethods.length < 12 ? h('button.btn.btn--add', { type: 'button', onclick: () => { site.paymentMethods.push({ id: '', label: '', kind: 'other', currency: 'NPR', accountName: '', accountHint: '', qr: '', note: '', enabled: true, order: site.paymentMethods.length, autoAmount: false, paypalMe: '' }); touch(); draw(); root.querySelectorAll('.pm').item(site.paymentMethods.length - 1)?.querySelector('input[id^="pm-label-"]')?.focus(); } }, icon('plus', 16), 'Add a payment method') : null,
          fieldIn('pay-remark', 'Payment remark', site.payRemark, (v) => { site.payRemark = v; }, { max: 40, cls: 'field--narrow', hint: 'Put in each QR as the remark where the app allows, or shown for the customer to type, so you can match the payment to the order. Use {ref} (required), {plan}, {name}. Plain letters only; at most 25 characters once filled in.' })),
        setting('Contact details', 'In the website footer and contact section. Customers message this WhatsApp number after ordering.',
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

/** Settings → Payments: is PayPal on, sandbox or live. Keys live only in the server environment; never shown. */
function paymentsCard() {
  const body = h('div', rowsSkel(3));
  api('/pay/status').then(({ paypal: p }) => {
    const yes = (ok, text = ok ? 'Set' : 'Missing') => st(ok ? 'ok' : 'muted', text);
    const live = p.env === 'live';
    fill(body,
      h('p', p.enabled
        ? st(live ? 'ok' : 'warn', live ? 'PayPal on · Live (real money)' : 'PayPal on · Sandbox (test money)')
        : st('muted', 'PayPal off: not configured')),
      h('dl.kv.kv--rows',
        h('div', h('dt', 'Mode'), h('dd', live ? 'Live' : 'Sandbox')),
        h('div', h('dt', 'Client ID'), h('dd', p.clientId ? h('span.tnum', p.clientId) : yes(false))),
        h('div', h('dt', 'Secret'), h('dd', yes(p.secretSet))),
        h('div', h('dt', 'Webhook ID'), h('dd', yes(p.webhookIdSet))),
        h('div', h('dt', 'Webhook URL'), h('dd', h('span.tnum', p.webhookUrl), ' ', h('button.link', { type: 'button', onclick: () => copyText(p.webhookUrl, 'Webhook URL copied') }, 'Copy'))),
        h('div', h('dt', 'Dashboard'), h('dd', h('a', { href: p.dashboard, target: '_blank', rel: 'noopener noreferrer', title: 'Opens PayPal in a new tab' }, live ? 'PayPal activity' : 'Sandbox activity')))),
      p.problems?.length && !p.enabled ? h('div.banner.banner--warn', icon('info', 16), h('span', p.problems.join('. '), '.')) : null,
      h('p.hint', icon('info', 14), 'The PayPal keys are set in the server environment (Coolify), never here. When it is on, customers abroad can also pay by card with PayPal Checkout, and the order is confirmed by itself. Steps: docs/PAYMENTS.md.'));
  }).catch((err) => fill(body, quietEmpty('alert', err.status === 404 ? 'Payments are not available on this server yet' : 'Could not load the payment status', err.status === 404 ? '' : err.message)));
  return setting('Payments', 'Customers pay by scanning a QR code (Website → Payment methods) and upload a screenshot that you confirm in Orders. Optional extra: PayPal Checkout in US dollars, off until the server has its keys.',
    h('p', h('a.btn.btn--sm', { href: '#/website' }, 'Payment methods and prices'), ' ', h('a.btn.btn--sm.btn--quiet', { href: '#/orders?pay=check' }, 'Payments to check')), body);
}

function settings(ctx) {
  return [
    paymentsCard(),
    setting('Your account', 'The owner account has full access to every invitation, client link and order.',
      h('dl.kv.kv--rows', h('div', h('dt', 'Signed in as'), h('dd', ctx.me.email || 'Owner')), h('div', h('dt', 'Role'), h('dd', 'Owner, full access'))),
      h('p.hint', icon('info', 14), 'To change the owner email or password, update the server settings (.env) and restart.')),
    setting('Clear cache', 'Seeing an old version of a page, a photo or a design? This clears what this browser stored for Nimtto and reloads. You stay signed in.',
      h('p', h('button.btn.btn--sm', { type: 'button', onclick: () => clearCache() }, icon('refresh', 15), 'Clear cache'))),
    setting('Quick help', 'Where things live.',
      h('dl.kv.kv--rows',
        h('div', h('dt', 'New couple'), h('dd', 'Invitations → New invitation with the customer’s email (or Create invitation on their order): it appears in their dashboard, no extra password. A separate link with a password is optional, for couples without an account.')),
        h('div', h('dt', 'Lost link'), h('dd', 'Make a new one; the old link stops working at once.')),
        h('div', h('dt', 'Prices, contact'), h('dd', h('a', { href: '#/website' }, 'Website'), '. Designs on the website: ', h('a', { href: '#/themes' }, 'Themes'), '.')),
        h('div', h('dt', 'Credits'), h('dd', 'Photo and music credits are on ', h('a', { href: '/credits/', target: '_blank', rel: 'noopener' }, 'the credits page'), '.')))),
  ];
}

export const ADMIN_MODULES = [
  { id: 'overview', title: 'Overview', icon: 'grid', group: 'main', render: overview, sub: ' ', actions: (ctx) => [newBtn(ctx)] },
  { id: 'invitations', title: 'Invitations', icon: 'cards', group: 'main', render: invitations, sub: 'Every invitation: its status, replies and the couple’s access.', actions: (ctx) => [newBtn(ctx)] },
  { id: 'customers', title: 'Customers', icon: 'users', group: 'main', render: (ctx) => customersSection(ctx, listInvitations), sub: 'Everyone with an account: their details, sign-ins, orders and invitations. Open one to see it all.' },
  { id: 'access', title: 'Clients & access', short: 'Access', icon: 'key', group: 'main', render: access, sub: 'Customer accounts first: invitations you make for their email appear in their dashboard. A separate link with a password is optional.' },
  { id: 'replies', title: 'Replies', icon: 'chat', group: 'main', render: replies, sub: 'Guest replies across all invitations, or one at a time.' },
  { id: 'orders', title: 'Orders & requests', short: 'Orders', icon: 'inbox', group: 'business', render: orders, sub: 'From the website order form. Check each payment screenshot, then move the order along.' },
  { id: 'themes', title: 'Themes', icon: 'palette', group: 'business', render: themesAdmin, sub: 'Choose which designs the website shows, and which are featured.' },
  { id: 'music', title: 'Music library', short: 'Music', icon: 'music', group: 'business', render: musicLibrary, sub: 'Songs couples can choose for their invitation: upload MP3s, set moods and order, turn songs on or off.' },
  { id: 'website', title: 'Website', icon: 'globe', group: 'business', render: website, sub: 'Pricing, payment methods, contact details and the headline on the public website.' },
  { id: 'settings', title: 'Settings & help', short: 'Settings', icon: 'settings', group: 'business', render: settings, sub: 'Your account and where things live.' },
];
