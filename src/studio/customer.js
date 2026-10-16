// The customer's dashboard (signed in with email + password): their orders with the payment status and a pay link,
// the invitation(s) the owner made for them, the wedding details they can add later, and their password.
import { h, icon, toast, openDialog, fmtDate, fill } from './dom.js';
import { api } from './api.js';
import { enhance } from '../ui/enhance.js';
import { clearCacheCard } from './cache.js';

const WA_DISPLAY = '+977 980-6393298';
const WA_NUMBER = '9779806393298';
export const waLink = (text = '') => `https://wa.me/${WA_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

const PAY = {
  awaiting_payment: ['muted', 'Awaiting payment'],
  proof_submitted: ['accent', 'Payment sent, checking'],
  confirmed: ['ok', 'Confirmed'],
  rejected: ['warn', 'Rejected'],
  refunded: ['muted', 'Refunded'],
};
const npr = (n) => `Rs ${Number(n).toLocaleString('en-IN')}`;
const usd = (n) => `$${Number.isInteger(n) ? n : Number(n).toFixed(2)}`;
const money = (a, from) => [a?.npr != null ? `${from ? 'from ' : ''}${npr(a.npr)}` : null, a?.usd != null ? usd(a.usd) : null].filter(Boolean).join(' · ');
const ymd = (s) => (s ? fmtDate(`${String(s).slice(0, 10)}T12:00:00`, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const names = (i) => [i.bride?.en || i.bride, i.groom?.en || i.groom].filter((x) => typeof x === 'string' && x).join(' & ') || 'Your invitation';

/** "Add wedding details": the date, venue and names they could leave out when ordering. */
function detailsDialog(o, onSaved) {
  const date = h('input.input', { id: 'od-date', type: 'date', value: o.weddingDate || '' });
  const venue = h('input.input', { id: 'od-venue', maxlength: 200, value: o.venue || '', placeholder: 'e.g. Hotel Yak & Yeti, Kathmandu' });
  const bride = h('input.input', { id: 'od-bride', maxlength: 80, value: o.bride || '', autocomplete: 'off' });
  const groom = h('input.input', { id: 'od-groom', maxlength: 80, value: o.groom || '', autocomplete: 'off' });
  const message = h('textarea.input', { id: 'od-msg', rows: 3, maxlength: 2000 }, o.message || '');
  const err = h('p.form-error', { role: 'alert' });
  const save = h('button.btn.btn--primary', { type: 'submit', form: 'od-form' }, 'Save details');
  const form = h('form.stack#od-form', { novalidate: true },
    h('div.cu-two',
      h('div.field', h('label.label', { for: 'od-bride' }, 'Bride’s name'), bride),
      h('div.field', h('label.label', { for: 'od-groom' }, 'Groom’s name'), groom)),
    h('div.cu-two',
      h('div.field', h('label.label', { for: 'od-date' }, 'Wedding date'), date),
      h('div.field', h('label.label', { for: 'od-venue' }, 'Venue'), venue)),
    h('div.field', h('label.label', { for: 'od-msg' }, 'Anything we should know'), message), err);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    save.disabled = true;
    try {
      const out = await api(`/account/orders/${o.ref}`, { method: 'PATCH', body: { weddingDate: date.value, venue: venue.value, bride: bride.value, groom: groom.value, message: message.value } });
      onSaved(out.order);
      toast(out.filled?.length ? 'Details saved and added to your invitation' : 'Details saved', 'success');
      d.close();
    } catch (ex) { err.textContent = ex.status === 400 ? 'Please check the date and the lengths of the fields.' : ex.message; save.disabled = false; }
  });
  const d = openDialog({ title: `Wedding details · ${o.ref}`, body: form, actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), save] });
  enhance(form);
}

function orderCard(o, meta, redraw) {
  const [tone, text] = PAY[o.payStatus] || ['muted', o.payStatus];
  const design = o.theme ? meta?.themes?.find((t) => t.slug === o.theme) : null;
  const canPay = ['awaiting_payment', 'rejected'].includes(o.payStatus) && o.payUrl;
  const facts = [
    ['Plan', o.plan ? `${o.plan.name}${money(o.amount, o.plan.from) ? ` · ${money(o.amount, o.plan.from)}` : ''}` : (o.kind === 'custom' ? 'Custom design request' : '—')],
    ['Design', design?.name || (o.theme ? o.theme : 'Not chosen yet')],
    ['Wedding', [ymd(o.weddingDate), o.venue].filter(Boolean).join(' · ') || 'Add the date and venue when you know them'],
  ];
  return h('li.cu-order',
    h('div.cu-order__head',
      h('div.cu-order__id', h('b.mono', o.ref), h('small', `Ordered ${fmtDate(o.at)}`)),
      h('span.pill', { class: `pill--${tone}` }, text)),
    o.payStatus === 'rejected' && o.reason ? h('p.notice.notice--warn', icon('alert', 16), h('span', h('b', 'Why: '), o.reason, '. Please pay again or message us.')) : null,
    o.payStatus === 'proof_submitted' ? h('p.cu-order__note', 'We have your payment screenshot and will confirm it soon.') : null,
    h('dl.cu-facts', facts.map(([k, v]) => h('div', h('dt', k), h('dd', v)))),
    h('div.cu-order__acts',
      canPay ? h('a.btn.btn--primary', { href: o.payUrl }, icon('right', 16), o.payStatus === 'rejected' ? 'Pay again' : 'Pay now') : null,
      o.payStatus === 'proof_submitted' && o.payUrl ? h('a.btn', { href: o.payUrl }, 'See payment') : null,
      h('button.btn.btn--quiet', { type: 'button', onclick: () => detailsDialog(o, (n) => { Object.assign(o, n); redraw(); }) }, icon('edit', 15), o.weddingDate || o.venue ? 'Edit details' : 'Add wedding details')));
}

/** "Your invitation: Ujjwal & Binisha · Shahi", with Edit, Preview, Share link and the payment status. */
function invitationCard(i, meta) {
  const design = meta?.themes?.find((t) => t.slug === i.theme);
  const live = i.status === 'published';
  const [tone, payText] = i.payStatus ? (PAY[i.payStatus] || ['muted', i.payStatus]) : [null, null];
  const named = names(i);
  const share = i.shareUrl ? new URL(i.shareUrl, location.origin).href : '';
  return h('li.cu-inv',
    h('span.cu-inv__img', design?.thumb ? h('img', { src: design.thumb, alt: '', loading: 'lazy' }) : icon('heart', 18)),
    h('div.cu-inv__body',
      h('p.cu-inv__names', named === 'Your invitation' ? 'Your invitation' : `Your invitation: ${named}`, i.plan?.name ? h('span.cu-inv__plan', ` · ${i.plan.name}`) : null),
      h('p.cu-inv__meta', design?.name || i.theme, i.weddingDate ? ` · ${fmtDate(i.weddingDate)}` : '', ' ',
        h('span.pill', { class: live ? 'pill--ok' : 'pill--muted' }, live ? 'Live' : 'Draft'),
        payText ? h('span.pill', { class: `pill--${tone}`, title: i.orderRef ? `Order ${i.orderRef}` : '' }, payText) : null),
      h('div.cu-inv__acts',
        h('a.btn.btn--primary.btn--sm', { href: `#/i/${i.slug}/home` }, icon('edit', 15), 'Edit'),
        h('a.btn.btn--sm', { href: i.previewUrl || `/${i.theme}/?id=${i.slug}`, target: '_blank', rel: 'noopener' }, icon('eye', 15), 'Preview'),
        h('button.btn.btn--sm', { type: 'button', disabled: !share, title: share ? share : 'The share link works once your invitation is published.', onclick: () => navigator.clipboard?.writeText(share).then(() => toast('Share link copied', 'success'), () => toast(share)) }, icon('share', 15), share ? 'Copy share link' : 'Share link after publishing'),
        ['awaiting_payment', 'rejected'].includes(i.payStatus) && i.payUrl ? h('a.btn.btn--sm.btn--quiet', { href: i.payUrl }, icon('right', 15), 'Pay now') : null)));
}

function passwordCard() {
  const cur = h('input.input', { id: 'cp-cur', type: 'password', autocomplete: 'current-password', maxlength: 1024 });
  const next = h('input.input', { id: 'cp-new', type: 'password', autocomplete: 'new-password', minlength: 8, maxlength: 128 });
  const err = h('p.form-error', { role: 'alert' });
  const btn = h('button.btn', { type: 'submit' }, 'Change password');
  const form = h('form.stack', { novalidate: true },
    h('div.cu-two',
      h('div.field', h('label.label', { for: 'cp-cur' }, 'Current password'), cur),
      h('div.field', h('label.label', { for: 'cp-new' }, 'New password'), next, h('p.hint', 'At least 8 characters. You stay signed in here; other devices are signed out.'))),
    err, h('div.row', btn));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    if (next.value.length < 8) { err.textContent = 'The new password needs at least 8 characters.'; next.focus(); return; }
    btn.disabled = true;
    try {
      await api('/account/password', { method: 'POST', body: { current: cur.value, password: next.value } });
      cur.value = '';
      next.value = '';
      toast('Password changed', 'success');
    } catch (ex) { err.textContent = ex.message; }
    btn.disabled = false;
  });
  return h('section.card', h('header.card__head', h('h2.card__title', 'Password')), form);
}

/** The dashboard module: render(ctx) with ctx.meta and ctx.account (from GET /api/account), re-fetched on open. */
export function customerHome(ctx) {
  const root = h('div.cu', h('div.rows-skel', { 'aria-hidden': 'true' }, h('div.rows-skel__row', h('span.skel__line', { style: { width: '50%' } }))));
  const draw = (acc) => {
    ctx.onAccount?.(acc);
    const orders = acc.orders || [];
    const invs = acc.invitations || [];
    const ordersEl = h('ul.cu-orders');
    const redraw = () => fill(ordersEl, orders.map((o) => orderCard(o, ctx.meta, redraw)));
    redraw();
    const due = orders.filter((o) => ['awaiting_payment', 'rejected'].includes(o.payStatus)).length;
    fill(root,
      h('p.cu-hello', `Namaste${acc.customer.name ? `, ${acc.customer.name.split(' ')[0]}` : ''}.`, h('span.cu-hello__ne', { lang: 'ne' }, ' नमस्ते')),
      due ? h('p.notice.notice--row', icon('info', 16), h('span', due === 1 ? 'One order is waiting for payment.' : `${due} orders are waiting for payment.`, ' We start on your invitation once it is confirmed.')) : null,
      h('section.sect', h('header.sect__head', h('h2.sect__title', 'Your invitation', invs.length ? h('span.sect__count', String(invs.length)) : null)),
        invs.length ? h('ul.cu-invs', invs.map((i) => invitationCard(i, ctx.meta)))
          : h('div.qempty', h('span.qempty__icon', icon('heart', 18)), h('div',
            h('p.qempty__title', 'We are preparing your invitation'),
            h('p.qempty__text', 'Once it is ready it appears here, and you can change the names, dates, photos and music yourself.')))),
      h('section.sect', h('header.sect__head', h('h2.sect__title', 'Your orders', orders.length ? h('span.sect__count', String(orders.length)) : null)),
        orders.length ? ordersEl : h('div.qempty', h('span.qempty__icon', icon('inbox', 18)), h('div', h('p.qempty__title', 'No orders yet'),
          h('p.qempty__text', 'Choose a design on our website to order your invitation.')), h('div.qempty__acts', h('a.btn', { href: '/#designs' }, 'See the designs')))),
      h('section.sect', h('header.sect__head', h('h2.sect__title', 'Account')),
        h('div.cu-account',
          h('section.card', h('header.card__head', h('h2.card__title', 'Your details')),
            h('dl.cu-facts', [['Name', acc.customer.name || '—'], ['Email', acc.customer.email], ['Phone', acc.customer.phone || '—']].map(([k, v]) => h('div', h('dt', k), h('dd', v)))),
            h('p.hint', 'To change these, message us on WhatsApp.'),
            h('a.sharebtn.sharebtn--wa', { href: waLink(), target: '_blank', rel: 'noopener' }, icon('chat', 17), h('span', `WhatsApp ${WA_DISPLAY}`))),
          passwordCard(),
          clearCacheCard())));
  };
  api('/account').then(draw).catch((err) => fill(root, h('p.notice.notice--error', icon('alert', 16), h('span', err.message))));
  return root;
}

export const CUSTOMER_MODULES = [
  { id: 'account', title: 'My dashboard', short: 'Dashboard', icon: 'grid', render: customerHome, sub: 'Your orders, payments and invitation.' },
];

export { WA_DISPLAY };
