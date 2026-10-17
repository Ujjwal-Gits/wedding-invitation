# Amalfi (international, destination, Christian, Pro Max)

**Concept:** a postcard from the coast turns over to a painting of Positano, then the page reads like a travel journal of the
weekend: one boarding pass per day, a travel guide, luggage-tag stays and a ticket-stub reply.

Sea blue (`--vw-accent #1C5880`) on crisp white; the only other colors live in the watercolor art (lemons, the coast).
Fonts: DM Serif Display (display), Karla (body), Sacramento only for large handwriting on the postcards (≥ 30px).

## Opening (the signature)
The gate is the back of a postcard on a white tabletop: "Post card" print, a perforated lemon stamp (a crop of the art), a round
postmark with the town and the date, the note "See you by the sea", the verse (Christian couples only), and the names, venue and
city written as the address on ruled lines (landscape card on wide screens, portrait on phones). On open the card lifts, turns
over in real 3D (`.am-flip`, rotateY 180 with its own perspective, backface-hidden faces) to its painted front, holds, then:
- wide screens: flies to the first screen's tilted postcard and lands there (exact FLIP, the tabletop fades, the lemons drop in);
- phones: dissolves toward the shore at the foot of the screen while the coast and lemons come in.
The card is the outer element (fades/moves) and `.am-flip` the inner one (turns), so opacity never flattens the 3D context.
Reduced motion: the engine's fade. `?debug` → `__vw.at(t) / finish() / to(sel)`.

## Sections
- `#top` phones: lemon branch, emblem, names, line, weekend dates, place, the coast. Desktop: words left, lemon branch + the
  landed postcard right (layered parallax on scroll).
- `#couple` a tilted snapshot (whole photo) + the years as a route (dashed line with stops on desktop, ruled list on phones).
- `#date` a departure board: destination, date, time, then the countdown in flap tiles; calendar + share.
- `#programme` one boarding pass per day (blue stub with Day N / weekday / date, perforation and notches); each event is a leg
  (`#ev-<id>`) with time, place + directions, attire swatches, blurb, timeline. Desktop: each pass tilts up off the table
  (rotateX, ScrollTrigger scrub, inside `gsap.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)')`).
- `#card` hosts, parents and the full-card button.
- `#photos` phones: a snap swipe strip, one whole photo at rest with the next peeking, "2 / 9" counter. Desktop: justified rows
  (flex-grow by aspect ratio), always whole.
- `#info` "Getting there": each line of the travel note becomes a numbered step (first sentence = the step's title); stays as
  luggage tags; questions with call/text; livestream.
- verse page (Christian only) before the reply.
- `#rsvp` a ticket with a tear-off stub (blue band on phones, paper stub with stamp + postmark on desktop); a sent reply tears
  the stub a little (`.is-torn`).
- `footer` closing line, names, hashtag, and the page ends at the sea.

## Faith
`faith: 'christian'`, `religions: ['christian','other']`, `faithInk: '--vw-accent'`. `ctx.emblem` sits over the names on the
first screen; `ctx.verse` is written on the postcard and repeated as a journal page before the reply. Both vanish for other
couples, `?v=neutral`, or `faith.show` = off; the layout is complete either way.

## Slots (`slots.js`)
Images: `hero.lemons`, `hero.coast`, `postcard.front` (3:2), `postcard.frontTall` (2:3), `postcard.stamp`, `crown.a`,
`crown.b`, `couple.lead`, `gallery.1–6`. Texts: all standard ids, plus `postcard.print`, `postcard.note`, `board.to`,
`board.date`, `board.time`, `prog.day`, `info.kicker`, `rsvp.note`, `faith.show`, `verse.text`, `verse.ref`.
Colors: `--vw-accent`, `--vw-bg`, `--am-table`, `--am-card`.

## Art
All from the owner-approved Canva AI watercolor `scratchpad/intl/art/amalfi.jpg` (1200×2400, textless):
`lemons(-sm)` and `coast(-sm)` are white-key cutouts (`cutout.py`), `sprig-a/b` cutout crops, `front-land(-sm)` /
`front-port(-sm)` opaque crops of the coast for the postcard face, `stamp` an opaque lemon crop. Demo photos: the engine's CC0 set.
