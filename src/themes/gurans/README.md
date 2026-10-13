# Gurans (गुराँस) · "Rhododendron", natural Nepal

Page: `/gurans/` · dev: `npx vite --port 5204 --strictPort` · debug: `/gurans/?debug` (`?debug&open` skips the gate; `window.__gw.walk(p)` sets the walk to progress `p`).

## Concept

Nepal's national flower in spring forests above the hills, with lake light: a daytime invitation that reads like a fine
nature journal and a hill resort. Warm textured paper (`paper.webp`, an embossed fibre texture made in code), deep
forest-green ink, and lali-gurans red as the only accent. Type: Newsreader (names, headings, body), Albert Sans
(small labels), Laila (Devanagari display) and Noto Serif Devanagari (Devanagari body).

1. **Opening sheet**: a herbarium page. A botanical drawing of *Rhododendron arboreum* (bell flowers, face-on flowers,
   a whorl of leathery leaves), drawn as clean vector in `illustration.js`, beside a specimen label with the names,
   AD + B.S. date and city. "Open" lifts the sheet away.
2. **The walk (signature motion)**: one pinned, scroll-scrubbed walk through three real photographs rendered with depth
   maps (`core/stage.js`, true parallax): up a flowering forest trail, out into a clearing under Dhaulagiri, on to Phewa
   Lake by day. Real petals (3D petal meshes textured with petals cut from a CC BY-SA close-up) drift down. Paper labels
   carry the names, then the date, then a line beside the couple's mounted print. Phones get a portrait trail photo.
3. **The two of us**: the couple as pressed prints (white mat, photo corners, never cropped), the families with parents
   and homes, and "Read the invitation card" (full wording in a modal via `openModal`).
4. **The programme**: per ceremony a large day number, weekday, month, B.S. date (`bsDateOf`, or the event's own
   `dateBS`), then name, time, venue + map link, dress swatches + note, and the order of the day. Add to calendar.
5. **For the journey**: arrival, stays with map links, contacts (call / WhatsApp), livestream link.
6. **Album**: couple photos first, then the gallery, as pressed prints in balanced columns; lightbox.
7. **RSVP** (core `rsvp.js`), **closing** blessing with names, credits.

Reduced motion or no WebGL: the walk becomes one still photograph with all three labels and the print stacked; no pin,
no petals, no reveals.

## Slots (`slots.js`)

Images: `walk.path`, `walk.pathTall` (phones), `walk.clearing` (shared `place.mountain`), `walk.lake`, `walk.couple`,
`couple.photo`, `couple.second`, `couple.third`, `couple.bride`, `couple.groom` (shown as a pair when both are uploaded),
`programme.detail`, `album.1`–`album.6`, `travel.photo`, `close.photo` (shared `place.closing`).
Texts: gate (`gate.kicker`, `gate.line`*, `gate.open`*, `gate.quiet`*), walk (`hero.kicker`*, `hero.line`*, `walk.date`,
`walk.lake`, `walk.cue`), couple (`couple.title`*, `couple.line`*, bride/groom labels, daughter/son of, `card.button`*,
`card.title`), programme (`programme.kicker`, `programme.title`*, `programme.order`), album (`album.kicker`*,
`album.title`*), travel titles, `rsvp.title`*, `rsvp.send`. (* = shared key.)
Everything else comes from the invitation data: names, parents, homes, dates, events, card wording, gallery, travel,
stays, contacts, RSVP, closing line.

The studio should supply at least 4 couple photos (hero print, large print, two small prints) and ideally 6 more for the album.
Scene slots work best as landscape daylight photos; library photos with depth maps get the 3D parallax, uploads move flat.

## Photographs added for this theme (all Wikimedia Commons, credited in the footer)

| slug | source | licence |
|---|---|---|
| gurans-path | Gerd Eichmann, Ghorepani-Tadapani-76-Rhododendron-2013-gje.jpg | CC BY-SA 4.0 |
| gurans-trail | Gerd Eichmann, Ulleri-Ghorepani-50-Rhododendron-2013-gje.jpg | CC BY-SA 4.0 |
| gurans-meadow | Gerd Eichmann, Ghorepani-Tadapani-06-Panorama-Rhododendron-2013-gje.jpg | CC BY-SA 4.0 |
| gurans-tree | Gerd Eichmann, Poon Hill-84-Ghorepani-Rhododendron-2013-gje.jpg | CC BY-SA 4.0 |
| gurans-truss | Pratap Baniya, Gurans Ghorepaani 8.jpg | CC BY-SA 4.0 |
| gurans-flower | സുനിൽ ദേവ്, Flower of Rhododendron.jpg (source of `petal.webp`, `petal-2.webp`) | CC BY-SA 4.0 |
| gurans-lake-boats | Michael Goodine, Boats on Phewa Lake, Pokhara | CC BY 4.0 |
| gurans-lake-view | Vyacheslav Argenberg, Phewa Lake, Pokhara, Nepal | CC BY 4.0 |

Depth maps for path, trail, meadow and both lake photos were made with `scripts/depth.py`. The petal textures are
crops of `gurans-flower` (CC BY-SA 4.0, same attribution). The botanical drawings and the paper texture are made in code.

## Verified

Python Playwright at 1440×900, 1024×768, 390×844 and 360×740, English and Nepali: gate, three walk scenes, couple,
programme, travel, album, RSVP, closing, card modal; reduced motion; card modal locks the page and restores the scroll
position; no horizontal overflow at 360.
