# Nimtto API reference

Base: `/api`. JSON in and out. Errors: `{ error: string, errors?: [{ path, message }], problems?: string[], current?: number }`.

**State-changing calls** (anything not GET) from a signed-in user need the header `X-CSRF-Token: <csrf>` (from login,
client session or `/auth/me`) and a same-site `Origin`. Missing/wrong token: `403`. Not signed in: `401`.
The two public POSTs (`/orders`, `/invitations/:slug/rsvp`) use an Origin check + honeypot + rate limit instead.
`:slug` is always `^[a-z0-9-]{3,64}$` (else `400`).

## Auth

| Route | Body | Response |
|---|---|---|
| `POST /auth/login` | `{ email, password }` | `{ role: 'admin', email, csrf }` · `401` generic · `429` throttled |
| `POST /auth/logout` | – (CSRF) | `{ ok: true }` |
| `POST /client/session` | `{ token, password }` | `{ role: 'client', slug, csrf, perms }` · `401` generic (bad token *or* password, same message) · `429` (20 failures / 15 min per IP, 10 wrong passwords / 15 min per invitation) |
| `GET /auth/me` | – | admin: `{ role: 'admin', email, csrf }` · client: `{ role: 'client', slug, csrf, perms }` · `401` (also when the link was revoked/replaced or the password changed) |

`perms = { themes: 'all' | string[], canChangeTheme: boolean, canChangeColors: boolean }`.
The client token is the part after `#/c/` in the link (43 chars base64url). Sessions: HttpOnly cookie, 12 h idle / 7 days max.

## Public

| Route | Body | Response |
|---|---|---|
| `GET /site` | – | `Site` (defaults when nothing saved yet) |
| `GET /themes` | – | `[{ slug, name, concept, thumb }]`, ready themes only, minus `hiddenThemes` (no page URLs: see "Theme pages") |
| `POST /orders` | `{ kind: 'order'\|'custom', name, phone, email?, weddingDate?, theme?, plan?, message?, website }` | `201 { ok: true }` · `400 { ok: false, error, fields: string[] }` · `403` cross-site · `429` |
| `GET /invitations/:slug/public` | – | published data (a signed-in editor of that invitation gets the draft); includes `design`, and `themeContent` only for the theme and its borrowed gate / first screen |
| `POST /invitations/:slug/rsvp` | `{ name, phone?, attending: 'yes'\|'no', guests, events?, meal?, message?, website }` | `{ ok: true }` |

`POST /orders` rules: `name` 2–80, `phone` `^[0-9+()\-\s]{6,20}$`, `email` ≤ 254, `weddingDate` `YYYY-MM-DD`,
`theme` an existing theme slug, `plan` an existing `Site.plans[].id`, `message` ≤ 2000 (required when `kind: 'custom'`).
`website` is the honeypot: keep it as a hidden empty input; any value → `{ ok: true }` and nothing is stored.
A `custom` request sent with a client session gets `invitation: <slug>` attached automatically. Limits: 5 stored
requests / hour / IP (100 in dev) and 200 / hour overall; 60 attempts / hour / IP (requests that fail validation count
only here, so a typo does not use up the 5). The honeypot answers `201 { ok: true }` like a real request.

```
Site = {
  plans: [{ id: /^[a-z0-9-]{1,32}$/, name ≤ 60, price: integer 0..10,000,000 | null ("Ask for price"),
            currency: 'NPR', note ≤ 160, features: string[≤ 20] (each ≤ 120), highlight: boolean }]  (≤ 8, unique ids),
  contact: { phone, whatsapp (phone format or ''), email, address ≤ 300 },
  hero: { title ≤ 120, subtitle ≤ 300 },
  hiddenThemes: string[], featuredThemes: string[]   (unknown slugs are dropped)
}
```

## Admin only

| Route | Body | Response |
|---|---|---|
| `GET /admin/stats` | – | `{ invitations, published, drafts, rsvps, attending, newOrders }` (`attending` = guests who said yes, `rsvps` = replies) |
| `PUT /site` | full `Site` | the stored `Site` · `400 { error, errors }` |
| `GET /orders` | – | `{ orders: Order[] }` newest first |
| `PATCH /orders/:id` | `{ status?: 'new'\|'contacted'\|'done'\|'archived', notes?: string ≤ 2000 }` | `{ order }` |
| `DELETE /orders/:id` | – | `{ ok: true }` |
| `GET /invitations` | – | `{ invitations: Summary[] }` |
| `POST /invitations` | `{ slug, bride, groom, theme?, sample? }` | `201 Doc` |
| `POST /invitations/:slug/seen` | – | `{ ok: true }` |
| `POST /invitations/:slug/unpublish` | – | `Doc` |
| `DELETE /invitations/:slug` | `{ confirm: slug }` | `{ ok: true }` (moved to trash) |
| `POST /invitations/:slug/client-link` | `{ password (6–128), themes?: 'all'\|string[], canChangeTheme?: bool, canChangeColors?: bool }` | `201 { url, token, createdAt, clientLink }` — token shown once; any older link and its sessions stop |
| `PATCH /invitations/:slug/access` | `{ themes?, canChangeTheme?, canChangeColors?, password? }` | `{ clientLink }` · `404` no link · a new password ends the couple's sessions |
| `DELETE /invitations/:slug/client-link` | – | `{ ok: true }` (revokes; sessions end) |

`Order = { id, at, kind, name, phone, email?, weddingDate?, theme?, plan?, message, invitation?, status, notes? }`.
Client-link defaults: `themes: 'all'`, `canChangeTheme: false`, `canChangeColors: true`.
`url` = `<PUBLIC_ORIGIN>/studio/#/c/<token>`.
`clientLink` (in `Summary`, `Doc` for admins, and the link routes) = `{ createdAt, hasPassword, themes, canChangeTheme, canChangeColors }` or `null`.
`hasPassword: false` = a link made before passwords existed: it still opens with the token alone and full rights,
until the admin sets a password with `PATCH /access`.

## Admin or the couple (own invitation)

| Route | Body | Response |
|---|---|---|
| `GET /meta` | – | `{ themes: [{ slug, name, concept, ready, thumb, colors }], tracks, library, depth, publicOrigin, shortLinks }` |
| `GET /invitations/:slug` | – | `Doc` (`clientLink`/`activity` admin only) |
| `PUT /invitations/:slug` | `{ version, data }` | `{ version, updatedAt, lastEdit, changed, data }` · `409 { current }` stale · `400 { errors }` · `403` perms |
| `GET /invitations/:slug/version` | – | `{ version, status, updatedAt, lastEdit }` |
| `POST /invitations/:slug/publish` | – | `Doc` · `422 { problems }` |
| `POST /invitations/:slug/uploads` | multipart `file`, `kind=image\|audio` | `201` photo object or `{ src }` (MP3) · `413` > 15 MB / > 80 MP · `415` not readable (iPhone HEIC gets its own message: sharp's prebuilt libheif decodes AVIF, not HEVC) · `429` > 300 / hour / invitation |
| `GET /invitations/:slug/rsvps` · `.csv` | – | `{ replies, totals }` · CSV |
| `DELETE /invitations/:slug/rsvps/:id` | – | `{ ok: true }` |

`meta.themes[].colors` = the theme's `slots.js` colour manifest `{ '--token': { label, default: '#hex', note } }` (`{}` if none).
`meta.themes[].parts` = its mix manifest (docs/MIX.md), sanitised by the server, or `null` without a `slots.js`:
`{ gate: false | true | 'pair', hero, hostGate, hostHero, ownGateNeedsHero (booleans), why: { gate?, hero?, hostGate?, hostHero? } (≤ 200 chars each),
gateUses / heroUses: { texts: [slot ids], images: [slot ids], colors: ['--token'] } }`. The `uses` lists keep only ids and tokens the
manifest declares; `gate` / `hero` are true only while `src/themes/<slug>/gate.js` / `hero.js` exists. `gate: 'pair'` = an opening
scene (agni, janti, rangoli, sindoor, shree): its gate only comes with its own first screen.
`meta.themes[].stills` = `{ gate, hero }`: `/themes/<slug>/gate.jpg` / `hero.jpg` when shot, else `''` (use `thumb`).

**Couple session limits on `PUT`** (`403` with a readable `error`, nothing saved):
- `data.theme` differs from the saved one → needs `canChangeTheme` and the new theme in `themes` (or `'all'`).
- `data.themeColors` differs from the saved one → needs `canChangeColors` (this includes a borrowed part's colours).
- `data.design.gate` or `.hero` differs from the saved one (after re-checking the saved one against today's manifests) → needs
  `canChangeTheme`, and every newly chosen slug must be in `themes` (or `'all'`). Going back to the theme's own needs only `canChangeTheme`.

### Invitation data additions (validated in `server/lib/validate.js`)
- `themeColors: { [themeSlug]: { '--token': '#rgb' | '#rrggbb' } }` — only tokens declared in that theme's
  `colors` manifest are kept (others silently dropped); bad colour → `400`. Stored lowercase; omitted when empty.
- `design: { gate?: '<theme slug>', hero?: '<theme slug>' }` (docs/MIX.md): another theme's gate (entry screen and opening) and
  first screen on this theme's page. Rules (`src/core/mix-rules.js`, shared with the page runtime and the studio): the giver has
  `parts.gate` / `parts.hero`, the body has `parts.hostGate` / `parts.hostHero`; an opening-scene gate (`gate: 'pair'`) needs
  `hero` = the same slug; a foreign hero on a body whose own opening needs its own hero (`ownGateNeedsHero`) needs a foreign gate,
  unless the body gives a standalone gate module of its own. A value equal to `theme`, unknown, or not allowed is dropped
  silently; the key is omitted when nothing is left. The part's words and pictures live in `themeContent[<its slug>]` and its
  colours in `themeColors[<its slug>]`, each checked against that theme's own manifest.
- `music.youtube: { id: /^[A-Za-z0-9_-]{11}$/, start?: integer 0..36000 (a JSON number), title?: ≤ 120 }` —
  omitted when absent, `null` or `id: ''`.
- `share.image`: a photo ref (library slug, upload object or https URL) or `''`. In `/public` it becomes a URL string
  (`share.image` else the first couple portrait).

## Theme pages (not under /api)

The designs are the product, so a theme's HTML (`/<theme>/`, `/<theme>/index.html`, any case or encoding) is gated in
production (`server/lib/gate.js`, before `express.static`). It is served only when:
- `?id=<slug>` names a **published** invitation whose theme is this one (another theme → `302` to `/<its theme>/?<same query>`);
- the request carries an admin session; or
- it carries a client session whose link is still active (the client studio's preview and Themes module).

Otherwise: no `id` → `302 /#designs`; unknown, malformed or unpublished `id` → `404` with a small "This invitation
isn't available" page (the same for both, so a draft's existence never leaks). Gated responses carry
`Cache-Control: private, no-store` and `Vary: Cookie`. Static files (`/assets/*`, `/themes/*`, `/site/*`, uploads)
stay public because invitations need them; `Cross-Origin-Resource-Policy: same-origin` keeps other sites from
loading the theme bundles. The public website shows only thumbnails and phone screenshots.

**Dev:** Vite serves the pages, so the gate does not run there (`localhost:5195/<theme>/` opens freely). Test it
against a production instance (`npm run build`, then `node server/index.js --production`).

## Share page (not under /api)

`GET /i/:slug?to=Name&e=wedding,reception` → HTML (published only, else `404`): `<title>`, `og:title`,
`og:description`, `og:image` (absolute; `share.image`, else the first couple portrait, else the theme thumb),
`og:url`, `twitter:card`, `robots: noindex`, then `<meta http-equiv="refresh">` and a link to
`/<theme>/?id=<slug>` keeping `to` (≤ 60 chars) and valid `e` ids.
