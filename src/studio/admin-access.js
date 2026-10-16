// Clients & access: the couple's private link with a password set by the owner, which designs they
// may choose from, and whether they may change the design or the colours.
import { h, icon, clear, toast, copyText, confirmDialog, openDialog, fmtDate, toggle, fill } from './dom.js';
import { api } from './api.js';

const genPassword = () => {
  const words = ['marigold', 'lotus', 'saffron', 'diyo', 'tika', 'mala', 'kalash', 'shehnai', 'sindoor', 'mehendi', 'gurans', 'himal'];
  const a = new Uint32Array(3);
  crypto.getRandomValues(a);
  return `${words[a[0] % words.length]}-${words[a[1] % words.length]}-${1000 + (a[2] % 9000)}`;
};

/** Theme chooser: All, or a multi-select of thumbnails. */
export function themePicker(meta, value, onChange, current) {
  let mode = value === 'all' || !Array.isArray(value) ? 'all' : 'some';
  let chosen = new Set(Array.isArray(value) ? value : []);
  const ready = meta.themes.filter((t) => t.ready !== false);
  const grid = h('ul.mthemes');
  const count = h('span.hint');
  const drawGrid = () => {
    grid.hidden = mode === 'all';
    const cur = ready.find((t) => t.slug === current);
    count.textContent = mode === 'all' ? `All ${ready.length} designs` : `${chosen.size} chosen${cur && !chosen.has(cur.slug) ? ` · their current design, ${cur.name}, stays available` : ''}`;
    fill(grid, ...ready.map((t) => h('li', h('label.mtheme', { class: chosen.has(t.slug) ? 'is-on' : '' },
      h('input', { type: 'checkbox', checked: chosen.has(t.slug), onchange: (e) => { if (e.target.checked) chosen.add(t.slug); else chosen.delete(t.slug); onChange([...chosen]); drawGrid(); } }),
      h('span.mtheme__img', t.thumb ? h('img', { src: t.thumb, alt: '', loading: 'lazy' }) : h('span.thumb-ph', t.name)),
      h('span.mtheme__name', t.name, t.slug === current ? h('small.mtheme__cur', 'Current') : null)))));
  };
  const name = `tp-${Math.random().toString(36).slice(2, 7)}`;
  const radio = (v, text) => h('label.radio', h('input', { type: 'radio', name, value: v, checked: mode === v, onchange: () => { mode = v; onChange(v === 'all' ? 'all' : [...chosen]); drawGrid(); } }), h('span', text));
  drawGrid();
  return h('fieldset.field', h('legend.label', 'Designs they can see and choose'), h('div.row', radio('all', 'All designs'), radio('some', 'Only these'), count), grid);
}

/** The couple's link as a full URL (the server may send it relative when no public origin is set). */
export const linkUrl = (l) => (l?.url ? new URL(l.url, location.origin).href : '');

/** The link in a read-only field with a Copy button. */
export const linkRow = (url, label = 'The couple’s link') => h('div.inputrow',
  h('input.input.linkfield', { type: 'text', readonly: true, value: url, 'aria-label': label, onfocus: (e) => e.target.select() }),
  h('button.btn.btn--primary', { type: 'button', onclick: () => copyText(url) }, icon('copy', 15), 'Copy link'));

/**
 * "Reset password": one new password for the same link. The couple's sessions end; they open the same URL
 * with the new password once. Resolves to the new clientLink, or null when cancelled.
 */
export function resetPasswordDialog(slug, hasPassword = true) {
  return new Promise((resolve) => {
    let result = null;
    const input = h('input.input', { id: `rpw-${slug}`, type: 'password', minlength: 6, maxlength: 128, autocomplete: 'new-password', spellcheck: 'false', placeholder: 'At least 6 characters' });
    const eye = h('button.pwfield__eye', { type: 'button', 'aria-label': 'Show the password', title: 'Show', onclick: () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      eye.setAttribute('aria-label', show ? 'Hide the password' : 'Show the password');
      eye.classList.toggle('is-on', show);
      input.focus();
    } }, icon('eye', 18));
    const err = h('p.form-error', { role: 'alert' });
    input.addEventListener('input', () => { err.textContent = ''; });
    const save = h('button.btn.btn--primary', { type: 'submit', form: `rpf-${slug}` }, 'Save');
    const form = h('form.stack', { id: `rpf-${slug}`, novalidate: true },
      h('div.field', h('label.label', { for: input.id }, 'New password'), h('div.pwfield', input, eye),
        h('p.hint', 'The link stays the same. The couple is signed out and opens it once with this password.')), err);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      const p = input.value.trim();
      if (p.length < 6) { err.textContent = 'The password needs at least 6 characters.'; input.focus(); return; }
      if (p.length > 128) { err.textContent = 'The password can be at most 128 characters.'; input.focus(); return; }
      save.disabled = true;
      try {
        const out = await api(`/invitations/${slug}/access`, { method: 'PATCH', body: { password: p } });
        result = out.clientLink;
        d.close();
      } catch (ex) { err.textContent = ex.message; save.disabled = false; }
    });
    const d = openDialog({
      title: hasPassword ? 'Reset password' : 'Set a password',
      body: form,
      actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), save],
      onClose: () => resolve(result),
    });
    input.focus();
  });
}

/**
 * The access panel for one invitation.
 * clientLink = { createdAt, hasPassword, url | null, themes, canChangeTheme, canChangeColors } | null.
 */
export function accessPanel({ slug, names, meta, clientLink, theme, onChange = () => {} }) {
  const root = h('div.access');
  let link = clientLink || null;

  const permsForm = (state) => h('div.stack',
    themePicker(meta, state.themes, (v) => { state.themes = v; }, theme),
    toggle({ label: 'Can choose the gate, first screen and design', hint: 'Off: they see the opening you chose, with a note to ask you.', checked: state.canChangeTheme, onChange: (v) => { state.canChangeTheme = v; } }),
    toggle({ label: 'Can change colours', hint: 'The opening’s main colours, with a reset to the original.', checked: state.canChangeColors, onChange: (v) => { state.canChangeColors = v; } }));

  const pwField = (id) => {
    const input = h('input.input', { id, type: 'text', minlength: 6, maxlength: 128, autocomplete: 'new-password', spellcheck: 'false', placeholder: 'At least 6 characters' });
    return { input, el: h('div.field', h('label.label', { for: id }, 'Password for the couple'),
      h('div.inputrow', input, h('button.btn', { type: 'button', onclick: () => { input.value = genPassword(); input.focus(); } }, icon('wand', 15), 'Suggest one')),
      h('p.hint', 'You set it; they need it to open the link. Share it separately, never in the same message.')) };
  };

  function drawCreate(fromRegenerate = false) {
    const state = { themes: link?.themes ?? 'all', canChangeTheme: link?.canChangeTheme ?? true, canChangeColors: link?.canChangeColors ?? true };
    const pw = pwField(`pw-${slug}`);
    const err = h('p.form-error', { role: 'alert' });
    const btn = h('button.btn.btn--primary', { type: 'button', onclick: async () => {
      err.textContent = '';
      const password = pw.input.value.trim();
      if (password.length < 6) { err.textContent = 'The password needs at least 6 characters.'; pw.input.focus(); return; }
      if (state.themes !== 'all' && !state.themes.length) { err.textContent = 'Choose at least one design, or All designs.'; return; }
      btn.disabled = true;
      try {
        const out = await api(`/invitations/${slug}/client-link`, { method: 'POST', body: { password, ...state } });
        link = out.clientLink || { createdAt: out.createdAt, hasPassword: true, ...state };
        onChange(link);
        drawFresh(out.url || `${location.origin}/studio/#/c/${out.token}`, password);
      } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
    } }, icon('link', 16), fromRegenerate ? 'Make the new link' : 'Create the link');
    fill(root, 
      fromRegenerate ? h('p.notice.notice--warn', icon('alert', 16), h('span', 'The current link stops working as soon as you make a new one.')) : null,
      pw.el, permsForm(state), err,
      h('div.row', btn, fromRegenerate ? h('button.btn.btn--quiet', { type: 'button', onclick: () => drawActive() }, 'Cancel') : null));
  }

  function drawFresh(url, password) {
    const msg = `Here is the private link to your wedding invitation on Nimtto. I will send you the password separately.\n${url}`;
    fill(root, 
      h('div.fresh',
        h('p.fresh__title', icon('check', 16), 'Link ready. You can copy it again here any time.'),
        linkRow(url),
        h('div.row',
          h('a.sharebtn.sharebtn--wa', { href: `https://wa.me/?text=${encodeURIComponent(msg)}`, target: '_blank', rel: 'noopener' }, icon('chat', 17), h('span', 'Send the link on WhatsApp')),
          h('button.btn.btn--quiet', { type: 'button', onclick: () => copyText(password, 'Password copied') }, icon('key', 15), 'Copy the password')),
        h('p.notice', icon('lock', 16), h('span', h('b', 'Send the password separately: '), 'a phone call, an SMS, or a second message later. Never in the same message as the link.'))),
      h('div.row', h('button.btn', { type: 'button', onclick: () => drawActive() }, 'Done')));
  }

  function drawActive(pwChanged = false) {
    if (!link) { drawCreate(); return; }
    const state = { themes: link.themes ?? 'all', canChangeTheme: Boolean(link.canChangeTheme), canChangeColors: link.canChangeColors !== false };
    const err = h('p.form-error', { role: 'alert' });
    const save = h('button.btn.btn--primary', { type: 'button', onclick: async () => {
      err.textContent = '';
      if (state.themes !== 'all' && !state.themes.length) { err.textContent = 'Choose at least one design, or All designs.'; return; }
      save.disabled = true;
      try {
        const out = await api(`/invitations/${slug}/access`, { method: 'PATCH', body: state });
        link = out.clientLink || { ...link, ...state };
        onChange(link);
        toast('Access saved', 'success');
      } catch (ex) { err.textContent = ex.message; }
      save.disabled = false;
    } }, 'Save access');
    const resetBtn = h('button.btn', { type: 'button', onclick: async () => {
      const out = await resetPasswordDialog(slug, link.hasPassword);
      if (!out) return;
      link = out;
      onChange(link);
      drawActive(true);
    } }, icon('key', 15), link.hasPassword ? 'Reset password' : 'Set password');
    const url = linkUrl(link);
    const linkBox = url
      ? h('div.stack', linkRow(url), h('div.row', resetBtn))
      : h('div.stack',
        h('p.notice.notice--row', icon('info', 16), h('span', 'This link was created before links could be shown again. Create a new link to see it here.'),
          h('button.btn.btn--sm', { type: 'button', onclick: () => drawCreate(true) }, icon('refresh', 15), 'New link')),
        h('div.row', resetBtn));
    fill(root, 
      h('div.accstate',
        h('span.pill.pill--ok', icon('check', 13), `Active since ${fmtDate(link.createdAt)}`),
        link.hasPassword ? h('span.pill.pill--muted', icon('lock', 13), 'Password set') : h('span.pill.pill--warn', icon('alert', 13), 'No password yet')),
      !link.hasPassword ? h('p.notice.notice--warn', icon('alert', 16), h('span', 'This older link opens without a password. Set one to protect it.')) : null,
      linkBox,
      pwChanged ? h('p.notice', { role: 'status' }, icon('check', 16), h('span', 'Password changed. Send the new password to the couple.')) : null,
      permsForm(state), err, h('div.row', save),
      h('div.row.row--split',
        h('button.btn.btn--quiet', { type: 'button', onclick: () => drawCreate(true) }, icon('refresh', 15), 'Make a new link'),
        h('button.btn.btn--danger-ghost', { type: 'button', onclick: async () => {
          if (!(await confirmDialog({ title: 'Turn the couple’s link off?', message: `${names || 'The couple'} will be signed out straight away and the link stops working.`, confirm: 'Turn off', danger: true }))) return;
          try {
            await api(`/invitations/${slug}/client-link`, { method: 'DELETE' });
            link = null;
            onChange(null);
            toast('Link turned off', 'success');
            drawCreate();
          } catch (ex) { toast(ex.message, 'error'); }
        } }, icon('close', 15), 'Revoke the link')));
  }

  drawActive();
  return root;
}

const dotStatus = (tone, text) => h('span.st', { class: `st--${tone}` }, h('span.st__dot', { 'aria-hidden': 'true' }), h('span.st__t', text));
export const accessSummary = (l) => {
  if (!l) return dotStatus('none', 'No link');
  if (!l.hasPassword) return dotStatus('warn', 'No password');
  return dotStatus('ok', 'Active');
};

export const permsText = (l) => {
  if (!l) return '—';
  const t = l.themes === 'all' || !Array.isArray(l.themes) ? 'All designs' : `${l.themes.length} design${l.themes.length === 1 ? '' : 's'}`;
  return [t, l.canChangeTheme ? 'can switch design' : 'design fixed', l.canChangeColors ? 'colours' : 'no colours'].join(' · ');
};
