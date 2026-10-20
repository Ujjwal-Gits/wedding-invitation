# Palki (पाल्की) · the doli procession

Page: `/palki/` (demo) · `/palki/?id=<invitation>` · `?debug` (`window.__su.at(t)`, `.finish()`, `.to(sel)`, `window.__pk`),
`?debug&open`, `?still` (the calm version). Market: Nepal only. Faith: Hindu (Ganesh, kalash, sacred fire, saptapadi).
Engine: `src/themes/_suite/suite.js` (data, RSVP, countdown, scratch card, lightbox, card modal, music, opening safety
net) with `T.gate`, `T.hero`, `T.page`, `T.open`, `T.scroll`, `T.scratch`; the Nepali kit `_suite/nepali.js` (kalash,
diyo with a live flame, ganthi bandhan, saptapadi).

## Concept
Two bearers carry the bride in a decorated wooden doli and the groom rides beside her on a white horse, from her home
at misty blue dawn, through the hills of Nepal, to the mandap on the night of lamps. Open landscape and a story told in
six painted places, unlike `janti` (a Newari street, golden hour, the band).

Palette (on `body.su.theme-palki`): dawn-rose silk `#F7E7E4` (every cloth you read on, with a real silk texture and a
red-and-gold brocade hem), deep green `--su-accent #1E4A37` (the one accent: titles, buttons), marigold `--pk-marigold
#C9721A` (rules and numbers; `#8A4310` as small text), night indigo `--pk-night #171A3A` with diyo gold `#F2C46B` (the
last chapter). Type: Brygada 1918 (Latin display), Rozha One (Devanagari display), Mukta (reading, both scripts).

## Opening
The dawn scene under heavy mist, a carved doli pole with a rolled silk band (the couple's initials). Tap the band or
the button: the two mist banks part, the band unrolls into the first screen's banner (Ganesh, शुभ विवाह, the names, AD
and B.S. date, venue, one line), and the doli waits at the door with the groom.

## Signature: the procession
A fixed painted world sits behind the page (`#pk-world`): six scenes, each with its own portrait (phones) and landscape
painting, sized to cover with a focal point. As the guest scrolls, the procession (two cut-outs: doli with bearers, groom
on the horse) walks each scene's trail from the far distance toward the camera with perspective (geometric growth along
a curve, a step bob tied to the distance walked), then past it. Between scenes the camera pushes on: the old painting
scales up and fades, mist passes the lens, the next painting settles in. Day scenes get fresh marigold and rose bushes
close to the lens. Transform and opacity only; the cut-outs are lit per scene (dawn, sunrise, day, dusk, night).

Chapters (`.pk-beat` = the walk, then the chapter's cloths):
1. Home at dawn: the elders' blessing, the card line, hosts, kalash and diyo, the full card.
2. The hills at sunrise: the couple between two red doli curtains that part on view; the photographs as framed prints.
3. The chautari (a pipal and a bar tree side by side): the two families on two cloths, the ganthi bandhan between.
4. Across the river (suspension bridge, pagoda temple): one cloth per celebration (AD + B.S., time, venue + map, dress,
   order of the day), calendar and share, travel/stays/contacts.
5. Arriving at dusk (the welcome gate, rangoli, diyos): the procession comes in under the gate and stops at the rangoli;
   the day under a dawn mist you scratch away, the countdown.
6. The mandap on the night of lamps: the doli is carried in beside the mandap and set down, clear of the sacred fire;
   the seven steps (saptapadi), the reply on indigo silk, the blessing with two diyos.

In the first four places the procession walks toward the camera and sinks out under the lens; in the last two it
arrives and stays (`stop: true`), then fades before the next place. The near flowers slide out of the frame as the
procession reaches the camera (never fade over the bearers).

Reduced motion / `?still`: the world swaps paintings with a fade as each chapter comes up; the procession stands still
(at the door at home, half-way down the trail on the road, arrived at the gate and the mandap); no walking, no push-in, no mist; the opening is a plain fade.

## Slots (`slots.js`)
Images: `hero.ganesh`, `couple.lead`, `gallery.1`–`6`, `families.bride|groom`. Texts: gate line/buttons, Ganesh on/off,
invocation, first banner title and line, the six chapter labels, chapter titles and lines, card line/button, gallery
title, date title, scratch hint/button, countdown title, vows title, RSVP title/send. Colours: `--su-accent`,
`--pk-marigold`, `--pk-night`. The paintings and the procession are the design, not slots.

## Art (Canva AI, made for this theme; `public/themes/palki/art/`)
`s1`…`s6` (`-l` 1680×944 and `-l-sm`, `-p` 944×1680 and `-p-sm`), cut-outs `doli`, `groom` (with `-sm`), `curtain`,
`pole`, `flowers`, textures `silk-blush`, `silk-night`, `brocade` (a repeating hem), `mist` (alpha). Originals were
exported full size from the "Palki art board" in Canva (design `DAHYjjCkLW4`) and are not committed (`art-src/palki/`).
