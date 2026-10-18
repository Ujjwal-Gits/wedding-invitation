// Website → Branding (lib/branding.js): the SVG allowlist, logo uploads (types, sizes), the settings validation
// (watermark opacity 0-100, logo URLs), permissions, and the logos and opacity reaching the built pages and the
// watermarked previews. The end-to-end part runs the real server (production mode) as content-api.test.js does.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import sharp from 'sharp';
import { hash as argonHash } from '@node-rs/argon2';
import { renderPartials } from '../../src/site/partials.mjs';
import { sanitizeSvg, processLogo, cleanBranding, brandingOf, publicBranding, WM_OPACITY_DEFAULT } from '../lib/branding.js';
import { applyContent } from '../lib/content-render.js';

const ROOT = resolve(import.meta.dirname, '..', '..');
const LOGO = '/uploads/_site/brand/abcdefghijklmnopqrstuvwx.svg';
const EVIL_SVG = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 120 40" onload="alert(1)">'
  + '<script>alert(1)</script><foreignObject><iframe src="https://evil.test"></iframe></foreignObject>'
  + '<linearGradient id="g"><stop offset="0" stop-color="#4A7556"/></linearGradient>'
  + '<a href="javascript:alert(2)"><path d="M0 0h120v40H0z" fill="url(#g)" onclick="x()" style="fill:url(https://evil.test/x)"/></a>'
  + '<use xlink:href="https://evil.test/sprite.svg#a"/><use href="#g"/><image href="https://evil.test/p.png" width="1" height="1"/>'
  + '<style>@import url(https://evil.test/x.css);</style><text x="4" y="30">Nimtto &amp; Co</text></svg>';

/* ---------------- units ---------------- */

test('SVG logos are rebuilt from the allowlist: no script, handlers, foreign content or outside references', () => {
  const { svg, styleDropped } = sanitizeSvg(EVIL_SVG);
  for (const bad of ['<script', 'onload', 'onclick', 'foreignObject', 'iframe', 'javascript:', 'evil.test', '@import', '<a ', '<?xml']) assert.ok(!svg.includes(bad), `${bad} removed: ${svg}`);
  assert.ok(styleDropped);
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, /viewBox="0 0 120 40"/, 'attribute case kept (viewBox)');
  assert.match(svg, /<linearGradient id="g">/);
  assert.match(svg, /fill="url\(#g\)"/, 'a reference to an id inside stays');
  assert.match(svg, /<use href="#g"><\/use>/);
  assert.match(svg, /Nimtto &amp; Co/);
  // the bundled logo survives untouched in substance
  const own = sanitizeSvg(readFileSync(resolve(ROOT, 'public/site/brand/nimtto-logo.svg'), 'utf8')).svg;
  assert.match(own, /fill="#9A1829"/);
  for (const bad of ['<html><body>hi</body></html>', '<!DOCTYPE svg [<!ENTITY x "y">]><svg viewBox="0 0 1 1"><rect width="1" height="1"/></svg>', '<svg viewBox="0 0 1 1"></svg>', '<svg><path d="M0 0"/></svg>']) {
    assert.throws(() => sanitizeSvg(bad), (e) => e.status === 415, bad);
  }
});

test('logo uploads: SVG, PNG and WebP only; rasters are re-encoded', async () => {
  const png = await sharp({ create: { width: 300, height: 80, channels: 4, background: { r: 74, g: 117, b: 86, alpha: 1 } } }).png().toBuffer();
  const p = await processLogo(png);
  assert.equal(p.ext, 'png');
  assert.equal((await sharp(p.body).metadata()).format, 'png');
  const webp = await sharp({ create: { width: 3000, height: 600, channels: 3, background: '#fff' } }).webp().toBuffer();
  const w = await processLogo(webp);
  assert.equal(w.ext, 'webp');
  assert.ok(w.info.width <= 1600, 'large logos are scaled down');
  const s = await processLogo(Buffer.from(EVIL_SVG));
  assert.equal(s.ext, 'svg');
  assert.ok(!s.body.toString().includes('<script'));
  const jpeg = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).jpeg().toBuffer();
  for (const bad of [jpeg, Buffer.from('GIF89a not really'), Buffer.from('<html><script>1</script></html>')]) {
    await assert.rejects(processLogo(bad), (e) => e.status === 415);
  }
});

test('branding settings: opacity 0-100 whole numbers, logos only uploaded URLs, unknown slots refused', () => {
  const errs = [];
  const fail = (path, message) => errs.push({ path, message });
  assert.deepEqual(cleanBranding(undefined, fail), { wmOpacity: WM_OPACITY_DEFAULT, logos: { watermark: '', site: '', intl: '' } });
  assert.equal(cleanBranding({ wmOpacity: 0 }, fail).wmOpacity, 0);
  assert.equal(cleanBranding({ wmOpacity: 100 }, fail).wmOpacity, 100);
  assert.equal(errs.length, 0);
  for (const bad of [-1, 101, 50.5, '50', true]) {
    const e = [];
    cleanBranding({ wmOpacity: bad }, (path) => e.push(path));
    assert.deepEqual(e, ['branding.wmOpacity'], String(bad));
  }
  for (const bad of ['https://evil.test/logo.svg', '/site/brand/nimtto-logo.svg', '/uploads/_site/brand/../../x.svg', '/uploads/_site/brand/short.svg', `${LOGO}?x`, 'javascript:alert(1)']) {
    const e = [];
    cleanBranding({ logos: { site: bad } }, (path) => e.push(path));
    assert.deepEqual(e, ['branding.logos.site'], bad);
  }
  const e2 = [];
  cleanBranding({ logos: { header: LOGO } }, (path) => e2.push(path));
  assert.deepEqual(e2, ['branding.logos.header']);
  assert.deepEqual(cleanBranding({ wmOpacity: 35, logos: { site: LOGO, watermark: '' } }, fail), { wmOpacity: 35, logos: { watermark: '', site: LOGO, intl: '' } });
  // stored values that are odd read as the defaults; the International logo falls back to the website logo
  assert.equal(brandingOf({ wmOpacity: 400, logos: { site: 'x' } }).wmOpacity, WM_OPACITY_DEFAULT);
  assert.equal(publicBranding({ logos: { site: LOGO } }).logos.intl, LOGO);
});

test('the header and footer logos are swapped only for an uploaded logo URL', () => {
  const html = '<a class="nav__logo" href="/"><img src="/site/brand/nimtto-logo.svg" width="146" height="34" alt="Nimtto home" /></a><img src="/site/brand/nimtto-logo-intl.svg" alt="Nimtto"><img src="/site/brand/nimtto-mark.svg">';
  const out = applyContent(html, { logo: LOGO });
  assert.equal(out.split(LOGO).length - 1, 2);
  assert.ok(out.includes('/site/brand/nimtto-mark.svg'), 'other images stay');
  assert.ok(out.includes('data-brand="custom"'));
  assert.equal(applyContent(html, { logo: '"><script>alert(1)</script>' }), html);
  assert.equal(applyContent(html, {}), html);
});

/* ---------------- end to end ---------------- */

const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-brand-'));
const DIST = mkdtempSync(join(tmpdir(), 'nimtto-brand-dist-'));
const OWNER = { email: 'owner@test.local', password: 'owner-password-1' };
let child;
let base;
let owner;

const freePort = () => new Promise((ok, fail) => {
  const s = createServer();
  s.once('error', fail);
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)); });
});

function browser() {
  const b = { cookie: '', csrf: '' };
  b.req = async (path, { method = 'GET', body, form } = {}) => {
    const headers = { Origin: base };
    if (b.cookie) headers.Cookie = b.cookie;
    if (b.csrf && method !== 'GET') headers['X-CSRF-Token'] = b.csrf;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const r = await fetch(base + path, { method, headers, body: form || (body !== undefined ? JSON.stringify(body) : undefined), redirect: 'manual' });
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
  b.upload = (buf, name, type) => {
    const form = new FormData();
    form.append('file', new Blob([buf], { type }), name);
    return b.req('/api/admin/brand/logo', { method: 'POST', form });
  };
  return b;
}

let themeSlug = '';
before(async () => {
  for (const rel of ['index.html', 'international/index.html']) {
    const out = join(DIST, rel);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, renderPartials(readFileSync(resolve(ROOT, rel), 'utf8')));
  }
  const { listThemes } = await import('../lib/catalog.js');
  themeSlug = listThemes().find((t) => t.ready)?.slug || '';
  if (themeSlug) {
    mkdirSync(join(DIST, themeSlug), { recursive: true });
    writeFileSync(join(DIST, themeSlug, 'index.html'), '<!doctype html><html lang="en"><head><title>T</title></head><body><main>design</main></body></html>');
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

test('only admins with the Website permission upload logos or change branding', async () => {
  assert.equal((await browser().upload(Buffer.from(EVIL_SVG), 'a.svg', 'image/svg+xml')).status, 401);
  const add = async (email, perms) => {
    const r = await owner.req('/api/admin/team', { method: 'POST', body: { email, name: email.split('@')[0], password: 'staff-password-1', role: 'admin', perms } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return browser().login(email, 'staff-password-1');
  };
  const words = await add('words@test.local', ['content']);
  assert.equal((await words.upload(Buffer.from(EVIL_SVG), 'a.svg', 'image/svg+xml')).status, 403);
  assert.equal((await words.req('/api/site', { method: 'PUT', body: { branding: { wmOpacity: 10 } } })).status, 403);
  // Themes alone saves the whole document, but its branding part is kept as stored
  const themes = await add('themes@test.local', ['themes']);
  const cur = (await themes.req('/api/admin/site')).body;
  const r = await themes.req('/api/site', { method: 'PUT', body: { ...cur, branding: { wmOpacity: 5, logos: {} } } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.branding.wmOpacity, WM_OPACITY_DEFAULT);
});

test('an uploaded logo is cleaned, served immutable and safe, and shows on both websites and the previews', async () => {
  const up = await owner.upload(Buffer.from(EVIL_SVG), 'logo.svg', 'image/svg+xml');
  assert.equal(up.status, 201, JSON.stringify(up.body));
  assert.match(up.body.url, /^\/uploads\/_site\/brand\/[A-Za-z0-9_-]{24}\.svg$/);
  const f = await fetch(base + up.body.url);
  assert.equal(f.status, 200);
  assert.match(f.headers.get('content-type'), /image\/svg\+xml/);
  assert.match(f.headers.get('cache-control'), /immutable/);
  assert.match(f.headers.get('content-security-policy'), /default-src 'none'/);
  assert.equal(f.headers.get('x-content-type-options'), 'nosniff');
  const text = await f.text();
  assert.ok(!text.includes('<script') && !text.includes('onload'));
  assert.equal((await owner.upload(Buffer.from('not an image at all'), 'x.png', 'image/png')).status, 415);
  // over 1 MB: 413, or the server closes the connection before the body is sent (Connection: close)
  const big = await owner.upload(Buffer.alloc(1100 * 1024, 32), 'big.svg', 'image/svg+xml').catch(() => ({ status: 413 }));
  assert.equal(big.status, 413);
  assert.equal((await fetch(`${base}/uploads/_site/brand/aaaaaaaaaaaaaaaaaaaaaaaa.svg`)).status, 404);

  const cur = (await owner.req('/api/admin/site')).body;
  assert.equal(cur.branding.wmOpacity, WM_OPACITY_DEFAULT);
  const bad = await owner.req('/api/site', { method: 'PUT', body: { ...cur, branding: { wmOpacity: 101, logos: {} } } });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.errors.some((e) => e.path === 'branding.wmOpacity'));
  const bad2 = await owner.req('/api/site', { method: 'PUT', body: { ...cur, branding: { wmOpacity: 40, logos: { site: 'https://evil.test/x.svg' } } } });
  assert.equal(bad2.status, 400);
  const ok = await owner.req('/api/site', { method: 'PUT', body: { ...cur, branding: { wmOpacity: 35, logos: { site: up.body.url, watermark: up.body.url } } } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  const pub = (await browser().req('/api/site')).body;
  assert.deepEqual(pub.branding, { wmOpacity: 35, logos: { watermark: up.body.url, site: up.body.url, intl: up.body.url } });

  const home = await (await fetch(`${base}/`)).text();
  assert.ok(home.includes(`<img src="${up.body.url}" data-brand="custom"`), 'the Nepal header uses the uploaded logo');
  assert.ok(!home.includes('/site/brand/nimtto-logo.svg"'));
  const intl = await (await fetch(`${base}/international/`)).text();
  assert.ok(intl.includes(up.body.url), 'the International site falls back to the website logo');

  if (themeSlug) {
    const red = await fetch(`${base}/${themeSlug}/?showcase=1&m=intl&id=x`, { redirect: 'manual' });
    assert.equal(red.status, 302);
    assert.equal(red.headers.get('location'), `/${themeSlug}/?showcase=1&m=intl`, 'the International flag survives the canonical redirect');
    const blogCard = await fetch(`${base}/${themeSlug}/?showcase=1&market=intl`, { redirect: 'manual' });
    assert.equal(blogCard.headers.get('location'), `/${themeSlug}/?showcase=1&m=intl`, 'the blog cards\' market=intl means the same');
    const sc = await (await fetch(`${base}/${themeSlug}/?showcase=1&m=intl`)).text();
    assert.match(sc, /data-showcase="1" data-sc-op="35"/);
    assert.ok(sc.includes(`data-sc-wm="${up.body.url}"`) && sc.includes('data-sc-m="intl"'));
    const np = await (await fetch(`${base}/${themeSlug}/?showcase=1`)).text();
    assert.ok(!np.includes('data-sc-m='), 'Nepal previews stay crimson');
  }
});
