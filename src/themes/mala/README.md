# Mala (माला) · "Garland"

Port 5203 · `http://localhost:5203/mala/` · debug: `?debug&open` (also `&lang=ne`, `&still` for the reduced-motion version).

## Round 6 (lavish, colourful mandap)

Round 5 replaced the grey, white and dusty-mauve rose heaps, which read as funeral flowers. The client did not want
fewer flowers, though: they want a lavishly decorated Nepali wedding stage, all in fresh colour (marigold, red and
pink roses, hibiscus, peach, with green leaves). So the silk drapes and kalash stay and the flowers are now abundant:

- **Drape (gate and floral stage):** the sindoor silk valance over ivory net with a gold zari hem. Every gather
  carries a full cluster (a fan of leaves, two big marigolds, a gold marigold, red and pink roses and a hibiscus or
  peach rose), and every swag dips into a posy (a rose or hibiscus at the heart, marigolds and leaves round it).
- **Strings:** fuller and thicker marigold strings: four at each side on desktop (three on phones), one under every
  gather and one from every swag posy. They are measured against the text block, the photo, its corners and the kalash
  (`hangStrings()` in `main.js`): cut short above anything they would reach, and dropped if only a stub would remain.
- **Kalash:** each brass kalash carries a fuller dome (marigold, red and pink roses, hibiscus, peach) and stands in a
  low bed of fresh flowers and leaves on the floor. The two are composed separately (no mirrored copies).
- **Photo corners:** four fuller corner arrangements (roses, marigolds, hibiscus, peach roses and leaves trailing
  along both edges). Hero: top-left and bottom-right. Floral stage: top-left and bottom-right. Travel photo:
  top-left and bottom-left. RSVP card: top-right and bottom-left. Corners are pinned to the frame's corner
  (`.ml-corner--*`, sized in `cqw` of the frame).
- On "Open" the gate scales and fades (the one signature motion; reduced motion simply fades).
- Palette: one accent (sindoor). Flowers are saturated marigold orange and yellow, red, crimson and rose-pink roses,
  red hibiscus and a little peach, with deep green leaves. No white or grey masses, and no text over or behind flowers.

**Decor art:** `public/themes/mala/decor/*.webp` (drape, drape-sm, kalash-a/b, corner-tl/tr/br/bl, each with `-sm`)
and `tex/drop.webp`, made by `tools/decor.py` (`python tools/decor.py <repo> public/themes/mala/decor`). The silk and
the brass are rendered procedurally (fold shading, environment-lit brass on a lathe profile); the roses and marigold
are the Wikimedia Commons cut-outs in `public/themes/dhaka/flowers` (credited in the footer, CC BY / CC BY-SA), the
hibiscus (`tools/cutouts/hibiscus.webp`, CC0, WordPress Photo Directory) and the leaf (`tools/cutouts/leaf-mango.webp`,
one clean leaf cut from "Leaves of Hopea odorata", CC BY-SA 3.0) sit next to the script. Every cut-out was checked on a
dark background at full size; the old single-leaf photo was dropped because of its hairy rim and white glare. Light
comes from the upper left everywhere and every bloom casts a soft shadow down-right. Frame-corner anchor fractions
printed by the script are the numbers in `.ml-corner--*`; image sizes are in `DIM` in `main.js`; the drape's height
(h/W) is `--drape-h`.

## Concept

Real flower garlands are the frame of the invitation: marigold (सयपत्री) strings and varmalas with rose bands,
hanging on white lokta-style paper. The garlands are photographs, not drawings. Hanging garlands
were cut out of CC-licensed market photos and straightened in Python, then made to tile so they can run along any
curve. In the page each garland is a verlet rope (gravity, damping, bending stiffness) skinned with those strands in
WebGL (`garland.js`, three.js), with a soft paper shadow. Garlands sway gently with scroll speed and when a finger or
pointer moves through them, then go still after a few idle seconds and stop drawing.

Palette: lokta white `#FBF8F1` with fibre texture, deep leaf ink `#1D231B`, one sindoor accent `#A3162B` (buttons,
map links), marigold only in the flowers. Type: Young Serif (names, headings), Laila (Devanagari display),
Hind (Latin body), Mukta (Devanagari body; Hind's Devanagari digits render as Latin figures, so it is not used for Nepali).

## Signature motion: the Swayambar

A pinned scene (about 1.6 screens of scroll). Above the bride's and the groom's portraits, each garland hangs from a
pair of hands: a yellow-and-orange marigold garland on her side, a deep orange one on his. As you scroll, both are lifted and
carried across. Her garland passes in front and grows slightly nearer, his passes behind. They
swing on real rope physics and settle on the other side. **The garlands never touch the photo frames.** A
marigold garland draped on a framed portrait reads as a memorial (shraddha) photo in Nepal, so the theme avoids it
everywhere. Reduced motion: the exchange is shown in its final state and nothing sways.

## Sections

1. Gate: the dressed mandap (silk valance, marigold strings, two kalash), names, date, hosts, "Open the invitation" /
   "Open without music".
2. Hero: the couple's photo on a white mat with two floral corners. Names, AD + B.S. date, city.
   Then the floral stage (main ceremony) after the families: drape, strings, the photo with two corners between the
   two kalash.
3. Families: one line, bride and groom with parents and home, "Read the invitation card" (modal via `openModal`).
4. Swayambar (signature).
5. Programme, "When & where": per ceremony, the weekday and a big day number, then the name, the AD date with the B.S.
   date (`bsDateOf(e.start, e.dateBS)`), the time, the venue with a map link, and the dress swatches. The wedding has an
   "Order of the day" disclosure.
6. "The two of us": couple photos hang on threads from a marigold rope and swing as their own little pendulums.
7. Getting there: a calm view of Nepal (laligurans under Annapurna South) with two flower corners, travel note,
   stays, contacts.
8. Album: uncropped masonry of the couple's album slots and the gallery, with a lightbox (`openModal`).
9. RSVP (`core/rsvp.js`), calendar and share, with the varmala hanging beside the form.
10. Blessing, names, credits.

## Slots (`slots.js`)

Images: `hero.photo` (couple), `line.1`–`line.3` (couple, photo line), `swayambar.bride` (bride, shared
`rite.swayambar`), `swayambar.groom` (groom), `album.1`–`album.6` (couple), `travel.photo` (scene, shared
`place.mountain`, default `rhododendron`).
Texts: gate (`gate.from`→`gate.line`, `gate.open`, `gate.quiet`), hero (`hero.kicker`, `hero.line`), families
(`intro.line`→`couple.line`, labels, `intro.card`→`card.button`), `card.title`, `line.title`→`couple.title`,
`sway.title`/`sway.line`→`rite.swayambar.*`, programme (`days.kicker`, `days.title`→`events.title`, `days.order`),
travel labels, album (`album.kicker`/`album.title`→`gallery.*`), RSVP (`rsvp.title`→`reply.title`, `rsvp.send`).
Everything else comes from the invitation data. Couple slots always use the couple's own photos. The garlands and the
paper are fixed theme art.

## Assets and licences (`public/themes/mala/`)

| file | made from | licence |
|---|---|---|
| `tex/rope-orange.webp`, `tex/rope-alt.webp`, `tex/rope-alt2.webp` | single strands cut out of "Marigold garlands, Pak Khlong Talat flower market Bangkok" by Gzzz (library slug `marigold-garland-alt`) | CC BY-SA 4.0 (derivatives shared alike) |
| `tex/band-rose.webp` | "Garlands in Indian flower market" by Elvina Goves, WordPress Photo Directory (added as `garland-jasmine-market`) | CC0 |
| `tex/varmala.webp` | "A garland made of yellow-orange marigold (Jamanthi) flowers" by Balu B, WordPress Photo Directory (added as `varmala-marigold`) | CC0 |
| `paper.webp` | generated (noise + fibres) for this theme | n/a |
| `thumb.jpg` | screenshot of the demo gate | n/a |

Cut-out method: the gaps between neighbouring strands are found as minimum-energy vertical seams (dark gaps, no
flower colour). The strand is colour-keyed inside its seams, edges are defringed, and the result is straightened on its
centre line. The two ends are then crossfaded with premultiplied alpha so the strand tiles. The varmala uses a rembg
(isnet) mask with a colour key and wood removal. All three source photos are in `art-src/photos/credits.json`, so they
appear in the footer credits along with an extra line naming them as the garland sources.

## Known gaps

- There is no dubo (Cynodon) grass garland. No usable photograph could be cut out cleanly, and a drawn one would
  look fake next to the photographic flowers.
- Without WebGL a 2D-canvas fallback draws the same ropes as rotated slices. It works but looks rougher.

## Verified (round 6)

Playwright with the real GPU at 1440×860, 1920×1080, 390×844 and 360×740, English and Nepali, demo and
`?id=sunil-srijana`: the gate and every scroll position. A script samples the alpha of every flower image (drape,
kalash, corners) under every visible text line: no flower is under or over text. No console errors, nothing
overflows sideways. The thumbnail is the demo gate.
