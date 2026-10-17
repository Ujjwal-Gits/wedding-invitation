// Build step: serve a page's Google Fonts from our own origin, for pages that ask for it.
//
// A <link rel="stylesheet" href="https://fonts.googleapis.com/css2?..." data-self-host> is render-blocking and needs two
// more connections (fonts.googleapis.com for the CSS, fonts.gstatic.com for the files) before text can use its font.
// At build time this plugin fetches that CSS and its woff2 files once (cached in node_modules/.cache), writes the
// files to dist/assets/fonts/ (immutable; the same files Google serves) and puts the @font-face rules in the page
// itself. Same files, same unicode-range subsets, same font-display: the page looks exactly as before.
//
// Opt-in per page: it pays off where the first screen waits for its type (chitra's cover), not where the first screen
// is a large picture (fonts that arrive sooner share the phone's bandwidth with that picture sooner).
// data-preload="Family[:weight[:style]], ..." also preloads those faces' latin files.
//
// Offline or Google unreachable: the page keeps its original <link> (nothing breaks), and the build says so.
// KEEP_GOOGLE_FONTS=1 npm run build leaves every link as written.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const LINK_RE = /<link\b[^>]*\bdata-self-host\b[^>]*>/gi;
const HREF_RE = /href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/i;
const PRECONNECT_RE = /\s*<link\b[^>]*rel="preconnect"[^>]*href="https:\/\/fonts\.(?:googleapis|gstatic)\.com"[^>]*>/gi;
const FILE_RE = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g;

const short = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);

export default function googleFonts({ root, cacheDir = resolve(root, 'node_modules/.cache/google-fonts') } = {}) {
  let outDir = resolve(root, 'dist');
  const files = new Map(); // local file name -> cached copy
  const cssMemo = new Map(); // css url -> Promise<{ css, faces } | null>

  const cached = async (key, fetcher) => {
    const p = join(cacheDir, key);
    if (existsSync(p)) return readFileSync(p);
    const buf = await fetcher();
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(p, buf);
    return buf;
  };
  const get = async (url) => {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return Buffer.from(await res.arrayBuffer());
  };

  /** The @font-face rules pointing at /assets/fonts/, and the faces they describe (null: keep the Google link). */
  const localCss = (url) => {
    if (!cssMemo.has(url)) {
      cssMemo.set(url, (async () => {
        const css = (await cached(`css-${short(url)}.css`, () => get(url))).toString('utf8');
        const faces = [];
        let out = '';
        for (const rule of css.replace(/\/\*[^*]*\*\//g, '').match(/@font-face\s*{[^}]*}/g) || []) {
          const src = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/.exec(rule)?.[1];
          if (!src) throw new Error(`no woff2 in ${url}`);
          const family = /font-family:\s*'([^']+)'/.exec(rule)?.[1] || '';
          const name = `${family.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${src.split('/').slice(-2).join('-')}`;
          await cached(`f-${name}`, () => get(src));
          files.set(name, join(cacheDir, `f-${name}`));
          faces.push({
            family, name,
            weight: /font-weight:\s*([^;]+);/.exec(rule)?.[1].trim() || '400',
            style: /font-style:\s*([^;]+);/.exec(rule)?.[1].trim() || 'normal',
            latin: /unicode-range:[^;]*U\+0000-00FF/.test(rule),
          });
          out += `${rule.replace(FILE_RE, `url(/assets/fonts/${name})`).replace(/\s+/g, ' ')}\n`;
        }
        if (!faces.length) throw new Error(`no faces in ${url}`);
        return { css: out, faces };
      })().catch((err) => {
        console.warn(`[google-fonts] kept the Google link (${err.message})`);
        return null;
      }));
    }
    return cssMemo.get(url);
  };

  /** "Rozha One, Mukta:600" -> the latin faces to preload (a variable face's weight range counts for any weight). */
  const preloadsOf = (spec, faces) => spec.split(',').map((s) => s.trim()).filter(Boolean).flatMap((s) => {
    const [family, weight = '400', style = 'normal'] = s.split(':').map((x) => x.trim());
    return faces.filter((f) => f.family === family && f.latin && f.style === style && (f.weight === weight || f.weight.includes(' ')));
  });

  return {
    name: 'google-fonts-self-hosted',
    apply: (c, { command }) => command === 'build' && process.env.KEEP_GOOGLE_FONTS !== '1',
    configResolved(c) { outDir = resolve(c.root, c.build.outDir); },
    transformIndexHtml: {
      order: 'post',
      async handler(html) {
        let out = html;
        for (const [tag] of html.matchAll(LINK_RE)) {
          const href = HREF_RE.exec(tag)?.[1];
          const local = href ? await localCss(href.replace(/&amp;/g, '&')) : null;
          if (!local) continue;
          const spec = /data-preload="([^"]*)"/.exec(tag)?.[1];
          const preloads = spec ? preloadsOf(spec, local.faces).map((f) => `<link rel="preload" href="/assets/fonts/${f.name}" as="font" type="font/woff2" crossorigin />\n  `).join('') : '';
          out = out.replace(tag, () => `${preloads}<style data-fonts>\n${local.css}</style>`);
        }
        // no Google stylesheet left on the page: its preconnects would open connections for nothing
        if (out !== html && !/fonts\.googleapis\.com\/css/.test(out)) out = out.replace(PRECONNECT_RE, '');
        return out;
      },
    },
    closeBundle() {
      if (!files.size) return;
      const dir = resolve(outDir, 'assets', 'fonts');
      mkdirSync(dir, { recursive: true });
      for (const [name, src] of files) copyFileSync(src, join(dir, name));
    },
  };
}
