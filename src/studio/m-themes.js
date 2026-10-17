// Themes (view only, with a live demo) and "Request a custom design".
import { h, icon, card, toast } from './dom.js';
import { api } from './api.js';
import { themeThumb, themeDemo, allowedThemes } from './m-opening.js';
import { intlMe } from './markets.js';

export function themesModule(ctx) {
  const cur = ctx.m.data.theme;
  const list = allowedThemes(ctx);
  const canSwitch = ctx.perms.canChangeTheme && list.length > 1;
  return [
    h('p.lede', ctx.isAdmin || ctx.perms.themes === 'all' ? 'Every design we make.' : 'The designs your planner picked for you.', ' Tap one to see it with your own names, dates and photos.',
      canSwitch ? [' To switch, use ', h('a', { href: `#/i/${ctx.slug}/opening` }, 'Opening'), '.'] : ' Your planner sets the design; ask them to switch, or request one made just for you.'),
    h('ul.tgrid.tgrid--lg', list.map((t) => h('li', h('button.tcard', { type: 'button', 'aria-label': `${t.name}: live demo`, onclick: () => themeDemo(ctx, t, { choose: false }) },
      h('span.tcard__img', themeThumb(t), t.slug === cur ? h('span.tcard__on', icon('check', 14), 'Yours') : h('span.tcard__view', icon('eye', 15), 'Live demo')),
      h('span.tcard__name', t.name), t.concept ? h('span.tcard__concept', t.concept) : null)))),
    h('section.card.cta',
      h('div', h('h2.card__title', 'Want something made just for you?'), h('p.card__help', 'We can design an invitation around your story, colours and traditions.')),
      h('a.btn.btn--primary', { href: `#/i/${ctx.slug}/custom` }, icon('wand', 16), 'Request a custom design')),
  ];
}

export function customModule(ctx) {
  const d = ctx.m.data;
  const label = (v) => (v && (v.en || v.ne)) || '';
  const err = h('p.form-error', { role: 'alert' });
  const done = h('div', { hidden: true });
  const themes = ctx.meta.themes.filter((t) => t.ready !== false);
  const btn = h('button.btn.btn--primary.btn--lg', { type: 'submit' }, icon('send', 16), 'Send the request');
  const form = h('form.stack', { novalidate: true },
    h('div.pair',
      h('div.field', h('label.label', { for: 'cr-name' }, 'Your name'), h('input.input', { id: 'cr-name', name: 'name', required: true, maxlength: 80, autocomplete: 'name' })),
      h('div.field', h('label.label', { for: 'cr-phone' }, 'Phone or WhatsApp'), h('input.input', { id: 'cr-phone', name: 'phone', type: 'tel', inputmode: 'tel', required: true, maxlength: 20, autocomplete: 'tel', placeholder: intlMe(ctx.me) ? '+1 …' : '+977 98…' }))),
    h('div.pair',
      h('div.field', h('label.label', { for: 'cr-email' }, 'Email (optional)'), h('input.input', { id: 'cr-email', name: 'email', type: 'email', maxlength: 254, autocomplete: 'email' })),
      h('div.field', h('label.label', { for: 'cr-theme' }, 'A design you like (optional)'), h('select.input', { id: 'cr-theme', name: 'theme' }, h('option', { value: '' }, 'No preference'), themes.map((t) => h('option', { value: t.slug, selected: t.slug === d.theme }, t.name))))),
    h('div.field', h('label.label', { for: 'cr-msg' }, 'What would you like?'), h('p.hint', 'Colours, a story, traditions, a picture you love: anything helps.'),
      h('textarea.input', { id: 'cr-msg', name: 'message', rows: 5, required: true, maxlength: 2000 })),
    h('input', { type: 'text', name: 'website', tabindex: -1, autocomplete: 'off', class: 'hp', 'aria-hidden': 'true' }),
    err, h('div', btn));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const fd = Object.fromEntries(new FormData(form));
    form.querySelectorAll('[aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid'));
    const bad = (names, text) => { names.forEach((n) => form.elements[n]?.setAttribute('aria-invalid', 'true')); form.elements[names[0]]?.focus(); err.textContent = text; };
    const missing = ['name', 'phone', 'message'].filter((k) => !fd[k].trim());
    if (missing.length) { bad(missing, 'Please fill in your name, phone and what you would like.'); return; }
    if (fd.name.trim().length < 2) { bad(['name'], 'Please write your full name.'); return; }
    if (!/^[0-9+()\-\s]{6,20}$/.test(fd.phone.trim())) { bad(['phone'], intlMe(ctx.me) ? 'Please check the phone number, with the country code, for example +1 415 555 2671.' : 'Please check the phone number: digits only, for example 98XXXXXXXX or +977 98XXXXXXXX.'); return; }
    if (fd.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fd.email.trim())) { bad(['email'], 'Please check the email address, or leave it empty.'); return; }
    btn.disabled = true;
    try {
      const wd = (d.weddingDate || '').slice(0, 10);
      await api('/orders', { method: 'POST', body: { kind: 'custom', name: fd.name.trim(), phone: fd.phone.trim(), email: fd.email.trim() || undefined, theme: fd.theme || undefined, weddingDate: /^\d{4}-\d{2}-\d{2}$/.test(wd) ? wd : undefined, message: fd.message.trim(), website: fd.website, ...(intlMe(ctx.me) ? { market: 'intl' } : {}) } });
      form.hidden = true;
      done.hidden = false;
      done.replaceChildren(h('div.success', h('span.success__icon', icon('check', 22)), h('h3.success__title', 'Request sent'), h('p', intlMe(ctx.me) ? 'Thank you. We will email you within a day with a price for your design.' : 'Thank you. We will call or message you soon to talk about your design.')));
      toast('Request sent', 'success');
    } catch (ex) {
      const names = { name: 'your name', phone: 'the phone number', email: 'the email', message: 'the message', theme: 'the design', weddingDate: 'the wedding date' };
      const fields = (ex.body?.fields || []).filter((f) => names[f]);
      if (fields.length) bad(fields, `Please check ${fields.map((f) => names[f]).join(' and ')}.`);
      else err.textContent = ex.status === 404 ? 'Requests cannot be sent right now. Please try again later.' : ex.status === 429 ? 'Too many requests from here. Please try again in an hour, or call us.' : ex.message;
      btn.disabled = false;
    }
  });
  return card('Request a custom design', 'Tell us about the invitation you dream of. We reply within a day.', form, done);
}
