// Content: the website's words, changed without a rebuild (server/lib/content.js; docs/API.md "Content").
// Three tabs per website (Nepal / International): every public page in thin rows with an SEO health column (a drawer
// edits its search title and description with a Google-style preview, its heading, intro and questions), Contact &
// footer, and the Announcement bar. The built words are the defaults: an empty field or "Reset to default" goes back to
// them. The server writes the changes into the pages on the next request.
import { h, icon, iconBtn, toast, openDialog, confirmDialog, fill, toggle, fmtRelative } from './dom.js';
import { api } from './api.js';

const SITES = [['np', 'Nepal'], ['intl', 'International']];
const TITLE_MAX = 60;
const DESC_MAX = 155;
const DESC_MIN = 70;

const st = (tone, text, title) => h('span.st', { class: `st--${tone}`, title }, h('span.st__dot', { 'aria-hidden': 'true' }), h('span.st__t', text));
const quietEmpty = (ic, title, text, ...acts) => h('div.qempty', h('span.qempty__icon', icon(ic, 18)), h('div', h('p.qempty__title', title), text ? h('p.qempty__text', text) : null), acts.length ? h('div.qempty__acts', acts) : null);
const rowsSkel = (n = 4) => h('div.rows-skel', { 'aria-hidden': 'true' }, Array.from({ length: n }, (_, i) => h('div.rows-skel__row', h('span.skel__line', { style: { width: `${[38, 54, 46, 60][i % 4]}%` } }))));
const setting = (title, help, ...children) => h('section.setrow', h('header.setrow__aside', h('h2.setrow__title', title), help ? h('p.setrow__help', help) : null), h('div.setrow__body', ...children));
const plain = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clone = (x) => (x == null ? x : structuredClone(x));

/** What a page shows now: the planner's words, else (home pages) the Website headline, else the built words. */
function effective(p) {
  const o = p.override || {};
  return {
    title: o.title || p.defaults.title,
    desc: o.desc || p.defaults.desc,
    h1: o.h1 || p.base?.h1 || p.defaults.h1,
    lede: o.lede || p.base?.lede || p.defaults.lede,
    faq: o.faq || p.defaults.faq,
  };
}

/** SEO health of one page: [tone, words, details]. dupes: titles used by more than one page. */
function health(p, dupes) {
  const e = effective(p);
  const issues = [];
  if (!e.title) issues.push('no title');
  else if (e.title.length > TITLE_MAX) issues.push(`title ${e.title.length} > ${TITLE_MAX}`);
  if (!e.desc) issues.push('no description');
  else if (e.desc.length > DESC_MAX) issues.push(`description ${e.desc.length} > ${DESC_MAX}`);
  else if (e.desc.length < DESC_MIN) issues.push('short description');
  if (e.title && dupes.has(e.title)) issues.push('same title as another page');
  if (p.defaults.hasH1 && !plain(e.h1)) issues.push('no heading');
  if (!issues.length) return ['ok', 'Good', ''];
  const bad = issues.some((x) => x.startsWith('no ') || x.startsWith('same'));
  return [bad ? 'danger' : 'warn', issues[0].replace(/^./, (c) => c.toUpperCase()) + (issues.length > 1 ? ` +${issues.length - 1}` : ''), issues.join(', ')];
}

const counter = (n, max) => h('span.cms-count', { class: n > max ? 'is-over' : '', 'aria-live': 'polite' }, `${n} / ${max}`);

/** A text field with a live counter (optional), the built words as the fallback and "Reset to default". */
function textBox(id, label, { value, fallback, max, warn, multiline = false, rows = 2, hint, placeholder, type = 'text', onChange }) {
  const el = h(multiline ? 'textarea.input' : 'input.input', { id, value: value ?? '', maxlength: max, rows: multiline ? rows : undefined, type: multiline ? undefined : type, placeholder: placeholder ?? fallback ?? '', spellcheck: type === 'text' ? 'true' : 'false' });
  const count = warn ? h('span') : null;
  const reset = h('button.link.cms-reset', { type: 'button', onclick: () => { el.value = fallback || ''; update(); el.focus(); } }, 'Reset to default');
  const update = (fire = true) => {
    if (count) fill(count, counter(el.value.trim().length, warn));
    reset.hidden = !fallback || el.value.trim() === fallback;
    if (fire) onChange(el.value);
  };
  el.addEventListener('input', () => update());
  update(false);
  return h('div.field', h('div.cms-lab', h('label.label', { for: id }, label), count, reset), el, hint ? h('p.hint', hint) : null);
}

/** Google-style search result for a title, description and URL. */
function snippet() {
  const url = h('span.cms-snip__url');
  const t = h('span.cms-snip__t');
  const d = h('span.cms-snip__d');
  const el = h('div.cms-snip', { 'aria-label': 'Search result preview' }, h('span.cms-snip__site', h('span.cms-snip__ico', { 'aria-hidden': 'true' }, 'N'), h('span', h('b', 'Nimtto'), url)), t, d);
  const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, '')} …` : s);
  return {
    el,
    draw(title, desc, link) {
      let crumbs = link;
      try { const u = new URL(link); crumbs = [u.host, ...u.pathname.split('/').filter(Boolean)].join(' › '); } catch { /* as given */ }
      url.textContent = crumbs;
      t.textContent = cut(title || 'No title', TITLE_MAX + 3);
      d.textContent = cut(desc || 'No description: search engines pick words from the page.', DESC_MAX + 5);
    },
  };
}

/** The questions editor: [{ q, a, group? }] edited in place; onChange() after every change. */
function faqEditor(items, { grouped, onChange }) {
  const list = h('ol.cms-faq');
  const draw = () => {
    fill(list, items.map((x, i) => {
      const q = h('input.input', { id: `cf-q-${i}`, value: x.q, maxlength: 200, oninput: (e) => { x.q = e.target.value; onChange(); } });
      const a = h('textarea.input', { id: `cf-a-${i}`, value: x.a, rows: 3, maxlength: 1500, oninput: (e) => { x.a = e.target.value; onChange(); } });
      const move = (d) => { const j = i + d; if (j < 0 || j >= items.length) return; [items[i], items[j]] = [items[j], items[i]]; draw(); onChange(); list.querySelector(`#cf-q-${j}`)?.focus(); };
      return h('li.cms-faq__i',
        h('div.cms-faq__head', h('span.cms-faq__n', `Question ${i + 1}`),
          h('span.cms-faq__tools',
            iconBtn('up', `Move question ${i + 1} up`, () => move(-1), i === 0 ? 'is-disabled' : ''),
            iconBtn('down', `Move question ${i + 1} down`, () => move(1), i === items.length - 1 ? 'is-disabled' : ''),
            iconBtn('trash', `Remove question ${i + 1}`, () => { if (items.length <= 1) { toast('A page needs at least one question. Use Reset to default instead.', 'error'); return; } items.splice(i, 1); draw(); onChange(); }))),
        grouped ? h('div.field', h('label.label', { for: `cf-g-${i}` }, 'Group heading'), h('input.input', { id: `cf-g-${i}`, value: x.group || '', maxlength: 80, placeholder: 'Same as the question above', oninput: (e) => { x.group = e.target.value; onChange(); } })) : null,
        h('div.field', h('label.label', { for: `cf-q-${i}` }, 'Question'), q),
        h('div.field', h('label.label', { for: `cf-a-${i}` }, 'Answer'), a));
    }));
  };
  draw();
  const add = h('button.btn.btn--add.btn--sm', { type: 'button', onclick: () => {
    if (items.length >= 30) { toast('At most 30 questions on one page.', 'error'); return; }
    items.push({ q: '', a: '', ...(grouped ? { group: items[items.length - 1]?.group || '' } : {}) });
    draw(); onChange(); list.querySelector(`#cf-q-${items.length - 1}`)?.focus();
  } }, icon('plus', 15), 'Add a question');
  return { el: h('div.cms-faqwrap', list, add), redraw: draw };
}

/** The page drawer. onSaved(entry, ver) after a save. */
function pageDrawer(p, state, onSaved) {
  const fb = { title: p.defaults.title, desc: p.defaults.desc, h1: p.base?.h1 || p.defaults.h1, lede: p.base?.lede || p.defaults.lede };
  const e = effective(p);
  const v = { title: e.title, desc: e.desc, h1: e.h1, lede: e.lede, faq: clone(e.faq) };
  let dirty = false;
  const touch = () => { dirty = true; snip.draw(v.title.trim(), v.desc.trim(), p.url); };
  const snip = snippet();
  const faqRows = p.defaults.faq ? faqEditor(v.faq, { grouped: p.defaults.faqGrouped, onChange: touch }) : null;
  const faqReset = h('button.link.cms-reset', { type: 'button', onclick: () => { v.faq.splice(0, v.faq.length, ...clone(p.defaults.faq)); faqRows.redraw(); touch(); } }, 'Reset to default');
  const err = h('p.form-error', { role: 'alert', hidden: true });
  const body = h('div.odr.cms-drawer',
    h('section.odr__sect',
      h('p.odr__name', p.label, h('span.tag', p.siteLabel)),
      h('p.cms-live', h('a', { href: p.url, target: '_blank', rel: 'noopener' }, p.url.replace(/^https?:\/\//, '')),
        h('a.btn.btn--sm', { href: p.path, target: '_blank', rel: 'noopener' }, icon('external', 14), 'View page'))),
    h('section.odr__sect',
      h('h3.odr__h', 'Search result'),
      textBox('cp-title', 'Title', { value: v.title, fallback: fb.title, max: 70, warn: TITLE_MAX, onChange: (x) => { v.title = x; touch(); }, hint: 'Shown as the blue link in Google and on shared links. Up to 60 characters, main words first.' }),
      textBox('cp-desc', 'Description', { value: v.desc, fallback: fb.desc, max: 200, warn: DESC_MAX, multiline: true, rows: 3, onChange: (x) => { v.desc = x; touch(); }, hint: 'The grey lines under the title. 70 to 155 characters.' }),
      snip.el),
    p.defaults.hasH1 || p.defaults.hasLede ? h('section.odr__sect',
      h('h3.odr__h', 'On the page'),
      p.defaults.hasH1 ? textBox('cp-h1', 'Main heading (H1)', { value: v.h1, fallback: fb.h1, max: 160, onChange: (x) => { v.h1 = x; touch(); }, hint: p.base?.h1 ? 'Now the headline from the Website page. Write here to use other words on this page.' : 'Put <em>…</em> round the words shown in italics.' }) : null,
      p.defaults.hasLede ? textBox('cp-lede', 'Intro', { value: v.lede, fallback: fb.lede, max: 600, multiline: true, rows: 4, onChange: (x) => { v.lede = x; touch(); }, hint: 'The line under the heading. You may use <b>, <i> and <a href="https://…">links</a>.' }) : null) : null,
    faqRows ? h('section.odr__sect',
      h('div.cms-lab', h('h3.odr__h', `Questions (${v.faq.length})`), faqReset),
      h('p.hint', icon('info', 14), 'The questions and the FAQ data search engines read always change together. Answers may use <b>, <i> and links; prices written in an answer stay as you type them.'),
      faqRows.el) : null,
    h('section.odr__sect', err));
  snip.draw(v.title, v.desc, p.url);

  const payload = () => ({
    ver: state.ver, path: p.path,
    title: v.title.trim() === fb.title ? '' : v.title.trim(),
    desc: v.desc.trim() === fb.desc ? '' : v.desc.trim(),
    h1: v.h1.trim() === fb.h1 ? '' : v.h1.trim(),
    lede: v.lede.trim() === fb.lede ? '' : v.lede.trim(),
    faq: !faqRows || same(v.faq.map((x) => ({ ...x, q: x.q.trim(), a: x.a.trim() })), p.defaults.faq) ? null : v.faq,
  });
  const save = async (body2 = payload()) => {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    err.hidden = true;
    try {
      const out = await api('/admin/content/page', { method: 'PUT', body: body2 });
      dirty = false;
      onSaved(out.page, out.ver);
      toast('Saved. The page shows it now.', 'success');
      d.close();
    } catch (ex) {
      err.hidden = false;
      fill(err, ex.message, ex.body?.errors?.length ? h('ul', ex.data.errors.slice(0, 6).map((x) => h('li', `${x.path}: ${x.message}`))) : null);
      if (ex.status === 409) toast(ex.message, 'error');
    }
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save page';
  };
  const saveBtn = h('button.btn.btn--primary', { type: 'button', onclick: () => save() }, 'Save page');
  const edited = Object.keys(p.override || {}).length > 0;
  const resetAll = h('button.btn.btn--danger-ghost.btn--sm', { type: 'button', hidden: !edited, onclick: async () => {
    if (!(await confirmDialog({ title: 'Reset this page to its built words?', message: 'The title, description, heading, intro and questions go back to what the website was built with.', confirm: 'Reset page', danger: true }))) return;
    await save({ ver: state.ver, path: p.path, title: '', desc: '', h1: '', lede: '', faq: null });
  } }, 'Reset page');
  const d = openDialog({
    title: `Edit · ${p.label}`, body, cls: 'dialog--drawer cms-dialog',
    actions: [resetAll, h('span.cms-grow'), h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), saveBtn],
  });
  d.el.addEventListener('cancel', (ev) => { if (dirty && !window.confirm('Close without saving your changes?')) ev.preventDefault(); });
  return d;
}

/* ---------------- the page ---------------- */

export function contentPage(ctx) {
  const root = h('div.cms', rowsSkel(6));
  const S = { data: null, ver: 0, market: ctx.params?.get('m') === 'intl' ? 'intl' : 'np', tab: ['contact', 'announce'].includes(ctx.params?.get('t')) ? ctx.params.get('t') : 'pages', q: '', only: false, edits: {}, dirty: { np: false, intl: false } };
  const status = h('span.hint.cms-ver', { 'aria-live': 'polite' });
  const viewSite = h('a.btn', { href: '/', target: '_blank', rel: 'noopener' }, icon('external', 15), 'View site');
  ctx.shell.setPage({ title: 'Content', sub: 'Words on both websites: page titles and descriptions, headings, FAQ, contact, footer and the announcement bar. Changes show on the next page load, no rebuild.', actions: [status, viewSite] });

  const beforeUnload = (e) => { if (S.dirty.np || S.dirty.intl) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);
  ctx.cleanup(() => { window.removeEventListener('beforeunload', beforeUnload); if (S.dirty.np || S.dirty.intl) toast('Your content changes were not saved.', 'error'); });

  const load = () => api('/admin/content').then((data) => {
    S.data = data;
    S.ver = data.ver;
    S.edits = { np: clone(data.sites.np), intl: clone(data.sites.intl) };
    S.dirty = { np: false, intl: false };
    draw();
  });

  const seg = (items, cur, pick, label) => h('div.seg', { role: 'group', 'aria-label': label },
    items.map(([v, t, n]) => h('button.seg__btn', { type: 'button', 'aria-pressed': String(cur === v), onclick: () => pick(v) }, t, n != null ? h('span.seg__n', String(n)) : null)));

  function draw() {
    const data = S.data;
    status.textContent = data.updatedAt ? `Last saved ${fmtRelative(data.updatedAt)}${data.updatedBy ? ` by ${data.updatedBy}` : ''}` : '';
    viewSite.href = S.market === 'intl' ? '/international/' : '/';
    const pages = data.pages.filter((p) => p.site === S.market || p.site === 'both');
    const titles = new Map();
    for (const p of data.pages) { const t = effective(p).title; titles.set(t, (titles.get(t) || 0) + 1); }
    const dupes = new Set([...titles].filter(([, n]) => n > 1).map(([t]) => t));
    const needs = pages.filter((p) => health(p, dupes)[0] !== 'ok').length;
    const head = h('div.toolbar2.cms-bar',
      seg(SITES.map(([v, t]) => [v, t]), S.market, (v) => { S.market = v; draw(); }, 'Website'),
      seg([['pages', 'Pages', pages.length], ['contact', 'Contact & footer'], ['announce', 'Announcement']], S.tab, (v) => { S.tab = v; draw(); }, 'Section'));
    let main;
    if (!data.built) main = quietEmpty('info', 'No built pages found', 'The server reads the pages from the built website (npm run build). Once it is built, every page shows here.');
    else if (S.tab === 'pages') main = pagesTab(pages, dupes, needs);
    else if (S.tab === 'contact') main = contactTab();
    else main = announceTab();
    fill(root, head, main);
  }

  function pagesTab(pages, dupes, needs) {
    const body = h('div');
    const search = h('label.search', icon('search', 15), h('input.input.input--sm', { type: 'search', placeholder: 'Find a page', 'aria-label': 'Find a page', value: S.q, oninput: (e) => { S.q = e.target.value.toLowerCase(); rows(); } }));
    const onlyBtn = h('button.ftab', { type: 'button', 'aria-pressed': String(S.only), onclick: () => { S.only = !S.only; onlyBtn.setAttribute('aria-pressed', String(S.only)); rows(); } }, 'Needs attention', h('span.ftab__n', String(needs)));
    const open = (p) => pageDrawer(p, S, (entry, ver) => {
      S.ver = ver;
      S.data.ver = ver;
      S.data.updatedAt = new Date().toISOString();
      S.data.updatedBy = '';
      const i = S.data.pages.findIndex((x) => x.path === entry.path);
      if (i >= 0) S.data.pages[i] = entry;
      draw();
    });
    const len = (n, max) => h('span.cms-len.tnum', { class: n > max ? 'is-over' : n === 0 ? 'is-none' : '' }, n ? String(n) : '—');
    function rows() {
      const list = pages.filter((p) => (!S.q || `${p.label} ${p.path}`.toLowerCase().includes(S.q)) && (!S.only || health(p, dupes)[0] !== 'ok'));
      const groups = Object.entries(S.data.groups).map(([k, label]) => [label, list.filter((p) => p.group === k)]).filter(([, l]) => l.length);
      fill(body, list.length ? h('table.otable.cms-table',
        h('caption.sr-only', 'Pages'),
        h('thead', h('tr', [['Page', 'cms-c--page'], ['Title', 'cms-c--n'], ['Description', 'cms-c--n'], ['FAQ', 'cms-c--n'], ['SEO health', 'cms-c--seo'], ['', 'cms-c--act']].map(([t, cls]) => h('th', { scope: 'col', class: cls }, t)))),
        groups.map(([label, l]) => h('tbody',
          h('tr.cms-grp', h('th', { scope: 'rowgroup', colspan: 6 }, label, h('span.sect__count', String(l.length)))),
          l.map((p) => {
            const e = effective(p);
            const [tone, words, detail] = health(p, dupes);
            const edited = Object.keys(p.override || {}).length > 0;
            const go = () => open(p);
            return h('tr.orow', { tabindex: 0, 'aria-label': `${p.label}: edit`, onclick: go, onkeydown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } } },
              h('td.cms-c--page', h('b', p.label), edited ? h('span.tag.tag--accent', 'Edited') : null, h('small.cms-path', p.path)),
              h('td.cms-c--n', len(e.title.length, TITLE_MAX)),
              h('td.cms-c--n', len(e.desc.length, DESC_MAX)),
              h('td.cms-c--n', e.faq ? h('span.tnum', String(e.faq.length)) : h('span.ocell__none', '—')),
              h('td.cms-c--seo', st(tone, words, detail)),
              h('td.cms-c--act', h('span.btn.btn--sm.btn--quiet', icon('edit', 14), 'Edit')));
          }))))
        : quietEmpty('search', S.only ? 'Every page looks good' : 'No page matches', S.only ? 'Titles and descriptions are within their lengths and no title is used twice.' : 'Try another word.'));
    }
    rows();
    return [h('div.toolbar2', search, h('div.ftabs', onlyBtn), h('p.toolbar2__note', `Titles up to ${TITLE_MAX} characters, descriptions up to ${DESC_MAX}.`)), body];
  }

  /* ---- Contact & footer, Announcement: one document per website, one save ---- */
  const siteBar = () => {
    const m = S.market;
    const bar = h('div.savebar', { hidden: !S.dirty[m], role: 'region', 'aria-label': 'Unsaved changes' },
      h('span.savebar__t', icon('info', 16), `Unsaved changes to the ${m === 'intl' ? 'International' : 'Nepal'} website.`),
      h('div.row', h('button.btn.btn--sm', { type: 'button', onclick: () => { S.edits[m] = clone(S.data.sites[m]); S.dirty[m] = false; draw(); } }, 'Discard'),
        h('button.btn.btn--sm.btn--primary', { type: 'button', onclick: (e) => saveSite(e.currentTarget) }, 'Save changes')));
    return bar;
  };
  let barEl = null;
  const touchSite = () => { S.dirty[S.market] = true; if (barEl) barEl.hidden = false; };
  async function saveSite(btn) {
    const m = S.market;
    const x = S.edits[m];
    const dflt = S.data.sites[m].defaults;
    const body = {
      ver: S.ver,
      contact: x.contact,
      hours: x.hours === dflt.hours ? '' : x.hours,
      social: x.social,
      footer: { blurb: x.footer.blurb.trim() === dflt.footer.blurb ? '' : x.footer.blurb, payLine: x.footer.payLine.trim() === dflt.footer.payLine ? '' : x.footer.payLine },
      trust: x.trust,
      announce: x.announce,
    };
    btn.disabled = true;
    try {
      const out = await api(`/admin/content/site/${m}`, { method: 'PUT', body });
      S.ver = out.ver;
      S.data.ver = out.ver;
      S.data.sites[m] = out.site;
      S.edits[m] = clone(out.site);
      S.dirty[m] = false;
      S.data.updatedAt = new Date().toISOString();
      S.data.updatedBy = '';
      toast('Saved. The website shows it on the next page load.', 'success');
      draw();
    } catch (ex) {
      btn.disabled = false;
      const list = ex.body?.errors || [];
      toast(list.length ? `${ex.message} ${list.slice(0, 3).map((e) => `${e.path}: ${e.message}`).join('; ')}` : ex.message, 'error');
      if (ex.status === 409) load();
    }
  }

  function contactTab() {
    const m = S.market;
    const x = S.edits[m];
    const fbk = S.data.sites[m].fallback;
    const dflt = S.data.sites[m].defaults;
    const sv = (obj, key) => (val) => { obj[key] = val; touchSite(); };
    const fld = (id, label, obj, key, opts = {}) => textBox(id, label, { value: obj[key], placeholder: opts.placeholder, fallback: opts.fallback, max: opts.max || 300, type: opts.type, multiline: opts.multiline, rows: opts.rows, hint: opts.hint, onChange: sv(obj, key) });
    barEl = siteBar();
    return [
      setting('Contact', m === 'intl' ? 'International website. Empty fields use the Nepal details.' : 'Nepal website: the footer, the contact page and the order flow. Customers message this WhatsApp after ordering.',
        h('div.pair', fld('cc-email', 'Email', x.contact, 'email', { type: 'email', max: 254, placeholder: fbk.email || 'hello@…' }), fld('cc-wa', 'WhatsApp', x.contact, 'whatsapp', { type: 'tel', max: 20, placeholder: fbk.whatsapp || '+977 98…' })),
        h('div.pair', fld('cc-phone', 'Phone', x.contact, 'phone', { type: 'tel', max: 20, placeholder: fbk.phone || '+977 98…' }), fld('cc-hours', 'Hours', x, 'hours', { max: 120, fallback: dflt.hours, placeholder: dflt.hours || 'e.g. Sunday to Friday, 10 am to 6 pm Nepal time', hint: m === 'np' ? 'On the contact page and in the footer.' : 'In the footer.' })),
        fld('cc-addr', 'Address line', x.contact, 'address', { max: 300, placeholder: 'Optional, e.g. Lalitpur, Nepal', hint: 'In the footer and in the business details search engines read.' })),
      setting('Social profiles', 'Full links to your pages. They show in the footer and tell search engines these profiles are yours.',
        h('div.cms-grid2', S.data.social.map(([k, label]) => textBox(`cs-${k}`, label, { value: x.social[k] || '', placeholder: 'https://…', max: 300, type: 'url', onChange: (v) => { if (v.trim()) x.social[k] = v.trim(); else delete x.social[k]; touchSite(); } })))),
      setting('Footer', 'The words under the logo, and the payment line at the bottom of every page.',
        fld('cf-blurb', 'Words under the logo', x.footer, 'blurb', { max: 300, multiline: true, rows: 2, fallback: dflt.footer.blurb }),
        fld('cf-pay', 'Payment line', x.footer, 'payLine', { max: 140, fallback: dflt.footer.payLine })),
      setting('Trust and policy lines', 'Optional short lines in the footer’s bottom row, e.g. “Real designers · Reply within a day”. Links allowed: <a href="/refunds/">refund policy</a>.',
        fld('ct-line', 'Trust line', x.trust, 'line', { max: 160, placeholder: 'Optional' }),
        fld('ct-policy', 'Policy line', x.trust, 'policy', { max: 240, placeholder: 'Optional' })),
      barEl,
    ];
  }

  function announceTab() {
    const m = S.market;
    const a = S.edits[m].announce;
    const live = h('p.cms-anstate');
    const preview = h('div.cms-anprev', { 'aria-hidden': 'true' });
    const today = S.data.today;
    const drawState = () => {
      const on = a.on && a.text.trim();
      const started = !a.from || a.from <= today;
      const ended = a.to && today > a.to;
      fill(live, !on ? st('muted', a.on ? 'Off until it has a message' : 'Off') : ended ? st('muted', `Ended on ${a.to}`) : !started ? st('warn', `Starts on ${a.from}`) : st('ok', a.to ? `Showing now, until ${a.to}` : 'Showing now'));
      fill(preview, a.text.trim() ? h('span', a.text.trim(), a.link.trim() ? h('u', ` ${a.linkText.trim() || 'Find out more'}`) : null) : h('span.muted', 'Your message appears here, above the menu.'));
    };
    const set = (k) => (v) => { a[k] = typeof v === 'string' ? v : v; touchSite(); drawState(); };
    barEl = siteBar();
    const dateIn = (id, label, k) => h('div.field', h('label.label', { for: id }, label), h('input.input', { id, type: 'date', value: a[k] || '', onchange: (e) => set(k)(e.target.value) }));
    drawState();
    return [
      setting('Announcement bar', `A thin line above the menu on every page of the ${m === 'intl' ? 'International' : 'Nepal'} website: a festival offer, holiday hours, news.`,
        toggle({ label: 'Show the bar', hint: 'Only between the dates below, when they are set.', checked: a.on, onChange: (v) => set('on')(v) }),
        live,
        textBox('an-text', 'Message', { value: a.text, max: 160, warn: 120, onChange: set('text'), placeholder: 'e.g. Dashain offer: 20% off every plan until 15 October' }),
        h('div.pair',
          textBox('an-link', 'Link (optional)', { value: a.link, max: 500, type: 'url', onChange: set('link'), placeholder: '/pricing/ or https://…' }),
          textBox('an-lt', 'Link words', { value: a.linkText, max: 40, onChange: set('linkText'), placeholder: 'Find out more' })),
        h('div.pair', dateIn('an-from', 'From (optional)', 'from'), dateIn('an-to', 'Until (optional)', 'to')),
        h('p.hint', icon('info', 14), 'Dates are Nepal days and include both ends.'),
        h('div.field', h('span.label', 'Preview'), preview)),
      barEl,
    ];
  }

  load().catch((err) => fill(root, quietEmpty('alert', err.status === 403 ? 'You do not have access to Content' : 'Could not load the content', err.message)));
  return root;
}
