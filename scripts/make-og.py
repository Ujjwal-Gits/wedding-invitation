import json, os, sys, html
from playwright.sync_api import sync_playwright

# Renders 1200x630 share images from the list og-list.mjs prints: python scripts/make-og.py og.json public/site/og http://localhost:8787
BASE = sys.argv[3] if len(sys.argv) > 3 else 'http://localhost:8787'
OUTDIR = sys.argv[2]
EXE = os.environ.get('CHROME') or None  # optional: a Chromium executable for Playwright
items = json.load(open(sys.argv[1], encoding='utf-8'))

PAL = {
    'np': dict(accent='#A8123A', soft='#FDEEF1', soft2='#F8D9E0', ink='#22141A', ink2='#5A4A50', night='#2A1A1D'),
    'intl': dict(accent='#4A7556', soft='#F1F5EF', soft2='#DCE8D7', ink='#17201A', ink2='#434F47', night='#1F2622'),
}

def phone_html(ph, c):
    if 'src' in ph:
        return f'<div class="ph"><img src="{BASE}{ph["src"]}"></div>'
    m = ph['mock']
    ne = f'<div class="m-ne">{html.escape(m["ne"])}</div>' if m.get('ne') else '<div class="m-orn"></div>'
    return f'''<div class="ph"><div class="mock">{ne}<div class="m-kick">{html.escape(m["kick"])}</div><div class="m-name">{html.escape(m["name"])}</div>
      <div class="m-rule"></div><div class="m-when">{html.escape(m["when"])}</div><div class="m-where">{html.escape(m["where"])}</div><div class="m-btn">RSVP</div></div></div>'''

def page(it):
    c = PAL[it['market']]
    ne = f' <span class="ne">{html.escape(it["ne"])}</span>' if it.get('ne') else ''
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: 'IS'; src: url({BASE}/site/fonts/instrument-serif-latin.woff2) format('woff2'); }}
@font-face {{ font-family: 'IS'; font-style: italic; src: url({BASE}/site/fonts/instrument-serif-italic-latin.woff2) format('woff2'); }}
@font-face {{ font-family: 'TD'; src: url({BASE}/site/fonts/tiro-deva.woff2) format('woff2'); }}
@font-face {{ font-family: 'G'; src: url({BASE}/site/fonts/geist-latin.woff2) format('woff2'); font-weight: 100 900; }}
* {{ box-sizing: border-box; margin: 0; }}
body {{ width: 1200px; height: 630px; overflow: hidden; background: #fff; font-family: 'G', 'Segoe UI', sans-serif; color: {c['ink']}; }}
.l {{ position: absolute; left: 72px; top: 64px; width: 600px; height: 502px; display: flex; flex-direction: column; }}
.logo {{ height: 40px; width: auto; align-self: flex-start; }}
.eb {{ margin-top: 64px; font-size: 18px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; color: {c['accent']}; }}
.ne {{ letter-spacing: 0; text-transform: none; font-family: 'TD', 'Nirmala UI', serif; }}
h1 {{ margin-top: 18px; font: 400 64px/1.02 'IS', Georgia, serif; letter-spacing: -.02em; }}
h1 i {{ color: {c['accent']}; }}
.sub {{ margin-top: 22px; font-size: 22px; color: {c['ink2']}; }}
.foot {{ margin-top: auto; display: flex; align-items: center; gap: 14px; font-size: 19px; color: {c['ink2']}; }}
.foot b {{ color: {c['ink']}; font-weight: 600; }}
.foot::before {{ content: ''; width: 44px; height: 2px; background: {c['accent']}; }}
.r {{ position: absolute; right: 0; top: 0; width: 500px; height: 630px; background: {c['soft']}; overflow: hidden; }}
.r::before {{ content: ''; position: absolute; width: 640px; height: 640px; border-radius: 50%; left: -70px; top: 40px; background: radial-gradient(circle, #fff 0 45%, {c['soft2']} 100%); opacity: .9; }}
.ph {{ position: absolute; left: 115px; top: 50px; width: 270px; height: 584px; border-radius: 42px; background: {c['night']}; padding: 8px; box-shadow: 0 30px 60px -30px rgba(0,0,0,.45); }}
.ph img {{ width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: 34px; display: block; }}
.mock {{ width: 100%; height: 100%; border-radius: 34px; background: radial-gradient(120% 70% at 50% 0%, #fff 0%, {c['soft']} 60%, {c['soft2']} 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; padding: 30px; position: relative; }}
.mock::before {{ content: ''; position: absolute; inset: 14px; border: 1px solid {c['soft2']}; border-radius: 26px; }}
.m-ne {{ font: 400 34px/1.3 'TD', 'Nirmala UI', serif; color: {c['accent']}; }}
.m-orn {{ width: 48px; height: 48px; border-radius: 50%; border: 1px solid {c['soft2']}; background: radial-gradient(circle, {c['soft2']} 0 30%, transparent 31%); }}
.m-kick {{ font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: {c['ink2']}; max-width: 200px; }}
.m-name {{ font: 400 34px/1.05 'IS', Georgia, serif; }}
.m-rule {{ width: 50px; height: 1px; background: {c['soft2']}; }}
.m-when {{ font-size: 14px; font-weight: 500; }}
.m-where {{ font-size: 13px; color: {c['ink2']}; }}
.m-btn {{ margin-top: 10px; padding: 10px 26px; border-radius: 999px; background: {c['accent']}; color: #fff; font-size: 13px; font-weight: 600; letter-spacing: .08em; }}
</style></head><body>
<div class="l"><img class="logo" src="{BASE}/site/brand/nimtto-logo.svg"><p class="eb">{html.escape(it['eyebrow'])}{ne}</p><h1>{it['h1']}</h1><p class="sub">{html.escape(it['sub'] if not it.get('custom') else ('Designed for your occasion · from $199' if it['market']=='intl' else 'Designed for your family · from Rs 11,111'))}</p>
<p class="foot"><b>nimtto.com{'/international' if it['market']=='intl' else ''}</b>{html.escape(it['foot'])}</p></div>
<div class="r">{phone_html(it['phone'], c)}</div></body></html>'''

with sync_playwright() as p:
    b = p.chromium.launch(executable_path=EXE) if EXE else p.chromium.launch()
    pg = b.new_page(viewport={'width': 1200, 'height': 630})
    pg.goto(BASE + '/robots.txt')  # same origin as the art (the server sends Cross-Origin-Resource-Policy)
    for it in items:
        pg.set_content(page(it), wait_until='networkidle')
        pg.wait_for_timeout(150)
        pg.screenshot(path=os.path.join(OUTDIR, f'{it["img"]}.jpg'), type='jpeg', quality=86)
    b.close()
print('og images:', len(items))
