// The order form, in a dialog on every page (markup: src/site/partials.mjs `dialogs`). Minimal fields: plan, design
// (with pictures), name and WhatsApp. The order goes to the signed-in customer's account:
//  - signed in as a customer: "Ordering as <email>", no email or password asked
//  - not signed in: the account step comes first (src/site/signin.js: make an account, or sign in, in one dialog),
//    then this form opens with the choice the visitor made
//  - signed in as the planner (admin): the form explains that orders for customers are added in the studio, and does
//    not send (an order here would sign the planner out into a customer account)
// Tier-aware: a design above the chosen plan gets a one-tap upgrade. On success the browser goes to the separate
// payment page /pay/<ref>; the session cookie opens it, and the pay token is kept for this tab as a backup.
// POST /api/orders contract: docs/API.md (the server still takes email + password for an order, the old way).
// API text is written with textContent only.
import { $, $$, el, money, SLUG_RE, waLink, markSignedIn } from './common.js';
import { createOrder, REF_RE } from './api.js';
import { TIER_RANK, BY_SLUG, planForTier, tierName } from './themes.js';
import { openSignIn } from './signin.js';
import STILLS from './stills.json';

const dlg = $('#om');
const form = $('#om-form');
const F = form?.elements;
const S = { site: null, themes: [], me: null, meKnown: false, wa: '', opener: null, built: false, design: '', plan: '', busy: false };
const isCustom = (p) => p && (p.id === 'custom' || p.from);
const planOf = (id) => S.site?.plans.find((p) => p.id === id) || null;
const themeOf = (slug) => S.themes.find((t) => t.slug === slug) || BY_SLUG[slug] || null;
const fits = (plan, theme) => !theme || !plan || isCustom(plan) || (TIER_RANK[plan.includes] || 3) >= (TIER_RANK[theme.tier] || 2);
const mini = (slug) => (STILLS[slug] ? `/site/stills/${slug}-200.webp` : `/themes/${slug}/thumb.jpg`);
const tierLabel = (tier) => tierName(S.site?.plans, tier);
const role = () => S.me?.role || null;

/** Called by site.js with the page's data (any of these may arrive later). */
export function setOrderData({ site, themes, me, wa }) {
  if (site) S.site = site;
  if (themes) S.themes = themes;
  if (me !== undefined && !(S.meKnown && S.me && !me)) { S.me = me; S.meKnown = true; } // never forget a sign-in made here
  if (wa !== undefined) S.wa = wa;
  if (S.built) { buildPlans(); buildDesigns(); syncAccount(); sync(); }
}

/** Who is signed in, once: GET /api/auth/me?soft=1 (site.js usually has the answer already). */
async function whoAmI() {
  if (S.meKnown) return S.me;
  try {
    const r = await fetch('/api/auth/me?soft=1', { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' });
    const me = r.ok ? await r.json() : null;
    S.me = me && typeof me.role === 'string' ? me : null;
  } catch { S.me = null; }
  S.meKnown = true;
  return S.me;
}

/** The browser is now signed in (the account step): remember it here and on the page. */
function signedIn(me) {
  S.me = me;
  S.meKnown = true;
  markSignedIn();
  document.dispatchEvent(new CustomEvent('nimtto:me', { detail: me }));
}

function buildPlans() {
  const box = $('#om-plans');
  const plans = S.site.plans;
  if (!S.plan || !planOf(S.plan)) S.plan = (plans.find((p) => p.highlight) || plans[0])?.id || '';
  box.replaceChildren(...plans.map((p) => el('label', { class: 'om-plan' },
    el('input', { type: 'radio', name: 'plan', value: p.id, checked: p.id === S.plan }),
    el('span', { class: 'om-plan__box' },
      el('span', { class: 'om-plan__n', text: p.name }),
      el('span', { class: 'om-plan__p', text: p.price != null ? `${p.from ? 'from ' : ''}${money(p.price)}` : 'Ask for price' })))));
}

function buildDesigns() {
  const box = $('#om-designs');
  const item = (value, name, sub, picEl, extra = {}) => el('label', { class: 'om-d', 'data-slug': value || '' },
    el('input', { type: 'radio', name: 'design', value, checked: value === S.design, 'aria-label': `${name}${sub ? `, ${sub}` : ''}` }),
    el('span', { class: 'om-d__box' }, picEl, el('span', { class: 'om-d__n', text: name }), el('span', { class: 'om-d__t', text: sub, ...extra })));
  const later = item('', 'Decide later', 'any design', el('span', { class: 'om-d__later', 'aria-hidden': 'true', text: '?' }));
  const list = S.themes.map((t) => item(t.slug, t.name, tierLabel(t.tier),
    el('span', { class: 'phone' }, el('img', { src: mini(t.slug), alt: '', width: 200, height: 433, loading: 'lazy', decoding: 'async' }))));
  box.replaceChildren(later, ...list);
}

/** "Ordering as <email>" for a customer; the planner's note (and no sending) for an admin. */
function syncAccount() {
  const r = role();
  const note = $('#om-signed');
  note.hidden = r !== 'customer' && r !== 'admin';
  note.classList.toggle('om-signed--admin', r === 'admin');
  if (r === 'customer') {
    note.replaceChildren(document.createTextNode('Ordering as '), el('b', { text: S.me.email || S.me.name || 'you' }), document.createTextNode('. This order goes to your account.'));
    if (S.me.name && !F.name.value) F.name.value = S.me.name;
    if (S.me.phone && !F.phone.value) F.phone.value = S.me.phone;
  } else if (r === 'admin') {
    note.replaceChildren(document.createTextNode('You are signed in as the planner. Add orders for customers in the studio, under '),
      el('a', { href: '/studio/orders', text: 'Orders' }), document.createTextNode('. To order as a customer, sign out first.'));
  }
  $('#om-submit').disabled = r === 'admin';
}

/** Everything that depends on the plan and design: tier labels, the custom fields, the total. */
function sync() {
  const plan = planOf(S.plan);
  const custom = isCustom(plan);
  $('#om-design-sec').hidden = custom;
  $('#om-idea-sec').hidden = !custom;
  F.message.required = custom;
  // tier labels on each design: "Pro" when it fits, "Needs Pro" when it is above the plan (the planner's names)
  for (const lab of $$('.om-d[data-slug]', form)) {
    const t = themeOf(lab.dataset.slug);
    if (!t) continue;
    const ok = fits(plan, t);
    lab.classList.toggle('is-above', !ok);
    lab.querySelector('.om-d__t').textContent = ok ? tierLabel(t.tier) : `Needs ${tierLabel(t.tier)}`;
  }
  const note = $('#om-tier');
  const t = custom ? null : themeOf(S.design);
  if (t && !fits(plan, t)) {
    const up = planForTier(S.site.plans, t.tier);
    note.replaceChildren(el('span', { text: `${t.name} is in the ${tierLabel(t.tier)} plan and above.` }),
      up ? el('button', { type: 'button', class: 'btn btn--accent btn--sm', 'data-upgrade': up.id, text: `Switch to ${up.name} · ${money(up.price)}` }) : null);
    note.hidden = false;
  } else note.hidden = true;
  const total = $('#om-total');
  $('#om-total-l').textContent = plan ? `${plan.name} plan${custom ? ', starting price' : ''}` : 'Total';
  total.textContent = plan?.price != null ? `${plan.from ? 'from ' : ''}${money(plan.price)}${plan.priceUsd != null ? ` · $${plan.priceUsd}` : ''}` : 'We agree it with you';
  const btn = $('#om-submit');
  if (!S.busy) btn.textContent = plan?.price != null ? 'Continue to payment' : 'Send request';
  $('#om-title').textContent = custom ? 'Ask for a custom design' : 'Order your invitation';
}

function setPlan(id) {
  if (!planOf(id)) return;
  S.plan = id;
  const r = form.querySelector(`input[name="plan"][value="${CSS.escape(id)}"]`);
  if (r) r.checked = true;
  sync();
}
function setDesign(slug) {
  S.design = slug && themeOf(slug) ? slug : '';
  const r = form.querySelector(`input[name="design"][value="${CSS.escape(S.design)}"]`);
  if (r) {
    r.checked = true;
    const lab = r.closest('.om-d');
    if (lab && dlg.open) lab.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  sync();
}

/* ---------------- validation ---------------- */
function fieldError(name, msg) {
  const input = F[name];
  const err = $(`#om-${name}-err`);
  const bad = Boolean(msg);
  input.setAttribute('aria-invalid', String(bad));
  if (bad) input.setAttribute('aria-describedby', err.id); else input.removeAttribute('aria-describedby');
  if (bad && typeof msg === 'string') err.textContent = msg;
  err.hidden = !bad;
  return !bad;
}
function validate() {
  const custom = isCustom(planOf(S.plan));
  const phone = F.phone.value.trim();
  const ok = [
    fieldError('name', F.name.value.trim().length < 2),
    fieldError('phone', !/^[0-9+()\-\s]{6,20}$/.test(phone) || phone.replace(/\D/g, '').length < 7),
    fieldError('message', custom && F.message.value.trim().length < 3),
  ];
  return ok.every(Boolean);
}
function showError(msg, withWa = true) {
  const box = $('#om-err');
  box.replaceChildren(document.createTextNode(msg));
  if (withWa && S.wa) box.append(document.createTextNode(' You can also '), el('a', { href: waLink(S.wa, 'Hi Nimtto, I want to order an invitation.'), target: '_blank', rel: 'noopener', text: 'order on WhatsApp' }), document.createTextNode('.'));
  box.hidden = false;
}

/** The session ended while the form was open (or the cookie expired): sign in again, then come back here. */
function signInAgain() {
  S.me = null;
  dlg.close();
  openSignIn({ mode: 'in', note: 'Please sign in again to send your order.', done: (me) => { signedIn(me); reopen(); }, opener: S.opener });
}
function reopen() {
  syncAccount();
  sync();
  if (!dlg.open) dlg.showModal();
  document.documentElement.classList.add('is-locked');
  (form.querySelector('input[name="plan"]:checked') || F.name).focus({ preventScroll: true });
}

async function submit(e) {
  e.preventDefault();
  if (S.busy) return;
  $('#om-err').hidden = true;
  if (role() === 'admin') return; // the planner adds orders in the studio (see syncAccount)
  if (role() !== 'customer') { signInAgain(); return; }
  if (!validate()) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }
  const plan = planOf(S.plan);
  if (!plan) { showError('Please choose a plan.', false); return; }
  const custom = isCustom(plan);
  const t = custom ? null : themeOf(S.design);
  if (t && !fits(plan, t)) { const b = $('#om-tier button'); (b || $('#om-tier')).focus?.(); $('#om-tier').scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
  // no email or password: the server takes the signed-in customer's account (server/lib/orders.js `signedIn`)
  const body = { kind: custom ? 'custom' : 'order', plan: plan.id, name: F.name.value.trim(), phone: F.phone.value.trim(), website: F.website.value };
  if (t) body.theme = t.slug;
  if (custom) {
    const occ = F.occasion.options[F.occasion.selectedIndex]?.text || '';
    body.message = `Occasion: ${occ}. ${F.message.value.trim()}`.slice(0, 2000);
  }
  const btn = $('#om-submit');
  S.busy = true;
  btn.disabled = true;
  btn.textContent = 'Saving your order…';
  const r = await createOrder(body, S.site, S.me?.csrf);
  S.busy = false;
  btn.disabled = false;
  sync();
  if (r.ok) {
    const ref = typeof r.data.ref === 'string' && REF_RE.test(r.data.ref) ? r.data.ref : '';
    const token = typeof r.data.payToken === 'string' && /^[A-Za-z0-9_-]{8,200}$/.test(r.data.payToken) ? r.data.payToken : '';
    if (!ref) { showError('Thank you. We have your request and will message you on WhatsApp.', false); return; }
    try { if (token) sessionStorage.setItem(`nimtto-pay-${ref}`, token); } catch { /* private mode: the session cookie still opens it */ }
    btn.disabled = true;
    btn.textContent = 'Opening the payment page…';
    location.assign(`/pay/${encodeURIComponent(ref)}`);
    return;
  }
  const d = r.data || {};
  // the server asked for an email and password: this browser is no longer signed in
  if (r.status === 400 && Array.isArray(d.fields) && d.fields.some((f) => f === 'email' || f === 'password')) { signInAgain(); return; }
  if (r.status === 400 && d.code === 'tier') {
    const needs = TIER_RANK[d.needs] ? d.needs : (t?.tier || 'shubha');
    const up = planForTier(S.site.plans, needs);
    if (up) { setPlan(up.id); $('#om-tier').hidden = false; $('#om-tier').replaceChildren(el('span', { text: `${t?.name || 'This design'} needs the ${tierLabel(needs)} plan, so we picked ${up.name} for you (${money(up.price)}). Press continue when you are ready.` })); $('#om-tier').scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
  }
  if (r.status === 403) { showError(typeof d.error === 'string' && d.error.length < 200 ? d.error : 'We could not use this account. Please message us on WhatsApp.'); return; }
  const bad = r.status === 400 && Array.isArray(d.fields) ? d.fields.filter((f) => ['name', 'phone', 'message'].includes(f)) : [];
  if (r.status === 429) showError('Too many tries from this connection. Please wait a few minutes and try again.');
  else if (bad.length) {
    bad.forEach((f) => fieldError(f, true));
    form.querySelector('[aria-invalid="true"]')?.focus();
    showError(typeof d.error === 'string' && d.error.length < 200 ? d.error : 'Please check the fields in red.', false);
  } else if (r.status === 400) showError(typeof d.error === 'string' && d.error.length < 200 ? d.error : 'Please check the form and try again.');
  else if (r.status === 0) showError('We could not reach the server. Check your connection and try again.');
  else showError('We could not save your order just now. Please try again in a moment.');
}

function build() {
  if (S.built || !form) return;
  S.built = true;
  buildPlans();
  buildDesigns();
  syncAccount();
  form.addEventListener('change', (e) => {
    const n = e.target;
    if (n.name === 'plan') { S.plan = n.value; sync(); }
    if (n.name === 'design') { S.design = n.value; sync(); }
  });
  form.addEventListener('click', (e) => {
    const up = e.target.closest('[data-upgrade]');
    if (up) { setPlan(up.dataset.upgrade); form.querySelector(`input[name="plan"][value="${CSS.escape(up.dataset.upgrade)}"]`)?.focus(); }
  });
  for (const name of ['name', 'phone', 'message']) {
    F[name].addEventListener('input', () => { if (F[name].getAttribute('aria-invalid') === 'true') validate(); });
  }
  form.addEventListener('submit', submit);
  $('#om-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => {
    if ($('#oa')?.open) return; // on to the account step: it keeps the page locked
    document.documentElement.classList.remove('is-locked');
    S.opener?.focus?.({ preventScroll: true });
  });
}

/** The order form itself, with the choice made (plan id, design slug, occasion id). */
function show({ plan = '', design = '', occasion = '' }) {
  build();
  const designOk = SLUG_RE.test(design || '') && themeOf(design);
  if (plan && planOf(plan)) setPlan(plan);
  else if (designOk) {
    const t = themeOf(design);
    if (!fits(planOf(S.plan), t)) setPlan(planForTier(S.site.plans, t.tier)?.id || S.plan);
  }
  if (designOk) setDesign(design);
  if (occasion && F.occasion.querySelector(`option[value="${CSS.escape(occasion)}"]`)) F.occasion.value = occasion;
  syncAccount();
  sync();
  $('#om-err').hidden = true;
  if (!dlg.open) dlg.showModal();
  document.documentElement.classList.add('is-locked');
  (form.querySelector('input[name="plan"]:checked') || F.name).focus({ preventScroll: true });
  if (designOk) form.querySelector(`.om-d[data-slug="${CSS.escape(design)}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
}

/**
 * Opens the order form. Options: plan id, design slug, occasion id, opener (focus returns there).
 * Not signed in: the account step first (make an account or sign in), then straight into the form.
 */
export async function openOrder({ plan = '', design = '', occasion = '', opener = null } = {}) {
  if (!dlg || !S.site) return false;
  S.opener = opener || document.activeElement;
  const r = (await whoAmI())?.role;
  if (r === 'customer' || r === 'admin') { show({ plan, design, occasion }); return true; }
  return openSignIn({ opener: S.opener, done: (me) => { signedIn(me); show({ plan, design, occasion }); } });
}
