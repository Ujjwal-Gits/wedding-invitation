# Sarovar (सरोवर) · the swan lake at dawn

A lotus lake at sunrise with a white marble chhatri in the middle. Sold on both sites (`market: 'both'`, style
`romantic`): bilingual with B.S. dates for a wedding in Nepal, English only abroad. No religious image or word; the
floating diyas become floating candles for Christian, Muslim, Kirat and other invitations.

Runs on the card-suite engine (`src/themes/_suite/suite.js`) with its own `page()`; nothing in the body is shared
with another design.

## The lake (water.js)

One painted lake (Canva AI, portrait `lake-p` and landscape `lake-l`) is a fixed world under the whole page, drawn
through a small WebGL1 shader that moves only the water below the painted horizon: layered waves compressed toward
the horizon, perspective ripple rings from taps, a faint glitter under the sun. DPR capped at 1.5; it renders only
while the first screen, the glide or the closing is on screen. No WebGL = the painting with a slow CSS glint;
reduced motion or `?still` = the still painting. Horizon, pavilion and sun positions per painting: `LAKE` in main.js.

## Opening

A closed lotus bud on still water (tap it, or the buttons). A ripple ring spreads across the lake, the bud opens into
the bloom, two swans glide in from the edges and bow until their beaks meet (the heart). The names rise on the sky.

## Signature: the glide (pinned, scroll-scrubbed)

Scrolling moves you forward over the water: the countdown floats on four diyas, then each ceremony rises out of the
lake on a carved stone post (crown, a face that stretches to the words, base), lotus clusters and diyas drift past at
their own depths, two swans keep pace, and at the end the pavilion grows until the view turns to dawn pearl. Snaps to
each stop; transform and opacity only. Reduced motion: the stops simply stack on the still lake.

## Body

Families under a marble arch with marigold and mango-leaf garlands · the couple standing on the water with their
reflection · photos in justified rows, each on one waterline with its reflection · the full card · RSVP (a yes sends
the diya across the water) · the lake again with the swan pair and the blessing.

## Slots

Images: `couple.lead`, `gallery.1`–`6`, `families.bride`, `families.groom`. Texts: `gate.line/open/quiet/hint`,
`hero.kicker/line/title`, `glide.kicker/end`, `count.title`, `prog.title`, `families.title`, `couple.title/line`,
`gallery.title`, `card.line/button`, `rsvp.title/line/send`. Colours: `--sv-rose`, `--sv-jade`, `--sv-deep`,
`--sv-pearl`. Mix: none (the lake is one continuous scene).

Debug: `?debug` exposes `window.__su` (opening) and `window.__sv.go(z)` (glide depth 0 … N+1); `&nosnap` turns
snapping off for screenshots.
