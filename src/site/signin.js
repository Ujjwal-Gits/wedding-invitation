// The account step before the order form (markup: src/site/partials.mjs `dialogs`, #oa). A visitor who is not
// signed in makes an account here (POST /api/auth/signup: name, email, phone with its country code, password, and
// the market of the site they are on) or switches to "Sign in" (POST /api/auth/login: email, password) in the same
// dialog. Both sign this browser in (session cookie) and answer { role, name, email, csrf }; the order form then needs
// no email or password. The phone field is src/ui/phone.js (Nepal +977 on nimtto.com, United States +1 on
// /international/). Text only, never HTML.
import { $, $$, validEmail, MARKET } from './common.js';
import { phoneField, PHONE_MSG } from '../ui/phone.js';

const dlg = $('#oa');
const form = $('#oa-form');
const F = form?.elements;
const S = { mode: 'up', busy: false, built: false, done: null, opener: null, ok: false, phone: null };

const MODES = {
  up: { title: 'Make your account', submit: 'Make account and continue', busy: 'Making your account…', switchT: 'Already have an account?', switchB: 'Sign in', pw: 'new-password' },
  in: { title: 'Sign in to order', submit: 'Sign in and continue', busy: 'Signing in…', switchT: 'New to Nimtto?', switchB: 'Make an account', pw: 'current-password' },
};

function setMode(mode) {
  S.mode = mode;
  const m = MODES[mode];
  $('#oa-title').textContent = m.title;
  $('#oa-submit').textContent = m.submit;
  $('#oa-switch-t').textContent = m.switchT;
  $('#oa-switch').textContent = m.switchB;
  for (const n of $$('.oa-up', form)) n.hidden = mode !== 'up';
  for (const n of $$('.oa-in', form)) n.hidden = mode !== 'in';
  $('#oa-lede').hidden = mode !== 'up';
  F.name.required = mode === 'up';
  F.password.autocomplete = m.pw;
  F.password.setAttribute('aria-describedby', mode === 'up' ? 'oa-password-hint' : '');
  for (const k of ['name', 'email', 'phone', 'password']) fieldError(k, false);
  $('#oa-err').hidden = true;
}

function fieldError(name, msg) {
  const input = F[name];
  const err = $(`#oa-${name}-err`);
  const bad = Boolean(msg);
  input.setAttribute('aria-invalid', String(bad));
  const ids = [name === 'password' && S.mode === 'up' ? 'oa-password-hint' : '', bad ? err.id : ''].filter(Boolean).join(' ');
  if (ids) input.setAttribute('aria-describedby', ids); else input.removeAttribute('aria-describedby');
  if (bad && typeof msg === 'string') err.textContent = msg;
  err.hidden = !bad;
  return !bad;
}

function validate() {
  const up = S.mode === 'up';
  const pw = F.password.value;
  const ok = [
    fieldError('name', up && F.name.value.trim().length < 2),
    fieldError('email', !validEmail(F.email.value.trim())),
    fieldError('phone', up && !S.phone?.valid() && PHONE_MSG),
    fieldError('password', up ? (pw.length < 8 || pw.length > 128) && 'Please choose a password of 8 or more characters.' : !pw && 'Please write your password.'),
  ];
  return ok.every(Boolean);
}

function showError(msg) {
  const box = $('#oa-err');
  box.textContent = msg;
  box.hidden = false;
}
const short = (v, fallback) => (typeof v === 'string' && v.length < 200 ? v : fallback);

async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
    let data = {};
    try { data = await r.json(); } catch { /* not JSON */ }
    return { ok: r.ok, status: r.status, data: data || {} };
  } catch {
    return { ok: false, status: 0, data: {} };
  }
}

async function submit(e) {
  e.preventDefault();
  if (S.busy) return;
  $('#oa-err').hidden = true;
  if (!validate()) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }
  const up = S.mode === 'up';
  const email = F.email.value.trim();
  const body = up
    ? { name: F.name.value.trim(), email, password: F.password.value, phone: S.phone.e164(), market: MARKET }
    : { email, password: F.password.value };
  const btn = $('#oa-submit');
  S.busy = true;
  btn.disabled = true;
  btn.textContent = MODES[S.mode].busy;
  const r = await post(up ? '/api/auth/signup' : '/api/auth/login', body);
  S.busy = false;
  btn.disabled = false;
  btn.textContent = MODES[S.mode].submit;
  const d = r.data;
  if (r.ok && typeof d.role === 'string') {
    const me = { role: d.role, name: typeof d.name === 'string' ? d.name : '', email: typeof d.email === 'string' ? d.email : email, csrf: typeof d.csrf === 'string' ? d.csrf : '', phone: up ? body.phone || '' : '' };
    F.password.value = '';
    S.ok = true;
    dlg.close();
    S.done?.(me);
    return;
  }
  if (r.status === 409 && d.code === 'account_exists') {
    setMode('in');
    F.email.value = email;
    F.password.value = '';
    showError('This email already has an account. Enter its password to sign in.');
    F.password.focus();
    return;
  }
  if (r.status === 401) { fieldError('password', 'That email and password do not match.'); F.password.focus(); return; }
  if (r.status === 429) { showError('Too many tries from this connection. Please wait a few minutes and try again.'); return; }
  if (r.status === 400 && Array.isArray(d.fields)) {
    d.fields.filter((f) => ['name', 'email', 'phone', 'password'].includes(f)).forEach((f) => fieldError(f, f === 'phone' ? PHONE_MSG : true));
    form.querySelector('[aria-invalid="true"]')?.focus();
    showError(short(d.error, 'Please check the fields in red.'));
    return;
  }
  if (r.status === 0) showError('We could not reach the server. Check your connection and try again.');
  else showError(short(d.error, 'We could not do that just now. Please try again in a moment.'));
}

function build() {
  if (S.built || !form) return;
  S.built = true;
  S.phone = phoneField(F.phone);
  form.addEventListener('submit', submit);
  $('#oa-switch').addEventListener('click', () => { setMode(S.mode === 'up' ? 'in' : 'up'); (S.mode === 'up' ? F.name : F.email).focus(); });
  for (const name of ['name', 'email', 'phone', 'password']) {
    F[name].addEventListener('input', () => { if (F[name].getAttribute('aria-invalid') === 'true') validate(); });
  }
  const tog = $('#oa-pw-toggle');
  tog.addEventListener('click', () => {
    const show = F.password.type === 'password';
    F.password.type = show ? 'text' : 'password';
    tog.textContent = show ? 'Hide' : 'Show';
    tog.setAttribute('aria-pressed', String(show));
    tog.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
  $('#oa-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => {
    if ($('#om')?.open) return; // signed in: the order form is open now and keeps the page locked
    document.documentElement.classList.remove('is-locked');
    if (!S.ok) S.opener?.focus?.({ preventScroll: true });
  });
}

/**
 * Opens the account step. `done(me)` runs once the browser is signed in; `note` explains why it opened
 * (e.g. an expired session). Resolves nothing: the caller continues in `done`.
 */
export function openSignIn({ done, mode = 'up', note = '', opener = null } = {}) {
  if (!dlg) return false;
  build();
  S.done = done;
  S.ok = false;
  S.opener = opener || document.activeElement;
  setMode(mode);
  const n = $('#oa-note');
  n.textContent = note;
  n.hidden = !note;
  if (!dlg.open) dlg.showModal();
  document.documentElement.classList.add('is-locked');
  (mode === 'up' ? F.name : F.email).focus({ preventScroll: true });
  return true;
}
