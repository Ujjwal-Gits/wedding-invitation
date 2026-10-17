# Blush Roses (international · classic · Christian · Standard)

**Concept.** A gold frame draws itself and garden roses bloom in its corners; below, one long gold-framed stationery
suite of printed inserts, formal spelled-out date lines and a printed "M ____" reply card.

## Opening (the signature moment, ≈1.6 s)
The gate is a small white monogram card on warm paper (initials in Great Vibes, the date in small caps). On open the
card fades, then the hero's four gold hairlines scale out of the two rose corners (top + left from the top-left,
bottom + right from the bottom-right: `scaleX`/`scaleY` only) while the two watercolor rose corners bloom in from their
corners (scale + opacity), then the names, line, date and place settle in (`.vw-in`). Reduced motion: the engine fade.

## Body
- `#top` hero: frame + rose corners, kicker, names (script), `hero.line`, date in caps, venue and city.
- One long gold frame (`.br-suite`) holds every insert, centered and formally typeset:
  - `#card` the invitation insert: hosts, parents, `invite.request`, names, the date spelled out
    (`ctx.D.spelled`), venue, "<next event> to follow" (`invite.follow`), the full-card button. A rose corner sits on
    its top-left (outside the card on desktop).
  - `#couple` / `#story`: one framed portrait (double gold rule, white mat), the story as printed lines (three ruled
    columns on desktop).
  - `#date`: a blush countdown card, calendar and share.
  - `#programme`: the order of the weekend as formal lines ("Saturday, the twenty-second of May · half past four",
    from `kit.js spelled()`), numeric time with zone, venue + directions, dress, timeline. Two ruled columns on desktop.
  - `#photos`: a 2 × 2 grid of whole prints (never cropped).
  - `#info`: the accommodations card (getting there, where to stay, questions) + livestream.
  - `#rsvp`: the printed reply card: "M ____" on a rule, "accepts / declines" set as printed lines; rose corner bottom-right.
- `footer`: closing line, names in script, hashtag.

## Faith (Christian)
`faith: 'christian'`, `religions: ['christian','other']`, `faithInk: '--vw-accent'`. The engine's cross-and-rings emblem
sits small above the hero kicker; the verse (`verse.text`, `verse.ref`) is printed on its own small blush enclosure card
before the reply card. Both vanish for 'other' couples, `?v=neutral` or `faith.show` = off; the suite reads complete without them.

## Scroll motion
Desktop only (`gsap.matchMedia`, ≥ 900px, no reduced motion): the inserts, portrait and prints lift off the page in
perspective (rotateX + translateZ → flat, scrubbed), the insert rose corners drift on a nearer layer, the hero roses part
as the first screen leaves, and the frame's gold side rules draw down with the reader. Phones: the engine's quiet
`.vw-rise` fades only. Reduced motion: static.

## Slots (`slots.js`)
Images: `hero.roses` (top-left corner), `hero.roses2` (bottom-right corner), `couple.lead`, `gallery.1–4`.
Texts: all standard ids, plus `invite.request`, `invite.follow`, `faith.show`, `verse.text`, `verse.ref`. Colours: `--vw-accent`, `--vw-bg`, `--br-gold`, `--br-blush`.

## Fonts
Great Vibes (names and monogram only, ≥ 52px) + Libre Caslon Text (everything else). Google Fonts.

## Art
`scratchpad/intl/art/roses.jpg` (Canva AI, owner-approved, textless). The two corners are cropped inside the art's own
gold frame line (so the page draws its own frame) and cut out with `cutout.py`:
`corner-tl.webp` (66,84 → 860,1060) and `corner-br.webp` (540,1560 → 1133,2320), each with a `-sm` copy.
