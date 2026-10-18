// Guest replies. Public POST (text/plain JSON, Origin-checked, rate limited, honeypot),
// admin list with totals, CSV export that neutralises spreadsheet formulas, delete.
import { randomBytes } from 'node:crypto';
import { peekInvitation, isLive, listReplies as storedReplies, addReply, deleteReply as dropReply } from './store.js';
import { rateLimiter, originAllowed, clientIp } from './security.js';
import { rsvpOptions, partyOf, mealLabel, mealTotals, guestName, LIMITS } from '../../src/core/rsvp-rules.js';

const httpError = (status, message) => Object.assign(new Error(message), { status, expose: true });
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F‪-‮⁦-⁩]/g;
const PHONE_RE = /^[0-9+()\-\s]{6,20}$/;
const MAX_REPLIES = 5000;

// Sized for a real wedding: hundreds of guests reply within the hour the link goes out, and guests on the same
// mobile carrier can share one public IP (CGNAT). MAX_REPLIES still bounds an invitation in total.
const perIp = rateLimiter({ windowMs: 10 * 60 * 1000, max: 30 });
const perInvitation = rateLimiter({ windowMs: 60 * 60 * 1000, max: 3000 });

const clean = (v, max, multiline = false) => {
  let s = typeof v === 'string' ? v.normalize('NFC').replace(CTRL, '') : '';
  if (!multiline) s = s.replace(/[\r\n]+/g, ' ');
  return s.trim().slice(0, max);
};

export async function submit(req, res) {
  const { slug } = req.params;
  if (!originAllowed(req)) return res.status(403).json({ ok: false, error: 'Cross-site request refused.' });

  const ip = clientIp(req);
  const a = perIp.hit(`${ip}:${slug}`);
  const b = perInvitation.hit(slug);
  if (!a.ok || !b.ok) {
    res.set('Retry-After', String(Math.max(a.retryAfter, b.retryAfter)));
    return res.status(429).json({ ok: false, error: 'Too many replies from here. Please try again later.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ ok: false, error: 'Bad request.' }); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ ok: false, error: 'Bad request.' });

  const doc = await peekInvitation(slug);
  if (!isLive(doc)) return res.status(404).json({ ok: false, error: 'Not found.' });
  const inv = doc.published;
  if (inv.rsvp.enabled === false) return res.status(403).json({ ok: false, error: 'Replies are closed for this invitation.' });

  // Honeypot: real guests never see or fill "website". Pretend success, store nothing.
  if (typeof body.website === 'string' && body.website.trim()) return res.json({ ok: true });

  const name = clean(body.name, LIMITS.name);
  const phone = clean(body.phone, 20);
  const attending = body.attending === 'no' ? 'no' : body.attending === 'yes' ? 'yes' : null;
  const message = clean(body.message, LIMITS.message, true);
  const ask = rsvpOptions(inv.rsvp);
  const mealIds = new Set(ask.meals.map((m) => m.id));
  const max = inv.rsvp.maxGuests || 6;
  let guests = Number(body.guests);
  const validIds = new Set(inv.events.map((e) => e.id));
  let events = Array.isArray(body.events) ? [...new Set(body.events.filter((e) => typeof e === 'string' && validIds.has(e)))] : [];

  const errors = [];
  if (name.length < 2) errors.push('name');
  if (phone && !PHONE_RE.test(phone)) errors.push('phone');
  if (!attending) errors.push('attending');
  if (attending === 'no') { guests = 0; events = []; }
  else if (!Number.isInteger(guests) || guests < 1 || guests > max) errors.push('guests');
  if (Array.isArray(body.events) && body.events.length > 20) errors.push('events');
  // each ceremony is its own answer: a guest who comes must say which (an older form that sends no list counts for all)
  if (attending === 'yes' && Array.isArray(body.events) && body.events.length && !events.length) errors.push('events');
  if (attending === 'yes' && Array.isArray(body.events) && !body.events.length && validIds.size > 1) errors.push('events');

  // Everyone coming, one entry each: a name (the first is the person replying) and a meal from the couple's list.
  // An older form sends no `party`, only one meal for everyone: still accepted, nothing more is asked of it.
  let party = [];
  if (attending === 'yes' && !errors.includes('guests')) {
    if (body.party != null && (!Array.isArray(body.party) || body.party.length !== guests)) errors.push('party');
    else if (Array.isArray(body.party)) {
      party = body.party.map((g, i) => {
        const o = g && typeof g === 'object' && !Array.isArray(g) ? g : {};
        const gName = i === 0 ? name : ask.guestNames === 'off' ? '' : clean(o.name, LIMITS.name);
        const meal = typeof o.meal === 'string' && mealIds.has(o.meal) ? o.meal : '';
        if (ask.meals.length && !meal && !errors.includes('meal')) errors.push('meal');
        if (i > 0 && ask.guestNames === 'required' && gName.length < 2 && !errors.includes('party')) errors.push('party');
        return { name: gName, meal };
      });
    } else {
      const meal = typeof body.meal === 'string' && mealIds.has(body.meal) ? body.meal : '';
      party = Array.from({ length: guests }, (_, i) => ({ name: i ? '' : name, meal }));
    }
  }
  if (errors.length) return res.status(400).json({ ok: false, error: 'Please check your reply.', fields: errors });
  if (attending === 'yes' && !events.length) events = [...validIds];

  const reply = { id: randomBytes(9).toString('base64url'), at: new Date().toISOString(), name, phone, attending, guests, events, party };
  const diet = attending === 'yes' && ask.diet ? clean(body.diet, LIMITS.diet, true) : '';
  const song = attending === 'yes' && ask.song ? clean(body.song, LIMITS.song) : '';
  if (diet) reply.diet = diet;
  if (song) reply.song = song;
  reply.message = message;
  try {
    await addReply(slug, reply, MAX_REPLIES); // 507 when the invitation is full
  } catch (err) {
    if (err.expose) return res.status(err.status).json({ ok: false, error: err.message });
    throw err;
  }
  console.info(`[rsvp] slug=${slug} attending=${attending} guests=${guests}`);
  res.json({ ok: true });
}

function totals(inv, replies) {
  const yes = replies.filter((r) => r.attending === 'yes');
  const events = (inv?.events || []).map((e) => {
    const rs = yes.filter((r) => (r.events || []).includes(e.id));
    return { id: e.id, title: e.title, start: e.start, parties: rs.length, guests: rs.reduce((n, r) => n + r.guests, 0) };
  });
  return {
    replies: replies.length,
    attendingParties: yes.length,
    declined: replies.length - yes.length,
    guests: yes.reduce((n, r) => n + r.guests, 0),
    veg: yes.reduce((n, r) => n + partyOf(r).filter((g) => g.meal === 'veg').length, 0), // older dashboards read this
    meals: mealTotals(yes, rsvpOptions(inv?.rsvp).meals),
    diet: yes.filter((r) => r.diet).length,
    songs: yes.filter((r) => r.song).length,
    events,
  };
}

async function loadBoth(slug) {
  const doc = await peekInvitation(slug);
  if (!doc) throw httpError(404, 'No invitation with that link name.');
  const replies = await storedReplies(slug);
  return { inv: doc.published || doc.draft, replies };
}

export async function listReplies(req, res) {
  const { inv, replies } = await loadBoth(req.params.slug);
  replies.sort((a, b) => b.at.localeCompare(a.at));
  res.json({ replies, totals: totals(inv, replies) });
}

export async function deleteReply(req, res) {
  const { slug, id } = req.params;
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) throw httpError(400, 'Bad id.');
  if (!(await dropReply(slug, id))) throw httpError(404, 'Reply not found.');
  console.info(`[admin] delete rsvp slug=${slug} id=${id}`);
  res.json({ ok: true });
}

/** A cell that spreadsheets will treat as text: leading = + - @ tab CR get a ' prefix, then CSV quoting. */
export function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function exportCsv(req, res) {
  const { slug } = req.params;
  const { inv, replies } = await loadBoth(slug);
  replies.sort((a, b) => a.at.localeCompare(b.at));
  const titles = Object.fromEntries((inv?.events || []).map((e) => [e.id, e.title.en || e.title.ne || e.id]));
  const meals = rsvpOptions(inv?.rsvp).meals;
  // One row per reply; "Guest names" and "Meals" list the party in the same order, joined by " / ".
  const header = ['Received', 'Name', 'Phone', 'Attending', 'Guests', 'Ceremonies', 'Guest names', 'Meals', 'Dietary needs', 'Song request', 'Message'];
  const rows = replies.map((r) => {
    const party = partyOf(r);
    return [
      r.at, r.name, r.phone, r.attending, r.guests, (r.events || []).map((id) => titles[id] || id).join(' / '),
      party.map((g, i) => guestName(g, i)).join(' / '),
      party.some((g) => g.meal) ? party.map((g) => mealLabel(g.meal, meals).en || '-').join(' / ') : '',
      r.diet || '', r.song || '', r.message,
    ];
  });
  const csv = `﻿${[header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="rsvps-${slug}.csv"`);
  console.info(`[admin] export csv slug=${slug} rows=${rows.length}`);
  res.send(csv);
}
