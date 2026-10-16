// The studio's addresses: clean paths (/studio/orders/NM-12345, /studio/i/<slug>/photos, /studio/replies?i=<slug>) with
// the History API. Code inside the studio keeps speaking in the short form '#/orders/NM-12345' (route strings), and
// this module turns them into paths. Links written as href="#/…" are caught by one delegated click handler.
//
// One exception, on purpose: a couple's private link /studio/#/c/<token> keeps the token in the HASH. A hash is never
// sent to the server or written to its logs; a path would be. The password page reads it there, and signing in
// replaces the address with a clean path, so the token leaves the address bar and the history.
export const BASE = '/studio';

/** '#/orders/NM-1?f=x' -> '/studio/orders/NM-1?f=x' ('#/' and '' -> '/studio/'). */
export function toPath(route) {
  const r = String(route || '').replace(/^#?\/?/, '');
  return `${BASE}/${r}`;
}

/** The current address as a route string ('#/orders/NM-1?f=x'); a couple's '#/c/<token>' stays as it is. */
export function current() {
  if (/^#\/c\//.test(location.hash)) return location.hash;
  let p = location.pathname;
  if (p === BASE || p.startsWith(`${BASE}/`)) p = p.slice(BASE.length);
  p = p.replace(/^\/+/, '').replace(/\/index\.html$/, '').replace(/\/+$/, '');
  // a cache-busting ?fresh= (Clear cache) is not part of the route
  const q = new URLSearchParams(location.search);
  q.delete('fresh');
  const qs = q.toString();
  return `#/${p}${qs ? `?${qs}` : ''}`;
}

let onRoute = () => {};
let lastRef = () => {};
const here = () => `${location.pathname}${location.search}`;
/** The router to call on Back / Forward and after navigate(). */
export function startNav(fn) {
  onRoute = fn;
  // Old '#/…' addresses (bookmarks, links sent before): the same place at its clean path.
  if (/^#\/(?!c\/)/.test(location.hash)) history.replaceState(history.state, '', toPath(location.hash));
  // Back / Forward. A jump to an anchor (the skip link's #main) changes no route: nothing to do.
  let last = here();
  window.addEventListener('popstate', () => { const now = here(); if (now === last && !/^#\/c\//.test(location.hash)) return; last = now; onRoute(); });
  lastRef = (v) => { last = v; };
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target instanceof Element ? e.target.closest(`a[href^="#/"], a[href^="${BASE}/"]`) : null;
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const href = a.getAttribute('href');
    if (href.includes('#/c/')) return; // a couple link: the page loads it (the token stays in the hash)
    e.preventDefault();
    navigate(href.startsWith('#/') ? href : `#${href.slice(BASE.length)}`);
  });
}

/** Goes to a route (a new history entry, or the same one with { replace: true }) and runs the router. */
export function navigate(route, { replace = false } = {}) {
  const path = toPath(route);
  if (path !== here() || location.hash) history[replace ? 'replaceState' : 'pushState'](null, '', path);
  lastRef(here());
  onRoute();
}

/** Changes the address without routing (a filter, a closed drawer): replaceState. */
export const setUrl = (route) => { history.replaceState(history.state, '', toPath(route)); lastRef(here()); };

/** Real href for a route ('#/orders' -> '/studio/orders'), so a link also opens right in a new tab. */
export const hrefOf = (route) => (typeof route === 'string' && route.startsWith('#/') ? toPath(route) : route);
