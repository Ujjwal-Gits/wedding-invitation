// Invitation documents: a draft the studio edits and a published snapshot guests see.
// File: data/invitations/<slug>.json = { slug, version, status, createdAt, updatedAt, publishedAt, draft, published,
//   access? { tokenHash, passwordHash, createdAt, themes, canChangeTheme, canChangeColors }, lastEdit? {at, by, type}, activity? [{at, by, type, sections}], adminSeenAt? }
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SLUG_RE, withLock, getInvitation, peekInvitation, revOf, listInvitations, createInvitation, saveInvitation, trashInvitation, uploadDir, replyStats } from './store.js';
import { entity, entityCache, sendEntity } from './http-cache.js';
import { sanitizeInvitation, publishProblems, designOf } from './validate.js';
import { demoConfig, BUNDLED_TRACKS, isTheme, listThemes, librarySlugs } from './catalog.js';
import { onDepthReady, depthStatus } from './depth.js';
import { slotInfo, loadManifest } from './slots.js';
import { canEdit, isAdmin, hasPerm, hashToken, newClientToken, revokeClientSessions, hashLinkPassword, permsOf, permsFor, PASSWORD_MIN, PASSWORD_MAX } from './auth.js';
import { customersBySlug, unlinkEverywhere } from './accounts.js';
import { readSite, tierOf, EMAIL_RE, themeMarketOf, themeStyleOf } from './site.js';
import { originAllowed } from './security.js';
import { sealToken, openToken } from './linkkey.js';
import { bsDateOf } from '../../src/core/i18n.js';
import { zoneOf, restamp, DEFAULT_TZ, isTimeZone } from '../../src/core/tz.js';
import { isReligion, startingEvents, startingWords, suits } from '../../src/core/faith.js';
import { changedAreas, AREA_IDS } from '../../src/core/draft-areas.js';
import { PUBLIC_ORIGINS, ROOT_DIR, IS_PROD } from './env.js';

const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Activity log (admin only, never in the public payload): the last 50 changes, newest last.
// Autosave fires after every pause in typing, so back-to-back saves by the same person
// (less than 10 minutes apart) fold into one entry with the union of the areas they touched.
const ACTIVITY_MAX = 50;
const MERGE_MS = 10 * 60 * 1000;
const actor = (req) => (isAdmin(req) ? 'admin' : 'couple');
function logActivity(doc, entry) {
  const log = Array.isArray(doc.activity) ? doc.activity : [];
  const last = log.at(-1);
  if (entry.type === 'edit' && last?.type === 'edit' && last.by === entry.by && Date.parse(entry.at) - Date.parse(last.at) < MERGE_MS) {
    last.sections = AREA_IDS.filter((id) => last.sections.includes(id) || entry.sections.includes(id));
    last.at = entry.at;
  } else {
    log.push(entry);
  }
  doc.activity = log.slice(-ACTIVITY_MAX);
  doc.lastEdit = { at: entry.at, by: entry.by, type: entry.type };
}
/** The couple changed something the planner has not opened since. */
const unseenByAdmin = (doc) => doc.lastEdit?.by === 'couple' && (!doc.adminSeenAt || doc.lastEdit.at > doc.adminSeenAt);

/**
 * The couple's link as the planner sees it (admin payloads only; never the hashes). `url` is the link itself,
 * shown and copied again any time; null for links made before links were stored (a new link fixes that).
 * Relative ('/studio/#/c/...') when no PUBLIC_ORIGIN is set: the studio resolves it against its own origin.
 */
const linkOut = (a, slug) => {
  if (!a) return null;
  const token = openToken(slug, a);
  return { createdAt: a.createdAt, hasPassword: Boolean(a.passwordHash), url: token ? `${PUBLIC_ORIGINS[0] || ''}/studio/#/c/${token}` : null, ...permsOf(a) };
};

const nameText = (v, max = 60) => (typeof v === 'string' ? v.normalize('NFC').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max) : '');

function summary(doc, rsvpCount = 0, customers = []) {
  const d = doc.draft;
  const hero = d.couple.portraits.find((p) => p.photo)?.photo ?? d.couple.bride.photo ?? null;
  return {
    slug: doc.slug,
    bride: d.couple.bride.name,
    groom: d.couple.groom.name,
    weddingDate: d.weddingDate,
    theme: d.theme,
    religion: d.religion || 'hindu',
    status: doc.status,
    changed: doc.status === 'published' && !same(doc.draft, doc.published),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    publishedAt: doc.publishedAt,
    rsvpCount,
    hero,
    lastEdit: doc.lastEdit || null,
    unseen: unseenByAdmin(doc),
    clientLink: linkOut(doc.access, doc.slug),
    customers, // accounts the planner linked it to: [{ id, email, name }]
  };
}

export const docOut = (doc, admin = true) => ({
  slug: doc.slug,
  clientLink: admin ? linkOut(doc.access, doc.slug) : null,
  version: doc.version,
  status: doc.status,
  changed: doc.status === 'published' && !same(doc.draft, doc.published),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  publishedAt: doc.publishedAt,
  lastEdit: doc.lastEdit || null,
  ...(admin ? { activity: doc.activity || [] } : {}),
  data: doc.draft,
});

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** A placeholder wedding day for a card nobody has dated yet (about six months ahead, never the demo's day). */
function placeholderDay() {
  const t = new Date(Date.now() + 182 * 864e5);
  let day = t.toISOString().slice(0, 10);
  if (day === String(demoConfig().weddingDate).slice(0, 10)) day = new Date(t.getTime() + 864e5).toISOString().slice(0, 10);
  return day;
}

/**
 * Starting data for a new invitation. Never the demo couple (src/config.js): only the names and wedding details the
 * owner or the customer entered, empty everywhere else. What every new card has is generic: the ceremonies and the
 * wording of the couple's community (src/core/faith.js; Hindu Mehendi, Haldi, Janti, Shubha Bibaha and Reception,
 * each its own event, so guests answer for each; Muslim Mehndi, Nikah, Walima, Reception; Christian Engagement,
 * Holy Matrimony, Reception; other: the wedding and the reception), the salutation and sign-off, the seven vows and
 * the first bundled song. No sample venues, story, contacts, stays, hashtag or photos (docs/PLATFORM.md "No demo on
 * real invitations").
 * Returns { data, placeholder } where placeholder.weddingDate is set when the date is only a placeholder.
 */
export function starter({ bride = '', groom = '', theme, religion = 'hindu', colors = null, weddingDate = '', venue = '' }) {
  const demo = demoConfig();
  const blank = () => ({ en: '', ne: '' });
  const words = startingWords(religion, { bride, groom });
  const day = DATE_RE.test(weddingDate || '') ? weddingDate : '';
  const date = `${day || placeholderDay()}T10:30:00+05:45`;
  const person = (name) => ({ name: { en: name, ne: '' }, fullName: blank(), parents: blank(), home: blank(), photo: null });
  const base = {
    couple: { bride: person(bride), groom: person(groom), portraits: [], hashtag: bride && groom ? `#${bride.replace(/\s+/g, '')}Weds${groom.replace(/\s+/g, '')}` : '' },
    hosts: bride && groom ? { en: `The families of ${bride} & ${groom}`, ne: '' } : blank(),
    weddingDate: date,
    weddingDateBS: blank(), // worked out from the date (see publicData)
    city: blank(),
    invitation: {
      shloka: { ...demo.invitation.shloka },
      salutation: { ...demo.invitation.salutation },
      body: bride && groom ? { ...words.body } : blank(),
      request: { ...demo.invitation.request },
      signoff: { ...demo.invitation.signoff },
    },
    story: [],
    events: [],
    saptapadi: structuredClone(demo.saptapadi),
    gallery: [],
    info: { travel: blank(), stays: [], contacts: [], livestream: '' },
    rsvp: { enabled: true, deadline: blank(), maxGuests: demo.rsvp.maxGuests, endpoint: '' },
    music: { volume: 0.75, tracks: [BUNDLED_TRACKS[0]] },
    closing: { ...demo.closing },
    theme: '',
    themeContent: {},
    content: { images: {}, texts: {} },
  };
  // The ceremonies, each its own event, dated around the wedding day; the venue the customer gave goes on that day's.
  const wd = date.slice(0, 10);
  base.events = startingEvents(religion, date).map((e) => {
    if (venue && String(e.start).slice(0, 10) === wd) e.venue = { en: venue, ne: '' };
    return e;
  });
  if (religion !== 'hindu') {
    base.religion = religion;
    base.saptapadi = [];
    base.invitation.shloka = { ...(words.shloka || { sa: '', en: '' }) };
    base.closing = { ...words.closing };
  }
  base.theme = isTheme(theme) ? theme : (listThemes().find((t) => t.ready)?.slug || 'dhoka');
  if (colors && typeof colors === 'object' && !Array.isArray(colors)) base.themeColors = { [base.theme]: colors };
  base.share = { title: bride && groom ? `${bride} & ${groom} · ${words.title.en}` : '', description: 'You are warmly invited to our wedding.', image: '', siteUrl: '' };
  return { data: base, placeholder: day ? null : { weddingDate: date } };
}

/** Adds depth URLs to uploaded photo objects whose depth map now exists. */
function attachDepth(slug, node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((n) => attachDepth(slug, n)); return; }
  const m = typeof node.lg === 'string' && new RegExp(`^/uploads/${slug}/([A-Za-z0-9_-]+)-lg\\.webp$`).exec(node.lg);
  if (m && !node.depth && existsSync(resolve(uploadDir(slug), `${m[1]}-depth.webp`))) node.depth = `/uploads/${slug}/${m[1]}-depth.webp`;
  for (const v of Object.values(node)) if (v && typeof v === 'object') attachDepth(slug, v);
}

onDepthReady((slug) => withLock(`inv:${slug}`, async () => {
  const doc = await getInvitation(slug);
  if (!doc) return;
  const before = JSON.stringify([doc.draft, doc.published]);
  attachDepth(slug, doc.draft);
  attachDepth(slug, doc.published);
  if (JSON.stringify([doc.draft, doc.published]) !== before) await saveInvitation(doc);
}).catch((err) => console.warn('[depth] patch failed', err.message)));

/** A private, mutable copy (for changes under the invitation's lock). */
const load = async (slug) => {
  const doc = await getInvitation(slug);
  if (!doc) throw httpError(404, 'No invitation with that link name.');
  return doc;
};
/** The stored doc, shared and read-only (cached; for answers that change nothing). */
const peek = async (slug) => {
  const doc = await peekInvitation(slug);
  if (!doc) throw httpError(404, 'No invitation with that link name.');
  return doc;
};

// ── Admin handlers ─────────────────────────────────────────────────────────

export async function list(req, res) {
  const [docs, replies] = await Promise.all([listInvitations(), replyStats()]);
  const bySlug = customersBySlug();
  const items = docs.map((d) => summary(d, replies.get(d.slug)?.count || 0, bySlug.get(d.slug) || [])).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  // Staff who see this list only to pick an invitation (replies, customers) never get the couple links themselves.
  if (!hasPerm(req, 'invitations')) for (const i of items) if (i.clientLink) i.clientLink = { ...i.clientLink, url: null };
  res.json({ invitations: items });
}

/** After a new invitation is stored: link it to a customer account (lib/handover.js registers this). */
let onCreated = null;
export const setOnCreated = (fn) => { onCreated = fn; };
// The venue zone a new invitation for a customer starts with (lib/handover.js: International customers by phone).
let zoneFor = null;
export const setZoneFor = (fn) => { zoneFor = fn; };

/**
 * Stores a new invitation (starter data, never the demo). opts: { slug, bride, groom, theme, religion, colors,
 * weddingDate (YYYY-MM-DD), venue }. 409 when the link name is taken. Returns the stored doc.
 */
export async function createInvitationDoc({ slug, bride = '', groom = '', theme, religion = 'hindu', colors = null, weddingDate = '', venue = '', timeZone = '' }) {
  if (!SLUG_RE.test(slug)) throw httpError(400, 'The link name must be 3-64 lowercase letters, digits or hyphens.');
  return withLock(`inv:${slug}`, async () => {
    if (await getInvitation(slug)) throw httpError(409, 'That link name is already taken.');
    const now = new Date().toISOString();
    const slots = await slotInfo();
    // the design must suit the community; without one (or with an unsuitable one) the first ready design that does
    const ok = (t) => isTheme(t) && listThemes().find((x) => x.slug === t)?.ready && suits(slots.manifests[t], religion);
    const chosen = ok(theme) ? theme : (listThemes().find((t) => ok(t.slug))?.slug || theme);
    const start = starter({ bride, groom, theme: chosen, religion, colors, weddingDate, venue: nameText(venue, 200) });
    // International customers: the venue's zone from their phone (lib/market.js likelyZone); every time keeps its wall
    // clock (10:30 stays 10:30), the placeholder date moves with it
    if (timeZone && timeZone !== DEFAULT_TZ && isTimeZone(timeZone)) {
      const s = start.data;
      s.timeZone = timeZone;
      s.weddingDate = restamp(s.weddingDate, DEFAULT_TZ, timeZone);
      for (const e of s.events) { if (e.start) e.start = restamp(e.start, DEFAULT_TZ, timeZone); if (e.end) e.end = restamp(e.end, DEFAULT_TZ, timeZone); }
      if (start.placeholder) start.placeholder.weddingDate = s.weddingDate;
    }
    const draft = sanitizeInvitation(start.data, slug, slots);
    const d = { slug, version: 1, status: 'draft', createdAt: now, updatedAt: now, publishedAt: null, draft, published: null };
    if (start.placeholder) d.placeholder = start.placeholder; // the wedding date nobody has set yet (lib/handover.js)
    await createInvitation(d);
    return d;
  });
}

export async function create(req, res) {
  const b = req.body || {};
  const slug = typeof b.slug === 'string' ? b.slug.trim() : '';
  if (!SLUG_RE.test(slug)) throw httpError(400, 'The link name must be 3-64 lowercase letters, digits or hyphens.');
  const bride = nameText(b.bride);
  const groom = nameText(b.groom);
  if (!bride || !groom) throw httpError(400, 'Please enter both first names.');
  if (b.religion != null && !isReligion(b.religion)) throw httpError(400, "religion must be 'hindu', 'muslim', 'christian' or 'other'.");
  const religion = b.religion || 'hindu';
  if (b.colors != null && (typeof b.colors !== 'object' || Array.isArray(b.colors) || Object.keys(b.colors).length > 12)) throw httpError(400, 'colors must be an object of colour tokens.');
  const weddingDate = typeof b.weddingDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.weddingDate) ? b.weddingDate : '';
  const customerEmail = typeof b.customerEmail === 'string' ? b.customerEmail.normalize('NFC').trim().toLowerCase() : '';
  if (customerEmail && (customerEmail.length > 254 || !EMAIL_RE.test(customerEmail))) throw httpError(400, 'The customer email does not look right.', { errors: [{ path: 'customerEmail', message: 'must be an email address' }] });
  const doc = await createInvitationDoc({ slug, bride, groom, theme: b.theme, religion, colors: b.colors, weddingDate, venue: b.venue, timeZone: zoneFor ? await zoneFor({ customerEmail, order: typeof b.order === 'string' ? b.order : '' }) : '' });
  console.info(`[admin] create slug=${slug} religion=${religion}`);
  const customer = onCreated ? await onCreated(doc, { customerEmail, order: typeof b.order === 'string' ? b.order : '' }) : null;
  res.status(201).json({ ...docOut(doc), ...(customer ? { customer } : {}) });
}

export async function read(req, res) {
  res.json(docOut(await peek(req.params.slug), isAdmin(req)));
}

export async function update(req, res) {
  const { slug } = req.params;
  const b = req.body || {};
  const slots = await slotInfo();
  const doc = await withLock(`inv:${slug}`, async () => {
    const cur = await load(slug);
    if (b.version !== cur.version) throw httpError(409, 'This invitation was changed in another tab. Reload to get the latest version.', { current: cur.version });
    const draft = sanitizeInvitation(b.data, slug, slots);
    if (!isAdmin(req)) clientLimits(cur, draft, slots.manifests, permsFor(req, cur));
    attachDepth(slug, draft);
    if (same(cur.draft, draft)) return cur; // nothing changed: no new version, nothing to log
    const sections = changedAreas(cur.draft, draft);
    cur.draft = draft;
    cur.version += 1;
    cur.updatedAt = new Date().toISOString();
    logActivity(cur, { at: cur.updatedAt, by: actor(req), type: 'edit', sections: sections.length ? sections : ['other'] });
    await saveInvitation(cur);
    return cur;
  });
  res.json({ version: doc.version, updatedAt: doc.updatedAt, lastEdit: doc.lastEdit || null, changed: doc.status === 'published' && !same(doc.draft, doc.published), data: doc.draft });
}

/** What a couple may not change without the planner's permission (PLATFORM.md: access). */
function clientLimits(cur, draft, manifests = {}, p = permsOf(cur.access)) {
  // Colours compared by value, not key order, and only tokens the manifests still declare (the sanitiser drops
  // the others from the new draft, so a stale token in the saved one must not block every save).
  const colorKey = (tc) => JSON.stringify(Object.entries(tc || {}).flatMap(([theme, toks]) => Object.entries(toks || {})
    .filter(([k]) => Object.hasOwn(manifests[theme]?.colors || {}, k)).map(([k, v]) => `${theme} ${k} ${String(v).toLowerCase()}`)).sort());
  if (draft.theme !== cur.draft.theme) {
    if (!p.canChangeTheme) throw httpError(403, 'Your planner has not turned on changing the design.');
    if (p.themes !== 'all' && !p.themes.includes(draft.theme)) throw httpError(403, 'That design is not one your planner chose for you.');
  }
  // The gate and first screen (docs/MIX.md) are part of the design: the same permission, and every theme they come
  // from must be one the planner allowed. The saved design is re-checked first, so a part that stopped being
  // offered (a manifest changed) does not block every save.
  const was = designOf(cur.draft.design, cur.draft.theme, manifests) || {};
  const now = draft.design || {};
  const moved = ['gate', 'hero'].filter((k) => (was[k] || null) !== (now[k] || null));
  if (moved.length) {
    if (!p.canChangeTheme) throw httpError(403, 'Your planner has not turned on changing the design.');
    if (p.themes !== 'all' && moved.some((k) => now[k] && !p.themes.includes(now[k]))) {
      throw httpError(403, 'That gate or first screen comes from a design your planner did not choose for you.');
    }
  }
  // The community (docs/PLATFORM.md "Religion") brings its own designs, so it changes under the design permission;
  // and a couple's design, gate and first screen must suit it whenever one of them changes.
  const rel = draft.religion || 'hindu';
  if (rel !== (cur.draft.religion || 'hindu') && !p.canChangeTheme) throw httpError(403, 'Your planner has not turned on changing the design, so the community cannot change either.');
  if (rel !== (cur.draft.religion || 'hindu') || draft.theme !== cur.draft.theme || moved.length) {
    const parts = [draft.theme, now.gate, now.hero].filter(Boolean);
    if (parts.some((t) => manifests[t] && !suits(manifests[t], rel))) throw httpError(403, 'That design is not made for this community. Choose one of the designs shown for it.');
  }
  if (!p.canChangeColors && colorKey(cur.draft.themeColors) !== colorKey(draft.themeColors)) {
    throw httpError(403, 'Your planner has not turned on changing the colours.');
  }
}

export async function publish(req, res) {
  const { slug } = req.params;
  const doc = await withLock(`inv:${slug}`, async () => {
    const cur = await load(slug);
    const problems = publishProblems(cur.draft);
    if (problems.length) throw httpError(422, 'A few things are missing before this can go live.', { problems });
    cur.published = structuredClone(cur.draft);
    cur.status = 'published';
    cur.publishedAt = new Date().toISOString();
    cur.version += 1;
    logActivity(cur, { at: cur.publishedAt, by: actor(req), type: 'publish', sections: [] });
    await saveInvitation(cur);
    return cur;
  });
  console.info(`[admin] publish slug=${slug} by=${req.session.role}`);
  res.json(docOut(doc, isAdmin(req)));
}

export async function unpublish(req, res) {
  const { slug } = req.params;
  const doc = await withLock(`inv:${slug}`, async () => {
    const cur = await load(slug);
    cur.status = 'draft';
    cur.published = null;
    cur.version += 1;
    logActivity(cur, { at: new Date().toISOString(), by: actor(req), type: 'unpublish', sections: [] });
    await saveInvitation(cur);
    return cur;
  });
  console.info(`[admin] unpublish slug=${slug}`);
  res.json(docOut(doc));
}

/** GET /api/invitations/:slug/version: the cheap check the studio polls to notice changes made elsewhere. */
export async function version(req, res) {
  const doc = await peek(req.params.slug);
  res.json({ version: doc.version, status: doc.status, updatedAt: doc.updatedAt, lastEdit: doc.lastEdit || null });
}

/** POST /api/invitations/:slug/seen: the planner has looked at the latest changes (clears the home-card dot). */
export async function seen(req, res) {
  const { slug } = req.params;
  await withLock(`inv:${slug}`, async () => {
    const cur = await load(slug);
    cur.adminSeenAt = new Date().toISOString();
    await saveInvitation(cur);
  });
  res.json({ ok: true });
}

export async function remove(req, res) {
  const { slug } = req.params;
  if (req.body?.confirm !== slug) throw httpError(400, 'Type the link name to confirm.');
  await withLock(`inv:${slug}`, async () => {
    await load(slug);
    await withLock(`rsvp:${slug}`, () => trashInvitation(slug));
  });
  await revokeClientSessions(slug);
  await unlinkEverywhere(slug);
  console.info(`[admin] delete (to trash) slug=${slug}`);
  res.json({ ok: true });
}

/** Validates the couple's link options. `partial`: only the fields that were sent (PATCH). */
function accessInput(b, { partial }) {
  const out = {};
  const errors = [];
  if (!partial || b.password !== undefined) {
    if (typeof b.password !== 'string' || b.password.length < PASSWORD_MIN || b.password.length > PASSWORD_MAX) {
      errors.push({ path: 'password', message: `must be ${PASSWORD_MIN}-${PASSWORD_MAX} characters` });
    } else out.password = b.password;
  }
  if (b.themes !== undefined || !partial) {
    const t = b.themes ?? 'all';
    if (t === 'all') out.themes = 'all';
    else if (Array.isArray(t) && t.length <= 100 && t.every((x) => typeof x === 'string' && isTheme(x))) out.themes = [...new Set(t)];
    else errors.push({ path: 'themes', message: "must be 'all' or a list of theme slugs" });
  }
  for (const [k, dflt] of [['canChangeTheme', false], ['canChangeColors', true]]) {
    if (b[k] === undefined) { if (!partial) out[k] = dflt; } else if (typeof b[k] === 'boolean') out[k] = b[k];
    else errors.push({ path: k, message: 'must be true or false' });
  }
  if (errors.length) throw httpError(400, 'Please check the link settings.', { errors });
  return out;
}

/** The public origin for links we hand out: the configured one, else this request's (allowed) Origin. */
const linkOrigin = (req) => PUBLIC_ORIGINS[0] || (originAllowed(req) ? req.get('origin') : '');

/** POST /api/invitations/:slug/client-link: a new password-protected link for the couple (the old one stops working). */
export async function createClientLink(req, res) {
  const { slug } = req.params;
  const opts = accessInput(req.body || {}, { partial: false });
  await load(slug);
  const token = newClientToken();
  const passwordHash = await hashLinkPassword(opts.password);
  const doc = await withLock(`inv:${slug}`, async () => {
    const cur = await load(slug);
    const tokenEnc = sealToken(slug, token);
    cur.access = { tokenHash: hashToken(token), ...(tokenEnc ? { tokenEnc } : {}), passwordHash, createdAt: new Date().toISOString(), themes: opts.themes, canChangeTheme: opts.canChangeTheme, canChangeColors: opts.canChangeColors };
    await saveInvitation(cur);
    return cur;
  });
  await revokeClientSessions(slug);
  console.info(`[admin] client link created slug=${slug}`);
  // Stored encrypted (lib/linkkey.js) so the planner can copy it again; tokenHash is what sign-in looks up.
  res.status(201).json({ url: `${linkOrigin(req)}/studio/#/c/${token}`, token, createdAt: doc.access.createdAt, clientLink: linkOut(doc.access, slug) });
}

/** PATCH /api/invitations/:slug/access: change what the couple may do, or their password (ends their sessions). */
export async function patchAccess(req, res) {
  const { slug } = req.params;
  const opts = accessInput(req.body || {}, { partial: true });
  const passwordHash = opts.password ? await hashLinkPassword(opts.password) : null;
  const doc = await withLock(`inv:${slug}`, async () => {
    const cur = await load(slug);
    if (!cur.access) throw httpError(404, 'This invitation has no couple link yet.');
    for (const k of ['themes', 'canChangeTheme', 'canChangeColors']) if (opts[k] !== undefined) cur.access[k] = opts[k];
    if (passwordHash) cur.access.passwordHash = passwordHash;
    await saveInvitation(cur);
    return cur;
  });
  if (passwordHash) await revokeClientSessions(slug); // the same link now needs the new password
  console.info(`[admin] client access changed slug=${slug}${passwordHash ? ' (password)' : ''}`);
  res.json({ clientLink: linkOut(doc.access, slug) });
}

/** DELETE /api/invitations/:slug/client-link: turn the couple's link off. */
export async function deleteClientLink(req, res) {
  const { slug } = req.params;
  await withLock(`inv:${slug}`, async () => {
    const cur = await load(slug);
    delete cur.access;
    delete cur.clientAccess;
    await saveInvitation(cur);
  });
  await revokeClientSessions(slug);
  console.info(`[admin] client link removed slug=${slug}`);
  res.json({ ok: true });
}

/** Still pictures of a theme's gate and first screen (public/themes/<slug>/gate.jpg, hero.jpg), when shot. */
function stillsOf(slug) {
  const one = (name) => ([resolve(ROOT_DIR, 'public', 'themes', slug, name), resolve(ROOT_DIR, 'dist', 'themes', slug, name)].some(existsSync) ? `/themes/${slug}/${name}` : '');
  return { gate: one('gate.jpg'), hero: one('hero.jpg') };
}

// The catalog part of /api/meta reads manifests, credits and the photo folder: worked out at most every 10 s.
let metaCache = { at: 0, value: null };
async function metaCatalog() {
  if (metaCache.value && Date.now() - metaCache.at < 10_000) return metaCache.value;
  let credits = [];
  try { credits = JSON.parse(readFileSync(resolve(ROOT_DIR, 'src', 'generated', 'credits.json'), 'utf8')); } catch { credits = []; }
  const bySlug = new Map();
  for (const x of Array.isArray(credits) ? credits : []) if (x?.file) { const k = x.file.replace(/\.jpe?g$/i, ''); if (!bySlug.has(k)) bySlug.set(k, x); }
  const lib = [...librarySlugs()].sort().map((slug) => {
    const c = bySlug.get(slug);
    return { slug, title: c?.title || slug, focal: c && c.focal_x != null ? [c.focal_x, c.focal_y] : [0.5, 0.5] };
  });
  const themes = await Promise.all(listThemes().map(async (t) => {
    const m = await loadManifest(t.slug);
    return { ...t, name: m?.name || t.name, concept: m?.description || t.concept, colors: m?.colors || {}, parts: m?.parts || null, religions: m?.religions || ['hindu'], faithInk: m?.faithInk || '', stills: stillsOf(t.slug) };
  }));
  metaCache = { at: Date.now(), value: { themes, library: lib } };
  return metaCache.value;
}

export async function meta(req, res) {
  const [{ themes: list, library }, site] = await Promise.all([metaCatalog(), readSite()]);
  // market ('np' | 'intl' | 'both') and style after the planner's overrides (Themes page; docs/API.md "Markets")
  const themes = list.map((t) => ({ ...t, tier: tierOf(t.slug, site), market: themeMarketOf(t.slug, site, t), style: themeStyleOf(t.slug, site, t) }));
  res.json({ themes, tracks: BUNDLED_TRACKS, library, depth: depthStatus(), publicOrigin: PUBLIC_ORIGINS[0] || '', shortLinks: IS_PROD });
}


// ── Public ─────────────────────────────────────────────────────────────────

/** A photo ref as a site path or https URL ('' when none): library slug, upload object or https link. */
export function photoUrl(ref) {
  if (!ref) return '';
  if (typeof ref === 'object') return typeof ref.sm === 'string' ? ref.sm : typeof ref.lg === 'string' ? ref.lg : '';
  if (typeof ref !== 'string') return '';
  if (ref.startsWith('https://')) return ref;
  return /^[a-z0-9-]{2,64}$/.test(ref) ? `/photos/${ref}-sm.webp` : '';
}

/**
 * GET /api/invitations/:slug/public: the published snapshot only, with the RSVP endpoint filled in.
 * A signed-in admin gets the draft instead, so the studio's live preview shows unpublished edits.
 */
const publicCache = entityCache(1000); // slug -> the guests' JSON at the invitation's current revision

export async function publicData(req, res) {
  const { slug } = req.params;
  const doc = await peekInvitation(slug);
  const preview = Boolean(doc) && canEdit(req, slug); // planner, or the couple for their own invitation
  const src = preview ? doc.draft : doc?.status === 'published' ? doc.published : null;
  if (!src) throw httpError(404, 'Not found.');
  res.vary('Cookie');
  if (preview) {
    res.set('X-Invitation-Preview', 'draft');
    res.set('Cache-Control', 'no-store');
    return res.json(publicPayload(src, slug));
  }
  // Guests: built once per published revision, then served from memory with an ETag (304 when unchanged).
  const rev = revOf(doc);
  const e = publicCache.get(slug, rev) || publicCache.set(slug, rev, entity(JSON.stringify(publicPayload(src, slug)), 'application/json; charset=utf-8'));
  res.set('Cache-Control', 'no-cache');
  return sendEntity(req, res, e);
}

/** The page's data from a draft or published snapshot (a new object; the stored one is never changed). */
function publicPayload(src, slug) {
  const out = structuredClone(src);
  out.timeZone = zoneOf(out); // the venue's zone (absent in older data = Nepal)
  out.rsvp.endpoint = `/api/invitations/${slug}/rsvp`;
  if (!out.music.tracks.length) out.music.tracks = [BUNDLED_TRACKS[0]];
  // Ceremonies with no end time are "onwards": give older themes a sensible end too.
  for (const e of out.events) {
    if (e.start && !e.end) { e.end = new Date(Date.parse(e.start) + 5 * 3600e3).toISOString().replace(/\.\d{3}Z$/, '+00:00'); e.openEnded = true; }
  }
  out.share.image = photoUrl(out.share.image) || photoUrl(out.couple.portraits[0]?.photo);
  out.share.siteUrl = PUBLIC_ORIGINS[0] || '';
  // The B.S. wedding date is worked out from the date unless the planner typed their own (§12).
  if (out.weddingDate && !out.weddingDateBS?.en && !out.weddingDateBS?.ne) {
    const bs = bsDateOf(out.weddingDate, null, out.timeZone);
    out.weddingDateBS = { en: bs.en, ne: bs.ne };
  }
  // Only the content overrides the page shows: its theme's, and those of a borrowed gate or first screen (MIX.md).
  const shown = new Set([out.theme, out.design?.gate, out.design?.hero].filter(Boolean));
  out.themeContent = Object.fromEntries(Object.entries(out.themeContent || {}).filter(([t]) => shown.has(t)));
  return out;
}

/** GET /api/admin/stats: counts for the planner's overview. `attending` = guests (people) who said yes. */
export async function stats(req, res, newOrders) {
  const [docs, replies] = await Promise.all([listInvitations(), replyStats()]);
  let rsvps = 0;
  let attending = 0;
  for (const d of docs) {
    const r = replies.get(d.slug);
    if (r) { rsvps += r.count; attending += r.guests; }
  }
  const published = docs.filter((d) => d.status === 'published').length;
  res.json({ invitations: docs.length, published, drafts: docs.length - published, rsvps, attending, newOrders: await newOrders() });
}
