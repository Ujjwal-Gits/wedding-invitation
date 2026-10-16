// Transactional email through Brevo: the email check after sign-up and the "Forgot password" link.
// Either the API (BREVO_API_KEY, xkeysib-…) or Brevo's SMTP relay (BREVO_SMTP_USER, the login on Brevo's SMTP tab,
// and BREVO_SMTP_KEY, xsmtpsib-…). Off (returns false, nothing sent) until one of them and MAIL_FROM are set.
// Env: MAIL_FROM (a sender verified in Brevo), MAIL_FROM_NAME (default "Nimtto").
import './env.js'; // loads server/.env first
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import nodemailer from 'nodemailer';

const KEY = String(process.env.BREVO_API_KEY || '').trim();
const SMTP_USER = String(process.env.BREVO_SMTP_USER || '').trim();
const SMTP_KEY = String(process.env.BREVO_SMTP_KEY || '').trim();
const FROM = String(process.env.MAIL_FROM || '').trim();
const FROM_NAME = String(process.env.MAIL_FROM_NAME || 'Nimtto').trim();
export const MAIL_ON = Boolean((KEY || (SMTP_USER && SMTP_KEY)) && FROM);
const smtp = !KEY && MAIL_ON
  ? nodemailer.createTransport({ host: 'smtp-relay.brevo.com', port: 587, secure: false, requireTLS: true, auth: { user: SMTP_USER, pass: SMTP_KEY }, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000 })
  : null;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Sends one email. Resolves true when Brevo accepted it, false when mail is off or Brevo refused (logged). */
export async function sendMail({ to, name = '', subject, text, html, tag = '' }) {
  if (!MAIL_ON) { console.warn(`[mail] off (Brevo key / MAIL_FROM not set): "${subject}" not sent`); return false; }
  if (smtp) {
    try {
      await smtp.sendMail({ from: { name: FROM_NAME, address: FROM }, to: name ? { name, address: to } : to, subject, text, html, headers: tag ? { 'X-Mailin-Tag': tag } : {} });
      return true;
    } catch (err) { console.error(`[mail] SMTP send failed: ${err.message}`); return false; }
  }
  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { email: FROM, name: FROM_NAME }, to: [{ email: to, ...(name ? { name } : {}) }], subject, textContent: text, htmlContent: html, ...(tag ? { tags: [tag] } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) { console.error(`[mail] Brevo ${r.status}: ${(await r.text()).slice(0, 300)}`); return false; }
    return true;
  } catch (err) { console.error(`[mail] send failed: ${err.message}`); return false; }
}

/** A one-time token: { token (goes in the link), hash (stored), exp }. */
export function newToken(ttlMs) {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token), exp: Date.now() + ttlMs };
}
export const hashToken = (t) => createHash('sha256').update(String(t)).digest('hex');
/** True when `token` matches the stored { hash, exp } and has not expired. */
export function tokenOk(stored, token) {
  if (!stored?.hash || !(stored.exp > Date.now()) || typeof token !== 'string' || token.length > 100) return false;
  const a = Buffer.from(hashToken(token), 'hex');
  const b = Buffer.from(stored.hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** A plain branded email: a greeting, one paragraph, one button. */
export function simpleEmail({ name, intro, button, url, outro }) {
  const hi = name ? `Namaste ${name.split(' ')[0]},` : 'Namaste,';
  const text = `${hi}\n\n${intro}\n\n${button}: ${url}\n\n${outro}\n\nNimtto · nimtto.com`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:Helvetica,Arial,sans-serif;color:#16181d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;padding:32px">
<tr><td style="font-size:20px;font-weight:600;color:#b3122f;padding-bottom:20px">Nimtto</td></tr>
<tr><td style="font-size:16px;line-height:1.6">${esc(hi)}<br><br>${esc(intro)}</td></tr>
<tr><td style="padding:24px 0"><a href="${esc(url)}" style="display:inline-block;background:#b3122f;color:#fff;text-decoration:none;font-weight:600;padding:14px 24px;border-radius:10px">${esc(button)}</a></td></tr>
<tr><td style="font-size:13px;line-height:1.6;color:#5b606b">${esc(outro)}<br><br>If the button does not work, open this link:<br><a href="${esc(url)}" style="color:#b3122f;word-break:break-all">${esc(url)}</a></td></tr>
</table><p style="font-size:12px;color:#8a8f99">Nimtto · Online invitations · nimtto.com</p></td></tr></table></body></html>`;
  return { text, html };
}
