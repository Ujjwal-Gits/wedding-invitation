// The Content page's server side (lib/content.js, lib/content-render.js, lib/safe-html.js), in process: the safe
// subset, the FAQ markup and its JSON-LD (the same as the build's, and always in step), every override, and that a
// page with nothing changed comes out byte for byte as built. Pages are rendered from the real templates with the
// real partials (src/site/partials.mjs). Run: npm test, and STORE=json npm test.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-content-'));
process.env.DATA_ROOT = DATA_ROOT;
const ROOT = resolve(import.meta.dirname, '..', '..');

const store = await import('../lib/store.js');
store.openStore();
const { cleanInline, inlineText, inlineProblem, safeHref, htmlToModel, HEADING } = await import('../lib/safe-html.js');
const R = await import('../lib/content-render.js');
const C = await import('../lib/content.js');
const { readSite } = await import('../lib/site.js');
const { renderPartials, faqBlock, faqGroups } = await import('../../src/site/partials.mjs');

after(() => { store.closeStore(); rmSync(DATA_ROOT, { recursive: true, force: true }); });

/** a page as the build writes it (partials filled; Vite's own transforms do not touch these parts) */
const built = (rel) => renderPartials(readFileSync(resolve(ROOT, rel), 'utf8'));
const pageOf = (html, path) => ({ ...R.readPage(html), path });
const ldOf = (html, type) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((o) => o['@type'] === type || o['@graph']);
const faqLdOf = (html) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).filter((o) => o['@type'] === 'FAQPage');
const emptyDoc = () => C.contentOf(null);

test('the safe subset: text escaped, only b/i/em/strong/a kept, links checked', () => {
  assert.equal(cleanInline('Tom & Jerry <3 "quotes"'), 'Tom &amp; Jerry &lt;3 &quot;quotes&quot;');
  assert.equal(cleanInline('<script>alert(1)</script>'), 'alert(1)');
  assert.equal(cleanInline('<img src=x onerror=alert(1)>hi'), 'hi');
  assert.equal(cleanInline('<b onclick="x()">bold</b> <i>it</i>'), '<b>bold</b> <i>it</i>');
  assert.equal(cleanInline('<a href="javascript:alert(1)">x</a>'), 'x');
  assert.equal(cleanInline('<a href="//evil.example">x</a>'), 'x');
  assert.equal(cleanInline('<a href="https://nimtto.com/x?a=1&amp;b=2" target="_blank" onmouseover="y">ok</a>'), '<a href="https://nimtto.com/x?a=1&amp;b=2">ok</a>');
  assert.equal(cleanInline('<a href="mailto:hi@nimtto.com">mail</a> <a href="tel:+9779806393298">call</a> <a href="/pricing/">prices</a>'), '<a href="mailto:hi@nimtto.com">mail</a> <a href="tel:+9779806393298">call</a> <a href="/pricing/">prices</a>');
  assert.equal(cleanInline('<a href="https://a.com"><a href="https://b.com">x</a></a>'), '<a href="https://a.com">x</a>');
  assert.equal(cleanInline('<b>open'), '<b>open</b>', 'balanced');
  assert.equal(cleanInline('close</b> only'), 'close only');
  assert.equal(cleanInline('<b>x</b> <em>y</em>', HEADING), 'x <em>y</em>', 'headings: <em> only');
  assert.equal(inlineText(cleanInline('<b>Rs 2,999</b> & more')), 'Rs 2,999 & more');
  for (const bad of ['http://x.com', 'data:text/html,1', 'javascript:1', '//x.com', 'https://user:pw@x.com', 'https://x.com/"onx', 'vbscript:1']) assert.equal(safeHref(bad), '', bad);
  assert.match(inlineProblem('<script>x</script>'), /Only/);
  assert.match(inlineProblem('<a href="http://x.com">x</a>'), /Links must/);
  assert.equal(inlineProblem('<b>fine</b> <a href="https://x.com">x</a>'), '');
  assert.equal(htmlToModel('Questions we <em>hear most.</em> <span data-plan-price="saral">Rs 2,999</span> &amp; more', HEADING), 'Questions we <em>hear most.</em> Rs 2,999 & more');
});

test('the FAQ the server renders is the build’s markup, and its JSON-LD lists exactly the questions shown', () => {
  const items = [{ q: 'What is "Nimtto"?', a: 'An invitation maker & more.' }, { q: 'Second?', a: 'Yes.' }];
  assert.equal(R.renderFaq(items, false), faqBlock(items), 'flat list');
  const groups = [['About', items], ['Money', [{ q: 'Price?', a: 'From Rs 2,999.' }]]];
  assert.equal(R.renderFaq(groups.flatMap(([g, list]) => list.map((x) => ({ ...x, group: g }))), true), faqGroups(groups), 'grouped');
  // with links and tags: the HTML keeps the safe subset, the JSON-LD the plain text, question for question
  const rich = [{ q: 'Pay <b>how</b>?', a: 'By <b>Khalti</b>, see <a href="/pricing/">prices</a> <script>x</script>' }, { q: 'Two', a: 'Plain' }];
  const html = R.renderFaq(rich, false);
  assert.ok(!html.includes('<script>x'), 'no script');
  assert.ok(html.includes('<span>Pay &lt;b&gt;how&lt;/b&gt;?</span>'), 'questions are text');
  assert.ok(html.includes('By <b>Khalti</b>, see <a href="/pricing/">prices</a> x'));
  const ld = faqLdOf(html)[0];
  const shown = [...html.matchAll(/<summary class="qa__q"><span>([\s\S]*?)<\/span>/g)].map((m) => inlineText(m[1]));
  assert.deepEqual(ld.mainEntity.map((x) => x.name), shown);
  assert.deepEqual(ld.mainEntity.map((x) => x.acceptedAnswer.text), ['By Khalti, see prices x', 'Plain']);
});

test('a built page reads back its own words, and comes out unchanged when nothing is edited', async () => {
  const site = await readSite();
  for (const [rel, path] of [['faq/index.html', '/faq/'], ['index.html', '/'], ['contact/index.html', '/contact/'], ['international/faq/index.html', '/international/faq/'], ['international/index.html', '/international/'], ['terms/index.html', '/terms/']]) {
    const html = built(rel);
    const p = pageOf(html, path);
    assert.ok(p.id && p.title && p.desc, `${rel}: read`);
    assert.equal(R.applyContent(html, C.viewFor(p, emptyDoc(), site)), html, `${rel}: unchanged`);
  }
  const faq = pageOf(built('faq/index.html'), '/faq/');
  assert.equal(faq.site, 'np');
  assert.ok(faq.faqGrouped && faq.faq.length >= 10 && faq.faq[0].group, 'the FAQ page: grouped questions');
  assert.match(faq.h1, /<em>/);
  assert.equal(pageOf(built('international/faq/index.html'), '/international/faq/').site, 'intl');
  assert.equal(pageOf(built('terms/index.html'), '/terms/').site, 'both');
});

test('every page of the built site (dist/) comes out unchanged with nothing edited', { skip: !existsSync(resolve(ROOT, 'dist', 'faq', 'index.html')) && 'no build' }, async () => {
  const site = await readSite();
  let n = 0;
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const f = join(dir, name);
      if (statSync(f).isDirectory()) { if (!['assets', 'themes', 'photos', 'art', 'audio', 'site'].includes(name)) walk(f); continue; }
      if (name !== 'index.html') continue;
      const html = readFileSync(f, 'utf8');
      const p = R.readPage(html);
      if (!p) continue;
      n += 1;
      assert.equal(R.applyContent(html, C.viewFor({ ...p, path: '/x/' }, emptyDoc(), site)), html, f);
    }
  };
  walk(resolve(ROOT, 'dist'));
  assert.ok(n > 60, `${n} pages`);
});

test('overrides: title, description, heading, intro and FAQ, escaped; JSON-LD in step', async () => {
  const site = await readSite();
  const html = built('faq/index.html');
  const p = pageOf(html, '/faq/');
  const doc = emptyDoc();
  const faq = [{ q: 'New <question>?', a: 'Answer with <a href="https://nimtto.com/">a link</a> & <b>bold</b>', group: 'Group A' }, { q: 'Another', a: 'Two', group: 'Group A' }, { q: 'Third', a: 'Three', group: 'Group B' }];
  doc.pages['/faq/'] = { title: 'FAQ "Nimtto" <Test>', desc: 'A new & better description', h1: 'Hello <em>there</em><script>alert(1)</script>', lede: 'Intro <b>bold</b> <a href="javascript:x">bad</a>', faq };
  const out = R.applyContent(html, C.viewFor(p, doc, site));
  assert.ok(out.includes('<title>FAQ &quot;Nimtto&quot; &lt;Test&gt;</title>'));
  assert.ok(out.includes('<meta name="description" content="A new &amp; better description" />'));
  assert.ok(out.includes('<meta property="og:title" content="FAQ &quot;Nimtto&quot; &lt;Test&gt;" />'));
  assert.ok(out.includes('<meta name="twitter:description" content="A new &amp; better description" />'));
  const wp = ldOf(out, 'WebPage');
  assert.equal(wp.name, 'FAQ "Nimtto" <Test>');
  assert.equal(wp.description, 'A new & better description');
  assert.match(out, /data-cms="h1">Hello <em>there<\/em>alert\(1\)<\/h1>/);
  assert.match(out, /data-cms="lede"[^>]*>Intro <b>bold<\/b> bad<\/p>/);
  assert.ok(!/<script>alert/.test(out));
  const ld = faqLdOf(out);
  assert.equal(ld.length, 1, 'one FAQPage');
  assert.deepEqual(ld[0].mainEntity.map((x) => x.name), faq.map((x) => x.q));
  assert.equal(ld[0].mainEntity[0].acceptedAnswer.text, 'Answer with a link & bold');
  assert.equal([...out.matchAll(/class="h3 faq__gh"/g)].length, 2, 'two groups');
  assert.ok(out.includes('<span>New &lt;question&gt;?</span>'));
});

test('site settings: contact lines, hours, footer, social (sameAs), trust lines, announcement dates, home headline', async () => {
  const site = structuredClone(await readSite());
  site.contact = { phone: '+977 981-1111111', whatsapp: '+9779811111111', email: 'hello@nimtto.com', address: 'Lalitpur, Nepal' };
  site.hero = { title: 'Our <new> headline', subtitle: 'A line under it' };
  const doc = emptyDoc();
  doc.sites.np = { ...doc.sites.np, hours: 'Sun to Fri, 10 to 6', social: { instagram: 'https://instagram.com/nimtto' }, footer: { blurb: 'Words <b>here</b>', payLine: 'Pay by QR' }, trust: { line: 'Real designers', policy: 'See <a href="/refunds/">refunds</a>' }, announce: { on: true, text: 'Dashain offer', link: '/pricing/', linkText: 'See prices', from: '2026-10-01', to: '2026-10-31' } };
  const home = built('index.html');
  const p = pageOf(home, '/');
  const out = R.applyContent(home, C.viewFor(p, doc, site, '2026-10-18'));
  assert.ok(out.includes('href="https://wa.me/9779811111111"'));
  assert.ok(out.includes('<span data-contact="wa-text">+977 981-1111111</span>'));
  assert.ok(out.includes('href="mailto:hello@nimtto.com"'));
  assert.match(out, /<div class="announce" role="region" aria-label="Announcement">.*Dashain offer.*href="\/pricing\/">See prices<\/a>/);
  assert.ok(out.includes('<a href="https://instagram.com/nimtto" target="_blank" rel="me noopener">Instagram</a>'));
  assert.ok(out.includes('<p class="foot__addr">Lalitpur, Nepal · Sun to Fri, 10 to 6</p>'));
  assert.ok(out.includes('data-cms="foot-blurb">Words <b>here</b></p>'));
  assert.ok(out.includes('data-cms="foot-pay">Pay by QR</p>'));
  assert.ok(out.includes('<p class="foot__policy">See <a href="/refunds/">refunds</a></p>'));
  assert.match(out, /data-cms="h1">Our &lt;new&gt; headline<\/h1>/, 'the Website headline renders on the home page');
  assert.match(out, /data-cms="lede"[^>]*>A line under it<\/p>/);
  const org = ldOf(out, 'Organization')['@graph'][0];
  assert.equal(org.email, 'hello@nimtto.com');
  assert.equal(org.telephone, '+977-981-1111111');
  assert.deepEqual(org.sameAs, ['https://instagram.com/nimtto']);
  assert.equal(org.contactPoint.email, 'hello@nimtto.com');
  assert.equal(org.address.streetAddress, 'Lalitpur, Nepal');
  // outside the dates: no bar
  assert.ok(!R.applyContent(home, C.viewFor(p, doc, site, '2026-11-01')).includes('class="announce"'));
  assert.ok(!R.applyContent(home, C.viewFor(p, doc, site, '2026-09-30')).includes('class="announce"'));
  // the international site falls back to Nepal's contact lines, and keeps its own announcement (none)
  const ih = built('international/index.html');
  const iout = R.applyContent(ih, C.viewFor(pageOf(ih, '/international/'), doc, site, '2026-10-18'));
  assert.ok(iout.includes('href="mailto:hello@nimtto.com"'));
  assert.ok(!iout.includes('class="announce"'));
  // the contact page's hours
  const ch = built('contact/index.html');
  assert.ok(R.applyContent(ch, C.viewFor(pageOf(ch, '/contact/'), doc, site)).includes('data-cms="hours">Sun to Fri, 10 to 6</span>'));
});

test('validation: built words are not stored, limits and markup are checked', () => {
  const p = pageOf(built('faq/index.html'), '/faq/');
  assert.deepEqual(C.cleanPage({ title: p.title, desc: '', h1: p.h1, lede: null, faq: null }, p), {}, 'same as built = default');
  assert.deepEqual(C.cleanPage({ title: '  New   title  ' }, p), { title: 'New title' });
  assert.deepEqual(C.cleanPage({ faq: p.faq }, p), {}, 'the built questions are not an override');
  const bad = (body, re) => assert.throws(() => C.cleanPage(body, p), (e) => e.status === 400 && e.errors.some((x) => re.test(`${x.path} ${x.message}`)));
  bad({ title: 'x'.repeat(71) }, /title must be at most 70/);
  assert.deepEqual(C.cleanPage({ title: 'Plain <text> stays text' }, p), { title: 'Plain <text> stays text' }, 'plain fields are escaped, not parsed');
  bad({ h1: 'Hi <b>x</b>' }, /h1 Only <em>/);
  bad({ lede: '<a href="http://x.com">x</a>' }, /lede Links/);
  bad({ faq: [] }, /faq/);
  bad({ faq: [{ q: '', a: 'x' }] }, /faq\[0\]\.q/);
  bad({ faq: Array.from({ length: 31 }, () => ({ q: 'q', a: 'a' })) }, /faq/);
  const s = C.cleanSite({ hours: 'x', social: { instagram: 'https://instagram.com/n', facebook: '' }, announce: { on: true, text: 'Hi', link: '/pricing/', from: '2026-10-01', to: '2026-10-05' } });
  assert.deepEqual(s.social, { instagram: 'https://instagram.com/n' });
  const sbad = (body, re) => assert.throws(() => C.cleanSite(body), (e) => e.status === 400 && e.errors.some((x) => re.test(`${x.path} ${x.message}`)));
  sbad({ social: { x: 'http://x.com/n' } }, /social\.x/);
  sbad({ social: { x: 'javascript:alert(1)' } }, /social\.x/);
  sbad({ announce: { on: true, text: '' } }, /announce\.text/);
  sbad({ announce: { link: 'javascript:alert(1)' } }, /announce\.link/);
  sbad({ announce: { from: '2026-10-05', to: '2026-10-01' } }, /announce\.to/);
  sbad({ announce: { from: '5 Oct' } }, /announce\.from/);
  sbad({ footer: { blurb: '<img src=x>' } }, /footer\.blurb/);
});
