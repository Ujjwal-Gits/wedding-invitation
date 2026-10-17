// Builds an .ics file with every ceremony, and the share button.
import { config } from '../config.js';

// Times are written in UTC ("Z"), so every calendar app puts them at the right moment in the guest's own zone.
const stamp = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const OPEN_HOURS = 3; // a ceremony without an end time ("onwards") is put in the calendar for three hours
/** The end of an event in the calendar: its own end time, else three hours after it starts. */
export const icsEnd = (e) => {
  const end = !e.openEnded && e.end ? Date.parse(e.end) : NaN;
  return new Date(Number.isFinite(end) && end > Date.parse(e.start) ? end : Date.parse(e.start) + OPEN_HOURS * 3600e3).toISOString();
};
const text = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

export function downloadIcs(events = config.events) {
  const { bride, groom } = config.couple;
  const who = `${bride.name.en} & ${groom.name.en}`;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nimtto//Wedding Invitation//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of events) {
    if (!Number.isFinite(Date.parse(e.start))) continue;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.id}-${stamp(e.start)}@nimtto.com`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(e.start)}`,
      `DTEND:${stamp(icsEnd(e))}`,
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
