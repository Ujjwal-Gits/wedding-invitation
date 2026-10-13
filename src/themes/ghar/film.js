// The film: builds the house in the World, and describes every shot as camera
// keyframes on one scroll timeline (units), plus timed beats (title cards,
// subtitles, event cards) and effects (door, lamps, flashes, dips to black).
import { photoUrl, depthUrl, photos } from '../../photos.js';
import { lookYaw, lookPitch } from './world.js';
import credits from '../../generated/credits.json';

const SIZES = Object.fromEntries(credits.filter((k) => k.width && k.height).map((k) => [k.slot, k.width / k.height]));
/** Aspect of a photo reference (library sizes are known; uploads default to portrait 3:4). */
const aspectOf = (ref) => (typeof ref === 'string' && SIZES[ref]) || (ref && ref.w && ref.h ? ref.w / ref.h : 0.75);

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Splits events into the house's rooms. */
export function roomsFor(config, events) {
  const wedding = events.find((e) => e.id === 'wedding') || events.find((e) => e.start === config.weddingDate) || null;
  const wStart = wedding ? new Date(wedding.start).getTime() : new Date(config.weddingDate).getTime();
  const reception = events.find((e) => e.id === 'reception') || null;
  const pre = events.filter((e) => e !== wedding && e !== reception && new Date(e.start).getTime() < wStart);
  const post = events.filter((e) => e !== wedding && e !== reception && !pre.includes(e));
  return { wedding, reception, pre, post: reception ? [reception, ...post] : post };
}

/** Text slot with {hosts} filled in. */
export const fill = (t, config) => ({
  en: String(t.en || '').replaceAll('{hosts}', config.hosts?.en || ''),
  ne: String(t.ne || '').replaceAll('{hosts}', config.hosts?.ne || config.hosts?.en || ''),
});

/**
 * Couple pictures for the hall (slots hall.frame1..6, then hall.bride / hall.groom).
 * A frame is hung when the couple has that many photos, or the studio set the slot.
 */
export function hallPictures(c, S, config) {
  const over = config.themeContent?.ghar?.images || {};
  const n = (c.portraits || []).filter((p) => p && p.photo).length;
  const list = [];
  for (let i = 0; i < 6; i++) {
    const id = `hall.frame${i + 1}`;
    if (i >= n && !over[id]) continue;
    const photo = S.img(id);
    if (photo) list.push({ photo, alt: S.alt(id) || c.portraits?.[i]?.alt || '' });
  }
  if (c.bride?.photo || over['hall.bride']) list.push({ photo: S.img('hall.bride'), alt: c.bride.name?.en || 'The bride', who: c.bride.name });
  if (c.groom?.photo || over['hall.groom']) list.push({ photo: S.img('hall.groom'), alt: c.groom.name?.en || 'The groom', who: c.groom.name });
  return list.filter((p) => p.photo).slice(0, 7);
}

export function buildFilm(world, { config, events, mobile, S }) {
  const size = mobile ? 'sm' : 'lg';
  const c = config.couple;
  const R = roomsFor(config, events);
  const hall = hallPictures(c, S, config);
  const T_ = (id) => fill(S.txt(id), config);
  const BRICK = photoUrl(S.img('texture.brick'), 'lg');
  const POST = photoUrl(S.img('texture.post'), 'lg');
  const story = config.story || [];
  const loads = { A: [], B: [], C: [], D: [] };

  const brickTex = world.tex(BRICK, { repeat: true });
  const mats = brickTex.then((map) => ({
    brick: world.arch('box', { map, scale: [1.47, 0.82], color: [0.9, 0.82, 0.8] }),
    floor: world.arch('box', { map, scale: [1.47, 0.82], color: [0.62, 0.52, 0.5] }),
  }));
  const plaster = world.arch('plaster');
  const wood = world.arch('wood', { color: [0.11, 0.05, 0.025], scale: [1.2, 1.2] });
  const add = (k, p) => { loads[k].push(p); return p; };
  add('A', mats);

  /* ════════════ SET A: facade, passage, courtyard, upper hall ════════════ */
  const DOOR = S.img('threshold.door');
  // Measured opening for library doors; other photos open from the centre of the lower half.
  const dRect = (typeof DOOR === 'string' && photos[DOOR]?.door) || { x: 0.33, y: 0.47, w: 0.34, h: 0.4 };
  const doorSrc = photoUrl(DOOR, size);
  let leafList = [];
  const facade = add('A', Promise.all([world.tex(doorSrc), mats]).then(async ([map, { brick, floor }]) => {
    const AR1 = map.image.width / map.image.height;
    // The door is about 1.8 m tall, but never wider than the passage behind it.
    const H1 = Math.min(1.8 / dRect.h, 1.1 / (dRect.w * AR1));
    const doorH = dRect.h * H1;
    const W1 = H1 * AR1;
    const cx1 = -((dRect.x + dRect.w / 2) - 0.5) * W1; // centre the door on x = 0
    const bottom1 = 0.15 - (1 - dRect.y - dRect.h) * H1;
    const dw = dRect.w * W1;
    await world.photo('front', {
      src: doorSrc, h: H1, at: [cx1, bottom1 + H1 / 2, 0], night: 1, exposure: 1.15,
      pools: [[dRect.x + dRect.w / 2, dRect.y + dRect.h * 0.75, 0.16, 0.9], [0.5, Math.max(0.1, dRect.y - 0.1), 0.17, 0.35], [0.5, 0.94, 0.22, 0.7]],
      feather: [0.07, 0.07, 0.0, 0.16], cut: [dRect.x, dRect.y, dRect.x + dRect.w, dRect.y + dRect.h],
    });
    const top = H1 + bottom1;
    world.box('front', [-8, 0, -0.02], [-0.62, top, -0.42], brick);
    world.box('front', [0.62, 0, -0.02], [8, top, -0.42], brick);
    world.box('front', [-0.62, 0.15 + doorH + 0.01, -0.02], [0.62, top, -0.42], brick);
    // Door leaves cut from the same photograph, hinged at the jambs.
    const mk = (side) => {
      const face = world.arch('map', { map, uvRect: [dRect.x + (side < 0 ? 0 : dRect.w / 2), 1 - dRect.y - dRect.h, dRect.w / 2, dRect.h], color: [0.9, 0.85, 0.8] });
      return world.leaf('front', { face, edge: wood, w: dw / 2, h: doorH, hingeX: side < 0 ? -dw / 2 : dw / 2, side, y0: 0.15 });
    };
    leafList = [mk(-1), mk(1)];
    world.box('front', [-8, -0.3, 13], [8, 0, 0], floor);
    world.box('front', [-0.62, -0.3, 0], [0.62, 0.0, -3.5], floor);
  }));
  mats.then(({ brick, floor }) => {
    // courtyard
    world.box('chowk', [-4.5, -0.3, -3.2], [4.5, 0, -14], floor);
    world.wall('chowk', { axis: 'x', from: -4.5, to: 4.5, at: -3.2, thick: 0.3, y1: 7.8, openings: [{ s0: -0.62, s1: 0.62, y0: 0, y1: 2.15 }] }, brick);
    world.wall('chowk', { axis: 'z', from: -14, to: -3.2, at: -4.5, thick: 0.3, y1: 7.8 }, brick);
    world.wall('chowk', { axis: 'z', from: -14, to: -3.2, at: 4.2, thick: 0.3, y1: 7.8, openings: [{ s0: -6.2, s1: -5.0, y0: 0, y1: 2.1 }] }, brick);
  });
  // passage behind the door: plaster, low wooden ceiling, a lamp that wakes as the door opens
  const plasterDim = world.arch('plaster', { color: [0.62, 0.6, 0.62] });
  world.box('front', [-0.92, 0, 0], [-0.62, 2.15, -3.5], plasterDim);
  world.box('front', [0.62, 0, 0], [0.92, 2.15, -3.5], plasterDim);
  world.box('front', [-0.92, 2.15, 0], [0.92, 2.4, -3.5], wood);
  for (let z = -0.4; z > -3.4; z -= 0.55) world.box('front', [-0.62, 2.04, z], [0.62, 2.15, z - 0.1], wood);
  const passageLamp = world.lamp('front', { at: [0, 1.82, -1.9], kind: 'hang', power: 0.85, lit: 0.12 });
  [[-0.78, 0.36], [-0.6, 0.48], [0.6, 0.48], [0.78, 0.36]].forEach(([x, z]) => world.lamp('front', { at: [x, 0, z], power: 0.9 }));

  // Courtyard vista: Keshav Narayan Chowk, day for night with lamplit pools.
  add('A', world.photo('chowk', {
    src: photoUrl(S.img('courtyard.view'), size), depth: depthUrl(S.img('courtyard.view')), h: 10, at: [0, 2.6, -13.2], scale: 0.12, night: 1, exposure: 1.25,
    pools: [[0.55, 0.62, 0.11, 1.3], [0.22, 0.62, 0.07, 0.8], [0.84, 0.6, 0.07, 0.8]], feather: [0.05, 0.05, 0.0, 0.3],
  }));
  for (let z = -4.3; z > -12.4; z -= 0.75) {
    world.lamp('chowk', { at: [-1.5, 0, z], power: 0.8 });
    world.lamp('chowk', { at: [1.5, 0, z], power: 0.8 });
  }
  world.lamp('chowk', { at: [3.95, 2.35, -5.6], kind: 'sconce', power: 1.6 });

  // Upper hall (मातँ): lime plaster with a red-clay dado, carved posts, joists, portraits.
  const n = Math.max(1, hall.length);
  const zf = (i) => -5.6 - i * 2.6;
  const zLast = zf(n - 1);
  const zEnd = zLast - 2.6;
  const HX = 9.6; // picture wall
  mats.then(({ floor }) => world.box('hall', [4.5, -0.3, -3.3], [9.9, 0, zEnd - 0.3], floor));
  world.wall('hall', { axis: 'z', from: zEnd, to: -3.3, at: 4.5, thick: 0.1, y1: 2.75, openings: [{ s0: -6.2, s1: -5.0, y0: 0, y1: 2.1 }] }, plaster);
  world.wall('hall', { axis: 'z', from: zEnd, to: -3.3, at: HX, thick: 0.3, y1: 2.75 }, plaster);
  world.box('hall', [4.5, 0, -3.3], [9.9, 2.75, -3.6], plaster);
  world.wall('hall', { axis: 'x', from: 4.5, to: 9.9, at: zEnd, thick: 0.3, y1: 2.75, openings: [{ s0: 6.0, s1: 7.8, y0: 0, y1: 2.4 }] }, plaster);
  world.box('hall', [4.5, 2.75, -3.3], [9.9, 2.95, zEnd - 0.3], wood);
  for (let z = -3.9; z > zEnd; z -= 0.5) world.box('hall', [4.6, 2.6, z], [9.6, 2.75, z - 0.12], wood);
  world.box('hall', [6.18, 2.46, -3.6], [6.42, 2.6, zEnd], wood);
  const posts = [];
  for (let i = -1; i < n; i++) posts.push(zf(i) - 1.35);
  posts.forEach((z) => add('A', world.post('hall', { at: [6.3, 0, z], h: 2.46, w: 0.2, src: POST })));
  hall.forEach((p, i) => {
    const hero = i === 0;
    add('A', world.frame('hall', { src: photoUrl(p.photo, 'sm'), at: [HX, hero ? 1.5 : 1.45, zf(i)], yaw: -90, h: hero ? 1.6 : 1.3, maxW: hero ? 2.2 : 1.8 }));
    world.lamp('hall', { at: [HX - 0.35, 2.4, zf(i)], kind: 'sconce', power: 2.8 });
    world.lamp('hall', { at: [HX - 1.5, 1.7, zf(i)], kind: 'fill', power: 1.6, color: [1.0, 0.7, 0.42] });
  });
  posts.forEach((z) => world.lamp('hall', { at: [6.55, 0, z + 0.2], power: 0.7 }));
  // through the end door: the Patan Museum corridor
  add('A', world.photo('hall', {
    src: photoUrl(S.img('hall.corridor'), 'sm'), depth: depthUrl(S.img('hall.corridor')), h: 3.2, at: [6.9, 1.76, zEnd - 0.95], scale: 0.2,
    night: 0.2, exposure: 0.85, feather: [0.03, 0.03, 0.02, 0.03],
  }));

  /* ════════════ SET B: तिकिझ्याः, the lattice window (pre-wedding) ════════════ */
  const XB = 100;
  const preFrames = R.pre.length ? R.pre.map((e) => ({ photo: e.photo, event: e })) : hall.slice(1, 3).map((p) => ({ photo: p.photo }));
  const zB = (k) => -2.4 - Math.floor(k / 2) * 2.6;
  const zBPhoto = Math.min(-7, zB(Math.max(0, preFrames.length - 1)) - 3.6);
  mats.then(({ brick, floor }) => {
    world.box('lattice', [XB - 2.8, -0.3, 1.5], [XB + 2.8, 0, zBPhoto - 0.3], floor);
    world.wall('lattice', { axis: 'z', from: zBPhoto, to: 1.5, at: XB - 2.8, thick: 0.3, y1: 3.0 }, brick);
    world.wall('lattice', { axis: 'z', from: zBPhoto, to: 1.5, at: XB + 2.5, thick: 0.3, y1: 3.0 }, brick);
    world.box('lattice', [XB - 2.8, 0, zBPhoto + 0.02], [XB - 1.0, 3.0, zBPhoto - 0.3], brick);
    world.box('lattice', [XB + 1.0, 0, zBPhoto + 0.02], [XB + 2.8, 3.0, zBPhoto - 0.3], brick);
  });
  world.box('lattice', [XB - 2.8, 3.0, 1.5], [XB + 2.8, 3.2, zBPhoto - 0.3], wood);
  for (let z = 1.0; z > zBPhoto; z -= 0.5) world.box('lattice', [XB - 2.5, 2.86, z], [XB + 2.5, 3.0, z - 0.12], wood);
  add('B', world.photo('lattice', {
    src: photoUrl(S.img('lattice.window'), size), h: 3.6, at: [XB, 1.2, zBPhoto], night: 0, exposure: 1.0,
    feather: [0.1, 0.1, 0.0, 0.08],
  }));
  preFrames.forEach((f, k) => {
    const left = k % 2 === 0;
    const x = left ? XB - 2.5 : XB + 2.5;
    add('B', world.frame('lattice', { src: photoUrl(f.photo, 'sm'), at: [x, 1.5, zB(k)], yaw: left ? 90 : -90, h: 1.25, maxW: 1.7 }));
    world.lamp('lattice', { at: [left ? x + 0.3 : x - 0.3, 2.35, zB(k)], kind: 'sconce', power: 2.0 });
    world.lamp('lattice', { at: [left ? x + 1.4 : x - 1.4, 1.6, zB(k)], kind: 'fill', power: 1.0, color: [1.0, 0.7, 0.42] });
  });
  world.lamp('lattice', { at: [XB - 0.35, 0, zBPhoto + 0.6], power: 0.9 });
  world.lamp('lattice', { at: [XB + 0.35, 0, zBPhoto + 0.6], power: 0.9 });

  /* ════════════ SET C: सँझ्याः, the great window (wedding day, saptapadi) ════════════ */
  const XC = 200;
  const ZC = -6.0;
  const vows = (config.saptapadi || []).slice(0, 7);
  mats.then(({ brick, floor }) => {
    world.box('window', [XC - 2.8, -0.3, 2.4], [XC + 2.8, 0, ZC - 0.3], floor);
    world.box('window', [XC - 1.62, 0, -4.48], [XC + 1.62, 0.62, -4.92], brick);
  });
  world.wall('window', { axis: 'z', from: ZC, to: 2.4, at: XC - 2.8, thick: 0.3, y1: 3.0 }, plaster);
  world.wall('window', { axis: 'z', from: ZC, to: 2.4, at: XC + 2.5, thick: 0.3, y1: 3.0 }, plaster);
  world.box('window', [XC - 2.8, 0, ZC + 0.02], [XC - 1.45, 3.0, ZC - 0.3], plaster);
  world.box('window', [XC + 1.45, 0, ZC + 0.02], [XC + 2.8, 3.0, ZC - 0.3], plaster);
  world.box('window', [XC - 2.8, 3.0, 2.4], [XC + 2.8, 3.2, ZC - 0.3], wood);
  for (let z = 2.0; z > ZC; z -= 0.5) world.box('window', [XC - 2.5, 2.86, z], [XC + 2.5, 3.0, z - 0.12], wood);
  add('C', world.photo('window', {
    src: photoUrl(S.img('window.view'), size), depth: depthUrl(S.img('window.view')), h: 4.0, at: [XC, 1.83, ZC], scale: 0.06,
    night: 0.0, exposure: 0.95, feather: [0.06, 0.06, 0.0, 0.06],
  }));
  const vowLamps = vows.map((_, i) => world.lamp('window', { at: [XC - 1.35 + i * 0.45, 0.62, -4.7], power: 0.85, lit: 0 }));
  const wPhoto = R.wedding?.photo || S.img('hall.frame1');
  const cPhoto = S.img('window.couple') || wPhoto;
  add('C', world.frame('window', { src: photoUrl(wPhoto, 'sm'), at: [XC - 2.5, 1.5, -2.2], yaw: 90, h: 1.25, maxW: 1.8 }));
  add('C', world.frame('window', { src: photoUrl(cPhoto, 'sm'), at: [XC + 2.5, 1.5, -2.2], yaw: -90, h: 1.35, maxW: 1.8 }));
  world.lamp('window', { at: [XC - 2.2, 2.35, -2.2], kind: 'sconce', power: 2.0 });
  world.lamp('window', { at: [XC + 2.2, 2.35, -2.2], kind: 'sconce', power: 2.0 });

  /* ════════════ SET D: कौसी, the rooftop at night (reception) ════════════ */
  const XD = 300;
  mats.then(({ brick, floor }) => {
    world.box('roof', [XD - 9, -0.3, 4], [XD + 9, 0, -3.0], floor);
    world.box('roof', [XD - 9, 0, -3.0], [XD + 9, 0.8, -3.35], brick);
  });
  for (let x = XD - 6.3; x <= XD + 6.3; x += 0.7) world.lamp('roof', { at: [x, 0.8, -3.17], power: 0.75 });
  add('D', world.photo('roof', {
    src: photoUrl(S.img('rooftop.view'), size), h: 26, at: [XD, 0.1, -30],
    night: 0, exposure: 1.0, sat: 0.72, tint: [0.8, 0.88, 1.14], feather: [0.05, 0.05, 0.0, 0.22],
  }));

  /* ════════════ the shots ════════════ */
  // key: [t, [x,y,z], yaw, pitch] ; portrait override via `m: [[x,y,z], yaw, pitch]`
  const shots = [];
  const beats = [];
  const chapters = [];
  let T = 0;
  const K = (t, p, yaw = 0, pitch = 0, m) => ({ t, p, yaw, pitch, m });
  const at = (p, target) => [lookYaw(p, target), lookPitch(p, target)];
  const beat = (t0, t1, b) => beats.push({ t0, t1, ...b });
  const chapter = (t, num, id) => { const x = S.txt(id); chapters.push({ t, ne: x.ne, en: x.en }); beat(t, t + 1.25, { kind: 'title', num, ne: x.ne, en: x.en }); };

  // ── Shot A: the long take ──
  const A = { id: 'A', sets: ['front', 'chowk', 'hall'], keys: [], ambient: [0.026, 0.03, 0.042], fog: 0.03 };
  A.keys.push(
    K(0, [0, 1.75, 9.2], 0, 4, [[0, 2.15, 7.4], 0, 5]),
    K(1.7, [0.32, 1.7, 6.6], -1.5, 3, [[0.2, 1.9, 5.8], -1, 3]),
    K(3.0, [0.06, 1.63, 3.7], 0, 2, [[0.05, 1.7, 3.9], 0, 2]),
    K(4.5, [0, 1.6, 2.5], 0, 0, [[0, 1.62, 2.7], 0, 0]),
    K(5.5, [0, 1.42, 0.0], 0, -2),
    K(6.5, [0, 1.6, -2.5], 0, 3),
    K(7.5, [0, 1.62, -4.3], 0, 7, [[0, 1.62, -4.0], 0, 9]),
    K(9.1, [0.15, 1.62, -5.0], -4, 5, [[0.1, 1.62, -4.7], -3, 8]),
    K(10.0, [1.4, 1.6, -5.5], -62, 1),
    K(10.8, [3.4, 1.6, -5.6], -90, 0),
  );
  chapter(0.25, '01', 'ch1.title');
  beat(1.55, 3.0, { kind: 'sub', text: T_('threshold.welcome') });
  beat(4.3, 5.6, { kind: 'sub', text: T_('threshold.bow') });
  chapter(6.25, '02', 'ch2.title');
  beat(7.55, 9.5, { kind: 'names' });
  chapter(10.5, '03', 'ch3.title');
  T = 11.6;
  // On a phone the camera steps closer, just far enough for each picture to fill the width.
  const phoneX = (p, i) => {
    const h = i === 0 ? 1.6 : 1.3;
    const fw = Math.min(h * aspectOf(p.photo), i === 0 ? 2.2 : 1.8) + 0.2;
    const x = Math.min(8.4, Math.max(4.9, HX - fw / 0.5));
    return x > 5.9 ? Math.max(x, 6.85) : Math.min(x, 5.6); // never stand inside the row of posts (x 6.0 to 6.6)
  };
  const phoneMid = (a, b) => (a > 6.6 && b > 6.6 ? Math.max((a + b) / 2, 6.9) : 5.2);
  hall.forEach((p, i) => {
    const pos = [5.0, 1.6, zf(i)];
    const mx = phoneX(p, i);
    const m = [[mx, 1.5, zf(i)], -90, 0];
    if (i > 0) A.keys.push(K(T - 0.45, [5.0, 1.6, (zf(i) + zf(i - 1)) / 2], -90, 0, [[phoneMid(mx, phoneX(hall[i - 1], i - 1)), 1.52, (zf(i) + zf(i - 1)) / 2], -90, 0]));
    A.keys.push(K(T, pos, -90, 0, m), K(T + 0.55, [5.0, 1.6, zf(i) - 0.12], -90, 0, [[mx, 1.5, zf(i) - 0.1], -90, 0]));
    const s = story[i];
    if (p.who) beat(T - 0.2, T + 0.95, { kind: 'sub', text: p.who });
    else if (s) beat(T - 0.25, T + 0.95, { kind: 'sub', text: s.text, year: s.year });
    T += 1.3;
  });
  // any story lines left over play over the last picture
  for (let i = hall.length; i < story.length; i++) { beat(T - 0.5, T + 0.6, { kind: 'sub', text: story[i].text, year: story[i].year }); T += 1.1; }
  A.keys.push(
    K(T + 0.3, [6.1, 1.6, zLast - 1.3], -32, 0),
    K(T + 1.2, [6.9, 1.6, zEnd + 1.7], 0, 0, [[6.9, 1.6, zEnd + 2.4], 0, 0]),
    K(T + 2.7, [6.9, 1.6, zEnd - 0.12], 0, 0),
  );
  T += 2.7;
  A.t1 = T;
  shots.push(A);

  // ── Shot B: tikijhyah ──
  const B = { id: 'B', sets: ['lattice'], keys: [], t0: T, ambient: [0.012, 0.014, 0.024], fog: 0.04 };
  B.keys.push(K(T, [XB, 1.62, 1.1], 0, 1), K(T + 1.6, [XB, 1.6, 0.3], 0, 1));
  chapter(T + 0.95, '04', 'ch4.title');
  T += 1.6;
  beat(T + 0.1, T + 1.1, { kind: 'sub', text: T_('lattice.line') });
  preFrames.forEach((f, k) => {
    const left = k % 2 === 0;
    const fp = [left ? XB - 2.5 : XB + 2.5, 1.5, zB(k)];
    const cp = [left ? XB + 0.3 : XB - 0.3, 1.6, zB(k) + 1.3];
    const cpm = [left ? XB + 0.75 : XB - 0.75, 1.58, zB(k) + 0.2];
    const aim = [fp[0], fp[1], fp[2] - 1.15];
    const [y, p] = at(cp, aim);
    const [ym, pm] = at(cpm, fp);
    B.keys.push(K(T + 0.9, cp, y, p, [cpm, ym, pm]), K(T + 1.9, [cp[0], cp[1], cp[2] - 0.15], y, p, [[cpm[0], cpm[1], cpm[2] - 0.12], ym, pm]));
    if (f.event) beat(T + 0.75, T + 2.15, { kind: 'event', event: f.event, side: left ? 'right' : 'left' });
    T += 2.1;
  });
  B.keys.push(K(T + 0.8, [XB, 1.6, zBPhoto + 4.2], 0, 1), K(T + 2.4, [XB, 1.68, zBPhoto + 0.75], 0, 3));
  T += 2.4;
  B.t1 = T;
  shots.push(B);

  // ── Shot C: sanjhyah ──
  const C = { id: 'C', sets: ['window'], keys: [], t0: T, ambient: [0.02, 0.022, 0.034], fog: 0.03 };
  const wf = [XC - 2.5, 1.5, -2.2];
  const cf = [XC + 2.5, 1.5, -2.2];
  const c0 = [XC + 0.4, 1.6, 0.9];
  const c0m = [XC + 1.25, 1.55, -2.2];
  const wfa = [wf[0], wf[1], wf[2] - 0.55];
  const cfa = [cf[0], cf[1], cf[2] - 1.2];
  C.keys.push(K(T, [XC + 0.2, 1.62, 1.8], ...at([XC + 0.2, 1.62, 1.8], wfa), [[XC + 0.6, 1.6, -1.2], ...at([XC + 0.6, 1.6, -1.2], wf)]));
  chapter(T + 0.3, '05', 'ch5.title');
  C.keys.push(K(T + 1.1, c0, ...at(c0, wfa), [c0m, ...at(c0m, wf)]), K(T + 2.4, [c0[0], c0[1], c0[2] - 0.2], ...at([c0[0], c0[1], c0[2] - 0.2], wfa), [[c0m[0], c0m[1], c0m[2] - 0.1], ...at([c0m[0], c0m[1], c0m[2] - 0.1], wf)]));
  if (R.wedding) beat(T + 1.0, T + 2.6, { kind: 'event', event: R.wedding, side: 'right' });
  T += 2.4;
  const c1 = [XC - 0.4, 1.6, 0.7];
  const c1m = [XC - 1.25, 1.55, -2.2];
  C.keys.push(K(T + 1.0, c1, ...at(c1, cfa), [c1m, ...at(c1m, cf)]), K(T + 2.0, [c1[0], c1[1], c1[2] - 0.2], ...at([c1[0], c1[1], c1[2] - 0.2], cfa), [[c1m[0], c1m[1], c1m[2] - 0.1], ...at([c1m[0], c1m[1], c1m[2] - 0.1], cf)]));
  beat(T + 0.9, T + 2.1, { kind: 'sub', text: T_('window.line') });
  T += 2.0;
  // the seven steps: a lamp is lit for each vow
  C.keys.push(K(T + 1.0, [XC - 1.4, 1.32, -2.9], 10, -16, [[XC - 1.05, 1.32, -2.55], 6, -18]));
  beat(T + 0.6, T + 1.5, { kind: 'sub', text: T_('window.vows') });
  T += 1.4;
  const vowT = [];
  vows.forEach((v, i) => {
    const x = XC - 1.35 + i * 0.45;
    vowT.push(T + 0.1);
    C.keys.push(K(T + 0.45, [x, 1.32, -2.9], 6 - i * 2, -16, [[x, 1.32, -2.55], 4 - i * 1.5, -18]));
    beat(T + 0.05, T + 0.85, { kind: 'vow', n: i + 1, text: v });
    T += 0.85;
  });
  C.keys.push(K(T + 0.9, [XC, 1.72, -3.6], 0, 3), K(T + 1.9, [XC, 1.75, -4.4], 0, 3));
  T += 1.9;
  C.t1 = T;
  shots.push(C);

  // ── Shot D: kausi ──
  const D = { id: 'D', sets: ['roof'], keys: [], t0: T, ambient: [0.035, 0.04, 0.075], fog: 0.004 };
  D.keys.push(K(T, [XD - 3.4, 1.9, 2.0], 11, -4, [[XD - 2.4, 1.9, 2.4], 8, -4]));
  chapter(T + 0.35, '06', 'ch6.title');
  const recs = R.post;
  const span = Math.max(2.6, recs.length * 1.6 + 1.0);
  D.keys.push(K(T + span, [XD + 3.4, 1.9, 1.4], -9, -4, [[XD + 2.4, 1.9, 1.8], -7, -4]));
  recs.forEach((e, k) => beat(T + 1.0 + k * 1.6, T + 2.5 + k * 1.6, { kind: 'event', event: e, side: 'left' }));
  T += span;
  D.keys.push(K(T + 1.4, [XD, 1.85, -0.6], 0, -2));
  if (config.closing?.en || config.closing?.ne) beat(T + 0.6, T + 1.9, { kind: 'sub', text: config.closing });
  T += 1.4;
  D.keys.push(K(T + 1.6, [XD, 1.85, -1.9], 0, 7));
  beat(T + 0.3, T + 2.4, { kind: 'end' });
  T += 2.4;
  D.keys.push(K(T, [XD, 1.86, -2.1], 0, 9));
  D.t1 = T;
  shots.push(D);
  chapters.push({ t: T, ne: 'जवाफ', en: 'Reply' });

  const total = T;
  A.t0 = 0;

  /* ════════════ sampling ════════════ */
  const portraitOf = (k) => (k.m ? { p: k.m[0], yaw: k.m[1], pitch: k.m[2] } : k);
  // Monotone cubic Hermite (Fritsch–Carlson): smooth moves, no overshoot, holds stay still.
  const tangent = (ks, i, get) => {
    if (i <= 0 || i >= ks.length - 1) return 0;
    const dp = (get(ks[i]) - get(ks[i - 1])) / Math.max(1e-6, ks[i].t - ks[i - 1].t);
    const dn = (get(ks[i + 1]) - get(ks[i])) / Math.max(1e-6, ks[i + 1].t - ks[i].t);
    if (dp * dn <= 0) return 0;
    return 2 / (1 / dp + 1 / dn);
  };
  const herm = (ks, i, get, u) => {
    const k1 = ks[i], k2 = ks[i + 1];
    const h = k2.t - k1.t;
    const u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * get(k1) + (u3 - 2 * u2 + u) * h * tangent(ks, i, get)
      + (-2 * u3 + 3 * u2) * get(k2) + (u3 - u2) * h * tangent(ks, i + 1, get);
  };
  const cache = new Map();
  const keysFor = (s, portrait) => {
    const id = `${s.id}${portrait ? 'p' : 'l'}`;
    if (!cache.has(id)) cache.set(id, s.keys.map((k) => (portrait ? { t: k.t, ...portraitOf(k) } : k)));
    return cache.get(id);
  };
  const GET = [(k) => k.p[0], (k) => k.p[1], (k) => k.p[2], (k) => k.yaw, (k) => k.pitch];
  const sampleShot = (s, t, portrait) => {
    const ks = keysFor(s, portrait);
    if (t <= ks[0].t) return ks[0];
    const last = ks[ks.length - 1];
    if (t >= last.t) return last;
    let i = 0;
    while (i < ks.length - 2 && t > ks[i + 1].t) i++;
    const u = (t - ks[i].t) / Math.max(1e-6, ks[i + 1].t - ks[i].t);
    const v = GET.map((g) => herm(ks, i, g, u));
    return { p: [v[0], v[1], v[2]], yaw: v[3], pitch: v[4] };
  };
  shots.forEach((s, i) => { s.t0 = s.t0 ?? 0; s.t1 = s.t1 ?? (shots[i + 1]?.t0 ?? total); });

  let lastShot = null;
  let bobPhase = 0;
  let prevP = null;
  /** Applies the film state at time t to the world. */
  function apply(t, { portrait }) {
    const s = shots.find((x) => t < x.t1) || shots[shots.length - 1];
    if (s !== lastShot) {
      world.showSets(s.sets);
      world.U.uAmbient.value.setRGB(...s.ambient);
      world.U.uFogDensity.value = s.fog;
      lastShot = s;
      prevP = null;
    }
    const st = sampleShot(s, t, portrait);
    // walking bob: only for forward motion
    const yawR = (st.yaw * Math.PI) / 180;
    if (prevP) {
      const dx = st.p[0] - prevP[0], dz = st.p[2] - prevP[2];
      const fwd = -Math.sin(yawR) * dx - Math.cos(yawR) * dz;
      bobPhase += Math.abs(fwd) * (Math.PI * 2) / 1.5;
    }
    prevP = st.p;
    const bob = Math.sin(bobPhase) * 0.018;
    if (s.id === 'A') {
      // indoors (the hall) the moonlight falls away and the lamps carry the room
      const k = smooth(3.6, 5.2, st.p[0]);
      world.U.uAmbient.value.setRGB(...s.ambient.map((v, j) => v * (1 - k) + [0.011, 0.012, 0.016][j] * k));
    }
    const cam = world.cam;
    cam.p.set(st.p[0], st.p[1] + bob, st.p[2]);
    cam.yaw = st.yaw;
    cam.pitch = st.pitch;
    cam.roll = Math.sin(bobPhase * 0.5) * 0.25;
    cam.fov = portrait ? 64 : 40;

    // door
    const open = smooth(3.0, 4.6, t);
    leafList.forEach((l) => l.open(open));
    passageLamp.lit = 0.12 + 0.88 * open;
    // the seven lamps
    vowLamps.forEach((l, i) => { l.lit = smooth(vowT[i], vowT[i] + 0.25, t); });
    // cuts: A→B warm flash, B→C warm flash, C→D dip to black, end fade
    let flash = 0;
    let fade = 0;
    const around = (tc, a, b) => (t < tc ? smooth(tc - a, tc, t) : 1 - smooth(tc, tc + b, t));
    flash = Math.max(around(A.t1, 0.9, 0.8), around(B.t1, 0.9, 0.8));
    fade = Math.max(around(C.t1, 0.6, 0.7), smooth(total - 1.2, total, t));
    world.fx.flash = flash;
    world.fx.fade = fade;
  }

  return {
    total, shots, beats, chapters, apply, loads,
    first: Promise.all([...loads.A.slice(0, 4)]),
    all: () => Promise.all([...loads.A, ...loads.B, ...loads.C, ...loads.D]),
  };
}
