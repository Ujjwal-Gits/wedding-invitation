# Rose Arch (international, Christian, Pro Max)

**Concept:** walk through a stone arch of climbing roses into a garden of rooms: the body is a deck of room cards
that tilt up and lift into place, every event is its own deck card with an arched date plaque, and the deep rose
reply card lifts toward you out of the arch.

Deep rose (`#7E2A40`, the one accent) on the watercolor's own paper white, with blush and ivory rooms on a soft
garden-green field. Christian chapel-garden mood: the cross-and-rings emblem and a verse appear only when the
invitation's faith is Christian (`ctx.emblem`, `ctx.verse`); with `?v=neutral` or an `other` couple they vanish and
the layout stays complete.

## Opening (the signature)
The arch fills the screen with the emblem, "You're invited" and the names above it; **Step inside** and
**Open without music** stand in the green doorway. On open the words lift away, the arch scales up around its doorway
(transform only, `transformOrigin` at the doorway centre, the doorway also drifts to the screen centre) for 2.1s until
the soft green fills the view; a green veil and then a bright veil fade in, the gate fades out, and the first screen's
arch settles from 1.07 to 1. Reduced motion: the engine's plain fade.

## Sections (standard ids)
- `#top`: names above the arch (phone) or flanking it (desktop, the script ampersand in the doorway); the date, time
  and place stand in the green doorway. No text over the roses.
- `.ra-deck` (garden-green field) holds the rooms:
  - `#couple` (white room): full names, a matted whole photo, then `#story` alternating left/right along a spine.
  - `#date` (blush room): date words + calendar/share, the countdown in a pointed-arch window (2×2 panes).
  - `#programme` (on the field): sticky directory of events (desktop) + `#ev-<id>` deck cards, each with an arched
    date plaque; on desktop they are sticky and stack on one another.
  - `#card`: an arched ivory panel with the emblem, the verse, the hosts and `[data-open-card]`.
  - `#photos` (blush room): a photo wall, whole photos in three frame styles, rows justified by each photo's ratio.
  - `#info` (white room): travel lead paragraph, stays and contacts lists, the livestream band.
  - `#rsvp` (paper room): the rose arch with the couple's initials in its doorway; the deep rose card with a pointed
    cap and an ivory sheet holding `#rsvp-form`.
- `footer`: a small arch, the closing line, the names, the hashtag, Made with Nimtto.

## Scroll (`T.scroll`, desktop only: `(min-width: 900px) and (prefers-reduced-motion: no-preference)`)
Rooms enter tilted back (`rotateX 9°`, `y 70`, `scale .97`, per-element perspective) and flatten by the time they
are well in view; event cards rise tilted and flatten as they reach the stack while the card beneath sinks
(`scale .93`, `rotateX -4°`); the reply card lifts from `rotateX 16°`, `scale .88` with a growing shadow. All scrubbed,
transform/opacity only, ending in the plain readable layout. Phones and reduced motion: only the engine's `.vw-rise` fades.

## Slots
Images: `gate.arch` (full art, the opening is fitted to its doorway), `hero.arch` (arch crop for the first screen,
the reply room and the footer), `couple.lead`, `gallery.1`–`gallery.6`.
Texts: the standard ids (`gate.line gate.open gate.quiet hero.kicker hero.line couple.title story.title count.title
count.done prog.title gallery.title info.title live.line card.button families.title rsvp.title rsvp.yes rsvp.no
rsvp.send`) plus `faith.show`, `verse.text`, `verse.ref`.
Colours: `--vw-accent`, `--vw-bg`, `--ra-blush`, `--ra-sage`.

## Fonts
Bodoni Moda (display, pinned to `opsz 16` so hairlines never vanish; weights 400–600) + Figtree (body);
Mrs Saint Delafield only for the large ampersands.

## Art
`public/themes/rose-arch/art/`: `gate.webp` / `gate-sm.webp` (the owner-approved Canva AI watercolor
`scratchpad/intl/art/chapel.jpg`, 1200×2400, textless, no religious marks), `arch.webp` / `arch-sm.webp` (the same art
cropped from y 520, 1200×1880). The doorway sits at x 51%, y 60% of the gate art (`GATE_DOOR` in `main.js`).
Demo photos: the engine's CC0 set.
