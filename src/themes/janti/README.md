# Janti (जन्ती) · walk with the groom's procession to the bride's house

Page: `/janti/` (demo) · `/janti/?id=<invitation>` (studio data) · `?debug` (`window.__su.at(t)`, `.finish()`, `.to(sel)`), `?debug&open`, `?still` (calm version).
Engine: `src/themes/_suite/suite.js` (`T.page`, `T.scroll`, `T.scratch`) and the shared Nepali kit `_suite/nepali.js`.
Everything for the theme is in `main.js` and `janti.css`.

## Concept
The janti: the groom's wedding procession, led by the Naumati Baja band (shehnai, dhol, cymbals, horn) and the red-and-gold
doli, winding through an old Newari street to the bride's house. Golden hour in the Kathmandu Valley: brick, carved wooden
windows, a pagoda, marigold bunting. Joyful, but clean: the painting carries the colour and everything you read sits on
cream paper inside carved dark wood with fine gold lines.

Palette (tokens on `body.theme-janti`): sindoor red `--jt-red #A3261B` (the one accent: the doli curtain, names, headings;
7.1:1 on cream), gold `--jt-gold #D9A847` (carving lines and ornaments only; `#7A5418` when gold is text on cream, `#F3DCA2`
on wood or red), carved wood `--jt-wood #3B2015`, dusk `--jt-dusk #1E120D` (the gate), cream `#FBF4E6`, page `#F6EDDD`.
The colour manifest in `slots.js` exposes `--jt-red`, `--jt-gold`, `--jt-wood` and `--jt-dusk`; all four visibly change the
opening and the hero (curtain and names, carving, the window frame, the dusk wash).

Type: **Yeseva One** (Latin display: names, headings, signboards, numerals), **Sura** (Devanagari display), **Mukta**
(all reading text, both scripts). Neither display face is used by any other theme. Devanagari is never tracked or
uppercased; `lang=ne` keeps the shared base rule that switches off `locl`.

## Signature motion: the band strikes up
The gate is the hero at dusk: the painted street under a dusk wash, a fresh marigold toran across the top, and a carved
Newari window whose torana holds the brass Ganesh. Its red doli curtain (velvet folds, gold butti, a weighted gold-fringed
hem, a tassel) is drawn. The procession waits just past the left edge, the band's shehnai player peeking in.
On tap (the music starts): the procession walks into the street with a stepping bob (band and doli bob out of phase), the
toran swings with the music, the dusk lifts to golden hour, and the curtain rolls up into its valance (the cloth scales
from the top while its hem keeps its own size) to reveal शुभ विवाह, the names and the date. About 3 s. Transform and
opacity only; `will-change` only under `body.is-opening`.

## The scroll journey: down the street (`T.scroll` → `walk()`)
Vertical scroll drives a horizontal walk (GSAP ScrollTrigger pin, scrubbed 1:1). Four planes, all transform-only:
the street painting far behind (slow, it crosses its whole width once, ending at the pagoda), the stops (walking pace),
brass Panas lamps with live flames and kalash in the foreground (1.3x, passing in front of the band) and the marigold
bunting overhead (1.12x, a short repeating strip moved modulo one tile). The janti walks along the bottom of the screen
with you: it steps only while you scroll.
The stops, in order:
1. **Signpost** "Walk with the janti": arrow boards that jump to each stop.
2. **The couple**: the lead photo in a carved window set in a brick facade.
3. **The doli**: pagoda roof, gilded poles, set down on a brick plinth. Its curtain is the scratch card (`paintCurtain`);
   underneath, the date (A.D. and B.S.), time and venue.
4. **Countdown** on a hanging shop sign under a brass temple bell that swings as you arrive.
5. **The families**: two hanging signs (bride's and groom's side) with a kalash between them.
6. **One hanging sign per ceremony**: date (A.D. and B.S.), time, venue and map, dress colours; "Order of the day" opens
   as a slip over the sign.
7. **Photographs**: a long brick facade of carved windows (every photo whole), lightbox.
8. **The bride's house**: a marigold toran, the sign, kalash and lamps at her threshold.
Hanging signs swing in as they come into view, the doli settles on its plinth. Posts, plinths and walls run down to the
ground behind the procession.

Then the page continues inside her house: the invitation wording with a red line-drawn Ganesh (calendar, share, full card,
travel/stays/contacts), the **RSVP inside a carved door** (torana with a kalash, lintel with the title, diyos with live
flames on the doorstep) and the blessing under a toran with two Panas lamps.

Fit and fallbacks: every stop must fit between the bunting and the procession. A stop up to 20% too tall is scaled to
fit; anything more, a screen under 500 px tall, `prefers-reduced-motion` or `?still` gives the **flat street**: the same
stops stacked vertically on cream under the painting, no pin and no parallax. Rebuilt on language change and width change.
`overflow: clip` on the street means keyboard focus can never scroll it sideways; focusing a link on an off-screen stop
brings that stop to the middle.

## Art
- `public/themes/janti/art/street(.webp|-sm.webp)`: the painted Newari street (hero, gate and the walk's far plane).
- `public/themes/janti/art/procession(.webp|-sm.webp)`: the Naumati Baja and the doli. The art walks left; the theme
  mirrors it so the band leads to the right, and splits it (static `clip-path`) into band and doli halves for the steps.
- `public/themes/janti/art/brick.svg`: a 240x120 brick tile (varied brick colours, warm mortar) for the facades and plinths.
- Shared kit (`public/themes/_nepali/`): `ganesh-brass` (the `hero.ganesh` slot default), `ganesh-ink` (invitation),
  toran, kalash, diyo and Panas lamps with live flames.
- Drawn in `main.js` (SVG): the torana, the doli roof, the temple bell. CSS: the curtain, carved frames, signboards.
- `public/themes/janti/thumb.jpg`: the opened hero at 1200x900.
