// Server-side validation of the invitation data (THEME-CONTRACT §2).
// sanitizeInvitation(): types, lengths, formats and enums. Unknown keys are dropped.
//   Drafts may be incomplete, so empty strings are allowed here.
// publishProblems(): what is still missing before an invitation can go live.
import { isTheme, BUNDLED_SRCS, librarySlugs } from './catalog.js';
import { COLOR_TOKEN_RE, COLOR_HEX_RE } from './slots.js';
import { cleanDesign } from '../../src/core/mix-rules.js';
import { isReligion } from '../../src/core/faith.js';

export class ValidationError extends Error {
  constructor(errors) {
    super(errors.map((e) => `${e.path}: ${e.message}`).join('; '));
    this.status = 400;
    this.errors = errors;
  }
}

const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g; // control + bidi overrides
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const PHONE_RE = /^[0-9+()\-\s]{6,20}$/;
const EVENT_ID_RE = /^[a-z0-9-]{2,32}$/;
const LIB_SLUG_RE = /^[a-z0-9-]{2,64}$/;
const FILE_ID = '[A-Za-z0-9_-]{16,40}';
const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Validation context: collects errors with their JSON paths. */
function ctx(slug) {
  const errors = [];
  const fail = (path, message) => { errors.push({ path, message }); return undefined; };
  return { slug, errors, fail };
}

function text(c, v, path, max, { multiline = false } = {}) {
  if (v == null) return '';
  if (typeof v !== 'string' && typeof v !== 'number') return c.fail(path, 'must be text') ?? '';
  let s = String(v).normalize('NFC').replace(CTRL, '');
  if (!multiline) s = s.replace(/[\r\n]+/g, ' ');
  s = s.trim();
  if (s.length > max) return c.fail(path, `must be at most ${max} characters`) ?? '';
  return s;
}

const bi = (c, v, path, max, opts) => {
  const o = v && typeof v === 'object' ? v : {};
  return { en: text(c, o.en, `${path}.en`, max, opts), ne: text(c, o.ne, `${path}.ne`, max, opts) };
};

function list(c, v, path, max, item) {
  if (v == null) return [];
  if (!Array.isArray(v)) return c.fail(path, 'must be a list') ?? [];
  if (v.length > max) return c.fail(path, `at most ${max} items`) ?? [];
  return v.map((x, i) => item(x && typeof x === 'object' ? x : {}, `${path}[${i}]`, x));
}

function isoDate(c, v, path, { required = false } = {}) {
  if (v == null || v === '') return required ? c.fail(path, 'is required') ?? '' : '';
  const m = typeof v === 'string' && ISO_RE.exec(v);
  if (!m || Number.isNaN(Date.parse(v))) return c.fail(path, 'must be an ISO date-time with offset, e.g. 2027-02-12T10:30:00+05:45') ?? '';
  const year = Number(m[1]);
  if (year < 2000 || year > 2100) return c.fail(path, 'year out of range') ?? '';
  // Normalise to seconds precision, keep the given offset (Nepal is +05:45).
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || '00'}${m[7]}`;
}

function intIn(c, v, path, lo, hi, dflt) {
  if (v == null || v === '') return dflt;
  const n = Number(v);
  if (!Number.isInteger(n) || n < lo || n > hi) return c.fail(path, `must be a whole number from ${lo} to ${hi}`) ?? dflt;
  return n;
}

function httpsUrl(c, v, path, max = 500) {
  const s = text(c, v, path, max);
  if (!s) return '';
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:') throw new Error();
    return u.href;
  } catch {
    return c.fail(path, 'must be an https:// link') ?? '';
  }
}

/** Paths that a photo object may point at: this invitation's uploads, or the bundled library. */
function photoPath(c, v, path, kinds) {
  if (typeof v !== 'string') return c.fail(path, 'must be a path') ?? '';
  const up = new RegExp(`^/uploads/${c.slug}/${FILE_ID}-(${kinds})\\.webp$`);
  const lib = new RegExp(`^/photos/[a-z0-9-]{2,64}-(${kinds})\\.webp$`);
  if (up.test(v) || lib.test(v)) return v;
  return c.fail(path, 'is not an uploaded or library photo') ?? '';
}

/** A photo reference: null, a library slug, an https URL, or an uploaded photo object. */
function photoRef(c, v, path) {
  if (v == null || v === '') return null;
  if (typeof v === 'string') {
    if (LIB_SLUG_RE.test(v)) return librarySlugs().has(v) ? v : c.fail(path, `unknown library photo "${v}"`) ?? null;
    if (v.startsWith('https://')) return httpsUrl(c, v, path) || null;
    return c.fail(path, 'is not a valid photo reference') ?? null;
  }
  if (typeof v !== 'object' || Array.isArray(v)) return c.fail(path, 'is not a valid photo reference') ?? null;
  const out = { lg: photoPath(c, v.lg, `${path}.lg`, 'lg'), sm: photoPath(c, v.sm, `${path}.sm`, 'sm') };
  if (v.depth) out.depth = photoPath(c, v.depth, `${path}.depth`, 'depth');
  const f = Array.isArray(v.focal) ? v.focal : [0.5, 0.5];
  const fx = Number(f[0]), fy = Number(f[1]);
  out.focal = [fx, fy].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)
    ? [Math.round(fx * 1000) / 1000, Math.round(fy * 1000) / 1000]
    : (c.fail(`${path}.focal`, 'must be two numbers from 0 to 1'), [0.5, 0.5]);
  out.alt = text(c, v.alt, `${path}.alt`, 200);
  if (v.w != null) out.w = intIn(c, v.w, `${path}.w`, 1, 20000, undefined);
  if (v.h != null) out.h = intIn(c, v.h, `${path}.h`, 1, 20000, undefined);
  return out;
}

function audioSrc(c, v, path) {
  if (typeof v === 'string' && (BUNDLED_SRCS.has(v) || new RegExp(`^/uploads/${c.slug}/${FILE_ID}\\.mp3$`).test(v))) return v;
  return c.fail(path, 'must be a bundled track or an uploaded MP3') ?? '';
}

const SLOT_ID_RE = /^[a-z0-9][a-zA-Z0-9._-]{0,63}$/;

/**
 * themeContent[theme] = { images: { id: ref | { portrait: n } }, texts: { id: { en, ne } } }.
 * With the theme's manifest: only declared ids, its max lengths. Without one yet: any well-formed id,
 * generic limits (unknown ids are dropped on the first save after the manifest arrives).
 */
/** An image override: an ordinary photo reference or { portrait: n } (the couple's n-th photo). */
function slotImage(c, ref, path) {
  if (ref == null || ref === '') return null;
  if (typeof ref === 'object' && !Array.isArray(ref) && 'portrait' in ref) {
    const n = Number(ref.portrait);
    if (Number.isInteger(n) && n >= 0 && n < 24) return { portrait: n };
    return c.fail(path, 'must point at one of the couple photos') ?? null;
  }
  return photoRef(c, ref, path);
}

/** content = { images: { sharedKey: ref }, texts: { sharedKey: { en, ne } } }: travels between themes. */
function sharedContentOf(c, v, { vocab, sharedMax }) {
  const out = { images: {}, texts: {} };
  if (v == null) return out;
  if (typeof v !== 'object' || Array.isArray(v)) return c.fail('content', 'must be an object') ?? out;
  for (const [key, ref] of Object.entries(v.images && typeof v.images === 'object' ? v.images : {})) {
    if (!Object.hasOwn(vocab.images, key)) continue;
    const r = slotImage(c, ref, `content.images.${key}`);
    if (r) out.images[key] = r;
  }
  for (const [key, t] of Object.entries(v.texts && typeof v.texts === 'object' ? v.texts : {})) {
    if (!Object.hasOwn(vocab.texts, key)) continue;
    const b = bi(c, t, `content.texts.${key}`, Number.isFinite(sharedMax[key]) ? sharedMax[key] : 200, { multiline: true });
    if (b.en || b.ne) out.texts[key] = b;
  }
  return out;
}

/**
 * themeColors[theme] = { '--token': '#hex' }: only tokens the theme's slots.js `colors` manifest declares
 * (others are dropped, like unknown slot ids); values #rgb or #rrggbb, stored lowercase. Empty = theme default.
 */
function themeColorsOf(c, v, manifests) {
  const out = {};
  if (v == null) return out;
  if (typeof v !== 'object' || Array.isArray(v)) return c.fail('themeColors', 'must be an object') ?? {};
  for (const [theme, colors] of Object.entries(v)) {
    const man = isTheme(theme) ? manifests[theme]?.colors : null;
    if (!man || !colors || typeof colors !== 'object' || Array.isArray(colors)) continue;
    const t = {};
    for (const [token, val] of Object.entries(colors)) {
      if (!COLOR_TOKEN_RE.test(token) || !Object.hasOwn(man, token) || val == null || val === '') continue;
      if (typeof val !== 'string' || !COLOR_HEX_RE.test(val)) { c.fail(`themeColors.${theme}.${token}`, 'must be a colour like #8e1424'); continue; }
      t[token] = val.toLowerCase();
    }
    if (Object.keys(t).length) out[theme] = t;
  }
  return out;
}

/**
 * design = { gate?, hero? } (docs/MIX.md): another theme's gate and first screen on this theme's page. Checked
 * against both themes' `parts` (the giver gives it, the body takes it, opening scenes travel as a pair; rules in
 * src/core/mix-rules.js). Anything else is dropped silently, like unknown slot ids. Null when it is all the theme's own.
 */
export function designOf(v, theme, manifests) {
  if (v == null || typeof v !== 'object' || Array.isArray(v)) return null;
  const want = { gate: typeof v.gate === 'string' ? v.gate : undefined, hero: typeof v.hero === 'string' ? v.hero : undefined };
  return cleanDesign(want, theme, (slug) => (isTheme(slug) ? manifests[slug]?.parts || null : null));
}

/** music.youtube = { id, start?, title? } or nothing. We only ever embed YouTube's own player. */
function youtubeOf(c, v) {
  if (v == null || v === '') return undefined;
  if (typeof v !== 'object' || Array.isArray(v)) return c.fail('music.youtube', 'must be an object') ?? undefined;
  if (v.id == null || v.id === '') return undefined;
  if (typeof v.id !== 'string' || !YT_ID_RE.test(v.id)) return c.fail('music.youtube.id', 'must be an 11-character YouTube video id') ?? undefined;
  const out = { id: v.id };
  if (v.start != null && v.start !== '') {
    if (typeof v.start === 'number' && Number.isInteger(v.start) && v.start >= 0 && v.start <= 36000) out.start = v.start;
    else c.fail('music.youtube.start', 'must be a whole number of seconds from 0 to 36000');
  }
  const title = text(c, v.title, 'music.youtube.title', 120);
  if (title) out.title = title;
  return out;
}

function themeContentOf(c, v, manifests) {
  const out = {};
  if (v == null) return out;
  if (typeof v !== 'object' || Array.isArray(v)) return c.fail('themeContent', 'must be an object') ?? {};
  for (const [theme, tc] of Object.entries(v)) {
    if (!isTheme(theme) || !tc || typeof tc !== 'object') continue;
    const man = manifests[theme] || null;
    const p = `themeContent.${theme}`;
    const imgIn = tc.images && typeof tc.images === 'object' ? Object.entries(tc.images) : [];
    const txtIn = tc.texts && typeof tc.texts === 'object' ? Object.entries(tc.texts) : [];
    if (imgIn.length > 100 || txtIn.length > 300) { c.fail(p, 'too many entries'); continue; }
    const images = {};
    const texts = {};
    for (const [id, ref] of imgIn) {
      if (man ? !man.images[id] : !SLOT_ID_RE.test(id)) continue;
      const r = slotImage(c, ref, `${p}.images.${id}`);
      if (r) images[id] = r;
    }
    for (const [id, t] of txtIn) {
      const spec = man?.texts[id];
      if (man ? !spec : !SLOT_ID_RE.test(id)) continue;
      const b = bi(c, t, `${p}.texts.${id}`, spec?.max ?? 500, { multiline: spec ? spec.multiline : true });
      if (b.en || b.ne) texts[id] = b;
    }
    if (Object.keys(images).length || Object.keys(texts).length) out[theme] = { images, texts };
  }
  return out;
}

/** Returns a clean copy of the invitation data or throws ValidationError. `slots`: from slotInfo(). */
export function sanitizeInvitation(input, slug, slots = { manifests: {}, vocab: { images: {}, texts: {} }, sharedMax: {} }) {
  const c = ctx(slug);
  const d = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const o = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

  const person = (p, path) => ({
    name: bi(c, p.name, `${path}.name`, 60),
    fullName: bi(c, p.fullName, `${path}.fullName`, 120),
    parents: bi(c, p.parents, `${path}.parents`, 240),
    home: bi(c, p.home, `${path}.home`, 160),
    photo: photoRef(c, p.photo, `${path}.photo`),
  });

  const couple = o(d.couple);
  const inv = o(d.invitation);
  const info = o(d.info);
  const rsvp = o(d.rsvp);
  const music = o(d.music);
  const share = o(d.share);

  const events = list(c, d.events, 'events', 12, (e, p) => {
    const dress = o(e.dress);
    const ev = {
      id: EVENT_ID_RE.test(e.id) ? e.id : c.fail(`${p}.id`, 'must be 2-32 lowercase letters, digits or hyphens') ?? '',
      title: bi(c, e.title, `${p}.title`, 80),
      blurb: bi(c, e.blurb, `${p}.blurb`, 240),
      start: isoDate(c, e.start, `${p}.start`),
      end: isoDate(c, e.end, `${p}.end`),
      venue: bi(c, e.venue, `${p}.venue`, 200),
      mapQuery: text(c, e.mapQuery, `${p}.mapQuery`, 200),
      dress: {
        colors: list(c, dress.colors, `${p}.dress.colors`, 6, (_, pp, raw) => (HEX_RE.test(raw) ? raw.toLowerCase() : c.fail(pp, 'must be a colour like #8e1424') ?? '#000000')),
        text: bi(c, dress.text, `${p}.dress.text`, 120),
      },
      photo: photoRef(c, e.photo, `${p}.photo`),
    };
    if (ev.start && ev.end && Date.parse(ev.end) < Date.parse(ev.start)) c.fail(`${p}.end`, 'must be after the start');
    // Optional B.S. override (THEME-CONTRACT §12): only stored when the planner typed one.
    // No fixed end time: shown as "11:00 AM onwards" (timeLabel in src/core/i18n.js).
    if (e.openEnded === true) ev.openEnded = true;
    const bs = bi(c, e.dateBS, `${p}.dateBS`, 120);
    if (bs.en || bs.ne) ev.dateBS = bs;
    if (Array.isArray(e.rituals) && e.rituals.length) {
      ev.rituals = list(c, e.rituals, `${p}.rituals`, 12, (r, rp) => ({
        time: r.time && typeof r.time === 'object' ? bi(c, r.time, `${rp}.time`, 40) : text(c, r.time, `${rp}.time`, 40),
        title: bi(c, r.title, `${rp}.title`, 120),
      }));
    }
    return ev;
  });
  const ids = events.map((e) => e.id);
  if (new Set(ids).size !== ids.length) c.fail('events', 'two ceremonies have the same id');

  const out = {
    couple: {
      bride: person(o(couple.bride), 'couple.bride'),
      groom: person(o(couple.groom), 'couple.groom'),
      portraits: list(c, couple.portraits, 'couple.portraits', 24, (x, p) => ({
        photo: photoRef(c, x.photo, `${p}.photo`) ?? c.fail(`${p}.photo`, 'is required') ?? null,
        alt: text(c, x.alt, `${p}.alt`, 200),
      })),
      hashtag: text(c, couple.hashtag, 'couple.hashtag', 60),
    },
    hosts: bi(c, d.hosts, 'hosts', 200),
    weddingDate: isoDate(c, d.weddingDate, 'weddingDate'),
    weddingDateBS: bi(c, d.weddingDateBS, 'weddingDateBS', 120),
    city: bi(c, d.city, 'city', 120),
    invitation: {
      shloka: { sa: text(c, o(inv.shloka).sa, 'invitation.shloka.sa', 400, { multiline: true }), en: text(c, o(inv.shloka).en, 'invitation.shloka.en', 400, { multiline: true }) },
      salutation: bi(c, inv.salutation, 'invitation.salutation', 120),
      body: bi(c, inv.body, 'invitation.body', 2000, { multiline: true }),
      request: bi(c, inv.request, 'invitation.request', 1000, { multiline: true }),
      signoff: bi(c, inv.signoff, 'invitation.signoff', 120),
    },
    story: list(c, d.story, 'story', 12, (s, p) => ({ year: bi(c, s.year, `${p}.year`, 20), text: bi(c, s.text, `${p}.text`, 500, { multiline: true }) })),
    events,
    saptapadi: list(c, d.saptapadi, 'saptapadi', 7, (s, p) => bi(c, s, p, 160)),
    gallery: list(c, d.gallery, 'gallery', 60, (g, p) => {
      const item = {
        photo: photoRef(c, g.photo, `${p}.photo`) ?? c.fail(`${p}.photo`, 'is required') ?? null,
        shape: ['land', 'port', 'sq'].includes(g.shape) ? g.shape : 'land',
        alt: text(c, g.alt, `${p}.alt`, 200),
      };
      if (g.caption && (g.caption.en || g.caption.ne)) item.caption = bi(c, g.caption, `${p}.caption`, 120);
      return item;
    }),
    info: {
      travel: bi(c, info.travel, 'info.travel', 1000, { multiline: true }),
      stays: list(c, info.stays, 'info.stays', 8, (s, p) => ({ name: bi(c, s.name, `${p}.name`, 120), note: bi(c, s.note, `${p}.note`, 240), mapQuery: text(c, s.mapQuery, `${p}.mapQuery`, 200) })),
      contacts: list(c, info.contacts, 'info.contacts', 8, (k, p) => {
        const phone = text(c, k.phone, `${p}.phone`, 20);
        if (phone && !PHONE_RE.test(phone)) c.fail(`${p}.phone`, 'must be a phone number (digits, spaces, + ( ) -)');
        return { name: bi(c, k.name, `${p}.name`, 80), role: bi(c, k.role, `${p}.role`, 80), phone };
      }),
      livestream: httpsUrl(c, info.livestream, 'info.livestream'),
    },
    rsvp: {
      enabled: rsvp.enabled !== false,
      deadline: bi(c, rsvp.deadline, 'rsvp.deadline', 200),
      maxGuests: intIn(c, rsvp.maxGuests, 'rsvp.maxGuests', 1, 20, 6),
      endpoint: '', // set by the server for the public payload
    },
    music: {
      volume: Number.isFinite(Number(music.volume)) ? Math.min(1, Math.max(0, Number(music.volume))) : 0.75,
      tracks: list(c, music.tracks, 'music.tracks', 8, (t, p) => ({
        title: bi(c, t.title, `${p}.title`, 80),
        mood: bi(c, t.mood, `${p}.mood`, 80),
        src: audioSrc(c, t.src, `${p}.src`),
        credit: text(c, t.credit, `${p}.credit`, 300),
      })),
    },
    closing: bi(c, d.closing, 'closing', 400, { multiline: true }),
    theme: isTheme(d.theme) ? d.theme : c.fail('theme', 'unknown theme') ?? 'dhoka',
    content: sharedContentOf(c, d.content, slots),
    themeContent: themeContentOf(c, d.themeContent, slots.manifests),
    share: {
      title: text(c, share.title, 'share.title', 140),
      description: text(c, share.description, 'share.description', 300),
      image: photoRef(c, share.image, 'share.image') ?? '',
      siteUrl: '',
    },
  };

  // Optional keys only when set, so older saved data compares equal (no false "unpublished changes").
  const colors = themeColorsOf(c, d.themeColors, slots.manifests);
  if (Object.keys(colors).length) out.themeColors = colors;
  const design = designOf(d.design, out.theme, slots.manifests);
  if (design) out.design = design;
  const yt = youtubeOf(c, music.youtube);
  if (yt) out.music.youtube = yt;
  // religion: 'hindu' (the default, not stored, so older data compares equal) | 'muslim' | 'christian' | 'other'
  if (d.religion != null && d.religion !== '' && d.religion !== 'hindu') {
    if (isReligion(d.religion)) out.religion = d.religion;
    else c.fail('religion', "must be 'hindu', 'muslim', 'christian' or 'other'");
  }

  if (c.errors.length) throw new ValidationError(c.errors.slice(0, 50));
  return out;
}

/** Human-readable list of what is missing before publishing. Only the names and the main date are required. */
export function publishProblems(d) {
  const p = [];
  const has = (b) => b && (b.en || b.ne);
  if (!has(d.couple.bride.name)) p.push("The bride's name");
  if (!has(d.couple.groom.name)) p.push("The groom's name");
  if (!d.weddingDate) p.push('The wedding date');
  d.events.forEach((e, i) => {
    if (!e.start) p.push(`${e.title.en || e.title.ne || `Ceremony ${i + 1}`}: a date`);
  });
  return p;
}
