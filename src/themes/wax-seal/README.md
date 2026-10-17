# Wax Seal (international · modern · Christian · Standard)

**Concept.** Break the sage wax seal and the letter rises out of its envelope. The page after is a correspondence
collection of letters and notes on white:
- swipeable note cards for the schedule;
- a reply card slipped into its own small sage envelope.

Palette: white paper on white linen, one deep sage (`--vw-accent` #4C6150, 6.7:1 on white) and pale sage paper
(`--ws-sage`).

## Faith (`faith: 'christian'`, religions `['christian', 'other']`)
The faith marks below show only when the invitation's faith is Christian and `faith.show` is not "off". With
`?v=neutral` or an 'other' couple, both disappear and the hosts note stands alone.
- `ctx.emblem()` (the fine cross over two rings) sits small at the top of the letter on the first screen. It's also at
  the head of the verse note.
- `ctx.verse()` (Ruth 1:16 by default) is its own sage note beside the hosts' note.
- The card dialog adds both automatically.

The wax seal always keeps the art's own leaf impression.

## Opening (the one signature motion, `ownButtons`)
The gate is the linen from the art, with the names and date above an envelope built in code. The envelope has an
inside, the letter, an SVG front pocket and a two-faced SVG flap. The real wax seal from the art (a cutout) is the
`#open` button. Under it are the words "Tap the seal to open" and a visible `#quiet` "Open without music" link.

On tap:
1. The seal presses and cracks in two (two clip-path halves rotate apart).
2. The flap swings open in depth (`rotateX` 180°, then drops behind the letter).
3. The letter rises out (`y`).
4. The envelope and flowers settle away.
5. The letter grows (FLIP: `x`, `y`, `scaleX`, `scaleY`, measured from the hero's card) into the first screen's letter.
6. The gate fades onto the identical linen.

Everything is transform and opacity only. Reduced motion uses the engine's fade.

## Sections (standard ids)
- `#top`: the letter on linen. It carries the emblem, kicker, names, line, date and time, venue and city. The rose
  sprig is tucked under its lower-left corner and the broken seal rests at its lower right, with no text over either.
- `#couple` / `#story`: the story as a letter, with the lead photo tucked in as a slightly turned print. The greeting,
  a paragraph per year and the sign-off with the names are all slot words.
- `#date`: a sage "Save the date" note, slightly turned, with the countdown and the calendar and share buttons.
- `#programme`: note cards (`#ev-<id>`), each with a sage day stamp, a "01 / 04" count, time, venue, map link, dress
  and timeline. On phones they're a horizontal scroll-snap row, with one whole card at rest and the next peeking. On
  desktop it's three across, centred.
- `#card`: the hosts note with parents and "Read the invitation", beside the verse note.
- `#photos`: whole photographs in one column, then two (700px and up), then three (1100px and up).
- `#info`: travel, stays and questions as three notes, then a sage livestream note.
- `#rsvp`: the deadline under the title. The reply card (the form) is slipped into a sage envelope: an open flap behind
  it and a front pocket over its empty foot.
- `footer`: the seal whole again, the closing line, names, hashtag and "Made with Nimtto".

## Scroll (desktop only)
Inside `gsap.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)')`:
- Every letter and note (`.ws-sheet`) tilts up off the table toward the reader as it arrives (`rotateX` 24° → 0 with
  perspective, `z` and `y`, scrubbed).
- The reply envelope's pocket slides up around the card.

Phones get only the engine's `.vw-rise` reveals.

## Slots (`slots.js`)
- Images:
  - art: `gate.linen`, `gate.seal`, `gate.sprig`;
  - couple photos: `couple.lead` and `gallery.1`–`6`.
- Texts: the standard ids, plus:
  - `story.title` (the letter's greeting), `story.sign`, `count.title`, `prog.hint`, `info.title`, `families.title`;
  - faith texts: `faith.show`, `verse.text`, `verse.ref`.
- Colours: `--vw-accent`, `--ws-sage`, `--vw-bg`.

One name (`vw-single`, e.g. `?debug&occasion=birthday`) lays out cleanly.

## Fonts
Instrument Serif (display, roman and italic) + Instrument Sans 400–700 (body, labels).

## Art
All of it comes from the owner-approved `scratchpad/intl/art/seal.jpg`. The scripts are in the scratchpad:
- `linen.webp` (1200×1060) and `-sm`: the textless top of the painting.
- `seal.webp`: a chroma-and-disc cutout of the real wax seal (`seal_art.py`).
- `sprig.webp` and `-sm`: a GrabCut cutout of the rose and eucalyptus, seeded by hue (`sprig_art.py`).

The envelope, flap, pocket and the reply envelope are SVG/CSS. Demo photos: `_vow/demo` (CC0).
