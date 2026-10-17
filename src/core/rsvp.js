// RSVP: validated here and again in the Apps Script. No cookies or sessions are
// involved, so there is no ambient authority for a CSRF attack to borrow.
import { config } from '../config.js';
import { bi, esc } from './i18n.js';

const NAME_MIN = 2;
const PHONE_RE = /^[0-9+()\-\s]{6,20}$/;
const COOLDOWN_MS = 30_000;

export function initRsvp(eventsList = config.events) {
  const form = document.getElementById('rsvp-form');
  const guests = document.getElementById('f-guests');
  const events = document.getElementById('f-events');
  const status = document.getElementById('rsvp-status');
  const submit = document.getElementById('rsvp-submit');
  const nameInput = document.getElementById('f-name');
  const nameErr = document.getElementById('f-name-err');
  let lastSent = 0;

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
  const setGuests = (n) => {
    const v = Math.min(maxGuests, Math.max(1, n));
    gIn.value = String(v); gOut.textContent = String(v);
    gMinus.disabled = v <= 1; gPlus.disabled = v >= maxGuests;
  };
  step.addEventListener('click', (e) => { const b = e.target.closest('.gstep__b'); if (b) setGuests(Number(gIn.value) + Number(b.dataset.d)); });
  setGuests(1);
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
    const fd = new FormData(form);
    const data = {
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      attending: fd.get('attending') === 'no' ? 'no' : 'yes',
      guests: Number(fd.get('guests') || 1),
      events: fd.getAll('events').map(String),
      meal: fd.get('meal') === 'veg' ? 'veg' : 'nonveg',
      message: String(fd.get('message') || '').trim().slice(0, 500),
      website: String(fd.get('website') || ''),
    };
    if (data.attending === 'no') { data.guests = 0; data.events = []; }

    // Validation
    nameInput.removeAttribute('aria-invalid');
    nameErr.textContent = '';
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
      form.querySelectorAll('input:not([type=hidden]), select, textarea').forEach((el) => { if (el.type !== 'radio' && el.type !== 'checkbox') el.value = el.name === 'guests' ? '1' : ''; }); setGuests(1);
    } catch (err) {
      console.error('[RSVP]', err);
      say(bi({ en: 'We could not send that. Please try again, or message the family directly.', ne: 'पठाउन सकिएन। कृपया फेरि प्रयास गर्नुहोस्।' }), true);
    } finally {
      submit.disabled = false;
    }
  });
}
