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
  assert.deepEqual([...m.religions].sort(), ['christian', 'other']);
  for (const id of ['hero.kicker', 'hero.line', 'rsvp.title', 'count.done']) assert.ok(m.texts[id], id);
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
