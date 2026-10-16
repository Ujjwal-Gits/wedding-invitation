// Account emails with a 6-digit code: "Confirm your email" after sign-up / ordering, and "Forgot password".
// The code is in the subject and set large in the body, so Gmail and phones offer "Copy code". Only a hash of the
// code is stored (customer.verify / customer.reset = { hash, exp, tries }); 5 wrong tries and it is gone.
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { customerByEmail, mutateCustomer, normEmail } from './accounts.js';
import { sendMail, MAIL_ON } from './mail.js';

const VERIFY_TTL = 30 * 60 * 1000;
const RESET_TTL = 15 * 60 * 1000;
const MAX_TRIES = 5;
export const CODE_RE = /^\d{6}$/;

const hashOf = (cid, code) => createHash('sha256').update(`${cid}:${code}`).digest('hex');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function codeEmail({ name, code, what, minutes }) {
  const hi = name ? `Namaste ${name.split(' ')[0]},` : 'Namaste,';
  const text = `${hi}\n\nYour Nimtto code is: ${code}\n\nEnter it to ${what}. It works for ${minutes} minutes.\nIf you did not ask for this, ignore this email.\n\nNimtto · nimtto.com`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Helvetica,Arial,sans-serif;color:#16181d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;padding:32px">
<tr><td style="font-size:20px;font-weight:600;color:#b3122f;padding-bottom:20px">Nimtto</td></tr>
<tr><td style="font-size:16px;line-height:1.6">${esc(hi)}<br><br>Your code to ${esc(what)}:</td></tr>
<tr><td style="padding:20px 0"><div style="display:inline-block;font-size:34px;font-weight:700;letter-spacing:8px;font-family:'Courier New',monospace;background:#f6f7f9;border-radius:12px;padding:14px 22px;user-select:all">${code}</div></td></tr>
<tr><td style="font-size:13px;line-height:1.6;color:#5b606b">It works for ${minutes} minutes. If you did not ask for this, ignore this email.</td></tr>
</table><p style="font-size:12px;color:#8a8f99">Nimtto · Online invitations · nimtto.com</p></td></tr></table></body></html>`;
  return { subject: `${code} is your Nimtto code`, text, html };
}

async function issue(c, field, ttl, what, tag) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await mutateCustomer(c.id, (x) => { x[field] = { hash: hashOf(c.id, code), exp: Date.now() + ttl, tries: 0 }; });
  return sendMail({ to: c.email, name: c.name, tag, ...codeEmail({ name: c.name, code, what, minutes: Math.round(ttl / 60000) }) });
}

/** Emails a "Confirm your email" code. Resolves false when mail is off, already confirmed, or the send failed. */
export async function sendVerify(req, c) {
  if (!MAIL_ON || c.emailVerified === true) return false;
  return issue(c, 'verify', VERIFY_TTL, 'confirm your email', 'verify-email');
}

/** Emails a "Forgot password" code if the email has an active account. No account = no email (same answer). */
export async function sendReset(req, email) {
  const c = customerByEmail(normEmail(email));
  if (!c || c.disabled === true) return;
  await issue(c, 'reset', RESET_TTL, 'set a new password', 'reset-password');
}

/**
 * Checks a code against customer[field]. A right code is used up; a wrong one counts, and after 5 the code is gone.
 * -> 'ok' | 'wrong' | 'expired'
 */
export async function useCode(c, field, code) {
  let result = 'expired';
  await mutateCustomer(c.id, (x) => {
    const s = x[field];
    if (!s?.hash || !(s.exp > Date.now()) || (s.tries || 0) >= MAX_TRIES) { delete x[field]; result = 'expired'; return; }
    const a = Buffer.from(hashOf(c.id, String(code)), 'hex');
    const b = Buffer.from(s.hash, 'hex');
    if (CODE_RE.test(String(code)) && a.length === b.length && timingSafeEqual(a, b)) { delete x[field]; result = 'ok'; return; }
    s.tries = (s.tries || 0) + 1;
    if (s.tries >= MAX_TRIES) delete x[field];
    result = 'wrong';
  });
  return result;
}

export { MAIL_ON };
