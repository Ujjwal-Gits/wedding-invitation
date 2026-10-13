// Chitra (चित्र) · Illustrated Storybook. A Mithila-painted picture book: the
// Janti arrives with the panche baja, the Swayambar garlands are exchanged, the
// couple walk seven rounds of the fire (scroll drives every round), sindoor,
// and a dance at the reception. Desktop turns pages sideways; phones scroll.
import '../../core/base.css';
import './chitra.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { loadInvitation } from '../../core/data.js';
import * as photos from '../../photos.js';
import * as i18n from '../../core/i18n.js';
import * as shell from '../../core/shell.js';
import * as smooth from '../../core/smooth.js';
import * as finale from '../../core/finale.js';
import * as scenes from './scenes.js';
import * as figs from './figures.js';
import * as motifs from './motifs.js';
import credits from '../../generated/credits.json';
import { useSlots } from '../../core/slots.js';
import manifest from './slots.js';
import { openModal } from '../../core/modal.js';

gsap.registerPlugin(ScrollTrigger);

if (new URLSearchParams(location.search).has('lab')) {
  import('./lab.js').then((m) => m.lab());
} else {
  start();
}

async function start() {
  const { photoUrl, view } = photos;
  const { bi, esc, biNodes, dateOf, dayNum, timeLabel, timeOf, mapUrl, neNum } = i18n;

  const config = await loadInvitation();
  // ?debug&override: proves every slot is replaceable without touching src/config.js
  if (new URLSearchParams(location.search).has('override')) {
    config.themeContent = { ...(config.themeContent || {}), chitra: {
      texts: { 'janti.title': { en: 'Override: the band is coming', ne: 'परीक्षण: बाजा आउँदैछ' }, 'cover.kicker': { en: 'Override kicker', ne: 'परीक्षण' } },
      images: { 'reception.photo': 'couple-5', 'title.photo': 'couple-7' },
    } };
  }
  const { img, txt, alt } = useSlots(manifest);
  const T = (id) => bi(txt(id));
  const c = config.couple;
  const events = finale.guestEvents();
  const ev = Object.fromEntries(events.map((e) => [e.id, e]));
  const wedding = ev.wedding || events.find((e) => /wedding|bibaha|vivah/i.test(e.id)) || events[0];
  const reception = ev.reception || events.find((e) => /reception|bhoj/i.test(e.id));
  const reduced = smooth.reducedMotion();
  const debug = new URLSearchParams(location.search).has('debug');
  const portraits = (c.portraits || []).filter((x) => x && x.photo);
  const pic = (i) => portraits[i % Math.max(1, portraits.length)] || null;

  /* ───────── helpers ───────── */
  const ritual = (re) => wedding?.rituals?.find((r) => re.test(r.title?.en || ''));
  const ritualTime = (r) => (r ? (typeof r.time === 'string' ? { en: r.time, ne: neNum(r.time) } : r.time) : null);
  const venueLine = (e) => (e ? `<a class="cap__map" href="${esc(mapUrl(e.mapQuery))}" target="_blank" rel="noopener">${bi(e.venue)}<span aria-hidden="true"> ↗</span></a>` : '');
  const NUM = ['', '१', '२', '३', '४', '५', '६', '७'];
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  const cap = (n, title, when, where, extra = '') => `
    <div class="cap" data-n="${n}">
      <p class="cap__n"><span class="l-en">${ROMAN[n]}</span><span class="l-ne" lang="ne">${NUM[n]}</span></p>
      <h2 class="cap__title">${bi(title)}</h2>
      ${when ? `<p class="cap__when">${when}</p>` : ''}
      ${where ? `<p class="cap__where">${where}</p>` : ''}
      ${extra}
    </div>`;

  // Verified Bikram Sambat date (shared converter); an event's own dateBS wins.
  const bsOf = (iso) => {
    const e = events.find((x) => x.start === iso);
    const b = i18n.bsDateOf(iso, e?.dateBS);
    if (e?.dateBS && (e.dateBS.en || e.dateBS.ne)) return e.dateBS;
    return { en: `${b.short.en} B.S.`, ne: `वि.सं. ${b.short.ne}` };
  };
  const jantiR = ritual(/janti/i), swayR = ritual(/swayamb/i), fireR = ritual(/saptapadi|kanyadan|sindoor/i);
  const wDate = wedding ? bi(dateOf(wedding.start)) : '';
  const tl = (r) => (r ? `${bi(ritualTime(r))}` : '');

  const PAGES = [
    { id: 'title', name: { en: 'The couple', ne: 'जोडी' } },
    { id: 'janti', name: { en: 'Janti', ne: 'जन्ती' }, cap: cap(1, txt('janti.title'), `${wDate}${jantiR ? ` · ${tl(jantiR)}` : ''}`, venueLine(wedding)), hold: 1.7 },
    { id: 'swayambar', name: { en: 'Swayambar', ne: 'स्वयम्बर' }, cap: cap(2, txt('swayambar.title'), swayR ? tl(swayR) : wDate, T('swayambar.line')), hold: 1.5 },
    { id: 'pheras', name: { en: 'Seven rounds', ne: 'सप्तपदी' }, cap: cap(3, txt('pheras.title'), fireR ? tl(fireR) : '', '', `<p class="cap__vow" aria-live="polite"><span class="cap__count"></span><span class="cap__vowtext"></span></p>`), hold: 3.8 },
    { id: 'sindoor', name: { en: 'Sindoor', ne: 'सिन्दूर' }, cap: cap(4, txt('sindoor.title'), wDate, T('sindoor.line')), hold: 1.4 },
    reception && { id: 'reception', name: { en: 'Reception', ne: 'प्रीतिभोज' }, cap: cap(5, reception.title, `${bi(dateOf(reception.start))} · ${bi(timeOf(reception.start))}`, venueLine(reception), `<a class="cap__cta" href="#rsvp">${T('reception.cta')}</a>`), hold: 1.2 },
    { id: 'days', name: { en: 'The days', ne: 'कार्यक्रम' } },
  ].filter(Boolean);

  /* ───────── markup ───────── */
  const titleHtml = `
    <div class="title">
      <p class="title__kicker">${T('title.kicker')}</p>
      <h1 class="title__names"><span class="title__n">${bi(c.bride.name)}</span><span class="title__amp" aria-hidden="true">&amp;</span><span class="sr-only"> and </span><span class="title__n">${bi(c.groom.name)}</span></h1>
      <p class="title__date">${bi(dateOf(config.weddingDate))}</p>
      <p class="title__bs">${bi(config.weddingDateBS)} · ${bi(config.city)}</p>
      <button type="button" class="title__card" id="open-card">${T('card.button')}</button>
      <p class="title__cue" aria-hidden="true"><span class="cue-h">${T('title.cue')}</span><i></i></p>
    </div>`;

  const daysHtml = `
    <div class="days">
      <p class="days__kicker">${T('days.title')}</p>
      <ol class="days__list">
        ${events.map((e) => {
          const bs = bsOf(e.start);
          return `
          <li class="day">
            <h3 class="day__title">${bi(e.title)}</h3>
            <p class="day__date">${bi(dateOf(e.start))}</p>
            ${bs ? `<p class="day__bs">${bi(bs)}</p>` : ''}
            <p class="day__meta">${bi(timeLabel(e))}</p>
            <p class="day__meta">${venueLine(e)}</p>
            ${e.dress?.colors?.length ? `<p class="day__dress"><span class="day__sw" aria-hidden="true">${e.dress.colors.map((col) => `<i style="background:${esc(col)}"></i>`).join('')}</span>${bi(e.dress.text || { en: 'Festive', ne: 'उत्सव' })}</p>` : ''}
          </li>`;
        }).join('')}
      </ol>
      <a class="days__cta btn" href="#rsvp">${T('days.cta')}</a>
    </div>`;

  const pageHtml = (pg, i) => {
    const sceneSvg = (pg.id !== 'days') ? `<div class="page__art"><svg class="scene scene--${pg.id}" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(sceneLabel(pg.id))}"></svg></div>` : `<div class="page__art page__art--days" aria-hidden="true"><svg class="scene scene--days" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice"></svg></div>`;
    return `
      <article class="page page--${pg.id}" data-page="${pg.id}" data-i="${i}" aria-label="${esc(pg.name.en)}">
        <div class="page__frame" aria-hidden="true"></div>
        ${pg.cap ? `<div class="page__cap">${pg.cap}</div>` : ''}
        ${sceneSvg}
        ${pg.id === 'title' ? titleHtml : ''}
        ${pg.id === 'days' ? daysHtml : ''}
        <span class="page__folio" aria-hidden="true"><span class="l-en">${i + 1}</span><span class="l-ne" lang="ne">${neNum(i + 1)}</span></span>
        <div class="page__shade" aria-hidden="true"></div>
      </article>`;
  };
  function sceneLabel(id) {
    return {
      title: `${c.bride.name.en} and ${c.groom.name.en}, framed by Mithila peacocks and lotuses`,
      janti: 'Painted scene: the groom’s procession arrives with panche baja musicians, the father holding a parasol over the groom',
      swayambar: 'Painted scene: bride and groom exchange marigold garlands before both families',
      pheras: 'Painted scene: bride and groom, tied by the ganthbandhan cloth, walk seven rounds of the sacred fire',
      sindoor: 'Painted scene: the groom draws sindoor in the bride’s hair parting while the mothers bless them',
      reception: 'Painted scene: the couple dance at the reception under strings of lights',
      days: '',
    }[id];
  }

  document.getElementById('main').innerHTML = `
    <svg class="svg-defs" aria-hidden="true" focusable="false"><defs>${figs.figureDefs()}${motifs.motifDefs()}</defs></svg>
    <section class="book" id="book" aria-label="The wedding storybook">
      <div class="book__pin"><div class="book__stack">${PAGES.map(pageHtml).join('')}</div></div>
    </section>
    <dialog class="card" id="card" aria-labelledby="card-title" data-lenis-prevent>
      <div class="card__in">
        <button type="button" class="card__close" data-close><span aria-hidden="true">×</span><span class="sr-only">Close</span></button>
        <p class="card__mantra" lang="sa">॥ श्री गणेशाय नमः ॥</p>
        <p class="card__shloka" lang="sa">${esc(config.invitation.shloka.sa)}</p>
        <p class="card__shloka-en">${esc(config.invitation.shloka.en)}</p>
        <h2 class="card__title" id="card-title">${bi(config.invitation.salutation)}</h2>
        <p>${bi(config.invitation.body)}</p>
        <dl class="card__fam">
          <div><dt>${bi({ en: 'The bride', ne: 'दुलही' })}</dt><dd>${bi(c.bride.fullName)}<small>${bi(c.bride.parents)}<br />${bi(c.bride.home)}</small></dd></div>
          <div><dt>${bi({ en: 'The groom', ne: 'दुलहा' })}</dt><dd>${bi(c.groom.fullName)}<small>${bi(c.groom.parents)}<br />${bi(c.groom.home)}</small></dd></div>
        </dl>
        <p>${bi(config.invitation.request)}</p>
        <p class="card__sign">${bi(config.invitation.signoff)}<br /><b>${bi(config.hosts)}</b></p>
      </div>
    </dialog>`;

  /* ───────── gate (the book's cover) ───────── */
  const gate = document.getElementById('gate');
  gate.innerHTML = `
    <div class="cover" id="cover">
      <svg class="cover__art" viewBox="0 0 600 600" aria-hidden="true">${coverArt(motifs, figs.PAL)}</svg>
      <div class="cover__text">
        <p class="cover__guest" id="gate-guest" hidden></p>
        <p class="cover__kicker">${T('cover.kicker')}</p>
        <p class="cover__names">${bi(c.bride.name)} <span class="amp">&amp;</span> ${bi(c.groom.name)}</p>
        <p class="cover__date">${bi(dateOf(config.weddingDate))}</p>
        <div class="gate__choices">
          <button type="button" class="btn cover__open" id="enter-music">${T('cover.open')}</button>
          <button type="button" class="gate__quiet" id="enter-quiet">${T('cover.quiet')}</button>
        </div>
      </div>
    </div>`;
  const to = new URLSearchParams(location.search).get('to');
  if (to) {
    const el = document.getElementById('gate-guest');
    el.replaceChildren(...biNodes(`Dear ${to.slice(0, 60)}`, `आदरणीय ${to.slice(0, 60)}`));
    el.hidden = false;
  }

  // The album leads with the couple's own photos; library details follow as accents, uncaptioned.
  const shapeOf = (ref) => {
    const k = typeof ref === 'string' ? credits.find((x) => x.slot === ref) : null;
    const w = k?.width || ref?.width, h = k?.height || ref?.height;
    return w && h ? (w / h > 1.15 ? 'land' : w / h < 0.87 ? 'port' : 'sq') : 'port';
  };
  const seen = new Set();
  config.gallery = [
    ...portraits.map((x) => ({ photo: x.photo, alt: x.alt || '', shape: shapeOf(x.photo) })),
    ...(config.gallery || []),
  ].filter((g) => { const k = JSON.stringify(g.photo); if (seen.has(k)) return false; seen.add(k); return true; })
    .map((g) => ({ ...g, caption: undefined }));
  finale.renderFinale(document.getElementById('finale-root'), { credits });
  document.querySelector('.gallery__head .display').innerHTML = T('gallery.title');
  document.querySelector('.gallery__head .eyebrow').innerHTML = T('gallery.eyebrow');
  const { player, setChapter } = shell.mountShell({ chapters: PAGES.map((p) => p.name) });

  /* ───────── scenes ───────── */
  const vowEl = document.querySelector('.cap__vowtext');
  const countEl = document.querySelector('.cap__count');
  const sceneDefs = {
    title: scenes.titleScene(),
    janti: scenes.jantiScene(),
    swayambar: scenes.swayambarScene(),
    pheras: scenes.pherasScene({
      onRound: (r) => {
        if (!vowEl) return;
        const v = config.saptapadi?.[Math.max(0, r - 1)];
        countEl.replaceChildren(...biNodes(`${r} / 7`, `${neNum(r)} / ७`));
        if (r > 0 && v) vowEl.innerHTML = bi(v); else vowEl.innerHTML = T('pheras.hint');
      },
    }),
    sindoor: scenes.sindoorScene(),
    reception: reception ? scenes.receptionScene() : null,
  };
  const pages = [...document.querySelectorAll('.page')];
  const live = PAGES.map((pg, i) => {
    const def = sceneDefs[pg.id];
    const svg = pages[i].querySelector('svg.scene');
    if (def) {
      svg.innerHTML = def.art;
      def.mount?.(svg);
    } else if (pg.id === 'days') {
      svg.innerHTML = daysArt(motifs, figs.PAL);
    }
    return { pg, def, svg, el: pages[i], p: 0, active: false };
  });

  // Photo slots: the couple's own photos, framed inside the painting at their own
  // proportions (fitted inside the box, never cropped) with a Mithila border.
  document.querySelectorAll('.photo-box').forEach((g) => {
    const id = g.dataset.slot;
    const ref = img(id);
    if (!ref) return;
    const [bx, by, bw, bh] = g.dataset.box.split(',').map(Number);
    const o = JSON.parse(g.dataset.opts || '{}');
    const url = photoUrl(ref, id === 'title.photo' ? 'lg' : 'sm');
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      const b = o.border ?? 18;
      const ar = im.naturalWidth / im.naturalHeight;
      let w = bw - 2 * b, h = w / ar;
      if (h > bh - 2 * b) { h = bh - 2 * b; w = h * ar; }
      const x = bx + (bw - w) / 2;
      const y = o.align === 'top' ? by + b : o.align === 'bottom' ? by + bh - b - h : by + (bh - h) / 2;
      const key = id.replace(/\W/g, '-');
      g.innerHTML = motifs.frame(key, x, y, w, h, o);
      const slot = g.querySelector('.photo-slot');
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      node.setAttribute('href', url);
      node.setAttribute('x', x.toFixed(1)); node.setAttribute('y', y.toFixed(1));
      node.setAttribute('width', w.toFixed(1)); node.setAttribute('height', h.toFixed(1));
      node.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      slot.append(node);
      slot.setAttribute('role', 'img');
      slot.setAttribute('aria-label', alt(id) || 'The couple');
    };
    im.src = url;
  });

  /* ───────── the director ───────── */
  const W = () => window.innerWidth, H = () => window.innerHeight;
  const bookMode = () => !reduced && W() >= 900 && W() / H() >= 1.12;
  const mode = reduced ? 'still' : bookMode() ? 'book' : 'scroll';
  document.body.classList.add(`is-${mode}`);
  if (debug) document.body.classList.add('is-debug');

  // Static first frame of every scene.
  live.forEach((L) => { L.def?.update?.(mode === 'still' ? finalP(L.pg.id) : 0); L.def?.tick?.(0, 0.016); });
  function finalP(id) { return { janti: 1, swayambar: 1, pheras: 1, sindoor: 1, reception: 0.5 }[id] ?? 0; }

  // Phones: viewBox crops per scene (Janti's camera follows the procession).
  const setMobileVB = (L) => {
    const m = L.def?.vbm;
    if (!m || mode === 'book') return;
    const box = L.svg.getBoundingClientRect();
    const a = box.width && box.height ? box.width / box.height : m.w / m.h;
    // Show at least the scene's key region; grow upward into the sky on tall screens.
    let w = m.w, h = m.w / a;
    if (m.fit === 'h' || h < m.h) { h = m.h; w = h * a; }
    if (h > 1000) { h = 1000; w = h * a; }
    const cx = m.follow && L.def.cam ? L.def.cam(L.p, w) : m.x + m.w / 2;
    const x = Math.min(1600 - w, Math.max(0, cx - w / 2));
    const y = Math.min(1000 - h, Math.max(0, m.y + m.h - h));
    L.svg.setAttribute('viewBox', `${x.toFixed(0)} ${y.toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}`);
  };
  window.addEventListener('resize', () => live.forEach(setMobileVB));
  live.forEach(setMobileVB);

  const lenis = smooth.createSmooth();
  lenis?.stop();
  let t0 = performance.now(), last = t0;
  const tickActive = () => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const t = (now - t0) / 1000;
    for (const L of live) if (L.active && L.def?.tick) { L.def.update?.(L.p); L.def.tick(t, dt); if (L.def.vbm?.follow) setMobileVB(L); }
  };

  let book = null;
  if (mode === 'book') book = buildBook();
  else if (mode === 'scroll') buildScroll();
  else buildStill();
  if (mode !== 'still') gsap.ticker.add(tickActive);

  function buildBook() {
    const TURN = 0.9;
    const segs = [];
    let u = 0;
    PAGES.forEach((pg, i) => {
      const hold = pg.hold ?? (i === 0 ? 0.25 : 0.5);
      segs.push({ start: u, holdEnd: u + hold });
      u += hold + (i < PAGES.length - 1 ? TURN : 0);
    });
    const total = u;
    const state = { target: 0, cur: 0, chapter: -1 };
    pages.forEach((el, i) => { el.style.zIndex = String(100 - i); });
    const st = ScrollTrigger.create({
      trigger: '#book', start: 'top top', end: () => `+=${total * H()}`, pin: '.book__pin', anticipatePin: 1,
      onUpdate: (self) => { state.target = self.progress * total; },
    });
    const render = (uu) => {
      live.forEach((L, i) => {
        const s = segs[i];
        const turn = clamp01((uu - s.holdEnd) / TURN);
        const prevTurn = i > 0 ? clamp01((uu - segs[i - 1].holdEnd) / TURN) : 1;
        const visible = prevTurn > 0 && turn < 1;
        L.active = visible && !!L.def?.tick;
        L.el.style.visibility = visible ? 'visible' : 'hidden';
        if (!visible) return;
        L.p = clamp01((uu - s.start) / Math.max(0.001, s.holdEnd - s.start));
        // the page lifts from the spine (left edge) and is turned away to the left
        const e = turn < 0.5 ? 2 * turn * turn : 1 - Math.pow(-2 * turn + 2, 2) / 2;
        L.el.style.transform = turn > 0 ? `translate3d(${(-e * 104).toFixed(2)}%,0,0) rotateY(${(-e * 14).toFixed(2)}deg)` : '';
        L.el.querySelector('.page__shade').style.opacity = String(i > 0 ? (1 - prevTurn) * 0.32 : 0);
        L.el.classList.toggle('is-turning', turn > 0);
      });
      let ch = 0;
      segs.forEach((s, i) => { if (uu >= s.start - TURN * 0.5) ch = i; });
      if (ch !== state.chapter) { state.chapter = ch; setChapter(ch); }
    };
    gsap.ticker.add((time, dms) => {
      const dt = Math.min(0.1, (dms || 16) / 1000);
      const diff = state.target - state.cur;
      if (Math.abs(diff) > 0.0004) { state.cur += diff * (1 - Math.exp(-dt * 9)); render(state.cur); }
    });
    render(0);
    document.querySelector('.chapters')?.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-chapter]');
      if (!b) return;
      const y = st.start + segs[Number(b.dataset.chapter)].start * H() + 2;
      lenis ? lenis.scrollTo(y, { duration: 1.6 }) : window.scrollTo({ top: y, behavior: 'smooth' });
    });
    return { segs, total, st, state, render };
  }

  function buildScroll() {
    const LEN = { janti: 1.5, swayambar: 1.3, pheras: 3, sindoor: 1.3, reception: 1 };
    live.forEach((L, i) => {
      const len = LEN[L.pg.id];
      if (len) {
        ScrollTrigger.create({
          trigger: L.el, start: 'top top', end: () => `+=${len * H()}`, pin: true, pinSpacing: true, anticipatePin: 1,
          onUpdate: (self) => { L.p = self.progress; },
        });
      }
      ScrollTrigger.create({
        trigger: L.el, start: 'top bottom', end: () => (len ? `bottom+=${len * H()} top` : 'bottom top'),
        onToggle: (self) => { L.active = self.isActive; },
        onEnter: () => setChapter(i), onEnterBack: () => setChapter(i),
      });
      // paper settles as the page arrives
      gsap.fromTo(L.el.querySelector('.page__art'), { yPercent: 6, rotate: 1.2 }, { yPercent: 0, rotate: 0, ease: 'none', scrollTrigger: { trigger: L.el, start: 'top bottom', end: 'top 30%', scrub: true } });
    });
    document.querySelector('.chapters')?.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-chapter]');
      if (b) pages[Number(b.dataset.chapter)].scrollIntoView({ behavior: 'smooth' });
    });
  }

  function buildStill() {
    requestAnimationFrame(() => live.forEach(setMobileVB));
    live.forEach((L) => { L.p = finalP(L.pg.id); L.def?.update?.(L.p); L.def?.tick?.(0, 0); });
  }

  finale.animateGallery({ reduced: true, mobile: true });

  /* ───────── invitation card ───────── */
  const card = document.getElementById('card');
  let closeCard = null;
  document.getElementById('open-card').addEventListener('click', () => {
    card.showModal();
    closeCard = openModal(card, { scroller: card });
  });
  card.addEventListener('click', (e) => { if (e.target === card || e.target.closest('[data-close]')) card.close(); });
  card.addEventListener('close', () => { closeCard?.(); closeCard = null; });

  /* ───────── open the book ───────── */
  const go = (withMusic) => {
    player.unlock();
    if (withMusic) player.start(true);
    const done = () => {
      gate.hidden = true;
      document.body.classList.remove('is-gated');
      lenis?.start();
      ScrollTrigger.refresh();
    };
    if (reduced) return done();
    gsap.timeline({ onComplete: done })
      .to('#cover', { rotateY: -96, duration: 1.15, ease: 'power3.inOut', transformOrigin: '0% 50%' })
      .to('#gate', { autoAlpha: 0, duration: 0.35 }, '-=0.35');
    document.body.classList.remove('is-gated'); // reveal the title page under the cover
    gate.classList.add('is-opening');
  };
  document.getElementById('enter-music').addEventListener('click', () => go(true), { once: true });
  document.getElementById('enter-quiet').addEventListener('click', () => go(false), { once: true });

  /* ───────── debug hook for screenshots ───────── */
  window.__chitra = {
    mode, live, book,
    open: () => { gate.hidden = true; document.body.classList.remove('is-gated'); lenis?.start(); ScrollTrigger.refresh(); },
    /** Jump to page i at scene progress p (book: u position; scroll: page pin). */
    show(i, p = 0.5) {
      if (book) {
        const s = book.segs[i];
        const uu = s.start + (s.holdEnd - s.start) * p;
        book.state.cur = book.state.target = uu;
        window.scrollTo(0, book.st.start + uu * H());
        book.render(uu);
      } else {
        const L = live[i];
        L.p = p;
        L.el.scrollIntoView();
      }
      const L = live[i];
      L.p = p; L.active = true;
      L.def?.update?.(p); L.def?.tick?.(3, 0.016); if (L.def) setMobileVB(L);
    },
  };

  function clamp01(v) { return Math.min(1, Math.max(0, v)); }
}

/** Decoration for the programme page: corner lotuses, fish and a vine border. */
function daysArt(M, PAL) {
  return `<rect width="1600" height="1000" fill="#ffffff"/>
    ${M.tree(1420, 1010, 0.9, { bird: true, fruit: true })}
    ${M.fishPair(170, 170, 0.9)}
    ${M.lotus(1200, 1000, 0.8)}${M.lotus(120, 1000, 0.7, PAL.verm, PAL.pink)}
    ${M.kalash(1290, 1000, 1.2)}`;
}

/** The cover medallion: rings of Mithila borders around the fish pair and a lotus. */
function coverArt(M, PAL) {
  let ring = '';
  for (let i = 0; i < 36; i++) ring += `<g transform="rotate(${i * 10} 300 300)">${M.P('M291,62 L300,36 L309,62Z', i % 2 ? PAL.verm : PAL.turmeric, 1.6)}</g>`;
  let petals = '';
  for (let i = 0; i < 24; i++) petals += `<g transform="rotate(${i * 15} 300 300)">${M.P('M300,92 C290,80 292,66 300,58 C308,66 310,80 300,92Z', i % 2 ? PAL.pink : PAL.turmeric, 1.4)}</g>`;
  return `${ring}<circle cx="300" cy="300" r="240" fill="#ffffff" stroke="#1c1611" stroke-width="3"/>
    <circle cx="300" cy="300" r="226" fill="none" stroke="#1c1611" stroke-width="1.4"/>${petals}
    <circle cx="300" cy="300" r="196" fill="${PAL.indigo}" stroke="#1c1611" stroke-width="2.4"/>
    <circle cx="300" cy="300" r="196" fill="url(#ch-dots)" opacity=".5"/>
    ${M.fishPair(300, 300, 1.75, PAL.verm, PAL.turmeric)}`;
}
