// Invitation documents: a draft the studio edits and a published snapshot guests see.
// File: data/invitations/<slug>.json = { slug, version, status, createdAt, updatedAt, publishedAt, draft, published }
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SLUG_RE, withLock, invPath, getInvitation, listInvitations, writeJsonAtomic, trashInvitation, uploadDir, readJson, rsvpPath } from './store.js';
import { sanitizeInvitation, publishProblems } from './validate.js';
import { demoConfig, BUNDLED_TRACKS, isTheme, listThemes, librarySlugs } from './catalog.js';
import { onDepthReady, depthStatus } from './depth.js';
import { slotInfo, loadManifest } from './slots.js';
import { canEdit, isAdmin, hashToken, newClientToken, revokeClientSessions } from './auth.js';
import { bsDateOf } from '../../src/core/i18n.js';
import { PUBLIC_ORIGINS, ROOT_DIR, IS_PROD } from './env.js';

const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
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
  };
}

const docOut = (doc, admin = true) => ({
  slug: doc.slug,
  clientLink: admin && doc.clientAccess ? { createdAt: doc.clientAccess.createdAt } : null,
  version: doc.version,
  status: doc.status,
  changed: doc.status === 'published' && !same(doc.draft, doc.published),
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  publishedAt: doc.publishedAt,
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
    attachDepth(slug, draft);
    cur.draft = draft;
    cur.version += 1;
    cur.updatedAt = new Date().toISOString();
    await writeJsonAtomic(invPath(slug), cur);
    return cur;
  });
  res.json({ version: doc.version, updatedAt: doc.updatedAt, changed: doc.status === 'published' && !same(doc.draft, doc.published), data: doc.draft });
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
    await writeJsonAtomic(invPath(slug), cur);
    return cur;
  });
  console.info(`[admin] unpublish slug=${slug}`);
  res.json(docOut(doc));
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

/** POST /api/invitations/:slug/client-link: a new link for the couple (the old one stops working). */
export async function createClientLink(req, res) {
  const { slug } = req.params;
  const token = newClientToken();
  const doc = await withLock(`inv:${slug}`, async () => {
    const cur = await load(slug);
    cur.clientAccess = { tokenHash: hashToken(token), createdAt: new Date().toISOString() };
    await writeJsonAtomic(invPath(slug), cur);
    return cur;
  });
  revokeClientSessions(slug);
  console.info(`[admin] client link created slug=${slug}`);
  // The token is shown once; only its hash is stored.
  res.status(201).json({ token, createdAt: doc.clientAccess.createdAt });
}

/** DELETE /api/invitations/:slug/client-link: turn the couple's link off. */
export async function deleteClientLink(req, res) {
  const { slug } = req.params;
  await withLock(`inv:${slug}`, async () => {
    const cur = await load(slug);
    delete cur.clientAccess;
    await writeJsonAtomic(invPath(slug), cur);
  });
  revokeClientSessions(slug);
  console.info(`[admin] client link removed slug=${slug}`);
  res.json({ ok: true });
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
    return { ...t, name: m?.name || t.name, concept: m?.description || t.concept };
  }));
  res.json({ themes, tracks: BUNDLED_TRACKS, library: lib, depth: depthStatus(), publicOrigin: PUBLIC_ORIGINS[0] || '', shortLinks: IS_PROD });
}


// ── Public ─────────────────────────────────────────────────────────────────

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
  const hero = out.couple.portraits[0]?.photo;
  out.share.image = hero ? (typeof hero === 'object' ? hero.sm : hero.startsWith('https://') ? hero : `/photos/${hero}-sm.webp`) : '';
  out.share.siteUrl = PUBLIC_ORIGINS[0] || '';
  // The B.S. wedding date is worked out from the date unless the planner typed their own (§12).
  if (out.weddingDate && !out.weddingDateBS?.en && !out.weddingDateBS?.ne) {
    const bs = bsDateOf(out.weddingDate);
    out.weddingDateBS = { en: bs.en, ne: bs.ne };
  }
  // Only the selected theme's content overrides are needed by the page.
  const tc = out.themeContent?.[out.theme];
  out.themeContent = tc ? { [out.theme]: tc } : {};
  if (preview) res.set('X-Invitation-Preview', 'draft');
  res.set('Cache-Control', preview ? 'no-store' : 'no-cache');
  res.json(out);
}
