// The payment step: after an order is saved, the customer pays by PayPal or card (dollar orders: PayPal's buttons,
// or PayPal's card fields where the account has them), or by QR (Khalti, eSewa, bank) and then sends a screenshot.
// One mount function, two homes:
//  - the customer's dashboard (src/studio/customer.js, skin 'studio'): "Pay for your order", in place
//  - /pay/<ref> (src/site/pay-page.js, skin 'site'): old links and links with ?t=<token>
// The styles live with each home (src/site/pay.css; src/studio/studio.css "Pay for your order").
// Data: GET /api/orders/:ref/pay?t= (per-order QR images with the amount and remark filled in where the wallet
// allows), POST /api/orders/:ref/proof?t= (multipart). Without a token the signed-in customer's session opens their
// own order; the PayPal calls then carry the session's CSRF token. Nothing here decides that a payment happened:
// the server captures with PayPal and checks the amount, currency and order number. Text from the API goes in with
// textContent only.
import { el, icon, ICONS, money, copyButton, waLink, reduced } from './common.js';
import { getPayment, sendProof, paypalCall, paypalConfig } from './api.js';

const MAX_MB = 8;
const STEPS = ['Order', 'Pay', 'We confirm', 'Your plan is active'];

export const payLink = (ref, token) => `${location.origin}/pay/${encodeURIComponent(ref)}${token ? `?t=${encodeURIComponent(token)}` : ''}`;

/** The four steps as a small progress line. `at` = index of the current step (0-3); 4 = all done. */
export function stepsLine(at) {
  return el('ol', { class: 'paysteps', 'aria-label': 'Your order, step by step' },
    STEPS.map((t, i) => el('li', {
      class: `paysteps__i${i < at ? ' is-done' : ''}${i === at ? ' is-now' : ''}`,
      'aria-current': i === at ? 'step' : null,
    }, el('span', { class: 'paysteps__n', 'aria-hidden': 'true' }, i < at ? icon(ICONS.check) : String(i + 1)),
    el('span', { class: 'paysteps__t', text: t }),
    i < at ? el('span', { class: 'vh', text: ' (done)' }) : null)));
}

// statuses (docs/API.md): awaiting_payment -> proof_submitted -> confirmed | rejected (may upload again) ; refunded ;
// comped (free access the planner gave: nothing to pay, never a pay form)
const isFree = (s) => s === 'comped';
const isDone = (s) => s === 'confirmed' || s === 'paid' || isFree(s);
const isSent = (s) => s === 'proof_submitted';
const isClosed = (s) => s === 'refunded';
const amountOf = (m, info) => (m.amount != null ? m.amount : m.currency === 'USD' ? info.amount.usd : info.amount.npr);

/** Class names of the shared parts (buttons, fields, messages) in each home's own components. */
const SKINS = {
  site: {
    primary: 'btn btn--accent', submit: 'btn btn--accent btn--wide', line: 'btn btn--line', wa: 'btn btn--wa', chip: 'chipbtn', chipSm: 'chipbtn chipbtn--sm',
    field: 'field', fieldSm: 'field field--sm', label: null, hint: 'field__hint', err: 'field__err', status: 'form__status', inDashboard: false,
  },
  studio: {
    primary: 'btn btn--primary', submit: 'btn btn--primary btn--lg btn--block', line: 'btn', wa: 'btn btn--wa', chip: 'btn btn--sm', chipSm: 'btn btn--sm',
    field: 'field', fieldSm: 'field', label: 'label', hint: 'hint', err: 'form-error', status: 'notice notice--error', inDashboard: true,
  },
};

/**
 * Mounts the payment step into `box` and returns the order's pay data (null when it could not load). Options:
 *  ref, token (the pay token; empty: the signed-in customer's session), csrf (that session's token, for PayPal),
 *  wa (WhatsApp number), info (already fetched pay data), skin ('site' | 'studio'),
 *  focus (focus and scroll to the heading on the first render), refocus (the same after a payment; default: focus),
 *  onChange(data) (called after a payment or screenshot changed the order, with its fresh pay data).
 * Mounting again into the same box replaces what was there (the PayPal SDK itself loads once per page).
 */
export async function mountPayment(box, { ref, token = '', csrf = '', wa = '', info = null, skin = 'site', focus = true, refocus = focus, onChange = null }) {
  const c = { ref, token, csrf, wa, S: SKINS[skin] || SKINS.site };
  const run = (box.payRun = (box.payRun || 0) + 1); // a newer mount into this box wins
  box.setAttribute('aria-busy', 'true');
  box.replaceChildren(el('p', { class: 'pay__loading', text: 'Loading your payment details…' }));
  let r = info ? { ok: true, data: info } : await getPayment(ref, token);
  if (run !== box.payRun) return null;
  if (!r.ok) {
    box.removeAttribute('aria-busy');
    box.replaceChildren(errorView(r.status, c));
    return null;
  }
  const data = r.data;
  const render = (d, again) => {
    if (run !== box.payRun) return;
    box.removeAttribute('aria-busy');
    if (isDone(d.status) || isSent(d.status) || isClosed(d.status) || !d.canUpload || d.paypal?.status === 'pending') box.replaceChildren(statusView(d, c));
    else box.replaceChildren(payView(d, c, async () => {
      r = await getPayment(ref, token);
      const next = r.ok ? r.data : { ...d, status: 'proof_submitted', proof: { method: '' } };
      render(next, true);
      onChange?.(next);
    }));
    const h = box.querySelector('h2, h3');
    if ((again ? refocus : focus) && h) {
      h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
      box.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
    }
  };
  render(data, false);
  return data;
}

function errorView(status, { ref, wa, S }) {
  const missing = status === 404 || status === 403 || status === 400;
  const text = missing
    ? (S.inDashboard ? 'This order is not on your account. Please message us and we will sort it out.' : 'Please check that you opened the full link from your order. It ends with a long code.')
    : 'We could not load your payment details just now. Please check your connection and try again.';
  return el('div', { class: 'pay__error', role: 'alert' },
    el('h3', { class: 'pay__title pay__title--sm', text: missing ? 'We could not find this order' : 'Something went wrong' }),
    el('p', { text }),
    el('p', { class: 'pay__acts' },
      el('button', { class: S.line, type: 'button', text: 'Try again', onclick: () => location.reload() }),
      wa ? el('a', { class: S.wa, href: waLink(wa, `Hi Nimtto, I need help with order ${ref}.`), target: '_blank', rel: 'noopener' }, icon(ICONS.wa), el('span', { text: 'Message us on WhatsApp' })) : null));
}

/* ---------------- step 2 and 3: pay by QR, then send the screenshot ---------------- */
function payView(info, c, onSent) {
  const { ref, token, wa, S } = c;
  // PayPal checkout (cards too) replaces a PayPal QR when it is on: one way to pay from abroad. An order from the
  // international site shows "Card or PayPal" first and in dollars; the QR methods come second.
  const intl = info.market === 'intl';
  const checkout = info.paypalCheckout && info.amount.usd != null;
  const card = checkout ? [{ id: 'paypal-checkout', label: intl ? 'Card or PayPal' : 'PayPal or card', kind: 'checkout', currency: 'USD' }] : [];
  const qrs = info.methods.filter((m) => m.qr && !(checkout && m.kind === 'paypal'));
  // international: card or PayPal first, then any dollar method (a PayPal QR), the Nepal wallets last
  const methods = intl ? [...card, ...qrs.filter((m) => m.currency === 'USD'), ...qrs.filter((m) => m.currency !== 'USD')] : [...qrs, ...card];
  const usdFirst = intl && info.amount.usd != null;
  const priced = info.amount.npr != null;
  const head = el('header', { class: 'pay__head' },
    el('p', { class: 'pay__saved' }, icon(ICONS.check), el('span', {}, 'Order ', el('b', { text: ref }), S.inDashboard ? ' is saved, waiting for payment' : ' is saved')),
    el('h3', { class: 'pay__title', text: usdFirst ? `Pay $${info.amount.usd}` : priced ? `Pay ${money(info.amount.npr)}` : 'Pay for your order' }),
    el('p', { class: 'pay__plan', text: usdFirst
      ? [info.plan?.name ? `${info.plan.name} plan` : '', 'paid once, by card or PayPal'].filter(Boolean).join(' · ')
      : [info.plan?.name ? `${info.plan.name} plan` : '', info.amount.usd != null ? `or ${money(info.amount.usd, 'USD')} by PayPal from abroad` : ''].filter(Boolean).join(' · ') }));

  if (!methods.length) {
    return el('div', { class: 'pay' }, stepsLine(1), head,
      el('p', { class: 'pay__note', text: 'Payment by QR is not ready yet. Please message us on WhatsApp and we will help you pay.' }),
      wa ? el('a', { class: S.wa, href: waLink(wa, `Hi Nimtto, I want to pay for order ${ref}.`), target: '_blank', rel: 'noopener' }, icon(ICONS.wa), el('span', { text: 'Message us on WhatsApp' })) : null);
  }

  const state = { m: methods[0], remark: info.remark || methods[0].remark || `Nimtto ${ref}` };
  const radios = el('div', { class: 'methods__list' }, methods.map((m, i) => el('label', { class: 'method' },
    el('input', { type: 'radio', name: `pay-method-${ref}`, value: m.id, checked: i === 0 }),
    el('span', { class: 'method__box' },
      el('span', { class: `method__logo method__logo--${m.id}`, 'aria-hidden': 'true', text: m.label.slice(0, 1) }),
      el('span', { class: 'method__t' }, el('span', { class: 'method__name', text: m.label }),
        el('span', { class: 'method__sub', text: m.kind === 'checkout' ? `${intl ? 'Visa, Mastercard or PayPal' : 'From abroad: PayPal, Visa, Mastercard'} · ${money(info.amount.usd, 'USD')}` : m.currency === 'USD' ? 'From abroad, in US dollars' : m.kind === 'bank' ? `${intl ? 'In Nepal: ' : ''}Any mobile banking app` : `${intl ? 'In Nepal: ' : ''}Wallet app` }))))));
  const methodsBox = el('fieldset', { class: 'methods' }, el('legend', { class: 'pay__label', text: '1. Choose how to pay' }), radios);

  const qrImg = el('img', { class: 'qr__img', width: 320, height: 320, alt: '', decoding: 'async' });
  const qrFig = el('figure', { class: 'qr' }, qrImg);
  qrImg.addEventListener('error', () => { qrFig.classList.add('is-missing'); });
  qrImg.addEventListener('load', () => { qrFig.classList.remove('is-missing', 'is-loading'); });
  const how = el('p', { class: 'qr__how' });
  const auto = el('p', { class: 'qr__auto' });
  const dl = el('dl', { class: 'qr__facts' });
  const remarkIn = el('input', { id: `remark-${ref}`, class: 'input', type: 'text', maxlength: methods[0].remarkMax || 25, autocomplete: 'off', spellcheck: 'false' });
  remarkIn.value = state.remark;
  const remarkField = el('div', { class: S.fieldSm },
    el('label', { for: `remark-${ref}`, class: S.label, text: 'Remark' }),
    el('div', { class: 'remark' }, remarkIn, copyButton('Copy', () => state.remark, S.chip)),
    el('p', { class: S.hint, text: 'Keep your order number in the remark so we can find your payment.' }));
  const save = el('a', { class: S.chip, download: '' }, icon(ICONS.down), el('span', { text: 'Save QR image' }));
  const saveHint = el('p', { class: 'qr__tip' });
  const qrBox = el('section', { class: 'qrbox', 'aria-labelledby': `qr-h-${ref}` },
    el('h4', { class: 'pay__label', id: `qr-h-${ref}`, text: '2. Scan the QR and pay' }),
    el('div', { class: 'qrbox__in' }, el('div', { class: 'qrbox__code' }, qrFig, el('div', { class: 'qrbox__save' }, save)),
      el('div', { class: 'qrbox__info' }, how, auto, dl, remarkField, saveHint)));

  const qrUrl = () => {
    const m = state.m;
    if (!/^\/api\//.test(m.qr)) return m.qr; // a fixed image (fallback): the remark cannot be in it
    const u = new URL(m.qr, location.origin);
    u.searchParams.set('remark', state.remark);
    return u.pathname + u.search;
  };
  const showMethod = () => {
    const m = state.m;
    const amt = amountOf(m, info);
    const amtText = amt != null ? money(amt, m.currency) : '';
    qrFig.classList.add('is-loading');
    qrFig.classList.remove('is-missing');
    qrImg.src = qrUrl();
    qrImg.alt = `QR code to pay ${amtText || 'Nimtto'} with ${m.label}`;
    save.href = qrImg.src;
    save.setAttribute('download', `nimtto-${ref}-${m.id}.png`);
    how.textContent = m.kind === 'paypal'
      ? 'Scan with your phone camera. It opens PayPal.'
      : m.kind === 'bank' ? 'Open your mobile banking app and scan this QR.' : `Open the ${m.label} app and scan this QR.`;
    auto.replaceChildren();
    auto.className = 'qr__auto';
    if (m.dynamic) auto.append(icon(ICONS.check), el('span', { text: 'The amount fills in by itself.' }));
    else {
      auto.classList.add('qr__auto--manual');
      auto.append(el('span', {}, 'Scan, then enter amount ', el('b', { text: amtText || 'as agreed' }), ' and remark ', el('b', { text: state.remark }), '.'));
    }
    dl.replaceChildren(...[
      amt != null ? row('Amount', amtText, copyButton('Copy', () => String(amt), S.chipSm)) : null,
      m.accountName ? row('Account name', m.accountName) : null,
      m.accountHint ? row('Account', m.accountHint) : null,
      m.note ? row('Note', m.note) : null,
    ].filter(Boolean));
    saveHint.textContent = m.kind === 'paypal'
      ? 'Paying from this phone? Save the QR image, or ask us on WhatsApp for a PayPal link.'
      : `Paying from this phone? Save the QR image, then open ${m.kind === 'bank' ? 'your bank app' : m.label} and choose “scan from gallery”.`;
    amountIn.value = amt != null ? String(amt) : '';
    amountCur.textContent = m.currency === 'USD' ? 'USD' : 'Rs';
  };
  radios.addEventListener('change', (e) => {
    state.m = methods.find((m) => m.id === e.target.value) || methods[0];
    if (state.m.kind !== 'checkout') showMethod();
  });
  let t = 0;
  remarkIn.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      // the wallets take plain letters and numbers only (printable ASCII, at most remarkMax)
      const v = remarkIn.value.replace(/[^ -~]/g, '').replace(/\s+/g, ' ').trim().slice(0, state.m.remarkMax || 25);
      state.remark = v || info.remark || `Nimtto ${ref}`;
      showMethod();
    }, 500);
  });

  /* step 3: the screenshot */
  const file = el('input', { id: `proof-${ref}`, class: 'drop__input', type: 'file', name: 'file', accept: 'image/*', required: true });
  const preview = el('img', { class: 'drop__img', alt: 'Your payment screenshot', hidden: true });
  preview.addEventListener('error', () => { preview.hidden = true; }); // iPhone HEIC: no preview in some browsers, the upload still works
  const dropText = el('span', { class: 'drop__t' }, el('b', { text: 'Choose a screenshot or photo' }), el('span', { text: `From your gallery or camera. JPG or PNG, up to ${MAX_MB} MB.` }));
  const drop = el('label', { class: 'drop', for: `proof-${ref}` }, file, preview, dropText);
  const fileErr = el('p', { class: S.err, id: `proof-err-${ref}`, hidden: true });
  const amountIn = el('input', { id: `paid-${ref}`, class: 'input', name: 'amountPaid', type: 'text', inputmode: 'decimal', maxlength: 12, autocomplete: 'off' });
  const amountCur = el('span', { class: 'input-pre', 'aria-hidden': 'true', text: 'Rs' });
  const noteIn = el('input', { id: `note-${ref}`, class: 'input', name: 'note', type: 'text', maxlength: 300, autocomplete: 'off' });
  const status = el('p', { class: S.status, role: 'alert', hidden: true });
  const submit = el('button', { class: S.submit, type: 'submit', text: 'Send screenshot' });
  let url = '';
  file.addEventListener('change', () => {
    fileErr.hidden = true;
    file.removeAttribute('aria-invalid');
    const f = file.files?.[0];
    if (url) URL.revokeObjectURL(url);
    url = '';
    if (!f) { preview.hidden = true; drop.classList.remove('has-file'); return; }
    if (f.type && !/^image\//.test(f.type) && !/\.(heic|heif)$/i.test(f.name)) return badFile('Please choose a photo or screenshot (JPG or PNG).');
    if (f.size > MAX_MB * 1024 * 1024) return badFile(`This picture is too big. Please choose one under ${MAX_MB} MB.`);
    url = URL.createObjectURL(f);
    preview.src = url;
    preview.hidden = false;
    drop.classList.add('has-file');
    dropText.replaceChildren(el('b', { text: f.name.slice(0, 60) }), el('span', { text: 'Tap to choose a different picture.' }));
    return undefined;
  });
  function badFile(msg) {
    file.value = '';
    preview.hidden = true;
    drop.classList.remove('has-file');
    fileErr.textContent = msg;
    fileErr.hidden = false;
    file.setAttribute('aria-invalid', 'true');
    file.setAttribute('aria-describedby', fileErr.id);
  }
  const proof = el('form', { class: 'proof', novalidate: true, 'aria-labelledby': `proof-h-${ref}` },
    el('h4', { class: 'pay__label', id: `proof-h-${ref}`, text: '3. Send us the payment screenshot' }),
    drop, fileErr,
    el('div', { class: 'grid2' },
      el('div', { class: S.field }, el('label', { for: `paid-${ref}`, class: S.label, text: 'Amount you paid' }), el('div', { class: 'input-wrap' }, amountCur, amountIn)),
      el('div', { class: S.field }, el('label', { for: `note-${ref}`, class: S.label }, 'Note ', el('span', { class: 'opt', text: 'optional' })), noteIn)),
    submit, status);
  proof.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.hidden = true;
    const f = file.files?.[0];
    if (!f) { badFile('Please choose the screenshot of your payment.'); file.focus(); return; }
    const fd = new FormData();
    fd.append('file', f, f.name);
    fd.append('method', state.m.id);
    fd.append('amountPaid', amountIn.value.trim());
    fd.append('note', [noteIn.value.trim(), state.remark !== (info.remark || `Nimtto ${ref}`) ? `Remark used: ${state.remark}` : ''].filter(Boolean).join(' · ').slice(0, 300));
    submit.disabled = true;
    submit.textContent = 'Sending…';
    const r = await sendProof(ref, token, fd);
    submit.disabled = false;
    submit.textContent = 'Send screenshot';
    if (r.ok) { if (url) URL.revokeObjectURL(url); onSent(); return; }
    const msg = typeof r.data?.error === 'string' && r.data.error.length < 200 ? r.data.error : null;
    status.textContent = r.status === 409 ? (msg || 'This order cannot take another screenshot. Please message us on WhatsApp.')
      : r.status === 413 ? `This picture is too big. Please choose one under ${MAX_MB} MB.`
      : r.status === 415 ? 'We could not read this picture. Please send a JPG or PNG screenshot.'
        : r.status === 429 ? 'Too many tries. Please wait a few minutes and try again.'
          : r.status === 0 ? 'We could not reach the server. Check your connection and try again.'
            : msg || 'We could not send the screenshot just now. Please try again.';
    status.hidden = false;
  });

  // the dashboard is where they come back to: no "keep this link" there
  const later = S.inDashboard ? null : el('div', { class: 'pay__later' },
    el('p', { text: 'Want to pay later? Sign in with your email any time, or keep this link. Both bring you back to this page.' }),
    el('div', { class: 'pay__acts' },
      copyButton('Copy payment link', () => payLink(ref, token), S.chip),
      wa ? el('a', { class: S.chip, href: waLink(wa, `Hi Nimtto, I have a question about order ${ref}.`), target: '_blank', rel: 'noopener' }, icon(ICONS.wa), el('span', { text: 'Ask on WhatsApp' })) : null));

  const rejected = info.status === 'rejected'
    ? el('p', { class: S.status, role: 'alert' }, el('b', { text: 'We could not confirm your last payment. ' }), document.createTextNode(info.reason || 'Please check the amount and send a new screenshot, or message us on WhatsApp.'))
    : null;
  const ppBox = checkout ? checkoutBox(info, c, onSent) : null;
  const view = el('div', { class: 'pay' }, stepsLine(1), head, rejected, methodsBox, qrBox, ppBox?.el, proof, later);
  // the checkout method hides the QR and the screenshot form (PayPal confirms by itself)
  const swap = () => {
    const isCheckout = state.m.kind === 'checkout';
    qrBox.hidden = isCheckout;
    proof.hidden = isCheckout;
    if (ppBox) { ppBox.el.hidden = !isCheckout; if (isCheckout) ppBox.show(); }
  };
  radios.addEventListener('change', swap);
  if (state.m.kind !== 'checkout') showMethod();
  swap();
  return view;
}

/*
 * PayPal checkout, the way big shops show it: PayPal's own buttons ("PayPal" and "Debit or Credit Card"), the amount
 * in dollars, and a line on safety. Where the PayPal account has advanced card payments, PayPal's card fields
 * (paypal.CardFields, each field a PayPal frame) sit right in the section instead of the card button. The price and
 * the PayPal order are made by our server; after the customer approves, our server captures it with PayPal and
 * checks the amount, currency and order number before anything counts as paid. The page never decides that a
 * payment happened.
 */
let sdkLoad = null;
/** The PayPal JS SDK, loaded once per page (every later mount, and every re-render, reuses it). */
function loadSdk(cfg) {
  sdkLoad ||= new Promise((resolve, reject) => {
    if (window.paypalNimtto) { resolve(window.paypalNimtto); return; }
    const s = document.createElement('script');
    const q = new URLSearchParams({ 'client-id': cfg.clientId, currency: cfg.currency || 'USD', intent: 'capture', components: 'buttons,card-fields', 'enable-funding': 'card', 'disable-funding': 'venmo,paylater' });
    s.src = `https://www.paypal.com/sdk/js?${q}`;
    s.async = true;
    s.dataset.namespace = 'paypalNimtto';
    s.onload = () => (window.paypalNimtto ? resolve(window.paypalNimtto) : reject(new Error('PayPal did not load')));
    s.onerror = () => { sdkLoad = null; s.remove(); reject(new Error('PayPal did not load')); };
    document.head.append(s);
  });
  return sdkLoad;
}

/** PayPal's card fields when this account may use them (CardFields().isEligible()), else null: the card button. */
function cardFieldsFor(pp, opts) {
  try {
    if (typeof pp.CardFields !== 'function') return null;
    const cf = pp.CardFields(opts);
    return cf.isEligible() ? cf : null;
  } catch { return null; }
}

const CARD_STYLE = {
  input: { 'font-size': '16px', padding: '12px', color: '#111318' },
  '.invalid': { color: '#c02626' },
};

function checkoutBox(info, c, onPaid) {
  const { ref, token, csrf, S } = c;
  const buttons = el('div', { class: 'ppbox__buttons', id: `pp-${ref}` });
  const msg = el('p', { class: 'ppbox__msg', role: 'status', hidden: true });
  const testChip = el('span', { class: 'ppbox__test', hidden: true, text: 'Test mode: no real money' });
  const say = (text, bad = false) => { msg.textContent = text; msg.hidden = !text; msg.classList.toggle('is-bad', bad); };
  const f = (name) => el('div', { class: `ppcard__f ppcard__f--${name}` });
  const fName = f('name');
  const fNumber = f('number');
  const fExpiry = f('expiry');
  const fCvv = f('cvv');
  const cardPay = el('button', { class: S.submit, type: 'button', text: `Pay ${money(info.amount.usd, 'USD')} by card` });
  const card = el('div', { class: 'ppcard', hidden: true },
    el('p', { class: 'ppcard__or' }, el('span', { text: 'or pay by debit or credit card' })),
    fName, fNumber, el('div', { class: 'ppcard__row' }, fExpiry, fCvv), cardPay);
  const box = el('section', { class: 'ppbox', 'aria-labelledby': `pp-h-${ref}`, hidden: true },
    el('div', { class: 'ppbox__head' },
      el('h4', { class: 'pay__label', id: `pp-h-${ref}`, text: '2. Pay with PayPal or a card' }), testChip),
    el('p', { class: 'ppbox__amt' }, el('b', { text: money(info.amount.usd, 'USD') }), el('span', { text: ` ${info.plan?.name ? `· ${info.plan.name} plan` : ''}` })),
    buttons, card, msg,
    el('p', { class: 'ppbox__safe' }, icon(ICONS.check), el('span', { text: 'Secure checkout by PayPal. We never see your card number or PayPal password. Your plan switches on as soon as the payment goes through.' })),
    // the policies, next to the buttons (Terms, Privacy, Refunds)
    el('p', { class: 'ppbox__legal' }, document.createTextNode('By paying you agree to our '), el('a', { href: '/terms/', target: '_blank', rel: 'noopener', text: 'Terms' }),
      document.createTextNode(' and '), el('a', { href: '/refunds/', target: '_blank', rel: 'noopener', text: 'Refund policy' }), document.createTextNode('. '),
      el('a', { href: '/privacy/', target: '_blank', rel: 'noopener', text: 'Privacy' }), document.createTextNode('.')));

  // our server makes the PayPal order (priced from the plan) and captures it; `t` empty: the customer's session
  const startOrder = async (source) => {
    say('');
    const r = await paypalCall('order', { ref, t: token, ...(source ? { source } : {}) }, csrf);
    if (!r.ok) {
      if (r.data?.code === 'already_paid') { onPaid(); throw new Error('paid'); }
      say(r.data?.error || 'PayPal could not start just now. Please try again.', true);
      throw new Error('start failed');
    }
    return r.data.id;
  };
  const capture = async (orderID) => {
    say('Confirming your payment with PayPal…');
    const r = await paypalCall('capture', { ref, t: token, orderID }, csrf);
    if (r.data?.code === 'retry') { say(r.data.error || 'Please choose another way to pay.', true); return 'retry'; }
    if (!r.ok) { say(r.data?.error || 'We could not confirm the payment. If money left your account, message us on WhatsApp with your order number.', true); return 'failed'; }
    say('Payment received. Thank you!');
    onPaid();
    return 'paid';
  };

  let shown = false;
  const show = async () => {
    if (shown) return;
    shown = true;
    say('Loading PayPal…');
    try {
      const cfg = await paypalConfig();
      if (!cfg) throw new Error('off');
      testChip.hidden = cfg.env === 'live';
      const pp = await loadSdk(cfg);
      if (!buttons.isConnected) { shown = false; return; } // re-rendered meanwhile: the new view loads its own
      say('');
      const cf = cardFieldsFor(pp, {
        createOrder: () => startOrder('card'),
        onApprove: async (data) => { if ((await capture(data.orderID)) !== 'paid') cardPay.disabled = false; },
        onError: () => { cardPay.disabled = false; say('Your card could not be used. Please check the details, or pay with PayPal.', true); },
        style: CARD_STYLE,
      });
      await pp.Buttons({
        // with the card fields here, the PayPal button alone (no second card button)
        ...(cf ? { fundingSource: pp.FUNDING.PAYPAL } : {}),
        style: { layout: 'vertical', shape: 'pill', color: 'gold', label: 'pay', height: 48, tagline: false },
        createOrder: () => startOrder(),
        onApprove: async (data, actions) => ((await capture(data.orderID)) === 'retry' ? actions.restart() : undefined),
        onCancel: () => say('You closed PayPal. Nothing was paid. You can try again any time.'),
        onError: (err) => { if (String(err?.message) !== 'paid') say('PayPal had a problem. Please try again, or pay by QR.', true); },
      }).render(buttons);
      if (cf && card.isConnected) {
        try {
          await Promise.all([
            cf.NameField({ placeholder: 'Name on card' }).render(fName),
            cf.NumberField({ placeholder: 'Card number' }).render(fNumber),
            cf.ExpiryField({ placeholder: 'MM / YY' }).render(fExpiry),
            cf.CVVField({ placeholder: 'CVV' }).render(fCvv),
          ]);
          card.hidden = false;
          cardPay.addEventListener('click', () => {
            cardPay.disabled = true;
            say('Paying…');
            cf.submit().catch(() => { cardPay.disabled = false; say('Please check the card details (number, expiry date and CVV) and try again.', true); });
          });
        } catch { card.hidden = true; } // the PayPal button above still takes cards through PayPal's guest checkout
      }
    } catch {
      shown = false;
      say('PayPal could not load. Check your connection, or pay by QR, or message us on WhatsApp.', true);
    }
  };
  return { el: box, show };
}

function row(k, v, extra = null) {
  return el('div', { class: 'qr__row' }, el('dt', { text: k }), el('dd', {}, el('span', { text: v }), extra));
}

/* ---------------- step 4: sent, or confirmed ---------------- */
export function statusView(info, { ref, token, wa, S = SKINS.site }) {
  const done = isDone(info.status);
  const free = isFree(info.status);
  const closed = isClosed(info.status);
  const stuck = info.status === 'rejected';
  const m = info.methods.find((x) => x.id === info.proof?.method);
  const rows = [
    ['Order number', ref],
    info.plan?.name ? ['Plan', info.plan.name] : null,
    free ? ['Amount', 'Free, nothing to pay'] : info.paypal ? null : info.amount.npr != null ? ['Amount', money(info.amount.npr)] : null,
    m && !free && !info.paypal ? ['Paid with', m.label] : null,
    info.paypal ? ['Paid with', `PayPal${info.paypal.test ? ' (test)' : ''}`] : null,
    info.paypal?.amount ? ['Amount paid', `${info.paypal.currency} ${info.paypal.amount}`] : null,
    info.paypal?.transactionId ? ['PayPal transaction ID', info.paypal.transactionId] : null,
  ].filter(Boolean);
  return el('div', { class: 'paydone' },
    stepsLine(done ? 4 : 3),
    closed || stuck || S.inDashboard ? null : el('p', { class: 'paydone__ne', lang: 'ne', text: 'धन्यवाद' }),
    el('h3', { class: 'pay__title', text: info.paypal?.status === 'pending' && !done ? 'PayPal is checking your payment.' : free ? 'Nothing to pay. Your plan is active.' : done ? 'Payment received. Your plan is active.'
      : closed ? 'This order was refunded.' : stuck ? 'We could not confirm your payment.' : 'Payment sent. We will confirm soon.' }),
    el('p', { class: 'paydone__text', text: free
      ? 'This plan is on us. Your invitation is ready in your dashboard: add your names, dates, photos and music.'
      : done && S.inDashboard ? 'Thank you. Your invitation appears on this page as soon as it is ready: then add your names, dates, photos and music.'
      : done ? 'Thank you. Your invitation is ready in your dashboard: add your names, dates, photos and music. We are here on WhatsApp if you need help.'
      : closed ? 'Your money was sent back. If you have a question, please message us on WhatsApp.'
        : stuck ? (info.reason || 'Please message us on WhatsApp and we will sort it out with you.')
          : 'We check every payment by hand. When it is confirmed, we will message you on WhatsApp and start your invitation.' }),
    el('dl', { class: 'paydone__facts' }, rows.map(([k, v]) => el('div', {}, el('dt', { text: k }), el('dd', { text: v })))),
    el('div', { class: 'pay__acts' },
      done && !S.inDashboard ? el('a', { class: S.primary, href: '/studio/' }, el('span', { text: 'Open my dashboard' })) : null,
      wa ? el('a', { class: S.wa, href: waLink(wa, done ? `Hi Nimtto, this is about order ${ref}.` : `Hi Nimtto, I paid for order ${ref}.`), target: '_blank', rel: 'noopener' }, icon(ICONS.wa), el('span', { text: 'Message us on WhatsApp' })) : null,
      token ? copyButton('Copy link to this page', () => payLink(ref, token), S.chip) : null),
    token ? el('p', { class: 'paydone__fine' }, 'Keep this link to check your order later: ', el('a', { href: `/pay/${encodeURIComponent(ref)}?t=${encodeURIComponent(token)}`, text: `${location.host}/pay/${ref}` })) : null);
}
