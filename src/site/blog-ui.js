// The blog pages' own behaviour (the HTML is complete without it; server/lib/blog-render.js):
//   index: the topic filter (chips, ?topic=<category>)
//   post:  Copy buttons on the copy-ready wording, Copy link, the table of contents (open on wide screens, the
//          section you are reading marked), and the reading line under the header (the page's one motion).
import './blog.css';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const COPY_ICO = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h9"/></svg>';

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

/* ---------------- index: the topic filter ---------------- */
function initFilter() {
  const bar = $('[data-bl-filter]');
  if (!bar) return;
  const cards = $$('#bl-grid .bcard');
  const empty = $('#bl-empty');
  const chips = $$('.chip', bar);
  const apply = (cat, push = true) => {
    if (!chips.some((c) => c.dataset.cat === cat)) cat = '';
    for (const c of chips) c.setAttribute('aria-pressed', String(c.dataset.cat === cat));
    let shown = 0;
    for (const card of cards) { const on = !cat || card.dataset.cat === cat; card.hidden = !on; if (on) shown += 1; }
    if (empty) empty.hidden = shown > 0;
    if (push) {
      const u = new URL(location.href);
      if (cat) u.searchParams.set('topic', cat); else u.searchParams.delete('topic');
      history.replaceState(history.state, '', u);
    }
  };
  bar.hidden = false;
  bar.addEventListener('click', (e) => { const b = e.target instanceof Element ? e.target.closest('.chip') : null; if (b) apply(b.dataset.cat || ''); });
  $('[data-bl-all]')?.addEventListener('click', () => apply(''));
  const topic = new URLSearchParams(location.search).get('topic');
  if (topic) apply(topic, false);
}

/* ---------------- post ---------------- */
function initCopy() {
  for (const fig of $$('.bp-body .copy')) {
    const pre = $('.copy__text', fig);
    if (!pre) continue;
    const title = $('.copy__t', fig)?.textContent?.trim();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy__btn';
    btn.innerHTML = `${COPY_ICO}<span>Copy</span>`;
    btn.setAttribute('aria-label', title ? `Copy: ${title}` : 'Copy this wording');
    let t = 0;
    btn.addEventListener('click', async () => {
      const ok = await copyText(pre.textContent);
      btn.classList.toggle('is-done', ok);
      btn.lastElementChild.textContent = ok ? 'Copied' : 'Select and copy';
      clearTimeout(t);
      t = setTimeout(() => { btn.classList.remove('is-done'); btn.lastElementChild.textContent = 'Copy'; }, 1800);
    });
    fig.append(btn);
  }
  for (const b of $$('[data-copy-link]')) {
    b.addEventListener('click', async () => {
      const ok = await copyText(b.dataset.copyLink);
      const msg = b.closest('.bp-share')?.querySelector('.bp-share__ok');
      if (msg) msg.textContent = ok ? 'Link copied.' : 'Copy the address from your browser bar.';
    });
  }
}

function initToc() {
  const box = $('.bp-toc__box');
  if (!box) return;
  const wide = matchMedia('(min-width: 1080px)');
  const set = () => { box.open = wide.matches; };
  set();
  wide.addEventListener?.('change', set);
  box.addEventListener('click', (e) => { if (!wide.matches && e.target instanceof Element && e.target.closest('a')) box.open = false; });
  const links = new Map($$('a', box).map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const heads = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
  if (!heads.length || !('IntersectionObserver' in window)) return;
  let current = null;
  const mark = (id) => {
    if (id === current) return;
    current = id;
    for (const [k, a] of links) { if (k === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }
  };
  // the section you are in: the last heading above the upper third of the screen
  const pick = () => {
    const line = innerHeight * 0.33;
    let id = heads[0].id;
    for (const h of heads) { if (h.getBoundingClientRect().top <= line) id = h.id; else break; }
    mark(id);
  };
  const io = new IntersectionObserver(pick, { rootMargin: '0px 0px -60% 0px', threshold: [0, 1] });
  heads.forEach((h) => io.observe(h));
  pick();
}

/** the reading line: how far through the article you are (transform only, one frame per scroll) */
function initProgress() {
  const bar = $('.bp-progress i');
  const art = $('.bp');
  if (!bar || !art) return;
  let raf = 0;
  const draw = () => {
    raf = 0;
    const r = art.getBoundingClientRect();
    const total = Math.max(1, r.height - innerHeight * 0.6);
    const p = Math.min(1, Math.max(0, -r.top / total));
    bar.style.transform = `scaleX(${p.toFixed(4)})`;
  };
  const on = () => { if (!raf) raf = requestAnimationFrame(draw); };
  addEventListener('scroll', on, { passive: true });
  addEventListener('resize', on, { passive: true });
  draw();
}

initFilter();
initCopy();
initToc();
initProgress();
