# Mohar (मोहर)

The royal seal (also Nepal's old silver coin). A wedding farman (decree) sealed in red lac on an indigo cloth.
Brief: `docs/THEMES-NEXT-10.md` §5. Engine: `_suite` (data, RSVP, countdown, music, lightbox, opening safety net).
Market: both sites (neutral art; the invocation and शुभ विवाह follow the community through `src/core/faith.js`).

## Opening (the signature)
- The decree (`#mo-sheet`, the first screen) is folded into thirds on the cloth: the top and bottom thirds are turned
  over the middle in 3D (`rotateX ±180`). The gate overlay is transparent and only carries the red silk band, the lac
  and the brass seal, placed on the measured middle third (`placeGate`).
- Press and hold the seal: it descends (scale + offset, its shadow converges) and the lac spreads under it; a small
  thud (and a vibration on phones). Let go: the seal lifts and the couple's monogram is left debossed in the lac.
  Tap again (or tap the button): the lac cracks along its line, the silk slips away to both sides, and the decree
  unfolds, top third then bottom third. A quick single tap (or the button, or the keyboard) runs all of it.
- Reduced motion: the gate is a still picture of the sealed packet (seal already pressed); it fades to the open decree.

## The page
1. The farman: a concertina of parchment pages, nested so each hangs from the edge of the one before it. Wide
   screens: pinned, the closed farman opens like a concertina (`rotateY` alternating ±) and travels page by page,
   snapping. Phones: each page swings down from the fold above it as it arrives (`rotateX`, scrubbed). Pages: the
   decree, two families, ceremonies (two per page), the venue, the date and countdown, the blessing (lead photo).
   Each page carries a small lac folio seal.
2. Portraits: the couple's photos whole, in brass frames (`border-image`) lying on the cloth.
3. The bahi-khata: a red cloth ledger whose cover lifts once; the RSVP is its ruled page; a sent reply is inked into
   the register (Kalam) and the red lal mohar is stamped beside it.
4. The foot: the lac seal again, the closing words and the names.

## Art (Canva AI, made for this theme; exported through the "Mohar art board" design)
`public/themes/mohar/art/`: `table-p|l` (indigo cloth flat-lay with marigold and rose petals, a paan-daan, a diya and
rajnigandha), `table-p|l-plain` (the same without the diya, for pages whose symbols are not Hindu), `parchment`
(decree paper with a gold-sprinkled border), `paper` (its plain middle), `seal` (brass seal top, cut out), `lac`
(red lac pool, cut out), `frame` (brass frame, cut out, used as a 9-slice border), `cloth-red` (ledger bookcloth),
`indigo` (a mirrored tile of the cloth). The monogram, the lal mohar ink stamp and the silk are drawn in code.

Type: Linden Hill, Tiro Devanagari Sanskrit (display only, never digits), Crimson Pro, Laila (Nepali text and
digits), Kalam (the register's ink).
