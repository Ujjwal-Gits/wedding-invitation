# Jali (international, Muslim, Standard)

**Concept.** Emerald mashrabiya screens slide apart under three glowing brass lanterns; the body is a bento of
geometric tiles; each event is an ivory tile with a gold star seal; the countdown sits inside an 8-point star; the
reply is a lattice tile that turns over in 3D to the reply card.

## Opening (the one signature motion)
Two screens (a star-and-cross girih lattice in gold, a CSS data-URI tile, on emerald) meet under three SVG brass
lanterns with a warm glow; an emerald plate with a gold star seal holds the names and the buttons. The plate fades, the
screens slide apart (`xPercent`, 1.6 s) and the glow warms; the hero's own lanterns sit exactly where the gate's hang,
so nothing jumps. Reduced motion: the engine's fade. After opening the hero glow breathes very slowly (off for reduced
motion).

## Sections (standard ids)
`#top` hero (lanterns, emblem, names, the day in a star) · bento tiles: `#couple` / `#story`, `#date` (countdown in an
8-point star), `#programme` / `#ev-<id>` (ivory tiles with star seals), `#blessing` (only with faith marks on: the
engine's Bismillah + verse on ivory), `#card` hosts + full card, `#photos` (whole photos, gold frames), `#info` and a
livestream tile, `#rsvp` / `#rsvp-form` (flip tile) · `footer`.

The reply tile turns over by its button, by focus moving into the form, or by itself once it is 45 % in view; it starts
turned in reduced motion and inside the studio preview (iframe), so the form is never hidden there.

Scroll: desktop only (`gsap.matchMedia`, min-width 900px, no reduced motion) the tiles arrive from different depths,
tilted toward the centre (`y`, `z`, `rotationX/Y`, scrubbed). Phones get the engine's `.vw-rise` fades.

## Faith
`faith: 'muslim'`, `religions: ['muslim', 'other']`, `faithInk: '--vw-accent'` (gold). Emblem in the hero and the card,
verse tile in the bento; `?v=neutral` / `faith.show = off` removes them and the hosts tile widens to fill the row.
Verified with `?debug` and `?debug&v=neutral`. No figures anywhere; no Arabic except the engine's Unicode Bismillah.

## Slots
Images: `couple.lead`, `gallery.1–6` (everything else is drawn in code). Texts: all standard ids + `rsvp.turn`,
`faith.show`, `bismillah.show`, `verse.text`, `verse.ref`. Colours: `--vw-accent` (gold), `--jl-emerald`, `--jl-ivory`.

## Fonts and art
Philosopher (display) + Source Serif 4 (body). No raster art: lattice, lanterns, stars and seals are SVG.
Demo photos: modest CC0 set from `_vow/demo.js`.
