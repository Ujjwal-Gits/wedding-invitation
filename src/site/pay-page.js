// /pay/<ref>: pay for an order, send the payment screenshot, or see its status. The signed-in customer who owns
// the order opens it with their session; /pay/<ref>?t=<token> (and /pay/?ref=<ref>&t=<token>) keeps working, and
// the token from this tab's order is used as a backup. The token stays out of the Referer (meta referrer).
// A signed-in customer opening their own order without a token in the link pays in their dashboard instead
// (/studio/account?pay=<ref>, the "Pay for your order" section); links with ?t= keep working here.
import './site.css';
import './intl.css';
import './pay.css';
import { $, el, initHeader, initAuth, applyContact, setYear, waLink } from './common.js';
import { loadSite, getPayment, REF_RE } from './api.js';
import { mountPayment } from './payment.js';

const TOKEN_RE = /^[A-Za-z0-9_-]{8,200}$/;
function readLink() {
  const q = new URLSearchParams(location.search);
  const parts = location.pathname.split('/').filter(Boolean); // ['pay', '<ref>']
  const ref = decodeURIComponent(parts[1] || q.get('ref') || '').trim();
  let token = (q.get('t') || '').trim();
  if (!TOKEN_RE.test(token)) {
    token = '';
    try { token = sessionStorage.getItem(`nimtto-pay-${ref}`) || ''; } catch { /* private mode */ }
    if (!TOKEN_RE.test(token)) token = '';
  }
  return { ref: REF_RE.test(ref) ? ref : '', token };
}

async function boot() {
  setYear();
  initHeader();
  const box = $('#pay-box');
  const { ref, token } = readLink();
  const [site, me] = await Promise.all([loadSite(), initAuth()]);
  const { wa } = applyContact(site.contact);
  if (!ref) {
    $('#pay-h').textContent = 'This link is not complete';
    box.replaceChildren(el('div', { class: 'pay__error' },
      el('p', { text: 'Please open the payment link from your order, or sign in to see your orders.' }),
      el('div', { class: 'pay__acts' },
        el('a', { class: 'btn btn--accent', href: '/studio/', text: me ? 'Open my dashboard' : 'Sign in' }),
        wa ? el('a', { class: 'btn btn--wa', href: waLink(wa, 'Hi Nimtto, I need the payment link for my order.'), target: '_blank', rel: 'noopener', text: 'Ask us on WhatsApp' }) : null)));
    return;
  }
  document.title = `Order ${ref} · Nimtto`;
  const linkToken = TOKEN_RE.test(new URLSearchParams(location.search).get('t') || '');
  if (me?.role === 'customer' && !linkToken) {
    // their own order (the session opens it): the dashboard's payment section
    const own = await getPayment(ref, '');
    if (own.ok) { location.replace(`/studio/account?pay=${encodeURIComponent(ref)}`); return; }
  }
  const info = await mountPayment(box, { ref, token, csrf: me?.csrf || '', wa, focus: false });
  // an order from the international site: its sage palette, words and home link (intl.css is scoped to .market-intl)
  if (info?.market === 'intl') {
    document.body.classList.add('market-intl');
    const lede = $('.paypage__head .lede');
    if (lede) lede.textContent = 'Pay once, by card or PayPal, in US dollars. Your plan switches on as soon as the payment goes through.';
    const home = $('.paybar .nav__logo');
    if (home) home.href = '/international/';
  }
  if (!info && !token && !me) {
    // not signed in and no token: this browser cannot open the order yet
    box.replaceChildren(el('div', { class: 'pay__error', role: 'alert' },
      el('h2', { class: 'pay__title pay__title--sm', text: 'Sign in to see this order' }),
      el('p', { text: `Order ${ref} belongs to an account. Sign in with the email and password you chose when you ordered.` }),
      el('div', { class: 'pay__acts' },
        el('a', { class: 'btn btn--accent', href: '/studio/', text: 'Sign in' }),
        wa ? el('a', { class: 'btn btn--wa', href: waLink(wa, `Hi Nimtto, I need help with order ${ref}.`), target: '_blank', rel: 'noopener', text: 'Ask us on WhatsApp' }) : null)));
    return;
  }
  if (info && (/proof|confirm|paid|refund|comped/i.test(info.status || '') || info.proof)) {
    $('#pay-h').textContent = `Order ${ref}`;
    $('.paypage__head .lede').textContent = 'Here is the latest about your order.';
  }
}
boot();
