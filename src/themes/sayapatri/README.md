# Sayapatri: Haldi Daylight

Page: `/sayapatri/`. Entry: `src/themes/sayapatri/main.js`. Slots: `src/themes/sayapatri/slots.js`.
Dev server: `npx vite --port 5183 --strictPort`.

## Concept
A bright daytime invitation in the colours of haldi and marigolds. The page is crisp white, with turmeric,
saffron and leaf-green colour fields. Sindoor red is the one accent (buttons, the joining thread, the
ampersand). The story is the marriage itself: the couple, their families, joined hands, the celebrations, the
wedding-day rites and the seven steps. Every photo keeps its own proportions. Frames are soft rounded
rectangles that shrink-wrap the image, so no face or subject is ever cropped. There are no dark scrims, and
nothing zooms into a photo.

Type (contract §11, readability first):
- Kalnia (weight 400–600) only for large display text of 40px and up: names and section titles.
- Anything smaller uses DM Sans 500–600, with no hairlines. English body text is at least 17px on desktop
  and 16px on phones, line-height 1.55+.
- Devanagari uses Eczar 600 for display and Mukta for body, at least 18px (17px on phones), line-height
  1.75+.
- Small text on leaf green uses a light turmeric (6:1). The red half of "Two hands" uses a deep sindoor
  (5.7:1 on turmeric).

## Signature motion
**Two hands, one promise.** A pinned section on a turmeric field. One of the couple's own photos is cut into
two halves that travel in from opposite sides, tilted. As you scroll they close into one picture at the
photo's own aspect ratio. The line "Two hands, one promise." appears below it, and a sindoor-red thread
draws beneath the line.

Everything else stays quiet: layered parallax in the opening, prints dealt onto a stack, a horizontal run of
colour fields, and parallax rows. A few 3D marigold petals (Three.js, `petals.js`, loaded only after the guest
opens the invitation) drift with the scroll. They show only in the opening and behind the closing blessing.
The petals sit behind every photo frame and every word, so a petal never lands on a photo.

## Sections
1. **Welcome / gate**: names, date and city, with two couple photos on a turmeric arch. The two buttons (with
   or without music) unlock audio. `?to=Name` adds a greeting.
2. **The couple**: a pinned stack of prints for the bride, the groom, then the couple together. The captions
   show the full names, the parents and the hosts. "Read the invitation card" opens the full card wording in
   a modal through core `openModal`. Only the card scrolls; the page stays locked and returns to the same
   place when the card closes.
3. **Two hands**: the signature.
4. **Celebrations / programme**: a full-screen overview first lists every ceremony with its day and start
   time; tap a row to jump to it. Then one full-screen colour field per ceremony: the name (large), weekday
   and date, the B.S. date, and a Time / Venue (+ map) / Wear list with swatches. It snaps to whole panels.
   The B.S. date comes from the shared `bsDateOf(iso, event.dateBS)` (core i18n), so every ceremony shows it;
   an event's `dateBS` override wins.
5. **Wedding day**: the wedding event's `rituals`, as rows with whole photos that float at different speeds.
6. **Saptapadi**: seven steps light up around the fire, one vow at a time.
7. **Finale** (`core/finale.js`, restyled):
   - Gallery: titled "The two of us". The couple's photos come first, every photo is uncropped, and library
     photos get no captions.
   - Guest info, countdown, RSVP (core logic), blessing and credits.

Reduced motion (`prefers-reduced-motion`, or `?still`): no pins, petals or parallax. Every section is
stacked and fully visible.

Debug: `?debug` adds `window.__sp.go(id, progress)`, `__sp.panel(i)` and `__sp.open()`; scrub is immediate
and Lenis is off. `?debug&open` skips the gate. `?debug&slots={"images":{…},"texts":{…}}` previews studio
overrides without touching `config.js`.

## Slots (everything replaceable from the studio)
Images:
- `hero.photo` (couple, portrait 0), `hero.photo2` (couple, portrait 4)
- `couple.bride` (bride, portrait 3), `couple.groom` (groom, portrait 5)
- `couple.together1` (couple, portrait 2), `couple.together2` (couple, portrait 6)
- `join.photo` (couple, portrait 1)
- `rites.1.photo` … `rites.6.photo` (details; 2, 4 and 6 are shared as `rite.swayambar`, `rite.kanyadan`
  and `rite.sindoor`)
- `seven.fire` (shared `rite.fire`)

Texts:
- Opening: `hero.kicker`, `gate.open`, `gate.quiet`, `hero.cue`
- Couple stack: `couple.bride.kicker`, `couple.bride.line` ({parents}), `couple.groom.kicker`,
  `couple.groom.line`, `couple.together.kicker`, `couple.together.title`, `couple.card`
- Two hands: `join.line1`, `join.line2`
- Celebrations and rites: `days.kicker` ({count}), `days.title`, `rites.title`
- Seven steps and photos: `seven.kicker`, `seven.title`, `gallery.title`
- Side menu: `nav.welcome`, `nav.couple`, `nav.join`, `nav.days`, `nav.rites`, `nav.seven`, `nav.gallery`,
  `nav.reply`

Entries that match `src/core/slot-vocab.js` carry `shared:` keys, so content entered in another theme appears
here too. Names, parents, dates, venues, events, vows, card wording and gallery come from the invitation data.

## Known gaps
- Rite photos follow the rite order (row 1 to 6), not the rite names. A theme override per row fixes a
  mismatch.
- Headless verification used software WebGL. Check petal performance on a real mid-range Android.
