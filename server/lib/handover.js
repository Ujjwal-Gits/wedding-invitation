// Handing an invitation to its customer (docs/API.md "Customer accounts" › "Invitations for an account").
// The default path: the owner makes the invitation for the customer's email (New invitation, or one click from the
// order) and it appears in that account's dashboard. No separate link or second password. An email with no account
// yet gets a pending link that the owner confirms once an account with that email exists (never automatic: emails are
// not verified; lib/accounts.js). An order's own invitation links to the account the order was made from (safe).
// The wedding details a customer gives (when ordering, or later in their dashboard) fill the invitation's fields that
// are still empty (or still the demo's words): names, the date, the venue. Never a field the couple changed.
import { createInvitationDoc, setOnCreated, docOut } from './invitations.js';
import { customerByEmail, getCustomer, linkInvitation, addPending, linkOf, normEmail } from './accounts.js';
import { readSite, tierOf, planIncludes, TIER_RANK } from './site.js';
import { listThemes } from './catalog.js';
import { withLock, getInvitation, saveInvitation, listOrders, getOrderById, getOrderByRef, saveOrder, SLUG_RE } from './store.js';
import { onActivate } from './activation.js';
import { payStatusOf } from './finance.js';
import { sendMail, MAIL_ON } from './mail.js';
import { PUBLIC_ORIGINS } from './env.js';
import { emptyOrDemo } from './demo.js';
import { startingWords } from '../../src/core/faith.js';
import { config as demo } from '../../src/config.js';

const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The permissions a customer's own invitation starts with: they may switch designs, within the designs their plan
 * includes (all designs for a custom plan or when no plan is known), and change colours.
 */
export async function defaultPerms(order) {
  const site = await readSite();
  const plan = order?.plan ? site.plans.find((p) => p.id === order.plan) : null;
  if (!plan) return { themes: 'all', canChangeTheme: true, canChangeColors: true };
  const top = TIER_RANK[planIncludes(plan, site.plans)] || 1;
  const themes = listThemes().filter((t) => t.ready && (TIER_RANK[tierOf(t.slug, site)] || 2) <= top).map((t) => t.slug);
  return { themes: top >= 3 ? 'all' : themes, canChangeTheme: true, canChangeColors: true };
}

/** The customer's newest order (with an account), or null. */
const latestOrderOf = async (cid) => (await listOrders()).filter((o) => o.customerId === cid)
  .sort((a, b) => String(b.at).localeCompare(String(a.at)))[0] || null;

/**
 * After an invitation is created: link it to the customer (by email, or the order's account), else keep a pending
 * link for the email. order: an order id (its invitation field is set). Returns what happened, for the admin.
 */
async function afterCreate(doc, { customerEmail = '', order: orderId = '' } = {}) {
  const order = orderId ? await getOrderById(orderId) : null;
  if (order) {
    await withLock('orders', async () => {
      const o = await getOrderById(order.id);
      if (o && !o.invitation) { o.invitation = doc.slug; await saveOrder(o); }
    });
  }
  const email = normEmail(customerEmail || order?.email || '');
  // The account that placed the order, or an account whose email is confirmed. Anyone can sign up with any email, so
  // an unconfirmed account by email alone only gets a pending link the planner confirms (Link now).
  const byOrder = order?.customerId && !customerEmail ? getCustomer(order.customerId) : null;
  const byEmail = !byOrder && email ? customerByEmail(email) : null;
  let customer = byOrder || (byEmail?.emailVerified === true ? byEmail : null);
  if (!customer && !email) return null;
  const perms = await defaultPerms(order || (customer ? await latestOrderOf(customer.id) : null));
  if (customer) {
    customer = await linkInvitation(customer.id, doc.slug, perms);
    console.info(`[admin] invitation ${doc.slug} linked to customer ${customer.id}`);
    return { email: customer.email, name: customer.name || '', linked: true, pending: false };
  }
  await addPending(email, doc.slug, perms);
  console.info(`[admin] invitation ${doc.slug} waits for an account (pending link)`);
  return { email, linked: false, pending: true };
}
setOnCreated(afterCreate);

const slugify = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 56);

/** A free link name from the names (or the order reference). */
async function freeSlug(order) {
  const base = slugify(`${order.bride || ''} ${order.groom || ''}`) || slugify(order.ref || '') || `invitation-${Date.now().toString(36)}`;
  const root = base.length >= 3 ? base : `${base}-wedding`;
  for (let i = 1; i < 50; i++) {
    const s = i === 1 ? root : `${root}-${i}`;
    if (SLUG_RE.test(s) && !(await getInvitation(s))) return s;
  }
  return `${root}-${Date.now().toString(36)}`.slice(0, 64);
}

/**
 * POST /api/orders/:id/invitation (admin): one click makes the order's invitation, filled with the order's names,
 * design and wedding details (empty where the order has none), and links it to the order's customer.
 * 409 { slug } when the order already has one.
 */
export async function createForOrder(req, res) {
  const order = await getOrderById(String(req.params.id || ''));
  if (!order) throw httpError(404, 'Order not found.');
  if (order.invitation && (await getInvitation(order.invitation))) throw httpError(409, 'This order already has an invitation.', { current: order.invitation });
  const { doc, customer } = await invitationForOrder(order, typeof req.body?.slug === 'string' && SLUG_RE.test(req.body.slug) ? req.body.slug : '');
  console.info(`[admin] invitation ${doc.slug} created from order ${order.ref || order.id}`);
  res.status(201).json({ ...docOut(doc), ...(customer ? { customer } : {}) });
}

/** Makes the order's invitation (names, design, wedding details) and links it to the order's customer. */
async function invitationForOrder(order, wanted = '') {
  const slug = wanted || await freeSlug(order);
  const doc = await createInvitationDoc({
    slug, bride: order.bride || '', groom: order.groom || '', theme: order.theme,
    weddingDate: DATE_RE.test(order.weddingDate || '') ? order.weddingDate : '', venue: order.venue || '',
  });
  if (order.invitation) await withLock('orders', async () => { const o = await getOrderById(order.id); if (o) { delete o.invitation; await saveOrder(o); } });
  const customer = await afterCreate(doc, { order: order.id });
  return { doc, customer };
}

/** A higher plan opens more designs: the linked invitation's design list grows to what the plan includes (never shrinks). */
export async function widenAccess(order) {
  if (!order.invitation || !order.customerId) return;
  try {
    const c = getCustomer(order.customerId);
    const l = linkOf(c, order.invitation);
    if (!l || l.themes === 'all') return;
    const perms = await defaultPerms(order);
    const themes = perms.themes === 'all' ? 'all' : [...new Set([...(Array.isArray(l.themes) ? l.themes : []), ...perms.themes])];
    if (themes === 'all' || themes.length !== l.themes.length) await linkInvitation(c.id, order.invitation, { themes });
  } catch (err) {
    console.warn(`[activate] could not widen design access for ${order.ref || order.id}: ${err.message}`);
  }
}

const isOn = (o) => o.pay?.status === 'comped' || payStatusOf(o) === 'confirmed' || o.payment?.status === 'paid';

/**
 * Switches on a paid (or free) order's plan by itself: its invitation is made and linked to the account that ordered
 * (or, when it already has one, its design list grows to the plan), and the customer gets one "it is ready" email.
 * Orders without an account are left to the planner. Safe to call twice (capture and webhook both call it).
 */
async function activateOrder(key, why) {
  return withLock(`activate:${key}`, async () => {
    const order = (await getOrderById(key)) || (await getOrderByRef(key));
    if (!order || !order.customerId || !isOn(order)) return;
    const c = getCustomer(order.customerId);
    if (!c || c.disabled === true) return;
    let made = null;
    if (order.invitation && (await getInvitation(order.invitation))) await widenAccess(order);
    else made = (await invitationForOrder(order)).doc;
    const first = !order.activatedAt;
    await withLock('orders', async () => {
      const o = await getOrderById(order.id);
      if (!o) return;
      if (!o.activatedAt) o.activatedAt = new Date().toISOString();
      o.activatedBy = why;
      await saveOrder(o);
    });
    console.info(`[activate] order ${order.ref || order.id} (${why}): ${made ? `invitation ${made.slug} made and linked` : 'plan applied'}`);
    if (first && MAIL_ON) await sendMail({ to: c.email, name: c.name, tag: 'plan-active', ...activeEmail(c, order, why) }).catch(() => false);
  });
}
onActivate(activateOrder);

/**
 * Catch-up, once after start: a paid (or free) order of the last 30 days with an account but no invitation and no
 * activation (the server restarted mid-way, or activation failed) is switched on now. Older orders are left alone.
 */
export async function activateMissed() {
  const since = Date.now() - 30 * 864e5;
  const missed = (await listOrders()).filter((o) => o.customerId && !o.activatedAt && !o.invitation && isOn(o) && Date.parse(o.at) > since);
  for (const o of missed) await activateOrder(o.id, 'catch-up').catch((err) => console.warn(`[activate] catch-up ${o.ref || o.id}: ${err.message}`));
  if (missed.length) console.info(`[activate] caught up ${missed.length} paid order(s)`);
}

const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
/** "Your plan is active": one button to the dashboard. */
function activeEmail(c, order, why) {
  const url = `${PUBLIC_ORIGINS[0] || 'https://nimtto.com'}/studio/`;
  const hi = c.name ? `Namaste ${c.name.split(' ')[0]},` : 'Namaste,';
  const lead = why === 'free' ? 'Your plan is now active.' : 'We received your payment, thank you. Your plan is now active.';
  const body = 'Your invitation is ready in your dashboard: change the names, dates, photos and music, then share one link.';
  const text = `${hi}\n\n${lead} ${body}\n\nOpen your dashboard: ${url}\n\nOrder ${order.ref || ''}\nNimtto · nimtto.com`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Helvetica,Arial,sans-serif;color:#16181d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;padding:32px">
<tr><td style="font-size:20px;font-weight:600;color:#b3122f;padding-bottom:20px">Nimtto</td></tr>
<tr><td style="font-size:16px;line-height:1.6">${esc(hi)}<br><br>${esc(lead)} ${esc(body)}</td></tr>
<tr><td style="padding:24px 0"><a href="${esc(url)}" style="display:inline-block;background:#b3122f;color:#fff;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:10px">Open my dashboard</a></td></tr>
<tr><td style="font-size:13px;color:#5b606b">Order ${esc(order.ref || '')}</td></tr>
</table><p style="font-size:12px;color:#8a8f99">Nimtto · Online invitations · nimtto.com</p></td></tr></table></body></html>`;
  return { subject: why === 'free' ? 'Your Nimtto plan is active' : 'Payment received: your Nimtto plan is active', text, html };
}

/** Shifts an ISO date-time (with its offset) by whole days. */
const shiftDays = (iso, days) => {
  const m = /^(\d{4}-\d{2}-\d{2})(T.*)$/.exec(String(iso || ''));
  if (!m) return iso;
  const t = new Date(`${m[1]}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return `${t.toISOString().slice(0, 10)}${m[2]}`;
};
const dayDiff = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 864e5);

/**
 * Fills the invitation's still-empty (or still-demo) fields from the customer's wedding details
 * { bride, groom, weddingDate (YYYY-MM-DD), venue }. Returns the paths it changed.
 */
export async function fillDetails(slug, details = {}) {
  const bride = typeof details.bride === 'string' ? details.bride.trim().slice(0, 60) : '';
  const groom = typeof details.groom === 'string' ? details.groom.trim().slice(0, 60) : '';
  const venue = typeof details.venue === 'string' ? details.venue.trim().slice(0, 200) : '';
  const day = DATE_RE.test(details.weddingDate || '') ? details.weddingDate : '';
  if (!bride && !groom && !venue && !day) return [];
  return withLock(`inv:${slug}`, async () => {
    const doc = await getInvitation(slug);
    if (!doc) return [];
    const d = doc.draft;
    const changed = [];
    if (bride && emptyOrDemo(d.couple.bride.name, 'name')) { d.couple.bride.name = { en: bride, ne: '' }; changed.push('couple.bride.name'); }
    if (groom && emptyOrDemo(d.couple.groom.name, 'name')) { d.couple.groom.name = { en: groom, ne: '' }; changed.push('couple.groom.name'); }
    const placeholder = doc.placeholder?.weddingDate;
    if (day && (!d.weddingDate || d.weddingDate === placeholder || d.weddingDate === demo.weddingDate)) {
      const was = String(d.weddingDate || '').slice(0, 10);
      const time = /T.*$/.exec(d.weddingDate || '')?.[0] || 'T10:30:00+05:45';
      d.weddingDate = `${day}${time}`;
      // the ceremonies were dated around the placeholder: move them by the same number of days (times kept)
      if (was) {
        const delta = dayDiff(day, was);
        if (delta) for (const e of d.events) { if (e.start) e.start = shiftDays(e.start, delta); if (e.end) e.end = shiftDays(e.end, delta); }
      }
      delete doc.placeholder;
      changed.push('weddingDate');
    }
    if (venue) {
      const wd = String(d.weddingDate).slice(0, 10);
      d.events.forEach((e, i) => {
        if (String(e.start).slice(0, 10) === wd && emptyOrDemo(e.venue, 'venue')) { e.venue = { en: venue, ne: '' }; changed.push(`events[${i}].venue`); }
      });
    }
    // Words that come from the names, when they were left empty for want of names.
    const b = d.couple.bride.name.en || d.couple.bride.name.ne;
    const g = d.couple.groom.name.en || d.couple.groom.name.ne;
    if (b && g && changed.some((p) => p.endsWith('.name'))) {
      const words = startingWords(d.religion || 'hindu', { bride: b, groom: g });
      if (!d.invitation.body.en && !d.invitation.body.ne) { d.invitation.body = { ...words.body }; changed.push('invitation.body'); }
      if (!d.hosts.en && !d.hosts.ne) { d.hosts = { en: `The families of ${b} & ${g}`, ne: '' }; changed.push('hosts'); }
      if (!d.couple.hashtag) { d.couple.hashtag = `#${b.replace(/\s+/g, '')}Weds${g.replace(/\s+/g, '')}`; changed.push('couple.hashtag'); }
      if (!d.share.title) { d.share.title = `${b} & ${g} · ${words.title.en}`; changed.push('share.title'); }
    }
    if (!changed.length) return changed;
    doc.version += 1;
    doc.updatedAt = new Date().toISOString();
    await saveInvitation(doc);
    console.info(`[account] ${slug} filled from wedding details: ${changed.join(', ')}`);
    return changed;
  });
}

/**
 * The invitations an order's wedding details belong to: the order's own invitation when the customer has it, else the
 * customer's only invitation (with several and no order link, none: the owner decides).
 */
export function invitationsForOrder(customer, order) {
  const links = customer?.invitations || [];
  if (order?.invitation) return linkOf(customer, order.invitation) ? [order.invitation] : [];
  return links.length === 1 ? [links[0].slug] : [];
}

/** After the customer saved wedding details on an order: fill the linked invitation's empty fields. */
export async function syncOrderDetails(customer, order) {
  const out = [];
  for (const slug of invitationsForOrder(customer, order)) out.push(...await fillDetails(slug, order));
  return out;
}

/** After the owner links an invitation to an account: prefill it from the customer's newest order with details. */
export async function prefillFromCustomer(customerId, slug) {
  const orders = (await listOrders()).filter((o) => o.customerId === customerId && (o.invitation === slug || !o.invitation))
    .sort((a, b) => (a.invitation === slug) - (b.invitation === slug) || String(a.at).localeCompare(String(b.at)));
  const o = orders.filter((x) => x.bride || x.groom || x.weddingDate || x.venue).at(-1);
  return o ? fillDetails(slug, o) : [];
}

