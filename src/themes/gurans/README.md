# Phoolbari (फूलबारी) · slug `gurans`

Page: `/gurans/` · dev: `npx vite --port 5204 --strictPort` · debug: `/gurans/?debug` (`&open` skips the gate;
`window.__pb.open()`, `__pb.to(selector)`, `__pb.revealAll()`). The visible theme name is Phoolbari, but the slug stays `gurans`.

## Concept

A flower-garden invitation. The guest arrives at a decorated Nepali wedding gate: an arch of real roses, peonies,
hydrangea and eucalyptus, a marigold ladi along the inner edge, a curtain of jasmine strands with rose bands, a kalash
at each foot, and **शुभ विवाह** lettered in gold foil (Tiro Devanagari Hindi) on an ivory crest. A welcome board in
front carries the names, the AD and B.S. date, and the Open button.

**Signature motion (the only one):** Open → the board lifts away, the two halves of the jasmine curtain draw apart,
the paper behind fades, and the arch scales past the camera so you step through into the invitation. Transform and
opacity only; with reduced motion the gate simply fades.

After that the page scrolls normally (native scroll, no Lenis, no 3D). It uses soft paper with blush and sage, muted
gold hairlines, and one rose accent for actions. Type: Libre Caslon Display for names and headings, Crimson Pro for
body, Manrope for small labels, Tiro Devanagari Hindi for Nepali display and Noto Serif Devanagari for Nepali body.
The sections are:

1. **Welcome**: a rose spray, the names, a date block (AD, B.S., city) and the hero photo in a frame with roses on two corners.
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

Real flower photographs, cut out (rembg isnet/BiRefNet plus hand masks) and composed in Python (seeded and
reproducible) into: `gate-{wide,tall}`, `curtain-{l,r}-{wide,tall}` (positions in `gate.json`), `spray`, `corner`,
`posy` and `sprig`. Each comes in two sizes. Sources are listed in `flora-credits.js` and shown in the footer:

- Roses, eucalyptus and hydrangea: CC0, from Wikimedia Commons, StockSnap and rawpixel.
- Kalash: "Kalash puja in weddings" by Kashish1711, CC BY-SA 4.0.
- Marigolds and jasmine strands: cut from the library photos `marigold-macro` and `garland-jasmine-market` (credited
  in the library).

`paper.webp` is a paper texture generated in code.

## Verified

Python Playwright with the real GPU at 1440×900, 1024×768, 390×844 and 360×740, in English and Nepali, with the
demo and `?id=<client-slug>`. Checked: the gate, the opening frames, every section and the card modal. "Onwards"
times show for the client's events. The card modal locks the page and restores the scroll position. Reduced
motion works. Nothing overflows sideways at 360. The thumbnail uses the demo (no client photos or names).
