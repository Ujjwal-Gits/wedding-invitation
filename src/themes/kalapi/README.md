# Kalapi (कलापी) · the peacock's monsoon

Page: `/kalapi/` (demo) · `/kalapi/?id=<invitation>` (studio data) · `?debug` (`window.__su.at(t)`, `.finish()`, `.to(sel)`),
`?debug&open`, `?still` (calm version). Market: Nepal only (`np`; Nathdwara pichwai, Krishna-temple tradition). Tier: Pro Max.
Engine: `src/themes/_suite/suite.js` (`T.gate`, `T.open`, `T.page`, `T.scroll`, `T.scratch`) and the Nepali kit `_suite/nepali.js`.
Everything for the theme is in `main.js`, `kalapi.css` and `slots.js`.

## Concept
Sanskrit *kalāpin*, "the one with the jewelled tail": the peacock that dances when the first rain clouds come. A
Rajput-miniature monsoon evening painted on one long pichwai cloth, which the guest walks along sideways.

Palette (tokens on `body.theme-kalapi`): monsoon teal `--kp-teal #0F3D41` (ground), cloth ivory `--kp-ivory #F3EAD6` (every
surface you read), kohl ink `#15201F`, antique gold `--kp-gold #C69A3E` (the one accent: rules, buttons; `#E8C987` as text on
teal, `#74541A` as text on ivory), miniature red `--kp-red #8E2A22` (borders only). The colour manifest exposes teal, gold,
red and ivory. Type: Cormorant Upright (Latin display), Imperial Script (names only), Jaini Purva (Devanagari display),
Mukta (all reading text and every Nepali digit; `locl` stays off through base.css).

## Opening: the peacock fans its tail (`T.open`)
Dark teal cloth, a double gold rule, one peacock seen from behind with its train folded, standing on a painted marble
parapet hung with marigold garlands; a quiet "Tap the peacock" cue (the whole scene opens on tap). Tap: 21 feathers rise
out of its back and rotate into the fan (centre first, 60 ms apart to each side), the train rattles once, the plain
teal eye of cloth opens in the middle and the names write themselves in (each line a transform-only wipe). Then the fan lifts
and shrinks into the crest on the first screen's red-and-gold border, the names settle (FLIP) into the first screen and the
bird walks away into the dark. About 4 s. `sizeGate()` keeps the fan on screen and the bird clear of the buttons on any size.
Reduced motion: the fan is already open; a plain fade.

## Signature scroll: the pinned pichwai (`cloth()`)
`#pichwai` pins and vertical scroll moves the cloth sideways (ScrollTrigger, scrubbed). Five folios joined by brocade seams:
I the palace terrace in the rain (the invitation on an ivory cartouche), II the lotus pond with cows (the couple under a
cusped jharokha arch, photo whole), III the register: one Ragamala-style miniature per ceremony (a crop of the paintings,
date A.D. and B.S., time, venue and map, dress, order of the day as a slip), IV the moonlit terrace (the countdown in the
full moon), V the rain-cloud band. Each painting is placed by its folio's focus (`--f`) and never leaves a gap; cartouches
sit in the painting's own coordinates (`--ox`, `--oy`), always on sky, cloud or plain cloth, never on flowers. A gold thread
on the lower border shows the way along, and each folio's label rides on that border (clear of the buttons at the top); on wide screens feathers drift along both borders at 0.9x and 1.1x. Too-tall
content is scaled a little; more, a screen under 540 px, reduced motion or `?still` gives the flat cloth (folios stacked,
each painting whole with its cartouche under it). Keyboard focus off to the side brings its folio to the middle.

## After the cloth (vertical)
Families as two facing red-bordered miniature panels (cusped arch windows: their portraits, or a painted peacock each, facing
each other); the date under a peacock-feather eye you scratch (`paintEye`); a monsoon diary of photographs tipped onto the
cloth (lightbox); the reply on an ivory cloth cartouche over a lotus spray; the blessing under a small fan with two diyos.

## Art (all Canva AI, made for this theme; Canva design "Kalapi art board")
- `public/themes/kalapi/art/pano-1|2|4|5(.webp|-sm.webp)`: the four painted folios (1920 and 1100 wide).
- `feather`, `peacock` (seen from behind, train folded), `lotus`: cut-outs with transparency.
- `ev-haldi|mehendi|janti|wedding|reception.webp`: one pichwai miniature per kind of ceremony (`kindOf()` in main.js; any
  other ceremony shows the palace in the rain).
- `hero-portrait.webp` (phone first screen) and `ground(-sm).webp` (the parapet under the gate's peacock): crops of pano-1.
- Drawn in code: the brocade hems and seams (SVG masks), the cusped arch, the moon, the feather-eye scratch cover.
- `public/themes/kalapi/thumb.jpg` (1200x900, the fan open), `gate.jpg`, `hero.jpg` (480x720).
