# Vasant (वसन्त) · the spring garden of butterflies

Slug `vasant` · page `/vasant/` · engine `_suite` (data, RSVP, countdown, scratch, lightbox, music, gate safety net)
· market **both** (`slots.js`: `market: 'both'`, style `garden`; no religious marks, so it sits on the international
site too) · tier Pro Max.

A botanical book come alive: haldi-cream cotton paper, leaf-green Ibarra Real Nova headings, Hind for reading
(Mukta for Nepali, Halant for Devanagari display, never for digits), rani pink `#C2185B` as the one accent.

## Signature motion (two moments, nothing else moves much)

1. **Opening: butterflies lift off the garland.** The first screen is a fresh marigold-and-rose garland hung like a
   toran; eleven rigged butterflies rest on it, slowly opening and closing their wings. The gate is see-through: only
   the couple's initials and the open button sit on top. Tap: the butterflies take off from the middle outwards and
   scatter past the edges on curling paths (GSAP timeline, transform only), three stay and settle again, and the
   names appear on the paper under the garland.
2. **The sticky bloom window.** Each ceremony gets its own flower (haldi marigold, mehendi pink lotus, wedding red
   rose, reception orchid, anything else blush rose; matched by the event's id/name, never repeated until all five
   are used). The flower is a botanical plate in four stages (bud, opening, half, full). As the ceremony's card rises
   to the middle of the screen the stages grow into each other (crossfade + a small scale about the flower head), and
   when it is open two butterflies fly in and land on it. Desktop: the window is the sticky left half; phone: a
   sticky band (50svh) above the cards. Only events present in the data are rendered (guest links filter them).

Butterflies are rigged, not videos: each species (lime swallowtail, crimson rose, plain tiger) is a cut-out split
into left wing, right wing and body; the wings `rotateY` about the body (CSS keyframes, paused off screen).

## Sections

Hero (garland, names, date AD + B.S., venue) · the couple tipped onto a herbarium sheet with photo corners and a
pressed blush rose · the date under a butterfly wing (scratch card) + the countdown as wingbeats (the butterfly
between the numbers beats once a second) · families as one plate of two pressed sprays with herbarium labels ·
the bloom window programme · the photographs as herbarium plates (each with a spray and a plate number) · the card
slip · RSVP as a seed packet · closing.

Reduced motion / `?still`: no flight, wings flat, every flower shown open with its butterflies resting; the window
still changes plate as cards pass.

## Studio slots

Images: `couple.lead`, `gallery.1-6`, `families.bride/groom`, `hero.ganesh` (only on the full card, `ganesh.show`
defaults to off). Texts: gate line/buttons, `hero.title`, `hero.line`, couple, date, countdown, families, programme,
gallery titles, card line/button, scratch hint/button, `rsvp.kicker`, `rsvp.title`, `rsvp.send`. Colours:
`--va-paper`, `--va-leaf`, `--su-accent`. Mix: hosts other gates; its own gate/hero are not offered (they share the
garland).

## Art

All art was painted for this theme with Canva AI in the owner's account (art board "Untitled (750 x 430 px)",
design `DAHYXq6SDx4`, exported full size) and cut out with Canva Background Remover: the garland, three butterflies,
four pressed sprays and twenty plates (five flowers x four stages, each later stage generated from the full bloom as
reference so the stem and leaves stay put). Plates are tone-matched to one paper colour and stored as WebP at
900x1200 and 600x800 under `public/themes/vasant/art/` (about 2.4 MB in all; the window loads the stages lazily).
