// One open invitation: the editable model, autosave, publish. Shared by every module and the preview.
import { h, icon, toast, openDialog } from './dom.js';
import { api, ApiError } from './api.js';
import { createModel } from './fields.js';

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
  const subs = { edit: new Set(), saved: new Set(), state: new Set(), errors: new Set(), status: new Set() };
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

  let lastErrors = [];
  async function save() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (inflight) await inflight;
    if (!pending || inflight) return;
    pending = false;
    inflight = (async () => {
      try {
        const out = await api(`/invitations/${slug}`, { method: 'PUT', body: { version, data: m.data } });
        version = out.version;
        doc.changed = out.changed;
        mergeServerFields(m.data, out.data);
        if (lastErrors.length) { lastErrors = []; emit('errors', lastErrors); }
        if (!pending) setState('saved');
        emit('saved', out);
        emit('status', doc);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
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
    try {
      const out = await api(`/invitations/${slug}/publish`, { method: 'POST' });
      Object.assign(doc, { status: out.status, changed: out.changed, publishedAt: out.publishedAt });
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
    save, flush, publish, unpublish,
    destroy() {
      clearTimeout(saveTimer);
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('online', online);
      Object.values(subs).forEach((s) => s.clear());
    },
  };
}
