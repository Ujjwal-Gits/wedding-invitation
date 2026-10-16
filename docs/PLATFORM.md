# Nimtto platform spec (v2) — read fully before writing code

Four agents build this at the same time. This file is the contract between them. If you need to change the
contract, add a short note under "Change requests" at the bottom; don't silently diverge.

## Who uses what

| Surface | URL | Who | Purpose |
|---|---|---|---|
| Public website | `/` (root `index.html`) | everyone | One-page marketing site: hero, how it works, theme gallery (thumbnails and phone stills only, never the live pages), pricing (from the API, editable by the admin), custom-order request form, contact, footer. |
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
`[{ id, at, kind: 'order' | 'custom', name, phone, email?, weddingDate?, theme?, plan?, message, invitation?, status: 'new' | 'contacted' | 'done' | 'archived', notes? , payment? }]`
`payment` (lib/payments, PayPal): `{ provider: 'paypal', env, status: 'created'|'pending'|'paid'|'partially_refunded'|'refunded'|'denied'|'mismatch', plan, amount: '49.00', currency: 'USD', paypalOrderId, captureId?, payerEmail?, payerName?, paidAt?, refunded?, refunds?, problem?, events?, createdAt, updatedAt }`.

### `data/site.json`
`{ plans: [{ id, name, price, currency: 'NPR', usdPrice?: number | null, note?, features: string[], highlight: boolean }], contact: { phone, whatsapp, email, address }, hero: { title, subtitle }, hiddenThemes: string[], featuredThemes: string[] }`
Defaults (no file yet): three placeholder plans named "Classic", "Premium", "Custom" with `price: null`
(the site shows "Ask for price" when null) and empty contact.

## API (all JSON; non-GET needs `X-CSRF-Token` + Origin check exactly as today, except the two public POSTs which use Origin check + honeypot + rate limit)

Public:
- `GET /api/site` → site.json (public fields).
- `GET /api/themes` → `[{ slug, name, concept, thumb }]`, minus `hiddenThemes` (no demo URLs; theme pages are gated, see API.md "Theme pages").
- `POST /api/orders` `{ kind, name, phone, email?, weddingDate?, theme?, plan?, message, website (honeypot) }` → `{ ok: true }`.

Auth:
- `POST /api/client/session` `{ token, password }` → sets the session cookie (role `client`, slug, perms). Wrong password: 401, rate-limited.
- `GET /api/auth/me` → `{ role: 'admin' }` or `{ role: 'client', slug, perms: { themes, canChangeTheme, canChangeColors } }`.

Admin:
- `GET /api/admin/stats` → `{ invitations, published, drafts, rsvps, attending, newOrders }`.
- `PUT /api/site`.
- `GET /api/orders`, `PATCH /api/orders/:id` `{ status?, notes? }`, `DELETE /api/orders/:id`.
- `POST /api/invitations/:slug/client-link` `{ password (≥ 6 chars), themes, canChangeTheme, canChangeColors }` → `{ url }` (the admin can see and copy it again later: `clientLink.url`).
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

## Live preview protocol (studio ⇄ theme iframe), implemented in `src/core/data.js` + `src/core/live-preview.js` + the studio (`src/studio/preview.js`, `preview-sync.js`)

All messages are same-origin only (`targetOrigin = location.origin`, `e.origin` and `e.source` checked) and every
field is validated in `data.js` before use. `live-preview.js` is loaded only in a `preview=1` page inside an iframe.

**Loading**
- The studio loads `/<theme>/?id=<slug>&preview=1`. For every module except Opening it adds
  `&debug&open&skip&station`, which skips the opening on every theme (suite and most themes: `open`; dhoka: `skip`;
  bagaicha, durbar: `station`). A theme that ignores all three is opened by `live-preview.js` pressing its own quiet
  button (`#quiet`, `#enter-quiet`, `#open-quiet`) once the button is enabled. The Opening module loads the page
  without them, so the closed gate shows and stays closed across re-renders.
- The page posts `{ type: 'nimtto:ready' }`; the studio answers `{ type: 'nimtto:data', data, focus? }` (the full
  current model, plus where to look). Without an answer in 1.5 s the page fetches the saved draft as before.
- `{ type: 'nimtto:mounted' }` after the theme has rendered (fonts, two frames, DOM quiet), then
  `{ type: 'nimtto:settled' }` once the opening is skipped and the page sits at `focus` (scrolled instantly; the
  page stays hidden until then, so there is no jump from the top).
- In preview pages the scrollbars are hidden (`scrollbar-width: none`, `::-webkit-scrollbar`); scrolling still works.

**Focus targets** — `{ type: 'nimtto:focus', text?, section?, image?, y?, instant? }`
- `text`: words the client is editing; the smallest visible element containing them wins (a match in the hidden
  language outlines its bilingual wrapper; a match in a closed `<details>` opens it; a match inside the invitation-card
  dialog opens the card with its own button and closes it again for the next target).
- `section`: `hero | gate | couple | families | date | countdown | scratch | events | event:<index> | gallery | card |
  rsvp | closing | info | story | map | music`. Resolved from the shared markup (`#top`, `#couple`, `#families`,
  `[data-countdown]`, `[data-scratch]`, `#programme`, `#ev-<id>` / `#pg-<id>` / `#st-ev-<id>` / `#ch-ev-<i>` / the
  nth `.su-ev`, `#photos` / `#album` / `#stripview` / `[data-lb-idx]`, `[data-open-card]`, `#rsvp`, …, each with a
  fallback part). With `text` or `image` it is the place to prefer among several matches and the fallback when they are
  not found. `music` opens the music sheet from the pill.
- `image`: the photo's URL(s) or a library slug; matched against `img` src/srcset/currentSrc, `<picture>` sources,
  SVG `<image>`, inline and computed `background-image` (pseudo-elements last); the largest visible match wins.
- `y`: a scroll position to land on when nothing else is given or found (a fresh render opening where the client was).
- Order: image, then text, then section; nothing found → `{ type: 'nimtto:focused', ok: false, reason: 'missing' }`.
  While the opening is shown, something behind the gate is not pointed at: `{ ok: false, reason: 'opening' }` (the
  studio says "Press Play opening to see it").
- Scrolling goes through Lenis when the theme has it (`immediate`/`force`) and keeps every ScrollTrigger in step
  (`ScrollTrigger.update()`, scrub tweens completed; one `refresh()` per page). An element that rides a pinned,
  scrubbed or sticky journey (Agni's pheras, Janti's horizontal walk) is found by sampling that journey's scroll range.
  Inner scrollers (a photo strip, a dialog) are scrolled too. Late layout shifts are corrected until the client scrolls.
- The outline: a fixed, pointer-events-none box (gold 2 px border with a dark and a light hairline, so it reads on
  light and dark themes) that follows the element with transforms and fades out over 1.6 s. It never shifts layout.

**Live edits without reloading**
- `{ type: 'nimtto:patch', changes: [{ kind: 'text', path: [keys], old, value } | { kind: 'image', pairs: [[oldUrl, newUrl]] }] }`:
  the page replaces the old words in every text node that shows them (both languages, dialogs too; one- to three-letter
  values only as whole words; words a theme split into spans are replaced per element), remembers those nodes per
  field for the next keystroke, updates its own config, swaps photos in `src`/`srcset`/SVG `href`/backgrounds, outlines
  the patched spot nearest the middle without scrolling, and answers `{ type: 'nimtto:patched', ok, missed }`.
- `{ type: 'nimtto:colors', colors: { '--token': '#hex' | '' } }`: inline custom properties on `body` ('' removes).
- The studio keeps a copy of the model each page shows and diffs it with the current model on every edit (next frame):
  changed words → text patches, swapped photos → image patches, `themeColors` → colours. Anything else (a ceremony or
  photo added, removed or moved, dates and times, a focal point, a switch, the design) is *structural*.
- Structural changes, a missed patch, the Reload button and switching to or from the Opening module render the page
  again in a second, invisible iframe (full current model, same focus target, or the scroll position if the client
  scrolled the preview themselves). On `nimtto:settled` it fades in over the old page (140 ms, opacity) and the old
  frame is removed; edits made meanwhile are diffed and patched into it. No blank page, no gate replay, no jump.
- Frame budget (2026-10-16, the Opening-module crash): at most one page on screen and one rendering behind it. A render
  asked for while one is loading for the same URL reuses it; renders and module switches are debounced (220 ms). A page
  that goes away gets `{ type: 'nimtto:teardown' }` (or `window.__nimttoTeardown()`, same origin): it loses its WebGL
  contexts, kills ScrollTriggers and GSAP, destroys Lenis and stops sound; then the studio sets `src="about:blank"` and
  removes the frame. `{ type: 'nimtto:pause', on }` holds a page still (its requestAnimationFrame loops, CSS animations,
  GSAP, Lenis, media): sent while the preview is hidden (phone sheet closed, a module without preview) and while a
  full-screen design demo is open. Themes need no code for either (data.js wraps getContext/rAF/AudioContext in
  preview pages); a theme may also listen for the `nimtto:teardown` window event.
- Studio CSS: one-column grid containers declare `grid-template-columns: minmax(0, 1fr)`. Nested auto-sized grids made
  one layout of the Opening module take 5-20 s (and GBs), which is what crashed the tab.
- Opening module: a "Play opening" control posts `{ type: 'nimtto:play' }` (the page presses its own quiet open button,
  then returns to the last target); "Show gate again" renders the closed gate again the same way.
- Modules point the preview: focusing any field sends its words and part; entering a module sends its part (Couple &
  family → couple, Dates → events, Photos → gallery, Music → music sheet, Replies → rsvp, Home and Send → hero);
  adding, replacing, moving or refocusing a photo points at that photo.
**Click to edit (preview → editor)**
- The studio's preview bar has "Click to edit" (default) | "Try it", remembered in `localStorage` (`nimtto-preview-pick`).
  The mode goes to the page as `pick` in `nimtto:data` and as `{ type: 'nimtto:mode', pick }`.
- With pick on, the page outlines what is under the pointer (a thin gold box with a small crimson "Edit" tag; opacity
  and transform only) and, in the capture phase, stops the page's own pointer/click/submit handling (links, lightbox,
  gate buttons, RSVP). A click outlines the spot and posts `{ type: 'nimtto:pick', target }`:
  `{ image: [path], index?, section? }` for a photo (an `img`, or a library/upload background), else
  `{ text, lang: 'en'|'ne', section? }` for the smallest block of words, else `{ section }` (same vocabulary as focus).
  The page's own clicks (opening the card or music sheet, Play opening) pass through.
- The studio (`src/studio/pick.js`) maps it to a field: model words (both languages, ceremonies, families, wording,
  story, music titles) and the theme's slot words (override or the design's default) are scored (equal, contains,
  contained; the same part of the page and language preferred); photos match by file (gallery, couple photos, bride
  and groom, ceremony photos, slot pictures by their effective photo). It switches module, opens folds and `<details>`,
  scrolls the editor to the field, focuses (and selects) it and flashes a crimson ring; photos open their own options
  (the photo sheet, or the slot's picture dialog). Dates, times and the countdown open the date field; anything else
  says it comes from the design (or that the planner sets it up). While the editor follows a pick, the preview holds
  still: the field focus and the module change do not move it (no loop).
- Colours on load: `data.js` applies `config.themeColors?.[theme]` as inline custom properties on `document.body`
  (validated names `^--[a-z0-9-]+$`, hex values), so they override the theme's tokens.

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

**payments (2026-10-16):** PayPal Checkout, off until `PAYPAL_*` are set (docs/PAYMENTS.md). `POST /api/orders` now returns `ref`; `Site.plans[].usdPrice`; `order.payment`; routes under `/api/pay`; `orders.js` exports `getOrder` / `findOrder` / `mutateOrder` for lib/payments (keep them on the store when storage changes). The CSP on `/` gains PayPal's domains and COOP `same-origin-allow-popups` only when PayPal is on.

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

**server + website (2026-10-16): designs are never public live.**
- Production gates the theme pages: `/<theme>/` is served only for `?id=<published slug>` in its own theme, an admin session, or an active client session; else `302 /#designs` or a 404 "not available" page (`server/lib/gate.js`, details in API.md "Theme pages"). `/i/<slug>` and static assets are unchanged.
- `GET /api/themes` no longer returns `demo`. The website shows thumbnails/phone stills and a still-image lightbox with "Order this design"; no live links, no preview iframe.
- Dev: Vite serves the pages, so the gate does not run on 5195. A Vite dev middleware was not added: editing `vite.config.js` restarts the running dev server.

**mix (2026-10-16): separate gate and first-screen choices.** `design: { gate?, hero? }` next to `theme` (theme slugs; absent = the theme's own). Contract, runtime (`src/core/mix.js`), compatibility manifest (`slots.js` `parts`) and the data.js / studio / server changes it needs: `docs/MIX.md`. Theme agents: the token rules of converted themes also match `.mx-part.theme-<slug>`; `_suite/suite.css` defaults match `:where(.mx-part).su`.

**server + studio (2026-10-16): couples stay signed in; the admin can copy the couple's link again.**
- Owner: "No asking the client again and again for the password. Until they log out, don't sign them out."
  Sessions now persist in `data/sessions.json` (hashed ids only) and survive restarts and deploys. Sliding
  expiry: couple 180 days, admin 30 days since last activity, no absolute cap; the persistent cookie is
  refreshed with `seen` (at most every 10 min). A couple's sessions end on sign-out, link off, new link, a
  password change or invitation delete. Details: API.md "Sessions". New: `server/lib/sessions.js`.
- Opening the shared link again while signed in goes straight in (`POST /client/session { token }`, no
  password). The studio always asks `/auth/me` first, so a valid cookie never shows the password page.
- `clientLink.url` (admin only): the link is stored encrypted (`access.tokenEnc`, `server/lib/linkkey.js`;
  optional env `LINK_SECRET`, else `data/link.key`). Clients & access rows show Copy link and a Reset password
  button; the access panel and the invitation's Send module (admin) show the link with Copy and Reset password.
  Reset password keeps the same URL. Older links show "created before links could be shown again" with a
  New link button. The password is never shown again (argon2id hash only).

**website + core + server (2026-10-16): public watermarked showcase of every design.**
- Owner: "Create a preview from the home page design for each theme ... with a complete watermark of Nimtto, so make
  sure no one can copy text or anything. Even if we can stop the screen recorder or the screenshot ..."
- `/<theme>/?showcase=1` (short link `/preview/<theme>`) is public for every ready theme: demo couple only (`?id=` is
  dropped by a 302 and again in the page), server-marked with `data-showcase="1"` + `/showcase.css`. The plain
  `/<theme>/` stays gated exactly as before. Details: API.md "Public showcase". Files: `server/lib/showcase.js` (one
  hook in `server/index.js`), `src/core/showcase.js` (one import in `src/core/data.js`), `public/showcase.css`.
- Website: every design card and the lightbox have "Preview". Desktop opens a phone-frame modal (iframe) with "Order
  this design" and "Open full screen"; phones and touch devices open it full screen, with a close button in the badge.
  `/?design=<slug>#order` preselects the design in the order form. Copy no longer says "Ask us for a private preview".
- **Honest limit:** screenshots and screen recording cannot be technically prevented on the web (the OS and browser
  capture the screen outside the page's control). The full-screen watermark, copy blocking, the blank card on focus
  loss / PrintScreen / print, and the reduced photo size are deterrents: they make a copy obviously a Nimtto preview,
  not impossible.

**faith + server (2026-10-16): religion, bilingual fallback, one RSVP answer per ceremony, guest-link versions.**
- Owner: "For Muslim or Christian couples there should be designs for their community … ask the religion when creating."
  Data: `religion: 'hindu' | 'muslim' | 'christian' | 'other'` (omitted = Hindu). The couple changes it only with
  `canChangeTheme`; the server refuses (403) a couple's save whose theme, gate or hero does not list the religion.
  Shared layer: `src/core/faith.js` (words, emblems, ceremony presets, share greeting), applied by `data.js`
  (`config.faith = { religion, symbols, version }`, `<html data-religion data-symbols>`) and `slots.js`: a sacred image
  slot (`*.ganesh` or `sacred: true`) shows a fine-line emblem (crescent and star in an arch / cross over two rings /
  laurel wreath) drawn in the theme's `faithInk` (+ optional `faithHalo`); invocation defaults become بسم الله الرحمن الرحيم
  (Amiri, self-hosted in `public/themes/_faith/`, RTL span) / a Bible verse / nothing; शुभ विवाह becomes निकाह / पवित्र विवाह.
  Theme markup marks Hindu-only details with `[data-hindu]` (gone when the symbols are not Hindu) or `[data-hindu-rite]`
  (gone when the community is not Hindu); the `_nepali` kit's lamps, kalash, ganthi, saptapadi and sindoor carry them.
  A safety net swaps any hard-coded Ganesh invocation left in a design. Hindu pages run nothing new.
- Every `slots.js` has `religions`. Muslim / Christian: dhaka, hariyo, himal, jhyal, laali, mahal, mehendi. Other adds
  gurans (Phoolbari), kham, sayapatri, swayambar. Hindu only: agni, bagaicha, chitra, dhoka, durbar, ghar, janti, mala,
  mandap, mangal, nimantrana, pardaa, rajdwar, rangoli, shree, sindoor.
- New invitations (`POST /invitations { religion, colors }`) start with the community's ceremonies, each its own event
  (Hindu: Mehendi, Haldi, Janti, Shubha Bibaha, Reception; Muslim: Mehndi, Nikah, Walima, Reception; Christian:
  Engagement & Ring Ceremony, Holy Matrimony, Reception; Other: Wedding ceremony, Reception) and wording.
- Bilingual: an `{en, ne}` with one side empty shows the other side in both views (data.js on load, `bi()`, slot texts;
  the couple's words in either language beat the design's default).
- RSVP: one tick per ceremony, labelled with its name; a "yes" must tick at least one (client and server).
- Guest links: `?v=neutral|hindu|muslim|christian` (Send › personal link › "Religious symbols"); `/i/<slug>` keeps it.
- Needed from the studio agent: a "Community" selector (four options) in Home or Opening that sets `religion` (couple:
  only with `canChangeTheme`), and the Themes / Opening gate-and-hero pickers filtering `meta.themes` with
  `suits({ religions: t.religions }, religion)` from `src/core/faith.js` (the admin may see all, marked).
- Art sweep (same day): Mahal's crest is a plain painted gold disc; for other communities the emblem now sits on a pale
  gold roundel inside it (`roundelRef`, also in Mangal's medallion if ever forced). An image slot may name a neutral
  twin, `nonHindu: '<library slug>'`, used when the symbols are not Hindu (Himal's two temple photos → Phewa Lake,
  a lit garden). The sample's betel-nut and temple-courtyard photos leave non-Hindu starters. Emblems are drawn as SVG
  but shown as a cached PNG blob (SwiftShader painted a black band over Hariyo's gate for a stroked SVG <img>).

**server + studio (2026-10-16): customer accounts, minimal order, design tiers.** Contract: API.md "Customer accounts", "Account on order", "Design tiers".
- Ordering on the website makes an account (email + password ≥ 8, argon2id) and signs the browser in (role `customer`, 180-day sliding session). `/studio/` has one "Sign in" for the owner and customers, with "Forgot password?" → "Contact us on WhatsApp +977 980-6393298 to reset". Same 401 for unknown email, wrong password and a turned-off account.
- `POST /api/orders` needs only name, phone, email, password, plan (+ optional design); date, venue and message are optional and can be added from the dashboard. A plan below the design's tier → 400 `code: 'tier'`.
- Customer dashboard (`#/account`): orders with payment status and "Pay now" (`/pay/<ref>` opens with the session, no token), wedding details, password change, and each invitation the owner linked → the couple's editor with that link's perms. Secret client links keep working.
- Owner: Clients & access › Customer accounts (link invitations with perms, reset password, turn off, new account); Themes › "Plan from" per design (`Site.themeTiers`). Files: `server/lib/accounts.js`, `server/lib/customers.js`, `src/studio/customer.js`, `src/studio/admin-customers.js`.
- Website agent: `GET /api/auth/me?soft=1` → `{ role: null }` or `{ role: 'customer', name, email }` for the nav ("My dashboard" → `/studio/`); `/api/site` plans carry `includes`, `/api/themes` carry `tier`.
