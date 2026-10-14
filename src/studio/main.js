// Nimtto Studio: a simple, guided tool for wedding planners.
// Home (invitation cards) → a six-step editor (autosaved) → replies.
import { h, icon, clear, toast, openDialog, confirmDialog, fmtDate } from './dom.js';
import { api, setCsrf, whenSignedOut, ApiError } from './api.js';
import { createModel } from './fields.js';
import { STEPS } from './steps.js';
import { responsesView } from './responses.js';
import { shareDialog } from './publish.js';
import { photoUrl } from '../photos.js';
import { CREDIT_GROUPS } from '../core/asset-credits.js';

const app = document.getElementById('app');
const S = { me: null, meta: null, editor: null };
const label = (v, f = '') => (v && (v.en || v.ne)) || f;
const coupleName = (b, g) => [label(b), label(g)].filter(Boolean).join(' & ') || 'Untitled invitation';

whenSignedOut(() => {
  const wasCouple = S.me?.role === 'client';
  S.me = null;
  if (wasCouple) { renderLinkProblem(); return; }
  toast('Please sign in again.', 'error');
  go('#/login');
});

/** Remembers on this device that the studio was opened through a couple's link (convenience only). */
function coupleFlag(set) {
  try {
    if (set === true) localStorage.setItem('sayapatri-couple', '1');
    else if (set === false) localStorage.removeItem('sayapatri-couple');
    else return localStorage.getItem('sayapatri-couple') === '1';
  } catch { /* storage unavailable */ }
  return false;
}

/** Shown to a couple whose link was turned off or replaced. */
function renderLinkProblem(message = 'This link is no longer active. Please ask your wedding planner for a new one.', heading = 'This link has expired') {
  document.title = 'Nimtto';
  clear(app).append(h('main.login.login--msg',
    h('div.login__panel', h('div.login__inner',
      h('span.brand.brand--lg', h('span.brand__mark', { 'aria-hidden': 'true' }), h('span.brand__name', 'Nimtto')),
      h('h1.login__title', heading),
      h('p.login__lede', message),
      h('button.link', { type: 'button', onclick: () => { coupleFlag(false); renderLogin(); } }, 'I am the planner: sign in')))));
}

// ── Routing ───────────────────────────────────────────────────────────────

const go = (hash) => { if (location.hash !== hash) location.hash = hash; else route(); };
window.addEventListener('hashchange', () => route());

async function route() {
  const hash = location.hash || '#/';
  // The couple's private link: trade the token for a session, then drop it from the address bar.
  const cm = /^#\/c\/([A-Za-z0-9_-]{43})$/.exec(hash);
  if (cm) {
    try {
      const s = await api('/client/session', { method: 'POST', body: { token: cm[1] } });
      S.me = s;
      setCsrf(s.csrf);
      coupleFlag(true);
      history.replaceState(null, '', `#/i/${s.slug}/theme`);
    } catch (err) {
      return err.status === 429 ? renderLinkProblem(err.message, 'Please wait a moment') : renderLinkProblem();
    }
    return route();
  }
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
      // A couple whose link was turned off sees a plain message, not the planner's sign-in page.
      return coupleFlag() ? renderLinkProblem() : renderLogin();
    }
  }
  if (S.me.role === 'client' && !hash.startsWith(`#/i/${S.me.slug}/`)) return go(`#/i/${S.me.slug}/theme`);
  if (hash === '#/login') return go('#/');
  if (hash === '#/credits') return S.me.role === 'admin' ? renderCredits() : go('#/');
  try { S.meta = await api('/meta'); } catch (err) { if (!S.meta) return fatal(err); } // theme list can grow at any time
  const m = /^#\/i\/([a-z0-9-]{3,64})\/([a-z-]+)$/.exec(hash);
  if (m) {
    if (S.editor?.slug === m[1]) return S.editor.show(m[2]);
    return openEditor(m[1], m[2]);
  }
  return renderHome();
}

function fatal(err) {
  clear(app).append(h('div.center', h('p.notice.notice--error', err.message), h('button.btn', { type: 'button', onclick: () => location.reload() }, 'Try again')));
}

function topbar(extra) {
  return h('header.topbar',
    h('a.brand', { href: '#/' }, h('span.brand__mark', { 'aria-hidden': 'true' }), h('span.brand__name', 'Nimtto'), h('span.brand__sub', 'Studio')),
    extra || null,
    h('div.topbar__right',
      S.me.role === 'admin' ? h('a.topbar__link', { href: '#/credits', 'aria-current': location.hash === '#/credits' ? 'page' : null }, 'Credits') : null,
      S.me.role === 'admin' ? h('span.topbar__user', S.me.email) : null,
      h('button.btn.btn--quiet.btn--sm', { type: 'button', onclick: signOut }, 'Sign out'),
    ),
  );
}

async function signOut() {
  if (S.editor) { await S.editor.flush(); S.editor.destroy(); S.editor = null; }
  try { await api('/auth/logout', { method: 'POST' }); } catch { /* already gone */ }
  const wasCouple = S.me?.role === 'client';
  S.me = null;
  setCsrf('');
  if (wasCouple) { renderLinkProblem('You are signed out. Open your link again to continue.'); return; }
  location.hash = '#/login';
}

// ── Sign in ───────────────────────────────────────────────────────────────

function renderLogin() {
  document.title = 'Sign in · Nimtto Studio';
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
      coupleFlag(false);
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
        h('a.brand.brand--lg', { href: '#/' }, h('span.brand__mark', { 'aria-hidden': 'true' }), h('span.brand__name', 'Nimtto'), h('span.brand__sub', 'Studio')),
        h('h1.login__title', 'Welcome back'),
        h('p.login__lede', 'Sign in to make and share wedding invitations.'),
        form,
      ),
    ),
  ));
  form.querySelector('#email').focus();
}

// ── Home ──────────────────────────────────────────────────────────────────

async function renderHome() {
  document.title = 'Invitations · Nimtto Studio';
  const body = h('main.home', { id: 'main' }, h('p.boot', 'Loading…'));
  clear(app).append(topbar(), body);
  let items;
  try {
    ({ invitations: items } = await api('/invitations'));
  } catch (err) {
    clear(body).append(h('p.notice.notice--error', err.message));
    return;
  }
  const themeName = Object.fromEntries(S.meta.themes.map((t) => [t.slug, t.name]));
  const head = h('header.home__head',
    h('div', h('h1.home__title', 'Invitations'), h('p.home__meta', items.length ? `${items.length} invitation${items.length === 1 ? '' : 's'}` : '')),
    h('button.btn.btn--primary.btn--lg', { type: 'button', onclick: newInvitation }, icon('plus', 18), 'New invitation'),
  );
  const status = (i) => (i.status === 'published'
    ? h('span.pill', { class: i.changed ? 'pill--warn' : 'pill--ok' }, i.changed ? 'Live · unpublished changes' : 'Live')
    : h('span.pill.pill--muted', 'Draft'));

  const cards = items.map((i) => {
    const names = coupleName(i.bride, i.groom);
    return h('article.icard',
      h('a.icard__photo', { href: `#/i/${i.slug}/theme`, tabindex: -1, 'aria-hidden': 'true' },
        i.hero ? h('img', { src: photoUrl(i.hero, 'sm'), alt: '', loading: 'lazy', decoding: 'async' }) : h('span.icard__ph', icon('image', 28)),
        h('span.icard__status', status(i))),
      h('div.icard__body',
        h('h2.icard__names', names),
        h('p.icard__date', fmtDate(i.weddingDate, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })),
        h('p.icard__meta', h('span', `${themeName[i.theme] || i.theme} theme`), h('span', { 'aria-hidden': 'true' }, '·'),
          h('a', { href: `#/i/${i.slug}/replies` }, `${i.rsvpCount} repl${i.rsvpCount === 1 ? 'y' : 'ies'}`)),
        h('div.icard__actions',
          h('a.btn.btn--primary', { href: `#/i/${i.slug}/theme` }, 'Edit'),
          h('button.btn', { type: 'button', onclick: async () => {
            const doc = await api(`/invitations/${i.slug}`).catch(() => null);
            shareDialog({ meta: S.meta, slug: i.slug, theme: i.theme, names, events: doc?.data.events || [], live: i.status === 'published' });
          } }, icon('send', 16), 'Share'),
        ),
      ),
    );
  });
  clear(body).append(head, items.length
    ? h('div.icards', cards)
    : h('div.empty',
      h('h2.empty__title', 'Make your first invitation'),
      h('p', 'Six short steps: the couple, the dates, a theme, your own touches, music, and share.'),
      h('button.btn.btn--primary.btn--lg', { type: 'button', onclick: newInvitation }, icon('plus', 18), 'New invitation')));
}

// ── Credits (planner only) ────────────────────────────────────────────────

/** Every photo, flower and track the themes use, with author, licence and source. Guests never see this. */
function renderCredits() {
  document.title = 'Credits · Nimtto Studio';
  const ext = (href, text) => (href ? h('a', { href, target: '_blank', rel: 'noopener' }, text) : text);
  const groups = CREDIT_GROUPS.map((g) => h('section.card.credits', { 'aria-labelledby': `cr-${g.id}` },
    h('h2.card__title', { id: `cr-${g.id}` }, g.title, h('span.credits__count', ` ${g.items.length}`)),
    h('div.credits__scroll', h('table.credits__table',
      h('thead', h('tr', h('th', { scope: 'col' }, 'Title'), h('th', { scope: 'col' }, 'Author'), h('th', { scope: 'col' }, 'Licence'), h('th', { scope: 'col' }, 'Source'))),
      h('tbody', g.items.map((k) => h('tr',
        h('td', k.title, k.usedIn?.length ? h('small.credits__used', `Used in ${k.usedIn.join(', ')}`) : null),
        h('td', k.author || '—'),
        h('td', ext(k.licenseUrl, k.license || 'See source')),
        h('td', k.sourceUrl ? ext(k.sourceUrl, (() => { try { return new URL(k.sourceUrl).hostname.replace(/^www./, ''); } catch { return 'Source'; } })()) : '—'),
      ))),
    )),
  ));
  clear(app).append(topbar(), h('main.home', { id: 'main' },
    h('header.home__head', h('div',
      h('h1.home__title', 'Credits'),
      h('p.home__meta', 'Every photo, flower and track in the themes. Invitations never show these; the same list is public at ', h('a', { href: '/credits/', target: '_blank', rel: 'noopener' }, '/credits/'), ' (linked from the showroom only).'))),
    h('div.credits__groups', groups)));
}

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);

function newInvitation() {
  let slugTouched = false;
  const err = h('p.form-error', { role: 'alert' });
  const bride = h('input.input', { id: 'n-bride', maxlength: 60, autocomplete: 'off', required: true, placeholder: 'Aarati' });
  const groom = h('input.input', { id: 'n-groom', maxlength: 60, autocomplete: 'off', required: true, placeholder: 'Sameer' });
  const slug = h('input.input', { id: 'n-slug', maxlength: 64, autocomplete: 'off', required: true, spellcheck: 'false' });
  const auto = () => { if (!slugTouched) slug.value = slugify(`${bride.value} ${groom.value}`.trim()); };
  bride.addEventListener('input', auto);
  groom.addEventListener('input', auto);
  slug.addEventListener('input', () => { slugTouched = true; slug.value = slug.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'); });
  const submit = h('button.btn.btn--primary', { type: 'submit', form: 'new-inv' }, 'Start');
  const form = h('form#new-inv.stack', { novalidate: true },
    h('div.pair',
      h('div.field', h('label.label', { for: 'n-bride' }, 'Bride’s first name'), bride),
      h('div.field', h('label.label', { for: 'n-groom' }, 'Groom’s first name'), groom)),
    h('details.more.more--inline', h('summary', h('span', 'Web address'), icon('down', 16)),
      h('div.more__body', h('div.field', h('label.label', { for: 'n-slug' }, 'Short name in the link'), h('p.hint', 'Lowercase letters, numbers and hyphens. It cannot be changed later.'), slug))),
    err,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    if (!bride.value.trim() || !groom.value.trim()) { err.textContent = 'Please enter both first names.'; return; }
    if (!/^[a-z0-9-]{3,64}$/.test(slug.value)) { err.textContent = 'The web address needs 3 to 64 lowercase letters, numbers or hyphens.'; return; }
    submit.disabled = true;
    try {
      const theme = S.meta.themes.find((t) => t.ready)?.slug;
      const doc = await api('/invitations', { method: 'POST', body: { bride: bride.value, groom: groom.value, slug: slug.value, theme, sample: true } });
      d.close();
      go(`#/i/${doc.slug}/theme`);
    } catch (ex) {
      err.textContent = ex.status === 409 ? 'That web address is taken. Open “Web address” and change it.' : ex.message;
    } finally {
      submit.disabled = false;
    }
  });
  const d = openDialog({ title: 'New invitation', body: [h('p.card__help', 'Start with the couple’s first names. Everything else comes step by step.'), form], actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), submit] });
  bride.focus();
}

// ── Editor ────────────────────────────────────────────────────────────────

async function openEditor(slug, stepId) {
  clear(app).append(topbar(), h('main.home', h('p.boot', 'Opening…')));
  let doc;
  try {
    doc = await api(`/invitations/${slug}`);
  } catch (err) {
    clear(app).append(topbar(), h('main.home', h('p.notice.notice--error', err.message), h('a.btn', { href: '#/' }, 'Back to invitations')));
    return;
  }
  S.editor = createEditor(doc);
  S.editor.show(stepId);
}

function createEditor(doc) {
  const slug = doc.slug;
  let version = doc.version;
  let current = null;
  let saveTimer = null;
  let inflight = null;
  let pending = false;
  let lastErrors = [];

  const saved = h('span.saved', { 'aria-live': 'polite', 'data-state': 'saved' }, icon('check', 14), h('span', 'Saved'));
  const setSave = (state, text) => { saved.dataset.state = state; saved.lastChild.textContent = text; };
  const names = () => coupleName(m.data.couple.bride.name, m.data.couple.groom.name);

  const m = createModel(doc.data, () => {
    pending = true;
    setSave('dirty', 'Saving…');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 700);
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
        mergeDepth(m.data, out.data);
        if (lastErrors.length) { lastErrors = []; showErrors(); }
        if (!pending) setSave('saved', 'Saved');
        title.textContent = names();
        ctx.onSaved?.();
        schedulePreview();
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          setSave('error', 'Not saved');
          openDialog({ title: 'Changed in another window', body: h('p.dialog__text', 'This invitation was changed somewhere else. Reload to get the latest version.'), actions: [h('button.btn.btn--primary', { type: 'button', onclick: () => location.reload() }, 'Reload')] });
        } else if (err instanceof ApiError && err.status === 400 && err.body.errors) {
          lastErrors = err.body.errors;
          setSave('error', 'Please check the highlighted field');
          showErrors();
        } else if (err instanceof ApiError && err.status === 401) {
          pending = true;
        } else {
          pending = true;
          setSave('error', 'Offline · retrying');
          saveTimer = setTimeout(save, 4000);
        }
      } finally {
        inflight = null;
      }
    })();
    await inflight;
  }

  function mergeDepth(local, remote) {
    if (!local || !remote || typeof local !== 'object' || typeof remote !== 'object') return;
    if (local.lg && local.lg === remote.lg && remote.depth && !local.depth) local.depth = remote.depth;
    for (const k of Object.keys(local)) if (local[k] && typeof local[k] === 'object') mergeDepth(local[k], remote[k]);
  }

  const flush = async () => { for (let i = 0; i < 3 && (pending || inflight); i++) await (inflight || save()); };
  const beforeUnload = (e) => { if (pending || inflight) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);

  const stepOfPath = (p) => (/^couple|^hosts/.test(p) ? 'couple'
    : /^weddingDate|^city|^events/.test(p) ? 'dates'
      : /^theme$/.test(p) ? 'theme'
        : /^music/.test(p) ? 'music' : 'customise');

  const errorsEl = h('div.ed2__errors', { hidden: true, role: 'alert' });
  function showErrors() {
    content.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
    content.querySelectorAll('.field__err').forEach((el) => el.remove());
    if (!lastErrors.length) { errorsEl.hidden = true; return; }
    errorsEl.hidden = false;
    clear(errorsEl).append(h('p', h('b', 'Not saved yet. '), 'One or more fields need a change:'),
      h('ul', lastErrors.slice(0, 5).map((e) => {
        const st = STEPS.find((s) => s.id === stepOfPath(e.path));
        return h('li', `${e.message}${st && st.id !== current ? ` (in “${st.title}”)` : ''}`, st && st.id !== current ? [' ', h('a', { href: `#/i/${slug}/${st.id}` }, 'Go there')] : null);
      })));
    for (const e of lastErrors) {
      const el = content.querySelector(`[data-path="${CSS.escape(e.path)}"]`);
      if (!el) continue;
      el.setAttribute('aria-invalid', 'true');
      const host = el.closest('.bi__col, .field, .photo') || el.parentElement;
      if (!host.querySelector('.field__err')) host.append(h('p.field__err', e.message));
    }
  }

  async function publish() {
    await flush();
    if (lastErrors.length) { toast('Please fix the highlighted field first.', 'error'); return; }
    try {
      const out = await api(`/invitations/${slug}/publish`, { method: 'POST' });
      Object.assign(doc, { status: out.status, changed: out.changed, publishedAt: out.publishedAt });
      version = out.version;
      toast('Published. Your invitation is live.', 'success');
    } catch (err) {
      if (err.body?.problems) {
        openDialog({ title: 'Almost there', body: [h('p.dialog__text', 'Please add these first:'), h('ul.problems', err.body.problems.map((p) => h('li', p)))], actions: [h('button.btn.btn--primary', { type: 'button', onclick: (e) => e.target.closest('dialog').close() }, 'OK')] });
      } else toast(err.message, 'error');
    }
  }

  async function unpublish() {
    if (!(await confirmDialog({ title: 'Take the invitation offline?', message: 'Guests opening the link will see “not found” until you publish again. Replies are kept.', confirm: 'Unpublish', danger: true }))) return;
    try {
      const out = await api(`/invitations/${slug}/unpublish`, { method: 'POST' });
      Object.assign(doc, { status: out.status, changed: false });
      version = out.version;
      toast('Unpublished', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }

  async function remove() {
    const input = h('input.input', { id: 'del-confirm', autocomplete: 'off', spellcheck: 'false' });
    const err = h('p.form-error', { role: 'alert' });
    const btn = h('button.btn.btn--danger', { type: 'button', onclick: async () => {
      if (input.value !== slug) { err.textContent = 'That does not match.'; return; }
      try {
        await api(`/invitations/${slug}`, { method: 'DELETE', body: { confirm: slug } });
        pending = false;
        d.close();
        toast('Invitation deleted', 'success');
        go('#/');
      } catch (ex) { err.textContent = ex.message; }
    } }, 'Delete');
    const d = openDialog({
      title: 'Delete this invitation?',
      body: [h('p.dialog__text', 'The invitation, its photos and its replies are removed and the link stops working.'),
        h('div.field', h('label.label', { for: 'del-confirm' }, `Type ${slug} to confirm`), input), err],
      actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), btn],
    });
    input.focus();
  }

  // ── Layout
  const isAdmin = S.me.role === 'admin';
  const title = h('span.ed2__names', names());
  const repliesLink = h('a.btn.btn--quiet.btn--sm', { href: `#/i/${slug}/replies` }, 'Replies');
  const head = h('div.ed2__head',
    isAdmin ? h('a.btn.btn--quiet.btn--sm.ed2__back', { href: '#/' }, icon('back', 16), h('span', 'All invitations')) : null,
    title, saved, repliesLink);
  const progress = h('nav.steps', { 'aria-label': 'Steps' });
  const content = h('div.ed2__content', { id: 'main', tabindex: -1 });
  const foot = h('div.ed2__foot');

  // Live preview: beside the editor on wide screens, one tap away (full screen) on phones.
  // It loads only while visible: themes are full WebGL pages.
  const wide = matchMedia('(min-width: 1100px)');
  const previewSrc = () => `/${m.data.theme}/?id=${encodeURIComponent(slug)}&studio=${Date.now()}`;
  const sideFrame = h('iframe.side__frame', { title: 'Live preview of the invitation' });
  const sideDevice = h('div.side__device', sideFrame);
  const side = h('aside.side', { 'aria-label': 'Live preview' },
    h('div.side__stage', sideDevice),
    h('div.side__bar', h('span.side__label', 'Live preview'),
      h('button.btn.btn--quiet.btn--sm', { type: 'button', onclick: () => loadSide(true) }, icon('refresh', 14), 'Refresh')));
  const fitSide = () => {
    const r = sideDevice.parentElement.getBoundingClientRect();
    if (!r.width) return;
    const sc = Math.min((r.width - 24) / 390, (r.height - 24) / 844);
    sideDevice.style.transform = `translate(-50%, -50%) scale(${sc})`;
  };
  new ResizeObserver(fitSide).observe(side);
  const sideWanted = () => wide.matches && current !== 'publish' && current !== 'replies';
  function loadSide(force) {
    if (!sideWanted()) { if (sideFrame.getAttribute('src')) sideFrame.removeAttribute('src'); return; }
    if (force || !sideFrame.getAttribute('src')) sideFrame.src = previewSrc();
  }
  let previewTimer;
  function schedulePreview() { clearTimeout(previewTimer); previewTimer = setTimeout(() => loadSide(true), 1500); }
  const onWide = () => { loadSide(false); requestAnimationFrame(fitSide); };
  wide.addEventListener('change', onWide);
  const openPreviewSheet = () => {
    const frame = h('iframe.pv-sheet__frame', { title: 'Preview of the invitation', src: previewSrc() });
    openDialog({ title: 'Preview', body: h('div.pv-sheet', frame), cls: 'dialog--sheet' });
  };

  const root = h('div.ed2', topbar(), h('div.ed2__bar', head, progress),
    h('div.ed2__layout', h('main.ed2__main', errorsEl, content, foot), side));

  const ctx = {
    m, slug, meta: S.meta, doc, names, publish, unpublish, remove, isAdmin,
    onTheme: () => schedulePreview(),
  };

  function drawProgress() {
    const idx = STEPS.findIndex((s) => s.id === current);
    clear(progress).append(
      h('div.steps__track', { 'aria-hidden': 'true' }, h('span.steps__fill', { style: { transform: `scaleX(${idx < 0 ? 1 : (idx + 1) / STEPS.length})` } })),
      h('ol.steps__list', STEPS.map((s, i) => h('li', h('a.steps__item', {
        href: `#/i/${slug}/${s.id}`, 'aria-current': s.id === current ? 'step' : undefined, class: i < idx ? 'is-done' : '',
      }, h('span.steps__n', i < idx ? icon('check', 12) : String(i + 1)), h('span.steps__t', s.title))))),
    );
  }

  function show(id) {
    if (id === 'replies') {
      current = 'replies';
    } else if (STEPS.some((s) => s.id === id)) {
      current = id;
    } else {
      go(`#/i/${slug}/theme`);
      return;
    }
    if (!app.contains(root)) clear(app).append(root);
    ctx.onSaved = null;
    const step = STEPS.find((s) => s.id === current);
    const idx = STEPS.indexOf(step);
    document.title = `${step ? step.title : 'Replies'} · ${names()} · Nimtto Studio`;
    root.classList.toggle('is-replies', current === 'replies');
    root.classList.toggle('no-side', ['publish', 'replies', 'theme'].includes(current));
    loadSide(false);
    requestAnimationFrame(fitSide);
    repliesLink.setAttribute('aria-current', current === 'replies' ? 'page' : 'false');
    drawProgress();
    if (step) {
      clear(content).append(
        h('header.ed2__intro', h('p.ed2__kicker', `Step ${idx + 1} of ${STEPS.length}`), h('h1.ed2__title', step.title), h('p.ed2__lede', step.intro)),
        ...[step.render(ctx)].flat(),
      );
      const prev = STEPS[idx - 1];
      const next = STEPS[idx + 1];
      clear(foot).append(
        prev ? h('a.btn.btn--lg', { href: `#/i/${slug}/${prev.id}` }, icon('left', 16), 'Back') : h('span'),
        current === 'publish' ? null : h('button.btn.btn--lg.foot__preview', { type: 'button', onclick: openPreviewSheet, 'aria-label': 'Preview the invitation' }, icon('eye', 18), h('span.foot__pv-t', 'Preview')),
        next ? h('a.btn.btn--primary.btn--lg', { href: `#/i/${slug}/${next.id}`, 'aria-label': `Next: ${next.title}` }, h('span', 'Next'), h('span.foot__more', `: ${next.title}`), icon('right', 16)) : h('a.btn.btn--lg', { href: `#/i/${slug}/replies` }, 'See replies', icon('right', 16)),
      );
    } else {
      clear(content).append(responsesView(ctx));
      clear(foot);
    }
    showErrors();
    window.scrollTo({ top: 0 });
    content.focus({ preventScroll: true });
  }

  return {
    slug,
    show,
    flush,
    destroy() { window.removeEventListener('beforeunload', beforeUnload); wide.removeEventListener('change', onWide); clearTimeout(previewTimer); },
  };
}

route();
