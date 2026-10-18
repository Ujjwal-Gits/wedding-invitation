// The blog: built-in posts, server-rendered pages (title, meta, JSON-LD), feeds and sitemap, the studio's CRUD API with
// its permission and CSRF checks, and the Markdown sanitiser. Against the real server (index.js) in a child process
// with a throwaway DATA_ROOT. Run: npm test, and STORE=json npm test.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { hash as argonHash } from '@node-rs/argon2';
import { renderMarkdown, renderInline, safeHref } from '../lib/blog-md.js';
import { cleanPost, loadSeeds } from '../lib/blog.js';

const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-blog-'));
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
  b.req = async (path, { method = 'GET', body, csrf = true } = {}) => {
    const headers = { Origin: base };
    if (b.cookie) headers.Cookie = b.cookie;
    if (csrf && b.csrf && method !== 'GET') headers['X-CSRF-Token'] = b.csrf;
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
const page = async (path) => { const r = await fetch(base + path, { redirect: 'manual' }); return { status: r.status, text: await r.text(), headers: r.headers }; };
const ldOf = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

before(async () => {
  const port = await freePort();
  base = `http://localhost:${port}`;
  child = spawn(process.execPath, ['index.js'], {
    cwd: resolve(import.meta.dirname, '..'),
    env: {
      ...process.env, DATA_ROOT, PORT: String(port), NODE_ENV: 'test', ADMIN_EMAIL: OWNER.email, DEPTH_ENABLED: '0',
      ADMIN_PASSWORD_HASH: await argonHash(OWNER.password, { memoryCost: 4096, timeCost: 2 }), CLOUDFLARE_ONLY: '0', TRUST_PROXY: '0',
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
  try { rmSync(DATA_ROOT, { recursive: true, force: true }); } catch { /* Windows may hold a file a moment */ }
});

test('the built-in posts are valid: 5 per site, 1,500 words or more, 6+ questions, meta within limits', () => {
  const seeds = loadSeeds();
  for (const site of ['np', 'intl']) assert.equal(seeds.filter((s) => s.post.site === site).length, 5, site);
  for (const { post } of seeds) {
    const r = renderMarkdown(post.body);
    assert.ok(r.words >= 1500 && r.words <= 2600, `${post.slug}: ${r.words} words`);
    assert.ok(r.toc.length >= 6, `${post.slug}: toc`);
    assert.ok(post.faq.length >= 6, `${post.slug}: faq`);
    assert.ok(post.seoTitle.length <= 60 && post.seoDesc.length <= 155, `${post.slug}: meta lengths`);
    assert.ok(!/[–—]/.test(post.body + post.title + post.excerpt), `${post.slug}: no dashes`);
    assert.ok(post.og && post.cover.alt, `${post.slug}: og and cover alt`);
  }
});

test('the index pages list each site’s own posts, server-rendered', async () => {
  const np = await page('/blog/');
  assert.equal(np.status, 200);
  assert.match(np.text, /<title>[^<]+\| Nimtto Blog<\/title>/);
  assert.match(np.text, /<link rel="canonical" href="https:\/\/nimtto\.com\/blog\/" \/>/);
  assert.equal((np.text.match(/class="bcard"/g) || []).length + 1, 5); // the feature + 4 cards
  assert.ok(np.text.includes('/blog/pasni-invitation-guide/'));
  assert.ok(!np.text.includes('/international/blog/how-to-collect-rsvps-online/'));
  const types = ldOf(np.text).map((x) => x['@type']);
  assert.ok(types.includes('Blog') && types.includes('BreadcrumbList') && types.includes('CollectionPage'));
  const intl = await page('/international/blog/');
  assert.equal(intl.status, 200);
  assert.ok(intl.text.includes('/international/blog/how-to-collect-rsvps-online/'));
  assert.ok(intl.text.includes('market-intl'));
  assert.equal((await page('/blog')).status, 301);
});

test('a post page carries its title, meta, canonical, Open Graph and JSON-LD', async () => {
  const r = await page('/blog/wedding-invitation-wording-nepali-english/');
  assert.equal(r.status, 200);
  const t = r.text;
  assert.match(t, /<title>Wedding Invitation Wording[^<]*\| Nimtto<\/title>/);
  assert.match(t, /<meta name="description" content="[^"]{60,155}" \/>/);
  assert.match(t, /<link rel="canonical" href="https:\/\/nimtto\.com\/blog\/wedding-invitation-wording-nepali-english\/" \/>/);
  assert.match(t, /<meta property="og:type" content="article" \/>/);
  assert.match(t, /<meta property="og:image" content="https:\/\/nimtto\.com\/site\/og\/blog-wedding-invitation-wording-nepali-english\.jpg" \/>/);
  assert.match(t, /<meta name="twitter:card" content="summary_large_image" \/>/);
  assert.match(t, /<h1 class="bp-h1" id="bp-h">/);
  assert.match(t, /class="bp-toc"/);
  assert.match(t, /class="copy"/);
  assert.match(t, /rel="author"/);
  assert.match(t, /index, follow/);
  const ld = ldOf(t);
  const post = ld.find((x) => x['@type'] === 'BlogPosting');
  assert.ok(post, 'BlogPosting');
  for (const k of ['headline', 'image', 'datePublished', 'dateModified', 'author', 'publisher', 'mainEntityOfPage', 'wordCount', 'articleSection', 'inLanguage', 'speakable']) assert.ok(post[k], k);
  assert.equal(post.author.name, 'Nimtto Team');
  assert.equal(post.author['@id'], 'https://nimtto.com/about/#team');
  assert.match(t, /<html lang="en-NP"/);
  assert.ok(post.publisher.logo.url);
  assert.equal(post.inLanguage, 'en-NP');
  const faq = ld.find((x) => x['@type'] === 'FAQPage');
  assert.ok(faq && faq.mainEntity.length >= 6, 'FAQPage');
  assert.equal(ld.find((x) => x['@type'] === 'BreadcrumbList').itemListElement.length, 3);
  // the international post is in American English for the US audience
  const i = await page('/international/blog/how-to-collect-rsvps-online/');
  assert.equal(ldOf(i.text).find((x) => x['@type'] === 'BlogPosting').inLanguage, 'en-US');
  assert.match(i.text, /<html lang="en-US"/);
  assert.equal(ldOf(i.text).find((x) => x['@type'] === 'BlogPosting').author.url, 'https://nimtto.com/international/about/#team');
  assert.equal((await page('/blog/how-to-collect-rsvps-online/')).status, 404); // each site has its own posts
  assert.equal((await page('/blog/pasni-invitation-guide')).status, 301);
});

test('RSS feeds and the blog sitemap list the published posts', async () => {
  const rss = await page('/blog/rss.xml');
  assert.equal(rss.status, 200);
  assert.match(rss.headers.get('content-type'), /rss\+xml/);
  assert.equal((rss.text.match(/<item>/g) || []).length, 5);
  const sm = await page('/sitemap-blog.xml');
  assert.equal(sm.status, 200);
  assert.ok(sm.text.includes('<loc>https://nimtto.com/international/blog/when-to-send-wedding-invitations/</loc>'));
  assert.match(sm.text, /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  assert.ok(sm.text.includes('<image:image>'));
});

test('the admin API needs a session, the content permission and the CSRF token', async () => {
  const anon = browser();
  assert.equal((await anon.req('/api/admin/blog')).status, 401);
  const add = async (email, perms) => {
    const r = await owner.req('/api/admin/team', { method: 'POST', body: { email, name: email.split('@')[0], password: 'staff-password-1', role: 'admin', perms } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    return browser().login(email, 'staff-password-1');
  };
  const other = await add('orders@test.local', ['orders']);
  assert.equal((await other.req('/api/admin/blog')).status, 403);
  assert.equal((await other.req('/api/admin/blog', { method: 'POST', body: { site: 'np', title: 'x', slug: 'x-y', category: 'Wording' } })).status, 403);
  const writer = await add('writer@test.local', ['content']);
  const list = await writer.req('/api/admin/blog');
  assert.equal(list.status, 200);
  assert.equal(list.body.posts.length, 10);
  const team = await owner.req('/api/admin/team');
  assert.ok(team.body.perms.some((p) => p.key === 'content'), 'the Team page offers the permission the blog uses');
  const noCsrf = await writer.req('/api/admin/blog', { method: 'POST', body: { site: 'np', title: 'No token', slug: 'no-token', category: 'Wording' }, csrf: false });
  assert.equal(noCsrf.status, 403);
});

test('create, publish, edit, conflict and delete a post; drafts stay private', async () => {
  const draft = { site: 'np', title: 'Gunyu Cholo Invitation Wording', slug: 'gunyu-cholo-wording', category: 'Ceremonies', excerpt: 'Wording for a gunyu cholo card.', body: '## Hello\n\nSome words.\n\n## More\n\nMore words.', status: 'draft', faq: [{ q: 'When?', a: 'At eleven or so.' }], designs: ['mala', 'not-a-design'] };
  const c = await owner.req('/api/admin/blog', { method: 'POST', body: draft });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  const { id } = c.body.post;
  assert.deepEqual(c.body.post.designs, ['mala']);
  assert.equal((await page('/blog/gunyu-cholo-wording/')).status, 404);
  // same link name on the same site: refused; on the other site: fine
  assert.equal((await owner.req('/api/admin/blog', { method: 'POST', body: { ...draft } })).status, 409);
  const other = await owner.req('/api/admin/blog', { method: 'POST', body: { ...draft, site: 'intl', category: 'Wording', designs: [] } });
  assert.equal(other.status, 201);
  // publish
  const got = await owner.req(`/api/admin/blog/${id}`);
  const pub = await owner.req(`/api/admin/blog/${id}`, { method: 'PUT', body: { ...got.body.post, status: 'published', baseStamp: got.body.stamp } });
  assert.equal(pub.status, 200, JSON.stringify(pub.body));
  const live = await page('/blog/gunyu-cholo-wording/');
  assert.equal(live.status, 200);
  assert.match(live.text, /<title>Gunyu Cholo Invitation Wording \| Nimtto<\/title>/);
  assert.ok((await page('/blog/rss.xml')).text.includes('/blog/gunyu-cholo-wording/'));
  assert.ok((await page('/sitemap-blog.xml')).text.includes('/blog/gunyu-cholo-wording/'));
  // a renamed published post: the old link redirects
  const renamed = await owner.req(`/api/admin/blog/${id}`, { method: 'PUT', body: { ...pub.body.post, slug: 'gunyu-cholo-card-wording' } });
  assert.equal(renamed.status, 200);
  const old = await page('/blog/gunyu-cholo-wording/');
  assert.equal(old.status, 301);
  assert.equal(old.headers.get('location'), '/blog/gunyu-cholo-card-wording/');
  // a stale editor cannot overwrite a newer save
  const stale = await owner.req(`/api/admin/blog/${id}`, { method: 'PUT', body: { ...got.body.post, title: 'Old', baseStamp: got.body.stamp } });
  assert.equal(stale.status, 409);
  // bad input
  const bad = await owner.req(`/api/admin/blog/${id}`, { method: 'PUT', body: { ...pub.body.post, slug: 'Bad Slug!' } });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.errors.slug);
  // delete
  assert.equal((await owner.req(`/api/admin/blog/${id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await page('/blog/gunyu-cholo-card-wording/')).status, 404);
  assert.equal((await owner.req(`/api/admin/blog/${id}`)).status, 404);
});

test('editor input is escaped and sanitised on the public page', async () => {
  const evil = {
    site: 'np', title: 'Evil <script>alert(1)</script> "title"', slug: 'evil-test', category: 'Wording', status: 'published',
    excerpt: '<img src=x onerror=alert(2)>', seoDesc: '"><script>alert(3)</script>',
    body: '## Head <b>bold</b>\n\n<script>alert(4)</script>\n\n<iframe src="https://evil.example"></iframe>\n\n[click](javascript:alert(5)) [data](data:text/html,hi) ![x](https://evil.example/x.png) ![y](/site/stills/kham-800.webp "ok")\n\n<a href="javascript:alert(6)">a</a> <div onclick="alert(7)">d</div>',
    faq: [{ q: 'Q <svg onload=alert(8)>', a: 'A [x](javascript:alert(9)) <b>y</b>' }],
  };
  const c = await owner.req('/api/admin/blog', { method: 'POST', body: evil });
  assert.equal(c.status, 201);
  const r = await page('/blog/evil-test/');
  assert.equal(r.status, 200);
  const main = r.text;
  assert.ok(!/<script>alert/i.test(main), 'no script tag from the editor');
  assert.ok(!/<(?:iframe|svg|img)[^>]*(?:onerror|onload|evil\.example)/i.test(main), 'no event handlers or remote pictures');
  assert.ok(!/<a[^>]*href="(?:javascript|data):/i.test(main), 'no javascript: or data: links');
  assert.ok(!/<div onclick/i.test(main));
  assert.ok(main.includes('&lt;script&gt;alert(4)&lt;/script&gt;'), 'raw HTML shows as text');
  assert.ok(main.includes('src="/site/stills/kham-800.webp"'), 'our own pictures stay');
  // the JSON-LD holds the title whole: its </script> is written </script>, so it cannot end the block early
  assert.equal(ldOf(main).find((x) => x['@type'] === 'BlogPosting').headline, evil.title);
  assert.ok(main.includes('\u003c/script>'));
  assert.match(main, /<title>Evil &lt;script&gt;alert\(1\)&lt;\/script&gt; &quot;Title&quot; \| Nimtto<\/title>/);
});

test('the live preview renders without saving, never indexed', async () => {
  const r = await owner.req('/api/admin/blog/preview', { method: 'POST', body: { site: 'intl', title: 'Preview only', slug: 'preview-only', category: 'RSVP', body: '## One\n\nText.' } });
  assert.equal(r.status, 200);
  assert.match(r.body.html, /noindex, nofollow/);
  assert.match(r.body.html, /Preview only/);
  assert.equal((await page('/international/blog/preview-only/')).status, 404);
  const list = await owner.req('/api/admin/blog');
  assert.ok(!list.body.posts.some((p) => p.slug === 'preview-only'));
});

test('markdown: safe links only, raw HTML escaped, house blocks', () => {
  for (const u of ['javascript:alert(1)', 'data:text/html,x', '//evil.com', 'vbscript:x', ' javascript:x']) assert.equal(safeHref(u), false, u);
  for (const u of ['/pricing/', 'https://emilypost.com/x', 'mailto:a@b.c', '#faq']) assert.equal(safeHref(u), true, u);
  const r = renderMarkdown('## A *b*\n\n> [!TIP]\n> Short.\n\n```copy Title\nशुभ विवाह\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n<b>x</b>');
  assert.deepEqual(r.toc, [{ level: 2, id: 'a-b', text: 'A b' }]);
  assert.match(r.html, /<aside class="callout callout--tip" role="note">/);
  assert.match(r.html, /<pre class="copy__text" lang="ne">/);
  assert.match(r.html, /<div class="tbl" role="region"/);
  assert.match(r.html, /&lt;b&gt;x&lt;\/b&gt;/);
  assert.equal(renderInline('<i>x</i> [y](/z/)').html, '&lt;i&gt;x&lt;/i&gt; <a href="/z/">y</a>');
  assert.throws(() => cleanPost({ site: 'np', title: '', slug: 'x', category: '' }), /title/i);
});

test('blog pages carry the Content page’s site-wide words (announcement, contact) like every built page', async () => {
  const before = await page('/blog/');
  if (!before.text.includes('<!--cms:announce-->')) return; // no built shell (dist/) here: the fallback has no hooks
  const { body: c } = await owner.req('/api/admin/content');
  const np = c.sites.np;
  const r = await owner.req('/api/admin/content/site/np', { method: 'PUT', body: {
    ver: c.ver, contact: { ...np.contact, email: 'blog-test@nimtto.com' }, hours: '', social: {}, footer: { blurb: '', payLine: '' }, trust: { line: '', policy: '' },
    announce: { on: true, text: 'Blog announcement', link: '/pricing/', linkText: 'See prices', from: c.today, to: '' },
  } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const after = await page('/blog/pasni-invitation-guide/');
  assert.ok(after.text.includes('Blog announcement'), 'the announcement bar');
  assert.ok(after.text.includes('blog-test@nimtto.com'), 'the contact email');
  assert.equal(after.headers.get('cache-control'), 'no-cache');
  assert.ok(after.headers.get('etag'));
  assert.equal((await fetch(`${base}/blog/pasni-invitation-guide/`, { headers: { 'If-None-Match': after.headers.get('etag') } })).status, 304);
});
