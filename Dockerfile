# Sayapatri: themes + studio API in one container (Coolify / any Docker host).
# Persistent data: mount volumes at /app/server/data and /app/server/uploads.
# Required env: ADMIN_EMAIL, ADMIN_PASSWORD_HASH, PUBLIC_ORIGIN (https://your-domain), TRUST_PROXY=1.

# ── 1 · build the static site ──
FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── 2 · server dependencies (native argon2 / sharp prebuilds for linux) ──
FROM node:22-bookworm-slim AS deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# ── 3 · runtime ──
FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=8787 DEPTH_ENABLED=0
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
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:8787/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/index.js", "--production"]
