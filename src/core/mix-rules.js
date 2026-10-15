// Mix rules (docs/MIX.md): which gate and first screen can go on which page. Plain functions, no imports, so the
// page runtime (mix.js), the studio and the server (validate.js) all apply exactly the same rules.
//
// `parts` is a theme's compatibility manifest (its slots.js `parts` block), normalised by normParts():
//   gate: false | true | 'pair'   gives its gate; 'pair' = only together with its own first screen ("opening scene")
//   hero, hostGate, hostHero, ownGateNeedsHero: booleans
//   why: { gate?, hero?, hostGate?, hostHero? }   one line each, shown in the studio for a "no"
//   gateUses / heroUses: { texts: [], images: [], colors: [] }   what the part shows: the studio edits exactly these

export const SLUG_RE = /^[a-z0-9-]{2,30}$/;

/**
 * See-through gates (docs/MIX.md §6.1): the gate is the theme's own first screen in its closed state (a wash, an
 * unlit night, a lid), so it can only travel together with that first screen, as one "opening scene".
 */
export const OPENING_SCENES = Object.freeze(['agni', 'janti', 'rangoli', 'sindoor', 'shree']);

const WHY_KEYS = ['gate', 'hero', 'hostGate', 'hostHero'];
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** A declared-ids filter for a `uses` list: only strings the theme's manifest declares, at most 60. */
function usesOf(raw, declared) {
  const o = isPlain(raw) ? raw : {};
  const pick = (list, has) => (Array.isArray(list) ? [...new Set(list.filter((x) => typeof x === 'string' && has(x)))].slice(0, 60) : []);
  return {
    texts: pick(o.texts, (id) => Object.hasOwn(declared.texts || {}, id)),
    images: pick(o.images, (id) => Object.hasOwn(declared.images || {}, id)),
    colors: pick(o.colors, (t) => Object.hasOwn(declared.colors || {}, t)),
  };
}

/**
 * A theme's `parts`, sanitised. `manifest` = its slots.js (for the declared ids); `files` = which modules exist
 * ({ gate: bool, hero: bool }: src/themes/<slug>/gate.js and hero.js). A part without its module is never given.
 */
export function normParts(raw, slug, manifest = {}, files = { gate: true, hero: true }) {
  const p = isPlain(raw) ? raw : {};
  const givesGate = (p.gate === true || p.gate === 'pair') && files.gate === true;
  const why = {};
  if (isPlain(p.why)) for (const k of WHY_KEYS) if (typeof p.why[k] === 'string' && p.why[k].trim()) why[k] = p.why[k].trim().slice(0, 200);
  return {
    gate: givesGate ? (p.gate === 'pair' || OPENING_SCENES.includes(slug) ? 'pair' : true) : false,
    hero: p.hero === true && files.hero === true,
    hostGate: p.hostGate === true,
    hostHero: p.hostHero === true,
    ownGateNeedsHero: p.ownGateNeedsHero === true,
    why,
    gateUses: usesOf(p.gateUses, manifest),
    heroUses: usesOf(p.heroUses, manifest),
  };
}

/**
 * The parts a page really shows. `want` = { gate?, hero? } (theme slugs), `host` = the body theme,
 * `partsOf(slug)` = that theme's normalised parts (or null). Returns { gate, hero, ownGate }:
 *   gate / hero  a foreign slug or null (the host's own); never the host itself
 *   ownGate      true when the host's own gate must run as its module (its own opening needs its own hero)
 */
export function resolveDesign(want, host, partsOf) {
  const w = isPlain(want) ? want : {};
  const H = partsOf(host) || {};
  const ok = (s) => typeof s === 'string' && SLUG_RE.test(s) && s !== host;
  let hero = ok(w.hero) && H.hostHero === true && partsOf(w.hero)?.hero === true ? w.hero : null;
  let gate = null;
  if (ok(w.gate) && H.hostGate === true) {
    const G = partsOf(w.gate) || {};
    if (G.gate === true) gate = w.gate;
    else if (G.gate === 'pair' && hero === w.gate) gate = w.gate; // an opening scene: its gate with its own first screen
  }
  let ownGate = false;
  if (hero && !gate && H.ownGateNeedsHero === true) {
    if (H.gate === true) ownGate = true; // e.g. Laali's own gate as its module, then Janti's street
    else hero = null; // a see-through own opening: a foreign first screen needs a foreign gate too
  }
  return { gate, hero, ownGate };
}

/** `design` as stored: only the valid keys; null when it is all the theme's own. */
export function cleanDesign(want, host, partsOf) {
  const r = resolveDesign(want, host, partsOf);
  const out = {};
  if (r.gate) out.gate = r.gate;
  if (r.hero) out.hero = r.hero;
  return Object.keys(out).length ? out : null;
}
