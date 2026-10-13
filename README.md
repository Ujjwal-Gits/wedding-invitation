# Sayapatri — premium Nepali wedding invitations

Eight cinematic, bilingual (English / नेपाली) wedding-invitation themes and a studio
dashboard to create, customise, publish and track invitations.

| # | Theme | Concept |
|---|---|---|
| 01 | **Dhoka** `/dhoka/` | White editorial print. The Golden Door of Patan opens in 3D. |
| 02 | **Ghar** `/ghar/` | A night film walking room by room through a lamplit Newar house. |
| 03 | **Sayapatri** `/sayapatri/` | Bright haldi daylight; "two hands, one promise". |
| 04 | **Chitra** `/chitra/` | Mithila picture book with illustrated characters: janti, swayambar, seven rounds, sindoor, dance. |
| 05 | **Mandap** `/mandap/` | 3D night mandap; rigged couple exchange garlands and walk the seven rounds. |
| 06 | **Bagaicha** `/bagaicha/` | 3D garden destination: pavilion, pool, waterfall, morning to night. |
| 07 | **Dhaka** `/dhaka/` | Modern graphic design; a live Dhaka weave forms the couple's initials. |
| 08 | **Himal** `/himal/` | Quiet luxury: Himalayan sunrise and a photo essay of the couple. |

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
their licence and credit when redistributed. 3D characters: Quaternius (CC0). Garden textures
and HDRI: Poly Haven (CC0). Music credits are in `src/config.js`.

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
