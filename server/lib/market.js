// The two markets (docs/PLATFORM.md "Markets"): Nepal ('np', the website at /, rupees, QR wallets) and International
// ('intl', /international/, US first, US dollars with PayPal or a card). Anything without a market is Nepal.
// Phone numbers: E.164 (+14155552671) checked with libphonenumber-js. A number typed without a country code is read
// as Nepali (98XXXXXXXX), the way the Nepal website has always taken them.
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

export const MARKETS = ['np', 'intl'];
export const MARKET_NAME = { np: 'Nepal', intl: 'International' };
export const STYLES = ['garden', 'romantic', 'classic', 'modern', 'destination'];
export const isMarket = (v) => MARKETS.includes(v);
/** A stored value as a market: 'intl', else 'np' (missing, old data, anything unknown). */
export const asMarket = (v) => (v === 'intl' ? 'intl' : 'np');
/** A design's market: 'np' | 'intl' | 'both'. */
export const THEME_MARKETS = ['np', 'intl', 'both'];
export const themeFits = (themeMarket, market) => themeMarket === 'both' || (themeMarket || 'np') === market;

/** The one message for a phone number that is missing or not real (website, studio, admin). */
export const PHONE_MSG = 'Enter a valid phone number with country code.';

/**
 * A phone number checked and put in E.164 form: { ok, e164, country } (country: ISO 3166 alpha-2, e.g. 'US', 'NP').
 * '' is { ok: true, e164: '' } (no phone). `fallback` is the country for a number without a + (default Nepal).
 */
export function checkPhone(raw, fallback = 'NP') {
  const s = typeof raw === 'string' ? raw.normalize('NFC').trim() : '';
  if (!s) return { ok: true, e164: '', country: '' };
  if (s.length > 24 || !/^[0-9+()\-.\s]+$/.test(s)) return { ok: false, e164: '', country: '' };
  const digits = s.replace(/[^\d+]/g, '');
  const intl = digits.startsWith('+') ? digits : digits.startsWith('00') ? `+${digits.slice(2)}` : '';
  let p = null;
  try { p = intl ? parsePhoneNumberFromString(intl) : parsePhoneNumberFromString(digits, fallback); } catch { p = null; }
  if (!p || !p.isValid()) return { ok: false, e164: '', country: '' };
  return { ok: true, e164: p.number, country: p.country || '' };
}

/** The country (ISO alpha-2) of a stored phone number, or '' when there is none or it cannot be read. */
export const countryOfPhone = (phone) => (phone ? checkPhone(String(phone)).country : '');

/** An order's market: what the website saved on it, else Nepal. */
export const orderMarket = (o) => asMarket(o?.market);

/**
 * A customer's market: the market saved on the account at sign-up (`market`), else the newest order's market when it
 * is International, else the phone's country (anything but Nepal is International), else Nepal.
 */
export function customerMarket(c, orders = []) {
  if (isMarket(c?.market)) return c.market;
  const mine = orders.filter((o) => o.customerId === c?.id).sort((a, b) => String(b.at).localeCompare(String(a.at)));
  if (mine.some((o) => o.market === 'intl')) return 'intl';
  if (mine.some((o) => o.market === 'np')) return 'np';
  const country = countryOfPhone(c?.phone);
  return country && country !== 'NP' ? 'intl' : 'np';
}

// The likely time zone of a country's weddings (the venue's zone; the couple can change it in Dates & events).
const ZONES = {
  NP: 'Asia/Kathmandu', IN: 'Asia/Kolkata', GG: 'Europe/Guernsey', JE: 'Europe/Jersey', IM: 'Europe/Isle_of_Man', US: 'America/New_York', CA: 'America/Toronto', GB: 'Europe/London', IE: 'Europe/Dublin',
  AU: 'Australia/Sydney', NZ: 'Pacific/Auckland', AE: 'Asia/Dubai', QA: 'Asia/Qatar', SA: 'Asia/Riyadh', KW: 'Asia/Kuwait', BH: 'Asia/Bahrain',
  OM: 'Asia/Muscat', MY: 'Asia/Kuala_Lumpur', SG: 'Asia/Singapore', HK: 'Asia/Hong_Kong', JP: 'Asia/Tokyo', KR: 'Asia/Seoul', DE: 'Europe/Berlin',
  FR: 'Europe/Paris', NL: 'Europe/Amsterdam', BE: 'Europe/Brussels', PT: 'Europe/Lisbon', ES: 'Europe/Madrid', IT: 'Europe/Rome', CH: 'Europe/Zurich',
  AT: 'Europe/Vienna', DK: 'Europe/Copenhagen', SE: 'Europe/Stockholm', NO: 'Europe/Oslo', FI: 'Europe/Helsinki', PL: 'Europe/Warsaw', CY: 'Asia/Nicosia',
  IL: 'Asia/Jerusalem', MX: 'America/Mexico_City', BR: 'America/Sao_Paulo', ZA: 'Africa/Johannesburg', BD: 'Asia/Dhaka', LK: 'Asia/Colombo',
  BT: 'Asia/Thimphu', TH: 'Asia/Bangkok', CN: 'Asia/Shanghai', PH: 'Asia/Manila', ID: 'Asia/Jakarta', MV: 'Indian/Maldives',
};
// US and Canadian area codes outside the Eastern zone (the most common ones; the rest default to Eastern).
const NANP = {
  'America/Chicago': [205, 210, 214, 217, 218, 224, 225, 228, 251, 254, 256, 262, 270, 281, 309, 312, 314, 316, 318, 319, 320, 331, 334, 337, 346, 361, 402, 405, 409, 414, 417, 430, 432, 469, 479, 501, 504, 507, 512, 515, 531, 563, 573, 580, 601, 608, 612, 615, 618, 620, 629, 630, 636, 641, 651, 662, 682, 708, 712, 713, 715, 737, 763, 773, 785, 806, 815, 816, 817, 830, 832, 847, 872, 901, 903, 913, 918, 920, 931, 936, 940, 952, 956, 972, 979, 204, 306, 431],
  'America/Denver': [303, 307, 385, 406, 435, 505, 575, 719, 720, 801, 970, 983, 403, 587, 780, 825, 368],
  'America/Phoenix': [480, 520, 602, 623, 928],
  'America/Los_Angeles': [206, 209, 213, 253, 279, 310, 323, 341, 360, 408, 415, 424, 425, 442, 458, 503, 509, 510, 530, 541, 559, 562, 564, 619, 626, 628, 650, 657, 661, 669, 702, 707, 714, 725, 747, 760, 775, 805, 818, 820, 831, 840, 858, 909, 916, 925, 949, 951, 971, 236, 250, 604, 672, 778],
  'Pacific/Honolulu': [808],
  'America/Anchorage': [907],
};
const NANP_ZONE = new Map(Object.entries(NANP).flatMap(([z, codes]) => codes.map((c) => [c, z])));

/** The likely venue time zone for a phone number ('' when it cannot tell): by country, and by area code in the US/Canada. */
export function zoneOfPhone(phone) {
  const r = checkPhone(String(phone || ''));
  if (!r.ok || !r.country) return '';
  if ((r.country === 'US' || r.country === 'CA') && r.e164.startsWith('+1')) {
    const z = NANP_ZONE.get(Number(r.e164.slice(2, 5)));
    if (z) return z;
    return r.country === 'CA' ? 'America/Toronto' : 'America/New_York';
  }
  return ZONES[r.country] || '';
}

/** The zone a new invitation for this customer / order starts with: from the phone for International, else Nepal (''). */
export function likelyZone({ market = 'np', phone = '' } = {}) {
  if (market !== 'intl') return '';
  return zoneOfPhone(phone) || 'America/New_York';
}
