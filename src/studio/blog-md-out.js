// The Blog editor's document -> the Markdown the server stores and renders (server/lib/blog-md.js). Plain functions over
// the editor's JSON (ProseMirror doc.toJSON()), no DOM, so the server tests run them too (server/test/blog-editor.test.js).
// The editor opens a post from the server's rendered HTML (blog-editor.js parses it), so one stored format serves the
// visual editor, the Markdown view, the built-in post files and every post saved before the editor existed.
// House blocks: callout -> "> [!TIP]", copyBlock -> "```copy Title", figure -> ![alt](src "caption"), tables -> pipes.

const CALLOUT_KINDS = ['NOTE', 'TIP', 'IMPORTANT', 'WARNING'];
const DESIGN_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+){0,6}$/;
/** the designs of a design card (server/lib/blog-md.js designSlugs): valid slugs, no repeats, at most 3 */
export const designSlugs = (text) => [...new Set(String(text || '').split(/[\s,]+/).map((x) => x.trim().toLowerCase()).filter((x) => DESIGN_SLUG.test(x) && x.length <= 40))].slice(0, 3);

/** links the server keeps (server/lib/blog-md.js safeHref): https/http, mailto, tel, a path on this site, an anchor */
export function safeHref(url) {
  const u = String(url || '').trim();
  if (/^(?:https?:\/\/|mailto:|tel:)/i.test(u)) return !/[\s<>"]/.test(u);
  if (/^\/(?!\/)/.test(u) || /^#[\w-]{1,80}$/.test(u)) return !/[\s<>"\\]/.test(u);
  return false;
}

/** text that must stay text: Markdown's inline punctuation escaped (and "_" only where it could start emphasis) */
function escText(s, inLink = false) {
  return String(s)
    .replace(/[\\`*<~]/g, '\\$&')
    // brackets only where they could make a link or an image: "](", "][", "]:", "![" (inside link text: all of them)
    .replace(inLink ? /[[\]]/g : /\](?=[([:])|!\[|^\[/g, (m) => m.replace(/[[\]]/, '\\$&'))
    .replace(/&(?=#?[A-Za-z0-9]+;)/g, '\\&')
    .replace(/(^|[^A-Za-z0-9\u0900-\u097F])_|_(?=[^A-Za-z0-9\u0900-\u097F]|$)/g, (m) => m.replace('_', '\\_'));
}
/** a line that Markdown would read as a block (heading, list, quote, rule, setext underline) is kept a paragraph */
function escLineStart(line) {
  return line
    .replace(/^(\s*)(#{1,6})(?=\s|$)/, '$1\\$2')
    .replace(/^(\s*)([>+-])(?=\s|$)/, '$1\\$2')
    .replace(/^(\s*)(\d{1,9})([.)])(?=\s|$)/, '$1$2\\$3')
    .replace(/^(\s*)(=+|-+)\s*$/, '$1\\$2')
    .replace(/^(\s*)\|/, '$1\\|');
}

const MARK_ORDER = ['link', 'bold', 'italic', 'strike', 'code'];
const rank = (m) => { const i = MARK_ORDER.indexOf(m.type); return i < 0 ? 99 : i; };
const sameMark = (a, b) => a.type === b.type && (a.type !== 'link' || (a.attrs?.href === b.attrs?.href && (a.attrs?.title || '') === (b.attrs?.title || '')));
const OPEN = { bold: '**', italic: '*', strike: '~~' };
const linkEnd = (m) => {
  const href = String(m.attrs?.href || '').replace(/[()\s]/g, (c) => encodeURIComponent(c));
  const title = m.attrs?.title ? ` "${String(m.attrs.title).replace(/["\\]/g, '\\$&')}"` : '';
  return `](${href}${title})`;
};

/**
 * Inline content (text nodes with marks, hard breaks) -> Markdown. `inCell`: inside a table cell (pipes escaped, no
 * line breaks). Spaces at the edge of a bold/italic run move outside it, which Markdown needs.
 */
export function inline(nodes = [], { inCell = false } = {}) {
  let out = '';
  let open = []; // marks currently open, outermost first
  const close = (n) => {
    while (open.length > n) {
      const m = open.pop();
      out += m.type === 'link' ? linkEnd(m) : m.type === 'code' ? '' : OPEN[m.type] || '';
    }
  };
  for (const node of nodes) {
    if (node.type === 'hardBreak') { close(0); out += inCell ? ' ' : '\\\n'; continue; }
    if (node.type !== 'text' || !node.text) continue;
    const marks = (node.marks || []).filter((m) => m.type in OPEN || m.type === 'code' || (m.type === 'link' && safeHref(m.attrs?.href))).sort((a, b) => rank(a) - rank(b));
    // keep the open marks this node still has (in order); close the rest
    let keep = 0;
    while (keep < open.length && keep < marks.length && sameMark(open[keep], marks[keep])) keep += 1;
    let text = node.text;
    const lead = marks.length > keep ? /^\s*/.exec(text)[0] : '';
    close(keep);
    if (lead) { out += lead; text = text.slice(lead.length); }
    const code = marks.find((m) => m.type === 'code');
    for (const m of marks.slice(keep)) {
      if (m.type === 'code') continue;
      out += m.type === 'link' ? '[' : OPEN[m.type];
      open.push(m);
    }
    let body;
    if (code) {
      const ticks = (text.match(/`+/g) || []).reduce((n, t) => Math.max(n, t.length), 0);
      const fence = '`'.repeat(ticks + 1);
      body = `${fence}${/^`|`$/.test(text) ? ' ' : ''}${text}${/^`|`$/.test(text) ? ' ' : ''}${fence}`;
    } else body = escText(text, marks.some((m) => m.type === 'link'));
    if (inCell) body = body.replace(/\|/g, '\\|');
    // trailing spaces go after the closing marks when the next node closes them; simplest: always after
    const trail = !code && open.length ? /\s*$/.exec(body)[0] : '';
    out += trail ? body.slice(0, body.length - trail.length) : body;
    if (trail) { close(0); out += trail; }
  }
  close(0);
  return inCell ? out.replace(/\n/g, ' ') : out;
}

const quote = (text) => text.split('\n').map((l) => (l ? `> ${l}` : '>')).join('\n');
const indent = (text, first, rest) => text.split('\n').map((l, i) => (i === 0 ? first : l ? rest : '') + l).join('\n');
const fenceFor = (text) => { let f = '```'; while (text.includes(f)) f += '`'; return f; };
const cellText = (cell) => (cell.content || []).map((b) => (b.type === 'paragraph' || b.type === 'heading' ? inline(b.content, { inCell: true }) : blockText(b).replace(/\n+/g, ' '))).filter(Boolean).join(' ').trim();
const blockText = (n) => (n.content || []).map((c) => (c.type === 'text' ? c.text : blockText(c))).join(n.type === 'paragraph' ? '' : '\n');
const plainOf = (n) => (n.content || []).map((c) => (c.type === 'text' ? c.text : c.type === 'hardBreak' ? '\n' : plainOf(c))).join('');

function table(node) {
  const rows = (node.content || []).map((r) => (r.content || []));
  if (!rows.length) return '';
  const width = Math.max(...rows.map((r) => r.reduce((n, c) => n + Math.max(1, c.attrs?.colspan || 1), 0)));
  const cells = rows.map((r) => {
    const out = [];
    for (const c of r) { out.push(cellText(c)); for (let k = 1; k < (c.attrs?.colspan || 1); k += 1) out.push(''); }
    while (out.length < width) out.push('');
    return out;
  });
  const aligns = [];
  for (const c of rows[0]) { aligns.push(c.attrs?.align || null); for (let k = 1; k < (c.attrs?.colspan || 1); k += 1) aligns.push(null); }
  const rule = Array.from({ length: width }, (_, i) => ({ left: ':---', right: '---:', center: ':---:' }[aligns[i]] || '---'));
  const line = (cs) => `| ${cs.map((c) => c || ' ').join(' | ')} |`.replace(/ {2,}\|/g, ' |');
  // a body row with nothing in it (a stray Tab at the end of the table) is left out
  return [line(cells[0]), `| ${rule.join(' | ')} |`, ...cells.slice(1).filter((r) => r.some(Boolean)).map(line)].join('\n');
}

/** One block node -> Markdown (no blank line after it). */
export function block(node) {
  const kids = node.content || [];
  switch (node.type) {
    case 'paragraph': {
      const t = inline(kids).trim();
      return t ? t.split('\n').map(escLineStart).join('\n') : '';
    }
    case 'heading': {
      const level = Math.min(4, Math.max(2, Number(node.attrs?.level) || 2));
      const t = inline(kids).replace(/\\\n/g, ' ').trim();
      return t ? `${'#'.repeat(level)} ${t}` : '';
    }
    case 'bulletList':
    case 'orderedList': {
      const start = node.type === 'orderedList' ? Number(node.attrs?.start) || 1 : 1;
      const tight = kids.every((li) => (li.content || []).filter((b) => b.type === 'paragraph').length <= 1);
      return kids.map((li, i) => {
        const mark = node.type === 'orderedList' ? `${start + i}. ` : '- ';
        // a numbered list that starts above 1 cannot follow a line directly in Markdown: a blank line first
        const parts = (li.content || []).map((b) => [b, block(b)]).filter(([, s]) => s !== '');
        const inner = parts.map(([b, s], j) => (j === 0 ? s : `${tight && !(b.type === 'orderedList' && (Number(b.attrs?.start) || 1) !== 1) ? '\n' : '\n\n'}${s}`)).join('');
        return indent(inner, mark, ' '.repeat(mark.length));
      }).join(tight ? '\n' : '\n\n');
    }
    case 'blockquote': {
      const inner = blocks(kids);
      return inner ? quote(inner) : '';
    }
    case 'callout': {
      const kind = CALLOUT_KINDS.includes(String(node.attrs?.kind).toUpperCase()) ? String(node.attrs.kind).toUpperCase() : 'NOTE';
      const inner = blocks(kids) || '';
      return `> [!${kind}]${inner ? `\n${quote(inner)}` : ''}`;
    }
    case 'copyBlock': {
      const text = plainOf(node).replace(/\s+$/, '');
      const title = String(node.attrs?.title || '').replace(/[`\n\r]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
      const f = fenceFor(text);
      return `${f}copy${title ? ` ${title}` : ''}\n${text}\n${f}`;
    }
    case 'codeBlock': {
      const text = plainOf(node).replace(/\s+$/, '');
      const f = fenceFor(text);
      return `${f}\n${text}\n${f}`;
    }
    case 'figure': {
      const src = String(node.attrs?.src || '');
      if (!src) return '';
      const alt = String(node.attrs?.alt || '').replace(/[\\[\]]/g, '\\$&').replace(/\s+/g, ' ').trim();
      const cap = String(node.attrs?.caption || '').replace(/\s+/g, ' ').trim().replace(/["\\]/g, '\\$&');
      return `![${alt}](${src.replace(/[()\s]/g, (c) => encodeURIComponent(c))}${cap ? ` "${cap}"` : ''})`;
    }
    case 'designCard': {
      const slugs = designSlugs(node.attrs?.slugs);
      return slugs.length ? `\`\`\`design\n${slugs.join(', ')}\n\`\`\`` : '';
    }
    case 'horizontalRule': return '---';
    case 'table': return table(node);
    default: return kids.length ? blocks(kids) : '';
  }
}

/** Block nodes -> Markdown, blank lines between (or `sep`). */
export function blocks(nodes = [], sep = '\n\n') {
  return nodes.map(block).filter((s) => s !== '').join(sep);
}

/** The editor's document (doc.toJSON()) -> the post's Markdown body. */
export function toMarkdown(doc) {
  const md = blocks(doc?.content || []);
  return md ? `${md}\n` : '';
}
