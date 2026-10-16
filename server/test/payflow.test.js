// Order -> pay by QR -> screenshot -> the admin confirms (lib/orders.js, lib/payments/manual.js, lib/payments/qr.js).
// Runs a small app with the real handlers, sessions and store in a throwaway DATA_ROOT. Run: npm test (in server/),
// and STORE=json npm test for the JSON store.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { hash as argonHash } from '@node-rs/argon2';
import sharp from 'sharp';

const DATA_ROOT = mkdtempSync(join(tmpdir(), 'nimtto-payflow-'));
process.env.DATA_ROOT = DATA_ROOT;
process.env.ADMIN_EMAIL = 'owner@test.local';
process.env.ADMIN_PASSWORD_HASH = await argonHash('test-password-1', { memoryCost: 4096, timeCost: 2 });

const env = await import('../lib/env.js');
const store = await import('../lib/store.js');
store.openStore();
const { startSessions } = await import('../lib/sessions.js');
startSessions();
const express = (await import('express')).default;
const auth = await import('../lib/auth.js');
const orders = await import('../lib/orders.js');
const site = await import('../lib/site.js');
const manual = await import('../lib/payments/manual.js');
const qr = await import('../lib/payments/qr.js');

const SERVER_ROOT = resolve(import.meta.dirname, '..');
const NABIL = readFileSync(resolve(SERVER_ROOT, '..', 'public', 'site', 'pay', 'nabil.png'));

let server;
let base;
let admin; // { cookie, csrf }

before(async () => {
  const app = express();
  app.use(auth.loadSession);
  const api = express.Router();
  const json = express.json({ limit: '32kb' });
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  api.param('ref', (req, res, next, ref) => (orders.REF_RE.test(ref) ? next() : res.status(404).json({ error: 'Not found.' })));
  api.post('/auth/login', json, wrap(auth.login));
  api.get('/site', wrap(site.getSite));
  api.post('/orders', json, wrap(orders.submit));
  api.get('/orders/:ref/pay', wrap(manual.payInfo));
  api.get('/orders/:ref/qr/:file', wrap(manual.payQr));
  api.post('/orders/:ref/proof', wrap(manual.submitProof));
  api.get('/admin/site', auth.requireAdmin, wrap(site.getAdminSite));
  api.put('/site', auth.requireAdmin, json, wrap(site.putSite));
  api.post('/admin/pay/qr', auth.requireAdmin, wrap(manual.uploadQr));
  api.get('/orders', auth.requireAdmin, wrap(orders.list));
  api.patch('/orders/:id', auth.requireAdmin, json, wrap(orders.update));
  api.delete('/orders/:id', auth.requireAdmin, wrap(orders.remove));
  api.get('/admin/orders/:id/proof/:n', auth.requireAdmin, wrap(manual.adminProof));
  app.use('/api', api);
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => res.status(err.status || 500).json({ error: err.expose || (err.status || 500) < 500 ? err.message : 'error' }));
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
  const r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ email: 'owner@test.local', password: 'test-password-1' }) });
  assert.equal(r.status, 200, 'admin login');
  admin = { cookie: r.headers.get('set-cookie').split(';')[0], csrf: (await r.json()).csrf };
});

after(() => {
  server?.close();
  try { store.closeStore(); } catch { /* already closed */ }
  try { rmSync(DATA_ROOT, { recursive: true, force: true }); } catch { /* Windows may hold a file a moment */ }
});

const post = (path, body, origin = base) => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body) });
const asAdmin = (path, { method = 'GET', body } = {}) => fetch(base + path, {
  method, headers: { Cookie: admin.cookie, 'X-CSRF-Token': admin.csrf, Origin: base, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined,
});
const ORDER = { kind: 'order', plan: 'shubha', name: 'Sita Sharma', phone: '9800000000', bride: 'Sita', groom: 'Ram', weddingDate: '2026-12-01', website: '' };
async function newOrder(extra = {}) {
  const r = await post('/api/orders', { ...ORDER, ...extra });
  assert.equal(r.status, 201);
  return r.json();
}
const png = (w = 400, h = 700, color = '#2a6') => sharp({ create: { width: w, height: h, channels: 3, background: color } }).png().toBuffer();
function proof(ref, t, { file, type = 'image/png', name = 'pay.png', method = 'nabil', amountPaid = '4999', note, origin = base } = {}) {
  const fd = new FormData();
  fd.append('method', method);
  fd.append('amountPaid', amountPaid);
  if (note) fd.append('note', note);
  fd.append('file', new Blob([file], { type }), name);
  return fetch(`${base}/api/orders/${ref}/proof?t=${encodeURIComponent(t)}`, { method: 'POST', headers: { Origin: origin }, body: fd });
}

// ── QR payloads (no network, no phone: the building blocks are checked exactly) ──

test('qr: CRC-16/CCITT-FALSE, EMV TLV and the per-order payload', async () => {
  assert.equal(qr.crc16('123456789'), '29B1'); // the standard check value
  assert.equal(qr.crc16(''), 'FFFF');
  const base0 = (await qr.decodeQr(NABIL)).text; // the shipped Nabil Bank code (EMV, NepalPay/Fonepay)
  assert.ok(qr.isEmv(base0), 'the default bank QR is valid EMV with a correct CRC');
  assert.equal(qr.detectFormat(base0).format, 'emv');
  const dyn = qr.emvWithAmount(base0, { amount: 4999, remark: 'Nimtto NM-24817' });
  assert.ok(qr.isEmv(dyn), 'CRC recomputed');
  const t = new Map(qr.parseTlv(dyn).map((f) => [f.tag, f.value]));
  assert.equal(t.get('01'), '12'); // dynamic
  assert.equal(t.get('54'), '4999');
  assert.equal(t.get('53'), new Map(qr.parseTlv(base0).map((f) => [f.tag, f.value])).get('53')); // currency kept
  const sub = new Map(qr.parseTlv(t.get('62')).map((f) => [f.tag, f.value]));
  assert.equal(sub.get('05'), 'Nimtto NM-24817');
  // every other field is unchanged
  for (const f of qr.parseTlv(base0)) if (!['01', '54', '62', '63'].includes(f.tag)) assert.equal(t.get(f.tag), f.value, `tag ${f.tag}`);
  // a long remark is capped at 25 (EMV), the 62 template stays ≤ 99
  const long = qr.emvWithAmount(base0, { amount: 1, remark: 'X'.repeat(80) });
  const sub2 = new Map(qr.parseTlv(new Map(qr.parseTlv(long).map((f) => [f.tag, f.value])).get('62')).map((f) => [f.tag, f.value]));
  assert.equal(sub2.get('05').length, 25);
  assert.equal(qr.emvAmount(49.5), '49.50');
  // round trip through a PNG
  assert.equal((await qr.decodeQr(await qr.qrPng(dyn))).text, dyn);
});

test('qr: wallets stay static unless the owner turns auto-amount on; remarks are plain ASCII', () => {
  const esewa = JSON.stringify({ eSewa_id: '9800000000', name: 'TEST' });
  assert.equal(qr.detectFormat(esewa).format, 'esewa');
  assert.equal(qr.detectFormat(esewa).autoDefault, false);
  assert.deepEqual(qr.buildPayload(esewa, { autoAmount: false }, { amount: 4999, remark: 'Nimtto NM-1' }), { payload: esewa, dynamic: false });
  const on = qr.buildPayload(esewa, { autoAmount: true }, { amount: 4999, remark: 'Nimtto NM-1' });
  assert.equal(on.dynamic, true);
  assert.deepEqual(JSON.parse(on.payload), { eSewa_id: '9800000000', name: 'TEST', amount: '4999', remarks: 'Nimtto NM-1' });
  const p2p = 'https://www.paypal.com/qrcodes/p2pqrc/ABCDEF';
  assert.equal(qr.buildPayload(p2p, { kind: 'paypal', autoAmount: true, currency: 'USD' }, { amount: 99, remark: 'x' }).dynamic, false);
  assert.deepEqual(qr.buildPayload(p2p, { kind: 'paypal', autoAmount: true, paypalMe: 'nimtto', currency: 'USD' }, { amount: 99 }), { payload: 'https://www.paypal.com/paypalme/nimtto/99USD', dynamic: true });
  assert.equal(qr.fillRemark('Nimtto {ref} {name}', { ref: 'NM-12345', name: 'सीता Šárka' }), 'Nimtto NM-12345');
  assert.equal(qr.fillRemark('Nimtto {ref} {name}', { ref: 'NM-12345', name: 'Sita Rai' }), 'Nimtto NM-12345 Sita');
  assert.equal(qr.asciiRemark('a\u0000b\nc  d'), 'ab c d');
});

// ── The flow ──────────────────────────────────────────────────────────────

test('site: public answer has the four plans and enabled methods only, no admin fields; contact defaults', async () => {
  const s = await (await fetch(`${base}/api/site`)).json();
  assert.deepEqual(s.plans.map((p) => [p.id, p.price, p.priceUsd, p.from]), [['saral', 2999, 49, false], ['shubha', 4999, 99, false], ['shahi', 6999, 149, false], ['custom', 11111, 199, true]]);
  assert.deepEqual(s.paymentMethods.map((m) => m.id), ['khalti', 'esewa', 'nabil', 'paypal']);
  for (const m of s.paymentMethods) {
    assert.deepEqual(Object.keys(m).filter((k) => !['id', 'label', 'kind', 'currency', 'accountName', 'qr', 'note', 'accountHint'].includes(k)), []);
  }
  assert.equal(s.contact.whatsapp, '+9779806393298');
  assert.equal(s.contact.email, 'nimttoz@gmail.com');
  assert.equal(JSON.stringify(s).includes('payRemark'), false);
  assert.equal((await fetch(`${base}/api/admin/site`)).status, 401);
  const a = await (await asAdmin('/api/admin/site')).json();
  assert.equal(a.paymentMethods.find((m) => m.id === 'nabil').qrInfo.dynamic, true);
  assert.equal(a.paymentMethods.find((m) => m.id === 'esewa').qrInfo.dynamic, false);
  assert.equal(a.paymentMethods.find((m) => m.id === 'esewa').qrInfo.canAuto, true);
});

test('orders: prices come from the server, the token is returned once and only its hash is stored', async () => {
  const r = await post('/api/orders', { ...ORDER, amount: { npr: 1, usd: 1 }, price: 1 });
  assert.equal(r.status, 201);
  const o = await r.json();
  assert.match(o.ref, /^NM-\d{5,6}$/);
  assert.match(o.payToken, /^[A-Za-z0-9_-]{43}$/);
  assert.deepEqual(o.amount, { npr: 4999, usd: 99 });
  assert.deepEqual(o.plan, { id: 'shubha', name: 'Shubha', from: false });
  assert.match(o.whatsapp.link, /^https:\/\/wa\.me\/9779806393298\?text=/);
  assert.match(o.whatsapp.text, new RegExp(o.ref));
  assert.equal(o.whatsapp.text.includes(o.payToken), false);
  const stored = await store.getOrderByRef(o.ref);
  assert.equal(JSON.stringify(stored).includes(o.payToken), false);
  assert.equal(stored.payTokenHash.length, 64);
  assert.equal(stored.pay.status, 'awaiting_payment');
  // a plan is required for an order; an unknown plan is refused
  assert.equal((await post('/api/orders', { ...ORDER, plan: undefined })).status, 400);
  assert.equal((await post('/api/orders', { ...ORDER, plan: 'gold' })).status, 400);
  assert.equal((await post('/api/orders', ORDER, 'https://evil.example')).status, 403);
  // a custom request without a plan is priced "from" the Custom plan
  const c = await newOrder({ kind: 'custom', plan: undefined, message: 'Peacock colours please' });
  assert.deepEqual([c.plan.id, c.plan.from, c.amount.npr], ['custom', true, 11111]);
  // the admin changes a price: new orders use it, old orders keep theirs
  const s = await (await asAdmin('/api/admin/site')).json();
  s.plans.find((p) => p.id === 'shubha').price = 5555;
  assert.equal((await asAdmin('/api/site', { method: 'PUT', body: s })).status, 200);
  assert.equal((await newOrder()).amount.npr, 5555);
  assert.equal((await store.getOrderByRef(o.ref)).amount.npr, 4999);
  s.plans.find((p) => p.id === 'shubha').price = 4999;
  assert.equal((await asAdmin('/api/site', { method: 'PUT', body: s })).status, 200);
});

test('pay info: only with the right token; nothing about anyone else', async () => {
  const a = await newOrder();
  const b = await newOrder({ name: 'Other Person', phone: '9811111111' });
  const ok = await fetch(`${base}/api/orders/${a.ref}/pay?t=${a.payToken}`);
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('cache-control'), /no-store/);
  const info = await ok.json();
  assert.equal(info.status, 'awaiting_payment');
  assert.deepEqual(info.amount, { npr: 4999, usd: 99 });
  assert.equal(info.remark, `Nimtto ${a.ref}`);
  const nabil = info.paymentMethods.find((m) => m.id === 'nabil');
  assert.deepEqual([nabil.dynamic, nabil.amount, nabil.currency], [true, 4999, 'NPR']);
  assert.deepEqual([info.paymentMethods.find((m) => m.id === 'paypal').amount, info.paymentMethods.find((m) => m.id === 'esewa').dynamic], [99, false]);
  const text = JSON.stringify(info);
  for (const secret of [b.ref, 'Other Person', '9811111111', '9800000000', 'payTokenHash']) assert.equal(text.includes(secret), false, secret);
  for (const t of [b.payToken, '', 'x', a.payToken.slice(0, -1) + (a.payToken.endsWith('A') ? 'B' : 'A')]) {
    assert.equal((await fetch(`${base}/api/orders/${a.ref}/pay?t=${t}`)).status, 404);
  }
  assert.equal((await fetch(`${base}/api/orders/NM-00001/pay?t=${a.payToken}`)).status, 404);
  assert.equal((await fetch(`${base}/api/orders/..%2Fetc/pay?t=${a.payToken}`)).status, 404);
});

test('pay QR: the bank code carries the amount and remark; wallets fall back to the static image', async () => {
  const a = await newOrder();
  const r = await fetch(`${base}/api/orders/${a.ref}/qr/nabil.png?t=${a.payToken}`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'image/png');
  assert.match(r.headers.get('cache-control'), /private, no-store/);
  const text = (await qr.decodeQr(Buffer.from(await r.arrayBuffer()))).text;
  assert.ok(qr.isEmv(text));
  const t = new Map(qr.parseTlv(text).map((f) => [f.tag, f.value]));
  assert.equal(t.get('54'), '4999');
  assert.ok(t.get('62').includes(`Nimtto ${a.ref}`));
  const custom = await fetch(`${base}/api/orders/${a.ref}/qr/nabil.png?t=${a.payToken}&remark=${encodeURIComponent('Sita wedding')}`);
  assert.ok((await qr.decodeQr(Buffer.from(await custom.arrayBuffer()))).text.includes('0512Sita wedding'));
  assert.equal((await fetch(`${base}/api/orders/${a.ref}/qr/nabil.png?t=${a.payToken}&remark=${encodeURIComponent('सीता')}`)).status, 400);
  assert.equal((await fetch(`${base}/api/orders/${a.ref}/qr/nabil.png?t=${a.payToken}&remark=${'x'.repeat(26)}`)).status, 400);
  const k = await fetch(`${base}/api/orders/${a.ref}/qr/khalti.png?t=${a.payToken}`, { redirect: 'manual' });
  assert.equal(k.status, 302);
  assert.equal(k.headers.get('location'), '/site/pay/khalti.png');
  assert.equal((await fetch(`${base}/api/orders/${a.ref}/qr/nabil.png?t=bad`)).status, 404);
  assert.equal((await fetch(`${base}/api/orders/${a.ref}/qr/nope.png?t=${a.payToken}`)).status, 404);
});

test('proof: good image, wrong type, too big, wrong token, cross-site, 4th refused; metadata stripped', async () => {
  const a = await newOrder();
  // a JPEG with EXIF (camera, GPS-like comment): none of it may survive
  const withExif = await sharp({ create: { width: 600, height: 900, channels: 3, background: '#e33' } })
    .withMetadata({ exif: { IFD0: { Make: 'SpyCam', Copyright: 'GPS 27.7172 85.3240' } } }).jpeg().toBuffer();
  assert.ok((await sharp(withExif).metadata()).exif, 'the test image has EXIF');
  const r1 = await proof(a.ref, a.payToken, { file: withExif, type: 'image/jpeg', name: 'x.jpg', note: 'Paid from my brother’s account' });
  assert.equal(r1.status, 201, await r1.clone().text());
  assert.deepEqual(await r1.json(), { ok: true, status: 'proof_submitted', proofs: 1 });
  assert.equal((await proof(a.ref, a.payToken, { file: Buffer.from('this is not an image at all, just text'.repeat(50)), name: 'fake.png' })).status, 415);
  const big = Buffer.alloc(8 * 1024 * 1024 + 10 * 1024, 1); // over 8 MB: refused while streaming
  assert.equal((await proof(a.ref, a.payToken, { file: big })).status, 413);
  // a body that announces more than 8 MB is refused before it is read
  const { request } = await import('node:http');
  const early = await new Promise((done, fail) => {
    const rq = request(`${base}/api/orders/${a.ref}/proof?t=${a.payToken}`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'multipart/form-data; boundary=x', 'Content-Length': String(20 * 1024 * 1024) } }, (rs) => { rs.resume(); done(rs.statusCode); rq.destroy(); });
    rq.on('error', fail);
    rq.write('--x\r\n');
  });
  assert.equal(early, 413);
  assert.equal((await proof(a.ref, 'A'.repeat(43), { file: await png() })).status, 404);
  assert.equal((await proof(a.ref, a.payToken, { file: await png(), origin: 'https://evil.example' })).status, 403);
  assert.equal((await proof(a.ref, a.payToken, { file: await png(), method: 'bitcoin' })).status, 400);
  assert.equal((await proof(a.ref, a.payToken, { file: await png(), amountPaid: '' })).status, 400);
  assert.equal((await proof(a.ref, a.payToken, { file: await png() })).status, 201);
  assert.equal((await proof(a.ref, a.payToken, { file: await png(300, 300, '#36c'), type: 'image/webp', name: 'x.webp' })).status, 201);
  const fourth = await proof(a.ref, a.payToken, { file: await png() });
  assert.equal(fourth.status, 409);
  const info = await (await fetch(`${base}/api/orders/${a.ref}/pay?t=${a.payToken}`)).json();
  assert.equal(info.status, 'proof_submitted');
  assert.equal(info.proofs.length, 3);
  assert.equal(info.canUpload, false);
  assert.equal(JSON.stringify(info.proofs).includes('.jpg'), false); // no file names or URLs for the public
  // the stored screenshot: re-encoded JPEG, no EXIF
  const id = (await store.getOrderByRef(a.ref)).id;
  const img = await asAdmin(`/api/admin/orders/${id}/proof/1`);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/jpeg');
  assert.match(img.headers.get('cache-control'), /private, no-store/);
  const meta = await sharp(Buffer.from(await img.arrayBuffer())).metadata();
  assert.equal(meta.format, 'jpeg');
  assert.equal(meta.exif, undefined);
  assert.equal(meta.icc, undefined);
  assert.equal((await asAdmin(`/api/admin/orders/${id}/proof/1?size=sm`)).status, 200);
  assert.equal((await asAdmin(`/api/admin/orders/${id}/proof/9`)).status, 404);
});

test('proofs are private: not under public folders, not reachable without the admin', async () => {
  const a = await newOrder();
  assert.equal((await proof(a.ref, a.payToken, { file: await png() })).status, 201);
  const o = await store.getOrderByRef(a.ref);
  const dir = resolve(orders.PROOF_DIR, o.id);
  assert.ok(existsSync(dir) && readdirSync(dir).length === 2);
  for (const pub of [env.UPLOAD_DIR, env.DIST_DIR, resolve(env.ROOT_DIR, 'public')]) {
    const r = relative(pub, dir);
    assert.ok(r.startsWith('..') || isAbsolute(r), `proofs must not be inside ${pub}`);
  }
  assert.equal((await fetch(`${base}/api/admin/orders/${o.id}/proof/1`)).status, 401);
  // the admin list gives admin-only URLs, never file names or the token hash
  const list = await (await asAdmin('/api/orders')).json();
  const mine = list.orders.find((x) => x.ref === a.ref);
  assert.equal(mine.payTokenHash, undefined);
  assert.equal(mine.pay.proofs[0].file, undefined);
  assert.equal(mine.pay.proofs[0].url, `/api/admin/orders/${o.id}/proof/1`);
  assert.equal(mine.payStatus, 'proof_submitted');
  // deleting the order deletes its screenshots
  assert.equal((await asAdmin(`/api/orders/${o.id}`, { method: 'DELETE' })).status, 200);
  assert.equal(existsSync(dir), false);
});

test('admin: confirm, reject with a reason the customer sees, refund rules, mark paid by hand, CSRF', async () => {
  const a = await newOrder();
  await proof(a.ref, a.payToken, { file: await png() });
  const id = (await store.getOrderByRef(a.ref)).id;
  const patch = (body) => asAdmin(`/api/orders/${id}`, { method: 'PATCH', body });
  const noCsrf = await fetch(`${base}/api/orders/${id}`, { method: 'PATCH', headers: { Cookie: admin.cookie, 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ payment: { status: 'confirmed' } }) });
  assert.equal(noCsrf.status, 403);
  assert.equal((await patch({ payment: { status: 'rejected' } })).status, 400); // a reason is required
  assert.equal((await patch({ payment: { status: 'refunded' } })).status, 409); // not paid yet
  assert.equal((await patch({ payment: { status: 'nonsense' } })).status, 400);
  const rej = await patch({ payment: { status: 'rejected', reason: 'The amount was Rs 499, not Rs 4,999.' } });
  assert.equal(rej.status, 200);
  const seen = await (await fetch(`${base}/api/orders/${a.ref}/pay?t=${a.payToken}`)).json();
  assert.deepEqual([seen.status, seen.reason, seen.canUpload], ['rejected', 'The amount was Rs 499, not Rs 4,999.', true]);
  assert.equal((await proof(a.ref, a.payToken, { file: await png() })).status, 201); // they try again
  const ok = await (await patch({ payment: { status: 'confirmed', note: 'Seen in the Nabil app' } })).json();
  assert.deepEqual([ok.order.pay.status, ok.order.pay.via, ok.order.status], ['confirmed', 'proof', 'new']); // the workflow status is separate
  const after = await (await fetch(`${base}/api/orders/${a.ref}/pay?t=${a.payToken}`)).json();
  assert.deepEqual([after.status, after.reason, after.canUpload], ['confirmed', null, false]);
  assert.equal((await proof(a.ref, a.payToken, { file: await png() })).status, 409);
  assert.equal((await patch({ payment: { status: 'refunded', note: 'Wedding cancelled' } })).status, 200);
  // cash: no screenshot at all
  const c = await newOrder();
  const cid = (await store.getOrderByRef(c.ref)).id;
  const cash = await (await asAdmin(`/api/orders/${cid}`, { method: 'PATCH', body: { payment: { status: 'confirmed', manual: true, method: 'Cash', note: 'Paid at the office' } } })).json();
  assert.deepEqual([cash.order.pay.status, cash.order.pay.via, cash.order.pay.manual.method], ['confirmed', 'manual', 'Cash']);
  assert.equal(cash.order.pay.history.at(-1).by, 'admin');
  // the admin can change what an order costs (e.g. a custom quote)
  const amt = await (await asAdmin(`/api/orders/${cid}`, { method: 'PATCH', body: { amount: { npr: 15000, usd: 120 } } })).json();
  assert.deepEqual(amt.order.amount, { npr: 15000, usd: 120 });
  assert.equal((await asAdmin(`/api/orders/${cid}`, { method: 'PATCH', body: { amount: { npr: -1 } } })).status, 400);
});

test('admin QR upload: a screenshot is cropped to just the code, decoded, and wins over the default', async () => {
  // a "phone screenshot": the shipped code on a dark card with text-like blocks around it
  const shot = await sharp({ create: { width: 1080, height: 1900, channels: 3, background: '#1b1b1b' } })
    .composite([{ input: await sharp(NABIL).resize(620, 620, { kernel: 'nearest' }).toBuffer(), left: 230, top: 520 },
      { input: await sharp({ create: { width: 500, height: 60, channels: 3, background: '#ffffff' } }).png().toBuffer(), left: 290, top: 1300 }])
    .png().toBuffer();
  const fd = new FormData();
  fd.append('file', new Blob([shot], { type: 'image/png' }), 'shot.png');
  const r = await fetch(`${base}/api/admin/pay/qr`, { method: 'POST', headers: { Cookie: admin.cookie, 'X-CSRF-Token': admin.csrf, Origin: base }, body: fd });
  assert.equal(r.status, 201, await r.clone().text());
  const up = await r.json();
  assert.match(up.qr, /^\/uploads\/_site\/pay\/[A-Za-z0-9_-]{24}\.png$/);
  assert.deepEqual([up.decoded, up.cropped, up.qrInfo.format], [true, true, 'emv']);
  const file = resolve(env.UPLOAD_DIR, '_site', 'pay', up.qr.split('/').pop());
  const meta = await sharp(file).metadata();
  assert.equal(meta.width, meta.height); // square
  assert.ok(meta.width >= 700 && meta.width <= 1100);
  assert.equal((await qr.decodeQr(readFileSync(file))).text, (await qr.decodeQr(NABIL)).text);
  // not an image
  const bad = new FormData();
  bad.append('file', new Blob([Buffer.from('%PDF-1.4 nope')], { type: 'image/png' }), 'x.png');
  assert.equal((await fetch(`${base}/api/admin/pay/qr`, { method: 'POST', headers: { Cookie: admin.cookie, 'X-CSRF-Token': admin.csrf, Origin: base }, body: bad })).status, 415);
  // use it for Nabil: the order QR is built from the uploaded code
  const s = await (await asAdmin('/api/admin/site')).json();
  s.paymentMethods.find((m) => m.id === 'nabil').qr = up.qr;
  s.paymentMethods.find((m) => m.id === 'paypal').enabled = false;
  const saved = await asAdmin('/api/site', { method: 'PUT', body: s });
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).paymentMethods.find((m) => m.id === 'nabil').qrInfo.format, 'emv');
  const pub = await (await fetch(`${base}/api/site`)).json();
  assert.equal(pub.paymentMethods.find((m) => m.id === 'nabil').qr, up.qr);
  assert.equal(pub.paymentMethods.some((m) => m.id === 'paypal'), false); // disabled methods are not public
  // a QR URL that is not ours is refused
  s.paymentMethods[0].qr = 'https://evil.example/qr.png';
  assert.equal((await asAdmin('/api/site', { method: 'PUT', body: s })).status, 400);
});
