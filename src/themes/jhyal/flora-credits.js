// Sources of the cut-out flowers and leaves Jhyal uses (public/themes/jhyal/decor/, copied from the Mangal, Mala and
// Phoolbari decor; each was made and checked there). Listed on the public /credits/ page only, never on the invitation.
//   toran.webp  ← mangal/decor/swag.webp      (the marigold-and-mango-leaf toran over the window)
//   kalash.webp ← mangal/decor/kalash.webp    (the kalash on the families' pillar)
//   corner.webp ← mala/decor/corner-tr.webp   (the one photo corner)
//   sprig.webp  ← gurans/flora/sprig.webp     (the section divider)
// Marigolds are cut from the library photos marigold-macro / marigold-macro-alt (credited in credits.json).
// The carved window, lattice, pillar, diyos, Dhaka strip, lotus and paper are drawn or generated for this theme.
const W = (file) => `https://commons.wikimedia.org/wiki/File:${file}`;
const CC0 = { license: 'CC0 1.0', license_url: 'https://creativecommons.org/publicdomain/zero/1.0/' };
const BYSA4 = { license: 'CC BY-SA 4.0', license_url: 'https://creativecommons.org/licenses/by-sa/4.0' };
export default [
  { title: 'Red rose with black background (cut out)', creator: 'Laitche', ...BYSA4, source_url: W('Red_rose_with_black_background.jpg') },
  { title: 'Red rose with black background II (cut out)', creator: 'Laitche', ...BYSA4, source_url: W('Red_rose_with_black_background_II.jpg') },
  { title: 'Rosa Red Chateau on black background (cut out)', creator: "Filo gèn'", ...BYSA4, source_url: W('Rosa_Red_Chateau_on_black_background.jpg') },
  { title: 'Rose on black background (cut out)', creator: "Filo gèn'", ...BYSA4, source_url: W('Rose_on_black_background.jpg') },
  { title: 'Rose black background (cut out)', creator: "Filo gèn'", ...BYSA4, source_url: W('Rose_black_background.jpg') },
  { title: 'Blanche Rose on black background (cut out)', creator: "Filo gèn'", ...BYSA4, source_url: W('Blanche_Rose_on_black_background.jpg') },
  { title: 'Pink Rose Closeup With Black Background (cut out)', creator: 'AsaQuathern', license: 'CC BY 4.0', license_url: 'https://creativecommons.org/licenses/by/4.0', source_url: W('Pink_Rose_Closeup_With_Black_Background.jpg') },
  { title: 'Leaf from bush (cut out, as mango leaves)', creator: 'Ben Sale', license: 'CC BY 2.0', license_url: 'https://creativecommons.org/licenses/by/2.0', source_url: W('Leaf_from_bush_(15635275502).jpg') },
  { title: 'Leaves of Hopea odorata (one leaf cut out)', creator: 'Silviculture at Vietnamese Wikipedia', license: 'CC BY-SA 3.0', license_url: 'https://creativecommons.org/licenses/by-sa/3.0', source_url: W('Leaves_of_Hopea_odorata.jpg') },
  { title: 'A red hibiscus flower with green leaves around it (cut out)', creator: 'Pooja Derashri', ...CC0, source_url: 'https://wordpress.org/photos/photo/31065c08a4/' },
  { title: 'Light pink rose (cut out)', creator: 'Ramya Srivastav', ...CC0, source_url: 'https://commons.wikimedia.org/w/index.php?curid=113530729' },
  { title: 'Pink rose (cut out)', creator: 'Mary', ...CC0, source_url: 'https://stocksnap.io/photo/pink-rose-6VZG2T1IN2' },
  { title: 'Green leaf (cut out)', creator: 'rawpixel', ...CC0, source_url: 'https://www.rawpixel.com/image/5965841/photo-image-background-texture-christmas' },
];
