# Sayapatri Studio server

The API and file server behind the studio dashboard (`/studio/`) and the published invitations.
Node 22, Express 5, JSON files on disk. No database.

```
server/
  index.js            routes, static files, error handling
  lib/env.js          reads server/.env, paths
  lib/auth.js         single-admin login, sessions, CSRF
  lib/security.js     headers (CSP, HSTS…), rate limiting, Origin checks
  lib/validate.js     server-side validation of the invitation data (THEME-CONTRACT §2)
  lib/invitations.js  create / read / save draft / publish / unpublish / delete, public payload
  lib/rsvp.js         public RSVP intake, admin list, CSV export
  lib/uploads.js      image + MP3 uploads
  lib/depth.js        optional background depth maps (depth_worker.py)
  data/               invitations/<slug>.json, rsvps/<slug>.json, trash/   (gitignored)
  uploads/<slug>/     re-encoded photos and music                         (gitignored)
```

## Setup

```bash
cd server
npm install
cp .env.example .env
npm run hash-password          # type a password (12+ characters); paste the printed line into .env
```

`.env`:

| key | meaning |
|---|---|
| `ADMIN_EMAIL` | the one account that can sign in |
| `ADMIN_PASSWORD_HASH` | argon2id hash from `npm run hash-password` (bcrypt `$2b$…` also accepted). Keep the single quotes. |
| `PORT` | default `8787` |
| `NODE_ENV` | `production` turns on Secure `__Host-` cookies, HSTS and serving `../dist` (or pass `--production`) |
| `PUBLIC_ORIGIN` | e.g. `https://invite.example.com` (comma-separated list allowed). Used for share links and the Origin check. |
| `TRUST_PROXY` | `1` behind nginx / Caddy / a PaaS router, so rate limits see the real client IP |
| `DEPTH_ENABLED` | `1` (default) makes depth maps for uploaded photos when Python is available |
| `DEPTH_PYTHON` | Python with torch, transformers, scipy, pillow. Default `../tools/.venv/Scripts/python(.exe)` |
| `LINK_SECRET` | Optional, 32+ chars: key for the stored couple links. Unset: a random key in `data/link.key` |

To change the password, run `npm run hash-password` again, replace the line and restart. That signs the
admin out everywhere. A plain restart or deploy signs nobody out: sessions persist in `data/sessions.json`
(see docs/API.md "Sessions").

Non-interactive (scripts, CI, a password manager): pipe the password on stdin; `--raw` prints only
the hash. Never put the password itself on the command line or in a file.

```bash
# bash
NEW_HASH=$(printf '%s' "$CLIENT_PASSWORD" | npm run --silent hash-password -- --raw)
# then set ADMIN_PASSWORD_HASH='<that hash>' in server/.env and restart the server
```
```powershell
# PowerShell
$hash = $env:CLIENT_PASSWORD | npm run --silent hash-password -- --raw
```

## Development

Two terminals, from the project root:

```bash
cd server && npm start         # API on :8787
npx vite                       # studio at http://localhost:5190/studio/ (port pinned in vite.config.js)
```

Every Vite dev server proxies `/api` and `/uploads` to :8787, so any theme page can load
`/<theme>/?id=<slug>`.

## The studio

A guided tool for wedding planners: a home screen of invitation cards (Edit / Share), then six
short steps with a progress bar and autosave: **Couple & photos**, **Dates & ceremonies**, **Choose a
theme**, **Customise** (the theme's own photos and words as click-to-change cards; rarer details under
"More details"), **Music**, **Preview & publish** (phone + computer preview, Publish, Copy link,
WhatsApp, personal guest links). Replies have their own page with totals, a table and CSV export.

- **Themes** are discovered on disk: every `src/themes/<slug>/slots.js`, with the thumbnail
  `public/themes/<slug>/thumb.jpg`. A theme is selectable once its page `<slug>/index.html` exists
  ("Coming soon" before that). A manifest may carry `name` and `description` for the picker.
- **B.S. dates** come from `bsDateOf()` in `src/core/i18n.js` (THEME-CONTRACT §12). The studio shows
  them as suggestions; `weddingDateBS` and `events[].dateBS` are stored only when the planner types
  their own. The public payload fills an empty `weddingDateBS` from the wedding date.

## How it fits together

- The studio edits a **draft**. Every change autosaves after 0.7 s (`PUT /api/invitations/:slug` with
  an optimistic `version`, so two tabs cannot overwrite each other silently).
- **Publish** validates completeness and copies the draft into a **published** snapshot. Guests only
  ever see the snapshot. Edits after publishing show "Live · edits not published" until you publish again.
- Themes call `loadInvitation()` (`src/core/data.js`), which fetches
  `GET /api/invitations/:slug/public`. That returns the published snapshot with
  `rsvp.endpoint = /api/invitations/:slug/rsvp`. A signed-in admin gets the draft instead, which is
  what the studio's live preview iframe shows.
- Guest links: `/<theme>/?id=<slug>`; in production also `/i/<slug>`, a small link-preview page
  (Open Graph tags for WhatsApp/Facebook) that forwards to the current theme (so links keep working
  after a theme change). Full route reference: `docs/API.md`. Add `?to=Name` to greet a guest and
  `&e=wedding,reception` to show only some ceremonies.

## Theme content (every image and text)

Each theme declares its replaceable photos and lines in `src/themes/<slug>/slots.js`
(THEME-CONTRACT §9–10). The studio's **Theme content** section lists them for the selected theme.

- Entries with `shared: '<key>'` (keys from `src/core/slot-vocab.js`) save to
  `data.content.images|texts[key]`, so a line or photo entered once appears in the matching place of
  every theme. A shared text's limit is the smallest `max` any theme gives it.
- Theme-only entries save to `data.themeContent[theme].images|texts[id]`; they stay saved when the
  couple switches theme and come back if they switch back.
- Photos uploaded into a couple / bride / groom slot join `couple.portraits` (and fill an empty
  `bride.photo` / `groom.photo`), and the slot stores `{ portrait: n }`, so couple photos follow the
  couple into every theme.
- The server loads the manifests and the vocabulary with a dynamic import (only the eight known theme
  slugs, never user input), re-reading them when the files change. It drops ids a manifest does not
  declare, enforces lengths, and accepts only uploaded photos of this invitation, library slugs, https
  URLs or `{ portrait: n }`. A theme without a manifest yet keeps well-formed overrides until it has one.
- The Theme section shows what carries over when switching theme.

## API

| method | path | who |
|---|---|---|
| POST | `/api/auth/login` `{email,password}` | public (rate limited) |
| POST | `/api/auth/logout` | admin |
| GET | `/api/auth/me` → `{email, csrf}` | admin |
| GET | `/api/meta` (themes, bundled tracks, photo library) | admin |
| GET / POST | `/api/invitations` | admin |
| GET / PUT / DELETE | `/api/invitations/:slug` (DELETE needs `{confirm: slug}`; moves to `data/trash/`) | admin |
| POST | `/api/invitations/:slug/publish`, `/unpublish` | admin |
| POST | `/api/invitations/:slug/uploads` multipart `file`, `kind=image|audio` | admin |
| GET | `/api/invitations/:slug/rsvps`, `/rsvps.csv` | admin |
| DELETE | `/api/invitations/:slug/rsvps/:id` | admin |
| GET | `/api/invitations/:slug/public` | public |
| POST | `/api/invitations/:slug/rsvp` (JSON sent as `text/plain`) | public |

Admin requests other than GET must send `X-CSRF-Token` (from `/auth/me` or the login response).

## Security measures

- **Auth**: one admin from `.env`; argon2id hashes (OWASP parameters), constant-time comparisons,
  a dummy verify when the email is wrong. Login throttled to 10 failures per IP and 20 per account
  per 15 minutes. Login, logout and failures are logged without passwords.
- **Sessions**: 256-bit random id, stored hashed in memory, HttpOnly + SameSite=Lax cookie,
  `__Host-` prefix + Secure in production, rotated on every login, 12 h idle / 7 day absolute expiry,
  destroyed on logout.
- **CSRF**: synchronizer token bound to the session on every state-changing admin request, plus an
  Origin check (also on login, to stop login CSRF).
- **Validation**: every field checked server-side (types, lengths, ISO dates with offset, hex
  colours, phone pattern, enums, slug `^[a-z0-9-]{3,64}$`, unique ceremony ids, https-only links,
  photo/audio references limited to this invitation's uploads or the bundled library). Unknown keys
  are dropped; control and bidi-override characters stripped.
- **Uploads**: 15 MB cap enforced while streaming; images verified by decoding with sharp (not by
  name or MIME), pixel-count limit against decompression bombs, EXIF orientation applied then all
  metadata (EXIF/GPS/XMP) stripped, re-encoded to WebP 2560w and 1280w under random 144-bit names.
  MP3s checked by frame headers. Files are stored outside the web root and served by a strict
  filename pattern with `nosniff`; no directory listings.
- **RSVP**: published invitations only, Origin check, 8 KB body limit, honeypot (`website`),
  8 replies per IP per 10 min and 400 per invitation per hour, ceremony ids checked against the
  invitation, guest count against `maxGuests`. CSV export prefixes cells starting with
  `= + - @ tab CR` with `'` and quotes properly (formula injection), UTF-8 BOM for Excel.
- **Headers**: CSP (API: `default-src 'none'`; pages: self + Google Fonts), HSTS in production,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP, CORP, frame protection,
  no `X-Powered-By`, `Cache-Control: no-store` on the API.
- **Storage**: atomic writes (temp file + fsync + rename) with a per-invitation lock.
- **Errors**: only messages we wrote reach the client; no stack traces.

## Deploy

1. On the server: Node 22+, the repo, `npm ci` in the root and in `server/`.
2. `npm run build` in the root (creates `dist/`, including `dist/studio/`).
3. `server/.env` with `NODE_ENV=production`, `PUBLIC_ORIGIN=https://your-domain`, `TRUST_PROXY=1`.
4. Run `node server/index.js` under a process manager (systemd, pm2) on port 8787, behind a
   reverse proxy that terminates HTTPS and redirects HTTP to HTTPS, e.g. Caddy:
   ```
   invite.example.com {
     reverse_proxy 127.0.0.1:8787
   }
   ```
   Allow request bodies of at least 16 MB for uploads (nginx: `client_max_body_size 16m;`).
5. Back up `server/data/` and `server/uploads/` (daily; test a restore once).
6. Depth maps are optional. Without the Python venv, set `DEPTH_ENABLED=0`; uploads then have
   no depth map and themes show them flat.

The server keeps rate-limit counters in memory and caches sessions (written through to
`data/sessions.json`), so run a single instance.

Before handing over, go through `~/.claude/templates/SECURITY-CHECKLIST.md`
(HTTPS/HSTS check, securityheaders.com, backups, `npm audit`, privacy policy for RSVP data).
