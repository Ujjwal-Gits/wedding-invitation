# Nimtto platform spec (v2) — read fully before writing code

Four agents build this at the same time. This file is the contract between them. If you need to change the
contract, add a short note under "Change requests" at the bottom; don't silently diverge.

## Who uses what

| Surface | URL | Who | Purpose |
|---|---|---|---|
| Public website | `/` (root `index.html`) | everyone | One-page marketing site: hero, how it works, theme gallery (view only, live demo), pricing (from the API, editable by the admin), custom-order request form, contact, footer. |
| Super admin studio | `/studio/` after admin login | the owner | Modules (left vertical nav): Overview, Invitations, Clients & access, Orders & requests, Replies, Themes, Website (pricing + contact), Settings. |
| Client studio | `/studio/#/c/<token>` + password | the couple / family | Clean, simple modules: Home, Opening (gate & hero), Couple & family, Dates & events, Photos, Music, Replies, Send invitation; plus Themes (view only) and Request a custom design. Live preview on the right (phone/desktop toggle). |
| Invitation | `/<theme>/?id=<slug>` and share link `/i/<slug>` | guests | The theme page. |

The client may only change: the hero/opening **content** (texts, images), the hero/opening **colours**, and, if the
admin allows it, the **theme** (which brings that theme's gate and opening design) from the themes the admin allowed.
They edit their own data (names, families, dates, events, photos, music, wording). They never edit theme code or layout.

## Data model (server/data, JSON files, atomic writes via lib/store.js)

### Invitation (`data/invitations/<slug>.json`), additions
- `access` (replaces `clientAccess`; migrate on read):
  `{ tokenHash, passwordHash, createdAt, themes: 'all' | string[], canChangeTheme: boolean, canChangeColors: boolean }`.
  `tokenHash` = sha256 of the link token. `passwordHash` = argon2id (via `@node-rs/argon2`, already a dependency).
- `draft` / `published` invitation data gains:
  - `themeColors: { [themeSlug]: { [cssVarName]: '#rrggbb' } }`. Only names declared in that theme's `slots.js`
    `colors` manifest are accepted; values must be `#rgb`/`#rrggbb`.
  - `music.youtube: { id: '<11 chars [A-Za-z0-9_-]>', start?: integer seconds 0..36000, title?: string ≤ 120 }`
    (optional; when present it plays instead of the MP3 tracks).
  - `share: { title, description, image }` (existing): `image` is a photo ref (library slug or upload object).

### `data/orders.json`
`[{ id, at, kind: 'order' | 'custom', name, phone, email?, weddingDate?, theme?, plan?, message, invitation?, status: 'new' | 'contacted' | 'done' | 'archived', notes? }]`

### `data/site.json`
`{ plans: [{ id, name, price, currency: 'NPR', note?, features: string[], highlight: boolean }], contact: { phone, whatsapp, email, address }, hero: { title, subtitle }, hiddenThemes: string[], featuredThemes: string[] }`
Defaults (no file yet): three placeholder plans named "Classic", "Premium", "Custom" with `price: null`
(the site shows "Ask for price" when null) and empty contact.

## API (all JSON; non-GET needs `X-CSRF-Token` + Origin check exactly as today, except the two public POSTs which use Origin check + honeypot + rate limit)

Public:
- `GET /api/site` → site.json (public fields).
- `GET /api/themes` → `[{ slug, name, concept, thumb, demo: '/<slug>/' }]`, minus `hiddenThemes`.
- `POST /api/orders` `{ kind, name, phone, email?, weddingDate?, theme?, plan?, message, website (honeypot) }` → `{ ok: true }`.

Auth:
- `POST /api/client/session` `{ token, password }` → sets the session cookie (role `client`, slug, perms). Wrong password: 401, rate-limited.
- `GET /api/auth/me` → `{ role: 'admin' }` or `{ role: 'client', slug, perms: { themes, canChangeTheme, canChangeColors } }`.

Admin:
- `GET /api/admin/stats` → `{ invitations, published, drafts, rsvps, attending, newOrders }`.
- `PUT /api/site`.
- `GET /api/orders`, `PATCH /api/orders/:id` `{ status?, notes? }`, `DELETE /api/orders/:id`.
- `POST /api/invitations/:slug/client-link` `{ password (≥ 6 chars), themes, canChangeTheme, canChangeColors }` → `{ url }` (token shown once).
- `PATCH /api/invitations/:slug/access` `{ themes?, canChangeTheme?, canChangeColors?, password? }`.
- `DELETE /api/invitations/:slug/client-link` (revokes, ends client sessions).
- Existing invitation routes stay. On `PUT /api/invitations/:slug` from a **client** session the server enforces:
  theme ∈ allowed themes and unchanged unless `canChangeTheme`; `themeColors` unchanged unless `canChangeColors`.
- `POST /api/orders` with `kind: 'custom'` from a client session attaches `invitation: slug` automatically.

Share preview:
- `GET /i/<slug>` serves a small HTML page (no JS needed) with `<title>`, `og:title`, `og:description`,
  `og:image` (absolute URL: `share.image` else the first couple portrait), `og:url`, `twitter:card`, then a
  `<meta http-equiv="refresh">` + link to `/<theme>/?id=<slug>` (keeping `to` and `e`). Everything escaped.
- CSP gains `https://www.youtube.com` and `https://www.youtube-nocookie.com` for scripts/frames needed by the YouTube IFrame API.

## Live preview protocol (studio ⇄ theme iframe), implemented in `src/core/data.js` + the studio

- The studio loads `/<theme>/?id=<slug>&preview=1` in an iframe (add `&debug&open` to skip the gate when the
  module being edited is not the opening).
- In a page with `preview=1` inside an iframe, `loadInvitation()` posts `{ type: 'nimtto:ready' }` to the parent
  (targetOrigin = `location.origin`) and waits up to 1500 ms for `{ type: 'nimtto:data', data }` from the same
  origin; if it arrives, that object is the config (unsaved edits show immediately). Otherwise it fetches as today.
- After the theme has rendered, it posts `{ type: 'nimtto:mounted' }`. The studio may then post
  `{ type: 'nimtto:focus', text }`: the page finds the visible element whose own text best contains `text`,
  scrolls it to the centre and outlines it briefly (a gold 2px outline that fades out in 1.6 s). This shows the
  client *where* the text they just edited appears.
- The studio re-renders the preview on every edit (debounced ~350 ms) by reloading the iframe and answering its
  `nimtto:ready` with the current model; the server save still happens on its own debounce as today.
- Colours: after config loads, `data.js` applies `config.themeColors?.[config.theme]` as inline CSS custom
  properties on `document.body` (validated names `^--[a-z0-9-]+$`, hex values), so they override the theme's tokens.

## Theme colour manifests

Each `src/themes/<slug>/slots.js` gains `colors: { '--token-name': { label, default: '#hex', note? } }` listing
2–5 tokens that drive the opening/hero look (e.g. Mangal: `--mg-red`, `--mg-gold`, `--mg-ivory`). Only tokens
that exist in that theme's CSS and visibly change the opening/hero.

## Music: YouTube

`src/core/audio.js`: when `config.music.youtube.id` exists, use the YouTube IFrame API with a small but visible
player inside the music sheet (YouTube's terms forbid a hidden player and forbid downloading the audio, so we
never extract audio). The entry tap starts playback (`playVideo()`, from `start`). Mute/unmute and the pill work
the same way as for MP3. If the API fails to load, fall back to the bundled tracks.

## Design language for the studio and the website

- Calm, premium, clean. Generous white space, one accent colour, a refined serif for display (not Inter, Roboto,
  Open Sans or system-ui as display) and a clear sans for UI (Mukta covers Devanagari; pair it with e.g. "Hanken
  Grotesk" or "Manrope" for Latin UI). Define colour tokens; no default Tailwind palette; no blue-to-purple gradients.
- Studio layout: left vertical module nav (icons + labels, collapsible to icons on tablets, a bottom tab bar on
  phones), content area in the middle, live preview on the right (phone frame by default, toggle to desktop).
  Every editable field shows a small live result; images are replaced by drag-and-drop or tap, cropping by focal
  point, no required alt text.
- Bilingual (English / नेपाली) labels where the existing studio has them. Accessible: labels, focus states, AA contrast.

## Ownership (do not edit outside your area)

| Agent | Owns |
|---|---|
| server | `server/**`, `docs/API.md` |
| core | `src/core/data.js`, `src/core/audio.js`, `src/core/shell.js`, every existing `src/themes/*/slots.js` (adding `colors` only) |
| studio | `src/studio/**`, `studio/index.html` |
| website | root `index.html`, `src/site/**`, `public/site/**` |
| theme agents | their own theme folders only |

## Dev environment

- Vite dev server: http://localhost:5195 (already running; do not start another). It proxies `/api` and `/uploads`.
- API: http://localhost:8787, started in watch mode from a SANDBOX copy of the data (`DATA_ROOT` points to a scratch
  folder), so it restarts itself when `server/index.js` or `server/lib/**` change. Do NOT start another API server.
  Never touch `server/.env`, `server/data`, `server/uploads`.
- Dev admin login (sandbox only): credentials are in
  `C:\Users\NITROV~1\AppData\Local\Temp\claude\d--Wedding-Cards\ec742518-f64d-4361-bf82-cc6c5c193fd0\scratchpad\devsandbox\dev-login.txt`.
  Never copy them into the repo.
- Python Playwright is installed for screenshots (`PYTHONIOENCODING=utf-8`; chromium args
  `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`).

## Change requests
(append here)

**server (2026-10-15):**
- Legacy links (`clientAccess` migrated to `access` on read) have `passwordHash: null`, full rights (`themes: 'all'`, both flags true) and open with the token alone until the admin sets a password via `PATCH /access`; admin views show `clientLink.hasPassword: false` for them.
- Admin payloads keep the field name `clientLink` = `{ createdAt, hasPassword, themes, canChangeTheme, canChangeColors }` (never hashes). `POST client-link` returns `{ url, token, createdAt, clientLink }`; `password` is now required (the studio's current body-less call gets 400). Defaults: `themes 'all'`, `canChangeTheme false`, `canChangeColors true`.
- `/auth/me` and `/client/session` also return `csrf` (and `email` for admin). `GET /api/meta` themes gain `colors` (the manifest).
- Client `PUT` that breaks a perm → 403 with a message (not silently reverted).
- `themeColors` tokens not in the manifest are dropped silently (like slot ids); `themeColors`/`music.youtube` are omitted from data when empty. `share.image` is now stored as a photo ref.
- `POST /api/orders` → 201 `{ ok: true }`; 400 `{ ok:false, error, fields }`. `weddingDate` is `YYYY-MM-DD`; `message` required only for `custom`; `plan` must be an existing plan id. `GET /api/themes` lists ready themes only. `stats.attending` = guests (people) who said yes.

**core (2026-10-15):**
- `nimtto:data` is used only if `data` is a plain object with a `couple` object; send the whole draft model. Missing top-level keys fall back to the demo; empty `music.tracks` gets the bundled tracks; `rsvp.endpoint` and event `end` are filled like `/public` does. Answer every `nimtto:ready` (each iframe reload asks again).
- `nimtto:focus` `{ text }` (≤ 500 chars, case/space-insensitive): smallest visible element containing it; if none, the largest visible element whose text is part of it (e.g. only a first name is shown); a hidden-language match outlines its visible parent.
- Colours: `themeColors[<theme in the URL path>]` wins, else `themeColors[config.theme]`, so the preview of `/<theme>/` uses that theme's colours.
- Theme agents: Mangal's and Mahal's painted doors/gate use literal colours, so their tokens recolour the page below and the hero text, not the doors. To make the opening itself recolourable, route those gate colours through the manifest tokens.
- `music.youtube`: the player sits in the music sheet (`.sheet__yt`); YouTube errors or a failed API load (10 s) switch to the MP3 tracks.
