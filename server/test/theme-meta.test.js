// (was markets.test.js on the themes branch)
// Design metadata (src/core/markets.js, server/lib/catalog.js): market, style and occasions per design, the manifest
// override, and the invitation's optional occasion (one-person occasions publish with one name).
// Run: npm test (in server/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.DATA_ROOT ||= mkdtempSync(join(tmpdir(), 'nimtto-markets-'));

const { MARKETS, STYLES, OCCASIONS, isOccasion, isCoupleOccasion, inMarket } = await import('../../src/core/markets.js');
const { listThemes, catalogMeta, metaOf } = await import('../lib/catalog.js');
const { loadManifest } = await import('../lib/slots.js');
const { sanitizeInvitation, publishProblems, ValidationError } = await import('../lib/validate.js');
const { config: demo } = await import('../../src/config.js');

test('every listed design carries a valid market, style and occasions', () => {
  const list = listThemes();
  assert.ok(list.length > 20);
  for (const t of list) {
    assert.ok(MARKETS.includes(t.market), `${t.slug} market`);
    assert.ok(t.style === '' || STYLES.includes(t.style), `${t.slug} style`);
    assert.ok(Array.isArray(t.occasions) && t.occasions.length && t.occasions.every(isOccasion), `${t.slug} occasions`);
  }
  // the Nepal designs default to a Nepal wedding design
  assert.deepEqual(catalogMeta('mala'), { market: 'np', style: '', faith: '', occasions: ['wedding'] });
  assert.equal(catalogMeta('noor').faith, 'muslim');
  assert.equal(catalogMeta('tuscany').faith, 'christian');
  const og = list.find((t) => t.slug === 'olive-grove');
  assert.ok(og, 'olive-grove is listed');
  assert.equal(og.market, 'intl');
  assert.equal(og.style, 'garden');
  assert.ok(og.occasions.includes('wedding'));
});

test('a manifest overrides the catalog only with valid values', () => {
  assert.deepEqual(metaOf('mala', { market: 'both', style: 'classic', occasions: ['wedding', 'nope', 'birthday'] }),
    { market: 'both', style: 'classic', faith: '', occasions: ['wedding', 'birthday'] });
  assert.deepEqual(metaOf('mala', { market: 'mars', style: 'loud', occasions: ['nope'] }), catalogMeta('mala'));
  // catalogMeta hands out copies
  catalogMeta('olive-grove').occasions.push('x');
  assert.ok(!catalogMeta('olive-grove').occasions.includes('x'));
});

test('the olive-grove manifest declares its market and faith', async () => {
  const m = await loadManifest('olive-grove');
  assert.equal(m.market, 'intl');
  assert.equal(m.style, 'garden');
  assert.equal(m.faith, 'christian');
  // neutral art (an olive wreath; the cross shows only on a Christian invitation): every community but Hindu
  assert.deepEqual([...m.religions].sort(), ['buddhist', 'christian', 'kirat', 'muslim', 'other']);
  for (const id of ['hero.kicker', 'hero.line', 'rsvp.title', 'count.done']) assert.ok(m.texts[id], id);
});

// docs/FAITH-DESIGNS.md: each design's communities, judged from its own art; nothing is inferred
test('faith mapping: explicit per design, Hindu art stays Hindu, the site lists agree with the manifests', async () => {
  const { THEMES } = await import('../../src/site/themes.js');
  const { INTL_THEMES, intlAsNp } = await import('../../src/site/intl-designs.js');
  const { themeReligions } = await import('../../src/core/faith.js');
  // 'other' no longer brings Buddhist and Kirat with it
  assert.deepEqual(themeReligions({ religions: ['christian', 'other'] }), ['christian', 'other']);
  assert.deepEqual(themeReligions({}), ['hindu']);
  const site = [...THEMES, ...INTL_THEMES.map(intlAsNp)];
  const man = {};
  for (const t of site) {
    man[t.slug] = (await loadManifest(t.slug)).religions;
    assert.deepEqual([...t.religions].sort(), [...man[t.slug]].sort(), `${t.slug}: site list = slots.js`);
  }
  const has = (f) => Object.keys(man).filter((s) => man[s].includes(f)).sort();
  // Ganesh, Om, kalash, sindoor, Hindu rites or Hindu-dress couples in the art: Hindu only
  const hinduArt = ['agni', 'bagaicha', 'chitra', 'dhoka', 'durbar', 'ghar', 'gurans', 'hariyo', 'janti', 'kalapi', 'laali', 'mahal', 'mala', 'mandap',
    'mangal', 'mehendi', 'nimantrana', 'pardaa', 'rajdwar', 'rangoli', 'shree', 'sindoor', 'swayambar'];
  for (const s of hinduArt) assert.deepEqual(man[s], ['hindu'], `${s} is Hindu only`);
  assert.deepEqual(has('christian'), ['amalfi', 'blush-roses', 'dhaka', 'garden-party', 'himal', 'kalpataru', 'letterpress', 'mohar', 'olive-grove', 'rose-arch', 'sarovar', 'tuscany', 'wax-seal', 'wildflower']);
  assert.deepEqual(has('muslim'), ['andalus', 'blush-roses', 'dhaka', 'garden-party', 'gold-arch', 'himal', 'jali', 'kalpataru', 'letterpress', 'mohar', 'noor', 'olive-grove', 'sarovar', 'wax-seal', 'wildflower']);
  // the Muslim designs are for Muslim weddings only; no Christian chapel or wine label in the Muslim list
  for (const s of ['andalus', 'gold-arch', 'jali', 'noor']) assert.deepEqual(man[s], ['muslim'], s);
  // 'other' = genuinely neutral art only, and every neutral design also suits Buddhist and Kirat weddings
  for (const s of has('other')) assert.ok(man[s].includes('buddhist') && man[s].includes('kirat') && !hinduArt.includes(s), s);
  assert.deepEqual(has('buddhist').filter((s) => !man[s].includes('other')), ['jhyal', 'kham', 'sayapatri']);
});

test('markets helpers', () => {
  assert.ok(inMarket('both', 'intl') && inMarket('both', 'np') && inMarket('intl', 'intl') && !inMarket('np', 'intl'));
  assert.ok(isCoupleOccasion(undefined) && isCoupleOccasion('wedding') && !isCoupleOccasion('birthday'));
  assert.ok(Object.keys(OCCASIONS).includes('baby-shower'));
});

test('an invitation may name its occasion; one-person occasions publish with one name', () => {
  const base = { theme: 'dhoka', couple: structuredClone(demo.couple), weddingDate: demo.weddingDate, events: demo.events.map(({ id, title, start, end }) => ({ id, title, start, end })) };
  base.couple.portraits = [];
  const wedding = sanitizeInvitation(base, 'occ-test');
  assert.equal(wedding.occasion, undefined); // the default is not stored
  const bday = sanitizeInvitation({ ...base, occasion: 'birthday' }, 'occ-test');
  assert.equal(bday.occasion, 'birthday');
  assert.throws(() => sanitizeInvitation({ ...base, occasion: 'coronation' }, 'occ-test'), ValidationError);

  bday.couple.groom.name = { en: '', ne: '' };
  assert.deepEqual(publishProblems(bday).filter((p) => /name/i.test(p)), []);
  const wed = structuredClone(wedding);
  wed.couple.groom.name = { en: '', ne: '' };
  assert.ok(publishProblems(wed).includes("The groom's name"));
});
