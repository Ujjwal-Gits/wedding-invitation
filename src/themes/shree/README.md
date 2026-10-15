# Shree (श्री)

Deep plum and antique gold, built as a sacred pothi: an old palm-leaf manuscript of gold-edged plum leaves.

## Signature motion: the lotus opens
The gate is plain plum with ॥ श्री गणेशाय नमः ॥, a gold SVG lotus closed in the middle, and the couple's names. On tap,
three rings of petals unfold, outer ring first; each petal hinges about its base. A gold light blooms in the heart, the
lotus glides up behind Ganesh as a faint watermark, Ganesh rises out of it, and two brass diyas come down on their chains
and settle with a damped swing. Then the hero lines fade in.

## The page (T.page): the pothi
- **Leaves that turn** (`#pothi`, pinned): the couple in a gold arch, the date, the countdown and the families. Each leaf
  is hinged at its top. As you scroll it lifts toward you and turns over (rotateX), showing its dark back and uncovering the
  leaf beneath. The next leaf starts in shadow and comes into the light. On phones there is one leaf per screen, and a leaf
  too tall for its screen is scaled down to fit, never cropped. On desktop the leaves are wide landscape palm leaves with
  their string holes, laid out in two columns.
- **Date:** a round gold-leaf mandala coin you scratch to reveal the date (painted with `T.scratch.paint`).
- **Countdown:** a gold astrological dial with four concentric rings (days, hours, minutes, seconds) with ticks and
  numerals in Devanagari or Latin. Each ring turns the short way round to its value under a fixed pointer, and the
  values show in a reading window.
- **Families:** two temple niches with recessed depth, turned to face each other.
- **Programme:** a muhurta patra, a champagne paper scroll on gold rods that unrolls from its top rod (scaleY) when it
  comes into view.
- **Photos:** temple-window frames that lean slightly in 3D with the scroll, and with the pointer on desktop.
- **Card:** the invitation line with a gold श्री seal that opens the full card.
- **RSVP:** a champagne leaf. **Closing:** the diyas again, a quiet lotus and a short Dhaka band.
- **Behind and in front:** a great faint mandala turns with scroll progress, and two small diyas hang in the foreground
  with parallax, swaying.

## Nepali wedding touches (shared kit `_suite/nepali.js`)
- The hanging diyas burn with live photographic flames on their wicks. The painted flame was removed from the art
  (`diya-nf`), and the chains and sway are kept.
- Brass Panas lamps with live flames flank the hero and the closing.
- **The bond: the seven vows.** A fifth leaf in the pothi holds the seven vows of the saptapadi (`config.saptapadi`) in
  gold, beside the alta-footprint runner.
- A kalash stands in each family niche over a warm glow. A fresh marigold toran heads the muhurta patra. A Palpali
  Dhaka weave edges the RSVP leaf, and marigold-and-rose sprays frame the श्री seal. Marigold and sindoor accents are used
  for kickers, markers, the dial pointer and the event dates.

## Reduced motion
The engine crossfades the gate. Leaves stack one under another and nothing turns. The scroll is shown already unrolled,
the dial is set without motion, and there are no ambient loops.

Only transform and opacity are animated. There are no filters and no permanent will-change. Loops pause off screen.
Type: Forum (Latin display), Monsieur La Doulaise (names), Sahitya (Devanagari display), Mukta (body and all Devanagari digits).

## Art
`public/themes/shree/art/`: ganesh and diya were made with Canva AI, generated for this theme. The lotus, coin, dial,
niches, scroll and ornaments are drawn in code (`main.js` / `shree.css`).
