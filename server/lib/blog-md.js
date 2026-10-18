// Blog Markdown -> safe HTML (lib/blog.js, lib/blog-render.js). Two layers:
//   1. markdown-it with raw HTML OFF (anything an editor types as HTML is shown as text), our own link/image checks,
//      and a few house blocks: ## / ### headings with ids (the table of contents), GitHub-style callouts
//      (> [!TIP] ...), copy-ready wording (```copy Title), tables in a scroll box, images with captions
//      (![alt](/site/stills/kham-800.webp "Caption")), Nepali runs marked lang="ne".
//   2. sanitize-html over the result with a strict allowlist (tags, attributes, classes, URL schemes), so even a bug in
//      layer 1 cannot let a script, an event handler, a style or a javascript: URL through.
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

const CALLOUTS = { NOTE: 'Good to know', TIP: 'Tip', IMPORTANT: 'Important', WARNING: 'Careful' };
const DEVA = /[\u0900-\u097F]/;
// a run of Devanagari words, with the spaces and punctuation between them
const DEVA_RUN = /[\u0900-\u097F\u200C\u200D]+(?:[\s,.;:!?'"()/-]+[\u0900-\u097F\u200C\u200D]+)*/g;
const STILL_RE = /^\/site\/stills\/([a-z0-9-]{2,40})-(?:480|800|1170)\.webp$/;
/** where an image may come from: our own files (art, stills, the blog's uploads) */
const IMG_RE = /^\/(?:site|photos|art|themes|uploads\/_site\/blog)\/[A-Za-z0-9/_.-]{1,200}\.(?:webp|jpe?g|png|avif|svg)$/;

const DESIGN_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+){0,6}$/;
/** the designs of a ```design block: valid slugs, no repeats, at most 3 */
export const designSlugs = (text) => [...new Set(String(text || '').split(/[\s,]+/).map((x) => x.trim().toLowerCase()).filter((x) => DESIGN_SLUG.test(x) && x.length <= 40))].slice(0, 3);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const markNe = (escaped) => escaped.replace(DEVA_RUN, (m) => `<span lang="ne">${m}</span>`);

/** a heading's id: plain words, lower case, hyphens (Devanagari kept), unique on the page */
export function slugifyHeading(text) {
  const s = String(text).normalize('NFKC').toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9\u0900-\u097F]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || 'section';
}

/** Links the editor may write: https/http, mailto, tel, a path on this site or an anchor. Never javascript:, data: ... */
export function safeHref(url) {
  const u = String(url || '').trim();
  if (/^(?:https?:\/\/|mailto:|tel:)/i.test(u)) return !/[\s<>"]/.test(u);
  if (/^\/(?!\/)/.test(u) || /^#[\w-]{1,80}$/.test(u)) return !/[\s<>"\\]/.test(u);
  return false;
}

function makeMd() {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false, breaks: false });
  md.validateLink = (url) => safeHref(url) || IMG_RE.test(url) || /^https:\/\//.test(url);

  // text: escaped, Devanagari runs in <span lang="ne"> (the Nepali font, locl off: site.css)
  md.renderer.rules.text = (tokens, i) => markNe(esc(tokens[i].content));

  md.core.ruler.push('nimtto_blocks', (state) => {
    const tokens = state.tokens;
    const used = new Map();
    const toc = [];
    const stack = [];
    for (let i = 0; i < tokens.length; i += 1) {
      const t = tokens[i];
      if (t.type === 'heading_open') {
        // the page has its own H1: a body "# Heading" becomes an H2; H5 and H6 become H4
        let level = Number(t.tag.slice(1));
        if (level === 1) level = 2;
        if (level > 4) level = 4;
        t.tag = `h${level}`;
        tokens[i + 2].tag = t.tag;
        const inline = tokens[i + 1];
        const text = inline.children.filter((c) => c.type === 'text' || c.type === 'code_inline').map((c) => c.content).join('').trim();
        let id = slugifyHeading(text);
        const n = (used.get(id) || 0) + 1;
        used.set(id, n);
        if (n > 1) id = `${id}-${n}`;
        t.attrSet('id', id);
        if (level <= 3 && text) toc.push({ level, id, text });
      } else if (t.type === 'blockquote_open') {
        // > [!TIP] ... : a callout
        const inline = tokens[i + 1]?.type === 'paragraph_open' ? tokens[i + 2] : null;
        const first = inline?.children?.[0];
        const m = first?.type === 'text' ? /^\[!(NOTE|TIP|IMPORTANT|WARNING)\]\s*/i.exec(first.content) : null;
        if (m) {
          const kind = m[1].toUpperCase();
          first.content = first.content.slice(m[0].length);
          if (!first.content && inline.children[1]?.type === 'softbreak') inline.children.splice(0, 2);
          inline.content = inline.content.replace(/^\[![A-Za-z]+\]\s*/, '');
          t.meta = { callout: kind };
        }
        stack.push(t);
      } else if (t.type === 'blockquote_close') {
        const open = stack.pop();
        if (open?.meta?.callout) t.meta = { callout: open.meta.callout };
      } else if (t.type === 'paragraph_open') {
        // a paragraph that is only an image becomes a <figure> (no <p> around it)
        const inline = tokens[i + 1];
        const kids = inline?.children || [];
        if (kids.length === 1 && kids[0].type === 'image') {
          t.hidden = true;
          tokens[i + 2].hidden = true;
          kids[0].meta = { block: true };
        }
      }
    }
    state.env.toc = toc;
  });

  md.renderer.rules.blockquote_open = (tokens, i, opts, env, self) => {
    const c = tokens[i].meta?.callout;
    if (!c) return self.renderToken(tokens, i, opts);
    return `<aside class="callout callout--${c.toLowerCase()}" role="note"><p class="callout__label">${CALLOUTS[c]}</p>\n`;
  };
  md.renderer.rules.blockquote_close = (tokens, i, opts, env, self) => (tokens[i].meta?.callout ? '</aside>\n' : self.renderToken(tokens, i, opts));

  md.renderer.rules.fence = (tokens, i, opts, env) => {
    const t = tokens[i];
    const info = t.info.trim();
    const body = t.content.replace(/\n$/, '');
    // ```design + "kham, mahal": a design card (1 to 3 designs). Only a slot here: lib/blog-render.js fills it from the
    // catalog for the post's website (unknown or hidden designs are skipped, an empty slot disappears).
    if (/^design$/i.test(info)) {
      const slugs = designSlugs(body);
      if (slugs.length) { env.designs = [...(env.designs || []), ...slugs]; return `<aside class="bdc-slot" data-designs="${slugs.join(',')}"></aside>\n`; }
      return '';
    }
    if (/^copy(?:\s|$)/i.test(info)) {
      const title = info.slice(4).trim().slice(0, 120);
      const ne = DEVA.test(body) ? ' lang="ne"' : '';
      return `<figure class="copy">${title ? `<figcaption class="copy__t">${markNe(esc(title))}</figcaption>` : ''}<pre class="copy__text"${ne}>${esc(body)}</pre></figure>\n`;
    }
    return `<pre class="code"><code>${esc(body)}</code></pre>\n`;
  };
  md.renderer.rules.code_block = (tokens, i) => `<pre class="code"><code>${esc(tokens[i].content.replace(/\n$/, ''))}</code></pre>\n`;

  md.renderer.rules.table_open = () => '<div class="tbl" role="region" aria-label="Table" tabindex="0"><table>\n';
  md.renderer.rules.table_close = () => '</table></div>\n';

  md.renderer.rules.link_open = (tokens, i, opts, env, self) => {
    const t = tokens[i];
    const href = t.attrGet('href') || '';
    if (/^https?:\/\//i.test(href) && !/^https:\/\/(?:www\.)?nimtto\.com(?:\/|$)/i.test(href)) t.attrSet('rel', 'noopener');
    return self.renderToken(tokens, i, opts);
  };

  md.renderer.rules.image = (tokens, i, opts, env) => {
    const t = tokens[i];
    const src = t.attrGet('src') || '';
    const alt = t.children?.length ? t.children.map((c) => c.content).join('') : t.content;
    const title = t.attrGet('title') || '';
    if (!IMG_RE.test(src)) return t.meta?.block ? `<p>${esc(alt)}</p>` : esc(alt); // its words, never a remote picture
    const still = STILL_RE.exec(src);
    const img = still
      ? `<span class="phone"><img src="/site/stills/${still[1]}-800.webp" srcset="/site/stills/${still[1]}-480.webp 480w, /site/stills/${still[1]}-800.webp 800w" sizes="(max-width: 599px) 56vw, 260px" width="390" height="844" alt="${esc(alt)}" loading="lazy" decoding="async"></span>`
      : `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
    if (!t.meta?.block) return img;
    env.images = env.images || [];
    env.images.push(src);
    return `<figure class="fig${still ? ' fig--phone' : ''}">${img}${title ? `<figcaption>${markNe(esc(title))}</figcaption>` : ''}</figure>\n`;
  };
  return md;
}

const md = makeMd();

const CLASSES = {
  aside: ['callout', 'callout--note', 'callout--tip', 'callout--important', 'callout--warning', 'bdc-slot'],
  p: ['callout__label'],
  figure: ['copy', 'fig', 'fig--phone'],
  figcaption: ['copy__t'],
  pre: ['copy__text', 'code'],
  span: ['phone'],
  div: ['tbl'],
};
const SANITIZE = {
  allowedTags: ['h2', 'h3', 'h4', 'p', 'br', 'hr', 'strong', 'em', 's', 'del', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'blockquote',
    'aside', 'figure', 'figcaption', 'img', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'sup', 'sub'],
  allowedAttributes: {
    h2: ['id'], h3: ['id'], h4: ['id'],
    a: ['href', 'rel', 'title'],
    img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding'],
    span: ['lang', 'class'], pre: ['lang', 'class'], aside: ['class', 'role', 'data-designs'], figure: ['class'], figcaption: ['class'], p: ['class'],
    div: ['class', 'role', 'aria-label', 'tabindex'], ol: ['start'], th: ['style'], td: ['style'],
  },
  allowedClasses: CLASSES,
  allowedStyles: { th: { 'text-align': [/^(?:left|right|center)$/] }, td: { 'text-align': [/^(?:left|right|center)$/] } },
  allowedSchemes: ['https', 'http', 'mailto', 'tel'],
  allowedSchemesByTag: { img: [] },
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'escape',
  exclusiveFilter: (frame) => (frame.tag === 'img' && !IMG_RE.test(frame.attribs.src || '')),
  transformTags: {
    a: (tag, attribs) => (safeHref(attribs.href) ? { tagName: 'a', attribs } : { tagName: 'span', attribs: {} }),
    aside: (tag, attribs) => {
      const out = { ...attribs };
      if ('data-designs' in out) { const v = designSlugs(out['data-designs']).join(','); if (v && out.class === 'bdc-slot') out['data-designs'] = v; else delete out['data-designs']; }
      return { tagName: 'aside', attribs: out };
    },
    span: (tag, attribs) => ({ tagName: 'span', attribs: attribs.lang && attribs.lang !== 'ne' ? { ...attribs, lang: 'ne' } : attribs }),
  },
};
export const sanitize = (html) => sanitizeHtml(html, SANITIZE);

/** Plain words of a Markdown text (the word count, reading time, RSS and llms-full.txt). */
export function plainText(markdown) {
  const env = {};
  const tokens = md.parse(String(markdown || ''), env);
  const out = [];
  for (const t of tokens) {
    if (t.type === 'inline') out.push(t.children.filter((c) => c.type === 'text' || c.type === 'code_inline').map((c) => c.content).join(''));
    else if ((t.type === 'fence' && !/^design$/i.test(t.info.trim())) || t.type === 'code_block') out.push(t.content);
  }
  return out.join('\n').replace(/\[![A-Z]+\]\s*/g, '').replace(/\n{3,}/g, '\n\n').trim();
}
export const wordCount = (text) => (String(text).match(/[A-Za-z0-9\u0900-\u097F][A-Za-z0-9\u0900-\u097F'’.-]*/g) || []).length;

/** { html, toc: [{ level, id, text }], words, images: [src] } for a post body. */
export function renderMarkdown(markdown) {
  const env = {};
  const raw = md.render(String(markdown || ''), env);
  const words = wordCount(plainText(markdown));
  return { html: sanitize(raw), toc: env.toc || [], words, images: env.images || [], designs: [...new Set(env.designs || [])] };
}

/** One line of inline Markdown (an FAQ answer): safe HTML, and its plain text for JSON-LD. */
export function renderInline(text) {
  const html = sanitize(md.renderInline(String(text || '')));
  const plain = md.parseInline(String(text || ''), {})[0]?.children.filter((c) => c.type === 'text' || c.type === 'code_inline').map((c) => c.content).join('') || '';
  return { html, plain };
}
