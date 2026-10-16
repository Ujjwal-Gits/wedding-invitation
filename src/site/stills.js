// The phone-screen still of each design: one chosen frame (the gate, the opened first screen or a body moment,
// whichever is most beautiful), shot at 390x844 @3x (1170x2532) and exported by make-thumbs.mjs as WebP at
// 480 / 800 / 1170 px wide. stills.json: { slug: { kind, w: [480, 800, 1170] } }. Shared by the home page, the
// design pages and their generator (plain module: Node imports it too).

/** `sizes` for each place a still is shown, matching the rendered width of the phone screen. */
export const STILL_SIZES = {
  stage: '(max-width: 437px) calc(64vw - 18px), 262px', // home stage phone: min(280px, 64vw) minus the frame
  thumb: '(max-width: 639px) calc(17vw - 8px), 96px', // home thumbnails: 40% of the card, minus the frame
  gallery: '(max-width: 599px) 60vw, 280px', // design page phone
  related: '(max-width: 599px) calc(58vw - 40px), 240px', // "You may also love" cards
};

/** { src, srcset } for a design's still; `fallback` when the design has none yet. */
export function phoneStill(stills, slug, fallback = '') {
  const s = stills[slug];
  if (!s || !Array.isArray(s.w) || !s.w.length) return { src: fallback, srcset: '' };
  const url = (w) => `/site/stills/${slug}-${w}.webp`;
  return { src: url(s.w[Math.min(1, s.w.length - 1)]), srcset: s.w.map((w) => `${url(w)} ${w}w`).join(', ') };
}
