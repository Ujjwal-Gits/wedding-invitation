// Scroll-scrubbed walk through a sequence of PhotoViews. Each "room" dollies its
// camera toward the focal point, shows its copy blocks in turn, then opens a
// portal into the next room. Optionally starts with a DoorView.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * @param rooms [{ id, span, blocks: [blockName], last?, p0?, p1?, onBlock? }]
 * @param door  optional { view: DoorView, span }
 */
export function buildTour({ stage, rooms, door = null, trigger, pin, mobile, onChapter, onTime, canDrive, unit = mobile ? 0.55 : 0.62 }) {
  const tl = gsap.timeline({ defaults: { ease: 'none' }, paused: true });
  const block = (name) => document.querySelector(`[data-block="${name}"]`);
  gsap.set('[data-block]', { autoAlpha: 0 });

  const segStarts = [];
  const blockTimes = {};
  let t = 0;
  if (door) {
    segStarts.push(0);
    t = door.span;
  }
  rooms.forEach((r) => {
    segStarts.push(t);
    const usable = r.span - (r.last ? 0.6 : 1.7);
    const each = usable / Math.max(1, r.blocks.length);
    r.blocks.forEach((b, k) => {
      const el = block(b);
      if (!el) return;
      const at = t + (r.first && k === 0 ? 0 : 0.45) + k * each;
      const len = each - 0.6;
      blockTimes[b] = { at, len };
      if (r.first && k === 0) gsap.set(el, { autoAlpha: 1 });
      else tl.fromTo(el, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' }, at);
      if (!(r.last && k === r.blocks.length - 1)) tl.to(el, { autoAlpha: 0, y: -18, duration: 0.4, ease: 'power2.in' }, at + len);
    });
    t += r.span;
  });
  const total = t;
  tl.to({}, { duration: 0.001 }, total);

  const camera = () => {
    if (canDrive && !canDrive()) return;
    const now = tl.time();
    if (door && now < door.span) {
      const v = door.view;
      v.progress = Math.min(1, now / (door.span - 0.2));
      return v.progress >= 1 ? stage.set({ a: rooms[0].id, pa: rooms[0].p0 ?? 0.12 }) : stage.set({ a: v.id, pa: v.progress });
    }
    let start = door ? door.span : 0;
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      const end = start + r.span;
      if (now < end || r.last || i === rooms.length - 1) {
        const local = Math.min(1, Math.max(0, (now - start) / r.span));
        const p0 = r.p0 ?? 0.04;
        const p1 = r.p1 ?? 0.86;
        const pa = p0 + (p1 - p0) * local;
        const tStart = end - 1.1;
        if (!r.last && rooms[i + 1] && now > tStart) {
          const mix = Math.min(1, (now - tStart) / 1.1);
          const n = rooms[i + 1];
          return stage.set({ a: r.id, pa, b: n.id, pb: (n.p0 ?? 0.04) * mix, mix, mode: r.mode ?? 0, center: [0.5, 0.5] });
        }
        return stage.set({ a: r.id, pa });
      }
      start = end;
    }
  };

  let chapter = -1;
  tl.eventCallback('onUpdate', () => {
    camera();
    const idx = Math.max(0, segStarts.filter((s) => tl.time() >= s - 0.3).length - 1);
    if (idx !== chapter) { chapter = idx; onChapter?.(idx); }
    onTime?.(tl.time(), blockTimes);
  });

  const st = ScrollTrigger.create({
    trigger, start: 'top top', end: () => `+=${Math.round(total * window.innerHeight * unit)}`,
    pin, scrub: mobile ? 0.6 : 0.9, animation: tl, anticipatePin: 1,
  });
  camera();
  onChapter?.(0);

  const positionOf = (i) => {
    const at = segStarts[i] + (i === 0 ? 0 : 1.1);
    return st.start + (at / total) * (st.end - st.start);
  };
  return { tl, st, total, segStarts, blockTimes, positionOf };
}
