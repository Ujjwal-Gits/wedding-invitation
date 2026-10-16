// Home: a welcome, what is done and what is next, and the share link once the invitation is live.
import { h, icon, clear, card, fmtDate, fill } from './dom.js';
import { api } from './api.js';
import { label } from './session.js';
import { shareUrl, shareButtons } from './m-send.js';

function steps(ctx) {
  const d = ctx.m.data;
  const tc = d.themeContent?.[d.theme];
  const ownWords = Object.values(d.content?.texts || {}).some((t) => t?.en || t?.ne) || Object.keys(tc?.texts || {}).length > 0;
  return [
    { id: 'couple', title: 'Names and families', sub: 'Who is getting married, and who invites', ok: Boolean(label(d.couple?.bride?.name) && label(d.couple?.groom?.name) && label(d.couple?.bride?.parents)) },
    { id: 'dates', title: 'Date and ceremonies', sub: 'When and where everything happens', ok: Boolean(d.weddingDate && (d.events || []).length && d.events.every((e) => e.start && label(e.venue))) },
    { id: 'opening', title: 'The opening', sub: 'The first words guests read', ok: ownWords || Boolean(Object.keys(d.themeColors?.[d.theme] || {}).length) },
    { id: 'photos', title: 'Your photos', sub: 'Photos of the two of you', ok: (d.couple?.portraits || []).some((p) => p.photo && typeof p.photo === 'object') },
    { id: 'music', title: 'Music', sub: 'A song, your MP3 or a YouTube link', ok: Boolean(d.music?.youtube?.id || (d.music?.tracks || []).length) },
    { id: 'send', title: 'Publish and share', sub: 'Send it on WhatsApp, Viber or Messenger', ok: ctx.session.doc.status === 'published' && !ctx.session.doc.changed },
  ];
}

const daysTo = (iso) => {
  if (!iso) return null;
  const n = Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5);
  return Number.isFinite(n) ? n : null;
};

export function homeModule(ctx) {
  const d = ctx.m.data;
  const list = steps(ctx);
  const done = list.filter((s) => s.ok).length;
  const next = list.find((s) => !s.ok);
  const days = daysTo(d.weddingDate);
  const live = ctx.session.doc.status === 'published';
  const names = ctx.session.names();

  const hero = h('section.welcome',
    h('div.welcome__text',
      h('p.eyebrow', ctx.isAdmin ? 'Invitation' : 'Namaste · नमस्ते'),
      h('h2.welcome__title', names),
      h('p.welcome__sub',
        d.weddingDate ? fmtDate(d.weddingDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Set your wedding date in Dates & events',
        days != null && days > 0 ? h('span.welcome__days', ` · ${days} day${days === 1 ? '' : 's'} to go`) : null),
      h('div.welcome__acts',
        next ? h('a.btn.btn--primary', { href: `#/i/${ctx.slug}/${next.id}` }, next.id === 'send' ? 'Publish and share' : `Next: ${next.title.toLowerCase()}`, icon('right', 16))
          : h('a.btn.btn--primary', { href: `#/i/${ctx.slug}/send` }, icon('send', 16), 'Share the invitation'),
        h('a.btn', { href: `/${d.theme}/?id=${encodeURIComponent(ctx.slug)}&preview=1`, target: '_blank', rel: 'noopener' }, icon('external', 16), 'Open full screen'))),
    h('div.welcome__ring', { role: 'img', 'aria-label': `${done} of ${list.length} steps done` },
      h('svg', null),
      h('span.welcome__ringnum', h('b', String(done)), `/${list.length}`),
      h('span.welcome__ringlab', 'done')));
  // Progress ring (constant SVG markup).
  const pct = done / list.length;
  hero.querySelector('.welcome__ring svg').outerHTML = `<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="ring__bg"/><circle cx="60" cy="60" r="52" class="ring__fg" pathLength="100" stroke-dasharray="${Math.round(pct * 100)} 100"/></svg>`;

  const checklist = card('Your checklist', 'Everything saves by itself. Do the steps in any order.',
    h('ol.steplist', list.map((s, i) => h('li', h('a.stepitem', { href: `#/i/${ctx.slug}/${s.id}`, class: s.ok ? 'is-done' : s === next ? 'is-next' : '' },
      h('span.stepitem__n', s.ok ? icon('check', 14) : String(i + 1)),
      h('span.stepitem__text', h('b', s.title), h('small', s.sub)),
      s === next ? h('span.pill.pill--accent', 'Next') : null,
      icon('chevron', 16))))));

  const repliesBox = h('div');
  const repliesCard = h('section.card.minicard', h('header.card__head', h('h2.card__title', 'Replies')), repliesBox);
  api(`/invitations/${ctx.slug}/rsvps`).then(({ totals }) => {
    fill(repliesBox, 
      h('p.big', h('b', String(totals.guests)), h('span', ` guest${totals.guests === 1 ? '' : 's'} coming`)),
      h('p.muted', `${totals.replies} repl${totals.replies === 1 ? 'y' : 'ies'} · ${totals.declined} can’t come`),
      h('a.link', { href: `#/i/${ctx.slug}/replies` }, 'See all replies', icon('right', 14)));
  }).catch(() => fill(repliesBox, h('p.muted', 'Replies appear here once guests answer.')));

  let shareBox;
  if (live) {
    const url = shareUrl(ctx.meta, ctx.slug, d.theme);
    shareBox = card('Your invitation is live', 'Share this link with your guests.',
      h('input.input.linkfield', { type: 'text', readonly: true, value: url, 'aria-label': 'Invitation link', onfocus: (e) => e.target.select() }),
      shareButtons(() => url, () => `You are warmly invited to the wedding of ${names}. Please open your invitation: ${url}`),
      h('a.link', { href: `#/i/${ctx.slug}/send` }, 'Personal links and QR code', icon('right', 14)));
  } else {
    shareBox = h('section.card.minicard',
      h('header.card__head', h('h2.card__title', 'Not published yet')),
      h('p.muted', 'Only you can see the invitation for now. When it looks right, publish it and share the link.'),
      h('a.link', { href: `#/i/${ctx.slug}/send` }, 'Go to Send invitation', icon('right', 14)));
  }
  return [hero, h('div.homegrid', checklist, h('div.stack', shareBox, repliesCard))];
}
