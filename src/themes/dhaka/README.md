# Dhaka Modern (ढाका)

A design-led invitation for a modern couple. It uses a Swiss grid, oversized Archivo type and the Dhaka weave of Palpa and Tehrathum, rebuilt as a generative system. No ornament images are used. Every Dhaka pattern on the page is woven in code (`weave.js`).

Page: `/dhaka/` (dev port 5187). Data: `loadInvitation()`. Add `?id=<slug>` for studio data, `?lang=ne` for Nepali and `?debug` for test hooks.

## Concept
Dhaka is a supplementary-weft inlay. Coloured threads float over a plain ground in stepped diamonds and chevrons, laid down band by band, with colours changing between bands. `dhakaCell(x, y)` returns the colour of one weft float. Because it works on a square grid with Manhattan-distance diamonds, it produces the stepped Dhaka look. `stitch()` and `paintRow()` draw each run as a thread with a tie every few cells.

- Palette: crisp white ground `#FFFFFF` and ink `#121212`. Crimson `#C21F2E` is the UI accent and fills the moving phrase band. Mustard, teal and orange appear inside the weave only. Black fields carry the ceremonies and the footer.
- Type: Archivo (variable width and weight) for the oversized display text, Brygada 1918 italic for the ampersand and short lines, IBM Plex Mono for labels and Noto Sans Devanagari for Nepali.

## Signature motion: the loom
The `.loom` section is pinned for about 3.6 screens. Scrolling weaves the cloth from the bottom up, one row at a time. A shuttle runs the rows left and right in turn. The rows build Dhaka selvedge bands and the couple's initials. The initials are Latin by default and switch to Devanagari (आ / स) in Nepali. Next the cloth holds. Then each row is pulled out sideways, top first, to reveal the couple portrait and "Getting married". It is drawn on Canvas 2D: one pre-rendered cloth plus one `drawImage` per row each frame.

## Sections
1. **Gate**: a woven band column, the names, and "Open with music" or "Open quietly".
2. **Hero**: names fitted to the full grid width, the hero portrait (`portraits[0]`, never cropped on desktop) and one line. The name lines slide apart as you scroll.
3. **Loom**: the signature scene, which reveals `portraits[1]`.
4. **Marquee**: two rows of Nepali and English phrases that move with scroll, between woven borders.
5. **The two of us**: a collage in justified rows. Each row shares one height and uses each photo's real aspect ratio, so nothing is cropped. Rows drift in opposite directions like weft. Clicking a photo opens a lightbox. Photos carry numbers, not narrative captions. The heading shows "Since {first story year}" and the last, forward-looking story line.
6. **Ceremonies**: a pinned horizontal ribbon (on phones, one full ceremony per screen, snapping into place) with number, name, date, time, place, map link, dress swatches and an optional programme.
7. **Two families**: bride and groom portraits. When there is no upload, a woven monogram shows instead. "Read the invitation card" opens a `<dialog>` with the full wording and the parents' names.
8. **Reply**: countdown plus a clean RSVP form. It reuses `core/rsvp.js` (same IDs, honeypot, validation and endpoint).
9. **Guest info** (wear, stay, questions) and a footer with credits for the photos actually shown.

## Slots (studio-replaceable, `slots.js`)
All of these are read through `useSlots(manifest)`. Test with `?debug&slots=demo`, which applies a sample override.

Images:
- `hero.photo` (couple, portrait 0)
- `reveal.photo` (couple, portrait 1)
- `us.1` to `us.8` (couple, portraits 2 to 9; duplicates are skipped)
- `fam.bride` and `fam.groom` (bride and groom; empty shows the woven initial)

Texts:
- Entry: `gate.kicker`, `gate.music`, `gate.quiet`
- Hero: `hero.kicker`, `hero.line`, `hero.cue`
- Weave and reveal: `loom.hint`, `loom.count`, `reveal.kicker`, `reveal.title`
- Moving band: `marquee.1` to `marquee.3`, shown in both languages at once
- Photos: `us.title`, `us.since` ({year}), `us.frames` ({n})
- Ceremonies: `rib.title`, `rib.sub` ({n}), `rib.end`, `rib.cta`
- Families: `fam.title`, `fam.bride`, `fam.groom`, `fam.card`
- Card and reply: `card.title`, `reply.title`, `reply.send`

Event photos, gallery, story, names, dates, venues and card wording are invitation data.

Shared keys (`src/core/slot-vocab.js`), so content entered in another theme appears here too:

| Dhaka slot | Shared key |
|---|---|
| `gate.kicker` | `gate.line` |
| `gate.music` | `gate.open` |
| `gate.quiet` | `gate.quiet` |
| `hero.kicker` | `hero.kicker` |
| `hero.line` | `hero.line` |
| `us.title` | `couple.title` |
| `rib.title` | `events.title` |
| `fam.card` | `card.button` |
| `reply.title` | `reply.title` |

The invitation card and photo lightbox are native `<dialog>`s opened through `core/modal.js` `openModal` (`data-lenis-prevent`). Only the dialog scrolls, the page stays still, and closing returns to the same position.

## What the studio must supply
- `couple.portraits`, at least 3 and ideally 6 or more. `[0]` is the hero and `[1]` is the loom reveal. The rest, plus people photos from `gallery`, fill the collage.
- Optional `couple.bride.photo` and `couple.groom.photo`. Without them the page weaves monograms.
- Uploaded photos may carry `w`/`h` (used for exact justified rows) and `focal`.
- Names in `en` and `ne`. The first letter or akshar of each name is woven.
- Events with `photo`, `venue`, `mapQuery`, `dress`, and optionally `rituals`. Also `story[0]`, `invitation`, `rsvp` and `info`.

Hero and photo names are fitted to the real rendered box in both scripts: the width of the widest line and a height budget (Devanagari matras are tall).

## Accessibility and motion
Only transform and opacity are animated, plus canvas drawing. Lenis smooths the wheel only and touch keeps native momentum. There is no parallax on phones. With `prefers-reduced-motion`, nothing is pinned: the woven initials show as a still and the ribbon becomes a focusable sideways scroller. Devanagari is never letter-spaced or uppercased. Text and focus colours meet AA (crimson on the ground is about 5:1, the light crimson used on black is about 5.3:1).

## Debug
With `?debug`:
- `__dk.enter()` opens the gate.
- `__dk.loom(p)` sets the loom progress.
- `__dk.scrollTo(y)` scrolls the page.
- `__dkAll()` returns all ScrollTriggers.
