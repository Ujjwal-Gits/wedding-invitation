// Smooth scroll that feels native on phones: wheel is smoothed, touch keeps the
// platform's own momentum (fake touch inertia is what makes sites feel cheap).
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isMobile = () => window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;

let current = null;
export const getLenis = () => current;

export function createSmooth() {
  if (reducedMotion()) return null;
  const lenis = (current = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false, wheelMultiplier: 0.9 }));
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  // Refresh only when the width changes; the iOS address bar changes height constantly.
  let w = window.innerWidth;
  let timer;
  window.addEventListener('resize', () => {
    if (window.innerWidth === w) return;
    w = window.innerWidth;
    clearTimeout(timer);
    timer = setTimeout(() => ScrollTrigger.refresh(), 180);
  });
  return lenis;
}

/** Splits a heading into masked lines for a reveal. Headings only, never body copy. */
export function splitLines(el) {
  if (el.dataset.split) return [...el.querySelectorAll('.line__in')];
  el.dataset.split = '1';
  const out = [];
  el.querySelectorAll('.l-en, .l-ne').forEach((span) => {
    const words = span.textContent.split(/(\s+)/);
    span.textContent = '';
    const probe = [];
    words.forEach((w) => {
      const s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      span.append(s);
      probe.push(s);
    });
    // Group words by their rendered line.
    const lines = [];
    let top = null;
    probe.forEach((s) => {
      const t = s.offsetTop;
      if (top === null || Math.abs(t - top) > 4) { lines.push([]); top = t; }
      lines[lines.length - 1].push(s);
    });
    span.textContent = '';
    lines.forEach((ws) => {
      const line = document.createElement('span');
      line.className = 'line';
      const inner = document.createElement('span');
      inner.className = 'line__in';
      inner.textContent = ws.map((x) => x.textContent).join('');
      line.append(inner);
      span.append(line);
      out.push(inner);
    });
  });
  return out;
}
