// Chitra · the illustrated scenes. Each scene is a 1600×1000 painting with a
// cast of articulated figures. `update(p)` receives the scroll progress of the
// scene (0–1); `tick(t, dt)` renders a frame (idle life, musicians, flames).
import { createGroom, createBride, createElder, createGuest, createMusician, createPriest, play, dance, garlandLoop, PAL, INK } from './figures.js';
import * as M from './motifs.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const io = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const so = (t) => 1 - Math.pow(1 - t, 3);
const TAU = Math.PI * 2;

/** Deterministic scatter (so every guest sees the same painting). */
const rnd = (seed) => { let s = seed; return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646; };

const shadow = (fig, rx = 34) => fig.el.insertAdjacentHTML('afterbegin', `<ellipse cx="4" cy="1" rx="${rx}" ry="6" fill="rgba(28,22,17,.16)"/>`);
const put = (layer, fig, x, y, s, dir = 1, sh = true) => { if (sh) shadow(fig); layer.append(fig.el); fig.place(x, y, s, dir); return fig; };
const namaste = (fig, x = 26, y = -92) => { fig.reach('F', x, y, 1, fig.rest); fig.reach('B', x - 4, y - 2, 1, fig.rest); fig.reset(); };

const petals = (n, seed, x0, x1, y0) => {
  const r = rnd(seed);
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, r()), y = y0 - r() * 300, rot = r() * 360, c = r() > 0.4 ? PAL.marigold : r() > 0.5 ? PAL.verm : PAL.marigoldY;
    s += `<g class="petal" data-x="${x.toFixed(0)}" data-y="${y.toFixed(0)}" data-r="${rot.toFixed(0)}" data-v="${(0.6 + r() * 0.8).toFixed(2)}" transform="translate(${x.toFixed(0)},${y.toFixed(0)})"><path d="M0,-7 C5,-4 5,4 0,7 C-5,4 -5,-4 0,-7Z" fill="${c}" stroke="${INK}" stroke-width="1"/></g>`;
  }
  return `<g class="petals" opacity="0">${s}</g>`;
};
const movePetals = (root, k, sway = 1) => {
  const g = root.querySelector('.petals');
  if (!g) return;
  g.setAttribute('opacity', k > 0 && k < 1 ? Math.min(1, k * 6, (1 - k) * 6).toFixed(2) : '0');
  if (k <= 0 || k >= 1) return;
  g.querySelectorAll('.petal').forEach((el, i) => {
    const v = +el.dataset.v;
    const y = +el.dataset.y + k * 1100 * v;
    const x = +el.dataset.x + Math.sin(k * 9 + i) * 26 * sway;
    el.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${(+el.dataset.r + k * 540 * v).toFixed(0)})`);
  });
};

const birds = (pts) => pts.map(([x, y, s]) => M.G(x, y, s, M.P('M-16,-2 C-8,-10 -2,-8 0,0 C2,-8 8,-10 16,-2 C8,-4 4,-2 0,4 C-4,-2 -8,-4 -16,-2Z', INK, 0))).join('');
const tufts = (seed, n, x0, x1, y0, y1) => { const r = rnd(seed); let s = ''; for (let i = 0; i < n; i++) s += M.grassTuft(lerp(x0, x1, r()), lerp(y0, y1, r()), 0.8 + r() * 0.6); return s; };
const stars = (seed, n, x0, x1, y0, y1, avoid = () => false) => { const r = rnd(seed); let s = ''; for (let i = 0; i < n; i++) { const x = lerp(x0, x1, r()), y = lerp(y0, y1, r()); if (!avoid(x, y)) s += i % 4 ? `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(1 + r() * 1.6).toFixed(1)}" fill="#f2dca0"/>` : M.star(Math.round(x), Math.round(y), 4 + r() * 4); } return s; };

/* ═════════════════════════ 0 · Title page ═════════════════════════ */
export function titleScene() {
  const art = `
    <rect width="1600" height="1000" fill="#ffffff"/>
    ${M.sun(530, 150, 50)}
    ${birds([[300, 140, 0.9], [356, 112, 0.7], [760, 120, 0.8]])}
    ${M.peacock(260, 780, 1.45, false, PAL.indigo)}
    ${M.peacock(800, 780, 1.45, true, PAL.indigo)}
    ${M.photoBox('title.photo', 340, 196, 380, 560, { border: 24 })}
    ${M.lotus(530, 900, 1.05)}
    ${M.lotus(390, 905, 0.62, PAL.verm, PAL.pink)}
    ${M.lotus(670, 905, 0.62, PAL.verm, PAL.pink)}
    ${M.fish(220, 915, 0.7, 0, PAL.verm)}${M.fish(840, 915, 0.7, 180, PAL.indigo)}
    <rect x="-4" y="955" width="1608" height="50" fill="${PAL.indigo}"/>`;
  return { id: 'title', art, vbm: { x: 170, y: 60, w: 720, h: 900 } };
}

/* ═════════════════════════ 1 · Janti ═════════════════════════ */
export function jantiScene() {
  const GROUND = 874;
  const art = `
    <rect width="1600" height="1000" fill="#ffffff"/>
    ${M.sun(640, 170, 50)}
    ${birds([[470, 130, 0.9], [520, 104, 0.7], [1000, 140, 0.8], [1050, 110, 0.7]])}
    ${M.janakiMandir(800, 772, 0.78)}
    ${M.bamboo(56, 776, 330)}${M.bamboo(128, 776, 250, 0.9)}
    ${M.tree(1150, 778, 0.74, { bird: true, fruit: true })}
    <rect x="-4" y="776" width="1608" height="230" fill="#e3a325"/>
    ${M.borderBand(-4, 764, 1608, 18, 'ch-tri')}
    ${tufts(7, 26, 0, 1240, 800, 990)}
    ${M.house(1262, GROUND, 340, 300)}
    ${M.kalash(1225, GROUND, 0.9)}
    <g class="actors"><g class="proc"></g><g class="host"></g></g>
    ${M.lotus(120, 1000, 0.55)}${M.lotus(980, 1004, 0.5, PAL.verm, PAL.pink)}`;

  const PARASOL = `<g>${M.L('M46,-112 L82,-352', INK, 6)}${M.L('M46,-112 L82,-352', '#6b4226', 3.6)}
    ${M.P('M2,-334 C10,-388 152,-396 166,-342 C120,-352 50,-350 2,-334Z', PAL.verm, 2.2)}<path d="M2,-334 C10,-388 152,-396 166,-342 C120,-352 50,-350 2,-334Z" fill="url(#ch-tri-sm)" opacity=".55"/>
    ${M.fringe(4, 166, -342, 18).replace(/<path/g, '<path transform="skewY(-2)"')}
    ${M.C(84, -386, 7, PAL.turmeric, 1.8)}</g>`;
  const THALI = `<g transform="translate(40,-66)">${M.P('M-24,0 C-18,7 18,7 24,0 C18,-3 -18,-3 -24,0Z', PAL.gold, 1.8)}${M.C(-8, -4, 3.4, PAL.marigold, 1)}${M.C(-2, -6, 3.4, PAL.verm, 1)}${M.C(12, -5, 3.4, PAL.marigoldY, 1)}${M.P('M2,-3 C2,-9 8,-9 8,-3Z', '#9a4b22', 1.2)}${M.P('M5,-9 C3,-12 4,-16 5,-19 C6,-16 7,-12 5,-9Z', PAL.turmeric, 1)}</g>`;

  let proc, host, cast = [], off = 0, dist = 0, k = 0, p = 0, father;
  const START = 380, END = 1120;
  return {
    id: 'janti', art, vbm: { x: 0, y: 330, w: 760, h: 670, fit: 'h', follow: true },
    mount(svg) {
      proc = svg.querySelector('.proc');
      host = svg.querySelector('.host');
      const order = [
        [createMusician('narsingha'), 0], [createMusician('shehnai'), -96], [createMusician('damaha'), -196],
        [createMusician('tyamko'), -290], [createMusician('dholaki'), -386], [createMusician('jhyali'), -482],
        [createGroom(), -610], [createElder('father', { front: PARASOL }), -688],
        [createGuest(0), -790], [createGuest(1), -880], [createGuest(2), -966], [createElder('grandfather'), -1062],
      ];
      order.forEach(([fig, x], i) => { put(proc, fig, x, GROUND, 1, 1); fig.ph = i * 0.27; cast.push(fig); });
      father = order[7][0];
      const mother = createElder('mother', { front: THALI });
      put(host, mother, 1336, GROUND, 1, -1);
      mother.reach('F', 42, -64, 1, mother.rest); mother.reach('B', 30, -66, 1, mother.rest); mother.reset();
      const bf = createElder('father', { topi: 'dhaka', topColor: '#3a3446' });
      put(host, bf, 1218, GROUND, 1, -1); namaste(bf);
      this.hosts = [mother, bf];
      proc.setAttribute('transform', `translate(${START},0)`);
      off = START;
    },
    update(v) { p = v; },
    /** Phone camera: ride with the front of the procession, then settle on the welcome at the door. */
    cam(v, w) {
      const front = lerp(START, END, v);
      const ride = front - w * 0.36;
      return lerp(ride, 1600 - w / 2, io(seg(v, 0.78, 1)));
    },
    tick(t, dt) {
      const target = lerp(START, END, p);
      const dx = target - off;
      off = target;
      const v = Math.abs(dx) / Math.max(dt, 1 / 120);
      k = lerp(k, clamp(v / 80), 1 - Math.exp(-dt * 7));
      dist += Math.abs(dx);
      proc.setAttribute('transform', `translate(${off.toFixed(1)},0)`);
      for (const fig of cast) {
        const ph = dist / 150 + fig.ph;
        if (k > 0.02) fig.walk(ph, k, fig.kind !== 'musician'); else fig.idle(t);
        if (fig.instrument) play(fig, t + fig.ph);
      }
      father.reach('F', 46, -118); father.apply();
      for (const h of this.hosts) h.idle(t);
    },
  };
}

/* ═════════════════════════ 2 · Swayambar ═════════════════════════ */
export function swayambarScene() {
  const GROUND = 880;
  const niche = (x) => `
    <path d="M${x},720 L${x},300 C${x},220 ${x + 60},180 ${x + 140},150 C${x + 220},180 ${x + 280},220 ${x + 280},300 L${x + 280},720Z" fill="#ffffff" stroke="${INK}" stroke-width="2.4"/>
    <path d="M${x + 14},706 L${x + 14},304 C${x + 14},232 ${x + 68},196 ${x + 140},168 C${x + 212},196 ${x + 266},232 ${x + 266},304 L${x + 266},706Z" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
  const art = `
    <rect width="1600" height="1000" fill="#b3321b"/>
    <rect width="1600" height="1000" fill="url(#ch-kachni)" opacity=".35"/>
    ${M.borderBand(-4, -4, 1608, 34, 'ch-tri')}
    ${niche(120)}${M.peacock(320, 400, 0.9, false)}${M.lotus(260, 702, 0.6)}
    ${niche(1200)}${M.peacock(1280, 400, 0.9, true)}${M.lotus(1340, 702, 0.6)}
    ${M.photoBox('swayambar.photo', 670, 126, 260, 236, { align: 'top', hang: true, border: 18, color: PAL.indigo, pattern: 'ch-dots' })}
    ${M.toran(-10, 1610, 42, 22, 42)}
    ${[40, 84, 1516, 1560].map((x, i) => M.marigoldString(x, 36, 230 + (i % 2) * 60)).join('')}
    <rect x="-4" y="800" width="1608" height="204" fill="${PAL.turmeric}"/>
    <rect x="-4" y="800" width="1608" height="204" fill="url(#ch-floor)"/>
    ${M.borderBand(-4, 790, 1608, 16, 'ch-tri-sm')}
    <g class="actors"></g>
    ${petals(40, 11, 380, 1220, 0)}`;

  let groom, bride, ringB, ringG, gf, gm, bm, bg, p = 0;
  const GX = 696, BX = 904;
  return {
    id: 'swayambar', art, vbm: { x: 470, y: 330, w: 660, h: 640 },
    mount(svg) {
      const a = svg.querySelector('.actors');
      gm = put(a, createGuest(3), 300, GROUND, 1.16, 1);
      gf = put(a, createElder('father'), 430, GROUND, 1.2, 1); namaste(gf);
      bg = put(a, createElder('grandmother'), 1300, GROUND, 1.12, -1); namaste(bg, 24, -84);
      bm = put(a, createElder('mother'), 1170, GROUND, 1.18, -1);
      groom = put(a, createGroom(), GX, GROUND, 1.28, 1);
      bride = put(a, createBride({ mala: true, headTilt: 6 }), BX, GROUND, 1.28, -1);
      groom.j.mala.setAttribute('opacity', '0');
      bride.j.mala.setAttribute('opacity', '0');
      // Each garland is a closed marigold ring whose top always sits in the giver's hands.
      a.insertAdjacentHTML('beforeend', `<g class="ring ring--b">${garlandLoop(0, 52, 31, 52, 5.4)}</g><g class="ring ring--g">${garlandLoop(0, 52, 31, 52, 5.4)}</g>`);
      ringB = a.querySelector('.ring--b');
      ringG = a.querySelector('.ring--g');
      this.svg = svg;
    },
    update(v) { p = v; },
    tick(t) {
      groom.x = GX; bride.x = BX;
      groom.idle(t, 0.6); bride.idle(t, 0.6);
      groom.pose.lean = 0; bride.pose.lean = 0;
      bride.pose.head = 6;
      // giver steps in, taker bows; both hands lift the ring over the head and lower it onto the shoulders
      const exchange = (giver, taker, ring, a0, a1, mala, toward) => {
        const u = seg(p, a0, a1);
        const step = io(seg(u, 0, 0.22)) * (1 - io(seg(u, 0.86, 1)));
        giver.x += toward * 70 * step;
        const bow = io(seg(u, 0.12, 0.36)) * (1 - io(seg(u, 0.8, 0.96)));
        taker.pose.lean = 8 * bow;
        taker.pose.head = (taker === bride ? 6 : 0) + 12 * bow;
        giver.apply(); taker.apply();
        const hold = giver.toScene(36, -66);
        const over = taker.toScene(10, -236);
        const nape = taker.toScene(-2, -124);
        const lift = io(seg(u, 0.2, 0.5)), lower = io(seg(u, 0.5, 0.72)), back = io(seg(u, 0.84, 1));
        let X = lerp(hold[0], over[0], lift), Y = lerp(hold[1], over[1], lift) - Math.sin(lift * Math.PI) * 36;
        X = lerp(X, nape[0], lower); Y = lerp(Y, nape[1], lower);
        if (u >= 0.84) { X = lerp(nape[0], hold[0], back); Y = lerp(nape[1], hold[1], back); }
        const [bx, by] = giver.toBody(X, Y);
        giver.reach('F', bx + 6, by + 2); giver.reach('B', bx - 6, by);
        giver.apply();
        const hf = giver.point('handF', 0, 12), hb = giver.point('handB', 0, 12);
        const rx = (hf[0] + hb[0]) / 2, ry = (hf[1] + hb[1]) / 2 - 4;
        ring.setAttribute('transform', `translate(${rx.toFixed(1)},${ry.toFixed(1)}) scale(${lerp(1, 0.82, lower).toFixed(3)},${lerp(1, 1.06, lower).toFixed(3)})`);
        ring.setAttribute('opacity', u < 0.72 ? '1' : String(1 - seg(u, 0.72, 0.84)));
        mala.setAttribute('opacity', String(seg(u, 0.7, 0.84)));
      };
      exchange(bride, groom, ringB, 0.04, 0.48, groom.j.mala, -1);
      exchange(groom, bride, ringG, 0.5, 0.92, bride.j.mala, 1);
      const j = io(seg(p, 0.93, 1));
      if (j > 0) for (const fig of [groom, bride]) {
        const r = {}; fig.reach('F', 26, -92, 1, r); fig.reach('B', 22, -94, 1, r);
        for (const kk in r) fig.pose[kk] = lerp(fig.pose[kk], r[kk], j);
        fig.apply();
      }
      for (const fig of [gf, gm, bm, bg]) fig.idle(t);
      movePetals(this.svg, seg(p, 0.42, 1));
    },
  };
}

/* ═════════════════════════ 3 · Saptapadi / seven rounds ═════════════════════════ */
export function pherasScene({ onRound } = {}) {
  const CX = 800, CY = 792, RX = 250, RY = 62;
  const md = M.mandap(CX, 800, 680, 520);
  const diyos = Array.from({ length: 7 }, (_, k) => M.diyo(CX + (k - 3) * 96, 958 - (k - 3) ** 2 * 5, 1.35, false, k)).join('');
  const art = `
    <rect width="1600" height="1000" fill="#ffffff"/>
    ${M.sun(1360, 190, 50)}
    ${birds([[1180, 130, 0.8], [1230, 104, 0.6], [300, 240, 0.7]])}
    ${M.tree(150, 772, 0.7, { bird: true, fruit: true })}
    <rect x="-4" y="770" width="1608" height="234" fill="${PAL.turmeric}"/>
    <rect x="-4" y="770" width="1608" height="234" fill="url(#ch-floor)" opacity=".8"/>
    ${M.borderBand(-4, 760, 1608, 14, 'ch-tri-sm')}
    <ellipse cx="${CX}" cy="${CY + 6}" rx="${RX + 70}" ry="${RY + 36}" fill="#c4502a" stroke="#ffffff" stroke-width="3" stroke-dasharray="0.1 9" stroke-linecap="round"/>
    <ellipse cx="${CX}" cy="${CY + 6}" rx="${RX + 50}" ry="${RY + 24}" fill="none" stroke="${INK}" stroke-width="1.6"/>
    ${md.back}
    ${M.banana(md.x1 - 44, 800, 0.95)}${M.banana(md.x2 + 44, 800, 0.95, true)}
    ${md.front}
    ${M.toran(md.x1 + 10, md.x2 - 10, md.top + 44, 30, 22)}
    ${[md.x1 + 40, md.x1 + 90, md.x2 - 90, md.x2 - 40].map((x, i) => M.marigoldString(x, md.top + 48, 90 + (i % 2) * 40, 5)).join('')}
    <g class="actors">
      <g class="side"></g>
      <g class="behind"></g>
      <g class="priestL"></g>
      ${M.havan(CX, CY + 2, 0.88)}
      <g class="front"></g>
    </g>
    ${diyos}`;

  let groom, bride, cloth, behind, front, priest, elders = [], p = 0, lastRound = -1, svgEl;
  const vows = 7;
  return {
    id: 'pheras', art, vbm: { x: 420, y: 230, w: 760, h: 770 },
    mount(svg) {
      svgEl = svg;
      behind = svg.querySelector('.behind');
      front = svg.querySelector('.front');
      const side = svg.querySelector('.side');
      // families watching from outside the mandap
      elders = [
        put(side, createElder('father'), 250, 806, 0.92, 1), put(side, createElder('mother'), 345, 806, 0.92, 1),
        put(side, createElder('mother', { sari: PAL.pink, sariB: PAL.pinkB }), 1255, 806, 0.92, -1), put(side, createElder('father', { topColor: '#3a3446', topi: 'dhaka' }), 1350, 806, 0.92, -1),
      ];
      namaste(elders[0]); namaste(elders[3]);
      // the purohit, seated cross-legged at the fire
      priest = createPriest();
      put(svg.querySelector('.priestL'), priest, 618, 776, 0.84, 1, false);
      priest.rest = { ...priest.rest, legF: -84, shinF: 150, legB: -80, shinB: 156, footF: 60, footB: 60, lean: 6 };
      priest.lift = 128;
      priest.reach('F', 70, -40, 1, priest.rest); priest.reach('B', 24, -70, 1, priest.rest); priest.reset();
      priest.j.handF.insertAdjacentHTML('beforeend', M.L('M2,16 L30,34', '#7a4a24', 3) + M.C(32, 36, 4, PAL.gold, 1.2));
      groom = createGroom(); bride = createBride();
      shadow(groom); shadow(bride);
      cloth = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      cloth.innerHTML = `<path class="cloth-e" fill="none" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><path class="cloth-c" fill="none" stroke="${PAL.turmeric}" stroke-width="5.2" stroke-linecap="round"/><path class="cloth-d" fill="none" stroke="${PAL.verm}" stroke-width="1.8" stroke-dasharray="3 7" stroke-linecap="round"/>`;
      front.append(cloth, bride.el, groom.el);
      this.lights = [...svg.querySelectorAll('.flame'), ...svg.querySelectorAll('.glow')];
    },
    update(v) { p = v; },
    tick(t) {
      const base = Math.PI / 2 + p * vows * TAU;
      const pos = (fig, th) => {
        const s = Math.sin(th), c = Math.cos(th);
        const x = CX + RX * c, y = CY + RY * s;
        const sc = 0.86 + 0.11 * s;
        fig.sx = -Math.sign(s || 1) * Math.pow(Math.abs(s), 0.3);
        fig.place(x, y, sc, 1);
        const layer = s < -0.12 ? behind : front;
        return layer;
      };
      const dist = p * vows * TAU * 158;
      const lg = pos(groom, base + 0.24);
      const lb = pos(bride, base - 0.24);
      const moving = p > 0.001 && p < 0.999;
      groom.walk(dist / 150, moving ? 0.9 : 0); bride.walk(dist / 150 + 0.5, moving ? 0.9 : 0);
      // hands: groom's back hand holds the ganthbandhan, bride's palms joined
      bride.reach('F', 26, -88, 1); bride.reach('B', 22, -90, 1); bride.apply();
      // keep paint order: behind the fire or in front, and the leader nearest the viewer
      if (lg !== groom.el.parentNode) lg.append(groom.el);
      if (lb !== bride.el.parentNode) lb.append(bride.el);
      const sG = Math.sin(base + 0.24), sB = Math.sin(base - 0.24);
      const nearG = sG > sB;
      if (lg === lb) { if (nearG) lg.append(groom.el); else lg.append(bride.el); }
      // ganthbandhan: groom's patuka to the bride's pallu
      const [ax, ay] = groom.toScene(-15, -8);
      const [bx, by] = bride.toScene(16, -24);
      const mx = (ax + bx) / 2, my = Math.max(ay, by) + 34;
      const d = `M${ax.toFixed(1)},${ay.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`;
      cloth.querySelectorAll('path').forEach((pth) => pth.setAttribute('d', d));
      const cl = (sG + sB) / 2 < -0.12 ? behind : front;
      if (cloth.parentNode !== cl) cl.prepend(cloth); else if (cl.firstChild !== cloth) cl.prepend(cloth);
      cloth.setAttribute('opacity', String(seg(p, 0, 0.02) || (p > 0 ? 1 : 0)));
      // diyos: one more lamp for each completed round
      const round = Math.min(vows, Math.floor(p * vows + 0.02));
      if (round !== lastRound) {
        lastRound = round;
        this.lights.forEach((el) => el.classList.toggle('is-lit', +el.dataset.i < round));
        onRound?.(round, p);
      }
      priest.idle(t, 0.5);
      priest.pose.armF = priest.rest.armF + Math.sin(t * 1.6) * 6; priest.apply();
      for (const e of elders) e.idle(t);
    },
    round: () => lastRound,
  };
}

/* ═════════════════════════ 4 · Sindoor ═════════════════════════ */
export function sindoorScene() {
  const GROUND = 936;
  const art = `
    <rect width="1600" height="1000" fill="#df9f2b"/>
    <rect width="1600" height="1000" fill="url(#ch-kachni)" opacity=".28"/>
    ${M.borderBand(-4, -4, 1608, 30, 'ch-tri')}
    ${M.toran(-10, 1610, 34, 16, 38)}
    ${M.photoBox('sindoor.groom', 176, 236, 240, 290, { border: 18, color: PAL.verm })}
    ${M.photoBox('sindoor.bride', 1184, 236, 240, 290, { border: 18, color: PAL.verm })}
    ${M.bamboo(118, 870, 360, 0.9)}${M.bamboo(1488, 870, 360, 0.9)}
    ${[548, 590, 1010, 1052].map((x, i) => M.marigoldString(x, 40, 170 + (i % 2) * 70, 6)).join('')}
    ${M.fishPair(800, 214, 1.15)}
    ${M.lotus(520, 330, 0.5, PAL.verm, PAL.pink)}${M.lotus(1080, 330, 0.5, PAL.verm, PAL.pink)}
    <rect x="-4" y="870" width="1608" height="134" fill="${PAL.verm}"/>
    <rect x="-4" y="870" width="1608" height="134" fill="url(#ch-floor)"/>
    ${M.borderBand(-4, 860, 1608, 14, 'ch-tri-sm')}
    <g class="actors"></g>
    ${M.kalash(250, 990, 1.1)}${M.kalash(1350, 990, 1.1)}
    ${petals(36, 23, 420, 1180, 0)}`;
  let groom, bride, gm, bm, p = 0;
  // sindoor path ends, in the bride's head-joint space (see figures.js head group)
  const S0 = [14.8, -37.1], S1 = [3.1, -43.3];
  return {
    id: 'sindoor', art, vbm: { x: 470, y: 250, w: 660, h: 750 },
    mount(svg) {
      const a = svg.querySelector('.actors');
      gm = put(a, createElder('mother'), 430, GROUND, 1.3, 1);
      bm = put(a, createElder('mother', { sari: PAL.pink, sariB: PAL.pinkB }), 1170, GROUND, 1.3, -1);
      bride = put(a, createBride({ headTilt: 10 }), 896, GROUND, 1.5, -1);
      groom = put(a, createGroom({ propF: `<circle class="pinch" cx="1.5" cy="20" r="2.8" fill="${PAL.verm}" stroke="${INK}" stroke-width=".7"/>` }), 730, GROUND, 1.5, 1);
      namaste(bride, 26, -86);
      this.svg = svg;
    },
    update(v) { p = v; },
    tick(t) {
      const reach = io(seg(p, 0.04, 0.24));
      const draw = io(seg(p, 0.24, 0.56));
      const away = io(seg(p, 0.6, 0.74));
      const pt = (a) => bride.point('head', lerp(S0[0], S1[0], a), lerp(S0[1], S1[1], a) - 2);
      const [tx, ty] = pt(draw);
      const [rx, ry] = groom.toScene(28, -64);
      let X = lerp(rx, tx, reach), Y = lerp(ry, ty, reach);
      X = lerp(X, rx, away); Y = lerp(Y, ry, away);
      const [bx, by] = groom.toBody(X, Y + 2);
      groom.idle(t, 0.4);
      groom.reach('F', bx - 2, by - 16, 1);
      groom.pose.head = 4 * reach * (1 - away);
      groom.apply();
      bride.idle(t, 0.4);
      bride.pose.head = lerp(10, 2, away);
      bride.apply();
      bride.sindoor.setAttribute('opacity', String(clamp(draw * 1.1)));
      bride.tika.setAttribute('opacity', String(io(seg(p, 0.66, 0.8))));
      const bless = io(seg(p, 0.7, 0.9));
      for (const m of [gm, bm]) {
        m.idle(t);
        const r = {}; m.reach('F', 46, -150, 1, r);
        m.pose.armF = lerp(m.rest.armF, r.armF, bless); m.pose.foreF = lerp(m.rest.foreF, r.foreF, bless);
        m.apply();
      }
      movePetals(this.svg, seg(p, 0.66, 1));
    },
  };
}

/* ═════════════════════════ 5 · Reception ═════════════════════════ */
export function receptionScene() {
  const GROUND = 884;
  const arch = (x, w, top) => `<path d="M${x},800 L${x},${top + w * 0.6} C${x},${top + w * 0.2} ${x + w * 0.3},${top + 40} ${x + w / 2},${top} C${x + w * 0.7},${top + 40} ${x + w},${top + w * 0.2} ${x + w},${top + w * 0.6} L${x + w},800" fill="none" stroke="${PAL.turmeric}" stroke-width="3" opacity=".75"/><path d="M${x + 12},800 L${x + 12},${top + w * 0.6 + 6} C${x + 12},${top + w * 0.24} ${x + w * 0.32},${top + 52} ${x + w / 2},${top + 16} C${x + w * 0.68},${top + 52} ${x + w - 12},${top + w * 0.24} ${x + w - 12},${top + w * 0.6 + 6} L${x + w - 12},800" fill="none" stroke="${PAL.turmeric}" stroke-width="1.2" opacity=".5"/>${M.C(x + w / 2, top - 12, 6, PAL.turmeric, 1.4)}`;
  const art = `
    <rect width="1600" height="1000" fill="#161d3a"/>
    ${stars(17, 70, 0, 1600, 10, 360)}
    ${M.moon(1440, 150, 40)}
    ${arch(250, 330, 250)}${arch(635, 330, 210)}${arch(1020, 330, 250)}
    ${M.tree(110, 820, 0.68, { leaf: '#3f6f33' })}
    <rect x="-4" y="800" width="1608" height="204" fill="#3b1f3a"/>
    <rect x="-4" y="800" width="1608" height="204" fill="url(#ch-floor)" opacity=".8"/>
    ${M.borderBand(-4, 792, 1608, 14, 'ch-tri-sm')}
    <g class="easel">
      ${M.L('M1330,560 L1288,880 M1430,560 L1472,880 M1380,560 L1380,890', INK, 8)}${M.L('M1330,560 L1288,880 M1430,560 L1472,880 M1380,560 L1380,890', '#7a4a24', 5)}
      ${M.photoBox('reception.photo', 1256, 320, 248, 262, { align: 'bottom', border: 18, color: PAL.indigo, pattern: 'ch-dots' })}
    </g>
    ${M.lights(-20, 560, 70, 46, 12)}${M.lights(520, 1090, 46, 52, 12)}${M.lights(1050, 1620, 70, 46, 12)}
    <g class="actors"></g>`;
  let cast = {}, p = 0;
  return {
    id: 'reception', art, vbm: { x: 460, y: 300, w: 680, h: 700 },
    mount(svg) {
      const a = svg.querySelector('.actors');
      cast.dh = put(a, createMusician('dholaki'), 190, GROUND - 10, 0.96, 1);
      cast.jh = put(a, createMusician('jhyali'), 290, GROUND - 10, 0.96, 1);
      cast.g1 = put(a, createGuest(0), 450, GROUND, 1, 1);
      cast.g2 = put(a, createGuest(1), 1090, GROUND, 1, -1);
      cast.g3 = put(a, createGuest(2), 1180, GROUND, 1, -1);
      cast.groom = put(a, createGroom(), 690, GROUND, 1.1, 1);
      cast.bride = put(a, createBride({ mala: true }), 890, GROUND, 1.1, -1);
      this.bulbs = [...svg.querySelectorAll('.bulb')];
    },
    update(v) { p = v; },
    tick(t) {
      const { groom, bride, g1, g2, g3, dh, jh } = cast;
      const e = 0.45 + 0.55 * so(seg(p, 0, 0.5));
      dance(groom, t, 0, e);
      dance(bride, t, Math.PI * 0.85, e);
      // the twirl: scroll spins the bride once around
      const tw = io(seg(p, 0.45, 0.8));
      bride.sx = Math.cos(tw * TAU);
      if (Math.abs(bride.sx) < 0.15) bride.sx = 0.15 * Math.sign(bride.sx || 1);
      groom.x = 690 + 20 * so(seg(p, 0, 0.5)); bride.x = 890 - 20 * so(seg(p, 0, 0.5));
      groom.apply(); bride.apply();
      // guests clap
      for (const [g, ph] of [[g1, 0], [g2, 1.3], [g3, 2.2]]) {
        g.idle(t);
        const c = Math.abs(Math.sin(t * 5 + ph));
        g.reach('F', 30 + 6 * c, -96, 1); g.reach('B', 22 - 4 * c, -98, 1);
        g.pose.bob = -2 * Math.abs(Math.sin(t * 2.5 + ph)); g.apply();
      }
      play(dh, t); play(jh, t + 0.3);
    },
  };
}

/** Each scene's art also needs the motif + figure pattern defs (inserted once by main.js). */
export const SCENES = { titleScene, jantiScene, swayambarScene, pherasScene, sindoorScene, receptionScene };
