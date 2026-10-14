// Studio API server. Dev: the Vite servers proxy /api and /uploads here.
// Production (--production or NODE_ENV=production): also serves ../dist.
import express from 'express';
import { existsSync, promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { IS_PROD, PORT, TRUST_PROXY, UPLOAD_DIR, DIST_DIR, INV_DIR, RSVP_DIR, assertConfigured, DEPTH_ENABLED } from './lib/env.js';
import { SLUG_RE, getInvitation, listInvitations } from './lib/store.js';
import { securityHeaders } from './lib/security.js';
import { loadSession, requireAdmin, requireSession, requireEditor, clientSession, login, logout, me } from './lib/auth.js';
import * as inv from './lib/invitations.js';
import * as rsvp from './lib/rsvp.js';
import { handleUpload } from './lib/uploads.js';
import { stopDepth } from './lib/depth.js';

assertConfigured();
await fs.mkdir(INV_DIR, { recursive: true });
await fs.mkdir(RSVP_DIR, { recursive: true });
await fs.mkdir(UPLOAD_DIR, { recursive: true });

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', TRUST_PROXY);
app.set('etag', false);
app.use(securityHeaders);
app.use(loadSession);

const api = express.Router();
const json = (limit) => express.json({ limit, strict: true, type: 'application/json' });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Every :slug in the API is validated before any handler touches the disk.
api.param('slug', (req, res, next, slug) => (SLUG_RE.test(slug) ? next() : res.status(400).json({ error: 'Invalid invitation link name.' })));

// Auth
api.post('/auth/login', json('4kb'), wrap(login));
api.post('/auth/logout', requireSession, logout);
api.post('/client/session', json('1kb'), wrap(clientSession(listInvitations)));
api.get('/auth/me', me);

// Public
api.get('/invitations/:slug/public', wrap(inv.publicData));
api.post('/invitations/:slug/rsvp', express.text({ type: ['text/plain', 'application/json'], limit: '8kb' }), wrap(rsvp.submit));

// Admin
const editor = requireEditor(getInvitation);
api.get('/meta', requireSession, wrap(inv.meta));

api.get('/invitations', requireAdmin, wrap(inv.list));
api.post('/invitations', requireAdmin, json('8kb'), wrap(inv.create));
api.get('/invitations/:slug', editor, wrap(inv.read));
api.put('/invitations/:slug', editor, json('768kb'), wrap(inv.update));
api.get('/invitations/:slug/version', editor, wrap(inv.version));
api.post('/invitations/:slug/seen', requireAdmin, wrap(inv.seen));
api.delete('/invitations/:slug', requireAdmin, json('2kb'), wrap(inv.remove));
api.post('/invitations/:slug/publish', editor, wrap(inv.publish));
api.post('/invitations/:slug/client-link', requireAdmin, wrap(inv.createClientLink));
api.delete('/invitations/:slug/client-link', requireAdmin, wrap(inv.deleteClientLink));
api.post('/invitations/:slug/unpublish', requireAdmin, wrap(inv.unpublish));
api.post('/invitations/:slug/uploads', editor, wrap(async (req, res) => {
  if (!existsSync(resolve(INV_DIR, `${req.params.slug}.json`))) return res.status(404).json({ error: 'No invitation with that link name.' });
  return handleUpload(req, res);
}));
api.get('/invitations/:slug/rsvps', editor, wrap(rsvp.listReplies));
api.get('/invitations/:slug/rsvps.csv', editor, wrap(rsvp.exportCsv));
api.delete('/invitations/:slug/rsvps/:id', editor, wrap(rsvp.deleteReply));

api.use((req, res) => res.status(404).json({ error: 'Not found.' }));
app.get('/healthz', (req, res) => res.type('text').send('ok')); // container health check
app.use('/api', api);

// Short guest link: /i/<slug>?to=Name&e=wedding,reception -> the current theme page.
// The target is built only from the stored theme enum and slug, so this is not an open redirect.
app.get('/i/:slug', wrap(async (req, res) => {
  const { slug } = req.params;
  if (!SLUG_RE.test(slug)) return res.status(404).type('text/plain').send('Not found');
  const doc = await getInvitation(slug);
  if (!doc || doc.status !== 'published') return res.status(404).type('text/plain').send('Not found');
  const q = new URLSearchParams({ id: slug });
  const to = typeof req.query.to === 'string' ? req.query.to.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 60) : '';
  if (to) q.set('to', to);
  const ids = new Set(doc.published.events.map((e) => e.id));
  const e = typeof req.query.e === 'string' ? req.query.e.split(',').filter((x) => ids.has(x)) : [];
  if (e.length) q.set('e', e.join(','));
  res.set('Cache-Control', 'no-cache');
  res.redirect(302, `/${doc.published.theme}/?${q}`);
}));

// Uploaded files: only our own generated names and types, never a directory listing.
app.get(/^\/uploads\/([a-z0-9-]{3,64})\/([A-Za-z0-9_-]{16,40}(?:-(?:lg|sm|depth))?\.(?:webp|mp3))$/, (req, res, next) => {
  const [slug, file] = [req.params[0], req.params[1]];
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(resolve(UPLOAD_DIR, slug, file), { dotfiles: 'deny' }, (err) => {
    if (err && !res.headersSent) res.status(err.statusCode === 404 || err.code === 'ENOENT' ? 404 : 500).end();
    else if (err) next(err);
  });
});
app.use('/uploads', (req, res) => res.status(404).end());

if (IS_PROD) {
  if (!existsSync(DIST_DIR)) console.warn('[studio] dist/ not found: run `npm run build` in the project root.');
  app.use(express.static(DIST_DIR, {
    index: 'index.html',
    redirect: true,
    dotfiles: 'deny',
    setHeaders(res, path) {
      res.set('Cache-Control', /[\\/]assets[\\/]/.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  }));
}

app.use((req, res) => res.status(404).type('text/plain').send('Not found'));

// Errors: expose only messages we wrote; never stack traces.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[error]', req.method, req.path, err);
  const body = { error: err.expose || status < 500 ? err.message : 'Something went wrong on our side.' };
  if (err.errors) body.errors = err.errors;
  if (err.problems) body.problems = err.problems;
  if (err.current) body.current = err.current;
  if (err.type === 'entity.too.large') body.error = 'That request is too large.';
  if (err.type === 'entity.parse.failed') body.error = 'Bad request.';
  res.status(status).json(body);
});

const server = app.listen(PORT, () => {
  console.info(`[studio] API on http://localhost:${PORT} (${IS_PROD ? 'production' : 'development'}; depth maps ${DEPTH_ENABLED ? 'on' : 'off'})`);
});
server.headersTimeout = 30_000;
server.requestTimeout = 120_000;

const shutdown = () => { stopDepth(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
