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

## Website (home page, design pages, pay page) design

Applies to the public site only: `/` (`index.html`), `/designs/<slug>/` (generated), `/pay/<ref>`, `src/site/**`,
`public/site/**`, plus the showcase chrome (`src/core/showcase.js`, `public/showcase.css`). The invitation themes keep
their own type; the website must not borrow it.

**Source of truth: the owner's Claude Design canvas "Nimtto Redesign" (`Main.dc.html` = home, `Design.dc.html` = a
design page).** The build reproduces it exactly: same layout, sections and order, fonts, colours, components, cards,
buttons and (no) motion. Allowed differences only: spacing put on the scale, the plain-English copy, phone and tablet
layouts, and the working parts the canvas only drew (navigation, the order and pay flow, the design pages). Compare
with the canvas side by side at 1440 before changing anything.

Fonts (self-hosted in `public/site/fonts/`, OFL licences beside them; Fraunces, Jost and Meow Script are preloaded):
- Display: Fraunces (variable opsz/wght 300-600, SOFT 100 and WONK 0 baked in), 400 headings, 500 small titles.
- Text and UI: Jost 300-600 (300 for paragraphs, 400 UI, 500 labels; buttons 13px uppercase, 0.14em tracking).
- Nepali: Tiro Devanagari Hindi 400. Devanagari digits come from a 4 KB Mukta subset (`mukta-digits.woff2`,
  "Nimtto Digits" first in `--f-ne`) because Tiro draws ९ almost like ६ and a date must never be misread.
  Every `[lang=ne]` turns `locl` off.
- Meow Script (letters-only subset): one accent word per heading, as the canvas ("doorway", "opening", "replies",
  "needs", "rupees", "invitation"), and the sample names in drawings. Never for UI or body.

Tokens (`src/site/site.css`): wine `#9A1829` (hover `#7D1321`), plum ink `#2A1A1D`, `#5B474B`, `#7A6468` (only on
white, soft or blush), blush `#F6E9E7`, promo `#F7E9E8`, hairline `#EFE4E2`, soft `#FBF5F3`, white, gold
`#C9871F`/`#E0A030` for dots only. Field borders are `#9C8689` (the canvas `#DCCBC8` is under the 3:1 needed for
inputs). Spacing scale only: 4 8 12 16 24 32 48 64 96 128. Sections 64 / 96 (768+) / 128 (1280+). Container 1272
(the canvas 1320 with 24px padding), gutters 20 / 32 / 48.

Home (canvas order): promo bar with arrows; header (logo, five links, Sign in, Order pill; a Menu sheet under 1024px);
hero (copy, then the flat lay: paper card, envelope with the Nimtto seal, phone drawing of Phoolbari); the word
निम्तो; designs (chips, the stage with a phone and prev/next, thumbnails that pick the stage, a dashed custom card;
"View details" opens `/designs/<slug>/`); how it works (four cards, the last wine); features bento; pricing (pill,
Ready-made / Custom switch, plan cards from `/api/site` with the wine "Most chosen" band, trust row); order (four
steps beside the form card; the payment step replaces the form); closing (नमस्ते, contact, two buttons); footer.
Real design stills replace the canvas's placeholder drawings inside phone frames.

Design page (canvas `Design.dc.html`, generated by `node src/site/make-thumbs.mjs && node
src/site/make-design-pages.mjs`): promo strip, two-row header with the category nav, breadcrumb, view tabs
(Opening = the real still; Invitation, Ceremonies, RSVP drawn), colour theme and language controls on the drawn views,
square Order / Preview buttons, notes box, Details / What's included / Why Nimtto tabs, every ceremony, "You may also
love" (three phone cards), slim footer. Never a link to the clean theme page.

Order and payment: order first, then pay. The payment step (`src/site/payment.js`, lazy-loaded) shows the amount,
method cards, the per-order QR (`GET /api/orders/:ref/pay`; "The amount fills in by itself" when `dynamic`, else
"Scan, then enter amount ... and remark ..." with copy buttons), an editable remark, "Save QR image", the screenshot
upload with a preview, then the status. `/pay/<ref>?t=<token>` reopens it.

Showcase watermark: the owner's logo (traced to `/site/brand/nimtto-logo-white.svg`) tiled at -16 degrees with a
small PREVIEW label, white at about 60% with a thin plum outline; it re-inserts itself if removed or hidden.

Motion: as the canvas, only quiet hover and state changes (160-300 ms colour, border and opacity; thumbnails lift
3px). No entrance animation, no scroll motion, no parallax. Reduced motion: nothing moves.

Copy: plain, warm English for a family member with basic English. Short sentences, common words, one idea per line,
digits for numbers ("27 designs"), prices as "Rs. 4,999" with "or USD 99 from abroad".
