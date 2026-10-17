# Garden Party (international · Christian · garden · Pro)

**Concept.** A sunny watercolor garden ceremony: a white rose arbor at the end of a lawn aisle, white chairs, cypress
trees, a soft blue sky. Crisp white page, one fresh garden green (`#2D6A3E`), Young Serif (display) + Outfit (body).

**Opening (the signature).** A sheet of frosted vellum (`backdrop-filter` blur + paper grain, a printed green rule,
the cross-and-rings emblem when the faith marks are on) lies over the painting with the names printed on it. On Open
it is picked up (a hair larger, its shadow grows), then peeled away to the upper right (translate + slight rotation
from its bottom-left corner); the garden settles in full color behind it and the first screen's words come in.

**Body.** Split screen on desktop (≥ 900px): the garden is fixed on the right for the whole page (a slow camera
push-in as you scroll, desktop only) while the invitation scrolls in the left column. Phones: the garden is a band
under the names, then the content.
- Story: left-aligned heading, one whole photo in a white mat, dated chapters with dashed rules (`#couple`, `#story`).
- Date: the day in large green type, the countdown in tinted cells, calendar + share (`#date`).
- Awning: a green-and-white striped valance with a scalloped edge (CSS), used twice as a divider (before the schedule
  and before the closing).
- Schedule (`#programme`): a little party menu ("At a glance", dotted leaders) linking to a folded tent place card per
  event (`#ev-<id>`, crease at the top, shadow on the table); on desktop the cards stand up off the table in 3D as
  they scroll in (rotateX, once). The reception's order prints as a menu inside its card.
- Hosts and the full card (`#card`) on a lawn tint.
- Photos (`#photos`): whole photos in relaxed rows of one height (flex justified, no cropping) with white borders.
- Travel, stays, questions, livestream (`#info`).
- RSVP (`#rsvp`): a guestbook page: margin rule, lined note, a ribbon bookmark, the name line asks for a signature.
- Closing: the arbor in an arched window (phones; on desktop the garden is already beside you), the verse, names.

**Faith.** `faith: 'christian'`; the emblem sits on the vellum, the verse (Colossians 3:14 by default) above the
closing line. Both vanish for 'other' couples, `faith.show = off`, or `?v=neutral`; the page is complete without them.

**Slots.** Images: `hero.sky`, `hero.garden`, `close.arbor` (art), `couple.lead`, `gallery.1–6` (couple photos).
Texts: the standard ids plus `prog.menu`, `rsvp.kicker`, `rsvp.sign`, `faith.show`, `verse.text`, `verse.ref`.
Colours: `--vw-accent`, `--vw-bg`, `--gp-tint`.

**Art.** Canva AI watercolor (owner-approved, textless) `scratchpad/intl/art/garden.jpg`, cropped into `sky`, `garden`
and `arbor` (each with a 640px `-sm`). Fonts: Google Fonts (Young Serif, Outfit). Demo photos: `_vow/demo` (CC0).
