// Transactional email through Brevo: the 6-digit codes (lib/account-mail.js).
// Either the API (BREVO_API_KEY, xkeysib-…) or Brevo's SMTP relay (BREVO_SMTP_USER, the login on Brevo's SMTP tab,
// and BREVO_SMTP_KEY, xsmtpsib-…). Off (returns false, nothing sent) until one of them and MAIL_FROM are set.
// Env: MAIL_FROM (a sender verified in Brevo), MAIL_FROM_NAME (default "Nimtto").
import './env.js'; // loads server/.env first
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
