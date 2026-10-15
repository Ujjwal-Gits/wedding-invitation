# Mangal (मंगल) · the red-and-gold card, come alive

Page: `/mangal/` (demo) · `/mangal/?id=<invitation>` (studio data) · dev server on 5190.

## Concept
The classic sindoor-red and gold Nepali wedding card, built as a place you enter. Premium, simple and calm
(client round 5, `?id=sunil-srijana`): ivory handmade paper, a carved **Newar doorway** in red lacquer and gold
(two pillars with lotus capitals and bases, a lintel that runs past them, a cusped **torana** above with a round
gold **Ganesh medallion**), one marigold toran with a few roses across the opening, two brass bells, two lit
diyos on the step, a full-width carved beam with an even bead festoon along the top of the screen and a Palpali
Dhaka band underfoot. The closed door shows only "An invitation for you and your family" / "हजुरलाई सपरिवार
निमन्त्रणा" and the names: no dates, no side props.

Palette: ivory paper `#F8F1E3`, ink `#2C0C09`, sindoor reds `#8C1018` / `#6A0A12`, gold as metal
(`#D4A24C`, text gold `#F4D896`, 7.6:1 on red). Type: **Yatra One** (शुभ विवाह in gold foil,
Nepali names and headings), **Cormorant Garamond** 600 (Latin names and headings), **Mukta** (all reading text,
both scripts; dates always in Mukta). No script faces; Devanagari never tracked or uppercased.

## Art (no AI images)
- `art.js` draws the ornament as SVG at the exact pixel size shown: the beam and festoon (`beamSVG`, an even
  number of loops so it is symmetric edge to edge), the doorway (`frameSVG`: pillars, lintel rosettes, torana
  via `cuspPath` like nimantrana's arches, a halo clipped to the torana), the rectangular leaves (`leafSVG`),
  the medallion ring (`medalSVG`), bells, diyos, the Dhaka tile, the temple crown, dividers and petals.
- Ganesh: `public/themes/mangal/ganesh-card-1000/500.webp`, supplied by the owner; white background removed (watercolour wash kept, fading to transparent).
  a golden throne (E. A. Rodrigues, 1842, Wikimedia Commons; credited in `flora-credits.js` only), the white paper
  keyed out (rembg checked). Head and
  shoulders in the torana medallion; inside, shown large with a glow, then faded to a 16% watermark behind the words.
  Slot `hero.ganesh`; type "off" in `ganesh.show` to hide it (the inside then shows ॐ from `hero.symbol`).
- Raster decor: `decor/swag*.webp` (the toran and the closing swag), `corner-*`, `paper.webp`
  (made by `tools/decor.py`; flowers credited in `flora-credits.js`).

## Signature motion: the doors open
Tap the latch (or "Open without music"): the plaque fades, the bells sway, the latch gives (2.5°), then the heavy
leaves swing to 80° over about 2.4 s on a custom ease (slow to start, long soft settle) while warm light pours
through the widening gap (`.mg-light`, `.mg-light__gap`) and spills onto the threshold (`.mg-spill`). The glare
settles to a glow as the camera walks in through the opening (`walkIn()`: layers at their own depth scale by
D / (D - c) about the vanishing point; `throughScale()` finds when every screen corner is inside the opening).
The welcome line drifts in, then the card settles group by group. Transform and opacity only; 60 fps on the GPU
(median frame 16.7 ms at 1920 and 390). Reduced motion: a crossfade. A safety timer always finishes the sequence.

## Inside and the scroll
1. **Hero (inside the doors):** Ganesh first, then ॥ श्री गणेशाय नमः ॥, शुभ विवाह, the names and `hero.blessing` over
   his watermark. Then **the couple** (`couple.lead`) in the gold temple-arch frame, in its own section.
2. **The date:** a gold scratch card (canvas, pointer and touch; reveals at 60% cleared) over the ceremony's
   weekday, AD and B.S. date (B.S. leads in Nepali), `timeLabel` and venue; "Tap to reveal" button for keyboard,
   screen readers and reduced motion. Then **Counting down to the big day / शुभ घडी आउन बाँकी**: days, hours, minutes,
   seconds to the ceremony start (the event on the wedding day), Nepali digits in NE.
3. **The two of us:** every other photo, uncropped, in a plain ivory mat with one gold line, moving right to
   left: pinned and scrubbed by ScrollTrigger on desktop, an endless slow marquee on phones and tablets, a
   swipeable row with reduced motion. Tap a photo for the lightbox.
4. **Families** (red card framed in gold, marigold toran, corner sprays, a brass kalash with mango leaves and coconut
   between the two families), 5. **the card wording** (centred), 6. **the programme**
   (`timeLabel`, AD + B.S.), 7. **RSVP** (`core/rsvp.js`), 8. **the blessing** between two lit diyos under a
   full-width marigold garland, Dhaka band, Made with Nimtto.

## Studio slots (`slots.js`)
Images: `hero.ganesh`, `couple.lead` (portrait 0), `couple.pair.1–2`, `couple.row.1–3`, `gallery.1–6` (the photo
strip, in that order, then the invitation gallery), `families.bride` / `families.groom`. Texts: `gate.line`,
`gate.open`, `gate.quiet`, `ganesh.show`, `hero.symbol`, `hero.invocation`, `hero.title`, `hero.blessing`,
`date.kicker`, `date.title`, `scratch.hint`, `scratch.button`, `count.title`, `couple.title`, `couple.line`,
`families.*`, `card.*`, `prog.*`, `rsvp.*`. Religious marks are optional ("off" / "-").

## Debug
`?debug` exposes `window.__mg` (`open()`, `finish()`, `at(t)` on a mixed opening, `seek(deg)`, `to(selector)`, `layout()`);
`?debug&open` skips the doors; `?still` forces the reduced-motion path; `?lang=ne`.

## Mix (docs/MIX.md)
Gives its gate (the doorway: `gate.js`, from `doorway.js`; it ends with the doorway full of warm light, fading onto
the page) and its first screen (the red card: `hero.js`, from `card.js`); hosts other themes' gates and first screens
(with another first screen, its own doorway runs as `gate.js`). Under another gate the red card is there from the
start, seen through it; `--mx-dusk` (on `body.theme-mangal`) offers a foreign gate a dark-red dusk to stand in.
Module-only CSS: `mix.css`. Mahal and Rajdwar no longer share its `mg-` classes on any page that mixes.
