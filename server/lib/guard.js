// Staying up under load: back-pressure, overload shedding, per-IP limits for every request, bounded queues for the
// expensive work (argon2, photo processing), request timing logs. Everything here is in memory (one process).
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { verify as argonVerify, hash as argonHash } from '@node-rs/argon2';
import { rateLimiter, clientIp } from './security.js';
import { IS_PROD } from './env.js';

const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
const env = process.env;

/** A 503 the error handler passes on with Retry-After (seconds). */
export const busyError = (message, retryAfter = 5) => Object.assign(new Error(message), { status: 503, expose: true, retryAfter });

/**
 * At most `max` tasks at once; up to `queue` more wait their turn; beyond that, a 503 straight away instead of
 * an ever-growing backlog. run(fn) resolves with fn's result.
 */
export function limiter({ max, queue, name }) {
  let active = 0;
  const waiting = [];
  const stats = { name, max, queue, active: () => active, waiting: () => waiting.length, rejected: 0 };
  async function run(fn) {
    if (active >= max) {
      if (waiting.length >= queue) {
        stats.rejected += 1;
        throw busyError('The server is busy. Please try again in a few seconds.', 5);
      }
      await new Promise((r) => waiting.push(r));
    }
    active += 1;
    try { return await fn(); } finally { active -= 1; waiting.shift()?.(); }
  }
  return { run, stats };
}

// ── argon2: each check takes ~20-60 ms and 19 MB on a libuv thread. Capped, so a burst of sign-in attempts can
// never take every thread (static files and the database use them too) or all the memory.
const argonGate = limiter({ max: num(env.ARGON_CONCURRENCY, 2), queue: num(env.ARGON_QUEUE, 32), name: 'argon2' });
let verifyMs = 40; // running average of real verifications, for mimicVerify
export const verifyPassword = (hash, password) => argonGate.run(async () => {
  const t = performance.now();
  try { return await argonVerify(hash, password); } finally { verifyMs = verifyMs * 0.8 + (performance.now() - t) * 0.2; }
});
export const hashPassword = (password, opts) => argonGate.run(() => argonHash(password, opts));
/**
 * Waits about as long as a real password check, without doing one. For couple links whose token matches nothing:
 * a token is 256 random bits, so the timing must only look the same, and it must cost no CPU (a flood of made-up
 * tokens would otherwise keep every core busy hashing).
 */
export const mimicVerify = () => new Promise((r) => setTimeout(r, verifyMs * (0.85 + Math.random() * 0.3)));

// ── Event-loop delay: the best single signal that the process is overloaded.
const eld = monitorEventLoopDelay({ resolution: 10 });
eld.enable();
let lagMs = 0;
let prevLagMs = 0;
setInterval(() => { prevLagMs = lagMs; lagMs = eld.percentile(99) / 1e6; eld.reset(); }, 1000).unref();
export const loopLagMs = () => lagMs;
/** Forget start-up work (imports, the store opening) so it does not count as load. */
export const resetLag = () => { eld.reset(); lagMs = 0; prevLagMs = 0; };
const SHED_LAG_MS = num(env.SHED_LAG_MS, 400);
/**
 * True while the event loop has been badly behind for two seconds in a row (one slow second, a GC pause, does not
 * count): expensive, non-essential work is refused until it recovers.
 */
export const overloaded = () => lagMs > SHED_LAG_MS && prevLagMs > SHED_LAG_MS;

// ── Requests in flight, a per-IP budget for everything, slow-request and error logging.
const MAX_INFLIGHT = num(env.MAX_INFLIGHT, 512);
// Generous: guests on one mobile carrier can share an IP (CGNAT), and Cloudflare serves most static files itself.
// (Development: ten times higher, since every tab, test and agent shares localhost.)
const devX = IS_PROD ? 1 : 10;
const perIp = rateLimiter({ windowMs: 60_000, max: num(env.RATE_PER_IP_PER_MIN, 3000) * devX, maxKeys: 200_000 });
const perIpApi = rateLimiter({ windowMs: 60_000, max: num(env.RATE_API_PER_IP_PER_MIN, 1200) * devX, maxKeys: 200_000 });
let inflight = 0;
export const inflightNow = () => inflight;
const SLOW_MS = num(env.SLOW_REQUEST_MS, 1500);
const noisy = rateLimiter({ windowMs: 60_000, max: 1, maxKeys: 10_000 }); // one 429/503 log line per IP per minute

export function trafficGuard(req, res, next) {
  if (req.path === '/healthz') return next();
  const ip = clientIp(req);
  const t0 = performance.now();
  const refuse = (status, retryAfter, error) => {
    if (noisy.hit(`${status}:${ip}`).ok) console.warn(`[guard] ${status} ip=${ip} ${req.method} ${req.path.slice(0, 80)} inflight=${inflight} lag=${Math.round(lagMs)}ms`);
    res.set('Retry-After', String(retryAfter));
    res.set('Cache-Control', 'no-store');
    return req.path.startsWith('/api/') ? res.status(status).json({ error }) : res.status(status).type('text/plain').send(error);
  };
  const a = perIp.hit(ip);
  if (!a.ok) return refuse(429, a.retryAfter, 'Too many requests. Please wait a moment and try again.');
  if (req.path.startsWith('/api/')) {
    const b = perIpApi.hit(ip);
    if (!b.ok) return refuse(429, b.retryAfter, 'Too many requests. Please wait a moment and try again.');
  }
  if (inflight >= MAX_INFLIGHT) return refuse(503, 3, 'The server is busy. Please try again in a few seconds.');
  inflight += 1;
  let done = false;
  const end = () => {
    if (done) return;
    done = true;
    inflight -= 1;
    const ms = performance.now() - t0;
    if (ms > SLOW_MS || res.statusCode >= 500) {
      console.warn(`[http] ${res.statusCode} ${req.method} ${req.path.slice(0, 120)} ms=${Math.round(ms)} lag=${Math.round(lagMs)}ms`);
    }
  };
  res.on('finish', end);
  res.on('close', end);
  next();
}

/** Route guard: refuses expensive work (sign-in, uploads, admin lists) while the process is overloaded. */
export function shedWhenOverloaded(req, res, next) {
  if (!overloaded()) return next();
  res.set('Retry-After', '5');
  return res.status(503).json({ error: 'The server is busy. Please try again in a few seconds.' });
}

export const guardStats = () => ({ inflight, lagMs: Math.round(lagMs), argon2: { active: argonGate.stats.active(), waiting: argonGate.stats.waiting(), rejected: argonGate.stats.rejected } });
