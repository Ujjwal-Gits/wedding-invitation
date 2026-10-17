# Andalus (international · destination · Muslim · Pro Max)

**Concept.** A Moorish courtyard in deep teal, scroll-paper ivory and gold leaf. The invitation is a scroll: it hangs
rolled from a teal rod on a tiled courtyard floor, unrolls down the screen and becomes the page itself, one long
illuminated scroll with zellige-tiled manuscript margins that ends on its bottom rod.

## Opening (the one signature motion)
Gate: the courtyard floor (gold-line eight-point stars on `--an-field`), the rod with gold finials, the rolled paper
(gradient-shaded cylinder with tiled ends) held by a geometric wax seal with the initials, the names, date and city.
Open: the words fade, the seal lifts off, the roll travels to the bottom of the screen while the paper it lets go of
stays put (a clip window `.an-gsheet` that moves with the roll, its face `.an-gsheet__in` counter-shifted; transform
only, no squash), the roll drops away and the gate fades onto the identical page paper; the hero pieces rise in.
Reduced motion: the engine's fade.

## Body (top to bottom, all on one paper column `main#main::before` with tiled margins)
- `#top` hero: kicker, names (Forum capitals), the courtyard painting with the emblem above its arch, the date
  (desktop: line | painting | big day numeral), place. Desktop is a frontispiece triptych, phones stack.
- `#blessing` illumination (only when faith marks are on): `ctx.verse()` (Unicode Bismillah + Qur’an 30:21) inside a
  gold horseshoe-arch frame. With `?v=neutral` or faith off the whole section is absent.
- `#couple` / `#story`: the lead photo as a framed plate on a tile sill; story entries as manuscript text with the
  year as a marginal gloss and an illuminated initial (`::first-letter` teal tile).
- `.an-court` = `#date` + `#programme`: a month grid laid in tiles (patterned tiles fill the blanks, event days teal,
  the main day gold leaf with a star) for every month an event falls in, a key, the countdown as tiles, calendar/share;
  beside it (desktop, sticky) each event as a card with its own day tile, time, place + map, attire, timeline.
- `#card` hosts in a double-ruled cartouche + the full card button.
- `#photos`: whole photos as numbered plates on a staggered two-column folio.
- `#info`: travel / stays / questions as a ruled glossary + livestream.
- `#rsvp`: a small sealed reply scroll (mini rods, tiled border, the wax seal, an orange-blossom branch on its corner).
- `footer`: closing line, names, hashtag, the scroll's bottom rod.

Scroll motion: `.vw-rise` reveals; desktop only (≥1100px, motion allowed) two layers of horseshoe arches in the
courtyard beside the scroll drift at different speeds (GSAP ScrollTrigger scrub). Phones: no parallax.

## Slots
Images: `hero.court` (courtyard painting), `rsvp.blossom` (orange-blossom branch), `couple.lead`, `gallery.1–6`.
Texts: all standard ids + `cal.title`, `faith.show`, `bismillah.show`, `verse.text`, `verse.ref`.
Colours: `--vw-accent` (teal; also the tiles' stars), `--an-field` (courtyard), `--an-gold` (gold leaf), `--vw-bg` (paper).

## Fonts
Forum (display, Roman capitals) + Alegreya (body, 18px desktop / 17px phone). Arabic only via the engine (Amiri).

## Art
Canva AI (textless, no figures), exported full size through the art board `DAHYRtgK2w8` (pages "andalus courtyard"
1200×2400 and "andalus blossom" 2400×1200); sources in the session scratchpad `intl/art/andalus.jpg` and
`andalus-blossom.jpg`. Cut out with `cutout.py` (`court`, `blossom` + `-sm`), the courtyard's edges feathered and the
artist-mark corner cropped away. All zellige tiles, rods, seal, arches and rules are inline SVG/CSS.
