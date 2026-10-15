# Mix: theme, gate and first screen as separate choices

Contract for "mix". Read it before converting a theme. The pilot is in place:

- runtime: `src/core/mix.js` and `mix.css`;
- suite host: `src/themes/_suite/suite.js`;
- bespoke host: `src/themes/mala/main.js`;
- modules: `src/themes/laali/{gate,hero,parts}.js`, `src/themes/janti/{hero,parts}.js`, and the Mahal and Mangal gates.

## 1. What the couple chooses

| Choice | Meaning | Stored as |
|---|---|---|
| **Theme** (the body) | The page itself: every section after the first screen, the scroll engine, the URL `/<theme>/` | `theme` (unchanged) |
| **Gate** | The entry screen and its opening animation | `design.gate`: a theme slug |
| **First screen** (hero) | The screen right after the gate | `design.hero`: a theme slug |

- `design` sits next to `theme` in the invitation data: `design: { gate?: '<slug>', hero?: '<slug>' }`.
- An absent key, or the body theme's own slug, means "the theme's own". A page without `design` runs exactly as before.
- The page is always the body theme's page. The production gate (`server/lib/gate.js`: a published invitation opens only at `/<its theme>/`) is unchanged.
- Foreign gates and heroes are JS/CSS chunks under `/assets/` and art under `/themes/<slug>/`. Both are already public static files.

### Their own words, pictures and colours

These need no new storage:

- **Texts and images** stay in `themeContent[<slug>]`, where `<slug>` is the theme the part comes from. A Laali gate on a Mala page reads `themeContent.laali.texts['gate.line']`, and so on.
- **Colours** stay in `themeColors[<slug>]`. `mix.js` applies them inline on the part's wrapper, limited to the tokens that the part's manifest declares. `data.js` still applies the body theme's colours on `<body>`.

## 2. The compatibility manifest (`src/themes/<slug>/slots.js`, plain data)

```js
parts: {
  gate: true,              // gives its gate: src/themes/<slug>/gate.js exists and is approved
  hero: true,              // gives its first screen: hero.js
  hostGate: true,          // this page can take another theme's gate
  hostHero: true,          // this page can take another theme's first screen
  ownGateNeedsHero: true,  // its own opening reaches into its own hero (a FLIP, a see-through gate, a door inside the hero)
  why: { gate: '…', hero: '…', hostHero: '…' },   // one line for each "false" (shown in the studio as the reason)
  gateUses: { texts: ['gate.line', …], images: ['hero.ganesh'], colors: ['--su-accent', …] }, // what the gate shows: the studio edits exactly these
  heroUses: { texts: […], images: […], colors: […] },
}
```

Rules that the runtime (`designOf()`) and later the server enforce:

- A foreign gate needs `gate:true` on the giving theme and `hostGate:true` on the body theme. A foreign hero needs `hero:true` and `hostHero:true`.
- **Foreign hero + host's own gate.** If the host has `ownGateNeedsHero`, its built-in opening cannot run without its own hero. In that case its *own gate module* runs instead (Laali's own gate on a Laali page with Janti's hero). If the host has no gate module, the studio must make the couple pick a gate too. Without one, `designOf()` ignores the hero.
- The studio lists only valid combinations and shows `why` for the rest. `gateUses` and `heroUses` list the slot ids and colour tokens that the Opening module edits for the chosen part.

## 3. Runtime (`src/core/mix.js`)

```js
const mix = await createMix({ host: '<slug>', manifest, config });  // right after loadInvitation(), before rendering
mix.gate, mix.hero                    // chosen foreign slugs or null; both null → the host's code path is untouched
mix.mountHero(oldFirstSection)        // after the page markup exists; replaces it in place (keeps id="top")
mix.mountGate({ start, intro, finish })  // instead of the host's own gate; returns { open(withMusic), finish(), at(t), timeline() }
mix.heroEnter(tl, at)                 // the foreign hero's entrance, when the host's own gate opens onto it
mix.afterOpen()                       // the foreign hero's scroll-linked/ambient parts (idempotent)
```

- **Loading.** Modules are found with `import.meta.glob('../themes/*/gate.js')` and `hero.js`. They load lazily, and only the chosen ones load (each is its own chunk with its CSS). Fonts are added as one Google Fonts `<link>` per new family set. `createMix` waits for the CSS and fonts (capped at about 2.5 s), so the page renders once.
- **Override for trying combinations.** `?gate=<slug>&hero=<slug>` works on the Vite dev server, and in the studio preview (`preview=1` inside a same-origin frame). It never works on a guest's page.
- **Debug.** With `?debug`, `window.__mx` is set, and `__mx.gateRun.at(t)` / `.finish()` drive the mixed opening. The suite's `__su.at/finish` and Mala's `?debug&open` forward to it, so `?debug&open` (the studio's "skip the opening") works on mixed pages.

### 3.1 Gate module: `src/themes/<slug>/gate.js`

```js
export default {
  id: '<slug>', manifest, suite?: true,      // suite:true → wrapper also gets class `su` (suite.css structure + tokens)
  fonts: ['Alex+Brush', 'Mukta:wght@400;500;600'],   // Google Fonts css2 `family=` values
  ui?(ctx) → html,     // optional own line + buttons: one [data-mx-open], one [data-mx-quiet], box marked [data-mx-ui]
  mount(scene, ctx, root) → {
    ready?: Promise,   // images decoded, layout done → mix enables the buttons and adds .is-ready
    taps?: Element[],  // more tap targets that open with music (Laali's card, Mahal's bow)
    open(tl) → revealAt,   // the gate's OWN exit, added to tl from 0; returns when the neutral reveal starts
    destroy?(),        // listeners, rAF and canvas loops
  },
};
```

**Overlay.** The wrapper is `<div id="gate" class="mx-part mx-gate mx-gate--<slug> [su] theme-<slug>" role="dialog" aria-modal>`. It is `position: fixed; inset: 0; z-index: 30`, with `background: none`, so the module's scene paints the gate. It is appended to `<body>` over the host page. The host's own gate is not rendered (suite), or is removed (bespoke). This frees the ids `#gate` / `#open` / `#quiet`, which mix gives to the module's buttons. `live-preview.js` keeps working unchanged: it presses `#quiet`, sees `#gate` and the host's lock class.

**Hand-off.** All of it happens on one gsap timeline:

1. **Tap.** `host.start(withMusic)` runs synchronously inside the tap. It unlocks and starts the host's player and rings its bell. The module never touches audio.
2. **UI fades.** `.mx-ui` / `[data-mx-ui]` fade out at 0.
3. **Own exit.** `revealAt = module.open(tl)` adds the gate's own exit.
4. **Neutral reveal.** The wrapper goes `autoAlpha → 0` over 0.7 s, starting at `revealAt`.
5. **Hero entrance.** At `revealAt + 0.15`, either the foreign hero's `enter(tl, t)` or `host.intro(tl, t)` (the host's own hero entrance).
6. **Done.** On complete, the wrapper is removed, `destroy()` runs, then `host.finish()` (unlock scroll, Lenis, reveals), then `mix.afterOpen()`.

A safety timeout finishes the timeline if it is starved.

**Reduced motion** (or `?still`). `open()` is not called. The wrapper cross-fades out in 0.5 s and the hero does a plain fade.

**Studio preview.**

- The Opening module loads without `open`, so the closed foreign gate shows.
- "Play opening" presses `#quiet`.
- Every other module loads with `&debug&open`, which finishes the mixed opening instantly.

### 3.2 Hero module: `src/themes/<slug>/hero.js`

```js
export default {
  id, manifest, suite?, fonts,
  mount(section, ctx) → {
    enter?(tl, at) → wordsInAt,  // the entrance; must set its own closed state at mount (not visible behind the gate)
    after?(),                    // scroll-linked pieces (ScrollTrigger on `section`), ambient loops gated by IntersectionObserver
    destroy?(), cue?: false,     // cue:false → no standard scroll cue
  },
};
```

**Placement.**

- `mountHero(old)` builds `<section id="top" class="mx-part mx-hero mx-hero--<slug> [su] theme-<slug>">` and replaces the host's first section with it.
- The host's page continues with `old.nextElementSibling`. Mix gives that section an id if it has none, and adds a standard `.mx-cue#cue` that scrolls there through Lenis.
- The hero is a normal-flow section of at least `100svh`. **It must not pin itself.**

**Scroll engines.**

- Lenis is the host's (`getLenis()`).
- The hero's ScrollTriggers (e.g. Janti's procession walking on) are created in `after()`, which runs after the host has created Lenis. Its trigger is the section element, never `'#top'` selectors from the module's own theme.
- Host ScrollTriggers created after the hero mounts measure the new section, because suite `T.scroll` and Mala `setupScroll` run after `mountHero`. Mix calls `ScrollTrigger.refresh()` through the host's after-open.

**Suite hosts.**

- `T.page(ctx)` still renders the host's own hero first. `mountHero(#top)` then swaps it before `T.ready`.
- `ctx.parts` and the rest of the toolkit are untouched.
- A host whose `T.ready`, `T.ambient` or `T.scroll` assume their own hero must null-check it. Laali and Janti do. The survey (section 6) lists the rest.

### 3.3 What the host gives (adapter, about 20 lines per theme)

| Hook | Suite (`suite.js`, all 10 suite themes at once) | Bespoke (see `mala/main.js`) |
|---|---|---|
| `start(withMusic)` | `startMusic`: `player.unlock/start`, bell, `is-opening` | the head of its own `open()`: music, unlock classes, layout, smooth scroll |
| `intro(tl, at)` | `.su-in` stagger + cue, plus `T.heroIntro?(ctx, tl, at)` for hero pieces that its own gate motion would have brought in (Swayambar's garlands) | its own hero tweens, moved into a `heroIntro(tl, at)` that its own opening also calls at the original time |
| `finish()` | `afterOpen` | its after-open (or nothing) |
| debug | `__su.at/finish` → `__mx` | `?debug&open` → `mixGate.finish()` |

**Converting a host.**

- Move the host's own hero entrance into a function that both openings call.
- Its own opening calls it at the original time, so its own page stays byte-identical in behaviour.
- Guard every lookup of its gate and hero elements.

## 4. CSS isolation rules

The prefixes (`mg-`, `rj-`, `la-`, `jt-`, `su-` …) are not enough on their own. Five rules:

1. **Tokens on the wrapper.**
   - Each theme's token rule also matches its wrapper, for example `body.su.theme-laali, .mx-part.theme-laali { … }` and `body.theme-janti, .mx-part.theme-janti { … }`.
   - The suite's defaults are `body.su, :where(.mx-part).su`, kept at low specificity so the theme's own tokens always win, whatever order the CSS loads in.
   - The wrapper re-declares everything, so the host's tokens never leak in through inheritance.
   - `.mx-part` also resets inherited typography (font, colour, letter-spacing, transform).
2. **`.theme-<slug> X` rules work inside the wrapper.** The wrapper carries `theme-<slug>`, so a theme's own descendant rules apply to its part and to nothing else on the page. Only body-qualified rules (`body.theme-x …`) need the extra `.mx-part.theme-x` selector.
3. **No body state in parts.** A gate or hero must not depend on `body.is-open`, `body.is-opening`, `body.mg-locked` and the like. Mix puts `is-opening` and `is-ready` on the gate wrapper and `is-open` on the hero wrapper; module CSS uses `.mx-gate--x.is-opening` and similar. Visibility that is gated by body state must get a wrapper equivalent:
   - agni: `body:not(.is-open)`;
   - swayambar: `body.is-open .sw-hero__garls`;
   - rangoli: `body.su-locked …`.
4. **Hosts leak into shared classes.**
   - Suite hosts style shared classes through `.theme-<host> .su-btn`, `.su-gate__*`, `.su-cue`, `.su-hero`, `.su-lb`, and Janti's `.theme-janti .l-ne`. Those rules match a foreign part's descendants too.
   - Modules therefore never use the suite's gate or hero chrome (`su-gate*`, `su-btn`, `su-cue`, `su-hero`). They use mix's `mx-ui`, `mx-cue` and `mx-hero`, or their own classes.
   - `su-in`, `su-names`, `su-n`, `su-amp`, `su-ganesh` and `l-en`/`l-ne` are allowed: hosts style them only inside their own prefixed containers. Janti's `.theme-janti .l-ne` is the exception to fix in batch B2.
   - A module's mix-only CSS lives in `src/themes/<slug>/mix.css`. Its overrides of `.mx-part.su` defaults use two classes (`.mx-part.mx-hero--janti`).
5. **No ids inside modules.**
   - All 27 themes use `#gate`; 19 use `#top`, 15 `#open`, 16 `#quiet`, 14 `#cue`, plus `#stage`, `#card`, `#names`, `#light`, `#leafL` …
   - Modules use classes and element refs (`root.querySelector`). The only ids are `#gate`/`#open`/`#quiet` on the gate wrapper and `#top`/`#cue` on the hero wrapper, which the host has given up.
   - A theme's own page may keep its ids.

**Prefix clashes to keep in mind:**

- `mh-`: Mahal and Mehendi.
- `d-`: Dhoka and Durbar.
- `mg-`: Mangal, Mahal and Rajdwar, with 191 shared classes.

A Mehendi hero under a Mahal gate (or a Durbar part on a Dhoka page) needs scoping under `.theme-<slug>` first. Until then the studio must not offer those pairs.

**Global rules that must be scoped before the theme can host or give parts:**

- himal: `.is-in { …!important }`;
- mala: `.sr-only`;
- dhoka: `.is-intro`, `.is-static`;
- mandap: `#finale-root`, `.is-static`;
- sayapatri: `#main > section`;
- dhaka: `body.is-gated .hud`, `.reveal.is-in`;
- the unprefixed CSS of chitra (about 137 rules), dhaka (about 279) and ghar (about 243).

**Fonts.** Each module lists its Google families. A part that is missing its font falls back to the theme's stack, not to the host's.

**Performance.**

- Parts follow the same rules as the themes: animate transform and opacity only, no animated filter or backdrop-filter, no permanent will-change.
- Laali's hero hands its settled lanterns back to CSS (`clearProps`).
- Loops run only while on screen (IntersectionObserver).
- Canvases are capped for 3x-DPR phones.

## 5. Pilot results

Results are on the dev server; screenshots are in the session scratchpad under `mix/`.

| Combination | Result |
|---|---|
| mala + laali gate | ✅ The seal lifts and the blush paper thins onto Mala's hero. Then Mala's own hero entrance runs (grid settles, words stagger). |
| mala + laali gate + janti hero | ✅ The blush gate gives way to Janti's street. The procession walks in, the curtain rolls up, the words arrive, and Mala's page continues below (Families → Swayambar …). Checked on phone, on desktop and with reduced motion. |
| laali + janti hero | ✅ Laali's own gate runs as its module (its Ganesh FLIP needs Laali's own hero), then Janti's street. |
| swayambar + laali gate | ✅ Swayambar's garlands come down into place (`T.heroIntro`), then its words. |
| swayambar + mahal gate | see the "Mahal gate" note below |
| mangal + laali gate | see the "Mangal" note below |
| Own pages (mala, swayambar, laali, janti, mangal) | No design: pixel diffs of 0–0.7 %, all from animated garlands, flames and petals at capture time. |

## 6. Compatibility matrix (all 27 themes)

**Key:**

- **Gate** / **Hero**: can give it, with effort S / M / L.
- **pair**: the gate is the hero in its closed state, so it can only travel together with its own hero (see 6.1).
- **Host G** / **Host H**: can take a foreign gate / first screen.
- **with gate**: takes a foreign first screen only if a gate is chosen too, because its own opening is see-through.

| Theme | Gate | Hero | Host G | Host H | Visual risk / notes |
|---|---|---|---|---|---|
| laali | ✅ done | ✅ done | ✅ | ✅ (own gate module) | Light blush. Pairs well with ivory and red bodies. |
| janti | pair (M) | ✅ done | ✅ | with gate | Dark painted street. The hard edge into a light body is fine at the end of a hero. |
| mahal | pilot (L) | L (palace scene, fireworks, `sceneMap`) | adapter (M) | no (hero = inside of its own gate) | Night gate. Its exit should end on light, not on a balcony. |
| mangal | pilot (L) | L (doorway layout engine) | ✅ pilot adapter | later, via its gate module | The red doorway lives inside `#top`. |
| rajdwar | M (shares Mahal's gate code) | M–L | adapter (M) | via gate module | Copy of Mahal's gate on Mangal's card. Convert after Mahal. |
| swayambar | M (medallion FLIP is guarded) | S–M | ✅ | via gate module | Wine silk onto ivory. Hero garlands are hidden by `body.is-open` CSS. |
| hariyo | S | S | adapter (S): `ready`/`ambient` assume the hero | ✅ after guards | Light green. |
| mehendi | S–M (mandala builder) | S–M | adapter (S) | ✅ after guards | `mh-` clashes with Mahal: scope it first. |
| pardaa | S | M (`--pd-room` on `<html>`) | adapter (S) | ✅ after guards | Dark velvet curtains: a strong gate for light bodies. |
| agni | pair (no gate of its own) | M (`body:not(.is-open)` dimming) | adapter (S) | with gate | Night fire. |
| rangoli | pair (CSS-3D tilt of `#top`) | M | adapter | with gate | Dark courtyard. |
| sindoor | pair (the lid is the hero cover) | M | adapter (`thread()` reads `#top`) | with gate | White editorial. Its gate is just a hit area. |
| shree | pair (halo moved into the gate) | M | adapter (`ready` assumes the hero) | with gate | Plum and gold. |
| mala | M (canvas garland strands) | S | ✅ pilot | ✅ pilot | Lokta white. Global `.sr-only` to scope. |
| gurans | S | S | ✅ (native scroll, no Lenis) | ✅ | Photographic flower arch. Easiest donor and host. |
| sayapatri | S | S | ✅ (`?open` not debug-gated) | ✅ | Ivory marigold doorway. `#main > section` to scope. |
| jhyal | M (`layoutGate`, art.js) | S–M | adapter | ✅ | Carved window. Gate markup lives inside `#main`. |
| dhaka | M (drop the photo-clone FLIP) | M | adapter | no (gate flowers are the hero's) | About 279 unscoped rules to scope first. |
| dhoka | static S / 3D L | S (static) | adapter (`?debug&skip`) | ✅ | WebGL door. `d-` clashes with Durbar. |
| chitra | S–M (book cover) | no (page 1 of a pinned book) | adapter | no | About 137 unscoped rules. |
| kham | no (pair L: the envelope becomes the card) | no | adapter (`env.skip`) | no | Paper envelope. |
| nimantrana | no (pair L: the tri-fold is the hero) | no | ✅ (`finish`) | no | Green silk table. |
| himal | card only | L (WebGL dawn) | adapter | no | Dawn photo world. |
| bagaicha | no (3D camera intro) | no | adapter (`?station`) | no | A 2D gate ending on a 3D garden needs a hand-off to its camera intro. Mark it "looks odd" until it is tried. |
| durbar | no (3D) | no | adapter (`?station`) | no | Same as bagaicha. |
| mandap | no (3D crane) | no | adapter (`?debug&skip`) | no | Same as bagaicha. |
| ghar | no (film) | no | adapter (no skip path yet) | no | Black letterbox cinema: a foreign gate would end on a film. |

**Totals at the end of all batches:**

- **Gates:** 15 themes can give one on its own. 5 more can give it only as a pair with their hero (agni, janti, rangoli, sindoor, shree). 7 cannot (the 3D journeys, himal, kham, nimantrana).
- **Heroes:** 19 themes can give one.
- **Hosts:** 27 can take a foreign gate, though the 3D journeys (bagaicha, durbar, mandap, ghar, himal) need a check that it looks intentional. 15 can take a foreign first screen (5 of them only with a gate chosen).

### 6.1 Gates that cannot be separated from their own hero

**See-through gates:** agni, janti, rangoli, sindoor, shree. Their gate is their hero in a closed state.

- Proposal: offer them as a **pair** (`design.gate = design.hero = <slug>` on another body).
- The hero module exports `closed(section)` / `enter(tl, at)`. A thin gate module (`pair: true`) mounts only the UI and the wash (Janti's dusk, Agni's unlit night) as a transparent overlay above the foreign hero section that mix has already mounted. Its `open(tl)` lifts the wash and returns at once, and the hero's entrance does the rest.
- The studio shows such a gate only together with its own first screen ("Agni's opening scene").

**Gates that live inside the hero:** mangal, mahal, rajdwar, kham, nimantrana.

- Mangal, Mahal and Rajdwar get standalone gate modules. These end in a neutral reveal: the doorway fills the screen, warm light, a fade.
- Kham and Nimantrana fold into their own card, so they stay own-only. A pair is possible later (L).

**FLIP gates:** laali, swayambar, dhaka, dhoka.

- The module drops the FLIP: the Ganesh, medallion or photo floats up and fades instead.
- On the theme's own page, the FLIP stays.

## 7. Work split: remaining batches (no shared files; each batch owns whole theme folders)

**B0 (lead, first):** the shared files.

- `mix.js` pair mode, plus the `mix.js` hooks for `data.js`, live colours, `pick`, the studio and the server (section 8).
- Nobody else edits `src/core/mix.*` or `_suite/suite.js`.

**B1 (suite, clean gates):** hariyo, mehendi, pardaa, swayambar.

- Gate and hero modules.
- `T.heroIntro`.
- Null guards in `ready`, `ambient` and `scroll`.
- Scope `.mh-` under `.theme-mehendi`.

**B2 (suite, see-through pairs):** agni, rangoli, sindoor, shree, janti.

- Hero modules.
- Pair gates (once B0 has landed pair mode).
- Wrapper equivalents for body-state CSS.
- Janti `.l-ne` scoping.

**B3 (bespoke DOM, the easy ones):** gurans, sayapatri, jhyal, mala.

- Gate and hero modules.
- Host adapters (Mala's is done).
- Global-rule scoping (`.sr-only`, `#main > section`).

**B4 (bespoke 2.5D):** mahal (hero), rajdwar, dhaka, chitra, kham, nimantrana.

- Rajdwar gate from Mahal's gate parts.
- Host adapters.
- Scope dhaka and chitra CSS.

**B5 (3D and film):** bagaicha, durbar, mandap, ghar, himal, dhoka.

- Host adapters only (skip paths, hand-off to the camera intro).
- Dhoka's static gate and hero.
- Scope the global `.is-static`/`.is-in`/`#finale-root` rules.

**Every batch:**

- Before/after screenshots of the theme's own page (phone 390×844 DPR3, desktop 1440×900, and the opened state).
- One mixed combination on a suite host and one on Mala.
- Fill in `parts`, `gateUses` and `heroUses`.

## 8. Changes needed outside this phase

### `src/core/data.js`

Owned by core, and the live preview is being reworked. Four hooks:

1. **`nimtto:colors` for parts.** Accept an optional `theme: '<slug>'`. If it is the page's theme, set the colours on `body` as now. Otherwise set them on `.mx-part[data-mx="<slug>"]`, the same validation, only declared tokens.
2. **`design` is structural.** `normalisePreview` passes `design` through. It is already a top-level key and is listed as structural in PLATFORM.md, so the preview re-renders when it changes.
3. **Pick and focus.** `live-preview.js` click-to-edit should add `part: 'gate'|'hero'` and `theme: <data-mx>` when the click is inside `.mx-part`. The studio (`pick.js`) then resolves slot words against that theme's manifest and edits `themeContent[<that slug>]`. Section `gate` resolves to `#gate` and `hero` to `#top`; both already match.
4. **Preview override.** `mix.js` accepts `?gate=&hero=` with `preview=1` in a same-origin frame, so the studio can show a combination before saving it.

### Studio (`src/studio/**`)

**Opening module.** Three pickers:

- **Theme**: as now.
- **Gate**: themes with `parts.gate`, if the body has `hostGate`.
- **First screen**: themes with `parts.hero`, if the body has `hostHero`.

The pickers follow these rules:

- Disabled entries show `why`.
- A first screen on a `with gate` body requires a gate.
- A see-through theme's gate appears only as a pair.

**Fields.** Each chosen part shows its own fields:

- texts and images from `gateUses` / `heroUses`, stored in `themeContent[<part slug>]`;
- colours from `gateUses.colors`, stored in `themeColors[<part slug>]`.

**Thumbnails.** Static stills: `public/themes/<slug>/thumb-gate.webp` and `thumb-hero.webp` (to be shot).

### Server (describe only; not edited in this phase)

- **`server/lib/slots.js` `clean()`.** Pass `parts` through, sanitised: booleans; the `uses` lists filtered to declared ids and tokens; `why` strings of at most 200 characters. `/api/meta` then exposes it.
- **`server/lib/validate.js`.** Add `design: { gate?, hero? }` with these checks:
  - each value `isTheme()`;
  - the giving manifest has `parts.gate` / `parts.hero`;
  - the body theme has `hostGate` / `hostHero`;
  - a value equal to `theme` is dropped;
  - invalid values are dropped silently, like unknown slot ids;
  - the key is omitted when empty, so old data compares equal;
  - `themeContent` and `themeColors` already accept any theme key, so they need no change.
- **`server/lib/invitations.js`, client `PUT`.** A changed `design` needs `canChangeTheme`, and both slugs must be in `access.themes` (`'all'` or the list). Return 403 with a message, as for `theme`.
- **Public payload.** Include `design`.
- **`server/lib/gate.js`.** No change: the page is the body theme's, and the parts are public assets.
- **CSP.** No change: Google Fonts is already allowed for the theme pages.
