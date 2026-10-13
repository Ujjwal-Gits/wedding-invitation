# Ghar · Lamplight Cinema (`/ghar/`)

The invitation as a short film at night: a first-person walk through a lamplit
Newar house. Ink-blue darkness, one amber accent, letterbox bars, chapter title
cards (Marcellus caps + Tiro Devanagari) and subtitles (EB Garamond italic).

## Signature motion

Scroll is the projector. One continuous camera move walks through a real 3D
house built in Three.js (`world.js`). The walls use brick and a carved post cut
from the Patan door photograph, lime plaster with a red-clay dado, and wooden
joists, all lit by real lamps (diyos, sconces, a hanging lamp) with flicker,
dust and bloom. Real photographs are depth-displaced vistas seen through
doorways and windows. The camera turns, tracks sideways past framed couple
photos and carved posts, bows under the low door, and cuts between rooms with a
warm flash or a dip to black. A gentle walking bob applies only when moving
forward.

## Chapters (one marriage moment each)

| # | Room | Beat |
|---|---|---|
| gate | opening credit | "{hosts} present", names, date, Begin with sound / quietly |
| 01 | पिखालखु threshold | `door-newari` at night; the leaves (cut from the photo) swing in; "{hosts} welcome you home" |
| 02 | चोक courtyard | `chowk` graded day-for-night, rows of diyos; the couple's names and date |
| 03 | मातँ upper hall | track past up to 6 framed couple photos (portraits, bride/groom photos) with `story` subtitles; walk into `interior-newari` |
| 04 | तिकिझ्याः lattice window | pre-wedding events as framed stills with lower-third cards (date, time, venue, map) |
| 05 | सँझ्याः great window | wedding card and couple still; Saptapadi: seven diyos light one by one, one vow per subtitle |
| 06 | कौसी rooftop | `kathmandu-night` beyond a parapet of lamps; reception card; closing line |
| after | stills, reply, credits | horizontal pan of `gallery`; dark RSVP (core `initRsvp`); guest details; invitation card dialog; end-credits roll with photo credits |

## What the studio needs to supply

- `couple.portraits` (3–7 photos; the first is the hero), and optionally `bride.photo` / `groom.photo`.
  Frames always follow each photo's own aspect, so nothing is cropped.
- `story` lines (one subtitle per hall picture, ≤ ~14 words read best), `events` with `photo`,
  `venue`, `mapQuery`; `saptapadi` (7), `closing`, `hosts`, `weddingDateBS`, `gallery`, `rsvp`, `info`.
- Event rooms are assigned automatically: events before the wedding go to the lattice room,
  `wedding` to the great window, `reception` (and later events) to the rooftop. `?e=` filtering is respected.

## Studio slots (`slots.js`, read through `useSlots`)

Images: `threshold.door` (shared `place.entrance`), `courtyard.view` (`place.courtyard`), `hall.corridor`
(`place.interior`), `lattice.window` (`place.window`), `window.view`, `rooftop.view` (`place.night`),
`hall.frame1`…`hall.frame6` (couple, `{ portrait: 0…5 }`), `hall.bride`, `hall.groom`, `window.couple`
(couple, `{ portrait: 1 }`), `texture.brick`, `texture.post`.
Texts: `gate.present`, `gate.open`, `gate.quiet`, `film.cue`, `card.button`, `ch1.title`…`ch6.title`
(big Nepali word / small English line), `threshold.welcome` (`{hosts}` placeholder), `threshold.bow`,
`lattice.line`, `window.line` (`couple.line`), `window.vows` (`rite.saptapadi.line`), `end.ask`,
`stills.title` (`gallery.title`), `reply.title`, `reply.send`, `roll.of`, `roll.blessings`.
Uploaded room photos have no depth map and render flat. An uploaded door opens from the centre of its lower half.
`?debug&slottest` applies sample overrides (courtyard, first hall frame, rooftop, three texts) to prove the wiring.

## Files

- `main.js`: data, DOM (gate, beats, finale), scroll-to-time mapping, still version, `?debug` hook
- `film.js`: house layout, shots (camera keys with phone overrides), beats, effects
- `world.js`: renderer, lit architecture shader, depth-photo shader, lamps, post (bloom with warm halation, grade, grain)
- `ghar.css`: tokens and typography
- `public/themes/ghar/brick.webp`, `post.webp`: textures cut from "Wooden door with tympanum" by Suraj Belbase (CC BY-SA 4.0, credited)

## Notes

- `?debug` exposes `__ghar.go(t)`, `enter()` and `ready()` for screenshots. `?still` forces the stills version.
- `prefers-reduced-motion` or no WebGL gives a stacked stills version with the same content.
- Camera paths use monotone cubic Hermite interpolation, so holds stay still with no overshoot.
- Phones (portrait) use their own camera keys: closer to each frame, sized from the photo's aspect.
- Depth tears: the photo vertex shader measures the depth cliff around each vertex (2-step kernel) and fades
  stretched triangles into the night (`vTear`), so roof/sky edges stay soft. The distant rooftop panorama is
  rendered flat (parallax there comes from the parapet and lamps); the great-window photo uses a low displacement.
