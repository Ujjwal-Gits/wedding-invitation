// One open invitation: the editable model, autosave, publish. Shared by every module and the preview.
import { h, icon, toast, openDialog, confirmDialog } from './dom.js';
import { api, ApiError } from './api.js';
import { createModel } from './fields.js';
import { checkLock, isNameKey, blockedMessage, fixesLeft, valueAt, setAt, labelOf, DATE_KEY } from '../core/event-lock.js';
import { publishConfirm, requestChangeDialog } from './lock-ui.js';

export const label = (v, f = '') => (v && (v.en || v.ne)) || f;
export const coupleName = (b, g) => [label(b), label(g)].filter(Boolean).join(' & ') || 'Untitled invitation';

const SAVE_DELAY = 700;

/** Text of the field being edited right now (sent to the preview so it can show where the words appear). */
function activeText() {
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return '';
  if (el instanceof HTMLInputElement && !['text', 'search', ''].includes(el.type)) return '';
  return el.value.trim().slice(0, 120);
}

export function createSession(doc, { meta, me }) {
  const slug = doc.slug;
  let version = doc.version;
  let saveTimer = null;
  let inflight = null;
  let pending = false;
  let state = 'saved';
  const subs = { edit: new Set(), saved: new Set(), state: new Set(), errors: new Set(), status: new Set(), lock: new Set() };
  const emit = (k, v) => subs[k].forEach((fn) => { try { fn(v); } catch (err) { console.error(err); } });

  const isAdmin = me.role === 'admin';
  // Unknown permissions (older server) fall back to what that server allowed.
  const perms = isAdmin
    ? { themes: 'all', canChangeTheme: true, canChangeColors: true }
    : { themes: me.perms?.themes ?? 'all', canChangeTheme: me.perms?.canChangeTheme ?? true, canChangeColors: me.perms?.canChangeColors ?? true };

  const m = createModel(doc.data, (path) => {
    pending = true;
    setState('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, SAVE_DELAY);
    emit('edit', { path, text: activeText() });
  });

  // ── Save indicator ("Saved" / "Saving…" / "Offline"). Fixed width, text only changes: it never moves anything.
  // Only one copy announces (aria-live), the others are visual (the phone's top bar, the page header).
  const STATES = { saved: 'Saved', saving: 'Saving…', offline: 'Offline', error: 'Not saved', invalid: 'Check a field' };
  const chips = new Set();
  const makeSaveChip = (live = false) => {
    const el = h('span.savechip', { 'data-state': state, ...(live ? { role: 'status', 'aria-live': 'polite' } : { 'aria-hidden': 'true' }) },
      h('span.savechip__dot', { 'aria-hidden': 'true' }), h('span.savechip__t', STATES[state] || state));
    chips.add(el);
    return el;
  };
  const saveEl = makeSaveChip(true);
  function setState(s) {
    if (s === state && chips.size) { emit('state', s); return; }
    state = s;
    for (const el of chips) { el.dataset.state = s; el.lastChild.textContent = STATES[s] || s; el.title = s === 'offline' ? 'No connection. Your changes are kept and saved when you are back online.' : ''; }
    emit('state', s);
  }

  // ── Event lock (src/core/event-lock.js; the server enforces it): after the first publish the couple's names and
  // date are locked. A name being typed is saved when the field is left (one spelling fix per save, so the letters
  // in between never use one up), after a "Save this spelling fix?" check. A change that is not allowed goes back to
  // the locked value at once, with a way to ask for it.
  const lockOn = () => !isAdmin && Boolean(doc.lock);
  let asking = false;
  const lockedFocus = () => { const el = document.activeElement; return lockOn() && Boolean(el?.dataset?.path) && isNameKey(el.dataset.path); };
  function setLock(lock) { doc.lock = lock || null; emit('lock', doc.lock); }
  /** Puts these keys back to their locked values (model and inputs), then saves. */
  function revert(keys) {
    for (const key of keys) {
      const v = key === DATE_KEY ? doc.lock.date : doc.lock.names?.[key] || '';
      if (key === DATE_KEY) m.data.weddingDate = `${v}${String(m.data.weddingDate || '').slice(10) || 'T10:30:00+05:45'}`;
      else setAt(m.data, key, v);
      for (const el of document.querySelectorAll(`[data-path="${key}"]`)) el.value = v;
    }
    if (keys.length) m.touch(keys[0] === DATE_KEY ? ['weddingDate'] : keys[0].split('.'));
  }
  function requestChange(field = '') {
    requestChangeDialog({ slug, lock: doc.lock, field, onDone: () => emit('lock', doc.lock) });
  }
  function showLocked(blocked) {
    const d = openDialog({
      title: 'Locked to this wedding',
      body: [h('p.dialog__text', blockedMessage(blocked)), h('p.hint', icon('info', 14), h('span', `We put ${blocked.map((b) => labelOf(b.key)).join(', ')} back as it was. Everything else you changed is saved.`))],
      actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'OK'), h('button.btn.btn--primary', { type: 'button', onclick: () => { d.close(); requestChange(blocked[0].key); } }, 'Request a change')],
    });
  }
  /** A locked name field was left: check the change, and ask before a spelling fix is used. */
  async function onFieldOut(e) {
    const path = e.target?.dataset?.path;
    if (!lockOn() || !path || !isNameKey(path) || asking) return;
    const r = checkLock(doc.lock, m.data);
    const names = r.blocked.filter((b) => isNameKey(b.key));
    if (names.length) { revert(names.map((b) => b.key)); showLocked(names); return; }
    if (r.usesFix) {
      asking = true;
      const what = r.fixed.map((k) => `${labelOf(k)}: “${doc.lock.names[k]}” to “${valueAt(m.data, k) || '(empty)'}”`).join('; ');
      const left = fixesLeft(doc.lock);
      const ok = await confirmDialog({ title: 'Save this spelling fix?', message: `${what}. This uses 1 of your ${left} spelling fix${left === 1 ? '' : 'es'} left. Each fix can change up to 3 letters.`, confirm: 'Save the fix' });
      asking = false;
      if (!ok) { revert(r.fixed); return; }
      save({ force: true });
      return;
    }
    if (pending) save({ force: true });
  }
  document.addEventListener('focusout', onFieldOut);

  let lastErrors = [];
  async function save({ force = false } = {}) {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (inflight) await inflight;
    if (!pending || inflight) return;
    if (lockOn()) {
      if (asking || (!force && lockedFocus())) return; // saved when the name field is left (onFieldOut)
      const r = checkLock(doc.lock, m.data);
      if (r.blocked.length) { revert(r.blocked.map((b) => b.key)); showLocked(r.blocked); }
    }
    pending = false;
    inflight = (async () => {
      try {
        const out = await api(`/invitations/${slug}`, { method: 'PUT', body: { version, data: m.data } });
        version = out.version;
        doc.changed = out.changed;
        if ('lock' in out && JSON.stringify(out.lock) !== JSON.stringify(doc.lock || null)) setLock(out.lock);
        mergeServerFields(m.data, out.data);
        if (lastErrors.length) { lastErrors = []; emit('errors', lastErrors); }
        if (!pending) setState('saved');
        emit('saved', out);
        emit('status', doc);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409 && err.body.code === 'locked') {
          // the server's lock is newer than ours (another device): take it, put the fields back, save the rest
          try { setLock((await api(`/invitations/${slug}/change-requests`)).lock); } catch { /* keep ours */ }
          const keys = (err.body.errors || []).map((x) => x.path).filter((k) => k === DATE_KEY || isNameKey(k));
          if (doc.lock && keys.length) { revert(keys); showLocked(keys.map((key) => ({ key, reason: key === DATE_KEY ? 'date' : fixesLeft(doc.lock) ? 'big' : 'nofixes', from: doc.lock.date }))); } else { pending = true; setState('error'); toast(err.message, 'error'); }
        } else if (err instanceof ApiError && err.status === 409) {
          setState('error');
          openDialog({ title: 'Changed in another window', body: h('p.dialog__text', 'This invitation was changed somewhere else. Reload to get the latest version; nothing you saved is lost.'), actions: [h('button.btn.btn--primary', { type: 'button', onclick: () => location.reload() }, 'Reload')] });
        } else if (err instanceof ApiError && err.status === 400 && err.body.errors) {
          lastErrors = err.body.errors;
          setState('invalid');
          emit('errors', lastErrors);
        } else if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          pending = true;
          setState('error');
          if (err.status === 403) toast(err.message, 'error');
        } else {
          pending = true;
          setState('offline');
          saveTimer = setTimeout(save, 4000);
        }
      } finally {
        inflight = null;
      }
    })();
    await inflight;
  }

  /** The server adds depth maps to photos after upload; keep them without overwriting local edits. */
  function mergeServerFields(local, remote) {
    if (!local || !remote || typeof local !== 'object' || typeof remote !== 'object') return;
    if (local.lg && local.lg === remote.lg && remote.depth && !local.depth) local.depth = remote.depth;
    for (const k of Object.keys(local)) if (local[k] && typeof local[k] === 'object') mergeServerFields(local[k], remote[k]);
  }

  const flush = async () => { for (let i = 0; i < 3 && (pending || inflight); i++) await (inflight || save()); };
  const beforeUnload = (e) => { if (pending || inflight) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);
  const online = () => { if (pending) save(); };
  window.addEventListener('online', online);

  async function publish() {
    await flush();
    if (lastErrors.length) { toast('Please fix the highlighted field first.', 'error'); return false; }
    // the couple's first publish locks the names and the date: they check them first (lock-ui.js)
    if (!isAdmin && !doc.lock && !(await publishConfirm({ data: m.data, slug }))) return false;
    try {
      const out = await api(`/invitations/${slug}/publish`, { method: 'POST' });
      Object.assign(doc, { status: out.status, changed: out.changed, publishedAt: out.publishedAt });
      if ('lock' in out) setLock(out.lock);
      version = out.version ?? version;
      emit('status', doc);
      toast('Published. Your invitation is live.', 'success');
      return true;
    } catch (err) {
      if (err.body?.problems) {
        const d = openDialog({ title: 'Almost there', body: [h('p.dialog__text', 'Please add these first:'), h('ul.problems', err.body.problems.map((p) => h('li', icon('alert', 16), h('span', p))))], actions: [h('button.btn.btn--primary', { type: 'button', onclick: () => d.close() }, 'OK')] });
      } else toast(err.message, 'error');
      return false;
    }
  }

  async function unpublish() {
    try {
      const out = await api(`/invitations/${slug}/unpublish`, { method: 'POST' });
      Object.assign(doc, { status: out.status, changed: false });
      version = out.version ?? version;
      emit('status', doc);
      toast('The invitation is offline', 'success');
      return true;
    } catch (err) { toast(err.message, 'error'); return false; }
  }

  return {
    slug, doc, m, meta, me, isAdmin, perms, saveEl, makeSaveChip,
    get state() { return state; },
    get errors() { return lastErrors; },
    names: () => coupleName(m.data.couple?.bride?.name, m.data.couple?.groom?.name),
    themeName: (t = m.data.theme) => meta.themes.find((x) => x.slug === t)?.name || t,
    on(k, fn) { subs[k].add(fn); return () => subs[k].delete(fn); },
    save, flush, publish, unpublish, requestChange, setLock,
    get lock() { return doc.lock || null; },
    /** A name or the date typed past what the lock allows (the preview shows a PREVIEW watermark then). */
    lockBlocked: () => lockOn() && checkLock(doc.lock, m.data).blocked.length > 0,
    destroy() {
      clearTimeout(saveTimer);
      document.removeEventListener('focusout', onFieldOut);
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('online', online);
      Object.values(subs).forEach((s) => s.clear());
    },
  };
}
