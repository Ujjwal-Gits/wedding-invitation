# Himal (हिमाल) · Himalayan minimal

Page: `/himal/` · dev: `npx vite --port 5188 --strictPort` → http://localhost:5188/himal/

## Concept
Quiet luxury, in the manner of a mountain resort or a fine-art photo book. The palette is crisp white (`#FFFFFF`), cool stone grey (`#EDEFF0`) and charcoal
(`#1E2225` / `#1A1D20`), with no beige or cream grounds, and one muted dawn-clay accent (`#8A5A3C`) used only for numbers, dots and hovers.
Whitespace is generous and there is very little text. Type: Gilda Display (Latin display),
Jost (light sans), Martel and Martel Sans (Devanagari). The couple's photographs lead every section.

## Signature motion: sunrise behind Machhapuchhre
The gate is the real `himalaya-dawn` photo, graded to blue hour (`dawn.js`, one raw WebGL shader,
no three.js). Tapping "Open at first light" starts the music and brings the sun up over about 7 s.
The grade warms, soft crepuscular rays grow out from behind the peak (screen-blended into the photo's
own rays), and one band of first light sweeps across and catches the far peaks. The depth map limits
the light to the sky and the peaks. The names then rise into the dark foreground ridge, so no scrim
is needed. Supporting scroll effects in the same shader: the camera lifts (depth parallax) and valley
mist rises until the photo dissolves into the snow-white page.

## Sections (scroll storytelling, no zoom-only scenes)
1. **Gate / hero**: pre-dawn, then sunrise; names, date and city sit in the ridge.
2. **Intro**: a portrait plate (`portraits[0]`, or bride + groom photos side by side when both exist), one line, both families with their parents, and a "Read the invitation card" dialog with the full wording.
3. **Essay**: a pinned sequence on charcoal, every photo in its own uncropped frame, with slow crossfades and a gentle Ken Burns. When a photo's shape doesn't suit the screen, it is paired with the next such photo (side by side on wide screens, stacked on phones), so nothing is cropped. Story lines become captions only on the couple's own uploads; library photos carry no narrative captions. A counter runs 01–0n.
4. **Ceremonies**: a hairline timeline that draws as you read, with a sticky photo stack of the event photos on desktop and inline photos on phones. Each event has its date, time, venue, map link and dress swatches, and the order of the day sits behind a disclosure.
5. **Travel & stay**: three plates (arriving, staying, questions) that rise in turn; stacked on phones. Never half-cut at rest.
6. **Album**: a refined three-column grid (two on phones) that keeps each photo's true proportions, with layered column parallax on desktop and a light lightbox.
7. **RSVP**: a short "N days to go" line, then a minimal form. It uses `core/rsvp.js` (same ids, same JSON to `rsvp.endpoint`, honeypot, validation), plus Add to calendar and Share.
8. **Closing**: the `himalaya-dawn-alt` dusk plate as a bookend, the blessing in Nepali and English, the names and the credits.

Reduced motion: the sun is already up, the essay becomes stacked photos, there is no parallax or horizontal pin, and the mist still follows scroll as a fade. Without WebGL, a CSS image fallback is used.

## Studio slots (`slots.js`, read through `useSlots`)
Images (all shown uncropped):
- `hero.dawn` (scene, shared `place.mountain`, default `himalaya-dawn`): the sunrise photo. The light is tuned for the default; for any other photo the sun rises above its focal point.
- `intro.photo` (couple, `{portrait:0}`); `intro.bridePhoto` / `intro.groomPhoto` (bride/groom): the pair replaces the plate when both exist.
- `essay.1`–`essay.7` (couple, `{portrait:1..7}`) and `album.1`–`album.6` (couple, `{portrait:8..13}`). Repeats and empties are skipped; the album then continues with `config.gallery`.
- `travel.arrive` / `travel.stay` / `travel.ask` (scene, shared `place.night` / `place.courtyard` / `place.garden`).
- `close.photo` (scene, shared `place.closing`, default `himalaya-dawn-alt`).

Texts (bilingual): `gate.from`, `gate.open`*, `gate.quiet`*, `hero.eyebrow` (*`hero.kicker`*), `intro.line` (*`couple.line`*),
`intro.bride`, `intro.groom`, `intro.daughter`, `intro.son`, `intro.card` (*`card.button`*), `card.title`,
`essay.title` (*`couple.title`*), `days.eyebrow`, `days.title` (*`events.title`*), `days.order`, `travel.eyebrow`,
`travel.arrive`, `travel.stay`, `travel.ask`, `album.eyebrow` (*`gallery.kicker`*), `album.title` (*`gallery.title`*),
`rsvp.title` (*`reply.title`*), `rsvp.send`. Italic = shared key; an asterisk means the shared key has the same name.

Invitation data still comes from the normal studio sections: names, parents, dates, events (with `photo`, `dress`,
`rituals`), card wording, `story` (captions only on uploaded photos; library photos get no narrative caption),
`gallery`, `info.travel` / `stays` / `contacts` / `livestream` (https only) and RSVP.

The invitation card and the lightbox open through `core/modal.js` `openModal` (`data-lenis-prevent`), so only the card scrolls and closing returns to the same place.

## Debug
`?debug` exposes `window.__hm` (`open()`, `rise(v)`, `to(selector, offset)`, `dawn`, `essay`, `album`).
`?debug&open` skips the gate. `?debug&img.<slot>=<slug>&txt.<slot>=<text>` previews a studio override (e.g. `img.hero.dawn=phewa-lake`).
