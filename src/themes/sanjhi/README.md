# Sanjhi (साँझी) · the cut-paper pop-up book at dusk

Page: `/sanjhi/` (demo) · `/sanjhi/?id=<invitation>` (studio data) · `?debug` exposes `window.__su` · `?debug&open` skips the gate.
Built on the card suite (`src/themes/_suite/`, `T.page`): this folder holds the gate, the opening, the page and the look.
Market: the Nepal site only (`market: 'np'` in slots.js; Krishna-tradition art). Brief: `docs/THEMES-NEXT-10.md` §9.

## Concept
Sanjhi is the stencil art of Mathura and Vrindavan: coloured powder sifted through hand-cut paper stencils. *Saanjh*
means dusk. The invitation is a hand-cut paper pop-up book read at dusk, and the dusk deepens page by page: golden
(the grove), rose (two homes), lilac (the lotus pond), moonlit (the river) and lamplit (the mandap).

## Opening (the gate)
The closed book: indigo cloth, a fine double gold rule, शुभ विवाह on top, the names and the date below. On its cream
paper plate lies a black Sanjhi stencil of two peacocks, lotuses and a lotus-petal border. Tap (the button, the quiet
link or the plate): coloured powder falls through the cut-outs and settles in three colours (warm flowers, peacock
blues, leaf greens), the stencil lifts away tipping back, the couple's initials appear in its empty circle, then the
cover opens (rotateX about the top spine on a phone, rotateY about the left spine on a wide screen) and page one's
paper layers stand up. The inside of the cover is a block-printed endpaper (swapped in past edge-on, so it never relies
on backface culling).

## Signature motion: the pop-ups (`T.scroll`)
Every section is a spread of the book (`.sj-spread`). Each spread's stage is pinned for 1.15 (phone) / 1.3 (wide)
screens and scrubbed: the chapter page (`.sj-leaf`: the coloured Sanjhi plate, "Page n" and the chapter's name) turns
over the spine, then 3-4 cut-paper layers rise out of the fold, back first (`rotateX` 88deg to 0, hinged on their
bottom edge; the toran band drops from the top), the dusk glow comes up, and the words settle on the sky. Then the
page under the pop-up (`.sj-sheet`, the same cream paper) scrolls on with the details. Transform and opacity only;
`will-change` only while the opening runs (`body.sj-moving`). Built with `gsap.matchMedia` so a phone/desktop switch
rebuilds the timelines.
1. Page one (hero): kadamba trees, two mango trees with peacocks, grazing cows, a lace toran band (and on a wide page
   two marigold swags with bells in the corners, never behind the words). Under it: the couple's photograph tipped in
   with paper corners, and the date under coloured powder (the scratch cover is the coloured Sanjhi plate).
2. Two homes (families): a far village, two houses facing each other, a lotus-lattice fence.
3. By the lotus pond (programme): a lakeside pavilion, pink lotuses, a lotus-leaf border; each ceremony on its own paper tag.
4. Moon over the river (countdown on the night sky, then the photographs tipped in): the ghats, a boat and a kadamba
   swing, reeds and ducks, a paper moon.
5. Under the mandap (card wording and RSVP): banana and mango garden, a cream paper mandap, brass kalash and lamps.
The book closes on the back cover: the plate, a line, the blessing, the names, the hashtag and the music.
Text is set only on the sky or on paper, never on the paper flowers.

## Reduced motion
`prefers-reduced-motion` or `?still`: the gate fades, every spread is shown open and at rest (no pins, no leaves:
`body.sj-still`), the words are visible.

## Palette and type
Dusk indigo `#2B2A49` (`--sj-dusk`), night `#17162C`, cream paper `#FBF2E2` (`--sj-cream`), saffron paper `#E7882A`
(`--sj-saffron`, the one accent: buttons with kohl text, the toran, kalash), rose `#E5A2B2`, leaf `#5C8A48`, kohl `#161414`,
gold rule `#D9B26A`, plum `#8E3F5F` (small labels on cream). Studio colour tokens: `--sj-dusk`, `--sj-cream`,
`--sj-saffron`, `--sj-rose`. Type: **Sarpanch** (names and headings, 32px and up, Latin and Devanagari) and **Mukta**
(everything else, all digits). Devanagari is never tracked or uppercased; `locl` stays off (base.css).

## Art (`public/themes/sanjhi/art/`)
All art is Canva AI (generate-image), generated as solid black papercut silhouettes on white in one session with the
same style words, exported at full size from the "Sanjhi art board" (copy of the user's art board design), then
coloured here by `build_art.py` (Pillow, NumPy, SciPy): keyed out with a soft edge, cropped to the ground strip (the
strip thinned to a fine paper tab), and coloured as one sheet of paper each (fibre texture, a lit top-left edge, a
shaded bottom-right edge, a soft contact shadow). Each layer has a wide file and a phone composition (`-m`: the
centre, or the two halves slid together over the empty middle). The stencil gives `stencil.webp` and the three powder
colour groups (`powder-warm|peacock|leaf.webp`), coloured region by region inside the stencil's cut-outs.
Originals are not committed. Rebuild: `python -I src/themes/sanjhi/build_art.py <raw-dir> [names...]`.
`public/themes/sanjhi/thumb.jpg`: the opened hero, 1200×900.
