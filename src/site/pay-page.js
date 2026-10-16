// /pay/<ref>?t=<token>: come back to an order to pay, send the payment screenshot, or see its status.
// Also accepts /pay/?ref=<ref>&t=<token>. The token is the order's secret: it stays out of the Referer header
// (meta referrer same-origin) and is never shown except in the customer's own "copy link" button.
import './site.css';
import { $, el, initHeader, applyContact, setYear, waLink } from './common.js';
import { loadSite, REF_RE } from './api.js';
import { mountPayment } from './payment.js';

function readLink() {
  const q = new URLSearchParams(location.search);
  const parts = location.pathname.split('/').filter(Boolean); // ['pay', '<ref>']
  const ref = decodeURIComponent(parts[1] || q.get('ref') || '').trim();
  const token = (q.get('t') || '').trim();
  return { ref: REF_RE.test(ref) ? ref : '', token: /^[A-Za-z0-9_-]{8,200}$/.test(token) ? token : '' };
}

async function boot() {
  setYear();
  initHeader();
  const box = $('#pay-box');
  const { ref, token } = readLink();
  const site = await loadSite();
  const { wa } = applyContact(site.contact);
  if (!ref || !token) {
    $('#pay-h').textContent = 'This link is not complete';
    box.replaceChildren(el('div', { class: 'pay__error' },
      el('p', { text: 'Please open the full link we sent you after your order. It has your order number and a code at the end.' }),
      el('div', { class: 'pay__acts' },
        wa ? el('a', { class: 'btn btn--wa', href: waLink(wa, 'Hi Nimtto, I need the payment link for my order.'), target: '_blank', rel: 'noopener', text: 'Ask us on WhatsApp' }) : null,
        el('a', { class: 'btn', href: '/#order', text: 'Make a new order' }))));
    return;
  }
  document.title = `Order ${ref} · Nimtto`;
  const info = await mountPayment(box, { ref, token, wa, focus: false });
  if (info && /proof|review|sent|confirm|paid/i.test(info.status || '') || info?.proof) {
    $('#pay-h').textContent = `Order ${ref}`;
    $('.paypage__head .lede').textContent = 'Here is the latest about your order.';
  }
}
boot();
