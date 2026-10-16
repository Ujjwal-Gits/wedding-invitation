// Ready-made response bodies for hot JSON/HTML: serialised once, with an ETag (304 on If-None-Match) and brotli /
// gzip variants made on first use. Cache entries are keyed by the data's revision by their callers.
import { createHash } from 'node:crypto';
import { brotliCompressSync, gzipSync, constants as Z } from 'node:zlib';

/** An entity for `body` (string or Buffer) of `type`. */
export function entity(body, type) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  return { buf, type, etag: `"${createHash('sha1').update(buf).digest('base64url').slice(0, 22)}"`, br: null, gz: null };
}

/** The content codings an Accept-Encoding header allows (q=0 means "not this one"). */
export function acceptedEncodings(header) {
  const ok = new Set();
  if (!header) return ok;
  for (const part of String(header).toLowerCase().split(',')) {
    const [name, ...params] = part.trim().split(';');
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    if (q && Number(q.slice(2)) === 0) continue;
    ok.add(name.trim());
  }
  return ok;
}

/** The best encoding the client accepts among br, gzip and identity. */
export function pickEncoding(header) {
  const ok = acceptedEncodings(header);
  if (ok.has('br')) return 'br';
  if (ok.has('gzip')) return 'gzip';
  return 'identity';
}

/** True when the request's If-None-Match names this ETag (weak or strong). */
export function fresh(req, etag) {
  const inm = req.headers['if-none-match'];
  if (!inm) return false;
  if (inm.trim() === '*') return true;
  return inm.split(',').some((t) => t.trim().replace(/^W\//, '') === etag);
}

/** Sends an entity: 304 when fresh, else the smallest accepted encoding. Cache-Control is the caller's. */
export function sendEntity(req, res, e, { status = 200 } = {}) {
  res.setHeader('ETag', e.etag);
  res.vary('Accept-Encoding');
  if (status === 200 && fresh(req, e.etag)) return res.status(304).end();
  let body = e.buf;
  const enc = e.buf.length >= 1024 ? pickEncoding(req.headers['accept-encoding']) : 'identity';
  if (enc === 'br') {
    e.br ??= brotliCompressSync(e.buf, { params: { [Z.BROTLI_PARAM_QUALITY]: 6, [Z.BROTLI_PARAM_SIZE_HINT]: e.buf.length } });
    body = e.br;
  } else if (enc === 'gzip') {
    e.gz ??= gzipSync(e.buf, { level: 6 });
    body = e.gz;
  }
  if (body !== e.buf) res.setHeader('Content-Encoding', enc);
  res.status(status);
  res.setHeader('Content-Type', e.type);
  res.setHeader('Content-Length', body.length);
  return req.method === 'HEAD' ? res.end() : res.end(body);
}

/** A small LRU of entities: get(key, rev) returns the cached one when rev matches. */
export function entityCache(max = 500) {
  const m = new Map();
  return {
    get(key, rev) {
      const hit = m.get(key);
      if (!hit || hit.rev !== rev) return null;
      m.delete(key);
      m.set(key, hit);
      return hit.e;
    },
    set(key, rev, e) {
      m.delete(key);
      m.set(key, { rev, e });
      if (m.size > max) m.delete(m.keys().next().value);
      return e;
    },
    clear() { m.clear(); },
  };
}
