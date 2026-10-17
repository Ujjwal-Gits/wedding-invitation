# Gold Arch (international · modern · Muslim · Pro)

**Concept.** A Muslim wedding in black, white and gold. A fine gold mihrab arch draws itself, and an eight-point star
rosette opens at its apex. The page after reads like a magazine: editorial spreads with sticky numbered labels, a
huge-numeral time ribbon, and an editorial "Kindly reply" spread with the deadline set huge.

Colour rules:
- Near-black ink carries every word.
- Gold (`--ga-gold`) is used only for line work: the arch, the stars, the eight-point-star (khatam) lattice and rules.
- A darker gold (`--ga-gold-ink`, 5.9:1 on white) is used for small numbers and the ampersand.

## Faith (`faith: 'muslim'`, religions `['muslim', 'other']`)
The faith marks below show only when the invitation's faith is Muslim and `faith.show` / `bismillah.show` are not
"off". With `?v=neutral` or an 'other' couple, they all disappear and the layout stays finished.
- `ctx.verse()`:
  - the Unicode Bismillah (the engine's Amiri face) at the top of the gate and above the names in the hero;
  - the full Qur'an 30:21 verse as a pull-quote beside the hosts' arch frame.
- `ctx.emblem()`: the crescent emblem in the hosts' arch crown, above the monogram.
- The card dialog adds both automatically.

There's no Arabic in the images and no human figures in the art. The demo uses modest photographs only (rings, hands,
bouquet, aisle). The demo couple is Sara Malik & Adam Hussain, with a Mehndi, Nikah and Walima.

## Opening (the one signature motion)
Gate: the Bismillah, a small gold mihrab with the initials, the names and the numeric date, then the engine's open
buttons. On open, the gate lifts away. Then one pen line draws the hero's pointed arch, transform-only:
1. Up the left side (`scaleY`).
2. Over the left arc to the apex. Each arc is a ring of radius 0.8 × width, clipped to its half of the crown and revealed
   by a half-disc cover turning about the ring's centre.
3. At the apex the rosette turns and opens.
4. Down the right arc and side, then back along the base.

The rose with eucalyptus then slides in at the arch's foot, and the words settle inside. Reduced motion shows the arch
already drawn, with a fade.

## Sections (standard ids)
- `#top` (hero):
  - Phones: the words sit inside the arch, with the rose at its lower right and no text over it.
  - Desktop: a triptych. The huge day numeral and time on the left, the arch with the names in the centre, venue, city
    and dress on the right.
- `#couple` / `#story` (01): the lead photo shown whole, then the years as big numerals in ruled rows.
- `#date` (02): a near-black band with a faint gold khatam lattice at its right edge. The days left are a huge white
  numeral, with hours, minutes and seconds beneath, then the facts and the calendar and share buttons.
- `#programme` (03): the time ribbon. One gold line runs down the section, with a star node and day header for each new
  day. Each event (`#ev-<id>`) sets its start time as a huge numeral beside the line.
- `#card` (04): hosts and parents inside a gold mihrab frame, plus the "Read the invitation" button. The verse sits
  beside the frame on desktop and below it on phones.
- `#photos` (05): whole photos in two offset columns (`[data-lb-idx]`).
- `#info` (06): travel, stays and contacts as ruled rows, then the livestream line.
- `#rsvp` (07): the "Kindly reply" spread. The deadline is set huge ("by April 1, 2027"), with the form beneath it.
- `footer`: a khatam lattice band, then a small mihrab with the closing line, names, date and hashtag, and the rose.

Labels are numbered in the order the sections appear.

## Scroll (desktop only)
Inside `gsap.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)')`, the spreads move in
layered depth:
- The hero leaves in three planes: the rose fastest, the arch slower and slightly scaled, the flanks slowest and fading.
- The lead photo drifts a plane behind the story.
- The ribbon's time numerals tip up from `rotateX(52°)` with perspective as they arrive.
- The two photo columns drift at two depths.

Phones get only the engine's `.vw-rise` reveals.

## Slots (`slots.js`)
- Images: `hero.rose` (the art), plus `couple.lead` and `gallery.1`–`6` (couple photos).
- Texts: the standard ids, plus:
  - `story.title`, `count.left`, `info.title`, `families.title`;
  - faith texts: `faith.show`, `bismillah.show`, `verse.text`, `verse.ref`.
- Colours: `--ga-gold` (also the emblem's ink), `--vw-accent` (ink), `--vw-bg`.
- Occasions: wedding, engagement, anniversary, dinner-party. One name (`vw-single`) lays out cleanly.

## Fonts
Italiana (display, 32px and up) + Manrope (body and labels; also used for the ampersand). The Arabic is the engine's
Amiri.

## Art
- `public/themes/gold-arch/art/rose.webp` (682×999) and `rose-sm.webp` (380w) are cut from the owner-approved
  `scratchpad/intl/art/arch.jpg`. The painted gold line was removed first by interpolating across it, then the art was
  cut out with `cutout.py`.
- The painted line ran 81.2% across and 87.1% down the cutout, so `.ga-rose-w` pins the rose to the drawn arch's corner.
- The arch, the stars and the lattice are drawn in CSS and SVG.
- Demo photos: `_vow/demo` (CC0).
