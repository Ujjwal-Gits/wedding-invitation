// Invitation documents: a draft the studio edits and a published snapshot guests see.
// File: data/invitations/<slug>.json = { slug, version, status, createdAt, updatedAt, publishedAt, draft, published,
//   access? { tokenHash, passwordHash, createdAt, themes, canChangeTheme, canChangeColors }, lastEdit? {at, by, type}, activity? [{at, by, type, sections}], adminSeenAt? }
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SLUG_RE, withLock, invPath, getInvitation, listInvitations, writeJsonAtomic, trashInvitation, uploadDir, readJson, rsvpPath } from './store.js';
import { sanitizeInvitation, publishProblems, designOf } from './validate.js';
import { demoConfig, BUNDLED_TRACKS, isTheme, listThemes, librarySlugs } from './catalog.js';
import { onDepthReady, depthStatus } from './depth.js';
import { slotInfo, loadManifest } from './slots.js';
import { canEdit, isAdmin, hashToken, newClientToken, revokeClientSessions, hashLinkPassword, permsOf, PASSWORD_MIN, PASSWORD_MAX } from './auth.js';
import { originAllowed } from './security.js';
import { bsDateOf } from '../../src/core/i18n.js';
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

/** The couple's link as the planner sees it (never the hashes). */
const linkOut = (a) => (a ? { createdAt: a.createdAt, hasPassword: Boolean(a.passwordHash), ...permsOf(a) } : null);

const nameText = (v, max = 60) => (typeof v === 'string' ? v.normalize('NFC').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max) : '');

function summary(doc, rsvpCount = 0) {
  const d = doc.draft;
  const hero = d.couple.portraits.find((p) => p.photo)?.photo ?? d.couple.bride.photo ?? null;
  return {
    slug: doc.slug,
    bride: d.couple.bride.name,
    groom: d.couple.groom.name,
    weddingDate: d.weddingDate,
    theme: d.theme,
    status: doc.status,
    changed: doc.status === 'published' && !same(doc.draft, doc.published),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    publishedAt: doc.publishedAt,
    rsvpCount,
    hero,
    lastEdit: doc.lastEdit || null,
    unseen: unseenByAdmin(doc),
    clientLink: linkOut(doc.access),
  };
}

const docOut = (doc, admin = true) => ({
  slug: doc.slug,
  clientLink: admin ? linkOut(doc.access) : null,
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

/** Starting data for a new invitation: the sample wording, or a near-empty card. */
function starter({ bride, groom, theme, sample }) {
  const demo = demoConfig();
  const blank = { en: '', ne: '' };
  const year = new Date().getFullYear() + 1;
  const base = sample ? demo : {
    ...demo,
    couple: {
      bride: { name: { ...blank }, fullName: { ...blank }, parents: { ...blank }, home: { ...blank }, photo: null },
      groom: { name: { ...blank }, fullName: { ...blank }, parents: { ...blank }, home: { ...blank }, photo: null },
      portraits: [],
      hashtag: '',
    },
    hosts: { ...blank },
    weddingDate: `${year}-02-12T10:30:00+05:45`,
    weddingDateBS: { ...blank },
    city: { ...blank },
    invitation: { ...demo.invitation, salutation: demo.invitation.salutation, body: { ...blank }, request: demo.invitation.request, signoff: demo.invitation.signoff },
    story: [],
    events: [{
      id: 'wedding', title: { en: 'Shubha Bibaha', ne: 'शुभ विवाह' }, blurb: { ...blank },
      start: `${year}-02-12T10:30:00+05:45`, end: `${year}-02-12T18:00:00+05:45`,
      venue: { ...blank }, mapQuery: '', dress: { colors: [], text: { ...blank } }, photo: null,
    }],
    gallery: [],
    info: { travel: { ...blank }, stays: [], contacts: [], livestream: '' },
    rsvp: { ...demo.rsvp, deadline: { ...blank } },
    music: { volume: 0.75, tracks: [BUNDLED_TRACKS[0]] },
  };
  base.weddingDateBS = { en: '', ne: '' }; // worked out from the date (see publicData)
  base.couple.bride.photo = null;
  base.couple.groom.photo = null;
  if (bride) base.couple.bride.name = { en: bride, ne: '' };
  if (groom) base.couple.groom.name = { en: groom, ne: '' };
  if (sample) {
    // Keep the sample structure and generic wording, but never another family's names,
    // homes, phone numbers or story on a new card.
    for (const p of [base.couple.bride, base.couple.groom]) {
      p.parents = { ...blank };
      p.home = { ...blank };
    }
    base.couple.bride.fullName = { en: bride, ne: '' };
    base.couple.groom.fullName = { en: groom, ne: '' };
    base.hosts = { en: `The families of ${bride} & ${groom}`, ne: '' };
    base.invitation.body = {
      en: `By the grace of our family deity and the blessings of our elders, the auspicious marriage of ${groom} with ${bride} has been fixed.`,
      ne: '',
    };
    base.story = [];
    base.info.contacts = [];
  }
  base.couple.hashtag = bride && groom ? `#${bride.replace(/\s+/g, '')}Weds${groom.replace(/\s+/g, '')}` : '';
  base.theme = isTheme(theme) ? theme : (listThemes().find((t) => t.ready)?.slug || 'dhoka');
  base.share = { title: bride && groom ? `${bride} & ${groom} · Shubha Bibaha` : '', description: 'You are warmly invited to our wedding.', image: '', siteUrl: '' };
  return base;
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
  if (JSON.stringify([doc.draft, doc.published]) !== before) await writeJsonAtomic(invPath(slug), doc);
}).catch((err) => console.warn('[depth] patch failed', err.message)));

const load = async (slug) => {
  const doc = await getInvitation(slug);
  if (!doc) throw httpError(404, 'No invitation with that link name.');
  return doc;
};

// ── Admin handlers ─────────────────────────────────────────────────────────

export async function list(req, res) {
  const docs = await listInvitations();
  const counts = await Promise.all(docs.map((d) => readJson(rsvpPath(d.slug), []).then((r) => r.length).catch(() => 0)));
  const items = docs.map((d, i) => summary(d, counts[i])).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  res.json({ invitations: items });
}

export async function create(req, res) {
  const b = req.body || {};
  const slug = typeof b.slug === 'string' ? b.slug.trim() : '';
  if (!SLUG_RE.test(slug)) throw httpError(400, 'The link name must be 3-64 lowercase letters, digits or hyphens.');
  const bride = nameText(b.bride);
  const groom = nameText(b.groom);
  if (!bride || !groom) throw httpError(400, 'Please enter both first names.');
  const doc = await withLock(`inv:${slug}`, async () => {
    if (await getInvitation(slug)) throw httpError(409, 'That link name is already taken.');
    const now = new Date().toISOString();
    const draft = sanitizeInvitation(starter({ bride, groom, theme: b.theme, sample: b.sample !== false }), slug, await slotInfo());
    const d = { slug, version: 1, status: 'draft', createdAt: now, updatedAt: now, publishedAt: null, draft, published: null };
    await writeJsonAtomic(invPath(slug), d);
    return d;
  });
  console.info(`[admin] create slug=${slug}`);
  res.status(201).json(docOut(doc));
}

export async function read(req, res) {
  res.json(docOut(await load(req.params.slug), isAdmin(req)));
}

export async function update(req, res) {
  const { slug } = req.params;
  const b = req.body || {};
  const slots = await slotInfo();
  const doc = await withLock(`inv:${slug}`, async () => {
    const cur = await load(slug);
    if (b.version !== cur.version) throw httpError(409, 'This invitation was changed in another tab. Reload to get the latest version.', { current: cur.version });
    const draft = sanitizeInvitation(b.data, slug, slots);
    if (req.session.role === 'client') clientLimits(cur, draft, slots.manifests);
    attachDepth(slug, draft);
    if (same(cur.draft, draft)) return cur; // nothing changed: no new version, nothing to log
    const sections = changedAreas(cur.draft, draft);
    cur.draft = draft;
    cur.version += 1;
    cur.updatedAt = new Date().toISOString();
    logActivity(cur, { at: cur.updatedAt, by: actor(req), type: 'edit', sections: sections.length ? sections : ['other'] });
    await writeJsonAtomic(invPath(slug), cur);
    return cur;
  });
  res.json({ version: doc.version, updatedAt: doc.updatedAt, lastEdit: doc.lastEdit || null, changed: doc.status === 'published' && !same(doc.draft, doc.published), data: doc.draft });
}

/** What a couple may not change without the planner's permission (PLATFORM.md: access). */
function clientLimits(cur, draft, manifests = {}) {
  const p = permsOf(cur.access);
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
    await writeJsonAtomic(invPath(slug), cur);
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
    await writeJsonAtomic(invPath(slug), cur);
    return cur;
  });
  console.info(`[admin] unpublish slug=${slug}`);
  res.json(docOut(doc));
}

/** GET /api/invitations/:slug/version: the cheap check the studio polls to notice changes made elsewhere. */
export async function version(req, res) {
  const doc = await load(req.params.slug);
  res.json({ version: doc.version, status: doc.status, updatedAt: doc.updatedAt, lastEdit: doc.lastEdit || null });
}

/** POST /api/invitations/:slug/seen: the planner has looked at the latest changes (clears the home-card dot). */
export async function seen(req, res) {
  const { slug } = req.params;
  await withLock(`inv:${slug}`, async () => {
    const cur = await load(slug);
    cur.adminSeenAt = new Date().toISOString();
    await writeJsonAtomic(invPath(slug), cur);
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
    cur.access = { tokenHash: hashToken(token), passwordHash, createdAt: new Date().toISOString(), themes: opts.themes, canChangeTheme: opts.canChangeTheme, canChangeColors: opts.canChangeColors };
    await writeJsonAtomic(invPath(slug), cur);
    return cur;
  });
  revokeClientSessions(slug);
  console.info(`[admin] client link created slug=${slug}`);
  // The token is shown once; only its hash is stored.
  res.status(201).json({ url: `${linkOrigin(req)}/studio/#/c/${token}`, token, createdAt: doc.access.createdAt, clientLink: linkOut(doc.access) });
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
    await writeJsonAtomic(invPath(slug), cur);
    return cur;
  });
  if (passwordHash) revokeClientSessions(slug);
  console.info(`[admin] client access changed slug=${slug}${passwordHash ? ' (password)' : ''}`);
  res.json({ clientLink: linkOut(doc.access) });
}

/** DELETE /api/invitations/:slug/client-link: turn the couple's link off. */
export async function deleteClientLink(req, res) {
  const { slug } = req.params;
  await withLock(`inv:${slug}`, async () => {
    const cur = await load(slug);
    delete cur.access;
    delete cur.clientAccess;
    await writeJsonAtomic(invPath(slug), cur);
  });
  revokeClientSessions(slug);
  console.info(`[admin] client link removed slug=${slug}`);
  res.json({ ok: true });
}

/** Still pictures of a theme's gate and first screen (public/themes/<slug>/gate.jpg, hero.jpg), when shot. */
function stillsOf(slug) {
  const one = (name) => ([resolve(ROOT_DIR, 'public', 'themes', slug, name), resolve(ROOT_DIR, 'dist', 'themes', slug, name)].some(existsSync) ? `/themes/${slug}/${name}` : '');
  return { gate: one('gate.jpg'), hero: one('hero.jpg') };
}

export async function meta(req, res) {
  let credits = [];
  try { credits = JSON.parse(readFileSync(resolve(ROOT_DIR, 'src', 'generated', 'credits.json'), 'utf8')); } catch { credits = []; }
  const lib = [...librarySlugs()].sort().map((slug) => {
    const c = credits.find((x) => x.file && x.file.replace(/\.jpe?g$/i, '') === slug);
    return { slug, title: c?.title || slug, focal: c && c.focal_x != null ? [c.focal_x, c.focal_y] : [0.5, 0.5] };
  });
  const themes = await Promise.all(listThemes().map(async (t) => {
    const m = await loadManifest(t.slug);
    return { ...t, name: m?.name || t.name, concept: m?.description || t.concept, colors: m?.colors || {}, parts: m?.parts || null, stills: stillsOf(t.slug) };
  }));
  res.json({ themes, tracks: BUNDLED_TRACKS, library: lib, depth: depthStatus(), publicOrigin: PUBLIC_ORIGINS[0] || '', shortLinks: IS_PROD });
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
export async function publicData(req, res) {
  const { slug } = req.params;
  const doc = await getInvitation(slug);
  const preview = Boolean(doc) && canEdit(req, slug); // planner, or the couple for their own invitation
  const src = preview ? doc.draft : doc?.status === 'published' ? doc.published : null;
  if (!src) throw httpError(404, 'Not found.');
  const out = structuredClone(src);
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
    const bs = bsDateOf(out.weddingDate);
    out.weddingDateBS = { en: bs.en, ne: bs.ne };
  }
  // Only the content overrides the page shows: its theme's, and those of a borrowed gate or first screen (MIX.md).
  const shown = new Set([out.theme, out.design?.gate, out.design?.hero].filter(Boolean));
  out.themeContent = Object.fromEntries(Object.entries(out.themeContent || {}).filter(([t]) => shown.has(t)));
  if (preview) res.set('X-Invitation-Preview', 'draft');
  res.set('Cache-Control', preview ? 'no-store' : 'no-cache');
  res.json(out);
}

/** GET /api/admin/stats: counts for the planner's overview. `attending` = guests (people) who said yes. */
export async function stats(req, res, newOrders) {
  const docs = await listInvitations();
  let rsvps = 0;
  let attending = 0;
  for (const d of docs) {
    const replies = await readJson(rsvpPath(d.slug), []).catch(() => []);
    rsvps += replies.length;
    for (const r of replies) if (r.attending === 'yes') attending += Number(r.guests) || 0;
  }
  const published = docs.filter((d) => d.status === 'published').length;
  res.json({ invitations: docs.length, published, drafts: docs.length - published, rsvps, attending, newOrders: await newOrders() });
}
