# Swayambar (स्वयम्बर) · the jaimala, two families, one garland

Page: `/swayambar/` (demo) · `/swayambar/?id=<invitation>` (studio data) · `?debug` exposes `window.__su` · `?debug&open` skips the gate.
Built on the card suite (`src/themes/_suite/`, `T.page`): this folder holds the gate, the opening, the page, the ornaments and the look.

## Concept
The swayambar: the bride and groom raise fresh garlands to each other, and two families become one. Everything in the
theme is two sides coming together: the groom's side on the left in saffron silk, the bride's side on the right in rose
silk, wine red and marigold on ivory paper, a lot of air. The groom is on the left in the jaimala picture, so his name
and his family sit on the left all the way down; the bride's on the right.

## Signature motion: the garlands swing apart (the gate)
Wine-red silk with a fine gold frame. Two long marigold, rose and jasmine garlands hang from above the screen and
interlock in the middle like a closed curtain of flowers (each tilted 5.5° toward the other, their loops crossing);
Ganesh sits in an ivory medallion inside their shared loop, शुभ विवाह and the names below. Before the tap the garlands
breathe (±0.7°, CSS). On tap the hanging points draw apart (1.7 s, `power2.inOut`) and each garland behaves like a heavy
pendulum: the bottom lags toward the middle (15°), swings out past the vertical (10°), back (4.6°), (1.8°), and settles,
about 3.4 s in all. The wine silk parts behind them from the middle outward like a curtain (two halves, `xPercent`, no
blending through a muddy pink), the medallion rises to its place at the top of the hero (FLIP), and the garlands come to
rest exactly where the hero's own garlands hang at its sides, so the hand-over is invisible (the garland layer is
`100vw` wide in both, so a desktop scrollbar does not shift it). Transform and opacity only; `will-change` only under
`body.is-opening`. Reduced motion: the engine crossfades the gate; the hero garlands are simply there.

## Hero
Ivory silk. Ganesh (red line drawing) in a gold-ringed medallion, ॥ श्री गणेशाय नमः ॥, SHUBHA BIBAHA, the jaimala
illustration (kept small so the blank faces read as illustration; its cut-off lower edge fades into the paper), the
names under their own figures (groom left, bride right, a small gold ampersand between), one line, the date between
gold rules. The garlands frame the top corners. On wider screens they lift slightly as you scroll away.

## The scroll journey: the two sides converge (`T.scroll`, ScrollTrigger scrub)
1. **Two families** (`#families`): two arched silk panels, वर पक्ष (saffron, a Palpali Dhaka band) and कन्या पक्ष
   (rose, a string of green pote beads with a gold tilhari). They start far apart and turned away (`rotateY ±58°`,
   hinged on their outer edges) and swing in toward a brass kalash as you scroll. Phones: staggered, groom left,
   bride right, the kalash between.
2. **The two of us** (`#couple`): two silk wings (saffron left, rose right) fly in from the sides in 3D and close
   behind the couple's photograph into one two-coloured arch. The photo is shown whole.
3. **The day** (`#date`): where the sides meet. Two half-moons converge into one disc behind a medallion ringed by a
   real garland (`art/ring.webp`, bent from the garland painting; it turns into place as you scroll). Scratch the wine
   silk seal for the date (A.D. + B.S., time). Brass diyos with live flames either side; the venue, then the
   countdown in four columns divided by gold hairlines.

After the meeting the page is one:
- **Ceremonies** as gatefold cards: a wine silk date leaf (weekday, day, month, B.S., time) and an ivory text leaf
  (title, venue + map, dress colours, order of the day) open on their spine in 3D as each arrives, alternating sides
  and offsets. Phones: the text leaf unfolds downward from the date leaf. Then calendar, share and "more info".
- **Photographs** hang on marigold silk cords (3 a line, 2 on phones), each lower toward the sag, and swing gently
  into stillness as their cord arrives (lightbox on tap).
- **The bond**: the ganthi bandhan painting beside the card wording and the full-invitation button.
- **RSVP**: an ivory card under a wine silk band. **Closing**: the blessing and the names between two live diyos, a
  Dhaka band, made-with.

## Palette (`colors` in slots.js change the opening and hero)
`--sw-wine` #6B1024 (the one accent: headings, buttons; 11:1 on ivory) · `--sw-gate` #4A0915 (gate silk) ·
`--sw-marigold` #E7A33A (gate title, ornaments, never body text on ivory) · `--sw-ivory` #FBF5EA (paper).
Saffron silk #F7E5C3/#EFD29C (groom's side), rose silk #F7E0DA/#EDC3B9 (bride's side), gold #B8873A (rules only),
gold ink #7A5520 (5.9:1), ink #2C1517 / #654842.

## Type
**Pinyon Script** (Latin names, captions) · **Prata** (Didone display: headings, dates, numbers) · **Halant**
(Devanagari display: names, headings, शुभ विवाह) · **Mukta** (reading text, both scripts). None is used by another theme.
Devanagari is never tracked or uppercased; `locl` stays off via base.css.

## Art
- `public/themes/swayambar/art/couple(.webp|-sm.webp)` (slot `hero.couple`), `garland(.webp|-sm.webp)`: transparent paintings.
- `art/ring(.webp|-sm.webp)`: made from the garland: one period of its left arm straightened and bent into a closed
  ring (polar warp, 8 repeats). Script: `tools/ring.py` (`python tools/ring.py garland.webp ring.webp 1000`).
- Shared kit `/themes/_nepali/`: `ganesh-ink` (slot `hero.ganesh`), diyo lamps with live flames, kalash, ganthi, Dhaka.
- `public/themes/swayambar/thumb.jpg`: the opened hero, 1200×900.
