# Sayapatri: floral wedding stage

Page: `/sayapatri/`. Entry: `src/themes/sayapatri/main.js`. Slots: `slots.js`. Dev server:
`npx vite --port 5183 --strictPort`. Test with the demo and with `/sayapatri/?id=<client-slug>`.

## Concept (round 4)
A premium floral wedding-stage invitation, in the style of a Nepali wedding stage with rose and wisteria
canopies:
- **The gate.** The guest enters through a lush floral gate: a rose, peony and hydrangea canopy with wisteria
  hanging from it, two flower columns, and a printed card hung in the middle.
- **The page.** Inside is a crisp white page. Floral arrangements frame each section.
- **Couple photos.** The couple's photos sit in different premium frames:
  - a floral arch (rounds only the top of a portrait; landscape photos get a soft rectangle)
  - a framed pair with double hairline frames
  - an edge-to-edge justified photo row (every photo whole)
  - polaroid prints
  - a round closing photo
- **The rest.** A crystal-clear programme, photos, guest info and RSVP.

Deep rose-wine is the one accent colour. There are no flat colour blocks; the only tint is a very light
blush field.

**Flowers.** All flowers are real CC-licensed photographs, cut out with rembg (isnet) or sky-keyed for the
wisteria, then composed offline into transparent WebP layers in `public/themes/sayapatri/flora/` (each with
an `-sm` twin for phones). Credits are listed in `flora-credits.json` and shown in the footer.

**Type (§11).**
- Kalnia 500 only at display sizes (40px and up). DM Sans for everything smaller.
- Sura 700 for Devanagari display, Mukta for Devanagari body.
- English body text 17px or more (16px on phones); Nepali 18px or more (17px on phones).

## Signature motion
**Walking through the gate.** Tapping "Open the invitation" fades the card, the flower columns part
outwards, the canopy lifts, and the page comes forward underneath. Rose petals (the 3D layer in `petals.js`)
fall during the opening. They stay only in the welcome section and behind the closing blessing, and always
sit behind photos and words. Everything else is quiet: fade-up reveals, florals drifting slightly slower than
the page, and polaroids dealt in.

Reduced motion (`prefers-reduced-motion` or `?still`): the gate opens instantly; no petals or parallax.
Debug: `?debug` exposes `__sp.go(id, progress)` and `__sp.open()`. `?debug&slots={…}` previews studio
overrides.

## Programme
For each ceremony:
- a date block (weekday, large day number, month and year)
- the ceremony name, large
- the full AD date and the B.S. date (`bsDateOf`, an event `dateBS` override wins)
- Time (`timeLabel`, which adds "onwards" for open-ended events)
- Venue with a map link
- What to wear, with colour swatches
- the wedding rituals, when present

## Slots
- **Couple photos:** `hero.photo` (p0), `pair.left` (bride, p1), `pair.right` (groom, p2), `band.1–3`
  (p3–p5), `prints.1–3` (p6–p8), `closing.photo` (p9, shared `place.closing`). If a default repeats a photo
  already shown on the page, the next unused portrait is used instead.
- **Texts:** `gate.kicker`, `gate.line`, `gate.open`, `gate.quiet`, `hero.kicker`, `hero.line`,
  `pair.title`, `pair.bride.line`, `pair.groom.line`, `pair.card`, `prints.title`, `prog.kicker`,
  `prog.title`, `gallery.title`, `nav.*`. Most carry `shared:` keys.

## Known gaps
- The flower layers total about 2 MB on desktop (about 1 MB on phones) and load with the gate.
- The white rose's outer petals are lifted towards ivory. Under close inspection they still read slightly
  photographic grey.
