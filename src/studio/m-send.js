// Send invitation: publish (with a pre-check), the share link and personal links, share buttons,
// the link-preview card guests see in WhatsApp, and a QR code.
import { h, icon, clear, card, copyText, confirmDialog, toast, fill } from './dom.js';
import { textField } from './fields.js';
import { photoUrl } from '../photos.js';
import { pickPhoto } from './m-photos.js';
import { qrSvg, qrPng } from './qr.js';
import { label } from './session.js';
import { linkUrl, linkRow, resetPasswordDialog } from './admin-access.js';
import { shareMessage, religionOf, TITLE } from '../core/faith.js';

/** The guest link (production has a short /i/<slug> that follows theme changes and carries the preview card). */
export function shareUrl(meta, slug, theme, extra = {}) {
  const base = meta.publicOrigin || location.origin;
  const u = new URL(meta.shortLinks ? `${base}/i/${slug}` : `${base}/${theme}/?id=${slug}`);
  for (const [k, v] of Object.entries(extra)) if (v) u.searchParams.set(k, v);
  return u.href;
}

export const refUrl = (ref, size = 'sm') => {
  if (!ref) return '';
  if (typeof ref === 'object') return photoUrl(ref, size);
  if (/^(\/|https:\/\/)/.test(ref)) return ref;
  if (/[./]/.test(ref)) return `/${ref}`;
  return photoUrl(ref, size);
};

/** The WhatsApp / Viber text, in the couple's community's words (Namaste, Assalamu Alaikum, Greetings). */
const message = (religion, names, url, to) => shareMessage(religion, { names, url, to });
// A personal link's version of the religious symbols (?v=, applied by src/core/data.js; the server's /i/ keeps it).
const VERSION_OPTIONS = [['', 'Same as the invitation'], ['neutral', 'Neutral: no religious symbol'], ['hindu', 'Hindu: Ganesh'], ['muslim', 'Muslim: Bismillah and a crescent'], ['christian', 'Christian: a verse and a cross']];

export function shareButtons(getUrl, getText) {
  const enc = encodeURIComponent;
  const a = (cls, ic, text, href) => h('a.sharebtn', { class: cls, href, target: '_blank', rel: 'noopener' }, icon(ic, 17), h('span', text));
  const wa = a('sharebtn--wa', 'chat', 'WhatsApp', '#');
  const vb = a('sharebtn--vb', 'call', 'Viber', '#');
  const ms = a('sharebtn--ms', 'send', 'Messenger', '#');
  const row = h('div.sharebtns',
    h('button.sharebtn.sharebtn--copy', { type: 'button', onclick: () => copyText(getUrl()) }, icon('copy', 17), h('span', 'Copy link')),
    wa, vb, ms,
    navigator.share ? h('button.sharebtn', { type: 'button', onclick: () => navigator.share({ text: getText(), url: getUrl() }).catch(() => {}) }, icon('share', 17), h('span', 'More')) : null);
  row.refresh = () => {
    wa.href = `https://wa.me/?text=${enc(getText())}`;
    vb.href = `viber://forward?text=${enc(getText())}`;
    ms.href = `fb-messenger://share/?link=${enc(getUrl())}`;
  };
  row.refresh();
  return row;
}

function checks(ctx) {
  const d = ctx.m.data;
  const ev = d.events || [];
  const pics = d.couple?.portraits || [];
  const ownPhoto = pics.some((p) => p.photo && typeof p.photo === 'object');
  return [
    { ok: Boolean(label(d.couple?.bride?.name) && label(d.couple?.groom?.name)), need: true, text: 'Both first names', go: 'couple' },
    { ok: Boolean(d.weddingDate), need: true, text: 'The wedding date', go: 'dates' },
    { ok: ev.length > 0 && ev.every((e) => e.start && label(e.venue)), text: ev.length ? 'Every ceremony has a date and a place' : 'At least one ceremony', go: 'dates' },
    { ok: ownPhoto, text: ownPhoto || !pics.length ? 'A photo of the two of you' : 'Your own photo of the two of you (the ones there now are samples)', go: 'photos' },
    { ok: Boolean(d.share?.title), text: 'A title for the link preview', go: 'send' },
  ];
}

function publishCard(ctx) {
  const box = h('section.card.pubcard');
  const draw = () => {
    const doc = ctx.session.doc;
    const live = doc.status === 'published';
    const list = checks(ctx);
    const blocked = list.some((c) => c.need && !c.ok);
    fill(box, 
      h('div.pubcard__state',
        h('span.pubcard__dot', { class: live ? (doc.changed ? 'is-warn' : 'is-live') : '' }),
        h('div',
          h('h2.card__title', live ? (doc.changed ? 'Live, with new changes to publish' : 'Your invitation is live') : 'Not published yet'),
          h('p.card__help', live ? (doc.changed ? 'Guests still see the earlier version. Publish to show your latest changes.' : 'Guests see exactly what is in the preview.') : 'Only you can see it. Publish when it looks right; you can keep editing after.'))),
      h('ul.checks', list.map((c) => h('li.check-item', { class: c.ok ? 'is-ok' : c.need ? 'is-need' : 'is-tip' },
        h('span.check-item__icon', icon(c.ok ? 'check' : c.need ? 'alert' : 'info', 14)),
        h('span.check-item__text', c.text, !c.ok && !c.need ? h('small', ' · recommended') : null),
        !c.ok && c.go !== 'send' ? h('a.link', { href: `#/i/${ctx.slug}/${c.go}` }, 'Add') : null))),
      h('div.pubcard__acts',
        live && !doc.changed
          ? h('span.pill.pill--ok.pill--lg', icon('check', 14), 'Published')
          : h('button.btn.btn--primary.btn--lg', { type: 'button', disabled: blocked, onclick: async (e) => { e.currentTarget.disabled = true; await ctx.session.publish(); draw(); } }, icon('send', 17), live ? 'Publish changes' : 'Publish the invitation'),
        blocked ? h('span.hint', 'Add the marked items first.') : null,
        live && ctx.isAdmin ? h('button.btn.btn--quiet', { type: 'button', onclick: async () => {
          if (!(await confirmDialog({ title: 'Take the invitation offline?', message: 'Guests opening the link will see “not found” until you publish again. Replies are kept.', confirm: 'Unpublish', danger: true }))) return;
          await ctx.session.unpublish(); draw();
        } }, 'Unpublish') : null));
  };
  draw();
  ctx.on('status', draw);
  ctx.on('saved', draw);
  return box;
}

function linksCard(ctx) {
  const m = ctx.m;
  const url = (extra) => shareUrl(ctx.meta, ctx.slug, m.data.theme, extra);
  const main = h('input.input.linkfield', { type: 'text', readonly: true, value: url(), 'aria-label': 'Invitation link', onfocus: (e) => e.target.select() });
  const rel = () => religionOf(m.data);
  const mainBtns = shareButtons(() => url(), () => message(rel(), ctx.session.names(), url()));

  const nameIn = h('input.input', { id: 'to-name', maxlength: 60, placeholder: 'e.g. Maiju & family', autocomplete: 'off' });
  const events = m.data.events || [];
  const picks = events.map((e) => h('input', { type: 'checkbox', value: e.id, checked: true }));
  const version = h('select.input', { id: 'to-version' }, VERSION_OPTIONS.map(([v, t]) => h('option', { value: v }, t)));
  const extra = () => {
    const chosen = picks.filter((p) => p.checked).map((p) => p.value);
    return { to: nameIn.value.trim(), e: chosen.length && chosen.length < events.length ? chosen.join(',') : '', v: version.value };
  };
  const personal = h('input.input.linkfield', { type: 'text', readonly: true, value: url(extra()), 'aria-label': 'Personal link', onfocus: (e) => e.target.select() });
  // the greeting follows the guest's version when one is chosen (a Muslim guest gets "Assalamu Alaikum")
  const persBtns = shareButtons(() => url(extra()), () => message(version.value && version.value !== 'neutral' ? version.value : rel(), ctx.session.names(), url(extra()), nameIn.value.trim()));
  const refresh = () => { personal.value = url(extra()); persBtns.refresh(); };
  nameIn.addEventListener('input', refresh);
  picks.forEach((p) => p.addEventListener('change', refresh));
  version.addEventListener('change', refresh);

  const notLive = h('p.notice', icon('info', 16), h('span', 'Publish first: until then, guests who open the link see “not found”.'));
  const drawLive = () => { notLive.hidden = ctx.session.doc.status === 'published'; };
  drawLive();
  ctx.on('status', drawLive);
  return card('Share the link', null,
    notLive,
    h('div.linkblock', h('h3.subhead', 'One link for everyone'), main, mainBtns),
    h('div.linkblock',
      h('h3.subhead', 'A personal link for one guest'),
      h('p.hint', 'Greets them by name at the top of the invitation, and can show only the ceremonies they are invited to.'),
      h('div.field', h('label.label', { for: 'to-name' }, 'Guest’s name'), nameIn),
      events.length > 1 ? h('fieldset.field', h('legend.label', 'Ceremonies to show'), h('div.chips', events.map((e, i) => h('label.chip', picks[i], h('span', label(e.title, e.id)))))) : null,
      h('div.field.field--narrow3', h('label.label', { for: 'to-version' }, 'Religious symbols'), version,
        h('p.hint', 'For families of another faith: this guest’s invitation shows only these symbols and opening words. Everything else stays the same.')),
      personal, persBtns));
}

function shareCardEditor(ctx) {
  const m = ctx.m;
  if (!m.get(['share'])) m.data.share = { title: '', description: '', image: '' };
  const img = () => m.get(['share', 'image']) || m.get(['couple', 'portraits'])?.find((p) => p.photo)?.photo || null;
  const host = (() => { try { return new URL(ctx.meta.publicOrigin || location.origin).host; } catch { return location.host; } })();
  const pImg = h('div.wa__img');
  const pTitle = h('p.wa__title');
  const pDesc = h('p.wa__desc');
  const drawPreview = () => {
    const r = img();
    fill(pImg, r ? h('img', { src: refUrl(r, 'sm'), alt: '' }) : h('span.wa__noimg', icon('image', 22)));
    pTitle.textContent = m.get(['share', 'title']) || `${ctx.session.names()} · Wedding invitation`;
    pDesc.textContent = m.get(['share', 'description']) || 'You are warmly invited.';
  };
  drawPreview();
  ctx.on('edit', ({ path }) => { if (path[0] === 'share' || path[0] === 'couple') drawPreview(); });
  const imgBtns = h('div.row',
    h('button.btn', { type: 'button', onclick: async () => { const p = await pickPhoto(ctx, { title: 'Picture for the link preview', current: m.get(['share', 'image']) }); if (p) { m.set(['share', 'image'], p); drawPreview(); drawImgBtns(); } } }, icon('image', 16), 'Choose the picture'));
  const drawImgBtns = () => {
    imgBtns.querySelector('.link')?.remove();
    if (m.get(['share', 'image'])) imgBtns.append(h('button.link', { type: 'button', onclick: () => { m.set(['share', 'image'], ''); drawPreview(); drawImgBtns(); } }, 'Use the main couple photo'));
  };
  drawImgBtns();
  return card('How the link looks when shared', 'This is the preview card guests see in WhatsApp, Viber and Messenger before they open the link.',
    h('div.sharecard',
      h('div.sharecard__form',
        h('div.field', h('span.label', 'Picture'), imgBtns, h('p.hint', 'A landscape photo looks best. If you choose none, the main couple photo is used.')),
        textField(m, ['share', 'title'], { label: 'Title', max: 140, placeholder: `${ctx.session.names()} · ${TITLE[religionOf(m.data)].en}` }),
        textField(m, ['share', 'description'], { label: 'Short message', max: 300, multiline: true, rows: 3, placeholder: 'You are warmly invited to our wedding…' })),
      h('div.sharecard__preview',
        h('p.eyebrow', 'Preview'),
        h('div.wa', h('div.wa__bubble',
          h('div.wa__card', pImg, h('div.wa__text', pTitle, pDesc, h('p.wa__host', host))),
          h('p.wa__link', shareUrl(ctx.meta, ctx.slug, m.data.theme)),
          h('span.wa__time', '10:24'))),
        h('p.hint', 'Apps may take a while to show a new picture for a link they have seen before.'))));
}

function qrCard(ctx) {
  const url = shareUrl(ctx.meta, ctx.slug, ctx.m.data.theme);
  const box = h('div.qr__code', { role: 'img', 'aria-label': 'QR code for the invitation link' });
  try { box.innerHTML = qrSvg(url); } catch { box.textContent = 'The link is too long for a QR code.'; } // generated SVG, no user markup
  return card('QR code', 'For printed cards and the welcome board: guests scan it to open the invitation.',
    h('div.qr', box, h('div.qr__side',
      h('p.qr__url', url),
      h('a.btn', { href: '#', download: `invitation-${ctx.slug}-qr.png`, onclick: (e) => { try { e.currentTarget.href = qrPng(url); } catch { e.preventDefault(); toast('Could not make the image.', 'error'); } } }, icon('download', 16), 'Download PNG'))));
}

/** Planner only: the couple's private studio link, to copy again any time, and a password reset. */
function coupleLinkCard(ctx) {
  const doc = ctx.session.doc;
  const box = h('div.stack');
  const draw = (note = false) => {
    const l = doc.clientLink;
    const url = linkUrl(l);
    fill(box,
      url ? linkRow(url) : h('p.notice', icon('info', 16), h('span', 'This link was created before links could be shown again. Create a new link in Admin tools › Client access to see it here.')),
      h('div.row', h('button.btn', { type: 'button', onclick: async () => {
        const out = await resetPasswordDialog(ctx.slug, l.hasPassword);
        if (out) { doc.clientLink = out; draw(true); }
      } }, icon('key', 15), l.hasPassword ? 'Reset password' : 'Set password')),
      note ? h('p.notice', { role: 'status' }, icon('check', 16), h('span', 'Password changed. Send the new password to the couple.')) : null);
  };
  draw();
  return card('Separate link (optional)', 'A private link to this studio with its own password, for a couple without an account. Send the password separately.', box);
}

export function sendModule(ctx) {
  const couple = ctx.isAdmin && ctx.session.doc.clientLink ? coupleLinkCard(ctx) : null;
  return [publishCard(ctx), linksCard(ctx), couple, shareCardEditor(ctx), qrCard(ctx)].filter(Boolean);
}
