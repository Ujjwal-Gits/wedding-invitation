# Search setup checklist (owner)

One-time accounts and switches for nimtto.com after a deploy. The site already serves everything search engines
need: `/robots.txt`, the sitemap index `/sitemap.xml`, `/llms.txt`, the IndexNow key, and noindex on private pages.
Technical details: docs/SEO-AUDIT.md.

## 1. Google Search Console (do this first)

1. Go to https://search.google.com/search-console and choose **Add property** -> **Domain** -> `nimtto.com`.
   A domain property covers `https://`, `www`, every path and both sites (Nepal and /international/).
2. Verify by DNS: Google shows a `TXT` record (`google-site-verification=...`). In Cloudflare: nimtto.com -> DNS ->
   Records -> Add record, type `TXT`, name `@`, content the value Google gave, TTL Auto. (Cloudflare may also offer to
   add it for you through its Google integration; either is fine.) Press Verify; DNS can take a few minutes.
   Keep the TXT record forever: removing it un-verifies the property.
3. Sitemaps (left menu) -> add `sitemap.xml` -> Submit. Google reads the index and every file in it
   (pages Nepal, pages international, designs, images, and the blog once it exists). Status should become
   "Success" with about 86 discovered URLs (more with the blog).
4. URL Inspection -> paste `https://nimtto.com/` -> **Request indexing**. Repeat for `/international/`,
   `/designs/`, `/international/designs/`, `/pricing/`, `/international/pricing/`, `/about/`. (A handful a day is
   enough; the sitemap covers the rest.)
5. Optional: Settings -> Users and permissions, add a second owner account so access is never lost.
6. International targeting needs nothing more: the pages carry `hreflang` and `html lang` (en-NP, en-US).
   Do not set a country target.

## 2. Bing Webmaster Tools (5 minutes, also feeds ChatGPT search and Copilot)

1. https://www.bing.com/webmasters -> sign in -> **Import from Google Search Console** -> allow -> select
   nimtto.com. This imports the verified site and its sitemaps.
2. Check Sitemaps shows `https://nimtto.com/sitemap.xml`; add it if not.
3. IndexNow is already on: the server tells Bing (and Yandex, Seznam, Naver) about new or changed pages a minute
   after each deploy. Bing Webmaster -> IndexNow shows the URLs it received. For a first full send after the first
   deploy: `node server/scripts/indexnow-submit.js --all` (in the container or locally; `--dry-run` lists them).
   To switch it off: `INDEXNOW=0` in the environment.

## 3. Analytics: Cloudflare Web Analytics (no cookies, no consent banner)

Cloudflare Web Analytics counts visits without cookies or personal data, so no cookie banner is needed.
1. Cloudflare dashboard -> Analytics and Logs -> Web Analytics -> **Add a site** -> nimtto.com -> choose the
   automatic setup (Cloudflare injects the small beacon script because the site is proxied).
2. In Coolify, add the environment variable `CF_WEB_ANALYTICS=1` and redeploy. It lets the beacon through the
   site's Content-Security-Policy; without it the browser blocks the script and you see no data.
3. Check: open the site, then the Web Analytics dashboard shows visits within a few minutes.
Alternatives if you ever want more: Plausible or Umami (also cookieless; self-hosted Umami can run on Coolify).
Avoid adding Google Analytics unless you also add a consent banner for visitors from the UK/EU.

## 4. Google Business Profile: not now

Google Business Profile is for businesses that meet customers in person, at their own address or by travelling to
them. Nimtto works fully online, so Google's rules make it ineligible: listing a home address as a shop, or a
virtual office, risks suspension. Revisit only if Nimtto opens a studio customers visit, or a team starts visiting
customers in person (then a service-area profile, with the address hidden). The Organization data on every page
and the About page already tell Google who Nimtto is.

## 5. Not applicable

- Google Merchant Center / Shopping: for physical products with shipping. Invitations are a designer service; the
  design pages already carry Product markup with prices for normal results.
- Google Indexing API: only for job postings and livestream pages.

## 6. Your own details (raises trust, takes 10 minutes)

Edit `src/site/seo-site.mjs`, then run `node src/site/make-landing-pages.mjs` and `npm run build`, and deploy:
- `SAME_AS`: the full URLs of Nimtto's real profiles (Instagram, Facebook page, TikTok, YouTube, LinkedIn). Only
  profiles that exist and that you control.
- `OWNER`: your name, role, a square photo in `public/site/team/`, a short story. The About page shows a card and
  the structured data names you as founder. Leave it empty to show nothing.
- `FOUNDED`: the year Nimtto started.
Keep the name, email and WhatsApp number identical everywhere you list Nimtto (Instagram bio, Facebook page,
directories): Nimtto, nimttoz@gmail.com, +977 980-6393298.

## 7. Watching rankings

- Weekly, Search Console -> Performance -> Search results: filter Country = Nepal, then United States; Page
  contains `/international/` vs not. Watch clicks, impressions and average position for the keywords in
  docs/SEO-KEYWORDS.md.
- Search Console -> Pages: "Not indexed" reasons. "Excluded by noindex" for invitation, studio or showcase URLs is
  correct and expected.
- Search Console -> Core Web Vitals and Bing Webmaster -> Site Explorer: fix anything marked Poor.
- Bing Webmaster -> Search Performance: the same view for Bing, Copilot and DuckDuckGo traffic.
- Optional paid rank tracker (SE Ranking, Ahrefs Webmaster Tools free tier for your own site) if you want daily
  positions per keyword and per country.

## 8. After each deploy

1. `npm run build` already contains fresh sitemaps if the generators ran (`node src/site/make-design-pages.mjs`,
   `node src/site/make-landing-pages.mjs`); commit `src/site/lastmod.json` with them.
2. Purge Cloudflare's cache for `/sitemap*.xml`, `/robots.txt` and changed pages (or wait an hour).
3. IndexNow sends the changed URLs by itself. Google picks up the sitemap's new dates on its own; use URL
   Inspection -> Request indexing for an important new page.
4. Before calling a release done, run the security checklist (~/.claude/templates/SECURITY-CHECKLIST.md).
