// The Content page end to end: the real server (index.js, production mode) serving a small built site rendered
// from the real templates, started in a child process with a throwaway DATA_ROOT and DIST_DIR. Permissions, saving,
// the stale-editor check, the edited page on the next request (cache invalidated), 304s, reset to default, contact
// lines saved into the site settings, and the audit log. Run: npm test, and STORE=json npm test.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { hash as argonHash } from '@node-rs/argon2';
import { renderPartials } from '../../src/site/partials.mjs';

const ROOT = resolve(import.meta.dirname, '..', '..');
const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-cms-'));
const DIST = mkdtempSync(join(tmpdir(), 'nimtto-cms-dist-'));
const OWNER = { email: 'owner@test.local', password: 'owner-password-1' };
let child;
let base;
let owner;

const freePort = () => new Promise((ok, fail) => {
  const s = createServer();
  s.once('error', fail);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); });
});

before(async () => {
  for (const rel of ['index.html', 'faq/index.html', 'contact/index.html', 'international/index.html', 'international/faq/index.html']) {
    const out = join(DIST, rel);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, renderPartials(readFileSync(resolve(ROOT, rel), 'utf8')));
  }
  const port = await freePort();
  base = `http://localhost:${port}`;
  child = spawn(process.execPath, ['index.js'], {
    cwd: resolve(import.meta.dirname, '..'),
    env: {
      ...process.env, DATA_ROOT, DIST_DIR: DIST, PORT: String(port), NODE_ENV: 'production', ADMIN_EMAIL: OWNER.email, DEPTH_ENABLED: '0',
      ADMIN_PASSWORD_HASH: await argonHash(OWNER.password, { memoryCost: 4096, timeCost: 2 }), CLOUDFLARE_ONLY: '0', CLOUDFLARE: '0', TRUST_PROXY: '0',
      PUBLIC_ORIGIN: base, BREVO_API_KEY: '', BREVO_SMTP_KEY: '', PAYPAL_CLIENT_ID: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  await new Promise((ok, fail) => {
    const t = setTimeout(() => fail(new Error(`server did not start:\n${log}`)), 30_000);
    const on = (d) => { log += d; if (log.includes('[studio] API on')) { clearTimeout(t); ok(); } };
    child.stdout.on('data', on);
    child.stderr.on('data', on);
    child.once('exit', (code) => { clearTimeout(t); fail(new Error(`server exited (${code}):\n${log}`)); });
  });
  owner = await browser().login(OWNER.email, OWNER.password);
});

after(() => {
  child?.kill();
  for (const d of [DATA_ROOT, DIST]) { try { rmSync(d, { recursive: true, force: true }); } catch { /* Windows may hold a file a moment */ } }
});

function browser() {
  const b = { cookie: '', csrf: '' };
  b.req = async (path, { method = 'GET', body, headers: extra = {} } = {}) => {
    const headers = { Origin: base, ...extra };
    if (b.cookie) headers.Cookie = b.cookie;
    if (b.csrf && method !== 'GET') headers['X-CSRF-Token'] = b.csrf;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const r = await fetch(base + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: 'manual' });
    const set = r.headers.get('set-cookie');
    if (set) { const v = set.split(';')[0]; b.cookie = v.endsWith('=') ? '' : v; }
    const text = await r.text();
    let data = null;
    try { data = JSON.parse(text); } catch { data = text; }
    if (data && typeof data === 'object' && typeof data.csrf === 'string') b.csrf = data.csrf;
    return { status: r.status, body: data, headers: r.headers };
  };
  b.login = async (email, password) => {
    const r = await b.req('/api/auth/login', { method: 'POST', body: { email, password } });
    assert.equal(r.status, 200, `login ${email}: ${JSON.stringify(r.body)}`);
    return b;
  };
  return b;
}
const page = async (path, headers) => {
  const r = await fetch(base + path, { headers });
  return { status: r.status, html: await r.text(), etag: r.headers.get('etag'), cc: r.headers.get('cache-control'), csp: r.headers.get('content-security-policy'), link: r.headers.get('link') };
};
const titleOf = (html) => /<title[^>]*>([\s\S]*?)<\/title>/.exec(html)?.[1];

test('only admins with the Content permission can read or change it', async () => {
  assert.equal((await browser().req('/api/admin/content')).status, 401);
  const add = async (email, perms) => {
    const r = await owner.req('/api/admin/team', { method: 'POST', body: { email, name: email.split('@')[0], password: 'staff-password-1', role: 'admin', perms } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return browser().login(email, 'staff-password-1');
  };
  const web = await add('web@test.local', ['website']);
  assert.equal((await web.req('/api/admin/content')).status, 403);
  assert.equal((await web.req('/api/admin/content/page', { method: 'PUT', body: { path: '/faq/', title: 'Nope' } })).status, 403);
  const editor = await add('words@test.local', ['content']);
  const r = await editor.req('/api/admin/content');
  assert.equal(r.status, 200);
  assert.ok(r.body.built);
  const faq = r.body.pages.find((p) => p.path === '/faq/');
  assert.equal(faq.site, 'np');
  assert.equal(faq.group, 'main');
  assert.ok(faq.defaults.faq.length > 5 && faq.defaults.faqGrouped);
  assert.ok(r.body.pages.some((p) => p.path === '/international/faq/' && p.site === 'intl'));
  assert.equal((await editor.req('/api/site', { method: 'PUT', body: {} })).status, 403, 'Content alone is not the Website page');
});

test('a saved page shows on the next request; stale editors get 409; reset goes back to the built words', async () => {
  const before0 = await page('/faq/');
  assert.equal(before0.status, 200);
  const builtTitle = titleOf(before0.html);
  const { body: c } = await owner.req('/api/admin/content');
  const faq = c.pages.find((p) => p.path === '/faq/');
  const items = [...faq.defaults.faq.slice(0, 2), { q: 'Brand new question?', a: 'Yes, with <a href="/pricing/">prices</a>.', group: faq.defaults.faq[1].group }];
  const save = await owner.req('/api/admin/content/page', { method: 'PUT', body: { ver: c.ver, path: '/faq/', title: 'Nimtto FAQ <Edited>', desc: 'Edited description', h1: 'Edited <em>heading</em>', faq: items } });
  assert.equal(save.status, 200, JSON.stringify(save.body));
  assert.equal(save.body.ver, c.ver + 1);
  assert.deepEqual(Object.keys(save.body.page.override).sort(), ['desc', 'faq', 'h1', 'title']);

  const after1 = await page('/faq/');
  assert.equal(titleOf(after1.html), 'Nimtto FAQ &lt;Edited&gt;');
  assert.match(after1.html, /data-cms="h1">Edited <em>heading<\/em><\/h1>/);
  assert.ok(after1.html.includes('<span>Brand new question?</span>'));
  const ld = [...after1.html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).filter((o) => o['@type'] === 'FAQPage');
  assert.equal(ld.length, 1);
  assert.deepEqual(ld[0].mainEntity.map((x) => x.name), items.map((x) => x.q));
  assert.equal(after1.cc, 'no-cache');
  assert.equal(after1.link, before0.link, 'the same preload Link header as the built page');
  assert.match(after1.link || '', /rel=preload/);
  assert.ok(after1.etag);
  assert.ok(after1.csp && after1.csp.includes("script-src 'self'"), 'the page CSP is unchanged');
  assert.equal((await page('/faq/', { 'If-None-Match': after1.etag })).status, 304);
  assert.equal((await page('/faq/index.html')).html, after1.html, 'the same page by its file name');

  const stale = await owner.req('/api/admin/content/page', { method: 'PUT', body: { ver: c.ver, path: '/faq/', title: 'Old editor' } });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.code, 'conflict');

  assert.equal((await owner.req('/api/admin/content/page', { method: 'PUT', body: { path: '/nope/', title: 'x' } })).status, 404);
  const bad = await owner.req('/api/admin/content/page', { method: 'PUT', body: { path: '/faq/', lede: '<a href="javascript:alert(1)">x</a>' } });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.errors.some((e) => e.path === 'lede'));

  const reset = await owner.req('/api/admin/content/page', { method: 'PUT', body: { ver: save.body.ver, path: '/faq/', title: '', desc: '', h1: '', lede: '', faq: null } });
  assert.equal(reset.status, 200);
  assert.deepEqual(reset.body.page.override, {});
  const back = await page('/faq/');
  assert.equal(titleOf(back.html), builtTitle);
  assert.equal(back.html, before0.html, 'byte for byte the built page');

  const log = await owner.req('/api/admin/audit');
  const row = log.body.rows.find((x) => x.action === 'PUT /admin/content/page' && x.status === 200);
  assert.ok(row, 'audited');
  assert.equal(row.target, '/faq/');
  assert.match(row.label, /Content/);
});

test('contact lines, announcement and social links: saved per site, shown on that site', async () => {
  const { body: c } = await owner.req('/api/admin/content');
  const np = c.sites.np;
  const today = c.today;
  const r = await owner.req('/api/admin/content/site/np', { method: 'PUT', body: {
    ver: c.ver, contact: { ...np.contact, email: 'hello@nimtto.com' }, hours: '', social: { instagram: 'https://instagram.com/nimtto' },
    footer: { blurb: '', payLine: '' }, trust: { line: 'Real designers', policy: '' },
    announce: { on: true, text: 'Festival offer', link: '/pricing/', linkText: 'See prices', from: today, to: '' },
  } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.site.contact.email, 'hello@nimtto.com');
  assert.ok(r.body.site.announceLive);
  const home = await page('/');
  assert.ok(home.html.includes('class="announce"') && home.html.includes('Festival offer'));
  assert.ok(home.html.includes('href="mailto:hello@nimtto.com"'));
  assert.ok(home.html.includes('href="https://instagram.com/nimtto"'));
  assert.ok(home.html.includes('<p class="foot__trust">Real designers</p>'));
  const site = await (await fetch(`${base}/api/site`)).json();
  assert.equal(site.contact.email, 'hello@nimtto.com', 'the contact lines live in the site settings');
  const intl = await page('/international/');
  assert.ok(!intl.html.includes('class="announce"'), 'the other site keeps its own bar (none)');
  assert.ok(intl.html.includes('href="mailto:hello@nimtto.com"'), 'International falls back to Nepal’s email');
  const bad = await owner.req('/api/admin/content/site/np', { method: 'PUT', body: { ver: r.body.ver, contact: { email: 'not-an-email' }, social: { x: 'javascript:alert(1)' } } });
  assert.equal(bad.status, 400);
  assert.equal((await owner.req('/api/admin/content/site/mars', { method: 'PUT', body: {} })).status, 404);
});
