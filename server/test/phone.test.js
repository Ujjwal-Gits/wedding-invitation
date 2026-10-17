// Phone numbers (lib/market.js checkPhone): real numbers with their country code, stored as E.164.
// Run: npm test (in server/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkPhone, PHONE_MSG } from '../lib/market.js';

const e164 = (raw, fallback) => { const r = checkPhone(raw, fallback); return r.ok ? r.e164 : null; };

test('phones: valid numbers become E.164; a number without a code is read as the fallback country', () => {
  assert.equal(e164('+1 201 555 0123'), '+12015550123');
  assert.equal(e164('+1 (201) 555-0123'), '+12015550123');
  assert.equal(e164('001 201 555 0123'), '+12015550123');
  assert.equal(e164('+977 980-1234567'), '+9779801234567');
  assert.equal(e164('9801234567'), '+9779801234567'); // Nepal by default
  assert.equal(e164('+44 7911 123456'), '+447911123456');
  assert.equal(e164('(201) 555-0123', 'US'), '+12015550123');
  assert.equal(checkPhone('+1 201 555 0123').country, 'US');
});

test('phones: anything else is refused, with one clear message', () => {
  for (const bad of ['12345', '+1 555 123 4567', '+977 12', '98a0000001', 'call me', '+9779801234567890123456789012345']) {
    assert.equal(checkPhone(bad).ok, false, `refused: ${JSON.stringify(bad)}`);
  }
  for (const bad of [null, 42, {}]) assert.equal(checkPhone(bad).e164, '');
  assert.equal(PHONE_MSG, 'Enter a valid phone number with country code.');
});
