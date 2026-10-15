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

## Website (home page) design

Applies to the public site at `/` only (`index.html`, `src/site/**`, `public/site/**`). The invitation themes keep
their own ornate type; the website must not borrow it.

Feeling: a calm bridal stationer. Light, airy and romantic: rose-white paper, a blush second tint, deep wine ink and one
sindoor red. Never black, never yellow parchment. The colour and the flowers come from the real designs, shown big;
the chrome stays quiet. Text never sits on flowers.

Fonts (self-hosted in `public/site/fonts/`, licences beside them; the first three are preloaded):
- Display: Kalnia (OFL), light 200 for headings, 300 for small titles and names. Upright only, letter-spacing
  about -0.012em at display sizes. Never bold, never italic.
- UI and body: Switzer variable (Indian Type Foundry, ITF Free Font License), 400 for text, 500 for labels and buttons.
- Nepali display (निम्तो, नमस्ते, dates, step numbers १-४, Nepali design names): Martel 300 (OFL).
- Nepali text: Mukta 400 (OFL). Every `[lang=ne]` turns `locl` off so ८ never draws like ५.
- Banned here: Cormorant, Playfair, Bodoni, Inter, Roboto, Open Sans, system-ui as display, and any script face.

Tokens (`src/site/site.css`):
- Surfaces: paper `#FCF8F7` (page), blush `#F7ECEA` (alternate sections, footer), blush-2 `#F1E1DE` (door leaves,
  image wells), white `#FFFFFF` (form panel, specimens, lightbox).
- Lines: `#EBDCD9` hairlines, `#DDC8C4` on blush and the arch frame, `#A88E8B` field borders (3:1 on white).
- Ink: `#3D1E28` (14:1 on paper), ink-2 `#664C55` (7.3:1), ink-3 `#7E636C` (5.1:1 on paper, 4.7:1 on blush).
- Accent: sindoor `#A3182F` (hover `#86132A`, soft `#F6E0E0` for focus halos and selection); text on it `#FFF8F6`.
- Error `#B42318`. No gradients, no gold hairlines, no beige.
- The shared dropdown and date picker (`src/ui`) take their colours from `--ui-*` variables set on `body`.

Structure (no two sections built alike, alternating paper and blush):
1. Header: wordmark Nimtto + निम्तो, quiet text links, an outlined Order pill; a full-width menu sheet on phones.
2. Hero: headline and copy on the left, an arched doorway on the right holding a real design (phone still). On phones:
   headline, arch, then copy and buttons. Under the arch: the design name and two round buttons that crossfade
   between six designs; tapping the arch opens the lightbox.
3. The word: a centred dictionary entry on blush (निम्तो, nimtto, noun).
4. Designs: heading beside a lede, then a catalogue grid of stills with name and Nepali name below (3 columns on
   desktop, a wide card then two pairs on phones). 12 shown (11 on phones), then "Show all". Lightest designs lead
   unless the admin sets featured designs.
5. How it works on blush: two overlapping phone stills beside four steps numbered १-४.
6. Features: two white type specimens (a Bikram Sambat date, bilingual names), then a three-column list.
7. Pricing: a ruled price list; the highlighted plan sits on a blush row.
8. Order on blush: heading and next steps beside a white form panel; fresh marigold, roses and jasmine dress the top-left
   corner on desktop (never behind text).
9. Contact: नमस्ते and the heading beside the contact list (or a "Send a request" prompt when none is set).
10. Footer on blush: wordmark, credits, Credits link, Studio sign in.

Motion: one signature moment. Two blush door leaves meet in the hero arch with निम्तो written across the seam and an
inner arch line, ring handles and carved panels; after about a second they swing open (rotateY with perspective,
1.7 s, custom ease) and the design beneath settles from 1.06 to 1. It is pure CSS keyframes (runs without JS); JS only
holds it until the picture has decoded (at most 2.5 s) and removes the leaves afterwards. Everything else is quiet:
colour and opacity fades of 180-380 ms, a 2.5% image lift on hover, the lightbox rising 12px over 300 ms.
Reduced motion: no doors at all, the design is simply there. No scroll-driven motion and no parallax.

Business rules shown on the page: no live demo links or iframes (designs open a still lightbox with "Order this
design"); prices come from `/api/site` (`price: null` shows "Ask for price"); designs from `/api/themes` with the
static fallback in `src/site/themes.js`.

Copy: plain and specific. No "Elevate / Seamless / Unlock", no em-dash asides, no eyebrow-and-dot labels.
