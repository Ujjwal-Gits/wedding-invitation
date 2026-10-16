// ─────────────────────────────────────────────────────────────────────────────
// Everything a new couple needs to change lives here, for all three designs.
// Text fields take { en, ne }. All names, dates and venues are PLACEHOLDERS.
// Have the family purohit or an elder check the Nepali and the B.S. dates.
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  couple: {
    bride: {
      name: { en: 'Binisha', ne: 'बिनिशा' },
      fullName: { en: 'Binisha Katwal', ne: 'सौ.का. बिनिशा कटवाल' },
      parents: { en: 'Mr. Ram Bahadur Katwal & Mrs. Sita Katwal', ne: 'श्री राम बहादुर कटवाल तथा श्रीमती सीता कटवाल' },
      home: { en: 'Baluwatar, Kathmandu', ne: 'बालुवाटार, काठमाडौं' },
      photo: null, // the bride's own portrait (uploaded in the studio)
    },
    groom: {
      name: { en: 'Ujjwal', ne: 'उज्ज्वल' },
      fullName: { en: 'Ujjwal Dahal', ne: 'चि. उज्ज्वल दाहाल' },
      parents: { en: 'Mr. Hari Prasad Dahal & Mrs. Gita Dahal', ne: 'श्री हरि प्रसाद दाहाल तथा श्रीमती गीता दाहाल' },
      home: { en: 'Jawalakhel, Lalitpur', ne: 'जावलाखेल, ललितपुर' },
      photo: null, // the groom's own portrait
    },
    // Couple photos (photo references, see src/photos.js). The first is the hero.
    // In the studio these are the couple's own uploads; the demo uses CC0 library photos.
    portraits: [
      { photo: 'couple-4', alt: 'The newly-weds walking together down a village path' },
      { photo: 'couple-2', alt: 'The groom takes the bride’s hennaed hand' },
      { photo: 'bride-9', alt: 'The bride in her red veil at a window' },
      { photo: 'couple-9', alt: 'Hennaed hands and feet among marigolds' },
      { photo: 'couple-1', alt: 'Two hands held against gold wedding clothes' },
      { photo: 'wedding-nepali', alt: 'Rings exchanged over marigolds' },
      { photo: 'couple-7', alt: 'Hand in hand, rings on' },
      { photo: 'bride-8', alt: 'The bride beneath her red veil' },
      { photo: 'couple-6', alt: 'A gold pendant settled on the bride’s necklace' },
      { photo: 'couple-alt', alt: 'The bride holding the groom’s hand as they walk' },
      { photo: 'bride-6', alt: 'The bride in an embroidered lehenga' },
      { photo: 'bride-1', alt: 'The bride holding out her dupatta' },
    ],
    hashtag: '#UjjwalWedsBinisha',
  },

  // Who is inviting (signs the card).
  hosts: { en: 'The Katwal & Dahal families', ne: 'कटवाल तथा दाहाल परिवार' },

  weddingDate: '2027-02-12T10:30:00+05:45',
  weddingDateBS: { en: '29 Magh 2083 B.S.', ne: 'वि.सं. २०८३ साल माघ २९ गते, शुक्रबार' },
  city: { en: 'Kathmandu, Nepal', ne: 'काठमाडौं, नेपाल' },

  // Wording follows printed Nepali wedding cards.
  invitation: {
    shloka: {
      sa: 'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ। निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥',
      en: 'O Ganesha of the curved trunk, radiant as a million suns, keep every undertaking free of obstacles.',
    },
    salutation: { en: 'Respected guest,', ne: 'मान्यवर,' },
    body: {
      en: 'By the grace of our family deity and the blessings of our elders, the auspicious marriage of Ujjwal, son of Mr. Hari Prasad and Mrs. Gita Dahal, with Binisha, daughter of Mr. Ram Bahadur and Mrs. Sita Katwal, has been fixed.',
      ne: 'कुलदेवताको असीम कृपा र गुरुजनको आशीर्वादले श्री हरि प्रसाद दाहाल तथा श्रीमती गीता दाहालका सुपुत्र चि. उज्ज्वलको शुभ विवाह श्री राम बहादुर कटवाल तथा श्रीमती सीता कटवालकी सुपुत्री सौ.का. बिनिशासँग हुने शुभ साइत जुरेको छ।',
    },
    request: {
      en: 'We warmly request you and your family to grace the occasion and bless the newlyweds.',
      ne: 'उक्त शुभ अवसरमा हजुर सपरिवार पाल्नुभई नवदम्पतीलाई शुभाशीर्वाद दिनुहुन हार्दिक अनुरोध गर्दछौं।',
    },
    signoff: { en: 'With humble regards', ne: 'विनीत' },
  },

  // A few lines for "our story" (Ghar & Dhoka designs).
  story: [
    { year: { en: '2019', ne: '२०१९' }, text: { en: 'We met at a friend’s Tihar party in Patan, arguing over the last sel roti.', ne: 'पाटनमा साथीको तिहार भेटघाटमा अन्तिम सेल रोटीका लागि झगडा गर्दै हाम्रो भेट भयो।' } },
    { year: { en: '2023', ne: '२०२३' }, text: { en: 'Four years, two cities and a great many phone calls later, both families said yes.', ne: 'चार वर्ष, दुई सहर र अनगिन्ती फोनपछि दुवै परिवारले स्वीकृति दिनुभयो।' } },
    { year: { en: '2027', ne: '२०२७' }, text: { en: 'Now we would love you beside us as we take the seven steps.', ne: 'अब सात पाइला सँगै हिँड्दा हजुर हाम्रो साथमा हुनुहोस्।' } },
  ],

  events: [
    {
      id: 'mehendi',
      title: { en: 'Mehendi', ne: 'मेहन्दी' },
      blurb: { en: 'Henna, songs and the women of both families.', ne: 'मेहन्दी, गीत र दुवै परिवारका दिदीबहिनी।' },
      start: '2027-02-09T15:00:00+05:45',
      end: '2027-02-09T20:00:00+05:45',
      venue: { en: 'Katwal Niwas, Baluwatar', ne: 'कटवाल निवास, बालुवाटार' },
      mapQuery: 'Baluwatar, Kathmandu',
      dress: { colors: ['#4F6B2E', '#A9B85A', '#E9D9A6'], text: { en: 'Shades of green', ne: 'हरियो रङ' } },
      photo: 'mehendi-hands',
    },
    {
      id: 'haldi',
      title: { en: 'Haldi', ne: 'हल्दी कार्यक्रम' },
      blurb: { en: 'Turmeric for luck and glow, marigolds everywhere.', ne: 'बेसार लगाउने रमाइलो बिहानी।' },
      start: '2027-02-10T10:00:00+05:45',
      end: '2027-02-10T13:00:00+05:45',
      venue: { en: 'Katwal Niwas, Baluwatar', ne: 'कटवाल निवास, बालुवाटार' },
      mapQuery: 'Baluwatar, Kathmandu',
      dress: { colors: ['#E8A317', '#F4C542', '#FFF4D6'], text: { en: 'Yellow, and clothes you don’t mind staining', ne: 'पहेँलो पहिरन' } },
      photo: 'sindoor',
    },
    {
      id: 'wedding',
      title: { en: 'Janti & Shubha Bibaha', ne: 'जन्ती तथा शुभ विवाह' },
      blurb: { en: 'The procession, the Swayambar and the sacred fire.', ne: 'जन्ती स्वागत, स्वयम्बर र अग्निसाक्षी विवाह संस्कार।' },
      start: '2027-02-12T10:30:00+05:45',
      end: '2027-02-12T18:00:00+05:45',
      venue: { en: 'Shanti Banquet, Jawalakhel, Lalitpur', ne: 'शान्ति ब्याङ्क्वेट, जावलाखेल, ललितपुर' },
      mapQuery: 'Jawalakhel, Lalitpur',
      dress: { colors: ['#8E1424', '#C9963F', '#F4E9D6'], text: { en: 'Traditional: daura suruwal, saree, dhaka', ne: 'दौरा सुरुवाल, सारी, ढाका' } },
      photo: 'wedding-nepali',
      rituals: [
        { time: '10:30', title: { en: 'Janti welcome', ne: 'जन्ती स्वागत' } },
        { time: '12:00', title: { en: 'Swayambar', ne: 'स्वयम्बर' } },
        { time: '13:30', title: { en: 'Lunch for all guests', ne: 'भोज' } },
        { time: { en: 'At the auspicious hour', ne: 'शुभ साइतमा' }, title: { en: 'Kanyadan, Sindoor & Saptapadi', ne: 'कन्यादान, सिन्दूर तथा सप्तपदी' } },
      ],
    },
    {
      id: 'reception',
      title: { en: 'Reception', ne: 'प्रीतिभोज' },
      blurb: { en: 'Dinner, dancing and a great many photographs.', ne: 'रात्रिभोज तथा साँस्कृतिक साँझ।' },
      start: '2027-02-13T18:30:00+05:45',
      end: '2027-02-13T22:30:00+05:45',
      venue: { en: 'The Garden Pavilion, Lalitpur', ne: 'द गार्डेन प्याभिलियन, ललितपुर' },
      mapQuery: 'Lalitpur, Nepal',
      dress: { colors: ['#1E2A4A', '#C9963F', '#2B1A12'], text: { en: 'Evening festive', ne: 'साँझको उत्सव पहिरन' } },
      photo: 'courtyard-dusk',
    },
  ],

  saptapadi: [
    { en: 'For nourishment, we will feed each other', ne: 'पहिलो पाइला: अन्न र पोषणका लागि' },
    { en: 'For strength, we will hold each other up', ne: 'दोस्रो पाइला: बल र स्वास्थ्यका लागि' },
    { en: 'For prosperity, built together', ne: 'तेस्रो पाइला: धन र समृद्धिका लागि' },
    { en: 'For joy and love, shared', ne: 'चौथो पाइला: सुख र आपसी प्रेमका लागि' },
    { en: 'For family, those here and those to come', ne: 'पाँचौँ पाइला: सन्तान र परिवारका लागि' },
    { en: 'Through every season, side by side', ne: 'छैटौँ पाइला: सबै ऋतुमा साथका लागि' },
    { en: 'As friends, for life', ne: 'सातौँ पाइला: जीवनभरको मित्रताका लागि' },
  ],

  // Gallery: replace with the couple's own photos (slug of a file in art-src/photos).
  gallery: [
    { photo: 'wedding-nepali', shape: 'land', alt: 'Rings exchanged over marigolds at a Nepali wedding' },
    { photo: 'mehendi-hands-alt', shape: 'port', alt: 'Hennaed hands holding betel nuts over a red sari' },
    { photo: 'couple-2', shape: 'land', alt: 'A groom takes the bride’s hennaed hand' },
    { photo: 'torana', shape: 'land', alt: 'A gilded torana above a temple door in Patan' },
    { photo: 'marigold-garland-alt', shape: 'port', alt: 'Strings of marigold garlands' },
    { photo: 'wedding-nepali-alt', shape: 'land', alt: 'Hands joined during the wedding rites' },
    { photo: 'couple-1', shape: 'port', alt: 'Two hands held against gold wedding clothes' },
    { photo: 'window-peacock-alt', shape: 'land', alt: 'The peacock window of Bhaktapur' },
    { photo: 'wedding-nepali-alt2', shape: 'land', alt: 'The groom’s cupped hands holding the sacred thread' },
    { photo: 'diyo-lamps-alt', shape: 'land', alt: 'Rows of butter lamps burning' },
    { photo: 'himalaya-dawn', shape: 'land', alt: 'Machhapuchhre at dawn' },
  ],

  info: {
    travel: {
      en: 'Tribhuvan International Airport is 25 minutes from both venues. Ride-hailing apps work well; parking is limited at Jawalakhel, so please share rides.',
      ne: 'दुवै स्थान त्रिभुवन अन्तर्राष्ट्रिय विमानस्थलबाट करिब २५ मिनेटको दूरीमा छन्। जावलाखेलमा पार्किङ सीमित भएकाले सकेसम्म सँगै आउनुहोला।',
    },
    stays: [
      { name: { en: 'Hotel near Jawalakhel', ne: 'जावलाखेल नजिकको होटल' }, note: { en: 'Five minutes’ walk to the wedding venue', ne: 'विवाहस्थलबाट ५ मिनेट' }, mapQuery: 'hotels Jawalakhel Lalitpur' },
      { name: { en: 'Heritage stay in Patan', ne: 'पाटनको सम्पदा होटल' }, note: { en: 'For guests who want old-city mornings', ne: 'पुरानो सहरको अनुभवका लागि' }, mapQuery: 'heritage hotel Patan Durbar Square' },
    ],
    contacts: [
      { name: { en: 'Rohan Katwal', ne: 'रोहन कटवाल' }, role: { en: 'Bride’s brother', ne: 'दुलहीको दाजु' }, phone: '+977 9800000000' },
      { name: { en: 'Nisha Dahal', ne: 'निशा दाहाल' }, role: { en: 'Groom’s sister', ne: 'दुलहाकी बहिनी' }, phone: '+977 9811111111' },
    ],
    livestream: '', // e.g. a YouTube link for relatives abroad
  },

  rsvp: {
    // Google Apps Script web-app URL (see README). Empty = demo mode, replies stay in the browser.
    endpoint: '',
    deadline: { en: 'Kindly reply by 25 January 2027', ne: 'कृपया वि.सं. २०८३ माघ ११ गतेभित्र आफ्नो उपस्थितिको जानकारी गराइदिनुहोला।' },
    maxGuests: 6,
  },

  music: {
    volume: 0.75,
    // Guests can switch tracks from the music button. The first is the default.
    tracks: [
      { title: { en: 'Shehnai & Tanpura', ne: 'शहनाई र तानपुरा' }, mood: { en: 'Warm, ceremonial', ne: 'मङ्गलमय' }, src: '/audio/shehnai-tanpura.mp3', credit: '“Shehnai & Tanpura”, original score generated for this template (Artlist, Lyria 3 Pro)' },
      { title: { en: 'Temple Shehnai', ne: 'मन्दिरको शहनाई' }, mood: { en: 'Live ceremony recording', ne: 'प्रत्यक्ष रेकर्डिङ' }, src: '/audio/ceremony-shehnai.mp3', credit: '“Hindu Wedding Ceremony Music” by bobv2, CC0, freesound.org/s/395024' },
      { title: { en: 'Sitar Raga', ne: 'सितार राग' }, mood: { en: 'Slow, romantic', ne: 'शान्त, प्रेमिल' }, src: '/audio/raga-solyuga.mp3', credit: '“Solyuga” by KraftiM, CC BY 3.0, jamendo.com/track/118254' },
      { title: { en: 'Wedding Dhol', ne: 'विवाहको ढोल' }, mood: { en: 'Festive, for dancing', ne: 'रमाइलो' }, src: '/audio/wedding-dhol.mp3', credit: '“Indian Wedding Dhols” by rsn267, CC0, freesound.org/s/418780' },
    ],
  },

  closing: {
    ne: 'हजुरको उपस्थिति नै हाम्रा लागि सबैभन्दा ठूलो उपहार हुनेछ।',
    en: 'Your presence will be the greatest gift to us.',
  },

  theme: 'dhoka',
  // Per-theme replacements for any image/text slot (see src/core/slots.js). Filled by the studio.
  themeContent: {},
  // Content shared by every theme (see SHARED_SLOTS in src/core/slot-vocab.js): survives a theme change.
  content: { images: {}, texts: {} },

  share: {
    title: 'Ujjwal & Binisha · Shubha Bibaha',
    description: 'You are warmly invited to our wedding in Kathmandu, 12 February 2027.',
    image: 'art/og.jpg',
    siteUrl: '',
  },
};
