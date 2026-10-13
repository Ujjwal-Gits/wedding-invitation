// Builds an .ics file with every ceremony, and the share button.
import { config } from '../config.js';

const stamp = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const text = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export function downloadIcs(events = config.events) {
  const { bride, groom } = config.couple;
  const who = `${bride.name.en} & ${groom.name.en}`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sayapatri//Wedding Invitation//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}-${stamp(e.start)}@sayapatri`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(e.start)}`,
      `DTEND:${stamp(e.end)}`,
      `SUMMARY:${text(`${e.title.en} · ${who}`)}`,
      `LOCATION:${text(e.venue.en)}`,
      `DESCRIPTION:${text(e.note?.en ?? `${e.title.en} for ${who}`)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `${bride.name.en}-${groom.name.en}-wedding.ics`.toLowerCase() });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function share(btn) {
  const data = { title: config.share.title, text: config.share.description, url: location.href.split('#')[0] };
  try {
    if (navigator.share) { await navigator.share(data); return; }
    await navigator.clipboard.writeText(data.url);
    const old = btn.innerHTML;
    btn.innerHTML = '<span class="l-en">Link copied</span><span class="l-ne" lang="ne">लिङ्क कपी भयो</span>';
    setTimeout(() => { btn.innerHTML = old; }, 2200);
  } catch { /* user cancelled */ }
}
