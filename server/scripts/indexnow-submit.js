// Sends URLs to IndexNow by hand (Bing, Yandex, Seznam, Naver). The live site must already serve the key file
// (https://nimtto.com/<key>.txt, public/<key>.txt). The server does this by itself after each deploy
// (lib/indexnow.js submitChangedOnBoot); use this for a first full submit or to resend.
//   node server/scripts/indexnow-submit.js --all [--since 2026-10-01] [--dry-run]   every sitemap URL (changed since)
//   node server/scripts/indexnow-submit.js /about/ /blog/first-post/                  these pages
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { submitUrls, sitemapEntries, publicUrls, SITE_ORIGIN, INDEXNOW_KEY } from '../lib/indexnow.js';

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const since = args.includes('--since') ? args[args.indexOf('--since') + 1] : '';
const root = resolve(import.meta.dirname, '..', '..');
const dir = existsSync(resolve(root, 'dist', 'sitemap.xml')) ? resolve(root, 'dist') : resolve(root, 'public');

let urls = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--since');
if (flag('--all')) urls = sitemapEntries(dir).filter((e) => !since || e.lastmod >= since).map((e) => e.url);
const list = publicUrls(urls);
if (!list.length) { console.error('Nothing to send. Give page paths, or --all.'); process.exit(1); }
console.log(`${list.length} URL(s) for ${SITE_ORIGIN} (key ${INDEXNOW_KEY})`);
if (flag('--dry-run')) { console.log(list.join('\n')); process.exit(0); }
const r = await submitUrls(list, { force: true });
console.log(JSON.stringify(r));
process.exit(r.ok ? 0 : 1);
