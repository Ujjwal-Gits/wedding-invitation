# Durbar (दरबार) · Bhaktapur Durbar Square

A 3D walk through Bhaktapur's royal square on a bright wedding morning. The square is
built in code with Three.js: real PBR textures, a CC0 sky HDRI, a shadowing sun and (on
desktop) ambient occlusion. Scrolling moves the camera from the lane outside the lion gate,
through the arch, to the Nyatapola's stair, along the palace of 55 windows, and to a
landmark for each ceremony. It ends with a crane up over the roofs into the RSVP on white.

- Page: `/durbar/` (port 5202 in development)
- Code: `main.js` (page, cards, scroll, dialogs, fallbacks), `square.js` (scene, stations,
  camera, light), `architecture.js` (pagodas, terraces, palace, gates, shikhara, mandap,
  houses), `statues.js` (guardians), `life.js` (pigeons, marigolds, bunting),
  `materials.js`, `geo.js`, `durbar.css`, `slots.js`
- Thumbnail: `public/themes/durbar/thumb.jpg`

## Signature motion

**The camera journey.** One continuous camera glide through the square. Between stations
the camera follows curves through waypoints, so it goes around temples and over roofs
instead of through them. While a card is showing the camera holds still, with only a very
slight drift. The sun moves from south-east morning light to warm west light for the
evening reception, and the sky and the image-based light turn with it. Everything else
moves quietly: the cards fade, pigeons peck and circle, and the bunting moves in the wind.

## Stations

1. **Entry screen**: guest name (`?to=`), names, date and the entry buttons, over the lane
   that leads to the whitewashed lion gate. The Nyatapola rises behind the gate.
2. **Arrival**: one line and a scroll hint. The camera then passes through the arch.
3. **Names** at the Nyatapola stair: names, AD date, B.S. date, city and "Read the invitation
   card". The full card opens in a dialog: shloka, families and request.
4. **Portraits**: the couple's photos hang in gilt frames with white mats on the palace wall,
   under the 55 carved windows. There is one stop per frame (3 to 5, plus bride and groom
   portraits when they are uploaded). Each frame takes the photo's own shape, so nothing is
   cropped. "View photograph" opens the whole photo.
5. **Ceremonies**, each at a landmark. Each has one readable card with the name, weekday and
   AD date, the B.S. date (`bsDateOf`), time, venue with a map link, and dress colours:
   Mehendi at Chyasilin Mandap, Haldi at Vatsala Durga with the Taleju bell, and the
   **wedding day** at the Golden Gate (Sun Dhoka), which also lists the day's programme.
   On phones the programme is behind a disclosure. The Reception is at Bhairabnath in
   evening light. The mapping uses the event id. Events with other ids take the free
   landmarks, and `?e=` filtering works.
6. **Finale** (shared `core/finale.js`, restyled on white): an uncropped masonry gallery
   with the couple first, guest info, countdown, RSVP, blessing and credits.

## The model

- **Nyatapola**: five brick terraces with stone copings. A straight stair meets every terrace
  at its front edge, and a pair of guardians stands on each level: the wrestlers, elephants,
  lions, griffins and goddesses. The temple has five tiled roofs on painted carved struts,
  brass bells on the eaves, a colonnade on the ground tier and a gilt gajur.
- **Palace of 55 windows**: brick ground floor and first floor with carved Newar windows,
  toranas and cornices. Above them is the projecting gallery of 55 lattice bays on corbels,
  under a deep mossy tiled roof with a red fascia and struts.
- **Golden Gate**: a rectified CC0 photograph of the real gate (`gate-face.webp`) is mapped
  onto the wall face and cut around a real doorway. The gilt roof, crest, finials and
  griffins are modelled.
- Also: Vatsala Durga (a stone shikhara with corner turrets and stone elephants), the Taleju
  bell, King Bhupatindra's column, Chyasilin Mandap (octagonal, two roofs), Bhairabnath
  (three roofs with a row of pinnacles), a white palace wing, a small two-roofed shrine,
  dabali platforms, chaityas, stone walks, and rows of Newar houses. The houses have shop
  shutters, carved windows and struts. A lane of houses leads up to the gate. Beyond them,
  the old town is shown as low-detail blocks with roofs, with the valley rim in the haze.
- **Life**: instanced pigeons that peck and circle the Nyatapola, marigold strands on the
  gates, frames, stair and pavilion, and cloth bunting that moves in the wind.

## Studio slots (`slots.js`)

Images:
- `frame.1`–`frame.5`: couple photos (default portraits 0–4). At least 3 are shown, and up to 5.
- `frame.bride`, `frame.groom`: shown only when the couple uploads them.
- Still-version photos: `still.arrival` (shared `place.courtyard`), `still.names`,
  `still.portraits`, `still.mandap`, `still.shikhara`, `still.gate` (shared `place.entrance`)
  and `still.bhairab`.

Texts:
- Entry screen: `gate.kicker`, `gate.line` (shared), `gate.enter` (→ `gate.open`) and
  `gate.quiet` (shared).
- Stations: `arrival.line`, `arrival.cue`, `hero.kicker` (shared), `frame.title`
  (→ `couple.title`), `frame.line.1`–`5`, `frame.line.bride` / `.groom` (→ `bride.line` /
  `groom.line`), `events.kicker` (→ `events.title`) and `wedding.kicker`.
- Card and finale: `card.button` (shared), `card.title`, `gallery.title` (shared) and
  `reply.title` (shared).

Test overrides with `?debug&slots=test`. The studio needs to supply the couple's portraits
(any aspect), the names, dates, and `events[]` with venue, `mapQuery`, dress colours and
optional `rituals`. It can also supply `dateBS` per event.

## Assets and licences

Textures (CC0, Poly Haven) are converted to WebP in `public/themes/durbar/tex/`, about 7 MB
in total. Phones load the 1k variants and the 2k sky.
| file | source |
|---|---|
| `large_red_bricks_*` | `large_red_bricks`: temple and palace brick |
| `medieval_red_brick_*` | `medieval_red_brick`: houses |
| `herringbone_brick_*` | `herringbone_brick`, re-graded to Bhaktapur terracotta: paving |
| `roof_tiles_14_*` | `roof_tiles_14`: all roofs |
| `rough_wood_*` | `rough_wood`: carved wood, struts, lattice frames |
| `large_sandstone_blocks_01_*` | stone copings, steps, shikhara, statues |
| `white_stucco_*` | the lion gate and the white wing |
| `sky.hdr`, `sky-2k/4k.webp` | HDRI `kloofendal_48d_partly_cloudy_puresky` (lighting + sky) |
| `elephant.gltf/.bin`, `elephant_nor.webp` | model `carved_wooden_elephant`, re-materialled as stone |

Photographs (added to `art-src/photos` with entries in `credits.json`, all from Wikimedia
Commons):
- `bhaktapur-golden-gate`: Maesi64, CC0. Also the source of `gate-face.webp`.
- `bhaktapur-nyatapola`: Maesi64, CC0.
- `bhaktapur-palace`: Shadow Ayush, CC BY-SA 4.0.
- `bhaktapur-square` and `bhaktapur-chyasilin`: Suraj Belbase, CC BY-SA 4.0.
- `bhaktapur-bhairabnath`: Nirmal Dulal, CC BY-SA 4.0.
- `bhaktapur-vatsala`: Deepayan Sarkar, CC BY-SA 3.0.

The footer credits list them. Everything else (architecture, statues, pigeons, flowers) is
made in code for this theme.

## Type and colour

- English: Literata (display) and Albert Sans (body).
- Nepali: Laila (display) and Noto Sans Devanagari (body). Hind is not used because it
  renders Devanagari digits as Latin numerals, and Eczar is not used because of its र्य form.
- Colour: white cards with ink `#1D1A17`, one brick-vermilion accent `#9E361F`, and gilt hairlines.
- Text sizes follow the contract (§11): body 16–17 px (Nepali 17–18 px), line-height ≥ 1.55,
  and nothing is letter-spaced in Devanagari.

## Performance

- Geometry is merged per material, so the scene is about 40 draw calls. Pigeons, marigolds and
  bunting are instanced.
- The shadow map follows the camera and is snapped to texels.
- DPR cap: 1.75 on desktop, 1.5 on phones and 1 on low-power devices (4 cores or fewer).
- Phones get 1k textures, a 2048 shadow map, no AO, fewer bells, lighter statues and simpler
  flowers. Low-power devices also turn off shadows and MSAA.
- Desktop adds GTAO.
- It runs at 60 fps at 1200×800 with AO on an RTX 3050 laptop GPU. Rendering pauses once the
  finale covers the square.

## Accessibility and fallbacks

- `prefers-reduced-motion` and devices without WebGL get the **still version**: no 3D. Each
  station becomes a calm section with a real photo of its landmark (or the couple's own photo
  for the portraits), shown whole, next to the same card.
- The cards are real DOM. They can be reached by keyboard, and focusing one scrolls to its
  station. Inactive cards are `inert`. The dialogs use `openModal`, which was tested: the page
  stays locked while the card scrolls, and closing returns to the same position.

## Debug

- `?debug` exposes `window.__durbar`: `setP(p)` (pin the camera to a continuous station
  index), `go(i, f)`, `path(aspect)` (sampled camera positions for collision checks),
  `info()`, `enter()`, and `square.look({ target, yaw, pitch, dist })` for free views.
- `?station=N` skips the entry screen. `?still` forces the still version.
- In debug mode the page renders in low-power mode unless `&hq` is added.

## Known gaps

- The guardians are stylised sculpts, not scans. Seen from close up they read as weathered
  stone forms rather than detailed carvings.
- The struts' carvings and the palace windows are textures and simple geometry, not true relief.
- Frame rate on mid-range phones has not been measured on a real device.
