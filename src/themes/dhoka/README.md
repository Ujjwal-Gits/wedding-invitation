# Dhoka (ढोका) · "Ivory Press"

A luxury printed invitation, experienced on screen. Crisp white stock (#FFFFFF) with a fine static
grain, deep ink (#111016) and one accent, sindoor red (`#A3161F` text, `#B8323A` rules); the
invitation-card section sits on a deep sindoor field (`#7E0F17`).

Type is set for reading (contract §11): **Newsreader 500** (optical-size serif, no hairlines) for names,
headings and dates; **Hanken Grotesk** for labels and body; **Eczar** (display) + **Mukta** (body) for
Devanagari. English body ≥ 17px desktop / 16px phone, Nepali ≥ 18 / 17px with line-height ≥ 1.75,
labels ≥ 12.5px English / 15–16px Nepali, body contrast ≈ 10:1.
Real photographs are set like plates in a fine book, with magazine folios ("No. I" … "No. VII")
and a running head.

Page: `dhoka/index.html` · Code: `src/themes/dhoka/` · Thumb: `public/themes/dhoka/thumb.jpg` · Dev port 5181.

## Signature motion (the only big one)

1. **Gate:** the entrance door (slot `gate.door`, default the Golden Door of Mul Chowk, Patan, `door-golden`, CC0) is printed as an
   uncropped 2:3 plate on the paper, names on the left, date and "Open the door" on the right
   (stacked on phones). CSS lays the plate out; `door.js` (`PlateDoor`, a copy of `core/door.js`)
   frames its 3D camera onto that exact DOM rect, so the photo is never cropped at any size.
2. **Open:** temple bell (`ringBell`), the leaves crack, then swing inward in 3D (unlit and shaded
   by angle, so the closed door matches the photo pixel for pixel). Warm light and dust spill out.
3. **Walk:** the camera walks through the opening into the courtyard (slot `gate.courtyard`, default `chowk`, depth photo).
   A door photo without a measured opening (any upload) is shown as a still plate, no 3D.
4. **Settle:** the full-screen view shrinks onto the hero plate (a "lens" clipped with inverse
   scale transforms only) and dissolves into the couple's first portrait. WebGL is then disposed;
   the rest of the page is plain DOM.

Any wheel, touch or key during the intro fast-forwards it (x3.2).

## Sections (calm editorial scroll)

| No. | Section | Scroll behaviour |
|---|---|---|
| I | Hero: names, date (AD + BS), city, `portraits[0]` at its own proportions | names drift slower than the plate |
| II | "Two families, one home": bride and groom with parents; **sticky stack of prints** (other portraits + bride/groom photos) | each print is laid over the last; snaps so one print is whole at rest |
| III | The marriage: Swayambar (couple photo), Kanyadan (karuwa), Sindoor, Saptapadi (fire) as plates | pinned **horizontal sequence** on desktop; a vertical list on phones (no half-cut photos at rest) |
| IV | The invitation, on a deep sindoor field: card cover and "Read the invitation card" | opens the full bilingual card through `openModal` (page locked, only the card scrolls) |
| V | **The programme** ("when is what"): one row per ceremony with weekday, day, month + year, B.S. date, ceremony name, time, venue + map, dress note with colour swatches, and a small photo (hidden on phones) | rows settle in once |
| VI | Album "Soon, together": couple photos first, library details last and uncaptioned; lightbox via `openModal` | columns drift at three speeds (desktop) |
| VII | Reply card (RSVP via `core/rsvp.js`), days to go, calendar, share, family contacts | sticky aside |
| — | Colophon: closing line, names, hashtag, photo and music credits | |

No photo is shown twice: hero, stack, rites, ceremonies and album are de-duplicated in that order.
Library marigold close-ups are kept out of the album (marigolds stay an accent). Couple slots never fall back to library people.
Couple photos keep their own proportions everywhere (no cropping); scene photos use focal points.

## What the studio needs to supply

- `couple.portraits[]` (first = hero; three or more recommended, each with `alt`), optionally
  `couple.bride.photo` / `couple.groom.photo` (added to the stack with their names).
- Names, full names, parents, `weddingDate`, `weddingDateBS`, `city`, `hosts`, `invitation.*`,
  `events[]` (`title`, `start`, `end`, `venue`, `mapQuery`, `photo`), `gallery[]`, `rsvp`, `info.contacts`, `closing`, `music`.
- Not used by this theme: `story`, `saptapadi` vow text, event `blurb`/`dress`/`rituals`, `info.stays`
  (kept minimal on purpose; the card dialog carries the long wording).

## B.S. dates

Every ceremony shows its B.S. date from the shared `bsDateOf(iso, event.dateBS)` (`core/i18n.js`); an event's own
`dateBS: { en, ne }` (the family's patro) wins.

## Slots (`slots.js`, read through `useSlots`)

Images: `gate.door` (scene, shared `place.entrance`), `gate.courtyard` (scene, `place.courtyard`),
`hero.photo` (couple, `{portrait:0}`), `couple.bride` / `couple.groom` (bride/groom, shown only when they exist),
`rites.swayambar.photo` (couple, `{portrait:1}`, `rite.swayambar`), `rites.kanyadan.photo` (detail, `brass-ware-alt`, `rite.kanyadan`),
`rites.sindoor.photo` (detail, `sindoor-alt`, `rite.sindoor`), `rites.saptapadi.photo` (detail, `mandap-alt`, `rite.saptapadi`).

Texts: `gate.invocation`, `gate.line`*, `gate.caption`, `gate.open`*, `gate.quiet`*, `hero.kicker`*, `couple.kicker`,
`couple.title`*, `couple.daughterOf`, `couple.sonOf`, `rites.kicker`, `rites.title`*, `rites.{swayambar,kanyadan,sindoor,saptapadi}.{title,line}`*,
`card.kicker`, `card.heading`, `card.button`*, `events.kicker`, `events.title`*, `events.label`, `album.kicker`* (`gallery.kicker`),
`album.title`* (`gallery.title`), `reply.kicker`, `reply.mark`, `reply.title`*, `reply.yes`, `reply.no`, `reply.send`, `reply.daysToGo`.
(* = has a `shared:` key from `core/slot-vocab.js`.) Form labels and "Open map"-style chrome stay as i18n strings in code.

## Fallbacks and accessibility

- `prefers-reduced-motion` or no WebGL: the same printed gate (door as an image); the button
  goes straight to the page; nothing is pinned, the stack and the rites become vertical lists.
- Bilingual via `bi()`; Devanagari is never tracked or uppercased. Dialogs are native `<dialog>`
  (focus trap, Esc). Text contrast is AA on the paper.

## Debug

`/dhoka/?debug` exposes `window.__dhoka` (`setDoor(p)`, `setCourt(p)`, `settle(t)`, `finish()`) and
`window.__dhokaSetContent({ images, texts })` (stores a `themeContent.dhoka` override in sessionStorage and reloads; `null` clears).
`?debug&skip` jumps to the page after the intro; `?static` forces the printed fallback.
