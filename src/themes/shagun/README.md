# Shagun (शगुन / सगुन) · the brass thali

Page: `/shagun/` (demo) · `/shagun/?id=<invitation>` (studio data) · `?debug` (`window.__su.at(t)`, `.finish()`, `.to(sel)`), `?debug&open`.
Engine: `src/themes/_suite/suite.js` (`T.page`, `T.open`, `T.scroll`, `T.scratch`) and the Nepali kit's live flame.
Market: Nepal (`np`), Hindu only (sindoor, kalash, diyo, Ganesh).

## Concept
The shagun thali seen from above, as a real flat-lay: a polished brass puja thali on a fresh banana leaf, ringed by a
makhamali garland, on a red clay (lipeko) floor. Everything the guest reads is on curd-white paper cards laid beside the
plate, never over it. Palette: curd white `#FAF6ED`, brass `#B88A2F`, sindoor `#C3102E` (the one accent), banana leaf
green, terracotta floor `#9A4A2F`, ink `#2A1A12`. Type: **Inknut Antiqua** (display, Latin and Devanagari) and **Mukta**.

## Opening: the covered thali and the tika stamp
The gate is see-through: the page's own thali lies under red silk with a gold zari border. On tap the silk lifts at one
edge and is drawn off the plate with a slight turn, the diyo comes alight (the kit's live flame), the invitation card is
laid down beside the plate, and a real sindoor thumbprint is pressed beside the names (scale 1.2 to 1, a puff of powder).

## Signature: the turning dial
The thali stays on screen (a sticky stage) and turns like a dial as the guest scrolls, 45° per stop, holding still while
a card is read and turning between cards (scrubbed, eased). The thing at 12 o'clock lifts and glows; its card rises
beside the plate. A sindoor dot marks 12 o'clock. The diyo's flame always stands upright.

| Stop | On the thali | Card |
|---|---|---|
| 1 | supari and dubo | invocation: Ganesh, the one line of invitation, hosts, the full card |
| 2 | sindoor box | the couple: their photo as a print |
| 3 | kalash | the two families |
| 4 | akshata | every ceremony: date A.D. and B.S., time, venue and map, dress, order of the day, calendar, share |
| 5 | dahi and sagun (pair of brass fish) | the Nepali blessing |
| 6 | laddoo | the countdown |
| 7 | coconut | the venue, map, travel/stays/contacts |
| 8 | diyo | RSVP |

Desktop: the cards run down the left, the plate turns on the right. Phone: the plate sits under the first card, then sinks
to the foot of the screen like a thali held in the hands; the cards scroll above it and fade out over the clay before they
reach the flowers. At the end the whole thali rises into view and leaves. Only events present in the data are rendered
(guest links); without events the ceremonies stop is skipped and the dial turns past it.

After the dial: a row of the couple's photographs as prints (the guest scrolls it; arrows step one at a time), the
sindoor box's painted lid to rub open (the auspicious hour, A.D. and B.S.), and the blessing card under fresh flowers.

Reduced motion: no dial. The thali lies still on the first screen and every card shows its thing beside its title.

## Art (Canva AI, made for this theme; art board "Shagun art board" DAHYXiWTCr8)
`public/themes/shagun/art/`: `thali`, `silk`, `leaf`, `garland` (1400/760 or 1500/800 WebP), the eight things
(`supari`, `sindoor`, `kalash`, `akshata`, `dahi`, `laddoo`, `coconut`, `diyo`, 440/240), `floor` (mirrored tile),
`thumb` (keyed sindoor thumbprint), `lid` (the sindoor box lid unwarped to a circle). Originals: `art-src/shagun/` (not committed).

## Studio slots (`slots.js`)
Images: `hero.ganesh`, `couple.lead`, `gallery.1-6`, `families.bride/groom`. Texts: opening (`gate.*`, `hero.*`,
`hero.seal`), the eight thing names (`item.1-8`), every card title and line, the sindoor box (`date.kicker`, `scratch.*`),
RSVP. Colours: sindoor, brass, floor, curd. Mix: hosts a foreign gate; gives neither gate nor first screen (the thali is
the dial the page turns).

## Owner check
Ritual accuracy of the Nepali items (dahi with the pair of brass fish as the sagun) needs the owner's eye.
