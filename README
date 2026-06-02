# EaglercraftX Hub

Community platform for browsing, sharing and discovering Eaglercraft clients, mods and skins.  
Built as a single Cloudflare Pages project — the React frontend and the API backend live together.

## Architecture

```
eaglercraft-hub/
└── frontend/
    ├── src/                  ← React + Vite app
    ├── functions/
    │   └── api/
    │       ├── [[route]].ts  ← Pages Function catch-all (the entire API)
    │       ├── _types.ts
    │       ├── _utils.ts
    │       ├── _auth.ts
    │       ├── _content.ts
    │       └── _users.ts
    └── wrangler.toml         ← KV bindings + secrets config
```

Every request to `/api/*` is handled by `functions/api/[[route]].ts`.  
Everything else is served as static React files.  
No separate Worker. One `wrangler pages deploy` deploys everything.

## KV Namespaces

| Binding | Purpose |
|---|---|
| `USERS` | User profiles, email→uid and provider→uid indexes |
| `SESSIONS` | HMAC-signed session tokens (30-day TTL) |
| `CONTENT` | Client / mod / skin entries |
| `CONTENT_INDEX` | Sorted id lists per `{type}:{category}` |

## Setup

### 1. Install

```bash
cd frontend
npm install
```

### 2. Create KV namespaces

```bash
npx wrangler kv namespace create USERS
npx wrangler kv namespace create SESSIONS
npx wrangler kv namespace create CONTENT
npx wrangler kv namespace create CONTENT_INDEX
```

Paste the returned IDs into `wrangler.toml`.

### 3. Set secrets

```bash
npx wrangler pages secret put GOOGLE_CLIENT_ID
npx wrangler pages secret put GOOGLE_CLIENT_SECRET
npx wrangler pages secret put GITHUB_CLIENT_ID
npx wrangler pages secret put GITHUB_CLIENT_SECRET
npx wrangler pages secret put SESSION_SECRET    # any random 32+ char string
```

### 4. OAuth redirect URIs

**Google Console** (`https://console.cloud.google.com/`):
- `https://<your-project>.pages.dev/api/auth/google/callback`
- `http://localhost:8788/api/auth/google/callback` (local dev)

**GitHub** (`https://github.com/settings/developers`):
- `https://<your-project>.pages.dev/api/auth/github/callback`
- `http://localhost:8788/api/auth/github/callback` (local dev)

### 5. Local development

```bash
# Terminal 1 — build React and run Pages dev server (serves Functions too)
cd frontend
npm run build
npx wrangler pages dev dist --compatibility-date=2024-11-01

# Terminal 2 — Vite dev server with HMR (proxies /api → wrangler)
cd frontend
npm run dev
```

Open `http://localhost:5173`.

### 6. Deploy

```bash
cd frontend
npm run deploy
# = npm run build + wrangler pages deploy dist
```

## Content categories

| Category | Who uploads | Visible to |
|---|---|---|
| `default` | Moderators / Admins (auto-approved) | Everyone |
| `user` | Logged-in users (pending approval) | Owner + Mods until approved |
| `archive` | Moved here by moderators | Moderators + Admins only |

## API routes (all under `/api`)

```
GET  /api/health

GET  /api/auth/google              → redirect to Google OAuth
GET  /api/auth/github              → redirect to GitHub OAuth
GET  /api/auth/google/callback     → OAuth callback
GET  /api/auth/github/callback     → OAuth callback
GET  /api/auth/me                  → current user
PATCH /api/auth/me                 → update name / bio / gravatarEmail
POST /api/auth/logout

GET  /api/users/:uid               → public profile

GET  /api/clients[?category&q&limit&offset]
POST /api/clients
GET  /api/clients/:id
PATCH /api/clients/:id
POST /api/clients/:id/archive
DELETE /api/clients/:id            (admin only)

(same for /api/mods and /api/skins)
```
