# Phoolbari (फूलबारी) · slug `gurans`

Page: `/gurans/` · dev: `npx vite --port 5204 --strictPort` · debug: `/gurans/?debug` (`&open` skips the gate;
`window.__pb.open()`, `__pb.to(selector)`, `__pb.revealAll()`). The visible theme name is Phoolbari, but the slug stays `gurans`.

## Concept

A flower-garden invitation. The guest arrives at a decorated Nepali wedding gate. On desktop it is a broad
basket-handle arch (about 70% of a 1440px screen, ~67% at 1920; a tall arch on portrait screens) of painted ivory
wood with a raised gold inlay, imposts and plinths, rendered with real bevel shading. A decorator has dressed it
generously but not symmetrically: the biggest cluster on the top-left shoulder spilling down the left pillar, a
fuller one at the right foot, and smaller ones on the right shoulder and the left foot. The flowers are fresh and
colourful: hot-pink, garden-pink, red and crimson roses, peach roses, red hibiscus and orange and gold marigold
(sayapatri), with plenty of crisp green leaves. Every bloom has a soft contact shadow, sizes vary, and blooms are
only rotated, never flipped, so nothing reads as a mirrored copy. A thick marigold toran with a rose at every drop
runs under the arch, and full ladis hang from it: double-bead marigold strings, rose garlands (roses between
marigolds) and a couple of jasmine strands as accents, each ending in a rose or marigold. A brass kalash stands at
each foot in front of the flowers (different size and dressing, not mirrored), and **शुभ विवाह** is lettered in gold
foil (Tiro Devanagari Hindi) on an ivory cartouche on the crest. No flower sits behind the crest. A small welcome
board on a brass easel stands inside the opening, below the ladis (beside the arch on short landscape screens). It
carries the names, the AD and B.S. date and the Open button, so the whole arch, both kalash and the opening stay
visible, on phones too.

**Signature motion (the only one):** Open → the board lifts away, the two halves of the ladis draw apart, the paper
behind fades, and the arch scales past the camera so you step through into the invitation. Transform and opacity
only; with reduced motion the gate simply fades.

After that the page scrolls normally (native scroll, no Lenis, no 3D). It uses soft paper with blush and sage, muted
gold hairlines, and one rose accent for actions. Type: Libre Caslon Display for names and headings, Crimson Pro for
body, Manrope for small labels, Tiro Devanagari Hindi for Nepali display and Noto Serif Devanagari for Nepali body.
The sections are:

1. **Welcome**: a full marigold toran with roses and three rosettes (hung below the language and music buttons), the
   names, a date block (AD, B.S., city) and the hero photo with flower corners top-left and bottom-right.
2. **The two of us**: two photos in different frames (gold-line mat with a bottom-left flower corner, tilted print
   with a top-right one). Bride and groom portraits replace them when both are uploaded. Then the families and the
   full card wording in a modal (`openModal`).
3. **The programme** (under a garland divider): one white card per ceremony with weekday, day number, month, B.S. date (`bsDateOf`, or the
   event's `dateBS`), title, time (`timeLabel`, so open-ended events read "11:00 am onwards"), venue with a map
   link, and dress (shown only when set). A couple photo in a blush passe-partout with a top-right flower corner
   sits beside it on wide screens.
4. **Photographs** (garland rule above the heading): balanced columns rotating through five frame styles (mat,
   floral, print, line, blush; two floral frames in every eight); lightbox.
5. **For our guests** (garland rule): travel, stays and contacts. Empty blocks are hidden.
6. **RSVP** (core `rsvp.js`, hidden when `rsvp.enabled === false`) under a rose posy.
7. **Blessing** (garland rule): the closing words, names, hosts, share link and credits. The closing photo, when
   there is one, has flower corners top-left and bottom-right.

Photos are never cropped: every frame takes the photo's own aspect ratio (from `w/h`, or measured once loaded).

## Slots (`slots.js`)

Images: `hero.photo`, `couple.first`, `couple.second`, `couple.bride`, `couple.groom`, `programme.photo`,
`album.1`–`album.8`, `close.photo` (all couple slots; repeats are skipped).
Texts: `gate.crest`, `gate.welcome`, `gate.line`*, `gate.open`*, `gate.quiet`*, `hero.kicker`*, `hero.line`*,
`couple.title`*, `couple.line`*, bride/groom labels, daughter/son of, `card.button`*, `card.title`,
`programme.kicker`, `programme.title`*, `programme.order`, `album.kicker`*, `album.title`*, `info.kicker`,
`info.travel`, `info.stay`, `info.ask`, `rsvp.title`*, `rsvp.send`, `close.kicker` (* = shared key).
The gate and the flower arrangements are theme art, not slots.

## Flower art (`public/themes/gurans/flora/`)

Real flower photographs, cut out with rembg (isnet/BiRefNet) from full-resolution sources. No rectangular crops and no
oval vignettes: every sprite has its alpha eroded by 1px and lightly feathered and its fringe colour decontaminated.
Every cut-out was checked at full size on a dark background; the white spray roses, the gypsophila (white mass and a
clipped edge) and the cream rose were rejected. The pieces are composed in Python (seeded and reproducible; contact
shadows are padded so no blur is ever clipped to a box, and anything reaching the canvas side is feathered) into:

- `gate-{wide,tall}` and `curtain-{l,r}-{wide,tall}` (positions, crest, opening and output scale in `gate.json`). The
  wide gate is 4640×3000 at source (an elliptical arch, half-width 1800, rise 1000); the tall one 1900×2700. Both are
  served with `w` descriptors and a `sizes` equal to the drawn stage width, and only the visible stage loads
  (`loading="lazy"` inside `display:none`).
- `swag` (hero toran), `corner-a` (TL), `corner-b` (BR), `corner-c` (TR) and `corner-d` (BL), four different photo
  corners pinned to the mat corner by their anchor fractions (the numbers in `.pb-fr__fl--*`), `divider` (programme
  divider and the garland rules above the album, guest and blessing headings), `posy` (RSVP) and `sprig` (card).
  Each comes in two sizes (`-sm` for 1x), except `sprig`.

The composer scripts are kept with the session art (`compose3.py` for the gate, `orn3.py` for the section florals).

Palette rule (client, all themes): plenty of flowers, all fresh and celebratory (marigold, red and pink roses,
hibiscus, peach, jasmine only as accents) with crisp green leaves. No greyish, dusty-mauve or ashy flowers and no
large white masses (they read as funeral flowers). No text ever sits over or behind flowers.

Sources are listed in `flora-credits.js` and shown in the footer:

- Roses, spray roses and leaves: CC0, from Wikimedia Commons, StockSnap and rawpixel.
- Kalash: "Kalash puja in weddings" by Kashish1711, CC BY-SA 4.0 (toned to brass).
- Marigolds: cut from the library photo `marigold-macro` (credited in the library). Jasmine buds are drawn in code.

`paper.webp` is a paper texture generated in code.

## Verified

Playwright with the real GPU at 1440×860, 1920×1080, 390×844 and 360×740 (plus 1024×768 and 844×390 landscape), in
English and Nepali, with the demo and `?id=sunil-srijana`. A script samples the alpha of every flower image under every
visible text line (gate and every scroll position): no flower is under or over text anywhere. No console errors and
nothing overflows sideways. The board never overlaps the ladis or the flowers, the swag never touches the top-right
buttons, and the whole gate fits one screen on phones. The thumbnail uses the demo (no client photos or names).
