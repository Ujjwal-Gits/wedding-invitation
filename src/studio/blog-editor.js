// The Blog module's visual body editor (admin-blog.js loads it on demand): TipTap 3 (ProseMirror) with the house blocks
// of the public posts, so what the owner sees is what the page shows, and nobody types Markdown or HTML.
//   Opens: the HTML the server renders for the post (GET /api/admin/blog/:id -> html), parsed by the rules below.
//   Saves: Markdown, written by blog-md-out.js from the editor's document (the stored format never changed).
// House blocks: callout (Tip / Note / Important / Careful), copy block (wording to copy, with a title), figure (an image
// from the media gallery with alt text and a caption), tables (header row, add/remove rows and columns).
import { Editor, Node, mergeAttributes } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { h, fill, toast, openDialog, debounce } from './dom.js';
import { toMarkdown, safeHref, designSlugs } from './blog-md-out.js';
import { slashMenu } from './blog-slash.js';

/** the pictures a post may show (server/lib/blog-md.js IMG_RE): our own files only */
export const IMG_RE = /^\/(?:site|photos|art|themes|uploads\/_site\/blog)\/[A-Za-z0-9/_.-]{1,200}\.(?:webp|jpe?g|png|avif|svg)$/;
export const KINDS = [['TIP', 'Tip'], ['NOTE', 'Good to know'], ['IMPORTANT', 'Important'], ['WARNING', 'Careful']];

/* ---------------- icons (constant markup) ---------------- */
const SVG = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  bold: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z"/>',
  italic: '<path d="M14 5h-4M14 19h-4M14.5 5l-5 14"/>',
  strike: '<path d="M5 12h14M16 7.5c-.6-1.5-2.2-2.5-4.2-2.5C9.4 5 7.8 6.3 7.8 8c0 1.2.7 2 2 2.6M8 16.5c.6 1.5 2.3 2.5 4.3 2.5 2.5 0 4-1.3 4-3 0-.7-.2-1.3-.7-1.8"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  ul: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  ol: '<path d="M10 6h10M10 12h10M10 18h10M4 4.5h1.5V9M4 9h3M4 14.5c.3-.6.9-1 1.6-1 .9 0 1.4.6 1.4 1.2 0 1.2-3 2.3-3 3.8h3"/>',
  quote: '<path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6"/>',
  tip: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  note: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  table: '<rect x="3.5" y="4.5" width="17" height="15" rx="1.5"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10M15 9.5v10"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m20.5 16-5-5-8 8.5"/>',
  hr: '<path d="M4 12h16M8 7h8M8 17h8" opacity=".9"/>',
  md: '<rect x="2.5" y="5.5" width="19" height="13" rx="2"/><path d="M6 15V9l2.5 3L11 9v6M15.5 9v6M13.5 13l2 2 2-2"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  design: '<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M10 18.5h4M9.5 7.5h5M9.5 10.5h5"/>',
  faq: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.7-.9 1.3v.6M12 16.8h.01"/>',
  page: '<path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M10 12h5M10 15.5h5"/>',
  p: '<path d="M10 20V4h5a4 4 0 0 1 0 8h-5"/>',
  h2: '<path d="M4 6v12M12 6v12M4 12h8M15.5 10a2.2 2.2 0 1 1 3.9 1.4L15.5 18H20"/>',
  h3: '<path d="M4 6v12M12 6v12M4 12h8M15.5 8.5h4l-2.2 3a2.4 2.4 0 1 1-2 3.8"/>',
};
function svg(name, size = 18) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': '1.7', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' })) s.setAttribute(k, v);
  s.innerHTML = SVG[name] || ''; // constant markup only
  return s;
}

/* ---------------- the house blocks ---------------- */
/** inputs and buttons inside a node view are the node view's own: the editor leaves their events alone */
const ownEvent = (e) => Boolean(e.target?.closest?.('[data-own]'));
const setAttrs = (editor, getPos, attrs) => {
  const pos = typeof getPos === 'function' ? getPos() : null;
  if (typeof pos !== 'number') return;
  const node = editor.state.doc.nodeAt(pos);
  if (node) editor.view.dispatch(editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs }));
};

const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: '(paragraph | bulletList | orderedList)+',
  defining: true,
  addAttributes() {
    return { kind: { default: 'TIP', parseHTML: (el) => (/callout--(note|tip|important|warning)/.exec(el.className)?.[1] || 'note').toUpperCase(), renderHTML: () => ({}) } };
  },
  parseHTML() {
    return [{
      tag: 'aside.callout',
      contentElement: (el) => { const c = el.cloneNode(true); c.querySelector(':scope > .callout__label')?.remove(); return c; },
    }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return ['aside', mergeAttributes(HTMLAttributes, { class: `callout callout--${String(node.attrs.kind).toLowerCase()}` }), 0];
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const kind = h('select.bxe-callout__kind', { 'data-own': '', 'data-native': '', 'aria-label': 'Callout type', onchange: (e) => setAttrs(editor, getPos, { kind: e.target.value }) },
        KINDS.map(([v, t]) => h('option', { value: v, selected: v === node.attrs.kind }, t)));
      const unwrap = h('button.bxe-mini', { type: 'button', 'data-own': '', title: 'Turn back into plain text', 'aria-label': 'Remove the callout box, keep the text',
        onclick: () => { const p = getPos(); const n = typeof p === 'number' && editor.state.doc.nodeAt(p); if (n) editor.chain().focus().setTextSelection({ from: p + 2, to: p + n.nodeSize - 2 }).lift('callout').run(); } }, svg('x', 14));
      const body = h('div.bxe-callout__body');
      const dom = h('div.bxe-callout', { 'data-kind': node.attrs.kind }, h('div.bxe-callout__head', { contenteditable: 'false', 'data-own': '' }, kind, unwrap), body);
      return {
        dom, contentDOM: body,
        update: (n) => { if (n.type.name !== 'callout') return false; dom.dataset.kind = n.attrs.kind; kind.value = n.attrs.kind; return true; },
        stopEvent: ownEvent,
        ignoreMutation: (m) => !body.contains(m.target),
      };
    };
  },
});

const CopyBlock = Node.create({
  name: 'copyBlock',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,
  addAttributes() {
    return { title: { default: '', parseHTML: (el) => el.querySelector('.copy__t')?.textContent.trim() || '', renderHTML: () => ({}) } };
  },
  parseHTML() { return [{ tag: 'figure.copy', contentElement: 'pre', preserveWhitespace: 'full' }]; },
  renderHTML({ HTMLAttributes }) { return ['figure', mergeAttributes(HTMLAttributes, { class: 'copy' }), ['pre', { class: 'copy__text' }, 0]]; },
  addKeyboardShortcuts() {
    const out = () => this.editor.isActive('copyBlock') && this.editor.commands.exitCode();
    return { 'Mod-Enter': out, 'Shift-Enter': out };
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const title = h('input.bxe-copy__title', { 'data-own': '', value: node.attrs.title, maxlength: 120, placeholder: 'Title, e.g. Invitation wording in Nepali', 'aria-label': 'Copy block title',
        oninput: (e) => setAttrs(editor, getPos, { title: e.target.value }) });
      const pre = h('pre.bxe-copy__text', { spellcheck: 'true' });
      const dom = h('figure.bxe-copy', h('div.bxe-copy__head', { contenteditable: 'false', 'data-own': '' }, h('span.bxe-copy__tag', svg('copy', 14), 'Copy block'), title), pre);
      return {
        dom, contentDOM: pre,
        update: (n) => { if (n.type.name !== 'copyBlock') return false; if (document.activeElement !== title) title.value = n.attrs.title; return true; },
        stopEvent: ownEvent,
        ignoreMutation: (m) => !pre.contains(m.target),
      };
    };
  },
});

const imgAttrs = (img, fig) => {
  const src = img?.getAttribute('src') || '';
  if (!IMG_RE.test(src)) return false; // a remote or pasted picture never enters a post
  return { src, alt: img.getAttribute('alt') || '', caption: fig?.querySelector('figcaption')?.textContent.trim() || '' };
};
/** factory: the figure node; pickImage() opens the media gallery (admin-blog.js) */
const makeFigure = (pickImage) => Node.create({
  name: 'figure',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() { return { src: { default: '' }, alt: { default: '' }, caption: { default: '' } }; },
  parseHTML() {
    return [
      { tag: 'figure.fig', getAttrs: (el) => imgAttrs(el.querySelector('img'), el) },
      { tag: 'img[src]', getAttrs: (el) => imgAttrs(el, null) },
    ];
  },
  renderHTML({ node }) {
    return ['figure', { class: 'fig' }, ['img', { src: node.attrs.src, alt: node.attrs.alt }], ['figcaption', {}, node.attrs.caption || '']];
  },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      let cur = node;
      const img = h('img.bxe-fig__img', { src: node.attrs.src, alt: node.attrs.alt, draggable: 'false' });
      const alt = h('input.input.bxe-fig__in', { 'data-own': '', value: node.attrs.alt, maxlength: 200, placeholder: 'Describe the picture (alt text, for Google and screen readers)', 'aria-label': 'Alt text',
        oninput: (e) => setAttrs(editor, getPos, { alt: e.target.value }) });
      const cap = h('input.input.bxe-fig__in', { 'data-own': '', value: node.attrs.caption, maxlength: 240, placeholder: 'Caption (optional, shown under the picture)', 'aria-label': 'Caption',
        oninput: (e) => setAttrs(editor, getPos, { caption: e.target.value }) });
      const replace = h('button.btn.btn--sm', { type: 'button', 'data-own': '', onclick: async () => {
        const got = await pickImage({ alt: cur.attrs.alt, caption: cur.attrs.caption });
        if (got) setAttrs(editor, getPos, got);
      } }, 'Replace');
      const remove = h('button.btn.btn--sm.btn--ghost', { type: 'button', 'data-own': '', onclick: () => {
        const p = getPos();
        if (typeof p === 'number') editor.chain().focus().deleteRange({ from: p, to: p + cur.nodeSize }).run();
      } }, 'Remove');
      const dom = h('figure.bxe-fig', { contenteditable: 'false' }, h('div.bxe-fig__pic', { 'data-drag-handle': '' }, img), h('div.bxe-fig__meta', { 'data-own': '' }, alt, cap, h('div.bxe-fig__acts', replace, remove)));
      return {
        dom,
        update: (n) => {
          if (n.type.name !== 'figure') return false;
          cur = n;
          if (img.getAttribute('src') !== n.attrs.src) img.src = n.attrs.src;
          img.alt = n.attrs.alt;
          if (document.activeElement !== alt) alt.value = n.attrs.alt;
          if (document.activeElement !== cap) cap.value = n.attrs.caption;
          return true;
        },
        selectNode: () => dom.classList.add('is-sel'),
        deselectNode: () => dom.classList.remove('is-sel'),
        stopEvent: ownEvent,
        ignoreMutation: () => true,
      };
    };
  },
});

/**
 * factory: a design card (a ```design block): 1 to 3 designs from the catalog, shown in the post as a promo card with
 * price, Preview and Order (lib/blog-render.js). pickDesigns(slugs) opens the picker; designName(slug) names a design.
 */
const makeDesignCard = (pickDesigns, designName) => Node.create({
  name: 'designCard',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes() { return { slugs: { default: '' } }; },
  parseHTML() {
    return [{ tag: 'aside.bdc-slot', getAttrs: (el) => { const v = designSlugs(el.getAttribute('data-designs')); return v.length ? { slugs: v.join(',') } : false; } }];
  },
  renderHTML({ node }) { return ['aside', { class: 'bdc-slot', 'data-designs': node.attrs.slugs }]; },
  addNodeView() {
    return ({ node, editor, getPos }) => {
      let cur = node;
      const tiles = h('div.bxe-dc__tiles');
      const draw = () => fill(tiles, designSlugs(cur.attrs.slugs).map((s) => h('figure.bxe-dc__tile', h('img', { src: `/site/thumbs/${s}-480.webp`, alt: '', loading: 'lazy' }), h('figcaption', designName(s)))));
      const change = h('button.btn.btn--sm', { type: 'button', 'data-own': '', onclick: async () => {
        const got = await pickDesigns(designSlugs(cur.attrs.slugs));
        if (got?.length) setAttrs(editor, getPos, { slugs: got.join(',') });
      } }, 'Change designs');
      const remove = h('button.btn.btn--sm.btn--ghost', { type: 'button', 'data-own': '', onclick: () => {
        const p = getPos();
        if (typeof p === 'number') editor.chain().focus().deleteRange({ from: p, to: p + cur.nodeSize }).run();
      } }, 'Remove');
      const dom = h('div.bxe-dc', { contenteditable: 'false' },
        h('div.bxe-dc__head', { 'data-drag-handle': '' }, h('span.bxe-dc__tag', svg('design', 14), 'Design card'), h('span.bxe-dc__hint', 'Shown with price, Preview and Order this design')),
        tiles, h('div.bxe-fig__acts', { 'data-own': '' }, change, remove));
      draw();
      return {
        dom,
        update: (n) => { if (n.type.name !== 'designCard') return false; cur = n; draw(); return true; },
        selectNode: () => dom.classList.add('is-sel'),
        deselectNode: () => dom.classList.remove('is-sel'),
        stopEvent: ownEvent,
        ignoreMutation: () => true,
      };
    };
  },
});

// a column's alignment (from "| :--- |" in Markdown) survives a round trip
const align = { align: { default: null, parseHTML: (el) => (['left', 'right', 'center'].includes(el.style.textAlign) ? el.style.textAlign : null), renderHTML: (a) => (a.align ? { style: `text-align: ${a.align}` } : {}) } };
const Cell = TableCell.extend({ addAttributes() { return { ...this.parent?.(), ...align }; } });
const Header = TableHeader.extend({ addAttributes() { return { ...this.parent?.(), ...align }; } });

/** The editor's schema: StarterKit, tables and the house blocks (the server tests parse posts with the same list). */
export function bodyExtensions({ pickImage = async () => null, pickDesigns = async () => null, designName = (s) => s } = {}) {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      underline: false,
      codeBlock: { HTMLAttributes: { class: 'code' } },
      link: { openOnClick: false, autolink: true, linkOnPaste: true, defaultProtocol: 'https', HTMLAttributes: { rel: null, target: null }, isAllowedUri: (url) => safeHref(url) },
    }),
    Table.configure({ resizable: false, HTMLAttributes: { class: 'bxe-table' } }), TableRow, Header, Cell,
    Callout, CopyBlock, makeFigure(pickImage), makeDesignCard(pickDesigns, designName),
    Placeholder.configure({ placeholder: ({ node }) => (node.type.name === 'heading' ? 'Heading' : 'Write here, or use the toolbar to add a heading, table, callout or picture.') }),
  ];
}

/* ---------------- the editor ---------------- */
/**
 * createBodyEditor({ html, onChange, pickImage, renderMarkdown, linkTargets }) -> { el, getMarkdown, isMarkdownView, destroy, editor }
 *   pickImage({ alt, caption }) -> Promise<{ src, alt, caption } | null>   (the media gallery)
 *   renderMarkdown(md) -> Promise<html>                                    (the server's renderer, for the Markdown view)
 *   linkTargets() -> [{ path, title }]                                     (suggestions in the link dialog)
 *   pickDesigns(slugs) -> Promise<[slug] | null>                           (the design picker, 1 to 3)
 *   designName(slug) -> string;  designTargets() -> [{ path, title }];  onFaq() adds a question in the FAQ panel
 */
export function createBodyEditor({ html, onChange = () => {}, pickImage, renderMarkdown, linkTargets = () => [], pickDesigns = async () => null, designName = (s) => s, designTargets = () => [], onFaq = () => {} }) {
  let slashItems = () => []; // filled below, once the tools exist
  const content = h('div.bxe-doc');
  const editor = new Editor({
    element: content,
    content: html || '<p></p>',
    extensions: [...bodyExtensions({ pickImage, pickDesigns, designName }), slashMenu(() => slashItems())],
    editorProps: { attributes: { class: 'bxe-prose', 'aria-label': 'Post text', 'aria-multiline': 'true', role: 'textbox', spellcheck: 'true' } },
  });
  const md = h('textarea.input.bxe-md', { 'aria-label': 'Post text as Markdown', spellcheck: 'true', hidden: true });
  let mdView = false;

  /* toolbar */
  const btn = (name, label, run, { text, isOn, cls } = {}) => {
    const b = h('button.bxe-btn', { type: 'button', title: label, 'aria-label': label, class: cls, onmousedown: (e) => e.preventDefault(), onclick: () => { run(); refresh(); } }, text ? h('span.bxe-btn__t', text) : svg(name));
    b._on = isOn;
    return b;
  };
  const chain = () => editor.chain().focus();
  const sep = () => h('span.bxe-sep', { 'aria-hidden': 'true' });
  const insertCallout = (kind) => {
    if (editor.isActive('callout')) { chain().updateAttributes('callout', { kind }).run(); return; }
    chain().wrapIn('callout', { kind }).run() || chain().insertContent({ type: 'callout', attrs: { kind }, content: [{ type: 'paragraph' }] }).run();
  };
  const insertCopy = () => {
    const { from, to, empty } = editor.state.selection;
    const text = empty ? '' : editor.state.doc.textBetween(from, to, '\n');
    chain().insertContentAt({ from, to }, { type: 'copyBlock', attrs: { title: '' }, content: text ? [{ type: 'text', text }] : [] }).run();
  };
  const insertImage = async () => {
    const got = await pickImage({});
    if (got) chain().insertContent({ type: 'figure', attrs: got }).run();
  };
  const insertDesigns = async () => {
    const got = await pickDesigns([]);
    if (got?.length) chain().insertContent({ type: 'designCard', attrs: { slugs: got.join(',') } }).run();
  };
  /** a link to one of `targets` at the caret (the picker below), then a plain space */
  const insertLinkTo = async (title, targets) => {
    const t = await pickTarget(title, targets);
    if (t) chain().insertContent([{ type: 'text', text: t.title, marks: [{ type: 'link', attrs: { href: t.path } }] }, { type: 'text', text: ' ' }]).run();
  };
  const tools = [
    btn('', 'Paragraph', () => chain().setParagraph().run(), { text: 'P', isOn: () => editor.isActive('paragraph') && !editor.isActive('callout') && !editor.isActive('listItem') }),
    btn('', 'Heading 2 (a section in the table of contents)', () => chain().toggleHeading({ level: 2 }).run(), { text: 'H2', isOn: () => editor.isActive('heading', { level: 2 }) }),
    btn('', 'Heading 3 (a smaller section)', () => chain().toggleHeading({ level: 3 }).run(), { text: 'H3', isOn: () => editor.isActive('heading', { level: 3 }) }),
    sep(),
    btn('bold', 'Bold (Ctrl+B)', () => chain().toggleBold().run(), { isOn: () => editor.isActive('bold') }),
    btn('italic', 'Italic (Ctrl+I)', () => chain().toggleItalic().run(), { isOn: () => editor.isActive('italic') }),
    btn('strike', 'Strikethrough', () => chain().toggleStrike().run(), { isOn: () => editor.isActive('strike') }),
    btn('link', 'Link (Ctrl+K)', () => linkDialog(), { isOn: () => editor.isActive('link') }),
    sep(),
    btn('ul', 'Bulleted list', () => chain().toggleBulletList().run(), { isOn: () => editor.isActive('bulletList') }),
    btn('ol', 'Numbered list', () => chain().toggleOrderedList().run(), { isOn: () => editor.isActive('orderedList') }),
    btn('quote', 'Quote', () => chain().toggleBlockquote().run(), { isOn: () => editor.isActive('blockquote') }),
    btn('tip', 'Tip box', () => insertCallout('TIP'), { isOn: () => editor.isActive('callout', { kind: 'TIP' }) }),
    btn('note', 'Note box (Good to know)', () => insertCallout('NOTE'), { isOn: () => editor.isActive('callout', { kind: 'NOTE' }) }),
    btn('copy', 'Copy block: wording people can copy', () => insertCopy(), { isOn: () => editor.isActive('copyBlock') }),
    sep(),
    btn('table', 'Insert a table', () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), { isOn: () => editor.isActive('table') }),
    btn('image', 'Insert a picture from the media gallery', () => insertImage()),
    btn('design', 'Design card: 1 to 3 designs with price, Preview and Order', () => insertDesigns()),
    btn('hr', 'Divider line', () => chain().setHorizontalRule().run()),
  ];
  const undoRedo = [
    btn('undo', 'Undo (Ctrl+Z)', () => chain().undo().run()),
    btn('redo', 'Redo (Ctrl+Shift+Z)', () => chain().redo().run()),
  ];
  const mdBtn = h('button.bxe-btn.bxe-btn--md', { type: 'button', title: 'Show the text as Markdown', 'aria-pressed': 'false', onclick: () => toggleMd() }, svg('md'), h('span', 'Markdown'));
  const tableBar = h('div.bxe-tablebar', { role: 'toolbar', 'aria-label': 'Table', hidden: true },
    h('span.bxe-tablebar__label', 'Table'),
    [['Row above', () => chain().addRowBefore().run()], ['Row below', () => chain().addRowAfter().run()],
      ['Column left', () => chain().addColumnBefore().run()], ['Column right', () => chain().addColumnAfter().run()],
      ['Delete row', () => chain().deleteRow().run()], ['Delete column', () => chain().deleteColumn().run()],
      ['Header row on/off', () => chain().toggleHeaderRow().run()], ['Delete table', () => chain().deleteTable().run()]]
      .map(([t, run]) => h('button.bxe-tbtn', { type: 'button', class: t === 'Delete table' ? 'is-danger' : '', onmousedown: (e) => e.preventDefault(), onclick: () => { run(); refresh(); } }, t)));
  const bar = h('div.bxe-bar', { role: 'toolbar', 'aria-label': 'Formatting' }, h('div.bxe-tools', tools), h('div.bxe-tools.bxe-tools--end', undoRedo, mdBtn));

  function refresh() {
    for (const b of tools) if (b._on) b.setAttribute('aria-pressed', String(Boolean(b._on())));
    tableBar.hidden = mdView || !editor.isActive('table');
    for (const b of [...tools, ...undoRedo]) b.disabled = mdView;
  }
  editor.on('selectionUpdate', refresh);
  editor.on('transaction', refresh);
  // a change is a change of the stored text: selection moves, the trailing empty line ProseMirror adds and other
  // no-op transactions never mark the post unsaved
  let lastMd = toMarkdown(editor.getJSON());
  const check = debounce(() => { const m = mdView ? md.value : toMarkdown(editor.getJSON()); if (m !== lastMd) { lastMd = m; onChange(); } }, 120);
  editor.on('update', check);

  /* link dialog */
  function linkDialog() {
    if (mdView) return;
    const had = editor.getAttributes('link').href || '';
    const { empty } = editor.state.selection;
    const needText = empty && !had;
    const list = `bxe-links-${Math.random().toString(36).slice(2, 7)}`;
    const url = h('input.input', { value: had, placeholder: '/pricing/ or https://…', list, autocomplete: 'off', spellcheck: 'false' });
    const words = h('input.input', { placeholder: 'The words people click' });
    const err = h('p.field__err', { hidden: true, role: 'alert' });
    const apply = () => {
      const href = url.value.trim();
      if (!href) { chain().extendMarkRange('link').unsetLink().run(); d.close(); return; }
      if (!safeHref(href)) { err.textContent = 'Use a page on this site (/pricing/), an https:// address, mailto: or tel:.'; err.hidden = false; url.focus(); return; }
      if (needText) {
        const t = words.value.trim() || href;
        chain().insertContent({ type: 'text', text: t, marks: [{ type: 'link', attrs: { href } }] }).run();
      } else chain().extendMarkRange('link').setLink({ href }).run();
      d.close();
    };
    const form = h('form.stack', { onsubmit: (e) => { e.preventDefault(); apply(); } },
      h('div.field', h('label.label', 'Link to'), url, h('p.hint', 'A page on this site (/pricing/, /blog/pasni-invitation-guide/), or a full https:// address.'), err),
      needText ? h('div.field', h('label.label', 'Text'), words) : null,
      h('datalist', { id: list }, linkTargets().map((t) => h('option', { value: t.path }, t.title))));
    const d = openDialog({ title: had ? 'Edit link' : 'Add a link', body: form, actions: [
      had ? h('button.btn.btn--ghost', { type: 'button', onclick: () => { chain().extendMarkRange('link').unsetLink().run(); d.close(); } }, 'Remove link') : null,
      h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'),
      h('button.btn.btn--primary', { type: 'button', onclick: apply }, had ? 'Update link' : 'Add link')].filter(Boolean) });
    setTimeout(() => url.focus(), 30);
  }
  editor.view.dom.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); linkDialog(); } });

  /* the "/" menu: every quick tool (blog-slash.js) */
  const mod = /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl';
  const SLASH = [
    { id: 'p', title: 'Paragraph', hint: 'Plain text', icon: svg('p'), keys: `${mod}+Alt+0`, aliases: ['text'], run: () => chain().setParagraph().run() },
    { id: 'h2', title: 'Heading 2', hint: 'A section in the table of contents', icon: svg('h2'), keys: `${mod}+Alt+2`, aliases: ['h2', 'title', 'section'], run: () => chain().setHeading({ level: 2 }).run() },
    { id: 'h3', title: 'Heading 3', hint: 'A smaller section', icon: svg('h3'), keys: `${mod}+Alt+3`, aliases: ['h3', 'subheading'], run: () => chain().setHeading({ level: 3 }).run() },
    { id: 'ul', title: 'Bullet list', hint: 'Or type "- " on a new line', icon: svg('ul'), keys: `${mod}+Shift+8`, aliases: ['ul', 'unordered'], run: () => chain().toggleBulletList().run() },
    { id: 'ol', title: 'Numbered list', hint: 'Or type "1. " on a new line', icon: svg('ol'), keys: `${mod}+Shift+7`, aliases: ['ol', 'ordered'], run: () => chain().toggleOrderedList().run() },
    { id: 'quote', title: 'Quote', hint: 'A quotation, set apart', icon: svg('quote'), keys: `${mod}+Shift+B`, aliases: ['blockquote'], run: () => chain().toggleBlockquote().run() },
    { id: 'tip', title: 'Tip box', hint: 'Advice that stands out', icon: svg('tip'), aliases: ['callout'], run: () => insertCallout('TIP') },
    { id: 'note', title: 'Note box', hint: 'Good to know', icon: svg('note'), aliases: ['callout', 'info'], run: () => insertCallout('NOTE') },
    { id: 'copy', title: 'Copy block', hint: 'Wording people can copy', icon: svg('copy'), aliases: ['wording', 'code'], run: () => insertCopy() },
    { id: 'table', title: 'Table', hint: '3 x 3 with a header row', icon: svg('table'), aliases: ['grid'], run: () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { id: 'image', title: 'Image', hint: 'From the media gallery, with alt text', icon: svg('image'), aliases: ['picture', 'photo'], run: () => insertImage() },
    { id: 'design', title: 'Design card', hint: '1 to 3 designs with price and Order', icon: svg('design'), aliases: ['promo', 'ad', 'card'], run: () => insertDesigns() },
    { id: 'hr', title: 'Divider', hint: 'A line between parts', icon: svg('hr'), aliases: ['hr', 'line', 'rule', 'separator'], run: () => chain().setHorizontalRule().run() },
    { id: 'faq', title: 'FAQ item', hint: 'Adds a question in the FAQ section', icon: svg('faq'), aliases: ['question', 'faq'], run: () => onFaq() },
    { id: 'ldesign', title: 'Link to a design', hint: 'Its page on this website', icon: svg('link'), aliases: ['link'], run: () => insertLinkTo('Link to a design', designTargets()) },
    { id: 'lpage', title: 'Link to a guide or page', hint: 'Another post, pricing, designs', icon: svg('page'), keys: `${mod}+K`, aliases: ['link', 'post', 'guide', 'page'], run: () => insertLinkTo('Link to a guide or page', linkTargets()) },
  ];
  slashItems = () => SLASH;

  /** a searchable list of link targets; resolves { path, title } or null */
  function pickTarget(title, targets) {
    return new Promise((resolve) => {
      let out = null;
      const q = h('input.input', { type: 'search', placeholder: 'Search', 'aria-label': 'Search' });
      const box = h('div.bxe-pick', { role: 'listbox', 'aria-label': title });
      const draw = () => {
        const s = q.value.trim().toLowerCase();
        const list = targets.filter((t) => !s || t.title.toLowerCase().includes(s) || t.path.includes(s)).slice(0, 80);
        fill(box, list.length ? list.map((t) => h('button.bxe-pick__i', { type: 'button', role: 'option', onclick: () => { out = t; d.close(); } }, h('span', t.title), h('small', t.path))) : h('p.bx-empty', 'Nothing matches.'));
      };
      q.addEventListener('input', draw);
      q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); box.querySelector('button')?.click(); } });
      const d = openDialog({ title, body: h('div.stack', q, box), actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel')], onClose: () => { resolve(out); editor.commands.focus(); } });
      draw();
      setTimeout(() => q.focus(), 30);
    });
  }

  /* the Markdown view */
  async function toggleMd() {
    if (!mdView) {
      md.value = toMarkdown(editor.getJSON());
      mdView = true;
    } else {
      try { editor.commands.setContent(await renderMarkdown(md.value), { emitUpdate: true }); } catch (err) { toast(err.message || 'Could not read the Markdown.', 'error'); return; }
      mdView = false;
    }
    md.hidden = !mdView;
    content.hidden = mdView;
    mdBtn.setAttribute('aria-pressed', String(mdView));
    refresh();
    (mdView ? md : editor.view.dom).focus();
  }
  md.addEventListener('input', check);

  const el = h('div.bxe', bar, tableBar, content, md);
  refresh();
  return {
    el, editor,
    getMarkdown: () => (mdView ? md.value.replace(/\r\n?/g, '\n') : toMarkdown(editor.getJSON())),
    isMarkdownView: () => mdView,
    setHTML: (x) => {
      editor.commands.setContent(x || '<p></p>', { emitUpdate: false });
      lastMd = toMarkdown(editor.getJSON());
      if (mdView) { mdView = false; md.hidden = true; content.hidden = false; mdBtn.setAttribute('aria-pressed', 'false'); refresh(); }
    },
    destroy: () => editor.destroy(),
  };
}

