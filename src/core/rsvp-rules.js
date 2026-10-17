// What an RSVP asks and how a reply reads, shared by the guest form (core/rsvp.js), the server (lib/rsvp.js,
// lib/validate.js) and the couple's Replies page. No DOM, no Node APIs.
//
// invitation.rsvp (optional keys are stored only when they differ from the default, so older data reads the same):
//   meals:      [{ id, label: { en, ne } }]   the meal choices; absent = Vegetarian / Non-vegetarian
//   mealChoice: false                          no meal question at all
//   guestNames: 'required' | 'off'             default 'optional': a name field for every guest after the first
//   askDiet:    true                           an optional "Dietary needs / allergies" note
//   askSong:    true                           an optional song request
//
// A reply: { id, at, name, phone, attending, guests, events, party: [{ name, meal }], diet?, song?, message }.
// party[0] is the person replying. Replies saved before party existed have one `meal` for the whole party
// ('veg' | 'nonveg' | ''); partyOf() reads both.

export const DEFAULT_MEALS = Object.freeze([
  Object.freeze({ id: 'veg', label: Object.freeze({ en: 'Vegetarian', ne: 'शाकाहारी' }) }),
  Object.freeze({ id: 'nonveg', label: Object.freeze({ en: 'Non-vegetarian', ne: 'मांसाहारी' }) }),
]);
export const MEAL_ID_RE = /^[a-z0-9-]{1,32}$/;
export const GUEST_NAME_MODES = ['optional', 'required', 'off'];
export const MAX_MEALS = 8;
export const LIMITS = { name: 80, diet: 300, song: 150, message: 500 };

const hasLabel = (o) => !!(o && o.label && (String(o.label.en || '').trim() || String(o.label.ne || '').trim()));

/** The questions this invitation asks: { meals: [...], guestNames, diet, song }. */
export function rsvpOptions(rsvp) {
  const r = rsvp && typeof rsvp === 'object' ? rsvp : {};
  const own = Array.isArray(r.meals) ? r.meals.filter((o) => o && MEAL_ID_RE.test(o.id) && hasLabel(o)) : [];
  return {
    meals: r.mealChoice === false ? [] : own.length ? own : DEFAULT_MEALS,
    guestNames: GUEST_NAME_MODES.includes(r.guestNames) ? r.guestNames : 'optional',
    diet: r.askDiet === true,
    song: r.askSong === true,
  };
}

/** True when a list of meal options is exactly the default (then it is not stored). */
export const isDefaultMeals = (list) => Array.isArray(list) && list.length === DEFAULT_MEALS.length
  && list.every((o, i) => o.id === DEFAULT_MEALS[i].id && (o.label?.en || '') === DEFAULT_MEALS[i].label.en && (o.label?.ne || '') === DEFAULT_MEALS[i].label.ne);

/** Everyone in a reply, new shape or old: [{ name, meal }] (empty for "can't come"). */
export function partyOf(r) {
  if (!r || r.attending !== 'yes') return [];
  if (Array.isArray(r.party) && r.party.length) return r.party.map((g, i) => ({ name: String(g?.name || (i ? '' : r.name || '')), meal: String(g?.meal || '') }));
  const n = Math.max(1, Number(r.guests) || 1);
  const meal = r.meal === 'veg' || r.meal === 'nonveg' ? r.meal : '';
  return Array.from({ length: n }, (_, i) => ({ name: i ? '' : String(r.name || ''), meal }));
}

/** The words for a meal id: the invitation's own option, else the built-in ones, else the id itself. */
export function mealLabel(id, meals = DEFAULT_MEALS) {
  if (!id) return { en: '', ne: '' };
  const o = (meals || []).find((m) => m.id === id) || DEFAULT_MEALS.find((m) => m.id === id);
  return o ? { en: o.label.en || o.label.ne || id, ne: o.label.ne || o.label.en || id } : { en: id, ne: id };
}

/** A guest's name as a list shows it: their own, or "Guest 2". */
export const guestName = (g, i) => (g && String(g.name || '').trim()) || `Guest ${i + 1}`;

/** Meal counts over attending replies: [{ id, label, guests }] in the invitation's order, then any old ids, then "Not chosen". */
export function mealTotals(replies, meals = DEFAULT_MEALS) {
  const counts = new Map((meals || []).map((m) => [m.id, 0]));
  let none = 0;
  for (const r of replies || []) {
    for (const g of partyOf(r)) {
      if (!g.meal) none += 1;
      else counts.set(g.meal, (counts.get(g.meal) || 0) + 1);
    }
  }
  const out = [...counts].map(([id, guests]) => ({ id, label: mealLabel(id, meals), guests }));
  if (none && (meals || []).length) out.push({ id: '', label: { en: 'Not chosen', ne: 'नछानिएको' }, guests: none });
  return out;
}
