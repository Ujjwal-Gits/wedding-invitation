// Guest links: one link per group of ceremonies (docs/API.md "Guest links"). The couple invites some guests only to
// some functions: "Haldi guests" open a link that shows the Haldi alone, "Family" one with Haldi + Mehendi, and the
// plain link (/i/<slug>, /<theme>/?id=<slug>, "Main link") shows everything unless doc.plainLinkEvents narrows it.
//
// Stored on the invitation doc, outside draft/published (saving or publishing never touches it):
//   guestLinks: [{ id, name, events: [eventId], createdAt }]   (at most MAX_LINKS)
//   plainLinkEvents?: [eventId]   (what the plain link shows; absent = every ceremony)
// A guest link is ?g=<id> on the usual URLs. The server filters the events BEFORE anything is sent (the page's data
// block, GET /public, the link preview), so a hidden ceremony is never in that guest's HTML or JSON. Replies through
// it may only name its ceremonies and carry its id. An unknown or deleted id gets "This link is no longer active".
import { randomBytes } from 'node:crypto';
import { withLock, getInvitation, peekInvitation, saveInvitation } from './store.js';

export const LINK_ID_RE = /^[A-Za-z0-9_-]{10}$/;
export const MAX_LINKS = 20;
const NAME_MAX = 60;

const httpError = (status, message, extra) => Object.assign(new Error(message), { status, expose: true, ...extra });
const nameText = (v) => (typeof v === 'string' ? v.normalize('NFC').replace(/[\u0000-\u001F\u007F]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX) : '');

/** The stored links, well-formed only (an older doc has none). */
export const linksOf = (doc) => (Array.isArray(doc?.guestLinks) ? doc.guestLinks.filter((l) => l && LINK_ID_RE.test(l.id) && Array.isArray(l.events)) : []);

/** The link with this id, or null (a malformed id is never looked up). */
export function guestLink(doc, id) {
  if (typeof id !== 'string' || !LINK_ID_RE.test(id)) return null;
  return linksOf(doc).find((l) => l.id === id) || null;
}

/** The link with this id when it still shows something of `inv` (its ceremonies may all have been removed since). */
export function activeLink(doc, inv, id) {
  const l = guestLink(doc, id);
  return l && linkEvents(inv, l).length ? l : null;
}

/**
 * The plain link (no g=, "Main link" in the studio): doc.plainLinkEvents, when set, narrows what it shows, so a guest
 * who strips g= from a Haldi link sees only the main link's ceremonies. Returns a view like a link ({ id: null, events })
 * or null when it shows everything (the default; also when none of the chosen ceremonies is still published).
 */
export function plainView(doc, inv) {
  const ids = Array.isArray(doc?.plainLinkEvents) ? doc.plainLinkEvents : null;
  if (!ids) return null;
  const view = { id: null, events: ids };
  const shown = linkEvents(inv, view).length;
  return shown && shown < (inv?.events || []).length ? view : null;
}

/** What a guest sees for this g= value ('' = the plain link): { ok, link } (link null = everything). */
export function guestView(doc, inv, g) {
  if (!g) return { ok: true, link: plainView(doc, inv) };
  const link = activeLink(doc, inv, g);
  return { ok: Boolean(link), link };
}

/** The g= value of a request ('' when absent). */
export const linkParam = (req) => (typeof req.query?.g === 'string' ? req.query.g : '');

/** The invitation's events this link shows, in the invitation's own order (a ceremony removed since is left out). */
export function linkEvents(inv, link) {
  const want = new Set(link.events);
  return (inv?.events || []).filter((e) => want.has(e.id));
}

/**
 * A guest payload (lib/invitations.js publicPayload) narrowed to one link: only its ceremonies, and replies sent
 * to the link's own endpoint. Mutates and returns `out` (always a fresh copy).
 */
export function narrowPayload(out, link) {
  out.events = linkEvents(out, link);
  if (out.rsvp && link.id) out.rsvp.endpoint = `${out.rsvp.endpoint}?g=${link.id}`;
  return out;
}

/** The ceremonies' names for a link preview: "Haldi & Mehendi". */
export function eventNames(inv, link) {
  const names = linkEvents(inv, link).map((e) => String(e.title?.en || e.title?.ne || '').trim()).filter(Boolean);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names.at(-1)}` : names[0] || '';
}

const out = ({ id, name, events, createdAt }) => ({ id, name, events: [...events], createdAt });

// ── Studio API (editor: the planner with 'invitations', or the couple) ───────────────────────────────

async function peekOr404(slug) {
  const doc = await peekInvitation(slug);
  if (!doc) throw httpError(404, 'No invitation with that link name.');
  return doc;
}

/** The ceremonies a link can show: the published ones (a guest link shows the live invitation). */
const liveEvents = (doc) => (doc.status === 'published' && doc.published ? doc.published.events || [] : []);

function input(b, doc, { partial }) {
  const res = {};
  const errors = [];
  if (!partial || b.name !== undefined) {
    const name = nameText(b.name);
    if (name.length < 1) errors.push({ path: 'name', message: `must be 1-${NAME_MAX} characters` });
    else res.name = name;
  }
  if (!partial || b.events !== undefined) {
    const ids = new Set(liveEvents(doc).map((e) => e.id));
    if (!Array.isArray(b.events) || b.events.length > 20 || !b.events.every((e) => typeof e === 'string')) errors.push({ path: 'events', message: 'must be a list of ceremony ids' });
    else {
      const events = [...new Set(b.events)];
      if (!events.length) errors.push({ path: 'events', message: 'choose at least one ceremony' });
      else if (events.some((e) => !ids.has(e))) errors.push({ path: 'events', message: 'a ceremony is not in the published invitation' });
      else res.events = liveEvents(doc).map((e) => e.id).filter((id) => events.includes(id)); // the invitation's order
    }
  }
  if (errors.length) throw httpError(400, 'Please check the guest link.', { errors });
  return res;
}

/** GET /api/invitations/:slug/guest-links: the links and the ceremonies they can show. */
export async function list(req, res) {
  const doc = await peekOr404(req.params.slug);
  res.json({
    live: doc.status === 'published' && Boolean(doc.published),
    max: MAX_LINKS,
    events: liveEvents(doc).map(({ id, title }) => ({ id, title })),
    main: mainEvents(doc),
    links: linksOf(doc).map(out),
  });
}

/** The ceremonies the main (plain) link shows, as ids of the published ones. */
const mainEvents = (doc) => {
  const inv = doc.published || doc.draft;
  const v = plainView(doc, inv);
  return (v ? linkEvents(inv, v) : liveEvents(doc)).map((e) => e.id);
};

/** PUT /api/invitations/:slug/guest-links/main { events }: what the plain link shows (at least one; all = the default). */
export async function putMain(req, res) {
  const { slug } = req.params;
  const main = await withLock(`inv:${slug}`, async () => {
    const cur = await getInvitation(slug);
    if (!cur) throw httpError(404, 'No invitation with that link name.');
    if (cur.status !== 'published' || !cur.published) throw httpError(409, 'Guest links work once the invitation is published. Publish it first.', { code: 'not_published' });
    const { events } = input({ events: req.body?.events }, cur, { partial: true });
    if (!events) throw httpError(400, 'Please check the guest link.', { errors: [{ path: 'events', message: 'choose at least one ceremony' }] });
    if (events.length === liveEvents(cur).length) delete cur.plainLinkEvents; // everything: as before
    else cur.plainLinkEvents = events;
    await saveInvitation(cur);
    return mainEvents(cur);
  });
  console.info(`[studio] main link events slug=${slug} events=${main.length}`);
  res.json({ main });
}

/** POST /api/invitations/:slug/guest-links { name, events }: a new link (published invitations only). */
export async function create(req, res) {
  const { slug } = req.params;
  const link = await withLock(`inv:${slug}`, async () => {
    const cur = await getInvitation(slug);
    if (!cur) throw httpError(404, 'No invitation with that link name.');
    if (cur.status !== 'published' || !cur.published) throw httpError(409, 'Guest links work once the invitation is published. Publish it first.', { code: 'not_published' });
    const links = linksOf(cur);
    if (links.length >= MAX_LINKS) throw httpError(409, `An invitation can have up to ${MAX_LINKS} guest links. Delete one you no longer use.`, { code: 'too_many' });
    const v = input(req.body || {}, cur, { partial: false });
    let id;
    do id = randomBytes(8).toString('base64url').slice(0, 10); while (links.some((l) => l.id === id));
    const l = { id, name: v.name, events: v.events, createdAt: new Date().toISOString() };
    cur.guestLinks = [...links, l];
    await saveInvitation(cur);
    return l;
  });
  console.info(`[studio] guest link created slug=${slug} id=${link.id} events=${link.events.length}`);
  res.status(201).json({ link: out(link) });
}

/** PATCH /api/invitations/:slug/guest-links/:linkId { name?, events? }: rename it or change its ceremonies. */
export async function patch(req, res) {
  const { slug, linkId } = req.params;
  const link = await withLock(`inv:${slug}`, async () => {
    const cur = await getInvitation(slug);
    if (!cur) throw httpError(404, 'No invitation with that link name.');
    const links = linksOf(cur);
    const l = links.find((x) => x.id === linkId);
    if (!l) throw httpError(404, 'That guest link was deleted.');
    const v = input(req.body || {}, cur, { partial: true });
    Object.assign(l, v);
    cur.guestLinks = links;
    await saveInvitation(cur);
    return l;
  });
  res.json({ link: out(link) });
}

/** DELETE /api/invitations/:slug/guest-links/:linkId: the link stops working at once (its replies are kept). */
export async function remove(req, res) {
  const { slug, linkId } = req.params;
  await withLock(`inv:${slug}`, async () => {
    const cur = await getInvitation(slug);
    if (!cur) throw httpError(404, 'No invitation with that link name.');
    const links = linksOf(cur);
    if (!links.some((l) => l.id === linkId)) throw httpError(404, 'That guest link was already deleted.');
    cur.guestLinks = links.filter((l) => l.id !== linkId);
    await saveInvitation(cur);
  });
  console.info(`[studio] guest link deleted slug=${slug} id=${linkId}`);
  res.json({ ok: true });
}

// ── The guest's answer for a link that is gone ─────────────────────────────────────────────────────────

/** The same calm page as "not available" (lib/gate.js), for a guest link that was deleted or never existed. */
export const LINK_INACTIVE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Link no longer active · Nimtto</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>
:root{--ink:#121116;--ink-2:#45434C;--ink-3:#66636E;--crimson:#B3122F;--crimson-deep:#8E0E25}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:32px 16px;background:#fff;color:var(--ink);font:400 16.5px/1.6 'Geist','Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased}
main{width:min(100%,460px)}
.mark{font:500 26px/1 Gambetta,'Iowan Old Style',Georgia,serif;letter-spacing:-.03em;color:var(--ink);text-decoration:none}
h1{margin:48px 0 0;font:400 clamp(34px,7vw,48px)/1.05 Gambetta,'Iowan Old Style',Georgia,serif;letter-spacing:-.028em}
p{margin:16px 0 0;color:var(--ink-2)}
.ne{margin-top:6px;color:var(--ink-3);font-family:Mukta,'Nirmala UI',sans-serif}
a:focus-visible{outline:2px solid var(--crimson);outline-offset:3px}
</style>
</head>
<body>
<main>
<a class="mark" href="/">Nimtto</a>
<h1>This link is no longer active.</h1>
<p class="ne" lang="ne">यो लिङ्क अब सक्रिय छैन।</p>
<p>The family may have sent a new link. Please ask them for the one meant for you.</p>
</main>
</body>
</html>
`;

/** Sends the "no longer active" page (410: the link is gone, not mistyped). */
export function sendInactive(res) {
  res.set('Cache-Control', 'private, no-store');
  return res.status(410).type('html').send(LINK_INACTIVE);
}
