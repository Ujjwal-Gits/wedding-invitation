// Agni (अग्नि) · the sacred fire at night, seven rounds around it: every theme image and text, replaceable from the studio. Plain data, no imports (the server loads this file).
// Invitation data (names, parents, dates, events, card wording, gallery, RSVP, closing) lives in the studio sections.
export default {
  "theme": "agni",
  "images": {
    "hero.ganesh": {
      "label": "Ganesh (on the opening and the card)",
      "kind": "detail",
      "default": {
        "lg": "/themes/_nepali/ganesh-brass.webp",
        "sm": "/themes/_nepali/ganesh-brass-sm.webp",
        "w": 831,
        "h": 1400,
        "alt": "Shri Ganesh, a seated brass statue"
      },
      "note": "A cut-out picture with a transparent background works best. Type off in the Ganesh line to hide him."
    },
    "couple.lead": {
      "label": "Main photo of the couple",
      "kind": "couple",
      "default": {
        "portrait": 0
      },
      "note": "Shown whole in the theme frame. Portrait works best."
    },
    "gallery.1": {
      "label": "Photos: photo 1",
      "kind": "couple",
      "default": {
        "portrait": 1
      },
      "note": "The couple. Shown whole, never cropped. Repeats are skipped."
    },
    "gallery.2": {
      "label": "Photos: photo 2",
      "kind": "couple",
      "default": {
        "portrait": 2
      },
      "note": "The couple. Shown whole, never cropped. Repeats are skipped."
    },
    "gallery.3": {
      "label": "Photos: photo 3",
      "kind": "couple",
      "default": {
        "portrait": 3
      },
      "note": "The couple. Shown whole, never cropped. Repeats are skipped."
    },
    "gallery.4": {
      "label": "Photos: photo 4",
      "kind": "couple",
      "default": {
        "portrait": 4
      },
      "note": "The couple. Shown whole, never cropped. Repeats are skipped."
    },
    "gallery.5": {
      "label": "Photos: photo 5",
      "kind": "couple",
      "default": {
        "portrait": 5
      },
      "note": "The couple. Shown whole, never cropped. Repeats are skipped."
    },
    "gallery.6": {
      "label": "Photos: photo 6",
      "kind": "couple",
      "default": {
        "portrait": 6
      },
      "note": "The couple. Shown whole, never cropped. Repeats are skipped."
    },
    "families.bride": {
      "label": "Bride portrait (families)",
      "kind": "bride",
      "default": null,
      "note": "Shown only when bride and groom both have their own photo."
    },
    "families.groom": {
      "label": "Groom portrait (families)",
      "kind": "groom",
      "default": null,
      "note": "Shown only when bride and groom both have their own photo."
    }
  },
  "texts": {
    "gate.line": {
      "label": "Opening: line above the button",
      "default": {
        "en": "You are invited to our wedding",
        "ne": "हाम्रो शुभ विवाहमा हजुरलाई निम्तो"
      },
      "max": 60
    },
    "gate.open": {
      "shared": "gate.open",
      "label": "Opening: open button",
      "default": {
        "en": "Open the invitation",
        "ne": "निम्तो खोल्नुहोस्"
      },
      "max": 28
    },
    "gate.quiet": {
      "shared": "gate.quiet",
      "label": "Opening: open without music",
      "default": {
        "en": "Open without music",
        "ne": "संगीतबिना खोल्नुहोस्"
      },
      "max": 32
    },
    "ganesh.show": {
      "label": "Ganesh (type off to hide him)",
      "default": {
        "en": "on",
        "ne": "on"
      },
      "max": 8
    },
    "hero.invocation": {
      "label": "Opening: invocation (type - to remove)",
      "default": {
        "en": "॥ श्री गणेशाय नमः ॥",
        "ne": "॥ श्री गणेशाय नमः ॥"
      },
      "max": 40
    },
    "hero.title": {
      "shared": "hero.kicker",
      "label": "Opening: title",
      "default": {
        "en": "Shubha Bibaha",
        "ne": "शुभ विवाह"
      },
      "max": 24
    },
    "hero.line": {
      "label": "Opening: one short line above the names",
      "default": {
        "en": "With the fire as our witness, we invite you to the wedding of",
        "ne": "अग्निलाई साक्षी राखी हुने हाम्रो शुभ विवाहमा हजुरलाई सादर निम्तो"
      },
      "max": 90,
      "multiline": true
    },
    "couple.title": {
      "shared": "couple.title",
      "label": "Couple: title",
      "default": {
        "en": "The two of us",
        "ne": "हामी दुई"
      },
      "max": 28
    },
    "couple.line": {
      "shared": "couple.line",
      "label": "Couple: one line (type - to remove)",
      "default": {
        "en": "Seven steps around the fire, and a lifetime after.",
        "ne": "अग्निको सात फेरा, अनि जीवनभरको साथ।"
      },
      "max": 90,
      "multiline": true
    },
    "vows.kicker": {
      "label": "Seven vows: small label",
      "default": {
        "en": "Saptapadi",
        "ne": "सप्तपदी"
      },
      "max": 28
    },
    "vows.title": {
      "label": "Seven vows: title",
      "default": {
        "en": "Seven rounds, seven vows",
        "ne": "सात फेरा, सात वचन"
      },
      "max": 36
    },
    "vow.1": {
      "label": "Seven vows: vow 1 (nourishment)",
      "default": {
        "en": "With the first round, we promise to nourish each other and the home we make.",
        "ne": "पहिलो फेरामा, एकअर्कालाई र हाम्रो घरलाई पालनपोषण गर्ने वचन।"
      },
      "max": 110,
      "multiline": true
    },
    "vow.2": {
      "label": "Seven vows: vow 2 (strength)",
      "default": {
        "en": "With the second, to grow strong together, in body, mind and spirit.",
        "ne": "दोस्रो फेरामा, तन, मन र आत्माले सँगै बलियो बन्ने वचन।"
      },
      "max": 110,
      "multiline": true
    },
    "vow.3": {
      "label": "Seven vows: vow 3 (prosperity)",
      "default": {
        "en": "With the third, to earn with honesty and share all that we have.",
        "ne": "तेस्रो फेरामा, इमानदारीले कमाउने र सबै कुरा बाँडेर चलाउने वचन।"
      },
      "max": 110,
      "multiline": true
    },
    "vow.4": {
      "label": "Seven vows: vow 4 (family)",
      "default": {
        "en": "With the fourth, to honour both our families as one.",
        "ne": "चौथो फेरामा, दुवै परिवारलाई एउटै ठानी आदर गर्ने वचन।"
      },
      "max": 110,
      "multiline": true
    },
    "vow.5": {
      "label": "Seven vows: vow 5 (care)",
      "default": {
        "en": "With the fifth, to care for those who come after us.",
        "ne": "पाँचौं फेरामा, हाम्रा सन्तान र आफन्तको स्याहार गर्ने वचन।"
      },
      "max": 110,
      "multiline": true
    },
    "vow.6": {
      "label": "Seven vows: vow 6 (seasons)",
      "default": {
        "en": "With the sixth, to walk together through every season of life.",
        "ne": "छैटौं फेरामा, जीवनका हरेक ऋतुमा सँगसँगै हिँड्ने वचन।"
      },
      "max": 110,
      "multiline": true
    },
    "vow.7": {
      "label": "Seven vows: vow 7 (friendship)",
      "default": {
        "en": "With the seventh, to stay friends and companions for life.",
        "ne": "सातौं फेरामा, जीवनभर साथी र सहयात्री भइरहने वचन।"
      },
      "max": 110,
      "multiline": true
    },
    "date.kicker": {
      "label": "Date: small label",
      "default": {
        "en": "Save the date",
        "ne": "शुभ साइत"
      },
      "max": 28
    },
    "date.title": {
      "label": "Date: title",
      "default": {
        "en": "The night of the fire",
        "ne": "अग्नि साक्षीको रात"
      },
      "max": 32
    },
    "count.title": {
      "label": "Countdown: title",
      "default": {
        "en": "Until the fire is lit",
        "ne": "अग्नि प्रज्वलन हुन बाँकी"
      },
      "max": 36
    },
    "families.title": {
      "label": "Families: title",
      "default": {
        "en": "Two families, one sacred fire",
        "ne": "दुई परिवार, एउटै पवित्र अग्नि"
      },
      "max": 48
    },
    "prog.kicker": {
      "label": "Programme: small label",
      "default": {
        "en": "When and where",
        "ne": "कहिले र कहाँ"
      },
      "max": 28
    },
    "prog.title": {
      "shared": "events.title",
      "label": "Programme: title",
      "default": {
        "en": "The celebrations",
        "ne": "कार्यक्रम"
      },
      "max": 32
    },
    "gallery.title": {
      "label": "Photos: title",
      "default": {
        "en": "By the firelight",
        "ne": "दियोको उज्यालोमा"
      },
      "max": 32
    },
    "card.line": {
      "shared": "hero.line",
      "label": "Card wording: the one line of invitation",
      "default": {
        "en": "We joyfully invite you and your family to bless the couple with your presence.",
        "ne": "शुभ विवाहमा सपरिवार पधारी आशीर्वाद दिनुहुन हार्दिक अनुरोध छ।"
      },
      "max": 100,
      "multiline": true
    },
    "card.button": {
      "shared": "card.button",
      "label": "Button: read the full card",
      "default": {
        "en": "Read the full invitation",
        "ne": "निमन्त्रणा पत्र पढ्नुहोस्"
      },
      "max": 36
    },
    "scratch.hint": {"label": "Scratch card: line on the cover", "default": {"en": "Wipe the soot to see the date", "ne": "खरानी पुछेर मिति हेर्नुहोस्"}, "max": 32},
    "scratch.button": {"label": "Scratch card: button that reveals it at once", "default": {"en": "Tap to reveal", "ne": "थिचेर हेर्नुहोस्"}, "max": 24},
    "rsvp.title": {
      "shared": "reply.title",
      "label": "RSVP: title",
      "default": {
        "en": "Will you join us?",
        "ne": "हजुर आउनुहुन्छ?"
      },
      "max": 32
    },
    "rsvp.send": {
      "label": "RSVP: send button",
      "default": {
        "en": "Send your reply",
        "ne": "जवाफ पठाउनुहोस्"
      },
      "max": 28
    }
  },
  // Hero/opening colours the client may change (see docs/PLATFORM.md); applied inline on <body>.
  colors: {
    '--ag-night': { label: 'Night', default: '#140C10' },
    '--ag-brass': { label: 'Brass', default: '#D2AC66' },
    '--ag-ember': { label: 'Firelight', default: '#F0873A' },
    '--ag-ivory': { label: 'Text', default: '#F4E8D3' },
  },
};
