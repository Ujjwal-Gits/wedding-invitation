# Sandesh (सन्देश) · doves bring the news

"The message". In the old way, birds carried word of a wedding. An old-city rooftop at morning; a pair of white doves
delivers the invitation, part by part, as hand-stamped postcards. On both sites (`market: 'both'`, style `romantic`),
neutral art for every community (no deity, temple or rite in the art). Runs on the card-suite engine (`_suite`).

## Opening (the gate is the first screen itself)
1. Two rigged doves fly in from the top left carrying a folded letter on red-and-yellow mauli strings, set it down and
   settle on its edge (`arrive()` in main.js, on load).
2. A paper tag hangs under the letter: the line, "Break the seal" and "Open without music" (the seal is a tap target too).
3. Tap: the lac seal cracks in two (one painting, two jagged clip-paths), the thread falls, the doves hop up, the letter
   unfolds in three panels (rotateX hinges) to the names, and a vermilion postmark is stamped with the date.
Another theme's gate can open onto the letter (`hostGate`); it is then already unfolded (`heroIntro`).

## Signature motion: the delivery flight (`dove.js`)
One scroll-scrubbed path for the pair runs down the lime-washed wall. For each postcard the doves leave the last card,
swoop out past the edge, come back carrying the next one (scaled down, hanging from their feet), set it down with a
slight turn and sit on its top edge. Between deliveries they sit still. One rAF loop, transform and opacity only, paused
off screen; a jump (a link, the studio) lands at once. Reduced motion: every card in place, the pair perched, no flight.

## Body (top to bottom)
- `#couple` picture postcard (the couple's photo, shown whole) · `#families` two stamps side by side (their photos, or
  initials) · `#date` a sheet of four perforated stamps counting down · `#ev-<id>` one postcard per ceremony: message
  side, the ceremony's own painted stamp and postmark, ruled address lines (AD date, B.S. date in Nepal, time, venue, map)
- `#photos` a pinned postcard rack: the front card tips forward out of the rack as you scroll (a grid without motion)
- `#card` the full letter (modal) · travel notes · `#rsvp` a reply postcard; posting it drops a card into a red pillar
  box and a dove flies off with it · the blessing under a marigold garland, brass lotas of roses.
- Desktop: brass lotas on stone ledges in the empty margin (never under words).

## Studio slots (`slots.js`)
Images: `scene.phone`, `scene.wide` (the rooftop paintings), `couple.lead`, `gallery.1-6`, `families.bride|groom`,
`stamp.haldi|mehendi|wedding|reception|engagement|other` (which stamp a ceremony gets is read from its id/title),
`hero.ganesh` (only on the full card, off by default). Texts: gate, letter, wall heading, couple, families, countdown,
ceremonies, rack, card, reply. Colours: `--sd-lac`, `--sd-paper`, `--sd-ink`, `--sd-brass`.

## Art
All paintings are Canva AI art made for this theme (art board "Sandesh art board", DAHYXsbcpE8): the rooftop (portrait
and landscape), the dove (cut into body and wing for the rig), the perched pair, six stamp paintings, the lac seal, the
pillar box, bougainvillea, a brass lota of roses and the marigold garland. No third-party credits needed.
Fonts: Old Standard TT, Rhodium Libre (Devanagari display), Martel Sans, Courier Prime (postmarks).
