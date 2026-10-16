// "Clear cache" (every dashboard): the browser's HTTP cache for this site, Cache Storage and service workers, and the
// studio's own remembered settings, then a fresh reload. The sign-in stays: the session cookie is never touched
// (the server answers with Clear-Site-Data: "cache" only) and neither are the two keys that say this browser signed in.
import { h, icon, toast } from './dom.js';
import { api } from './api.js';

/** localStorage keys that keep the sign-in working (src/studio/main.js seenFlag / coupleFlag). */
const KEEP = new Set(['nimtto-session', 'nimtto-couple']);

function sweep(store) {
  try {
    for (let i = store.length - 1; i >= 0; i--) {
      const k = store.key(i);
      if (k != null && !KEEP.has(k)) store.removeItem(k);
    }
  } catch { /* storage off */ }
}

/** before: an async step first (save what is being edited). */
export async function clearCache({ before } = {}) {
  toast('Clearing the cache…');
  try { await before?.(); } catch { /* keep going */ }
  try { await api('/clear-cache', { method: 'POST' }); } catch { /* offline: the local part still helps */ }
  try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch { /* none */ }
  try { for (const r of (await navigator.serviceWorker?.getRegistrations?.()) || []) await r.unregister(); } catch { /* none */ }
  sweep(localStorage);
  sweep(sessionStorage);
  toast('Cache cleared. Reloading…', 'success');
  const u = new URL(location.href);
  u.searchParams.set('fresh', Date.now().toString(36));
  setTimeout(() => location.replace(u.href), 700);
}

/** The small icon button for the account box (next to Sign out). */
export const clearCacheButton = (opts) => h('button.btn.btn--icon.btn--ghost', {
  type: 'button', 'aria-label': 'Clear cache', title: 'Clear cache', 'data-action': 'clearcache', onclick: () => clearCache(opts),
}, icon('refresh', 18));

/** A settings-style block: what it does and the button. */
export const clearCacheCard = (opts) => h('section.card',
  h('header.card__head', h('h2.card__title', 'Clear cache')),
  h('p.hint', 'Seeing an old version of a page or a photo? This clears what this browser stored for Nimtto and reloads. You stay signed in.'),
  h('div.row', h('button.btn', { type: 'button', onclick: () => clearCache(opts) }, icon('refresh', 16), 'Clear cache')));
