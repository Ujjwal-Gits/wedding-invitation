// Build step: writes <file>.br (brotli 11) and <file>.gz (gzip 9) next to every compressible file in dist/, so the
// server sends them as they are (lib/static.js) instead of compressing on each request.
//   node server/scripts/compress-dist.js [dist]      (the Dockerfile runs it after `npm run build`)
// A variant is kept only when it is at least 10% smaller. Old variants are removed first, so it can be re-run.
import { readdirSync, statSync, rmSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { brotliCompress, gzip, constants as Z } from 'node:zlib';
import { promisify } from 'node:util';
import { availableParallelism } from 'node:os';

const br = promisify(brotliCompress);
const gz = promisify(gzip);
const dist = resolve(process.argv[2] || resolve(import.meta.dirname, '..', '..', 'dist'));
const COMPRESSIBLE = /\.(?:js|mjs|css|html?|svg|json|webmanifest|txt|xml|wasm|glb|gltf|hdr|bin|obj|ico|map)$/i;

const files = [];
(function walk(dir) {
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    const p = resolve(dir, d.name);
    if (d.isDirectory()) walk(p);
    else if (/\.(br|gz)$/.test(d.name)) rmSync(p);
    else if (COMPRESSIBLE.test(d.name) && statSync(p).size >= 1024) files.push(p);
  }
}(dist));

let before = 0;
let afterBr = 0;
let made = 0;
const t0 = Date.now();
const queue = [...files];
async function worker() {
  for (let f = queue.shift(); f; f = queue.shift()) {
    const buf = await readFile(f);
    const [b, g] = await Promise.all([
      br(buf, { params: { [Z.BROTLI_PARAM_QUALITY]: buf.length > 8 * 2 ** 20 ? 9 : 11, [Z.BROTLI_PARAM_SIZE_HINT]: buf.length } }),
      gz(buf, { level: 9 }),
    ]);
    before += buf.length;
    afterBr += Math.min(b.length, buf.length);
    if (b.length <= buf.length * 0.9) { await writeFile(`${f}.br`, b); made++; }
    if (g.length <= buf.length * 0.9) { await writeFile(`${f}.gz`, g); made++; }
  }
}
await Promise.all(Array.from({ length: Math.max(2, availableParallelism()) }, worker));
console.log(`compress-dist: ${files.length} files, ${(before / 2 ** 20).toFixed(1)} MB -> ${(afterBr / 2 ** 20).toFixed(1)} MB with brotli; ${made} variants in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
