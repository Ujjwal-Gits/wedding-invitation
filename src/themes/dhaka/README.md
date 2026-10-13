# Dhaka (ढाका): heirloom stationery

A calm, readable invitation built like a luxury stationery suite. The page is textured ivory card stock with ink and one sindoor accent. The real Palpali Dhaka cloth is used with restraint, as a woven ribbon around the envelope, as narrow bands on the card and section heads, and as the envelope lining.

Page: `/dhaka/` (dev port 5187). Query parameters: `?id=<slug>` for studio data, `?lang=ne` for Nepali, `?debug` for the test hooks.

## Signature motion (the only one)
The envelope rests on a dark table. It is tied with a Dhaka band and sealed with a wax seal pressed with the couple's Devanagari initials (आ·स).

When the guest taps the seal (with music) or "Open without music":
1. The seal lifts and the band slides apart.
2. The flap opens, showing the Dhaka lining.
3. The folded card rises out of the envelope, and the envelope falls away.
4. The card moves into place and unfolds.
5. The table fades, leaving the same card as the page's hero.

Only transform and opacity animate. With reduced motion the envelope simply fades out.

Everything after that is quiet: sections fade up once as they arrive. There is no scroll-scrubbed motion, no kinetic type and no marquee.

## Sections
1. **Card (hero)**: the open folded card.
   - Top half: शुभ विवाह, a blessing line and the couple's names (Libre Caslon Display, or Eczar in Nepali).
   - Bottom half: the invitation line, the AD date, the B.S. date and the city.
   - A "Read the full invitation" button opens the complete wording as a letter dialog.
2. **The two of us**: the couple's photos as mounted prints (mat border, soft shadow) in justified rows. Every photo keeps its proportions and is never cropped. Tapping a print opens a lightbox.
3. **When and where**: one row per ceremony with:
   - the name (large) and dress note with swatches;
   - the day and AD date, plus the B.S. date from the shared `bsDateOf()`;
   - the time;
   - the venue with an "Open map" link;
   - an optional "Order of the day".

   On phones each ceremony stacks as label and value rows.
4. **Our families**: bride's and groom's cards with full name, parents and home. Portraits show only if uploaded. The hosts line and the invitation button follow.
5. **Reply card**: a days-to-go line and the RSVP form, using `core/rsvp.js` with the same IDs, honeypot and endpoint.
6. **Guest info** (stay, travel, contacts) and the closing: closing line, names, calendar, share and credits.

## Readability
- Body text is Libre Caslon Text at 17–18px with line height 1.55–1.65. Nepali uses Martel at 17–18px with line height 1.75–1.85.
- Labels are at least 12.5px in English and 15px in Nepali.
- Ink `#1F1B18` on ivory is about 15:1, and sindoor `#9C1C26` is about 7:1.
- No script faces, no hairline type below 32px, and Devanagari is never letter-spaced or uppercased.

## Slots (`slots.js`)
All slots are read through `useSlots`. Test them with `?debug&slots=demo`.

Images:
- `prints.1`–`prints.8` (couple, portraits 0–7; duplicates are skipped)
- `fam.bride`, `fam.groom`
- `envelope.lining` (optional photo of Dhaka cloth; empty means the woven pattern)

Texts:
- Envelope: `env.kicker`, `gate.line`, `gate.open`, `gate.quiet`
- Card: `card.kicker`, `card.with`, `card.invite`, `card.button`, `card.cover`
- Photos: `prints.title`, `prints.line` (empty means the last story line)
- Programme: `prog.title`, `prog.note`
- Families: `fam.title`, `fam.bride`, `fam.groom`
- Reply: `reply.title`, `reply.send`
- Closing: `closing.line` (empty means `config.closing`)

Shared keys:

| Dhaka slot | Shared key |
|---|---|
| `gate.line` | `gate.line` |
| `gate.open` | `gate.open` |
| `gate.quiet` | `gate.quiet` |
| `card.kicker` | `hero.kicker` |
| `card.invite` | `hero.line` |
| `card.button` | `card.button` |
| `prints.title` | `couple.title` |
| `prints.line` | `couple.line` |
| `prog.title` | `events.title` |
| `reply.title` | `reply.title` |
| `closing.line` | `closing.line` |

The letter dialog and the lightbox use `openModal`. Only the dialog scrolls, and closing returns to the same place.

## What the studio must supply
- The couple's portraits: 3 or more, any orientation.
- Names in English and Nepali (the seal and cover use the first letters).
- Parents and homes.
- Events with start and end, venue, `mapQuery` and `dress`. An optional `dateBS` overrides the computed B.S. date, so a family can match their priest's patro.
- The RSVP deadline and the invitation wording.

## Files
- `main.js`: markup, envelope timeline, dialogs
- `dhaka.css`: styles
- `weave.js`: the Palpali Dhaka pattern (`palpaliCell`, `palpaliTile`) and the woven-thread renderer
- `slots.js`: the slot manifest

Paper grain and mottle are generated SVG noise, so no image files are used.
