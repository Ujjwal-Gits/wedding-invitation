// Event lock in the studio (src/core/event-lock.js; the server enforces it, lib/invitations.js): the publish
// confirmation for the couple, the lock note on the name and date fields, and "Request a change".
import { h, icon, toast, openDialog, confirmDialog, fmtDate } from './dom.js';
import { api, ApiError } from './api.js';
import { NAME_FIELDS, NAME_KEYS, DATE_KEY, MAX_FIXES, DATE_DAYS, fixesLeft, valueAt, dayOf, labelOf } from '../core/event-lock.js';

export const LOCK_WARNING = 'After you publish, the names and the wedding date are locked to this wedding. You can fix spelling up to 3 times (small fixes of up to 3 letters). Photos, wording, music, venues and times stay editable.';

const dayText = (day) => (day ? fmtDate(`${day}T12:00:00`, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '');

/**
 * Before the first publish (the couple only): "Preview your invitation", the names and the date as they will be
 * locked, the warning, and a required "I have checked" box. Resolves true to publish.
 */
export function publishConfirm({ data, slug }) {
  return new Promise((resolve) => {
    let ok = false;
    const rows = NAME_FIELDS.map((f) => {
      const en = valueAt(data, [...f.path, 'en'].join('.'));
      const ne = valueAt(data, [...f.path, 'ne'].join('.'));
      return en || ne ? h('div', h('dt', f.label.replace(/’s first name$/, '')), h('dd', en, en && ne ? ' · ' : '', ne ? h('span', { lang: 'ne' }, ne) : null)) : null;
    }).filter(Boolean);
    const day = dayOf(data.weddingDate);
    rows.push(h('div', h('dt', 'Wedding date'), h('dd', dayText(day) || 'Not set')));
    const check = h('input', { type: 'checkbox', id: 'pub-check', required: true });
    const go = h('button.btn.btn--primary', { type: 'button', disabled: true, onclick: () => { ok = true; d.close(); } }, icon('send', 16), 'Publish');
    check.addEventListener('change', () => { go.disabled = !check.checked; });
    const d = openDialog({
      title: 'Check before you publish',
      body: [
        h('p.dialog__text', 'Open the preview and read the names and the date once more. This is how guests will see them.'),
        h('p', h('a.btn', { href: `/${data.theme}/?id=${encodeURIComponent(slug)}`, target: '_blank', rel: 'noopener' }, icon('eye', 16), 'Preview your invitation')),
        h('dl.kv.kv--rows.lockpub__names', rows),
        h('p.notice.notice--warn', icon('lock', 16), h('span', LOCK_WARNING)),
        h('label.lockpub__check', check, h('span', 'I have checked the names and date')),
      ],
      actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), go],
      onClose: () => resolve(ok),
    });
  });
}

/** The fields a couple can ask about: every locked name, and the date. */
const requestable = (lock) => [...NAME_KEYS.filter((k) => lock?.names?.[k.key]), { key: DATE_KEY, label: labelOf(DATE_KEY) }];
const currentOf = (lock, key) => (key === DATE_KEY ? lock?.date || '' : lock?.names?.[key] || '');

/**
 * "Request a change" (POST /api/invitations/:slug/change-requests): which field, the new value, why. Staff answer it
 * on Change requests; the couple gets an email. onDone(request) after it was sent.
 */
export function requestChangeDialog({ slug, lock, field = '', onDone = () => {} }) {
  const opts = requestable(lock);
  const sel = h('select.input', { id: 'cr-field' }, opts.map((o) => h('option', { value: o.key, selected: o.key === field }, o.label)));
  const now = h('p.hint', { id: 'cr-now' });
  const valBox = h('div');
  let input = null;
  const draw = () => {
    const key = sel.value;
    const cur = currentOf(lock, key);
    now.textContent = cur ? `Now: ${key === DATE_KEY ? dayText(cur) : cur}` : '';
    input = key === DATE_KEY
      ? h('input.input', { id: 'cr-value', type: 'date', value: cur, min: '2020-01-01', max: '2099-12-31', 'aria-describedby': 'cr-now' })
      : h('input.input', { id: 'cr-value', type: 'text', maxlength: 240, value: cur, autocomplete: 'off', 'aria-describedby': 'cr-now' });
    valBox.replaceChildren(h('label.label', { for: 'cr-value' }, 'New value'), input, now);
  };
  sel.addEventListener('change', draw);
  draw();
  const reason = h('textarea.input', { id: 'cr-reason', rows: 3, maxlength: 500, placeholder: 'For example: the groom’s name was typed wrong on the order.' });
  const err = h('p.form-error', { role: 'alert' });
  const send = h('button.btn.btn--primary', { type: 'submit', form: 'cr-form' }, 'Send request');
  const form = h('form.stack', { id: 'cr-form', novalidate: true },
    h('p.dialog__text', 'The names and the date are locked to this wedding. Tell us what to change and why; we check it and email you.'),
    h('div.field', h('label.label', { for: 'cr-field' }, 'What to change'), sel),
    h('div.field', valBox),
    h('div.field', h('label.label', { for: 'cr-reason' }, 'Why'), reason),
    err);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    if (!input.value.trim()) { err.textContent = 'Please enter the new value.'; input.focus(); return; }
    if (reason.value.trim().length < 3) { err.textContent = 'Please tell us why.'; reason.focus(); return; }
    send.disabled = true;
    try {
      const out = await api(`/invitations/${slug}/change-requests`, { method: 'POST', body: { field: sel.value, value: input.value, reason: reason.value } });
      d.close();
      toast('Request sent. We will email you when it is done.', 'success');
      onDone(out.request);
    } catch (ex) {
      err.textContent = ex instanceof ApiError ? ex.message : 'Could not send. Please try again.';
      send.disabled = false;
    }
  });
  const d = openDialog({ title: 'Request a change', body: form, actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), send] });
  return d;
}

/** A request's status as a pill. */
export const requestPill = (r) => (r.status === 'approved' ? h('span.pill.pill--ok', 'Changed') : r.status === 'declined' ? h('span.pill.pill--warn', 'Declined') : h('span.pill.pill--muted', 'Waiting'));

/**
 * The lock note on a group of name fields (ctx: a module's context, its session and scoped on()) (or the date): "Locked to this wedding · 2 of 3 spelling fixes left", and
 * with no fixes left the locked inputs turn read-only with a "Request a change" link. Follows session 'lock' events.
 * keys: the event-lock keys inside `node` ('couple.bride.name.en', ..., or 'weddingDate').
 */
export function lockNote(ctx, node, keys) {
  const session = ctx.session;
  if (!session || session.isAdmin) return node;
  const note = h('p.locknote', { hidden: true });
  const draw = () => {
    const lock = session.lock;
    const locked = lock ? keys.filter((k) => (k === DATE_KEY ? lock.date : lock.names?.[k])) : [];
    note.hidden = !locked.length;
    if (!locked.length) { for (const el of node.querySelectorAll('[data-path]')) el.readOnly = false; return; }
    const isDate = keys.includes(DATE_KEY);
    const left = fixesLeft(lock);
    const ask = h('button.link', { type: 'button', onclick: () => session.requestChange(locked[0]) }, 'Request a change');
    note.replaceChildren(icon('lock', 14), h('span',
      isDate ? `Locked to this wedding: the date can move up to ${DATE_DAYS} days from ${dayText(lock.date)}. ` : left ? `Locked to this wedding · ${left} of ${MAX_FIXES} spelling fixes left (up to 3 letters each). ` : 'Locked to this wedding. No spelling fixes left. ',
      ask));
    for (const el of node.querySelectorAll('[data-path]')) el.readOnly = !isDate && !left && locked.includes(el.dataset.path);
  };
  draw();
  ctx.on('lock', draw);
  node.append(note);
  return node;
}

/** Staff only, on Names and families: the lock's state and "Reset name lock" (free again until the next publish). */
export function adminLockBar(ctx) {
  const session = ctx.session;
  if (!session?.isAdmin) return null;
  const box = h('div');
  const draw = () => {
    const lock = session.lock;
    box.hidden = !lock;
    if (!lock) { box.replaceChildren(); return; }
    box.replaceChildren(h('p.notice', icon('lock', 16), h('span',
      `Names and date are locked to this wedding${lock.lockedAt ? ` since ${fmtDate(lock.lockedAt)}` : ''}: the couple has used ${lock.fixesUsed} of ${MAX_FIXES} spelling fixes. Your own edits are never blocked. `,
      h('button.link', { type: 'button', onclick: unlock }, 'Reset name lock'))));
  };
  async function unlock() {
    if (!(await confirmDialog({ title: 'Reset the name lock?', message: 'The couple can change the names and the date freely until they publish again; then they are locked again with 3 new spelling fixes.', confirm: 'Reset lock' }))) return;
    try {
      await api(`/invitations/${session.slug}/lock`, { method: 'DELETE' });
      session.setLock(null);
      toast('Name lock reset', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }
  draw();
  ctx.on('lock', draw);
  return box;
}
