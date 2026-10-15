// Progressive upgrade: every <select>, <input type="date"> and <input type="time"> under a root
// becomes a Nimtto control, now and whenever new ones are added. The native element stays in the
// DOM and keeps the value, so code that reads .value or listens for change keeps working.
// Opt out with data-native (on the element or any ancestor).
import './ui.css';
import { enhanceSelect } from './select.js';
import { enhanceDate } from './datepicker.js';
import { enhanceTime } from './timepicker.js';

const SEL = 'select, input[type="date"], input[type="time"]';

function upgrade(n) {
  if (n.__ui || n.closest('[data-native], .ui-pop')) return;
  try {
    if (n instanceof HTMLSelectElement) {
      if (n.multiple || n.size > 1) return;
      enhanceSelect(n);
    } else if (n.type === 'date') enhanceDate(n);
    else if (n.type === 'time') enhanceTime(n);
  } catch (err) {
    console.error('ui: could not enhance', n, err); // the native control still works
  }
}

const scan = (root) => {
  if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
  if (root.matches?.(SEL)) upgrade(root);
  root.querySelectorAll?.(SEL).forEach(upgrade);
};

const watched = new WeakMap();

/** Upgrades the controls under `root` and keeps watching it. Returns a function that stops watching. */
export function enhance(root = document) {
  scan(root);
  if (watched.has(root)) return watched.get(root);
  const mo = new MutationObserver((muts) => {
    for (const m of muts) for (const n of m.addedNodes) if (n.nodeType === 1) scan(n);
  });
  mo.observe(root === document ? document.documentElement : root, { childList: true, subtree: true });
  const stop = () => { mo.disconnect(); watched.delete(root); };
  watched.set(root, stop);
  return stop;
}

export { enhanceSelect, enhanceDate, enhanceTime };
