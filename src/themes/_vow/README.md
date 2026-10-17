# Vow: the international designs' engine

English-first, faith-neutral invitations for any venue time zone and any occasion (`market: 'intl'`).
`vow.js` owns data and behaviour; each design (`src/themes/<slug>/main.js`) owns its look, opening and layout.
Every body must be different: never ship a recolour of another design's sections.

## A design

```js
import './my.css';
import manifest from './slots.js';
import { mountVow } from '../_vow/vow.js';
mountVow({
  slug, manifest,
  demo: { bride, brideLast, groom, groomLast, date: 'YYYY-MM-DD', time: 'HH:MM', tz, venue, city, mapQuery, dress, colors, hashtag, deadline,
          occasion?: 'birthday' | 'baby-shower' | …, eventTitle?, portraits?, gallery? },   // demo pages only (src/themes/_vow/demo.js)
  gate(ctx) → markup of the closed scene,  open(ctx, tl, gateEl) → time (s) the hero's .vw-in pieces start,
  page(ctx) → the whole body from #top to the footer,  scroll?(ctx), ready?(ctx), gateTap?(ctx, open), ownButtons?: true,
});
```

- `ctx`: `config c S txt bi esc pair on names({amp,cls}) namesText initials isPair occasion D span venue city mainEv lead imgTag photoUrl reduced gsap ScrollTrigger closing hashtag lenis()`
- `ctx.D` (the main day at the venue, en-US): `wd wdShort month monthShort day day2 year long short numeric time zone spelled{day,year,time} iso`
- `ctx.parts`: `countdown(cls) photos photoBtn(g,i,sizes,cls) ratio(ref) families hosts events[] story[] live stays contacts travel hasInfo rsvpForm() deadline calendarBtn shareBtn cardBtn mapLink(ev) swatches(ev) orderList(ev) cue(to) infoBlocks(cls) liveBlock(cls) madeWith()`
- each event: `{ id, title, blurb, venue, d (dateParts), time ('4:00 – 4:45 PM EDT'), map, dress {colors,text}|null, order[] }`
- standard ids for the studio's live preview: `#top #couple #story #date [data-countdown] #programme #ev-<id> #photos [data-lb-idx] #info [data-open-card] #rsvp #rsvp-form footer`
- `.vw-in` (hero pieces brought in after the opening) and `.vw-rise` (revealed on scroll) are the only engine motion classes.
- Debug: `?debug` exposes `window.__vw` (`at(t)`, `finish()`, `to(sel)`); `?open` skips the opening.

## Rules

- No Nepali, no B.S. dates, no Ganesh/verses/crosses/domes: English words only, all from `slots.js` (the `ne` side empty).
- Words read naturally for every occasion the design lists: no hard-coded "wedding", "bride", "groom" in markup. The
  standard slot ids (`hero.kicker hero.line couple.title story.title count.title count.done prog.title gallery.title
  info.title live.line card.button families.title rsvp.title rsvp.yes rsvp.no rsvp.send gate.line gate.open gate.quiet`)
  get occasion defaults from `occasion.js`. One name (`isPair` false) must lay out as well as two.
- Fresh living flowers and greenery only; no text over busy flowers; watercolor on white uses `cutout.py`-style alpha.
- Tokens at zero specificity in `vow.css`; a design sets `--vw-*` on `body.theme-<slug>`.
