// Janti (जन्ती) · walk with the groom's procession down an old Newari street: every theme image and text, replaceable from the studio. Plain data, no imports (the server loads this file).
// Invitation data (names, parents, dates, events, card wording, gallery, RSVP, closing) lives in the studio sections.
export default {
  "theme": "janti",
  "images": {
    "hero.ganesh": {
      "label": "Ganesh (in the carved arch of the opening, and on the card)",
      "kind": "detail",
      "default": {
        "lg": "/themes/_nepali/ganesh-brass.webp",
        "sm": "/themes/_nepali/ganesh-brass-sm.webp",
        "w": 831,
        "h": 1400,
        "alt": "Shri Ganesh in polished brass"
      },
      "note": "A cut-out picture with a transparent background works best. Type off in the Ganesh line to hide him."
    },
    "couple.lead": {
      "label": "Main photo of the couple",
      "kind": "couple",
      "default": {
        "portrait": 0
      },
      "note": "Shown whole in a carved Newari window on the street. Portrait works best."
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
        "en": "The janti is on its way",
        "ne": "जन्ती आउँदैछ"
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
      "label": "Opening: one short line under the names (type - to remove)",
      "default": {
        "en": "Walk with us to the wedding",
        "ne": "विवाहसम्म हामीसँगै हिँड्नुहोस्"
      },
      "max": 60,
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
        "en": "Soon to be married, with the blessings of both families.",
        "ne": "दुवै परिवारको आशीर्वादसहित, चाँडै विवाह बन्धनमा।"
      },
      "max": 90,
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
        "en": "The auspicious day",
        "ne": "शुभ दिन"
      },
      "max": 32
    },
    "count.title": {
      "label": "Countdown: title",
      "default": {
        "en": "Counting down to the big day",
        "ne": "शुभ घडी आउन बाँकी"
      },
      "max": 36
    },
    "families.title": {
      "label": "Families: title",
      "default": {
        "en": "With the blessings of our families",
        "ne": "दुवै परिवारको आशीर्वादसहित"
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
    "walk.title": {
      "label": "Street: the signpost at the start of the walk",
      "default": {
        "en": "Walk with the janti",
        "ne": "जन्तीसँगै हिँडौं"
      },
      "max": 32
    },
    "walk.line": {
      "label": "Street: one line on the signpost (type - to remove)",
      "default": {
        "en": "Keep scrolling: the band leads the way to the bride's house.",
        "ne": "तल सार्दै जानुहोस्, बाजाले बेहुलीको घरसम्म पुर्‍याउँछ।"
      },
      "max": 80,
      "multiline": true
    },
    "arrive.title": {
      "label": "Street: the sign at the bride's house",
      "default": {
        "en": "The bride's house",
        "ne": "बेहुलीको घर"
      },
      "max": 32
    },
    "arrive.line": {
      "label": "Street: line under that sign",
      "default": {
        "en": "The kalash is full and the lamps are lit. Please reply at the door.",
        "ne": "कलश भरिएको छ, दियो बलेको छ। ढोकामै जवाफ दिनुहोला।"
      },
      "max": 90,
      "multiline": true
    },
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
    '--jt-red': { label: 'Sindoor red (curtain, names)', default: '#A3261B' },
    '--jt-gold': { label: 'Gold (carving lines)', default: '#D9A847' },
    '--jt-wood': { label: 'Carved wood', default: '#3B2015' },
    '--jt-dusk': { label: 'Dusk over the street (opening)', default: '#1E120D' },
  },
};
