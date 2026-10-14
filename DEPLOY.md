# Deploying Nimtto (nimtto.com) with Coolify

One Docker container serves the themes, the studio and the API. Coolify builds it straight from
this GitHub repository using the `Dockerfile` in the root.

## 1 · DNS (Cloudflare)

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `nimtto.com` | your Hostinger VPS IP | Proxied (orange) |
| CNAME | `www` | `nimtto.com` | Proxied |

SSL/TLS mode: **Full (strict)**. Coolify issues the origin certificate.

## 2 · Coolify application

- **New resource → Public repository:** `https://github.com/Ujjwal-Gits/wedding-invitation`, branch `main`
- **Build pack:** Dockerfile. **Port:** `8787`
- **Domains:** `https://nimtto.com,https://www.nimtto.com`
- **Persistent storage** (both are required, or every invitation and reply is lost on redeploy):
  - `/app/server/data`, which holds invitations, replies and sessions
  - `/app/server/uploads`, which holds the couples' photos and music
- **Health check path:** `/healthz`

### Environment variables

| Name | Value |
|---|---|
| `ADMIN_EMAIL` | the owner's sign-in email |
| `ADMIN_PASSWORD_HASH` | argon2id hash (see below). Mark it as a secret |
| `PUBLIC_ORIGIN` | `https://nimtto.com,https://www.nimtto.com` |
| `TRUST_PROXY` | `2` (Cloudflare → Coolify proxy → app) |
| `NODE_ENV` | `production` |

Make the password hash on your own machine. The password is read from stdin and never stored:

```bash
cd server && printf '%s' 'a-long-new-password' | npm run --silent hash-password -- --raw
```

## 3 · After the first deploy

1. Open `https://nimtto.com/studio/`, sign in, and check that an invitation opens at
   `https://nimtto.com/<theme>/?id=<slug>`.
2. Copy the existing invitations across: copy `server/data/` and `server/uploads/` from this machine
   into the two Coolify volumes (Coolify → Storage → the volume path on the server, then `scp`).
3. Back up both volumes regularly (Coolify → Backups, or a nightly `tar` of the two folders).
4. Run the security checklist before sharing links.
