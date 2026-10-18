// The blog guides each landing page links to (src/site/landing.mjs puts them in its "More" links), so search engines
// and readers find the long answers from the pages that sell. Titles come from the built-in posts themselves
// (src/blog/posts/<site>/<slug>.md), so a renamed post never leaves a stale link text. A slug that is not a built-in
// post is skipped. Edit the map here; landing data stays with src/site/landings.mjs.
// Plain module: Node runs it at build, never the browser.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DIR = resolve(import.meta.dirname, '..', 'blog', 'posts');
const BASE = { np: '/blog/', intl: '/international/blog/' };

/** landing id (src/site/landings.mjs) -> [site, slug] of the guides it links to */
export const RELATED_POSTS = {
  'np-wedding': [['np', 'wedding-invitation-wording-nepali-english'], ['np', 'digital-vs-printed-wedding-cards-nepal']],
  'np-bratabandha': [['np', 'bratabandha-invitation-guide']],
  'np-pasni': [['np', 'pasni-invitation-guide']],
  'np-nwaran': [['np', 'pasni-invitation-guide']],
  'np-reception': [['np', 'wedding-invitation-wording-nepali-english']],
  'np-abroad': [['np', 'invite-relatives-abroad-nepal-wedding']],
  'i-nepali': [['intl', 'nepali-south-asian-weddings-usa'], ['intl', 'wedding-invitation-wording-examples']],
  'i-southasian': [['intl', 'nepali-south-asian-weddings-usa'], ['intl', 'when-to-send-wedding-invitations']],
  'i-rsvp': [['intl', 'how-to-collect-rsvps-online'], ['intl', 'digital-wedding-invitation-etiquette']],
  'i-usa': [['intl', 'digital-wedding-invitation-etiquette'], ['intl', 'when-to-send-wedding-invitations']],
  'i-wedding': [['intl', 'wedding-invitation-wording-examples'], ['intl', 'how-to-collect-rsvps-online']],
};

const titles = new Map();
function titleOf(site, slug) {
  const k = `${site}/${slug}`;
  if (!titles.has(k)) {
    const f = resolve(DIR, site, `${slug}.md`);
    let t = null;
    if (existsSync(f)) {
      const m = /^---\s*\n([\s\S]*?)\n---/.exec(readFileSync(f, 'utf8').replace(/\r\n?/g, '\n'));
      try { const meta = m && JSON.parse(m[1]); if (meta?.status !== 'draft') t = meta?.title || null; } catch { t = null; }
    }
    titles.set(k, t);
  }
  return titles.get(k);
}

/** [[link text, path]] of the guides for one landing page */
export function guideLinks(id) {
  return (RELATED_POSTS[id] || []).map(([site, slug]) => [titleOf(site, slug), `${BASE[site]}${slug}/`]).filter(([t]) => t).map(([t, p]) => [`Guide: ${t}`, p]);
}
