# Mix: theme, gate and first screen as separate choices

Contract for "mix". Read it before changing a gate, a first screen or a host. All 27 themes are done (section 6):

- runtime: `src/core/mix.js` and `mix.css`; the rules: `src/core/mix-rules.js` (shared with the studio and the server);
- suite host: `src/themes/_suite/suite.js` (all suite themes at once);
- bespoke hosts: each theme's `main.js` (Mala's was the pilot);
- modules: `src/themes/<slug>/gate.js` and `hero.js`, built from the same `parts.js` as the theme's own page, plus a
  `mix.css` for what only the borrowed part needs.

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
- **`?open` is a debug switch.** Every theme skips its opening on `?open` only together with `?debug` (the studio's
  preview always sends `&debug&open&skip&station`). A guest's link with `?open` still shows the gate.
- **Credits.** `mix.credits` lists the third-party art the borrowed parts show (section 3.4).

### 3.1 Gate module: `src/themes/<slug>/gate.js`

```js
export default {
  id: '<slug>', manifest, suite?: true,      // suite:true → wrapper also gets class `su` (suite.css structure + tokens)
  fonts: ['Alex+Brush', 'Mukta:wght@400;500;600'],   // Google Fonts css2 `family=` values
  credits?: [ … ],     // the third-party art it shows (section 3.4): its theme's flora-credits list
  ui?(ctx) → html,     // optional own line + buttons: one [data-mx-open], one [data-mx-quiet], box marked [data-mx-ui]
                       // ui: () => '' = the scene itself carries the words and buttons (see below)
  mount(scene, ctx, root) → {
    ready?: Promise,   // images decoded, layout done → mix enables the buttons and adds .is-ready
    taps?: Element[],  // more tap targets that open with music (Laali's card, Mahal's bow)
    open(tl) → revealAt,   // the gate's OWN exit, added to tl from 0; returns when the neutral reveal starts
    destroy?(),        // listeners, rAF and canvas loops
  },
};
```

**`ui`.** Without `ui`, mix adds its standard `.mx-ui` (line and two buttons) and marks the scene `aria-hidden`. With
`ui`, the scene stays readable. `ui: () => ''` means "my words and buttons are inside my scene": Gurans' welcome
board, Jhyal's window, Mala's card, Sayapatri's card, Mangal's doorway and Dhoka's right-hand column render
`[data-mx-open]` / `[data-mx-quiet]` / `[data-mx-ui]` from the shared `gateHtml` (which gives the own page its ids
instead).

**Host's dusk (`--mx-dusk`).** A see-through gate (Mahal's bars) shows the host page round its doorway. A host whose
first screen would look wrong there may set `--mx-dusk: <colour>` on its `<body>` (Mangal: `#160204`); Mahal's gate
then adds `.is-dusk` and paints the surroundings in that colour, the host's first screen glowing beyond.

**Overlay.** The wrapper is `<div id="gate" class="mx-part mx-gate mx-gate--<slug> [su] theme-<slug>" role="dialog" aria-modal>`. It is `position: fixed; inset: 0; z-index: 30`, with `background: none`, so the module's scene paints the gate. It is appended to `<body>` over the host page. The host's own gate is not rendered (suite), or is removed (bespoke). This frees the ids `#gate` / `#open` / `#quiet`, which mix gives to the module's buttons. `live-preview.js` keeps working unchanged: it presses `#quiet`, sees `#gate` and the host's lock class.

**Hand-off.** All of it happens on one gsap timeline:

1. **Tap.** `host.start(withMusic)` runs synchronously inside the tap. It unlocks and starts the host's player and rings its bell. The module never touches audio.
2. **UI fades.** `.mx-ui` / `[data-mx-ui]` fade out at 0.
3. **Own exit.** `revealAt = module.open(tl)` adds the gate's own exit.
4. **Neutral reveal.** The wrapper goes `autoAlpha → 0` over 0.7 s, starting at `revealAt` (an opening scene: see below).
5. **Hero entrance.** At `revealAt + 0.15`, either the foreign hero's `enter(tl, t)` or `host.intro(tl, t)` (the host's own hero entrance).
6. **Done.** On complete, the wrapper is removed, `destroy()` runs, then `host.finish()` (unlock scroll, Lenis, reveals), then `mix.afterOpen()`.

A safety timeout finishes the timeline if it is starved.

**Opening scenes (pair gates).** The wrapper also gets `mx-gate--pair`, and `<html data-mx-pair="<slug>">`. `mix.css`
keeps `.mx-hero` visible under it (hosts hide `#main` while gated: `body.is-gated #main`) and holds the hero's
`.mx-cue` at 0 until the hero is open. The neutral fade starts at `max(revealAt, end of the module's own exit − 0.7 s)`,
so a wash that clears in its own time is not cut short (Janti's dusk lifts over 1.6 s: the fade runs 1.05–1.75 s,
not 0.35–1.05 s). The hero's entrance still starts at `revealAt + 0.15` (Agni 0.9, Janti 0.5, the others 0.15).
Pair gates have no "without its hero" fallback: mix-rules only offers them with their own first screen, every host
mounts the hero before the gate, and `ctx.hero` is always set.

**Host ready.** `mountGate({ …, ready })`: a host may pass a Promise (the 3D scene loading: Bagaicha, Durbar, Mandap).
The gate's buttons stay disabled until both the module's `ready` and the host's have settled. The host's wait is capped
at 12 s; after that an early tap still works and the host holds the timeline on the gate's last frame until its scene is
ready, as before.

**Preloads.** A host's `index.html` may preload its own gate art (Gurans' arch). Under a foreign gate, `mountGate`
claims those preloads from the cache (an `Image` with the same URL or `imagesrcset`, no new request), so the browser
does not warn. A preload must name the same candidates as its `<img>` (`imagesrcset` + `imagesizes`): Gurans' used to
preload the `-sm` arch while the `<img>` chose the full one, downloading both on its own page.

**Reduced motion** (or `?still`). `open()` is not called. The wrapper cross-fades out in 0.5 s and the hero does a plain fade.
This includes a suite host's own gate opening onto a foreign first screen: `suite.js` calls `heroIntro(tl, 0.3)`,
which runs `mix.heroEnter` (a foreign hero) or the host's own word fades (its own hero).

**Studio preview.**

- The Opening module loads without `open`, so the closed foreign gate shows.
- "Play opening" presses `#quiet`.
- Every other module loads with `&debug&open`, which finishes the mixed opening instantly.

### 3.2 Hero module: `src/themes/<slug>/hero.js`

```js
export default {
  id, manifest, suite?, fonts,
  mount(section, ctx) → {
    enter?(tl, at) → wordsInAt,  // the entrance; must set its own closed state at mount (not visible behind the gate:
                                 // Mahal's gate is see-through, so e.g. Laali hides its words and Ganesh in mount())
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

### 3.4 Credits of borrowed art

Several parts show cut-out photographs under CC BY / CC BY-SA (Dhaka's roses, the Mangal / Mahal / Gurans / Mala /
Jhyal / Sayapatri flowers and leaves). Each theme lists them in its credits file (`flora-credits.js|json`, Dhaka's
`FLOWER_CREDITS` in `flowers.js`), which the public `/credits/` page reads through `src/core/asset-credits.js`.

- **The part declares them.** A gate or hero module that shows such art sets `credits` to that same list (one source).
  Today: the gates and heroes of dhaka, gurans, jhyal, mala, mahal, mangal and sayapatri.
- **Mix adds them to the host's.** `createMix` merges the chosen modules' lists into `mix.credits`: one row per
  source, `{ title, author, license, licenseUrl, sourceUrl, from: [{ theme, part }] }`. A host that lists credits on
  its page appends these rows to its own list.
- **Where guests see them.** By the owner's rule no invitation lists asset credits on the page; every theme's art is
  credited on `/credits/` (linked from the showroom), whatever page it travels to. So a borrowed part is credited
  exactly where its own theme's page is credited. If invitations ever show credits (a footer line, the made-with
  link), they must include `mix.credits`.

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
   - `su-in`, `su-names`, `su-n`, `su-amp`, `su-ganesh` and `l-en`/`l-ne` are allowed: hosts style them only inside their own prefixed containers. Janti's `.theme-janti .l-ne` was the exception (scoped in B2).
   - A module's mix-only CSS lives in `src/themes/<slug>/mix.css`. Its overrides of `.mx-part.su` defaults use two classes (`.mx-part.mx-hero--janti`).
5. **No ids inside modules.**
   - All 27 themes use `#gate`; 19 use `#top`, 15 `#open`, 16 `#quiet`, 14 `#cue`, plus `#stage`, `#card`, `#names`, `#light`, `#leafL` …
   - Modules use classes and element refs (`root.querySelector`). The only ids are `#gate`/`#open`/`#quiet` on the gate wrapper and `#top`/`#cue` on the hero wrapper, which the host has given up.
   - A theme's own page may keep its ids.

**Prefixes (all clashes resolved):**

| Prefix | Theme | Note |
|---|---|---|
| `mh-` | Mahal's gate and balcony (its gate and hero modules) | |
| `mhb-` | Mahal's body (the sections after the balcony) | was `mg-`, shared with Mangal |
| `md-` | Mehendi | was `mh-`, clashed with Mahal |
| `mg-` | Mangal (and Rajdwar, which is Mangal's page and never mixes) | |
| `d-` | Durbar | |
| `dh-` | Dhoka | was `d-`, clashed with Durbar |
| `dk-` | Dhaka's own classes; its older unprefixed ones are scoped (below) | |
| `sp-` | Sayapatri | `.fl` is Dhaka's: Sayapatri's modules use `.sp-fl` |

**Scoping lesson.** Prefixes are not enough: a host's descendant rules (`.theme-dhaka .label`, `.theme-x .l-ne`,
unprefixed `.paper`, `.btn-line`) also match inside a foreign part on that page, and a part's own rules must not
reach the host. The fix that keeps every own page identical:

- Put the theme on the subject: `.label` → `.theme-dhaka .label`.
- Append `:where(:not(.mx-part:not(.theme-<slug>) *))` to the subject of every selector of a host stylesheet that
  could match inside a foreign part. `:where()` adds no specificity and the source order is unchanged, so the own
  page computes exactly the same styles, and nothing inside another theme's `.mx-part` matches. Done with a postcss
  pass for chitra, dhaka, dhoka, durbar, ghar, gurans, hariyo, himal, janti, kham, mala, sayapatri and shree.
- Body-state rules (`body.is-gated #main > :not(.welcome)`) get the same suffix, so a foreign hero under a host's gate
  is not hidden by the host's own "hide the page" rule.
- Global rules that are scoped this way: himal `.is-in`, mala `.sr-only`, dhoka `.is-intro`/`.is-static`, mandap
  `#finale-root`/`.is-static`, sayapatri `#main > section`, dhaka `body.is-gated .hud`/`.reveal.is-in`, and the
  unprefixed CSS of chitra, dhaka and ghar.

**`nepali.css` order.** The suite's Nepali kit (`_suite/nepali.css`) sizes shared ornaments; a theme's own CSS
overrides some of them at the same specificity. On the own page `nepali.css` loads first (through `nepali.js`), so a
hero module must import `'../_suite/nepali.css'` **before** its theme's CSS (`pardaa/hero.js`: the lamp sizes), or the
kit wins the tie and the part looks different from the own page.

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

## 6. Compatibility matrix (all 27 themes, as built)

The source of truth is each theme's `parts` block in `slots.js`, normalised by `mix-rules.js` (`/api/meta` shows it).

**Key:**

- **Gate** / **Hero**: gives it (✅), only as an opening scene with its own first screen (**pair**, see 6.1), or not.
- **Host G** / **Host H**: takes another theme's gate / first screen.
- **own gate**: with a foreign first screen, its own opening runs as its gate module (`ownGateNeedsHero` + a gate).
- **with gate**: takes a foreign first screen only if a foreign gate is chosen too (its own opening is see-through).

| Theme | Gate | Hero | Host G | Host H | Notes |
|---|---|---|---|---|---|
| laali | ✅ | ✅ | ✅ | ✅ own gate | Light blush. The module drops the Ganesh FLIP (it floats up and fades); the own page keeps it. Its hero hides its words and Ganesh at mount (see-through gates). |
| janti | pair | ✅ | ✅ | with gate | Dark painted street at dusk. The opening scene lifts the dusk; the procession walks in. |
| mahal | ✅ | ✅ | ✅ | ✅ own gate | `mh-` gate and balcony (the balcony is a Canva painting), `mhb-` body. The gate is see-through: the host shows through its bars (`--mx-dusk`). |
| mangal | ✅ | ✅ | ✅ | ✅ own gate | Red doorway gate and red card first screen. Sets `--mx-dusk` for see-through gates. |
| rajdwar | no | no | no | no | Mangal's page with Mahal's gate: couples choose Mangal + Mahal's gate instead. |
| swayambar | ✅ | ✅ | ✅ | ✅ own gate | Wine silk onto ivory. The module drops the medallion FLIP. `T.heroIntro` brings its garlands down after a foreign gate. |
| hariyo | ✅ | ✅ | ✅ | ✅ | Light green. Its own suite gate opens onto any first screen. |
| mehendi | ✅ | ✅ | ✅ | ✅ | `md-` (was `mh-`). |
| pardaa | ✅ | ✅ | ✅ | ✅ | Dark velvet curtains: a strong gate for light bodies. `--pd-room` lives on the hero wrapper. |
| agni | pair | ✅ | ✅ | with gate | Night fire: the ember drops from the button and lights the logs. |
| rangoli | pair | ✅ | ✅ | with gate | Dark courtyard: the camera tilts down onto the rangoli. |
| sindoor | pair | ✅ | ✅ | with gate | White editorial: the lid lifts off the cover. |
| shree | pair | ✅ | ✅ | with gate | Plum and gold: the gate's lotus is the hero's halo, lifted. Reduced motion: a still lotus. |
| mala | ✅ | ✅ | ✅ | ✅ | Lokta white, canvas garland strands. Skips its gate WebGL when another gate is used. |
| gurans | ✅ | ✅ | ✅ | ✅ | Photographic flower arch (Phoolbari). Native scroll. Preloads its arch (claimed under a foreign gate). |
| sayapatri | ✅ | ✅ | ✅ | ✅ | Ivory marigold doorway. `.sp-fl` in modules (`.fl` is Dhaka's). `?open` only with `?debug`. |
| jhyal | ✅ | ✅ | ✅ | ✅ | Carved window. The gate's words sit above the window and its buttons below. |
| dhaka | ✅ | ✅ | ✅ | ✅ own gate | Envelope among real flowers (CC BY-SA roses: credits travel). The module drops the photo FLIP. Fully scoped. |
| dhoka | ✅ | ✅ | ✅ | ✅ own gate | The module is a light CSS door (no WebGL); the own page keeps the 3D door. `dh-` (was `d-`). |
| chitra | ✅ | no | ✅ | no | Book cover gate. Its first screen is page 1 of the pinned book. Fully scoped. |
| kham | no | ✅ | ✅ | with gate | Its envelope opens into its own card, so the envelope stays own-only; the unfolding card travels as a first screen. |
| nimantrana | no | no | ✅ | no | Green silk table: the tri-fold cover and the card are one piece. |
| himal | no | no | ✅ | no | A foreign gate fades onto the moving dawn. |
| bagaicha | no | no | ✅ | no | A foreign gate fades into the camera's walk into the garden (`ready`: buttons wait for the 3D). |
| durbar | no | no | ✅ | no | A foreign gate fades into the glide through the lion gate (`ready`). |
| mandap | no | no | ✅ | no | A foreign gate fades into the crane down to the mandap (`ready`). |
| ghar | no | no | ✅ | no | A foreign gate fades onto the film. |

**Totals:**

- **Gates:** 14 themes give one on its own; 5 give it only as an opening scene (agni, janti, rangoli, sindoor,
  shree); 8 do not (rajdwar, kham, nimantrana, himal, bagaicha, durbar, mandap, ghar).
- **First screens:** 19 themes give one.
- **Hosts:** 26 take a foreign gate (all but rajdwar). 19 take a foreign first screen; 6 of them only with a foreign
  gate too (agni, janti, rangoli, sindoor, shree, kham); 6 run their own gate as a module before it (laali, mahal,
  mangal, swayambar, dhaka, dhoka).

### 6.1 Gates that cannot be separated from their own hero

**See-through gates (opening scenes):** agni, janti, rangoli, sindoor, shree. Their gate is their first screen in a
closed state (a wash, an unlit night, a lid).

- They travel as a **pair**: `design.gate = design.hero = <slug>` on another body. `mix-rules.js` normalises their
  gate to `'pair'` and drops it without its own first screen; the studio shows it as "Opening scene".
- The gate module (`pair: true`) mounts only its words, buttons and wash over the hero section that mix has already
  mounted (`ctx.hero`). Its `open(tl)` lifts the wash; the hero's `enter()` does the rest. Timing: section 3.1.

**Gates that live inside the hero:**

- Mangal and Mahal got standalone gate modules ending in a neutral reveal; their own pages keep the original.
- Rajdwar is Mangal's page with Mahal's gate, so it does not mix: the same result is Mangal + Mahal's gate.
- Kham: the envelope opens into its own card, so the envelope stays on Kham's page; the card is given as a first
  screen (`kham/hero.js`).
- Nimantrana: the tri-fold cover and the card are one piece: own-only (a pair is possible later).

**FLIP gates:** laali, swayambar, dhaka. The module drops the FLIP (the Ganesh, medallion or photo floats up and
fades); the own page keeps it. Dhoka's module is a static CSS door; its own page keeps the WebGL door.

## 7. Done

All batches (B0 shared files, B1 clean suite gates, B2 opening scenes, B3 bespoke DOM, B4 Mahal / Mangal and the
2.5D themes, B5 3D and film) are merged, followed by the integration pass (pair visibility in `mix.css`, pair timing,
credits, host `ready`, preload claiming, the suite's reduced-motion hand-off, the debug-only `?open`).

When adding a theme:

- Fill in `parts`, `gateUses` and `heroUses`, with a couple-friendly `why` for every "no".
- Build `gate.js` / `hero.js` from the theme's own `parts.js`; keep the own page's behaviour identical.
- Scope its CSS (section 4) and give `credits` if it shows third-party art.
- Shoot `public/themes/<slug>/gate.jpg` and `hero.jpg` (480×720, phone shots of the own page closed and open).
- Check the own page (phone 390×844 DPR 3, desktop 1440×900, opened), one mix on a suite host and one on a bespoke host.

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

**Thumbnails.** Static stills: `public/themes/<slug>/gate.jpg` and `hero.jpg` (B0; `thumb.jpg` until shot).

### B0 landed (shared files)

- **Rules in one place:** `src/core/mix-rules.js` (`normParts`, `resolveDesign`, `cleanDesign`, `OPENING_SCENES`), used by
  `mix.js` `designOf()`, the server validator and the studio. A see-through theme's gate is normalised to `gate: 'pair'`
  (an opening scene), whatever its manifest says, and its gate module sets `pair: true`; mix gives a pair gate
  `ctx.pair = true`, `ctx.hero` (the mounted hero section) and the wrapper class `mx-gate--pair`.
- **Server:** `/api/meta` themes carry `parts` (sanitised, `gate`/`hero` only while `gate.js`/`hero.js` exist) and `stills`.
  `design` is validated, permission-checked for couples and included in the public payload (see API.md).
- **Preview:** `nimtto:colors` takes `theme` (applied on `.mx-part[data-mx=<slug>]`); picks carry `part` and `theme`; a
  `design` change re-renders the preview.
- **Studio:** Opening shows Design / Gate / First screen pickers, then a card per borrowed part with its `gateUses` /
  `heroUses` words, pictures and colours. Stills: `public/themes/<slug>/gate.jpg` and `hero.jpg` (phone shots of the theme's
  own page, closed and opened); `thumb.jpg` until a theme has them.

### Server (as specified before B0; done)

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
