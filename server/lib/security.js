// Security headers, rate limiting, Origin checks.
import { IS_PROD, PUBLIC_ORIGINS } from './env.js';

/** Fixed-window rate limiter kept in memory (one process). */
export function rateLimiter({ windowMs, max }) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  }, Math.min(windowMs, 60_000));
  timer.unref();
  return {
    /** Counts one hit; returns { ok, retryAfter } (seconds). */
    hit(key) {
      const now = Date.now();
      let v = hits.get(key);
      if (!v || v.reset <= now) { v = { n: 0, reset: now + windowMs }; hits.set(key, v); }
      v.n += 1;
      return { ok: v.n <= max, retryAfter: Math.ceil((v.reset - now) / 1000) };
    },
    peek(key) {
      const v = hits.get(key);
      if (!v || v.reset <= Date.now()) return { ok: true, retryAfter: 0 };
      return { ok: v.n < max, retryAfter: Math.ceil((v.reset - Date.now()) / 1000) };
    },
    reset(key) { hits.delete(key); },
  };
}

const PAGE_CSP = [
  "default-src 'self'",
  // 'wasm-unsafe-eval' lets the 3D themes compile their mesh/texture decoders (WebAssembly only; JS eval stays blocked)
  // YouTube IFrame API (music.youtube): iframe_api + its widget script come from www.youtube.com
  "script-src 'self' 'wasm-unsafe-eval' https://www.youtube.com https://www.youtube-nocookie.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https: https://i.ytimg.com",
  "media-src 'self' blob:",
  // GLTFLoader reads embedded textures through blob: URLs; data: for inline buffers
  "connect-src 'self' blob: data:",
  "worker-src 'self' blob:",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://www.google.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";

/** Express middleware: headers for every response. */
export function securityHeaders(req, res, next) {
  const isApi = req.path.startsWith('/api/');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', isApi ? 'DENY' : 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', isApi ? API_CSP : PAGE_CSP);
  if (IS_PROD) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  if (isApi) res.setHeader('Cache-Control', 'no-store');
  next();
}

/** True when the request's Origin is this site (same host) or a configured public origin. */
export function originAllowed(req) {
  const origin = req.get('origin');
  if (!origin || origin === 'null') return false;
  let o;
  try { o = new URL(origin); } catch { return false; }
  if (PUBLIC_ORIGINS.includes(o.origin)) return true;
  // Development: the Vite servers (any localhost port) proxy here with changeOrigin, so Host differs.
  if (!IS_PROD && o.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(o.hostname)) return true;
  const host = req.get('x-forwarded-host') && req.app.get('trust proxy') ? req.get('x-forwarded-host') : req.get('host');
  return Boolean(host) && o.host === host;
}

export const clientIp = (req) => req.ip || req.socket.remoteAddress || 'unknown';
