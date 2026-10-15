# Laali (लाली)

Blush pink and gold: one arched invitation card under two hanging Mughal lanterns, inspired by the softest Canva cards.

## Concept
- A blush card with a fine gold ogee arch and an inner cusped (multifoil) arch, both computed in JS for the
  real card size so the lines stay hairline-sharp at any width.
- Two gold lanterns hang on chains in the top corners; blush peony sprays bloom from the bottom corners;
  the illustrated couple (bride in red sari, groom in ivory daura and Dhaka topi) stands at the foot of the arch.
- Nepali touches: Ganesh in the arch crown, ॥ श्री गणेशाय नमः ॥, शुभ विवाह in Kurale, the B.S. date under the
  Canva-style date strip, a gold Dhaka (stepped-diamond) band as every section divider, a faint Dhaka weave in the paper.
- Type: Alex Brush (names), Gilda Display (Latin display), Kurale (Devanagari display), Mukta (body).
- Palette: blush #F7E1E4 / card #FBEFF0, berry #9E2A4F (6.1:1 on blush), gold #B8893B for lines only.

## Signature motion (the one moment)
Tap the closed card: Ganesh lifts out of the small gold arch and rises into the crown of the big one while the
gold arch draws itself from the crown down both sides (SVG stroke-dashoffset), the lanterns drop in on their
chains and swing to rest, the peony corners bloom from their corners, then the names and date settle in.
Afterwards only: lanterns sway a degree or so, their glow breathes, a light catches Ganesh every few seconds.
All of it stops under prefers-reduced-motion (the engine crossfades instead).

## The page: "the lantern gallery" (T.page / T.scroll)
After the hero the page pins and walks sideways (scroll down, move along) through blush ogee-arch panels in a 3D
coverflow: the centred panel faces you, neighbours turn in Y and recede in depth, gold lanterns hang in the
foreground at three depths with parallax, wrap around, and swing with scroll velocity. Snaps one panel at a time;
a chapter label and dots (buttons) sit under the deck. Chapters:
1. the couple portrait clipped to an ogee arch; 2. the date under an arch-shaped rose-gold foil scratch card
(`T.scratch.paint` paints only inside the arch, with a Dhaka lattice); 3. the countdown as four gold line lanterns
on chains of different lengths, each holding a number and nudged on every tick, plus calendar/share;
4. the families as two arches turned toward each other; 5. one arch-topped ticket per event with a torn stub
(date, B.S. date); 6. the photos as their own little coverflow (drag, swipe, arrows, tap for the lightbox).
Then vertical again: travel/contacts, the RSVP as a letter rising out of a blush envelope (the card wording and
"read the full invitation" printed on the pocket), and the blessing under two small lanterns.
All arches are computed in JS from each element's layout size (clip-path polygon + fine gold double/cusped line).
Reduced motion: no pin, the same panels simply stack.

## Nepali wedding touches (shared kit, src/themes/_suite/nepali.js)
- Real photographic flames burn inside the Mughal lanterns (hero, gallery foreground, closing).
- Two brass Panas lamps with live flames flank the couple at the foot of the hero arch; fresh marigold-and-rose
  sprays sit with the peonies in the hero corners.
- A fresh marigold toran hangs across the crown of the gallery's first panel.
- A gold-edged band of real Palpali Dhaka weave sits under every panel title.
- The bond moment: the ganthi bandhan. The bride's red shawl knotted to the groom's ivory patuka ties the two family
  arches; as that panel comes in, the arches slide toward the knot in 3D and the knot tightens into view.
- The palette is used richly: a rose-deepening gallery stage, a blush-to-rose envelope ground, a berry closing.

## Art
Canva AI, generated for this theme: `public/themes/laali/art/` couple, lantern, flowers (peony corner, mirrored
in CSS for the right side), ganesh (gold line art). `dhaka.png` is a tiny raster tile drawn for this theme (an SVG
data-URI tile glitched under GPU compositing in testing, so the weave is a PNG).
