# Noor (international, Muslim, Pro Max)

**Concept.** Carved jali doors part inside a sage mihrab arch; the body is a stack of arch-window panels on a sage
lattice field that rise toward you in depth; every event wears an 8-point-star date medallion; the reply card sits in
an envelope with an arch-shaped flap.

## Opening (the one signature motion)
The painted arch (`hero.arch`) fills a 1:2 stage that covers a phone (and is height-fitted with sage sides on wider
screens). Two SVG door leaves (8-point star lattice in `--nr-gold`, clipped to the arch window in the art's own pixel
coordinates, `OPEN` in `main.js`) sit inside the window; the foot florals (`art/flora.webp`, a cutout of the same
painting) stay in front of them. The plaque fades, the leaves swing open on their hinges (`rotateY`, 1.7 s), the stage
pushes in 3 %, and the names, line, date and place settle inside the arch. Reduced motion: the engine's fade.

## Sections (standard ids)
`#top` arch hero (phone: everything inside the arch; desktop: names in the arch, a star medallion with the date on
the left, venue and time on the right) · `#blessing` (only when faith marks are on: the engine's Bismillah + verse in
a slim panel) · `#couple` / `#story` (photo whole in a gold window, star-bulleted story) · `#date` countdown ·
`#programme` / `#ev-<id>` (star medallions) · `#card` hosts + full card · `#photos` (whole photos, gold mats) ·
`#info` travel, stays, questions, livestream · `#rsvp` / `#rsvp-form` (arch envelope) · `footer` (emblem, duas line).

Scroll: desktop only (`gsap.matchMedia`, min-width 900px, no reduced motion) every panel rises from depth
(`y`, `z`, `rotationX`, scrubbed). Phones get the engine's `.vw-rise` fades.

## Faith
`faith: 'muslim'`, `religions: ['muslim', 'other']`, `faithInk: '--nr-gold'`. The painted crescent was retouched out
of the art (OpenCV inpaint, `scratchpad/noor/prep.py`); `ctx.emblem()` draws it above the arch instead, so
`?v=neutral` or `faith.show = off` removes every mark. Verified with `?debug` and `?debug&v=neutral`.

## Slots
Images: `hero.arch` (doors and florals are fitted to the default art; with other art the florals overlay is skipped),
`couple.lead`, `gallery.1–6`. Texts: all standard ids + `faith.show`, `bismillah.show`, `verse.text`, `verse.ref`.
Colours: `--vw-accent` (deep sage), `--nr-gold`, `--nr-field`, `--nr-ivory`.

## Fonts and art
Bellefair (display) + Mulish (body). Art: owner-approved Canva AI painting `scratchpad/intl/art/nikah.jpg`
(1200 × 2400), crescent retouched out → `art/arch.webp` (+ `-sm`), foot florals cut out → `art/flora.webp` (+ `-sm`).
Demo photos: modest CC0 set from `_vow/demo.js` (rings, hands, bouquet; aisle, bouquet hug).
