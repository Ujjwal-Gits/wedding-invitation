// Clients & access: the couple's private link with a password set by the owner, which designs they
// may choose from, and whether they may change the design or the colours.
import { h, icon, clear, toast, copyText, confirmDialog, fmtDate, toggle, fill } from './dom.js';
import { api } from './api.js';

const genPassword = () => {
  const words = ['marigold', 'lotus', 'saffron', 'diyo', 'tika', 'mala', 'kalash', 'shehnai', 'sindoor', 'mehendi', 'gurans', 'himal'];
  const a = new Uint32Array(3);
  crypto.getRandomValues(a);
  return `${words[a[0] % words.length]}-${words[a[1] % words.length]}-${1000 + (a[2] % 9000)}`;
};

/** Theme chooser: All, or a multi-select of thumbnails. */
function themePicker(meta, value, onChange, current) {
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

/**
 * The access panel for one invitation. clientLink = { createdAt, hasPassword, themes, canChangeTheme, canChangeColors } | null.
 */
export function accessPanel({ slug, names, meta, clientLink, theme, onChange = () => {} }) {
  const root = h('div.access');
  let link = clientLink || null;

  const permsForm = (state) => h('div.stack',
    themePicker(meta, state.themes, (v) => { state.themes = v; }, theme),
    toggle({ label: 'Can change the opening design', hint: 'Lets them switch to another of the designs above.', checked: state.canChangeTheme, onChange: (v) => { state.canChangeTheme = v; } }),
    toggle({ label: 'Can change colours', hint: 'The opening’s main colours, with a reset to the original.', checked: state.canChangeColors, onChange: (v) => { state.canChangeColors = v; } }));

  const pwField = (id) => {
    const input = h('input.input', { id, type: 'text', minlength: 6, maxlength: 128, autocomplete: 'new-password', spellcheck: 'false', placeholder: 'At least 6 characters' });
    return { input, el: h('div.field', h('label.label', { for: id }, 'Password for the couple'),
      h('div.inputrow', input, h('button.btn', { type: 'button', onclick: () => { input.value = genPassword(); input.focus(); } }, icon('wand', 15), 'Suggest one')),
      h('p.hint', 'You set it; they need it to open the link. Share it separately, never in the same message.')) };
  };

  function drawCreate(fromRegenerate = false) {
    const state = { themes: link?.themes ?? 'all', canChangeTheme: link?.canChangeTheme ?? false, canChangeColors: link?.canChangeColors ?? true };
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
        h('p.fresh__title', icon('check', 16), 'Link ready. It is shown only this once.'),
        h('div.inputrow', h('input.input.linkfield', { type: 'text', readonly: true, value: url, 'aria-label': 'The couple’s link', onfocus: (e) => e.target.select() }),
          h('button.btn.btn--primary', { type: 'button', onclick: () => copyText(url) }, icon('copy', 15), 'Copy link')),
        h('div.row',
          h('a.sharebtn.sharebtn--wa', { href: `https://wa.me/?text=${encodeURIComponent(msg)}`, target: '_blank', rel: 'noopener' }, icon('chat', 17), h('span', 'Send the link on WhatsApp')),
          h('button.btn.btn--quiet', { type: 'button', onclick: () => copyText(password, 'Password copied') }, icon('key', 15), 'Copy the password')),
        h('p.notice', icon('lock', 16), h('span', h('b', 'Send the password separately: '), 'a phone call, an SMS, or a second message later. Never in the same message as the link.'))),
      h('div.row', h('button.btn', { type: 'button', onclick: () => drawActive() }, 'Done')));
  }

  function drawActive() {
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
    const pw = pwField(`npw-${slug}`);
    const pwErr = h('p.form-error', { role: 'alert' });
    const pwBox = h('details.fold.fold--plain', { open: !link.hasPassword },
      h('summary.fold__sum', h('span', h('b', link.hasPassword ? 'Change the password' : 'Set a password'), h('small', 'Signs the couple out; they open the same link with the new password')), icon('down', 18)),
      h('div.fold__body', pw.el, pwErr, h('button.btn', { type: 'button', onclick: async (e) => {
        const p = pw.input.value.trim();
        if (p.length < 6) { pwErr.textContent = 'The password needs at least 6 characters.'; return; }
        e.currentTarget.disabled = true;
        try {
          const out = await api(`/invitations/${slug}/access`, { method: 'PATCH', body: { password: p } });
          link = out.clientLink || { ...link, hasPassword: true };
          onChange(link);
          toast('Password changed', 'success');
          drawActive();
        } catch (ex) { pwErr.textContent = ex.message; e.currentTarget.disabled = false; }
      } }, icon('key', 15), link.hasPassword ? 'Change password' : 'Set password')));
    fill(root, 
      h('div.accstate',
        h('span.pill.pill--ok', icon('check', 13), `Active since ${fmtDate(link.createdAt)}`),
        link.hasPassword ? h('span.pill.pill--muted', icon('lock', 13), 'Password set') : h('span.pill.pill--warn', icon('alert', 13), 'No password yet')),
      !link.hasPassword ? h('p.notice.notice--warn', icon('alert', 16), h('span', 'This older link opens without a password. Set one below to protect it.')) : null,
      permsForm(state), err, h('div.row', save),
      pwBox,
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
