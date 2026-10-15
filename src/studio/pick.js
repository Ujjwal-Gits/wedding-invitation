// "Click to edit": the client clicked something in the live preview; open the field that changes it.
// The page sends { text, lang?, section? } | { image: [url], index?, section? } | { section } (nimtto:pick);
// we find the model value (or the theme's own slot) that shows it, switch to its module, open the card
// or fold it sits in, scroll to it, focus it and flash it. Photos open their own photo options.
import { toast } from './dom.js';
import { loadManifest, sharedKey } from './slotdata.js';
import { pathStr } from './fields.js';
import { resolveRef, sectionOfPath, sectionOfSlot } from './preview-sync.js';
import { photoUrl } from '../photos.js';

const norm = (s) => String(s ?? '').normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
/** Model keys that never hold words a guest reads. */
const NOT_TEXT = new Set(['themeContent', 'content', 'themeColors', 'share', 'photo', 'portraits', 'gallery', 'colors', 'start', 'end',
  'id', 'mapQuery', 'phone', 'livestream', 'theme', 'weddingDate', 'openEnded', 'endpoint', 'src', 'youtube', 'alt', 'shape', 'clientLink']);

/** Every model string a guest can read: [{ path, value }]. */
function modelTexts(data) {
  const out = [];
  const walk = (v, path) => {
    if (typeof v === 'string') { if (v.trim().length >= 2) out.push({ path, value: v }); return; }
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, [...path, i]));
    else if (isPlain(v)) for (const [k, x] of Object.entries(v)) if (!NOT_TEXT.has(k)) walk(x, [...path, k]);
  };
  walk(data, []);
  return out;
}

/** How well a field's words fit the clicked words (lower is better; null = no). */
function fit(clicked, value) {
  const a = norm(clicked);
  const b = norm(value);
  if (!a || b.length < 2) return null;
  if (a === b) return 0;
  if (b.length >= 3 && a.includes(b)) return 10 + (10 * (a.length - b.length)) / a.length; // e.g. "Daughter of …" around the parents
  if (a.length >= 3 && b.includes(a)) return 20 + (10 * (b.length - a.length)) / b.length; // one line of a longer text
  return null;
}

const stem = (u) => {
  let p = String(u || '');
  try { p = decodeURI(new URL(p, location.href).pathname); } catch { /* keep */ }
  return p.replace(/-(lg|sm|depth)\.webp$/i, '').replace(/\.(webp|jpe?g|png)$/i, '');
};
const sameImage = (ref, url, data) => {
  const r = resolveRef(ref, data);
  return Boolean(r) && stem(photoUrl(r, 'lg')) === stem(url);
};

/** The photo a theme slot shows (same rules as useSlots() in src/core/slots.js). */
function slotImage(spec, id, data, theme = data.theme) {
  const own = data.themeContent?.[theme]?.images?.[id];
  const key = sharedKey(spec, 'images');
  const o = own ?? (key ? data.content?.images?.[key] : undefined);
  if (o) return resolveRef(o, data);
  if (spec.kind === 'bride' && data.couple?.bride?.photo) return data.couple.bride.photo;
  if (spec.kind === 'groom' && data.couple?.groom?.photo) return data.couple.groom.photo;
  if (spec.default) return resolveRef(spec.default, data);
  if (['couple', 'bride', 'groom'].includes(spec.kind)) return resolveRef({ portrait: 0 }, data);
  return null;
}
function slotText(spec, id, data, theme = data.theme) {
  const key = sharedKey(spec, 'texts');
  const o = data.themeContent?.[theme]?.texts?.[id] || (key ? data.content?.texts?.[key] : null) || {};
  const d = spec.default || {};
  return { en: o.en || d.en || '', ne: o.ne || d.ne || o.en || d.en || '' };
}

// ── Moving the editor ─────────────────────────────────────────────────────

const currentModule = () => /^#\/i\/[a-z0-9-]+\/([a-z-]+)/.exec(location.hash)?.[1] || 'home';
const until = async (find, ms = 3500) => {
  const t0 = performance.now();
  for (;;) {
    const el = find();
    if (el) return el;
    if (performance.now() - t0 > ms) return null;
    await new Promise((r) => setTimeout(r, 60));
  }
};

function flash(el) {
  const box = el.closest('.bi__col, .trow, .pslot, .ptile, .scard, .field, .song-wrap') || el;
  box.classList.remove('is-picked');
  void box.offsetWidth;
  box.classList.add('is-picked');
  setTimeout(() => box.classList.remove('is-picked'), 1800);
}

/** Switches module (if needed), then scrolls to, opens, focuses and flashes the field `locate()` finds. */
async function openField(ctx, mod, locate, { click = false } = {}) {
  ctx.preview?.hold(1800);
  if (currentModule() !== mod) ctx.go(`#/i/${ctx.slug}/${mod}`);
  const el = await until(locate);
  if (!el) return false;
  for (let d = el.closest('details'); d; d = d.parentElement?.closest('details')) d.open = true;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  if (el.matches('input, textarea')) { el.focus({ preventScroll: true }); el.select?.(); } else el.focus?.({ preventScroll: true });
  flash(el);
  if (click) setTimeout(() => el.click(), reduce ? 0 : 380);
  return true;
}

/** Where a model path is edited: its module, and the input. */
function placeOf(ctx, path) {
  const top = path[0];
  let mod = 'couple';
  if (['events', 'weddingDate', 'weddingDateBS', 'city', 'info'].includes(top)) mod = 'dates';
  else if (top === 'music') mod = 'music';
  else if (top === 'rsvp') mod = ctx.isAdmin ? 'admin' : null;
  const sel = `[data-path="${CSS.escape(pathStr(path))}"]`;
  return { mod, locate: () => document.querySelector(sel) };
}

function fromDesign(ctx, mod) {
  const msg = ctx.perms?.canChangeTheme === false && mod === 'opening'
    ? 'This part comes from the design your planner chose; it can’t be edited here.'
    : 'This part comes from the design; it can’t be edited here.';
  toast(msg);
}

/** Where a part of the invitation is edited when no exact field matched. */
async function openPart(ctx, section) {
  const ev = /^event:(\d+)$/.exec(section || '');
  if (ev) return openField(ctx, 'dates', () => document.getElementById(`ev${ev[1]}-d`) || document.querySelectorAll('.cer')[Number(ev[1])]);
  switch (section) {
    case 'date': case 'countdown': case 'scratch': return openField(ctx, 'dates', () => document.getElementById('wd-date'));
    case 'events': return openField(ctx, 'dates', () => document.querySelector('.cers'));
    case 'gallery': return openField(ctx, 'photos', () => document.querySelectorAll('.pgrid-wrap')[1]);
    case 'couple': case 'families': return openField(ctx, 'couple', () => document.querySelector('input[data-path="couple.bride.name.en"]'));
    case 'music': return openField(ctx, 'music', () => document.querySelector('.page__content .card'));
    case 'rsvp':
      if (ctx.isAdmin) return openField(ctx, 'admin', () => document.querySelector('[data-path="rsvp.deadline.en"]'));
      toast('Your planner sets up the reply form.');
      return true;
    case 'card': case 'closing': return openField(ctx, 'couple', () => document.querySelector('[data-path="closing.en"], [data-path="invitation.body.en"]'));
    default: return false;
  }
}

// ── The pick ──────────────────────────────────────────────────────────────

/**
 * A click inside a gate or first screen borrowed from another theme (docs/MIX.md): that theme's manifest, only
 * the ids its part shows, stored in themeContent[<that theme>]. Null for the design's own parts.
 */
function borrowed(ctx, t, data) {
  const slug = typeof t.theme === 'string' && /^[a-z0-9-]{2,30}$/.test(t.theme) ? t.theme : null;
  if (!slug || slug === data.theme || (data.design?.gate !== slug && data.design?.hero !== slug)) return null;
  const parts = ctx.session.meta?.themes?.find((x) => x.slug === slug)?.parts;
  const kinds = [data.design?.gate === slug ? 'gateUses' : null, data.design?.hero === slug ? 'heroUses' : null].filter(Boolean);
  const ids = new Set(kinds.flatMap((k) => [...(parts?.[k]?.texts || []), ...(parts?.[k]?.images || [])]));
  return { slug, ids };
}

export async function handlePick(ctx, t) {
  const data = ctx.session.m.data;
  const part = borrowed(ctx, t, data);
  const slotTheme = part?.slug || data.theme;
  const full = await loadManifest(slotTheme).catch(() => null);
  // A borrowed part: only what it shows (its fields sit in Opening under that theme).
  const man = part && full ? {
    images: Object.fromEntries(Object.entries(full.images || {}).filter(([id]) => part.ids.has(id))),
    texts: Object.fromEntries(Object.entries(full.texts || {}).filter(([id]) => part.ids.has(id))),
  } : full;
  const at = (kind, id) => `${kind}[data-item="${CSS.escape(id)}"][data-theme="${CSS.escape(slotTheme)}"]`;

  if (Array.isArray(t.image) && t.image[0]) {
    const url = t.image[0];
    const inGallery = t.section === 'gallery';
    const cands = [];
    (data.gallery || []).forEach((g, i) => { if (sameImage(g?.photo, url, data)) cands.push({ rank: inGallery ? 0 : 2, go: () => openField(ctx, 'photos', () => document.querySelectorAll('.pgrid')[1]?.children[i]?.querySelector('.ptile__img'), { click: true }) }); });
    (data.couple?.portraits || []).forEach((p, i) => { if (sameImage(p?.photo, url, data)) cands.push({ rank: inGallery ? 1 : 3, go: () => openField(ctx, 'photos', () => document.querySelector('.pgrid')?.children[i]?.querySelector('.ptile__img'), { click: true }) }); });
    for (const who of ['bride', 'groom']) {
      if (sameImage(data.couple?.[who]?.photo, url, data)) cands.push({ rank: 1, go: () => openField(ctx, 'couple', () => document.querySelector(`.pslot[data-path="couple.${who}.photo"] .pslot__frame`)) });
    }
    (data.events || []).forEach((e, i) => { if (sameImage(e?.photo, url, data)) cands.push({ rank: 1, go: () => openField(ctx, 'dates', () => document.querySelector(`.pslot[data-path="events[${i}].photo"] .pslot__frame`)) }); });
    for (const [id, spec] of Object.entries(man?.images || {})) {
      if (!sameImage(slotImage(spec, id, data, slotTheme), url, data)) continue;
      // A slot the couple filled themselves is that exact place; one that only repeats a couple photo goes second.
      const own = data.themeContent?.[slotTheme]?.images?.[id] != null || (sharedKey(spec, 'images') && data.content?.images?.[sharedKey(spec, 'images')] != null);
      const near = part || (t.section && sectionOfSlot(id) === t.section);
      cands.push({ rank: own ? (near ? 0.5 : 1.5) : (near ? 2.5 : 4), go: () => openField(ctx, 'opening', () => document.querySelector(at('.scard', id)), { click: true }) });
    }
    cands.sort((a, b) => a.rank - b.rank);
    if (cands.length && await cands[0].go()) return;
    if (!(await openPart(ctx, t.section))) fromDesign(ctx, 'opening');
    else toast('This picture comes from the design; it can’t be changed here.');
    return;
  }

  if (typeof t.text === 'string' && t.text.trim()) {
    const lang = t.lang === 'ne' ? 'ne' : 'en';
    const cands = [];
    for (const { path, value } of modelTexts(data)) {
      const f = fit(t.text, value);
      if (f == null) continue;
      const sameLang = path[path.length - 1] === lang ? 0 : 1;
      const near = t.section && sectionOfPath(pathStr(path)) === t.section ? -5 : 0;
      cands.push({ score: f + sameLang + near, place: placeOf(ctx, path) });
    }
    for (const [id, spec] of Object.entries(man?.texts || {})) {
      const v = slotText(spec, id, data, slotTheme);
      for (const l of ['en', 'ne']) {
        const f = fit(t.text, v[l]);
        if (f == null) continue;
        const near = part || (t.section && sectionOfSlot(id) === t.section) ? -5 : 0;
        const row = at('.trow', id);
        cands.push({ score: f + (l === lang ? 0 : 1) + near + 0.5, place: { mod: 'opening', locate: () => document.querySelector(`${row} [lang="${l}"]`) || document.querySelector(`${row} input, ${row} textarea`) } });
      }
    }
    cands.sort((a, b) => a.score - b.score);
    const best = cands[0];
    if (best && best.place.mod && await openField(ctx, best.place.mod, best.place.locate)) return;
    if (best && !best.place.mod) { toast('Your planner sets this up.'); return; }
  }

  // A borrowed gate or first screen with nothing matched: its fields in Opening.
  if (part && await openField(ctx, 'opening', () => document.querySelector(`[data-mx-theme="${CSS.escape(part.slug)}"]`))) return;
  // Words or a part with no field of its own (dates and times worked out for you, the design's ornaments).
  if (await openPart(ctx, t.section)) {
    if (typeof t.text === 'string' && t.section && !/^event:|^(date|countdown|scratch)$/.test(t.section)) fromDesign(ctx, currentModule());
    return;
  }
  fromDesign(ctx, 'opening');
}
