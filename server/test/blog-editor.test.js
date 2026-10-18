// The Blog editor's data path: the visual editor (src/studio/blog-editor.js) opens a post from the HTML the server
// renders and saves Markdown (src/studio/blog-md-out.js), so every post must survive HTML -> editor -> Markdown with the
// same page. Also: what the serializer writes is still sanitised by the server, and the schema the page publishes.
// The round trip parses with the editor's own schema (TipTap's generateJSON on happy-dom, root devDependencies); it is
// skipped when the root packages are not installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../lib/blog-md.js';
import { cleanPost, loadSeeds } from '../lib/blog.js';
import { postSchema, schemaChecks, compilePost } from '../lib/blog-render.js';
import { toMarkdown } from '../../src/studio/blog-md-out.js';

const t = (text, marks) => ({ type: 'text', text, ...(marks ? { marks: marks.map((m) => (typeof m === 'string' ? { type: m } : m)) } : {}) });
const p = (...content) => ({ type: 'paragraph', content });
const doc = (...content) => ({ type: 'doc', content });
const norm = (html) => html.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();

let parse = null;
try {
  const [{ generateJSON }, { bodyExtensions }] = await Promise.all([import('@tiptap/html'), import('../../src/studio/blog-editor.js')]);
  const ext = bodyExtensions();
  parse = (html) => generateJSON(html, ext);
} catch (err) {
  parse = null;
  console.warn(`[blog-editor test] round trip skipped: ${err.message}`);
}

test('the serializer writes Markdown the server renders into the house blocks', () => {
  const md = toMarkdown(doc(
    { type: 'heading', attrs: { level: 2 }, content: [t('Wording in Nepali')] },
    p(t('Plain, '), t('bold', ['bold']), t(' and '), t('italic', ['italic']), t(' with a '), t('link', [{ type: 'link', attrs: { href: '/pricing/' } }]), t('.')),
    p(t('विवाह निम्तो in Nepali')),
    { type: 'callout', attrs: { kind: 'TIP' }, content: [p(t('Send it a month ahead.'))] },
    { type: 'copyBlock', attrs: { title: 'Invitation wording' }, content: [t('शुभ विवाह\nYou are invited.')] },
    { type: 'heading', attrs: { level: 3 }, content: [t('A table')] },
    { type: 'table', content: [
      { type: 'tableRow', content: [{ type: 'tableHeader', content: [p(t('Who'))] }, { type: 'tableHeader', content: [p(t('When'))] }] },
      { type: 'tableRow', content: [{ type: 'tableCell', content: [p(t('Parents | elders', ['bold']))] }, { type: 'tableCell', content: [p(t('6 weeks'))] }] },
    ] },
    { type: 'figure', attrs: { src: '/site/stills/kham-800.webp', alt: 'The Kham design [on a phone]', caption: 'Kham: a "sealed" envelope' } },
    { type: 'figure', attrs: { src: '/uploads/_site/blog/AAAAAAAAAAAAAAAAAAAAAAAA-1600.webp', alt: 'A photo', caption: '' } },
    { type: 'bulletList', content: [{ type: 'listItem', content: [p(t('One')), { type: 'orderedList', attrs: { start: 3 }, content: [{ type: 'listItem', content: [p(t('Three'))] }] }] }, { type: 'listItem', content: [p(t('Two'))] }] },
    { type: 'horizontalRule' },
  ));
  const r = renderMarkdown(md);
  assert.deepEqual(r.toc.map((x) => [x.level, x.id]), [[2, 'wording-in-nepali'], [3, 'a-table']]);
  assert.match(r.html, /<p>Plain, <strong>bold<\/strong> and <em>italic<\/em> with a <a href="\/pricing\/">link<\/a>\.<\/p>/);
  assert.match(r.html, /<span lang="ne">विवाह निम्तो<\/span> in Nepali/);
  assert.match(r.html, /<aside class="callout callout--tip" role="note"><p class="callout__label">Tip<\/p>\s*<p>Send it a month ahead\.<\/p>/);
  assert.match(r.html, /<figure class="copy"><figcaption class="copy__t">Invitation wording<\/figcaption><pre class="copy__text" lang="ne">शुभ विवाह\nYou are invited\.<\/pre><\/figure>/);
  assert.match(r.html, /<div class="tbl" role="region" aria-label="Table" tabindex="0"><table>\s*<thead>\s*<tr>\s*<th>Who<\/th>/);
  assert.match(r.html, /<td><strong>Parents \| elders<\/strong><\/td>/);
  assert.match(r.html, /<figure class="fig fig--phone"><span class="phone"><img src="\/site\/stills\/kham-800\.webp"[^>]*alt="The Kham design \[on a phone\]"[^>]*><\/span><figcaption>Kham: a (?:&quot;|")sealed(?:&quot;|") envelope<\/figcaption><\/figure>/);
  assert.match(r.html, /<figure class="fig"><img src="\/uploads\/_site\/blog\/A{24}-1600\.webp" alt="A photo"/);
  assert.match(r.html, /<ul>\s*<li>\s*(?:<p>)?One(?:<\/p>)?\s*<ol start="3">\s*<li>\s*(?:<p>)?Three(?:<\/p>)?\s*<\/li>\s*<\/ol>\s*<\/li>\s*<li>\s*(?:<p>)?Two/);
  assert.match(r.html, /<hr ?\/?>/);
});

test('typed punctuation stays text: no accidental Markdown, no HTML, unsafe links dropped by the server', () => {
  const md = toMarkdown(doc(
    p(t('**not bold** and _not italic_ and [!TIP] and <script>alert(1)</script> & &amp;')),
    p(t('# not a heading')), p(t('1. not a list')), p(t('- not a bullet')), p(t('> not a quote')), p(t('---')),
    p(t('snake_case_name and 2*3*4')),
    p(t('bad', [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }])),
  ));
  const { html } = renderMarkdown(md);
  assert.ok(!/<strong>|<em>|<h[1-6]|<ol|<ul|<blockquote|<hr|<aside|<script/.test(html), html);
  assert.match(html, /\*\*not bold\*\* and _not italic_ and \[!TIP\] and &lt;script&gt;alert\(1\)&lt;\/script&gt; &amp; &amp;amp;/);
  assert.match(html, /<p># not a heading<\/p>/);
  assert.match(html, /<p>1\. not a list<\/p>/);
  assert.match(html, /<p>snake_case_name and 2\*3\*4<\/p>/);
  assert.ok(!/javascript:/i.test(html) && !/<a /.test(html), 'javascript: link removed');
  assert.match(html, /<p>bad<\/p>/);
});

test('every built-in post survives the editor: HTML -> editor -> Markdown renders the same page', { skip: !parse && 'root packages not installed' }, () => {
  const seeds = loadSeeds();
  assert.ok(seeds.length >= 10);
  for (const { post } of seeds) {
    const first = renderMarkdown(post.body);
    const md = toMarkdown(parse(first.html));
    const again = renderMarkdown(md);
    assert.equal(norm(again.html), norm(first.html), `${post.site}/${post.slug}`);
    assert.deepEqual(again.toc, first.toc, `${post.site}/${post.slug}: toc`);
    // and a second pass changes nothing (stable)
    assert.equal(toMarkdown(parse(again.html)), md, `${post.site}/${post.slug}: stable`);
  }
});

test('the editor keeps callouts of every kind, copy blocks, aligned tables and captioned images', { skip: !parse && 'root packages not installed' }, () => {
  const src = [
    '## Steps', '', '> [!WARNING]', '> Check the date.', '>', '> - one', '> - two', '',
    '> [!IMPORTANT]', '> **Bold** inside.', '',
    '```copy Wording (Nepali)', 'हजुरलाई सादर निम्तो', '  indented line', '```', '',
    '| Item | Cost |', '| :--- | ---: |', '| Card | NPR 500 |', '| Pipe \\| here | `code` |', '',
    '![A card on a phone](/site/stills/mahal-800.webp "The Mahal design")', '',
    'Line one\\', 'line two', '',
    '1. First', '2. Second', '',
  ].join('\n');
  const first = renderMarkdown(src);
  const md = toMarkdown(parse(first.html));
  assert.equal(norm(renderMarkdown(md).html), norm(first.html));
  assert.match(md, /> \[!WARNING\]/);
  assert.match(md, /```copy Wording \(Nepali\)\nहजुरलाई सादर निम्तो\n {2}indented line\n```/);
  assert.match(md, /\| :--- \| ---: \|/);
  assert.match(md, /!\[A card on a phone\]\(\/site\/stills\/mahal-800\.webp "The Mahal design"\)/);
});

test('pasted remote pictures and scripts never reach the stored text', { skip: !parse && 'root packages not installed' }, () => {
  const json = parse('<p>Hi</p><img src="https://evil.example/x.png"><img src="data:image/png;base64,AAAA"><script>alert(1)</script><p onclick="x()">there</p>');
  const md = toMarkdown(json);
  assert.ok(!/evil|data:|script|onclick/.test(md), md);
  assert.match(md, /Hi/);
});

test('schema: BlogPosting by default, Article or a HowTo guide on request, speakable optional, checks list', () => {
  const base = { site: 'np', title: 'Pasni Invitation Guide', slug: 'pasni-guide', category: 'Ceremonies', status: 'published', excerpt: 'How to word a pasni invitation.', keyword: 'pasni invitation', secondary: ['rice feeding'],
    body: '## Pick a date\n\nText.\n\n## Write the wording\n\nText.\n', faq: [{ q: 'When?', a: 'Two weeks ahead.' }], cover: { type: 'design', design: 'kham' } };
  const a = cleanPost(base);
  assert.equal(a.schemaType, 'BlogPosting');
  assert.equal(a.speakable, true);
  let s = postSchema(a, compilePost(a));
  const art = s.ld.find((x) => x['@type'] === 'BlogPosting');
  for (const k of ['headline', 'image', 'author', 'publisher', 'datePublished', 'dateModified', 'keywords', 'articleSection', 'wordCount', 'speakable']) assert.ok(art[k], k);
  assert.equal(art.keywords, 'pasni invitation, rice feeding');
  assert.ok(s.ld.some((x) => x['@type'] === 'BreadcrumbList'));
  assert.ok(s.ld.some((x) => x['@type'] === 'FAQPage'));
  assert.ok(schemaChecks(s.ld).every((c) => c.ok), JSON.stringify(schemaChecks(s.ld)));
  assert.equal(s.title, 'Pasni Invitation Guide | Nimtto');
  assert.equal(s.url, 'https://nimtto.com/blog/pasni-guide/');

  const b = cleanPost({ ...base, schemaType: 'HowTo', speakable: false, faq: [] });
  s = postSchema(b, compilePost(b));
  assert.ok(!s.ld.find((x) => x['@type'] === 'BlogPosting').speakable);
  assert.ok(!s.ld.some((x) => x['@type'] === 'FAQPage'));
  const how = s.ld.find((x) => x['@type'] === 'HowTo');
  assert.deepEqual(how.step.map((x) => [x.position, x.name, x.url]), [[1, 'Pick a date', 'https://nimtto.com/blog/pasni-guide/#pick-a-date'], [2, 'Write the wording', 'https://nimtto.com/blog/pasni-guide/#write-the-wording']]);

  assert.equal(postSchema(cleanPost({ ...base, schemaType: 'Article' })).ld[0]['@type'], 'Article');
  assert.equal(cleanPost({ ...base, schemaType: '<script>' }).schemaType, 'BlogPosting');
  const missing = schemaChecks(postSchema(cleanPost({ ...base, keyword: '' })).ld);
  assert.ok(missing.some((c) => !c.ok && /Keywords/.test(c.text)));
});
