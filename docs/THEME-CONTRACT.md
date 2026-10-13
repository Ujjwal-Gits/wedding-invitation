# Theme contract — read this fully before writing code

We are building **8 premium Nepali wedding-invitation themes** plus a **studio dashboard**
in one Vite project at `D:\Wedding Cards`. Several agents work at the same time, so the
ownership rules below are strict.

The client's verdict on earlier work: "everything looks AI-generated, same image, same door,
same theme, too much text, no human value, content cropped, too few couple photos."
Every theme must answer that directly.

## 1. Ownership (do not touch anything you do not own)

- You own only the folders named in your brief, normally:
  - `<slug>/index.html` (the page; Vite auto-discovers every top-level folder with an index.html)
  - `src/themes/<slug>/**` (your JS, CSS, SVG, shaders, README)
  - `public/themes/<slug>/**` (your static assets, e.g. `thumb.jpg`, hand-made SVGs)
- **Read-only for you:** `src/core/**`, `src/config.js`, `src/photos.js`, `src/generated/**`,
  `public/photos/**`, `public/audio/**`, `vite.config.js`, `package.json`, `DESIGN.md`, other themes.
  If you need different behaviour from a core module, copy it into your theme folder and change the copy.
- Do not run `npm install`, `vite build`, or anything that writes outside your folders.
  Exception: the mandap agent owns `src/core/mandap3d.js`; the studio agent owns `server/**` and `studio/**`;
  the photo agent owns `art-src/**`, `docs/PHOTO-LIBRARY.md`, and new files in `public/photos/`.
- Dev server: run your own on your assigned port in the background:
  `npx vite --port <PORT> --strictPort` → open `http://localhost:<PORT>/<slug>/`.

## 2. Data (one format for all themes and the studio)

```js
import { loadInvitation } from '../../core/data.js';
const config = await loadInvitation(); // demo data, or the studio's data when ?id=<slug>
```
Shape (see `src/config.js` for the full demo):
- `couple.bride / couple.groom`: `name {en,ne}`, `fullName {en,ne}`, `parents {en,ne}`, `home {en,ne}`, `photo` (ref or null)
- `couple.portraits`: `[{ photo, alt }]` — the couple's own photos (first = hero). **Show the couple a lot.**
- `couple.hashtag`, `hosts {en,ne}`, `weddingDate` (ISO with +05:45), `weddingDateBS {en,ne}`, `city {en,ne}`
- `invitation`: `shloka {sa,en}`, `salutation`, `body`, `request`, `signoff` — the full card wording (long; show only on demand)
- `story`: `[{ year {en,ne}, text {en,ne} }]`
- `events`: `[{ id, title, blurb, start, end, venue, mapQuery, dress {colors[], text}, photo, rituals? }]`
- `saptapadi`: 7 × `{en, ne}`; `gallery`: `[{ photo, shape: land|port|sq, alt, caption? }]`
- `info`: `travel`, `stays[]`, `contacts[]`, `livestream`; `rsvp`: `endpoint`, `deadline`, `maxGuests`
- `music.tracks[]`, `closing {en,ne}`, `theme`, `share`

Photo references (`photo` fields): library slug string, uploaded object `{lg, sm, depth?, focal?}`, or URL.
Always resolve with `photoUrl(ref, 'lg'|'sm')`, `depthUrl(ref)`, `view(ref, extra)` from `src/photos.js`.
Uploaded photos have no depth map; the stage treats them as flat (works, just no parallax).

## 3. Shared modules you may use (read their source)

- `core/i18n.js`: `bi({en,ne})` (escaped bilingual spans), `biNodes`, `esc`, `dateOf`, `timeRange`, `shortDate`, `dayNum`, `mapUrl`, `neNum`, `initLang`
- `core/shell.js`: `mountShell({ chapters })` → `{ player, setChapter }` (HUD: language toggle, music pill + track sheet); `ringBell(ctx)`
- `core/audio.js`: player — call `player.unlock()` and `player.start(withMusic)` inside the entry tap
- `core/smooth.js`: `createSmooth()` (Lenis, native touch), `reducedMotion()`, `isMobile()`, `splitLines(el)` (headings only)
- `core/finale.js`: `renderFinale(root, { credits })` → gallery, guest info, countdown, RSVP, blessing, credits; `animateGallery`, `guestEvents()`
  You may restyle it via tokens, or build your own RSVP UI, but RSVP submission must go through `core/rsvp.js` logic or post the same JSON to `config.rsvp.endpoint`.
- `core/stage.js`: `PhotoStage` (WebGL depth-photo renderer with portal transitions and film grade), `PhotoView`
- `core/door.js`: `DoorView` (photo-textured 3D double door with portal), `core/tour.js`: `buildTour` (scroll-scrubbed room-to-room walk)
- `core/petals.js`: `createPetals` (3D petals/dust overlay), `core/mandap3d.js`: `MandapView` (3D mandap + figurines; owned by the mandap agent)
- `core/base.css`: tokens (`--bg --bg-2 --ink --ink-dim --accent --accent-2 --hair --paper --paper-ink --paper-dim --paper-accent --btn-bg --btn-ink --scrim --f-display --f-display-style --f-display-weight --f-names --f-names-style --names-scale --f-body --f-deva --f-deva-display --eyebrow-track`). Override them on your body class. Import it or write your own; the HUD/music sheet/finale styles live there.
- `credits` for the footer: `import credits from '../../generated/credits.json'` (required: photos are CC BY / CC BY-SA).

## 4. The bar

- **Real photography only** from `docs/PHOTO-LIBRARY.md`, the couple's uploads, or your own hand-made
  vector art/3D built in code. No AI-generated images. No CSS-drawn kitsch (clip-art envelopes, lanterns).
- **Very little text.** A guest should read at most ~15 words per screen: names, date, place, one line.
  The full card wording sits behind a "Read the invitation card" disclosure. No paragraphs on scenes.
- **Couple first.** Use the couple's photos in at least three prominent moments (hero, a portrait moment, gallery).
  Show uploaded portraits of bride and groom when present (`couple.bride.photo`, `couple.groom.photo`).
- **Nothing important cropped.** Check faces, doors, subjects at 1440×900, 1024×768, 390×844 and 360×740.
  Portrait photos on landscape screens go into frames/layouts that respect them; use focal points for `object-position`.
- **Distinct.** Your palette, typefaces, layout hierarchy, scroll behaviour and signature motion must be clearly
  different from every other theme (see the theme list in §6). Never reuse Pinyon Script, Cormorant + maroon/gold, or the
  dark-scrim-over-photo pattern unless your brief says so.
- **Premium and professional.** Restraint, generous space, precise typography, one signature motion.
  Transform/opacity animation only, 60fps, `prefers-reduced-motion` fallback, native touch momentum on phones.
- **Nepali, correctly.** Bilingual via `bi()`. Never letter-space or uppercase Devanagari. Correct ceremony names
  (जन्ती, स्वयम्बर, कन्यादान, सिन्दूर हाल्ने, सप्तपदी, प्रीतिभोज). Faceless figures only if you draw people.
- **Accessible and safe.** WCAG AA contrast, visible focus, keyboard reachable, alt text. Never put config or guest
  strings into innerHTML unescaped (use `bi`/`esc`/textContent).
- Fonts: Google Fonts only; never Inter, Roboto, Open Sans or system-ui as a display face.

## 5. Verify like a picky art director

Use Python Playwright (installed) to screenshot your page at the four sizes, at the entry gate and at every
section, then **look at every screenshot with the Read tool** and fix what is weak. Headless Chromium uses
software WebGL (`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`), which is slow, so
time-based animations jump; add a `?debug` hook that exposes state so you can set scenes directly.
Iterate until the work is genuinely premium. Then save a 1200×900 screenshot of your best moment as
`public/themes/<slug>/thumb.jpg` and write `src/themes/<slug>/README.md` (concept, signature motion,
sections, what the studio needs to supply). Report what you built, what you verified and any known gaps.

## 6. The eight themes (for distinctness)

| slug | concept |
|---|---|
| dhoka | Ivory Press: light printed-card editorial; golden 3D door opening |
| ghar | Lamplight Cinema: dark film walk through a Newar house |
| sayapatri | Haldi Daylight: bright marigold journey with 3D petals |
| chitra | Illustrated storybook with faceless 2D characters in Nepali dress (Mithila-inspired) |
| mandap | 3D night diorama: mandap, figurines walking seven rounds of the fire |
| bagaicha | 3D garden destination venue: pillared pavilion, waterfall, lanterns, 2D paper-cut couple |
| dhaka | Dhaka Modern: graphic, kinetic typography, generative Dhaka weave, photo collage |
| himal | Himalayan minimal luxury: calm, photo-led, couple-forward, mountain dawn |

## 7. Latest client feedback (applies to every theme)

- "Everything is zoomed in only, nothing like proper scrolling." Do not build a theme around zooming into
  single photos. Use real scroll storytelling: pinned scenes, layered parallax, horizontal sequences,
  sticky photo stacks, reveals, space you move *through*.
- "Do not need the marigold flower." Marigolds are small accents at most. Every theme must reflect the
  marriage itself: the couple, hands joining, the garland exchange, sindoor, the seven rounds, the families.
- Characters must be beautiful and realistic for their style (no blocky primitives). 3D people should be
  properly modelled rigged models (CC0 sources) dressed in Nepali attire; 2D people must look professionally illustrated.
- Far more couple photos, nothing important cropped, very little text.

- Never use `couple-8`, `couple-3`, `bride-2`, `bride-4` (real private weddings, no model release). Prefer hands-only shots and the designer model shoots (`bride-1/5/6/7/10`).

## 8. Client review (round 2) — fix these in every theme

1. **No cropping.** Nothing may run off-screen or be cut by a frame: names (especially the Nepali/Devanagari
   version, which is wider/taller) must fit the viewport at 1440, 1024, 390 and 360 widths; photos keep their
   proportions (no arch/round masks that cut faces or subjects; no carousels that show half-cut photos at rest on
   phones — at rest one photo is fully visible, or use a grid). Check both languages.
2. **No beige / cream / ivory / sand grounds.** The client calls them "the AI colour". Use crisp white (#FFFFFF)
   or a confident, rich colour field (deep oxblood, indigo, emerald, ink, turmeric…) with precise contrast.
   Paper texture is fine only on white. Pick a palette that feels expensive and intentional.
3. **Titles and captions must not imply the wedding already happened.** This is an invitation sent before the
   wedding. No "memories", "our story in pictures", "the ring exchange" as if it were the couple's photo, no past
   tense. Use neutral or forward-looking wording ("The two of us", "Soon", "Join us", ceremony names as what is
   coming). Library detail photos get no narrative captions at all.
4. **Couple first, not mehendi details.** Hero, portrait moments and galleries lead with the couple's photos;
   mehendi-hand / ritual close-ups are supporting accents only.
5. More beautiful to read: generous line-height, real hierarchy, comfortable measure, no cramped labels.

## 9. Everything replaceable from the studio (required)

The client must be able to change **every image and every visible text** of every theme from the dashboard.

1. Create `src/themes/<slug>/slots.js` — a plain-data manifest (no imports; the server loads it) as documented at the
   top of `src/core/slots.js`. List every image the theme shows and every visible text that is not already invitation
   data (names, parents, dates, venues, events, vows, card wording, story, gallery come from `config` and are edited
   in the studio's normal sections). Use stable dotted ids (`gate.door`, `rites.swayambar.photo`, `hero.line`), clear
   human labels, `kind` (`couple|bride|groom|scene|detail`), sensible defaults, `max` length for texts, and a `note`
   with the recommended orientation/subject for images.
2. Read them only through `const { img, txt, alt } = useSlots(manifest)` from `src/core/slots.js`; no hard-coded photo
   slugs or display strings left in the theme (UI chrome like "Open map" may stay as i18n strings in code).
3. **Couple photos where the couple is shown.** Any place that depicts the couple, bride or groom uses a
   `couple|bride|groom` slot (defaults `{ portrait: n }`), never a library photo of other people. Library photos only
   for places, architecture and details.
4. Text slots are bilingual `{ en, ne }`; render with `bi(txt(id))`.
5. Mention the slot list in your README. The studio reads all manifests via `import.meta.glob('../themes/*/slots.js')`.

## 10. Content survives a theme change + modal scrolling (required)

- **Shared slots.** `src/core/slot-vocab.js` lists shared keys (`place.entrance`, `rite.sindoor`, `rite.sindoor.line`,
  `gate.line`, `couple.title`, …). In your `slots.js`, add `shared: '<key>'` to every image/text entry whose meaning
  matches a shared key. `useSlots` reads `config.content` for shared keys, so content entered once appears in the same
  place in every theme. Theme-only entries keep working via `config.themeContent[theme]`.
- **Couple photos are always the shared pool** (`config.couple.portraits`, `bride.photo`, `groom.photo`): couple/bride/groom
  slots default to `{ portrait: n }`; never put a library person in them.
- **Modals must not scroll the page.** Any dialog/overlay you open (invitation card, lightbox, menus) must use
  `openModal(el, { scroller })` from `src/core/modal.js` (or `lockScroll`/`unlockScroll`), and mark it `data-lenis-prevent`.
  Test: open the card, wheel/swipe inside it — only the card scrolls, the page behind stays still; close returns to the
  same scroll position.
- **Look at every screenshot you take**, describe to yourself what is wrong (crop, overlap, contrast, fake motion, broken
  joints, cheap-looking geometry) and fix it before reporting.

## 11. Client round 3 — readability, calm, marriage-first (overrides earlier style rules)

Reference images are in `refs/` (look at them): clean, quiet luxury — textured paper envelopes with a wax seal,
embossed/pearl botanicals, one gold or sindoor accent, generous space, very little text, nothing flashy.

**Readability is the #1 complaint across all themes.** Fix it before anything else:
- Body text: English ≥ 17px desktop / 16px phone, line-height ≥ 1.55; Nepali (Devanagari) ≥ 18px / 17px,
  line-height ≥ 1.75. Labels/eyebrows ≥ 12px English, ≥ 14px Nepali. Measure 45–70ch.
- Contrast: body ≥ 7:1 where possible, never below 4.5:1 (check text over photos with a real scrim/panel).
- **No script faces** (Pinyon etc.) for anything except, at most, a large monogram. Couple names must be set in a
  legible serif or sans and read instantly in both languages.
- **No hairline didones** (thin Bodoni) below 32px; avoid ultra-light weights for reading text.
- Devanagari fonts: Unicode only, OFL (Google Fonts). Display: Tiro Devanagari Hindi, Noto Serif Devanagari,
  Laila, Rozha One, Sura (Eczar, Kurale and Amita are BANNED: they render र्य as र्‍य, wrong for Nepali). Body: Mukta, Noto Sans Devanagari,
  Noto Serif Devanagari, Martel. (Hind is banned for Nepali: it draws Devanagari digits as Latin numerals.) Never letter-space or uppercase Devanagari. Test every Nepali screen.
  (The anepali.com "Durga Lal Shrestha" font is Preeti-encoded and unlicensed for web — do not use.)
- **"When is what" must be instantly clear.** Every theme has one calm, scannable programme: per ceremony —
  name (large), weekday + date (AD and B.S.), time, venue with a map link, dress note. One glance = the guest knows
  where to be and when. No text-heavy screens.

**Colour:** warm ivory *textured paper* (like the references) is allowed again when it has real paper/emboss texture
and high-contrast ink. Flat, muddy beige backgrounds are still not allowed.

**Daytime and realism:** no dark/horror moods for ceremonies; ceremonies are bright and warm (morning/golden hour).
3D must look real (PBR materials, real textures, soft daylight, realistic vegetation); 2D characters must have
every joint connected in every frame.

## 12. B.S. dates — use the shared converter

`bsDateOf(iso, event.dateBS)` from `src/core/i18n.js` returns the verified Bikram Sambat date in Nepal time:
`{ en: 'Friday, 29 Magh 2083 B.S.', ne: 'वि.सं. २०८३ माघ २९ गते, शुक्रबार', short: { en, ne } }`
(library: nepali-date-converter, MIT). Show it for **every** ceremony next to the AD date. An event's optional
`dateBS` override wins (for families matching their priest's patro). Do not hand-compute B.S. dates.
