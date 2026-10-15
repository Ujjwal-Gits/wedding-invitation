# Mahal (महल) · the palace gate

Page: `/mahal/` (demo) · `/mahal/?id=<invitation>` (studio data).

## Concept
Mangal's red-and-gold card, entered through a palace gate. Everything after the hero (couple arch, scratch-card
date, countdown, photo strip, families, card wording, programme, RSVP, blessing) is Mangal's, unchanged; see
`src/themes/mangal/README.md`. Only the opening is new.

## The gate (closed)
A painted golden gate (Canva AI): gold filigree leaves with medallions under an arch of ivory and blush roses and
lilac wisteria, fluted pillars. Its black background was keyed out and the two leaves cut along their arched tops
(`decor/gate-frame`, `gate-leaf-l`, `gate-leaf-r`), so the palace shows through the bars and the leaves still swing
in 3D. Our **Ganesh medallion** (`hero.ganesh`) sits on the painted crest disc. A painted ivory satin bow
(`decor/bow`) ties it, with satin bands (cloth, `ribbon.js`) running to it from the pillars; a soft ring pulses on
the bow. Phones: the painting covers the screen; wider screens: it stands centred on the terrace in front of the
palace. Positions are in `GATE` (main.js). The bow is a button; a dark card carries `gate.line`, `gate.open`,
`gate.quiet`.

## Signature motion: untie, open, the palace lights up
Tap the bow or the button: the bell rings and the crest glows around Ganesh. The ribbon is cloth (`ribbon.js`:
Verlet chains with length and bending constraints, drawn as shaded satin strips on a canvas; it only simulates while
it comes undone): the bow is tugged, wobbles loose and falls away; the two satin bands swing down and hang from the
pillars, then slip off and fall. We lean in, the latch gives with light at the seam, the heavy leaves
swing in to 104 degrees as warm light pours through and petals fall, and a short soft zoom carries us onto the
balcony: a painted scene (`decor/scene-portrait|landscape.webp`, generated with Canva AI) of an ivory palace beyond a
long reflecting pool lined with lanterns, under a full moon, seen over a marble balustrade, framed by velvet curtains.
It is there from the start (seen through the gate). The pool glistens (drifting streaks of light), the moon glow
breathes, the painted lanterns flicker, gold dust rises and a few fireworks burst now and then. Positions of the moon,
pool and lanterns in each painting are in `SCENE` (main.js); the painting is cover-fitted and kept near the top.
Ganesh appears with the painted moon as the halo behind his head, in a glow with slow rays, then ॥ श्री गणेशाय नमः ॥, शुभ विवाह and the names, a letter at a time.
Reduced motion: a crossfade, no fireworks. Photographs credited in `flora-credits.js`.

## Debug
`?debug` exposes `window.__mg`: `at(t)` (the opening paused at t seconds), `open()`, `finish()`, `to(selector)`,
`layout()`; `?debug&open` skips the gate; `?still` forces reduced motion; `?lang=ne`.
