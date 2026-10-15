# Pardaa (पर्दा) · red velvet curtains open once on a Nepali mandap

Page: `/pardaa/` (demo) · `/pardaa/?id=<invitation>` (studio data) · `?debug` (`window.__su.at(t)`, `.finish()`, `.to(sel)`), `?debug&open`.
Engine: `src/themes/_suite/suite.js` (`T.page`, `T.scroll`, `T.scratch`) and the shared Nepali kit `_suite/nepali.js`.
Everything for the theme is in `main.js` and `pardaa.css`.

## Concept
The red Nepali wedding card Nepali families love, done cleanly. The page is ivory paper with sindoor red `#8E1B1B` and antique
gold (`#B88A3E` for rules; `#7A5520` gold as text on ivory, `#EDCF8A` gold on red). It uses thin gold rules, a lotus crown
and a Dhaka-diamond rule on every heading, square corners and plenty of white space. Type: **Playfair Display** (names,
headings), **Eczar** (all Devanagari display), **Mukta** (reading text). Devanagari is never tracked or uppercased.

## Signature motion: the curtains open, once
The gate shows a pair of closed deep-red velvet curtains with gold zari and a tasselled valance (`silk-l/r`). Each half carries its own
valance, and on wide screens the panels repeat outward from the gold seam. In front sit Ganesh in an ivory medallion,
शुभ विवाह and the names in gold on a soft dark-red vignette. On tap, the halves draw apart and gather toward the outer edges
(translateX, a scaleX gather and a slight sway that settles). Warm light rises behind them, marigold and rose petals fall, and
the hero is revealed. Nothing from the gate remains afterwards.

The hero is the mandap (`mandap.webp`) framed by the same curtains tied back with gold ropes (`tied.webp`, split into two halves that
tuck off-screen on phones). On wide screens a mirrored strip of the scalloped valance (`tied-band.webp`) fills the gap
between the two halves. A fresh marigold toran hangs under the valance. Live flames (kit `flame()`) burn on the painted agni
kunda, and Panas lamps with real flames stand at either side. The mandap is sized by `ready()` so the hero fits one screen.

## Sections
1. **Couple:** the photo in a slim double gold line shaped like a mandap (ogee) arch: an SVG mask on the photo and non-scaling
   gold lines.
2. **Date:** a scratch card. The cover is a red silk envelope with a gold flap line and a gold wax seal stamped शुभ, painted by
   `paintSilk`; scratching it opens to an ivory card (A.D. in English, B.S. in Nepali).
3. **Countdown:** four slim red columns in the mandap-arch shape, with an inner gold line, each topped by a diya whose flame
   flickers while on screen.
4. **Families:** two columns either side of a vertical gold line with a brass kalash at its middle. The **ganthi bandhan** sits
   underneath, full-bleed edge to edge, rising in 3D with one line.
5. **Ceremonies:** one panel per event, themed by id or title. Mehendi is henna green, Haldi marigold yellow, the wedding
   sindoor red, the reception ivory-gold, and anything else takes the mandap colours. Each panel has its vignette, date (A.D. and
   B.S.), time, venue and map, dress colours and the order of the day. The panels alternate sides on desktop and stack on
   phones.
6. **Photos:** masonry with thin gold frames and the lightbox.
7. **Card wording** with the full-card button. **RSVP** on an ivory card with a red header band.
8. **Closing:** the blessing under a full-width marigold toran, with a Dhaka-weave band.

Scroll is calm. Each piece rises with a slight rotateX tilt that settles flat, the ceremony vignettes lift in 3D, and the
mandap and curtains have a slow parallax. There are no curtain sweeps and no pinning. Under reduced motion the opening is the
engine's crossfade, with no tilt, petals or flicker.

## Art
- `public/themes/pardaa/art/`: `silk-l`, `silk-r`, `tied`, `mandap`, `haldi`, `mehendi`, `sindoor`, `reception`, `ganesh`
  (`.webp` + `-sm.webp`). All are Canva AI, generated for this theme.
- `tied-band.webp`: the valance strip, made by `tools/band.py` from `tied.webp`.
- Shared kit (`public/themes/_nepali/`): Panas lamps, flames, kalash, toran, ganthi, Dhaka weave.
- `public/themes/pardaa/thumb.jpg`: the hero at 1200x900.
