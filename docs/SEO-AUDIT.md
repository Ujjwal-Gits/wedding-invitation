# Technical SEO audit: nimtto.com and nimtto.com/international/

Audit date 2026-10-18. Method: a crawl of the production build the way the server answers it
(`node scripts/seo-crawl.mjs`, after `npm run build`; it follows `server/lib/gate.js` and `lib/static.js`, reads the
sitemaps, validates every JSON-LD block with `scripts/seo-ld-check.mjs`), response headers from the production server
(`node server/index.js --production`), and Core Web Vitals measured with Playwright (Chromium, mobile: 412x915, 4x CPU
slowdown, 1.6 Mbps / 150 ms; desktop: 1440x900, no throttling).

Re-run the crawl after any change to pages or generators: `npm run build && node scripts/seo-crawl.mjs` (exit 1 on
an error; `--verbose` lists every finding, `--json` dumps them).

## Summary

| Check | Before | After |
|---|---|---|
| Pages crawled (all 200, all in a sitemap, none orphaned) | 84 | 86 (+ /about/, /international/about/) |
| Broken internal links | 0 | 0 |
| Redirect chains / links to redirects | 0 | 0 |
| Canonical missing, not self, not absolute https, or trailing slash inconsistent | 0 | 0 |
| Duplicate titles / descriptions | 0 / 0 | 0 / 0 |
| Missing or multiple H1 | 0 | 0 |
| Heading level skips | 2 | 2 (owner A, below) |
| Images without alt / without width+height | 0 / 0 | 0 / 0 |
| JSON-LD blocks that fail to parse / miss a required property | 0 / 0 | 0 / 0 |
| `<html lang>` not matching the site (en-NP / en-US) | 81 | 0 |
| hreflang: self-only tags with no x-default (no real alternates) | 84 | 0 (9 reciprocal pairs, x-default set) |
| Sitemap URLs with a fake `lastmod` (build date) | 84 of 84 | 0 (content-dated) |
| Guest invitation pages (`/<design>/?id=`) indexable | yes (no noindex) | no (`X-Robots-Tag: noindex`) |
| Private routes with `X-Robots-Tag` | /studio/ clean paths, showcase | all private routes |
| Mobile LCP, slowest of 6 key pages (lab) | 2.02 s (home) | 1.95 s (home) |
| CLS, worst of 6 key pages | 0.011 | 0.011 |

Core Web Vitals (lab, final build; target LCP < 2.5 s, CLS < 0.1):

| Page | Mobile LCP | Mobile CLS | Desktop LCP | Transfer (mobile) |
|---|---|---|---|---|
| / | 1.95 s (hero still, preloaded) | 0.000 | 0.29 s | 685 KB |
| /designs/ | 1.66 s | 0.011 | 0.22 s | 732 KB |
| /pricing/ | 1.43 s | 0.000 | 0.19 s | 317 KB |
| /international/ | 1.91 s (hero art, preloaded) | 0.000 | 0.28 s | 813 KB |
| /international/designs/ | 1.48 s | 0.007 | 0.20 s | 811 KB |
| /international/pricing/ | 1.34 s | 0.000 | 0.18 s | 227 KB |

Lab numbers on localhost leave out real network time to Cloudflare; check field data in Search Console's Core Web
Vitals report once there is traffic (docs/SEO-SETUP.md).

## Fixed (technical SEO lane)

1. **Guest invitations could be indexed.** `/<design>/?id=<slug>` served a couple's names, dates and venues with no
   noindex. Every gated design response now sends `X-Robots-Tag: noindex, nofollow, noarchive` (lib/gate.js). All
   private areas (`/api`, `/studio`, `/pay`, `/i`, `/preview`, `/clients`, `/uploads`, `/go`) send it too
   (lib/security.js `PRIVATE_PATH`).
2. **Sitemaps.** `/sitemap.xml` is now a sitemap index of `sitemap-pages-np.xml`, `sitemap-pages-intl.xml`,
   `sitemap-designs.xml`, `sitemap-images.xml` (and any other `public/sitemap-*.xml`, e.g. the blog's). `lastmod`
   is the date the page's own content last changed: a hash of the page without header, footer and head, kept in
   `src/site/lastmod.json` (first sighting takes the source file's last commit date). Before, every URL carried the
   generator's run date, which teaches Google to ignore `lastmod`. `priority` removed (ignored by Google). Served
   with `application/xml`, `Cache-Control: public, max-age=3600`, `X-Robots-Tag: noindex`. Noindex pages and the
   gated design pages are never listed (the generator checks).
3. **robots.txt.** Same private disallows for `*` and every named AI search bot (added Claude-SearchBot,
   Claude-User, Perplexity-User, Applebot-Extended; grouped instead of repeated). `/go$` (not `/go`, which would
   also block `/gold-arch/`). Link-preview bots (X/Twitter, Facebook, LinkedIn, Slack, Discord, Telegram, WhatsApp)
   may read `/i/` preview cards so shared invitations keep their picture; those cards carry their own noindex.
4. **Languages and hreflang.** `<html lang>` is `en-NP` on the Nepal site and `en-US` on /international/ (`en` on
   the shared legal pages); JSON-LD `inLanguage` matches. hreflang is now only on the 9 page pairs that are the same
   page for the other market (home, designs, occasions, how it works, features, pricing, FAQ, contact, about):
   `en-NP` -> Nepal page, `en` -> international page, `x-default` -> international page, reciprocal. Landing,
   occasion and design pages target different searches and stand alone (docs/SEO-KEYWORDS.md). Config:
   `src/site/seo-site.mjs` `EQUIVALENTS`.
5. **E-E-A-T.** New `/about/` and `/international/about/` (what Nimtto is, who it serves, how we work, what you can
   count on, the team, name/email/WhatsApp/country). `#team` is the author page for articles signed "Nimtto Team"
   (`AUTHOR_LD` in seo-site.mjs). Linked from both footers; in llms.txt; `about` added to the gate's open pages.
6. **Organization JSON-LD.** One NAP source (`NAP` in seo-site.mjs), square 512 px PNG logo
   (`/site/brand/nimtto-logo-512.png`; was a wide SVG wordmark), two contact points, a return policy
   (digital goods, not returnable; links /refunds/), `sameAs` / `founder` / `foundingDate` added automatically once
   the owner fills them in. AboutPage nodes carry `about` and `mainEntity`.
7. **Performance headers.** Pages send a `Link` header built from their own preload tags (hero image with srcset,
   the two text fonts), so the browser and Cloudflare Early Hints start them before the HTML arrives. Hashed assets
   stay `immutable` for a year; HTML stays `no-cache` with ETag (304s); brotli/gzip are precompressed at build.
8. **IndexNow.** Key file `/30d1bc34d78e6e19e40a917412221df1.txt`; `server/lib/indexnow.js`; changed sitemap URLs
   are sent once after every deploy; `notifyChanged()` and `POST /api/admin/seo/indexnow` for publishing.
9. **Tooling.** `scripts/seo-crawl.mjs`, `scripts/seo-ld-check.mjs`; `server/test/seo.test.js` (robots, sitemap
   index, caching, X-Robots-Tag, Link header, IndexNow).

## Open items, by owner

| # | Item | Owner | Detail |
|---|---|---|---|
| 1 | Heading skip H1 -> H3 on `/occasions/` and `/international/occasions/` | A (page content) | The occasion cards (H3) follow the page H1 with no H2. Add an H2 above the grid (it can be visually quiet, e.g. "Every occasion we design for") in `occasions/index.html` and `international/occasions/index.html`. |
| 2 | Heavy desktop pages: /international/designs/ 3.2 MB, /pricing/ 2.1 MB transferred | A (page content) | The tier rows / design grids load many phone stills on desktop. Check that everything below the first screen is `loading="lazy"` and that `sizes` matches the rendered width (82 px phones should pick a small file; there is no file under 480w). Not a CWV failure today. |
| 3 | Blog sitemap | B (blog) | Write `public/sitemap-blog.xml` with `writeSitemap('sitemap-blog.xml', entries)` from `src/site/sitemaps.mjs` (entries `{ path, lastmod }`, lastmod = the post's real updated date) and then call `writeSitemapIndex()`; the index, tests and robots pick it up. Do not hand-edit `public/sitemap.xml`. |
| 4 | Blog author and IndexNow | B (blog) | BlogPosting `author: AUTHOR_LD` (from `src/site/seo-site.mjs`; url `/about/#team`; on /international/blog/ you may set `url: TEAM_URL_INTL`). After publishing a post call `notifyChanged(['/blog/<slug>/', '/blog/'])` from `server/lib/indexnow.js` (server side), or rely on the post-deploy send if posts ship with a deploy. `/blog/` is already an open page in the gate. |
| 5 | hreflang for blog posts | B (blog) | Only if a post exists in both blogs as the same article for the two markets; otherwise none (same rule as the landing pages). |
| 6 | CMS overrides and freshness | C (admin CMS) | When the server injects edited copy into a page: (a) call `notifyChanged([path])` after a save; (b) keep the static server's `Link` header and `Cache-Control` for that page (lib/static.js `preloadLinks`, `cacheControlFor`); (c) the sitemap `lastmod` comes from the build, so either rebuild after big edits or serve the sitemaps through a handler that uses the override's saved date. Never inject into gated design pages. |
| 7 | Title/description lengths | A | All within limits today (`checkLengths` in seo.mjs). The About pages' meta lives in `seo-site.mjs` `TRUST_PAGES` (move into seo.mjs if A prefers one place). |
| 8 | Owner facts | Owner | `src/site/seo-site.mjs`: `SAME_AS` (real profiles only), `OWNER` (name, role, photo, story), `FOUNDED`. Then `node src/site/make-landing-pages.mjs && npm run build`. |
| 9 | FAQ and HowTo rich results | info | FAQPage markup stays valid but Google shows FAQ rich results only for well-known government and health sites (2023), and HowTo rich results were retired. The markup still helps AI answers; no action. |
| 10 | Product markup on design pages | info | Valid (name, image, offer with price and currency). Google may list "missing shippingDetails" as a non-critical merchant warning; not applicable to a digital service. The organisation-level return policy covers `hasMerchantReturnPolicy`. |
