// Studio API server. Dev: the Vite servers proxy /api and /uploads here.
// Production (--production or NODE_ENV=production): also serves ../dist.
import express from 'express';
import { existsSync, promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { IS_PROD, PORT, TRUST_PROXY, UPLOAD_DIR, DIST_DIR, INV_DIR, RSVP_DIR, assertConfigured, DEPTH_ENABLED } from './lib/env.js';
import { SLUG_RE, peekInvitation, invitationExists, openStore, closeStore, storePing, STORE_KIND } from './lib/store.js';
import { startSessions } from './lib/sessions.js';
import { securityHeaders, rateLimiter, cloudflareOnly } from './lib/security.js';
import { trafficGuard, shedWhenOverloaded, resetLag } from './lib/guard.js';
import { staticFiles } from './lib/static.js';
import { startBackups, stopBackups } from './lib/backup.js';
import {
  loadSession, requireSession, requireEditor, requireCustomer, requirePerm, requireAnyPerm, requireSuper, adminArea,
  clientSession, login, logout, me, clearCache,
} from './lib/auth.js';
import { PERM_KEYS } from './lib/staff.js';
import * as team from './lib/team.js'; // staff accounts: the Team page (docs/API.md "Team and permissions")
import * as audit from './lib/audit.js'; // the admin audit log (docs/API.md "Audit log")
import * as customers from './lib/customers.js'; // customer accounts (docs/API.md "Customer accounts")
import * as inv from './lib/invitations.js';
import * as handover from './lib/handover.js'; // invitations for customer accounts (docs/API.md "Invitations for an account")
import { htmlSitemap } from './lib/html-sitemap.js'; // GET /sitemap/: every public page, readable
import { scrubDemoOnce } from './lib/migrate-demo.js';
import * as rsvp from './lib/rsvp.js';
import * as guestLinks from './lib/guest-links.js'; // a link per group of ceremonies (docs/API.md "Guest links")
import { handleUpload } from './lib/uploads.js';
import * as orders from './lib/orders.js';
import * as site from './lib/site.js';
import * as branding from './lib/branding.js'; // logos and the preview watermark (Website → Branding)
import * as content from './lib/content.js'; // the Content page: page words, FAQ, contact, footer (docs/API.md "Content")
import * as music from './lib/music.js'; // the site-wide music library (docs/API.md "Music library")
import { sharePage } from './lib/share.js';
import { themePageGate } from './lib/gate.js';
import { showcaseGate } from './lib/showcase.js';
import { stopDepth } from './lib/depth.js';
import { payments } from './lib/payments/routes.js'; // PayPal (off until PAYPAL_* are set); see docs/PAYMENTS.md
import * as manualPay from './lib/payments/manual.js'; // order -> pay by QR -> screenshot -> admin confirms (docs/PAYMENTS.md)
import { financeRouter } from './lib/finance-admin.js'; // earnings, refunds, free access (docs/API.md "Finance")
import * as enquiries from './lib/enquiries.js'; // Custom requests: quote, quote sent, turn into an order (docs/API.md "Enquiries")
import { marketStats } from './lib/market-stats.js'; // Overview figures per market (docs/API.md "Markets")
import * as blog from './lib/blog.js'; // the blog of both websites: server-rendered pages + the studio's Blog module
import * as indexnow from './lib/indexnow.js'; // tells Bing & co. that public pages changed (docs/SEO-SETUP.md)

assertConfigured();
openStore();
startSessions();
audit.startAudit();
await fs.mkdir(INV_DIR, { recursive: true });
await fs.mkdir(RSVP_DIR, { recursive: true });
await fs.mkdir(UPLOAD_DIR, { recursive: true });
// One-time: the demo couple's words and photos out of stored invitations (lib/migrate-demo.js; backup first).
await scrubDemoOnce().catch((err) => console.error('[migrate] demo scrub failed (nothing half-done is saved per invitation):', err));

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', TRUST_PROXY);
app.set('etag', false);
app.use(securityHeaders);
app.use(cloudflareOnly); // CLOUDFLARE_ONLY=1: requests that bypassed Cloudflare get 403 (lib/security.js)
app.use(trafficGuard); // per-IP budget, requests-in-flight cap (503 + Retry-After), slow-request log (lib/guard.js)
app.use(payments.pageHeaders); // adds PayPal's SDK sources to the website page's CSP, only when PayPal is on
app.use(loadSession);

const api = express.Router();
const json = (limit) => express.json({ limit, strict: true, type: 'application/json' });
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Every POST/PUT/PATCH/DELETE made with an admin session goes into the audit log once it finished (lib/audit.js).
api.use(audit.auditTrail);

// Every :slug in the API is validated before any handler touches the disk.
api.param('slug', (req, res, next, slug) => (SLUG_RE.test(slug) ? next() : res.status(400).json({ error: 'Invalid invitation link name.' })));

// Auth
// Expensive routes (argon2, scans, image work) are refused with 503 while the process is overloaded (lib/guard.js).
const heavy = shedWhenOverloaded;
api.post('/auth/login', heavy, json('4kb'), wrap(login));
api.post('/auth/signup/start', heavy, json('4kb'), wrap(customers.signupStart)); // sign-up step 1: details -> an emailed code
api.post('/auth/signup', heavy, json('1kb'), wrap(customers.signup)); // step 2: the right code -> the account, signed in
api.post('/auth/forgot', heavy, json('2kb'), wrap(customers.forgot)); // emails a 6-digit code (Brevo, lib/account-mail.js)
api.post('/auth/reset/check', heavy, json('2kb'), wrap(customers.checkResetCode)); // step 1: the code -> a reset ticket
api.post('/auth/reset', heavy, json('2kb'), wrap(customers.resetPassword)); // step 2: the ticket + the new password
api.post('/account/verify', heavy, requireCustomer, wrap(customers.resendVerify));
api.post('/account/verify/confirm', requireCustomer, json('1kb'), wrap(customers.confirmVerify));
api.post('/auth/logout', requireSession, logout);
api.post('/client/session', heavy, json('1kb'), wrap(clientSession()));
api.get('/auth/me', wrap(me));
api.post('/clear-cache', requireSession, clearCache); // Clear-Site-Data: "cache" (never cookies or storage)

// Public
api.get('/invitations/:slug/public', wrap(inv.publicData));
api.get('/site', wrap(site.getSite));
// GET /api/geo: { country, currency } of the visitor (Cloudflare's CF-IPCountry; null when unknown). Prices follow it.
api.get('/geo', (req, res) => {
  const raw = String(req.get('cf-ipcountry') || '').toUpperCase();
  const country = /^[A-Z]{2}$/.test(raw) && !['XX', 'T1'].includes(raw) ? raw : null;
  res.set('Cache-Control', 'private, no-store');
  res.json({ country, currency: country ? (country === 'NP' ? 'NPR' : 'USD') : null });
});
api.get('/themes', wrap(site.publicThemes));
api.get('/music', wrap(music.publicList));
api.post('/orders', heavy, json('8kb'), wrap(orders.submit)); // may hash or check an account password

// The customer's own account (signed in with email + password)
api.get('/account', requireCustomer, wrap(customers.account));
api.patch('/account', requireCustomer, json('1kb'), wrap(customers.patchAccount)); // their phone (E.164, lib/market.js)
api.patch('/account/orders/:ref', requireCustomer, json('4kb'), wrap(customers.patchOrder));
api.post('/account/password', heavy, requireCustomer, json('2kb'), wrap(customers.changePassword));
// The customer's own order, by its reference and pay token (lib/payments/manual.js)
api.param('ref', (req, res, next, ref) => (orders.REF_RE.test(ref) ? next() : res.status(404).json({ error: 'We could not find this order. Check the link you were sent.' })));
api.get('/orders/:ref/pay', wrap(manualPay.payInfo));
api.get('/orders/:ref/qr/:file', wrap(manualPay.payQr));
api.post('/orders/:ref/proof', heavy, wrap(manualPay.submitProof));
api.post('/invitations/:slug/rsvp', express.text({ type: ['text/plain', 'application/json'], limit: '8kb' }), wrap(rsvp.submit));

// Admin. Every admin route names the permission it needs (lib/staff.js PERMS; docs/API.md "Team and permissions"):
// requirePerm(p) = an admin with p, requireAnyPerm(a, b) = with either, requireSuper = super admins only. A plain
// requireAdmin also means super admins only, except inside an area marked below (adminArea), where it lets in the
// admins with that area's permission: the Finance pages live under /api/admin/finance.
api.use('/admin/finance', adminArea('finance'), requirePerm('finance'));
const editor = requireEditor(peekInvitation); // an admin with 'invitations', or the couple (read-only check of their link)
const replyEditor = requireEditor(peekInvitation, 'replies'); // an admin with 'replies', or the couple
api.get('/meta', requireSession, wrap(inv.meta));
api.get('/admin/stats', requireAnyPerm(...PERM_KEYS), heavy, wrap((req, res) => inv.stats(req, res, orders.newCount))); // counts only (Overview)
api.get('/admin/markets', requireAnyPerm('orders', 'finance'), wrap(marketStats)); // Overview: new orders, enquiries, money per market
api.put('/site', requireAnyPerm('website', 'themes'), json('32kb'), wrap(site.putSite)); // each changes only its part (lib/site.js)
api.get('/admin/site', requireAnyPerm('website', 'themes', 'orders', 'finance'), wrap(site.getAdminSite)); // plans and payment methods
api.post('/admin/pay/qr', requirePerm('website'), heavy, wrap(manualPay.uploadQr));
api.post('/admin/brand/logo', requirePerm('website'), heavy, wrap(branding.uploadLogo)); // then saved by PUT /api/site branding.logos
api.post('/admin/seo/indexnow', requirePerm('website'), json('64kb'), wrap(indexnow.adminSubmit)); // { urls } or { all: true }
// The website's words without a rebuild (lib/content.js; docs/API.md "Content"): pages, FAQ, contact, footer, announcement
api.get('/admin/content', requirePerm('content'), wrap(content.adminContent(DIST_DIR)));
api.put('/admin/content/page', requirePerm('content'), json('96kb'), wrap(content.putPage(DIST_DIR)));
api.put('/admin/content/site/:market', requirePerm('content'), json('16kb'), wrap(content.putSiteContent(DIST_DIR)));
api.param('musicId', (req, res, next, id) => (/^[A-Za-z0-9_-]{2,40}$/.test(id) ? next() : res.status(404).json({ error: 'No such song.' })));
api.get('/admin/music', requirePerm('music'), wrap(music.adminList));
api.post('/admin/music', requirePerm('music'), heavy, wrap(music.upload));
api.patch('/admin/music', requirePerm('music'), json('8kb'), wrap(music.reorder));
api.post('/admin/music/restore', requirePerm('music'), wrap(music.restoreBuiltins));
api.patch('/admin/music/:musicId', requirePerm('music'), json('4kb'), wrap(music.patch));
api.delete('/admin/music/:musicId', requirePerm('music'), wrap(music.remove));
api.use('/admin/blog', requirePerm('content'), blog.adminRouter({ json, heavy, distDir: DIST_DIR })); // lib/blog.js
api.get('/orders', requirePerm('orders'), wrap(orders.list));
api.get('/admin/customers', requirePerm('customers'), wrap(customers.adminList));
api.post('/admin/customers', requirePerm('customers'), heavy, json('2kb'), wrap(customers.adminCreate));
api.get('/admin/customers/:id/account', requirePerm('customers'), wrap(customers.adminAccount)); // view their dashboard, read-only
api.patch('/admin/customers/:id', requirePerm('customers'), heavy, json('2kb'), wrap(customers.adminPatch));
api.put('/admin/customers/:id/invitations/:slug', requirePerm('customers', 'invitations'), json('8kb'), wrap(customers.adminLink));
api.delete('/admin/customers/:id/invitations/:slug', requirePerm('customers'), wrap(customers.adminUnlink));
api.post('/admin/pending/link', requirePerm('customers', 'invitations'), json('1kb'), wrap(customers.adminConfirmPending)); // never automatic (docs/API.md)
api.post('/admin/pending/dismiss', requirePerm('customers', 'invitations'), json('1kb'), wrap(customers.adminDismissPending));
api.get('/admin/orders/:id/proof/:n', requirePerm('orders'), wrap(manualPay.adminProof));
api.patch('/orders/:id', requirePerm('orders'), json('8kb'), wrap(orders.update));
api.patch('/orders/:id/quote', requirePerm('orders'), json('4kb'), wrap(enquiries.setQuote)); // an enquiry's price
api.post('/orders/:id/convert', requirePerm('orders'), json('1kb'), wrap(enquiries.convert)); // the enquiry becomes an order
api.post('/orders/:id/invitation', requirePerm('orders', 'invitations'), json('1kb'), wrap(handover.createForOrder));
api.delete('/orders/:id', requirePerm('orders'), wrap(orders.remove));
// Team and audit log: super admins only (lib/team.js, lib/audit.js)
api.get('/admin/team', requireSuper, wrap(team.list));
api.post('/admin/team', requireSuper, heavy, json('2kb'), wrap(team.create));
api.patch('/admin/team/:id', requireSuper, heavy, json('2kb'), wrap(team.patch));
api.delete('/admin/team/:id', requireSuper, wrap(team.remove));
api.get('/admin/audit', requireSuper, wrap(audit.list));
// Money: the Finance router (lib/finance-admin.js); the 'finance' area above gates every route in it
api.use('/admin/finance', financeRouter({ checkout: payments.checkout, paypal: { enabled: payments.config.enabled, env: payments.config.env } }));

// the list: also for picking an invitation on the Replies and Customers pages (couple links left out, lib/invitations.js)
api.get('/invitations', requireAnyPerm('invitations', 'replies', 'customers'), heavy, wrap(inv.list));
api.post('/invitations', requirePerm('invitations'), json('8kb'), wrap(inv.create));
api.get('/invitations/:slug', editor, wrap(inv.read));
api.put('/invitations/:slug', editor, json('768kb'), wrap(inv.update));
api.get('/invitations/:slug/version', editor, wrap(inv.version));
api.post('/invitations/:slug/seen', requirePerm('invitations'), wrap(inv.seen));
api.delete('/invitations/:slug', requirePerm('invitations'), json('2kb'), wrap(inv.remove));
api.post('/invitations/:slug/publish', editor, wrap(inv.publish));
api.post('/invitations/:slug/client-link', requirePerm('invitations'), json('2kb'), wrap(inv.createClientLink));
api.patch('/invitations/:slug/access', requirePerm('invitations'), json('2kb'), wrap(inv.patchAccess));
api.delete('/invitations/:slug/client-link', requirePerm('invitations'), wrap(inv.deleteClientLink));
api.post('/invitations/:slug/unpublish', requirePerm('invitations'), wrap(inv.unpublish));
// Guest links: the planner or the couple, for their own invitation (lib/guest-links.js)
api.param('linkId', (req, res, next, id) => (guestLinks.LINK_ID_RE.test(id) ? next() : res.status(404).json({ error: 'That guest link was deleted.' })));
api.get('/invitations/:slug/guest-links', editor, wrap(guestLinks.list));
api.post('/invitations/:slug/guest-links', editor, json('4kb'), wrap(guestLinks.create));
api.patch('/invitations/:slug/guest-links/:linkId', editor, json('4kb'), wrap(guestLinks.patch));
api.delete('/invitations/:slug/guest-links/:linkId', editor, wrap(guestLinks.remove));
// Uploads per invitation: generous for a planner adding a whole album, but bounded so a leaked couple link
// cannot fill the disk.
const uploadLimiter = rateLimiter({ windowMs: 60 * 60 * 1000, max: 300 });
api.post('/invitations/:slug/uploads', heavy, editor, wrap(async (req, res) => {
  const lim = uploadLimiter.hit(req.params.slug);
  if (!lim.ok) {
    res.set('Retry-After', String(lim.retryAfter));
    return res.status(429).json({ error: 'Too many uploads in the last hour. Please wait a little and try again.' });
  }
  if (!(await invitationExists(req.params.slug))) return res.status(404).json({ error: 'No invitation with that link name.' });
  return handleUpload(req, res);
}));
api.get('/invitations/:slug/rsvps', replyEditor, wrap(rsvp.listReplies));
api.get('/invitations/:slug/rsvps.csv', heavy, replyEditor, wrap(rsvp.exportCsv));
api.delete('/invitations/:slug/rsvps/:id', replyEditor, wrap(rsvp.deleteReply));

api.use('/pay', payments.router);

api.use((req, res) => res.status(404).json({ error: 'Not found.' }));
// Container health check: 200 only while the store answers and the server is not shutting down. Deliberately not
// tied to load: an unhealthy container is taken out of Traefik's routing, which would turn a spike into an outage.
let draining = false;
app.get('/healthz', (req, res) => {
  let ok = !draining;
  try { ok = ok && storePing(); } catch { ok = false; }
  res.set('Cache-Control', 'no-store');
  res.status(ok ? 200 : 503).type('text').send(ok ? 'ok' : 'unavailable');
});
app.use('/api', api);

// /go: the QR on the website's How it works page. Signed in (customer, planner or couple): their dashboard; anyone
// else: the designs. Never cached, since the answer depends on the session cookie.
app.get('/go', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.redirect(302, req.session?.role ? '/studio/' : '/designs/');
});

// The international site moved from its hidden preview to /international/ (lib/gate.js keeps it public).
app.get(/^\/intl-preview(?:\/.*)?$/, (req, res) => res.redirect(301, '/international/'));

// Short guest link: /i/<slug>?to=Name&e=wedding,reception -> a link-preview page that forwards to the theme page.
app.get('/i/:slug', wrap(sharePage));

// Uploaded files: only our own generated names and types, never a directory listing.
app.get(/^\/uploads\/([a-z0-9-]{3,64})\/([A-Za-z0-9_-]{16,40}(?:-(?:lg|sm|depth))?\.(?:webp|mp3))$/, (req, res, next) => {
  const [slug, file] = [req.params[0], req.params[1]];
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(resolve(UPLOAD_DIR, slug, file), { dotfiles: 'deny' }, (err) => {
    if (err && !res.headersSent) res.status(err.statusCode === 404 || err.code === 'ENOENT' ? 404 : 500).end();
    else if (err) next(err);
  });
});
// Payment QR images the admin uploaded (lib/payments/manual.js): random names, PNG only.
app.get(/^\/uploads\/_site\/pay\/([A-Za-z0-9_-]{24}\.png)$/, (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(resolve(UPLOAD_DIR, '_site', 'pay', req.params[0]), { dotfiles: 'deny' }, (err) => {
    if (err && !res.headersSent) res.status(err.statusCode === 404 || err.code === 'ENOENT' ? 404 : 500).end();
    else if (err) next(err);
  });
});
// The music library's uploaded songs (lib/music.js): random names, MP3 only.
app.get(/^\/uploads\/_site\/music\/([A-Za-z0-9_-]{24}\.mp3)$/, (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(resolve(UPLOAD_DIR, '_site', 'music', req.params[0]), { dotfiles: 'deny' }, (err) => {
    if (err && !res.headersSent) res.status(err.statusCode === 404 || err.code === 'ENOENT' ? 404 : 500).end();
    else if (err) next(err);
  });
});
// Logos uploaded on Website → Branding (lib/branding.js): random names (the name is the version), SVG rebuilt safe.
app.get(/^\/uploads\/_site\/brand\/([A-Za-z0-9_-]{24}\.(?:svg|png|webp))$/, branding.serveLogo);
app.get(/^\/uploads\/_site\/blog\//, blog.blogUpload); // blog cover photos (lib/blog.js): random names only
app.use('/uploads', (req, res) => res.status(404).end());

// The blog (/blog/, /international/blog/, their posts and feeds, /sitemap-blog.xml, llms*.txt): server-rendered into
// the built shells (dist/blog/index.html), so search engines read every post; lib/blog.js.
app.use(blog.blogPages({ distDir: DIST_DIR }));
// A readable list of every public page (the XML sitemaps stay plain for search engines); lib/html-sitemap.js.
app.get(['/sitemap', '/sitemap/'], (req, res, next) => (req.path === '/sitemap' ? res.redirect(301, '/sitemap/') : next()), htmlSitemap(blog.blogSitemapXml));
// The Blog editor's Preview tab: a page rendered by POST /api/admin/blog/preview, for the session that made it (30 min).
app.get('/studio/blog-preview/:token', requirePerm('content'), blog.previewPage);

if (IS_PROD) {
  if (!existsSync(DIST_DIR)) console.warn('[studio] dist/ not found: run `npm run build` in the project root.');
  // Theme pages (/<theme>/) only for a published invitation's guests or a studio session; see lib/gate.js.
  // The customer's pay page: /pay/<ref>?t=<token> is the website's pay/index.html (it reads the ref from the path).
  // Never cached, and no Referer leaves it (the token is in the URL).
  const payPage = resolve(DIST_DIR, 'pay', 'index.html');
  app.get(/^\/pay\/NM-\d{5,6}\/?$/, (req, res, next) => {
    if (!existsSync(payPage)) return next();
    res.set('Cache-Control', 'private, no-store');
    res.set('Referrer-Policy', 'no-referrer');
    res.sendFile(payPage, (err) => { if (err && !res.headersSent) next(); });
  });
  // The studio's clean paths (/studio/orders/NM-12345, src/studio/nav.js) are one page: any /studio/<route> without a
  // dot (not a file) gets dist/studio/index.html, never cached. /studio/ itself, assets and /api are unchanged; a
  // couple's link keeps its token in the hash (/studio/#/c/<token>), which never reaches the server.
  const studioPage = resolve(DIST_DIR, 'studio', 'index.html');
  app.get(/^\/studio\/[^.]+$/, (req, res, next) => {
    if (!existsSync(studioPage)) return next();
    res.set('Cache-Control', 'no-store');
    res.set('X-Robots-Tag', 'noindex, nofollow');
    res.sendFile(studioPage, (err) => { if (err && !res.headersSent) next(); });
  });
  app.use(showcaseGate(DIST_DIR)); // public watermarked showcase /<theme>/?showcase=1 (lib/showcase.js)
  app.use(themePageGate(DIST_DIR));
  // the website's pages with the studio's Content edits written in (cached per revision; untouched pages fall through)
  app.use(content.contentPages(DIST_DIR));
  // dist/ with build-time brotli/gzip and the caching policy (lib/static.js; Cloudflare rules in docs/OPERATIONS.md)
  app.use(staticFiles(DIST_DIR));
}

app.use((req, res) => res.status(404).type('text/plain').send('Not found'));

// Errors: expose only messages we wrote; never stack traces.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  if (res.headersSent) { req.socket.destroy(); return undefined; } // mid-stream: nothing sensible left to send
  if (err.type === 'request.aborted') return res.status(400).end(); // the client went away
  if (status >= 500 && status !== 503) console.error('[error]', req.method, req.path, err);
  if (err.retryAfter) res.set('Retry-After', String(err.retryAfter));
  const body = { error: err.expose || status < 500 ? err.message : 'Something went wrong on our side.' };
  if (err.errors) body.errors = err.errors;
  if (err.problems) body.problems = err.problems;
  if (err.current) body.current = err.current;
  if (status < 500 && typeof err.code === 'string' && /^[a-z_]{3,30}$/.test(err.code)) body.code = err.code; // e.g. 'unconfirmed'
  if (err.type === 'entity.too.large') body.error = 'That request is too large.';
  if (err.type === 'entity.parse.failed') body.error = 'Bad request.';
  res.status(status).json(body);
});

const server = app.listen(PORT, () => {
  setTimeout(() => handover.activateMissed().catch((err) => console.warn('[activate] catch-up failed:', err.message)), 5000).unref();
  // a deploy's new or changed pages (sitemap <lastmod>) go to IndexNow once, a minute after start (production only)
  setTimeout(() => indexnow.submitChangedOnBoot().then((r) => { if (r.sent || !r.ok) console.info('[indexnow] after deploy:', JSON.stringify(r)); }).catch(() => {}), 60_000).unref();
  resetLag();
  console.info(`[studio] API on http://localhost:${PORT} (${IS_PROD ? 'production' : 'development'}; store ${STORE_KIND}; depth maps ${DEPTH_ENABLED ? 'on' : 'off'})`);
});
// Slow or stalled clients (slowloris): the headers must arrive within 20 s and a whole request within 120 s (a 15 MB
// upload on a slow phone). Idle keep-alive connections stay open 95 s: longer than the proxy in front keeps idle
// connections to us (Traefik: 90 s), so the proxy, not Node, always closes them first and never reuses a socket
// Node has just closed (that race shows up as random 502s).
server.headersTimeout = 20_000;
server.requestTimeout = 120_000;
server.keepAliveTimeout = 95_000;
server.maxRequestsPerSocket = 0;
server.maxHeadersCount = 100;
server.timeout = 0;

// Errors outside a request never take the server down silently: a stray rejection is logged; a thrown exception
// (state unknown) shuts down cleanly and the container restarts it.
process.on('unhandledRejection', (err) => console.error('[process] unhandled rejection:', err));
process.on('uncaughtException', (err) => { console.error('[process] uncaught exception:', err); shutdown('uncaughtException', 1); });

// Graceful shutdown (deploys, restarts): stop taking connections, let requests in flight finish (up to 10 s),
// then close the database cleanly.
let stopping = false;
function shutdown(signal, code = 0) {
  if (stopping) return;
  stopping = true;
  draining = true;
  console.info(`[studio] ${signal}: finishing requests in flight, then stopping`);
  stopDepth();
  stopBackups();
  const done = () => { try { closeStore(); } catch { /* exiting anyway */ } process.exit(code); };
  server.close(done);
  server.closeIdleConnections();
  setTimeout(() => { server.closeAllConnections(); done(); }, 10_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
startBackups();
