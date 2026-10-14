# Phoolbari (फूलबारी) · slug `gurans`

Page: `/gurans/` · dev: `npx vite --port 5204 --strictPort` · debug: `/gurans/?debug` (`&open` skips the gate;
`window.__pb.open()`, `__pb.to(selector)`, `__pb.revealAll()`). The visible theme name is Phoolbari, but the slug stays `gurans`.

## Concept

A flower-garden invitation. The guest arrives at a decorated Nepali wedding gate: a built ivory arch (painted wood
with a raised gold inlay, imposts and plinths, rendered with real bevel shading) dressed asymmetrically, the way a
decorator would: one generous cluster on the top-left shoulder, a smaller one at the right foot and a small accent on
the right shoulder. They use fresh blush, rose-pink, peach and red roses with marigold (sayapatri) and crisp green
leaves, with white only as a small accent. Light marigold ladis with a few jasmine strands hang in the opening from a
small marigold toran; each ends in a red rose or a marigold drop. A brass kalash stands at each foot, and
**शुभ विवाह** is lettered in gold foil (Tiro Devanagari Hindi) on an ivory cartouche on the crest. No flower sits
behind the crest. A small welcome board on a brass easel stands inside the opening, below the ladis (beside the arch
on short landscape screens). It carries the names, the AD and B.S. date and the Open button, so the whole arch, both
kalash and the opening stay visible, on phones too.

**Signature motion (the only one):** Open → the board lifts away, the two halves of the ladis draw apart, the paper
behind fades, and the arch scales past the camera so you step through into the invitation. Transform and opacity
only; with reduced motion the gate simply fades.

After that the page scrolls normally (native scroll, no Lenis, no 3D). It uses soft paper with blush and sage, muted
gold hairlines, and one rose accent for actions. Type: Libre Caslon Display for names and headings, Crimson Pro for
body, Manrope for small labels, Tiro Devanagari Hindi for Nepali display and Noto Serif Devanagari for Nepali body.
The sections are:

1. **Welcome**: a symmetric marigold toran swag (hung below the language and music buttons), the names, a date block
   (AD, B.S., city) and the hero photo in a frame with two different corner arrangements.
2. **The two of us**: two photos in different frames (gold-line mat, tilted print). Bride and groom portraits replace
   them when both are uploaded. Then the families and the full card wording in a modal (`openModal`).
3. **The programme**: one white card per ceremony with weekday, day number, month, B.S. date (`bsDateOf`, or the
   event's `dateBS`), title, time (`timeLabel`, so open-ended events read "11:00 am onwards"), venue with a map
   link, and dress (shown only when set). A couple photo in a blush passe-partout sits beside it on wide screens.
4. **Photographs**: balanced columns rotating through five frame styles (mat, print, line, blush, floral); lightbox.
5. **For our guests**: travel, stays and contacts. Empty blocks are hidden.
6. **RSVP** (core `rsvp.js`, hidden when `rsvp.enabled === false`) under a rose posy.
7. **Blessing**: the closing words, names, hosts, share link and credits.

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
oval vignettes: every sprite has its alpha eroded by 1px and lightly feathered, fringe colour decontaminated, and only
thin stems are faded where a photo clipped them. Anything clipped through a petal was dropped. The pieces are composed
in Python (seeded and reproducible; contact shadows are padded so no blur is ever clipped to a box) into:

- `gate-{wide,tall}` and `curtain-{l,r}-{wide,tall}` (positions, crest and opening in `gate.json`);
- `swag` (hero toran), `corner-a` and `corner-b` (floral photo frames), `branch` (programme), `posy` (RSVP) and
  `sprig` (card). Each comes in two sizes (`-sm` for 1x).

Palette rule (client, all themes): only fresh, celebratory blooms with crisp green leaves. There are no greyish,
dusty-mauve or ashy flowers and no large white masses (they read as funeral flowers); white appears only as small
accents. No text ever sits over or behind flowers.

Sources are listed in `flora-credits.js` and shown in the footer:

- Roses, spray roses and leaves: CC0, from Wikimedia Commons, StockSnap and rawpixel.
- Kalash: "Kalash puja in weddings" by Kashish1711, CC BY-SA 4.0 (toned to brass).
- Marigolds: cut from the library photo `marigold-macro` (credited in the library). Jasmine buds are drawn in code.

`paper.webp` is a paper texture generated in code.

## Verified

Playwright with the real GPU at 1440×860, 1024×768, 390×844 and 360×740 (plus 844×390 landscape), in English and
Nepali, with the demo and `?id=<client-slug>`. Checked: the gate, the opening frames, every section and the card modal.
Measured: the board never overlaps the ladis or the flowers, the swag never touches the top-right buttons, and the
whole gate fits one screen on phones. "Onwards"
times show for the client's events. The card modal locks the page and restores the scroll position. Reduced
motion works. Nothing overflows sideways at 360. The thumbnail uses the demo (no client photos or names).
