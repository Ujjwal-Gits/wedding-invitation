// Small, dependency-free helpers shared by the suite engine (suite.js) and by gate/hero modules that run on
// another theme's page (src/core/mix.js, docs/MIX.md). No CSS, no side effects.
import { dateOf, bsDateOf, timeZone, zoneTag } from '../../core/i18n.js';

export const isOff = (v) => !v || /^\s*(-|–|none|off|no|hide)\s*$/i.test(v);
export const on = (o) => !!o && (!isOff(o.en) || !isOff(o.ne));

export function adParts(iso) {
  const en = new Intl.DateTimeFormat('en-GB', { timeZone: timeZone(), weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(new Date(iso));
  const g = (t) => en.find((p) => p.type === t)?.value || '';
  const [wdNe, ...restNe] = dateOf(iso).ne.split(', ');
  const t = new Intl.DateTimeFormat('en-GB', { timeZone: timeZone(), hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(iso)).replace(/\s?([ap])m$/i, (m, x) => ` ${x.toUpperCase()}M`) + (zoneTag(iso) ? ` ${zoneTag(iso)}` : '');
  return { wd: { en: g('weekday'), ne: wdNe }, day: g('day'), month: { en: g('month'), ne: restNe.join(', ').split(' ')[0] || '' }, year: g('year'), monthYear: { en: `${g('month')} ${g('year')}`, ne: restNe.join(', ') }, full: dateOf(iso), time: t };
}

export function bsParts(iso, override) {
  const b = bsDateOf(iso, override);
  let day = null; let month = null; let year = null;
  const m = String(b.short?.ne || '').match(/^(\S+)\s+([०-९]+),\s*([०-९]+)/);
  if (m) [, month, day, year] = m;
  else {
    const ne = String(b.ne || '');
    const md = ne.match(/([^\s,.०-९]+)\s+([०-९]{1,2})\s*गते/);
    const y = ne.match(/([०-९]{4})/);
    if (md && y) { [, month, day] = md; [, year] = y; }
  }
  return { full: b, day, month, year };
}

export const npDay = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: timeZone() }).format(new Date(iso));
