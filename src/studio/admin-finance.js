// Business › Finance: money actually received (server/lib/finance.js counts it from the orders), rupees and dollars
// always apart, what is not received yet, free access (never counted), every transaction with a drawer, and a CSV.
// Also the money actions the Orders drawer and the Customers page use: give / undo free access, refund, remove a
// refund recorded by mistake. Routes: /api/admin/finance/* (docs/API.md "Finance").
import { h, icon, toast, openDialog, fmtDate, fill, debounce, confirmDialog } from './dom.js';
import { api } from './api.js';

// ── Money in plain words ──────────────────────────────────────────────────

const dec = (n) => (Number.isInteger(Number(n)) ? 0 : 2);
/** Rs 4,999 · Rs 4,999.50 · $39 · $39.50 (never converted). */
export function money(n, cur) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  const d = dec(n);
  return cur === 'USD'
    ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: 2 })}`
    : `Rs ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: 2 })}`;
}
const valueLine = (v) => [v?.npr != null ? money(v.npr, 'NPR') : null, v?.usd != null ? money(v.usd, 'USD') : null].filter(Boolean).join(' · ') || 'No price';
const monthName = (key, long = false) => new Date(`${key}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: long ? 'long' : 'short', year: 'numeric', timeZone: 'UTC' });
const todayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kathmandu' });
const dayText = (day) => (day ? fmtDate(`${day}T12:00:00+05:45`) : '—');
const quiet = (ic, title, text) => h('div.qempty', h('span.qempty__icon', icon(ic, 18)), h('div', h('p.qempty__title', title), text ? h('p.qempty__text', text) : null));
const skel = (n = 3) => h('div.rows-skel', { 'aria-hidden': 'true' }, Array.from({ length: n }, (_, i) => h('div.rows-skel__row', h('span.skel__line', { style: { width: `${[44, 58, 36, 52][i % 4]}%` } }))));
const TYPE = { payment: ['ok', 'Payment'], refund: ['warn', 'Refund'], comp: ['muted', 'Free access'] };
const typePill = (e) => h('span.pill', { class: `pill--${TYPE[e.type][0]}` }, TYPE[e.type][1]);

let paypalInfo = null;
/** { enabled, env } of PayPal Checkout on this server (cached for the session). */
const paypalStatus = () => (paypalInfo ||= api('/pay/status').then((r) => r.paypal || { enabled: false }).catch(() => ({ enabled: false })));
let plansPromise = null;
const loadPlans = () => (plansPromise ||= api('/admin/site').then((s) => (s.plans || []).filter((p) => p.id)).catch((err) => { plansPromise = null; throw err; }));

/** A small form dialog: submit() resolves to a result (closes) or throws (shows the message). */
function formDialog({ title, intro, fields, submitText, submit, danger = false, onReady }) {
  return new Promise((resolve) => {
    let result = null;
    const err = h('p.form-error', { role: 'alert' });
    const id = `ff-${Math.random().toString(36).slice(2, 8)}`;
    const save = h('button.btn', { type: 'submit', form: id, class: danger ? 'btn--danger' : 'btn--primary' }, submitText);
    const form = h('form.stack', { id, novalidate: true }, intro || null, ...fields, err);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      save.disabled = true;
      try { result = await submit(); d.close(); } catch (ex) { err.textContent = ex.message; save.disabled = false; }
    });
    const d = openDialog({ title, body: form, actions: [h('button.btn', { type: 'button', onclick: () => d.close() }, 'Cancel'), save], onClose: () => resolve(result) });
    onReady?.({ save });
    form.querySelector('input:not([type=hidden]), textarea')?.focus();
  });
}
const field = (id, label, control, hint) => h('div.field', h('label.label', { for: id }, label), control, hint ? h('p.hint', hint) : null);
const chips = (input, list) => h('div.chips', list.map((t) => h('button.chip', { type: 'button', onclick: () => { input.value = t; input.focus(); } }, t)));

// ── Free access ───────────────────────────────────────────────────────────

const COMP_REASONS = ['Friend', 'Family', 'Promotion', 'Replacement', 'Sorry for a problem'];

/** Plan + reason. Resolves to the server's answer (via send) or null. */
async function compForm({ title, intro, planId, send }) {
  let plans;
  try { plans = await loadPlans(); } catch (err) { toast(err.message, 'error'); return null; }
  const sel = h('select.input', { id: 'comp-plan' }, plans.map((p) => h('option', { value: p.id, selected: p.id === planId },
    `${p.name}${p.price != null || p.priceUsd != null ? ` · ${valueLine({ npr: p.price, usd: p.priceUsd })}` : ''}`)));
  const reason = h('input.input', { id: 'comp-reason', maxlength: 300, placeholder: 'e.g. Friend of the family', autocomplete: 'off' });
  return formDialog({
    title, submitText: 'Give free access',
    intro: h('p.dialog__text', intro),
    fields: [field('comp-plan', 'Plan they get', sel), h('div.field', h('label.label', { for: 'comp-reason' }, 'Why (only you see it)'), reason, chips(reason, COMP_REASONS)),
      h('p.hint', icon('info', 14), 'Free access is never counted as money received. You can undo it later.')],
    submit: async () => {
      if (reason.value.trim().length < 2) throw new Error('Say why you are giving free access.');
      return send({ plan: sel.value, reason: reason.value.trim() });
    },
  });
}

/** Orders drawer: give this order its plan without payment. after() redraws. */
export async function giveFreeAccess(o, after) {
  const out = await compForm({
    title: `Free access · ${o.ref || o.name}`, planId: o.plan,
    intro: `${o.name} gets the plan without paying. Their pay page says there is nothing to pay.`,
    send: (body) => api(`/admin/finance/orders/${encodeURIComponent(o.id)}/comp`, { method: 'POST', body }),
  });
  if (!out) return;
  Object.assign(o, out.order);
  toast(`${o.name}: free access given`, 'success');
  after();
}

/** Orders drawer: back to awaiting payment (the free access stays in the history). */
export async function undoFreeAccess(o, after) {
  if (!(await confirmDialog({ title: 'Undo free access?', message: `${o.name}’s order goes back to “Awaiting payment” and they can pay again from their pay page.`, confirm: 'Undo free access' }))) return;
  try {
    const out = await api(`/admin/finance/orders/${encodeURIComponent(o.id)}/uncomp`, { method: 'POST', body: {} });
    Object.assign(o, out.order);
    toast('Free access undone', 'success');
    after();
  } catch (err) { toast(err.message, 'error'); }
}

/** Customers page: a new order with free access for this account. Resolves to the new order or null. */
export async function customerFreeAccess(c) {
  const out = await compForm({
    title: `Free access · ${c.name || c.email}`,
    intro: 'Makes a new order in their account with this plan, without payment. It shows in Orders and in their dashboard.',
    send: (body) => api(`/admin/finance/customers/${encodeURIComponent(c.id)}/comp`, { method: 'POST', body }),
  });
  if (!out) return null;
  toast(`Order ${out.order.ref} made with free access`, 'success');
  return out.order;
}

/** The facts of a comped order, for the Orders drawer's payment box. */
export function compFacts(o) {
  const c = o.pay?.comp;
  if (!c) return null;
  return h('dl.kv.paybox__kv',
    h('div', h('dt', 'Plan given'), h('dd', c.planName || c.plan)),
    h('div', h('dt', 'Why'), h('dd', c.reason || '—')),
    h('div', h('dt', 'Given'), h('dd', fmtDate(c.at))),
    h('div', h('dt', 'Would cost'), h('dd.tnum', valueLine(c.value), h('small.fin-muted', ' (not counted)'))));
}

// ── Refunds ───────────────────────────────────────────────────────────────

const REFUND_REASONS = ['Wedding cancelled', 'Paid twice', 'Changed their mind', 'Problem with the invitation'];

/** Orders drawer: a full or partial refund of a payment. after() redraws. */
export async function refundDialog(o, after) {
  const options = (o.refundable || []).filter((x) => x.left > 0);
  if (!options.length) { toast('Nothing left to refund on this order.', 'error'); return; }
  const pp = await paypalStatus();
  let pick = options[0];
  const amount = h('input.input', { id: 'rf-amount', type: 'number', inputmode: 'decimal', min: '0.01', step: '0.01', autocomplete: 'off' });
  const prefix = h('span.prefix');
  const date = h('input.input', { id: 'rf-date', type: 'date', max: todayKey(), value: todayKey() });
  const reason = h('input.input', { id: 'rf-reason', maxlength: 300, placeholder: 'e.g. Wedding cancelled', autocomplete: 'off' });
  const facts = h('dl.kv.fin-rfacts');
  const how = h('p.notice');
  const fullBtn = h('button.chip', { type: 'button', onclick: () => { amount.value = String(pick.left); amount.focus(); } });
  const dateField = field('rf-date', 'Date you sent it back', date);
  const through = () => (pick.of === 'paypal' && pp.enabled ? 'paypal' : 'record');
  const sync = () => {
    prefix.textContent = pick.currency === 'USD' ? '$' : 'Rs';
    amount.max = String(pick.left);
    amount.value = String(pick.left);
    fullBtn.textContent = `Everything left: ${money(pick.left, pick.currency)}`;
    fill(facts, h('div', h('dt', 'Paid'), h('dd.tnum', money(pick.paid, pick.currency), ` · ${pick.label}`)),
      h('div', h('dt', 'Refunded so far'), h('dd.tnum', money(pick.refunded, pick.currency))),
      h('div', h('dt', 'Can still refund'), h('dd.tnum', h('b', money(pick.left, pick.currency)))));
    const viaPayPal = through() === 'paypal';
    dateField.hidden = viaPayPal;
    how.className = `notice ${viaPayPal ? 'notice--warn' : ''}`;
    fill(how, icon('info', 16), h('span', viaPayPal
      ? `PayPal sends this money back to the customer now${pick.test ? ' (sandbox: test money)' : ''}. It cannot be undone here.`
      : pick.of === 'paypal'
        ? 'PayPal is not set up on this server: refund in PayPal first, then record it here.'
        : 'This only records the refund. Send the money back yourself, in the bank or wallet app or in cash.'));
    if (save) save.textContent = viaPayPal ? 'Refund through PayPal' : 'Record refund';
  };
  const choose = options.length > 1 ? h('div.field', h('span.label', 'Which payment'), h('div.seg', options.map((x) => h('button.seg__btn', {
    type: 'button', 'aria-pressed': String(x === pick), onclick: (e) => { pick = x; for (const b of e.currentTarget.parentNode.children) b.setAttribute('aria-pressed', String(b === e.currentTarget)); sync(); },
  }, `${x.label} · ${money(x.paid, x.currency)}`)))) : null;
  let save = null; // formDialog's submit button: sync() names it after the choice (Record refund / Refund through PayPal)
  const done = await formDialog({
    title: `Refund · ${o.ref || o.name}`, submitText: 'Record refund',
    onReady: (x) => { save = x.save; sync(); },
    fields: [choose, facts, h('div.field', h('label.label', { for: 'rf-amount' }, 'Amount to refund'), h('div.inputrow.inputrow--prefix', prefix, amount), h('div.chips', fullBtn)),
      dateField, h('div.field', h('label.label', { for: 'rf-reason' }, 'Why'), reason, chips(reason, REFUND_REASONS)), how],
    submit: async () => {
      const n = Number(amount.value);
      if (!(n > 0) || Math.round(n * 100) / 100 !== n) throw new Error('Enter the amount, with at most 2 decimals.');
      if (n > pick.left) throw new Error(`At most ${money(pick.left, pick.currency)} can still be refunded.`);
      if (reason.value.trim().length < 2) throw new Error('Say why you are refunding.');
      const viaPayPal = through() === 'paypal';
      if (viaPayPal && !(await confirmDialog({ title: `Send ${money(n, pick.currency)} back through PayPal?`, message: 'PayPal refunds the customer straight away.', confirm: 'Refund now', danger: true }))) throw new Error('Refund not sent.');
      return api(`/admin/finance/orders/${encodeURIComponent(o.id)}/refunds`, { method: 'POST', body: { of: pick.of, amount: n, reason: reason.value.trim(), ...(viaPayPal ? { through: 'paypal' } : { through: 'record', date: date.value || todayKey() }) } });
    },
  });
  if (!done) return;
  Object.assign(o, done.order);
  toast(done.refund ? `Refunded through PayPal (${done.refund.status.toLowerCase()})` : 'Refund recorded', 'success');
  after();
}

/** The refunds of an order, with Remove for one recorded by mistake. Null when there are none. */
export function refundsBlock(o, after) {
  const list = (o.refunds || []).filter((r) => r && r.amount != null);
  if (!list.length) return null;
  const remove = async (r) => {
    if (!(await confirmDialog({ title: 'Remove this refund?', message: `Use this only if the refund of ${money(r.amount, r.currency)} was recorded by mistake. It stops counting at once.`, confirm: 'Remove refund', danger: true }))) return;
    try {
      const out = await api(`/admin/finance/orders/${encodeURIComponent(o.id)}/refunds/${encodeURIComponent(r.id)}/void`, { method: 'POST', body: {} });
      Object.assign(o, out.order);
      toast('Refund removed', 'success');
      after();
    } catch (err) { toast(err.message, 'error'); }
  };
  return h('div.fin-refunds',
    h('p.fin-refunds__h', 'Refunds'),
    h('ul.fin-refunds__list', list.slice().reverse().map((r) => h('li', { class: r.voidedAt ? 'is-void' : '' },
      h('span.fin-refunds__amt.tnum', `− ${money(r.amount, r.currency)}`),
      h('span.fin-refunds__meta', `${dayText(r.date || (r.at || '').slice(0, 10))} · ${r.via === 'paypal' ? `through PayPal${r.status && r.status !== 'COMPLETED' ? ` (${r.status.toLowerCase()})` : ''}` : 'recorded'}${r.reason ? ` · ${r.reason}` : ''}`),
      r.voidedAt ? h('span.pill.pill--muted', 'Removed')
        : r.via === 'record' && r.of === 'manual' ? h('button.link', { type: 'button', onclick: () => remove(r) }, 'Remove') : null))));
}

// ── The Finance page ──────────────────────────────────────────────────────

const PERIODS = [['thisMonth', 'This month'], ['lastMonth', 'Last month'], ['thisYear', 'This year'], ['allTime', 'All time']];
const CUR_NAME = { NPR: 'Rupees', USD: 'US dollars' };

function tabs(items, cur, onPick, label) {
  const el = h('div.ftabs', { role: 'group', 'aria-label': label });
  const draw = (v) => fill(el, items.map(([k, t]) => h('button.ftab', { type: 'button', 'aria-pressed': String(k === v), onclick: () => { draw(k); onPick(k); } }, t)));
  draw(cur);
  return el;
}

function exportDialog() {
  const t = todayKey();
  const from = h('input.input', { id: 'csv-from', type: 'date', value: `${t.slice(0, 8)}01`, max: t });
  const to = h('input.input', { id: 'csv-to', type: 'date', value: t, max: t });
  const type = h('select.input', { id: 'csv-type' }, [['', 'Everything'], ['payment', 'Payments'], ['refund', 'Refunds'], ['comp', 'Free access']].map(([v, l]) => h('option', { value: v }, l)));
  const cur = h('select.input', { id: 'csv-cur' }, [['', 'Rupees and dollars'], ['NPR', 'Rupees only'], ['USD', 'Dollars only']].map(([v, l]) => h('option', { value: v }, l)));
  return formDialog({
    title: 'Export transactions (CSV)', submitText: 'Download CSV',
    intro: h('p.dialog__text', 'Opens in Excel or Google Sheets. Refunds have a minus sign in “Signed amount”; free access is listed but never counted.'),
    fields: [h('div.cu-two', field('csv-from', 'From', from), field('csv-to', 'To', to)), h('div.cu-two', field('csv-type', 'What', type), field('csv-cur', 'Currency', cur))],
    submit: async () => {
      if (!from.value || !to.value || from.value > to.value) throw new Error('Choose a start and an end date (the start first).');
      const q = new URLSearchParams({ from: from.value, to: to.value, ...(type.value ? { type: type.value } : {}), ...(cur.value ? { currency: cur.value } : {}) });
      const a = h('a', { href: `/api/admin/finance/transactions.csv?${q}`, download: '' });
      document.body.append(a);
      a.click();
      a.remove();
      return true;
    },
  });
}

/** One transaction in a drawer, with a link to its order. */
function txDrawer(e) {
  const k = (label, value) => (value == null || value === '' ? null : h('div', h('dt', label), h('dd', value)));
  const amount = e.type === 'comp' ? valueLine(e.value) : `${e.type === 'refund' ? '− ' : ''}${money(e.amount, e.currency)}`;
  const counted = e.type === 'comp' ? 'No: free access is never counted'
    : e.test ? 'No: PayPal sandbox (test money)' : e.voided ? 'No: this refund was removed' : !e.counted ? 'No' : e.type === 'refund' ? `Yes, subtracted in ${monthName(e.month, true)}` : `Yes, in ${monthName(e.month, true)}`;
  const key = e.ref || e.orderId;
  let d;
  const body = h('div.odr',
    h('section.odr__sect', h('div.fin-dr__top', typePill(e), e.test ? h('span.pill.pill--muted', 'Test') : null, e.voided ? h('span.pill.pill--muted', 'Removed') : null),
      h('p.fin-dr__amt.tnum', { class: e.type === 'refund' ? 'is-neg' : e.type === 'comp' ? 'is-free' : '' }, amount),
      h('p.hint', counted)),
    h('section.odr__sect', h('h3.odr__h', 'Details'), h('dl.kv.kv--rows',
      k('Date', dayText(e.day)), k('Order', e.ref ? h('span.tnum', e.ref) : null), k('Customer', e.name), k('Email', e.email ? h('a', { href: `mailto:${e.email}` }, e.email) : null),
      k('Plan', e.plan), k(e.type === 'comp' ? 'Kind' : 'Method', e.method), e.type === 'refund' ? k('Refunded', e.via === 'paypal' ? 'Through PayPal' : 'Recorded here (sent back by hand)') : null,
      k(e.type === 'comp' ? 'Why' : e.type === 'refund' ? 'Why' : 'Note', e.reason || e.note), k('PayPal id', e.paypalId ? h('span.tnum', e.paypalId) : null),
      k('Status', e.status ? e.status.toLowerCase() : null))),
    h('section.odr__sect', h('a.btn.btn--sm', { href: `#/orders/${encodeURIComponent(key)}`, onclick: () => d?.close() }, icon('inbox', 15), 'Open the order')));
  d = openDialog({ title: `${TYPE[e.type][1]} · ${e.ref || e.name}`, body, cls: 'dialog--drawer' });
}

/** The transactions list: filters, search, pages. */
function transactions() {
  const st = { type: '', currency: '', month: '', q: '', page: 1 };
  const body = h('div.tablebox', skel(5));
  const pager = h('div.fin-pager');
  const monthSel = h('select.input.input--sm', { 'aria-label': 'Month', onchange: (e) => { st.month = e.target.value; st.page = 1; load(); } }, h('option', { value: '' }, 'All months'));
  const curSel = h('select.input.input--sm', { 'aria-label': 'Currency', onchange: (e) => { st.currency = e.target.value; st.page = 1; load(); } },
    [['', 'Rs and $'], ['NPR', 'Rupees'], ['USD', 'Dollars']].map(([v, l]) => h('option', { value: v }, l)));
  const search = h('label.search', icon('search', 15), h('input.input.input--sm', { type: 'search', placeholder: 'Search order no., name, email', 'aria-label': 'Search transactions', oninput: debounce((ev) => { st.q = ev.target.value.trim(); st.page = 1; load(); }, 200) }));
  let months = null;
  let seq = 0;
  const row = (e) => {
    const open = () => txDrawer(e);
    const amt = e.type === 'comp'
      ? h('span.fin-amt.is-free', valueLine(e.value))
      : h('span.fin-amt', { class: e.type === 'refund' ? 'is-neg' : '' }, `${e.type === 'refund' ? '− ' : ''}${money(e.amount, e.currency)}`);
    return h('tr.orow', { tabindex: 0, class: !e.counted && e.type !== 'comp' ? 'is-muted' : '', 'aria-label': `${TYPE[e.type][1]} ${e.ref || ''} ${e.name}: open`, onclick: open, onkeydown: (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); open(); } } },
      h('td.fin-c--day.tnum', dayText(e.day)),
      h('td', typePill(e), e.test ? h('span.pill.pill--muted.fin-sp', 'Test') : null, e.voided ? h('span.pill.pill--muted.fin-sp', 'Removed') : null),
      h('td.ocell--who', h('b', e.name || '—'), e.ref ? h('small.tnum.fin-muted', e.ref) : null),
      h('td.fin-c--method', e.method),
      h('td.num.tnum', amt));
  };
  async function load() {
    const my = ++seq;
    const q = new URLSearchParams({ page: String(st.page), per: '50' });
    for (const k of ['type', 'currency', 'month', 'q']) if (st[k]) q.set(k, st[k]);
    try {
      const r = await api(`/admin/finance/transactions?${q}`);
      if (my !== seq) return;
      if (!months) {
        months = r.months || [];
        monthSel.append(...months.map((m) => h('option', { value: m }, monthName(m, true))));
      }
      const from = r.total ? (r.page - 1) * r.per + 1 : 0;
      const to = Math.min(r.total, r.page * r.per);
      fill(body, r.items.length ? h('table.otable.fin-tx',
        h('caption.sr-only', 'Transactions, newest first'),
        h('thead', h('tr', h('th', { scope: 'col' }, 'Date'), h('th', { scope: 'col' }, 'Type'), h('th', { scope: 'col' }, 'Customer'), h('th.fin-c--method', { scope: 'col' }, 'Method'), h('th.num', { scope: 'col' }, 'Amount'))),
        h('tbody', r.items.map(row)))
        : quiet(st.q ? 'search' : 'history', st.q || st.type || st.currency || st.month ? 'Nothing matches' : 'No transactions yet', st.q ? 'Try an order number, a name or an email.' : 'Confirmed payments, refunds and free access show up here.'));
      fill(pager, r.total > r.per ? [
        h('span.fin-muted.tnum', `${from}–${to} of ${r.total}`),
        h('button.btn.btn--sm', { type: 'button', disabled: r.page <= 1, onclick: () => { st.page -= 1; load(); } }, icon('left', 14), 'Newer'),
        h('button.btn.btn--sm', { type: 'button', disabled: to >= r.total, onclick: () => { st.page += 1; load(); } }, 'Older', icon('right', 14)),
      ] : r.total ? h('span.fin-muted.tnum', `${r.total} ${r.total === 1 ? 'line' : 'lines'}`) : null);
    } catch (err) {
      if (my === seq) fill(body, quiet('alert', 'Could not load the transactions', err.message));
    }
  }
  load();
  const typeTabs = tabs([['', 'All'], ['payment', 'Payments'], ['refund', 'Refunds'], ['comp', 'Free access']], '', (v) => { st.type = v; st.page = 1; load(); }, 'Type');
  return h('section.sect', { 'aria-labelledby': 'fin-tx-h' },
    h('header.sect__head', h('h2.sect__title#fin-tx-h', 'Transactions'), h('button.btn.btn--sm', { type: 'button', onclick: () => exportDialog() }, icon('download', 15), 'Export CSV')),
    h('div.toolbar2.fin-tools', typeTabs, h('div.toolbar2__end', curSel, monthSel, search)),
    body, pager);
}

/** The Finance module (Business group). */
export function financePage(ctx) {
  let data = null;
  let period = PERIODS.some(([k]) => k === ctx.params?.get('p')) ? ctx.params.get('p') : 'thisMonth';
  const totals = h('div.fin-totals', skel(2));
  const note = h('div');
  const pending = h('div', skel(2));
  const monthsBox = h('div.tablebox', skel(4));
  const methods = h('div', skel(3));
  const comps = h('div', skel(2));

  const curRow = (cur, b) => h('div.fin-cur',
    h('p.fin-cur__name', h('span.fin-cur__code', cur), CUR_NAME[cur]),
    h('dl.kpis.fin-kpis',
      h('div.kpi', h('dt.kpi__k', 'Received'), h('dd.kpi__v.tnum', money(b.received, cur))),
      h('div.kpi', h('dt.kpi__k', 'Refunded'), h('dd.kpi__v.tnum', b.refunded ? `− ${money(b.refunded, cur)}` : money(0, cur))),
      h('div.kpi.fin-kpi--net', h('dt.kpi__k', 'Earned (net)'), h('dd.kpi__v.tnum', money(b.net, cur))),
      h('div.kpi', h('dt.kpi__k', 'Payments'), h('dd.kpi__v.tnum', String(b.payments)))));
  const drawTotals = () => {
    const p = data.periods[period];
    const label = period === 'thisMonth' ? monthName(data.keys.thisMonth, true) : period === 'lastMonth' ? monthName(data.keys.lastMonth, true) : period === 'thisYear' ? data.keys.year : 'Since the start';
    fill(totals, h('p.fin-period', label), curRow('NPR', p.NPR), curRow('USD', p.USD));
  };
  const pendRow = (title, text, href, b) => h('a.fin-pend', { href },
    h('span.fin-pend__n.tnum', String(b.count)),
    h('span.fin-pend__main', h('b', title), h('small', text)),
    h('span.fin-pend__amt.tnum', [b.NPR ? money(b.NPR, 'NPR') : null, b.USD ? money(b.USD, 'USD') : null].filter(Boolean).join(' · ') || (b.count ? 'No price set' : '—'),
      b.noPrice && (b.NPR || b.USD) ? h('small', ` + ${b.noPrice} without a price`) : null),
    icon('right', 15));

  function draw() {
    drawTotals();
    fill(note, data.test.payments ? h('p.notice', icon('info', 16), h('span', `${data.test.payments} PayPal ${data.test.payments === 1 ? 'payment was' : 'payments were'} made in the sandbox (test money). They are listed below but never counted.`)) : null);
    fill(pending,
      pendRow('Payment screenshots to check', 'Money they say they sent. Confirm it in Orders.', '#/orders?f=check', data.pending.toCheck),
      pendRow('Waiting for payment', 'Orders not paid yet, at their plan price.', '#/orders?f=waiting', data.pending.awaiting));
    const cell = (b, cur, k) => h('td.num.tnum', { class: b[k] ? '' : 'fin-zero' }, b[k] ? `${k === 'refunded' ? '− ' : ''}${money(b[k], cur)}` : '—');
    fill(monthsBox, h('table.dtable.fin-months',
      h('caption.sr-only', 'Month by month, the last 12 months'),
      h('thead', h('tr', h('th', { scope: 'col' }, 'Month'), ...['Rs in', 'Rs back', 'Rs net', '$ in', '$ back', '$ net'].map((t, i) => h('th.num', { scope: 'col', class: i === 3 ? 'fin-sep' : '' }, t)))),
      h('tbody', data.months.map((m) => h('tr', { class: m.month === data.keys.thisMonth ? 'is-now' : '' },
        h('th', { scope: 'row' }, monthName(m.month)),
        cell(m.NPR, 'NPR', 'received'), cell(m.NPR, 'NPR', 'refunded'), h('td.num.tnum.fin-net', { class: m.NPR.received || m.NPR.refunded ? '' : 'fin-zero' }, m.NPR.received || m.NPR.refunded ? money(m.NPR.net, 'NPR') : '—'),
        h('td.num.tnum.fin-sep', { class: m.USD.received ? '' : 'fin-zero' }, m.USD.received ? money(m.USD.received, 'USD') : '—'), cell(m.USD, 'USD', 'refunded'),
        h('td.num.tnum.fin-net', { class: m.USD.received || m.USD.refunded ? '' : 'fin-zero' }, m.USD.received || m.USD.refunded ? money(m.USD.net, 'USD') : '—'))))));
    fill(methods, data.byMethod.length ? h('table.dtable.fin-methods',
      h('caption.sr-only', 'Totals by payment method, all time'),
      h('thead', h('tr', h('th', { scope: 'col' }, 'Method'), h('th.num', { scope: 'col' }, 'Payments'), h('th.num', { scope: 'col' }, 'Received'), h('th.num', { scope: 'col' }, 'Refunded'), h('th.num', { scope: 'col' }, 'Net'))),
      h('tbody', data.byMethod.map((m) => h('tr', h('th', { scope: 'row' }, m.method, h('small.fin-muted', ` ${m.currency}`)),
        h('td.num.tnum', String(m.payments)), h('td.num.tnum', money(m.received, m.currency)),
        h('td.num.tnum', { class: m.refunded ? '' : 'fin-zero' }, m.refunded ? `− ${money(m.refunded, m.currency)}` : '—'), h('td.num.tnum.fin-net', money(m.net, m.currency))))))
      : quiet('history', 'No money received yet', 'Confirmed payments are added up here by method.'));
    const c = data.comps;
    fill(comps, c.count ? [
      h('p.fin-comps__sum', h('b.tnum', `${c.count} ${c.count === 1 ? 'order' : 'orders'}`), ' · would have cost ', h('span.tnum', [c.value.NPR ? money(c.value.NPR, 'NPR') : null, c.value.USD ? money(c.value.USD, 'USD') : null].filter(Boolean).join(' or ') || '—'), h('span.fin-muted', ' · never counted')),
      h('ul.rows.fin-comps', c.items.slice(0, 8).map((e) => h('li', h('a.fin-comp', { href: `#/orders/${encodeURIComponent(e.ref || e.orderId)}` },
        h('span.fin-comp__who', h('b', e.name || '—'), h('small.tnum', `${e.ref || ''} · ${e.plan}`)),
        h('span.fin-comp__why', e.reason), h('small.fin-muted', dayText(e.day)))))),
      c.count > 8 ? h('p.sect__foot', `${c.count - 8} more in the transactions below (Free access).`) : null,
    ] : quiet('star', 'No free access given', 'Give a plan without payment from an order or a customer. It is listed here, never counted.'));
  }

  api('/admin/finance/summary').then((r) => { data = r; draw(); }).catch((err) => {
    const q = quiet('alert', err.status === 404 ? 'Finance is not available on this server yet' : 'Could not load the money summary', err.status === 404 ? '' : err.message);
    fill(totals, q);
    for (const box of [pending, monthsBox, methods, comps]) fill(box);
  });

  const periodTabs = tabs(PERIODS, period, (v) => { period = v; if (data) drawTotals(); }, 'Period');
  const sect = (id, title, ...kids) => h('section.sect', { 'aria-labelledby': id }, h('header.sect__head', h('h2.sect__title', { id }, title)), ...kids);
  return [
    h('section.sect.fin-top', { 'aria-labelledby': 'fin-sum-h' },
      h('header.sect__head', h('h2.sect__title#fin-sum-h', 'Money received'), periodTabs),
      totals, note,
      h('p.hint', icon('info', 14), 'Only money you actually received: payments you confirmed, PayPal payments and cash you marked paid, minus refunds in the month they happened. Rupees and dollars are never added together.')),
    sect('fin-pend-h', 'Not received yet', pending),
    h('div.fin-split',
      sect('fin-month-h', 'Month by month', monthsBox),
      h('div.fin-split__side', sect('fin-meth-h', 'By method (all time)', methods), sect('fin-comp-h', 'Free access', comps))),
    transactions(),
  ];
}
