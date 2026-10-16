// Shared by every public page (home, design pages, pay page): the DOM helper, the header (mobile menu with focus
// trap, active section on scroll), the watermarked preview dialog and the contact links.
// Everything from the API is written with textContent / attributes only, never as HTML.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const reduced = matchMedia('(prefers-reduced-motion: reduce)');
export const SLUG_RE = /^[a-z][a-z0-9-]{1,30}$/;

/** create an element with text and attributes (never HTML) */
export function el(tag, props = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c);
  return n;
}

const SVGNS = 'http://www.w3.org/2000/svg';
/** a small stroked icon from path data (24x24 grid) */
export function icon(d, cls = 'ico') {
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', cls);
  for (const part of [].concat(d)) {
    const p = document.createElementNS(SVGNS, 'path');
    p.setAttribute('d', part);
    svg.append(p);
  }
  return svg;
}
export const ICONS = {
  check: 'M5 12.5l4.5 4.5L19 7.5',
  copy: ['M9 9h10v10H9z', 'M5 15V5h10'],
  wa: 'M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z',
  down: ['M12 4v12', 'M7 11l5 5 5-5', 'M5 20h14'],
  play: 'M9 6.5v11l9-5.5z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
};

export const str = (v, max = 400) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
/** only same-origin paths ('/x', never '//x' or 'javascript:') */
export const localPath = (v, fallback) => (typeof v === 'string' && /^\/(?!\/)[A-Za-z0-9._~\-/?=&%]*$/.test(v) ? v : fallback);
export const npr = new Intl.NumberFormat('en-IN');
export const usd = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
export const money = (n, cur = 'NPR') => (cur === 'USD' ? `USD ${usd.format(n)}` : `Rs ${npr.format(n)}`);

/* ---------------- header ---------------- */
/** The menu sheet under 1080px (focus trap, Escape, scroll lock) and the header's hairline once scrolled. */
export function initHeader() {
  const bar = $('.nav');
  const btn = $('#menu-btn');
  const sheet = $('#menu');
  if (!bar) return;
  const isOpen = () => bar.classList.contains('is-open');
  const focusables = () => [btn, ...$$('a[href], button:not([disabled])', sheet)].filter((n) => n.offsetParent !== null || n === btn);
  const setOpen = (open, { restore = true } = {}) => {
    bar.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('.nav__menu-t').textContent = open ? 'Close' : 'Menu';
    document.documentElement.classList.toggle('is-locked', open);
    sheet.toggleAttribute('inert', !open);
    if (open) $('a', sheet)?.focus();
    else if (restore) btn.focus();
  };
  if (btn && sheet) {
    sheet.setAttribute('inert', '');
    btn.addEventListener('click', () => setOpen(!isOpen()));
    sheet.addEventListener('click', (e) => { if (e.target.closest('a, [data-order]')) setOpen(false, { restore: false }); });
    document.addEventListener('keydown', (e) => {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
      if (e.key === 'Tab') {
        const f = focusables();
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    matchMedia('(min-width: 1080px)').addEventListener('change', (m) => { if (m.matches && isOpen()) setOpen(false, { restore: false }); });
  }
  let ticking = false;
  const update = () => { ticking = false; bar.classList.toggle('is-scrolled', window.scrollY > 4); };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();
}

/** Signed in (customer, couple or admin): "My dashboard" instead of "Sign in". GET /api/auth/me?soft=1 */
export async function initAuth() {
  let me = null;
  try {
    const r = await fetch('/api/auth/me?soft=1', { credentials: 'same-origin', headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (r.ok) me = await r.json();
  } catch { /* offline: keep "Sign in" */ }
  const role = me && typeof me.role === 'string' ? me.role : null;
  if (role) markSignedIn();
  return role ? me : null;
}
/** The header's "Sign in" links become "My dashboard" (also after signing in from the order's account step). */
export function markSignedIn() {
  for (const a of $$('a[data-auth]')) { a.textContent = 'My dashboard'; a.href = '/studio/'; }
}

/** Section heads fade up once as they enter (opacity and transform only; never body text). */
export function initReveal() {
  if (reduced.matches || !('IntersectionObserver' in window)) return;
  const items = $$('[data-rv]');
  if (!items.length) return;
  document.documentElement.classList.add('rv');
  const io = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -12% 0px' });
  items.forEach((n) => io.observe(n));
}

/* ---------------- contact ---------------- */
export function waNumber(v) {
  const s = str(v, 200);
  if (!s) return '';
  const m = s.match(/^https:\/\/wa\.me\/(\d{8,15})/i);
  if (m) return m[1];
  const digits = s.replace(/[^\d]/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : '';
}
export const waLink = (number, text = '') => (number ? `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}` : '');
export const validEmail = (v) => /^[^\s@<>()",;:]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/.test(v);

/** +9779806393298 -> +977 980-6393298 (Nepali mobiles); anything else as given */
export function prettyPhone(v) {
  const d = String(v || '').replace(/[^\d]/g, '');
  if (/^977\d{10}$/.test(d) && /^[+\d\s-]+$/.test(v)) return `+977 ${d.slice(3, 6)}-${d.slice(6)}`;
  return v;
}

/** Fills every [data-contact] node: wa, wa-text, phone, phone-text, email, email-text. Hides [data-contact-row] when empty. */
export function applyContact(contact = {}) {
  const wa = waNumber(contact.whatsapp);
  const phone = str(contact.phone, 30);
  const email = validEmail(str(contact.email, 254)) ? str(contact.email, 254) : '';
  const values = {
    wa: waLink(wa, 'Hi Nimtto, I have a question about an invitation.'),
    'wa-text': prettyPhone(str(contact.whatsapp, 30)) || (wa ? prettyPhone(`+${wa}`) : ''),
    phone: phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '',
    'phone-text': prettyPhone(phone),
    email: email ? `mailto:${email}` : '',
    'email-text': email,
  };
  for (const n of $$('[data-contact]')) {
    const v = values[n.dataset.contact];
    if (n.tagName === 'A') { if (v) n.href = v; } else if (v) n.textContent = v;
  }
  // the same number for calls and WhatsApp: show it once
  const samePhone = wa && phone && phone.replace(/[^\d]/g, '').endsWith(wa.slice(-10));
  for (const row of $$('[data-contact-row]')) row.hidden = !values[row.dataset.contactRow] || (row.dataset.contactRow === 'phone' && samePhone);
    return { wa, phone, email };
}

/* ---------------- preview: the live design, demo couple only, watermarked (src/core/showcase.js) ---------------- */
export const showcaseUrl = (slug) => `/${encodeURIComponent(slug)}/?showcase=1`;
// phone-sized screens and touch-first devices open the showcase full screen (it has its own close)
const framed = matchMedia('(min-width: 900px) and (min-height: 600px) and (hover: hover) and (pointer: fine)');

/** Wires the #pv dialog: any a[data-preview] opens it on desktop; elsewhere the link opens the showcase page. */
export function initPreview({ find, onOrder }) {
  const pv = $('#pv');
  if (!pv) return;
  const frame = $('#pv-frame');
  const state = { slug: '', opener: null, order: false };
  const open = (slug, from) => {
    const t = find(slug);
    if (!t) return;
    state.slug = slug;
    state.opener = from;
    state.order = false;
    $('#pv-name').textContent = t.name;
    $('#pv-ne').textContent = t.ne || '';
    $('#pv-ne').hidden = !t.ne;
    $('#pv-full').href = showcaseUrl(slug);
    frame.title = `The ${t.name} design, preview with sample names`;
    frame.src = showcaseUrl(slug);
    pv.showModal();
    $('#pv-close').focus(); // not the iframe: Escape must reach this page
    document.documentElement.classList.add('is-locked');
  };
  // the framed showcase forwards Escape (src/core/showcase.js), so it closes even after a tap inside the design
  window.addEventListener('message', (e) => {
    if (e.origin === location.origin && e.data?.nimtto === 'close-preview' && pv.open) pv.close();
  });
  pv.addEventListener('close', () => {
    frame.src = 'about:blank'; // stops the design's music
    document.documentElement.classList.remove('is-locked');
    if (state.order) onOrder(state.slug);
    else state.opener?.focus?.({ preventScroll: true });
  });
  pv.addEventListener('click', (e) => { if (e.target === pv) pv.close(); });
  $('#pv-close').addEventListener('click', () => pv.close());
  $('#pv-order').addEventListener('click', (e) => {
    e.preventDefault();
    state.order = true;
    pv.close();
  });
  document.addEventListener('click', (e) => {
    const a = e.target instanceof Element ? e.target.closest('a[data-preview]') : null;
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const slug = a.dataset.preview;
    if (SLUG_RE.test(slug) && framed.matches) { e.preventDefault(); open(slug, a); }
  });
}

/** Copies text, with a fallback for older browsers. Resolves true on success. */
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back */ }
  const ta = el('textarea', { readonly: true, style: 'position:fixed;opacity:0;left:-999px' });
  ta.value = text;
  document.body.append(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { /* no clipboard */ }
  ta.remove();
  return ok;
}

/** A button that copies `get()` and says "Copied" for a moment. */
export function copyButton(label, get, cls = 'chipbtn') {
  const b = el('button', { type: 'button', class: cls }, icon(ICONS.copy), el('span', { text: label }));
  b.addEventListener('click', async () => {
    const ok = await copyText(get());
    const t = b.querySelector('span');
    t.textContent = ok ? 'Copied' : 'Copy failed';
    setTimeout(() => { t.textContent = label; }, 1600);
  });
  return b;
}

export function setYear() { for (const n of $$('[data-year]')) n.textContent = String(new Date().getFullYear()); }
