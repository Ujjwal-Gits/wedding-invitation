# Zari (ज़री) · the bridal trousseau trunk

Gold-thread (zari, zardozi) embroidery on sapphire velvet. Market: **both** websites (style "classic" on the
international one); no religious art and no invocation by default, so it suits Hindu, Buddhist, Kirat and
other/no-faith invitations (`religions` in `slots.js`).

## Opening (the gate)
The page itself is the scene: a closed sapphire-velvet trunk with zardozi borders, brass straps and corners, a
small marigold garland on the lid and an Aligarh brass padlock on the hasp. The suite gate only adds the words
(title, names, line, buttons) over it. Tap: the key slides in and turns, the shackle jumps, the lock drops away,
the lid swings back on its hinge (CSS 3D, a touch past, then settles), the camera tilts to look into the trunk,
the couple's framed photo shows in the blush satin lid lining, and a folded red odhni lifts out and turns to the
guest with the names in gold, revealed by a moving mask with a glint.

## Signature motion (pinned scroll)
One preserve-3d world (`#zworld`): body front, lid (front, velvet top, satin lining), inner walls, floor, ground
shadow, roses on the rim. Each tray rests flat in the trunk; scrolling lifts it out above the rim, swings it to
face the guest (phones also turn it a quarter so it reads upright) and then slides it out of frame. The ceremony
cushions slide sideways while their tray is up. After the last tray the lid closes and the camera returns, then a
short blessing. When the guest stops mid-lift it glides to the nearest resting tray (Lenis, not ScrollTrigger snap).
All motion is transform/opacity, drawn from one state object (`S`) each frame it changes.

Trays: I gold coin (date, AD + B.S., time, place, full card) · II bangle boxes (families; bride/groom portraits
replace the boxes when both are uploaded) · III photographs (only if any; lightbox) · IV ceremony cards on velvet
cushions (only the events in the data, i.e. per guest link) · V venue map embroidered on silk (each venue with a
map link; travel/stays/contacts in a dialog) · VI brass dial countdown · VII silk-tasselled tag (opens the RSVP
form in a dialog; share).

Reduced motion or `?still`: the trunk stands open and the odhni and trays are laid out one under the other.
Debug: `?debug` exposes `window.__su` (opening) and `window.__zr.seek('t3')` (labels `top`, `t0`…, `end`).

## Studio slots
Images: `couple.lead` (lid photo), `gallery.1-6`, `families.bride/groom`, `hero.ganesh` (full card only, off).
Texts: gate line/open/quiet, `ganesh.show`, `hero.invocation` (empty by default), `hero.title`, `hero.line`,
`date.kicker`, `families.title`, `gallery.title`, `prog.kicker/title`, `venue.title`, `count.title`, `rsvp.title`,
`rsvp.open`, `rsvp.send`, `card.button`, `close.line`. Colours: velvet, night, zari gold, gold text. Mix: no
parts are lent or borrowed (the trunk is the whole page).

## Art
All Canva AI (generated for this theme, fine-art painterly realism), exported full size through the "Zari art
board" (Canva design DAHYX2H-4PA, a copy of DAHYEm--Jhc), background removed in Canva, converted to WebP in
`public/themes/zari/art/` (`-sm` variants for phones): trunk-lid/trunk-body (one painting split at the seam),
lock-body/lock-shackle (one padlock split), key, velvet, lining, tray (9-slice border image), coin, bangles-red,
bangles-green, cushion, map, dial, tag, roses, odhni, garland.
