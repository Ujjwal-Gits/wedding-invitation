# Bagaicha (बगैंचा) · Garden Destination

A destination wedding in a hand-built 3D garden. The guest walks the venue by
scrolling: over a long reflecting pool, past the couple's photographs on easels,
to each ceremony's own corner of the garden, up the aisle of flower arches to a
white Rana-era rotunda with a gilt gajur, and on to a chautari peepal hung with
lanterns for the reception. Machhapuchhre stands behind it all.

- Page: `/bagaicha/` (port 5186 in development)
- Code: `main.js` (page, scroll, overlays), `garden.js` (Three.js scene), `shaders.js`
  (sky, Himalaya backplate, pool reflection, waterfall, plunge pool, mist, glows, petals,
  havan flame), `figures.js` (the paper-cut couple), `bagaicha.css`
- Thumbnail: `public/themes/bagaicha/thumb.jpg`

## Signature motion

**The day passes as they walk.** Scroll moves the camera between stations and the
paper-cut couple walk the aisle in step with it, from morning light over the pool,
through golden hour at the arches, to dusk at the pavilion and lantern night at the
chautari. The entry is a slow crane down from above the garden onto the pool. Everything
else (cards, lines) is a quiet fade.

## Stations (in scroll order)

1. **Arrival**: names, date, place over the morning sky; the pool mirrors the pavilion.
   "Read the invitation card" opens the full wording (shloka, families, request) in a dialog.
2. **Portraits**: the couple's photos on gilt easels against a hedge wall, one stop each
   (3 to 5). The first is a welcome board with their names. Short forward-looking lines
   (slots), no narrative captions. "View photograph" opens the uncropped photo.
3. **Ceremonies**, each at its own spot with a small arched card (date, time, venue + map,
   dress colours; the wedding card has the programme behind a disclosure):
   mehendi at a flower swing, haldi under a turmeric-yellow canopy beside the waterfall,
   Janti & Shubha Bibaha down the aisle of arches (the couple seen from behind).
4. **Vows**: the couple face the guests beside the havan fire in the pavilion; the seven
   Saptapadi promises appear one at a time as you scroll; blush petals fall.
5. **Reception**: night under the peepal, paper lanterns, string lights, fireflies.
6. **Finale** (shared `core/finale.js`, restyled for night): gallery as an uncropped
   masonry grid (white mats, no masks, couple photos first), guest info, countdown, RSVP
   on white, blessing, credits. The invitation card and photo viewer open through
   `core/modal.js` (`openModal`), so only the overlay scrolls.

Event-to-spot mapping is by id (`mehendi → swing`, `haldi → falls`, `wedding → aisle`,
`reception → lanterns`); unknown events take the free spots in order. `?e=` filtering works.

## The couple

Original vector drawings (no external models, no AI images), layered like cut card with
soft shadows and a paper grain. Faceless. Groom: Dhaka topi, red tika, daura suruwal with
its diagonal overlap and ties, waistcoat, marigold mala. Bride: red sari with gold zari
border and butta, ghumto over the head, tilhari and gold necklaces, red chura, mehendi.
Front and back views, four walk frames each; the frame advances with distance walked,
so they stop when the guest stops scrolling. Billboards turn to the camera on Y only.

## What the studio needs to supply

- `couple.portraits[]` (3 to 5 photos; any aspect, frames size themselves so nothing is
  cropped). `couple.bride.photo` / `couple.groom.photo` are added as extra easels.
- Names, dates, `events[]` with venue, `mapQuery`, dress colours, optional `rituals`.
- `saptapadi[]` the seven vows; easel lines and other wording are studio slots.
- Everything else comes from the shared data shape; no markup changes needed.

## Planting and materials (CC0, Poly Haven)

All downloaded from polyhaven.com (CC0, no attribution required), converted to small WebP in
`public/themes/bagaicha/tex/` (about 3.3 MB in total including the HDRI):

| file | source asset | used for |
|---|---|---|
| `fronds.webp` | `jacaranda_tree` model, leaves diff + alpha | cypress, jacaranda and spreading trees (leaf cards) |
| `leaves.webp` | `island_tree_01` model, leaves diff + alpha, recomposed into a spray | shade trees, peepal, hedges, topiary, shrubs |
| `lawn.webp` | texture `sparse_grass` (brightened, greened) | lawn under the grass blades |
| `gravel.webp` | texture `gravel_floor_02` | walks around the pool, easel walk, pavilion circle |
| `rock.webp`, `rock_nor.webp` | texture `mossy_rock` | waterfall cliff and boulders |
| `plaster.webp`, `plaster_nor.webp` | texture `white_plaster_02` | white stucco pavilion and pool coping |
| `bark.webp` | texture `bark_brown_02` | trunks and limbs |
| `sky.hdr` | HDRI `kloofendal_48d_partly_cloudy_puresky` (1k) | soft environment light (scaled by time of day) |

Trees are not imported meshes (Poly Haven's trees are 0.3–17 M triangles): they are leaf cards
arranged in crown volumes with outward normals, instanced, with wind sway and cut-out shadows.
Three species plus far-forest LOD, varied heights and groves; jacaranda in bloom behind the pavilion.
The lawn is a camera-following field of grass blades (56k desktop, 15k phone) masked to the lawns,
with a wind shader. Phones use about 60% of the leaf cards and no leaf shadows.

## Studio slots (`slots.js`)

Images: `scene.mountains` (shared `place.mountain`), `easel.1`–`easel.5` (couple, default
portraits 0–4), `easel.bride`, `easel.groom`, `still.backdrop` (shared `place.garden`).
Texts: `gate.line` (shared), `gate.enter` (→ `gate.open`), `gate.quiet` (shared), `hero.eyebrow`
(→ `hero.kicker`), `hero.cue`, `welcome.eyebrow`, `welcome.sign`, `easel.eyebrow` (→ `couple.title`),
`easel.line.1`–`5`, `easel.line.bride`, `easel.line.groom`, `vows.eyebrow`, `vows.title`
(→ `rite.saptapadi.title`), `card.button` (shared), `card.title`.
Test overrides with `?debug&slots=test` (mountains → Phewa Lake, easel 2 → Garden of Dreams pavilion,
new gate line and vows title).

## Photographs and licences

- `himalaya-dawn` (CC BY-SA 4.0) is the default mountain backplate (`scene.mountains`), graded per time of day.
- `garden-of-dreams` (CC BY 2.0) is the still background only when WebGL is unavailable.
- Couple photos come from the invitation data. Credits are listed in the footer
  (`generated/credits.json`).
- All 3D (pavilion, arches, pool, cliff, waterfall, trees, lanterns, swing, chautari) and
  the paper-cut figures are made in code for this theme.

## Performance

Soft-shaded (welded, smooth-normal) foliage and Lambert materials, instancing for trees, cypress, flowers, leaves, chairs and
lanterns (about 70–155 draw calls). The pool reflection renders at 0.5 (desktop) / 0.4
(phone) / 0.3 (low power) resolution. DPR cap 1.75 desktop, 1.5 phone, 1 on low-power
devices (≤4 cores), which also turns off shadows and MSAA. Rendering pauses when the
finale covers the garden and when the tab is hidden (`setAnimationLoop`). Glow, firefly
and petal layers are hidden when they are not lit.

## Accessibility and fallbacks

- `prefers-reduced-motion`: no crane-in, the camera cuts between stations, cards snap,
  water moves at 40% speed.
- No WebGL: a still Garden of Dreams photo with the stations stacked as normal sections.
- Cards are real DOM, keyboard reachable (focusing a card scrolls to its station),
  inactive cards are `inert`; Devanagari is never tracked or uppercased.

## Debug

`?debug` exposes `window.__bagaicha`: `enter()`, `go(i, f)` (scroll to station i,
travel fraction f), `setP(p)` (pin the camera to a continuous station index),
`info()` (draw calls, triangles), `stations`. `?debug&hq` keeps shadows and MSAA on
(debug otherwise renders in low-power mode for SwiftShader). `?station=N` skips the gate.

## Known gaps

- Scroll has no snapping; stations rely on hold zones in the scroll timeline.
- Verified in headless SwiftShader only; frame rate on real mid-range Android should be
  checked on a device.
