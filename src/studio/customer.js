// The customer's dashboard (signed in with email + password): their orders with the payment status and a pay link,
// the invitation(s) the owner made for them, the wedding details they can add later, their phone and their password.
// International customers (acc.market 'intl', docs/PLATFORM.md "Markets") see dollars, PayPal or card wording,
// English only, and email first for help; Nepal customers see what they always saw.
// "Pay for your order": an order waiting for payment is paid right here (PayPal buttons or card for dollar orders,
// QR + screenshot for rupee orders), with the payment step of src/site/payment.js mounted in place (skin 'studio').
// /studio/account?pay=<ref> opens it on that order (the order form sends customers here after ordering).
import { h, icon, toast, openDialog, fmtDate, fill } from './dom.js';
import { api } from './api.js';
import { setUrl } from './nav.js';
import { enhance } from '../ui/enhance.js';
import { clearCacheCard } from './cache.js';
import { priceFor, countryName } from './markets.js';
import { requestChangeDialog, requestPill } from './lock-ui.js';

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

/** "Change plan" before paying: the fixed-price plans of the order's website (GET /api/site), saved with
 *  PATCH /api/account/orders/:ref { plan } (the server re-prices the order and cancels an open checkout). */
async function planDialog(o, onSaved) {
  const site = await api('/site').catch(() => null);
  const usd = market === 'intl';
  const plans = (site?.plans || []).filter((p) => p && p.id && p.from !== true && (p.markets || ['np', 'intl']).includes(market)
    && (usd ? Number.isFinite(p.priceUsd) : Number.isInteger(p.price)));
  if (!plans.length) { toast('Could not load the plans. Please try again.', 'error'); return; }
  let pick = o.plan?.id || '';
  const err = h('p.form-error', { role: 'alert' });
  const save = h('button.btn.btn--primary', { type: 'submit', form: 'op-form' }, 'Change plan');
  const list = h('div.cu-plans', { role: 'radiogroup', 'aria-label': 'Plan' }, plans.map((p) => h('label.cu-plan',
    h('input', { type: 'radio', name: 'op-plan', value: p.id, checked: p.id === pick, onchange: () => { pick = p.id; } }),
    h('span.cu-plan__name', p.name),
    h('span.cu-plan__price', money({ npr: p.price ?? null, usd: p.priceUsd ?? null })),
    p.id === o.plan?.id ? h('small.cu-plan__now', 'Current plan') : null)));
  const form = h('form.stack#op-form', { novalidate: true },
    h('p.hint', 'You can change the plan until you pay. The price updates at once.'), list, err);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    if (pick === o.plan?.id) { d.close(); return; }
    save.disabled = true;
    try {
      const out = await api(`/account/orders/${o.ref}`, { method: 'PATCH', body: { plan: pick } });
      onSaved(out.order);
      toast(`Plan changed to ${out.order.plan?.name || 'the new plan'}`, 'success');
      d.close();
    } catch (ex) { err.textContent = ex.message || 'Could not change the plan.'; save.disabled = false; }
  });
  const d = openDialog({ title: `Change plan · ${o.ref}`, body: form, actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), save] });
}

const REF_RE = /^[A-Za-z0-9_-]{3,40}$/;
/** Waiting for payment, with a price (a Custom request waiting for our quote has no payUrl yet). */
const payable = (o) => ['awaiting_payment', 'rejected'].includes(o.payStatus) && Boolean(o.payUrl);

function orderCard(o, meta, redraw, ro = false, onPay = () => {}) {
  const [tone, text] = PAY[o.payStatus] || ['muted', o.payStatus];
  const design = o.theme ? meta?.themes?.find((t) => t.slug === o.theme) : null;
  const canPay = payable(o);
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
      canPay ? h('button.btn.btn--primary', { type: 'button', onclick: () => onPay(o.ref) }, icon('wallet', 16), o.payStatus === 'rejected' ? 'Pay again' : market === 'intl' ? 'Pay with PayPal or card' : 'Pay now') : null,
      o.payStatus === 'proof_submitted' && o.payUrl ? h('button.btn', { type: 'button', onclick: () => onPay(o.ref) }, 'See payment') : null,
      canPay && o.kind === 'order' && o.plan && !o.plan.from ? h('button.btn.btn--quiet', { type: 'button', onclick: () => planDialog(o, (n) => { Object.assign(o, n); redraw(); }) }, icon('swap', 15), 'Change plan') : null,
      h('button.btn.btn--quiet', { type: 'button', onclick: () => detailsDialog(o, (n) => { Object.assign(o, n); redraw(); }) }, icon('edit', 15), o.weddingDate || o.venue ? 'Edit details' : 'Add wedding details')));
}

/** "Your invitation: Ujjwal & Binisha · Shahi", with Edit, Preview, Share link and the payment status. */
function invitationCard(i, meta, ro = false, onPay = () => {}) {
  const design = meta?.themes?.find((t) => t.slug === i.theme);
  const live = i.status === 'published';
  const [tone, payText] = i.payStatus ? (PAY[i.payStatus] || ['muted', i.payStatus]) : [null, null];
  const named = names(i);
  const share = i.shareUrl ? new URL(i.shareUrl, location.origin).href : '';
  // the event lock (src/core/event-lock.js): names and date after the first publish, and "Request a change"
  const ask = () => requestChangeDialog({ slug: i.slug, lock: i.lock, onDone: (r) => { i.requests = [r, ...(i.requests || [])]; li.replaceWith(invitationCard(i, meta, ro, onPay)); } });
  const lockLine = i.lock ? h('p.cu-lock', icon('lock', 14),
    h('span', `Names and date locked to this wedding · ${i.lock.fixesLeft} of 3 spelling fixes left`),
    ro ? null : h('button.link', { type: 'button', onclick: ask }, 'Request a change')) : null;
  const reqs = (i.requests || []).slice(0, 5);
  const reqList = reqs.length ? h('ul.cu-reqs', { 'aria-label': 'Your change requests' }, reqs.map((r) => h('li', requestPill(r),
    h('span', `${r.label}: ${r.old || '(empty)'} → ${r.value}`), r.note ? h('small', `Note from us: ${r.note}`) : null))) : null;
  const li = h('li.cu-inv',
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
        !ro && ['awaiting_payment', 'rejected'].includes(i.payStatus) && i.payUrl && i.orderRef ? h('button.btn.btn--sm.btn--quiet', { type: 'button', onclick: () => onPay(i.orderRef) }, icon('wallet', 15), 'Pay now') : null),
      lockLine, reqList));
  return li;
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
  // Three parts (display: contents): the pay section between them is never moved or redrawn by a refresh, so the
  // PayPal frames inside it stay alive and a confirmation stays on screen while the rest catches up.
  const top = h('div.cu-part');
  const payHost = h('section.sect.cu-pay#pay', { 'aria-labelledby': 'cu-pay-h', hidden: true });
  const rest = h('div.cu-part');
  let built = false;
  const asked = ctx.params?.get('pay') || '';
  let payRef = !ro && REF_RE.test(asked) ? asked : ''; // the order the section shows
  let explicit = Boolean(payRef); // opened on purpose (?pay=, a Pay button): focus it
  let closed = false; // the customer closed the section: no automatic one until they press Pay
  let mounted = '';
  let wa = WA_NUMBER;

  const reload = () => api('/account').then(draw).catch(() => { /* keep what is on screen */ });
  const showPay = () => {
    if (!payRef) { payHost.hidden = true; fill(payHost); mounted = ''; return; }
    payHost.hidden = false;
    if (mounted === payRef) { if (explicit) payHost.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
    mounted = payRef;
    const box = h('div.cu-pay__box', { 'aria-live': 'polite' });
    fill(payHost,
      h('header.sect__head', h('h2.sect__title#cu-pay-h', 'Pay for your order'),
        h('button.btn.btn--sm.btn--quiet', { type: 'button', onclick: () => { closed = true; payRef = ''; setUrl('#/account'); showPay(); } }, icon('close', 15), 'Close')),
      h('div.card.cu-pay__card', box));
    const ref = payRef;
    const focus = explicit;
    // loaded when first needed: the dashboard stays light for customers with nothing to pay
    import('../site/payment.js').then(({ mountPayment }) => {
      if (mounted !== ref) return;
      mountPayment(box, {
        ref, csrf: ctx.me?.csrf || '', wa, skin: 'studio', focus, refocus: true,
        // paid or screenshot sent: the order, the plan and the invitation below catch up; the confirmation stays
        onChange: () => reload(),
      });
    }, () => fill(box, h('p.notice.notice--error', icon('alert', 16), h('span', 'The payment could not load. Reload the page to try again.'))));
  };
  const openPay = (ref) => {
    if (!REF_RE.test(ref || '')) return;
    closed = false;
    explicit = true;
    payRef = ref;
    setUrl(`#/account?pay=${encodeURIComponent(ref)}`);
    showPay();
  };

  const draw = (acc) => {
    if (!ro) ctx.onAccount?.(acc);
    market = acc.market === 'intl' ? 'intl' : 'np';
    const intl = market === 'intl';
    const orders = acc.orders || [];
    const invs = acc.invitations || [];
    if (acc.contact?.whatsapp) wa = String(acc.contact.whatsapp).replace(/\D/g, '') || WA_NUMBER;
    const ordersEl = h('ul.cu-orders');
    const redraw = () => fill(ordersEl, orders.map((o) => orderCard(o, ctx.meta, redraw, ro, openPay)));
    redraw();
    const dueOrders = orders.filter(payable);
    const due = dueOrders.length;
    // which order the section shows: the one asked for (if it is theirs), else the first one waiting for payment
    if (!ro) {
      if (payRef && !orders.some((o) => o.ref === payRef)) { payRef = ''; explicit = false; }
      if (!payRef && !closed && dueOrders[0]) payRef = dueOrders[0].ref;
    }
    if (!built) { fill(root, top, payHost, rest); built = true; }
    showPay();
    explicit = false;
    fill(top,
      ro ? h('p.notice.notice--row', icon('eye', 16), h('span', h('b', 'Read-only view. '), `This is what ${acc.customer.email} sees when they sign in.`)) : null,
      !ro && acc.customer.mail && !acc.customer.emailVerified ? verifyNotice(acc.customer.email) : null,
      h('p.cu-hello', `${intl ? 'Hello' : 'Namaste'}${acc.customer.name ? `, ${acc.customer.name.split(' ')[0]}` : ''}.`, intl ? null : h('span.cu-hello__ne', { lang: 'ne' }, ' नमस्ते')),
      // the section shows one order; more than one waiting: say so (each has its own Pay button below)
      due > 1 || (due && (ro || !payRef)) ? h('p.notice.notice--row', icon('info', 16), h('span', due === 1 ? 'One order is waiting for payment.' : `${due} orders are waiting for payment.`, intl ? ' Pay with PayPal or a card; we start on your invitation once it is confirmed.' : ' We start on your invitation once it is confirmed.')) : null);
    fill(rest,
      h('section.sect', h('header.sect__head', h('h2.sect__title', 'Your invitation', invs.length ? h('span.sect__count', String(invs.length)) : null)),
        invs.length ? h('ul.cu-invs', invs.map((i) => invitationCard(i, ctx.meta, ro, openPay)))
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
