# Sawari (सवारी) · the ride

The bride (red bridal sari, gold jewellery, veil) rides a dressed white horse; the groom (daura suruwal, Dhaka topi,
marigold mala) walks ahead holding its red rope. The guest travels with them along one painted road through Nepal,
from her family home to the lamp-lit mandap. Nepal only, Hindu (`religions: ['hindu']`), Pro Max tier.

Runs on the card-suite engine (`src/themes/_suite/suite.js`: data, RSVP, countdown, scratch card, lightbox, card modal,
music, opening safety net) with its own gate, page and opening (`T.gate`, `T.page`, `T.open`, `T.ready`, `T.scroll`).
No WebGL: painted layers moved with transforms only.

## Opening: the horse waits at the gate
A full-bleed painting (portrait for phones, landscape for wide screens) of the dressed white horse waiting at the carved
gate of the bride's home in the golden afternoon, the names in the sky. Tap: the names lift away, the painting slips
back and fades, and the procession walks in from the left onto the first stop of the road (the walk bob follows the
distance walked).

## Signature: the journey (one pinned, horizontal, painted road)
`#top` pins; vertical scroll moves everything sideways (GSAP ScrollTrigger, scrubbed, native touch momentum):
- **sky** (far, slowest): Himalaya at golden afternoon, crossfading to sunset and to dusk (`sky-day|sunset|dusk`);
- **road** (middle): seven cut-out paintings with transparent skies, melting into each other with masks: home,
  terraces, bridge, chautari, temple (sunset), toran (dusk), mandap (lamp-lit). The world eases between key frames so
  it lingers at every stop (`data-anchor="<painting>:<fraction>"` on each stop);
- **procession** (fixed in the middle): the bride on the horse and the groom (`couple`, with a dusk-graded copy that
  fades in after sunset). Its bob and sway are tied to the distance walked, so it stands still when the road stops;
- **flowers** (near, 1.32× faster): marigold, rose and mustard clumps placed so none stands in front of the procession
  at a stop;
- **words**: one stop per screen, in the sky above the road. Words and road glide together between stops and hold
  still for a short stretch of scroll at each stop (`HOLD`), so the words can be read and a jump lands true;
- **props** (things standing by the road: the carved frame on its easel, the story's year stones, one family
  milestone on each bank of the river, the countdown milestone): they move with the road, not the words, and sit under
  the procession. Phones: centred behind the procession on the far verge (the foot hidden behind the horse, the carved
  words above the bride's head). Wide screens: beside the procession, feet on the verge, flowers kept off them at their
  stop. Sized per screen in `placeProps()`; carved words are fitted to the stone's face (`fitFace`), so Nepali never
  runs into the grass at its foot. Each fades out halfway to the next stop.

Stops: names (home) · the elders' blessing and the full card (home) · the couple in a carved garlanded frame on its
easel (terraces) · our story, the years on little milestones by the road (terraces) · the two families, his stone on
this bank and hers across the bridge · photographs propped at the chautari · one red-and-gold painted signboard per
celebration, dressed with the fresh marigold toran from the Nepali kit and a clump of marigolds and roses on its frame
(temple to toran) ·
the milestone that counts the days to the mandap, with calendar and share (toran) · scratch the gold leaf for the day
(mandap). A route bar (top left) shows where on the road you are. Keyboard focus inside a stop rides to it.

After the road (vertical, Himalayan dusk): the seven steps by live diyo light, the arrival painting (the couple hand
in hand before the mandap), the reply letter on lokta paper beside the couple's photo, travel/stays/contacts, the
blessing.

**Reduced motion / `?still` / a phone on its side** (under 500px tall and landscape; switches live on rotation): no
pin: every stop becomes a still painted postcard (its painting, the procession on its trail) above its words, one under
the other. `?debug`: `window.__su` (opening) and `window.__sw.go(i)` (stops). In the studio preview (`?preview=1`) the
road snaps to the nearest stop when it comes to rest, so "show me" lands side-standing words where they belong; the
ids (`#couple`, `#families`, `#photos`, `#countdown`, `#date`) sit on the moving words, not on the stop.

## Slots (`slots.js`)
Images: `hero.ganesh` (sacred), `couple.lead` (the carved frame), `gallery.1`–`6`, `finale.photo` (beside the reply),
`families.bride|groom`. Texts: gate line and buttons, Ganesh switch, invocation, first-screen title and line, the seven
route signs (`stop.*`), couple title/line, story title (`-` hides the story), families, photos, ceremonies kicker and
title, countdown line, mandap title, scratch hint/button, seven-steps title/line, card line/button, arrival title, RSVP
title/send. Colours: `--su-accent` (sindoor), `--sw-night` (dusk pages), `--sw-gold`.

## Art (`public/themes/sawari/art/`)
Canva AI paintings made for this theme, exported full size from the "Sawari art board" (Canva design `DAHYjm_fbAg`);
originals in `art-src/sawari/` (not committed). Cut-outs by Canva background removal (the road paintings were painted
on a flat white sky). `board-clean` is the signboard with its left half mirrored from the clean right half (for
`border-image`). The diyo lamps come from the shared Nepali kit (`public/themes/_nepali/`).

Type: Brygada 1918 (Latin display and names), Sura (Devanagari display), Commissioner (Latin reading), Noto Sans
Devanagari (Devanagari reading).
