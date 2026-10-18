// "Request a change": a couple asks staff to change a locked name or the wedding date (the event lock,
// src/core/event-lock.js). Kept as one small document in the store ('change-requests' = { items: [...] }).
// A request = { id, slug, customerId, customerEmail, customerName, field, label, old, value, reason,
//   status: 'open' | 'approved' | 'declined', createdAt, decidedAt?, decidedBy?, note? }.
// Couples: POST/GET /api/invitations/:slug/change-requests (their own invitation only; at most 3 open per invitation,
// and a few an hour). Staff ('orders' or 'invitations'): GET /api/admin/change-requests, POST .../:id/approve
// (applies it to the draft, the published invitation and the lock) and .../:id/decline { note }. Every staff action
// is in the audit log (lib/audit.js). Staff get an email for each new request (ADMIN_EMAIL), the customer one for
// each decision.
import { randomBytes } from 'node:crypto';
import { getDoc, putDoc, withLock, peekInvitation } from './store.js';
import { isAdmin } from './auth.js';
import { getCustomer } from './accounts.js';
import { rateLimiter } from './security.js';
import { sendMail, MAIL_ON } from './mail.js';
import { ADMIN_EMAIL, PUBLIC_ORIGINS } from './env.js';
import { applyLockedChange, lockOut } from './invitations.js';
import { isNameKey, DATE_KEY, labelOf, valueAt, dayOf } from '../../src/core/event-lock.js';

const KEY = 'change-requests';
const KEEP = 2000; // decided requests beyond this many go (the oldest first); open ones always stay
export const MAX_OPEN = 3;
export const REQUEST_ID_RE = /^[A-Za-z0-9_-]{12}$/;
const limiter = rateLimiter({ windowMs: 60 * 60 * 1000, max: 6 }); // new requests per invitation per hour

const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const text = (v, max) => (typeof v === 'string' ? v.normalize('NFC').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max) : '');
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

async function readAll() {
  const v = (await getDoc(KEY))?.value;
  return Array.isArray(v?.items) ? v.items : [];
}
/** Runs fn(items) under the requests lock and stores the list it leaves. Returns fn's result. */
function mutate(fn) {
  return withLock('change-requests:list', async () => {
    const items = await readAll();
    const out = await fn(items);
    const open = items.filter((x) => x.status === 'open');
    const done = items.filter((x) => x.status !== 'open').slice(-KEEP);
    await putDoc(KEY, { items: [...open, ...done].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))) });
    return out;
  });
}

/** What a couple sees of a request (no other customer's details). */
const mine = (x) => ({ id: x.id, field: x.field, label: x.label, old: x.old, value: x.value, reason: x.reason, status: x.status, createdAt: x.createdAt, decidedAt: x.decidedAt || null, note: x.note || '' });

/** The requests of one invitation, newest first (the customer's dashboard and editor). */
export async function requestsFor(slug) {
  return (await readAll()).filter((x) => x.slug === slug).reverse().map(mine);
}

/** POST /api/invitations/:slug/change-requests { field, value, reason } (the couple; requireEditor). */
export async function create(req, res) {
  const { slug } = req.params;
  if (isAdmin(req)) throw httpError(400, 'Staff can change the names and the date directly in the editor.');
  const b = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const field = typeof b.field === 'string' ? b.field : '';
  const errors = [];
  if (!isNameKey(field) && field !== DATE_KEY) errors.push({ path: 'field', message: 'choose a name or the wedding date' });
  let value = '';
  if (field === DATE_KEY) {
    value = typeof b.value === 'string' ? b.value.trim() : '';
    if (!DAY_RE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) errors.push({ path: 'value', message: 'must be a date' });
  } else {
    value = text(b.value, 240);
    if (!value) errors.push({ path: 'value', message: 'is required' });
  }
  const reason = text(b.reason, 500);
  if (reason.length < 3) errors.push({ path: 'reason', message: 'please tell us why' });
  if (errors.length) throw httpError(400, 'Please check the request.', { errors });
  const doc = await peekInvitation(slug);
  if (!doc) throw httpError(404, 'No invitation with that link name.');
  if (!doc.lock) throw httpError(400, 'Nothing is locked yet: you can change the names and the date in the editor until you publish.');
  const old = field === DATE_KEY ? doc.lock.date || dayOf(doc.draft.weddingDate) : doc.lock.names?.[field] || valueAt(doc.draft, field);
  if (old === value) throw httpError(400, 'That is already the current value.', { errors: [{ path: 'value', message: 'is the same as now' }] });
  const lim = limiter.peek(slug);
  if (!lim.ok) { res.set('Retry-After', String(lim.retryAfter)); throw httpError(429, 'Too many requests for this invitation. Please wait a little and try again.'); }
  const c = req.session?.role === 'customer' ? req.customer : null;
  const item = await mutate((items) => {
    if (items.filter((x) => x.slug === slug && x.status === 'open').length >= MAX_OPEN) {
      throw httpError(409, `You already have ${MAX_OPEN} requests waiting. We will answer those first.`, { code: 'too_many' });
    }
    const x = {
      id: randomBytes(9).toString('base64url'), slug, customerId: c?.id || null, customerEmail: c?.email || null, customerName: c?.name || '',
      field, label: labelOf(field), old, value, reason, status: 'open', createdAt: new Date().toISOString(),
    };
    items.push(x);
    return x;
  });
  limiter.hit(slug);
  console.info(`[change-request] new id=${item.id} slug=${slug} field=${field}`);
  if (MAIL_ON && ADMIN_EMAIL) sendMail({ to: ADMIN_EMAIL, tag: 'change-request', ...staffEmail(item) }).catch(() => false);
  res.status(201).json({ request: mine(item) });
}

/** GET /api/invitations/:slug/change-requests (the couple, or staff with 'invitations'). */
export async function listForInvitation(req, res) {
  const doc = await peekInvitation(req.params.slug);
  if (!doc) throw httpError(404, 'No invitation with that link name.');
  res.json({ requests: await requestsFor(req.params.slug), lock: lockOut(doc) });
}

/** GET /api/admin/change-requests: every request, open ones first, then newest first; `open` is the badge count. */
export async function adminList(req, res) {
  const items = (await readAll()).slice().reverse();
  const out = [...items.filter((x) => x.status === 'open'), ...items.filter((x) => x.status !== 'open')];
  res.json({ requests: out, open: out.filter((x) => x.status === 'open').length });
}

const byOf = (req) => (req.admin?.owner ? 'owner' : req.admin?.email || 'admin');

async function decide(req, status, note = '') {
  const id = req.params.reqId ?? req.params.id;
  if (!REQUEST_ID_RE.test(id)) throw httpError(404, 'No such request.');
  return mutate(async (items) => {
    const x = items.find((r) => r.id === id);
    if (!x) throw httpError(404, 'No such request.');
    if (x.status !== 'open') throw httpError(409, `This request was already ${x.status}.`, { code: 'decided' });
    if (status === 'approved') {
      if (!(await peekInvitation(x.slug))) throw httpError(404, 'That invitation was deleted.');
      await applyLockedChange(x.slug, x.field, x.value, 'admin');
    }
    x.status = status;
    x.decidedAt = new Date().toISOString();
    x.decidedBy = byOf(req);
    if (note) x.note = note;
    return { ...x };
  });
}

/** POST /api/admin/change-requests/:id/approve: the change goes onto the invitation and its lock. */
export async function approve(req, res) {
  const x = await decide(req, 'approved');
  console.info(`[change-request] approved id=${x.id} slug=${x.slug} by=${x.decidedBy}`);
  tellCustomer(x);
  res.json({ request: x });
}

/** POST /api/admin/change-requests/:id/decline { note? }. */
export async function decline(req, res) {
  const note = text(req.body?.note, 500);
  const x = await decide(req, 'declined', note);
  console.info(`[change-request] declined id=${x.id} slug=${x.slug} by=${x.decidedBy}`);
  tellCustomer(x);
  res.json({ request: x });
}

function tellCustomer(x) {
  const c = x.customerId ? getCustomer(x.customerId) : null;
  if (!MAIL_ON || !c?.email) return;
  sendMail({ to: c.email, name: c.name || '', tag: 'change-request-decision', ...customerEmail(x, c) }).catch(() => false);
}

const studioUrl = (path = '') => `${PUBLIC_ORIGINS[0] || ''}/studio/${path}`;

function frame(body) {
  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Helvetica,Arial,sans-serif;color:#16181d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;padding:32px">
<tr><td style="font-size:20px;font-weight:600;color:#b3122f;padding-bottom:20px">Nimtto</td></tr>
<tr><td style="font-size:15px;line-height:1.6">${body}</td></tr>
</table><p style="font-size:12px;color:#8a8f99">Nimtto · Online invitations · nimtto.com</p></td></tr></table></body></html>`;
}

function staffEmail(x) {
  const who = x.customerEmail ? `${x.customerName || x.customerEmail} (${x.customerEmail})` : 'The couple (link without an account)';
  const subject = `Change request: ${x.label} on ${x.slug}`;
  const textBody = `${who} asks to change a locked field on the invitation ${x.slug}.\n\n${x.label}: ${x.old || '(empty)'} -> ${x.value}\nReason: ${x.reason}\n\nApprove or decline it in the studio: ${studioUrl('#/requests')}`;
  const html = frame(`${esc(who)} asks to change a locked field on <b>${esc(x.slug)}</b>.<br><br><b>${esc(x.label)}</b>: ${esc(x.old || '(empty)')} &rarr; ${esc(x.value)}<br>Reason: ${esc(x.reason)}<br><br><a href="${esc(studioUrl('#/requests'))}" style="color:#b3122f">Open Change requests</a>`);
  return { subject, text: textBody, html };
}

function customerEmail(x, c) {
  const hi = c.name ? `Namaste ${String(c.name).split(' ')[0]},` : 'Namaste,';
  const ok = x.status === 'approved';
  const subject = ok ? `Your change was made: ${x.label}` : `About your change request: ${x.label}`;
  const line = ok ? `We changed ${x.label} on your invitation from “${x.old || '(empty)'}” to “${x.value}”.` : `We could not make the change you asked for (${x.label}: “${x.value}”).`;
  const note = x.note ? `\n\nNote from us: ${x.note}` : '';
  const textBody = `${hi}\n\n${line}${note}\n\nYour dashboard: ${studioUrl('account')}\n\nNimtto · nimtto.com`;
  const html = frame(`${esc(hi)}<br><br>${esc(line)}${x.note ? `<br><br>Note from us: ${esc(x.note)}` : ''}<br><br><a href="${esc(studioUrl('account'))}" style="color:#b3122f">Open your dashboard</a>`);
  return { subject, text: textBody, html };
}
