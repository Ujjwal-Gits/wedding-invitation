// The About pages' body (/about/ and /international/about/): what Nimtto is, who it is for, how we work, the team
// that signs the articles (#team, the blog's author page) and how to reach us. Facts only; the owner's own name,
// photo and story appear only once filled in src/site/seo-site.mjs (OWNER), never as visible placeholders.
//   <!--@about:np--> / <!--@about:intl-->         the page body
//   <!--@about-ld:np--> / <!--@about-ld:intl-->   AboutPage about/mainEntity, the team and (once filled) the owner
// Plain module: Node runs it at build, never the browser.
import { SITE_URL } from './content.mjs';
import { NAP, OWNER, TEAM_URL, AUTHOR_LD } from './seo-site.mjs';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

const COPY = {
  np: {
    eyebrow: 'About us',
    h1: 'Invitations made <em>with you,</em> in Nepal.',
    lede: 'Nimtto (<span lang="ne">निम्तो</span>, “invitation” in Nepali) makes animated invitation websites with RSVP. A real designer sets up each one with the family, and guests open it from one link.',
    what: [
      'An invitation that opens like a real card, then a small website for the event: every ceremony with its time and a Google Maps pin, travel notes, your story, photos, music and a reply form for each event.',
      'Everything can be in English and Nepali, with dates in Bikram Sambat and AD. Guests need no app and no account; it works on any phone.',
    ],
    who: [
      ['Families in Nepal', 'Weddings, and every family occasion: maagni, bratabandha, gunyu cholo, pasni, nwaran, birthdays, janku and bhoj.', '/occasions/'],
      ['Families abroad', 'Nepali families in the USA, the UK, Australia, the Gulf and elsewhere with a wedding at home, who pay by card or PayPal.', '/nepali-abroad/'],
      ['Couples worldwide', 'Weddings and celebrations anywhere, priced in US dollars, on Nimtto International.', '/international/'],
    ],
    pay: 'Nepal: Khalti, eSewa or a bank QR, checked by hand. From abroad: card or PayPal in US dollars.',
    links: { how: '/how-it-works/', pricing: '/pricing/', contact: '/contact/', faq: '/faq/' },
  },
  intl: {
    eyebrow: 'About us',
    h1: 'A real designer <em>for every invitation.</em>',
    lede: 'Nimtto makes animated invitations with an event website and RSVP. We are based in Nepal and work online with couples and hosts in the USA, the UK, Canada, Australia, the UAE and beyond.',
    what: [
      'An invitation that opens like a real card, then your event website: the schedule with maps, travel and hotel notes, your story, photos, your song and an RSVP for each event.',
      'Guests open one link on any phone. No app, no account, no ads.',
    ],
    who: [
      ['Couples', 'Weddings of every faith and size, from one evening to a three-day celebration.', '/international/occasions/wedding/'],
      ['Hosts', 'Birthdays, baby and bridal showers, engagements, anniversaries, graduations and company events, designed for you.', '/international/occasions/'],
      ['Nepali and South Asian families', 'Multi-day weddings in English and Nepali, with a design from our Nepal collection if you like.', '/international/nepali-wedding-invitations/'],
    ],
    pay: 'Card or PayPal, in US dollars, through PayPal’s checkout. The plan switches on as soon as the payment goes through.',
    links: { how: '/international/how-it-works/', pricing: '/international/pricing/', contact: '/international/contact/', faq: '/international/faq/' },
  },
};

function owner() {
  if (!OWNER.name) {
    return '<!-- TODO(owner): your name, role, photo and story go in src/site/seo-site.mjs (OWNER); this card appears once they are filled. -->';
  }
  const img = OWNER.photo ? `<img class="about-owner__img" src="${esc(OWNER.photo)}" width="160" height="160" alt="${esc(OWNER.name)}" loading="lazy" decoding="async" />` : '';
  const story = OWNER.story ? String(OWNER.story).split(/\n{2,}/).map((p) => `<p>${esc(p)}</p>`).join('') : '';
  return `<figure class="about-owner">${img}<figcaption><p class="about-owner__name">${esc(OWNER.name)}</p>${OWNER.role ? `<p class="about-owner__role">${esc(OWNER.role)}</p>` : ''}${story}</figcaption></figure>`;
}

function about(market = 'np') {
  const c = COPY[market === 'intl' ? 'intl' : 'np'];
  return `<header class="wrap pagehead">
      <p class="eyebrow">${c.eyebrow}</p>
      <h1 class="display">${c.h1}</h1>
      <p class="lede" data-speak>${c.lede}</p>
    </header>

    <section class="wrap about-split" aria-labelledby="what-h">
      <h2 class="h2" id="what-h">What we <em>make.</em></h2>
      <div class="about-prose">${c.what.map((p) => `<p>${p}</p>`).join('')}</div>
    </section>

    <section class="sec sec--blush" aria-labelledby="who-h">
      <div class="wrap">
        <header class="shead"><p class="eyebrow">Who it is for</p><h2 class="h2" id="who-h">Families, couples <em>and hosts.</em></h2></header>
        <dl class="about-list">${c.who.map(([t, d, href]) => `<div><dt><a href="${href}">${t}</a></dt><dd>${d}</dd></div>`).join('')}</dl>
      </div>
    </section>

    <section class="sec wrap" aria-labelledby="how-h">
      <header class="shead"><p class="eyebrow">How we work</p><h2 class="h2" id="how-h">Four steps, <em>one link.</em></h2></header>
      <ol class="about-steps">
        <li><h3>You choose a design and a plan</h3><p>Every price is on the <a href="${c.links.pricing}">pricing page</a>. You pay once: no subscription and no charge per guest.</p></li>
        <li><h3>You pay</h3><p>${c.pay}</p></li>
        <li><h3>Your designer sets it up with you</h3><p>On WhatsApp or email, usually in 1 to 3 business days. You check every change before any guest sees it.</p></li>
        <li><h3>You share one link</h3><p>Guests open it and reply; you see every answer in your dashboard. The invitation stays online for at least one year after the event.</p></li>
      </ol>
      <p class="about-more"><a href="${c.links.how}">More on how it works</a> · <a href="${c.links.faq}">Questions and answers</a></p>
    </section>

    <section class="sec sec--blush" aria-labelledby="promise-h">
      <div class="wrap about-split">
        <h2 class="h2" id="promise-h">What you can <em>count on.</em></h2>
        <ul class="about-prose about-ticks">
          <li>A person, not a bot, replies, ${NAP.replies}, in English or Nepali.</li>
          <li>Your invitation is not listed anywhere. Only people you send the link to can open it, and search engines are told not to index it.</li>
          <li>We never sell your details or your guests’ replies. See the <a href="/privacy/">privacy policy</a>.</li>
          <li>Payments are final, but a problem with your invitation is fixed free. See the <a href="/refunds/">refund policy</a> and <a href="/terms/">terms</a>.</li>
        </ul>
      </div>
    </section>

    <section class="sec wrap about-split" id="team" aria-labelledby="team-h">
      <h2 class="h2" id="team-h">The Nimtto <em>Team.</em></h2>
      <div class="about-prose">
        <p>Articles and guides on Nimtto are signed “Nimtto Team”: the designers who set up invitations with families and the people who build and run nimtto.com. We write from that work, and check each piece before it goes up.</p>
        <p>If something is wrong or out of date, email <a href="mailto:${NAP.email}">${NAP.email}</a> and we will correct it.</p>
        ${owner()}
      </div>
    </section>

    <section class="sec sec--flush-top" aria-labelledby="reach-h">
      <div class="wrap">
        <header class="shead"><p class="eyebrow">Contact</p><h2 class="h2" id="reach-h">Talk to <em>us.</em></h2></header>
        <dl class="about-list about-list--nap">
          <div><dt>Name</dt><dd>${NAP.name} (<span lang="ne">${NAP.nameNe}</span>)</dd></div>
          <div><dt>Email</dt><dd><a href="mailto:${NAP.email}" data-contact="email"><span data-contact="email-text">${NAP.email}</span></a></dd></div>
          <div><dt>WhatsApp</dt><dd><a href="https://wa.me/${NAP.wa}" target="_blank" rel="noopener" data-contact="wa"><span data-contact="wa-text">${NAP.phone}</span></a></dd></div>
          <div><dt>Based in</dt><dd>${NAP.countryName}. We work online with families and couples everywhere.</dd></div>
          <div><dt>Languages</dt><dd>${NAP.languages.join(' and ')}</dd></div>
        </dl>
        <p class="about-more"><a class="btn btn--accent" href="${c.links.contact}">Contact page</a></p>
      </div>
    </section>`;
}

/** The team that signs articles, and the owner once filled in (the AboutPage node itself comes from the head). */
function aboutLd() {
  const graph = [
    { ...AUTHOR_LD, description: 'The designers who set up Nimtto invitations and the people who build and run nimtto.com. Articles signed “Nimtto Team” are written and checked by them.', email: NAP.email, logo: { '@id': `${SITE_URL}/#logo` } },
  ];
  if (OWNER.name) {
    graph.push({
      '@type': 'Person', '@id': `${SITE_URL}/about/#owner`, name: OWNER.name, url: `${SITE_URL}/about/#team`,
      ...(OWNER.role ? { jobTitle: OWNER.role } : {}), ...(OWNER.photo ? { image: `${SITE_URL}${OWNER.photo}` } : {}),
      worksFor: { '@id': `${SITE_URL}/#org` }, ...(OWNER.sameAs?.length ? { sameAs: OWNER.sameAs } : {}),
    });
  }
  return ld({ '@context': 'https://schema.org', '@graph': graph });
}

export const TRUST_PARTIALS = { about, 'about-ld': aboutLd, 'team-url': () => TEAM_URL };
