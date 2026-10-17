// The customer's dashboard (signed in with email + password): their orders with the payment status and a pay link,
// the invitation(s) the owner made for them, the wedding details they can add later, their phone and their password.
// International customers (acc.market 'intl', docs/PLATFORM.md "Markets") see dollars, PayPal or card wording,
// English only, and email first for help; Nepal customers see what they always saw.
import { h, icon, toast, openDialog, fmtDate, fill } from './dom.js';
import { api } from './api.js';
import { enhance } from '../ui/enhance.js';
import { clearCacheCard } from './cache.js';
import { priceFor, countryName } from './markets.js';

const WA_DISPLAY = '+977 980-6393298';
const WA_NUMBER = '9779806393298';
export const waLink = (text = '') => `https://wa.me/${WA_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ''}`;

const PAY = {
  awaiting_payment: ['muted', 'Awaiting payment'],
  proof_submitted: ['accent', 'Payment sent, checking'],
  confirmed: ['ok', 'Confirmed'],
  rejected: ['warn', 'Rejected'],
  refunded: ['muted', 'Refunded'],
  comped: ['ok', 'Free, nothing to pay'], // free access the planner gave
};
let market = 'np'; // the dashboard being drawn (customerHome sets it from GET /api/account)
const money = (a, from) => priceFor(a, market, from);
const quoteMoney = (q) => (q ? priceFor(q.currency === 'USD' ? { usd: q.amount } : { npr: q.amount }, q.currency === 'USD' ? 'intl' : 'np') : '');
const ymd = (s) => (s ? fmtDate(`${String(s).slice(0, 10)}T12:00:00`, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const names = (i) => [i.bride?.en || i.bride, i.groom?.en || i.groom].filter((x) => typeof x === 'string' && x).join(' & ') || 'Your invitation';

/** "Add wedding details": the date, venue and names they could leave out when ordering. */
function detailsDialog(o, onSaved) {
  const date = h('input.input', { id: 'od-date', type: 'date', value: o.weddingDate || '' });
  const venue = h('input.input', { id: 'od-venue', maxlength: 200, value: o.venue || '', placeholder: market === 'intl' ? 'e.g. The Foundry, Long Island City' : 'e.g. Hotel Yak & Yeti, Kathmandu' });
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

function orderCard(o, meta, redraw, ro = false) {
  const [tone, text] = PAY[o.payStatus] || ['muted', o.payStatus];
  const design = o.theme ? meta?.themes?.find((t) => t.slug === o.theme) : null;
  const canPay = ['awaiting_payment', 'rejected'].includes(o.payStatus) && o.payUrl;
  const facts = [
    ['Plan', o.plan ? `${o.plan.name}${money(o.amount, o.plan.from) ? ` · ${money(o.amount, o.plan.from)}` : ''}` : (o.kind === 'custom' ? 'Custom design request' : '—')],
    o.quote && o.kind === 'custom' ? ['Our price', `${quoteMoney(o.quote)}${o.quote.note ? ` · ${o.quote.note}` : ''}`] : null,
    ['Design', design?.name || (o.theme ? o.theme : 'Not chosen yet')],
    ['Wedding', [ymd(o.weddingDate), o.venue].filter(Boolean).join(' · ') || 'Add the date and venue when you know them'],
  ];
  return h('li.cu-order',
    h('div.cu-order__head',
      h('div.cu-order__id', h('b.mono', o.ref), h('small', `Ordered ${fmtDate(o.at)}`)),
      h('span.pill', { class: `pill--${tone}` }, text)),
    o.payStatus === 'rejected' && o.reason ? h('p.notice.notice--warn', icon('alert', 16), h('span', h('b', 'Why: '), o.reason, '. Please pay again or message us.')) : null,
    o.payStatus === 'proof_submitted' ? h('p.cu-order__note', 'We have your payment screenshot and will confirm it soon.') : null,
    o.payStatus === 'comped' ? h('p.cu-order__note', 'This plan is on us. There is nothing to pay.') : null,
    h('dl.cu-facts', facts.filter(Boolean).map(([k, v]) => h('div', h('dt', k), h('dd', v)))),
    o.quote && o.kind === 'custom' ? h('p.cu-order__note', 'Happy with the price? Reply to our message and we will send you a link to pay.') : null,
    ro ? null : h('div.cu-order__acts',
      canPay ? h('a.btn.btn--primary', { href: o.payUrl }, icon('right', 16), o.payStatus === 'rejected' ? 'Pay again' : market === 'intl' ? 'Pay with PayPal or card' : 'Pay now') : null,
      o.payStatus === 'proof_submitted' && o.payUrl ? h('a.btn', { href: o.payUrl }, 'See payment') : null,
      h('button.btn.btn--quiet', { type: 'button', onclick: () => detailsDialog(o, (n) => { Object.assign(o, n); redraw(); }) }, icon('edit', 15), o.weddingDate || o.venue ? 'Edit details' : 'Add wedding details')));
}

/** "Your invitation: Ujjwal & Binisha · Shahi", with Edit, Preview, Share link and the payment status. */
function invitationCard(i, meta, ro = false) {
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
        h('a.btn.btn--primary.btn--sm', { href: `#/i/${i.slug}/home`, onclick: ro ? () => document.querySelector('dialog[open]')?.close() : null }, icon('edit', 15), 'Edit'),
        h('a.btn.btn--sm', { href: i.previewUrl || `/${i.theme}/?id=${i.slug}`, target: '_blank', rel: 'noopener' }, icon('eye', 15), 'Preview'),
        h('button.btn.btn--sm', { type: 'button', disabled: !share, title: share ? share : 'The share link works once your invitation is published.', onclick: () => navigator.clipboard?.writeText(share).then(() => toast('Share link copied', 'success'), () => toast(share)) }, icon('share', 15), share ? 'Copy share link' : 'Share link after publishing'),
        !ro && ['awaiting_payment', 'rejected'].includes(i.payStatus) && i.payUrl ? h('a.btn.btn--sm.btn--quiet', { href: i.payUrl }, icon('right', 15), 'Pay now') : null)));
}

/** Their phone, with its country, and Change (checked on the server and saved as +1 415 555 2671, E.164). */
function phoneField(acc) {
  const box = h('div.cu-phone');
  const show = () => fill(box,
    h('span', acc.customer.phone || '—', acc.country ? h('small.cu-country', countryName(acc.country)) : null),
    h('button.link', { type: 'button', onclick: edit }, acc.customer.phone ? 'Change' : 'Add your phone'));
  function edit() {
    const input = h('input.input', { id: 'cu-phone', type: 'tel', inputmode: 'tel', autocomplete: 'tel', maxlength: 24, value: acc.customer.phone || '', placeholder: market === 'intl' ? '+1 415 555 2671' : '+977 98XXXXXXXX', 'aria-label': 'Phone number' });
    const err = h('p.form-error', { role: 'alert' });
    const save = h('button.btn.btn--sm.btn--primary', { type: 'submit' }, 'Save');
    const form = h('form.cu-phone', { novalidate: true },
      h('div.inputrow', input, save, h('button.btn.btn--sm.btn--quiet', { type: 'button', onclick: show }, 'Cancel')),
      h('p.hint', 'With the country code, so we can reach you on WhatsApp too.'), err);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      save.disabled = true;
      try {
        const out = await api('/account', { method: 'PATCH', body: { phone: input.value } });
        acc.customer.phone = out.customer.phone;
        acc.country = out.customer.country;
        toast('Phone number saved', 'success');
        show();
      } catch (ex) { err.textContent = ex.message; save.disabled = false; input.focus(); }
    });
    fill(box, form);
    input.focus();
  }
  show();
  return box;
}

/** How to reach us: International leads with email, Nepal with WhatsApp (GET /api/account contact). */
function contactBlock(acc) {
  const c = acc.contact || {};
  const wa = c.whatsapp ? `https://wa.me/${String(c.whatsapp).replace(/\D/g, '')}` : waLink();
  const waBtn = h('a.sharebtn.sharebtn--wa', { href: wa, target: '_blank', rel: 'noopener' }, icon('chat', 17), h('span', `WhatsApp ${c.whatsapp || WA_DISPLAY}`));
  if (market !== 'intl' || !c.email) return [h('p.hint', 'To change your name or email, message us on WhatsApp.'), waBtn];
  return [h('p.hint', 'Questions, or a change to your name or email? Email us and we reply within a day.'),
    h('div.cu-contact', h('a.btn.btn--primary.btn--sm', { href: `mailto:${c.email}` }, icon('mail', 15), `Email ${c.email}`), waBtn)];
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

/** "Confirm your email": the 6-digit code from the email (Copy code pastes in), Confirm, and Send again. */
function verifyNotice(email) {
  const code = h('input.input.codein', { type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 7, placeholder: '6-digit code', 'aria-label': 'Code from the email', spellcheck: 'false' });
  code.addEventListener('input', () => { const v = code.value.replace(/\D/g, '').slice(0, 6); if (v !== code.value) code.value = v; });
  const ok = h('button.btn.btn--sm.btn--primary', { type: 'submit' }, 'Confirm');
  const again = h('button.btn.btn--sm.btn--quiet', { type: 'button', onclick: async () => {
    again.disabled = true;
    try { await api('/account/verify', { method: 'POST' }); toast(`New code sent to ${email}. Check spam too.`, 'success'); } catch (ex) { toast(ex.message, 'error'); }
    setTimeout(() => { again.disabled = false; }, 30000);
  } }, 'Send again');
  const form = h('form.cu-verify', { novalidate: true },
    h('div.cu-verify__text', icon('info', 16), h('span', h('b', 'Please confirm your email. '), `Enter the 6-digit code we sent to ${email}.`)),
    h('div.cu-verify__row', code, ok, again));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (code.value.length !== 6) { toast('Enter the 6-digit code from the email.', 'error'); code.focus(); return; }
    ok.disabled = true;
    try { await api('/account/verify/confirm', { method: 'POST', body: { code: code.value } }); toast('Email confirmed', 'success'); form.remove(); }
    catch (ex) { toast(ex.message, 'error'); ok.disabled = false; code.select(); }
  });
  return form;
}

/**
 * The dashboard module: render(ctx) with ctx.meta and ctx.account (from GET /api/account), re-fetched on open.
 * ctx.viewAs (a customer, planner only): that customer's dashboard, read-only, from GET /api/admin/customers/:id/account.
 */
export function customerHome(ctx) {
  const ro = Boolean(ctx.viewAs);
  const root = h('div.cu', h('div.rows-skel', { 'aria-hidden': 'true' }, h('div.rows-skel__row', h('span.skel__line', { style: { width: '50%' } }))));
  const draw = (acc) => {
    if (!ro) ctx.onAccount?.(acc);
    market = acc.market === 'intl' ? 'intl' : 'np';
    const intl = market === 'intl';
    const orders = acc.orders || [];
    const invs = acc.invitations || [];
    const ordersEl = h('ul.cu-orders');
    const redraw = () => fill(ordersEl, orders.map((o) => orderCard(o, ctx.meta, redraw, ro)));
    redraw();
    const due = orders.filter((o) => ['awaiting_payment', 'rejected'].includes(o.payStatus)).length;
    fill(root,
      ro ? h('p.notice.notice--row', icon('eye', 16), h('span', h('b', 'Read-only view. '), `This is what ${acc.customer.email} sees when they sign in.`)) : null,
      !ro && acc.customer.mail && !acc.customer.emailVerified ? verifyNotice(acc.customer.email) : null,
      h('p.cu-hello', `${intl ? 'Hello' : 'Namaste'}${acc.customer.name ? `, ${acc.customer.name.split(' ')[0]}` : ''}.`, intl ? null : h('span.cu-hello__ne', { lang: 'ne' }, ' नमस्ते')),
      due ? h('p.notice.notice--row', icon('info', 16), h('span', due === 1 ? 'One order is waiting for payment.' : `${due} orders are waiting for payment.`, intl ? ' Pay with PayPal or a card; we start on your invitation once it is confirmed.' : ' We start on your invitation once it is confirmed.')) : null,
      h('section.sect', h('header.sect__head', h('h2.sect__title', 'Your invitation', invs.length ? h('span.sect__count', String(invs.length)) : null)),
        invs.length ? h('ul.cu-invs', invs.map((i) => invitationCard(i, ctx.meta, ro)))
          : h('div.qempty', h('span.qempty__icon', icon('heart', 18)), h('div',
            h('p.qempty__title', 'We are preparing your invitation'),
            h('p.qempty__text', 'Once it is ready it appears here, and you can change the names, dates, photos and music yourself.')))),
      h('section.sect', h('header.sect__head', h('h2.sect__title', 'Your orders', orders.length ? h('span.sect__count', String(orders.length)) : null)),
        orders.length ? ordersEl : h('div.qempty', h('span.qempty__icon', icon('inbox', 18)), h('div', h('p.qempty__title', 'No orders yet'),
          h('p.qempty__text', 'Choose a design on our website to order your invitation.')), h('div.qempty__acts', h('a.btn', { href: intl ? '/international/#designs' : '/#designs' }, 'See the designs')))),
      h('section.sect', h('header.sect__head', h('h2.sect__title', 'Account')),
        h('div.cu-account',
          h('section.card', h('header.card__head', h('h2.card__title', 'Your details')),
            h('dl.cu-facts', [['Name', acc.customer.name || '—'], ['Email', acc.customer.email], ['Phone', ro ? h('span', acc.customer.phone || '—', acc.country ? h('small.cu-country', countryName(acc.country)) : null) : phoneField(acc)]].map(([k, v]) => h('div', h('dt', k), h('dd', v)))),
            ...contactBlock(acc)),
          ro ? null : passwordCard(),
          ro ? null : clearCacheCard())));
  };
  api(ro ? `/admin/customers/${ctx.viewAs.id}/account` : '/account').then(draw).catch((err) => fill(root, h('p.notice.notice--error', icon('alert', 16), h('span', err.message))));
  return root;
}

export const CUSTOMER_MODULES = [
  { id: 'account', title: 'My dashboard', short: 'Dashboard', icon: 'grid', render: customerHome, sub: 'Your orders, payments and invitation.' },
];

export { WA_DISPLAY };
