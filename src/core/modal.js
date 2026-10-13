// Modal behaviour shared by every theme: while a dialog is open the page behind
// it does not scroll (Lenis stopped, body locked, iOS-safe), the dialog itself
// scrolls natively, focus is trapped inside, Esc closes, focus returns after.
import { getLenis } from './smooth.js';

let locks = 0;
let savedY = 0;

export function lockScroll() {
  if (locks++ > 0) return;
  getLenis()?.stop();
  savedY = window.scrollY;
  const b = document.body.style;
  // position:fixed is the only lock iOS Safari respects; restore the offset after.
  Object.assign(b, { position: 'fixed', top: `-${savedY}px`, left: '0', right: '0', width: '100%', overflow: 'hidden' });
  document.documentElement.style.overscrollBehavior = 'none';
}

export function unlockScroll() {
  if (--locks > 0) return;
  locks = 0;
  const b = document.body.style;
  Object.assign(b, { position: '', top: '', left: '', right: '', width: '', overflow: '' });
  document.documentElement.style.overscrollBehavior = '';
  window.scrollTo(0, savedY);
  getLenis()?.start();
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Open `dialog` (any element). The scrollable part should be `scroller`
 * (defaults to the dialog). Returns a close() function.
 * Call it again with the same element to reopen.
 */
export function openModal(dialog, { scroller = dialog, onClose } = {}) {
  const opener = document.activeElement;
  dialog.hidden = false;
  dialog.setAttribute('role', dialog.getAttribute('role') || 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  // Let wheel/touch inside the dialog scroll natively instead of Lenis.
  dialog.setAttribute('data-lenis-prevent', '');
  scroller.style.overflowY = 'auto';
  scroller.style.overscrollBehavior = 'contain';
  scroller.style.webkitOverflowScrolling = 'touch';
  lockScroll();

  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', onKey, true);
  requestAnimationFrame(() => (dialog.querySelector('[autofocus]') || dialog.querySelector(FOCUSABLE) || dialog).focus?.({ preventScroll: true }));

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    unlockScroll();
    onClose?.();
    opener?.focus?.({ preventScroll: true });
  }
  return close;
}
