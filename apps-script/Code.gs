/**
 * Sayapatri RSVP collector. Paste into a Google Apps Script bound to a Google
 * Sheet, then deploy as a Web app (Execute as: Me, Access: Anyone).
 * Every field is validated again here; the browser is never trusted.
 */
const SHEET_NAME = 'RSVP';
const EVENTS = ['mehendi', 'haldi', 'wedding', 'reception'];
const MAX = { name: 80, phone: 20, message: 500, guests: 10 };
const RATE_LIMIT_PER_MINUTE = 40;

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json({ ok: false, error: 'busy' });
  try {
    if (!rateOk()) return json({ ok: false, error: 'rate_limited' });

    const body = e && e.postData && e.postData.contents;
    if (!body || body.length > 5000) return json({ ok: false, error: 'bad_request' });
    const data = JSON.parse(body);

    if (data.website) return json({ ok: true }); // honeypot: silently drop bots

    const name = clean(data.name, MAX.name);
    if (name.length < 2) return json({ ok: false, error: 'name' });

    const attending = data.attending === 'no' ? 'no' : 'yes';
    const guests = attending === 'yes' ? Math.min(Math.max(parseInt(data.guests, 10) || 1, 1), MAX.guests) : 0;
    const events = attending === 'yes'
      ? (Array.isArray(data.events) ? data.events : []).filter((x) => EVENTS.indexOf(x) !== -1).join(', ')
      : '';
    const phone = clean(data.phone, MAX.phone).replace(/[^0-9+()\-\s]/g, '');
    const message = clean(data.message, MAX.message);
    const meal = attending === 'yes' ? (data.meal === 'veg' ? 'Vegetarian' : 'Non-vegetarian') : '';

    sheet().appendRow([new Date(), name, phone, attending, guests, events, meal, message]);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: 'bad_request' });
  } finally {
    lock.releaseLock();
  }
}

/** Strips control characters, trims, caps length, and defuses spreadsheet formulas. */
function clean(v, max) {
  let s = String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function rateOk() {
  const cache = CacheService.getScriptCache();
  const key = 'rsvp-' + Math.floor(Date.now() / 60000);
  const n = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(n), 120);
  return n <= RATE_LIMIT_PER_MINUTE;
}

function sheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['Received', 'Name', 'Phone', 'Attending', 'Guests', 'Ceremonies', 'Meal', 'Blessing']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
