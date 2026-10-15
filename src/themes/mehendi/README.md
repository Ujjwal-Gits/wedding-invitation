# Mehendi (मेहन्दी) · henna on ivory, hands joined

Page: `/mehendi/` (demo) · `/mehendi/?id=<invitation>` (studio data) · `?debug` exposes `window.__su` · `?debug&open` skips the gate.
Built on the card suite (`src/themes/_suite/`): this folder only holds the gate, the opening, the hero, the ornaments and the look.

## Concept
After the Canva card "Shrushti AND Darsh": warm ivory paper, the groom's hand holding the bride's hennaed hand coming in
from the top edge, a small henna Ganesh, the names in a bold script in deep henna red with a small-caps "and" between,
the date in spaced small caps, a lot of white space and fine henna line ornaments in the corners. Henna is the shared
Nepali mehendi night; the Nepali touches are शुभ विवाह on the gate, the B.S. date in Devanagari under the A.D. date,
a Dhaka (ढाका) diamond-chain line as the divider and ॥ श्री गणेशाय नमः ॥ under Ganesh.

Hero: the card itself, full screen on phones and on a warmer ivory table on desktop (container units, so it is one
composition from 360x740 to 1440x900). As you scroll away the joined hands tilt back in 3D and Ganesh drifts slowly.

## The page: the henna trail (`T.page`, `T.scroll`)
One henna vine runs down the whole page and draws itself as you scroll (scrubbed `stroke-dashoffset`), like a cone.
`vine()` builds one SVG segment per section from the real layout (leaves and paisleys placed along the path with
`getPointAtLength`; they open as the line passes them), so only a small path repaints, never one page-tall layer.
Sections sit alternately left and right of it like a story. Each block marked `data-bud` gets a tendril and a bud
that blooms when the vine reaches it. Phones: the vine runs down the left edge and everything stacks to its right.
- The couple: one line of words on one side, the photograph in a henna arch under a lotus on the other.
- The date: a henna-drawn hand; the round mandala in its palm is the scratch cover (`hennaPalm`, canvas: skin
  tone, lattice band, filled petals, paisleys, a cream ribbon carrying the hint). Scratch it to reveal the date.
- The countdown: four henna circles; each ring shows how much of its unit is left (`rings()`, CSS transition).
- The families: a mandala in two halves that close together as you scroll (left/right on desktop, top/bottom on
  phones), the bride on one half and the groom on the other. The vine runs through its centre.
- The programme: henna-bordered cards zigzagging along the vine, then calendar, share and travel details.
- The photographs: polaroids on a woven ivory cloth; each comes in tilted in 3D and settles as it enters.
- The card wording and the RSVP (a cream card with four henna corners) on either side of the vine.
- The end: the vine curls into a henna flower above the blessing and the names.
Reduced motion: the vine is fully drawn, every bud open, nothing moves.

## The Nepali wedding (shared kit `_suite/nepali.js`, Canva AI paintings)
- The bond: a SINDOOR DAAN section (`#bond`, slots `bond.kicker` / `bond.line`) after the families. The painting rises
  in gentle 3D as the vine reaches it, and a henna-red sindoor trail with powder dots runs beside the vine there.
- Brass diyos with live flames stand at the tendril ends in the families, sindoor and programme sections
  (`data-diyo`); each lamp appears and its flame catches when the vine arrives, one after another.
- A brass kalash sits in the centre of the families' mandala as its two halves close.
- A fresh marigold toran hangs across the top of the RSVP card; a Palpali Dhaka band closes the page.

Palette: ivory `#FBF6EE`, cream cards `#FFFDF8`, henna `#7A2E1B` (10:1 on ivory, the one accent), terracotta `#B9774A`
(ornament lines only, never text), ink `#3A2219` / `#6B4636`. Type: **Allura** (Latin names and headings),
**Marcellus SC** / **Marcellus** (small caps, dates, numbers), **Tillana** (Devanagari names, headings, शुभ विवाह),
**Mukta** (all reading text and Devanagari digits). Devanagari is never tracked or uppercased.

## Art
- `public/themes/mehendi/art/hands(.webp|-sm.webp)`, `ganesh(.webp|-sm.webp)`: Canva AI, generated for this theme
  (transparent webp). Ganesh is the `hero.ganesh` slot; type "off" in `ganesh.show` to hide him.
- Everything else is SVG drawn in `main.js`: the mandala (ten rings: lens petals, lotus petals, paisleys, scallops and
  bead rings, built by rotation), the Dhaka line, the henna corner (quarter rosette, scalloped band, leafy vine), the
  lotus on the photo frame, the flower between the families, the small crest on the card and the closing.
- `public/themes/mehendi/thumb.jpg`: the sindoor daan on the henna trail, 1200×900.

## Signature motion: the henna draws itself
The gate is plain ivory with the mandala faint as a pencil guide (15%). On tap (button, quiet link or the mandala) the
henna is laid ring by ring from the centre outward with `stroke-dashoffset` (`pathLength="1"`), petals one after another
around each ring like a cone moving, bead rings dotting in; about 2.4 s. The guide fades, the paper and the henna fade
away to reveal the same mandala as a 9% watermark in the hero (same centre, same size), the joined hands glide down from
the top edge (`expo.out`), the Ganesh mark appears, then the words settle in. About 3 s to the words, 4.5 s in all.
Ambient: the hero watermark turns once every eight minutes (CSS animation, off under reduced motion).
Transform, opacity and stroke-dashoffset only; no filters. The gate's paper and the mandala fade as two separate light
layers rather than one full-screen layer full of SVG. Reduced motion: the gate shows the mandala fully drawn, and the
engine crossfades.
