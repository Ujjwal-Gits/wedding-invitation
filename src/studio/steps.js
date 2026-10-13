// The guided editor: six short steps in plain language.
import { h, icon, iconBtn, clear, confirmDialog } from './dom.js';
import { textField, biField, photoSlot } from './fields.js';
import { portraitsEditor, colorsEditor, musicSection, gallerySection, storySection, wordingSection, infoSection, rsvpSection } from './sections.js';
import { customiseStep, carryOver } from './customise.js';
import { publishStep } from './publish.js';
import { bsDateOf } from '../core/i18n.js';

const blank = () => ({ en: '', ne: '' });
const label = (v, f = '') => (v && (v.en || v.ne)) || f;

/** A plain card with an optional title and line of help. */
export const card = (title, help, ...children) => h('section.card',
  title ? h('h2.card__title', title) : null,
  help ? h('p.card__help', help) : null,
  ...children);

/** Collapsed extras: "More …". */
export const more = (title, ...children) => h('details.more', h('summary', h('span', title), icon('down', 16)), h('div.more__body', ...children));

// ── 1 · Couple & photos ───────────────────────────────────────────────────

function person(ctx, who, title) {
  const m = ctx.m;
  return h('div.person',
    photoSlot(m, ['couple', who, 'photo'], ctx, { label: `${title}’s photo`, hint: 'Drop a photo here or click to choose. Upright photos work best.', shape: 'port' }),
    biField(m, ['couple', who, 'name'], { label: `${title}’s first name`, max: 60, placeholderEn: who === 'bride' ? 'Aarati' : 'Sameer', placeholderNe: who === 'bride' ? 'आरती' : 'समीर' }),
  );
}

function coupleStep(ctx) {
  const m = ctx.m;
  return [
    card('The couple', null, h('div.pair', person(ctx, 'bride', 'Bride'), person(ctx, 'groom', 'Groom'))),
    card('Photos of the two of you', 'Add as many as you like. The first one is the main photo guests see; use the arrows to change the order.', portraitsEditor(ctx)),
    more('More about the families',
      biField(m, ['couple', 'bride', 'fullName'], { label: 'Bride’s full name, as printed', max: 120, placeholderNe: 'सौ.का. …' }),
      biField(m, ['couple', 'groom', 'fullName'], { label: 'Groom’s full name, as printed', max: 120, placeholderNe: 'चि. …' }),
      biField(m, ['couple', 'bride', 'parents'], { label: 'Bride’s parents', max: 240, placeholderEn: 'Mr. … & Mrs. …' }),
      biField(m, ['couple', 'groom', 'parents'], { label: 'Groom’s parents', max: 240, placeholderEn: 'Mr. … & Mrs. …' }),
      biField(m, ['couple', 'bride', 'home'], { label: 'Bride’s family home', max: 160 }),
      biField(m, ['couple', 'groom', 'home'], { label: 'Groom’s family home', max: 160 }),
      biField(m, ['hosts'], { label: 'Who is inviting (signs the card)', max: 200, placeholderEn: 'The Thapa & Shrestha families' }),
      textField(m, ['couple', 'hashtag'], { label: 'Hashtag', max: 60, placeholder: '#AaratiWedsSameer' }),
    ),
  ];
}

// ── 2 · Dates & ceremonies ────────────────────────────────────────────────

const parts = (iso) => {
  const x = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(iso || '');
  return x ? { date: x[1], time: x[2] } : { date: '', time: '' };
};
const iso = (date, time) => `${date}T${time}:00+05:45`;
const nextDay = (d) => { const t = new Date(`${d}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10); };

/**
 * When a ceremony happens: a date and a start time, shown to guests as "11:00 AM onwards".
 * An end time is optional (under "More"). Returns { main, end }.
 */
function whenField(m, p, idBase) {
  const s = parts(m.get([...p, 'start']));
  const e = parts(m.get([...p, 'end']));
  const date = h('input.input', { type: 'date', id: `${idBase}-d`, value: s.date, 'data-path': `${p[0]}[${p[1]}].start` });
  const from = h('input.input', { type: 'time', id: `${idBase}-f`, value: s.time || '11:00', step: 300 });
  const hasEnd = () => !m.get([...p, 'openEnded']) && Boolean(m.get([...p, 'end']));
  const endOn = h('input', { type: 'checkbox', id: `${idBase}-e`, checked: hasEnd() });
  const to = h('input.input', { type: 'time', id: `${idBase}-t`, value: e.time || '', step: 300, 'data-path': `${p[0]}[${p[1]}].end`, disabled: !hasEnd() });
  const write = () => {
    if (!date.value) return;
    m.set([...p, 'start'], iso(date.value, from.value || '11:00'));
    if (endOn.checked && to.value) {
      m.set([...p, 'openEnded'], false);
      m.set([...p, 'end'], iso(to.value < from.value ? nextDay(date.value) : date.value, to.value));
    } else {
      m.set([...p, 'openEnded'], true);
      m.set([...p, 'end'], '');
    }
  };
  endOn.addEventListener('change', () => { to.disabled = !endOn.checked; if (endOn.checked && !to.value) to.value = '16:00'; write(); });
  const bsBox = h('div.bs');
  let editing = false;
  const drawBs = () => {
    clear(bsBox);
    const start = m.get([...p, 'start']);
    if (!start) return;
    const auto = bsDateOf(start);
    const own = m.get([...p, 'dateBS']);
    const hasOwn = own && (own.en || own.ne);
    if (editing || hasOwn) {
      bsBox.append(
        biField(m, [...p, 'dateBS'], { label: 'Date in Bikram Sambat', max: 120, placeholderEn: auto.en, placeholderNe: auto.ne, hint: 'Only if your purohit’s patro shows a different date. Leave empty to use the date worked out for you (shown in grey).' }),
        hasOwn ? h('button.link', { type: 'button', onclick: () => { delete m.get(p).dateBS; m.touch(p); editing = false; drawBs(); } }, 'Use the worked-out date') : null,
      );
    } else {
      bsBox.append(h('p.bs__line', h('span.bs__k', 'B.S.'), h('span', auto.short.en), h('span', { lang: 'ne' }, auto.short.ne),
        h('button.link', { type: 'button', onclick: () => { editing = true; drawBs(); bsBox.querySelector('input')?.focus(); } }, 'Change')));
    }
  };
  [date, from, to].forEach((el) => el.addEventListener('change', () => { write(); drawBs(); }));
  drawBs();
  return {
    main: h('div.when-wrap',
      h('div.when.when--2',
        h('div.field', h('label.label', { for: date.id }, 'Date'), date),
        h('div.field', h('label.label', { for: from.id }, 'Starts at'), from)),
      bsBox),
    end: h('div.field',
      h('label.checkline', endOn, h('span', h('b', 'It has an end time'), h('small', 'Otherwise guests see “11:00 AM onwards”.'))),
      h('div.field.field--narrow2', h('label.label', { for: to.id }, 'Ends at'), to)),
  };
}

function weddingDay(ctx) {
  const m = ctx.m;
  const cur = parts(m.get(['weddingDate']));
  const date = h('input.input', { type: 'date', id: 'wd-date', value: cur.date, 'data-path': 'weddingDate' });
  const time = h('input.input', { type: 'time', id: 'wd-time', value: cur.time || '10:30', step: 300 });
  const bsBox = h('div.bs');
  let editing = false;
  // The B.S. date is worked out with the shared converter (THEME-CONTRACT §12); weddingDateBS is
  // stored only when the planner types their own, and the server fills it in for guests otherwise.
  const drawBs = () => {
    clear(bsBox);
    const iso = m.get(['weddingDate']);
    if (!iso) return;
    const auto = bsDateOf(iso);
    const own = m.get(['weddingDateBS']);
    const hasOwn = own && (own.en || own.ne);
    if (editing || hasOwn) {
      bsBox.append(
        biField(m, ['weddingDateBS'], { label: 'Date in Bikram Sambat', max: 120, placeholderEn: auto.en, placeholderNe: auto.ne, hint: 'Only if your purohit’s patro shows a different date. Leave empty to use the date worked out for you (shown in grey).' }),
        hasOwn ? h('button.link', { type: 'button', onclick: () => { m.set(['weddingDateBS'], { en: '', ne: '' }); editing = false; drawBs(); } }, 'Use the worked-out date') : null,
      );
    } else {
      bsBox.append(h('p.bs__line.bs__line--lg', h('span.bs__k', 'Bikram Sambat'), h('span', auto.en), h('span', { lang: 'ne' }, auto.ne),
        h('button.link', { type: 'button', onclick: () => { editing = true; drawBs(); bsBox.querySelector('input')?.focus(); } }, 'Change')));
    }
  };
  const write = () => { if (date.value) { m.set(['weddingDate'], iso(date.value, time.value || '10:30')); drawBs(); } };
  date.addEventListener('change', write);
  time.addEventListener('change', write);
  drawBs();
  return card('The wedding day', 'The day and auspicious time of the main ceremony. Guests see a countdown to it.',
    h('div.when.when--2', h('div.field', h('label.label', { for: 'wd-date' }, 'Date'), date), h('div.field', h('label.label', { for: 'wd-time' }, 'Time'), time)),
    bsBox,
    biField(m, ['city'], { label: 'City', max: 120, placeholderEn: 'Kathmandu, Nepal', placeholderNe: 'काठमाडौं, नेपाल' }),
  );
}

function ceremonies(ctx) {
  const m = ctx.m;
  const root = h('div.cers');
  const render = (focus) => {
    clear(root);
    const list = m.get(['events']) || [];
    list.forEach((ev, i) => {
      const p = ['events', i];
      const move = (d) => { const j = i + d; if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; m.touch(['events']); render(j); };
      const nameEl = h('h3.cer__name', label(ev.title, 'New ceremony'));
      const when = whenField(m, p, `ev${i}`);
      root.append(h('article.cer', { 'data-index': i, oninput: () => { nameEl.textContent = label(ev.title, 'New ceremony'); } },
        h('header.cer__head',
          h('span.cer__num', String(i + 1)),
          nameEl,
          h('span.cer__tools',
            iconBtn('up', `Move ceremony ${i + 1} earlier`, () => move(-1), i === 0 ? 'is-disabled' : ''),
            iconBtn('down', `Move ceremony ${i + 1} later`, () => move(1), i === list.length - 1 ? 'is-disabled' : ''),
            iconBtn('trash', `Remove ceremony ${i + 1}`, async () => {
              if (!(await confirmDialog({ title: 'Remove this ceremony?', message: `“${label(ev.title, 'This ceremony')}” will be removed from the invitation.`, confirm: 'Remove', danger: true }))) return;
              list.splice(i, 1); m.touch(['events']); render();
            }),
          ),
        ),
        biField(m, [...p, 'title'], { label: 'Name', max: 80, placeholderEn: 'Mehendi', placeholderNe: 'मेहन्दी' }),
        when.main,
        biField(m, [...p, 'venue'], { label: 'Place', max: 200, placeholderEn: 'Shanti Banquet, Jawalakhel' }),
        photoSlot(m, [...p, 'photo'], ctx, { label: 'Photo for this ceremony', hint: 'Tap “Replace photo” to use your own.', shape: 'land', library: true }),
        more('More for this ceremony',
          when.end,
          biField(m, [...p, 'blurb'], { label: 'One line about it', max: 240 }),
          textField(m, [...p, 'mapQuery'], { label: 'What to search in Google Maps', max: 200, placeholder: 'Shanti Banquet Jawalakhel' }),
          colorsEditor(ctx, [...p, 'dress', 'colors']),
          biField(m, [...p, 'dress', 'text'], { label: 'What to wear', max: 120, placeholderEn: 'Shades of green' }),
        ),
      ));
    });
    if (list.length < 12) {
      root.append(h('button.btn.btn--add', { type: 'button', onclick: () => {
        const taken = list.map((e) => e.id);
        let id = 'ceremony';
        for (let n = 2; taken.includes(id); n++) id = `ceremony-${n}`;
        const day = (list.at(-1)?.start || m.get(['weddingDate']) || '').slice(0, 10);
        if (!m.get(['events'])) m.set(['events'], []);
        m.get(['events']).push({ id, title: blank(), blurb: blank(), start: day ? iso(day, '11:00') : '', end: '', openEnded: true, venue: blank(), mapQuery: '', dress: { colors: [], text: blank() }, photo: null });
        m.touch(['events']);
        render(m.get(['events']).length - 1);
      } }, icon('plus', 16), 'Add a ceremony'));
    }
    if (focus != null) root.querySelectorAll('.cer')[focus]?.querySelector('input')?.focus({ preventScroll: false });
  };
  render();
  return card('Ceremonies', 'Every event guests are invited to, in order. Personal guest links can show someone only some of them.', root);
}

function datesStep(ctx) {
  return [weddingDay(ctx), ceremonies(ctx)];
}

// ── 3 · Choose a theme ────────────────────────────────────────────────────

function themeStep(ctx) {
  const m = ctx.m;
  const grid = h('div.tpick', { role: 'radiogroup', 'aria-label': 'Theme' });
  const note = h('div.carry-note', { 'aria-live': 'polite' });
  const showNote = async () => {
    const t = m.get(['theme']);
    const c = await carryOver(ctx, t);
    if (m.get(['theme']) !== t) return;
    const name = ctx.meta.themes.find((x) => x.slug === t)?.name || t;
    clear(note).append(
      h('p', h('b', `Your names, dates, ceremonies and ${c.portraits} couple photo${c.portraits === 1 ? '' : 's'} move with you to ${name}.`)),
      c.shown.length ? h('p', `Your own words and photos that ${name} also shows: ${c.shown.join(', ')}.`) : null,
      c.others.length ? h('p.muted', 'Changes you made only for another theme are kept, in case you switch back.') : null,
    );
  };
  const render = () => {
    clear(grid);
    const cur = m.get(['theme']);
    for (const t of ctx.meta.themes) {
      const id = `pick-${t.slug}`;
      const on = cur === t.slug;
      const img = t.thumb ? h('img', { src: t.thumb, alt: '', loading: 'lazy', decoding: 'async' }) : h('span.tpick__ph', t.name);
      grid.append(h('label.tpick__item', { for: id, class: `${on ? 'is-on' : ''} ${t.ready ? '' : 'is-soon'}` },
        h('input.sr-only', { type: 'radio', name: 'theme', id, value: t.slug, checked: on, disabled: !t.ready, onchange: () => {
          m.set(['theme'], t.slug); ctx.onTheme?.(t.slug); render(); showNote(); grid.querySelector(`#${id}`)?.focus();
        } }),
        h('span.tpick__img', img, on ? h('span.tpick__check', icon('check', 18), 'Chosen') : null, t.ready ? null : h('span.tpick__soon', 'Coming soon')),
        h('span.tpick__text', h('b', t.name), t.concept ? h('small', t.concept) : null),
      ));
    }
  };
  render();
  showNote();
  return [note, grid];
}

// ── 5 · Music ─────────────────────────────────────────────────────────────

function musicStep(ctx) {
  const node = musicSection(ctx);
  node.querySelector('.sec__head')?.remove();
  return [node];
}

// ── 4 · Customise (theme content + the rarer details) ─────────────────────

function extras(ctx) {
  const strip = (node) => { node.querySelector(':scope > .sec__head')?.remove(); return node; };
  return h('div.extras',
    h('h2.extras__title', 'More details'),
    h('p.card__help', 'Optional. Open any of these when you need it.'),
    more('Album photos', strip(gallerySection(ctx))),
    more('Our story', strip(storySection(ctx))),
    more('Invitation card wording', strip(wordingSection(ctx))),
    more('Travel, stays and family contacts', strip(infoSection(ctx))),
    more('Replies (RSVP) settings', strip(rsvpSection(ctx))),
    more('How the link looks when shared',
      textField(ctx.m, ['share', 'title'], { label: 'Title', max: 140, placeholder: 'Aarati & Sameer · Shubha Bibaha' }),
      textField(ctx.m, ['share', 'description'], { label: 'Short message', max: 300, multiline: true, rows: 2 })),
  );
}

export const STEPS = [
  { id: 'couple', title: 'Couple & photos', intro: 'Names and photos of the two of you.', render: coupleStep },
  { id: 'dates', title: 'Dates & ceremonies', intro: 'When and where everything happens.', render: datesStep },
  { id: 'theme', title: 'Choose a theme', intro: 'Pick the look. You can change it any time; nothing you entered is lost.', render: themeStep },
  { id: 'customise', title: 'Customise', intro: 'Click any photo or line of text to change it.', render: (ctx) => [customiseStep(ctx), extras(ctx)] },
  { id: 'music', title: 'Music', intro: 'Choose what plays while guests open the invitation.', render: musicStep },
  { id: 'publish', title: 'Preview & publish', intro: 'Check it on a phone and a computer, then share it.', render: publishStep },
];

