// The admin audit log: who (the owner or a staff member) changed what, when, from where, and whether it worked.
// auditTrail (middleware on /api) records every POST/PUT/PATCH/DELETE made with an admin session, so no route can be
// missed; sign-ins of admins are recorded by lib/auth.js. Request bodies are never stored, only the names of the fields
// sent (so "password" may appear as a field name, never a value). Kept by the store (the `audit` table, or
// data/audit.jsonl), pruned daily: rows go once they are over a year old AND not among the newest 50 000.
// Read by super admins: GET /api/admin/audit (docs/API.md "Audit log").
import { auditStore } from './store.js';
import { clientIp } from './security.js';

const DAY = 24 * 60 * 60 * 1000;
const KEEP_DAYS = 400;
const KEEP_ROWS = 50_000;
const HARD_CAP = 500_000;
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const FIELD_RE = /^[A-Za-z0-9_.-]{1,40}$/;

/** A short, plain label per route (method + pattern as written in server/index.js). */
const LABELS = {
  'POST /auth/logout': 'Signed out',
  'POST /clear-cache': 'Cleared the browser cache',
  'PUT /site': 'Saved the website settings',
  'POST /admin/pay/qr': 'Uploaded a payment QR',
  'PUT /admin/content/page': 'Changed the words of a page (Content)',
  'PUT /admin/content/site/:market': 'Changed contact, footer or announcement (Content)',
  'POST /admin/music': 'Uploaded a song',
  'PATCH /admin/music': 'Reordered the music library',
  'POST /admin/music/restore': 'Restored the built-in songs',
  'PATCH /admin/music/:musicId': 'Changed a song',
  'DELETE /admin/music/:musicId': 'Deleted a song',
  'POST /admin/customers': 'Created a customer account',
  'PATCH /admin/customers/:id': 'Changed a customer account',
  'PUT /admin/customers/:id/invitations/:slug': 'Linked an invitation to a customer',
  'DELETE /admin/customers/:id/invitations/:slug': 'Unlinked an invitation from a customer',
  'POST /admin/pending/link': 'Linked a waiting invitation',
  'POST /admin/pending/dismiss': 'Dismissed a waiting invitation',
  'PATCH /orders/:id': 'Changed an order',
  'POST /orders/:id/invitation': 'Created an invitation from an order',
  'DELETE /orders/:id': 'Deleted an order',
  'PATCH /orders/:id/quote': 'Set or sent a quote for an enquiry',
  'POST /orders/:id/convert': 'Turned an enquiry into an order',
  'POST /invitations': 'Created an invitation',
  'PUT /invitations/:slug': 'Edited an invitation',
  'DELETE /invitations/:slug': 'Deleted an invitation',
  'POST /invitations/:slug/publish': 'Published an invitation',
  'POST /invitations/:slug/unpublish': 'Unpublished an invitation',
  'POST /invitations/:slug/client-link': 'Made a couple link',
  'PATCH /invitations/:slug/access': 'Changed a couple link',
  'DELETE /invitations/:slug/client-link': 'Turned a couple link off',
  'POST /invitations/:slug/uploads': 'Uploaded a file to an invitation',
  'DELETE /invitations/:slug/rsvps/:id': 'Deleted a guest reply',
  'POST /admin/team': 'Added a team member',
  'PATCH /admin/team/:id': 'Changed a team member',
  'DELETE /admin/team/:id': 'Removed a team member',
};
/** Not worth a row: a read marker the studio sends whenever an invitation is opened. */
const SKIP = new Set(['POST /invitations/:slug/seen', 'POST /auth/login']);
/** Autosave: one row per person and invitation per 10 minutes is enough. */
const COALESCE = new Map([['PUT /invitations/:slug', 10 * 60 * 1000]]);
const lastSeen = new Map();

/** { actor: 'owner' | 'staff:<id>', actorEmail } for an admin (req.admin, lib/auth.js). */
export const actorOf = (a) => (a ? { actor: a.owner ? 'owner' : `staff:${a.id}`, actorEmail: a.email || null } : { actor: 'unknown', actorEmail: null });

/** Adds one entry. Never throws: the audit log must not break the request it describes. */
export function recordAudit(e) {
  try {
    const out = auditStore.add({ at: new Date().toISOString(), ...e, fields: e.fields || [] });
    if (out && typeof out.catch === 'function') out.catch((err) => console.error('[audit] write failed:', err.message));
  } catch (err) {
    console.error('[audit] write failed:', err.message);
  }
}

/** Top-level field names of a JSON body (names only; values are never kept). */
const fieldsOf = (body) => (body && typeof body === 'object' && !Array.isArray(body) ? Object.keys(body).filter((k) => FIELD_RE.test(k)).slice(0, 20) : []);

/** A path with the values of its params put back as :names (a fallback when no route matched). */
function patternOf(path, params) {
  let p = path.replace(/^\/api(?=\/|$)/, '') || '/';
  for (const [k, v] of Object.entries(params || {})) {
    if (typeof v !== 'string' || !v) continue;
    p = p.split('/').map((seg) => (seg === v || seg === encodeURIComponent(v) ? `:${k}` : seg)).join('/');
  }
  return p;
}

/**
 * Middleware for the /api router: records each state-changing request made with an admin session, after it
 * finished (with its status). The route pattern and params are taken when Express picks the route (req.route is
 * set), since an error on the way out may reset req.params before the response ends.
 */
export function auditTrail(req, res, next) {
  if (!MUTATING.has(req.method) || req.session?.role !== 'admin' || !req.admin) return next();
  const who = actorOf(req.admin);
  // Express sets req.route when a route matches, then req.params for it (and resets req.params on the way out).
  const seen = { pattern: null, params: {}, pending: false };
  let route = req.route;
  let params = req.params;
  Object.defineProperty(req, 'route', {
    configurable: true,
    enumerable: true,
    get: () => route,
    set: (r) => {
      route = r;
      if (typeof r?.path === 'string') {
        seen.pattern = `${req.baseUrl || ''}${r.path}`.replace(/^\/api(?=\/|$)/, '') || '/';
        seen.params = { ...params };
        seen.pending = true;
      }
    },
  });
  Object.defineProperty(req, 'params', {
    configurable: true,
    enumerable: true,
    get: () => params,
    set: (v) => {
      params = v;
      if (seen.pending && v && typeof v === 'object' && Object.keys(v).length) { seen.params = { ...v }; seen.pending = false; }
    },
  });
  const ip = clientIp(req);
  res.on('finish', () => {
    try {
      const pattern = seen.pattern || patternOf(req.originalUrl.split('?')[0], params);
      const key = `${req.method} ${pattern}`;
      if (SKIP.has(key)) return;
      const used = seen.pattern ? seen.params : params || {};
      const target = res.locals.auditTarget || Object.values(used).filter((v) => typeof v === 'string').join(' · ').slice(0, 160) || null;
      const gap = COALESCE.get(key);
      if (gap && res.statusCode < 400) {
        const k = `${who.actor}\n${key}\n${target}`;
        const t = Date.now();
        if (t - (lastSeen.get(k) || 0) < gap) return;
        lastSeen.set(k, t);
        if (lastSeen.size > 5000) lastSeen.delete(lastSeen.keys().next().value);
      }
      recordAudit({
        ...who, action: key, label: res.locals.auditLabel || LABELS[key] || null, target, ip, status: res.statusCode,
        fields: res.locals.auditFields || fieldsOf(req.body),
      });
    } catch (err) {
      console.error('[audit] could not record:', err.message);
    }
  });
  next();
}

/** Tidies the log at start and daily (see the header for what is kept). Call once the store is open. */
export function startAudit() {
  const prune = () => {
    try {
      const n = auditStore.prune(new Date(Date.now() - KEEP_DAYS * DAY).toISOString(), KEEP_ROWS, HARD_CAP);
      if (n) console.info(`[audit] pruned ${n} old entr${n === 1 ? 'y' : 'ies'}`);
    } catch (err) { console.warn('[audit] prune failed:', err.message); }
  };
  prune();
  setInterval(prune, DAY).unref();
}

const PAGE_SIZE = 50;

/**
 * GET /api/admin/audit?actor=owner|staff:<id>&q=<text>&page=<n> (super admins): newest first, 50 per page.
 * -> { total, page, pageSize, rows: [{ seq, at, actor, actorEmail, action, label, target, ip, status, fields }], actors }
 */
export async function list(req, res) {
  const actor = typeof req.query.actor === 'string' && /^(owner|staff:[A-Za-z0-9_-]{12})$/.test(req.query.actor) ? req.query.actor : null;
  const text = typeof req.query.q === 'string' ? req.query.q.normalize('NFC').trim().slice(0, 100) : '';
  const page = Math.min(Math.max(Number.parseInt(req.query.page, 10) || 1, 1), 100_000);
  const { total, rows } = auditStore.list({ actor, text: text || null, offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE });
  res.set('Cache-Control', 'no-store');
  res.json({ total, page, pageSize: PAGE_SIZE, rows, actors: auditStore.actors() });
}
