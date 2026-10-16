// Dates & events: the wedding day (with its Bikram Sambat date worked out) and simple ceremony cards.
import { h, icon, iconBtn, clear, confirmDialog, card, append } from './dom.js';
import { textField, biField, photoSlot } from './fields.js';
import { colorsEditor, infoSection } from './sections.js';
import { bsDateOf } from '../core/i18n.js';
import { CEREMONY_PRESETS, religionOf } from '../core/faith.js';

const blank = () => ({ en: '', ne: '' });
const label = (v, f = '') => (v && (v.en || v.ne)) || f;
const more = (title, ...children) => h('details.more', h('summary', h('span', title), icon('down', 16)), h('div.more__body', ...children));

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
      append(bsBox, [
        biField(m, [...p, 'dateBS'], { label: 'Date in Bikram Sambat', max: 120, placeholderEn: auto.en, placeholderNe: auto.ne, hint: 'Only if your purohit’s patro shows a different date. Leave empty to use the date worked out for you (shown in grey).' }),
        hasOwn ? h('button.link', { type: 'button', onclick: () => { delete m.get(p).dateBS; m.touch(p); editing = false; drawBs(); } }, 'Use the worked-out date') : null,
      ]);
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
      append(bsBox, [
        biField(m, ['weddingDateBS'], { label: 'Date in Bikram Sambat', max: 120, placeholderEn: auto.en, placeholderNe: auto.ne, hint: 'Only if your purohit’s patro shows a different date. Leave empty to use the date worked out for you (shown in grey).' }),
        hasOwn ? h('button.link', { type: 'button', onclick: () => { m.set(['weddingDateBS'], { en: '', ne: '' }); editing = false; drawBs(); } }, 'Use the worked-out date') : null,
      ]);
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
        biField(m, [...p, 'title'], { label: 'Name', max: 80, placeholderEn: 'e.g. Mehendi', placeholderNe: 'जस्तै: मेहन्दी' }),
        when.main,
        biField(m, [...p, 'venue'], { label: 'Place', max: 200, placeholderEn: 'e.g. Shanti Banquet, Jawalakhel' }),
        photoSlot(m, [...p, 'photo'], ctx, { label: 'Photo for this ceremony', hint: 'Optional. Your own, or one from the library.', shape: 'land', library: true }),
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
      const add = (preset) => {
        const taken = list.map((e) => e.id);
        let id = preset?.id || 'ceremony';
        for (let n = 2; taken.includes(id); n++) id = `${preset?.id || 'ceremony'}-${n}`;
        const day = (list.at(-1)?.start || m.get(['weddingDate']) || '').slice(0, 10);
        if (!m.get(['events'])) m.set(['events'], []);
        m.get(['events']).push({ id, title: preset ? { ...preset.title } : blank(), blurb: preset ? { ...preset.blurb } : blank(), start: day ? iso(day, '11:00') : '', end: '', openEnded: true, venue: blank(), mapQuery: '', dress: { colors: [], text: blank() }, photo: null });
        m.touch(['events']);
        render(m.get(['events']).length - 1);
      };
      // Ceremony presets for the couple's community (src/core/faith.js): one tap adds it as its own ceremony,
      // so guests answer for each one separately (Janti and the reception are never one tick).
      const have = new Set(list.map((e) => `${e.id} ${label(e.title).toLowerCase()}`));
      const presets = (CEREMONY_PRESETS[religionOf(m.data)] || []).filter((p) => ![...have].some((k) => k.startsWith(`${p.id} `) || k.endsWith(` ${p.title.en.toLowerCase()}`)));
      if (presets.length) {
        root.append(h('div.cer-presets', h('span.cer-presets__k', 'Quick add'),
          presets.map((p) => h('button.chip.cer-presets__b', { type: 'button', onclick: () => add(p) }, icon('plus', 14), h('span', p.title.en), h('small', { lang: 'ne' }, p.title.ne)))));
      }
      root.append(h('button.btn.btn--add', { type: 'button', onclick: () => add(null) }, icon('plus', 16), 'Add a ceremony'));
    }
    if (focus != null) root.querySelectorAll('.cer')[focus]?.querySelector('input')?.focus({ preventScroll: false });
  };
  render();
  return card('Ceremonies', 'Every event guests are invited to, in order. Personal guest links can show someone only some of the ceremonies.', root);
}


export function datesModule(ctx) {
  const info = infoSection(ctx);
  info.querySelector(':scope > .sec__head')?.remove();
  return [weddingDay(ctx), ceremonies(ctx),
    h('details.fold', h('summary.fold__sum', h('span', h('b', 'Travel, places to stay and family contacts'), h('small', 'Optional, for guests coming from afar')), icon('down', 18)), h('div.fold__body', info))];
}
