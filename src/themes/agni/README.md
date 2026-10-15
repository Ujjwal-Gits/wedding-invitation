# Agni (अग्नि) · the sacred fire at night, seven rounds around it

Page: `/agni/` (demo) · `/agni/?id=<invitation>` (studio data) · `?debug` (`window.__su.at(t)`, `.finish()`, `.to(sel)`), `?debug&open`, `?still` (reduced motion).
Engine: `src/themes/_suite/suite.js` (`T.page`, `T.scroll`, `T.scratch`) and the shared Nepali kit `_suite/nepali.js`.
Everything for the theme is in `main.js` and `agni.css`.

## Concept
The moment of the pheras: the couple walks round the agni (sacred fire) at night. Deep aubergine-charcoal night
`#140C10`, brass `#D2AC66` for lines and buttons, ember `#F0873A` as the one accent (the fire, the "&", the round number,
the countdown digits, the ceremony dates), ivory `#F4E8D3` text. Everything warm on the page is lit by the fire. There are
no borders with radius and no cards with shadows, only 1px brass hairlines.
Type (no other theme uses these): **Castoro Titling** (engraved capitals: names, headings, numerals), **Castoro**
(italic lines), **Kadwa** (all Devanagari display) and **Mukta** (reading text).

## Signature motion: the fire catches
The gate is see-through: the hero waits underneath, unlit. Brass Ganesh is faint, the names barely catch the dark, and
the havan kunda (`art/kunda.webp`, dry logs, no fire) is a dark shape at the foot of the screen. On tap, one ember drops
from the button into the logs. Eight live flames (kit `flame()`, positions measured on the logs, see `FIRE` in main.js)
spring up from the middle outward, the glow floods outward, the night warms, embers start to rise, and the light reaches
Ganesh and then the names. Phones stack Ganesh, the names, the line and the fire. On desktop the bride's name and the
groom's name sit either side of the fire. The kunda takes the room the words leave (`ready()` → `--ag-kw`).

## Scroll journey: the pheras
`#vows` pins a stage with a real CSS 3D ring (perspective, `preserve-3d`, `rotateX` tilt and `rotateY` by scroll):
- The kunda burns at the centre as a billboard.
- Seven brass diyos stand on a brass floor ring, and the camera turns slowly round the fire.
- The couple (`art/pheras.webp`) walks the ring as a paper-theatre cut-out tangent to the circle. They pass in front
  walking right, turn edge-on at the sides, and go behind the fire mirrored, walking left.
- Each round passes in front once. As it does, the next diyo catches, the round counter moves (Round n of 7, फेरा n / ७)
  and that round's vow (सात वचन, slots `vow.1`–`vow.7`) fades in. Vows change while the couple is behind the fire.

After the walk, the page keeps circling: every block swings in on an arc round a far-off centre (`rotateY` with a deep
`transformOrigin` z), alternating direction per section.
1. **Couple:** the photo in a brass-lined frame with firelight at its foot, the words beside it.
2. **Date:** a scratch card made from a round brass plate under soot and ash (`paintSoot`, with a few embers still warm).
   Wipe it to read the date (A.D., B.S., time). Next to it, the countdown in glowing ember digits.
3. **Families:** either side of a tall brass Panas lamp with live flames.
4. **Programme:** a path of brass diyos down a hairline rail. Each lamp catches as its ceremony comes up. The panels
   alternate sides on desktop. Each one has the date in A.D. and B.S., time, venue and map, dress and order of the day.
   Then calendar, share and more info.
5. **Photos:** brass-lined frames with the lightbox. **Card wording** with Ganesh. **RSVP** on a dark brass-lined panel.
6. **Closing:** two diyos, the blessing and the names.

Performance: only transform and opacity are animated. Flames and embers pause off-screen, and `will-change` is set only
under `body.is-opening`. The 3D stage is about 10 flat planes. `.ag-page` uses `overflow-x: clip` so the arc entries
never widen the page. Reduced motion: the engine crossfades the gate, the fire is simply lit, nothing is pinned, the
stage is still with every diyo lit, and the seven vows are a plain list.

## Colours (studio, `slots.js` → `colors`)
`--ag-night` (night), `--ag-brass` (brass), `--ag-ember` (firelight: glows and ember accents), `--ag-ivory` (text).

## Art
- `public/themes/agni/art/`: `kunda` (brass havan kunda on marigolds and mango leaves, unlit) and `pheras` (the bride
  holding the groom's patuka). Both are Canva AI, transparent webp, `-sm` variants.
- Shared kit (`public/themes/_nepali/`): `ganesh-brass` (default Ganesh), diyo and Panas lamps, live flames.
- `public/themes/agni/thumb.jpg`: the opened hero at 1200x900.
