# Nimtto: themes + studio API in one container (Coolify / any Docker host). Runbook: docs/OPERATIONS.md.
# Persistent data: mount volumes at /app/server/data (database, sessions, backups) and /app/server/uploads (photos).
# Required env: ADMIN_EMAIL, ADMIN_PASSWORD_HASH, PUBLIC_ORIGIN (https://your-domain), TRUST_PROXY=2.

# ── 1 · build the static site, then brotli/gzip it once (the server sends the .br/.gz files as they are) ──
FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev   # build tools are devDependencies; Coolify sets NODE_ENV=production at build time
COPY . .
RUN npm run build && node server/scripts/compress-dist.js dist

# ── 2 · server dependencies (native argon2 / sharp / better-sqlite3 prebuilds for linux) ──
FROM node:22-bookworm-slim AS deps
WORKDIR /app/server
# Only used if a native prebuild cannot be downloaded (better-sqlite3 then compiles); never in the final image.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# ── 3 · runtime ──
FROM node:22-bookworm-slim
# UV_THREADPOOL_SIZE: file reads, argon2 and photo encoding share libuv's pool (default 4); 16 keeps static files
# flowing while photos are processed.
ENV NODE_ENV=production PORT=8787 DEPTH_ENABLED=0 UV_THREADPOOL_SIZE=16
WORKDIR /app
COPY --from=web /app/dist ./dist
COPY --from=web /app/src ./src
COPY --from=deps /app/server/node_modules ./server/node_modules
# the server reuses src/core/i18n.js (B.S. dates), which needs this one front-end package
COPY --from=web /app/node_modules/nepali-date-converter ./node_modules/nepali-date-converter
COPY server/package.json server/index.js ./server/
COPY server/lib ./server/lib
COPY server/scripts ./server/scripts
RUN mkdir -p server/data server/uploads && chown -R node:node server/data server/uploads
USER node
EXPOSE 8787
# 200 while the database answers and the server is not shutting down (not tied to load: see server/index.js).
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:8787/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# A heap ceiling well inside the container's memory limit (set 1 GB in Coolify); photos are processed outside it.
# SIGTERM (Coolify stop / redeploy) finishes requests in flight, then closes the database cleanly.
STOPSIGNAL SIGTERM
CMD ["node", "--max-old-space-size=512", "server/index.js", "--production"]
