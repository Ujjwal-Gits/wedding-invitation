// Swayambar (स्वयम्बर) · two marigold garlands swing apart on the jaimala; the two families' sides converge. Plain data, no imports (the server loads this file).
// Invitation data (names, parents, dates, events, card wording, gallery, RSVP, closing) lives in the studio sections.
export default {
  "theme": "swayambar",
  "images": {
    "hero.ganesh": {
      "label": "Ganesh (on the opening and the card)",
      "kind": "detail",
      "default": {
        "lg": "/themes/_nepali/ganesh-ink.webp",
        "sm": "/themes/_nepali/ganesh-ink-sm.webp",
        "w": 1064,
        "h": 1400,
        "alt": "Shri Ganesh, drawn in fine red line"
      },
      "note": "A cut-out picture with a transparent background works best. Type off in the Ganesh line to hide him."
    },
    "hero.couple": {
      "label": "Opening picture: the jaimala",
      "kind": "detail",
      "default": {
        "lg": "/themes/swayambar/art/couple.webp",
        "sm": "/themes/swayambar/art/couple-sm.webp",
        "w": 1400,
        "h": 1145,
        "alt": "The groom in a maroon daura suruwal and Dhaka topi and the bride in a red lehenga and veil hold up marigold garlands to each other"
      },
      "note": "A wide cut-out picture with a transparent background, the groom on the left and the bride on the right."
    },
    "couple.lead": {
      "label": "Main photo of the couple",
      "kind": "couple",
      "default": {
        "portrait": 0
      },
      "note": "Shown whole between the two families' silk wings. Portrait works best."
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
        "en": "Two families, one garland",
        "ne": "दुई परिवार, एउटै माला"
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
      "label": "Opening: one short line under the names",
      "default": {
        "en": "With joy, we invite you to the wedding of our children",
        "ne": "दुवै परिवारको आशीर्वादसहित हजुरलाई सादर निम्तो"
      },
      "max": 90,
      "multiline": true
    },
    "families.title": {
      "label": "Families: title",
      "default": {
        "en": "Two families, coming together",
        "ne": "दुई परिवारको मिलन"
      },
      "max": 48
    },
    "families.groomSide": {
      "label": "Families: the groom's side label",
      "default": {
        "en": "The groom's side",
        "ne": "वर पक्ष"
      },
      "max": 28
    },
    "families.brideSide": {
      "label": "Families: the bride's side label",
      "default": {
        "en": "The bride's side",
        "ne": "कन्या पक्ष"
      },
      "max": 28
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
        "en": "Soon to be married, with the blessings of both families.",
        "ne": "दुवै परिवारको आशीर्वादसहित, चाँडै विवाह बन्धनमा।"
      },
      "max": 90,
      "multiline": true
    },
    "date.kicker": {
      "label": "Date: small label",
      "default": {
        "en": "Where the two sides meet",
        "ne": "दुई पक्षको भेट"
      },
      "max": 32
    },
    "date.title": {
      "label": "Date: title",
      "default": {
        "en": "The auspicious day",
        "ne": "शुभ दिन"
      },
      "max": 32
    },
    "count.title": {
      "label": "Countdown: title",
      "default": {
        "en": "Until the garlands are exchanged",
        "ne": "जयमाला साटिन बाँकी"
      },
      "max": 40
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
        "en": "Moments together",
        "ne": "सँगैका पलहरू"
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
    "scratch.hint": {"label": "Scratch card: line on the cover", "default": {"en": "Scratch to reveal the date", "ne": "मिति हेर्न कोर्नुहोस्"}, "max": 32},
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
    '--sw-wine': { label: 'Wine red', default: '#6B1024' },
    '--sw-gate': { label: 'Opening silk', default: '#4A0915' },
    '--sw-marigold': { label: 'Marigold', default: '#E7A33A' },
    '--sw-ivory': { label: 'Ivory paper', default: '#FBF5EA' },
  },
};
