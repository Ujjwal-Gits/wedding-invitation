# Sayapatri: the marigold doorway

Page: `/sayapatri/`. Entry: `src/themes/sayapatri/main.js`. Slots: `slots.js`. Test with the demo and with
`/sayapatri/?id=<client-slug>`, in English and Nepali (`&lang=ne`).

## Concept (round 5)
*Sayapatri* means marigold. The guest arrives at a traditional Nepali doorway dressed for a wedding:
- a mango-leaf toran on the lintel;
- strings of real marigold (sayapatri mala) hanging either side;
- a small printed card in the middle.

Inside is a calm editorial page in white and textured ivory, with generous space and very little text.

- **Palette:** marigold saffron, ivory/white, deep leaf green, and one deep sindoor red (button, ampersand, map
  links). Nothing else: no purple, pink, grey or white flower masses.
- **Type:**
  - Cormorant Garamond 400/500, at display sizes only (36px and up).
  - DM Sans for everything you read.
  - Noto Serif Devanagari for Nepali display, Mukta for Nepali body. Devanagari is never letter-spaced or
    uppercased.
  - Old-style figures are switched to lining figures for dates and the countdown.
- **Flowers:**
  - Real CC-licensed photographs: four *Tagetes erecta* heads and one mango leaf.
  - Cut out offline with a colour key and closed-form matting (`pymatting`), with halo-free foreground
    estimation. The leaf is toned to a fresh, deep green.
  - The heads are composed into strings, a finished toran (marigold knots at both ends), a short garland swag and
    one small cluster.
  - Nine WebPs in `public/themes/sayapatri/flora/`, about 756 KB in total.
  - Credits are in `flora-credits.json` and shown in the footer.
- **No text over or behind flowers.** On phones the card starts below the short inner strings and sits between
  the long outer ones; the HUD sits above the lintel.

## Signature motion
**The strings lift.** Tapping "Open the invitation" does the following:
1. The card fades.
2. The marigold strings rise into the lintel, inner ones first, drawing slightly apart like a raised curtain.
3. The toran follows them up.
4. The doorway fades into the page.

The motion uses transform and opacity only, with each tween 320–850 ms on one custom curve
(`CustomEase 0.7,0,0.2,1`). Everything else is quiet: short fade-ups as sections arrive. There is no parallax
and there are no drifting petals (`petals.js` was removed).

**Reduced motion** (`prefers-reduced-motion` or `?still`): the gate opens instantly with no animation.

**Debug:**
- `?debug` exposes `__sp.open()` and `__sp.go(id, progress)`.
- `?debug&slots={…}` previews studio overrides.
- `?open` skips the gate.

## Sections
1. **Gate:** the doorway, toran, strings and card (names, AD + B.S. date, line, two buttons, `?to=` guest line).
2. **Welcome:**
   - names, AD and B.S. date, city and one line;
   - one feature photo of the couple, whole, on a white mat;
   - the page's single floral cluster sits on the photo's corner.
3. **Garland divider.**
4. **The couple:**
   - a pair of photos at one shared height;
   - full names with parents;
   - hosts;
   - "Read the invitation card", which opens a dialog through `openModal`, so only the card scrolls.
5. **A quiet row:** up to three photos at one height. On phones a leftover photo stays modest instead of going
   full width.
6. **A trio:** one large photo and two small ones. `main.js` picks the side-by-side or stacked layout, whichever
   gives the larger smallest photo. Every photo is whole.
7. **Programme:** light cards. For each ceremony:
   - weekday and day;
   - name;
   - AD date and B.S. date (`bsDateOf`; an event's `dateBS` wins);
   - time (`timeLabel`, "onwards" for open-ended events);
   - venue with a map link;
   - dress only when given;
   - rituals when present.
8. **Finale (shared core markup, restyled):**
   - Gallery: first the couple's photos not already shown above, in level rows, every photo whole. Then
     library details as small even tiles.
   - Guest info, with empty columns hidden.
   - Countdown.
   - RSVP: the shared `core/rsvp.js` with the guest stepper.
   - Blessing, with a small framed closing photo (no circle crop).
   - Credits.

## Slots
- **Couple photos:**

  | Slot | Default |
  |---|---|
  | `hero.photo` | p0 |
  | `pair.left` (bride) | p1 |
  | `pair.right` (groom) | p2 |
  | `band.1–3` (quiet row) | p3–p5 |
  | `prints.1–3` (trio) | p6–p8 |
  | `closing.photo` (shared `place.closing`) | p9 |

  If a default repeats a photo already shown on the page, the next unused portrait is used instead.
- **Texts:** `gate.kicker`, `gate.line`, `gate.open`, `gate.quiet`, `hero.kicker`, `hero.line`, `pair.title`,
  `pair.bride.line`, `pair.groom.line`, `pair.card`, `prints.title`, `prog.kicker`, `prog.title`,
  `gallery.title` and `nav.*`. Most carry `shared:` keys.

## Known gaps
- The doorway is drawn with fine CSS lines (jambs and an extended Newar-style lintel), not carved photography,
  to stay distinct from Dhoka. It is quiet by design.
- The flower layers are about 756 KB in total. They are fetched as the gate loads; only the toran is loaded at
  high priority.
