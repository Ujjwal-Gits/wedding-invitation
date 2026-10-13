// Photo references. A reference is either:
//   - a library slug (string), e.g. 'door-golden' → /photos/door-golden-lg.webp (+ depth map)
//   - an uploaded photo object from the studio: { lg, sm, depth?, alt?, focal? }
//   - an absolute URL string starting with '/' or 'https://'
// Focal points for library photos come from art-src/photos/credits.json.
import credits from './generated/credits.json';
import depthList from './generated/depth.json';

const fromCredits = Object.fromEntries(
  credits.filter((c) => c.focal_x != null).map((c) => [c.file.replace(/\.jpe?g$/i, ''), { focal: [c.focal_x, c.focal_y] }]),
);

const overrides = {
  'door-golden': { door: { x: 0.355, y: 0.485, w: 0.24, h: 0.33 } },
  'door-newari': { door: { x: 0.398, y: 0.508, w: 0.243, h: 0.34 } },
  sindoor: { focal: [0.5, 0.49], scale: 0.3 },
  ganesh: { focal: [0.42, 0.39], scale: 0.35 },
  'marigold-macro': { focal: [0.5, 0.5], scale: 0.3, travel: 0.9 },
  'mehendi-hands': { scale: 0.28 },
  'marigold-garland': { scale: 0.3 },
  'window-peacock': { scale: 0.3 },
};

/** Library slugs that have a depth map (for 3D camera moves). */
export const DEPTH_SLUGS = new Set(depthList);

export const photos = Object.fromEntries(
  [...new Set([...Object.keys(fromCredits), ...Object.keys(overrides)])].map((k) => [k, { ...fromCredits[k], ...overrides[k] }]),
);

const isUrl = (s) => typeof s === 'string' && (s.startsWith('/') || s.startsWith('https://'));

/** URL of a photo reference at 'lg' (2560w) or 'sm' (1280w). */
export const photoUrl = (ref, size = 'lg') => {
  if (!ref) return '';
  if (typeof ref === 'object') return ref[size] || ref.lg || ref.sm || '';
  if (isUrl(ref)) return ref;
  return `/photos/${ref}-${size}.webp`;
};

/** Depth map URL, or '' when none exists (the stage then treats the photo as flat). */
export const depthUrl = (ref) => {
  if (!ref) return '';
  if (typeof ref === 'object') return ref.depth || '';
  if (isUrl(ref)) return '';
  return DEPTH_SLUGS.has(ref) ? `/photos/${ref}-depth.webp` : '';
};

const keyOf = (ref) => (typeof ref === 'string' && !isUrl(ref) ? ref : null);

/** PhotoView definition for the stage. */
export const view = (ref, extra = {}) => {
  const k = keyOf(ref);
  return {
    id: k || photoUrl(ref, 'lg'),
    src: photoUrl(ref, 'lg'),
    mobileSrc: photoUrl(ref, 'sm'),
    depth: depthUrl(ref),
    focal: (k && photos[k]?.focal) || (typeof ref === 'object' && ref.focal) || [0.5, 0.5],
    scale: (k && photos[k]?.scale) ?? 0.4,
    travel: (k && photos[k]?.travel) ?? 0.78,
    ...extra,
  };
};
