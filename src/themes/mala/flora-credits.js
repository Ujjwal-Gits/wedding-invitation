// Sources of the cut-outs composed into Mala's kalash arrangements, rosettes and photo corners
// (Wikimedia Commons and the WordPress Photo Directory). Listed on the public /credits/ page,
// never on the invitation itself.
// The garlands are cut out of three library photos (credited in credits.json): marigold strands
// from "Marigold garlands, Pak Khlong Talat flower market Bangkok" (Gzzz, CC BY-SA 4.0), rose bands
// from "Garlands in Indian flower market" (Elvina Goves, CC0), the varmala from "A garland made of
// yellow-orange marigold (Jamanthi) flowers" (Balu B, CC0); marigolds from "marigold-macro".
// Silk drape, brass kalash and paper are rendered for this theme.
const W = (file) => `https://commons.wikimedia.org/wiki/File:${file}`;
const BYSA4 = { license: 'CC BY-SA 4.0', license_url: 'https://creativecommons.org/licenses/by-sa/4.0' };
export default [
  { title: 'Red rose with black background (cut out)', creator: 'Laitche', ...BYSA4, source_url: W('Red_rose_with_black_background.jpg') },
  { title: 'Red rose with black background II (cut out)', creator: 'Laitche', ...BYSA4, source_url: W('Red_rose_with_black_background_II.jpg') },
  { title: 'Rosa Red Chateau on black background (cut out)', creator: "Filo gèn'", ...BYSA4, source_url: W('Rosa_Red_Chateau_on_black_background.jpg') },
  { title: 'Rose on black background (cut out)', creator: "Filo gèn'", ...BYSA4, source_url: W('Rose_on_black_background.jpg') },
  { title: 'Rose black background (cut out)', creator: "Filo gèn'", ...BYSA4, source_url: W('Rose_black_background.jpg') },
  { title: 'Pink Rose Closeup With Black Background (cut out)', creator: 'AsaQuathern', license: 'CC BY 4.0', license_url: 'https://creativecommons.org/licenses/by/4.0', source_url: W('Pink_Rose_Closeup_With_Black_Background.jpg') },
  { title: 'Leaves of Hopea odorata (one leaf cut out)', creator: 'Silviculture at Vietnamese Wikipedia', license: 'CC BY-SA 3.0', license_url: 'https://creativecommons.org/licenses/by-sa/3.0', source_url: W('Leaves_of_Hopea_odorata.jpg') },
  { title: 'A red hibiscus flower with green leaves around it (cut out)', creator: 'Pooja Derashri', license: 'CC0 1.0', license_url: 'https://creativecommons.org/publicdomain/zero/1.0/', source_url: 'https://wordpress.org/photos/photo/31065c08a4/' },
];
