# Mandap · Sacred Fire (पवित्र अग्नि)

A full-screen 3D night diorama. A lit Nepali mandap stands in a dark brick courtyard
under hanging marigold strands. The bride and groom are rigged human figures dressed
in code. As the guest scrolls, they act out the wedding rites.

Page: `/mandap/` · code: `src/themes/mandap/` · 3D core: `src/core/mandap3d.js` · assets: `public/themes/mandap/`

## Signature motion
**The crane.** After the entry tap the camera cranes down from the night sky through
hanging marigold strands to the lit mandap, and the names kindle letter by letter.
After that, scrolling moves the story forward. Each section is a camera station, and
long moves arc up over the mandap rather than cutting through it.

## Sections (scroll stations)
| # | Section | What happens in 3D | Text on screen |
|---|---|---|---|
| 0 | Gate | Looking down from the sky through the strands | Names, one line, *Enter with music* / *Enter quietly* |
| 1 | Hero | The crane lands; the bride waits by the fire | Names, date · city, *Read the invitation card* (dialog with the full wording) |
| 2 | The two of us | The couple's photos on brass easels behind the mandap, lit by a moving lantern | Year + one story line per photo |
| 3 | Ceremonies (Janti) | The groom walks the lamp path past an engraved brass plaque for each event, then reaches the bride | Event, date, time, venue, map link |
| 4 | Swayambar | The bride lifts the mala in both hands, raises it over the groom's bowed head and lowers it onto his shoulders; then he does the same for her. The hands stay on the mala (IK) until it rests, then let go. The mala is a loop hung from the real hand positions and kept outside the receiver's head and chest | One line |
| 5 | Saptapadi | Seven clockwise rounds of the fire (groom leading, bride following, tied by the ganthbandhan). A diyo lights each round | Round numeral + that round's vow |
| 6 | Sindoor & pote | The groom draws sindoor along her parting (vermilion puff), then fastens the pote and tilhari | One line |
| 7 | Finale | Shared `core/finale.js`: gallery, guest information, countdown, RSVP, blessing, credits | — |

## The figures
- Bodies and animation: **Quaternius "Universal Base Characters" (Standard)** and
  **"Universal Animation Library" (Standard)**, both **CC0 1.0**
  (quaternius.com, quaternius.itch.io). Only `Walk_Formal_Loop` and `Idle_Loop`
  (rotation tracks plus pelvis translation) are kept. Eyes, brows and textures are
  removed. Packed with meshopt in `tools/pack-figures.mjs`: bride.glb 160 KB,
  groom.glb 170 KB, anims.glb 110 KB.
- At load, each body is re-baked into rest-space geometry and shares one skeleton with
  its clothes. The heroic proportions are eased: the groom's shoulder joints move
  inward, and both figures get slimmer arms, neck and chest. The bride's hair is hidden
  under the ghumto. The
  front of the head is smoothed into a calm, featureless porcelain face.
- Every garment is generated in code and skinned to the same bones. Each is relaxed so
  it drapes over the musculature, kept clear of the skin, and layered against the
  garment beneath it:
  - **Bride:** red cholo with a scoop neck; a pleated sari skirt with a woven gold
    border hem; the pallu crossing from the right hip over the left shoulder; a ghumto
    over the head with gold-bordered edges framing the face; red and gold chura;
    green pote and gold tilhari (these appear at the sindoor); a sindoor line in the
    parting.
  - **Groom:** ivory daura with sleeves and a knee-length skirt; suruwal; a dark
    istakot with brass buttons; black shoes; a Dhaka topi.
  - **Both:** marigold malas exchanged at the Swayambar.
- Animation blends walk and idle by speed. The step phase follows distance walked, so
  feet do not slide. The sari keeps the bride's stance closed and her steps short.
  Two-bone arm IK handles holding and placing the malas, the bride's folded hands
  during the rounds, and the sindoor and pote gestures. Spine bows are added for
  receiving the garland.

## Look
- Type: **Marcellus SC / Marcellus** (engraved inscriptional capitals), **Spectral**
  (body), **Martel** (Devanagari). No Pinyon Script, no Cormorant.
- Palette: night indigo `#07060c`, fire gold `#e8a64a` / `#f6d79c`. Sindoor red appears
  only in the scene.
- Marigolds are UV spheres with a canvas petal texture and bump, rounder in the mandap
  garlands and malas, lighter in the far overhead strands.
- Renderer (`renderer.js`): MSAA, a NaN/spike clamp before the bloom, HDR bloom on
  fire and lamps, ACES, vignette, grain.
  Resolution adapts (DPR cap 1.75 on desktop, 1.5 on phones; it drops when frames are
  slow). Shadows are off on phones. Marigolds are instanced. Rendering pauses once
  the finale covers the screen.

## Natural motion
- **Pace:** scroll sets where the story should be. The couple get there at a natural pace:
  about 1 m/s walking, a little brisker when far behind, one rite after another.
  Chapter jumps snap.
- **Walking:** walk and idle cross-fade over about 0.3 s. Steps follow the distance
  actually walked, so feet do not slide.
- **Standing still:** both figures breathe and shift their weight slowly between feet.
  The head turns, eased, toward whoever they attend to: the groom arriving, each other
  at the Swayambar, each other at the sindoor.
- **Hand contacts:** the garland ends are the palms; the sindoor touches the hairline
  under the ghumto edge; the pote is fastened at the sides of the neck.

## Studio slots (`slots.js`, read through `useSlots`)
- **Images:**
  - `us.photo1`–`us.photo5`: couple portraits 0–4 on the easels.
  - `us.bride` / `us.groom`: shown when the bride or groom has their own photo.
  - `still.background` (shared `rite.fire`): the no-WebGL background.
- **Texts:**
  - Opening screen: `gate.invocation`, `gate.line`, `gate.open`, `gate.quiet`.
  - Hero: `hero.kicker`, `hero.card`, `hero.hint`.
  - Easels and ceremonies: `us.title`, `us.kicker`, `days.title`, `days.arrive.kicker`,
    `days.arrive.line`.
  - Swayambar: `rite.swayambar.kicker`, `.title`, `.line`.
  - Seven rounds: `rite.saptapadi.title`.
  - Sindoor: `rite.sindoor.kicker`, `.title`, `.line`.
  - Finale: `gallery.kicker`, `gallery.title`, `reply.title`.
- Shared keys are set wherever the meaning matches the shared vocabulary. Names, dates,
  events, vows, story lines and card wording come from the invitation data.
- The invitation card opens through `openModal`: only the card scrolls. The gallery
  shows the couple's photos first, every photo whole, and no narrative captions.

## What the studio must supply
- `couple.portraits` (3 or more; up to 5 are framed in 3D) with `alt`. A mostly black
  photo gives its easel to the next unused portrait. Moderately dark ones are lifted
  with a gamma curve. Optional
  `couple.bride.photo` / `couple.groom.photo`: these are framed first, with the
  person's full name and parents as the caption.
- `story[]`: the year and line under each portrait (one line each, keep it under ~15 words).
- `events[]`: each gets a plaque, engraved with the title and day in the current
  language, redrawn when the language is toggled.
- `saptapadi[7]`, `invitation`, `hosts`, `weddingDate`, `city`, `rsvp`, `music`, `gallery`.

## Debugging
`/mandap/?debug&manual&skip` skips the gate and stops the render loop. In the console:
- `__m.go('hero'|'us'|'days'|'sway'|'seven'|'sindoor'|'finale'|'rsvp', t, { walk })`
  jumps to a station and renders a settled frame.
- `__m.intro(0..1)` scrubs the crane.

`?still` forces the reduced-motion path: no crane, camera cuts between stations.
Without WebGL, the page falls back to stacked text over a photograph.

## Known gaps
- The figures come from a stylised base mesh. Bodies, walks and clothes read as real
  people, but the groom's shoulders are still broad, and the cloth is shaped
  procedurally, not simulated.
- Dressing the figures takes about 1–3 s of CPU on a phone. It runs behind the gate's
  loading bar.
