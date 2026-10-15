// The owner's dashboard modules.
import { h, icon, iconBtn, clear, toast, openDialog, confirmDialog, fmtDate, fmtRelative, copyText, card, skeleton, emptyState, toggle, debounce, fill } from './dom.js';
import { api } from './api.js';
import { photoUrl } from '../photos.js';
import { deleteDialog, actionMenu } from './manage.js';
import { accessPanel, accessSummary, permsText } from './admin-access.js';
import { repliesView, stat, when } from './m-replies.js';
import { shareUrl } from './m-send.js';
import { coupleName } from './session.js';

const label = (v, f = '') => (v && (v.en || v.ne)) || f;
const nameOf = (i) => coupleName(i.bride, i.groom);
const statusPill = (i) => (i.status === 'published'
  ? h('span.pill', { class: i.changed ? 'pill--warn' : 'pill--ok' }, i.changed ? 'Live · changes' : 'Live')
  : h('span.pill.pill--muted', 'Draft'));
const thumb = (i) => h('span.ithumb', i.hero ? h('img', { src: photoUrl(i.hero, 'sm'), alt: '', loading: 'lazy', decoding: 'async' }) : icon('heart', 16));
const ordersOf = (r) => (Array.isArray(r) ? r : r?.orders || []);
const listInvitations = () => api('/invitations').then((r) => r.invitations || []);

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

// ── Overview ──────────────────────────────────────────────────────────────

function overview(ctx) {
  const stats = h('dl.stats.stats--6', Array.from({ length: 6 }, () => h('div.stat.is-loading', h('dt.stat__k', h('span.skel__line')), h('dd.stat__v', h('span.skel__line')))));
  const replies = h('div', skeleton(4));
  const orders = h('div', skeleton(3));
  const recent = h('div', skeleton(4));

  const invP = listInvitations().catch(() => []);
  api('/admin/stats').catch(async () => {
    const list = await invP;
    return { invitations: list.length, published: list.filter((i) => i.status === 'published').length, drafts: list.filter((i) => i.status !== 'published').length, rsvps: list.reduce((a, i) => a + (i.rsvpCount || 0), 0), attending: null, newOrders: null };
  }).then((s) => {
    fill(stats, 
      stat('Invitations', s.invitations, null, 'stat--accent'),
      stat('Live', s.published),
      stat('Drafts', s.drafts),
      stat('Replies', s.rsvps),
      stat('Guests coming', s.attending ?? '—'),
      stat('New orders', s.newOrders ?? '—'));
  });

  invP.then(async (list) => {
    const rec = list.slice(0, 6);
    fill(recent, rec.length ? h('ul.ilist', rec.map((i) => h('li', h('a.irow', { href: `#/i/${i.slug}/home` },
      thumb(i),
      h('span.irow__main', h('b', nameOf(i)), h('small', i.lastEdit?.by === 'couple' ? `Edited by the couple · ${fmtRelative(i.lastEdit.at)}` : `Updated ${fmtRelative(i.updatedAt)}`)),
      i.unseen ? h('span.dot', { title: 'New changes by the couple' }) : null,
      statusPill(i))))) : emptyState('cards', 'No invitations yet', 'Create the first one; it starts with sample details.', newBtn(ctx)));

    const withReplies = list.filter((i) => i.rsvpCount > 0).slice(0, 8);
    const all = (await Promise.all(withReplies.map((i) => api(`/invitations/${i.slug}/rsvps`).then((r) => (r.replies || []).map((x) => ({ ...x, inv: i }))).catch(() => [])))).flat();
    all.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    fill(replies, all.length ? h('ul.feed', all.slice(0, 7).map((r) => h('li.feed__item',
      h('span.ritem__avatar', { class: r.attending === 'yes' ? 'is-yes' : '' }, r.name.slice(0, 1).toUpperCase()),
      h('span.feed__main', h('b', r.name), h('small', `${r.attending === 'yes' ? `Coming · ${r.guests}` : 'Can’t come'} · ${nameOf(r.inv)}`)),
      h('time.feed__when', when(r.at)))))
      : emptyState('chat', 'No replies yet', 'Replies from every invitation show up here.'));
  });

  Promise.all([api('/orders'), loadSite().catch(() => ({ plans: [] }))]).then(([r, site]) => {
    const planName = (id) => site.plans?.find((p) => p.id === id)?.name || id;
    const fresh = ordersOf(r).filter((o) => o.status === 'new').slice(0, 5);
    fill(orders, fresh.length ? h('ul.feed', fresh.map((o) => h('li.feed__item',
      h('span.feed__icon', icon(o.kind === 'custom' ? 'wand' : 'inbox', 16)),
      h('span.feed__main', h('b', o.name), h('small', `${o.kind === 'custom' ? 'Custom design' : 'Order'}${o.plan ? ` · ${planName(o.plan)}` : ''} · ${o.phone}`)),
      h('time.feed__when', fmtRelative(o.at)))))
      : emptyState('inbox', 'No new orders', 'Orders and custom requests from the website arrive here.'));
  }).catch(() => fill(orders, emptyState('inbox', 'Orders are not available yet', 'They will appear here once the website form is live.')));

  return [
    stats,
    h('div.dashgrid',
      card('Recent invitations', null, recent, h('a.link.card__more', { href: '#/invitations' }, 'All invitations', icon('right', 14))),
      card('Latest replies', null, replies, h('a.link.card__more', { href: '#/replies' }, 'All replies', icon('right', 14))),
      card('New orders', null, orders, h('a.link.card__more', { href: '#/orders' }, 'Orders & requests', icon('right', 14)))),
  ];
}

// ── Invitations ───────────────────────────────────────────────────────────

function invitations(ctx) {
  const root = h('div.stack', h('section.card', skeleton(6)));
  let items = [];
  let q = '';
  let f = 'all';
  const load = async () => {
    try { items = await listInvitations(); draw(); } catch (err) { fill(root, h('section.card', emptyState('alert', 'Could not load invitations', err.message))); }
  };
  const draw = () => {
    const themeName = Object.fromEntries(ctx.meta.themes.map((t) => [t.slug, t.name]));
    const rows = items.filter((i) => {
      if (f === 'draft' && i.status === 'published') return false;
      if (f === 'live' && i.status !== 'published') return false;
      if (f === 'changed' && !i.changed) return false;
      if (!q) return true;
      return `${nameOf(i)} ${i.slug} ${themeName[i.theme] || i.theme}`.toLowerCase().includes(q.toLowerCase());
    });
    const counts = { all: items.length, live: items.filter((i) => i.status === 'published').length, draft: items.filter((i) => i.status !== 'published').length, changed: items.filter((i) => i.changed).length };
    const search = h('input.input', { type: 'search', placeholder: 'Search names, link or design', 'aria-label': 'Search invitations', value: q, oninput: (e) => { q = e.target.value; const p = e.target.selectionStart; draw(); const s = root.querySelector('input[type=search]'); s.focus(); s.setSelectionRange(p, p); } });
    const table = h('table.table',
      h('thead', h('tr', ['Couple', 'Wedding', 'Design', 'Status', 'Replies', 'Client link', ''].map((c, k) => h('th', { scope: 'col', class: k === 4 ? 'num' : '' }, c)))),
      h('tbody', rows.map((i) => {
        const live = i.status === 'published';
        const names = nameOf(i);
        return h('tr',
          h('td', h('a.cell-main', { href: `#/i/${i.slug}/home` }, thumb(i), h('span', h('b', names), h('small', `/${i.slug}`)), i.unseen ? h('span.dot', { title: 'New changes by the couple' }) : null)),
          h('td', { 'data-label': 'Wedding' }, fmtDate(i.weddingDate)),
          h('td', { 'data-label': 'Design' }, themeName[i.theme] || i.theme),
          h('td', { 'data-label': 'Status' }, statusPill(i)),
          h('td.num', { 'data-label': 'Replies' }, String(i.rsvpCount || 0)),
          h('td', { 'data-label': 'Client link' }, accessSummary(i.clientLink)),
          h('td.cell-act', h('div.cell-act__in',
            h('a.btn.btn--sm', { href: `#/i/${i.slug}/home` }, 'Open'),
            actionMenu([
              { label: 'Open', icon: 'edit', href: `#/i/${i.slug}/home` },
              { label: live ? 'Open the live invitation' : 'Preview', icon: 'external', href: live ? shareUrl(ctx.meta, i.slug, i.theme) : `/${i.theme}/?id=${encodeURIComponent(i.slug)}`, newTab: true },
              { label: 'Copy the guest link', icon: 'copy', onSelect: () => copyText(shareUrl(ctx.meta, i.slug, i.theme)) },
              { label: 'Client access', icon: 'key', onSelect: () => accessDialog(ctx, i, draw) },
              { label: 'Replies', icon: 'chat', href: `#/i/${i.slug}/replies` },
              { label: 'Delete', icon: 'trash', danger: true, onSelect: async () => { if (await deleteDialog({ slug: i.slug, names })) load(); } },
            ], { label: `More for ${names}` }))));
      })));
    fill(root, h('section.card.card--flush',
      h('div.toolbar.toolbar--pad',
        h('div.seg', { role: 'group', 'aria-label': 'Filter' }, [['all', 'All'], ['live', 'Live'], ['draft', 'Drafts'], ['changed', 'Unpublished changes']].map(([v, t]) => h('button.seg__btn', { type: 'button', 'aria-pressed': String(f === v), onclick: () => { f = v; draw(); } }, t, h('span.seg__n', String(counts[v]))))),
        h('label.search', icon('search', 16), search)),
      !items.length ? emptyState('cards', 'No invitations yet', 'Create one; it starts with sample details you can change.', newBtn(ctx))
        : rows.length ? h('div.table-wrap', table) : h('p.muted.pad', 'No invitations match.')));
  };
  load();
  return root;
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
  const root = h('div.stack', h('section.card', skeleton(5)));
  let q = '';
  let items = [];
  const draw = () => {
    const rows = items.filter((i) => !q || `${nameOf(i)} ${i.slug}`.toLowerCase().includes(q.toLowerCase()));
    const search = h('input.input', { type: 'search', placeholder: 'Search couples', 'aria-label': 'Search couples', value: q, oninput: (e) => { q = e.target.value; const p = e.target.selectionStart; draw(); const s = root.querySelector('input[type=search]'); s.focus(); s.setSelectionRange(p, p); } });
    const noPw = items.filter((i) => i.clientLink && !i.clientLink.hasPassword).length;
    fill(root, 
      h('section.card.explain',
        h('span.explain__icon', icon('key', 20)),
        h('div', h('h2.card__title', 'How client access works'),
          h('p.card__help', 'Each couple gets a private link plus a password you choose. Send the link in one message and the password separately. Choose which designs they may pick and whether they can change colours. Making a new link stops the old one.'))),
      noPw ? h('p.notice.notice--warn', icon('alert', 16), h('span', `${noPw} older link${noPw === 1 ? '' : 's'} still open${noPw === 1 ? 's' : ''} without a password. Open ${noPw === 1 ? 'it' : 'them'} and set one.`)) : null,
      h('section.card.card--flush',
        h('div.toolbar.toolbar--pad', h('label.search', icon('search', 16), search)),
        rows.length ? h('ul.alist', rows.map((i) => h('li.arow',
          thumb(i),
          h('div.arow__main', h('b', nameOf(i)), h('small', permsText(i.clientLink))),
          h('div.arow__state', accessSummary(i.clientLink), i.clientLink ? h('small', `since ${fmtDate(i.clientLink.createdAt)}`) : null),
          h('button.btn.btn--sm', { type: 'button', class: i.clientLink ? '' : 'btn--primary', onclick: () => accessDialog(ctx, i, draw) }, i.clientLink ? 'Manage' : 'Create link'))))
          : emptyState('key', items.length ? 'No couples match' : 'No invitations yet', items.length ? '' : 'Create an invitation first, then give the couple access.')));
  };
  listInvitations().then((l) => { items = l; draw(); }).catch((err) => fill(root, h('section.card', emptyState('alert', 'Could not load', err.message))));
  return root;
}

// ── Orders & requests ─────────────────────────────────────────────────────

const STAGES = [['new', 'New'], ['contacted', 'Contacted'], ['done', 'Done'], ['archived', 'Archived']];
const digits = (p) => String(p || '').replace(/[^\d+]/g, '');
const waNumber = (p) => { let d = digits(p).replace(/^\+/, ''); if (/^9[78]\d{8}$/.test(d)) d = `977${d}`; return d; };

function orders(ctx) {
  const root = h('div.stack', h('section.card', skeleton(5)));
  let list = [];
  let tab = 'new';
  let planNames = {};
  const patch = async (o, body) => {
    try {
      const out = await api(`/orders/${encodeURIComponent(o.id)}`, { method: 'PATCH', body });
      Object.assign(o, out.order || body);
      return true;
    } catch (err) { toast(err.message, 'error'); return false; }
  };
  const orderCard = (o) => {
    const notes = h('textarea.input', { rows: 2, maxlength: 2000, placeholder: 'Notes (only you see these)', value: o.notes || '', 'aria-label': `Notes for ${o.name}` });
    const saved = h('span.hint', { 'aria-live': 'polite' });
    const saveNotes = debounce(async () => { if (notes.value === (o.notes || '')) return; saved.textContent = 'Saving…'; if (await patch(o, { notes: notes.value })) saved.textContent = 'Saved'; }, 800);
    notes.addEventListener('input', saveNotes);
    notes.addEventListener('blur', () => saveNotes());
    const idx = STAGES.findIndex(([s]) => s === o.status);
    const facts = [
      o.weddingDate ? ['Wedding', fmtDate(o.weddingDate)] : null,
      o.plan ? ['Plan', planNames[o.plan] || o.plan] : null,
      o.theme ? ['Design', ctx.meta.themes.find((t) => t.slug === o.theme)?.name || o.theme] : null,
      o.email ? ['Email', h('a', { href: `mailto:${o.email}` }, o.email)] : null,
      o.invitation ? ['Invitation', h('a', { href: `#/i/${o.invitation}/home` }, `/${o.invitation}`)] : null,
    ].filter(Boolean);
    return h('article.order',
      h('header.order__head',
        h('div', h('h3.order__name', o.name), h('p.order__meta', h('span.pill', { class: o.kind === 'custom' ? 'pill--accent' : 'pill--muted' }, o.kind === 'custom' ? 'Custom design' : 'Order'), h('span', `${fmtRelative(o.at)}`))),
        h('div.order__acts',
          h('a.btn.btn--sm', { href: `tel:${digits(o.phone)}` }, icon('call', 15), 'Call'),
          h('a.btn.btn--sm.btn--wa', { href: `https://wa.me/${waNumber(o.phone)}`, target: '_blank', rel: 'noopener' }, icon('chat', 15), 'WhatsApp'),
          iconBtn('trash', `Delete the order from ${o.name}`, async () => {
            if (!(await confirmDialog({ title: 'Delete this order?', message: `The request from ${o.name} is removed for good.`, confirm: 'Delete', danger: true }))) return;
            try { await api(`/orders/${encodeURIComponent(o.id)}`, { method: 'DELETE' }); list = list.filter((x) => x !== o); toast('Order deleted', 'success'); draw(); } catch (err) { toast(err.message, 'error'); }
          }))),
      h('p.order__phone', o.phone),
      o.message ? h('p.order__msg', o.message) : null,
      facts.length ? h('dl.facts', facts.map(([k, v]) => h('div', h('dt', k), h('dd', v)))) : null,
      h('div.order__notes', notes, saved),
      h('div.pipeline', { role: 'group', 'aria-label': 'Status' }, STAGES.map(([s, t], k) => h('button.pipeline__step', {
        type: 'button', class: k < idx ? 'is-past' : k === idx ? 'is-on' : '', 'aria-pressed': String(k === idx),
        onclick: async () => { if (s === o.status) return; if (await patch(o, { status: s })) { toast(`Moved to ${t}`, 'success'); draw(); } },
      }, h('span.pipeline__dot'), t))));
  };
  const draw = () => {
    const counts = Object.fromEntries(STAGES.map(([s]) => [s, list.filter((o) => o.status === s).length]));
    ctx.shell.setBadge('orders', counts.new ? String(counts.new) : '');
    const rows = list.filter((o) => o.status === tab);
    fill(root, 
      h('div.seg.seg--wide', { role: 'group', 'aria-label': 'Stage' }, STAGES.map(([s, t]) => h('button.seg__btn', { type: 'button', 'aria-pressed': String(tab === s), onclick: () => { tab = s; draw(); } }, t, h('span.seg__n', String(counts[s]))))),
      rows.length ? h('div.orders', rows.map(orderCard))
        : h('section.card', emptyState('inbox', tab === 'new' ? 'No new orders' : `Nothing in ${STAGES.find(([s]) => s === tab)[1].toLowerCase()}`, tab === 'new' ? 'Orders and custom design requests from the website and from couples arrive here.' : '')));
  };
  loadSite().then((site) => { planNames = Object.fromEntries((site.plans || []).map((p) => [p.id, p.name])); if (list.length) draw(); }).catch(() => {});
  api('/orders').then((r) => { list = ordersOf(r); draw(); }).catch((err) => fill(root, h('section.card', emptyState('inbox', err.status === 404 ? 'Orders are not available yet' : 'Could not load orders', err.status === 404 ? 'They will appear here once the server supports them.' : err.message))));
  return root;
}

// ── Replies (all invitations or one) ──────────────────────────────────────

function replies(ctx) {
  const root = h('div.stack');
  const body = h('div.stack', h('section.card', skeleton(5)));
  const sel = h('select.input', { id: 'rep-inv', 'aria-label': 'Invitation' }, h('option', { value: '' }, 'All invitations'));
  root.append(h('div.field.field--inline', h('label.label', { for: 'rep-inv' }, 'Show replies for'), sel), body);
  let items = [];
  const showAll = async () => {
    fill(body, h('section.card', skeleton(5)));
    const withR = items.filter((i) => i.rsvpCount > 0);
    const res = await Promise.all(withR.map((i) => api(`/invitations/${i.slug}/rsvps`).then((r) => ({ i, r })).catch(() => null)));
    const ok = res.filter(Boolean);
    if (!ok.length) { fill(body, h('section.card', emptyState('chat', 'No replies yet', 'Replies from every invitation show up here.'))); return; }
    const tot = ok.reduce((a, { r }) => ({ guests: a.guests + (r.totals.guests || 0), replies: a.replies + (r.totals.replies || 0), declined: a.declined + (r.totals.declined || 0) }), { guests: 0, replies: 0, declined: 0 });
    const all = ok.flatMap(({ i, r }) => (r.replies || []).map((x) => ({ ...x, inv: i }))).sort((a, b) => String(b.at).localeCompare(String(a.at)));
    fill(body, 
      h('dl.stats', stat('Guests coming', tot.guests, null, 'stat--accent'), stat('Replies', tot.replies), stat('Can’t come', tot.declined), stat('Invitations with replies', ok.length)),
      h('section.card', h('header.card__head', h('h2.card__title', 'By invitation')),
        h('ul.ilist', ok.map(({ i, r }) => h('li', h('button.irow', { type: 'button', onclick: () => { sel.value = i.slug; sel.dispatchEvent(new Event('change')); } },
          thumb(i), h('span.irow__main', h('b', nameOf(i)), h('small', `${r.totals.replies} replies · ${r.totals.guests} coming`)), icon('chevron', 16)))))),
      h('section.card', h('header.card__head', h('h2.card__title', 'Latest replies')),
        h('ul.rlist', all.slice(0, 40).map((x) => h('li.ritem',
          h('span.ritem__avatar', { class: x.attending === 'yes' ? 'is-yes' : '' }, x.name.slice(0, 1).toUpperCase()),
          h('div.ritem__main', h('p.ritem__head', h('b', x.name), h('span.pill', { class: x.attending === 'yes' ? 'pill--ok' : 'pill--muted' }, x.attending === 'yes' ? `Coming · ${x.guests}` : 'Can’t come')),
            h('p.ritem__meta', h('span', nameOf(x.inv)), h('span', when(x.at))), x.message ? h('p.ritem__msg', x.message) : null))))));
  };
  sel.addEventListener('change', () => { if (sel.value) fill(body, repliesView(sel.value)); else showAll(); });
  listInvitations().then((l) => {
    items = l;
    sel.append(...l.map((i) => h('option', { value: i.slug }, `${nameOf(i)} (${i.rsvpCount || 0})`)));
    const want = ctx.params.get('i');
    if (want && l.some((i) => i.slug === want)) { sel.value = want; sel.dispatchEvent(new Event('change')); } else showAll();
  }).catch((err) => fill(body, h('section.card', emptyState('alert', 'Could not load', err.message))));
  return root;
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

function themesAdmin(ctx) {
  const root = h('div.stack', h('section.card', skeleton(4)));
  const status = h('span.savechip', { 'data-state': 'saved', role: 'status', 'aria-live': 'polite' }, h('span.savechip__dot', { 'aria-hidden': 'true' }), h('span.savechip__t', 'Saved'));
  loadSite().then((site) => {
    const setState = (s, t) => { status.dataset.state = s; status.lastChild.textContent = t; };
    const save = debounce(async () => {
      setState('saving', 'Saving…');
      try { const out = await putSite(site); Object.assign(site, out); setState('saved', 'Saved'); } catch (err) { setState('error', err.status === 404 ? 'Not available yet' : 'Not saved'); toast(err.message, 'error'); }
    }, 500);
    const list = ctx.meta.themes;
    const draw = () => {
      const hidden = new Set(site.hiddenThemes || []);
      const feat = new Set(site.featuredThemes || []);
      fill(root, 
        h('div.toolbar', h('p.lede', `${list.length - hidden.size} of ${list.length} designs show on the website${feat.size ? `, ${feat.size} featured` : ''}.`), h('div.toolbar__right', status)),
        h('ul.tgrid.tgrid--lg', list.map((t) => h('li.tadmin', { class: hidden.has(t.slug) ? 'is-hidden' : '' },
          h('a.tcard', { href: `/${t.slug}/`, target: '_blank', rel: 'noopener', 'aria-label': `${t.name}: open the demo` },
            h('span.tcard__img', t.thumb ? h('img', { src: t.thumb, alt: '', loading: 'lazy' }) : h('span.thumb-ph', t.name),
              feat.has(t.slug) ? h('span.tcard__on', icon('star', 13), 'Featured') : h('span.tcard__view', icon('external', 14), 'Demo'),
              t.ready === false ? h('span.tcard__soon', 'Not ready') : null),
            h('span.tcard__name', t.name), t.concept ? h('span.tcard__concept', t.concept) : null),
          h('div.tadmin__toggles',
            toggle({ label: 'On the website', checked: !hidden.has(t.slug), onChange: (v) => {
              site.hiddenThemes = v ? site.hiddenThemes.filter((x) => x !== t.slug) : [...new Set([...site.hiddenThemes, t.slug])];
              if (!v) site.featuredThemes = site.featuredThemes.filter((x) => x !== t.slug); // a hidden design cannot be featured
              draw(); save();
            } }),
            (() => {
              const f = toggle({ label: 'Featured', hint: hidden.has(t.slug) ? 'Show it on the website first.' : null, checked: feat.has(t.slug), onChange: (v) => { site.featuredThemes = v ? [...new Set([...site.featuredThemes, t.slug])] : site.featuredThemes.filter((x) => x !== t.slug); draw(); save(); } });
              if (hidden.has(t.slug)) { f.querySelector('input').disabled = true; f.classList.add('is-disabled'); }
              return f;
            })())))));
    };
    draw();
  }).catch((err) => fill(root, h('section.card', emptyState('alert', 'Could not load the website settings', err.message))));
  return root;
}

function website(ctx) {
  const root = h('div.stack', h('section.card', skeleton(6)));
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
      h('span.savebar__t', icon('info', 16), 'You have unsaved changes. The website shows them after you save.'),
      h('div.row', h('button.btn', { type: 'button', onclick: async () => { Object.assign(site, await loadSite()); dirty = false; draw(); } }, 'Discard'),
        h('button.btn.btn--primary', { type: 'button', onclick: () => saveBtn.click() }, 'Save changes')));
    const touch = () => { dirty = true; saveBtn.disabled = false; bar.hidden = false; };
    const beforeUnload = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    ctx.cleanup(() => { window.removeEventListener('beforeunload', beforeUnload); if (dirty) toast('Your website changes were not saved.', 'error'); });
    ctx.shell.setPage({ title: 'Website', sub: 'Pricing and contact details on the public website.', actions: [saveBtn] });
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
        h('div.pair',
          fieldIn(`pl-name-${i}`, 'Name', p.name, (v) => { p.name = v; }, { max: 60 }),
          h('div.field', h('label.label', { for: `pl-price-${i}` }, 'Price (NPR)'), h('div.inputrow.inputrow--prefix', h('span.prefix', 'Rs'), price), h('p.hint', 'Leave empty to show “Ask for price”.'))),
        fieldIn(`pl-note-${i}`, 'Short note (optional)', p.note, (v) => { p.note = v; }, { max: 160, placeholder: 'e.g. Most couples choose this' }),
        fieldIn(`pl-feat-${i}`, 'What is included (one per line)', (p.features || []).join('\n'), (v) => { p.features = v.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 20); }, { multiline: true, rows: 4 }),
        toggle({ label: 'Highlight this plan', hint: 'Shown as the recommended one.', checked: p.highlight, onChange: (v) => { site.plans.forEach((x) => { x.highlight = false; }); p.highlight = v; touch(); draw(); } }));
    };
    const draw = () => {
      fill(root, 
        site.missing ? h('p.notice', icon('info', 16), h('span', 'The website settings are not available on the server yet. You can prepare them; saving will work once it is.')) : null,
        card('Pricing plans', 'Shown on the public website, in this order.',
          h('div.plans', site.plans.map(planCard)),
          site.plans.length < 8 ? h('button.btn.btn--add', { type: 'button', onclick: () => { site.plans.push({ id: '', name: '', price: null, currency: 'NPR', note: '', features: [], highlight: false }); touch(); draw(); root.querySelectorAll('.plan').item(site.plans.length - 1)?.querySelector('input')?.focus(); } }, icon('plus', 16), 'Add a plan') : null),
        card('Contact details', 'On the website footer and contact section.',
          h('div.pair',
            fieldIn('ct-phone', 'Phone', site.contact.phone, (v) => { site.contact.phone = v; }, { type: 'tel', inputmode: 'tel', max: 20, placeholder: '+977 98…' }),
            fieldIn('ct-wa', 'WhatsApp', site.contact.whatsapp, (v) => { site.contact.whatsapp = v; }, { type: 'tel', inputmode: 'tel', max: 20, placeholder: '+977 98…' })),
          h('div.pair',
            fieldIn('ct-email', 'Email', site.contact.email, (v) => { site.contact.email = v; }, { type: 'email', max: 254 }),
            fieldIn('ct-addr', 'Address', site.contact.address, (v) => { site.contact.address = v; }, { max: 300 }))),
        card('Website headline', 'Optional. Leave empty to keep the built-in words.',
          fieldIn('hero-title', 'Headline', site.hero?.title, (v) => { site.hero = { ...site.hero, title: v }; }, { max: 120 }),
          fieldIn('hero-sub', 'Line under it', site.hero?.subtitle, (v) => { site.hero = { ...site.hero, subtitle: v }; }, { max: 300, multiline: true, rows: 2 })),
        bar);
      saveBtn.disabled = !dirty;
      bar.hidden = !dirty;
    };
    draw();
  }).catch((err) => fill(root, h('section.card', emptyState('alert', 'Could not load the website settings', err.message))));
  return root;
}

// ── Settings & help ───────────────────────────────────────────────────────

function settings(ctx) {
  return [
    card('Your account', null,
      h('dl.facts', h('div', h('dt', 'Signed in as'), h('dd', ctx.me.email || 'Owner')), h('div', h('dt', 'Role'), h('dd', 'Owner (full access)'))),
      h('p.hint', 'To change the owner email or password, update the server settings (.env) and restart.')),
    card('Help', null,
      h('ul.helplist',
        h('li', h('b', 'New couple: '), 'Invitations → New invitation, then Clients & access → Create link. Send the link and, separately, the password.'),
        h('li', h('b', 'Lost link: '), 'make a new one; the old link stops working at once.'),
        h('li', h('b', 'Prices and contact: '), 'Website. Designs shown on the website: Themes.'),
        h('li', h('b', 'Photo and music credits: '), h('a', { href: '/credits/', target: '_blank', rel: 'noopener' }, 'the credits page'), '.'))),
  ];
}

export const ADMIN_MODULES = [
  { id: 'overview', title: 'Overview', icon: 'grid', group: 'main', render: overview, sub: 'Today across all invitations.', actions: (ctx) => [newBtn(ctx)] },
  { id: 'invitations', title: 'Invitations', icon: 'cards', group: 'main', render: invitations, sub: 'Every invitation, its status and replies.', actions: (ctx) => [newBtn(ctx)] },
  { id: 'access', title: 'Clients & access', short: 'Access', icon: 'key', group: 'main', render: access, sub: 'Private links and passwords for couples.' },
  { id: 'replies', title: 'Replies', icon: 'chat', group: 'main', render: replies, sub: 'Guest replies, across all invitations or one.' },
  { id: 'orders', title: 'Orders & requests', short: 'Orders', icon: 'inbox', group: 'business', render: orders, sub: 'From the website and from couples.' },
  { id: 'themes', title: 'Themes', icon: 'palette', group: 'business', render: themesAdmin, sub: 'Choose which designs the website shows.' },
  { id: 'website', title: 'Website', icon: 'globe', group: 'business', render: website, sub: 'Pricing and contact details on the public website.' },
  { id: 'settings', title: 'Settings & help', short: 'Settings', icon: 'settings', group: 'business', render: settings },
];
