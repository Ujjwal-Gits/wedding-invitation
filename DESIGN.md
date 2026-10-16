# DESIGN.md — Sayapatri (सयपत्री) wedding invitation template

Claude reads this before writing UI. It overrides default aesthetics.

---

## 1. What this is

Product: Sayapatri, a reusable cinematic wedding invitation website template.
One sentence: A scroll-driven invitation that carries guests from the Ganesh
invocation through Mehendi, Haldi, the mandap and the reception, ending at an
RSVP, for Nepali Hindu weddings.
Who visits it: Wedding guests in Nepal and the diaspora, ages 18-75, mostly
opening a link from WhatsApp or Viber on a mid-range Android phone over 4G.
Elders may be reading in Nepali. A minority on desktop.
What they must do: Know when and where each event is, then RSVP.

Template rule: every name, photo, date, venue, colour override and music file
comes from `src/config.js`. A new couple must never require touching markup.

## 2. Feeling

Three adjectives: ceremonial, warm, unhurried.

Not this: generic Canva/Envato "Indian wedding" e-cards with clip-art Ganesh
and Great Vibes on everything; SaaS landing pages with cards and gradients.
Closer to this: a hand-pressed letterpress card sealed in wax; the feeling of
walking through a Patan courtyard into lamplight. Camera language of a
wedding film, not a website.

## 3. Typography

Display / headings: Cormorant Garamond 500/600, italic for ceremony names.
Classical, high-contrast, reads as engraved.
Names only: Pinyon Script 400. Never for anything else.
Devanagari: Tiro Devanagari Hindi 400 (display), Mukta 400/500 (body).
Body: Mukta 400 (Latin + Devanagari in one family).
Scale (fluid): 13 / 15 / 18 / 24 / 34 / 52 / 84 px, clamp() between mobile
and desktop. Letter-spaced small caps (0.32em) for eyebrow labels.

Rules:
- Never Inter, Roboto, Open Sans, or system-ui as display face.
- Body measure max 62ch.

## 4. Colour

Dominant: sindoor maroon `#5E0B15`
Night / deepest: wine `#1A0408`
Surface: ivory `#F4E9D6` (paper, form fields)
Ink: `#2B1A12` on ivory; ivory `#F4E9D6` on maroon
Accent: gold `#C9963F` (only accent; borders, rules, ornaments, primary button)
Chapter tints (backgrounds only, never as accent): henna `#3E4A22`,
haldi `#D99A1E`, night `#0E0A14`
Semantic: success `#4F7A3A`, warning `#C98A1A`, error `#A3242C`

Rules:
- No default Tailwind values. No blue-to-purple gradients. No gradient text.
- Gold on maroon must pass AA for anything under 24px (`#D9AE5F` lighter
  gold token used for small text).

## 5. Layout

Grid: full-bleed pinned chapters; text columns max 560px. Desktop uses
off-centre text blocks (left or right third) to break symmetry; mobile stacks.
Spacing scale: 4 / 8 / 12 / 16 / 24 / 40 / 64 / 104
Radius: square. Arches (ogee/temple arch via clip-path) are the only curves.
Shadow: none. Use 1px gold hairlines and double-rule borders instead.

Rules:
- No card grids. Event details are set like a printed programme: label,
  rule, value.
- At least half the chapters are asymmetric.

## 6. Motion

Each design has exactly one signature motion; everything else stays quiet.
- Dhoka: a real carved door (photo-textured 3D leaves) swings open with a
  temple bell and lamplight, and the camera walks through.
- Ghar: scroll is walking. The camera moves through real photographs with
  depth (2.5D), room to room, through doorways and windows.
- Sayapatri: fly into a marigold's heart, then gilded portals between chapters.

Supporting: headline line reveals (headings only), photo parallax inside
frames, vows brightening. Transform and opacity only. Native touch momentum on
phones (Lenis smooths wheel only). Reduced motion: still stacked sections.

## 7. Imagery

Real photography only for scenes (Wikimedia Commons / Openverse, CC0, PD,
CC BY, CC BY-SA), credited in the footer. No AI-generated scenery, no
CSS-drawn objects (envelopes, lanterns, diyos). Depth maps are generated
offline (Depth Anything V2 Small, Apache-2.0) for the 3D camera moves.
The couple portrait is always supplied by the couple; the bundled one is a
placeholder. Alt text describes what is shown; decorative photos get alt="".

## 8. Voice

English primary, Nepali for sacred and ceremonial phrases, set side by side,
not translated word-for-word. A language toggle swaps headings to Nepali.
Sample headline: "Two families, one sacred fire."
Sample button: "Send your blessing" / "Count us in".
Banned: "Unlock", "Seamlessly", "Elevate your", "Supercharge", "in seconds",
"the future of", em-dash asides, "It's not X, it's Y".

## 9. Non-negotiables

- Accessibility: WCAG 2.2 AA, visible focus, keyboard navigable, music never
  autoplays with sound before a user gesture, mute always reachable.
- Performance: LCP < 2.5s on 4G; art served as WebP/AVIF at 2 sizes; Three.js
  lazy-initialised after the envelope opens; JS < 250KB gzipped.
- Browsers: last 2 Chrome/Safari/Firefox, Android Chrome 100+, iOS Safari 15+.
- Devanagari must render correctly in Tiro Devanagari Hindi and Mukta.
- Never letter-space or uppercase Devanagari (breaks conjuncts).
- RSVP: validated client and server side; endpoint URL from config; honeypot
  field; no secrets in client code.

---

## Website (public pages) design

Applies to the public site only: `/` (`index.html`), `/designs/`, `/occasions/`, `/how-it-works/`, `/features/`,
`/pricing/`, `/contact/`, `/designs/<slug>/` (generated), `/pay/<ref>`, `src/site/**`, `public/site/**`, plus the
showcase chrome (`src/core/showcase.js`, `public/showcase.css`). The invitation themes keep their own type; the website
must not borrow it. This replaces the earlier "Nimtto Redesign" canvas rules (owner's redesign brief, Oct 2026).

Feeling: a premium product page (Apple-like restraint), romantic and clean. White first, blush surfaces, one rose-red
accent. Big confident type, very small side margins with wide content, generous vertical rhythm, large continuous
corners (`corner-shape: squircle` where supported), rounded bento cards. Not only weddings: every Nepali occasion.

Fonts (self-hosted in `public/site/fonts/`, OFL licences beside them; Instrument Serif and Geist latin preloaded):
- Display: Instrument Serif 400, roman and italic. The italic in the accent colour carries one emphasis per heading
  (`<em>`). Never for prices or numbers people must read exactly (its 1 reads like l): those are Geist 600.
- Text and UI: Geist 300-700 (variable).
- Nepali: Tiro Devanagari Hindi 400, with Devanagari digits from the 4 KB Mukta subset ("Nimtto Digits" first in
  `--f-ne`), and `locl` off on every `[lang=ne]`.

Tokens (`src/site/site.css`): white; blush-50 `#FFF6F7`, blush-100 `#FDEDF0`, blush-200 `#F9DDE3`; rose-300 `#F2B8C6`
and rose-500 `#D9567A` for decoration only; accent `#A8123A` (hover `#8E0F31`, pressed `#760C29`, 7.5:1 on white);
ink `#22141A`, `#574550`, `#76646C` (AA on white and blush-100); hairlines `#F1E3E7` / `#E6D1D8`; field borders
`#A08A91`; one deep surface, night `#2A0C16` (the "Most chosen" plan, Shahi tier label). Gutter
`clamp(14px, 2vw, 32px)`, container 1680, section rhythm `clamp(88px, 10vw, 168px)`, radii `clamp(26px, 2.6vw, 40px)`.

Structure: shared header, footer, order and preview dialogs, design cards, occasions, plans and FAQ (with FAQPage
JSON-LD) are static HTML from `src/site/partials.mjs`, inserted by the `site-partials` Vite plugin (`<!--@name:arg-->`);
the words live in `src/site/content.mjs`. One script for every page: `src/site/site.js` (body `data-page`).
Design pages: `node src/site/make-thumbs.mjs && node src/site/make-design-pages.mjs` (also writes `public/sitemap.xml`).

Motion (`src/site/motion.js`, GSAP + ScrollTrigger, loaded only when allowed; transform and opacity only; scrubbed):
- Home hero: pinned. The copy lifts away, the side phones part, and the centre phone grows until its invitation fills
  the screen, then fades to blush: we go inside the invitation.
- THE LOTUS OPENS (after the Shree design's कार्यक्रम): pinned on the home page. A circle of light grows, the rose
  lotus unfolds ring by ring, then rises to crown "हरेक शुभ कार्यक्रम". At the top of /occasions/ it plays once by
  itself (the heading is never hidden).
- Designs rail (home, 1024+): pinned horizontal slide. Phones: a swipe row.
- Features: the six call-outs gather round one phone (1100+). How it works: a sticky phone changes screen per step.
- Everything else is quiet: section heads fade up once; hovers 200-350 ms. Phones get shorter scenes and no
  horizontal pin. Reduced motion: nothing moves, the finished state shows.

Order and payment: every "Order" / "Choose <plan>" opens the order dialog (`src/site/order.js`): plan, design with
pictures (tier-aware, one-tap upgrade), name, WhatsApp, email, password (show/hide). `409 account_exists` asks for
that account's password or sign-in; `400 code: tier` switches to the plan needed. Success goes to `/pay/<ref>` (the
session cookie opens it; `?t=` still works). `?design=`, `?plan=`, `?occasion=` or `#order` on any page open the dialog.
Nav: "My dashboard" when `/api/auth/me?soft=1` has a role, else "Sign in".

Search: per-page titles, descriptions, canonical, OG; JSON-LD Organization + WebSite (every page), Service with
offers (home, pricing, occasions), ItemList (designs), Product + Offer + BreadcrumbList (each design), HowTo, FAQPage;
`public/robots.txt`, `public/sitemap.xml`, `public/llms.txt`. New top-level pages must be added to `OPEN_PAGES`
in `server/lib/gate.js`.

Copy: plain, warm English for a family member with basic English. Short sentences, digits for numbers, prices as
"Rs 4,999" with "or USD 99 from abroad".
