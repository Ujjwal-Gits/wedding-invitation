# Mahal (महल) · the palace gate

Page: `/mahal/` (demo) · `/mahal/?id=<invitation>` (studio data).

## Concept
Mangal's red-and-gold card, entered through a palace gate. Everything after the hero (couple arch, scratch-card
date, countdown, photo strip, families, card wording, programme, RSVP, blessing) is Mangal's, unchanged; see
`src/themes/mangal/README.md`. Only the opening is new.

## The gate (closed)
A golden wrought gate drawn in code for the exact screen size (`palace.js`; nothing is cropped): fluted gold posts,
an arch with a bead line, a transom of rays and scrolls, a crest with a sunburst and lotus finial around the round
**Ganesh medallion** (`hero.ganesh`, mandatory by default), two leaves with an arcade, bars and collars, a ringed
medallion with four scrolls, a lyre band and a raised kick panel. Every gold stroke is a bevel (shadow, gold,
highlight). Flowers: an arch garland of blush, pink and ivory roses with lilac wisteria, cascades down the posts and
a cluster at each foot (`public/themes/mahal/decor`, made by `tools/decor.py` from the CC rose cut-outs; credited in
`flora-credits.js`). An ivory satin ribbon runs from both posts to a bow (drawn as cloth, see below); a soft ring pulses on it to invite the tap. On wide screens a warm
palace wall with moulded panels and two standing lanterns flanks the gate (its outline is cut out of the wall).
The bow is a button; a dark card at the foot carries `gate.line`, `gate.open` ("Untie the ribbon") and `gate.quiet`.

## Signature motion: untie, open, the palace lights up
Tap the bow or the button: the bell rings and the crest glows around Ganesh. The ribbon is cloth (`ribbon.js`:
Verlet chains with length and bending constraints, drawn as shaded satin strips on a canvas; it only simulates while
it comes undone): one tail is pulled and the loops slip through the knot, the knot gives, the two bands swing down
and hang from the posts, then slip off and fall. We lean in, the latch gives with light at the seam, the heavy leaves
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
