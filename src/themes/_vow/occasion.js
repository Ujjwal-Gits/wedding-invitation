// Occasion wording for the international designs. Every design's words are slots with wedding defaults; when the
// invitation is for another occasion (config.occasion: birthday, baby-shower …; src/core/markets.js) the design's
// default words for the engine's standard slots are swapped for these, so nothing reads "wedding" on a birthday.
// The couple's (or host's) own words always win: this changes only the defaults.

const W = (en) => ({ en, ne: '' });

/** Standard slot ids (every international design declares them) → default per occasion. Absent = keep the design's. */
export const OCCASION_TEXT = {
  engagement: {
    'hero.kicker': 'Please join us to celebrate', 'hero.line': 'our engagement', 'prog.title': 'The plan',
    'count.done': 'Today’s the day', 'live.line': 'Watch the toasts live', 'card.button': 'Read the invitation',
  },
  anniversary: {
    'hero.kicker': 'Please join us to celebrate', 'hero.line': 'our anniversary', 'couple.title': 'The two of us', 'story.title': 'Our years together',
    'prog.title': 'The plan', 'count.done': 'Today’s the day', 'live.line': 'Watch the celebration live',
  },
  'vow-renewal': {
    'hero.kicker': 'Please join us as we', 'hero.line': 'renew our vows', 'story.title': 'Our years together', 'live.line': 'Watch the vows live',
  },
  'rehearsal-dinner': {
    'hero.kicker': 'Please join us for', 'hero.line': 'the rehearsal dinner', 'prog.title': 'The evening', 'live.line': 'Watch the toasts live',
  },
  birthday: {
    'hero.kicker': 'You’re invited to celebrate', 'hero.line': 'a birthday', 'couple.title': 'The guest of honor', 'story.title': 'A few good years',
    'prog.title': 'The party', 'count.title': 'Counting down to the party', 'count.done': 'It’s party time', 'families.title': 'Your hosts',
    'live.line': 'Join the party online', 'rsvp.title': 'Can you make it?', 'gate.line': 'You’re invited', 'gallery.title': 'Photos',
  },
  'baby-shower': {
    'hero.kicker': 'Please join us for a baby shower', 'hero.line': 'honoring', 'couple.title': 'The parents-to-be', 'story.title': 'Our little news',
    'prog.title': 'The shower', 'count.title': 'Counting down to the shower', 'count.done': 'Today’s the day', 'families.title': 'Your hosts',
    'live.line': 'Join the shower online', 'rsvp.title': 'Can you come?', 'gate.line': 'Something sweet is on the way', 'gallery.title': 'Photos',
  },
  'bridal-shower': {
    'hero.kicker': 'Please join us for a bridal shower', 'hero.line': 'honoring the bride-to-be', 'couple.title': 'The bride-to-be', 'story.title': 'Her story',
    'prog.title': 'The shower', 'count.title': 'Counting down to the shower', 'count.done': 'Today’s the day', 'families.title': 'Your hosts',
    'live.line': 'Join the shower online', 'rsvp.title': 'Can you come?', 'gate.line': 'You’re invited',
  },
  graduation: {
    'hero.kicker': 'Please join us to celebrate', 'hero.line': 'a graduation', 'couple.title': 'The graduate', 'story.title': 'The road here',
    'prog.title': 'The celebration', 'count.title': 'Counting down', 'count.done': 'Today’s the day', 'families.title': 'Your hosts',
    'live.line': 'Watch the ceremony live', 'rsvp.title': 'Can you make it?', 'gate.line': 'You’re invited',
  },
  housewarming: {
    'hero.kicker': 'Come see the new place', 'hero.line': 'a housewarming', 'couple.title': 'Your hosts', 'story.title': 'How we got here',
    'prog.title': 'The party', 'count.title': 'Counting down', 'count.done': 'Come on over', 'families.title': 'Your hosts',
    'live.line': 'Join us online', 'rsvp.title': 'Can you make it?', 'gate.line': 'You’re invited',
  },
  'dinner-party': {
    'hero.kicker': 'Please join us for', 'hero.line': 'dinner', 'couple.title': 'Your hosts', 'story.title': 'The occasion',
    'prog.title': 'The evening', 'count.title': 'Counting down', 'count.done': 'Tonight’s the night', 'families.title': 'Your hosts',
    'live.line': 'Join us online', 'rsvp.title': 'Will you join us?', 'gate.line': 'You’re invited',
  },
};

/** A copy of a design's manifest whose standard text defaults follow the occasion (the manifest itself is unchanged). */
export function withOccasion(manifest, occasion) {
  const words = OCCASION_TEXT[occasion];
  if (!words) return manifest;
  const texts = { ...(manifest.texts || {}) };
  for (const [id, en] of Object.entries(words)) if (texts[id]) texts[id] = { ...texts[id], default: W(en) };
  return { ...manifest, texts };
}
