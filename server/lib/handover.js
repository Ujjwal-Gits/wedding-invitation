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
import { withLock, getInvitation, saveInvitation, listOrders, getOrderById, saveOrder, SLUG_RE } from './store.js';
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
  let customer = (order?.customerId && !customerEmail ? getCustomer(order.customerId) : null) || (email ? customerByEmail(email) : null);
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
  const slug = typeof req.body?.slug === 'string' && SLUG_RE.test(req.body.slug) ? req.body.slug : await freeSlug(order);
  const doc = await createInvitationDoc({
    slug, bride: order.bride || '', groom: order.groom || '', theme: order.theme,
    weddingDate: DATE_RE.test(order.weddingDate || '') ? order.weddingDate : '', venue: order.venue || '',
  });
  if (order.invitation) await withLock('orders', async () => { const o = await getOrderById(order.id); if (o) { delete o.invitation; await saveOrder(o); } });
  const customer = await afterCreate(doc, { order: order.id });
  console.info(`[admin] invitation ${slug} created from order ${order.ref || order.id}`);
  res.status(201).json({ ...docOut(doc), ...(customer ? { customer } : {}) });
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

