// Faith: one invitation, the couple's community (docs/PLATFORM.md "Religion"). Hindu invitations look exactly as
// they always have. For a Buddhist, Kirat, Muslim, Christian or other invitation, the shared layers swap the sacred parts:
//   - the invocation line (॥ श्री गणेशाय नमः ॥ → ॥ नमो बुद्धाय ॥, بسم الله الرحمن الرحيم, a Bible verse, or nothing),
//   - the sacred image in a theme's Ganesh slot (→ a fine-line emblem drawn here, in the theme's own gold),
//   - a few Hindu words in the designs' default texts (शुभ विवाह → निकाह / पवित्र विवाह …),
//   - the default ceremonies and wording of a new invitation (server: lib/invitations.js starter()).
// Buddhist: ॥ नमो बुद्धाय ॥ ("homage to the Buddha") and a Dharma wheel on a lotus; the wording asks the blessings of
// the Triple Gem (Buddha, Dharma, Sangha). Kirat (Rai, Limbu, Yakkha, Sunuwar): no invocation and the plain emblem,
// wording that asks the blessings of ancestors and elders, "Sewaro" in the message to guests. Both leave their own
// rites to the couple: the defaults stay simple and never invent a ceremony.
// Which designs suit which community is explicit in each theme's slots.js `religions`, judged from the design's own
// art (docs/FAITH-DESIGNS.md); nothing is inferred ('other' means a genuinely neutral design, nothing more).
// A personal guest link may carry its own version of the symbols (?v=neutral|hindu|buddhist|muslim|christian): only the
// symbol, the invocation and the card's verse change, never the couple's words.
//
// Plain module: no DOM access at import time, so the server imports it too. The DOM helpers (styles, the safety net
// that wraps Arabic in its own font) are only called by src/core/data.js in the browser.

export const RELIGIONS = Object.freeze(['hindu', 'buddhist', 'kirat', 'muslim', 'christian', 'other']);
/** What a guest link may ask for (`v`): 'neutral' = no religious symbol or invocation at all. */
export const VERSIONS = Object.freeze(['neutral', 'hindu', 'buddhist', 'muslim', 'christian']);
export const isReligion = (v) => RELIGIONS.includes(v);
export const religionOf = (cfg) => (isReligion(cfg?.religion) ? cfg.religion : 'hindu');

export const RELIGION_LABEL = Object.freeze({
  hindu: { en: 'Hindu', ne: 'हिन्दू' },
  buddhist: { en: 'Buddhist', ne: 'बौद्ध' },
  kirat: { en: 'Kirat', ne: 'किराँत' },
  muslim: { en: 'Muslim', ne: 'मुस्लिम' },
  christian: { en: 'Christian', ne: 'क्रिश्चियन' },
  other: { en: 'Other / none', ne: 'अन्य' },
});

/** The symbols a page shows: the guest link's version, else the invitation's own ('other' and 'kirat' show none). */
export function symbolsFor(religion, version) {
  if (VERSIONS.includes(version)) return version;
  return VERSIONS.includes(religion) ? religion : 'neutral';
}

// ───────── words ─────────

const BISMILLAH = 'بسم الله الرحمن الرحيم';
/** The invocation line at the top of the opening or card. Neutral: none. */
export const INVOCATION = Object.freeze({
  hindu: { en: '॥ श्री गणेशाय नमः ॥', ne: '॥ श्री गणेशाय नमः ॥' },
  buddhist: { en: '॥ नमो बुद्धाय ॥', ne: '॥ नमो बुद्धाय ॥' },
  muslim: { en: BISMILLAH, ne: BISMILLAH },
  christian: { en: '“Love never fails.” 1 Cor. 13:8', ne: '“प्रेम कहिल्यै असफल हुँदैन।”' },
  neutral: { en: '', ne: '' },
});
/** The verse on the full card (config.invitation.shloka: `sa` is the original line, `en` its meaning). */
export const SHLOKA = Object.freeze({
  hindu: null, // the invitation's own (the sample's Vakratunda shloka)
  buddhist: { sa: '॥ नमो बुद्धाय ॥', en: 'Homage to the Buddha' },
  muslim: { sa: BISMILLAH, en: 'In the name of Allah, the Most Gracious, the Most Merciful' },
  christian: { sa: 'एक जनाभन्दा दुई जना असल हुन्छन्, किनकि तिनीहरूको परिश्रमको असल प्रतिफल हुन्छ। — उपदेशक ४:९', en: '“Two are better than one, because they have a good return for their labour.” Ecclesiastes 4:9' },
  neutral: { sa: '', en: '' },
});
/** The wedding's name where a design prints शुभ विवाह. */
export const TITLE = Object.freeze({
  hindu: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' },
  buddhist: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' },
  kirat: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' },
  muslim: { en: 'Nikah', ne: 'निकाह' },
  christian: { en: 'Holy Matrimony', ne: 'पवित्र विवाह' },
  other: { en: 'Wedding Celebration', ne: 'शुभ विवाह' }, // neutral in English (international invitations of no stated faith)
});

const HINDU_INVOCATION = /(?:॥\s*)?(?:ॐ\s*)?श्री\s*गणेशाय\s*नमः?(?:\s*॥)?|(?:Shr[ie]e?|Sri)\s+Ganesh(?:a|aya)\s+Nama[hḥ]?/i;
/** Text that is a Hindu invocation (a default the swap may replace). */
export const isHinduInvocation = (s) => typeof s === 'string' && HINDU_INVOCATION.test(s);
const OM_ONLY = /^[\s॥।]*(?:ॐ|卐|卍)[\s॥।]*$/;
/** An invocation line of any community (or a lone sacred mark): what a guest link's version replaces. */
export const isInvocation = (s) => typeof s === 'string' && Boolean(s.trim()) && (isHinduInvocation(s) || OM_ONLY.test(s)
  || /بسم/.test(s) || Object.values(INVOCATION).some((i) => i.en && (s.trim() === i.en || s.trim() === i.ne)));

// Hindu words in the designs' default texts and the sample wording, and what each community says instead.
// Applied only to text the couple did not write (theme defaults, the untouched sample), never to their own words.
// `word` swaps are for the designs' own defaults only; the sentences also fix the untouched sample wording.
const SWAPS = [
  [/Shubha Bibaha/g, (r) => TITLE[r].en, 'word'],
  [/शुभ विवाह/g, (r) => TITLE[r].ne, 'word'],
  [/Soon, the seven steps\./g, () => 'Soon, forever begins.'],
  [/छिट्टै, सप्तपदी।/g, () => 'छिट्टै, नयाँ सुरुवात।'],
  [/Two families, one sacred fire/g, () => 'Two families, one celebration'],
  [/दुई परिवार, एउटै अग्नि/g, () => 'दुई परिवार, एउटै खुसी'],
  [/Until the auspicious hour/g, () => 'Until the big day'],
  [/शुभ साइत आउन बाँकी/g, () => 'शुभ घडी आउन बाँकी'],
  [/^शुभ साइत$/g, () => 'शुभ दिन', 'word'],
  [/^The lagan patra$/g, () => 'Save the date', 'word'],
  [/^Lagan patra$/g, () => 'The date', 'word'],
  [/^लगन पत्र$/g, () => 'शुभ मिति', 'word'],
  [/Until the sacred fire is lit/g, () => 'Until the big day'],
  [/By the grace of our family deity and the blessings of our elders/g, (r) => ({ muslim: 'By the grace of Allah and the blessings of our elders', christian: 'By the grace of God and the blessings of our elders', buddhist: 'With the blessings of the Triple Gem and our elders', kirat: 'With the blessings of our ancestors and elders' }[r] || 'With the blessings of our elders')],
  [/कुलदेवताको असीम कृपा र गुरुजनको आशीर्वादले/g, (r) => ({ muslim: 'अल्लाहको असीम कृपा र गुरुजनको आशीर्वादले', christian: 'परमेश्वरको असीम अनुग्रह र गुरुजनको आशीर्वादले', buddhist: 'त्रिरत्न र गुरुजनको आशीर्वादले', kirat: 'पितृ तथा गुरुजनको आशीर्वादले' }[r] || 'गुरुजनको आशीर्वादले')],
  [/Now we would love you beside us as we take the seven steps\./g, () => 'Now we would love you beside us as we begin our life together.'],
];
/** A design's default words for this community (Hindu: unchanged). sentences: only the sample's sentences. */
export function swapWords(s, religion, { sentences = false } = {}) {
  if (typeof s !== 'string' || !s || religion === 'hindu' || !isReligion(religion)) return s;
  let out = s;
  for (const [re, to, kind] of SWAPS) if (!(sentences && kind === 'word')) out = out.replace(re, () => to(religion));
  return out;
}

/**
 * A theme's default text for this page: the invocation follows the symbols (a guest link's version too),
 * a lone sacred mark (ॐ) goes when the symbols are not Hindu, other words follow the community.
 */
export function faithDefault(pair, { religion, symbols }) {
  if (!pair) return pair;
  const en = String(pair.en ?? '');
  const ne = String(pair.ne ?? '');
  if (symbols !== 'hindu' && (isHinduInvocation(en) || isHinduInvocation(ne))) return { ...INVOCATION[symbols] };
  if (symbols !== 'hindu' && (OM_ONLY.test(en) || OM_ONLY.test(ne)) && (en || ne)) return { en: '', ne: '' };
  if (religion === 'hindu') return pair;
  return { en: swapWords(en, religion), ne: swapWords(ne, religion) };
}

// ───────── the emblem in the Ganesh slot ─────────

const r1 = (n) => Math.round(n * 10) / 10;
const leaf = (x, y, deg, len = 15, w = 5.2) => `<path d="M0 0Q${w} ${-len * 0.5} 0 ${-len}Q${-w} ${-len * 0.5} 0 0Z" transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(deg)})"/>`;
/** A laurel branch along a circle arc (centre cx,cy radius R) from angle a0 to a1 (degrees, 0 = right, clockwise). */
function laurel(cx, cy, R, a0, a1, n, { len = 14, w = 5, side = 1 } = {}) {
  const pt = (a) => [cx + R * Math.cos((a * Math.PI) / 180), cy + R * Math.sin((a * Math.PI) / 180)];
  const [sx, sy] = pt(a0);
  const [ex, ey] = pt(a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  let s = `<path fill="none" d="M${r1(sx)} ${r1(sy)}A${R} ${R} 0 ${large} ${sweep} ${r1(ex)} ${r1(ey)}"/>`;
  for (let i = 1; i <= n; i++) {
    const a = a0 + ((a1 - a0) * (i - 0.35)) / n;
    const [x, y] = pt(a);
    const tangent = a + (a1 > a0 ? 90 : -90);
    s += leaf(x, y, tangent + 90 - 38 * side, len, w) + leaf(x, y, tangent + 90 + 38 * side, len * 0.92, w * 0.95);
  }
  return s;
}
/** A five-petal blossom (jasmine) at x,y. */
const blossom = (x, y, r = 7) => `<g transform="translate(${r1(x)} ${r1(y)})">${[0, 72, 144, 216, 288].map((d) => `<path d="M0 0C${r1(r * 0.55)} ${r1(-r * 0.45)} ${r1(r * 0.42)} ${r1(-r * 1.25)} 0 ${r1(-r * 1.32)}C${r1(-r * 0.42)} ${r1(-r * 1.25)} ${r1(-r * 0.55)} ${r1(-r * 0.45)} 0 0Z" transform="rotate(${d})"/>`).join('')}<circle r="${r1(r * 0.22)}"/></g>`;
const star = (cx, cy, R, ri, n = 5, rot = -90) => {
  const p = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot + (180 / n) * i) * Math.PI) / 180;
    const rr = i % 2 ? ri : R;
    p.push(`${r1(cx + rr * Math.cos(a))} ${r1(cy + rr * Math.sin(a))}`);
  }
  return `<path d="M${p.join('L')}Z"/>`;
};
/** The crescent between two circles: outer (ox,oy,R), inner (ix,iy,r). */
function crescent(ox, oy, R, ix, iy, r) {
  const dx = ix - ox; const dy = iy - oy; const d = Math.hypot(dx, dy);
  const a = (R * R - r * r + d * d) / (2 * d); const h = Math.sqrt(Math.max(0, R * R - a * a));
  const mx = ox + (a * dx) / d; const my = oy + (a * dy) / d;
  const p1 = [mx + (h * dy) / d, my - (h * dx) / d];
  const p2 = [mx - (h * dy) / d, my + (h * dx) / d];
  return `<path d="M${r1(p1[0])} ${r1(p1[1])}A${R} ${R} 0 1 0 ${r1(p2[0])} ${r1(p2[1])}A${r} ${r} 0 0 1 ${r1(p1[0])} ${r1(p1[1])}Z"/>`;
}

const W = 200; const H = 240;
const EMBLEM = {
  // a pointed arch (mihrab) in a double line, a crescent cradling a star, a fine geometric star at the finial
  muslim: () => `
    <path d="M30 226V112C30 68 62 40 100 18C138 40 170 68 170 112V226"/>
    <path d="M39 226V113C39 74 67 49 100 29C133 49 161 74 161 113V226" stroke-opacity=".55"/>
    <path d="M18 226H182M30 232H170" />
    ${star(100, 11, 7.5, 3.6, 8, -90)}
    ${crescent(100, 130, 44, 116, 118, 38)}
    ${star(123, 109, 11, 4.6, 5, -72)}
    <g stroke-opacity=".7">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<circle cx="${52 + i * 16}" cy="206" r="1.6"/>`).join('')}</g>`,
  // a Dharma wheel (eight spokes) resting on an open lotus, a small jewel at its crown
  buddhist: () => `
    <circle cx="100" cy="104" r="50"/><circle cx="100" cy="104" r="43" stroke-opacity=".55"/>
    <circle cx="100" cy="104" r="11"/><circle cx="100" cy="104" r="3.4"/>
    ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
    const c = Math.cos((a * Math.PI) / 180); const s = Math.sin((a * Math.PI) / 180);
    return `<path d="M${r1(100 + 11 * c)} ${r1(104 + 11 * s)}L${r1(100 + 43 * c)} ${r1(104 + 43 * s)}"/><circle cx="${r1(100 + 50 * c)}" cy="${r1(104 + 50 * s)}" r="3.2"/>`;
  }).join('')}
    <path d="M100 24C105 31 107 35 107 38.5A7 7 0 0 1 93 38.5C93 35 95 31 100 24Z"/><path d="M100 46V54"/>
    <path d="M100 160V184"/>
    <path d="M100 224C86 214 80 198 84 182C92 190 98 202 100 224C102 202 108 190 116 182C120 198 114 214 100 224Z"/>
    <path d="M100 224C80 222 64 210 58 194C72 196 88 206 100 224C112 206 128 196 142 194C136 210 120 222 100 224Z" stroke-opacity=".75"/>
    <path d="M100 224C74 226 50 218 38 204C56 202 80 210 100 224C120 210 144 202 162 204C150 218 126 226 100 224Z" stroke-opacity=".55"/>`,
  // two wedding rings joined under a slender cross, in an open laurel wreath
  christian: () => `
    ${laurel(100, 128, 84, 104, 236, 7, { side: 1 })}
    ${laurel(100, 128, 84, 76, -56, 7, { side: -1 })}
    <path d="M96 34H104V60H124V68H104V112H96V68H76V60H96Z"/>
    <circle cx="86" cy="150" r="27"/><circle cx="86" cy="150" r="22" stroke-opacity=".55"/>
    <circle cx="114" cy="150" r="27"/><circle cx="114" cy="150" r="22" stroke-opacity=".55"/>
    <path d="M100 207C93 214 86 216 80 214M100 207C107 214 114 216 120 214" fill="none"/>`,
  // an open laurel wreath tied at the foot, a jasmine at its crown and one at its heart (no religious sign)
  neutral: () => `
    ${laurel(100, 124, 82, 102, 248, 8, { side: 1 })}
    ${laurel(100, 124, 82, 78, -68, 8, { side: -1 })}
    ${blossom(100, 42, 8.5)}
    ${blossom(100, 124, 17)}
    <circle cx="100" cy="124" r="40" stroke-opacity=".5"/>
    <path d="M100 206C92 214 84 218 76 216M100 206C108 214 116 218 124 216M100 206L90 222M100 206L110 222" fill="none"/>`,
};
const ALT = { buddhist: 'A Dharma wheel on an open lotus', muslim: 'A crescent and star under a pointed arch', christian: 'A cross above two joined wedding rings', neutral: 'A laurel wreath with jasmine' };
const cache = new Map();

const HEX = /^#[0-9a-f]{3,8}$/i;
/** The emblem as a fine-line SVG in the given ink (#hex); `halo` (optional #hex) is a soft line beneath, for art
 *  that sits on both light and dark (e.g. a gold medallion that later floats on a night sky). */
export function emblemSvg(kind, ink = '#b8893b', halo = '') {
  const draw = EMBLEM[kind] || EMBLEM.neutral;
  const col = HEX.test(ink) ? ink : '#b8893b';
  const under = HEX.test(halo) ? `<g fill="none" stroke="${halo}" stroke-opacity=".6" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">${draw()}</g>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" data-emblem="${kind}" viewBox="0 0 ${W} ${H}" width="${W * 4}" height="${H * 4}">${under}<g fill="none" stroke="${col}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${draw()}</g></svg>`.replace(/\s{2,}/g, ' ');
}

/** A photo reference for the emblem (works wherever a Ganesh picture works: img src, srcset, CSS url). */
export function emblemRef(kind, ink, halo = '') {
  const key = `${kind}|${ink}|${halo}`;
  if (!cache.has(key)) {
    const uri = `data:image/svg+xml,${encodeURIComponent(emblemSvg(kind, ink, halo))}`;
    cache.set(key, { lg: uri, sm: uri, w: W * 4, h: H * 4, face: [0.5, 0.52], zoom: 0.8, alt: ALT[kind] || ALT.neutral, faith: kind });
  }
  return cache.get(key);
}

/** A gold roundel version of an emblem ref (dark ink on pale gold), for medallions painted as a gold disc. */
export const roundelRef = (ref, ink = '#6e1016') => (ref?.faith ? emblemRef(ref.faith, ink) : ref);

/** A slot that holds the sacred image (a theme's Ganesh): by id, or `sacred: true` in its manifest entry. */
export const isSacredSlot = (id, spec) => Boolean(spec?.sacred) || /(^|\.)ganesh$/i.test(id);

/** The emblem's ink for a theme: the slot's or the theme's `faithInk` (a colour token or #hex), the couple's colour for it, else gold. */
export function inkFor(manifest, themeColors, slotInk, fallback = '#b8893b') {
  const want = slotInk || manifest?.faithInk;
  if (typeof want === 'string' && HEX.test(want)) return want;
  if (typeof want === 'string' && /^--[a-z0-9-]+$/.test(want)) {
    const own = themeColors?.[manifest.theme]?.[want];
    if (typeof own === 'string' && HEX.test(own)) return own;
    const d = manifest.colors?.[want]?.default;
    if (typeof d === 'string' && HEX.test(d)) return d;
  }
  return fallback;
}
/** The emblem's halo for a theme (`faithHalo`, a token or #hex), or '' for none. */
export const haloFor = (manifest, themeColors, slotHalo) => (slotHalo || manifest?.faithHalo ? inkFor({ ...manifest, faithInk: slotHalo || manifest.faithHalo }, themeColors, '', '') : '');

// ───────── a theme's communities ─────────

/** The communities a theme suits: exactly its slots.js `religions` (docs/FAITH-DESIGNS.md); none = Hindu only. */
export function themeReligions(manifest) {
  const r = Array.isArray(manifest?.religions) ? manifest.religions.filter(isReligion) : [];
  return r.length ? RELIGIONS.filter((x) => r.includes(x)) : ['hindu'];
}
export const suits = (manifest, religion) => themeReligions(manifest).includes(isReligion(religion) ? religion : 'hindu');

// ───────── a new invitation: ceremonies and wording per community ─────────

const blank = () => ({ en: '', ne: '' });
const ev = (id, en, ne, blurb, day, time, extra = {}) => ({ id, title: { en, ne }, blurb, day, time, ...extra });
/** The ceremonies a new invitation starts with (day = days from the wedding day; time = HH:MM, Nepal time). */
export const CEREMONIES = Object.freeze({
  hindu: [
    ev('mehendi', 'Mehendi', 'मेहन्दी', { en: 'Henna, songs and the women of both families.', ne: 'मेहन्दी, गीत र दुवै परिवारका दिदीबहिनी।' }, -3, '15:00', { colors: ['#4f6b2e', '#a9b85a', '#e9d9a6'], photo: 'mehendi-hands' }),
    ev('haldi', 'Haldi', 'हल्दी कार्यक्रम', { en: 'Turmeric for luck and glow, marigolds everywhere.', ne: 'बेसार लगाउने रमाइलो बिहानी।' }, -2, '10:00', { colors: ['#e8a317', '#f4c542', '#fff4d6'] }),
    ev('janti', 'Janti', 'जन्ती', { en: 'The groom’s procession arrives with the Naumati Baja.', ne: 'नौमती बाजासहित जन्ती आगमन।' }, 0, '10:30', { colors: ['#8e1424', '#c9963f', '#f4e9d6'] }),
    ev('wedding', 'Shubha Bibaha', 'शुभ विवाह', { en: 'The Swayambar and the wedding rites.', ne: 'स्वयम्बर तथा विवाह संस्कार।' }, 0, '12:00', { colors: ['#8e1424', '#c9963f', '#f4e9d6'], rituals: [
      { time: '12:00', title: { en: 'Swayambar', ne: 'स्वयम्बर' } },
      { time: { en: 'At the auspicious hour', ne: 'शुभ साइतमा' }, title: { en: 'Kanyadan, Sindoor & Saptapadi', ne: 'कन्यादान, सिन्दूर तथा सप्तपदी' } },
    ] }),
    ev('reception', 'Reception', 'प्रीतिभोज', { en: 'Dinner, music and a great many photographs.', ne: 'रात्रिभोज तथा साँस्कृतिक साँझ।' }, 1, '18:30', { colors: ['#1e2a4a', '#c9963f', '#2b1a12'] }),
  ],
  muslim: [
    ev('mehndi', 'Mehndi', 'मेहन्दी', { en: 'Henna, songs and the women of both families.', ne: 'मेहन्दी, गीत र दुवै परिवारका दिदीबहिनी।' }, -2, '16:00', { colors: ['#4f6b2e', '#a9b85a', '#e9d9a6'], photo: 'mehendi-hands' }),
    ev('nikah', 'Nikah', 'निकाह', { en: 'The Nikah, with the blessings of both families.', ne: 'दुवै परिवारको आशीर्वादसहित निकाह।' }, 0, '11:00', { colors: ['#14532d', '#c9963f', '#f4efe2'] }),
    ev('walima', 'Walima', 'वलीमा', { en: 'The wedding feast hosted by the groom’s family.', ne: 'दुलहा पक्षको तर्फबाट वलीमा भोज।' }, 1, '13:00', { colors: ['#1e2a4a', '#c9963f', '#f4efe2'] }),
    ev('reception', 'Reception', 'प्रीतिभोज', { en: 'An evening of dinner and celebration.', ne: 'रात्रिभोज तथा उत्सवको साँझ।' }, 2, '18:30', { colors: ['#1e2a4a', '#c9963f', '#2b1a12'] }),
  ],
  christian: [
    ev('engagement', 'Engagement & Ring Ceremony', 'सगाई तथा औँठी साटासाट', { en: 'Rings, prayers and both families together.', ne: 'औँठी साटासाट, प्रार्थना र दुवै परिवारको भेला।' }, -7, '16:00', { colors: ['#c9963f', '#f4e9d6', '#1e2a4a'] }),
    ev('wedding', 'Holy Matrimony', 'पवित्र विवाह', { en: 'The wedding service at the church: vows and the exchange of rings.', ne: 'चर्चमा विवाह आराधना: प्रतिज्ञा र औँठी साटासाट।' }, 0, '11:00', { colors: ['#f4f1ea', '#c9963f', '#1e2a4a'], rituals: [
      { time: '11:00', title: { en: 'The wedding service', ne: 'विवाह आराधना' } },
      { time: '12:00', title: { en: 'Vows and the exchange of rings', ne: 'प्रतिज्ञा तथा औँठी साटासाट' } },
    ] }),
    ev('reception', 'Reception', 'प्रीतिभोज', { en: 'Dinner, music and a great many photographs.', ne: 'रात्रिभोज, सङ्गीत र धेरै तस्बिरहरू।' }, 0, '18:30', { colors: ['#1e2a4a', '#c9963f', '#2b1a12'] }),
  ],
  buddhist: [
    ev('wedding', 'Wedding ceremony', 'विवाह समारोह', { en: 'Prayers and blessings for the two of you, with both families together.', ne: 'प्रार्थना र आशीर्वादसहित, दुवै परिवारको उपस्थितिमा विवाह।' }, 0, '11:00', { colors: ['#8e1424', '#c9963f', '#f4e9d6'] }),
    ev('reception', 'Reception', 'प्रीतिभोज', { en: 'Dinner, music and a great many photographs.', ne: 'रात्रिभोज तथा साँस्कृतिक साँझ।' }, 1, '18:30', { colors: ['#1e2a4a', '#c9963f', '#2b1a12'] }),
  ],
  kirat: [
    ev('wedding', 'Wedding ceremony', 'विवाह समारोह', { en: 'The wedding in our own tradition, with both families together.', ne: 'आफ्नै परम्पराअनुसार, दुवै परिवारको उपस्थितिमा विवाह।' }, 0, '11:00', { colors: ['#8e1424', '#c9963f', '#f4e9d6'] }),
    ev('reception', 'Reception', 'प्रीतिभोज', { en: 'Dinner, music, dance and a great many photographs.', ne: 'रात्रिभोज, गीत र नाचसहितको साँझ।' }, 1, '18:30', { colors: ['#1e2a4a', '#c9963f', '#2b1a12'] }),
  ],
  other: [
    ev('wedding', 'Wedding ceremony', 'विवाह समारोह', { en: 'The wedding, with both families together.', ne: 'दुवै परिवारको उपस्थितिमा विवाह।' }, 0, '11:00', { colors: ['#8e1424', '#c9963f', '#f4e9d6'] }),
    ev('reception', 'Reception', 'प्रीतिभोज', { en: 'Dinner, music and a great many photographs.', ne: 'रात्रिभोज तथा साँस्कृतिक साँझ।' }, 1, '18:30', { colors: ['#1e2a4a', '#c9963f', '#2b1a12'] }),
  ],
});

/** Ceremony presets for the studio's "add a ceremony" (titles only). */
export const CEREMONY_PRESETS = Object.freeze(Object.fromEntries(RELIGIONS.map((r) => [r, CEREMONIES[r].map((e) => ({ id: e.id, title: e.title, blurb: e.blurb }))])));

const ymd = (iso) => String(iso || '').slice(0, 10);
const addDays = (d, n) => { const t = new Date(`${d}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };

/** The events a new invitation starts with, dated around the wedding day (an ISO date-time). */
export function startingEvents(religion, weddingIso) {
  const day = ymd(weddingIso) || '2027-02-12';
  return (CEREMONIES[religion] || CEREMONIES.hindu).map((e) => {
    const d = addDays(day, e.day);
    const out = {
      id: e.id, title: { ...e.title }, blurb: { ...e.blurb }, start: `${d}T${e.time}:00+05:45`, end: '', openEnded: true,
      venue: blank(), mapQuery: '', dress: { colors: [...(e.colors || [])], text: blank() }, photo: e.photo || null,
    };
    if (e.rituals) out.rituals = structuredClone(e.rituals);
    return out;
  });
}

/** The wording of a new invitation for this community. names: { bride, groom } (first names as typed). */
export function startingWords(religion, { bride = '', groom = '' } = {}) {
  const both = bride && groom;
  const W2 = {
    hindu: {
      body: { en: `By the grace of our family deity and the blessings of our elders, the auspicious marriage of ${groom} with ${bride} has been fixed.`, ne: both ? `कुलदेवताको असीम कृपा र गुरुजनको आशीर्वादले ${groom} र ${bride}को शुभ विवाह हुने शुभ साइत जुरेको छ।` : '' },
      closing: { en: 'Your presence will be the greatest gift to us.', ne: 'हजुरको उपस्थिति नै हाम्रा लागि सबैभन्दा ठूलो उपहार हुनेछ।' },
    },
    buddhist: {
      body: { en: `With the blessings of the Triple Gem and our elders, ${groom} and ${bride} are to be married.`, ne: both ? `त्रिरत्न र गुरुजनको आशीर्वादले ${groom} र ${bride}को शुभ विवाह हुने भएको छ।` : '' },
      closing: { en: 'Your presence and your blessings will be the greatest gift to us.', ne: 'हजुरको उपस्थिति र आशीर्वाद नै हाम्रा लागि सबैभन्दा ठूलो उपहार हुनेछ।' },
    },
    kirat: {
      body: { en: `With the blessings of our ancestors and elders, ${groom} and ${bride} are to be married.`, ne: both ? `पितृ तथा गुरुजनको आशीर्वादले ${groom} र ${bride}को शुभ विवाह हुने भएको छ।` : '' },
      closing: { en: 'Your presence and your blessings will be the greatest gift to us.', ne: 'हजुरको उपस्थिति र आशीर्वाद नै हाम्रा लागि सबैभन्दा ठूलो उपहार हुनेछ।' },
    },
    muslim: {
      body: { en: `By the grace of Allah and with the blessings of our elders, the Nikah of ${groom} with ${bride} has been arranged.`, ne: both ? `अल्लाहको असीम कृपा र गुरुजनको आशीर्वादले ${groom} र ${bride}को निकाह हुने भएको छ।` : '' },
      closing: { en: 'Your presence and your duas will be the greatest gift to us.', ne: 'हजुरको उपस्थिति र दुआ नै हाम्रा लागि सबैभन्दा ठूलो उपहार हुनेछ।' },
    },
    christian: {
      body: { en: `By the grace of God and with the blessings of our families, ${groom} and ${bride} will be joined in Holy Matrimony.`, ne: both ? `परमेश्वरको अनुग्रह र परिवारको आशीर्वादले ${groom} र ${bride} पवित्र विवाह बन्धनमा बाँधिँदै छन्।` : '' },
      closing: { en: 'Your presence and your prayers will be the greatest gift to us.', ne: 'हजुरको उपस्थिति र प्रार्थना नै हाम्रा लागि सबैभन्दा ठूलो उपहार हुनेछ।' },
    },
    other: {
      body: { en: `With the blessings of our elders, ${groom} and ${bride} are to be married.`, ne: both ? `गुरुजनको आशीर्वादले ${groom} र ${bride}को विवाह हुने भएको छ।` : '' },
      closing: { en: 'Your presence will be the greatest gift to us.', ne: 'हजुरको उपस्थिति नै हाम्रा लागि सबैभन्दा ठूलो उपहार हुनेछ।' },
    },
  }[isReligion(religion) ? religion : 'hindu'];
  const rel = isReligion(religion) ? religion : 'hindu';
  return { ...W2, shloka: SHLOKA[symbolsFor(rel)] || null, title: TITLE[rel] };
}

/** The share-message greeting for the Send module (WhatsApp, Viber). */
export function shareMessage(religion, { names, url, to = '' }) {
  const hello = { hindu: 'Namaste', buddhist: 'Namaste', kirat: 'Sewaro', muslim: 'Assalamu Alaikum', christian: 'Greetings', other: 'Namaste' }[isReligion(religion) ? religion : 'hindu'];
  const what = { hindu: `the wedding (Shubha Bibaha) of ${names}`, buddhist: `the wedding of ${names}`, kirat: `the wedding of ${names}`, muslim: `the Nikah of ${names}`, christian: `the Holy Matrimony of ${names}`, other: `the wedding of ${names}` }[isReligion(religion) ? religion : 'hindu'];
  const bless = { hindu: 'Your presence and blessings would mean a great deal to us.', buddhist: 'Your presence and blessings would mean a great deal to us.', kirat: 'Your presence and blessings would mean a great deal to us.', muslim: 'Your presence and duas would mean a great deal to us.', christian: 'Your presence and prayers would mean a great deal to us.', other: 'Your presence would mean a great deal to us.' }[isReligion(religion) ? religion : 'hindu'];
  return `${hello}${to ? ` ${to}` : ''}! You are warmly invited to ${what}. ${bless} Please open your invitation: ${url}`;
}

// ───────── browser: the page's styles and the safety net ─────────

const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]+(?:[\s؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]*[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿])?/;
const STYLE = `
@font-face{font-family:'Nimtto Amiri';src:url('/themes/_faith/amiri-arabic.woff2') format('woff2');font-weight:400;font-style:normal;font-display:swap;unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF}
.faith-ar{font-family:'Nimtto Amiri','Amiri','Scheherazade New','Noto Naskh Arabic',serif!important;font-style:normal!important;font-weight:400!important;letter-spacing:0!important;word-spacing:.08em;text-transform:none!important;direction:rtl;unicode-bidi:isolate;font-feature-settings:normal!important;line-height:1.5;white-space:nowrap}
html[data-symbols]:not([data-symbols='hindu']) [data-hindu],html[data-religion]:not([data-religion='hindu']) [data-hindu-rite]{display:none!important}`;

/**
 * The page's faith (browser only). Marks <html> (data-religion, data-symbols: themes hide Hindu-only details with
 * [data-hindu] — gone when the symbols are not Hindu — and [data-hindu-rite] — gone when the community is not
 * Hindu), adds the Arabic font, and watches the page so that a hard-coded Hindu invocation in a design becomes
 * this page's invocation and Arabic always sits in its own right-to-left span. Hindu pages: nothing runs.
 */
export function startFaithDom({ religion, symbols }) {
  const html = document.documentElement;
  html.dataset.religion = religion;
  html.dataset.symbols = symbols;
  if (religion === 'hindu' && symbols === 'hindu') return;
  if (!document.getElementById('nimtto-faith-style')) {
    const s = document.createElement('style');
    s.id = 'nimtto-faith-style';
    s.textContent = STYLE;
    document.head.append(s);
  }
  const inv = INVOCATION[symbols] || INVOCATION.neutral;
  const fix = (root) => {
    if (root.nodeType === 1) for (const im of [root, ...root.querySelectorAll('img')]) if (im.tagName === 'IMG') raster(im);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const todo = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const v = n.nodeValue;
      if (!v || !v.trim()) continue;
      const p = n.parentElement;
      if (!p || p.closest('script,style,textarea,input,.faith-ar,[contenteditable]')) continue;
      if (symbols !== 'hindu' && (HINDU_INVOCATION.test(v) || OM_ONLY.test(v))) todo.push([n, 'swap']);
      else if (ARABIC.test(v)) todo.push([n, 'ar']);
    }
    for (const [n, what] of todo) {
      if (!n.parentNode) continue;
      if (what === 'swap') {
        const isNe = Boolean(n.parentElement.closest('.l-ne,[lang="ne"],[lang="sa"]'));
        const next = OM_ONLY.test(n.nodeValue) ? '' : n.nodeValue.replace(HINDU_INVOCATION, isNe ? inv.ne : inv.en);
        n.nodeValue = next;
        if (!next.trim()) { const el = n.parentElement; if (el && !el.textContent.trim() && !el.querySelector('img,svg,canvas')) el.style.display = 'none'; continue; }
        if (!ARABIC.test(next)) continue;
      }
      wrapArabic(n);
    }
  };
  fix(document.body);
  const mo = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') { if (m.target.parentNode) fix(m.target.parentNode); continue; }
      for (const node of m.addedNodes) {
        if (node.nodeType === 3) { if (node.parentNode) fix(node.parentNode); } else if (node.nodeType === 1 && !node.classList?.contains('faith-ar')) fix(node);
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true, characterData: true });
}

// The emblem is drawn as SVG but shown as a bitmap: some GPU rasterisers (seen with SwiftShader) paint a black band
// for a stroked SVG <img> inside a composited, animated layer. One canvas draw per emblem, cached; same size and look.
const rasters = new Map();
function raster(im) {
  const src = im.getAttribute('src') || '';
  if (!src.startsWith('data:image/svg+xml') || !src.includes('data-emblem')) return;
  if (!rasters.has(src)) {
    rasters.set(src, new Promise((resolve) => {
      const pic = new Image();
      pic.onload = () => {
        try {
          const c = document.createElement('canvas');
          c.width = W * 3; c.height = H * 3;
          c.getContext('2d').drawImage(pic, 0, 0, c.width, c.height);
          c.toBlob((b) => resolve(b ? URL.createObjectURL(b) : null), 'image/png');
        } catch { resolve(null); }
      };
      pic.onerror = () => resolve(null);
      pic.src = src;
    }));
  }
  rasters.get(src).then((url) => {
    if (!url || im.getAttribute('src') !== src) return;
    im.removeAttribute('srcset');
    im.src = url;
  });
}

/** Puts each run of Arabic in a text node into <span class="faith-ar" lang="ar" dir="rtl">. */
function wrapArabic(n) {
  const v = n.nodeValue;
  const m = ARABIC.exec(v);
  if (!m) return;
  const before = v.slice(0, m.index);
  const after = v.slice(m.index + m[0].length);
  const span = document.createElement('span');
  span.className = 'faith-ar';
  span.lang = 'ar';
  span.dir = 'rtl';
  span.textContent = m[0];
  if (m[0].includes('الرحمن')) span.title = 'In the name of Allah, the Most Gracious, the Most Merciful';
  const frag = document.createDocumentFragment();
  if (before) frag.append(before);
  frag.append(span);
  const rest = after ? document.createTextNode(after) : null;
  if (rest) frag.append(rest);
  n.replaceWith(frag);
  if (rest) wrapArabic(rest);
}
