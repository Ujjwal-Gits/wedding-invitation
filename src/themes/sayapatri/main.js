// Sayapatri · marigold doorway.
// The guest arrives at a traditional Nepali doorway dressed for a wedding: a mango-leaf toran on the
// lintel and strings of real marigold (sayapatri mala) hanging either side of a small printed card.
// Opening the invitation lifts the garland strings into the lintel (the one signature motion).
// Inside is a calm ivory-and-white editorial page: the couple's photos first and whole (a feature,
// a pair, a quiet row, a trio), a clear programme, then photos, guest info and RSVP. Flowers appear
// only as a few deliberate accents and never behind or over text.
import '../../core/base.css';
import './sayapatri.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CustomEase } from 'gsap/CustomEase';
import { loadInvitation } from '../../core/data.js';
import { photoUrl, photos } from '../../photos.js';
import { bi, esc, dateOf, timeLabel, mapUrl, biNodes, neNum, bsDateOf } from '../../core/i18n.js';
import { mountShell, ringBell } from '../../core/shell.js';
import { createSmooth, reducedMotion } from '../../core/smooth.js';
import { renderFinale, guestEvents } from '../../core/finale.js';
import { useSlots } from '../../core/slots.js';
import { openModal } from '../../core/modal.js';
import manifest from './slots.js';

gsap.registerPlugin(ScrollTrigger, CustomEase);
// One custom curve for the whole page: a slow start, a long soft landing.
CustomEase.create('sp', '0.7,0,0.2,1');
CustomEase.create('spOut', '0.2,0.7,0.2,1');

const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const FLORA = '/themes/sayapatri/flora/';

// ───────────────────────── helpers ─────────────────────────
const focalOf = (ref) => {
  const f = (typeof ref === 'string' && photos[ref]?.focal) || (ref && typeof ref === 'object' && Array.isArray(ref.focal) && ref.focal) || [0.5, 0.5];
  const n = (v) => Math.min(100, Math.max(0, Number(v) * 100 || 50)).toFixed(1);
  return `${n(f[0])}% ${n(f[1])}%`;
};
/** Responsive <img> for any photo reference. Known pixel size is passed on so layout never jumps. */
const pic = (ref, alt = '', sizes = '50vw', extra = '') => {
  const sm = photoUrl(ref, 'sm');
  const lg = photoUrl(ref, 'lg');
  const set = sm && lg && sm !== lg ? ` srcset="${esc(sm)} 1280w, ${esc(lg)} 2560w" sizes="${esc(sizes)}"` : '';
  const wh = ref && typeof ref === 'object' && ref.w && ref.h ? ` width="${Number(ref.w)}" height="${Number(ref.h)}"` : '';
  return `<img src="${esc(sm || lg)}"${set}${wh} alt="${esc(alt)}" style="object-position:${focalOf(ref)}" decoding="async" ${extra} />`;
};
/** Decorative floral layer (real marigolds and mango leaves, cut out, transparent WebP). */
const fl = (name, cls, extra = '') => `<img class="fl ${cls}" src="${FLORA}${name}.webp" alt="" aria-hidden="true" decoding="async" ${extra} />`;

const TZ = 'Asia/Kathmandu';
/** Pieces of the AD date for the programme's date column. */
const dateParts = (iso) => {
  const d = new Date(iso);
  const f = (o) => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...o }).format(d);
  const ne = dateOf(iso).ne.split(', '); // [weekday, "month day", year]
  const [neMonth, neDay] = (ne[1] || '').split(' ');
  return {
    day: { en: f({ day: 'numeric' }), ne: neDay || '' },
    month: { en: `${f({ month: 'long' })} ${f({ year: 'numeric' })}`, ne: `${neMonth || ''} ${ne[2] || ''}` },
    weekday: { en: f({ weekday: 'long' }), ne: ne[0] || '' },
  };
};
const timeObj = (t) => (typeof t === 'string' ? { en: t, ne: neNum(t) } : t || { en: '', ne: '' });
const ratioOf = (img) => (img.naturalWidth ? img.naturalWidth / img.naturalHeight : (Number(img.getAttribute('width')) / Number(img.getAttribute('height'))) || 0.75);

async function main() {
  const config = await loadInvitation();
  if (DEBUG && params.get('slots')) {
    try { config.themeContent = { ...(config.themeContent || {}), sayapatri: JSON.parse(params.get('slots')) }; } catch (err) { console.warn('bad ?slots JSON', err); }
  }
  const { img, txt, alt } = useSlots(manifest);
  const fill = (id, vars = {}) => {
    const t = txt(id);
    const sub = (str, lang) => String(str).replace(/\{(\w+)\}/g, (_, k) => {
      const v = vars[k];
      return (v && typeof v === 'object' ? v[lang] ?? v.en : v) ?? '';
    });
    return { en: sub(t.en, 'en'), ne: sub(t.ne, 'ne') };
  };
  const reduced = reducedMotion() || params.has('still');
  const c = config.couple;
  const bride = c.bride;
  const groom = c.groom;
  const events = guestEvents();
  const P = (c.portraits || []).filter((p) => p && p.photo);
  const keyOf = (ref) => (typeof ref === 'string' ? ref : ref?.lg);
  const altOf = (id, ref) => P.find((p) => keyOf(p.photo) === keyOf(ref))?.alt || alt(id);
  const used = new Set();
  /** Slot photo, skipping one already shown elsewhere on the page when the couple has enough photos. */
  const slot = (id) => {
    let ref = img(id);
    if (ref && used.has(keyOf(ref))) {
      const spare = P.find((p) => !used.has(keyOf(p.photo)));
      if (spare) ref = spare.photo;
    }
    if (ref) used.add(keyOf(ref));
    return ref;
  };
  const bs = (e) => {
    const b = bsDateOf(e.start, e.dateBS);
    return e.dateBS && (e.dateBS.en || e.dateBS.ne) ? { en: e.dateBS.en || e.dateBS.ne, ne: e.dateBS.ne || e.dateBS.en } : { en: `${b.short.en} B.S.`, ne: `वि.सं. ${b.short.ne}` };
  };
  const names = (tag = 'span') => `
    <${tag} class="sp-names__a">${bi(bride.name)}</${tag}>
    <span class="sp-names__amp" aria-hidden="true">&amp;</span><span class="sr-only">and</span>
    <${tag} class="sp-names__b">${bi(groom.name)}</${tag}>`;
  const weddingDay = { start: config.weddingDate, dateBS: events.find((e) => e.id === 'wedding')?.dateBS };

  // ───────────────────────── gate: the marigold doorway ─────────────────────────
  // Strands are listed outer → inner; lengths come from the art itself, so each side differs a little.
  const strands = (side, list) => `<div class="sp-strands sp-strands--${side}" aria-hidden="true">${list.map((n, i) => fl(`strand-${n}`, `sp-strand sp-strand--${i}`)).join('')}</div>`;
  const gate = `
  <div class="sp-gate" id="gate">
    <div class="sp-door" aria-hidden="true">
      <span class="sp-door__frame"></span>
      ${strands('l', [1, 2, 3])}
      ${strands('r', [4, 5, 6])}
      <span class="sp-door__lintel"></span>
      <picture class="sp-toran">
        <source media="(max-width: 760px)" srcset="${FLORA}toran-sm.webp" />
        <img src="${FLORA}toran-lg.webp" alt="" decoding="async" fetchpriority="high" />
      </picture>
    </div>
    <div class="sp-gate__card"><div class="sp-gate__panel">
      <p class="sp-kicker">${bi(txt('gate.kicker'))}</p>
      <p class="sp-names sp-names--gate">${names()}</p>
      <p class="sp-gate__date">${bi(dateOf(config.weddingDate))}<span>${bi(bs(weddingDay))}</span></p>
      <p class="sp-gate__line">${bi(txt('gate.line'))}</p>
      <p class="sp-gate__guest" id="gate-guest" hidden></p>
      <div class="sp-gate__choices">
        <button type="button" class="sp-btn" id="enter-music">${bi(txt('gate.open'))}</button>
        <button type="button" class="sp-quiet" id="enter-quiet">${bi(txt('gate.quiet'))}</button>
      </div>
    </div></div>
  </div>`;

  // ───────────────────────── welcome: names + one feature photo ─────────────────────────
  const heroRef = slot('hero.photo');
  const hero = `
  <section class="sp-hero" id="welcome" aria-labelledby="hero-names">
    <div class="sp-hero__text">
      <p class="sp-kicker" data-in>${bi(txt('hero.kicker'))}</p>
      <h1 class="sp-names" id="hero-names" tabindex="-1" data-in>${names()}</h1>
      <p class="sp-hero__date" data-in>
        <span class="sp-hero__ad">${bi(dateOf(config.weddingDate))}</span>
        <span class="sp-hero__bs">${bi(bs(weddingDay))}</span>
        <span class="sp-hero__city">${bi(config.city)}</span>
      </p>
      <p class="sp-hero__line" data-in>${bi(txt('hero.line'))}</p>
    </div>
    ${heroRef ? `
    <figure class="sp-feature" data-in>
      <span class="sp-feature__frame">${pic(heroRef, altOf('hero.photo', heroRef), '(max-width: 760px) 92vw, 44vw', 'fetchpriority="high"')}</span>
      ${fl('cluster', 'sp-feature__cluster')}
    </figure>` : ''}
  </section>`;

  const divider = (cls = '') => `<div class="sp-divider ${cls}" aria-hidden="true">${fl('swag', 'sp-divider__swag', 'loading="lazy"')}</div>`;

  // ───────────────────────── the couple: a pair ─────────────────────────
  const pairL = slot('pair.left');
  const pairR = slot('pair.right');
  const pairFigs = [[pairL, 'pair.left'], [pairR, 'pair.right']].filter(([r]) => r)
    .map(([r, id]) => `<figure class="sp-fit__item sp-photo" data-reveal>${pic(r, altOf(id, r), '(max-width: 760px) 46vw, 30vw', 'loading="lazy"')}</figure>`).join('');
  const pair = `
  <section class="sp-pair" id="couple" aria-labelledby="pair-title">
    <h2 class="sp-title" id="pair-title" data-reveal>${bi(txt('pair.title'))}</h2>
    ${pairFigs ? `<div class="sp-fit sp-pair__photos" data-per="2" data-max="0.62">${pairFigs}</div>` : ''}
    <div class="sp-pair__families" data-reveal>
      <div><p class="sp-pair__name">${bi(bride.fullName || bride.name)}</p><p class="sp-pair__line">${bi(fill('pair.bride.line', { parents: bride.parents || '' }))}</p></div>
      <span class="sp-pair__amp" aria-hidden="true">&amp;</span>
      <div><p class="sp-pair__name">${bi(groom.fullName || groom.name)}</p><p class="sp-pair__line">${bi(fill('pair.groom.line', { parents: groom.parents || '' }))}</p></div>
    </div>
    <p class="sp-pair__hosts" data-reveal>${bi(config.hosts)}</p>
    <button type="button" class="sp-link" data-open-card>${bi(txt('pair.card'))}</button>
  </section>`;

  // ───────────────────────── a quiet row ─────────────────────────
  const band = ['band.1', 'band.2', 'band.3'].map((id) => ({ id, ref: slot(id) })).filter((b) => b.ref);
  const bandHtml = band.length ? `
  <section class="sp-row" aria-label="${esc('Photos of the couple')}">
    <div class="sp-fit sp-row__photos" data-per="3" data-per-phone="2" data-max="0.5">
      ${band.map((b) => `<figure class="sp-fit__item sp-photo" data-reveal>${pic(b.ref, altOf(b.id, b.ref), '(max-width: 760px) 46vw, 28vw', 'loading="lazy"')}</figure>`).join('')}
    </div>
  </section>` : '';

  // ───────────────────────── a trio: one large, two small ─────────────────────────
  const trio = ['prints.1', 'prints.2', 'prints.3'].map((id) => ({ id, ref: slot(id) })).filter((b) => b.ref);
  const trioHtml = trio.length ? `
  <section class="sp-trio" aria-labelledby="trio-title">
    <h2 class="sp-title sp-trio__title" id="trio-title" data-reveal>${bi(txt('prints.title'))}</h2>
    <div class="sp-trio__photos" data-n="${trio.length}">
      ${trio.map((p) => `<figure class="sp-photo sp-trio__item" data-reveal>${pic(p.ref, altOf(p.id, p.ref), '(max-width: 760px) 60vw, 36vw', 'loading="lazy"')}</figure>`).join('')}
    </div>
  </section>` : '';

  // ───────────────────────── programme ─────────────────────────
  const prog = `
  <section class="sp-prog" id="programme" aria-labelledby="prog-title">
    <header class="sp-prog__head" data-reveal>
      <p class="sp-kicker">${bi(txt('prog.kicker'))}</p>
      <h2 class="sp-title" id="prog-title">${bi(txt('prog.title'))}</h2>
    </header>
    <ol class="sp-events">
      ${events.map((e) => {
        const d = dateParts(e.start);
        const dress = e.dress?.text?.en || e.dress?.text?.ne;
        return `
      <li class="sp-ev" data-reveal>
        <div class="sp-ev__date" aria-hidden="true">
          <span class="sp-ev__wd">${bi(d.weekday)}</span>
          <span class="sp-ev__day">${bi(d.day)}</span>
          <span class="sp-ev__mon">${bi(d.month)}</span>
        </div>
        <div class="sp-ev__body">
          <h3 class="sp-ev__title">${bi(e.title)}</h3>
          <p class="sp-ev__when"><span>${bi(dateOf(e.start))}</span><span class="sp-ev__bs">${bi(bs(e))}</span></p>
          <dl class="sp-ev__facts">
            <div><dt>${bi({ en: 'Time', ne: 'समय' })}</dt><dd>${bi(timeLabel(e))}</dd></div>
            <div><dt>${bi({ en: 'Venue', ne: 'स्थान' })}</dt><dd>${bi(e.venue)} <a class="sp-map" href="${esc(mapUrl(e.mapQuery || e.venue?.en || ''))}" target="_blank" rel="noopener">${bi({ en: 'Map', ne: 'नक्सा' })}<span aria-hidden="true"> ↗</span></a></dd></div>
            ${dress ? `<div><dt>${bi({ en: 'Wear', ne: 'पहिरन' })}</dt><dd>${(e.dress.colors || []).length ? `<span class="sp-sw" aria-hidden="true">${e.dress.colors.slice(0, 3).map((col) => `<i style="background:${esc(col)}"></i>`).join('')}</span>` : ''}${bi(e.dress.text)}</dd></div>` : ''}
          </dl>
          ${e.rituals?.length ? `<ol class="sp-ev__rites">${e.rituals.map((r) => `<li><span>${bi(timeObj(r.time))}</span>${bi(r.title)}</li>`).join('')}</ol>` : ''}
        </div>
      </li>`;
      }).join('')}
    </ol>
  </section>`;

  const inv = config.invitation || {};
  const cardDialog = `
  <div class="sp-card" id="inv-card" hidden role="dialog" aria-modal="true" aria-labelledby="inv-card-title" data-lenis-prevent>
    <div class="sp-card__paper">
      <button type="button" class="sp-card__close" data-close-card><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
      ${fl('swag', 'sp-card__swag', 'loading="lazy"')}
      ${inv.shloka ? `<p class="sp-card__shloka" lang="sa">${esc(inv.shloka.sa)}</p><p class="sp-card__shloka-en">${esc(inv.shloka.en)}</p>` : ''}
      <h2 class="sp-card__title" id="inv-card-title">${names()}</h2>
      ${inv.salutation ? `<p class="sp-card__p sp-card__sal">${bi(inv.salutation)}</p>` : ''}
      ${inv.body ? `<p class="sp-card__p">${bi(inv.body)}</p>` : ''}
      ${inv.request ? `<p class="sp-card__p">${bi(inv.request)}</p>` : ''}
      <p class="sp-card__date">${bi(dateOf(config.weddingDate))}<br /><small>${bi(bs(weddingDay))}</small></p>
      ${inv.signoff ? `<p class="sp-card__sign">${bi(inv.signoff)}<br /><b>${bi(config.hosts)}</b></p>` : ''}
    </div>
  </div>`;

  // The closing photo is chosen now so the gallery below can skip it.
  const closing = slot('closing.photo');

  document.getElementById('main').innerHTML = hero + divider() + pair + bandHtml + trioHtml + prog + cardDialog;
  document.body.insertAdjacentHTML('afterbegin', gate);

  const to = params.get('to');
  if (to) {
    const el = document.getElementById('gate-guest');
    el.replaceChildren(...biNodes(`Dear ${to.slice(0, 60)},`, `आदरणीय ${to.slice(0, 60)},`));
    el.hidden = false;
  }

  // ───────────────────────── finale (shared markup, restyled) ─────────────────────────
  // Gallery: the couple's photos not already shown above lead; library details follow, smaller.
  const isLib = (ref) => typeof ref === 'string' && !ref.startsWith('/') && !ref.startsWith('https://');
  const portraitKeys = new Set(P.map((p) => keyOf(p.photo)));
  const isCouple = (ref) => portraitKeys.has(keyOf(ref)) || !isLib(ref) || /^(couple|bride|groom)-/.test(ref);
  const seen = new Set(used);
  const gal = [];
  P.forEach((p) => { const k = keyOf(p.photo); if (!seen.has(k)) { seen.add(k); gal.push({ photo: p.photo, shape: 'port', alt: p.alt || '' }); } });
  (config.gallery || []).forEach((g) => { const k = keyOf(g.photo); if (g.photo && !seen.has(k)) { seen.add(k); gal.push(g); } });
  config.gallery = gal;

  renderFinale(document.getElementById('finale-root'));
  const gallery = document.getElementById('gallery');
  const gTitle = document.getElementById('gallery-title');
  if (gTitle) gTitle.innerHTML = bi(txt('gallery.title'));
  const gEyebrow = document.querySelector('.gallery__head .eyebrow');
  if (gEyebrow) gEyebrow.innerHTML = `${bi(bride.name)} &amp; ${bi(groom.name)}`;
  const gTrack = document.querySelector('.gallery__track');
  if (gTrack) {
    // Two groups inside the original track (the shared lightbox listens on it).
    const items = [...gTrack.children];
    const refOf = (li) => config.gallery[Number(li.querySelector('.gallery__btn')?.dataset.idx)]?.photo;
    const mk = (cls) => { const li = document.createElement('li'); li.className = `sp-gal ${cls}`; const ul = document.createElement('ul'); li.append(ul); return [li, ul]; };
    const [coupleLi, coupleUl] = mk('sp-gal--couple');
    coupleUl.className = 'sp-fit';
    Object.assign(coupleUl.dataset, { per: '3', perPhone: '2', max: '0.7' });
    const [detailLi, detailUl] = mk('sp-gal--detail');
    items.forEach((li) => {
      const r = refOf(li);
      if (isLib(r)) li.querySelector('.gallery__cap')?.remove();
      if (isCouple(r)) li.classList.add('sp-fit__item');
      (isCouple(r) ? coupleUl : detailUl).append(li);
    });
    if (coupleUl.children.length) gTrack.append(coupleLi);
    if (detailUl.children.length) gTrack.append(detailLi);
    if (!items.length) gallery.hidden = true;
    if (!coupleUl.children.length && gEyebrow) gEyebrow.hidden = true;
  }
  // Hide guest-info columns the couple left empty (no dress notes, no travel text).
  document.querySelectorAll('.info__col').forEach((col) => {
    const text = [...col.querySelectorAll('li, .info__p')].map((n) => n.textContent.trim()).join('');
    if (!text) col.hidden = true;
  });
  const dressItems = [...document.querySelectorAll('.dress li')];
  dressItems.forEach((li) => { if (!li.querySelector('small')?.textContent.trim()) li.hidden = true; });
  if (dressItems.length && dressItems.every((li) => li.hidden)) dressItems[0].closest('.info__col').hidden = true;
  // A garland over the reply section, and a small framed photo above the blessing.
  document.getElementById('rsvp')?.insertAdjacentHTML('beforebegin', divider('sp-divider--finale'));
  const blessing = document.querySelector('.blessing');
  if (blessing && closing) {
    blessing.insertAdjacentHTML('afterbegin', `<figure class="sp-closing sp-photo">${pic(closing, altOf('closing.photo', closing), '240px', 'loading="lazy"')}</figure>`);
  }

  const CH = [
    { id: 'welcome', name: txt('nav.welcome') },
    { id: 'couple', name: txt('nav.couple') },
    { id: 'programme', name: txt('nav.prog') },
    { id: 'gallery', name: txt('nav.gallery') },
    { id: 'rsvp', name: txt('nav.reply') },
  ].filter((ch) => { const el = document.getElementById(ch.id); return el && !el.hidden; });
  const { player, setChapter } = mountShell({ chapters: CH.map((x) => x.name) });

  // Invitation card: core openModal locks the page so only the card scrolls.
  const dlg = document.getElementById('inv-card');
  const paper = dlg.querySelector('.sp-card__paper');
  let closeCard = null;
  document.querySelectorAll('[data-open-card]').forEach((b) => b.addEventListener('click', () => {
    paper.scrollTop = 0;
    closeCard = openModal(dlg, { scroller: paper, onClose: () => { dlg.hidden = true; closeCard = null; } });
  }));
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-close-card]')) closeCard?.();
  });

  // ───────────────────────── layout: whole photos, tidy rows ─────────────────────────
  const phone = () => window.innerWidth <= 760;
  /** Rows of photos at one shared height that exactly fill the width: every photo whole. */
  const fitRows = () => {
    document.querySelectorAll('.sp-fit').forEach((row) => {
      const figs = [...row.children];
      const per = Number((phone() && row.dataset.perPhone) || row.dataset.per || 3);
      const gap = phone() ? 10 : 20;
      const W = row.clientWidth;
      const maxH = window.innerHeight * Number(row.dataset.max || 0.6);
      for (let s = 0; s < figs.length; s += per) {
        const grp = figs.slice(s, s + per);
        const rs = grp.map((f) => ratioOf(f.querySelector('img')));
        const sum = rs.reduce((a, b) => a + b, 0);
        let h = Math.min((W - gap * (grp.length - 1)) / sum, maxH);
        // A lone photo left over at the end of a row stays modest instead of going full width.
        if (grp.length === 1 && figs.length > 1) h = Math.min(h, (W * 0.62) / rs[0]);
        grp.forEach((f, k) => { f.style.width = `${Math.floor(rs[k] * h)}px`; f.style.height = `${Math.floor(h)}px`; });
      }
    });
    // Trio: one large photo beside two stacked small ones, all whole, sides exactly level.
    const t = document.querySelector('.sp-trio__photos');
    if (t) {
      const figs = [...t.children];
      const gap = phone() ? 10 : 18;
      const W = t.clientWidth;
      const rs = figs.map((f) => ratioOf(f.querySelector('img')));
      if (figs.length === 3) {
        // Two candidate layouts, both exact and crop-free; keep the one whose smallest photo is largest.
        const maxH = window.innerHeight * (phone() ? 0.72 : 0.82);
        const side = () => { // large left, two stacked right
          const k = 1 / rs[1] + 1 / rs[2];
          let w2 = (W - gap - rs[0] * gap) / (rs[0] * k + 1);
          let H = w2 * k + gap;
          if (H > maxH) { H = maxH; w2 = (H - gap) / k; }
          const w1 = H * rs[0];
          return { W: w1 + gap + w2, H, boxes: [[0, 0, w1, H], [w1 + gap, 0, w2, w2 / rs[1]], [w1 + gap, w2 / rs[1] + gap, w2, w2 / rs[2]]] };
        };
        const stack = () => { // large on top, two side by side below
          let w = W;
          const hOf = (ww) => ww / rs[0] + gap + (ww - gap) / (rs[1] + rs[2]);
          if (hOf(w) > maxH) w = Math.max(200, w * (maxH - gap) / (hOf(w) - gap));
          const H1 = w / rs[0];
          const h2 = (w - gap) / (rs[1] + rs[2]);
          return { W: w, H: H1 + gap + h2, boxes: [[0, 0, w, H1], [0, H1 + gap, rs[1] * h2, h2], [rs[1] * h2 + gap, H1 + gap, rs[2] * h2, h2]] };
        };
        const minArea = (l) => Math.min(...l.boxes.map((b) => b[2] * b[3]));
        const a = side();
        const b = stack();
        const L = minArea(b) > minArea(a) * 1.15 ? b : a;
        t.style.width = `${Math.floor(L.W)}px`;
        t.style.height = `${Math.floor(L.H)}px`;
        figs.forEach((f, i) => { const [x, y, w, h] = L.boxes[i]; Object.assign(f.style, { left: `${x}px`, top: `${y}px`, width: `${Math.floor(w)}px`, height: `${Math.floor(h)}px` }); });
      } else {
        // One or two photos: a simple level row.
        const sum = rs.reduce((a, b) => a + b, 0);
        const h = Math.min((W - gap * (figs.length - 1)) / sum, window.innerHeight * 0.7);
        let x = 0;
        figs.forEach((f, i) => { const w = rs[i] * h; Object.assign(f.style, { left: `${x}px`, top: '0px', width: `${Math.floor(w)}px`, height: `${Math.floor(h)}px` }); x += w + gap; });
        t.style.width = `${Math.floor(x - gap)}px`;
        t.style.height = `${Math.floor(h)}px`;
      }
    }
  };
  document.querySelectorAll('.sp-fit img, .sp-trio img').forEach((i) => { if (!i.complete) i.addEventListener('load', () => { fitRows(); ScrollTrigger.refresh(); }, { once: true }); });
  fitRows();
  window.addEventListener('resize', fitRows);

  // ───────────────────────── motion ─────────────────────────
  const lenis = DEBUG || reduced ? null : createSmooth();
  lenis?.stop();
  if (reduced) document.body.classList.add('is-still');

  if (!reduced) {
    // Arrival: the toran settles, the strings drop into place, the card appears. Quiet.
    gsap.from('.sp-toran', { yPercent: -40, autoAlpha: 0, duration: 0.7, ease: 'spOut' });
    gsap.from('.sp-strand', { yPercent: -14, autoAlpha: 0, duration: 0.8, ease: 'spOut', stagger: 0.04, delay: 0.1 });
    gsap.from('.sp-gate__card', { y: 14, autoAlpha: 0, duration: 0.7, ease: 'spOut', delay: 0.3 });
  }

  const buildMotion = () => {
    if (reduced) return;
    gsap.utils.toArray('[data-reveal]').forEach((el) => {
      gsap.from(el, { y: 24, autoAlpha: 0, duration: 0.7, ease: 'spOut', scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' } });
    });
    gsap.utils.toArray('.sp-divider').forEach((el) => {
      gsap.from(el, { y: -10, autoAlpha: 0, duration: 0.8, ease: 'spOut', scrollTrigger: { trigger: el, start: 'top 92%' } });
    });
    gsap.utils.toArray('.letter, .finale__count, .info__col, .blessing > *, .gallery__head, .sp-gal').forEach((el) => {
      gsap.from(el, { y: 22, autoAlpha: 0, duration: 0.7, ease: 'spOut', scrollTrigger: { trigger: el, start: 'top 92%' } });
    });
  };

  const chapterOf = () => {
    const y = window.scrollY + window.innerHeight * 0.45;
    let idx = 0;
    CH.forEach((ch, i) => { const el = document.getElementById(ch.id); if (el && y >= el.getBoundingClientRect().top + window.scrollY) idx = i; });
    return idx;
  };
  let lastCh = -1;
  const onScroll = () => {
    const i = chapterOf();
    if (i !== lastCh) { lastCh = i; setChapter(i); }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  document.querySelector('.chapters')?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-chapter]');
    if (!b) return;
    const el = document.getElementById(CH[Number(b.dataset.chapter)].id);
    const y = el.getBoundingClientRect().top + window.scrollY;
    if (lenis) lenis.scrollTo(y, { duration: 1.2 }); else window.scrollTo(0, y);
  });

  let opened = false;
  const gateEl = document.getElementById('gate');
  const open = (withMusic) => {
    if (opened) return;
    opened = true;
    player.unlock();
    ringBell(player.ctx, { when: 0.05, gain: 0.12 });
    if (withMusic) setTimeout(() => player.start(true), 400);
    window.scrollTo(0, 0);
    const done = () => {
      gateEl.hidden = true;
      document.body.classList.remove('is-opening', 'is-gated');
      fitRows();
      buildMotion();
      ScrollTrigger.refresh();
      lenis?.start();
      onScroll();
      document.getElementById('hero-names')?.focus?.({ preventScroll: true });
    };
    if (reduced) return done();
    document.body.classList.add('is-opening');
    document.body.classList.remove('is-gated');
    fitRows();
    // Signature: the marigold strings lift into the lintel, inner strings first, like a curtain raised.
    const byDepth = (side) => gsap.utils.toArray(`.sp-strands--${side} .sp-strand`).reverse();
    const strandsInOut = [0, 1, 2].flatMap((i) => [byDepth('l')[i], byDepth('r')[i]]).filter(Boolean);
    gsap.timeline({ onComplete: done })
      .to('.sp-gate__card', { autoAlpha: 0, y: -12, duration: 0.32, ease: 'sp' }, 0)
      .to(strandsInOut, { yPercent: -112, duration: 0.85, ease: 'sp', stagger: 0.05 }, 0.1)
      .to('.sp-strands--l', { x: -24, duration: 0.85, ease: 'sp' }, 0.1)
      .to('.sp-strands--r', { x: 24, duration: 0.85, ease: 'sp' }, 0.1)
      .to('.sp-toran', { yPercent: -130, duration: 0.6, ease: 'sp' }, 0.5)
      .to('.sp-door__frame, .sp-door__lintel', { autoAlpha: 0, duration: 0.4, ease: 'sp' }, 0.45)
      .to(gateEl, { autoAlpha: 0, duration: 0.45, ease: 'sp' }, 0.8)
      .from('#welcome [data-in]', { y: 18, autoAlpha: 0, duration: 0.7, ease: 'spOut', stagger: 0.06, clearProps: 'transform,opacity,visibility' }, 0.8);
  };
  document.getElementById('enter-music').addEventListener('click', () => open(true));
  document.getElementById('enter-quiet').addEventListener('click', () => open(false));
  if (params.has('open')) open(false);

  document.fonts?.ready.then(() => { fitRows(); if (opened) ScrollTrigger.refresh(); });
  window.addEventListener('load', () => { fitRows(); if (opened) ScrollTrigger.refresh(); });

  if (DEBUG) {
    window.__sp = {
      ScrollTrigger, open,
      go(id, p = 0) {
        const el = document.getElementById(id) || document.querySelector(id);
        const y = el.getBoundingClientRect().top + window.scrollY + el.offsetHeight * p;
        window.scrollTo(0, y);
        ScrollTrigger.update();
        return y;
      },
    };
  }
}

main();
