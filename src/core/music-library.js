// The music library's built-in songs (public/audio) and its moods. Shared by the server (lib/music.js, the
// validator), the studio (the couple's Music module, the planner's Music library) and the credits page.
// Every song here is free for commercial use and redistribution; its licence and source are recorded below.
// The planner can rename, re-mood, turn off and reorder these, never delete them; their own uploads are separate.

/** Moods the library is grouped by, in order. */
export const MUSIC_MOODS = [
  { id: 'shehnai', en: 'Shehnai & traditional', ne: 'शहनाई र परम्परागत' },
  { id: 'instrumental', en: 'Flute, sitar & santoor', ne: 'बाँसुरी, सितार र सन्तुर' },
  { id: 'romantic', en: 'Romantic', ne: 'प्रेमिल' },
  { id: 'piano', en: 'Soft piano & strings', ne: 'कोमल पियानो' },
  { id: 'festive', en: 'Festive', ne: 'रमाइलो' },
];
export const MOOD_IDS = new Set(MUSIC_MOODS.map((m) => m.id));
export const moodOf = (id) => MUSIC_MOODS.find((m) => m.id === id) || MUSIC_MOODS[1];

/** Where the planner's uploaded songs are served from (uploads/_site/music/<24-char id>.mp3). */
export const LIBRARY_DIR_URL = '/uploads/_site/music/';
export const LIBRARY_SRC_RE = /^\/uploads\/_site\/music\/[A-Za-z0-9_-]{24}\.mp3$/;

const KM = 'Kevin MacLeod';
const km = (isrc) => `https://incompetech.com/music/royalty-free/index.html?isrc=${isrc}`;

/**
 * id, title (English), titleNe, artist, mood, src, duration (s), credit (one line shown to people), and for the
 * credits page: license, licenseUrl, sourceUrl. New songs were trimmed to 1.5-3 min, the silence at the start cut,
 * loudness-normalised to -16 LUFS and encoded as 128 kbps MP3.
 */
export const BUILTIN_MUSIC = [
  // The first four are the original bundled songs (config.music.tracks).
  { id: 'shehnai-tanpura', title: 'Shehnai & Tanpura', titleNe: 'शहनाई र तानपुरा', artist: 'Nimtto', mood: 'shehnai', src: '/audio/shehnai-tanpura.mp3', duration: 117,
    credit: '“Shehnai & Tanpura”, original score generated for this template (Artlist, Lyria 3 Pro)', license: 'Original for Nimtto', sourceUrl: '' },
  { id: 'ceremony-shehnai', title: 'Temple Shehnai', titleNe: 'मन्दिरको शहनाई', artist: 'bobv2', mood: 'shehnai', src: '/audio/ceremony-shehnai.mp3', duration: 176,
    credit: '“Hindu Wedding Ceremony Music” by bobv2, CC0, freesound.org/s/395024', license: 'CC0 1.0', sourceUrl: 'https://freesound.org/s/395024/' },
  { id: 'raga-solyuga', title: 'Sitar Raga', titleNe: 'सितार राग', artist: 'KraftiM', mood: 'romantic', src: '/audio/raga-solyuga.mp3', duration: 245,
    credit: '“Solyuga” by KraftiM, CC BY 3.0, jamendo.com/track/118254', license: 'CC BY 3.0', sourceUrl: 'https://www.jamendo.com/track/118254' },
  { id: 'wedding-dhol', title: 'Wedding Dhol', titleNe: 'विवाहको ढोल', artist: 'rsn267', mood: 'festive', src: '/audio/wedding-dhol.mp3', duration: 372,
    credit: '“Indian Wedding Dhols” by rsn267, CC0, freesound.org/s/418780', license: 'CC0 1.0', sourceUrl: 'https://freesound.org/s/418780/' },

  // Shehnai & traditional
  { id: 'temple-shehnai-tabla', title: 'Shehnai & Tabla at the Temple', titleNe: 'मन्दिरमा शहनाई र तबला', artist: 'bohitomi', mood: 'shehnai', src: '/audio/temple-shehnai-tabla.mp3', duration: 150,
    credit: '“hindu musical ceremony in the temple” by bohitomi, CC BY 4.0, freesound.org/s/261871', license: 'CC BY 4.0', sourceUrl: 'https://freesound.org/s/261871/' },
  { id: 'nepali-sarangi', title: 'Sarangi from Bhaktapur', titleNe: 'भक्तपुरको सारङ्गी', artist: 'Subhashish Panigrahi', mood: 'shehnai', src: '/audio/nepali-sarangi.mp3', duration: 121,
    credit: '“Sarangi (ambient/soundscape)” by psubhashish, CC BY 4.0, freesound.org/s/532428', license: 'CC BY 4.0', sourceUrl: 'https://freesound.org/s/532428/' },

  // Flute, sitar & santoor
  { id: 'bamboo-flute', title: 'Bamboo Flute', titleNe: 'बाँसुरी', artist: 'Ananth Pattabi', mood: 'instrumental', src: '/audio/bamboo-flute.mp3', duration: 122,
    credit: '“04 Bamboo Flute” by Ananth Pattabi, CC BY 4.0, freesound.org/s/44337', license: 'CC BY 4.0', sourceUrl: 'https://freesound.org/s/44337/' },
  { id: 'bansuri-dream', title: 'Dreamy Bansuri', titleNe: 'सपनीलो बाँसुरी', artist: 'Swaraj Sonavane', mood: 'instrumental', src: '/audio/bansuri-dream.mp3', duration: 118,
    credit: '“Dreamy Bansuri Pads+Ambience” by Swaraj_Sonavane, CC BY 4.0, freesound.org/s/859882', license: 'CC BY 4.0', sourceUrl: 'https://freesound.org/s/859882/' },
  { id: 'relax-sitar', title: 'Gentle Sitar', titleNe: 'मधुर सितार', artist: 'Antti Luode', mood: 'instrumental', src: '/audio/relax-sitar.mp3', duration: 180,
    credit: '“Relax Ay Sitar” by Antti Luode, CC BY 3.0, commons.wikimedia.org/wiki/File:Relax_Ay_Sitar_(Antti_Luode).mp3', license: 'CC BY 3.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Relax_Ay_Sitar_(Antti_Luode).mp3' },
  { id: 'santoor', title: 'Santoor', titleNe: 'सन्तुर', artist: 'Peyman Heydarian (rec. Xavier Serra)', mood: 'instrumental', src: '/audio/santoor.mp3', duration: 91,
    credit: '“Santur” by xserra (Peyman Heydarian, santur), CC BY 4.0, freesound.org/s/125654', license: 'CC BY 4.0', sourceUrl: 'https://freesound.org/s/125654/' },
  { id: 'veena-kiravani', title: 'Veena, Raga Kiravani', titleNe: 'वीणा, राग किरवाणी', artist: 'L. Ramakrishnan', mood: 'instrumental', src: '/audio/veena-kiravani.mp3', duration: 170,
    credit: '“Kiravani” by L. Ramakrishnan, CC0, commons.wikimedia.org/wiki/File:Kiravani-L_Ramakrishnan.ogg', license: 'CC0 1.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kiravani-L_Ramakrishnan.ogg' },
  { id: 'dhaka-sarod', title: 'Sarod Evening', titleNe: 'सरोदको साँझ', artist: KM, mood: 'instrumental', src: '/audio/dhaka-sarod.mp3', duration: 170,
    credit: '“Dhaka” by Kevin MacLeod (incompetech.com), CC BY 4.0', license: 'CC BY 4.0', sourceUrl: km('USUAN1400003') },

  // Romantic
  { id: 'there-is-romance', title: 'There Is Romance', titleNe: 'प्रेमको धुन', artist: KM, mood: 'romantic', src: '/audio/there-is-romance.mp3', duration: 180,
    credit: '“There is Romance” by Kevin MacLeod (incompetech.com), CC BY 4.0', license: 'CC BY 4.0', sourceUrl: km('USUAN1100044') },
  { id: 'canon-in-d', title: 'Canon in D (strings & harp)', titleNe: 'क्यानन इन डी', artist: KM, mood: 'romantic', src: '/audio/canon-in-d.mp3', duration: 180,
    credit: '“Canon in D Major” by Kevin MacLeod (incompetech.com), CC BY 4.0', license: 'CC BY 4.0', sourceUrl: km('USUAN1100301') },

  // Soft piano & strings
  { id: 'gymnopedie', title: 'Gymnopédie No. 1', titleNe: 'पियानो: जिम्नोपेडी', artist: KM, mood: 'piano', src: '/audio/gymnopedie.mp3', duration: 187,
    credit: '“Gymnopedie No. 1” by Kevin MacLeod (incompetech.com), CC BY 4.0', license: 'CC BY 4.0', sourceUrl: km('USUAN1100787') },
  { id: 'bridal-chorus-piano', title: 'Bridal Chorus (piano)', titleNe: 'दुलहीको आगमन (पियानो)', artist: KM, mood: 'piano', src: '/audio/bridal-chorus-piano.mp3', duration: 102,
    credit: '“Wagner Bridal Chorus - piano” by Kevin MacLeod (incompetech.com), CC BY 4.0', license: 'CC BY 4.0', sourceUrl: km('USUAN1100022') },
  { id: 'meditation-impromptu', title: 'Quiet Piano', titleNe: 'शान्त पियानो', artist: KM, mood: 'piano', src: '/audio/meditation-impromptu.mp3', duration: 179,
    credit: '“Meditation Impromptu 01” by Kevin MacLeod (incompetech.com), CC BY 4.0', license: 'CC BY 4.0', sourceUrl: km('USUAN1100163') },

  // Festive
  { id: 'vadodora', title: 'Sitar & Bansuri Groove', titleNe: 'सितार र बाँसुरीको लय', artist: KM, mood: 'festive', src: '/audio/vadodora.mp3', duration: 180,
    credit: '“Vadodora” by Kevin MacLeod (incompetech.com), CC BY 4.0', license: 'CC BY 4.0', sourceUrl: km('USUAN1400049') },
  { id: 'jalandhar', title: 'Sitar Celebration', titleNe: 'सितारको उत्सव', artist: KM, mood: 'festive', src: '/audio/jalandhar.mp3', duration: 170,
    credit: '“Jalandhar” by Kevin MacLeod (incompetech.com), CC BY 4.0', license: 'CC BY 4.0', sourceUrl: km('USUAN1400018') },
];
