// The keyword table in docs/SEO-KEYWORDS.md: every public page's primary and secondary keywords (below), with its
// title and description as built (src/site/seo.mjs pageMeta) and the words in its <main> (from dist/, so build
// first). Rewrites the table between the KEYWORDS markers in docs/SEO-KEYWORDS.md:
//   npm run build && node scripts/seo-keyword-table.mjs
// Change a page's keywords here when its copy changes; the two sites never share a primary keyword.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import '../src/site/partials.mjs'; // first: it and landing.mjs import each other
import { pageMeta } from '../src/site/seo.mjs';

const ROOT = resolve(import.meta.dirname, '..');
/** id -> [primary, ...secondary] */
const KW = {
  home: ['digital wedding invitation Nepal', 'online nimto card', 'wedding invitation website Nepal', 'animated wedding invitation Nepal', 'e-invitation on WhatsApp Nepal'],
  designs: ['Nepali wedding card designs', 'wedding card design Nepal', 'animated wedding invitation designs', 'Nepali invitation templates'],
  occasions: ['invitation cards for Nepali ceremonies', 'online invitation card Nepal', 'bratabandha, pasni and gunyu cholo invitations'],
  'how-it-works': ['how to make a digital wedding invitation in Nepal', 'send e-invitation on WhatsApp Nepal', 'online nimto kasari banaune'],
  features: ['wedding RSVP website Nepal', 'invitation with Google Maps', 'Bikram Sambat date on invitation', 'invitation with music'],
  pricing: ['wedding invitation website price Nepal', 'digital wedding card price Nepal', 'eSewa Khalti invitation'],
  faq: ['digital wedding card FAQ Nepal', 'is e-invitation acceptable in Nepal', 'what to write on a Nepali wedding card', 'when to send wedding cards Nepal'],
  contact: ['Nimtto (brand)'],
  'land/np-wedding': ['wedding invitation card online Nepal', 'bihe ko nimto online', 'बिहेको निम्तो', 'Nepali wedding card wording', 'Nepali wedding card design', 'wedding invitation with RSVP Nepal', 'digital vs printed wedding card Nepal'],
  'land/np-engagement': ['maagni invitation card online', 'tika invitation', 'engagement invitation Nepal', 'माग्नी', 'ring ceremony (औंठी) invitation', 'maagni invitation wording'],
  'land/np-bratabandha': ['bratabandha invitation card online', 'bratabandha nimto card', 'bratabandha invitation wording', 'व्रतबन्ध', 'chudakarma', 'sacred thread ceremony invitation'],
  'land/np-gunyu': ['gunyo cholo invitation card', 'gunyu cholo nimto', 'gunyo choli ceremony', 'गुन्यू चोलो', 'girl coming-of-age ceremony Nepal'],
  'land/np-pasni': ['pasni invitation card online', 'annaprashan invitation card', 'pasni invitation wording', 'पास्नी', 'rice feeding ceremony invitation'],
  'land/np-nwaran': ['nwaran invitation card', 'naming ceremony invitation Nepal', 'न्वारन', 'baby name reveal invitation'],
  'land/np-birthday': ['birthday invitation card Nepal online', 'digital birthday invitation Nepal', 'chaurasi puja invitation', 'जन्मदिन', '84th birthday Nepal'],
  'land/np-janku': ['janku invitation card', 'bhimratharohan invitation', '77 year janku', 'जंकु', 'Newar old-age ceremony'],
  'land/np-reception': ['reception invitation card Nepal', 'bhoj nimto card', 'preetibhoj invitation', 'wedding party invitation Nepal'],
  'land/np-abroad': ['Nepali wedding invitation from abroad', 'NRN wedding invitation', 'invite relatives in Nepal online', 'pay in US dollars by PayPal'],
  'intl/home': ['animated wedding invitation website', 'wedding invitation website with RSVP', 'custom digital wedding invitation', 'designer-made e-invite'],
  'intl/designs': ['animated wedding invitation designs', 'wedding invitation designs with RSVP', 'luxury digital invitation designs'],
  'intl/occasions': ['digital invitations for every occasion', 'invitation with RSVP', 'online party invitations'],
  'intl/features': ['wedding RSVP website features', 'wedding website with maps and travel', 'personal guest links'],
  'intl/how': ['how to make a digital wedding invitation', 'send wedding invitation by text', 'when to send digital wedding invitations'],
  'intl/pricing': ['digital wedding invitation cost', 'one-time fee invitation', 'no subscription', 'custom digital invitation price'],
  'intl/faq': ['digital invitation FAQ', 'are digital wedding invitations acceptable', 'how to word a digital wedding invitation', 'is it a subscription'],
  'intl/contact': ['Nimtto (brand)'],
  'land/i-wedding': ['custom digital wedding invitation', 'designer-made wedding invitation', 'wedding invitation wording', 'when to send wedding invitations', 'what to include on a wedding invitation', 'digital vs printed wedding invitations'],
  'land/i-rsvp': ['wedding invitation with RSVP link', 'online RSVP wedding', 'RSVP deadline wedding', 'RSVP wording', 'meal choice RSVP', 'per-event RSVP'],
  'land/i-usa': ['digital wedding invitations USA', 'send wedding invitations by text', 'wedding invitation time zone', 'hotel block on wedding website', 'digital invitation pricing models'],
  'land/i-nepali': ['Nepali wedding invitation USA', 'Nepali e-invite', 'Nepali wedding invitation wording', 'Bikram Sambat date', 'inviting relatives from Nepal'],
  'land/i-southasian': ['South Asian wedding invitation website', 'Indian wedding e-invite USA', 'multi-event wedding invitation', 'sangeet invitation wording', 'mehndi invitation', 'per-event guest list'],
  'land/i-birthday': ['digital birthday invitation with RSVP', 'milestone birthday invitation', '50th birthday invitation wording', 'surprise party invitation', 'when to send birthday invitations'],
  'land/i-baby-shower': ['baby shower invitation website with RSVP', 'baby shower invitation wording', 'when to send baby shower invitations', 'sprinkle invitation', 'registry on baby shower invitation'],
  'land/i-bridal': ['bridal shower invitation online', 'bridal shower invitation wording', 'when to send bridal shower invitations', 'who hosts a bridal shower', 'bridal shower guest list etiquette'],
  'land/i-engagement': ['engagement party invitation online', 'engagement party invitation wording', 'who hosts an engagement party', 'when to send engagement party invitations'],
  'land/i-anniversary': ['25th and 50th anniversary invitation digital', '50th anniversary invitation wording', 'vow renewal invitation', 'anniversary no gifts wording', 'anniversary names by year'],
  'land/i-graduation': ['graduation party invitation digital', 'graduation open house invitation', 'graduation announcement vs invitation', 'graduation invitation wording'],
  'land/i-housewarming': ['housewarming invitation digital', 'housewarming invitation wording', 'when to have a housewarming', 'housewarming gift etiquette'],
  'land/i-dinner': ['dinner party invitation online', 'rehearsal dinner invitation', 'Friendsgiving invitation', 'how far in advance to send dinner invitations'],
  'land/i-corporate': ['corporate event invitation website', 'gala invitation wording', 'event RSVP website', 'product launch invitation', 'when to send corporate event invitations'],
};

/** words in the page's <main>, from the built page */
function words(path) {
  const f = resolve(ROOT, 'dist', `.${path}`, 'index.html');
  if (!existsSync(f)) return '';
  const html = readFileSync(f, 'utf8');
  const main = /<main[^>]*>([\s\S]*?)<\/main>/.exec(html)?.[1] || '';
  return main.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
const cell = (s) => String(s).replace(/\|/g, '\\|');
const rows = Object.entries(KW).map(([id, [primary, ...sec]]) => {
  const m = pageMeta(id);
  return `| ${m.path} | ${cell(primary)} | ${cell(sec.join('; '))} | ${cell(m.title)} (${m.title.length}) | ${cell(m.desc)} (${m.desc.length}) | ${words(m.path)} |`;
});
const table = `| Path | Primary keyword | Secondary | Title | Description | Words |\n|---|---|---|---|---|---|\n${rows.join('\n')}`;
const DOC = resolve(ROOT, 'docs', 'SEO-KEYWORDS.md');
const doc = readFileSync(DOC, 'utf8');
const A = '<!-- KEYWORDS:START (scripts/seo-keyword-table.mjs) -->';
const B = '<!-- KEYWORDS:END -->';
if (!doc.includes(A)) { console.error('seo-keyword-table: add the KEYWORDS markers to docs/SEO-KEYWORDS.md first'); process.exit(1); }
const at = doc.indexOf(A);
const end = doc.indexOf(B, at);
writeFileSync(DOC, `${doc.slice(0, at)}${A}\n${table}\n${doc.slice(end)}`);
console.log(`keyword table: ${rows.length} pages`);
