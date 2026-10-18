# Toran (तोरण) · seven doorways

The garland hung over a door to welcome guests. The guest walks deeper and deeper through seven dressed doorways of
a haveli, each with its own real toran, to the mandap at the heart of the house. Nepal site, Hindu (Ganesh, kalash,
mandap). Engine: `_suite` (data, RSVP, countdown, scratch card, lightbox, music, opening safety net).

## Opening: the phool-ladi curtain
A doorway hung with full-length marigold strings (ladis), each ending in a red rose, under the shared kit's marigold
toran with bells, above a lime-plaster threshold that carries the line and buttons (never text on the flowers).
Tap the strings or the button: they part from the centre outward on a stagger, swinging as they go
(`translateX` + rotation about the top), the threshold drops, the toran lifts, and the first door is there with the
names on the wall above its lintel.

## Signature: the depth tunnel (the one big motion)
Seven layers stand along one axis: six painted door frames whose openings are cut out, then the mandap courtyard.
Each door picture's edges are feathered into one flat wall colour and one floor colour, and plain blocks of those
colours carry the wall on, so each layer is a wall with a doorway in it. A door at camera distance `d` is drawn at
scale `1/d` about the axis point, so every door sits inside the opening of the one in front (main.js `tunnel()`).
Scroll drives the camera: each room has a gap that scrolls through while the camera dollies to its door (the door in
front grows past you and fades), then holds while that door's plaques are read. Deeper rooms are shaded; a floor
shade and vignette are static overlays. Transform and opacity only; a rAF ease follows the scroll.
On phones the same tunnel with fewer layers drawn (culled by depth). Reduced motion (or `?still`): no dolly, the
door of the room in view crossfades in; the opening curtain hangs already parted.

## The doors and their parts of the wedding
1. mango leaf and marigold toran, brass bells, kalash: welcome (Ganesh, names, date, place)
2. banana stems and kalash with coconuts: the couple's photo, the families
3. rose strands with rajnigandha: the ceremonies (one plaque each), calendar, share, travel and contacts
4. sayapatri and makhamali on a carved Newari door: the auspicious day (B.S. and A.D.) under a lac scratch cover
5. gurans in bloom: photos (lightbox)
6. a niche of lit diyos: the countdown, two brass diyos with live flames on the plaque
7. the mandap under a marigold canopy: the card wording, the RSVP, the blessing

## Art (Canva AI, made for this theme, `public/themes/toran/art/`)
`door-1..6(-sm).webp` (1088 / 640 wide, opening keyed from a blue screen), `mandap-p|l(-sm).webp`,
`ladi-1..5.webp` (cut-out strings). Canva art board: "Toran art board" (DAHYXtV63DM). Door data (wall and floor
colours, opening boxes) lives in `doors.js`. The kit's toran, Ganesh and diyo come from `public/themes/_nepali/`.

## Studio
Slots (`slots.js`): Ganesh, the couple's lead photo, six gallery photos, bride and groom portraits, every line of
text, four colours. The doorways are the design itself and are not slots.

## Debug
`?debug`: `__su.at(t)` / `__su.finish()` (opening), `__to.cam(c)` (camera 0..6), `__to.keys()` (scroll keys).
