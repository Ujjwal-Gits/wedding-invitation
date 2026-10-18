# Which designs suit which community

Each design's communities are written out in full in its `src/themes/<slug>/slots.js` as `religions`. The site's
static lists copy them: `src/site/themes.js` for the Nepal designs and `INTL_THEMES[].religions` in
`src/site/intl-designs.js` for the international ones. `server/test/theme-meta.test.js` checks that the lists match.
The same list drives several places:

- the Nepal site's faith cards and their counts (`src/site/partials.mjs`, and `src/site/site.js` at runtime)
- the `/designs/?faith=…` filter
- the studio's design picker (`suits()` in `src/core/faith.js`)
- the server's "this design is not made for this community" check

Nothing is inferred. Before this change, a design marked `other` also counted as Buddhist and Kirat. That rule is
gone. `other` now means only that the art is genuinely neutral. Every neutral design lists Buddhist and Kirat
explicitly.

## How a design was judged

The judgement used the art a visitor actually sees: the phone stills in `public/site/stills/`, the thumbnails in
`public/site/thumbs/`, and the gate and hero shots and art files in `public/themes/<slug>/`. It also used the design's
default text.

- **Hindu only:** anything with Ganesh, Om, a swastika or sathiya, sindoor, a kalash, a havan or mandap fire, Hindu
  rites (Janti, Swayambar, Saptapadi) or temple architecture in the art. The rule also covers designs whose
  previews show Ganesh or the Ganesh invocation. The runtime emblem swap (Ganesh → Dharma wheel, cross or crescent)
  does not change this, because the previews and the composition are still built around Ganesh.
- **Buddhist:** neutral art, or Newar and Himalayan motifs shared with Buddhism, such as the endless knot, a Newari
  window or a mango-leaf toran (the window's kalash and diyos are hidden at runtime). It never includes a Hindu
  deity.
- **Kirat:** neutral or nature art only, with no Hindu or Buddhist ritual objects.
- **Christian:** the international Christian designs, which are neutral art that shows the cross only on a Christian
  invitation, plus the neutral Nepal designs.
- **Muslim:** the four Muslim designs, plus neutral floral or paper designs with no human figures, no other
  faith's symbols and no wine.
- **Other:** genuinely neutral art only.

## The mapping

| Design | Communities | Reason |
|---|---|---|
| agni | Hindu | Havan fire, the seven rounds, Ganesh |
| bagaicha | Hindu | 3D garden wedding around the sacred fire (Saptapadi) |
| chitra | Hindu | Mithila storybook: Janti and the seven rounds of the fire |
| dhoka | Hindu | Mul Chowk temple door and a Ganesh invocation; rites section with sindoor, Saptapadi and the fire |
| durbar | Hindu | Walk through Bhaktapur's temples (Nyatapola) |
| ghar | Hindu | Newar house with its shrine and the Saptapadi |
| janti | Hindu | Janti procession with a doli, and Ganesh in the torana |
| mala | Hindu | Dressed mandap with brass kalash |
| mandap | Hindu | 3D mandap and the seven rounds |
| mangal | Hindu | Temple doorway with bells, kalash and Ganesh |
| nimantrana | Hindu | Tri-fold card built round Ganesh, kalash and diyos |
| pardaa | Hindu | Mandap with the living fire and kalash |
| rajdwar | Hindu | Ganesh on the gate; Mangal temple card with kalash and diyos |
| rangoli | Hindu | Ganesh shrine and diyos ring the rangoli |
| shree | Hindu | Gold Ganesh in a lotus, hanging diyas |
| sindoor | Hindu | The sindoor box is the design; red Ganesh drawing |
| gurans (Phoolbari) | Hindu | Brass purna kalash with coconut and mango leaves painted into the gate; शुभ विवाह crest |
| hariyo | Hindu | Opening arch built round Ganesh; preview carries the Ganesh invocation; couple in Hindu wedding dress |
| laali | Hindu | Ganesh drawing in the opening; bride in red sari with sindoor |
| mahal | Hindu | Ganesh in the crest medallion and in the moon (previews show him large); kalash with a sindoor swastika |
| mehendi | Hindu | Its thumbnail is a bride applying sindoor; Ganesh above the names |
| swayambar | Hindu | The Swayambar garland exchange is the design; Ganesh medallion |
| kham | Hindu, Buddhist | Paper envelope with the endless knot (shrivatsa) as the seal: shared Hindu and Buddhist auspicious sign, not neutral |
| jhyal | Hindu, Buddhist | Carved Newari window with a marigold toran (Newar Hindu and Buddhist); kalash and diyos leave for non-Hindu |
| sayapatri | Hindu, Buddhist | Marigold and mango-leaf toran: Hindu and Newar Buddhist festive decor, no deity |
| dhaka | All six | Ivory envelope, Dhaka band, wax seal, roses: no religious art, no figures |
| himal | All six | Machhapuchhre at sunrise and the couple's own photos |
| sarovar | All six | Lotus lake, swans and a marble pavilion; the floating diyas become floating candles unless the invitation is Hindu or Buddhist |
| mohar | All six | Brass seal, red lac, parchment and an indigo cloth; the painted diya in the table art is swapped for petals when the symbols are not Hindu |
| blush-roses | Buddhist, Kirat, Muslim, Christian, Other | Peach roses in a gold frame; cross only on a Christian invitation |
| garden-party | Buddhist, Kirat, Muslim, Christian, Other | Garden arbor and lawn, no figures |
| letterpress | Buddhist, Kirat, Muslim, Christian, Other | Deckled cotton card on linen |
| olive-grove | Buddhist, Kirat, Muslim, Christian, Other | Watercolour olive wreath |
| wax-seal | Buddhist, Kirat, Muslim, Christian, Other | Envelope with a sage wax seal |
| wildflower | Buddhist, Kirat, Muslim, Christian, Other | Meadow of wildflowers and butterflies |
| amalfi | Buddhist, Kirat, Christian, Other | Lemons and the Positano coast; a European destination weekend, kept out of the Muslim list to be conservative |
| tuscany | Buddhist, Kirat, Christian, Other | The invitation is a wine label among the vineyards (not Muslim) |
| rose-arch | Christian | Gothic chapel-garden arch, a Christian mood rather than neutral |
| andalus | Muslim | Horseshoe arch and Moorish courtyard; Bismillah |
| gold-arch | Muslim | Mihrab-shaped gold arch; Bismillah calligraphy |
| jali | Muslim | Emerald jali lattice under lanterns |
| noor | Muslim | Pointed (mihrab) arch with roses |

## Counts on the Nepal site (40 designs)

| Faith | Before | After |
|---|---|---|
| Hindu | 27 | 27 |
| Buddhist | 24 | 13 |
| Kirat | 24 | 10 |
| Christian | 16 | 11 |
| Muslim | 11 | 12 |
| Other or mixed | 24 | 10 |

## Notes

- Hariyo and Mahal could return to other faiths once each faith has its own preview stills (their art, apart from
  the Ganesh slot and the kalash, is neutral). Until then, a Christian or Muslim visitor would see Ganesh on the
  card.
- Existing invitations are not touched. The server checks suitability only when an invitation's community, design,
  gate or first screen changes.
