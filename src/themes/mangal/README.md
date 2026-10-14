# Mangal (मंगल) · the red-and-gold card, come alive

Page: `/mangal/` (demo) · `/mangal/?id=<invitation>` (studio data) · dev server on 5190.

## Concept
The classic sindoor-red and gold Nepali wedding card, built as a place you enter. Ivory handmade paper
sides, a wide carved doorway in oxblood and gold, a dense band of fresh flowers along the top edge
(marigolds, red and pink roses, white roses, hibiscus, jasmine, mango leaves) with marigold swags, brass
bells, two lit diyos on the threshold, a kalash with mango leaves and a coconut, a brass puja thaali
(sindoor, akshata rice, a folded dhoti, flowers) and a Palpali Dhaka band as the floor and the footer.
Not a tri-fold: one doorway, one red arched card behind it, then a layered scroll.

Palette: ivory paper `#F8F1E3`, ink `#2C0C09`, sindoor reds `#8C1018` / `#6A0A12`, gold as metal
(`#D4A24C`, text gold `#F4D896`, 7.6:1 on red). Type: **Rozha One** (शुभ विवाह in gold foil, ॐ),
**Laila** (Nepali names and headings), **Gloock** (Latin names and headings), **Mukta** (all reading text,
both scripts; dates always in Mukta). No script faces; Devanagari never tracked or uppercased.

## Art (no AI images)
- `art.js` draws everything ornamental as SVG at the exact pixel size it is shown: doorway frame (carved
  lintel rosettes, lozenge posts, spandrel lotuses, beaded rims), the two door leaves (lacquer, crown rays,
  gold-rimmed lattice panels, lotus bosses, brass studs, astragal), the panel's filigree border, brass bells,
  diyos (flame flickers gently, transform only), frame crowns (temple / round / scalloped), the Dhaka weave
  tile (pixel-woven), dividers, petals and the kalash swastika.
- `tools/decor.py` composes the raster decor offline into `public/themes/mangal/decor/`: the garlands
  (`garland-wide`, `garland-narrow`, `swag`), `kalash` and `thaali`. Flowers are the CC cut-outs from
  `public/themes/dhaka/flowers` (credited in `flora-credits.js` + `credits.json`); brass (lathe-rendered,
  after mala's tool), coconut, hibiscus, jasmine, rice, sindoor and cloth are procedural. It also writes
  `decor-meta.js` (how far the garland reaches, so text always sits below it).
  Run: `python src/themes/mangal/tools/decor.py .` (`garland` | `kalash` | `thaali` to redo one).
- `corner-tl/br` sprays are copied from mala's decor (same CC flowers), with hairy leaf edges eroded.
- Paper tile copied from mala.

## Signature motion: the doors open
Tap the brass latch (or "Open without music"): the plaque fades, the temple bell rings (with music),
the hanging bells sway, the two carved leaves unlatch and swing inward in 3D (`perspective` + `rotateY`,
1.3 s, `power3.inOut`, darkening as they turn), a few marigold and rose petals fall, and the red card
behind settles in: ॐ, the invocation, **शुभ विवाह**, निमन्त्रणा, the names, both dates (AD and B.S.;
B.S. first in Nepali) and the city. The doorway is computed per screen: wide on desktop (76% of the width,
up to 1240 px), full width on phones, always one screen, content shrunk-to-fit if needed. Transform and
opacity only; 60 fps measured on the GPU (median frame 16.7 ms).

## The scroll (GSAP ScrollTrigger, desktop only; phones and reduced motion get plain reveals)
Leaving the doorway, the garland parts left and right, bells lift, the kalash and thaali sink away.
Ornaments beside the content (`data-depth`) drift at their own depth; the paper-cut layers of the
families panel (`data-settle`) and the swags settle into place. Content panels rise once (no body-text
animation). Sections:
1. **The two of us**: one large photo under a temple-arch crown (kalash and a diyo beside it on desktop),
   a pair under round crowns, a row under scalloped crowns. Crowns sit above the photo: never cropped.
2. **Families**: layered gold/red paper-cut arch with a swag; bride's and groom's side, a brass bell
   between that answers once on arrival. Portraits only when both bride and groom photos exist.
3. **The card**: invocation shloka, the one line, hosts, "Read the full invitation" (modal via
   `openModal`, only the card scrolls), beside the puja thaali.
4. **The programme**: per ceremony a red arch date tile (B.S. day in Nepali), the name, AD + B.S. date
   lines, `timeLabel(e)`, venue + map, dress only if given, order of the day if given; add-to-calendar;
   travel/stays/contacts disclosure.
5. **Gallery**: whole photographs in gold mounts (couple slots first, then the gallery), lightbox.
6. **RSVP**: red ground, reply card on ivory paper; `core/rsvp.js` (same ids and JSON, honeypot, validation).
7. **Blessing**: closing line between two lit diyos, names, hashtag, Dhaka band, credits.

## Studio slots (`slots.js`)
Images: `couple.lead` (portrait 0), `couple.pair.1–2` (1–2), `couple.row.1–3` (3–5),
`families.bride` / `families.groom`, `gallery.1–6` (6–11). Repeats are skipped.
Texts: `gate.line`, `gate.open`, `gate.quiet`, `hero.symbol` (ॐ), `hero.invocation`, `hero.title`,
`hero.subtitle`, `kalash.mark` (`swastika`, any short text, or `-`), `couple.title`, `couple.line`,
`families.title/bride/groom/daughter/son`, `card.kicker`, `card.line`, `card.button`, `prog.kicker`,
`prog.title`, `prog.more`, `gallery.title`, `rsvp.title`, `rsvp.send`. Religious marks (ॐ, invocation,
swastika) turn off by typing `-`. Shared keys are set where the meaning matches.

## Debug
`?debug` exposes `window.__mg` (`open()`, `finish()`, `seek(deg)`, `to(selector)`, `layout()`);
`?debug&open` skips the doors; `?still` forces the reduced-motion path; `?lang=ne`.
