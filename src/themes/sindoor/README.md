# Sindoor (सिन्दूर) · the wedding issue

Page: `/sindoor/` (demo) · `/sindoor/?id=<invitation>` (studio data) · `?debug` exposes `window.__su` · `?debug&open` skips the gate.
Built on the card suite (`src/themes/_suite/`, `T.page` + `T.scroll` + `T.scratch` + `T.ready`): this folder holds the cover, the opening, the page and the look.

## Concept
The sindoor daan: the groom fills the parting of the bride's hair (siundo) with sindoor, the moment she becomes his
wife. The invitation is set like a fashion magazine's wedding issue: lots of warm white, deep black type, generous
space and ONE colour, sindoor red, kept for the names, the numbers and one fine line.

## The opening is the cover (signature motion)
There is no separate gate picture: the gate is a transparent layer over the cover itself. Before opening, the cover
shows Ganesh (fine red line drawing) and ॥ श्री गणेशाय नमः ॥ at the top, the closed sindoor dani below, and the gate's
words and button standing exactly where the names will appear (`placeGateUi`).
On tap (button, quiet link or anywhere on the page) the lid presses down, then lifts and tilts away (`expo.out`); a
plume of sindoor rises out of the box behind it and stays; three larger clouds of powder billow over the whole
screen and clear; the masthead rule draws and the couple's names rise out of their masks in red; the cover lines
settle; then the red line drops from the box to the foot of the cover. About 2 s to the names, 3.5 s in all.
The box is one picture cut along the lid's rim with two `clip-path` polygons (an arc, so the gold band stays whole).
Transform and opacity only; `will-change` only under `body.is-opening`. The bloom clouds use `art/bloom*.webp`, the
burst with its bottom edge faded (made from `burst.webp`), so no hard edge shows when they scale up.
Reduced motion: the box is shown already open, the gate's words sit on the cover and the names fade in.
After opening, the lid hovers gently while the cover is on screen (CSS loop, paused off-screen) and drifts off as you
scroll away while the plume thins.

## The scroll journey: the siundo
One fine red line (1.5px) runs through the whole story and draws itself as you scroll, with a small red tip that
travels at 62% of the screen height. It is built from the layout (`thread()`): markers (`.sd-k`) at each section's
top rule and at a few chosen points give the turns; between them the line runs straight down, then turns along the
section's rule like a pen. Each run is a div drawn with `scaleY`/`scaleX` (transform only, no SVG repaint). It sits
behind all content and never crosses text: on phones it runs in a 22px rail that changes side from section to
section (the text keeps 46px clear of it); on wide screens it uses the gutters of a magazine grid.
- 01 The couple: big heading, a pull quote, the main photo in a tall frame uncovered by a paper panel.
- 02 Sindoor daan (`bond.title` / `bond.line`, type - to remove): the shared sindoor-daan painting rises in 3D; the
  line slips behind the bride's veil exactly at her parting, so the drawn line becomes the red parting in the picture.
- 03 The date: a white card dusted in sindoor (`powder()`: red, mottling, the burst texture multiplied in, grain, the
  hint on a white label); rub it away to read the date (A.D. and B.S.).
- 04 The countdown: four huge thin numerals (Mukta 200) on hairline rules, days in red; they slide along the rule.
- 05 The families: bride and groom either side of the line.
- 06 The celebrations: a contents page; big red numbers, titles, A.D. and B.S. dates, time, venue and map, dress
  swatches, order of the day; calendar, share and travel/stays/contacts.
- 07 The album: two offset columns, every photograph whole, captioned "Fig. 01…"; desktop columns drift apart.
- 08 Your reply: the card wording as a pull quote (full card in the modal) beside the RSVP form (underline fields).
- The end: the line comes to rest in a red bindu above a brass diyo with a live flame, the blessing and the names.
Headings rise from masks, blocks lift, photographs are uncovered, all once, by IntersectionObserver.

## Palette (tokens, `slots.js` `colors`)
`--sd-red` #C8141D sindoor (5.6:1 on the paper) · `--sd-paper` #FCFAF7 warm white · `--sd-ink` #141212 ·
`--sd-ink-2` #57524F (secondary text) · hairlines rgba(20,18,18,.14). Buttons are square and black; red is never a fill
except the scratch cover.

## Type
**Gloock** (high-contrast display serif: names, headings, numbers), **Vesper Libre** (Devanagari display: names,
headings, blessing), **Mukta** (all reading text and labels; 200 for the countdown numerals). Neither Gloock nor Vesper
Libre is used by another theme. Devanagari is never tracked or uppercased.

## Art
- `public/themes/sindoor/art/box(.webp|-sm.webp)`: the sindoor dani (transparent). `burst(…)`: the plume.
  `bloom(…)`: the plume with its bottom edge faded, for the full-screen clouds.
- Shared, read-only: `_nepali/ganesh-ink` (the `hero.ganesh` slot), `_nepali/sindoor-daan`, `_nepali/diyo` + live flames.
- `public/themes/sindoor/thumb.jpg`: the opened cover, 1200×900.
