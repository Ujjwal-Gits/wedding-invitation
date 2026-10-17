# Wildflower (international · Christian · romantic · Pro)

**Concept.** A summer meadow of pink cosmos, ranunculus, lavender and daisies with butterflies, on white. One deep
cosmos pink (`#A3245E`, 7:1 on white), Fraunces (soft axis, italics) + Nunito Sans.

**Opening (the signature).** A white page with a pressed cosmos, the initials and the date (and the cross-and-rings
emblem when the faith marks are on). On Open the page lifts away and the meadow grows up from below the screen in
three depth bands cut from the painting with alpha (front band first and quickest, then the middle, then the back),
two butterflies cut from the art drift in on soft curves (x and y on different eases, wings beating with scaleX),
then the names. No text ever sits on the flowers. Wide screens show the meadow twice (the left tile mirrored).

**Body.** A little storybook. On desktop (≥ 900px, motion allowed) it is pinned and its leaves turn around the spine
as you scroll (real 3D page turns: preserve-3d leaves, backface-hidden faces, a shade that deepens mid-turn). On
phones and with reduced motion the pages simply follow one another (two columns on wide screens).
- Pages (built from what exists, padded to an even count): title page (`#couple`), the main photo whole in a tilted
  mount with a pressed bud, short dated notes (`#story`), the date with a petal countdown (`#date`), the hosts and the
  full card (`#card`), and an end page with the verse and "And the next chapter starts here."
- Schedule (`#programme`): a soft vertical timeline with bloom (bud) bullets, the start time large in italic; it
  alternates left/right of a centered line on desktop (`#ev-<id>`).
- Photos (`#photos`): a loose collage of whole photos (slight rotations, white borders) on a blush wash; tidy two
  columns on phones.
- Travel, stays, questions, livestream (`#info`).
- RSVP (`#rsvp`): a note card with a pressed cosmos taped to its corner.
- Closing: the names, then the meadow returns at the very bottom (it rises gently in depth on desktop).
- Small single blooms beside the section headings.

**Faith.** `faith: 'christian'`; the emblem on the opening page, the verse (Song of Songs 2:12 by default) on the
storybook's last page. Off for 'other' couples, `faith.show = off`, or `?v=neutral`; the pages stay complete.

**Slots.** Images: `meadow.back|mid|front`, `butterfly.1|2`, `bloom.1|2|3` (art), `couple.lead`, `gallery.1–6`.
Texts: the standard ids plus `book.hint`, `book.end`, `faith.show`, `verse.text`, `verse.ref`.
Colours: `--vw-accent`, `--vw-bg`, `--wf-blush`.

**Art.** Canva AI watercolor (owner-approved, textless) `scratchpad/intl/art/wildflower.jpg`: the butterflies painted
out of the meadow, the meadow keyed to alpha and cut into three overlapping bands with soft seams (`scratchpad/wf_art.py`),
butterflies and blooms keyed with the same white-key method as `cutout.py`. Fonts: Google Fonts (Fraunces, Nunito Sans).
