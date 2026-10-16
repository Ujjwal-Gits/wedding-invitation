// Nimtto Studio. Two dashboards on one design system:
//   the owner (super admin): Overview, Invitations, Clients & access, Orders, Replies, Themes, Website, Settings;
//   the couple (client link + password): Home, Opening, Couple & family, Dates, Photos, Music, Replies, Send, Themes.
//   A customer account (email + password, made when ordering): My dashboard (orders, payments, invitations), then the
//   couple's modules for each invitation the owner linked to the account, with that link's permissions.
// The owner can open any invitation and use every couple module without limits.
import { h, icon, clear, toast, openDialog, fmtDate, fill } from './dom.js';
import { api, setCsrf, whenSignedOut } from './api.js';
import { createShell } from './shell.js';
import { createSession, coupleName } from './session.js';
import { createPreview } from './preview.js';
import { handlePick } from './pick.js';
import { INV_MODULES } from './modules.js';
import { ADMIN_MODULES } from './admin.js';
import { CUSTOMER_MODULES, waLink, WA_DISPLAY } from './customer.js';
import { enhance } from '../ui/enhance.js'; // Nimtto dropdowns, date and time pickers (imports ../ui/ui.css)

const app = document.getElementById('app');
enhance(document);
const S = { me: null, meta: null, ws: null };

whenSignedOut(() => {
  const wasCouple = S.me?.role === 'client';
  S.me = null;
  teardown();
  if (wasCouple) { linkProblem(); return; }
  toast('Please sign in again.', 'error');
  go('#/login');
});

/** Whether this browser has signed in before (skips a pointless /auth/me call, and its 401, on the sign-in page). */
function seenFlag(set) {
  try {
    if (set === true) localStorage.setItem('nimtto-session', '1');
    else if (set === false) localStorage.removeItem('nimtto-session');
    else return localStorage.getItem('nimtto-session') === '1';
  } catch { return true; }
  return false;
}

function coupleFlag(set) {
  try {
    if (set === true) localStorage.setItem('nimtto-couple', '1');
    else if (set === false) localStorage.removeItem('nimtto-couple');
    else return localStorage.getItem('nimtto-couple') === '1';
  } catch { /* storage unavailable */ }
  return false;
}

export const go = (hash) => { if (location.hash !== hash) location.hash = hash; else route(); };
window.addEventListener('hashchange', () => route());

const brand = (lg = false) => h('a.brand', { href: '#/', class: lg ? 'brand--lg' : '' },
  h('span.brand__mark', { 'aria-hidden': 'true' }), h('span.brand__name', 'Nimtto'), h('span.brand__sub', 'Studio'));

// ── Routing ────────────────────────────────────────────────────────────────

let routing = Promise.resolve();
function route() { routing = routing.then(doRoute).catch((err) => { console.error(err); fatal(err); }); return routing; }

async function doRoute() {
  const hash = location.hash || '#/';
  const cm = /^#\/c\/([A-Za-z0-9_-]{20,128})$/.exec(hash);
  if (cm) return passwordPage(cm[1]);

  if (!S.me) {
    try {
      // Always ask the server: the session cookie (HttpOnly) is the truth, so a signed-in couple goes straight in.
      const me = await api('/auth/me');
      S.me = me;
      setCsrf(me.csrf);
    } catch {
      seenFlag(false);
      teardown();
      return coupleFlag() ? linkProblem() : loginPage();
    }
  }
  if (!S.meta) {
    try { S.meta = await api('/meta'); } catch (err) { return fatal(err); }
  }

  const im = /^#\/i\/([a-z0-9-]{3,64})(?:\/([a-z-]+))?$/.exec(hash);
  if (S.me.role === 'customer') {
    if (im) return openInvitation(im[1], im[2] || 'home');
    if (hash !== '#/account') return go('#/account');
    return openCustomer();
  }
  if (S.me.role === 'client') {
    if (!im || im[1] !== S.me.slug) return go(`#/i/${S.me.slug}/home`);
    return openInvitation(im[1], im[2] || 'home');
  }
  if (hash === '#/login' || hash === '#/' || hash === '#') return go('#/overview');
  if (im) return openInvitation(im[1], im[2] || 'home');
  const am = /^#\/([a-z-]+)(?:\?(.*))?$/.exec(hash);
  const mod = ADMIN_MODULES.find((x) => x.id === am?.[1]);
  if (!mod) return go('#/overview');
  return openAdmin(mod, new URLSearchParams(am[2] || ''));
}

function teardown() {
  if (!S.ws) return;
  S.ws.dispose?.();
  S.ws.preview?.destroy?.();
  S.ws.session?.destroy();
  S.ws.shell?.destroy();
  S.ws = null;
}

function fatal(err) {
  teardown();
  fill(app, h('div.fullmsg', h('div.fullmsg__card',
    h('span.empty__icon', icon('alert', 22)),
    h('h1.fullmsg__title', 'Something went wrong'),
    h('p.fullmsg__text', err?.message || 'The studio could not load.'),
    h('button.btn.btn--primary', { type: 'button', onclick: () => location.reload() }, icon('refresh', 16), 'Try again'))));
}

// ── Module host (shared by both dashboards) ──────────────────────────────

/** Renders one module into the shell, with its own subscription scope. */
function mount(ws, mod, ctx) {
  ws.dispose?.();
  const offs = [];
  const scoped = { ...ctx, on: (k, fn) => { if (ctx.session) offs.push(ctx.session.on(k, fn)); }, cleanup: (fn) => offs.push(fn) };
  ws.dispose = () => { offs.splice(0).forEach((f) => f()); };
  ws.shell.setActive(mod.id);
  ws.shell.setPage({ kicker: mod.kicker?.(scoped) || '', title: mod.title, sub: mod.sub || '', actions: [...(mod.actions?.(scoped) || []), ...(ctx.extraActions || [])] });
  document.title = `${mod.title} · Nimtto Studio`;
  const content = ws.shell.content;
  clear(content);
  content.classList.remove('is-in');
  let node;
  try { node = mod.render(scoped); } catch (err) { console.error(err); node = h('p.notice.notice--error', 'This section could not be shown. Reload to try again.'); }
  content.append(...[node].flat().filter(Boolean));
  requestAnimationFrame(() => content.classList.add('is-in'));
  ws.shell.toTop();
  ws.shell.main.focus({ preventScroll: true });
}

// ── Owner dashboard ──────────────────────────────────────────────────────

function adminFoot() {
  return h('div.userbox',
    h('span.userbox__avatar', { 'aria-hidden': 'true' }, (S.me.email || 'A').slice(0, 1).toUpperCase()),
    h('span.userbox__text', h('b', 'Owner'), h('small', S.me.email || '')),
    h('button.btn.btn--icon.btn--ghost', { type: 'button', 'aria-label': 'Sign out', title: 'Sign out', 'data-action': 'signout', onclick: signOut }, icon('logout', 18)));
}

function openAdmin(mod, params) {
  if (S.ws?.kind !== 'admin') {
    teardown();
    const shell = createShell({
      kind: 'admin',
      brand: brand(),
      groups: [
        { items: ADMIN_MODULES.filter((m) => m.group === 'main').map((m) => ({ id: m.id, label: m.title, icon: m.icon, href: `#/${m.id}`, short: m.short })) },
        { label: 'Business', items: ADMIN_MODULES.filter((m) => m.group === 'business').map((m) => ({ id: m.id, label: m.title, icon: m.icon, href: `#/${m.id}`, short: m.short })) },
      ],
      foot: adminFoot(),
      tabs: ['overview', 'invitations', 'orders', 'replies'],
      onAction: (a) => { if (a === 'signout') signOut(); },
    });
    S.ws = { kind: 'admin', shell };
    fill(app, shell.root);
    shell.attachPreview(null);
    api('/orders').then((list) => { const n = (Array.isArray(list) ? list : list.orders || []).filter((o) => o.status === 'new').length; shell.setBadge('orders', n ? String(n) : ''); }).catch(() => {});
  }
  mount(S.ws, mod, { me: S.me, meta: S.meta, shell: S.ws.shell, go, params, refreshMeta });
}

// ── Customer dashboard (account) ─────────────────────────────────────────

/** The account's invitations with their permissions, from the last GET /api/account. */
let accountInvs = [];

function customerFoot() {
  return h('div.userbox',
    h('span.userbox__avatar', { 'aria-hidden': 'true' }, (S.me.name || S.me.email || 'Y').slice(0, 1).toUpperCase()),
    h('span.userbox__text', h('b', S.me.name || 'Your account'), h('small', S.me.email || '')),
    h('button.btn.btn--icon.btn--ghost', { type: 'button', 'aria-label': 'Sign out', title: 'Sign out', 'data-action': 'signout', onclick: signOut }, icon('logout', 18)));
}

function openCustomer() {
  const mod = CUSTOMER_MODULES[0];
  if (S.ws?.kind !== 'customer') {
    teardown();
    const shell = createShell({
      kind: 'customer',
      brand: brand(),
      groups: [{ items: CUSTOMER_MODULES.map((m) => ({ id: m.id, label: m.title, icon: m.icon, href: `#/${m.id}`, short: m.short })) }],
      foot: customerFoot(),
      tabs: ['account'], // phones: Dashboard + More (sign out)
      onAction: (a) => { if (a === 'signout') signOut(); },
    });
    S.ws = { kind: 'customer', shell };
    fill(app, shell.root);
    shell.attachPreview(null);
  }
  mount(S.ws, mod, { me: S.me, meta: S.meta, shell: S.ws.shell, go, refreshMeta, onAccount: (acc) => { accountInvs = acc.invitations || []; } });
}

async function refreshMeta() { try { S.meta = await api('/meta'); } catch { /* keep the old one */ } return S.meta; }

// ── Invitation workspace (couple, or the owner inside one invitation) ───

async function openInvitation(slug, modId) {
  let ws = S.ws;
  if (ws?.kind !== 'inv' || ws.slug !== slug) {
    if (ws?.session) await ws.session.flush();
    teardown();
    fill(app, h('div.boot', { role: 'status' }, h('span.boot__mark', { 'aria-hidden': 'true' }), h('span', 'Opening the invitation…')));
    let doc;
    try { doc = await api(`/invitations/${slug}`); } catch (err) {
      if (S.me?.role === 'admin') { toast(err.message, 'error'); return go('#/invitations'); }
      if (S.me?.role === 'customer') { toast(err.status === 403 ? 'That invitation is not linked to your account.' : err.message, 'error'); return go('#/account'); }
      return fatal(err);
    }
    // An account: the permissions of this invitation's link to it (as fresh as the server's).
    if (S.me.role === 'customer') {
      try { accountInvs = (await api('/account')).invitations || []; } catch { /* keep the last list */ }
      S.me = { ...S.me, perms: accountInvs.find((x) => x.slug === slug)?.perms || { themes: [], canChangeTheme: false, canChangeColors: false } };
    }
    if (S.me.role === 'client' && !S.me.perms) {
      try { const me = await api('/auth/me'); S.me = { ...S.me, ...me }; } catch { /* keep */ }
    }
    const session = createSession(doc, { meta: S.meta, me: S.me });
    const isAdmin = S.me.role === 'admin';
    const isCustomer = S.me.role === 'customer';
    const mods = INV_MODULES.filter((m) => !m.adminOnly || isAdmin);
    const ctxBox = h('div.ctxbox',
      isAdmin ? h('a.ctxbox__back', { href: '#/invitations' }, icon('back', 15), 'All invitations') : null,
      isCustomer ? h('a.ctxbox__back', { href: '#/account' }, icon('back', 15), 'My dashboard') : null,
      h('p.ctxbox__names', session.names()),
      h('p.ctxbox__meta', h('span.ctxbox__date', fmtDate(session.m.data.weddingDate, { day: 'numeric', month: 'short', year: 'numeric' })), h('span.ctxbox__status')));
    const drawCtx = () => {
      ctxBox.querySelector('.ctxbox__names').textContent = session.names();
      S.ws?.shell?.setTitle(session.names());
      ctxBox.querySelector('.ctxbox__date').textContent = fmtDate(session.m.data.weddingDate, { day: 'numeric', month: 'short', year: 'numeric' });
      const st = ctxBox.querySelector('.ctxbox__status');
      const live = doc.status === 'published';
      st.className = `ctxbox__status pill ${live ? (doc.changed ? 'pill--warn' : 'pill--ok') : 'pill--muted'}`;
      st.textContent = live ? (doc.changed ? 'Live · changes' : 'Live') : 'Draft';
    };
    drawCtx();
    const shell = createShell({
      kind: 'inv',
      brand: brand(),
      context: ctxBox,
      groups: [
        { label: isAdmin ? 'Invitation' : null, items: mods.filter((m) => m.group === 'edit').map((m) => ({ id: m.id, label: m.title, ne: m.ne, icon: m.icon, href: `#/i/${slug}/${m.id}`, short: m.short })) },
        { label: 'More', items: mods.filter((m) => m.group !== 'edit').map((m) => ({ id: m.id, label: m.title, ne: m.ne, icon: m.icon, href: `#/i/${slug}/${m.id}`, short: m.short })) },
      ],
      foot: isAdmin ? adminFoot() : isCustomer ? customerFoot() : h('div.userbox',
        h('span.userbox__avatar', { 'aria-hidden': 'true' }, icon('heart', 16)),
        h('span.userbox__text', h('b', 'Your invitation'), h('small', 'Saves as you type')),
        h('button.btn.btn--icon.btn--ghost', { type: 'button', 'aria-label': 'Sign out', title: 'Sign out', 'data-action': 'signout', onclick: signOut }, icon('logout', 18))),
      tabs: ['opening', 'couple', 'dates', 'photos', 'send'],
      mobile: { home: `#/i/${slug}/home`, title: session.names(), save: session.makeSaveChip() },
      onAction: (a) => { if (a === 'signout') signOut(); },
    });
    const preview = createPreview(session, {
      // "Click to edit": a click in the preview opens the field that changes it.
      onPick: (t) => handlePick({ session, slug, go, isAdmin, perms: session.perms, preview }, t).catch((err) => console.error(err?.stack || err)),
    });
    shell.attachPreview(preview);
    session.on('saved', drawCtx);
    session.on('status', drawCtx);
    ws = S.ws = { kind: 'inv', slug, shell, session, preview, mods };
    fill(app, shell.root);
    if (isAdmin) api(`/invitations/${slug}/seen`, { method: 'POST' }).catch(() => {});
  }
  const mod = ws.mods.find((m) => m.id === modId);
  if (!mod) return go(`#/i/${slug}/home`);
  ws.preview.setOpening(Boolean(mod.opening)); // first: the page loads straight into the right mode
  ws.shell.wantPreview(mod.preview !== false);
  ws.preview.setHint(mod.previewHint);
  mount(ws, mod, { session: ws.session, m: ws.session.m, slug, meta: S.meta, me: S.me, isAdmin: ws.session.isAdmin, perms: ws.session.perms, shell: ws.shell, preview: ws.preview, go, refreshMeta, extraActions: [ws.session.saveEl] });
  ws.preview.setModule(mod.id);
}

async function signOut() {
  if (S.ws?.session) await S.ws.session.flush();
  try { await api('/auth/logout', { method: 'POST' }); } catch { /* already gone */ }
  const wasCouple = S.me?.role === 'client';
  seenFlag(false);
  S.me = null;
  S.meta = null;
  setCsrf('');
  teardown();
  if (wasCouple) { linkProblem('You are signed out. Open your link again to continue.', 'Signed out'); return; }
  history.replaceState(null, '', '#/login');
  loginPage();
}

// ── Sign-in pages ─────────────────────────────────────────────────────────

function authLayout(...panel) {
  return h('main.auth', { id: 'main' },
    h('div.auth__art', { 'aria-hidden': 'true' },
      h('img', { src: '/photos/marigold-garland-lg.webp', alt: '' }),
      h('div.auth__quote', h('p.auth__q', 'Every invitation begins with a welcome.'), h('p.auth__qne', { lang: 'ne' }, 'हार्दिक निमन्त्रणा'))),
    h('div.auth__panel', h('div.auth__inner', ...panel)));
}

function passwordField(id, labelText, autocomplete) {
  const input = h('input.input.input--lg', { id, name: id, type: 'password', autocomplete, required: true, maxlength: 1024, spellcheck: 'false' });
  const eye = h('button.pwfield__eye', { type: 'button', 'aria-label': 'Show the password', title: 'Show', onclick: () => {
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    eye.setAttribute('aria-label', show ? 'Hide the password' : 'Show the password');
    eye.classList.toggle('is-on', show);
    input.focus();
  } }, icon('eye', 18));
  return { input, el: h('div.field', h('label.label', { for: id }, labelText), h('div.pwfield', input, eye)) };
}

function loginPage() {
  teardown();
  document.title = 'Sign in · Nimtto Studio';
  const err = h('p.form-error', { role: 'alert' });
  const btn = h('button.btn.btn--primary.btn--lg.btn--block', { type: 'submit' }, 'Sign in');
  const email = h('input.input.input--lg', { id: 'email', name: 'email', type: 'email', autocomplete: 'username', required: true, maxlength: 254 });
  const pw = passwordField('password', 'Password', 'current-password');
  const form = h('form.auth__form', { novalidate: true },
    h('div.field', h('label.label', { for: 'email' }, 'Email'), email), pw.el, err, btn);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    if (!email.value || !pw.input.value) { err.textContent = 'Enter your email and password.'; return; }
    btn.disabled = true;
    btn.textContent = 'Signing in…';
    try {
      const me = await api('/auth/login', { method: 'POST', body: { email: email.value, password: pw.input.value } });
      coupleFlag(false);
      seenFlag(true);
      S.me = me;
      S.meta = null;
      setCsrf(me.csrf);
      go(me.role === 'customer' ? '#/account' : '#/overview');
    } catch (ex) {
      err.textContent = ex.message;
      pw.input.value = '';
      pw.input.focus();
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  });
  // No email is sent from Nimtto: a forgotten password is reset by the owner, on WhatsApp.
  const forgotNote = h('p.notice', { hidden: true, role: 'status' }, icon('chat', 16), h('span',
    'Contact us on WhatsApp ', h('a', { href: waLink('Namaste! I forgot my Nimtto password. My email is: '), target: '_blank', rel: 'noopener' }, WA_DISPLAY), ' to reset it.'));
  const forgot = h('button.link.auth__forgot', { type: 'button', 'aria-expanded': 'false', onclick: () => {
    forgotNote.hidden = !forgotNote.hidden;
    forgot.setAttribute('aria-expanded', String(!forgotNote.hidden));
  } }, 'Forgot password?');
  form.insertBefore(forgot, err);
  form.append(forgotNote);
  fill(app, authLayout(brand(true), h('h1.auth__title', 'Sign in'), h('p.auth__lede', 'See your orders and edit your wedding invitation.'), form,
    h('p.auth__small', 'No account yet? It is made when you order a design on ', h('a', { href: '/' }, 'nimtto.com'), '.')));
  email.focus();
}

/** The couple's private link: a calm "Enter your password" page, then the token becomes a session. */
async function passwordPage(token) {
  teardown();
  // Signed in as the owner in this browser? Opening the couple's link replaces that session.
  let who = S.me;
  if (!who) { try { who = await api('/auth/me'); } catch { who = null; } }
  if (who?.role === 'admin') {
    const ok = await new Promise((resolve) => {
      let yes = false;
      const d = openDialog({
        title: 'Open as the couple?',
        body: [h('p.dialog__text', 'You are signed in as the owner. Continuing signs you out here and opens the couple’s view.'), h('p.notice', icon('info', 16), h('span', 'Tip: open couple links in a private window to stay signed in here.'))],
        actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Stay as the owner'), h('button.btn.btn--primary', { type: 'button', onclick: () => { yes = true; d.close(); } }, 'Continue as the couple')],
        onClose: () => resolve(yes),
      });
    });
    if (!ok) { history.replaceState(null, '', '#/overview'); route(); return; } // queued, not awaited (see enterAsCouple)
  }
  // The couple opened their link again while signed in: no password, straight to their invitation.
  if (who?.role === 'client') {
    let s = null;
    try { s = await api('/client/session', { method: 'POST', body: { token } }); } catch { /* another link, or it changed */ }
    if (s) { enterAsCouple(s); return; } // queues the next route; awaiting it here would wait on itself
  }
  document.title = 'Your invitation · Nimtto';
  const err = h('p.form-error', { role: 'alert' });
  const btn = h('button.btn.btn--primary.btn--lg.btn--block', { type: 'submit' }, 'Open my invitation', icon('right', 18));
  const pw = passwordField('client-pw', 'Password · पासवर्ड', 'current-password');
  const form = h('form.auth__form', { novalidate: true }, pw.el, err, btn);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    if (!pw.input.value) { err.textContent = 'Please enter the password you were given.'; pw.input.focus(); return; }
    btn.disabled = true;
    try {
      enterAsCouple(await api('/client/session', { method: 'POST', body: { token, password: pw.input.value } }));
    } catch (ex) {
      btn.disabled = false;
      if (ex.status === 429) err.textContent = ex.message || 'Too many tries. Please wait a few minutes.';
      else if (ex.status === 401 || ex.status === 403) err.textContent = ex.body?.error || 'That password does not match. Please check it and try again.';
      else err.textContent = ex.message;
      pw.input.select();
    }
  });
  fill(app, authLayout(
    brand(true),
    h('span.auth__seal', { 'aria-hidden': 'true' }, icon('lock', 20)),
    h('h1.auth__title', 'Enter your password'),
    h('p.auth__lede', 'Your planner sent you a password with this link. Enter it to see and edit your wedding invitation.'),
    h('p.auth__lede.auth__lede--ne', { lang: 'ne' }, 'आफ्नो निमन्त्रणा हेर्न र मिलाउन पासवर्ड राख्नुहोस्।'),
    form,
    h('p.auth__small', 'No password? Ask the person who sent you this link.')));
  pw.input.focus();
}

function enterAsCouple(s) {
  S.me = s;
  S.meta = null;
  setCsrf(s.csrf);
  coupleFlag(true);
  seenFlag(true);
  history.replaceState(null, '', `#/i/${s.slug}/home`); // never leave the token in the address bar
  route();
}

function linkProblem(message = 'This link is no longer active. Please ask your planner for a new one.', heading = 'This link has expired') {
  teardown();
  document.title = 'Nimtto';
  fill(app, authLayout(brand(true),
    h('h1.auth__title', heading), h('p.auth__lede', message),
    h('button.link', { type: 'button', onclick: () => { coupleFlag(false); history.replaceState(null, '', '#/login'); loginPage(); } }, 'Sign in with your email instead')));
}

export { coupleName };
route();
