// Phone numbers (lib/phone.js): real numbers with their country code, stored as E.164. Run: npm test (in server/).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toE164, PHONE_MSG } from '../lib/phone.js';

test('phones: valid numbers become E.164; a number without a code is read as Nepali', () => {
  assert.equal(toE164('+1 201 555 0123'), '+12015550123');
  assert.equal(toE164('+1 (201) 555-0123'), '+12015550123');
  assert.equal(toE164('001 201 555 0123'), '+12015550123');
  assert.equal(toE164('+977 980-1234567'), '+9779801234567');
  assert.equal(toE164('9801234567'), '+9779801234567');
  assert.equal(toE164('+44 7911 123456'), '+447911123456');
  assert.equal(toE164('(201) 555-0123', { country: 'US' }), '+12015550123');
});

test('phones: anything else is refused, with one clear message', () => {
  for (const bad of ['', '   ', '12345', '+1 555 123 4567', '+977 12', '98a0000001', 'call me', '+9779801234567890123456789012345', null, 42, {}]) {
    assert.equal(toE164(bad), '', `refused: ${JSON.stringify(bad)}`);
  }
  assert.equal(PHONE_MSG, 'Enter a valid phone number with country code.');
});
