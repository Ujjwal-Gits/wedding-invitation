// The Blog module (super admin, or an admin with the 'content' permission, like the Content page): every post of both
// websites, and a WordPress-style editor. Server: server/lib/blog.js (/api/admin/blog); public pages are rendered there.
//   #/blog          the list (filter by website), New post
//   #/blog/new      a new post        #/blog/<id>   edit one
// The editor: a main column (title, the visual body editor of blog-editor.js, FAQ, SEO with a search snippet, the
// JSON-LD the page will publish) and a sticky sidebar (Publish, Feature image, Category, Excerpt, Related designs and
// guides). Preview opens the rendered page in a new tab. Unsaved work is kept on this device (localStorage) until saved.
import './admin-blog.css';
import { h, icon, iconBtn, toast, confirmDialog, openDialog, fill, debounce, copyText, fmtRelative } from './dom.js';
import { api, postFormProgress } from './api.js';

const SITE_NAME = { np: 'Nepal', intl: 'International' };
const DEFAULT_DESIGN = { np: 'kham', intl: 'olive-grove' };
const BLANK = (site = 'np') => ({
  site, title: '', slug: '', category: '', excerpt: '', body: '', faq: [],
  cover: { type: 'design', design: DEFAULT_DESIGN[site], alt: '', caption: '' }, og: null,
  seoTitle: '', seoDesc: '', keyword: '', secondary: [], designs: [], related: [], status: 'draft', publishedAt: new Date().toISOString().slice(0, 10),
  schemaType: 'BlogPosting', speakable: true,
});
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+){0,12}$/;
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/, '');
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
const SCHEMA_TYPES = [['BlogPosting', 'Blog post (BlogPosting)'], ['Article', 'Article'], ['HowTo', 'Guide with steps (adds HowTo, one step per H2)']];

/* ---------------- this device's copy of unsaved work ---------------- */
const draftKey = (id, site) => `nimtto.blog.v1.${id || `new-${site}`}`;
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full or blocked: the server copy still counts */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* blocked */ } },
};
/** the fields that make a post's content (what a restore compares) */
const contentOf = (p) => JSON.stringify(['site', 'title', 'slug', 'category', 'excerpt', 'body', 'faq', 'cover', 'og', 'seoTitle', 'seoDesc', 'keyword', 'secondary', 'designs', 'related', 'status', 'publishedAt', 'schemaType', 'speakable']
  .map((k) => p?.[k] ?? null));

export function blogAdmin(ctx) {
  const root = h('div.blogx', h('p.muted', 'Loading the blog…'));
  let meta = null; // { posts, categories, designs, sites }
  api('/admin/blog').then((r) => {
    meta = r;
    if (ctx.sub) openEditor(ctx.sub === 'new' ? null : ctx.sub);
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
              try { await api(`/admin/blog/${p.id}`, { method: 'DELETE' }); meta.posts = meta.posts.filter((x) => x.id !== p.id); store.del(draftKey(p.id)); drawSeg(); draw(); toast('Post deleted', 'success'); } catch (err) { toast(err.message, 'error'); }
            }, 'btn--ghost'))))))));
    }
    drawSeg();
    draw();
    fill(root, h('div.stack', h('div.toolbar2', seg), body));
  }

  /* ---------------- the editor ---------------- */
  let mod = null; // blog-editor.js, loaded once
  let teardown = () => {};
  ctx.cleanup(() => teardown());

  async function openEditor(id, restore = null) {
    teardown();
    fill(root, h('p.muted', 'Opening the editor…'));
    let post;
    let stamp = null;
    let html = '';
    try {
      const [r] = await Promise.all([id ? api(`/admin/blog/${id}`) : null, mod ? null : import('./blog-editor.js').then((m) => { mod = m; })]);
      if (r) { post = r.post; stamp = r.stamp; html = r.html; } else post = BLANK(ctx.params?.get?.('site') === 'intl' ? 'intl' : 'np');
    } catch (err) { fill(root, h('p.notice.notice--error', err.status === 404 ? 'This post was not found. It may have been deleted.' : err.message)); return; }
    post = structuredClone(post);
    post.schemaType ||= 'BlogPosting';
    if (post.speakable === undefined) post.speakable = true;
    const saved = structuredClone(post); // the server's copy
    if (restore) {
      post = { ...structuredClone(restore), id: post.id, ...(id ? {} : { id: undefined }) };
      try { html = (await api('/admin/blog/render', { method: 'POST', body: { body: post.body || '' } })).html; } catch (err) { toast(err.message, 'error'); }
    }
    mount({ id, post, saved, stamp, html, restored: Boolean(restore) });
  }

  function mount({ id, post, saved, stamp, html, restored }) {
    let dirty = restored;
    let saving = false;
    let slugTouched = Boolean(id) || Boolean(post.slug);
    let key = draftKey(id, post.site);
    const local = !restored ? store.get(key) : null;
    const alive = new AbortController();
    let body = null; // the visual editor (blog-editor.js), made below

    /* ---- leaving ---- */
    const beforeUnload = (e) => { if (dirty) { keepLocal.flush(); e.preventDefault(); e.returnValue = ''; } };
    const onKey = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); } };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('keydown', onKey);
    teardown = () => {
      teardown = () => {};
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('keydown', onKey);
      alive.abort();
      if (dirty) { keepLocal.flush(); toast('Your blog changes are not saved yet. They are kept on this device: open the post again to restore them.', 'error'); }
      body?.destroy();
    };

    /* ---- the post's state ---- */
    const read = () => { if (body) post.body = body.getMarkdown(); return post; };
    const keepLocal = (() => {
      const run = () => { if (dirty) store.set(key, { at: new Date().toISOString(), stamp, post: read() }); };
      const d = debounce(run, 1200);
      d.flush = () => { d.cancel(); run(); };
      return d;
    })();
    const touch = () => { dirty = true; drawSaveState(); keepLocal(); refreshSchema(); };

    /* ---- small builders ---- */
    const errs = {};
    const errBox = (k) => (errs[k] = h('p.field__err.bx-err', { hidden: true, role: 'alert' }));
    const counter = (input, max, min = 0) => {
      const c = h('span.bx-count');
      const upd = () => {
        const n = input.value.length;
        c.textContent = `${n} / ${max}`;
        c.classList.toggle('is-over', n > max);
        c.classList.toggle('is-low', n > 0 && n < min);
      };
      input.addEventListener('input', upd);
      upd();
      c.update = upd;
      return c;
    };
    const box = (title, ...kids) => h('section.bx-box', h('h2.bx-box__h', title), h('div.bx-box__in', ...kids));
    const panel = (title, hint, ...kids) => h('section.card.bx-panel', h('header.bx-panel__head', h('h2.bx-panel__h', title), hint ? h('p.bx-panel__hint', hint) : null), ...kids);

    /* ---- title ---- */
    const titleIn = h('input.bx-titlein', { id: 'bx-title', value: post.title, maxlength: 140, placeholder: 'Add title', autocomplete: 'off', 'aria-label': 'Title (the page’s main heading)' });
    titleIn.addEventListener('input', () => {
      post.title = titleIn.value;
      if (!slugTouched) { post.slug = slugify(titleIn.value); slugIn.value = post.slug; drawUrl(); }
      pageHead();
      touch();
    });

    /* ---- the body ---- */
    const linkTargets = () => meta.posts.filter((p) => p.site === post.site && p.id !== id).map((p) => ({ path: p.path, title: p.title }))
      .concat(post.site === 'intl' ? [{ path: '/international/pricing/', title: 'Pricing' }, { path: '/international/designs/', title: 'Designs' }] : [{ path: '/pricing/', title: 'Pricing' }, { path: '/designs/', title: 'Designs' }]);
    body = mod.createBodyEditor({
      html,
      onChange: touch,
      pickImage: (cur) => gallery({ mode: 'body', ...cur }),
      renderMarkdown: async (md) => (await api('/admin/blog/render', { method: 'POST', body: { body: md } })).html,
      linkTargets,
      pickDesigns: (cur) => pickDesigns(cur),
      designName: (slug) => catalog().find((d) => d.slug === slug)?.name || slug,
      designTargets: () => catalog().filter((d) => onSite(d)).map((d) => ({ path: designPath(d), title: `${d.name} design` })),
      onFaq: () => addFaq(),
    });
    const stats = h('span.bx-stats');
    const outline = h('span.bx-outline');
    const bodyCard = h('section.bx-editor', body.el, h('footer.bx-editor__foot', stats, outline));

    /* ---- FAQ ---- */
    const faqBox = h('div.bx-faq');
    function drawFaq() {
      const n = post.faq.length;
      fill(faqBox, n ? null : h('p.bx-empty', 'No questions yet. 6 to 8 real questions people ask is a good number.'), post.faq.map((f, i) => {
        const q = h('input.input', { value: f.q, maxlength: 240, 'aria-label': `Question ${i + 1}`, placeholder: 'The question, as people ask it' });
        const a = h('textarea.input', { rows: 3, maxlength: 1500, 'aria-label': `Answer ${i + 1}`, placeholder: 'The answer in plain words. Links like [pricing](/pricing/) are fine.' }, f.a);
        q.addEventListener('input', () => { f.q = q.value; touch(); });
        a.addEventListener('input', () => { f.a = a.value; touch(); });
        const move = (d) => { const j = i + d; if (j < 0 || j >= n) return; [post.faq[i], post.faq[j]] = [post.faq[j], post.faq[i]]; drawFaq(); touch(); faqBox.querySelectorAll('.bx-qa')[j]?.querySelector('input')?.focus(); };
        return h('div.bx-qa',
          h('div.bx-qa__head', h('span.bx-qa__n', `Q${i + 1}`),
            h('div.bx-qa__acts',
              h('button.btn.btn--ghost.btn--icon', { type: 'button', 'aria-label': 'Move up', title: 'Move up', disabled: i === 0, onclick: () => move(-1) }, icon('up', 16)),
              h('button.btn.btn--ghost.btn--icon', { type: 'button', 'aria-label': 'Move down', title: 'Move down', disabled: i === n - 1, onclick: () => move(1) }, icon('down', 16)),
              iconBtn('trash', 'Delete this question', () => { post.faq.splice(i, 1); drawFaq(); touch(); }, 'btn--ghost'))),
          q, a);
      }), n < 12 ? h('button.btn.btn--sm', { type: 'button', onclick: () => addFaq() }, icon('plus', 15), 'Add a question') : null);
    }

    function addFaq() {
      if (post.faq.length >= 12) { toast('Up to 12 questions.', 'error'); return; }
      post.faq.push({ q: '', a: '' });
      drawFaq();
      touch();
      const q = faqBox.querySelectorAll('.bx-qa input')[post.faq.length - 1];
      q?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(() => q?.focus({ preventScroll: true }), 300);
    }

    /* ---- the design catalog (both websites) and the design card picker ---- */
    function catalog() {
      const seen = new Map();
      for (const site of ['np', 'intl']) {
        for (const d of meta.designs[site] || []) if (!seen.has(d.slug)) seen.set(d.slug, { slug: d.slug, name: d.name.replace(/ \(Nepali\)$/, ''), home: site === 'intl' && !/\(Nepali\)$/.test(d.name) ? 'intl' : 'np' });
      }
      return [...seen.values()];
    }
    const onSite = (d) => post.site === 'np' || (meta.designs.intl || []).some((x) => x.slug === d.slug);
    const designPath = (d) => (d.home === 'intl' ? `/international/designs/${d.slug}/` : `/designs/${d.slug}/`);
    function pickDesigns(cur = []) {
      return new Promise((resolve) => {
        let chosen = cur.filter((s) => catalog().some((d) => d.slug === s));
        let out = null;
        const q = h('input.input.input--sm', { type: 'search', placeholder: 'Find a design', 'aria-label': 'Find a design' });
        const grid = h('div.bx-grid', { role: 'listbox', 'aria-label': 'Designs', 'aria-multiselectable': 'true' });
        const picked = h('p.bx-dpick__sel');
        const ok = h('button.btn.btn--primary', { type: 'button', onclick: () => { out = chosen.slice(); d.close(); } });
        const drawSel = () => {
          picked.textContent = chosen.length ? `Chosen: ${chosen.map((s) => catalog().find((d) => d.slug === s)?.name || s).join(', ')}` : 'Choose 1 to 3 designs. They show in a row, in the order you pick them.';
          ok.textContent = cur.length ? 'Update the card' : 'Insert design card';
          ok.disabled = !chosen.length;
        };
        const draw = () => {
          const s = q.value.trim().toLowerCase();
          const list = catalog().filter((d) => !s || d.name.toLowerCase().includes(s) || d.slug.includes(s));
          fill(grid, list.map((dsn) => {
            const avail = onSite(dsn);
            const i = chosen.indexOf(dsn.slug);
            return h('button.bx-tile.is-phone', { type: 'button', role: 'option', 'aria-selected': String(i >= 0), disabled: !avail && i < 0,
              title: avail ? dsn.name : 'Not offered on this website', onclick: () => {
                if (i >= 0) chosen.splice(i, 1);
                else if (chosen.length >= 3) { toast('Up to 3 designs in one card.', 'error'); return; } else chosen.push(dsn.slug);
                draw(); drawSel();
              } },
            h('img', { src: `/site/thumbs/${dsn.slug}-480.webp`, alt: '', loading: 'lazy' }),
            h('span.bx-tile__n', i >= 0 ? `${i + 1}. ${dsn.name}` : dsn.name, h('small', dsn.home === 'intl' ? ' · International' : ' · Nepal')));
          }));
        };
        q.addEventListener('input', draw);
        const d = openDialog({ title: 'Design card', wide: true, cls: 'bx-gal-dlg',
          body: h('div.bx-gal', h('div.bx-gal__bar', q, picked), h('p.hint', 'In the post it shows each design with its picture, plan, price in the reader’s currency, Preview and Order this design.'), grid),
          actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), ok], onClose: () => resolve(out) });
        draw(); drawSel();
        setTimeout(() => q.focus(), 30);
      });
    }

    /* ---- SEO ---- */
    const seoTitle = h('input.input', { id: 'bx-seoTitle', value: post.seoTitle, maxlength: 80, autocomplete: 'off' });
    const seoDesc = h('textarea.input', { id: 'bx-seoDesc', rows: 3, maxlength: 200 }, post.seoDesc);
    const slugIn = h('input.input', { id: 'bx-slug', value: post.slug, maxlength: 80, spellcheck: 'false', autocomplete: 'off' });
    const keyword = h('input.input', { id: 'bx-keyword', value: post.keyword, maxlength: 100, autocomplete: 'off', placeholder: 'e.g. pasni invitation' });
    const secondary = h('input.input', { id: 'bx-secondary', value: (post.secondary || []).join(', '), autocomplete: 'off', placeholder: 'Comma separated, e.g. pasni card, rice feeding ceremony' });
    const urlLine = h('p.bx-url');
    const slugNote = h('p.hint');
    const snippet = h('div.bx-snip', { 'aria-label': 'How the post may look in Google' });
    const kwChecks = h('ul.bx-checks');
    const tCount = counter(seoTitle, 60, 30);
    const dCount = counter(seoDesc, 155, 70);
    const placeholders = () => { seoTitle.placeholder = `${post.title || 'The title'} | Nimtto`; seoDesc.placeholder = post.excerpt || 'Defaults to the excerpt'; };
    seoTitle.addEventListener('input', () => { post.seoTitle = seoTitle.value; touch(); });
    seoDesc.addEventListener('input', () => { post.seoDesc = seoDesc.value; touch(); });
    slugIn.addEventListener('input', () => { slugTouched = true; post.slug = slugIn.value.toLowerCase().replace(/\s+/g, '-'); drawUrl(); touch(); });
    slugIn.addEventListener('blur', () => { if (!slugIn.value && post.title) { slugTouched = false; post.slug = slugify(post.title); slugIn.value = post.slug; drawUrl(); touch(); } });
    keyword.addEventListener('input', () => { post.keyword = keyword.value; touch(); });
    secondary.addEventListener('input', () => { post.secondary = secondary.value.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 8); touch(); });
    function drawUrl() {
      const ok = SLUG_RE.test(post.slug || '');
      fill(urlLine, h('span.bx-url__k', 'Link'), h('a', { href: `${meta.sites[post.site].base}${post.slug}/`, target: '_blank', rel: 'noopener', class: ok ? '' : 'is-bad' }, `nimtto.com${meta.sites[post.site].base}`, h('b', post.slug || '…'), '/'));
      const moved = saved.status === 'published' && id && saved.slug !== post.slug && saved.site === post.site;
      slugNote.textContent = !ok && post.slug ? 'Lower-case letters, numbers and hyphens only (e.g. pasni-invitation-guide).'
        : moved ? `The old link (${saved.slug}) will keep working: it redirects here.` : 'Made from the title until you change it. Short and plain is best.';
      slugNote.classList.toggle('is-bad', !ok && Boolean(post.slug));
    }

    /* ---- Schema ---- */
    const typeSel = h('select.input', { id: 'bx-schemaType' }, SCHEMA_TYPES.map(([v, t]) => h('option', { value: v, selected: v === post.schemaType }, t)));
    typeSel.addEventListener('change', () => { post.schemaType = typeSel.value; touch(); });
    const speak = h('input', { type: 'checkbox', id: 'bx-speakable', checked: post.speakable !== false });
    speak.addEventListener('change', () => { post.speakable = speak.checked; touch(); });
    const ldPre = h('pre.bx-ld', { tabindex: '0', 'aria-label': 'JSON-LD' }, '…');
    const ldChecks = h('ul.bx-checks');
    const ldState = h('span.bx-ldstate');
    let lastLd = '';

    /* ---- the server's view: snippet, JSON-LD, words, outline ---- */
    let pend = null;
    const refreshSchema = debounce(async () => {
      pend?.abort();
      const ac = new AbortController();
      pend = ac;
      alive.signal.addEventListener('abort', () => ac.abort(), { once: true });
      try {
        const r = await api('/admin/blog/schema', { method: 'POST', body: { ...read(), id }, signal: ac.signal });
        drawServer(r);
      } catch (e) {
        if (e.name !== 'AbortError') { ldState.textContent = e.message; ldState.className = 'bx-ldstate is-bad'; }
      }
    }, 600);
    function drawServer(r) {
      stats.textContent = `${r.words.toLocaleString('en-GB')} words · ${r.minutes} min read`;
      const h2 = r.toc.filter((t) => t.level === 2).length;
      outline.textContent = `${h2} section${h2 === 1 ? '' : 's'} (H2) and ${r.toc.length - h2} subsection${r.toc.length - h2 === 1 ? '' : 's'} (H3) in the table of contents`;
      // the Google-style snippet
      const u = new URL(r.url);
      fill(snippet,
        h('div.bx-snip__site', h('span.bx-snip__fav', h('img', { src: '/favicon.svg', alt: '', width: 18, height: 18 })), h('span', h('b', 'Nimtto'), h('span.bx-snip__crumb', `${u.host} › ${u.pathname.split('/').filter(Boolean).join(' › ')}`))),
        h('p.bx-snip__t', r.title.length > 60 ? `${r.title.slice(0, 58).trimEnd()}…` : r.title),
        h('p.bx-snip__d', h('span.bx-snip__date', `${fmt(post.publishedAt || today())} — `), r.desc ? (r.desc.length > 158 ? `${r.desc.slice(0, 155).trimEnd()}…` : r.desc) : 'Write a search description or an excerpt.'));
      drawKw(r);
      lastLd = JSON.stringify(r.ld.length === 1 ? r.ld[0] : r.ld, null, 2);
      ldPre.textContent = lastLd;
      const bad = r.checks.filter((c) => !c.ok);
      fill(ldChecks, r.checks.map((c) => h('li', { class: c.ok ? 'is-ok' : 'is-bad' }, icon(c.ok ? 'check' : 'alert', 15), c.text)));
      ldState.textContent = bad.length ? `${bad.length} to fix` : 'Valid: every required field is there';
      ldState.className = `bx-ldstate ${bad.length ? 'is-bad' : 'is-ok'}`;
    }
    function drawKw(r) {
      const k = (post.keyword || '').trim().toLowerCase();
      if (!k) { fill(kwChecks, h('li.is-muted', icon('info', 15), 'Add a focus keyword to check where it appears.')); return; }
      const md = (post.body || '').toLowerCase();
      const firstPara = md.split(/\n{2,}/).find((b) => b.trim() && !/^(#|>|```|\||!\[|-|\d+\.)/.test(b.trim())) || '';
      const kSlug = slugify(k);
      const rows = [
        [r.title.toLowerCase().includes(k), 'In the search title'],
        [(r.desc || '').toLowerCase().includes(k), 'In the search description'],
        [kSlug && post.slug.includes(kSlug), 'In the link'],
        [firstPara.includes(k), 'In the first paragraph'],
        [r.toc.some((t) => t.text.toLowerCase().includes(k)), 'In at least one heading'],
      ];
      fill(kwChecks, rows.map(([ok, t]) => h('li', { class: ok ? 'is-ok' : 'is-bad' }, icon(ok ? 'check' : 'alert', 15), t)));
    }

    /* ---- sidebar: Publish ---- */
    const statusLine = h('p.bx-meta');
    const savedLine = h('p.bx-meta.bx-meta--quiet');
    const sitePick = h('div.seg.seg--sm.bx-seg', { role: 'group', 'aria-label': 'Website' });
    const dateIn = h('input.input', { id: 'bx-date', type: 'date', value: post.publishedAt || today() });
    dateIn.addEventListener('change', () => { post.publishedAt = dateIn.value || today(); drawPublish(); touch(); });
    const notice = h('div.bx-notice', { hidden: true, role: 'alert' });
    const previewBtn = h('button.btn.btn--sm', { type: 'button', onclick: () => preview() }, icon('eye', 15), 'Preview');
    const draftBtn = h('button.btn.btn--sm', { type: 'button', onclick: () => save('draft') });
    const mainBtn = h('button.btn.btn--primary.bx-main-btn', { type: 'button', onclick: () => save('published') });
    const segOf = (el, items, cur, on) => fill(el, items.map(([v, t]) => h('button.seg__btn', { type: 'button', 'aria-pressed': String(cur === v), onclick: () => on(v) }, t)));
    function drawSite() {
      segOf(sitePick, [['np', 'Nepal'], ['intl', 'International']], post.site, (v) => {
        if (v === post.site) return;
        post.site = v;
        post.designs = [];
        post.related = [];
        if (post.cover?.type === 'design') post.cover.design = DEFAULT_DESIGN[v];
        drawSite(); drawCategories(); drawUrl(); drawCover(); drawDesigns(); drawRelated(); pageHead(); touch();
      });
    }
    function drawPublish() {
      const later = post.publishedAt > today();
      const live = saved.status === 'published' && id;
      fill(statusLine, h('span.bx-meta__k', 'Status'), h('b', post.status === 'published' ? (later ? `Scheduled for ${fmt(post.publishedAt)}` : 'Published') : 'Draft'));
      draftBtn.textContent = live ? 'Switch to draft' : 'Save draft';
      mainBtn.textContent = live ? 'Update' : later ? 'Schedule' : 'Publish';
      draftBtn.hidden = false;
    }
    function drawSaveState() {
      savedLine.textContent = saving ? 'Saving…' : dirty ? 'Unsaved changes (kept on this device until you save)' : id ? 'All changes saved' : 'Not saved yet';
      savedLine.classList.toggle('is-dirty', dirty);
    }
    const viewLink = h('a.btn.btn--ghost.btn--sm', { target: '_blank', rel: 'noopener' }, icon('external', 14), 'View on the website');
    const pageHead = () => {
      viewLink.hidden = !(id && saved.status === 'published' && saved.publishedAt <= today());
      viewLink.href = `${meta.sites[saved.site].base}${saved.slug}/`;
      ctx.shell.setPage({ kicker: `Blog · ${SITE_NAME[post.site]} website`, title: id ? 'Edit post' : 'New post', sub: '', actions: [h('a.btn', { href: '#/blog' }, icon('back', 15), 'All posts'), viewLink] });
    };

    /* ---- sidebar: Feature image ---- */
    const coverBox = h('div.bx-cover');
    const coverAlt = h('input.input', { id: 'bx-alt', maxlength: 200, value: post.cover?.alt || '', placeholder: 'What the picture shows' });
    const coverCap = h('input.input', { id: 'bx-caption', maxlength: 240, value: post.cover?.caption || '', placeholder: 'Optional, shown under it' });
    coverAlt.addEventListener('input', () => { post.cover.alt = coverAlt.value; touch(); });
    coverCap.addEventListener('input', () => { post.cover.caption = coverCap.value; touch(); });
    const designName = (slug) => (meta.designs[post.site] || []).find((d) => d.slug === slug)?.name || slug;
    function drawCover() {
      const c = post.cover || (post.cover = { type: 'none', alt: '', caption: '' });
      let pic;
      let label;
      if (c.type === 'photo' && c.src) { pic = h('img', { src: c.src.replace(/-1600\.webp$/, '-800.webp'), alt: '' }); label = 'Uploaded photo'; } else if (c.type === 'design' && c.design) { pic = h('img.is-phone', { src: `/site/stills/${c.design}-480.webp`, alt: '' }); label = `Design: ${designName(c.design)}`; } else if (c.type === 'mock') { pic = h('span.bx-cover__mock', 'Sample card'); label = 'A built-in sample card'; } else { pic = h('img.is-phone', { src: `/site/stills/${DEFAULT_DESIGN[post.site]}-480.webp`, alt: '' }); label = 'None set: the site’s default design is shown'; }
      fill(coverBox,
        h('button.bx-cover__pic', { type: 'button', onclick: () => pickCover(), 'aria-label': 'Change the feature image' }, pic),
        h('p.bx-cover__label', label),
        h('div.bx-row', h('button.btn.btn--sm', { type: 'button', onclick: () => pickCover() }, icon('image', 15), c.type === 'none' ? 'Set feature image' : 'Replace'),
          c.type !== 'none' ? h('button.btn.btn--sm.btn--ghost', { type: 'button', onclick: () => { post.cover = { type: 'none', alt: c.alt, caption: c.caption }; if (/^\/uploads\//.test(post.og || '')) post.og = null; drawCover(); touch(); } }, 'Remove') : null));
    }
    async function pickCover() {
      const got = await gallery({ mode: 'cover', alt: post.cover?.alt, caption: post.cover?.caption });
      if (!got) return;
      const keep = { alt: got.alt ?? post.cover.alt, caption: got.caption ?? post.cover.caption };
      if (got.design) { post.cover = { type: 'design', design: got.design, ...keep }; if (/^\/uploads\//.test(post.og || '')) post.og = null; } else { post.cover = { type: 'photo', src: got.src, ...keep }; post.og = got.og || null; }
      coverAlt.value = post.cover.alt || '';
      coverCap.value = post.cover.caption || '';
      drawCover();
      touch();
    }

    /* ---- sidebar: Category, Excerpt, Related ---- */
    const catSel = h('select.input', { id: 'bx-category' });
    const extraCats = { np: [], intl: [] };
    function drawCategories() {
      const opts = [...new Set([...(meta.categories[post.site] || []), ...meta.posts.filter((p) => p.site === post.site).map((p) => p.category), ...extraCats[post.site], post.category].filter(Boolean))];
      fill(catSel, h('option', { value: '' }, 'Choose…'), opts.map((c) => h('option', { value: c, selected: c === post.category }, c)));
      catSel.value = post.category || '';
    }
    catSel.addEventListener('change', () => { post.category = catSel.value; touch(); });
    const newCat = h('input.input', { maxlength: 40, placeholder: 'New category name', 'aria-label': 'New category name' });
    const newCatRow = h('div.bx-row.bx-newcat', { hidden: true }, newCat, h('button.btn.btn--sm', { type: 'button', onclick: () => addCat() }, 'Add'));
    const addCat = () => {
      const v = newCat.value.replace(/\s+/g, ' ').trim().slice(0, 40);
      if (!v) { newCat.focus(); return; }
      extraCats[post.site].push(v);
      post.category = v;
      newCat.value = '';
      newCatRow.hidden = true;
      drawCategories();
      touch();
    };
    newCat.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addCat(); } });
    const excerpt = h('textarea.input', { id: 'bx-excerpt', rows: 4, maxlength: 300, placeholder: 'One or two plain sentences under the title. Also the card text on the blog page.' }, post.excerpt);
    const exCount = counter(excerpt, 240, 80);
    excerpt.addEventListener('input', () => { post.excerpt = excerpt.value; placeholders(); touch(); });

    const designFilter = h('input.input.input--sm', { type: 'search', placeholder: 'Find a design', 'aria-label': 'Find a design' });
    const designsBox = h('div.bx-picks');
    const designsN = h('span.bx-box__n');
    function drawDesigns() {
      const q = designFilter.value.trim().toLowerCase();
      const all = meta.designs[post.site] || [];
      const rows = all.filter((d) => !q || d.name.toLowerCase().includes(q) || post.designs.includes(d.slug));
      designsN.textContent = `${post.designs.length} / 4`;
      fill(designsBox, rows.map((d) => h('label.bx-pick', h('input', { type: 'checkbox', checked: post.designs.includes(d.slug), onchange: (e) => {
        if (e.target.checked) { if (post.designs.length >= 4) { e.target.checked = false; toast('Up to 4 designs.', 'error'); return; } post.designs.push(d.slug); } else post.designs = post.designs.filter((s) => s !== d.slug);
        designsN.textContent = `${post.designs.length} / 4`;
        touch();
      } }), h('span', d.name))), rows.length ? null : h('p.bx-empty', 'No design matches.'));
    }
    designFilter.addEventListener('input', drawDesigns);
    const relatedBox = h('div.bx-picks');
    function drawRelated() {
      const others = meta.posts.filter((p) => p.site === post.site && p.id !== id);
      fill(relatedBox, others.length ? others.map((p) => h('label.bx-pick', h('input', { type: 'checkbox', checked: post.related.includes(p.slug), onchange: (e) => {
        if (e.target.checked) { if (post.related.length >= 6) { e.target.checked = false; toast('Up to 6 guides.', 'error'); return; } post.related.push(p.slug); } else post.related = post.related.filter((s) => s !== p.slug);
        touch();
      } }), h('span', p.title))) : h('p.bx-empty', 'No other posts on this website yet.'));
    }

    /* ---- saving ---- */
    function showErr(k, msg) {
      const e = errs[k];
      if (!e) { toast(msg, 'error'); return; }
      e.textContent = msg;
      e.hidden = false;
      const target = { title: titleIn, slug: slugIn, category: catSel, faq: faqBox.querySelector('input') }[k] || e.parentElement?.querySelector('.input');
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setTimeout(() => target?.focus({ preventScroll: true }), 250);
    }
    async function save(status = post.status) {
      if (saving) return;
      Object.values(errs).forEach((e) => { e.hidden = true; });
      read();
      if (!post.title.trim()) { showErr('title', 'Write a title.'); return; }
      if (!SLUG_RE.test(post.slug)) { showErr('slug', 'The link: lower-case letters, numbers and hyphens only.'); return; }
      if (!post.category) { showErr('category', 'Choose a category.'); return; }
      if (post.faq.some((f) => !f.q.trim() !== !f.a.trim())) { showErr('faq', 'Every question needs an answer (or delete it).'); return; }
      saving = true;
      drawSaveState();
      [draftBtn, mainBtn].forEach((b) => { b.disabled = true; });
      const wasNew = !id;
      try {
        const payload = { ...post, status, ...(stamp ? { baseStamp: stamp } : {}) };
        const r = id ? await api(`/admin/blog/${id}`, { method: 'PUT', body: payload }) : await api('/admin/blog', { method: 'POST', body: payload });
        Object.assign(post, r.post);
        Object.assign(saved, structuredClone(r.post));
        stamp = r.stamp;
        dirty = false;
        store.del(key);
        keepLocal.cancel();
        const known = meta.posts.findIndex((p) => p.id === r.post.id);
        const sum = { ...r.post, path: `${meta.sites[r.post.site].base}${r.post.slug}/`, words: meta.posts[known]?.words ?? 0 };
        if (known >= 0) meta.posts[known] = { ...meta.posts[known], ...sum }; else meta.posts.unshift(sum);
        notice.hidden = true;
        toast(post.status === 'published' ? (post.publishedAt > today() ? `Saved. It goes live on ${fmt(post.publishedAt)}.` : 'Published. The page, sitemap and RSS feed are updated.') : 'Draft saved', 'success');
        if (wasNew) { id = r.post.id; key = draftKey(id); history.replaceState(history.state, '', `/studio/blog/${id}`); }
        drawPublish(); drawUrl(); pageHead();
      } catch (e2) {
        const fe = e2.body?.errors;
        if (e2.status === 409 && e2.body?.code === 'stale') {
          keepLocal.flush();
          fill(notice, h('p', h('b', 'Someone else saved this post after you opened it.'), ' Your version is kept on this device. Open the latest to see their changes; you can then restore yours.'),
            h('button.btn.btn--sm', { type: 'button', onclick: () => { dirty = false; openEditor(id); } }, icon('refresh', 14), 'Open the latest'));
          notice.hidden = false;
          notice.scrollIntoView({ block: 'nearest' });
        } else if (fe) for (const [k, v] of Object.entries(fe)) showErr(k, v);
        else toast(e2.message, 'error');
      } finally {
        saving = false;
        [draftBtn, mainBtn].forEach((b) => { b.disabled = false; });
        drawSaveState();
      }
    }

    /* ---- preview in a new tab ---- */
    async function preview() {
      const tab = window.open('', '_blank');
      try { if (tab) { tab.document.title = 'Preview'; tab.document.body.textContent = 'Preparing the preview…'; } } catch { /* cross-origin blank */ }
      try {
        const r = await api('/admin/blog/preview', { method: 'POST', body: { ...read(), id } });
        if (tab && !tab.closed) tab.location.replace(r.url);
        else {
          const d = openDialog({ title: 'Preview ready', body: h('p.dialog__text', 'Your browser blocked the new tab. Open the preview here:'),
            actions: [h('a.btn.btn--primary', { href: r.url, target: '_blank', rel: 'noopener', onclick: () => d.close() }, icon('external', 15), 'Open the preview')] });
        }
      } catch (e2) {
        tab?.close();
        toast(e2.status === 400 ? e2.message : `Preview not available: ${e2.message}`, 'error');
      }
    }

    /* ---- the media gallery ---- */
    let media = null;
    async function gallery({ mode, alt = '', caption = '' }) {
      return new Promise((resolve) => {
        let tab = 'uploads';
        let picked = null;
        let result = null;
        const q = h('input.input.input--sm', { type: 'search', placeholder: 'Search', 'aria-label': 'Search pictures' });
        const tabs = h('div.seg.seg--sm', { role: 'tablist', 'aria-label': 'Pictures' });
        const grid = h('div.bx-grid', { role: 'listbox', 'aria-label': 'Pictures' });
        const altIn = h('input.input', { value: alt || '', maxlength: 200, placeholder: 'What the picture shows' });
        const capIn = h('input.input', { value: caption || '', maxlength: 240, placeholder: 'Optional, shown under it' });
        const sel = h('div.bx-gsel');
        const useBtn = h('button.btn.btn--primary', { type: 'button', disabled: true, onclick: () => use() }, mode === 'cover' ? 'Set feature image' : 'Insert picture');
        const fileIn = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,image/avif', hidden: true });
        const upBtn = h('button.btn.btn--sm', { type: 'button', onclick: () => fileIn.click() }, icon('upload', 15), 'Upload new');
        const upState = h('span.bx-gup');
        const allowed = (it) => mode !== 'cover' || it.kind === 'uploads' || (it.kind === 'designs' && it.sites.includes(post.site));
        const items = () => {
          const all = tab === 'uploads' ? media.uploads.map((x) => ({ ...x, kind: 'uploads', name: `Uploaded ${fmt(x.at)}` })) : tab === 'designs' ? media.designs.map((x) => ({ ...x, kind: 'designs' })) : media.site.map((x) => ({ ...x, kind: 'site' }));
          const s = q.value.trim().toLowerCase();
          return all.filter((x) => !s || x.name.toLowerCase().includes(s));
        };
        function drawTabs() {
          segOf(tabs, [['uploads', `Uploads (${media.uploads.length})`], ['designs', `Design stills (${media.designs.length})`], ['site', `Site images (${media.site.length})`]], tab, (v) => { tab = v; drawTabs(); drawGrid(); });
        }
        function drawGrid() {
          const list = items();
          fill(grid, list.length ? list.map((it) => {
            const ok = allowed(it);
            return h('button.bx-tile', { type: 'button', role: 'option', 'aria-selected': String(picked?.src === it.src), disabled: !ok, title: ok ? it.name : 'This one can go in the text, not as the feature image', class: it.kind === 'designs' ? 'is-phone' : '',
              onclick: () => { picked = it; drawGrid(); drawSel(); }, ondblclick: () => { picked = it; use(); } },
            h('img', { src: it.thumb, alt: '', loading: 'lazy' }), h('span.bx-tile__n', it.name));
          }) : h('p.bx-empty', tab === 'uploads' ? 'No uploads yet. Upload a photo: it is made into web sizes and a 1200 x 630 share picture.' : 'Nothing matches.'));
        }
        function drawSel() {
          useBtn.disabled = !picked;
          fill(sel, picked ? [h('img.bx-gsel__img', { src: picked.thumb, alt: '' }), h('p.bx-gsel__n', picked.name)] : h('p.bx-empty', 'Choose a picture.'));
        }
        function use() {
          if (!picked || !allowed(picked)) return;
          if (mode === 'body' && !altIn.value.trim()) { altIn.focus(); altIn.setAttribute('aria-invalid', 'true'); toast('Describe the picture first (alt text).', 'error'); return; }
          result = mode === 'cover'
            ? (picked.kind === 'designs' ? { design: picked.design, alt: altIn.value.trim(), caption: capIn.value.trim() } : { src: picked.src, og: picked.og, alt: altIn.value.trim(), caption: capIn.value.trim() })
            : { src: picked.src, alt: altIn.value.trim(), caption: capIn.value.trim() };
          d.close();
        }
        fileIn.onchange = async () => {
          const f = fileIn.files[0];
          fileIn.value = '';
          if (!f) return;
          if (f.size > 15 * 1024 * 1024) { toast('That photo is larger than 15 MB.', 'error'); return; }
          const fd = new FormData();
          fd.append('file', f);
          upBtn.disabled = true;
          try {
            const out = await postFormProgress('/admin/blog/cover', fd, (p) => { upState.textContent = `Uploading… ${Math.round(p * 100)}%`; });
            const it = { src: out.src, thumb: out.src.replace(/-1600\.webp$/, '-800.webp'), og: out.og, at: new Date().toISOString() };
            media.uploads.unshift(it);
            tab = 'uploads';
            picked = { ...it, kind: 'uploads', name: 'Just uploaded' };
            drawTabs(); drawGrid(); drawSel();
            upState.textContent = 'Uploaded';
          } catch (e2) { toast(e2.message, 'error'); upState.textContent = ''; } finally { upBtn.disabled = false; }
        };
        q.addEventListener('input', drawGrid);
        const bodyEl = h('div.bx-gal',
          h('div.bx-gal__bar', tabs, h('div.bx-row', q, upBtn, upState, fileIn)),
          mode === 'cover' ? h('p.hint', 'The feature image is an uploaded photo or one of this website’s designs. Site images can go in the text.') : null,
          h('div.bx-gal__main', grid,
            h('aside.bx-gal__side', sel,
              h('div.field', h('label.label', 'Alt text'), altIn, h('p.hint', 'What the picture shows, for Google and screen readers.')),
              h('div.field', h('label.label', 'Caption'), capIn))));
        const d = openDialog({ title: mode === 'cover' ? 'Feature image' : 'Insert a picture', body: bodyEl, wide: true, cls: 'bx-gal-dlg',
          actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), useBtn], onClose: () => resolve(result) });
        fill(grid, h('p.bx-empty', 'Loading pictures…'));
        drawSel();
        (media ? Promise.resolve(media) : api('/admin/blog/media').then((m) => { media = m; return m; })).then(() => {
          if (!media.uploads.length) tab = 'designs';
          drawTabs(); drawGrid();
        }).catch((e2) => fill(grid, h('p.notice.notice--error', e2.message)));
      });
    }

    /* ---- the page ---- */
    const field = (label, control, ...rest) => h('div.field', h('label.label', { for: control.id }, label), control, ...rest);
    const restoreBar = local?.post && contentOf(local.post) !== contentOf(post)
      ? h('div.bx-restore', { role: 'status' }, icon('history', 16), h('p', h('b', 'Unsaved changes on this device'), ` from ${fmtRelative(local.at)}.${local.stamp && stamp && local.stamp !== stamp ? ' The post was saved elsewhere since then.' : ''}`),
        h('div.bx-row', h('button.btn.btn--sm.btn--primary', { type: 'button', onclick: () => openEditor(id, local.post) }, 'Restore them'),
          h('button.btn.btn--sm.btn--ghost', { type: 'button', onclick: (e) => { store.del(key); e.target.closest('.bx-restore').remove(); } }, 'Discard')))
      : null;
    if (local && !restoreBar) store.del(key);

    const main = h('div.bx-main',
      restoreBar,
      h('div.bx-titlebox', titleIn, errBox('title')),
      bodyCard,
      panel('Questions people ask (FAQ)', 'Shown under the post and given to Google as an FAQPage. Change the order with the arrows.', faqBox, errBox('faq')),
      panel('SEO', 'How the post shows in Google and when shared.',
        h('div.bx-snipwrap', h('span.label', 'Search preview'), snippet),
        h('div.bx-grid2',
          field('Search title', seoTitle, h('div.bx-fieldfoot', h('span.hint', 'Up to 60 characters, Title Case, ending “| Nimtto”.'), tCount)),
          field('Search description', seoDesc, h('div.bx-fieldfoot', h('span.hint', '70 to 155 characters: what the reader gets.'), dCount))),
        field('Link (slug)', slugIn, urlLine, slugNote, errBox('slug')),
        h('div.bx-grid2',
          field('Focus keyword', keyword, errBox('keyword')),
          field('Secondary keywords', secondary, errBox('secondary'))),
        h('div.bx-kw', h('span.label', 'Focus keyword check'), kwChecks)),
      panel('Schema (structured data)', 'The JSON-LD this page publishes for Google. It is made from the fields above; change the options here.',
        h('div.bx-grid2', field('Article type', typeSel), h('div.field', h('span.label', 'Speakable'), h('label.bx-switch', speak, h('span', 'Mark the title and excerpt for voice assistants')))),
        h('div.bx-ldhead', h('span.label', 'Published JSON-LD'), ldState, h('button.btn.btn--sm', { type: 'button', onclick: () => copyText(lastLd, 'JSON-LD copied') }, icon('copy', 14), 'Copy')),
        ldPre, ldChecks));

    const side = h('aside.bx-side', { 'aria-label': 'Post settings' },
      box('Publish',
        statusLine,
        h('div.field', h('span.label', 'Website'), sitePick),
        field('Publish date', dateIn, h('p.hint', 'A later date schedules it: it goes live that day.')),
        savedLine, notice,
        h('div.bx-pubacts', previewBtn, draftBtn),
        mainBtn),
      box('Feature image', coverBox, field('Alt text', coverAlt), field('Caption', coverCap)),
      box('Category', catSel, errBox('category'), h('button.bx-link', { type: 'button', onclick: () => { newCatRow.hidden = !newCatRow.hidden; if (!newCatRow.hidden) newCat.focus(); } }, '+ Add a new category'), newCatRow),
      box('Excerpt', excerpt, h('div.bx-fieldfoot', h('span.hint', 'Under the title and on the blog cards.'), exCount)),
      h('section.bx-box', h('h2.bx-box__h', 'Related designs', designsN), h('div.bx-box__in', h('p.hint', 'Shown under the post (up to 4). If you pick none, we show matching or latest designs.'), designFilter, designsBox)),
      box('Related guides', h('p.hint', 'Picked first in “Keep reading”. If you pick none, we show matching or latest guides.'), relatedBox));

    drawFaq(); drawUrl(); drawSite(); drawPublish(); drawSaveState(); drawCover(); drawCategories(); drawDesigns(); drawRelated(); placeholders(); pageHead();
    fill(root, h('div.bx', main, side));
    refreshSchema();
    if (!id && !post.title) setTimeout(() => titleIn.focus(), 50);
  }
  return root;
}
