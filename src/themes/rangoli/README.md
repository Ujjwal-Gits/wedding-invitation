# Rangoli (रंगोली) · the courtyard on the wedding morning

Page: `/rangoli/` (demo) · `/rangoli/?id=<invitation>` (studio data) · `?debug` exposes `window.__su` · `?debug&open` skips the gate.
Built on the card suite (`src/themes/_suite/`, `T.page`): this folder holds the gate, the opening, the hero, the page and the look.

## Concept
The morning of the wedding: the courtyard (chowk) of a Newari house has been swept, a flower rangoli of marigold,
rose, jasmine and leaves is being laid on the herringbone bricks, and brass diyos with living flames stand around it to
welcome the guests. The whole invitation is that floor, seen from above. The eave's morning shade falls across one side
of the bricks and holds the words (lime-white on shade, never on flowers). The rangoli lies in the sun beside it.

## Signature motion: the camera tilts down and the rangoli assembles
Gate: a low view across the courtyard. The floor is in perspective (`rotateX`), a marigold toran hangs from the eave,
शुभ विवाह sits under it, and brass Ganesh stands at the shrine ahead between two lit diyos. Only the rangoli's rim and
its diamond band are laid. Four diyos stand on its rim. On a tap (the button, the quiet link or the scene), the camera
tilts down until it looks straight at the floor. One CSS variable `--k` (1 to 0) drives the floor's tilt and pan and
the counter-tilt of everything standing on it, so the lamps and Ganesh stay upright and then lie flat. Meanwhile the
eave and toran rise out of view, the rim settles, the diamond band turns into place, the jasmine-and-leaf ring turns in
from the other side, and the rose core with the brass diyo drops in. Then the centre diyo catches a live flame and the
words come up in the shade. That's about 2.3 s, plus the words. Transform and opacity only. `will-change` applies only
under `body.rg-moving`. Once it has landed (`body.rg-landed`), the floor is a flat picture again, so no 3D layer stays
alive. Reduced motion: the gate is plain shade with Ganesh and शुभ विवाह, and the engine crossfades to the finished hero.
On wide screens the gate's शुभ विवाह stands in the eave's shade under Ganesh (never on the rangoli). Phones under 800 px
tall get a smaller rangoli and Ganesh so the hero's words never run onto the flowers.

## The page: the courtyard path (`T.page`, `T.scroll`)
We never leave the floor. The page background is the same seamless brick tile, aligned with the hero's floor, so the
courtyard continues under every section. Every block is "set down" on the bricks: it comes from just above the floor
(slightly larger, tipped back) and settles. A pair of lit diyos starts every stretch of the path.
- Hero: as you scroll away, the rangoli's rings turn against each other (scrubbed, transform only).
- The couple: a large photograph laid on the bricks, with fresh marigolds and roses on one corner. The line sits on its white border.
- The date: a brass thal heaped with the flower rangoli is the scratch cover (`petals()`; the hint is on a lime ribbon).
  Brush it aside to see the date engraved on the plate. The plate is round and its rim is hard to reach, so the date
  shows once about a third of the flower disc is brushed away (`easyBrush()`, measured inside the circle). The venue sits on a clay pill.
- The countdown: a disc of smooth red clay (rato mato) inside a ring of eight lit diyos. The ring turns with the scroll
  and each lamp stays upright.
- The families: two lime-washed tablets either side of the brass kalash.
- The programme: one tablet per ceremony, a brass thal with its day spinning onto it as it scrolls in; it zigzags on desktop.
- The photographs: polaroids dropped onto the bricks, one after another.
- The door: the card wording on a tablet, then the RSVP at the threshold under a marigold toran, then the wooden sill
  with brass studs.
- Past the door: the blessing and the names in the dark of the house, under a small rangoli whose rings turn.
Headings are lime letters on a band of smooth red clay. No text is ever set on bricks or flowers.

## Palette and type
Shade `#2A1008` (token `--rg-shade`), lime white `#FFF3DC` (`--rg-lime`, 13:1 on the shade), sindoor red `#A2321B`
(`--su-accent`, the one accent: buttons and headings on lime, 6.4:1 on the tablets), brass `#D9A54A` (`--su-gold`:
plates, rules and small labels on shade or clay only), red clay `#5C1F10`, lime tablets `#FFF6E6`, ink `#3A1C10` / `#6B3F28`.
Studio colour tokens: `--rg-lime`, `--rg-shade`, `--su-gold`, `--su-accent`.
Type: **DM Serif Display** (Latin names and headings), **Karma** (Devanagari names, headings, शुभ विवाह) and **Mukta**
(all reading text and Devanagari digits). Devanagari is never tracked or uppercased.

## Art (`public/themes/rangoli/art/`)
- `rangoli.webp` / `brick.webp`: the source paintings, kept as delivered.
- `ring0..3(.webp|-sm.webp)`: the rangoli cut into four concentric ring layers. First, a radial warp makes every ring
  share the outer circle's centre (the photograph was not quite overhead). Each cut falls inside a uniform band of
  marigold or rose, with a feathered overlap, so the rings can turn against each other without a seam. The rim layer
  carries a baked contact shadow. The centre diyo's wick is at 50% / 48.1% of the rangoli's square, and its flame is
  `flame()` from the shared kit.
- `whole-sm.webp`: the warped rangoli in one piece (the scratch cover).
- `floor.webp`: a seamless herringbone tile, made from exactly 4 x 7 periods of the brick photo. The lattice was
  measured by autocorrelation, and the edges were blended with the same phase, so it repeats with no visible seam.
- `grain.webp`: a fine lime-and-clay grain tile.
- Shared kit (`public/themes/_nepali/`): brass Ganesh (`hero.ganesh` slot, type "off" in `ganesh.show` to hide him),
  diyos with live flames, kalash, toran and fresh flowers.
- `public/themes/rangoli/thumb.jpg`: the opened hero, 1200×900.
Rebuild with `python src/themes/rangoli/tools/build_art.py` (Pillow, NumPy, SciPy), only if the source art changes.
