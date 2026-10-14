# Nimantrana (निमन्त्रणा) · the printed tri-fold card

Page: `/nimantrana/` (demo) and `/nimantrana/?id=<client>`.

## Concept
A traditional Nepali printed tri-fold wedding card, lying on a green silk table. The card is ivory card
stock with a real paper texture, a sindoor-and-gold border, a **Palpali Dhaka band** along the top and
bottom edges, and gold cusped arches in every panel.
- **Left panel:** ॥ श्री गणेशाय नमः ॥, Ganesh on a lotus seat (a real Basohli miniature, about 1730, public
  domain) between two brass diyos, and the mangal shloka.
- **Centre panel:** शुभ विवाह in Rozha One (sindoor with a gold-foil edge), निमन्त्रणा, the couple's photo in a gold
  arch frame (the photo is never masked: the arch is a crest above it), names, AD and B.S. dates.
- **Right panel:** four red-outlined tiles (श्री, ॐ, swastika, havan kunda) and the programme in brief.
- Decor on the table: marigold-strung brass bells from the top corners, a rose-and-marigold swag, a kalash
  with mango leaves and coconut, diyos and a hibiscus. Text never sits on flowers or images.

Palette: emerald silk table `#0F3B2F`, ivory card `#FBF6EB`, ink `#2A1712`, one accent on paper: sindoor `#A3161F`;
gold only for ornament. Type: Fraunces (Latin display, names), Source Serif 4 (reading), Rozha One (शुभ विवाह and
the tile glyphs), Laila (Nepali headings and names), Noto Serif Devanagari (Nepali reading). Never letter-spaced
Devanagari; `locl` off from base.css.

## Signature motion: the card unfolds
The closed card shows its cover (शुभ विवाह, names, AD + B.S. date, city, two real floral corners). Tap
**Open the card** (or "Open without music"): the bells swing once and ring, and the flaps unfold in real 3D
(CSS `perspective` + `rotateY`, custom GSAP ease, about 1.25 s each, overlapped), with Lambert-style shading on
each flap and a soft shadow sweeping across the middle panel. **Phones:** the card unfolds downward
(`rotateX`; the middle panel swings down carrying the folded bottom panel, which then swings down too), the
camera pulls back to show the whole card and settles on the top panel; the page then scrolls.
Only transform and opacity animate. At rest every transform is removed so text stays crisp.

## The journey (after opening)
Wide screens (≥ 900 px, height ≥ 620 px, not reduced motion): a GSAP ScrollTrigger pin moves sideways,
panel by panel (snap to each panel, no inertia): **Ganesh and the blessing → the two of us (names, parents,
two photos in gold jharokha arches) → the card wording → the programme** (one red-outlined card per ceremony:
AD + B.S. date, `timeLabel(e)`, venue + map, dress only if given; Add to calendar). Between panels, strands,
a bell and a kalash drift slightly slower than the card (desktop parallax only). If a panel would not fit
the screen height, the journey falls back to the vertical layout. Phones and reduced motion: the same
panels stacked vertically, no pin, no parallax. Then the album (lightbox via `openModal`), the reply card
(`core/rsvp.js`, same ids and JSON, honeypot) with travel/stays/contacts, and the closing blessing on the table
with credits. Headings and photos fade up once; body text never animates.

## Studio slots (`slots.js`)
Images: `card.photo` (couple, `{portrait:0}`), `card.deity` (Ganesh painting; replace with any deity or
blessing image), `couple.bride` / `couple.groom` (`{portrait:1}` / `{portrait:2}`, the bride's or groom's own photo
wins), `album.1`–`album.6` (`{portrait:3..8}`), then `config.gallery`. All shown whole, never cropped.

Texts: `gate.line`, `gate.open`, `gate.quiet`, `card.title`, `card.subtitle`, `card.line`, `card.button`,
**`faith.show`** (type `off` to hide Ganesh, both shloka and the four tiles; the left panel then shows the
salutation, request and hosts), `card.invocation`, `card.shloka` (Nepali box = the verse, English box = its
meaning), `tile.1`–`tile.4` (tiles 3–4 draw the swastika and havan kunda while they keep their default; any
other text replaces the drawing), `blessing.title`, `couple.title`, `couple.line`, `families.daughter`,
`families.son`, `words.title`, `prog.title`, `prog.more`, `gallery.title`, `rsvp.title`, `rsvp.send`.
Any single line set to `-` is hidden. Shared keys follow `slot-vocab.js`.

## Art
- Drawn in code (`art.js`): cusped arches, crest and jharokha canopy, Dhaka weave tile, the four tiles, brass bell,
  kalash, diyo (flame flickers gently; off for reduced motion), lotus marks.
- Textures (`tools/textures.py`): tileable paper and silk, generated procedurally.
- `tools/prep_art.py`: trims the Ganesh miniature, cuts out the CC0 hibiscus (rembg + cleanup) and copies the
  flower cut-outs from gurans, mala, sayapatri and dhaka into `public/themes/nimantrana/flora/`.
- Credits: `flora-credits.json` (Ganesh, hibiscus, roses, marigolds, leaves) plus `credits.json` for library
  photos, listed in the footer.

## Debug
`?debug` exposes `window.__nm` (`open()`, `seek(t)` into the opening, `finish()`, `to(selector)`).
`?debug&open` skips the gate. `?still` forces the reduced-motion path. `?debug&img.<slot>=…&txt.<slot>=…`
previews studio overrides (e.g. `txt.faith.show=off`).
