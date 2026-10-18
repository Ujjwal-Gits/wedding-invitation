// Access follows the money back: when PayPal reverses a payment (a dispute or chargeback), or a payment is refunded
// in full (the PayPal webhook, a refund from Finance, "Mark refunded"), the order's access is suspended:
//   order.access = 'suspended', order.suspension = { at, why, kind, by, liftedAt?, liftedBy? }
//   the linked invitation gets doc.suspended = { at, why, order }: guests see the same "not available" page as an
//   unpublished invitation (lib/store.js isLive), and the customer can no longer change it (lib/auth.js
//   requireEditor); staff still can.
// The admin (ADMIN_EMAIL) gets one email. A partial refund never suspends, and neither does an order that was given
// free access. Staff with 'finance' lift it with PATCH /api/orders/:id { access: 'active' } (audit-logged).
import { withLock, getOrderById, saveOrder, getInvitation, saveInvitation, SLUG_RE } from './store.js';
import { sendMail, MAIL_ON } from './mail.js';
import { ADMIN_EMAIL, PUBLIC_ORIGINS } from './env.js';

const note = (pay, status, by, text) => {
  if (pay) pay.history = [...(pay.history || []), { at: new Date().toISOString(), status, by, note: text }].slice(-50);
};

/** Sets (value) or clears (null) the invitation's suspension. Returns true when it changed. */
async function markInvitation(slug, value) {
  if (!slug || !SLUG_RE.test(slug)) return false;
  return withLock(`inv:${slug}`, async () => {
    const doc = await getInvitation(slug);
    if (!doc) return false;
    if (value) doc.suspended = value;
    else if (doc.suspended) delete doc.suspended;
    else return false;
    doc.updatedAt = new Date().toISOString();
    await saveInvitation(doc);
    return true;
  });
}

/**
 * Suspends one order's access (see the top of this file). why: a short reason for the planner; kind: 'reversed' |
 * 'refunded'. Safe to call twice. Returns true when it suspended now, false when skipped (unknown order, free
 * access, already suspended).
 */
export async function suspendOrder(orderId, why, { kind = 'refunded', by = 'system' } = {}) {
  const at = new Date().toISOString();
  const reason = String(why || 'Payment refunded').slice(0, 200);
  const order = await withLock('orders', async () => {
    const o = await getOrderById(orderId);
    if (!o || o.access === 'suspended') return null;
    if (o.pay?.status === 'comped' || o.activatedBy === 'free') return null; // free access: no money to take back
    o.access = 'suspended';
    o.suspension = { at, why: reason, kind: kind === 'reversed' ? 'reversed' : 'refunded', by };
    note(o.pay, o.pay?.status, by, `access suspended: ${reason}`);
    await saveOrder(o);
    return structuredClone(o);
  });
  if (!order) return false;
  const ref = order.ref || order.id;
  if (order.invitation) await markInvitation(order.invitation, { at, why: reason, order: ref });
  console.warn(`[access] order ${ref} suspended: ${reason}${order.invitation ? ` (invitation ${order.invitation} hidden from guests)` : ''}`);
  if (MAIL_ON && ADMIN_EMAIL) await sendMail({ to: ADMIN_EMAIL, tag: 'payment-reversed', ...adminEmail(order, reason, kind) }).catch(() => false);
  return true;
}

/**
 * Lifts a suspension on `o` (an order being changed under the orders lock, lib/orders.js update): records who and
 * when. The caller saves the order, then calls releaseInvitation(o).
 */
export function liftOn(o, by = 'admin') {
  if (o.access !== 'suspended') return false;
  o.access = 'active';
  o.suspension = { ...(o.suspension || {}), liftedAt: new Date().toISOString(), liftedBy: by };
  note(o.pay, o.pay?.status, by, 'access restored');
  return true;
}

/** Suspends `o` by hand (staff), under the orders lock. The caller saves, then calls holdInvitation(o). */
export function suspendOn(o, by = 'admin', why = 'Suspended by staff') {
  if (o.access === 'suspended') return false;
  o.access = 'suspended';
  o.suspension = { at: new Date().toISOString(), why, kind: 'manual', by };
  note(o.pay, o.pay?.status, by, `access suspended: ${why}`);
  return true;
}

/** After liftOn: the order's invitation is visible to guests and editable by the customer again. */
export const releaseInvitation = (o) => markInvitation(o.invitation, null);
/** After suspendOn: the order's invitation is hidden from guests. */
export const holdInvitation = (o) => markInvitation(o.invitation, { at: o.suspension?.at || new Date().toISOString(), why: o.suspension?.why || 'Suspended', order: o.ref || o.id });

const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
function adminEmail(o, reason, kind) {
  const ref = o.ref || o.id;
  const url = `${PUBLIC_ORIGINS[0] || 'https://nimtto.com'}/studio/`;
  const what = kind === 'reversed' ? 'reversed' : 'refunded';
  const lines = [
    `The payment for order ${ref} was ${what}: ${reason}.`,
    `Its access is suspended${o.invitation ? `: the invitation "${o.invitation}" now shows guests "not available", and the customer cannot change it` : ''}.`,
    'To restore it, open the order in the dashboard (Orders) and lift the suspension.',
  ];
  return {
    subject: `Payment ${what} for ${ref}`,
    text: `${lines.join('\n\n')}\n\n${url}\n`,
    html: `<!doctype html><html><body style="font-family:Helvetica,Arial,sans-serif;color:#16181d">${lines.map((l) => `<p>${esc(l)}</p>`).join('')}<p><a href="${esc(url)}">Open the dashboard</a></p></body></html>`,
  };
}
