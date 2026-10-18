// The seven doorways (Canva AI paintings made for Toran, public/themes/toran/art/). Each door picture is 1088x1456
// with its opening keyed out (transparent) and its outer edges feathered into one flat wall colour and one floor
// colour (the theme lays painted plaster over it), and below its ground line the picture fades into the painted
// floor. Before: flat blocks of those colours can carry the wall on past the picture. `open` is the opening's box
// (fractions of the picture: x0, y0, x1, y1); the tunnel's axis runs through each opening's centre.
export const A = '/themes/toran/art/';
export const DOOR_AR = 1456 / 1088;

export const DOORS = [
  { file: 'door-1', ground: 0.988, floorArt: 'a', wall: '#f7d697', floor: '#a48261', floorY: 0.9402, open: [0.3511, 0.3283, 0.6535, 0.8695], about: 'mango leaves, marigold and brass bells' },
  { file: 'door-2', ground: 0.944, floorArt: 'b', wall: '#d7cc73', floor: '#d2c385', floorY: 0.9499, open: [0.329, 0.2754, 0.67, 0.8496], about: 'banana stems and kalash with coconuts' },
  { file: 'door-3', ground: 1, floorArt: 'a', wall: '#e5a28a', floor: '#dd967a', floorY: 0.9801, open: [0.2794, 0.2081, 0.7224, 0.8984], about: 'rose strands with rajnigandha' },
  { file: 'door-4', ground: 0.963, floorArt: 'b', wall: '#bd301a', floor: '#9c6740', floorY: 0.965, open: [0.3382, 0.3187, 0.6608, 0.9045], about: 'sayapatri and makhamali garlands' },
  { file: 'door-5', ground: 0.938, floorArt: 'a', wall: '#b9c88f', floor: '#d1c4a9', floorY: 0.9251, open: [0.3244, 0.2713, 0.6811, 0.8915], about: 'gurans in bloom' },
  { file: 'door-6', ground: 0.947, floorArt: 'b', wall: '#bf7610', floor: '#8f5b23', floorY: 0.9602, open: [0.2849, 0.2507, 0.716, 0.864], about: 'a niche of lit diyos' },
];
/** the seventh: the mandap at the heart of the house, full bleed (portrait and landscape paintings) */
export const MANDAP = { floor: '#a5844e', p: { file: 'mandap-p', w: 944, h: 1680 }, l: { file: 'mandap-l', w: 1680, h: 944 } };
/** the hanging marigold strings (ladis) of the opening curtain: [width, height] of each cut-out */
export const LADI = [[112, 1619], [111, 1613], [107, 1622], [103, 1617], [104, 1613]];
/** the painted sandstone floor before each door (petals and two lit diyas at the threshold), and its plain stone colour */
export const FLOORS = { a: { file: 'floor-a', color: '#bd7f36' }, b: { file: 'floor-b', color: '#bd7f36' } };
