// Background depth maps for uploaded photos. One long-lived Python worker, one job at a time.
// Optional: when Python or the model is unavailable, uploads simply have no depth (flat on the stage).
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { cpus, setPriority, constants } from 'node:os';
import { DEPTH_ENABLED, DEPTH_PYTHON, SERVER_DIR } from './env.js';
import { uploadDir } from './store.js';

const queue = [];
let worker = null;
let busy = null; // current job
let failures = 0;
let onReady = () => {};

/** Called with (slug, id, depthUrl) when a map is written. */
export const onDepthReady = (fn) => { onReady = fn; };

export const depthPathFor = (slug, id) => resolve(uploadDir(slug), `${id}-depth.webp`);

const threads = Math.max(1, Math.floor(cpus().length / 2));

function startWorker() {
  if (worker || failures > 3) return;
  const proc = spawn(DEPTH_PYTHON, ['-I', resolve(SERVER_DIR, 'depth_worker.py')], {
    cwd: SERVER_DIR,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', HF_HUB_DISABLE_TELEMETRY: '1', TRANSFORMERS_VERBOSITY: 'error', OMP_NUM_THREADS: String(threads), MKL_NUM_THREADS: String(threads) },
  });
  // Background work: low CPU priority and half the cores, so uploads and page loads stay quick.
  try { setPriority(proc.pid, constants.priority.PRIORITY_LOW); } catch { /* not permitted */ }
  worker = { proc, ready: false };
  createInterface({ input: proc.stdout }).on('line', (line) => {
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    if (msg.ready) { worker.ready = true; console.info('[depth] worker ready'); pump(); return; }
    const job = busy;
    busy = null;
    if (job && msg.ok) {
      onReady(job.slug, job.id, `/uploads/${job.slug}/${job.id}-depth.webp`);
    } else if (job) {
      console.warn(`[depth] failed for ${job.slug}/${job.id}: ${msg.error}`);
    }
    pump();
  });
  proc.stderr.on('data', () => {}); // model download progress etc.
  proc.on('error', (err) => { console.warn(`[depth] cannot start python: ${err.message}`); });
  proc.on('exit', (code) => {
    if (code) failures += 1;
    if (busy) busy = null;
    worker = null;
    if (queue.length && failures <= 3) setTimeout(startWorker, 2000);
  });
}

function pump() {
  if (!worker?.ready || busy || !queue.length) return;
  busy = queue.shift();
  const src = resolve(uploadDir(busy.slug), `${busy.id}-lg.webp`);
  if (!existsSync(src)) { busy = null; pump(); return; }
  worker.proc.stdin.write(`${JSON.stringify({ src, out: depthPathFor(busy.slug, busy.id) })}\n`);
}

export function queueDepth(slug, id) {
  if (!DEPTH_ENABLED) return;
  queue.push({ slug, id });
  if (!worker) startWorker();
  else pump();
}

export const depthStatus = () => ({ enabled: DEPTH_ENABLED, queued: queue.length + (busy ? 1 : 0) });

export function stopDepth() {
  if (worker) worker.proc.kill();
}
