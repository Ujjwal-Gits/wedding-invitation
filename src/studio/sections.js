// The editor's sections. Each returns a DOM node bound to ctx.m (the invitation model).
import { h, icon, iconBtn, clear, toggle } from './dom.js';
import { textField, biField, repeater, section, group, pathStr } from './fields.js';

const blank = () => ({ en: '', ne: '' });
const label = (v, fallback = '') => (v && (v.en || v.ne)) || fallback;
const openItems = new WeakSet();

// ── Date & place ──────────────────────────────────────────────────────────

// ── Ceremonies ────────────────────────────────────────────────────────────

export function colorsEditor(ctx, path) {
  const m = ctx.m;
  const root = h('div.colors');
  const render = () => {
    clear(root);
    const arr = m.get(path) || [];
    arr.forEach((c, i) => {
      const id = `${pathStr(path)}-${i}`.replace(/[^\w-]/g, '_');
      root.append(h('span.colors__item',
        h('label.sr-only', { for: id }, `Colour ${i + 1}`),
        h('input.colors__input', { type: 'color', id, value: c, oninput: (e) => { arr[i] = e.target.value; m.touch(path); } }),
        iconBtn('close', `Remove colour ${i + 1}`, () => { arr.splice(i, 1); m.touch(path); render(); }, 'btn--xs'),
      ));
    });
    if (arr.length < 6) {
      root.append(h('button.btn.btn--sm', { type: 'button', onclick: () => { if (!m.get(path)) m.set(path, []); m.get(path).push('#c9963f'); m.touch(path); render(); root.querySelector('.colors__item:last-of-type input')?.focus(); } }, icon('plus', 16), 'Colour'));
    }
  };
  render();
  return h('fieldset.field', h('legend.label', 'Dress code colours'), h('p.hint', 'Up to six swatches guests can match.'), root);
}

// ── Story ─────────────────────────────────────────────────────────────────

export function storySection(ctx) {
  const m = ctx.m;
  return section('Story', 'A few short moments. One sentence each reads best.',
    repeater(m, ['story'], {
      itemName: 'moment', addLabel: 'Add a moment', max: 12, empty: 'No story yet. Two or three moments are plenty.',
      title: (s) => label(s.year, 'New moment'),
      create: () => ({ year: blank(), text: blank() }),
      render: (i) => [
        biField(m, ['story', i, 'year'], { label: 'Year', max: 20, placeholderEn: '2019', placeholderNe: '२०७६' }),
        biField(m, ['story', i, 'text'], { label: 'What happened', max: 500, multiline: true, rows: 2 }),
      ],
    }),
  );
}

// ── Card wording ──────────────────────────────────────────────────────────

export function wordingSection(ctx) {
  const m = ctx.m;
  const sp = m.get(['saptapadi']) || [];
  while (sp.length < 7) sp.push(blank());
  if (!m.get(['saptapadi'])) m.set(['saptapadi'], sp);
  return section('Card wording', 'The full printed-card text. Themes keep it behind a “Read the invitation card” button, so it can be traditional and complete.',
    group('Invocation',
      textField(m, ['invitation', 'shloka', 'sa'], { label: 'Shloka (Sanskrit)', max: 400, multiline: true, rows: 2, lang: 'sa' }),
      textField(m, ['invitation', 'shloka', 'en'], { label: 'Shloka meaning (English)', max: 400, multiline: true, rows: 2 }),
    ),
    group('The card',
      biField(m, ['invitation', 'salutation'], { label: 'Salutation', max: 120, placeholderEn: 'Respected guest,', placeholderNe: 'मान्यवर,' }),
      biField(m, ['invitation', 'body'], { label: 'Main text', max: 2000, multiline: true, rows: 5 }),
      biField(m, ['invitation', 'request'], { label: 'Request', max: 1000, multiline: true, rows: 3 }),
      biField(m, ['invitation', 'signoff'], { label: 'Sign-off', max: 120, placeholderEn: 'With humble regards', placeholderNe: 'विनीत' }),
      biField(m, ['closing'], { label: 'Closing blessing', hint: 'The last line of the invitation.', max: 400, multiline: true, rows: 2 }),
    ),
    group('Saptapadi: the seven steps',
      ...Array.from({ length: 7 }, (_, i) => biField(m, ['saptapadi', i], { label: `Step ${i + 1}`, max: 160 })),
    ),
  );
}

// ── Guest info ────────────────────────────────────────────────────────────

export function infoSection(ctx) {
  const m = ctx.m;
  return section('Guest info', 'Practical details for guests travelling in.',
    group('Getting there', biField(m, ['info', 'travel'], { label: 'Travel and parking', max: 1000, multiline: true, rows: 3 })),
    group('Places to stay', repeater(m, ['info', 'stays'], {
      itemName: 'stay', addLabel: 'Add a place to stay', max: 8, empty: 'No suggestions yet.',
      title: (s) => label(s.name, 'New place'),
      create: () => ({ name: blank(), note: blank(), mapQuery: '' }),
      render: (i) => [
        biField(m, ['info', 'stays', i, 'name'], { label: 'Name', max: 120 }),
        biField(m, ['info', 'stays', i, 'note'], { label: 'Note', max: 240 }),
        textField(m, ['info', 'stays', i, 'mapQuery'], { label: 'Map search', max: 200 }),
      ],
    })),
    group('Family contacts', repeater(m, ['info', 'contacts'], {
      itemName: 'contact', addLabel: 'Add a contact', max: 8, empty: 'No contacts yet.',
      title: (k) => [label(k.name, 'New contact'), label(k.role)].filter(Boolean).join(' · '),
      create: () => ({ name: blank(), role: blank(), phone: '' }),
      render: (i) => [
        biField(m, ['info', 'contacts', i, 'name'], { label: 'Name', max: 80 }),
        biField(m, ['info', 'contacts', i, 'role'], { label: 'Relation', max: 80, placeholderEn: 'Bride’s brother', placeholderNe: 'दुलहीको दाजु' }),
        textField(m, ['info', 'contacts', i, 'phone'], { label: 'Phone', max: 20, type: 'tel', inputmode: 'tel', placeholder: '+977 98…' }),
      ],
    })),
    group('Livestream', textField(m, ['info', 'livestream'], { label: 'Livestream link (optional)', hint: 'For relatives abroad. Must start with https://', max: 500, type: 'url', placeholder: 'https://youtube.com/…' })),
  );
}

// ── RSVP settings ─────────────────────────────────────────────────────────

export function rsvpSection(ctx) {
  const m = ctx.m;
  const enabled = m.get(['rsvp', 'enabled']) !== false;
  return section('RSVP settings', 'Replies arrive in Replies. Guests never need an account.',
    group(null,
      toggle({ label: 'Accept replies', hint: 'Turn off after the deadline to close the form.', checked: enabled, onChange: (v) => m.set(['rsvp', 'enabled'], v) }),
      biField(m, ['rsvp', 'deadline'], { label: 'Reply-by line', max: 200, placeholderEn: 'Kindly reply by 25 January 2027' }),
      textField(m, ['rsvp', 'maxGuests'], { label: 'Most guests per reply', hint: 'Including the person replying. 1 to 20.', type: 'number', max: 2, inputmode: 'numeric', class: 'field--narrow' }),
    ),
  );
}

