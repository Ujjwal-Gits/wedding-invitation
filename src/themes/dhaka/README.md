# Dhaka (ढाका): heirloom stationery among real flowers

A calm, readable invitation built like a luxury stationery suite and set among real flowers. The page is textured ivory paper, with ink and one sindoor accent. Palpali Dhaka cloth appears with restraint: as the ribbon around the envelope, as the envelope lining, and as narrow bands on section headings.

Page: `/dhaka/` (dev port 5187).
- `?id=<slug>`: studio data, e.g. `?id=<client-slug>`.
- `?lang=ne`: Nepali.
- `?debug`: test hooks.

## The opening (signature motion)
The envelope rests on the paper among two real bouquets (roses, marigolds, leaves) and a few loose blooms. It is tied with a Dhaka band and sealed with wax pressed with the couple's Devanagari initials.

When the guest taps the seal, each step reveals something:
1. The seal breaks into two halves that fall away.
2. The Dhaka band slides off both sides.
3. The flap opens on the Dhaka lining.
4. The couple's photo rises out of the envelope.
5. The envelope drops away, and the photo travels to its place in the welcome frame.
6. Meanwhile the flowers lift off the table and gather, bouquet by bouquet, into a floral frame around it.
7. Finally the names, both dates and the place settle in.

Only transform and opacity are animated, and it takes about 3.3 seconds. The flowers are DOM elements of the welcome section and simply land in their frame positions, so there is no swap. With reduced motion the envelope just fades.

Phones and wide screens use separate frame and table layouts (`FRAME_TALL`/`FRAME_WIDE` and `TABLE_TALL`/`TABLE_WIDE` in `main.js`).

## The page
1. **Welcome**: a floral frame (a heavy bouquet at top left and bottom right, light accents in the other corners). Inside it: शुभ विवाह, the welcome photo in a mat, the names, the invitation line, the AD and B.S. dates, the place, and "Read the invitation" (a letter dialog).
2. **The two of us**, with different treatments:
   - a tilted mounted print with a real rose tucked into its corner, next to one line;
   - a framed pair (one dark frame, two windows, a Dhaka ribbon below);
   - a full-width feature: the sharp photo over a soft blurred copy of itself, with floral borders;
   - loose prints in justified rows, each slightly tilted.

   Every photo keeps its proportions and opens in a lightbox.
3. **When and where**: per ceremony, the name, an optional dress note, the day with the AD date and the B.S. date (shared `bsDateOf`), the time (shared `timeLabel`, which shows "onwards" for open-ended events), and the venue with a map link.
4. **Our families**: name, parents and home, with portraits only if uploaded. Empty fields are hidden.
5. **Reply card**: a small bouquet on its corner, plus the RSVP form (`core/rsvp.js`).
6. **Guest info**: only the columns that have data.
7. **Closing**: a flower garland, the closing line, names, calendar, share and credits.

## Flowers
The flowers are real Wikimedia Commons photographs (roses on black backgrounds, plus leaves), cut out for this theme. They live in `public/themes/dhaka/flowers/*.webp`.

The marigolds are cut from the library photos `marigold-macro` and `marigold-macro-alt`.

Credits are in `flowers.js` and are listed in the page footer. The licences are CC BY 2.0/4.0 and CC BY-SA 3.0/4.0.

## Readability
- Body text is Libre Caslon Text at 17–18px. Nepali uses Martel at 17–18px with line height 1.75 or more. Names use Libre Caslon Display, or Eczar in Nepali.
- Ink is about 15:1 on the paper, and sindoor is about 7:1.
- Devanagari is never letter-spaced or uppercased.

## Slots (`slots.js`, read through `useSlots`)
Test with `?debug&slots=demo`.

Images:
- `welcome.photo` (portrait 0)
- `print.photo` (1)
- `pair.a`, `pair.b` (2, 3)
- `feature.photo` (4)
- `more.1`–`more.8` (5–12)
- `fam.bride`, `fam.groom`
- `envelope.lining`

Every couple slot defaults to the couple's own portraits, and duplicates are skipped. A treatment with no photo is left out.

Texts:
- Envelope: `env.kicker`, `gate.line`, `gate.open`, `gate.quiet`
- Welcome: `welcome.kicker`, `welcome.line`, `card.button`
- Photos: `us.title`, `us.line`, `feature.line`
- Programme: `prog.title`, `prog.note`
- Families: `fam.title`, `fam.bride`, `fam.groom`
- Reply: `reply.title`, `reply.send`
- Closing: `closing.line`

These texts have shared keys:

| Dhaka slot | Shared key |
|---|---|
| `gate.line` | `gate.line` |
| `gate.open` | `gate.open` |
| `gate.quiet` | `gate.quiet` |
| `welcome.kicker` | `hero.kicker` |
| `welcome.line` | `hero.line` |
| `card.button` | `card.button` |
| `us.title` | `couple.title` |
| `us.line` | `couple.line` |
| `prog.title` | `events.title` |
| `reply.title` | `reply.title` |
| `closing.line` | `closing.line` |

The letter dialog and the lightbox use `openModal`, so only the dialog scrolls.

## Files
- `main.js`: markup, frame and table layouts, the opening timeline
- `dhaka.css`: styles
- `weave.js`: the Palpali Dhaka pattern
- `flowers.js`: flower credits
- `slots.js`: the slot manifest
