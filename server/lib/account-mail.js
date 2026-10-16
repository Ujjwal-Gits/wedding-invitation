// Account emails: "Confirm your email" after sign-up / ordering, and "Forgot password". Links carry
// <customer id>.<token>; only the token's SHA-256 is stored (customer.verify / customer.reset), one use each.
import { getCustomer, customerByEmail, mutateCustomer, normEmail, CUSTOMER_ID_RE } from './accounts.js';
import { sendMail, simpleEmail, newToken, tokenOk, MAIL_ON } from './mail.js';
import { PUBLIC_ORIGINS } from './env.js';

const VERIFY_TTL = 48 * 60 * 60 * 1000;
const RESET_TTL = 30 * 60 * 1000;
const originOf = (req) => PUBLIC_ORIGINS[0] || `${req.protocol}://${req.get('host')}`;

/** Splits "<id>.<token>" and returns { c, token } or null. */
export function fromLink(v) {
  const m = /^([A-Za-z0-9_-]{12})\.([A-Za-z0-9_-]{20,100})$/.exec(typeof v === 'string' ? v : '');
  if (!m || !CUSTOMER_ID_RE.test(m[1])) return null;
  const c = getCustomer(m[1]);
  return c ? { c, token: m[2] } : null;
}

/** Emails a "Confirm your email" link. Resolves false when mail is off or the send failed. */
export async function sendVerify(req, c) {
  if (!MAIL_ON || c.emailVerified === true) return false;
  const t = newToken(VERIFY_TTL);
  await mutateCustomer(c.id, (x) => { x.verify = { hash: t.hash, exp: t.exp }; });
  const url = `${originOf(req)}/studio/verify/${c.id}.${t.token}`;
  return sendMail({ to: c.email, name: c.name, subject: 'Confirm your email · Nimtto', tag: 'verify-email', ...simpleEmail({
    name: c.name, intro: 'Thank you for joining Nimtto. Please confirm this is your email address.',
    button: 'Confirm my email', url, outro: 'This link works for 48 hours. If you did not make a Nimtto account, you can ignore this email.' }) });
}

/** Emails a "Set a new password" link if the email has an active account. Always resolves (no account = no email). */
export async function sendReset(req, email) {
  const c = customerByEmail(normEmail(email));
  if (!c || c.disabled === true) return;
  const t = newToken(RESET_TTL);
  await mutateCustomer(c.id, (x) => { x.reset = { hash: t.hash, exp: t.exp }; });
  const url = `${originOf(req)}/studio/reset/${c.id}.${t.token}`;
  await sendMail({ to: c.email, name: c.name, subject: 'Set a new password · Nimtto', tag: 'reset-password', ...simpleEmail({
    name: c.name, intro: 'Someone asked to reset the password of your Nimtto account. Click below to choose a new one.',
    button: 'Set a new password', url, outro: 'This link works for 30 minutes and only once. If you did not ask for this, ignore this email: your password stays the same.' }) });
}

export { tokenOk, MAIL_ON };
