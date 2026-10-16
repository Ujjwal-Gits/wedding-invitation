// Couple & family: names, a portrait each, parents and homes, who is inviting, the story and the card wording.
import { h, icon, card } from './dom.js';
import { textField, biField, photoSlot } from './fields.js';
import { storySection, wordingSection } from './sections.js';

function person(ctx, who, title, short) {
  const m = ctx.m;
  return h('div.person',
    h('h3.person__title', title),
    biField(m, ['couple', who, 'name'], { label: 'First name', max: 60, placeholderEn: who === 'bride' ? 'Binisha' : 'Ujjwal', placeholderNe: who === 'bride' ? 'बिनिशा' : 'उज्ज्वल' }),
    biField(m, ['couple', who, 'fullName'], { label: 'Full name on the card', hint: 'Optional. With titles, as the printed card says it.', max: 120, placeholderNe: who === 'bride' ? 'सौ.का. …' : 'चि. …' }),
    photoSlot(m, ['couple', who, 'photo'], ctx, { label: `${short}’s photo`, hint: 'Optional. An upright photo works best.', shape: 'port' }));
}

const fold = (title, sub, ...body) => h('details.fold',
  h('summary.fold__sum', h('span', h('b', title), sub ? h('small', sub) : null), icon('down', 18)),
  h('div.fold__body', ...body));

const strip = (node) => { node.querySelector(':scope > .sec__head')?.remove(); return node; };

export function peopleModule(ctx) {
  const m = ctx.m;
  return [
    card('The couple', null, h('div.pair', person(ctx, 'bride', 'Bride · दुलही', 'Bride'), person(ctx, 'groom', 'Groom · दुलाहा', 'Groom'))),
    card('Families', 'Shown under each name, and who signs the invitation.',
      h('div.pair',
        h('div.stack', biField(m, ['couple', 'bride', 'parents'], { label: 'Bride’s parents', max: 240, placeholderEn: 'Mr. … & Mrs. …' }), biField(m, ['couple', 'bride', 'home'], { label: 'Bride’s family home', max: 160 })),
        h('div.stack', biField(m, ['couple', 'groom', 'parents'], { label: 'Groom’s parents', max: 240, placeholderEn: 'Mr. … & Mrs. …' }), biField(m, ['couple', 'groom', 'home'], { label: 'Groom’s family home', max: 160 }))),
      biField(m, ['hosts'], { label: 'Who is inviting', max: 200, placeholderEn: 'The Thapa & Shrestha families', placeholderNe: 'थापा तथा श्रेष्ठ परिवार' }),
      textField(m, ['couple', 'hashtag'], { label: 'Wedding hashtag (optional)', max: 60, placeholder: '#BinishaWedsUjjwal', class: 'field--narrow' })),
    fold('Your story', 'A few short moments, one sentence each', strip(storySection(ctx))),
    fold('Invitation card wording', 'The full traditional card text, shloka and saptapadi', strip(wordingSection(ctx))),
  ];
}
