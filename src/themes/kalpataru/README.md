# Kalpataru (कल्पतरु) · the wish-fulfilling tree

One great old peepal tree on the wedding morning. The guest climbs it from the roots to the crown; the two families
are its two boughs. Sold on both sites (`market: 'both'`): the art is a painted tree with birds, threads and fresh
flowers, and the Hindu shrine at its roots (brass Ganesh, kalash, diyo) shows only on Hindu invitations.

Runs on the card-suite engine (`src/themes/_suite/suite.js`: data, RSVP, countdown, lightbox, card modal, music,
opening safety net) with its own gate, first screen and page (`T.gate`, `T.page`, `T.open`, `T.scroll`).

## Opening: the leaf invitation
A peepal-leaf card (ivory, gold veins) hangs from a red-and-yellow mauli thread under the painted canopy. Tap the leaf
or the button: the knot's two ends swing free and the thread lifts away, the leaf turns over (`rotateY` 180°) to show
the names and date, then the view pulls back: the first screen's tree starts scaled up around one spot in its crown
and both move as one (tree to scale 1, leaf to ~1/7) until the leaf is one leaf of the tree; a flock of six parakeets
lifts off the crown (two painted wingbeat frames per bird, swapped by opacity while the bird flies on a transform path).

## Signature: the climb
`#kt-climb` pins. Scroll moves two layers, both transform-only:
- the tree (far): five paintings stacked bottom to top (`PANELS`: roots, trunk, fork, branches, crown), each melting
  into the one below with a mask; it slides **down** so the camera rises, and pans sideways to follow the trunk;
- the paper (near): the stations, laid out bottom to top (`flex-direction: column-reverse`), slide down 1:1 with the
  scroll. Each station hangs on a thread that runs up out of sight into the branches.
Key frames (`layout()`): whenever a station is centred, the tree shows its own part behind it (`data-anchor` =
`panel:fraction:screen-fraction`), eased between stations so the tree lingers. Stations, from the roots up:
1. roots: the elders' blessing, the full card button, the shrine (Ganesh/emblem, kalash, diyo with a live flame);
2. trunk: the couple in a carved teak frame tied with mauli, a paper slip with the title and one line;
3. fork: two wooden boards, the groom's family on the left bough, the bride's on the right;
4. a few photographs hung on threads (up to four; the rest open in the lightbox);
5. one brass lantern and paper tag per celebration (AD and B.S. date, time, venue with map, dress, order of the day);
6. the nest: two parakeets keep the countdown, with calendar and share;
7. the crown: "Make a wish", the names, the reply button.
Then the sky: the RSVP tied with a red bow, the wish wall (a thread of ribbons) and the blessing.
Desktop: wider tree (≤ 820px) with soft side fades, stations alternate left and right of the trunk, a thread with a
red knot on the left shows how high you are. Keyboard focus inside a station scrolls it to the middle.

**Reduced motion / `?still`:** no pin, no flock, no flip: the stations stack in reading order (roots first) with three
still crops of the tree (roots, fork, crown) between them.

## The wish wall
Ribbons from the text slots `wish.1`…`wish.6` (the couple pastes guests' notes they approve; `-` leaves one empty), so
nothing a guest types is ever shown to other guests unreviewed. After a guest sends a reply with a note, their own
note is tied on the thread for them only (kept in their browser's localStorage).

## Slots (`slots.js`)
Images: `hero.ganesh` (sacred: swaps to the community's emblem), `couple.lead`, `gallery.1`–`6`, `families.bride|groom`.
Texts: gate line/buttons, invocation, first-screen title and line, roots kicker/title, couple title/line, families
title, photos title, lanterns kicker/title, countdown title, crown title/line, card line/button, RSVP title/send, wish
wall title/empty line and six wishes. Colours: `--su-accent` (mauli red), `--kt-canopy`, `--su-bg`.

## Art (Canva AI, made for this theme; `public/themes/kalpataru/art/`)
Gouache-and-watercolour paintings: `roots`, `trunk`, `fork`, `branches`, `crown` (the climb, 1152×2048 + 640 `-sm`),
`tree` (the whole tree), cut-outs `leaf`, `lantern`, `nest`, `tag` (`tag-top` + `tag-plank`, a 9-slice board), `frame`,
`bird-up` / `bird-down` (wingbeat frames aligned on the beak). The kalash, diyo, flame and brass Ganesh come from the
shared Nepali kit (`public/themes/_nepali/`). Originals were exported full size from the "Kalpataru art board" in
Canva and are not committed.

Type: Lustria (display), Noto Serif Devanagari (Devanagari display), Hind (Latin reading), Mukta (Devanagari reading,
Hind draws Devanagari digits as Latin), Kalam (the wishes only).
