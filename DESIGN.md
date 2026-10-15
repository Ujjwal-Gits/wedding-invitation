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

Feeling: a fashion-house catalogue for invitations. White, ink, one crimson. The colour and warmth come from the real
designs (phone screens and thumbnails), shown big, never from the chrome.

Fonts (self-hosted in `public/site/fonts/`, licences beside them):
- Display: Gambetta variable (Indian Type Foundry, ITF Free Font License), weight 400-500, upright only, tight tracking
  (-0.025 to -0.035em). Never italic.
- UI and body: Geist (OFL) 400-600, same as the studio.
- Nepali text: Mukta (OFL). Nepali display words (निम्तो, नमस्ते, dates): Noto Serif Devanagari 500 (OFL), with
  `locl` off so ८ never reads as ५.
- Banned here: Cormorant, Playfair, Bodoni, Pinyon, Great Vibes or any script; Inter/Roboto/system-ui as display.

Tokens (`src/site/site.css`): white `#FFFFFF`, mist `#F4F5F7` (alternate bands), mist-2 `#ECEEF1`, line `#E1E3E8`,
ink `#121116`, ink-2 `#45434C`, ink-3 `#66636E` (min. 5.3:1), crimson `#B3122F` (the only accent; hover
`#8E0E25`), on-dark `#F6F6F7` / `#B4B1BA` / `#8E8B96`, error `#B42318`. No beige or ivory, no gold hairlines, no
gradients.

Structure (no two sections built alike): hero with a pinned phone; a crimson dictionary band (निम्तो, noun); how it
works as a numbered list beside a sticky heading; designs as an index with a sticky picture (desktop) or a
wide-and-pair card rhythm (phone); features on ink as two type specimens plus a two-column list; pricing as a price
list; order form on mist; contact and footer on ink.

Motion: one signature moment only. In the hero a single phone stays pinned while six real designs slide up into
its screen as you scroll (transform/opacity, custom ease). Everything else is quiet: hover fades of 150-280 ms.
Reduced motion: no pinning; the buttons under the phone switch designs instantly.

Copy: plain and specific. No "Elevate / Seamless / Unlock", no em-dash asides, no eyebrow-and-dot labels.
