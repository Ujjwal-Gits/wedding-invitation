// Nimtto phone field: a country picker (flag and dial code, searchable: the Nimtto dropdown, select.js) beside the
// national number. Validated with libphonenumber-js (full metadata, the same rules the server uses in
// server/lib/phone.js), and read back as E.164 (+15551234567). The country starts as the visitor's last choice, else
// the site's own: Nepal (+977) on nimtto.com, the United States (+1) on /international/ (body.market-intl).
// Typing or pasting a number that starts with + (or 00) picks its country by itself.
// Load it lazily (it carries the phone metadata): const { phoneField } = await import('../ui/phone.js').
import './ui.css';
import { getCountries, getCountryCallingCode, parsePhoneNumberFromString, getExampleNumber, AsYouType } from 'libphonenumber-js/max';
import examples from 'libphonenumber-js/mobile/examples';
import { el } from './core.js';
import { enhanceSelect } from './select.js';

export const PHONE_MSG = 'Enter a valid phone number with country code.';
const KEY = 'nimtto-phone-country';
const CC_RE = /^[A-Z]{2}$/;
// the countries most of our couples and their families write from, first
const TOP = ['NP', 'US', 'GB', 'CA', 'AU', 'IN', 'AE', 'QA', 'JP', 'KR'];
// more words to search by
const ALIAS = {
  US: 'usa america united states', GB: 'uk britain england scotland wales', AE: 'uae dubai abu dhabi emirates',
  KR: 'south korea', NZ: 'new zealand', SA: 'saudi', HK: 'hong kong', DE: 'germany deutschland', NL: 'netherlands holland',
};
const COUNTRIES = new Set(getCountries());

const flag = (cc) => String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
let names = null;
const nameOf = (cc) => {
  try { names ||= new Intl.DisplayNames(['en'], { type: 'region' }); return names.of(cc) || cc; } catch { return cc; }
};

/** The site's own country: the United States on the international site, else Nepal. */
export const siteCountry = () => (document.body?.classList.contains('market-intl') ? 'US' : 'NP');
function remembered() {
  try { const v = localStorage.getItem(KEY) || ''; return CC_RE.test(v) && COUNTRIES.has(v) ? v : ''; } catch { return ''; }
}
function remember(cc) { try { localStorage.setItem(KEY, cc); } catch { /* private mode: nothing to keep */ } }

/** A raw phone (E.164, 00…, or national for `cc`) as a parsed number, or null. */
export function parsePhone(raw, cc) {
  const s = String(raw || '').trim();
  if (!s || s.replace(/\D/g, '').length < 4) return null;
  const intl = /^(\+|00)/.test(s);
  try { return parsePhoneNumberFromString(intl ? s.replace(/^00/, '+') : s, intl ? undefined : cc) || null; } catch { return null; }
}

let menu = null; // the option list is the same for every field: built once
function options() {
  if (menu) return menu;
  const all = [...COUNTRIES].map((cc) => ({ cc, name: nameOf(cc), code: getCountryCallingCode(cc) }));
  const opt = (c) => el('option', { value: c.cc, text: `${flag(c.cc)}  ${c.name}  +${c.code}`, 'data-short': `${flag(c.cc)} +${c.code}`, 'data-k': `${c.cc} +${c.code} ${ALIAS[c.cc] || ''}`.trim() });
  const top = TOP.filter((cc) => COUNTRIES.has(cc)).map((cc) => all.find((c) => c.cc === cc));
  const rest = all.filter((c) => !TOP.includes(c.cc)).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  menu = { top, rest, opt };
  return menu;
}

/**
 * Turns <input type="tel"> into the phone field (once; later calls return the same handle). The input keeps its id,
 * name and label and holds the national number; read the number with handle.e164().
 * Options: country (ISO code to start with).
 */
export function phoneField(input, { country = '' } = {}) {
  if (input.__phone) return input.__phone;
  const start = [country, remembered(), siteCountry()].find((c) => CC_RE.test(c || '') && COUNTRIES.has(c));
  const sel = el('select', { class: input.className || 'input', id: input.id ? `${input.id}-cc` : null, 'aria-label': 'Country code', autocomplete: 'tel-country-code' });
  const { top, rest, opt } = options();
  sel.append(el('optgroup', { label: 'Popular' }, top.map(opt)), el('optgroup', { label: 'All countries' }, rest.map(opt)));
  sel.value = start;
  const wrap = el('div.ui-phone');
  input.before(wrap);
  wrap.append(sel, input);
  input.type = 'tel';
  input.inputMode = 'tel';
  input.autocomplete = 'tel-national';
  input.removeAttribute('maxlength');
  input.maxLength = 24;
  const ui = enhanceSelect(sel);

  const hint = () => {
    try { input.placeholder = getExampleNumber(sel.value, examples)?.formatNational() || ''; } catch { input.placeholder = ''; }
  };
  const setCountry = (cc) => {
    if (!CC_RE.test(cc || '') || !COUNTRIES.has(cc) || sel.value === cc) return;
    sel.value = cc;
    ui.sync();
    hint();
  };
  sel.addEventListener('change', () => {
    remember(sel.value);
    hint();
    input.dispatchEvent(new Event('input', { bubbles: true })); // the form checks the number again
  });
  // +1 555…, 00977 98…: the number names its own country
  input.addEventListener('input', () => {
    const s = input.value.trim();
    if (!/^(\+|00)\d/.test(s)) return;
    const t = new AsYouType();
    t.input(s.replace(/^00/, '+'));
    const cc = t.getCountry();
    if (cc) setCountry(cc);
  });
  input.addEventListener('blur', () => {
    const p = parsePhone(input.value, sel.value);
    if (!p?.isValid()) return;
    if (p.country) setCountry(p.country);
    input.value = p.formatNational(); // tidy: (555) 123-4567, 980-1234567
  });
  hint();

  const handle = {
    input, select: sel, wrap,
    country: () => sel.value,
    empty: () => !input.value.trim(),
    valid: () => Boolean(parsePhone(input.value, sel.value)?.isValid()),
    /** the number as E.164 (+15551234567), or '' when it is not a valid number */
    e164() { const p = parsePhone(input.value, sel.value); return p?.isValid() ? p.number : ''; },
    /** Shows a stored number: E.164 picks its country; anything else is shown as typed. */
    set(v) {
      const s = String(v || '').trim();
      const p = s ? parsePhone(s, sel.value) : null;
      if (p?.isValid()) { if (p.country) setCountry(p.country); input.value = p.formatNational(); } else input.value = s;
    },
    focus: () => input.focus(),
  };
  input.__phone = handle;
  return handle;
}
