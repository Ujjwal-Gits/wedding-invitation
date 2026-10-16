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
| `POST /client/session` | `{ token, password }` | `{ role: 'client', slug, csrf, perms }` · `401` generic (bad token *or* password, same message) · `429` (20 failures / 15 min per IP, 10 wrong passwords / 15 min per invitation). Already signed in as this link's couple: `{ token }` alone returns the current session (no password, no new session) |
| `GET /auth/me` | – | admin: `{ role: 'admin', email, csrf }` · client: `{ role: 'client', slug, csrf, perms }` · `401` (also when the link was revoked/replaced or the password changed) |
| `POST /clear-cache` | – (any signed-in role: admin, client, customer; CSRF) | `{ ok: true }` with the header `Clear-Site-Data: "cache"` (never `"cookies"` or `"storage"`: the session cookie and the sign-in stay) and `Cache-Control: no-store` · `401` signed out · `403` CSRF. The studio's "Clear cache" (account box, admin Settings, customer dashboard) calls it, deletes Cache Storage and any service worker, clears its own localStorage/sessionStorage keys except the sign-in flags (`nimtto-session`, `nimtto-couple`), shows "Cache cleared. Reloading…" and reloads with `?fresh=<time>` (`src/studio/cache.js`). |

`perms = { themes: 'all' | string[], canChangeTheme: boolean, canChangeColors: boolean }`.
The client token is the part after `#/c/` in the link (43 chars base64url).

### Sessions

- One HttpOnly cookie (`__Host-studio` in production with `Secure`, `studio_sid` in dev), `SameSite=Lax`, `Path=/`.
  Session id: 256-bit random; a new id on every sign-in (the browser's previous session is dropped).
- **Stay signed in until sign-out.** Sliding expiry since last activity, no absolute cap: **couple 180 days**,
  **admin 30 days**. The cookie is persistent (`Max-Age` = that period) and is re-sent whenever `seen` is
  refreshed (at most every 10 minutes per session), so the browser keeps it as long as the server does.
- **Survive restarts and deploys.** Stored by `lib/store.js`: the `sessions` table of `data/nimtto.db` (or
  `data/sessions.json` with `STORE=json`), under `DATA_ROOT`; `data/` is gitignored, never served, and the server
  refuses to start if `DATA_ROOT` sits inside `dist/` or `public/`. Only `sha256(sessionId)` →
  `{ role, slug?, fp, csrf, created, seen }` is stored, on create, delete and `seen` refresh. Expired sessions are swept on load and
  hourly; at most 5000 are kept (least recently seen evicted first).
- `fp` binds the session to its credentials: a couple's to the link token hash + password hash, the admin's to
  `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH`. A couple's session ends at once when they sign out, the admin turns the
  link off, makes a new link, changes the link password, or deletes the invitation (the sessions are deleted
  from the store and the `fp` check refuses any leftover; `/auth/me`, editor routes and the theme-page gate all
  check it). Changing the admin password in `.env` ends admin sessions.
- The CSRF token is per session and persisted with it, so it stays valid across restarts.
- Failed-password limits are unchanged.

## Customer accounts (email + password)

Customers get an account when they order on the website. Couples on older secret links (`#/c/<token>`) keep working.

| Route | Body | Response |
|---|---|---|
| `POST /auth/login` | `{ email, password }` | The one sign-in of the studio (`/studio/`). The admin's email: `{ role: 'admin', email, csrf }`. Any other: `{ role: 'customer', name, email, csrf }`. `401 { error: 'That email and password do not match.' }` for an unknown email, a wrong password **and** a turned-off account (same message, same timing) · `429` (10 failures / 15 min per IP, 20 per email) |
| `GET /auth/me` | – | customer: `{ role: 'customer', name, email, csrf }` · admin / client as before · `401` signed out. **`GET /auth/me?soft=1`** answers `200 { role: null }` instead of `401` (for the website nav: no console error). Cheap (one session + one indexed lookup, no argon2), `Cache-Control: no-store`. The cookie is `SameSite=Lax`, `Path=/`, so any same-origin page can call it (`fetch` sends it by default; `credentials: 'same-origin'`). |
| `POST /auth/logout` | – (CSRF) | `{ ok: true }` |
| `GET /account` | – (customer) | `{ customer: { name, email, phone }, orders: CustomerOrder[], invitations: CustomerInvitation[], contact: { whatsapp, phone } }` |
| `PATCH /account/orders/:ref` | `{ weddingDate?: 'YYYY-MM-DD' or '', venue? ≤ 200, bride? ≤ 80, groom? ≤ 80, message? ≤ 2000 }` (CSRF) | `{ order: CustomerOrder, filled: string[] }` · `404` not theirs. `filled`: the fields of the linked invitation's draft these details filled (see "Invitations for an account") |
| `POST /account/password` | `{ current, password (8-128) }` (CSRF) | `{ ok: true }` (their other sessions end) · `401` wrong current password |

```
CustomerOrder = { ref, at, kind, plan: { id, name, from } | null, amount: { npr, usd }, theme?, weddingDate?, venue?, bride?, groom?, message,
                  payStatus: 'awaiting_payment'|'proof_submitted'|'confirmed'|'rejected'|'refunded', reason: string|null,
                  payUrl: '/pay/<ref>' (no token: the customer's session opens it), invitation?: slug }
CustomerInvitation = { slug, bride, groom, theme, status: 'draft'|'published', weddingDate, perms,   // perms as for client links
                       plan: { id, name, from } | null, payStatus | null, payUrl | null, orderRef | null,  // the order with invitation = slug, else the newest
                       previewUrl: '/<theme>/?id=<slug>', shareUrl: '<origin>/i/<slug>' | null (null until published) }
```

- Accounts: `{ id, email, name, phone, passwordHash (argon2id), createdAt, lastLoginAt?, disabled, invitations: [{ slug, themes,
  canChangeTheme, canChangeColors, linkedAt }] }` (SQLite table `customers`; `data/customers.json` with `STORE=json`). Emails are
  trimmed, NFC and lower-cased. Hashes never leave the server.
- Session cookie as below (role `customer`, 180 days sliding). It ends at once on sign-out, a password change or reset, and when the
  admin turns the account off (sessions deleted, and a fingerprint of the password hash refuses any leftover).
- With a linked invitation the customer edits it exactly like a client link: `GET/PUT /invitations/:slug`, uploads, publish, replies,
  `/meta`, and the theme pages (gate) open for them. The limits on `PUT` are that link's `themes`, `canChangeTheme`, `canChangeColors`.
- Pay pages: `GET /orders/:ref/pay`, `/orders/:ref/qr/:method.png` and `POST /orders/:ref/proof` accept either `?t=<payToken>` or the
  signed-in customer who owns the order (no `t`, or `t` empty). Then the per-order `qr` URLs end in `?t=` (empty), so `&remark=` can still be appended.
- The order's `201` sets the session cookie but carries no CSRF token: call `GET /auth/me` for it before any other state-changing call.
- Forgot password: no email is sent. The studio shows "Contact us on WhatsApp +977 980-6393298 to reset"; the admin resets it.

Admin (CSRF):

| Route | Body | Response |
|---|---|---|
| `GET /admin/customers` | – | `{ customers: AdminCustomer[], pending: [{ email, slug, at, account: { id, name, email, createdAt } \| null }] }` newest first; `pending`: invitations waiting for the owner to confirm the link |
| `POST /admin/pending/link` | `{ email, slug }` | `{ customer, filled }` · `404` no such pending link, or no account for the email yet |
| `POST /admin/pending/dismiss` | `{ email, slug }` | `{ ok: true }` |
| `POST /admin/customers` | `{ email, name, phone?, password (8-128) }` | `201 { customer }` · `409` email taken |
| `PATCH /admin/customers/:id` | `{ name?, phone?, password? (8-128), disabled?: boolean }` | `{ customer }` (a new password or `disabled: true` ends their sessions) |
| `PUT /admin/customers/:id/invitations/:slug` | `{ themes?: 'all' or string[], canChangeTheme?, canChangeColors? }` | `{ customer, filled }` (links it, or updates the perms of the existing link; defaults `'all'`, `false`, `true`; the customer's newest order with names, date or venue fills the invitation's still-empty fields: `filled`) |
| `POST /orders/:id/invitation` | `{ slug? }` | `201 Doc & { slug, customer? }`: one click makes the order's invitation (names, design, wedding date and venue from the order, empty where it has none; the link name from the names, else the order ref) and links it to the order's customer (or a pending link for the order's email). The order gets `invitation: slug`. `409 { current }` when it already has one · `404` |
| `DELETE /admin/customers/:id/invitations/:slug` | – | `{ customer }` |

`AdminCustomer = { id, email, name, phone, createdAt, lastLoginAt, disabled, orders: number, invitations: [{ slug, themes, canChangeTheme, canChangeColors, linkedAt }] }`.
`Summary` (admin invitation list) gains `customers: [{ id, email, name }]`. `Order` gains `customerId?`.
Deleting an invitation unlinks it from every account and drops its pending links.

### Invitations for an account (the default way a couple gets in; `server/lib/handover.js`)

- The owner makes the invitation for the customer: `POST /invitations` with `customerEmail` (the New invitation dialog's
  "Customer email", autocompleted from the accounts; prefilled from an order), or `POST /orders/:id/invitation` (one click on
  the order). It is linked to that account at once and appears in their dashboard: no separate link, no second password.
  Default perms: `canChangeTheme: true`, `canChangeColors: true`, `themes`: the ready designs the plan's tier includes (`'all'`
  for Shahi, custom, or no known plan); the plan is the order's, else the customer's newest order's.
- **No account for that email yet:** a pending link `{ email, slug, themes, canChangeTheme, canChangeColors, at }` is kept (the
  store's `pending-links` document). It is **never claimed automatically**: emails are not verified, so registering an email
  first proves nothing. Once an account with that email exists, `GET /admin/customers` returns it on the pending item
  (`account: { id, name, email, createdAt }`) and the owner sees "<name> (<email>) signed up: link the invitation '<names>'?"
  on Overview › Needs you and in Customer accounts, with **Link now** (`POST /admin/pending/link { email, slug }` → `{ customer,
  filled }`, 404 while there is no account) and **Dismiss** (`POST /admin/pending/dismiss { email, slug }` → `{ ok: true }`).
- An email that already has an account when the owner makes the invitation is linked at once (the owner chose that account;
  the dialog autocompletes the account list). One click from an order links to the account the order was made from (the
  customer was signed in to it when ordering), never to an email alone.
- **Wedding details flow in:** `PATCH /account/orders/:ref` and `PUT /admin/customers/:id/invitations/:slug` fill the
  invitation's draft fields that are still empty or still the demo's: the first names, the wedding date (only while it is the
  starter's placeholder, `doc.placeholder.weddingDate`, or empty; the ceremonies move by the same number of days), the venue of
  the wedding-day ceremonies; and, once both names are known, the empty wording, hosts, hashtag and share title. Never a field
  the couple changed. The order's own invitation (`order.invitation`) is the target, else the account's only invitation.
- The secret client link with its password (`POST /invitations/:slug/client-link`) stays as an optional extra for couples
  without an account; the studio labels it "Share a separate link (optional)".

## Design tiers

Every theme has `tier: 'saral' | 'shubha' | 'shahi'`: the **minimum plan that includes it** (Saral ⊂ Shubha ⊂ Shahi; Custom includes all).
Defaults: **shahi** mahal, rajdwar, laali, mehendi, hariyo, shree, pardaa, agni, janti, swayambar, sindoor, rangoli; **shubha** bagaicha,
durbar, mandap, ghar, dhoka, himal, mangal, nimantrana; **saral** kham, mala, gurans, sayapatri, jhyal, chitra, dhaka; any other theme: shubha.
The admin overrides them with `Site.themeTiers: { [slug]: tier }` (`PUT /site`; unknown slugs and tiers dropped/refused).

- `GET /themes` and `GET /meta` themes gain `tier` (after overrides).
- `GET /site` plans gain `includes: 'saral'|'shubha'|'shahi'` (the highest tier the plan covers: `saral`→saral, `shubha`→shubha,
  `shahi` and `custom`→shahi; other plan ids by price against those three; no price → shahi).
  A design fits a plan when `rank(plan.includes) >= rank(theme.tier)` with saral 1, shubha 2, shahi 3.
- `POST /orders` with a `theme` checks it: a plan below the design's tier → `400 { ok: false, error: 'The <Name> design needs the
  <Tier> plan or above.', fields: ['plan'], code: 'tier', needs: '<tier>' }`. Amounts always come from the server's plan prices.

## Caching, limits and busy answers (every route)

- `GET /site`, `GET /themes` and the guests' `GET /invitations/:slug/public` send an `ETag` with `Cache-Control: no-cache`
  (revalidate every time) and answer `304` to a matching `If-None-Match`; bodies are brotli/gzip when asked. They are
  built once per stored revision and kept in memory, so they are never stale. Everything else under `/api` is
  `no-store`. An editor's draft preview of `/public` is `no-store` and `Vary: Cookie`.
- `429` + `Retry-After` (seconds): more than 3000 requests a minute from one IP, or 1200 to `/api` (production;
  `RATE_PER_IP_PER_MIN`, `RATE_API_PER_IP_PER_MIN`), besides the per-route limits below.
- `503` + `Retry-After`: the server is busy. Too many requests in flight (`MAX_INFLIGHT`, 512), the password-check or
  photo queue is full, or the event loop has been behind for 2 s, in which case sign-in, client sessions, uploads,
  the admin list, stats and CSV export are refused for the moment (guest routes keep working). Try again after
  `Retry-After`.
- The client IP for every limit is `CF-Connecting-IP` when the request came through a Cloudflare address, else
  Express's `req.ip` (`TRUST_PROXY`). `CLOUDFLARE_ONLY=1`: requests that bypassed Cloudflare get `403`.
- `GET /healthz` (not under /api): `200 ok` while the database answers and the server is not shutting down, else `503`.

## Order → pay → proof (public; the primary payment flow): the website's contract

The website never sends or decides a price: every amount comes from the server's `Site.plans`.

### `GET /site` (public projection)

```
{
  plans: [{ id: 'saral'|'shubha'|'shahi'|'custom'|…, name, price: number|null (NPR), priceUsd: number|null,
            from: boolean (true = show "from", e.g. Custom), features: string[], highlight: boolean, note: string }],
  paymentMethods: [{ id, label, kind: 'khalti'|'esewa'|'bank'|'paypal'|'other', currency: 'NPR'|'USD',
                     accountName, accountHint?, qr: '<static QR image URL>', note? }],   // enabled only, in admin order
  contact: { phone, whatsapp, email, address }, hero: { title, subtitle }, hiddenThemes, featuredThemes
}
```
Admin-only fields (remark template, stored QR payloads, disabled methods) are never in this answer.
`paymentMethods[i].qr` is the plain static code (good for a "how to pay" section). For a real order use the
per-order `qr` from `GET /orders/:ref/pay`, which has the amount and remark filled in where the wallet supports it.

### `POST /orders`

Body (minimal order): `{ kind: 'order'|'custom', plan, name, phone, email, password, theme?, website: '' }`, plus optional
`weddingDate?: 'YYYY-MM-DD', venue? ≤ 200, bride?, groom?, message?` (the customer can fill those in later from their dashboard).
(`plan` is required for `kind: 'order'`; a `custom` request without a plan gets `plan: 'custom'`. `bride`/`groom` ≤ 80.)

**Account on order.** For `kind: 'order'` from a browser not signed in as a customer, `email` and `password` (8-128) are required:
the order creates the account (`name`, `phone` from the form) and signs the browser in (customer session cookie on the `201`).
Already signed in as a customer: the order goes to that account; `email`/`password` are not needed. When the email already has an
account: the right password signs in and adds the order to it; a wrong one → `409 { ok: false, code: 'account_exists',
error: 'This email already has an account. Sign in, or enter that account's password.', fields: ['password'] }` (counted against
the sign-in limits; nothing else is revealed). A turned-off account with the right password → `403`. For `kind: 'custom'` the
account fields are optional (sent → the same rules). The `201` also has `account: { email, name, created: boolean }` when an
account was used.

`201 { ok: true, ref: 'NM-24817', payToken: '<43-char base64url secret>', amount: { npr: 4999, usd: 99 }, plan: { id, name, from },
       payUrl: '/pay/NM-24817?t=<payToken>', whatsapp: { text, link: 'https://wa.me/977…?text=…' | null }, account?: { email, name, created } }`
(+ `Set-Cookie`: the customer session)
· `400 { ok: false, error, fields }` · `403` cross-site · `429`. Store `ref` + `payToken` (e.g. in the URL / localStorage)
so the customer can come back; the token is shown once and only its hash is stored. A honeypot hit gets the same shape
with a ref/token that leads nowhere. `amount.npr`/`amount.usd` can be `null` when the plan has no price.

### `GET /orders/:ref/pay?t=<payToken>`

`ref` = `^NM-\d{5,6}$`. Wrong/missing token or unknown ref: `404 { error }` (same answer for both).

```
{ ref, status: 'awaiting_payment'|'proof_submitted'|'confirmed'|'rejected'|'refunded',
  reason: string|null,          // the rejection reason, shown to the customer
  plan: { id, name, from }, amount: { npr, usd }, name, weddingDate?, createdAt,
  proofs: [{ n, at, method, amountPaid }],   // no image URLs: proofs are private
  maxProofs: 3, canUpload: boolean,
  remark: 'Nimtto NM-24817',    // the default remark (admin template, filled in)
  paymentMethods: [{ id, label, kind, currency, accountName, accountHint?, note?,
                     amount: 4999 (in this method's currency) | null,
                     remark, remarkMax: 25,
                     dynamic: boolean,          // true: amount + remark are inside the QR; false: the customer types them
                     qr: '/api/orders/NM-24817/qr/<methodId>.png?t=<payToken>',  // per-order PNG (dynamic or the static code)
                     staticQr: '<static image URL>' }],
  paypalCheckout: { enabled: boolean },  // PayPal Checkout buttons (POST /pay/paypal/order with { ref, t, website })
  whatsapp: { text, link|null } }
```

### `GET /orders/:ref/qr/:methodId.png?t=<payToken>&remark=<text>`

A PNG QR for this order and method. `remark` (optional) overrides the default remark: printable ASCII only,
at most `remarkMax` characters; anything else → `400`. `Cache-Control: private, no-store`. Methods that are not
`dynamic` return the static code unchanged (show "Enter amount Rs 4,999 and remark NM-24817" next to it).
To let the customer edit the remark, change `remark` in the URL and reload the image.

### `POST /orders/:ref/proof?t=<payToken>` (multipart/form-data)

Fields: `file` (jpg/png/webp/heic, ≤ 8 MB; checked by content, re-encoded, metadata stripped), `method` (a payment
method id), `amountPaid` (text as typed, ≤ 32), `note?` (≤ 300). Same-site Origin required.
`201 { ok: true, status: 'proof_submitted', proofs: n }` · `400` · `404` token/ref · `409` already confirmed/refunded,
or 3 proofs already · `413` too big · `415` not an image · `429` (10 / hour / IP, 20 / hour / order).

### The pay page `/pay/<ref>?t=<token>`

The website's Vite page `pay/index.html` (built to `dist/pay/index.html`). In production the server answers
`/pay/NM-12345` (and with a trailing slash) with that file, `Cache-Control: private, no-store` and
`Referrer-Policy: no-referrer` (the token is in the URL); `/pay/?ref=NM-12345&t=…` is served by the static files
as usual. The page reads `ref` from the path (or `?ref=`) and `t` from the query, then calls the routes above.
When PayPal Checkout is on, the PayPal SDK's CSP sources are added on `/pay/` pages too.

### Payment statuses

`awaiting_payment` → `proof_submitted` → `confirmed` | `rejected` (with `reason`) ; `refunded`. A rejected order can upload
again (up to 3 proofs in total). PayPal Checkout (when configured) sets `confirmed` itself. This is separate from the
admin's workflow `status` (`new`/`contacted`/`done`/`archived`).

## Public

| Route | Body | Response |
|---|---|---|
| `GET /site` | – | `Site` (defaults when nothing saved yet) |
| `GET /themes` | – | `[{ slug, name, concept, thumb }]`, ready themes only, minus `hiddenThemes` (no page URLs: see "Theme pages") |
| `GET /music` | – | `{ moods: [{ id, en, ne }], tracks: [{ id, title, titleNe, artist, mood, duration, src, credit, builtin }] }`: the music library's songs that are on, in the planner's order (`Cache-Control: no-cache`). See "Music library" |
| `POST /orders` | see "Order → pay → proof" above | `201 { ok, ref, payToken, amount, plan, payUrl, whatsapp }` · `400 { ok: false, error, fields: string[] }` · `403` cross-site · `429` |
| `GET /orders/:ref/pay?t=` · `GET /orders/:ref/qr/:method.png?t=` · `POST /orders/:ref/proof?t=` | see above | see above |
| `GET /pay/config` | – | `{ paypal: { enabled: false } }` or `{ paypal: { enabled: true, env: 'sandbox'\|'live', clientId, currency: 'USD' } }` |
| `POST /pay/paypal/order` | `{ ref, t, website }` (`ref` NM-…, `t` the pay token; orders from before references: their 12-char id, no `t`) | `201 { ok, id, amount, currency }` (the order's `amount.usd`, else the plan's `priceUsd`) · `400` · `403` · `404` · `409` already paid · `429` · `502` PayPal · `503` off |
| `POST /pay/paypal/capture` | `{ ref, t, orderID, website }` | `{ ok, ref, status: 'paid'\|'pending', amount, currency, captureId, repeat }` · `402 { code: 'retry' }` declined · `409` amount/currency mismatch · `400`/`403`/`429`/`502`/`503` |
| `POST /pay/paypal/webhook` | PayPal event (raw JSON, signature headers) | `200` · `400` bad signature · `404` off · `500` retry later |
| `GET /invitations/:slug/public` | – | published data (a signed-in editor of that invitation gets the draft); includes `design`, and `themeContent` only for the theme and its borrowed gate / first screen |
| `POST /invitations/:slug/rsvp` | `{ name, phone?, attending: 'yes'\|'no', guests, events?, meal?, message?, website }` | `{ ok: true }` |

Payments: see `docs/PAYMENTS.md`. `GET /pay/status` (admin) → `{ paypal: { enabled, env, clientId (masked), secretSet, webhookIdSet, webhookUrl, dashboard, problems } }`; never a secret. `Site.plans[].priceUsd`: `null` or 1–10000 with at most two decimals (`usdPrice`, the old name, is still accepted on PUT).

`POST /orders` rules: `name` 2–80, `phone` `^[0-9+()\-\s]{6,20}$`, `email` ≤ 254 (required with an account), `password` 8–128, `venue` ≤ 200, `bride`/`groom` ≤ 80, `weddingDate`
`YYYY-MM-DD`, `theme` an existing theme slug, `plan` an existing `Site.plans[].id` (required for `kind: 'order'`),
`message` ≤ 2000 (required when `kind: 'custom'`). Any `amount`/`price` in the body is ignored.
`website` is the honeypot: keep it as a hidden empty input; any value → the same `201` shape and nothing is stored.
A `custom` request sent with a client session gets `invitation: <slug>` attached automatically. Limits: 5 stored
requests / hour / IP (100 in dev) and 200 / hour overall; 60 attempts / hour / IP (requests that fail validation count
only here, so a typo does not use up the 5). The honeypot answers `201 { ok: true }` like a real request.

```
Site (stored; GET /admin/site and PUT /site) = {
  v: 2,
  plans: [{ id: /^[a-z0-9-]{1,32}$/, name ≤ 60, price: integer 0..10,000,000 | null ("Ask for price"),
            priceUsd: 1..10000 (2 decimals) | null, from: boolean, currency: 'NPR', note ≤ 160,
            features: string[≤ 20] (each ≤ 120), highlight: boolean }]  (≤ 8, unique ids),
  paymentMethods: [{ id: /^[a-z0-9-]{1,32}$/, label ≤ 40, kind: 'khalti'|'esewa'|'bank'|'paypal'|'other',
            currency: 'NPR'|'USD', accountName ≤ 80, accountHint ≤ 60 (optional number, shown only when set),
            qr: '/site/pay/<name>.png' | '/uploads/_site/pay/<id>.png' | '', note ≤ 160, enabled: boolean,
            order: integer (normalised to the list order), autoAmount: boolean, paypalMe: '' | PayPal.me name }]  (≤ 12),
  payRemark: printable ASCII ≤ 40 containing {ref} ({plan}, {name} optional; filled in and cut to 25),
  contact: { phone, whatsapp (stored as E.164, e.g. '+9779806393298'), email, address ≤ 300 },
  hero: { title ≤ 120, subtitle ≤ 300 },
  hiddenThemes: string[], featuredThemes: string[]   (unknown slugs are dropped)
}
```
Defaults (nothing saved yet): the plans Saral 2999/49, Shubha 4999/99 (highlight), Shahi 6999/149, Custom 11111/199
(`from: true`); the methods Khalti, eSewa, Nabil Bank (NPR, Roshan Shrestha) and PayPal (USD, Bijaya Gurung) with the
QR images in `public/site/pay/`; contact `+977 980-6393298`, WhatsApp `+9779806393298`, `nimttoz@gmail.com`.
A stored document from before v2 is migrated on read: the four plans, keeping the feature lines of a plan with
the same id. `GET /site` returns only the public projection (see the contract above).

## Admin only

| Route | Body | Response |
|---|---|---|
| `GET /admin/stats` | – | `{ invitations, published, drafts, rsvps, attending, newOrders }` (`attending` = guests who said yes, `rsvps` = replies) |
| `PUT /site` | full `Site` | the stored `Site` · `400 { error, errors }` |
| `GET /orders` | – | `{ orders: Order[] }` newest first |
| `PATCH /orders/:id` | `{ status?: 'new'\|'contacted'\|'done'\|'archived', notes?: string ≤ 2000, amount?: { npr, usd }, payment?: { status, reason?, note?, manual?: true, method? } }` | `{ order }` · `400` (a rejection needs `reason` ≤ 300, shown to the customer) · `409` (`refunded` only after `confirmed`) |
| `DELETE /orders/:id` | – | `{ ok: true }` (its payment screenshots are deleted too) |
| `GET /admin/orders/:id/proof/:n` | `?size=sm` for the thumbnail | `image/jpeg`, `Cache-Control: private, no-store` · `401` not signed in · `404` |
| `GET /admin/site` | – | the full `Site`; each payment method also has `qrInfo: { format: 'emv'\|'esewa'\|'khalti'\|'paypalme'\|'paypal'\|…, label, decoded, canAuto, autoDefault, dynamic }` |
| `POST /admin/pay/qr` | multipart `file` (PNG/JPEG/WebP ≤ 8 MB) | `201 { qr, decoded, cropped, qrInfo }` (cropped to the code, payload stored for per-order codes) · `413` · `415` |
| `GET /admin/music` | – | `{ moods, tracks }`: every song, each also with `enabled` (and `addedAt` for uploads) |
| `POST /admin/music` | multipart: `file` (MP3 ≤ 15 MB), `title` (1–80; default: the file name), `titleNe?`, `artist?` (≤ 80), `mood` (a mood id; default `instrumental`), `credit?` (≤ 300) | `201 { track }` (appended last, on) · `400` bad field or longer than 20 min · `413` · `415` not an MP3 · `429` over 60 uploads / hour |
| `PATCH /admin/music/:id` | any of `{ title, titleNe, artist, mood, credit, enabled }` | `{ track }` · `400` · `404` |
| `PATCH /admin/music` | `{ order: [id, …] }` (unknown ids ignored; songs left out keep their order after these) | `{ tracks }` |
| `DELETE /admin/music/:id` | – | `{ ok: true, inUse }` · `400` a built-in song (turn it off instead) · `404` |
| `GET /invitations` | – | `{ invitations: Summary[] }` |
| `POST /invitations` | `{ slug, bride, groom, theme?, religion?, colors?, customerEmail?, weddingDate?: 'YYYY-MM-DD', venue?, order? }` (`religion`: see below; `colors`: `{ '--token': '#hex' }` for the chosen theme, unknown tokens dropped; a theme that does not suit the religion is replaced by the first ready one that does; the ceremonies and wording follow the religion; `customerEmail`: link to that account or keep a pending link, see "Invitations for an account"; `order`: the order id it is made for). `sample` is ignored: a new invitation never starts with the demo couple's details (see "No demo on real invitations") | `201 Doc & { customer?: { email, name?, linked, pending } }` · `400` bad email |
| `POST /invitations/:slug/seen` | – | `{ ok: true }` |
| `POST /invitations/:slug/unpublish` | – | `Doc` |
| `DELETE /invitations/:slug` | `{ confirm: slug }` | `{ ok: true }` (moved to trash) |
| `POST /invitations/:slug/client-link` | `{ password (6–128), themes?: 'all'\|string[], canChangeTheme?: bool, canChangeColors?: bool }` | `201 { url, token, createdAt, clientLink }` — any older link and its sessions stop |
| `PATCH /invitations/:slug/access` | `{ themes?, canChangeTheme?, canChangeColors?, password? }` | `{ clientLink }` · `404` no link · a new password keeps the same URL and ends the couple's sessions (they enter the new password once) |
| `DELETE /invitations/:slug/client-link` | – | `{ ok: true }` (revokes; sessions end) |

`Order = { id, ref, at, kind, name, phone, email?, bride?, groom?, weddingDate?, theme?, plan?, planName?, planFrom?,
amount: { npr, usd }, message, invitation?, status, notes?, payStatus, pay: { status, reason, proofs: [{ n, at, method,
methodLabel, currency, amountPaid, note?, w, h, url, thumb }], history: [{ at, status, by: 'customer'|'admin'|'paypal', note? }],
via?: 'proof'|'manual'|'paypal', manual?: { method, note }, confirmedAt?, refundedAt? }, payment? (PayPal Checkout) }`.
The pay token's hash is never sent. `payStatus` is `pay.status` (or PayPal's paid/refunded for older orders).
`PATCH … payment.status`: `confirmed` (with `manual: true` and `method` for "marked paid by hand"), `rejected` (with
`reason`), `refunded`, or back to `awaiting_payment`/`proof_submitted` (undo).
Client-link defaults: `themes: 'all'`, `canChangeTheme: false`, `canChangeColors: true`.
`url` = `<PUBLIC_ORIGIN>/studio/#/c/<token>`.
`clientLink` (in `Summary`, `Doc` for admins, and the link routes) = `{ createdAt, hasPassword, url, themes, canChangeTheme, canChangeColors }` or `null`.
`url` is the couple's link, so the admin can see and copy it any time (admin payloads only; never in client,
session or public responses). It is absolute when `PUBLIC_ORIGIN` is set, else `/studio/#/c/<token>` (resolve
against the studio's origin). `url: null` = a link made before links were stored: make a new link to see it.
The token is stored in the invitation as `access.tokenEnc` (AES-256-GCM, bound to the slug; key from the
optional env `LINK_SECRET` (32+ chars), else a random key created once in `data/link.key`). If the key is
lost, links show as `url: null` and keep working. `tokenHash` stays the sign-in lookup. Passwords are only
ever stored as argon2id hashes and never returned. The link alone grants nothing without the password.
`hasPassword: false` = a link made before passwords existed: it still opens with the token alone and full rights,
until the admin sets a password with `PATCH /access`.

### Music library

One site-wide list of songs couples choose from (studio: Owner → Music library; the couple's Music module groups the
songs that are on by mood). Built-in songs ship in `public/audio/` and are listed, with author, licence and source,
in `src/core/music-library.js`; the planner can rename them, change their mood or credit, turn them off and reorder
them, never delete their files. Uploads are stored as `uploads/_site/music/<24-char random id>.mp3` and served at that
path (immutable cache). Moods: `shehnai` (Shehnai & traditional), `instrumental` (Flute, sitar & santoor), `romantic`,
`piano` (Soft piano & strings), `festive`.

An upload is accepted only when its bytes are MPEG audio (an ID3 tag or frame sync, then frames that follow one
another); the duration is read on the server by walking the frames (CBR and VBR). The file name and the browser's
type are ignored. Text fields are stored as plain text (control characters removed) and rendered as text everywhere,
including the public credits page, which lists the built-in songs plus the uploads that are on and have a credit.
The library is stored as the `music` document (SQLite `kv` table; `data/music.json` on the JSON store).

An invitation keeps the songs it plays in `music.tracks` (up to 8): `{ title, mood, src, credit }`, where `src` is a
built-in `/audio/…mp3`, a library upload `/uploads/_site/music/<id>.mp3`, or the couple's own `/uploads/<slug>/<id>.mp3`.
Turning a song off or deleting it does not take it out of invitations that already play it (a deleted upload's file
is kept while any invitation uses it; `inUse` says how many).

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
- `religion: 'muslim' | 'christian' | 'other'` — omitted for `'hindu'` (the default; older data compares equal); anything
  else → `400`. A couple (client session) may change it only with `canChangeTheme`; whenever the religion, `theme` or
  `design` changes, every one of those themes must list the religion in its manifest `religions`, else `403`. The admin may
  do anything. `Summary` gains `religion`.

### Religion in the catalog
`GET /meta` themes and the public `GET /themes` gain `religions: ('hindu'|'muslim'|'christian'|'other')[]` (from each
theme's `slots.js`; absent = `['hindu']`); `/meta` also gains `faithInk` (the emblem's colour token). Pickers filter by the
invitation's `religion` (`src/core/faith.js` `suits()`).

## Theme pages (not under /api)

The designs are the product, so a theme's HTML (`/<theme>/`, `/<theme>/index.html`, any case or encoding) is gated in
production (`server/lib/gate.js`, before `express.static`). It is served only when:
- `?id=<slug>` names a **published** invitation whose theme is this one (another theme → `302` to `/<its theme>/?<same query>`);
- the request carries an admin session; or
- it carries a client session whose link is still active (the client studio's preview and Themes module).

Otherwise: no `id` → `302 /#designs`; unknown, malformed or unpublished `id` → `404` with a small "This invitation
isn't available" page (the same for both, so a draft's existence never leaks).
With `?id=<slug>` the gate serves the page itself with that invitation's own `<title>`, `og:title`, `og:description`,
`description` and `og:image` (lib/share.js `shareInfo`: published data for guests, the draft for its editors). The build
carries only neutral words ("Wedding invitation · Nimtto"), never the demo couple's (vite.config.js `shareMeta`). Gated responses carry
`Cache-Control: private, no-store` and `Vary: Cookie`. Static files (`/assets/*`, `/themes/*`, `/site/*`, uploads)
stay public because invitations need them; `Cross-Origin-Resource-Policy: same-origin` keeps other sites from
loading the theme bundles. The public website shows only thumbnails and phone screenshots.

**Dev:** Vite serves the pages, so the gate does not run there (`localhost:5195/<theme>/` opens freely). Test it
against a production instance (`npm run build`, then `node server/index.js --production`).

### Public showcase (watermarked preview of a design)

`GET /<theme>/?showcase=1[&lang=en|ne]` → `200` HTML for any **ready** theme in the catalog, no session needed
(`server/lib/showcase.js`, mounted before the gate). The server marks the page itself: it rewrites the built
`dist/<theme>/index.html` to add `data-showcase="1"` on `<html>`, `<link rel="stylesheet" href="/showcase.css">`,
`robots: noindex` and the title `<Design> · Preview · Nimtto` (no inline script; the CSP is unchanged). Headers:
`Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow`.
- Any other query (`id`, `preview`, `to`, `e`, `gate`, ...) or `/<theme>/index.html?showcase…` → `302` to the canonical
  `/<theme>/?showcase=1[&lang=…]`, so a showcase only ever shows the bundled demo couple and never loads an invitation.
  The page (`src/core/showcase.js`, imported first by `src/core/data.js`) also drops every key but `showcase`/`lang`
  before anything reads the URL.
- `GET /preview/<theme>` → `302 /<theme>/?showcase=1` (unknown or not-ready theme → `302 /#designs`).
- Not a ready theme, or any other path shape → falls through to the gate above, unchanged: `/<theme>/` without the
  showcase key is still `302 /#designs`.
- In the page: a tiled `nimtto.com · PREVIEW · निम्तो` watermark above everything (re-inserted if removed or hidden),
  a badge with "Order this design" (`/?design=<theme>#order` preselects it on the website), selection, copy, context
  menu and dragging off, RSVP / calendar / share / any non-GET `fetch` answered with a toast, a blank Nimtto card on
  focus loss, PrintScreen, Ctrl/Cmd+P or S, and print disabled by CSS. Photos use their `-sm` size. These are
  deterrents only: screenshots and screen recording cannot be prevented on the web.
- Dev: Vite serves `/<theme>/?showcase=1` with the same page behaviour (no server rewrite, no `/preview/` short link).

## Share page (not under /api)

`GET /i/:slug?to=Name&e=wedding,reception` → HTML (published only, else `404`): `<title>`, `og:title`,
`og:description`, `og:image` (absolute; `share.image`, else the first couple portrait, else a neutral `/art/og.jpg`; never the theme thumb, which shows the demo couple),
`og:url`, `twitter:card`, `robots: noindex`, then `<meta http-equiv="refresh">` and a link to
`/<theme>/?id=<slug>` keeping `to` (≤ 60 chars), valid `e` ids and `v` (the guest's version of the religious symbols:
`neutral | hindu | muslim | christian`; anything else is dropped). The default title uses the religion's name for the
wedding (Shubha Bibaha / Nikah / Holy Matrimony); with no names at all it is "Wedding invitation · Nimtto". The demo's share
title and description and its people photos are never used (lib/demo.js).

## No demo on real invitations

The demo couple of `src/config.js` (Binisha & Ujjwal) shows only on a theme page with no `id` (dev, the owner's design
browsing), in the watermarked showcase and on the design thumbnails.
- New invitations start with the names entered and nothing else of the demo (no venues, story, contacts, stays, hashtag,
  people photos; a placeholder wedding date about six months ahead, recorded in `doc.placeholder`). Generic starter words
  stay: the community's ceremonies and wording, salutation, request, sign-off, closing, shloka, the seven vows, a song.
- The page (`src/core/data.js`): `?id=` that does not load (unknown, unpublished, no access, offline) shows a small "not
  available / could not load" card with Try again instead of the design; missing keys in the studio's model come from
  `blankModel()`, never the demo; while a first name is empty the lone `&` between the names is hidden; the tab title is
  the invitation's own (or "Wedding invitation · Nimtto").
- Stored data: a one-time migration (`server/lib/migrate-demo.js`, run on start, marker `migrations["demo-scrub-2026-10-16"]`)
  clears fields that still hold the demo's exact value in drafts and published snapshots (lib/demo.js `scrubDemo`: families,
  homes, full names, hosts, city, B.S. date text, invitation body, RSVP deadline, travel note, venues and map queries, the
  demo's story lines, stays and contacts, share title and description, the hashtag, the demo couple's photos in portraits,
  gallery and ceremonies; first names only when both are still the demo pair). Backup first (SQLite: `data/backups/nimtto-*.db`;
  JSON: `data/backups/demo-scrub-<time>/`), version bumped per changed invitation. `node scripts/scrub-demo.js --dry-run`
  lists what it would change; `--force` runs it again.

## RSVP
`POST /invitations/:slug/rsvp`: every ceremony is its own answer. With `attending: 'yes'`, a sent `events` list must name at
least one valid ceremony (an empty or all-unknown list → `400 { fields: ['events'] }`; an older form that sends no list
still counts for all). Totals in `GET /invitations/:slug/rsvps` are per ceremony (`totals.events[]`).
Limits: 30 replies per IP per invitation per 10 minutes (guests on one mobile carrier can share an IP), 3000 per
invitation per hour, 5000 per invitation in total (`507`).
