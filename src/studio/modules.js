// The modules of one invitation (what the couple sees; the owner sees them too, plus Admin tools).
import { h, icon, clear, card, skeleton, fill } from './dom.js';
import { api } from './api.js';
import { homeModule } from './m-home.js';
import { openingModule } from './m-opening.js';
import { peopleModule } from './m-people.js';
import { datesModule } from './m-dates.js';
import { photosModule } from './m-photos.js';
import { musicModule } from './m-music.js';
import { repliesModule } from './m-replies.js';
import { sendModule } from './m-send.js';
import { themesModule, customModule } from './m-themes.js';
import { accessPanel } from './admin-access.js';
import { activityText, whenText, deleteDialog } from './manage.js';
import { rsvpSection } from './sections.js';

function adminTools(ctx) {
  const doc = ctx.session.doc;
  const activity = h('div', skeleton(3));
  api(`/invitations/${ctx.slug}`).then((d) => {
    const items = [...(d.activity || [])].reverse().slice(0, 30);
    fill(activity, items.length
      ? h('ol.timeline', items.map((e) => h('li.timeline__item', { class: e.by === 'couple' ? 'is-couple' : '' }, h('span.timeline__text', activityText(e)), h('time.timeline__when', { datetime: e.at }, whenText(e.at)))))
      : h('p.muted', 'Nothing yet. Every change, publish and unpublish shows here.'));
  }).catch((err) => fill(activity, h('p.muted', err.message)));
  const rsvp = rsvpSection(ctx);
  rsvp.querySelector(':scope > .sec__head')?.remove();
  return [
    card('Client access', 'The couple’s private link and what they may change.', accessPanel({ slug: ctx.slug, names: ctx.session.names(), meta: ctx.meta, clientLink: doc.clientLink, theme: ctx.m.data.theme, onChange: (l) => { doc.clientLink = l; } })),
    card('Reply form', 'Settings for the RSVP form guests fill in.', rsvp),
    card('Activity', 'Who changed what, newest first.', activity),
    h('section.card.card--danger',
      h('header.card__head', h('h2.card__title', 'Delete this invitation'), h('p.card__help', 'Removes the invitation, its photos and replies. The link stops working.')),
      h('button.btn.btn--danger-ghost', { type: 'button', onclick: async () => { if (await deleteDialog({ slug: ctx.slug, names: ctx.session.names() })) { ctx.session.destroy(); location.hash = '#/invitations'; } } }, icon('trash', 16), 'Delete invitation')),
  ];
}

export const INV_MODULES = [
  { id: 'home', title: 'Home', ne: 'गृहपृष्ठ', icon: 'home', group: 'edit', render: homeModule, sub: '' },
  { id: 'opening', title: 'Opening', ne: 'सुरुवात', icon: 'door', group: 'edit', opening: true, render: openingModule, sub: 'The design, first words, pictures and colours guests see.', previewHint: 'Showing the opening. Edits appear as you type.' },
  { id: 'couple', title: 'Couple & family', short: 'Couple', ne: 'दुलाहा, दुलही र परिवार', icon: 'heart', group: 'edit', render: peopleModule, sub: 'Names, photos of each of you, and your families.' },
  { id: 'dates', title: 'Dates & events', short: 'Dates', ne: 'मिति र कार्यक्रम', icon: 'calendar', group: 'edit', render: datesModule, sub: 'When and where everything happens.' },
  { id: 'photos', title: 'Photos', ne: 'फोटो', icon: 'camera', group: 'edit', render: photosModule, sub: 'Add as many as you like. Tap a photo to move, replace or remove it.' },
  { id: 'music', title: 'Music', ne: 'संगीत', icon: 'music', group: 'edit', render: musicModule, sub: 'What plays while guests open the invitation.' },
  { id: 'replies', title: 'Replies', ne: 'जवाफहरू', icon: 'chat', group: 'edit', preview: false, render: repliesModule, sub: 'Who is coming, and their messages.' },
  { id: 'send', title: 'Send invitation', short: 'Send', ne: 'निमन्त्रणा पठाउनुहोस्', icon: 'send', group: 'edit', render: sendModule, sub: 'Publish, then share the link with your guests.' },
  { id: 'themes', title: 'Themes', ne: 'डिजाइनहरू', icon: 'palette', group: 'more', preview: false, render: themesModule },
  { id: 'custom', title: 'Custom design', ne: 'आफ्नै डिजाइन', icon: 'wand', group: 'more', preview: false, render: customModule },
  { id: 'admin', title: 'Admin tools', icon: 'key', group: 'more', adminOnly: true, preview: false, render: adminTools, sub: 'Client access, reply settings, activity and deletion.' },
];
