// Step 6 "Preview & publish" and the share tools (also used from the home screen).
import { h, icon, clear, copyText, openDialog, confirmDialog, toast, fmtDate } from './dom.js';
import { api } from './api.js';

const label = (v, f = '') => (v && (v.en || v.ne)) || f;

/** The guest link for an invitation (production has a short /i/<slug> that follows theme changes). */
export function shareUrl(meta, slug, theme, extra = {}) {
  const base = meta.publicOrigin || location.origin;
  const u = new URL(meta.shortLinks ? `${base}/i/${slug}` : `${base}/${theme}/?id=${slug}`);
  for (const [k, v] of Object.entries(extra)) if (v) u.searchParams.set(k, v);
  return u.href;
}

const whatsapp = (text) => `https://wa.me/?text=${encodeURIComponent(text)}`;
const invitationLine = (names, url, to) => `${to ? `Dear ${to}, ` : ''}you are warmly invited to the wedding of ${names}. Please open your invitation: ${url}`;

/** Link row: the link, Copy, WhatsApp, Open. */
function linkRow(getUrl, getMessage, { primary = false } = {}) {
  const field = h('input.input.linkrow__field', { type: 'text', readonly: true, value: getUrl(), 'aria-label': 'Invitation link', onfocus: (e) => e.target.select() });
  const wa = h('a.btn', { href: whatsapp(getMessage()), target: '_blank', rel: 'noopener' }, icon('send', 16), 'WhatsApp');
  const row = h('div.linkrow',
    field,
    h('div.linkrow__actions',
      h('button.btn', { type: 'button', class: primary ? 'btn--primary' : '', onclick: () => copyText(field.value) }, icon('copy', 16), 'Copy link'),
      wa,
      h('a.btn.btn--icon', { href: getUrl(), target: '_blank', rel: 'noopener', 'aria-label': 'Open the invitation', title: 'Open the invitation' }, icon('external')),
    ),
  );
  row.refresh = () => { field.value = getUrl(); wa.href = whatsapp(getMessage()); row.querySelector('a.btn--icon').href = getUrl(); };
  return row;
}

/** Share tools: main link + personal guest link. */
export function shareTools({ meta, slug, theme, names, events = [], live = true }) {
  const nameIn = h('input.input', { type: 'text', id: `to-${slug}`, maxlength: 60, placeholder: 'e.g. Maiju & family', autocomplete: 'off' });
  const picks = events.map((e) => h('input', { type: 'checkbox', value: e.id, checked: true }));
  const extra = () => {
    const chosen = picks.filter((p) => p.checked).map((p) => p.value);
    return { to: nameIn.value.trim(), e: chosen.length && chosen.length < events.length ? chosen.join(',') : '' };
  };
  const personal = linkRow(() => shareUrl(meta, slug, theme, extra()), () => invitationLine(names, shareUrl(meta, slug, theme, extra()), nameIn.value.trim()));
  nameIn.addEventListener('input', personal.refresh);
  picks.forEach((p) => p.addEventListener('change', personal.refresh));
  return h('div.share',
    live ? null : h('p.notice', 'Not published yet: guests who open the link will see “not found” until you publish.'),
    h('div.share__block',
      h('h3.share__title', 'Link for everyone'),
      linkRow(() => shareUrl(meta, slug, theme), () => invitationLine(names, shareUrl(meta, slug, theme)), { primary: true })),
    h('div.share__block',
      h('h3.share__title', 'Personal link for one guest'),
      h('p.card__help', 'Greets them by name, and can show only the ceremonies they are invited to.'),
      h('div.field', h('label.label', { for: nameIn.id }, 'Guest’s name'), nameIn),
      events.length > 1 ? h('fieldset.field', h('legend.label', 'Ceremonies to show'),
        h('div.chips', events.map((e, i) => h('label.chip', picks[i], h('span', label(e.title, e.id)))))) : null,
      personal),
  );
}

export function shareDialog(args) {
  openDialog({ title: `Share ${args.names}’s invitation`, body: shareTools(args), wide: true });
}

/** Phone + desktop previews, publish controls and sharing. */
export function publishStep(ctx) {
  const m = ctx.m;
  const url = () => `/${m.data.theme}/?id=${encodeURIComponent(ctx.slug)}&studio=${Date.now()}`;
  const frame = (w, hgt, kind) => {
    const iframe = h('iframe.pv__frame', { title: `${kind} preview of the invitation`, src: url(), loading: 'lazy' });
    const dev = h('div.pv__device', { class: `pv__device--${kind}`, style: { width: `${w}px`, height: `${hgt}px` } }, iframe);
    const stage = h('div.pv__stage', { class: `pv__stage--${kind}` }, dev);
    const fit = () => {
      const r = stage.getBoundingClientRect();
      if (!r.width) return;
      const pad = kind === 'phone' ? 28 : 8; // room for the phone's bezel
      const s = Math.min((r.width - pad) / w, (r.height - pad) / hgt, 1);
      dev.style.transform = `translate(-50%, -50%) scale(${s})`;
    };
    new ResizeObserver(fit).observe(stage);
    return { stage, iframe };
  };
  const phone = frame(390, 844, 'phone');
  const desk = frame(1440, 900, 'desktop');
  const reload = () => { phone.iframe.src = url(); desk.iframe.src = url(); };

  const status = h('div.pub');
  const drawStatus = () => {
    const d = ctx.doc;
    const live = d.status === 'published';
    clear(status).append(
      h('div.pub__state',
        h('span.pill', { class: live ? (d.changed ? 'pill--warn' : 'pill--ok') : 'pill--muted' }, live ? (d.changed ? 'Live · new changes not published yet' : 'Live') : 'Not published yet'),
        h('p.card__help', live ? (d.changed ? 'Guests still see the earlier version. Publish to show your latest changes.' : 'Guests see exactly what is in the preview.') : 'Only you can see it. Publish when it looks right.'),
      ),
      h('div.pub__actions',
        live && !d.changed
          ? h('button.btn.btn--done.btn--lg', { type: 'button', disabled: true }, icon('check', 18), 'Published')
          : h('button.btn.btn--primary.btn--lg', { type: 'button', onclick: async () => { await ctx.publish(); drawStatus(); drawShare(); } }, live ? 'Publish changes' : 'Publish'),
        live && ctx.isAdmin ? h('button.link', { type: 'button', onclick: async () => { await ctx.unpublish(); drawStatus(); drawShare(); } }, 'Unpublish') : null,
      ),
    );
  };
  const shareBox = h('div');
  const drawShare = () => clear(shareBox).append(shareTools({
    meta: ctx.meta, slug: ctx.slug, theme: m.data.theme, names: ctx.names(), events: m.data.events || [], live: ctx.doc.status === 'published',
  }));
  drawStatus();
  drawShare();
  ctx.onSaved = () => { drawStatus(); };

  return [
    h('section.card.card--flush',
      status,
      h('div.pv',
        h('figure.pv__col.pv__col--phone', phone.stage, h('figcaption', 'Phone')),
        h('figure.pv__col.pv__col--desktop', desk.stage, h('figcaption', 'Computer')),
      ),
      h('div.pv__bar', h('button.btn.btn--sm', { type: 'button', onclick: reload }, icon('refresh', 16), 'Refresh previews'),
        h('a.btn.btn--sm', { href: `/${m.data.theme}/?id=${encodeURIComponent(ctx.slug)}`, target: '_blank', rel: 'noopener' }, icon('external', 16), 'Open full size')),
    ),
    h('section.card', h('h2.card__title', 'Share'), shareBox),
    ctx.isAdmin ? coupleLinkCard(ctx) : null,
    !ctx.isAdmin ? null : h('section.card.card--quiet',
      h('h2.card__title', 'Delete this invitation'),
      h('p.card__help', 'Removes the invitation, its photos and replies. The link stops working.'),
      h('button.btn.btn--danger-ghost', { type: 'button', onclick: ctx.remove }, icon('trash', 16), 'Delete invitation')),
  ];
}

/** Planner only: a private link that lets the couple edit this one invitation and see its replies. */
function coupleLinkCard(ctx) {
  const box = h('section.card');
  const url = (token) => `${location.origin}/studio/#/c/${token}`;
  const draw = (fresh) => {
    const link = ctx.doc.clientLink;
    clear(box).append(
      h('h2.card__title', 'Couple’s editing link'),
      h('p.card__help', 'A private link for the couple: they can change their photos and words and see replies, for this invitation only.'),
    );
    if (fresh) {
      const field = h('input.input.linkrow__field', { type: 'text', readonly: true, value: url(fresh), 'aria-label': 'Couple’s editing link', onfocus: (e) => e.target.select() });
      box.append(
        h('div.linkrow', field, h('div.linkrow__actions',
          h('button.btn.btn--primary', { type: 'button', onclick: () => copyText(field.value) }, icon('copy', 16), 'Copy link'),
          h('a.btn', { href: `https://wa.me/?text=${encodeURIComponent(`Here is your private link to edit your wedding invitation: ${url(fresh)}`)}`, target: '_blank', rel: 'noopener' }, icon('send', 16), 'WhatsApp'))),
        h('p.notice', 'Copy it now. For safety it is shown only once; you can always make a new one.'),
      );
    } else if (link) {
      box.append(h('p', `A link is active (made ${fmtDate(link.createdAt)}).`));
    }
    box.append(h('div.linkrow__actions',
      h('button.btn', { type: 'button', onclick: make }, icon('link', 16), link ? 'Make a new link' : 'Make a link'),
      link ? h('button.btn.btn--quiet', { type: 'button', onclick: off }, 'Turn the link off') : null,
    ));
  };
  async function make() {
    if (ctx.doc.clientLink && !(await confirmDialog({ title: 'Make a new link?', message: 'The old link will stop working straight away.', confirm: 'Make a new link' }))) return;
    try {
      const out = await api(`/invitations/${ctx.slug}/client-link`, { method: 'POST' });
      ctx.doc.clientLink = { createdAt: out.createdAt };
      draw(out.token);
    } catch (err) { toast(err.message, 'error'); }
  }
  async function off() {
    if (!(await confirmDialog({ title: 'Turn the couple’s link off?', message: 'Anyone using it will be signed out straight away.', confirm: 'Turn off', danger: true }))) return;
    try {
      await api(`/invitations/${ctx.slug}/client-link`, { method: 'DELETE' });
      ctx.doc.clientLink = null;
      draw();
      toast('Link turned off', 'success');
    } catch (err) { toast(err.message, 'error'); }
  }
  draw();
  return box;
}
