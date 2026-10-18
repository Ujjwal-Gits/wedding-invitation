// Guest links (server/lib/guest-links.js): one link per group of ceremonies, so some guests are invited only to
// some functions. The full-invitation link is listed first; each guest link can be copied, sent on WhatsApp, shown
// as a QR code, renamed, given other ceremonies, or deleted (it stops working at once). Published invitations only.
import { h, icon, iconBtn, card, copyText, confirmDialog, toast, fill, openDialog, skeleton } from './dom.js';
import { api } from './api.js';
import { qrSvg, qrPng } from './qr.js';
import { label } from './session.js';

const enc = encodeURIComponent;

/** "Haldi · Mehendi" for a link's ceremonies, in the invitation's order. */
const eventsText = (ids, events) => events.filter((e) => ids.includes(e.id)).map((e) => label(e.title, e.id)).join(' · ');

function qrDialog(url, name, slug) {
  const box = h('div.qr__code', { role: 'img', 'aria-label': `QR code for ${name}` });
  try { box.innerHTML = qrSvg(url); } catch { box.textContent = 'The link is too long for a QR code.'; } // generated SVG, no user markup
  const file = `invitation-${slug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'link'}-qr.png`;
  openDialog({
    title: name,
    body: h('div.qr', box, h('div.qr__side', h('p.qr__url', url),
      h('a.btn', { href: '#', download: file, onclick: (e) => { try { e.currentTarget.href = qrPng(url); } catch { e.preventDefault(); toast('Could not make the image.', 'error'); } } }, icon('download', 16), 'Download PNG'))),
  });
}

/** The name + ceremonies form, in a dialog. Resolves { name, events } or null. */
function linkForm({ title, confirm, events, link = null }) {
  return new Promise((resolve) => {
    let result = null;
    const nameId = `gl-name-${Math.random().toString(36).slice(2, 7)}`;
    const nameIn = h('input.input', { id: nameId, maxlength: 60, placeholder: 'e.g. Haldi guests', autocomplete: 'off', value: link?.name || '' });
    const picks = events.map((e) => h('input', { type: 'checkbox', value: e.id, checked: link ? link.events.includes(e.id) : false }));
    const err = h('p.notice.notice--error', { hidden: true, role: 'alert' });
    const submit = (ev) => {
      ev.preventDefault();
      const name = nameIn.value.trim();
      const chosen = picks.filter((p) => p.checked).map((p) => p.value);
      const problem = !name ? 'Give the link a name, so you know who it is for.' : !chosen.length ? 'Choose at least one ceremony.' : '';
      if (problem) { fill(err, icon('alert', 16), h('span', problem)); err.hidden = false; (name ? picks[0] : nameIn)?.focus(); return; }
      result = { name, events: chosen };
      d.close();
    };
    const form = h('form.stack', { onsubmit: submit, id: `${nameId}-f` },
      h('div.field', h('label.label', { for: nameId }, 'Name (only you see it)'), nameIn),
      h('fieldset.field', h('legend.label', 'Ceremonies this link shows'),
        h('div.chips', events.map((e, i) => h('label.chip', picks[i], h('span', label(e.title, e.id))))),
        h('p.hint', 'Guests with this link see only these ceremonies, and can reply only for them.')),
      err);
    const d = openDialog({
      title,
      body: form,
      actions: [
        h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'),
        h('button.btn.btn--primary', { type: 'submit', form: form.id }, confirm),
      ],
      onClose: () => resolve(result),
    });
    setTimeout(() => nameIn.focus(), 0);
  });
}

/**
 * The "Guest links" card of the Send module. `urlFor(g)` is the guest link ('' = the full one); `textFor(url)` the
 * WhatsApp message. Hidden while the invitation has a single ceremony (nothing to split).
 */
export function guestLinksCard(ctx, { urlFor, textFor }) {
  const body = h('div.stack', skeleton(3));
  const box = card('Guest links', 'Invite some guests only to some ceremonies. Each link shows only the ceremonies you choose; the full link shows everything.', body);
  let state = null;

  const load = async () => {
    try {
      state = await api(`/invitations/${enc(ctx.slug)}/guest-links`);
      draw();
    } catch (err) {
      fill(body, h('p.notice.notice--error', icon('alert', 16), h('span', err.message)), h('div.row', h('button.btn', { type: 'button', onclick: load }, icon('refresh', 16), 'Try again')));
    }
  };

  const actions = (url, name) => [
    h('button.btn.btn--sm', { type: 'button', onclick: () => copyText(url) }, icon('copy', 15), 'Copy'),
    h('a.btn.btn--sm.glink__wa', { href: `https://wa.me/?text=${enc(textFor(url))}`, target: '_blank', rel: 'noopener' }, icon('chat', 15), 'WhatsApp'),
    iconBtn('qr', `QR code for ${name}`, () => qrDialog(url, name, ctx.slug), 'btn--sm btn--icon-sm')];

  const create = async () => {
    const v = await linkForm({ title: 'New guest link', confirm: 'Create link', events: state.events });
    if (!v) return;
    try {
      const { link } = await api(`/invitations/${enc(ctx.slug)}/guest-links`, { method: 'POST', body: v });
      state.links.push(link);
      draw();
      toast('Guest link created', 'success');
    } catch (err) { toast(err.message, 'error'); }
  };

  const edit = async (l) => {
    const v = await linkForm({ title: 'Edit guest link', confirm: 'Save', events: state.events, link: l });
    if (!v) return;
    try {
      const { link } = await api(`/invitations/${enc(ctx.slug)}/guest-links/${enc(l.id)}`, { method: 'PATCH', body: v });
      Object.assign(l, link);
      draw();
      toast('Guest link saved', 'success');
    } catch (err) { toast(err.message, 'error'); }
  };

  const remove = async (l) => {
    if (!(await confirmDialog({ title: `Delete “${l.name}”?`, message: 'Guests who open this link will see “This link is no longer active”. Replies already sent through it are kept.', confirm: 'Delete link', danger: true }))) return;
    try {
      await api(`/invitations/${enc(ctx.slug)}/guest-links/${enc(l.id)}`, { method: 'DELETE' });
      state.links = state.links.filter((x) => x !== l);
      draw();
      toast('Guest link deleted', 'success');
    } catch (err) { toast(err.message, 'error'); }
  };

  const draw = () => {
    const live = ctx.session.doc.status === 'published' && state.live;
    if (!live) {
      box.hidden = false;
      fill(body, h('p.notice', icon('info', 16), h('span', 'Guest links work after you publish. Publish the invitation, then make a link for each group of guests (for example, one for the Haldi only).')));
      return;
    }
    const events = state.events;
    box.hidden = events.length < 2; // one ceremony: nothing to split
    const full = urlFor('');
    const rows = [
      h('li.glink.glink--full',
        h('div.glink__main', h('b.glink__name', 'Full invitation'), h('span.glink__events', 'Every ceremony'), h('span.glink__url', full)),
        h('div.glink__acts', actions(full, 'Full invitation'))),
      ...state.links.map((l) => {
        const url = urlFor(l.id);
        const shown = eventsText(l.events, events);
        return h('li.glink',
          h('div.glink__main', h('b.glink__name', l.name), h('span.glink__events', shown || 'No ceremonies left: this link shows “no longer active”'), h('span.glink__url', url)),
          h('div.glink__acts',
            actions(url, l.name),
            iconBtn('edit', `Edit ${l.name}`, () => edit(l), 'btn--sm btn--icon-sm'),
            iconBtn('trash', `Delete ${l.name}`, () => remove(l), 'btn--sm btn--icon-sm')));
      }),
    ];
    const full20 = state.links.length >= state.max;
    fill(body,
      h('ul.glinks', rows),
      h('div.row',
        h('button.btn', { type: 'button', disabled: full20, onclick: create }, icon('plus', 16), 'New guest link'),
        h('span.hint', full20 ? `That is the most (${state.max}). Delete a link you no longer use to make another.` : `${state.links.length} of ${state.max} guest links`)));
  };

  ctx.on('status', () => { if (state) load(); });
  load();
  return box;
}
