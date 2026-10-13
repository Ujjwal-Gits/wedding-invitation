# Kham (खाम) · the envelope

Page: `/kham/` · dev: `npx vite --port 5201 --strictPort` → http://localhost:5201/kham/

## Concept
A luxury wedding-stationery suite, experienced on screen. Clean, quiet and made for reading:
"when is what" is the hero of the page. Everything that looks like paper is made in code,
with no photographs of paper and no AI images:

- **Lokta paper** (`paper.js`): tileable handmade-paper textures from periodic value noise. Four layers,
  each something you can see on real lokta: a toothy surface lit from the top left, cloudy pulp formation,
  long fibres in every direction, and rare bark flecks. One height field gives three papers
  (page `#F7F3EB`, envelope `#F0E8DA`, card `#FCFAF5`) plus a sindoor liner with a tone-on-tone lozenge lattice.
- **Deckled edges**: SVG masks generated for each card and print at its exact size (kept fitted by a ResizeObserver).
- **Wax seal** (`art.js`): drawn as a height map (spread wax, a raised rim, the pressed disc, a beaded ring and the
  endless knot) and lit with `feDiffuseLighting` + `feSpecularLighting`, so it reads as sindoor wax.
- **Endless knot (श्रीवत्स)**: a 4×4 interlaced lattice turned 45°, with corner ears and side loops,
  alternating over and under at every crossing. Used on the seal, the card, and as the section ornament.
- **Blind-embossed botanicals**: generated sprigs (tapering stem, alternate leaves, five-petal blossoms)
  embossed with an SVG lighting filter, with small vector pearls on the blossoms (after refs 7–8).

Palette: ivory paper, ink-brown type (`#2A1C15`, 14:1), one accent: sindoor (`#9A1B1F`, 7.4:1), used for the seal,
the liner, the knot, the शुभ विवाह title and small labels. Type: **Newsreader** (Latin serif, names and reading),
**Instrument Sans** (labels), **Laila** (Devanagari display: शुभ विवाह, names, titles) and **Noto Serif Devanagari** (Devanagari reading text); never letter-spaced or uppercased. (Eczar was tried and dropped: under `lang="ne"` it shapes र्य as an eyelash-ra.) No script faces.

## Signature motion: the envelope opens
The envelope fills the screen, seal in the middle (like ref 13, but with a shaded wax seal, embossed sprigs
and a debossed score line). Tap the seal (or "Open without music"):
1. the seal is pressed and **cracks along the flap edge**: the upper half stays on the flap, the lower half on the pocket;
2. the camera **pulls back** from the paper while the **flap lifts in 3D** (CSS `perspective` + `rotateX`), shaded by a
   Lambert term as it turns; past 90° it passes behind the card and shows its sindoor liner;
3. the folded card is **drawn out upward**, clear of the pocket, and the envelope **dissolves into the page**; the card settles
   and **unfolds** in place (its cover panel rotates up on the fold, with a soft crease and shading). On wide screens the
   couple's print slides out from behind the card.

The unfolded card *is* the top of the page; nothing is swapped. Everything after it is quiet: headings and prints
fade up once, no parallax, no animation on body text. Reduced motion (or `?still`): no camera move and no 3D,
tapping the seal shows the open card at once. Only transform and opacity are animated (the layers are rasterised
once at the gate scale with `will-change`, so they stay crisp while the camera pulls back).

## Sections
1. **The card** (hero): ॥ श्री गणेशाय नमः ॥, the knot, **शुभ विवाह** (Laila, sindoor), the hosts; then the names
   (Newsreader, shrunk to fit at most two lines), the date in AD and B.S. (B.S. first in Nepali), one line of
   invitation, the city. Below it: "Read the full invitation" and a cue to the programme.
2. **The two of us**: the couple's photos as mounted prints with deckled edges, whole and uncropped.
3. **The programme** (the hero of the page): one deckle-edged sheet; each ceremony is a row with a big date block
   (weekday, day, month/year, and the other calendar: B.S. in English, AD in Nepali, where the big day is the B.S. day),
   the ceremony name, one line, then Time / Venue + Map / Wear (with colour swatches), and the order of the day when
   the event has `rituals`. Below: Add to calendar, and a disclosure with travel, stays and contacts.
4. **Families**: bride's and groom's full names, "daughter of / son of", parents, homes; portraits when both exist.
   "Read the full invitation" opens the full card wording (shloka, salutation, body, request, date, signoff).
5. **A few more**: album slots, then the invitation gallery (people first), as prints in columns; lightbox.
6. **Kindly reply**: a reply card using `core/rsvp.js` (same ids, same JSON to `rsvp.endpoint`, honeypot, validation).
7. **Blessing**: the closing line in Nepali and English, names, hashtag, credits.

B.S. dates come from the shared `bsDateOf(iso, event.dateBS)` in `core/i18n.js`; an event's `dateBS` wins.
The card dialog and the lightbox open through `core/modal.js` `openModal` (`data-lenis-prevent`): only the dialog
scrolls and closing returns to the same place.

## Studio slots (`slots.js`, read through `useSlots`)
Images (all shown uncropped, as prints):
- `hero.print` (couple, `{portrait:0}`): slides out with the card; beside it on wide screens, first print on phones.
- `prints.1`–`prints.3` (couple, `{portrait:1..3}`): "The two of us". Repeats and empties are skipped.
- `families.bride` / `families.groom` (bride/groom): shown only when both have their own photo.
- `album.1`–`album.6` (couple, `{portrait:4..9}`), followed by `config.gallery` (max nine in all).

Texts (bilingual; *shared key* in italics): `gate.line` (*gate.line*), `gate.open` (*gate.open*), `gate.quiet`
(*gate.quiet*), `card.invocation`, `card.title` (*hero.kicker*; the Nepali is always shown large, the English as a
small caption in English mode), `card.line` (*hero.line*), `card.button` (*card.button*), `prints.title`
(*couple.title*), `prints.line` (*couple.line*), `prog.kicker`, `prog.title` (*events.title*), `prog.order`,
`prog.more`, `families.title`, `families.bride`, `families.groom`, `families.daughter`, `families.son`,
`album.title` (*gallery.title*), `rsvp.title` (*reply.title*), `rsvp.send`.

Invitation data comes from the normal studio sections: names, full names, parents, homes, hosts, dates
(`weddingDate`, `weddingDateBS`), city, events (`title`, `blurb`, `start`, `end`, `venue`, `mapQuery`, `dress`,
`rituals`, optional `dateBS`), card wording, gallery, travel/stays/contacts/livestream (https only), RSVP, closing.

## Debug
`?debug` exposes `window.__kh` (`open()`, `seek(t)` to any moment of the opening, `finish()`, `to(selector)`).
`?debug&open` skips the envelope. `?debug&img.<slot>=<slug>&txt.<slot>=<text>` previews a studio override.
`?still` forces the reduced-motion path.
