// RSVP: validated here and again on the server. No cookies or sessions are
// involved, so there is no ambient authority for a CSRF attack to borrow.
//
// Themes write the basic form (name, phone, coming, guests, ceremonies, one meal question, message). This file
// shapes it to what the couple asks (src/core/rsvp-rules.js): the guest count becomes a stepper, the meal question
// becomes one entry per guest (a name for everyone after the person replying, and their own meal from the
// couple's list, none chosen in advance), and the optional "dietary needs" and "song request" fields are added.
// Every new field is built from the theme's own field markup, so it looks like the rest of that theme's form.
import { config } from '../config.js';
import { bi, esc, neNum } from './i18n.js';
import { rsvpOptions, LIMITS } from './rsvp-rules.js';

const NAME_MIN = 2;
const PHONE_RE = /^[0-9+()\-\s]{6,20}$/;
const COOLDOWN_MS = 30_000;

/** A text field shaped like `tpl` (the theme's own name or message field): wrapper, label and control classes. */
function fieldLike(tpl, { id, name, label, max, multiline = false }) {
  const wrap = tpl ? tpl.cloneNode(false) : Object.assign(document.createElement('div'), { className: 'field' });
  wrap.removeAttribute('id');
  const tLabel = tpl?.querySelector('label');
  const tCtrl = tpl?.querySelector(multiline ? 'textarea' : 'input');
  const lab = document.createElement('label');
  if (tLabel?.className) lab.className = tLabel.className;
  lab.htmlFor = id;
  lab.innerHTML = label;
  const ctrl = document.createElement(multiline ? 'textarea' : 'input');
  if (tCtrl?.className) ctrl.className = tCtrl.className;
  Object.assign(ctrl, { id, name, maxLength: max, autocomplete: 'off' });
  if (multiline) ctrl.rows = 2; else ctrl.type = 'text';
  wrap.append(lab, ctrl);
  return wrap;
}

export function initRsvp(eventsList = config.events) {
  const form = document.getElementById('rsvp-form');
  const guests = document.getElementById('f-guests');
  const events = document.getElementById('f-events');
  const status = document.getElementById('rsvp-status');
  const submit = document.getElementById('rsvp-submit');
  const nameInput = document.getElementById('f-name');
  const nameErr = document.getElementById('f-name-err');
  const ask = rsvpOptions(config.rsvp);
  let lastSent = 0;

  // ── Templates from the theme's own form ──
  const nameTpl = nameInput?.parentElement || null;
  const msgTpl = document.getElementById('f-msg')?.parentElement || null;
  const mealFs = form.querySelector('input[name="meal"]')?.closest('fieldset') || null;
  const mealChoice = mealFs?.querySelector('input[name="meal"]')?.closest('label') || null;
  const T = {
    fs: mealFs?.className || 'field field--choice',
    grid: mealChoice?.parentElement?.className || 'choice-grid',
    choice: mealChoice?.className || 'choice',
    legend: mealFs?.querySelector('legend')?.innerHTML || bi({ en: 'Meal', ne: 'खाना' }),
  };
  const whenYes = form.querySelector('.rsvp__when-yes');
  const host = document.createElement('div');
  host.className = 'rsvp-party';
  if (mealFs) mealFs.replaceWith(host);
  else if (whenYes) whenYes.append(host);
  else form.insertBefore(host, msgTpl || submit);

  // ── One entry per guest ──
  let party = [{ name: '', meal: '' }];
  const keep = () => {
    host.querySelectorAll('[data-guest]').forEach((el) => {
      const i = Number(el.dataset.guest);
      party[i] ||= { name: '', meal: '' };
      const n = el.querySelector('input[type="text"]');
      if (n) party[i].name = n.value;
      const m = el.querySelector('input[type="radio"]:checked');
      party[i].meal = m ? m.value : '';
    });
  };
  const mealLegend = (i, n) => {
    if (n === 1) return T.legend;
    if (i === 0) return bi({ en: 'Your meal', ne: 'हजुरको खाना' });
    const who = (party[i]?.name || '').trim();
    return bi({ en: `Meal for ${who || `guest ${i + 1}`}`, ne: `${who || `पाहुना ${neNum(i + 1)}`}को खाना` });
  };
  const renderParty = (n, { fresh = false } = {}) => {
    if (fresh) party = [];
    else keep();
    const before = host.querySelectorAll('[data-guest]').length;
    host.textContent = '';
    for (let i = 0; i < n; i++) {
      party[i] ||= { name: '', meal: '' };
      const g = document.createElement('div');
      g.className = n > 1 ? 'rsvp-guest' : 'rsvp-guest rsvp-guest--solo';
      g.dataset.guest = String(i);
      if (!fresh && i >= before && i > 0) g.classList.add('is-new');
      if (i > 0 && ask.guestNames !== 'off') {
        const opt = ask.guestNames === 'optional';
        const f = fieldLike(nameTpl, {
          id: `f-guest-${i}`, name: `guest-${i}`, max: LIMITS.name,
          label: bi({ en: `Guest ${i + 1}’s name${opt ? ' (optional)' : ''}`, ne: `पाहुना ${neNum(i + 1)} को नाम${opt ? ' (ऐच्छिक)' : ''}` }),
        });
        const inp = f.querySelector('input');
        inp.value = party[i].name;
        inp.autocomplete = 'off';
        if (!opt) inp.required = true;
        inp.addEventListener('input', () => {
          party[i].name = inp.value;
          const lg = g.querySelector('legend');
          if (lg) lg.innerHTML = mealLegend(i, n);
        });
        g.append(f);
      }
      if (ask.meals.length) {
        const fs = document.createElement('fieldset');
        fs.className = T.fs;
        const lg = document.createElement('legend');
        lg.innerHTML = mealLegend(i, n);
        const grid = document.createElement('div');
        grid.className = T.grid;
        grid.innerHTML = ask.meals.map((m) => `<label class="${esc(T.choice)}"><input type="radio" name="meal-${i}" value="${esc(m.id)}"${party[i].meal === m.id ? ' checked' : ''} /><span>${bi(m.label)}</span></label>`).join('');
        fs.append(lg, grid);
        g.append(fs);
      }
      if (g.childElementCount) host.append(g);
    }
    party.length = n;
  };

  // Guest count: a clear − 1 + stepper instead of the browser's list (same name and id, so themes need no change).
  const maxGuests = Math.max(1, config.rsvp.maxGuests || 1);
  const step = document.createElement('div');
  step.className = 'gstep';
  step.setAttribute('role', 'group');
  step.setAttribute('aria-label', 'Number of guests / पाहुना संख्या');
  step.innerHTML = `<button type="button" class="gstep__b" data-d="-1" aria-label="One fewer guest / एक जना कम">−</button>`
    + `<output class="gstep__v" aria-live="polite">1</output>`
    + `<button type="button" class="gstep__b" data-d="1" aria-label="One more guest / एक जना थप">+</button>`
    + `<input type="hidden" name="guests" id="${guests.id}" value="1" />`;
  guests.replaceWith(step);
  const gIn = step.querySelector('input');
  const gOut = step.querySelector('output');
  const [gMinus, gPlus] = step.querySelectorAll('button');
  const setGuests = (n, opts) => {
    const v = Math.min(maxGuests, Math.max(1, n));
    gIn.value = String(v); gOut.textContent = String(v);
    gMinus.disabled = v <= 1; gPlus.disabled = v >= maxGuests;
    renderParty(v, opts);
  };
  step.addEventListener('click', (e) => { const b = e.target.closest('.gstep__b'); if (b) setGuests(Number(gIn.value) + Number(b.dataset.d)); });
  setGuests(1, { fresh: true });

  // The extra questions the couple switched on (only asked of guests who are coming).
  const extras = whenYes || host.parentElement;
  if (ask.diet) extras.append(fieldLike(msgTpl, { id: 'f-diet', name: 'diet', max: LIMITS.diet, multiline: true, label: bi({ en: 'Dietary needs or allergies (optional)', ne: 'खानासम्बन्धी आवश्यकता वा एलर्जी (ऐच्छिक)' }) }));
  if (ask.song) extras.append(fieldLike(nameTpl, { id: 'f-song', name: 'song', max: LIMITS.song, label: bi({ en: 'Song request (optional)', ne: 'गीतको अनुरोध (ऐच्छिक)' }) }));

  // One option per ceremony, each with its own name (Janti, the wedding and the reception are separate answers).
  events.innerHTML = eventsList
    .map((e) => `<label class="choice"><input type="checkbox" name="events" value="${esc(e.id)}" checked /><span>${bi(e.title)}</span></label>`)
    .join('');

  form.addEventListener('change', (e) => {
    if (e.target.name === 'attending') form.classList.toggle('is-no', e.target.value === 'no');
  });

  const say = (html, isError = false) => {
    status.innerHTML = html;
    status.classList.toggle('is-error', isError);
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    keep();
    const fd = new FormData(form);
    const data = {
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      attending: fd.get('attending') === 'no' ? 'no' : 'yes',
      guests: Number(fd.get('guests') || 1),
      events: fd.getAll('events').map(String),
      party: [],
      message: String(fd.get('message') || '').trim().slice(0, LIMITS.message),
      website: String(fd.get('website') || ''),
    };
    if (data.attending === 'no') { data.guests = 0; data.events = []; }
    else {
      data.party = party.slice(0, data.guests).map((g, i) => ({ name: i ? (ask.guestNames === 'off' ? '' : g.name.trim().slice(0, LIMITS.name)) : data.name, meal: ask.meals.length ? g.meal : '' }));
      data.meal = data.party[0]?.meal || ''; // a sheet made for the older form reads one meal per reply
      if (ask.diet) data.diet = String(fd.get('diet') || '').trim().slice(0, LIMITS.diet);
      if (ask.song) data.song = String(fd.get('song') || '').trim().slice(0, LIMITS.song);
    }

    // Validation
    nameInput.removeAttribute('aria-invalid');
    nameErr.textContent = '';
    host.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    if (data.name.length < NAME_MIN) {
      nameInput.setAttribute('aria-invalid', 'true');
      nameErr.innerHTML = bi({ en: 'Please tell us your name.', ne: 'कृपया आफ्नो नाम लेख्नुहोस्।' });
      nameInput.focus();
      return;
    }
    if (data.attending === 'yes' && eventsList.length && !data.events.length) {
      say(bi({ en: 'Please tick the ceremonies you will come to.', ne: 'कृपया आउने कार्यक्रममा चिनो लगाउनुहोस्।' }), true);
      events.querySelector('input')?.focus();
      return;
    }
    if (data.attending === 'yes' && ask.guestNames === 'required') {
      const i = data.party.findIndex((g, k) => k > 0 && g.name.length < NAME_MIN);
      if (i > 0) {
        const inp = host.querySelector(`#f-guest-${i}`);
        inp?.setAttribute('aria-invalid', 'true');
        say(bi({ en: 'Please add the name of each guest.', ne: 'कृपया हरेक पाहुनाको नाम लेख्नुहोस्।' }), true);
        inp?.focus();
        return;
      }
    }
    if (data.attending === 'yes' && ask.meals.length) {
      const i = data.party.findIndex((g) => !g.meal);
      if (i >= 0) {
        say(data.guests === 1
          ? bi({ en: 'Please choose your meal.', ne: 'कृपया खाना छान्नुहोस्।' })
          : bi({ en: 'Please choose a meal for each guest.', ne: 'कृपया हरेक पाहुनाको खाना छान्नुहोस्।' }), true);
        host.querySelector(`input[name="meal-${i}"]`)?.focus();
        return;
      }
    }
    if (data.phone && !PHONE_RE.test(data.phone)) {
      say(bi({ en: 'That phone number looks incomplete.', ne: 'फोन नम्बर मिलेन।' }), true);
      return;
    }
    if (Date.now() - lastSent < COOLDOWN_MS) {
      say(bi({ en: 'Your reply is already on its way.', ne: 'हजुरको जवाफ पठाइसकिएको छ।' }));
      return;
    }

    submit.disabled = true;
    say(bi({ en: 'Sending…', ne: 'पठाउँदै…' }));

    try {
      if (data.website) {
        // Honeypot was filled: a bot. Pretend success and send nothing.
      } else if (config.rsvp.endpoint) {
        const res = await fetch(config.rsvp.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // simple request, no preflight
          body: JSON.stringify(data),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !out.ok) throw new Error(out.error || `HTTP ${res.status}`);
      } else {
        // Demo mode: no endpoint configured yet.
        try {
          const all = JSON.parse(localStorage.getItem('sayapatri-rsvp-demo') || '[]');
          all.push({ ...data, at: new Date().toISOString() });
          localStorage.setItem('sayapatri-rsvp-demo', JSON.stringify(all));
        } catch { /* storage unavailable */ }
        console.info('[RSVP demo mode] Set config.rsvp.endpoint to collect replies.', data);
      }
      lastSent = Date.now();
      const first = data.name.split(/\s+/)[0];
      status.textContent = '';
      status.classList.remove('is-error');
      const en = document.createElement('span');
      en.className = 'l-en';
      en.textContent = data.attending === 'yes' ? `Thank you, ${first}. We can't wait to see you.` : `Thank you, ${first}. Your blessings mean the world.`;
      const ne = document.createElement('span');
      ne.className = 'l-ne';
      ne.lang = 'ne';
      ne.textContent = `धन्यवाद, ${first}। हजुरको जवाफ हामीसम्म आइपुग्यो।`;
      status.append(en, ne);
      form.querySelectorAll('input:not([type=hidden]), select, textarea').forEach((el) => { if (el.type !== 'radio' && el.type !== 'checkbox') el.value = el.name === 'guests' ? '1' : ''; });
      setGuests(1, { fresh: true });
    } catch (err) {
      console.error('[RSVP]', err);
      say(bi({ en: 'We could not send that. Please try again, or message the family directly.', ne: 'पठाउन सकिएन। कृपया फेरि प्रयास गर्नुहोस्।' }), true);
    } finally {
      submit.disabled = false;
    }
  });
}
