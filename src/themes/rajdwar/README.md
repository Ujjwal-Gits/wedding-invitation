# Rajdwar (राजद्वार) · the royal gate

Page: `/rajdwar/` (demo) · `/rajdwar/?id=<invitation>` (studio data).

## Concept
Mahal's painted golden gate, opening onto Mangal's red-and-gold card. The gate and its opening are Mahal's; once
through it, the inside hero (Ganesh, ॥ श्री गणेशाय नमः ॥, शुभ विवाह, the names and the blessing over the red arch)
and every section below it are Mangal's, unchanged (see `src/themes/mangal/README.md`). No palace balcony, moon,
curtains or fireworks.

Code is copied, not imported: `rajdwar.css` and most of `main.js` are Mangal's; `hero.css`, the gate part of
`main.js` and `ribbon.js` are Mahal's.

## The gate (closed)
A painted golden gate (Canva AI, `decor/gate-frame`, `gate-leaf-l`, `gate-leaf-r`, black keyed out, leaves cut
along their arched tops), gold filigree under an arch of roses and wisteria. Ganesh (`hero.ganesh`) sits in the crest
medallion; an ivory satin bow (`decor/bow`) ties it, with cloth bands (`ribbon.js`) running to it from the pillars.
Behind it, from the start, is Mangal's red arch with its Dhaka band, seen through the bars. Phones: the painting
covers the screen. Wider screens: it stands centred in a dusky forecourt (`.rj-gate.is-wide .rj-gatebg`), so the
red glows only beyond the gate. The bow is a button; a dark card carries `gate.line`, `gate.open`, `gate.quiet`.

## Signature motion: untie, open, walk in
The bell rings and the crest glows; a tail is pulled, the bow wobbles loose and falls, the bands swing down and
drop. We lean in (the gate and the red arch beyond both come a touch closer), the latch gives with light at the
seam, the heavy leaves swing to 104 degrees with warm light pouring through and petals falling (pink from the
gate's roses, marigold and rose from inside). The camera walks through the gateway: the gate scales past and fades
while the arch settles back to exactly Mangal's framing. Then Mangal's own sequence, at Mangal's timings: Ganesh
large and glowing, then softly behind the words, which settle in a few at a time. Reduced motion: a crossfade.

## Colours (`slots.js` `colors`)
`--rj-red` (wall), `--rj-red-lt` (centre glow), `--rj-red-dk` (edges), `--rj-gold` (arch line, invocation, cue).
Defaults equal Mangal's values, so the inside matches `/mangal/` exactly.

## Performance
No permanent `will-change` on big layers: the gate, leaves, bow, red arch and Ganesh get GPU layers only while
`body.is-opening`. The leaf shade is a dark wash masked by the leaf picture (no filter on a moving piece), and it
exists only during the opening.

## Debug
`?debug` exposes `window.__mg`: `at(t)` (the opening paused at t seconds; the cloth only simulates in real time),
`open()`, `finish()`, `to(selector)`, `layout()`; `?debug&open` skips the gate; `?still` forces reduced motion;
`?lang=ne`.
