// Security headers, rate limiting, Origin checks, the real client IP behind Cloudflare.
import { BlockList, isIP } from 'node:net';
import { IS_PROD, PUBLIC_ORIGINS, CLOUDFLARE, CLOUDFLARE_ONLY } from './env.js';

/**
 * Fixed-window rate limiter kept in memory (one process). maxKeys bounds its memory: an attacker rotating
 * addresses (IPv6 makes that cheap) cannot grow it without limit; the oldest windows are dropped first.
 */
export function rateLimiter({ windowMs, max, maxKeys = 100_000 }) {
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
      if (!v || v.reset <= now) {
        if (v) hits.delete(key);
        else if (hits.size >= maxKeys) {
          for (const [k, x] of hits) if (x.reset <= now) hits.delete(k);
          if (hits.size >= maxKeys) { let n = Math.ceil(maxKeys / 10); for (const k of hits.keys()) { hits.delete(k); if (--n <= 0) break; } }
        }
        v = { n: 0, reset: now + windowMs };
        hits.set(key, v);
      }
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

// CF_WEB_ANALYTICS=1: Cloudflare Web Analytics (cookieless; docs/SEO-SETUP.md). Its beacon script and the endpoint it
// reports to are allowed; nothing else changes.
const CSP_WITH_ANALYTICS = PAGE_CSP
  .replace("script-src 'self'", "script-src 'self' https://static.cloudflareinsights.com")
  .replace("connect-src 'self'", "connect-src 'self' https://cloudflareinsights.com");
const pageCsp = () => (process.env.CF_WEB_ANALYTICS === '1' ? CSP_WITH_ANALYTICS : PAGE_CSP);

/**
 * Private areas: never indexed, whatever links to them (robots.txt also keeps crawlers out; the header covers the
 * crawlers that ignore it and any URL found before the rule). /uploads/ holds couples' photos, /i/ guests' link
 * previews, /go the How it works QR's redirect.
 */
export const PRIVATE_PATH = /^\/(?:api|studio|pay|i|preview|clients|uploads)(?:\/|$)|^\/(?:go|healthz)$/i;

/** Express middleware: headers for every response. */
export function securityHeaders(req, res, next) {
  const isApi = req.path.startsWith('/api/');
  if (PRIVATE_PATH.test(req.path)) res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', isApi ? 'DENY' : 'SAMEORIGIN');
  res.setHeader('Content-Security-Policy', isApi ? API_CSP : pageCsp());
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

// Cloudflare's edge addresses (https://www.cloudflare.com/ips/, unchanged since 2021). Requests whose last proxy
// hop is one of these carry the visitor's address in CF-Connecting-IP.
const CF_RANGES = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18', '108.162.192.0/18',
  '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
  '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
  '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32',
];
const PRIVATE_RANGES = ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '127.0.0.0/8', '100.64.0.0/10', '::1/128', 'fc00::/7', 'fe80::/10'];
const blockList = (ranges) => {
  const b = new BlockList();
  for (const r of ranges) { const [a, n] = r.split('/'); b.addSubnet(a, Number(n), a.includes(':') ? 'ipv6' : 'ipv4'); }
  return b;
};
const CF = blockList(CF_RANGES);
const PRIVATE = blockList(PRIVATE_RANGES);
const norm = (ip) => { const s = String(ip || '').trim(); return s.startsWith('::ffff:') && isIP(s.slice(7)) === 4 ? s.slice(7) : s; };
const inList = (list, ip) => { const v = isIP(ip); return v ? list.check(ip, v === 4 ? 'ipv4' : 'ipv6') : false; };

/**
 * True when the request reached us through Cloudflare: the socket is a Cloudflare address, or the socket is our own
 * proxy (a private address, e.g. Coolify's Traefik) and the hop that proxy saw (the last X-Forwarded-For entry,
 * which the client cannot forge) is a Cloudflare address.
 */
export function viaCloudflare(req) {
  const sock = norm(req.socket.remoteAddress);
  if (inList(CF, sock)) return true;
  if (!inList(PRIVATE, sock)) return false;
  const xff = String(req.headers['x-forwarded-for'] || '').split(',');
  const edge = norm(xff[xff.length - 1]);
  return Boolean(edge) && inList(CF, edge);
}

/**
 * The visitor's address. Behind Cloudflare: CF-Connecting-IP, trusted only when the request really came through
 * Cloudflare (above); otherwise Express's req.ip (TRUST_PROXY hops of X-Forwarded-For).
 */
export function clientIp(req) {
  if (req.clientIpCached) return req.clientIpCached;
  let ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (CLOUDFLARE) {
    const cf = req.headers['cf-connecting-ip'];
    if (typeof cf === 'string' && isIP(cf.trim()) && viaCloudflare(req)) ip = cf.trim();
  }
  req.clientIpCached = ip;
  return ip;
}

/**
 * CLOUDFLARE_ONLY=1: refuse requests that did not come through Cloudflare (someone reaching the server's own
 * address). The firewall should already do this; this is the second lock. The container's own health check
 * (from inside the container: loopback, no proxy headers) is let through.
 */
export function cloudflareOnly(req, res, next) {
  if (!CLOUDFLARE_ONLY || viaCloudflare(req)) return next();
  const sock = norm(req.socket.remoteAddress);
  if ((sock === '127.0.0.1' || sock === '::1') && !req.headers['x-forwarded-for'] && req.path === '/healthz') return next();
  res.set('Cache-Control', 'no-store');
  return res.status(403).type('text/plain').send('Forbidden');
}
