// Escaping, bilingual markup, Nepal-time dates and the language switch.
const TZ = 'Asia/Kathmandu';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Bilingual inline text. Accepts {en, ne} or a plain string. */
export const bi = (v) => {
  const o = typeof v === 'string' ? { en: v } : v ?? {};
  return `<span class="l-en">${esc(o.en)}</span><span class="l-ne" lang="ne">${esc(o.ne ?? o.en)}</span>`;
};

/** Same as bi() but builds DOM nodes, for text that came from a guest or URL. */
export const biNodes = (en, ne) => [
  Object.assign(document.createElement('span'), { className: 'l-en', textContent: en }),
  Object.assign(document.createElement('span'), { className: 'l-ne', lang: 'ne', textContent: ne ?? en }),
];

// Nepali is formatted by hand: not every browser ships ne-NP locale data.
const NE_DIGITS = '०१२३४५६७८९';
export const neNum = (n) => String(n).replace(/\d/g, (d) => NE_DIGITS[d]);
const NE_MONTHS = ['जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन', 'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर'];
const NE_DAYS = ['आइतबार', 'सोमबार', 'मङ्गलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'];
const npt = (iso) => {
  const d = new Date(new Date(iso).getTime() + 345 * 60000); // Nepal is UTC+05:45, no DST
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), day: d.getUTCDate(), wd: d.getUTCDay(), h: d.getUTCHours(), min: d.getUTCMinutes() };
};
const nePeriod = (h) => (h < 4 ? 'राति' : h < 12 ? 'बिहान' : h < 16 ? 'दिउँसो' : h < 19 ? 'बेलुका' : 'राति');
const fmt = (iso, opts) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts }).format(new Date(iso));

export const dateOf = (iso) => {
  const p = npt(iso);
  return {
    en: fmt(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    ne: `${NE_DAYS[p.wd]}, ${NE_MONTHS[p.m]} ${neNum(p.day)}, ${neNum(p.y)}`,
  };
};
export const shortDate = (iso) => {
  const p = npt(iso);
  return { en: fmt(iso, { day: 'numeric', month: 'short' }), ne: `${NE_MONTHS[p.m]} ${neNum(p.day)}` };
};
export const dayNum = (iso) => { const p = npt(iso); return { en: String(p.day).padStart(2, '0'), ne: neNum(String(p.day).padStart(2, '0')) }; };
export const timeOf = (iso) => {
  const p = npt(iso);
  const h12 = p.h % 12 || 12;
  return {
    en: fmt(iso, { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', ' '),
    ne: `${nePeriod(p.h)} ${neNum(h12)}:${neNum(String(p.min).padStart(2, '0'))} बजे`,
  };
};
export const timeRange = (a, b) => ({ en: `${timeOf(a).en} – ${timeOf(b).en}`, ne: `${timeOf(a).ne} – ${timeOf(b).ne}` });

export const mapUrl = (q) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

const LANG_KEY = 'sayapatri-lang';
export function initLang(button) {
  const set = (lang) => {
    document.documentElement.dataset.lang = lang;
    document.documentElement.lang = lang === 'ne' ? 'ne' : 'en';
    button?.setAttribute('aria-pressed', String(lang === 'ne'));
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* private mode */ }
    document.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
  };
  const url = new URLSearchParams(location.search).get('lang');
  let saved = null;
  try { saved = localStorage.getItem(LANG_KEY); } catch { /* ignore */ }
  set(url === 'ne' || url === 'en' ? url : saved || 'en');
  button?.addEventListener('click', () => set(document.documentElement.dataset.lang === 'ne' ? 'en' : 'ne'));
}
