// The Blog editor's "/" quick-insert menu (Gutenberg / Notion style), on TipTap's Suggestion utility.
// Type "/" at the start of a line or after a space: a menu of every quick tool opens at the caret. Typing filters it
// ("/tab" -> Table), arrow keys + Enter (or Tab) choose, Esc closes, a click or tap works. The "/query" text is removed
// before the chosen tool runs. Not inside copy or code blocks (their text is literal).
// slashMenu(getItems) -> a TipTap extension; getItems() -> [{ id, title, hint, icon: Node, keys?, aliases?, run() }]
import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import { shift, size } from '@floating-ui/dom';
import { h, fill } from './dom.js';

export const SLASH_KEY = new PluginKey('blogSlash');

/** the items matching a query: title starts with it first, then a word in the title or an alias starts with it */
export function filterItems(items, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return items;
  const score = (it) => {
    const t = it.title.toLowerCase();
    if (t.startsWith(q)) return 0;
    if (t.split(/[\s/]+/).some((w) => w.startsWith(q))) return 1;
    if ((it.aliases || []).some((a) => a.startsWith(q))) return 2;
    if (t.includes(q)) return 3;
    return 9;
  };
  return items.map((it, i) => [score(it), i, it]).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(([, , it]) => it);
}

/** the menu element and its keyboard handling (vanilla DOM, positioned by the Suggestion plugin's mount) */
function menuRenderer() {
  let el = null;
  let list = null;
  let unmount = null;
  let props = null;
  let active = 0;
  const choose = (i) => { const it = props?.items[i]; if (it) props.command(it); };
  function draw() {
    const items = props.items;
    if (active >= items.length) active = Math.max(0, items.length - 1);
    fill(list, items.length ? items.map((it, i) => h('button.bxe-slash__item', {
      type: 'button', role: 'option', id: `bxe-slash-${it.id}`, 'aria-selected': String(i === active), tabindex: '-1',
      onmousedown: (e) => e.preventDefault(), // the caret stays in the text
      onmousemove: () => { if (active !== i) { active = i; mark(); } },
      onclick: () => choose(i),
    }, h('span.bxe-slash__icon', it.icon), h('span.bxe-slash__txt', h('span.bxe-slash__t', it.title), h('span.bxe-slash__hint', it.hint)),
    it.keys ? h('kbd.bxe-slash__keys', it.keys) : null)) : h('p.bxe-slash__none', `No tool matches “${props.query}”.`));
    mark();
  }
  function mark() {
    [...list.children].forEach((b, i) => b.setAttribute?.('aria-selected', String(i === active)));
    const cur = list.children[active];
    if (cur?.id) { el.setAttribute('aria-activedescendant', cur.id); cur.scrollIntoView({ block: 'nearest' }); }
  }
  return {
    onStart(p) {
      props = p;
      active = 0;
      list = h('div.bxe-slash__list');
      el = h('div.bxe-slash', { role: 'listbox', 'aria-label': 'Insert', 'data-native': '' }, h('p.bxe-slash__head', 'Insert'), list);
      draw();
      unmount = p.mount(el);
    },
    onUpdate(p) {
      const q = props?.query;
      props = p;
      if (p.query !== q) active = 0;
      draw();
    },
    onKeyDown({ event }) {
      const n = props?.items.length || 0;
      if (event.key === 'ArrowDown') { if (n) { active = (active + 1) % n; mark(); } return true; }
      if (event.key === 'ArrowUp') { if (n) { active = (active - 1 + n) % n; mark(); } return true; }
      if (event.key === 'Enter' || event.key === 'Tab') { if (!n) return event.key === 'Tab'; choose(active); return true; }
      return false;
    },
    onExit() { unmount?.(); unmount = null; el?.remove(); el = null; props = null; },
  };
}

/** The extension. getItems() is read each time the menu opens or filters, so items may depend on the post. */
export const slashMenu = (getItems) => Extension.create({
  name: 'blogSlash',
  priority: 1000, // its Enter / arrow keys come before the editor's own
  addProseMirrorPlugins() {
    return [Suggestion({
      editor: this.editor,
      pluginKey: SLASH_KEY,
      char: '/',
      allowSpaces: false,
      allowedPrefixes: [' ', ' '],
      startOfLine: false,
      decorationClass: 'bxe-slash-q',
      placement: 'bottom-start',
      offset: { mainAxis: 6 },
      floatingUi: {
        strategy: 'fixed',
        middleware: [shift({ padding: 8 }), size({ padding: 8, apply: ({ availableHeight, elements }) => { elements.floating.style.maxHeight = `${Math.max(160, Math.min(380, availableHeight))}px`; } })],
      },
      allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code,
      items: ({ query }) => filterItems(getItems(), query).slice(0, 20),
      command: ({ editor, range, props: item }) => {
        editor.chain().focus().deleteRange(range).run();
        item.run();
      },
      render: menuRenderer,
    })];
  },
});
