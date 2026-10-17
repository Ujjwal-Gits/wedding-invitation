# Tuscany (international, destination, Christian)

**Concept:** golden hour arrives over a watercolor Tuscan vineyard; the invitation reads like a wine list and an Italian
menu card. A cream wine label carries the names, the schedule is a menu of courses, the countdown is a dial and the reply
is a folded menu card.

Engine: Vow (`src/themes/_vow`). Page: `/tuscany/`. Fonts: Marcellus (display, Roman inscription caps) + Spectral (body).
Palette: warm white `#FFFDF9`, ink `#2B211B`, one deep-wine accent `#7A2434`. Label paper `#FFFBF3` has a fine SVG grain and
thin double rules.

## Opening (the signature motion)
The gate is the painting in pale early light (`vineyard-dawn.webp`, a desaturated and lightened copy). A wine label with
the names sits over the empty sky, with the buttons under it. On Open:
1. the buttons fade,
2. the pale painting crossfades (opacity) to the full-colour painting on the first screen,
3. a warm sun glow (a radial-gradient disc) rises from behind the hills (`yPercent`). It passes under `vineyard-hills.webp`,
   which is a cut-out of the painting below the ridge line, so it really comes up from behind the hills,
4. the label lifts up into its first-screen position, then the place line and the scroll cue settle in.

Reduced motion: the engine fades the gate and the first screen is already complete (sun in place).
If the client swaps the painting, the pale copy becomes a CSS filter of their art and the hills cut-out is dropped.

The painting is positioned by container queries so the sky always holds the label. Phones: cover, bottom-aligned.
Aspect 3:5 or wider: the horizon sits at 70% of the height. Nothing sits over the vineyard rows.

## Sections (standard ids)
- `#top`: the painting, the wine label (vintage line, kicker, names, line, date), the venue and city, the cue.
- `#couple` / `#story`: a framed photo shown whole (landscape photos get a wider frame), then the story as "vintages"
  (a big year beside each line on phones, three columns with hairlines on desktop).
- `#programme` / `#ev-<id>`: a menu card. Each event is a course with a Roman numeral (I · II · III) and the title …
  dotted leader … start time. Under it: the date and time range, the venue with Directions, the note, the dress code
  and the timeline.
- `#date` / `[data-countdown]`: a strip of the painted sky with a countdown **dial**. It has sixty second ticks, a minutes
  ring and twenty-four hour dots. Three wine markers turn by `transform` (cumulative angles, so they never spin backwards),
  with the days in large Marcellus numerals in the middle. Beside it: the title, the Roman date (IX · X · MMXXVII), the
  date and time, and the calendar and share buttons.
- `#photos`: a horizontal strip of whole photos (one whole photo at rest on phones, snap and swipe; a calm row on desktop),
  with arrows and a Roman counter (II / IX). Clicking a photo opens the lightbox.
- `#card` / `[data-open-card]`: hosts and parents on a band between double rules, with the full-card button.
- `#info`: "Getting to {town}". Travel lines (`Heading: text` per line) become numbered legs joined by a dotted route.
  Then the stays as a two-column wine list, then the contacts and the livestream.
- `#rsvp` / `#rsvp-form`: a folded menu card. On phones it is a single card. On desktop the left leaf is the cover:
  its inside holds the title, the deadline and a small menu of the events, and its outside holds the monogram and
  "R.S.V.P.". As the card scrolls in, the cover swings open on its fold (rotateY 180 → 0, scrubbed).
- `footer`: the verse (Christian only), the closing line, the names, the hashtag and Made with Nimtto, then a strip of
  vines that fades in under the text and never sits behind it.

## Scroll motion
Desktop only, inside `gsap.matchMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)')`:
- a slow camera push-in on the vineyard (scale 1 → 1.1), with the sun sinking a little and the label rising faster
  (layered depth),
- the reply card's fold.

Phones get only the engine's `.vw-rise` fades. Reduced motion skips all of it.

## Faith
`faith: 'christian'`, `religions: ['christian','other']`, `faithInk: '--vw-accent'`.
- `ctx.emblem` rides the top edge of the wine label as a small crest. The label keeps its height either way.
- `ctx.verse` opens the closing.

Both vanish for 'other' couples, for `?v=neutral`, or when `faith.show` is "off", and the page still looks finished.
The farmhouse bell tower is painted art. Its small finial was retouched out of the shipped crops.

## Slots
- Images:
  - `hero.art`: the painting, 1200×2400.
  - `date.sky`: the countdown sky.
  - `close.vines`: the footer strip.
  - `couple.lead`, `gallery.1–6`: couple photos.
- Texts:
  - the standard ids (`gate.*`, `hero.kicker`, `hero.line`, `couple.title`, `story.title`, `count.*`, `prog.title`,
    `gallery.title`, `info.title`, `live.line`, `card.button`, `families.title`, `rsvp.*`),
  - faith: `faith.show`, `verse.text`, `verse.ref`,
  - this design's own: `label.vintage` ("Vendemmia", followed by the year), `travel.title` ("Getting to", followed by the
    town), `stays.title`, `contacts.title`, `rsvp.cover`.
- Colours: `--vw-accent`, `--vw-bg`, `--tu-label`.

## Art
Source: `scratchpad/intl/art/vineyard.jpg` (Canva AI watercolor, owner-approved, textless). It is processed by
`scratchpad/tus_art.py` into `public/themes/tuscany/art/`. Each file has a 640px `-sm` copy:
- `vineyard`: the full colour painting, retouched,
- `vineyard-dawn`: the pale early-light copy,
- `vineyard-hills`: the rows from 1700 down, with the sky above the ridge transparent,
- `sky`: rows 0–900,
- `vines`: rows 1900–2400.

Demo photos: CC0, from `_vow/demo.js`.
