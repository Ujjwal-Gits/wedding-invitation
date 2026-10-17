// The two markets in the studio (docs/PLATFORM.md "Markets"): Nepal ('np', rupees) and International ('intl', US
// dollars, PayPal or a card). Anything without a market is Nepal. Shared by the admin modules and the customer's
// dashboard and editor.
import { h } from './dom.js';

export const MARKET_NAME = { np: 'Nepal', intl: 'International' };
export const MARKET_SHORT = { np: 'Nepal', intl: 'Intl' };
/** Options for a market filter: All markets, Nepal, International. */
export const MARKET_FILTER = [['', 'All markets'], ['np', 'Nepal'], ['intl', 'International']];
export const marketOf = (x) => (x?.market === 'intl' ? 'intl' : 'np');
export const isIntl = (x) => marketOf(x) === 'intl';
/** The signed-in customer (or a couple inside a customer's invitation) is International: English only, dollars. */
export const intlMe = (me) => me?.role === 'customer' && me.market === 'intl';

/** A small market tag for thin rows. */
export const marketTag = (m, country = '') => h('span.mkt', { class: `mkt--${m === 'intl' ? 'intl' : 'np'}`, title: `${MARKET_NAME[m === 'intl' ? 'intl' : 'np']}${country ? ` · ${countryName(country)}` : ''}` },
  MARKET_SHORT[m === 'intl' ? 'intl' : 'np'], country && country !== 'NP' ? h('small.mkt__cc', country) : null);

let regionNames = null;
/** 'US' -> 'United States' (the browser's own list), else the code. */
export function countryName(code) {
  if (!code) return '';
  try { regionNames ||= new Intl.DisplayNames(['en'], { type: 'region' }); return regionNames.of(code) || code; } catch { return code; }
}

export const npr = (n) => `Rs ${Number(n).toLocaleString('en-IN')}`;
export const usd = (n) => `$${Number.isInteger(Number(n)) ? Number(n) : Number(n).toFixed(2)}`;
export const moneyIn = (n, cur) => (n == null ? '' : cur === 'USD' ? usd(n) : npr(n));
/** An amount { npr, usd } in the market's currency first: International shows dollars, Nepal rupees (then dollars). */
export function priceFor(a, market, from = false) {
  const f = from ? 'from ' : '';
  if (market === 'intl') return a?.usd != null ? `${f}${usd(a.usd)}` : a?.npr != null ? `${f}${npr(a.npr)}` : '';
  return [a?.npr != null ? `${f}${npr(a.npr)}` : null, a?.usd != null ? usd(a.usd) : null].filter(Boolean).join(' · ');
}
/** The one amount of a market, for a thin column: '$99' or 'Rs 4,999'. */
export const shortPrice = (a, market) => (market === 'intl' ? (a?.usd != null ? usd(a.usd) : a?.npr != null ? npr(a.npr) : '') : (a?.npr != null ? npr(a.npr) : a?.usd != null ? usd(a.usd) : ''));

/** Design markets and styles (Themes page). */
export const THEME_MARKET_OPTS = [['np', 'Nepal'], ['intl', 'International'], ['both', 'Both']];
export const STYLE_OPTS = [['', 'No style'], ['garden', 'Garden'], ['romantic', 'Romantic'], ['classic', 'Classic'], ['modern', 'Modern'], ['destination', 'Destination']];
export const fitsMarket = (themeMarket, m) => themeMarket === 'both' || (themeMarket || 'np') === m;
