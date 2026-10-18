# Nimtto (निम्तो) — premium Nepali wedding invitations

Twenty-two bilingual (English / नेपाली) wedding-invitation themes and a studio
dashboard to create, customise, publish and track invitations.

| # | Theme | Concept |
|---|---|---|
| 01 | **Kham** `/kham/` | Handmade-paper envelope with an endless-knot wax seal; the card unfolds into a clear programme. |
| 02 | **Dhoka** `/dhoka/` | White editorial print. The Golden Door of Patan opens in 3D. |
| 03 | **Mala** `/mala/` | A dressed Nepali mandap: sindoor silk drapes, marigold strings and brass kalash of fresh flowers. |
| 04 | **Durbar** `/durbar/` | A 3D morning walk through Bhaktapur Durbar Square, under flower arches, past the Nyatapola. |
| 05 | **Phoolbari** `/gurans/` | A flower gate with शुभ विवाह opens onto a calm, normally scrolling invitation (no 3D). |
| 06 | **Dhaka** `/dhaka/` | The seal breaks, the Dhaka band slides off and the couple's photo rises into a floral frame. |
| 07 | **Sayapatri** `/sayapatri/` | A doorway hung with real marigold strings and a mango-leaf toran; they lift to open a calm ivory invitation. |
| 08 | **Himal** `/himal/` | Quiet luxury: Himalayan sunrise and a photo essay of the couple. |
| 09 | **Chitra** `/chitra/` | Mithila picture book with illustrated characters: janti, swayambar, seven rounds, sindoor, dance. |
| 10 | **Mandap** `/mandap/` | 3D floral mandap on a bright morning; realistic couple exchange garlands and walk seven rounds. |
| 11 | **Bagaicha** `/bagaicha/` | 3D garden wedding: through a rose arch, seven rounds of the fire, on to the reception. |
| 12 | **Ghar** `/ghar/` | A lamplit film walking room by room through a Newar house. |
| 13 | **Mangal** `/mangal/` | A wide red temple doorway with marigold garlands and bells; the doors swing open on शुभ विवाह in gold. |
| 14 | **Nimantrana** `/nimantrana/` | A traditional red-gold tri-fold card on green silk; it unfolds in 3D into Ganesh, the couple and the programme. |
| 15 | **Jhyal** `/jhyal/` | A carved Newari window on ivory lokta paper; the lattice shutters swing open and the view moves through into a calm invitation. |
| 16 | **Mahal** `/mahal/` | Mangal's card behind a golden palace gate: Ganesh in the crest, the satin bow comes undone, the gate swings open and the camera walks onto a palace balcony at night. |
| 17 | **Laali** `/laali/` | Blush pink and gold: an arched card under hanging lanterns; the gold arch draws itself and the lanterns drop in. |
| 18 | **Mehendi** `/mehendi/` | Henna on ivory: a henna mandala draws itself, then the joined, hennaed hands glide in. |
| 19 | **Hariyo** `/hariyo/` | Sage-green watercolour garden: the leaves part on a white pavilion with the couple and two peacocks. |
| 20 | **Shree** `/shree/` | Deep plum and antique gold: a gold lotus opens on Ganesh while two hanging diyas descend. |
| 21 | **Pardaa** `/pardaa/` | Red velvet curtains part on a dressed mandap with a living fire; each ceremony (Mehendi, Haldi, Wedding, Reception) in its own colours. |
| 22 | **Rajdwar** `/rajdwar/` | Mahal's painted gold palace gate and satin bow; untie it and walk through onto the red-and-gold Mangal card. |
| 23 | **Agni** `/agni/` | The sacred fire at night: a tap lights the fire in the havan kunda, then the couple walk the seven rounds and the vows appear. |
| 24 | **Janti** `/janti/` | The wedding procession: walk with the Naumati Baja and the doli down an old Newari street to the bride's door. |
| 25 | **Swayambar** `/swayambar/` | Two fresh garlands swing apart on the jaimala; the bride's and groom's sides converge as you scroll. |
| 26 | **Sindoor** `/sindoor/` | Minimal red, white and black: the sindoor box opens in a bloom of red and a parting line threads the story. |
| 27 | **Rangoli** `/rangoli/` | A flower rangoli on a courtyard brick floor: its rings assemble, the centre diyo lights, and the floor tells the day. |
| 28 | **Sarovar** `/sarovar/` | A lotus lake at dawn on living WebGL water: a bud opens, two swans meet, and you glide across the lake past stone posts (one per ceremony) to a marble pavilion. Both sites. |
| 29 | **Mohar** `/mohar/` | The royal seal: press and hold a brass seal into red lac on a folded farman, break it, and the decree unfolds in 3D; its pages then open like a concertina. Both sites. |
| 30 | **Kalapi** `/kalapi/` | The peacock's monsoon: a peacock fans its tail around your names, then you walk sideways along a painted Nathdwara pichwai cloth. |
| 31 | **Kalpataru** `/kalpataru/` | The wish-fulfilling tree (both sites): a leaf card turns over on the names, then the guest climbs a painted peepal tree from its roots to its crown, past both families, the lanterns and the nest. |
| 32 | **Shagun** `/shagun/` | The brass shagun thali on a banana leaf: the silk lifts off, a sindoor thumb-tika seals the card, and the thali turns as you scroll, one offering per part of the wedding. |
| 33 | **Sandesh** `/sandesh/` | Doves bring a lac-sealed letter to a morning rooftop; it unfolds to the names, then the doves deliver each event as a hand-stamped postcard. Both sites. |
| 34 | **Vasant** `/vasant/` | Spring garden: butterflies lift off a marigold and rose garland; in a sticky window each ceremony's own flower blooms as its card scrolls by. |
| 35 | **Zari** `/zari/` | A sapphire velvet trousseau trunk: the padlock drops, the lid swings back, and the trays lift out in 3D one by one, each holding a part of the day. |
| 36 | **Toran** `/toran/` | Marigold ladis part on a dressed doorway; scrolling dollies through seven haveli doorways, each with its own toran, to the mandap. |

The showroom at `/` links every theme and the studio.

## Quick start

Requirements: Node 22+.

```bash
npm install                      # front end
cd server && npm install && cd ..  # studio API
cp server/.env.example server/.env # then fill it in (see below)

npm run dev                      # themes + showroom on http://localhost:5190
cd server && npm run dev         # API on http://localhost:8787 (Vite proxies /api and /uploads)
```

Open the studio at `http://localhost:5190/studio/`.

### Admin login (studio)

The studio has one admin account, configured in `server/.env` (never committed):

```bash
cd server
# set ADMIN_EMAIL in .env, then create a password hash (input is read from stdin):
printf '%s' 'your-long-password' | npm run --silent hash-password -- --raw
# paste the printed hash as ADMIN_PASSWORD_HASH='<hash>' in .env and restart the server
```

## How it works

- **Invitation data** — one JSON document per invitation (couple, families, dates in AD and B.S.,
  ceremonies, story, vows, card wording, gallery, guest info, music, RSVP). The demo lives in
  `src/config.js`; real invitations are created in the studio and loaded with `?id=<slug>`.
- **Everything is replaceable.** Each theme declares every image and text it shows in
  `src/themes/<theme>/slots.js`. The studio's *Theme content* section edits them.
  Shared slots (see `src/core/slot-vocab.js`) and the couple's photos carry over when you switch theme.
- **Couple photos first.** Places that show the couple always use the couple's own uploads.
- **RSVP** — submitted to the studio server (or a Google Apps Script, see `apps-script/`),
  with per-ceremony totals and CSV export in the dashboard.
- **Accessibility & motion** — reduced-motion and no-WebGL fallbacks in every theme; dialogs lock
  background scrolling; Devanagari is never letter-spaced.

## Project layout

```
<theme>/index.html        one page per theme (auto-discovered by Vite)
studio/index.html         studio dashboard page
src/core/                 shared modules: data, i18n, audio, RSVP, slots, modal, 3D stage
src/themes/<theme>/       theme code, styles, slots manifest, README
src/studio/               dashboard UI
server/                   studio API (auth, invitations, uploads, RSVP) — see server/README.md
public/photos/            optimised photo library (WebP + depth maps)
public/themes/<theme>/    theme assets and thumbnails
scripts/                  photo optimisation and depth-map generation
docs/                     theme contract and photo library catalogue
```

## Photos and media

All photographs are real and openly licensed (Wikimedia Commons / Openverse; CC0, CC BY,
CC BY-SA), listed with author, licence and source in `art-src/photos/credits.json` and
`docs/PHOTO-LIBRARY.md`, and credited in each invitation's footer. CC BY-SA images must keep
their licence and credit when redistributed. 3D characters: MakeHuman (CC0). Garden plants, textures and HDRIs: Poly Haven and ambientCG (CC0). Flower cut-outs: Wikimedia Commons (CC0 / CC BY-SA), credited per theme in `flora-credits` files and the invitation footer. Music credits are in `src/config.js`.

Original full-resolution images are not in the repository; re-download them from the
`source_url` in `credits.json`, then run `node scripts/optimize-art.mjs` (and
`python scripts/depth.py` for depth maps).

## Production

```bash
npm run build                    # outputs dist/
cd server && NODE_ENV=production npm start   # serves dist/ + API with secure cookies and HSTS
```

Set `PUBLIC_ORIGIN` and `TRUST_PROXY` in `server/.env` when running behind a domain or proxy.
Before going live, run through the security checklist (auth, CSRF, uploads, headers, backups).
