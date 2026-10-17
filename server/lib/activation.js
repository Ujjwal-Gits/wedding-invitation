// The customer's plan switches on by itself once money arrives (a PayPal capture, the planner confirming a QR or
// cash payment) or free access is given: lib/handover.js makes the order's invitation and links it to the ordering
// account (or grows its design list to the plan), and the customer gets an email. Idempotent; never blocks the
// caller. The handler registers here, so the payment code needs no handover import.
let handler = null;

/** lib/handover.js registers activateOrder(orderIdOrRef, why). */
export const onActivate = (fn) => { handler = fn; };

/** Switches on the plan of this order (its id or ref) soon, if it is paid or free. why: 'paypal' | 'payment' | 'free'. */
export function activate(key, why) {
  if (!handler || !key) return;
  setImmediate(() => {
    Promise.resolve(handler(String(key), why)).catch((err) => console.warn(`[activate] ${key}: ${err.message}`));
  });
}
