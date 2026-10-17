// A guest's page carries its invitation and the music list (lib/gate.js withPageData, read by src/core/data.js):
// exactly what the API returns, and nothing a guest typed can end the data block.
// Run: npm test (in server/), and STORE=json npm test for the JSON store.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-page-'));
process.env.DATA_ROOT = DATA_ROOT;

const store = await import('../lib/store.js');
store.openStore();
const { withPageData } = await import('../lib/gate.js');
const { publishedJson } = await import('../lib/invitations.js');
const { publicMusic } = await import('../lib/music.js');
const { sanitizeInvitation } = await import('../lib/validate.js');
const { config: demo } = await import('../../src/config.js');

after(() => { store.closeStore(); rmSync(DATA_ROOT, { recursive: true, force: true }); });

const block = (html, id) => {
  const m = new RegExp(`<script type="application/json" id="${id}"([^>]*)>([\\s\\S]*?)</script>`).exec(html);
  return m ? { attrs: m[1], json: m[2] } : null;
};

test('the page carries the published invitation and the music list, safely escaped', async () => {
  const tricky = '</script><script>alert(1)</script> & $& $1 <!--';
  const data = sanitizeInvitation({
    theme: 'dhoka', weddingDate: demo.weddingDate,
    couple: { bride: { name: { en: 'Ana', ne: '' } }, groom: { name: { en: 'Ben', ne: '' } } },
    events: demo.events.slice(0, 1).map(({ id, title, start, end }) => ({ id, title, start, end })),
    closing: { en: tricky, ne: '' },
  }, 'page-test');
  const now = new Date().toISOString();
  await store.createInvitation({ slug: 'page-test', version: 3, status: 'published', createdAt: now, updatedAt: now, publishedAt: now, draft: data, published: structuredClone(data) });
  const doc = await store.peekInvitation('page-test');

  const html = await withPageData('<html><body><main></main></body></html>', doc, 'page-test');
  const inv = block(html, 'nimtto-data');
  assert.ok(inv, 'the invitation block is there');
  assert.match(inv.attrs, /data-id="page-test"/);
  assert.equal(inv.json.includes('</script'), false, 'a guest-visible text cannot close the block');
  assert.equal(inv.json.includes('<'), false);
  assert.deepEqual(JSON.parse(inv.json), JSON.parse(publishedJson(doc, 'page-test')), 'the same JSON as GET /api/invitations/:slug/public');
  assert.equal(JSON.parse(inv.json).closing.en, tricky, 'the words come back unchanged');
  assert.equal(JSON.parse(inv.json).rsvp.endpoint, '/api/invitations/page-test/rsvp');
  const music = block(html, 'nimtto-music');
  assert.deepEqual(JSON.parse(music.json), await publicMusic());
  assert.ok(html.indexOf('nimtto-music') < html.indexOf('</body>'), 'placed at the end of the body');
  assert.equal((html.match(/<\/body>/g) || []).length, 1);
});
