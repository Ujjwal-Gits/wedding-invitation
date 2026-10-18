// The Blog module (super admin, or an admin with the 'content' permission, like the Content page): every post of both websites, and an editor
// with a live preview of the real page. Server: server/lib/blog.js (/api/admin/blog); public pages are rendered there.
//   #/blog          the list (filter by website), New post
//   #/blog/new      a new post        #/blog/<id>   edit one
// The preview is the page exactly as the server renders it, in a sandboxed frame with no scripts; edits update it in
// place (the reading position stays) and it follows the section you are typing in.
import './admin-blog.css';
import { h, icon, iconBtn, toast, confirmDialog, fill, debounce } from './dom.js';
import { api, postFormProgress } from './api.js';

const SITE_NAME = { np: 'Nepal', intl: 'International' };
const BLANK = (site = 'np') => ({
  site, title: '', slug: '', category: '', excerpt: '', body: '## First section\n\nWrite here.\n', faq: [],
  cover: { type: 'design', design: site === 'intl' ? 'olive-grove' : 'kham', alt: '', caption: '' }, og: null,
  seoTitle: '', seoDesc: '', keyword: '', secondary: [], designs: [], related: [], status: 'draft', publishedAt: new Date().toISOString().slice(0, 10),
});
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');

export function blogAdmin(ctx) {
  const root = h('div.blogx', h('p.muted', 'Loading the blog…'));
  let meta = null; // { posts, categories, designs }
  api('/admin/blog').then((r) => {
    meta = r;
    if (ctx.sub) editor(ctx.sub === 'new' ? null : ctx.sub);
    else list();
  }).catch((err) => fill(root, h('p.notice.notice--error', err.message)));

  /* ---------------- the list ---------------- */
  function list() {
    let site = ctx.params?.get?.('site') || '';
    ctx.shell.setPage({ title: 'Blog', sub: 'Guides on both websites. Published posts are on the site at once, in the sitemap and the RSS feeds.', actions: [
      h('a.btn', { href: '/blog/', target: '_blank', rel: 'noopener' }, icon('external', 15), 'Nepal blog'),
      h('a.btn', { href: '/international/blog/', target: '_blank', rel: 'noopener' }, icon('external', 15), 'International blog'),
      h('a.btn.btn--primary', { href: '#/blog/new' }, icon('plus', 16), 'New post')] });
    const body = h('div');
    const seg = h('div.seg', { role: 'group', 'aria-label': 'Website' });
    const drawSeg = () => fill(seg, ['', 'np', 'intl'].map((k) => h('button.seg__btn', { type: 'button', 'aria-pressed': String(site === k), onclick: () => { site = k; drawSeg(); draw(); } },
      k ? SITE_NAME[k] : 'All', h('span.seg__n', String(meta.posts.filter((p) => !k || p.site === k).length)))));
    const status = (p) => (p.status !== 'published' ? h('span.pill.pill--muted', 'Draft') : p.publishedAt > today() ? h('span.pill.pill--warn', `Scheduled ${fmt(p.publishedAt)}`) : h('span.pill.pill--ok', 'Published'));
    function draw() {
      const rows = meta.posts.filter((p) => !site || p.site === site);
      if (!rows.length) { fill(body, h('div.qempty', h('span.qempty__icon', icon('edit', 18)), h('div', h('p.qempty__title', 'No posts yet'), h('p.qempty__text', 'Write the first guide for this website.')))); return; }
      fill(body, h('div.card.card--flush', h('table.dtable.blogx__table',
        h('thead', h('tr', h('th', 'Post'), h('th', 'Website'), h('th', 'Category'), h('th', 'Status'), h('th', 'Updated'), h('th.num', 'Words'), h('th', h('span.vh', 'Actions')))),
        h('tbody', rows.map((p) => h('tr',
          h('td', { 'data-label': 'Post' }, h('a.blogx__title', { href: `#/blog/${p.id}` }, p.title), h('span.blogx__path', p.path)),
          h('td', { 'data-label': 'Website' }, SITE_NAME[p.site]),
          h('td', { 'data-label': 'Category' }, p.category),
          h('td', { 'data-label': 'Status' }, status(p)),
          h('td', { 'data-label': 'Updated' }, fmt(p.updatedAt)),
          h('td.num', { 'data-label': 'Words' }, String(p.words)),
          h('td.blogx__acts',
            iconBtn('edit', `Edit ${p.title}`, () => ctx.go(`#/blog/${p.id}`), 'btn--ghost'),
            p.status === 'published' && p.publishedAt <= today() ? h('a.btn.btn--ghost.btn--icon', { href: p.path, target: '_blank', rel: 'noopener', 'aria-label': `Open ${p.title} on the website`, title: 'Open on the website' }, icon('external', 16)) : null,
            iconBtn('trash', `Delete ${p.title}`, async () => {
              if (!(await confirmDialog({ title: 'Delete this post?', message: `“${p.title}” leaves the website now. This cannot be undone.`, confirm: 'Delete', danger: true }))) return;
              try { await api(`/admin/blog/${p.id}`, { method: 'DELETE' }); meta.posts = meta.posts.filter((x) => x.id !== p.id); drawSeg(); draw(); toast('Post deleted', 'success'); } catch (err) { toast(err.message, 'error'); }
            }, 'btn--ghost'))))))));
    }
    drawSeg();
    draw();
    fill(root, h('div.stack', h('div.toolbar2', seg), body));
  }

  /* ---------------- the editor ---------------- */
  async function editor(id) {
    let post;
    let stamp;
    try {
      if (id) { const r = await api(`/admin/blog/${id}`); post = r.post; stamp = r.stamp; } else post = BLANK(ctx.params?.get?.('site') === 'intl' ? 'intl' : 'np');
    } catch (err) { fill(root, h('p.notice.notice--error', err.status === 404 ? 'This post was not found. It may have been deleted.' : err.message)); return; }
    post = structuredClone(post);
    let slugTouched = Boolean(id);
    let dirty = false;
    let saving = false;
    const beforeUnload = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', beforeUnload);
    ctx.cleanup(() => { window.removeEventListener('beforeunload', beforeUnload); if (dirty) toast('Your blog changes were not saved.', 'error'); });

    const saveBtn = h('button.btn.btn--primary', { type: 'button', onclick: () => save() }, icon('check', 16), 'Save');
    const viewLink = h('a.btn', { target: '_blank', rel: 'noopener' }, icon('external', 15), 'View');
    const pageActions = () => {
      viewLink.hidden = !(id && post.status === 'published');
      viewLink.href = `${meta.sites[post.site].base}${post.slug}/`;
      ctx.shell.setPage({ kicker: `Blog · ${SITE_NAME[post.site]}`, title: post.title || 'New post', sub: '', actions: [h('a.btn', { href: '#/blog' }, icon('back', 15), 'All posts'), viewLink, saveBtn] });
    };
    const touch = (follow) => { dirty = true; schedulePreview(follow); };

    // ── fields ──
    const err = {};
    const fieldBox = (key, label, control, hint) => {
      err[key] = h('p.field__err.blogx__err', { hidden: true, role: 'alert' });
      return h('div.field', h('label.label', { for: control.id }, label), control, hint ? h('p.hint', hint) : null, err[key]);
    };
    const counter = (input, max) => {
      const c = h('span.blogx__count');
      const upd = () => { const n = input.value.length; c.textContent = `${n} / ${max}`; c.classList.toggle('is-over', n > max); };
      input.addEventListener('input', upd);
      upd();
      return c;
    };
    const inp = (key, attrs = {}) => h('input.input', { id: `bx-${key}`, value: post[key] || '', autocomplete: 'off', ...attrs });
    const title = inp('title', { maxlength: 140 });
    const slug = inp('slug', { maxlength: 80, spellcheck: 'false' });
    const slugPre = h('span.blogx__pre');
    const excerpt = h('textarea.input', { id: 'bx-excerpt', rows: 3, maxlength: 300 }, post.excerpt || '');
    const seoTitle = inp('seoTitle', { maxlength: 80, placeholder: 'Defaults to the title + “ | Nimtto”' });
    const seoDesc = h('textarea.input', { id: 'bx-seoDesc', rows: 3, maxlength: 200, placeholder: 'Defaults to the standfirst' }, post.seoDesc || '');
    const keyword = inp('keyword', { maxlength: 100 });
    const secondary = h('input.input', { id: 'bx-secondary', value: (post.secondary || []).join(', '), autocomplete: 'off' });
    const body = h('textarea.input.blogx__md', { id: 'bx-body', rows: 28, spellcheck: 'true' }, post.body || '');
    const date = h('input.input', { id: 'bx-date', type: 'date', value: post.publishedAt || today() });
    const category = h('select.input', { id: 'bx-category' });
    const drawCategories = () => {
      const opts = [...new Set([...(meta.categories[post.site] || []), post.category].filter(Boolean))];
      fill(category, h('option', { value: '' }, 'Choose…'), opts.map((c) => h('option', { value: c, selected: c === post.category }, c)));
    };
    const sitePick = h('div.seg', { role: 'group', 'aria-label': 'Website' });
    const statusPick = h('div.seg', { role: 'group', 'aria-label': 'Status' });
    const segOf = (box, items, cur, on) => fill(box, items.map(([v, t]) => h('button.seg__btn', { type: 'button', 'aria-pressed': String(cur === v), onclick: () => on(v) }, t)));
    const drawSite = () => segOf(sitePick, [['np', 'Nepal'], ['intl', 'International']], post.site, (v) => {
      if (v === post.site) return;
      post.site = v;
      post.designs = [];
      post.related = [];
      if (post.cover.type === 'design') post.cover.design = v === 'intl' ? 'olive-grove' : 'kham';
      drawSite(); drawCategories(); drawSlugPre(); drawCover(); drawDesigns(); drawRelated(); pageActions(); touch('top');
    });
    const drawStatus = () => segOf(statusPick, [['draft', 'Draft'], ['published', 'Published']], post.status, (v) => { post.status = v; drawStatus(); pageActions(); touch(); });
    const drawSlugPre = () => { slugPre.textContent = `nimtto.com${meta.sites[post.site].base}`; };

    title.addEventListener('input', () => { post.title = title.value; if (!slugTouched) { slug.value = slugify(title.value); post.slug = slug.value; } pageActions(); touch('top'); });
    slug.addEventListener('input', () => { slugTouched = true; post.slug = slug.value.toLowerCase(); touch(); });
    excerpt.addEventListener('input', () => { post.excerpt = excerpt.value; touch('top'); });
    category.addEventListener('change', () => { post.category = category.value; touch('top'); });
    seoTitle.addEventListener('input', () => { post.seoTitle = seoTitle.value; touch(); });
    seoDesc.addEventListener('input', () => { post.seoDesc = seoDesc.value; touch(); });
    keyword.addEventListener('input', () => { post.keyword = keyword.value; touch(); });
    secondary.addEventListener('input', () => { post.secondary = secondary.value.split(',').map((s) => s.trim()).filter(Boolean); touch(); });
    date.addEventListener('change', () => { post.publishedAt = date.value; touch('top'); });
    const followBody = () => { post.body = body.value; touch(headingAt(body.value, body.selectionStart)); };
    body.addEventListener('input', followBody);
    body.addEventListener('click', () => scrollPreview(headingAt(body.value, body.selectionStart)));

    // Markdown helpers: insert a block at the cursor
    const insert = (text) => {
      const s = body.selectionStart;
      const e = body.selectionEnd;
      const before = body.value.slice(0, s);
      const pad = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
      body.setRangeText(`${pad}${text}\n`, s, e, 'end');
      body.focus();
      followBody();
    };
    const tools = h('div.blogx__tools', { role: 'toolbar', 'aria-label': 'Insert' },
      [['H2', '## Section heading'], ['H3', '### Smaller heading'], ['Tip', '> [!TIP]\n> Your tip.'], ['Note', '> [!NOTE]\n> Good to know.'],
        ['Copy block', '```copy Title of the wording\nThe wording, exactly as guests should read it.\n```'],
        ['Table', '| Column | Column |\n| --- | --- |\n| Text | Text |'], ['Link', '[words](/pricing/)'], ['Image', '![What the picture shows](/site/stills/kham-800.webp "Caption")']]
        .map(([t, snip]) => h('button.btn.btn--sm', { type: 'button', onclick: () => insert(snip) }, t)));

    // the cover
    const coverBox = h('div.blogx__cover');
    const coverAlt = h('input.input', { id: 'bx-cover-alt', maxlength: 200, value: post.cover?.alt || '', placeholder: 'What the picture shows' });
    const coverCap = h('input.input', { id: 'bx-cover-cap', maxlength: 240, value: post.cover?.caption || '', placeholder: 'Optional, shown under it' });
    coverAlt.addEventListener('input', () => { post.cover.alt = coverAlt.value; touch('top'); });
    coverCap.addEventListener('input', () => { post.cover.caption = coverCap.value; touch('top'); });
    const fileIn = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/avif', hidden: true });
    fileIn.onchange = async () => {
      const f = fileIn.files[0];
      fileIn.value = '';
      if (!f) return;
      if (f.size > 15 * 1024 * 1024) { toast('That photo is larger than 15 MB.', 'error'); return; }
      const fd = new FormData();
      fd.append('file', f);
      const bar = h('span.blogx__up', 'Uploading… 0%');
      coverBox.append(bar);
      try {
        const out = await postFormProgress('/admin/blog/cover', fd, (p) => { bar.textContent = `Uploading… ${Math.round(p * 100)}%`; });
        post.cover = { ...post.cover, type: 'photo', src: out.src };
        post.og = out.og;
        drawCover();
        touch('top');
        toast('Cover photo ready', 'success');
      } catch (e2) { toast(e2.message, 'error'); bar.remove(); }
    };
    const designOpts = () => meta.designs[post.site] || [];
    function drawCover() {
      const c = post.cover || (post.cover = { type: 'design' });
      const types = [['photo', 'A landscape photo'], ...(c.type === 'image' ? [['image', 'Feature image (built in)']] : []), ['design', 'A design'], ...(c.type === 'mock' ? [['mock', 'Sample card']] : [])];
      const seg = h('div.seg.seg--sm', { role: 'group', 'aria-label': 'Cover' });
      segOf(seg, types, c.type, (v) => {
        if (v === 'photo' && !c.src) { fileIn.click(); return; }
        c.type = v;
        if (v === 'design' && !c.design) c.design = designOpts()[0]?.slug;
        if (v !== 'photo' && /^\/uploads\//.test(post.og || '')) post.og = null;
        drawCover(); touch('top');
      });
      let pick = null;
      if (c.type === 'design') {
        pick = h('select.input', { id: 'bx-cover-design', 'aria-label': 'Design', onchange: (e) => { c.design = e.target.value; touch('top'); } },
          designOpts().map((d) => h('option', { value: d.slug, selected: d.slug === c.design }, d.name)));
      } else if (c.type === 'photo') {
        pick = h('div.row', c.src ? h('img.blogx__thumb', { src: c.src.replace(/-1600\.webp$/, '-800.webp'), alt: '' }) : null,
          h('button.btn.btn--sm', { type: 'button', onclick: () => fileIn.click() }, icon('upload', 15), c.src ? 'Replace photo' : 'Upload photo'));
      } else if (c.type === 'image') {
        pick = h('div.row', h('img.blogx__thumb', { src: `${c.src}-800.webp`, alt: '' }), h('p.hint', 'The built-in feature picture. Upload a photo to use your own.'));
      } else pick = h('p.hint', 'A sample invitation card (built in). Choose a design or upload a photo to change it.');
      fill(coverBox, seg, pick, fileIn);
    }

    // FAQ
    const faqBox = h('div.blogx__faq');
    function drawFaq() {
      fill(faqBox, post.faq.map((f, i) => {
        const q = h('input.input', { value: f.q, maxlength: 240, 'aria-label': `Question ${i + 1}`, placeholder: 'Question' });
        const a = h('textarea.input', { rows: 3, maxlength: 1500, 'aria-label': `Answer ${i + 1}`, placeholder: 'Answer (plain words; [links](/pricing/) are fine)' }, f.a);
        q.addEventListener('input', () => { f.q = q.value; touch('faq'); });
        a.addEventListener('input', () => { f.a = a.value; touch('faq'); });
        return h('div.blogx__qa', h('div.blogx__qa-h', h('span.label', `Question ${i + 1}`),
          iconBtn('up', 'Move up', () => { if (i) { [post.faq[i - 1], post.faq[i]] = [post.faq[i], post.faq[i - 1]]; drawFaq(); touch('faq'); } }, 'btn--ghost'),
          iconBtn('trash', 'Remove this question', () => { post.faq.splice(i, 1); drawFaq(); touch('faq'); }, 'btn--ghost')), q, a);
      }), post.faq.length < 12 ? h('button.btn.btn--sm', { type: 'button', onclick: () => { post.faq.push({ q: '', a: '' }); drawFaq(); faqBox.querySelector('.blogx__qa:last-of-type input')?.focus(); } }, icon('plus', 15), 'Add a question') : null);
    }

    // related designs and posts: checkboxes
    const designsBox = h('div.blogx__checks');
    function drawDesigns() {
      fill(designsBox, designOpts().map((d) => h('label.blogx__check', h('input', { type: 'checkbox', checked: post.designs.includes(d.slug), onchange: (e) => {
        if (e.target.checked) { if (post.designs.length >= 4) { e.target.checked = false; toast('Up to 4 designs.', 'error'); return; } post.designs.push(d.slug); } else post.designs = post.designs.filter((s) => s !== d.slug);
        touch();
      } }), d.name)));
    }
    const relatedBox = h('div.blogx__checks');
    function drawRelated() {
      const others = meta.posts.filter((p) => p.site === post.site && p.id !== id);
      fill(relatedBox, others.length ? others.map((p) => h('label.blogx__check', h('input', { type: 'checkbox', checked: post.related.includes(p.slug), onchange: (e) => {
        if (e.target.checked) post.related.push(p.slug); else post.related = post.related.filter((s) => s !== p.slug);
        touch();
      } }), p.title)) : h('p.hint', 'No other posts on this website yet.'));
    }

    // ── the preview ──
    const frame = h('iframe.blogx__frame', { title: 'Preview of the page', sandbox: 'allow-same-origin', referrerpolicy: 'same-origin' });
    const words = h('span.blogx__words');
    const widthSeg = h('div.seg.seg--sm', { role: 'group', 'aria-label': 'Preview width' });
    let wide = true;
    const drawWidth = () => segOf(widthSeg, [[true, 'Desktop'], [false, 'Phone']], wide, (v) => { wide = v; frame.classList.toggle('is-phone', !wide); drawWidth(); });
    const previewPane = h('section.blogx__preview', { 'aria-label': 'Live preview' }, h('div.blogx__pbar', h('span.label', 'Live preview'), words, widthSeg), h('div.blogx__pframe', frame));
    let loaded = false;
    let pending = null;
    let follow = null;
    const preview = debounce(async () => {
      pending?.abort();
      const ac = new AbortController();
      pending = ac;
      try {
        const r = await api('/admin/blog/preview', { method: 'POST', body: { ...post, id }, signal: ac.signal });
        words.textContent = `${r.words} words · ${Math.max(1, Math.round(r.words / 220))} min read`;
        const doc = frame.contentDocument;
        if (!loaded || !doc?.querySelector('main')) {
          loaded = true;
          frame.addEventListener('load', () => scrollPreview(follow), { once: true });
          frame.srcdoc = r.html.replace(/<script[^>]*type="module"[^>]*><\/script>/g, '').replace(/<link[^>]*rel="modulepreload"[^>]*>/g, ''); // the frame runs no scripts
          return;
        }
        const next = new DOMParser().parseFromString(r.html, 'text/html');
        const main = next.querySelector('main');
        if (main) doc.querySelector('main').replaceWith(doc.importNode(main, true));
        scrollPreview(follow);
      } catch (e2) {
        if (e2.name === 'AbortError') return;
        words.textContent = e2.status === 400 ? e2.message : 'Preview not available';
      }
    }, 350);
    function schedulePreview(f) { if (f !== undefined) follow = f; preview(); }
    function scrollPreview(target) {
      const doc = frame.contentDocument;
      if (!doc || !target) return;
      let el = null;
      if (target === 'top') el = doc.querySelector('.bp-head');
      else if (target === 'faq') el = doc.getElementById('faq');
      else el = [...doc.querySelectorAll('.bp-body h2, .bp-body h3, .bp-body h4')].find((x) => x.textContent.trim() === target);
      if (!el) return;
      el.scrollIntoView({ block: 'start' });
      frame.contentWindow?.scrollBy(0, -88); // clear of the page's sticky header
    }

    async function save() {
      if (saving) return;
      Object.values(err).forEach((e) => { e.hidden = true; });
      if (!post.title.trim()) { showErr('title', 'Write a title.'); return; }
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) { showErr('slug', 'Lower-case letters, numbers and hyphens only.'); return; }
      if (!post.category) { showErr('category', 'Choose a category.'); return; }
      saving = true;
      saveBtn.disabled = true;
      try {
        const body2 = { ...post, ...(stamp ? { baseStamp: stamp } : {}) };
        const r = id ? await api(`/admin/blog/${id}`, { method: 'PUT', body: body2 }) : await api('/admin/blog', { method: 'POST', body: body2 });
        post = { ...post, ...r.post };
        stamp = r.stamp;
        dirty = false;
        const known = meta.posts.findIndex((p) => p.id === r.post.id);
        const sum = { ...r.post, path: `${meta.sites[r.post.site].base}${r.post.slug}/`, words: 0 };
        if (known >= 0) meta.posts[known] = { ...meta.posts[known], ...sum }; else meta.posts.unshift(sum);
        toast(post.status === 'published' ? (post.publishedAt > today() ? `Saved. It goes live on ${fmt(post.publishedAt)}.` : 'Published. The page, sitemap and RSS feed are updated.') : 'Draft saved', 'success');
        if (!id) { id = r.post.id; history.replaceState(history.state, '', `/studio/blog/${id}`); }
        pageActions();
      } catch (e2) {
        const fe = e2.body?.errors;
        if (fe) for (const [k, v] of Object.entries(fe)) showErr(k, v);
        toast(e2.message, 'error');
      } finally { saving = false; saveBtn.disabled = false; }
    }
    function showErr(k, msg) {
      const e = err[k];
      if (e) { e.textContent = msg; e.hidden = false; e.parentElement.querySelector('.input')?.focus(); } else toast(msg, 'error');
    }

    drawSite(); drawStatus(); drawCategories(); drawSlugPre(); drawCover(); drawFaq(); drawDesigns(); drawRelated(); drawWidth(); pageActions();
    const sec = (t, ...kids) => h('section.card.blogx__sec', h('h2.blogx__h', t), ...kids);
    const form = h('div.blogx__form',
      sec('Post',
        h('div.field', h('span.label', 'Website'), sitePick),
        fieldBox('title', 'Title (the page’s H1)', title),
        h('div.field', h('label.label', { for: 'bx-slug' }, 'Link name'), h('div.blogx__slug', slugPre, slug), err.slug = h('p.field__err.blogx__err', { hidden: true, role: 'alert' })),
        fieldBox('category', 'Category', category),
        h('div.field', h('label.label', { for: 'bx-excerpt' }, 'Standfirst'), excerpt, h('p.hint', 'One or two plain sentences under the title. Also the card text on the blog page.'), counter(excerpt, 240))),
      sec('Feature picture', h('p.hint', 'A wide landscape photo (at least 1600 px wide) shown under the title and on the blog cards. A design shows only on the cards.'), coverBox, fieldBox('alt', 'Picture description (alt text)', coverAlt), fieldBox('caption', 'Caption', coverCap)),
      sec('Body', h('p.hint', 'Markdown: ## and ### headings make the table of contents. Raw HTML is shown as text.'), tools, fieldBox('body', 'Text', body)),
      sec('Questions people ask', h('p.hint', 'Shown under the post and given to Google as an FAQ. 6 to 8 real questions is a good number.'), faqBox),
      sec('Designs and related guides', h('span.label', 'Designs shown under the post (up to 4)'), designsBox, h('span.label', 'Related guides (others fill in by category)'), relatedBox),
      sec('Search and sharing',
        h('div.field', h('label.label', { for: 'bx-seoTitle' }, 'Search title'), seoTitle, counter(seoTitle, 60), h('p.hint', 'Up to 60 characters, Title Case, ending “| Nimtto”.')),
        h('div.field', h('label.label', { for: 'bx-seoDesc' }, 'Search description'), seoDesc, counter(seoDesc, 155)),
        fieldBox('keyword', 'Main keyword', keyword), fieldBox('secondary', 'More keywords (comma separated)', secondary)),
      sec('Publishing', h('div.field', h('span.label', 'Status'), statusPick), fieldBox('publishedAt', 'Publish date', date, 'A published post with a later date goes live on that day.')));
    fill(root, h('div.blogx__edit', form, previewPane));
    schedulePreview('top');
  }
  return root;
}

/** the heading the cursor is under (its plain text), for the preview to follow */
function headingAt(md, pos) {
  const before = md.slice(0, pos).split('\n');
  for (let i = before.length - 1; i >= 0; i -= 1) {
    const m = /^#{1,4}\s+(.+?)\s*#*\s*$/.exec(before[i]);
    if (m) return m[1].replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '').trim();
  }
  return 'top';
}
