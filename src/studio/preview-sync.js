// What the live preview should show and how to update it (PLATFORM.md "Live preview protocol").
//   diff(shown, now)      -> text and photo hot patches, live colours, or "needs a full render"
//   targetForField(input) -> where in the invitation the field being edited appears
//   imageTarget(...)      -> the place a photo appears
import { photoUrl } from '../photos.js';

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Keys whose change re-shapes the page (dates, ids, links, layout switches): a full render. */
const STRUCT = new Set(['start', 'end', 'weddingDate', 'timeZone', 'theme', 'religion', 'id', 'openEnded', 'enabled',
  'maxGuests', 'guestNames', 'shape', 'focal', 'w', 'h', 'depth', 'src', 'file', 'youtube', 'colors', 'kind', 'portrait']);
/** Words the page also uses in links (a map search, a phone number, a stream): patched in text and in hrefs. */
const LINKY = new Set(['mapQuery', 'phone', 'livestream']);
/** A theme line turned off with a code word: the page hides it, so it is a fresh render, never a word swap. */
const OFF_WORD = /^\s*(-|–|none|off|no|hide)\s*$/i;

// ── What the page shows for an empty field ──────────────────────────────────
// A bilingual text with one language empty shows the other one (src/core/i18n.js); a theme's own line left empty
// shows the design's original words. Those are the words a first keystroke replaces, so it stays a hot patch.
const DEFAULTS = new Map();
const keyOf = (path) => JSON.stringify(path);
/** Slot rows tell the preview the design's original words for a text (path without the language). */
export function registerDefault(path, words) {
  if (words && (words.en || words.ne)) DEFAULTS.set(keyOf(path), { en: String(words.en || ''), ne: String(words.ne || '') });
}
const getAt = (root, path) => path.reduce((o, k) => (o == null ? undefined : o[k]), root);
const trimmed = (v) => (typeof v === 'string' ? v.trim() : '');

/** { text, fb, olds }: what a page built from `root` shows for the string at `path` (fb: a fallback, not its own words). */
function shownText(root, path, v) {
  const own = trimmed(v);
  const lang = path[path.length - 1];
  const bil = lang === 'en' || lang === 'ne';
  const other = lang === 'en' ? 'ne' : 'en';
  const parent = bil ? getAt(root, path.slice(0, -1)) : null;
  const d = bil ? DEFAULTS.get(keyOf(path.slice(0, -1))) : null;
  const fbs = [...new Set([bil ? trimmed(parent?.[other]) : '', trimmed(d?.[lang]), trimmed(d?.[other])].filter(Boolean))];
  if (own) return { text: own, fb: false, olds: [] };
  return { text: fbs[0] || '', fb: true, olds: fbs.slice(1) };
}
/** Parts of the model the invitation page never shows. */
const UNSHOWN = new Set(['share', 'clientLink', 'access']);

const blank = (v) => v == null || v === '' || (Array.isArray(v) ? v.length === 0 : isPlain(v) && Object.keys(v).length === 0);
const isRef = (v) => typeof v === 'string' || (isPlain(v) && ('lg' in v || 'sm' in v || 'portrait' in v));
const photoPath = (path) => {
  const k = path[path.length - 1];
  return k === 'photo' || k === 'image' || path.includes('images');
};

/** A photo reference as the theme will draw it ({ portrait: n } points at a couple photo). */
export function resolveRef(ref, root) {
  if (isPlain(ref) && 'portrait' in ref) {
    const list = root?.couple?.portraits || [];
    const n = Number(ref.portrait) || 0;
    return list[n]?.photo ?? list[n % Math.max(list.length, 1)]?.photo ?? null;
  }
  return ref || null;
}
export const refUrls = (ref, root) => {
  const r = resolveRef(ref, root);
  return r ? [...new Set([photoUrl(r, 'lg'), photoUrl(r, 'sm')].filter(Boolean))] : [];
};

/**
 * Compares the model the preview shows with the current one.
 * Returns { structural, text: [...], images: [...], colors: {name: hex|''}|null, any }.
 */
export function diff(a, b) {
  const out = { structural: false, text: [], images: [], colors: null };
  const photo = (x, y, path) => {
    const rx = resolveRef(x, a);
    const ry = resolveRef(y, b);
    if (!rx || !ry) { if (rx !== ry) out.structural = true; return; }
    const lx = photoUrl(rx, 'lg');
    const ly = photoUrl(ry, 'lg');
    if (lx === ly) {
      if (JSON.stringify(isPlain(rx) ? rx.focal : null) !== JSON.stringify(isPlain(ry) ? ry.focal : null)) out.structural = true;
      return;
    }
    out.images.push({ path, pairs: [[lx, ly], [photoUrl(rx, 'sm'), photoUrl(ry, 'sm')]].filter(([p, q]) => p && q && p !== q) });
  };
  const walk = (x, y, path) => {
    if (x === y) return; // (keeps collecting after a structural change: words still patch while the page re-renders)
    if (blank(x) && blank(y)) return; // an empty {} or [] the editor created is not a change on the page
    const top = path[0];
    if (UNSHOWN.has(top)) return;
    if (path[path.length - 1] === 'volume') return; // the starting volume: nothing to see in the preview
    if (top === 'themeColors') return; // handled below
    // another gate or first screen: a fresh page (compared by value: the copy the preview keeps is a clone)
    if (top === 'design') { if (JSON.stringify(x ?? null) !== JSON.stringify(y ?? null)) out.structural = true; return; }
    if (path.length && photoPath(path) && (isRef(x) || isRef(y) || x == null || y == null)) { photo(x, y, path); return; }
    const key = path[path.length - 1];
    if ((typeof x === 'string' || x == null) && (typeof y === 'string' || y == null) && (typeof x === 'string' || typeof y === 'string')) {
      if (path.some((k) => STRUCT.has(k) && !LINKY.has(k)) || OFF_WORD.test(x || '') || OFF_WORD.test(y || '')) { out.structural = true; return; }
      const sa = shownText(a, path, x);
      const sb = shownText(b, path, y);
      if (sa.text === sb.text && sa.fb === sb.fb) return; // the page shows the same words (e.g. a space typed)
      const lang = key === 'en' || key === 'ne' ? key : null;
      // The other language is empty, so the page shows these words in its place too.
      const spill = lang && !trimmed(getAt(a, [...path.slice(0, -1), lang === 'en' ? 'ne' : 'en']));
      out.text.push({ kind: 'text', path, old: sa.text, value: typeof y === 'string' ? y : '', show: sb.text, ...(sa.olds.length ? { olds: sa.olds } : {}), ...(sa.fb ? { fb: true } : {}), ...(lang ? { lang } : {}), ...(spill ? { spill: true } : {}), ...(LINKY.has(key) ? { link: true } : {}) });
      return;
    }
    // A text object that appears or goes away ({ en, ne } vs nothing): its words, one by one.
    if (isPlain(x) && y == null && !photoPath(path)) { walk(x, {}, path); return; }
    if (x == null && isPlain(y) && !photoPath(path)) { walk({}, y, path); return; }
    if (Array.isArray(x) && Array.isArray(y)) {
      if (x.length !== y.length) { out.structural = true; return; }
      x.forEach((v, i) => walk(v, y[i], [...path, i]));
      return;
    }
    if (isPlain(x) && isPlain(y)) {
      for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) walk(x[k], y[k], [...path, k]);
      return;
    }
    if ((x == null || x === '') && (y == null || y === '')) return;
    void key;
    out.structural = true;
  };
  walk(a, b, []);
  // Photos that trade places (a reorder) cannot be swapped one by one.
  const froms = new Set(out.images.flatMap((c) => c.pairs.map((p) => p[0])));
  if (out.images.some((c) => c.pairs.some((p) => froms.has(p[1])))) out.structural = true;
  // Colours of the current design.
  const theme = b.theme;
  if (a.theme === theme) {
    const ca = a.themeColors?.[theme] || {};
    const cb = b.themeColors?.[theme] || {};
    for (const k of new Set([...Object.keys(ca), ...Object.keys(cb)])) {
      if (ca[k] !== cb[k]) (out.colors ||= {})[k] = cb[k] || '';
    }
  }
  // Colours of a borrowed gate or first screen (docs/MIX.md): live on that part's wrapper, while it is on the page.
  out.partColors = null;
  if (a.theme === theme && JSON.stringify(a.design || null) === JSON.stringify(b.design || null)) {
    for (const slug of new Set([b.design?.gate, b.design?.hero].filter((x) => x && x !== theme))) {
      const ca = a.themeColors?.[slug] || {};
      const cb = b.themeColors?.[slug] || {};
      for (const k of new Set([...Object.keys(ca), ...Object.keys(cb)])) {
        if (ca[k] !== cb[k]) ((out.partColors ||= {})[slug] ||= {})[k] = cb[k] || '';
      }
    }
  }
  out.any = out.structural || out.text.length > 0 || out.images.length > 0 || Boolean(out.colors) || Boolean(out.partColors);
  return out;
}

// ── Where things are ───────────────────────────────────────────────────────

/** A theme's own words and pictures (slots.js ids) by their first part. */
const SLOT_SECTIONS = [
  [/^(gate|threshold|envelope|env|cover|seal|curtain|door|doors|lattice|window|torana|opening|band)$/, 'gate'],
  [/^(hero|welcome|title|intro|arrival|ganesh|top|faith|still|scene|nav)$/, 'hero'],
  [/^(couple|us|pair|two|bond|stage|swayambar|sway|line|walk|vows|blessing)$/, 'couple'],
  [/^(families|fam|family)$/, 'families'],
  [/^(date|day)$/, 'date'],
  [/^(count|countdown)$/, 'countdown'],
  [/^scratch$/, 'scratch'],
  [/^(prog|programme|events|days|rites|rite|ceremonies|wedding|pheras|janti|reception|sindoor|courtyard|hall|ch\d)$/, 'events'],
  [/^(gallery|album|photos|prints|print|stills|easel|frame|tile|roll|film|feature)$/, 'gallery'],
  [/^(card|words|invitation)$/, 'card'],
  [/^(rsvp|reply)$/, 'rsvp'],
  [/^(close|closing|end|rooftop)$/, 'closing'],
  [/^(travel|info)$/, 'info'],
];
export function sectionOfSlot(id) {
  const head = String(id || '').split('.')[0];
  return SLOT_SECTIONS.find(([re]) => re.test(head))?.[1] || null;
}

/** The part of the invitation a model path belongs to ("events[2].venue.en" -> "event:2"). */
export function sectionOfPath(path) {
  const p = String(path || '');
  let m;
  if ((m = /^events\[(\d+)\]/.exec(p))) return `event:${m[1]}`;
  if (/^couple\.(bride|groom)\.name\b/.test(p)) return 'hero';
  if (/^couple\.(bride|groom)\./.test(p)) return 'families';
  if (/^couple\.hashtag/.test(p)) return 'closing';
  if (/^couple\.portraits/.test(p)) return 'couple';
  if (/^hosts/.test(p)) return 'card';
  if (/^story/.test(p)) return 'story';
  if (/^(invitation|saptapadi)/.test(p)) return 'card';
  if (/^closing/.test(p)) return 'closing';
  if (/^(weddingDate|city|timeZone)/.test(p)) return 'date';
  if (/^info/.test(p)) return 'info';
  if (/^rsvp/.test(p)) return 'rsvp';
  if (/^music/.test(p)) return 'music';
  if (/^share/.test(p)) return 'hero';
  if (/^gallery/.test(p)) return 'gallery';
  return null;
}

/** Where the field the client is in appears on the invitation: its words, and the part of the page. */
export function targetForField(input) {
  if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return null;
  const item = input.closest('[data-item]')?.dataset.item;
  let path = input.dataset.path || '';
  if (!path) {
    // Time inputs and colour swatches sit next to the field that carries the path.
    for (let a = input.parentElement, i = 0; a && i < 5 && !path; a = a.parentElement, i++) path = a.querySelector('[data-path]')?.dataset.path || '';
  }
  const cer = input.closest('.cer[data-index]');
  // A borrowed gate or first screen (docs/MIX.md): its own part of the page, in its own theme.
  const part = input.closest('[data-mx-theme]');
  const mx = part ? { theme: part.dataset.mxTheme, ...(part.dataset.mxPart ? { part: part.dataset.mxPart } : {}) } : null;
  let section = mx?.part || (item ? sectionOfSlot(item) : sectionOfPath(path));
  if (!section && cer) section = `event:${cer.dataset.index}`;
  const isText = input instanceof HTMLTextAreaElement || ['text', 'search', ''].includes(input.type);
  // An empty line of a theme's own words shows its original text (the placeholder).
  const raw = isText ? (input.value.trim() || (item ? (input.placeholder || '').trim() : '')) : '';
  const text = raw.split('\n')[0].trim().slice(0, 80);
  if (text.length < 2 && !section) return null;
  return { ...(text.length >= 2 ? { text } : {}), ...(section ? { section } : {}), ...(mx || {}) };
}

/** Where a photo appears: its URLs (for the exact element) and the part of the page. */
export function imageTarget(ref, root, section) {
  const image = refUrls(ref, root);
  if (!image.length && !section) return null;
  return { ...(image.length ? { image } : {}), ...(section ? { section } : {}) };
}

/** Entering a module moves the preview to its part of the invitation. */
export const MODULE_TARGETS = {
  home: { section: 'hero' },
  opening: { section: 'gate' },
  couple: { section: 'couple' },
  dates: { section: 'events' },
  photos: { section: 'gallery' },
  music: { section: 'music' },
  replies: { section: 'rsvp' },
  send: { section: 'hero' },
};
