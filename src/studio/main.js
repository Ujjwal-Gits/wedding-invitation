// Sayapatri Studio: sign in, list invitations, edit, preview, publish, share, read replies.
import { h, icon, iconBtn, clear, append, toast, openDialog, confirmDialog, fmtDate, fmtRelative } from './dom.js';
import { api, setCsrf, whenSignedOut, ApiError } from './api.js';
import { createModel, pathStr } from './fields.js';
import { SECTIONS } from './sections.js';
import { responsesView } from './responses.js';
import { photoUrl } from '../photos.js';

const app = document.getElementById('app');
const S = { me: null, meta: null, editor: null };
const label = (v, f = '') => (v && (v.en || v.ne)) || f;
const coupleName = (b, g) => [label(b), label(g)].filter(Boolean).join(' & ') || 'Untitled invitation';

whenSignedOut(() => { if (S.me) { S.me = null; toast('Your session ended. Please sign in again.', 'error'); } go('#/login'); });

// ── Routing ───────────────────────────────────────────────────────────────

const go = (hash) => { if (location.hash !== hash) location.hash = hash; else route(); };
window.addEventListener('hashchange', () => route());

async function route() {
  const hash = location.hash || '#/';
  if (S.editor && !hash.startsWith(`#/i/${S.editor.slug}/`)) {
    await S.editor.flush();
    S.editor.destroy();
    S.editor = null;
  }
  if (!S.me) {
    try {
      const me = await api('/auth/me');
      S.me = me;
      setCsrf(me.csrf);
    } catch {
      return renderLogin();
    }
  }
  if (hash === '#/login') return go('#/');
  if (!S.meta) {
    try { S.meta = await api('/meta'); } catch (err) { return fatal(err); }
  }
  const m = /^#\/i\/([a-z0-9-]{3,64})\/([a-z-]+)$/.exec(hash);
  if (m) {
    if (S.editor?.slug === m[1]) return S.editor.show(m[2]);
    return openEditor(m[1], m[2]);
  }
  return renderList();
}

function fatal(err) {
  clear(app).append(h('div.center', h('p.notice.notice--error', err.message), h('button.btn', { type: 'button', onclick: () => location.reload() }, 'Try again')));
}

// ── Shell ─────────────────────────────────────────────────────────────────

function topbar(crumb) {
  return h('header.topbar',
    h('a.brand', { href: '#/' }, h('span.brand__mark', { 'aria-hidden': 'true' }), h('span.brand__name', 'Sayapatri'), h('span.brand__sub', 'Studio')),
    crumb ? h('nav.crumbs', { 'aria-label': 'Breadcrumb' }, h('a', { href: '#/' }, 'Invitations'), h('span', { 'aria-hidden': 'true' }, '/'), h('span', { 'aria-current': 'page' }, crumb)) : null,
    h('div.topbar__right',
      h('span.topbar__user', S.me.email),
      h('button.btn.btn--quiet.btn--sm', { type: 'button', onclick: signOut }, 'Sign out'),
    ),
  );
}

async function signOut() {
  if (S.editor) { await S.editor.flush(); S.editor.destroy(); S.editor = null; }
  try { await api('/auth/logout', { method: 'POST' }); } catch { /* already gone */ }
  S.me = null;
  setCsrf('');
  location.hash = '#/login';
}

// ── Login ─────────────────────────────────────────────────────────────────

function renderLogin() {
  document.title = 'Sign in · Sayapatri Studio';
  const err = h('p.form-error', { role: 'alert' });
  const btn = h('button.btn.btn--primary.btn--block', { type: 'submit' }, 'Sign in');
  const form = h('form.login__form', { novalidate: true },
    h('div.field', h('label.label', { for: 'email' }, 'Email'), h('input.input', { id: 'email', name: 'email', type: 'email', autocomplete: 'username', required: true, maxlength: 254 })),
    h('div.field', h('label.label', { for: 'password' }, 'Password'), h('input.input', { id: 'password', name: 'password', type: 'password', autocomplete: 'current-password', required: true, maxlength: 1024 })),
    err, btn,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const fd = new FormData(form);
    if (!fd.get('email') || !fd.get('password')) { err.textContent = 'Enter your email and password.'; return; }
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
      const me = await api('/auth/login', { method: 'POST', body: { email: fd.get('email'), password: fd.get('password') } });
      S.me = me;
      setCsrf(me.csrf);
      location.hash = '#/';
      route();
    } catch (ex) {
      err.textContent = ex.message;
      form.querySelector('#password').value = '';
      form.querySelector('#password').focus();
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  });
  clear(app).append(h('main.login',
    h('div.login__art', { 'aria-hidden': 'true' }, h('img', { src: '/photos/marigold-garland-lg.webp', alt: '' })),
    h('div.login__panel',
      h('div.login__inner',
        h('a.brand.brand--lg', { href: '#/' }, h('span.brand__mark', { 'aria-hidden': 'true' }), h('span.brand__name', 'Sayapatri'), h('span.brand__sub', 'Studio')),
        h('h1.login__title', 'Welcome back'),
        h('p.login__lede', 'Sign in to make and manage wedding invitations.'),
        form,
      ),
    ),
  ));
  form.querySelector('#email').focus();
}

// ── Invitations list ──────────────────────────────────────────────────────

async function renderList() {
  document.title = 'Invitations · Sayapatri Studio';
  const body = h('main.page', { id: 'main' }, h('p.boot', 'Loading invitations…'));
  clear(app).append(topbar(), body);
  let items;
  try {
    ({ invitations: items } = await api('/invitations'));
  } catch (err) {
    clear(body).append(h('p.notice.notice--error', err.message));
    return;
  }
  const themeName = Object.fromEntries(S.meta.themes.map((t) => [t.slug, t.name]));
  const live = items.filter((i) => i.status === 'published').length;
  const replies = items.reduce((n, i) => n + i.rsvpCount, 0);

  const head = h('header.page__head',
    h('div',
      h('h1.page__title', 'Invitations'),
      h('p.page__meta', items.length ? `${items.length} invitation${items.length === 1 ? '' : 's'} · ${live} live · ${replies} repl${replies === 1 ? 'y' : 'ies'}` : 'Nothing here yet.'),
    ),
    h('button.btn.btn--primary', { type: 'button', onclick: newInvitation }, icon('plus', 16), 'New invitation'),
  );

  const status = (i) => i.status === 'published'
    ? h('span.pill', { class: i.changed ? 'pill--warn' : 'pill--ok' }, i.changed ? 'Live · edits not published' : 'Live')
    : h('span.pill.pill--muted', 'Draft');

  const list = items.length
    ? h('ul.invlist', items.map((i) => h('li.inv',
      h('a.inv__link', { href: `#/i/${i.slug}/couple` },
        h('span.inv__thumb', i.hero ? h('img', { src: photoUrl(i.hero, 'sm'), alt: '', loading: 'lazy', decoding: 'async' }) : null),
        h('span.inv__main', h('span.inv__names', coupleName(i.bride, i.groom)), h('span.inv__slug', `/${i.slug}`)),
        h('span.inv__col', h('span.inv__k', 'Wedding'), h('span.inv__v', fmtDate(i.weddingDate))),
        h('span.inv__col', h('span.inv__k', 'Theme'), h('span.inv__v', themeName[i.theme] || i.theme)),
        h('span.inv__col', h('span.inv__k', 'Replies'), h('span.inv__v', String(i.rsvpCount))),
        h('span.inv__col.inv__col--status', status(i), h('span.inv__time', `Edited ${fmtRelative(i.updatedAt)}`)),
      ),
    )))
    : h('div.empty',
      h('h2.empty__title', 'Make the first invitation'),
      h('p', 'Start from sample wording and swap in the couple’s names, ceremonies and photos. Nothing is public until you publish.'),
      h('button.btn.btn--primary', { type: 'button', onclick: newInvitation }, icon('plus', 16), 'New invitation'),
    );
  clear(body).append(head, list);
}

function slugify(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
}

function newInvitation() {
  let slugTouched = false;
  const err = h('p.form-error', { role: 'alert' });
  const bride = h('input.input', { id: 'n-bride', maxlength: 60, autocomplete: 'off', required: true, placeholder: 'Aarati' });
  const groom = h('input.input', { id: 'n-groom', maxlength: 60, autocomplete: 'off', required: true, placeholder: 'Sameer' });
  const slug = h('input.input', { id: 'n-slug', maxlength: 64, autocomplete: 'off', required: true, pattern: '[a-z0-9-]{3,64}', 'aria-describedby': 'n-slug-hint', spellcheck: 'false' });
  const theme = h('select.input', { id: 'n-theme' }, S.meta.themes.map((t) => h('option', { value: t.slug }, `${t.name}: ${t.concept.split(':')[0]}`)));
  const sample = h('input', { type: 'checkbox', id: 'n-sample', checked: true });
  const auto = () => { if (!slugTouched) slug.value = slugify(`${bride.value} ${groom.value}`.trim().replace(/\s+/g, ' ')).replace(/^(.+)-(.+)$/, '$1-$2'); };
  bride.addEventListener('input', auto);
  groom.addEventListener('input', auto);
  slug.addEventListener('input', () => { slugTouched = true; slug.value = slug.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'); });

  const submit = h('button.btn.btn--primary', { type: 'submit', form: 'new-inv' }, 'Create invitation');
  const form = h('form#new-inv.stack', { novalidate: true },
    h('div.split',
      h('div.field', h('label.label', { for: 'n-bride' }, 'Bride’s first name'), bride),
      h('div.field', h('label.label', { for: 'n-groom' }, 'Groom’s first name'), groom),
    ),
    h('div.field', h('label.label', { for: 'n-slug' }, 'Link name'), h('p.hint', { id: 'n-slug-hint' }, 'Part of the web address. Lowercase letters, numbers and hyphens; cannot be changed later.'),
      h('div.prefix', h('span.prefix__text', `${location.host}/…/?id=`), slug)),
    h('div.field', h('label.label', { for: 'n-theme' }, 'Theme'), theme),
    h('label.checkline', sample, h('span', h('b', 'Start with sample wording'), h('small', 'Traditional card text, four ceremonies and placeholder photos to replace.'))),
    err,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    if (!bride.value.trim() || !groom.value.trim()) { err.textContent = 'Please enter both first names.'; return; }
    if (!/^[a-z0-9-]{3,64}$/.test(slug.value)) { err.textContent = 'The link name needs 3 to 64 lowercase letters, numbers or hyphens.'; slug.focus(); return; }
    submit.disabled = true;
    try {
      const doc = await api('/invitations', { method: 'POST', body: { bride: bride.value, groom: groom.value, slug: slug.value, theme: theme.value, sample: sample.checked } });
      d.close();
      toast('Invitation created', 'success');
      go(`#/i/${doc.slug}/couple`);
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      submit.disabled = false;
    }
  });
  const d = openDialog({ title: 'New invitation', body: form, actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), submit] });
  bride.focus();
}

// ── Editor ────────────────────────────────────────────────────────────────

const SECTION_OF = [
  [/^couple|^hosts/, 'couple'], [/^weddingDate|^city/, 'date'], [/^events/, 'ceremonies'], [/^story/, 'story'],
  [/^gallery/, 'gallery'], [/^invitation|^closing|^saptapadi/, 'wording'], [/^music/, 'music'], [/^themeContent/, 'content'], [/^theme$/, 'theme'],
  [/^info/, 'info'], [/^rsvp/, 'rsvp'], [/^share/, 'share'],
];
const sectionFor = (p) => SECTION_OF.find(([re]) => re.test(p))?.[1] || 'couple';

async function openEditor(slug, sectionId) {
  clear(app).append(topbar('…'), h('main.page', h('p.boot', 'Opening the invitation…')));
  let doc;
  try {
    doc = await api(`/invitations/${slug}`);
  } catch (err) {
    clear(app).append(topbar('Not found'), h('main.page', h('p.notice.notice--error', err.message), h('a.btn', { href: '#/' }, 'Back to invitations')));
    return;
  }
  S.editor = createEditor(doc);
  S.editor.show(sectionId);
}

function createEditor(doc) {
  const slug = doc.slug;
  let version = doc.version;
  let current = 'couple';
  let saveTimer = null;
  let inflight = null;
  let pending = false;
  let lastErrors = [];
  let device = 'phone';
  let autoRefresh = true;
  let refreshTimer = null;

  // ── Save status
  const saveState = h('span.savestate', { 'aria-live': 'polite' }, 'All changes saved');
  const setSave = (kind, text) => { saveState.dataset.state = kind; saveState.textContent = text; };

  const m = createModel(doc.data, (path) => {
    pending = true;
    setSave('dirty', 'Unsaved changes');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 700);
    if (path[0] === 'couple' && path[2] === 'name') titleEl.textContent = coupleName(m.data.couple.bride.name, m.data.couple.groom.name);
  });

  async function save() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (inflight) await inflight;
    if (!pending || inflight) return;
    pending = false;
    setSave('saving', 'Saving…');
    inflight = (async () => {
      try {
        const out = await api(`/invitations/${slug}`, { method: 'PUT', body: { version, data: m.data } });
        version = out.version;
        doc.changed = out.changed;
        doc.updatedAt = out.updatedAt;
        mergeDepth(m.data, out.data);
        if (lastErrors.length) { lastErrors = []; renderErrors(); }
        if (!pending) setSave('saved', 'All changes saved');
        renderStatus();
        if (autoRefresh) { clearTimeout(refreshTimer); refreshTimer = setTimeout(() => refreshPreview(), 900); }
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          setSave('error', 'Changed elsewhere');
          openDialog({ title: 'This invitation changed in another tab', body: h('p.dialog__text', 'To avoid overwriting those changes, reload to get the latest version.'), actions: [h('button.btn.btn--primary', { type: 'button', onclick: () => location.reload() }, 'Reload')] });
        } else if (err instanceof ApiError && err.status === 400 && err.body.errors) {
          lastErrors = err.body.errors;
          setSave('error', 'Some fields need attention');
          renderErrors();
        } else if (err instanceof ApiError && err.status === 401) {
          pending = true;
        } else {
          pending = true;
          setSave('error', 'Not saved · retrying');
          saveTimer = setTimeout(save, 4000);
        }
      } finally {
        inflight = null;
      }
    })();
    await inflight;
  }

  /** Server adds depth maps to uploaded photos in the background; keep them in the local copy. */
  function mergeDepth(local, remote) {
    if (!local || !remote || typeof local !== 'object' || typeof remote !== 'object') return;
    if (local.lg && local.lg === remote.lg && remote.depth && !local.depth) local.depth = remote.depth;
    for (const k of Object.keys(local)) if (local[k] && typeof local[k] === 'object') mergeDepth(local[k], remote[k]);
  }

  const flush = async () => { for (let i = 0; i < 3 && (pending || inflight); i++) await (inflight || save()); };
  const beforeUnload = (e) => { if (pending || inflight) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);

  // ── Header
  const titleEl = h('h1.ed__title', coupleName(doc.data.couple.bride.name, doc.data.couple.groom.name));
  const statusEl = h('span.ed__status');
  const actionsEl = h('div.ed__actions');

  function renderStatus() {
    clear(statusEl).append(doc.status === 'published'
      ? h('span.pill', { class: doc.changed ? 'pill--warn' : 'pill--ok' }, doc.changed ? 'Live · edits not published' : 'Live')
      : h('span.pill.pill--muted', 'Draft'));
    append(clear(actionsEl), [
      h('button.btn.ed__preview-toggle', { type: 'button', onclick: () => togglePreview(!root.classList.contains('show-preview')), 'aria-controls': 'preview' }, icon('eye', 16), 'Preview'),
      h('a.btn', { href: `#/i/${slug}/share` }, icon('link', 16), 'Share'),
      doc.status === 'published'
        ? h('button.btn.btn--quiet', { type: 'button', onclick: unpublish }, 'Unpublish')
        : null,
      doc.status === 'published' && !doc.changed
        ? h('button.btn.btn--done', { type: 'button', disabled: true }, icon('check', 16), 'Published')
        : h('button.btn.btn--primary', { type: 'button', onclick: publish }, doc.status !== 'published' ? 'Publish' : 'Publish changes'),
    ]);
  }

  async function publish() {
    await flush();
    if (lastErrors.length) { toast('Fix the highlighted fields first.', 'error'); return; }
    try {
      const out = await api(`/invitations/${slug}/publish`, { method: 'POST' });
      Object.assign(doc, { status: out.status, changed: out.changed, publishedAt: out.publishedAt });
      version = out.version;
      renderStatus();
      toast('Published. The invitation is live.', 'success');
      if (current === 'share') show('share', true);
    } catch (err) {
      if (err.body?.problems) {
        openDialog({
          title: 'Almost ready to publish',
          body: [h('p.dialog__text', 'Please add these first:'), h('ul.problems', err.body.problems.map((p) => h('li', p)))],
          actions: [h('button.btn.btn--primary', { type: 'button', onclick: (e) => e.target.closest('dialog').close() }, 'OK')],
        });
      } else toast(err.message, 'error');
    }
  }

  async function unpublish() {
    const ok = await confirmDialog({ title: 'Unpublish this invitation?', message: 'Guests opening the link will see “not found” until you publish again. Replies already received are kept.', confirm: 'Unpublish', danger: true });
    if (!ok) return;
    try {
      const out = await api(`/invitations/${slug}/unpublish`, { method: 'POST' });
      Object.assign(doc, { status: out.status, changed: false });
      version = out.version;
      renderStatus();
      toast('Unpublished', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }

  async function deleteInvitation() {
    const input = h('input.input', { id: 'del-confirm', autocomplete: 'off', spellcheck: 'false' });
    const err = h('p.form-error', { role: 'alert' });
    const btn = h('button.btn.btn--danger', { type: 'button', onclick: async () => {
      if (input.value !== slug) { err.textContent = 'The link name does not match.'; return; }
      try {
        await api(`/invitations/${slug}`, { method: 'DELETE', body: { confirm: slug } });
        pending = false;
        d.close();
        toast('Invitation deleted', 'success');
        go('#/');
      } catch (ex) { err.textContent = ex.message; }
    } }, 'Delete invitation');
    const d = openDialog({
      title: 'Delete this invitation?',
      body: [h('p.dialog__text', 'The invitation, its photos and its replies are moved to the server’s trash folder and the link stops working.'),
        h('div.field', h('label.label', { for: 'del-confirm' }, `Type ${slug} to confirm`), input), err],
      actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), btn],
    });
    input.focus();
  }

  // ── Layout
  const nav = h('nav.ed__nav', { 'aria-label': 'Sections' });
  const form = h('div.ed__form', { id: 'main', tabindex: -1 });
  const errorsEl = h('div.ed__errors', { hidden: true, role: 'alert' });

  // Preview
  const iframe = h('iframe.preview__frame', { title: 'Live preview of the invitation', loading: 'lazy' });
  const deviceEl = h('div.preview__device', iframe);
  const stage = h('div.preview__stage', deviceEl);
  const devBtn = (d, name) => h('button.seg__btn', { type: 'button', 'aria-pressed': String(device === d), onclick: (e) => { device = d; e.target.closest('.seg').querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget))); fit(); } }, icon(d, 16), name);
  const previewUrl = () => `/${m.data.theme}/?id=${encodeURIComponent(slug)}`;
  const openLink = h('a.btn.btn--icon', { href: previewUrl(), target: '_blank', rel: 'noopener', 'aria-label': 'Open preview in a new tab', title: 'Open preview in a new tab' }, icon('external'));
  const preview = h('aside.preview', { id: 'preview', 'aria-label': 'Preview' },
    h('div.preview__bar',
      h('div.seg', { role: 'group', 'aria-label': 'Preview size' }, devBtn('phone', 'Phone'), devBtn('desktop', 'Desktop')),
      h('label.preview__auto', h('input', { type: 'checkbox', checked: autoRefresh, onchange: (e) => { autoRefresh = e.target.checked; } }), 'Auto-refresh'),
      iconBtn('refresh', 'Refresh preview', () => refreshPreview()),
      openLink,
      iconBtn('close', 'Close preview', () => togglePreview(false), 'preview__close'),
    ),
    stage,
    h('p.preview__note', 'Preview shows your latest saved edits. Guests see the published version.'),
  );

  // The preview runs a full theme (often WebGL), so it only loads while it is actually on screen.
  let previewVer = 0;
  const narrow = matchMedia('(max-width: 1199px)');
  const previewVisible = () => current !== 'responses' && (!narrow.matches || root.classList.contains('show-preview'));
  function refreshPreview() {
    openLink.href = previewUrl();
    if (!previewVisible()) {
      if (iframe.getAttribute('src') !== 'about:blank') iframe.src = 'about:blank';
      return;
    }
    previewVer += 1;
    iframe.src = `${previewUrl()}&studio=${previewVer}`;
  }
  const togglePreview = (on) => {
    root.classList.toggle('show-preview', on);
    refreshPreview();
    requestAnimationFrame(fit);
  };
  const onNarrow = () => refreshPreview();
  narrow.addEventListener('change', onNarrow);

  function fit() {
    const W = device === 'phone' ? 390 : 1440;
    const H = device === 'phone' ? 844 : 900;
    const r = stage.getBoundingClientRect();
    if (!r.width) return;
    const s = Math.min((r.width - 24) / W, (r.height - 24) / H, 1);
    deviceEl.style.width = `${W}px`;
    deviceEl.style.height = `${H}px`;
    deviceEl.style.transform = `translate(-50%, -50%) scale(${s})`;
    deviceEl.dataset.device = device;
  }
  const ro = new ResizeObserver(fit);
  ro.observe(stage);

  const root = h('div.ed',
    topbar(coupleName(doc.data.couple.bride.name, doc.data.couple.groom.name)),
    h('div.ed__grid',
      nav,
      h('div.ed__center',
        h('header.ed__head',
          h('div.ed__id', titleEl, h('div.ed__sub', statusEl, h('span.ed__slug', `/${slug}`), saveState)),
          actionsEl,
        ),
        errorsEl,
        form,
      ),
      preview,
    ),
  );

  function renderNav() {
    clear(nav).append(
      h('ul.ed__navlist',
        SECTIONS.map((s) => h('li', h('a.ed__navlink', { href: `#/i/${slug}/${s.id}`, 'aria-current': current === s.id ? 'page' : undefined, class: lastErrors.some((e) => sectionFor(e.path) === s.id) ? 'has-error' : '' }, s.name))),
        h('li.ed__navsep', { 'aria-hidden': 'true' }),
        h('li', h('a.ed__navlink', { href: `#/i/${slug}/responses`, 'aria-current': current === 'responses' ? 'page' : undefined }, 'Responses')),
      ),
      h('button.btn.btn--quiet.btn--sm.ed__delete', { type: 'button', onclick: deleteInvitation }, icon('trash', 14), 'Delete invitation'),
    );
    nav.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function renderErrors() {
    form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field__err').forEach((el) => el.remove());
    renderNav();
    if (!lastErrors.length) { errorsEl.hidden = true; return; }
    errorsEl.hidden = false;
    clear(errorsEl).append(
      h('p', h('b', 'Not saved: '), 'some fields need attention.'),
      h('ul', lastErrors.slice(0, 6).map((e) => h('li', h('a', { href: `#/i/${slug}/${sectionFor(e.path)}`, onclick: () => setTimeout(() => markErrors(), 50) }, `${e.path.replace(/\[(\d+)\]/g, (_, n) => ` ${Number(n) + 1}`).replace(/\./g, ' › ')}: ${e.message}`)))),
    );
    markErrors();
  }

  function markErrors() {
    for (const e of lastErrors) {
      const el = form.querySelector(`[data-path="${CSS.escape(e.path)}"]`);
      if (!el) continue;
      el.setAttribute('aria-invalid', 'true');
      const host = el.closest('.bi__col, .field, .photo') || el.parentElement;
      if (!host.querySelector('.field__err')) host.append(h('p.field__err', e.message));
    }
  }

  const ctx = {
    m, slug, meta: S.meta, doc,
    onTheme: () => { refreshPreview(); },
    shareUrl: () => {
      const base = S.meta.publicOrigin || location.origin;
      // Production serves /i/<slug>, which always redirects to the current theme.
      return S.meta.shortLinks ? `${base}/i/${slug}` : `${base}/${m.data.theme}/?id=${slug}`;
    },
  };

  function show(id, force = false) {
    const valid = id === 'responses' || SECTIONS.some((s) => s.id === id);
    if (!valid) { go(`#/i/${slug}/couple`); return; }
    if (!app.contains(root)) {
      clear(app).append(root);
      renderStatus();
      refreshPreview();
      requestAnimationFrame(fit);
    }
    if (current === id && form.firstChild && !force) return;
    current = id;
    const sec = SECTIONS.find((s) => s.id === id);
    document.title = `${sec ? sec.name : 'Responses'} · ${coupleName(m.data.couple.bride.name, m.data.couple.groom.name)} · Studio`;
    clear(form).append(id === 'responses' ? responsesView(ctx) : sec.render(ctx));
    const wasResponses = root.classList.contains('is-responses');
    root.classList.toggle('is-responses', id === 'responses');
    if (wasResponses !== (id === 'responses')) refreshPreview();
    renderNav();
    markErrors();
    form.scrollTop = 0;
    window.scrollTo({ top: 0 });
    requestAnimationFrame(fit);
  }

  return {
    slug,
    show,
    flush,
    destroy() {
      ro.disconnect();
      narrow.removeEventListener('change', onNarrow);
      iframe.src = 'about:blank';
      clearTimeout(refreshTimer);
      window.removeEventListener('beforeunload', beforeUnload);
    },
  };
}

route();
