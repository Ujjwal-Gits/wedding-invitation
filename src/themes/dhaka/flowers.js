// Real flower photographs, cut out for this theme (Wikimedia Commons; licences below).
// The marigolds are cut from library photos credited through credits.json.
export const FLOWER_CREDITS = [
  { file: 'rose-red-a', title: 'Red rose with black background', creator: 'Laitche', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Red_rose_with_black_background.jpg' },
  { file: 'rose-red-b', title: 'Red rose with black background II', creator: 'Laitche', license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Red_rose_with_black_background_II.jpg' },
  { file: 'rose-red-stem', title: 'Red rose against a black background', creator: 'Amardipghosh', license: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:Red_rose_against_a_black_background.jpg' },
  { file: 'rose-chateau', title: 'Rosa Red Chateau on black background', creator: "Filo gèn'", license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Rosa_Red_Chateau_on_black_background.jpg' },
  { file: 'rose-papa', title: 'Rose Papa Meilland on black background', creator: "Filo gèn'", license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Rose_Papa_Meilland_on_black_background.jpg' },
  { file: 'rose-pink', title: 'Rose on black background', creator: "Filo gèn'", license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Rose_on_black_background.jpg' },
  { file: 'rose-pink-garden', title: 'Rose black background', creator: "Filo gèn'", license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Rose_black_background.jpg' },
  { file: 'rose-white', title: 'Blanche Rose on black background', creator: "Filo gèn'", license: 'CC BY-SA 4.0', url: 'https://commons.wikimedia.org/wiki/File:Blanche_Rose_on_black_background.jpg' },
  { file: 'rose-pink-close', title: 'Pink Rose Closeup With Black Background', creator: 'AsaQuathern', license: 'CC BY 4.0', url: 'https://commons.wikimedia.org/wiki/File:Pink_Rose_Closeup_With_Black_Background.jpg' },
  { file: 'leaf-twig', title: 'Leaves of Hopea odorata', creator: 'Silviculture at Vietnamese Wikipedia', license: 'CC BY-SA 3.0', url: 'https://commons.wikimedia.org/wiki/File:Leaves_of_Hopea_odorata.jpg' },
  { file: 'leaf-single', title: 'Leaf from bush', creator: 'Ben Sale', license: 'CC BY 2.0', url: 'https://commons.wikimedia.org/wiki/File:Leaf_from_bush_(15635275502).jpg' },
];
// Marigold cut-outs come from these library photos (credited from credits.json).
export const FLOWER_LIBRARY_SLUGS = ['marigold-macro', 'marigold-macro-alt'];
export const flowerUrl = (name) => `/themes/dhaka/flowers/${name}.webp`;
