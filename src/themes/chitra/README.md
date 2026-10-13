# Chitra (चित्र) · Illustrated Storybook

A wedding invitation painted as a Mithila picture book from Janakpur. Everything
illustrated is hand-drawn vector art written in code: no AI images and no clip-art.
The style uses bold lamp-black outlines, flat vermilion, turmeric, indigo and leaf
green, kachni line fills, fish, peacocks, lotuses and repeating triangle borders,
all set on handmade-paper cream.

Page: `/chitra/` (dev server port 5184). Add `?debug` to expose `window.__chitra.show(page, progress)`
for screenshots. Add `?lab=couple|family|band` (optional `&walk=0.2`) to see the character sheet.

## Concept

The guest opens an indigo cloth book cover with a fish-pair medallion, then turns
the pages of the wedding:

| # | page | what happens (scroll-driven) |
|---|------|------------------------------|
| – | Title | The couple's hero photo sits in a painted frame between two peacocks, with names, date and "Read the invitation card". |
| 1 | जन्ती Janti | The procession walks in. Six panche baja musicians lead (narsingha, sahanai, damaha, tyamko, dholaki, jhyali), followed by the groom under his father's parasol and the guests. The bride's parents wait at a Janakpur house, and Janaki Mandir stands on the horizon. On phones the camera follows the procession. |
| 2 | स्वयम्बर Swayambar | The bride lifts her marigold garland over the groom's head, then he garlands her. Both families watch, petals fall, and a photo of the couple hangs on the painted wall. |
| 3 | सप्तपदी Saptapadi | **Signature motion.** Scroll walks the couple around the havan fire in the mandap, tied by the ganthbandhan cloth. Each round lights one of seven diyos and shows that round's vow. The purohit sits at the fire and the parents watch. |
| 4 | सिन्दूर | The groom draws sindoor along the bride's parting, the tika appears and both mothers raise their hands in blessing. The bride and groom portraits hang in Mithila frames. |
| 5 | प्रीतिभोज Reception | The couple dance under strings of lights and scroll spins the bride once around. Guests clap and musicians play, and a framed photo stands on an easel. |
| 6 | The days | Every event with its date, time, venue map link and dress colours. |

After the book comes the shared finale, restyled. It holds the album (gallery as framed prints), guest info,
countdown, RSVP through `core/rsvp.js` on a framed card, the blessing and credits. The album leads with the
couple's portraits, and library details follow without narrative captions. On phones the album is one column, with every photo fully
visible. The invitation card opens through `core/modal.js`, so only the card scrolls.

Grounds are white (Mithila on white paper) or rich colour fields (vermilion, turmeric, indigo). There is no cream or beige.

**Layout:** on desktop and landscape tablets (≥900 px wide, landscape) the book is pinned and each page
turns away from the spine (transform only). On phones and portrait tablets every scene is a full-height
panel pinned while its scroll drives the action, and each viewBox is cropped to the scene's key region.
With `prefers-reduced-motion`, pages stack, nothing is pinned and every scene shows its final frame.

## Files

- `figures.js`: the articulated character rig, exported for reuse:
  `createGroom`, `createBride`, `createElder('father'|'mother'|'grandfather'|'grandmother')`,
  `createGuest(0..5)`, `createMusician('narsingha'|'shehnai'|'damaha'|'tyamko'|'dholaki'|'jhyali')`,
  `createPriest`, plus `createMan` / `createWoman`, `play(fig, t)`, `garland`, `garlandLoop`, `figureDefs()`.
  Each figure has nested joints (body, head, upper and lower arms, hands, thighs, shins, feet, skirt, pallu fall,
  mala) and the following controls:
  `fig.pose` (numbers, tween with GSAP), `fig.apply()`, `fig.walk(phase, stride)`, `fig.idle(t)`,
  `fig.reach('F'|'B', x, y)` (2-bone IK), `fig.toScene()` / `fig.toBody()` / `fig.point(joint)`.
  All figures are faceless, with smooth heads, hair and no features. The bride wears a red sari with gold
  border and butti, a ghumto veil, green pote with a gold tilhari, red-gold chura and henna, and has a
  sindoor/tika layer. The groom wears ivory daura suruwal with ties, a dark istakot, a Dhaka topi that is
  taller on one side, and a marigold mala.
- `motifs.js`: Mithila motifs (fish, fish pair, peacock, parrot, lotus, sun, moon, tree of life, banana,
  bamboo, kalash, diyo, havan kunda, mandap, toran, fringe, Janakpur house, Janaki Mandir, frames,
  lights) and the pattern defs.
- `scenes.js`: the six compositions with `update(p)` / `tick(t, dt)` choreography.
- `main.js`: data, markup, photo slots, the scroll director, cover, invitation-card dialog and finale.
- `chitra.css`: tokens and layout. The page frame and cover border are a hand-drawn SVG `border-image`.
- `lab.js`: the character sheet (`?lab`).

Type: Rozha One (display) and Mukta (body), both Latin + Devanagari OFL. Body is 17px+ (Nepali 18px+, line-height 1.75).
Devanagari is never letter-spaced or uppercased.

## Studio slots (`slots.js`)

All of these are read through `useSlots(manifest)`. Shared keys travel between themes.

Images. Each photo is fitted at its own proportions inside a Mithila frame, so nothing is cropped:

| id | kind | default | shared |
|---|---|---|---|
| `title.photo` | couple | portrait 0 | – |
| `swayambar.photo` | couple | portrait 5 | `rite.swayambar` |
| `sindoor.bride` | bride | portrait 3 (or `bride.photo`) | – |
| `sindoor.groom` | groom | portrait 6 (or `groom.photo`) | – |
| `reception.photo` | couple | portrait 1 (use a bright photo) | – |

Texts (bilingual):

| id | shared |
|---|---|
| `cover.kicker` | – |
| `cover.open` | `gate.open` |
| `cover.quiet` | `gate.quiet` |
| `card.button` | `card.button` |
| `title.kicker` | `hero.kicker` |
| `title.cue` | – |
| `janti.title` | – |
| `swayambar.title` | `rite.swayambar.title` |
| `swayambar.line` | `rite.swayambar.line` |
| `pheras.title` | `rite.saptapadi.title` |
| `pheras.hint` | – |
| `sindoor.title` | `rite.sindoor.title` |
| `sindoor.line` | `rite.sindoor.line` |
| `reception.cta` | – |
| `days.title` | `events.title` |
| `days.cta` | – |
| `gallery.eyebrow` | `gallery.kicker` |
| `gallery.title` | `gallery.title` |

The illustrated figures are art, not slots. Use `?debug&override` to see a test override of two texts and two images
without editing `src/config.js`.

## What the studio needs to supply

- `couple.portraits`: at least 3 photos. See the slot table above for which portrait goes where. Frames take each photo's own shape.
- `couple.bride.photo` / `couple.groom.photo` (optional): the sindoor-page frames. If missing,
  portraits are used.
- `events`: the `wedding` event's `rituals` titles are matched for *Janti*, *Swayambar* and
  *Kanyadan/Sindoor/Saptapadi* times. A `reception` event enables the reception page.
- `saptapadi` (7 vows), `invitation` wording, `gallery`, `info`, `rsvp`, `music` are used as in every theme.

## Known limits

- The figures are profile puppets. During the fire rounds they "turn" by flattening horizontally at
  the sides of the circle, like a paper puppet.
- A long `venue` name wraps inside the caption label. Keep venue names short.
