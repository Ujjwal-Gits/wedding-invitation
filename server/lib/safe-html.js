// Text and a tiny safe subset of HTML for the website's editable words (lib/content.js, the studio's Content page).
// The editor writes plain text in which only <b>, <strong>, <i>, <em> and <a href> are markup; everything else is text
// (escaped on the way out). Links may only go to https://, mailto:, tel: or a path on this site (/...). Nothing the
// editor types can add an attribute, a script, a style or an event handler: the output is rebuilt tag by tag here.

const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g;
/** Tags allowed in answers, intros and footer lines. */
export const INLINE = new Set(['b', 'strong', 'i', 'em', 'a']);
/** Tags allowed in a page heading (the design's italic accent). */
export const HEADING = new Set(['em']);
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^<>]*)>/g;

export const escText = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const escAttr = escText;

const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', hellip: '…', middot: '·', copy: '©' };
/** Decodes the character references a built page uses (named ones above, and every numeric one). */
export function decodeEntities(s) {
  return String(s ?? '').replace(/&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 0 && n <= 0x10FFFF && !(n >= 0xD800 && n <= 0xDFFF) ? String.fromCodePoint(n) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/** NFC, no control or bidi-override characters; `oneLine` folds line breaks into spaces. */
export function normalizeText(s, { oneLine = true } = {}) {
  let out = String(s ?? '').normalize('NFC').replace(CTRL, '');
  out = oneLine ? out.replace(/\s*[\r\n]+\s*/g, ' ') : out.replace(/\r\n?/g, '\n');
  return out.replace(/[ \t ]{2,}/g, ' ').trim();
}

/** A link target the editor may use, or '' (https://host..., mailto:, tel:, or /path on this site; never //host). */
export function safeHref(raw) {
  const v = decodeEntities(String(raw ?? '')).trim();
  if (!v || v.length > 500 || /[\s"'<>\\`]/.test(v)) return '';
  if (/^https:\/\//i.test(v)) {
    try { const u = new URL(v); return u.protocol === 'https:' && u.hostname && !u.username && !u.password ? v : ''; } catch { return ''; }
  }
  if (/^mailto:[^@\s]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}(\?[^\s]*)?$/i.test(v)) return v;
  if (/^tel:\+?[0-9().-]{3,24}$/i.test(v)) return v;
  if (/^\/(?![/\\])[A-Za-z0-9\-._~/?#[\]@!$&()*+,;=%:]*$/.test(v)) return v;
  return '';
}

const attrOf = (attrs, name) => {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+))`, 'i').exec(attrs || '');
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : null;
};

/**
 * The editor's text as safe HTML: text escaped, only `allowed` tags kept (attributes dropped, except a checked href
 * on <a>), tags balanced, <a> never nested. Unknown tags vanish and their text stays.
 */
export function cleanInline(input, allowed = INLINE) {
  const s = String(input ?? '');
  let out = '';
  let at = 0;
  const stack = [];
  for (const m of s.matchAll(TAG)) {
    out += escText(s.slice(at, m.index));
    at = m.index + m[0].length;
    const close = m[1] === '/';
    const name = m[2].toLowerCase();
    if (!allowed.has(name)) continue;
    if (close) {
      const i = stack.lastIndexOf(name);
      if (i < 0) continue;
      while (stack.length > i) out += `</${stack.pop()}>`;
      continue;
    }
    if (stack.length >= 4) continue;
    if (name === 'a') {
      if (stack.includes('a')) continue;
      const href = safeHref(attrOf(m[3], 'href'));
      if (!href) continue;
      out += `<a href="${escAttr(href)}">`;
    } else out += `<${name}>`;
    stack.push(name);
  }
  out += escText(s.slice(at));
  while (stack.length) out += `</${stack.pop()}>`;
  return out;
}

/** Plain text of safe HTML from cleanInline (for meta tags and JSON-LD). */
export const inlineText = (html) => decodeEntities(String(html ?? '').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

/** What is wrong with the editor's markup, or '' (unknown tags, links that are not allowed). */
export function inlineProblem(input, allowed = INLINE) {
  for (const m of String(input ?? '').matchAll(TAG)) {
    const name = m[2].toLowerCase();
    if (!allowed.has(name)) return allowed === HEADING ? 'Only <em> is allowed in a heading.' : 'Only <b>, <i>, <em>, <strong> and <a href="..."> are allowed.';
    if (name === 'a' && m[1] !== '/' && !safeHref(attrOf(m[3], 'href'))) return 'Links must start with https://, mailto:, tel: or / (a page on this site).';
  }
  return '';
}

/**
 * A built page's HTML fragment as the editor's text: the allowed tags kept in their plain form, every other tag
 * removed (its text stays), character references decoded. The reverse of cleanInline for what the build writes.
 */
export function htmlToModel(fragment, allowed = INLINE) {
  const s = String(fragment ?? '');
  let out = '';
  let at = 0;
  for (const m of s.matchAll(TAG)) {
    out += decodeEntities(s.slice(at, m.index));
    at = m.index + m[0].length;
    const name = m[2].toLowerCase();
    if (!allowed.has(name)) continue;
    if (m[1] === '/') out += `</${name}>`;
    else if (name === 'a') { const href = safeHref(attrOf(m[3], 'href')); out += href ? `<a href="${href}">` : ''; } else out += `<${name}>`;
  }
  out += decodeEntities(s.slice(at));
  return out.replace(/\s+/g, ' ').trim();
}
