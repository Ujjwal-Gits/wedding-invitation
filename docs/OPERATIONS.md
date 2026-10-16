# Nimtto operations runbook

How nimtto.com runs, what to set in Coolify and Cloudflare, backups, and what to do under attack.
Server internals: `server/README.md`. Routes: `docs/API.md`. First-time Coolify setup: `DEPLOY.md`.

```
guest phone ──► Cloudflare (cache, WAF, rate limits, bot checks)
                   │  only Cloudflare reaches the VPS (firewall)
                   ▼
             Coolify Traefik ──► one container: node server/index.js
                                   ├─ dist/ (precompressed .br/.gz, cache headers)
                                   ├─ /api (Express)
                                   └─ volumes: /app/server/data   (nimtto.db, backups/, link.key, proofs/ = payment screenshots)
                                               /app/server/uploads (photos, music)
```

## What the server does to stay up

| Layer | What | Where |
|---|---|---|
| Database | SQLite in WAL mode, one file `data/nimtto.db` (invitations, replies, orders, site, sessions). Readers never wait for writers; each write is one short transaction. | `server/lib/store-sqlite.js` |
| Cache | Parsed invitations and the guests' JSON are kept in memory, checked against the stored revision on every read (never stale). `/api/site`, `/api/themes`, `/api/invitations/:slug/public` send an ETag and answer `304` when unchanged. | `lib/store.js`, `lib/http-cache.js` |
| Static files | Built once with brotli/gzip; sent as they are. Hashed `/assets/*` cached for a year; art cached a week (a month at Cloudflare). | `lib/static.js`, `scripts/compress-dist.js` |
| Back-pressure | At most 512 requests in flight (then `503` + `Retry-After`). While the event loop is over 400 ms behind for 2 s, sign-in, uploads and admin lists answer `503` so guest pages keep working. | `lib/guard.js` |
| Per-IP limits | 3000 requests/min per IP overall, 1200/min to `/api` (generous: guests on one mobile carrier share IPs). Strict ones per route: admin sign-in 10 failures/15 min per IP, couple link 20 failures/15 min per IP and 10 wrong passwords/15 min per invitation, RSVP 30/10 min per IP per invitation and 3000/hour per invitation, orders 5/hour per IP, uploads 300/hour per invitation, payment screenshots 10/hour per IP and 20/hour per order (3 per order in all), pay pages and QR images 300/10 min per IP. | `lib/guard.js`, the route modules |
| Expensive work | argon2: 2 at a time, 32 waiting, then `503`. Couple links that match nothing cost no CPU (an indexed lookup, then a timed wait). Photos: 2 processed at once, 16 waiting; 6 uploads received at once, 12 waiting; then `503`. | `lib/guard.js`, `lib/uploads.js` |
| Slow clients | Headers within 20 s, a whole request within 120 s, idle keep-alive 95 s (longer than Traefik keeps idle connections, so no 502 races). | `server/index.js` |
| Real client IP | `CF-Connecting-IP`, trusted only when the request came through a Cloudflare address. `CLOUDFLARE_ONLY=1` refuses anything else. | `lib/security.js` |
| Restarts | `SIGTERM` finishes requests in flight (10 s max) and closes the database cleanly. An unexpected exception logs and exits; Docker restarts the container. | `server/index.js` |
| Health | `GET /healthz` is `200` while the database answers and the server is not shutting down. Deliberately not tied to load (an unhealthy container is dropped from Traefik's routing, which would turn a spike into an outage). | `server/index.js` |
| Backups | A consistent copy of the database every 24 h into `data/backups/`, 14 kept. Payment screenshots (`data/proofs/`) and uploaded payment QR codes (`uploads/_site/pay/`) are files on the volumes, not in these copies: back the volumes up too. | `lib/backup.js` |

Measured on the development laptop (single Node process; numbers in the final report of the performance pass):
a guest's invitation JSON went from about 280 to about 3,400 requests/s, RSVPs from 160 to 2,000/s, studio
autosaves from 54 to 400/s, and a flood of fake couple-link attempts no longer slows guests down.

## Coolify settings (app "nimtto")

### Environment variables

Existing, unchanged: `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` (secret), `PUBLIC_ORIGIN=https://nimtto.com,https://www.nimtto.com`,
`TRUST_PROXY=2`, `NODE_ENV=production`, and `LINK_SECRET` if you set one.

New, all optional (the defaults are right for nimtto.com; add only what you want to change):

| Name | Default | Meaning |
|---|---|---|
| `CLOUDFLARE_ONLY` | off | `1` = refuse requests that did not come through Cloudflare (second lock behind the VPS firewall). **Recommended: `1`.** |
| `STORE` | `sqlite` | `json` = the old JSON files (rollback only; see "Going back to JSON files") |
| `BACKUP_HOURS` | `24` | hours between automatic database backups; `0` = off |
| `BACKUP_KEEP` | `14` | backups kept in `data/backups/` |
| `DB_SYNC` | `normal` | `full` = every write waits for the disk (slower; only matters if the host loses power) |
| `CLOUDFLARE` | on | `0` = ignore `CF-Connecting-IP` (only if the site is ever moved off Cloudflare) |
| `RATE_PER_IP_PER_MIN` / `RATE_API_PER_IP_PER_MIN` | `3000` / `1200` | per-IP budget, all requests / `/api` |
| `MAX_INFLIGHT` | `512` | requests in flight before `503` |
| `SHED_LAG_MS` | `400` | event-loop delay that turns on shedding of expensive routes |
| `ARGON_CONCURRENCY` / `IMAGE_CONCURRENCY` | `2` / `2` | password checks / photos processed at once |
| `SLOW_REQUEST_MS` | `1500` | requests slower than this are logged |

`UV_THREADPOOL_SIZE=16` is set in the Dockerfile; do not override it.

### Resources, health and restarts

- **Resource Limits** (app → Resource Limits): Memory limit `1g`, memory reservation `512m`. Leave CPUs unlimited
  (photo encoding uses every core briefly). The Node heap is capped at 512 MB in the Dockerfile, so the process
  restarts cleanly instead of being killed by the kernel.
- **Health check**: leave Coolify's own health check **off** (the image has no curl). The image's Docker
  `HEALTHCHECK` (`/healthz` every 30 s, 3 failures) runs anyway.
- **Restart policy**: Coolify's default `unless-stopped`. Nothing to change.
- **Replicas / scaling**: keep **one** container. The database is one file on one volume, and the rate limits and
  queues live in that one process. One process handles far more than the expected load (see above); Cloudflare
  serves most of the bytes.
- **Storage**: the two volumes stay as they are (`/app/server/data`, `/app/server/uploads`).

### First deploy with the SQLite store

1. Deploy at a quiet moment (not while a wedding link is being sent out).
2. In the logs, look for
   `[store] imported the JSON files into SQLite: N invitations, N replies, N orders, N sessions; copies kept in …/data/backups/pre-sqlite-<time>`.
   The counts should match what the admin overview showed before. Everyone stays signed in.
3. The JSON files stay where they were, untouched, plus that copy. If the old container answered a few requests
   after the import (the deploy overlap), the new one adds those replies and orders 2 and 10 minutes after start
   (`[store] added …`). If it logs `invitation file(s) changed after the import: <slug>`, open that invitation in the
   studio and check the last edit; re-save it if something is missing.
4. After a week of normal running you can delete `data/invitations/`, `data/rsvps/`, `orders.json`, `site.json` and
   `sessions.json` from the data volume (the copy in `data/backups/pre-sqlite-*` stays). Not required.

## Cloudflare (dashboard → nimtto.com)

### 1 · SSL/TLS
- SSL/TLS → Overview: **Full (strict)** (Coolify's certificate is valid). Edge Certificates: **Always Use HTTPS** on,
  **Minimum TLS 1.2**, **Automatic HTTPS Rewrites** on. HSTS is already sent by the app.

### 2 · Caching
Caching → Configuration: **Browser Cache TTL: Respect Existing Headers**. Caching → Tiered Cache: **Smart Tiered
Caching** on.

Caching → Cache Rules → Create rule:

**Rule 1 "Static files"**
- When incoming requests match: *URI Path* **starts with** `/assets/` **OR** starts with `/themes/` **OR** `/photos/`
  **OR** `/audio/` **OR** `/art/` **OR** `/site/fonts/` **OR** `/uploads/`
  (expression: `starts_with(http.request.uri.path, "/assets/") or starts_with(http.request.uri.path, "/themes/") or starts_with(http.request.uri.path, "/photos/") or starts_with(http.request.uri.path, "/audio/") or starts_with(http.request.uri.path, "/art/") or starts_with(http.request.uri.path, "/site/fonts/") or starts_with(http.request.uri.path, "/uploads/")`)
- Then: **Eligible for cache**. Edge TTL: **Use cache-control header if present, bypass cache if not**.
  Browser TTL: **Respect origin**.

**Rule 2 "Never cache pages and API"** (place it after rule 1)
- When: *URI Path* starts with `/api/` **OR** starts with `/i/` **OR** starts with `/studio` **OR** equals `/healthz`
  **OR** *URI Query String* contains `id=` **OR** contains `showcase`
- Then: **Bypass cache**.

Couples' photos (`/uploads/`) have random names and are cached for a year. When a couple asks for their
invitation to be removed, also purge the prefix `nimtto.com/uploads/<slug>/` (Custom Purge → Prefix).

Do **not** add "Cache Everything" for HTML. Theme pages are `private, no-store` on purpose (the design gate), the
API is `no-store` / `no-cache`, and sessions live in a cookie.

After a deploy that **changes art** (anything under `/themes/`, `/photos/`, `/audio/`, `/art/`): Caching →
Configuration → **Purge Cache → Custom Purge → Prefix**: `nimtto.com/themes/` (and the others that changed), or
Purge Everything. Hashed `/assets/*` never need purging.

### 3 · Security
- Security → WAF → **Managed rules**: turn on the **Cloudflare Free Managed Ruleset** (Pro and above: Cloudflare
  Managed Ruleset and OWASP Core Ruleset, action Managed Challenge to start with).
- Security → Bots: **Bot Fight Mode** on. WhatsApp and Facebook link previews still work (Facebook's crawler is a
  verified bot; WhatsApp previews are fetched by the sender's phone). If shared links stop showing a preview, turn
  it off and use the rate-limit rule instead.
- Security → Settings: **Security Level** Medium, **Browser Integrity Check** on, **Challenge Passage** 30 minutes.

### 4 · Rate limiting rules (Security → WAF → Rate limiting rules)
The Free plan allows one rule (10-second window, 10-second block); use it for the sign-in and form endpoints.

**"Sign-in and forms"**
- When: *URI Path* is in `/api/auth/login`, `/api/client/session`, `/api/orders` **OR** *URI Path* contains `/rsvp`
  (expression: `http.request.uri.path in {"/api/auth/login" "/api/client/session" "/api/orders"} or http.request.uri.path contains "/rsvp"`)
- Counting: same IP. Rate: **20 requests per 10 seconds**. Action: **Block** for 10 seconds (on Pro: Managed
  Challenge for 1 minute).

With a paid plan add a second rule: *URI Path* starts with `/api/` → **300 requests per 10 seconds** per IP → Managed
Challenge. (A wedding's guests on one carrier IP stay well under it; the app's own limits are behind it.)

### 5 · Lock the origin to Cloudflare
- The VPS firewall (Hostinger hPanel → VPS → Firewall, or `ufw`) should allow ports 80/443 only from
  <https://www.cloudflare.com/ips/> and SSH only from your own address. Check from outside: `curl -m 5 -k https://187.126.114.230`
  must time out.
- Then set `CLOUDFLARE_ONLY=1` in Coolify (second lock: the app answers `403` to anything that did not come
  through Cloudflare; the container's own health check is let through).
- Optional, stronger: Cloudflare **Authenticated Origin Pulls** (mTLS) needs Traefik configuration in Coolify; only
  worth it if the firewall cannot be used.

## Backups and restore

**Automatic.** Every 24 h the server writes `data/backups/nimtto-YYYYMMDD-HHMMSS.db` (a consistent copy made while it
runs) and keeps the newest 14. The first one is made 10 minutes after the first start.

**Now, by hand.** Coolify → app → Terminal (or `docker exec -it <container> sh`): `node server/scripts/backup.js`.

**Off the server (do this).** Both volumes live on the same disk as the app, so copy them elsewhere. On the VPS
(as root), find the volume folders with `docker volume ls | grep nimtto` and `docker volume inspect <name> -f '{{.Mountpoint}}'`,
then add to `crontab -e`:

```
# 03:30 daily: newest database backup, and the uploads (photos change rarely: rsync only copies new files)
30 3 * * * rsync -a --delete <data-mountpoint>/backups/ /root/nimtto-backups/db/
40 3 * * * rsync -a <uploads-mountpoint>/ /root/nimtto-backups/uploads/
```
and copy `/root/nimtto-backups` off the VPS (rclone to Google Drive/Backblaze, or Hostinger's weekly VPS snapshot).
`data/link.key` (if `LINK_SECRET` is not set) is also in the data volume: keep it with the backups.

**Restore the database.**
1. Coolify → app → **Stop**.
2. In the data volume: move `nimtto.db`, `nimtto.db-wal` and `nimtto.db-shm` aside (e.g. into `backups/broken-<date>/`).
3. Copy the chosen `backups/nimtto-<time>.db` to `nimtto.db` (same folder, owned by uid 1000 `node`).
4. **Start**. The log shows `[store]` lines and `[auth] N saved session(s) loaded`. Anything written after that
   backup is lost, so pick the newest good one.

A database that fails its integrity check at start stops the server with a message naming these steps.

**Going back to JSON files** (only if SQLite misbehaves): in the container, `node server/scripts/export-json.js`
writes every invitation, reply, order, the site settings and the sessions back to the JSON files (the JSON files
found there are moved to `data/backups/json-before-export-<time>/` first); then set `STORE=json` and redeploy.
The previous image (before this change) also reads those files.

## When the site is under attack, or a link goes viral

**Signs:** pages slow or `503`s; in Coolify logs many `[guard] 429 ip=…` / `[guard] 503 …` or `[http] … ms=…` lines;
Cloudflare → Analytics shows a spike; CPU at 100 % in Coolify.

A spike of real guests (a viral link) needs nothing: Cloudflare serves the static files, the server answers the
invitation from memory, and the guard sheds only sign-in, uploads and admin lists. Do not turn on Under Attack mode
for that.

For abuse:
1. **Look** (Cloudflare → Security → Events; Analytics → Traffic): which paths, countries, ASNs, user agents.
2. **Targeted block first.** Security → WAF → Custom rules (5 on Free): e.g. *URI Path* contains `/api/client/session`
   and *Country* not in {Nepal, India, …} → Managed Challenge; or *AS Num* equals the attacker's network → Block;
   or *IP Source Address* is in the attacking addresses → Block.
3. **Tighten** the rate-limit rule (e.g. 5 requests per 10 seconds) for the duration.
4. **Under Attack mode** if it is still bad: Overview → Quick Actions → **Under Attack Mode** on. Every visitor
   gets a few-second browser check, guests included (they pass it), but link previews (`/i/<slug>` in WhatsApp)
   stop working while it is on. Better, if only some paths are hit: a custom rule with *Managed Challenge* on those
   paths, leaving `/i/` and the theme pages alone.
5. **Turn it all back** when the graphs are flat for 30 minutes: Under Attack off, the rate-limit rule back to
   normal, temporary blocks removed (or left, if the network is clearly hostile).
6. If the origin itself is hit (requests that do not go through Cloudflare): check the firewall (section 5) and
   that `CLOUDFLARE_ONLY=1` is set.

The app keeps working through all of this: per-IP limits, the in-flight cap and the expensive-route shedding are
built in, and the database never blocks guest reads.

## Logs worth knowing

| Line | Meaning |
|---|---|
| `[store] imported the JSON files …` | first start with SQLite (once) |
| `[backup] nimtto-… bytes=… ms=…` | a backup was written |
| `[guard] 429 ip=… /path` | an IP went over its per-minute budget (one line per IP per minute) |
| `[guard] 503 … inflight=… lag=…` | the server shed work (busy); fine for a moment, investigate if it lasts |
| `[http] 5xx …` / `[http] 200 … ms=2400` | an error or a slow request (path only, never query strings, cookies or bodies) |
| `[auth] failed login ip=…` | wrong admin password (passwords are never logged) |

Before saying a deploy is done, run through `~/.claude/templates/SECURITY-CHECKLIST.md`.
