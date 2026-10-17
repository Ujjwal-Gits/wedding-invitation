# Letterpress (international · classic · Christian · Standard)

**Concept.** A real deckled cotton card lies face down on sage linen; it lifts off the linen, turns over and settles
to show its pressed invitation. The rest of the suite lies on the linen as a flat-lay of deckled cards that lift and
settle in depth, with a letterpress calendar page (the day circled in ink) and a reply card with a stamp in its corner.

## Opening (the signature moment, ≈1.75 s)
The gate is the stage itself: linen, the olive sprig and silk ribbon tucked under the card's corner, and the card's
back with a blind-embossed monogram, "You're invited" and the buttons pressed on it (`ownButtons`; tapping the card
opens too). On open the buttons fade, the hero's identical card (a 3D flipper: back + front faces) lifts (`z`,
`rotationX`; a separate soft shadow spreads via opacity/scale), turns over (`rotationY` 180 → 0) and settles; then the
debossed type of the front face arrives (`.vw-in`). Reduced motion: the engine fade straight to the printed face.
Desktop adds a second blank card tucked under the left side.

## Body (a flat-lay on the linen)
- `#top`: the printed card: emblem (debossed), `hero.kicker`, full names in Cinzel, the date spelled out
  (`ctx.D.spelled`), venue and city.
- `#couple` / `#story`: a white-bordered print of the couple laid beside the story card.
- `#date`: the letterpress calendar page (month grid at the venue, the day ringed by a hand-drawn ink loop), the long
  date, the countdown, calendar and share.
- `#card`: the families card (hosts, parents, the verse pressed on it, the full-card button). On desktop it sits
  beside the calendar, a step lower.
- `#programme`: the schedule card, printed like a programme (day in caps, title, time with zone, venue + directions,
  dress, timeline); two columns on desktop.
- `#photos`: a small label card and up to four whole prints at loose angles.
- `#info`: the accommodations card (getting there, where to stay, questions) + livestream.
- `#rsvp`: the deckled reply card with a perforated postage stamp (initials + the year in Roman numerals) and a
  postmark in its corner.
- `footer`: a small thank-you card.
Every card is the same real cotton card art, drawn at any size with `border-image` (deckle and debossed rule intact).

## Scroll motion
Desktop only (`gsap.matchMedia`, ≥ 900px, no reduced motion): each card or print arrives lifted (perspective tilt,
raised in `z`, a little turned) and settles flat onto the linen as its shadow tightens; the hero card and the
sprig drift on two layers as the first screen leaves. Phones: the engine's quiet `.vw-rise` slides; reduced motion: static.

## Faith (Christian)
`faith: 'christian'`, `religions: ['christian','other']`, `faithInk: '--vw-accent'`. The engine's cross-and-rings emblem is
pressed at the top of the invitation card; the verse is pressed on the families card. Both vanish for 'other' couples,
`?v=neutral` or `faith.show` = off; the cards read complete without them.

## Slots (`slots.js`)
Images: `hero.card` (the cotton card, used by every card), `hero.sprig` (sprig + ribbon), `hero.linen` (seamless tile),
`couple.lead`, `gallery.1–4`. Texts: all standard ids (`hero.line` is empty for a wedding; other occasions get a line
under the names) plus `faith.show`, `verse.text`, `verse.ref`. Colours: `--vw-accent`, `--lp-linen`.

## Fonts
Cinzel (names, headings, small caps) + EB Garamond (body). Google Fonts.

## Art
From `scratchpad/intl/art/letterpress.jpg` (Canva AI, owner-approved, textless) with `scratchpad/prep/lp_art.py`:
`card.webp` (the real card, sprig retouched out by transplanting clean card, alpha keyed from the linen),
`sprig.webp` (sprig + ribbon below/right of the card, transparent where the card lies, feathered into the linen),
`linen.webp` (a 512 × 200 seamless weave tile: high-pass of the art's linen on its mean colour).
