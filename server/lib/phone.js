// Phone numbers: every new account and order carries a real phone number with its country code, stored as E.164
// (+15551234567, +9779801234567). Checked with libphonenumber-js's full metadata, the same rules as the website's
// phone field (src/ui/phone.js). A number without + or 00 is read as a Nepali number (older forms sent 98XXXXXXXX).
// Accounts made before phones were required keep working: only new values are checked.
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

export const PHONE_MSG = 'Enter a valid phone number with country code.';
const MAX = 32;

/** A raw phone as E.164, or '' when it is not a valid number. `country`: the country for a number without a code. */
export function toE164(raw, { country = 'NP' } = {}) {
  if (typeof raw !== 'string') return '';
  const s = raw.normalize('NFKC').trim();
  if (!s || s.length > MAX || /[^\d+()\-.\s/]/.test(s) || s.replace(/\D/g, '').length < 6) return ''; // digits and the usual separators only
  const intl = /^(\+|00)/.test(s);
  try {
    const p = parsePhoneNumberFromString(intl ? s.replace(/^00/, '+') : s, intl ? undefined : country);
    return p && p.isValid() ? p.number : '';
  } catch {
    return '';
  }
}
