# TripMate v3

A simple personal travel planner: sign in with Google, create trips, and save day-by-day itineraries in Cloudflare D1.

## Architecture

```
React SPA (Vite)
       ↓
Cloudflare Worker (Hono) — /auth/*, /api/*
       ↓
Cloudflare D1 (SQLite)
```

## Database schema

- **users** — Google identity (`google_id`, `email`, `name`, `avatar_url`)
- **trips** — owned by `user_id` (FK → users, cascade delete)
- **itinerary_days** — owned via `trip_id` (FK → trips, cascade delete), unique `(trip_id, day_number)`

Migrations live in [`migrations/`](migrations/).

## Prerequisites

- Node.js 20+
- Cloudflare account
- Google Cloud OAuth client (Web application)

## 1. Create the D1 database

```bash
npx wrangler d1 create tripmate-db
```

Copy the returned `database_id` into [`wrangler.jsonc`](wrangler.jsonc) (`d1_databases[0].database_id`).

## 2. Apply migrations

**Local (development):**

```bash
npm run db:migrate:local
```

**Production (remote):**

```bash
npm run db:migrate:remote
```

## 3. Google OAuth setup

1. Open [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create **OAuth client ID** → **Web application**.
3. **Authorized redirect URIs:**
   - Local: `http://localhost:5173/auth/google/callback` (must match `APP_URL`)
   - Production: `https://tripmate.techsavyy.com/auth/google/callback` (or your custom domain + `/auth/google/callback`)
4. Copy **Client ID** and **Client secret**.

## 3b. Google Places (location autocomplete)

Used on **Create / Edit Trip** for starting location and destination suggestions.

1. In Google Cloud Console, enable **Places API (New)** for the same project (or a dedicated project).
2. Create an **API key** restricted for browser use:
   - **Application restrictions:** HTTP referrers (e.g. `http://localhost:5173/*`, your production origin `https://tripmate.techsavyy.com/*`).
   - **API restrictions:** Places API (New) only.
3. Add `VITE_GOOGLE_PLACES_API_KEY` to `.dev.vars` (local) or your build environment (production). Do not commit the key.

## 4. Environment variables / secrets

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret (server only) |
| `SESSION_SECRET` | Random string, 32+ characters (signs session cookies) |
| `APP_URL` | Public app origin, no trailing slash (e.g. `http://localhost:5173`) |
| `VITE_GOOGLE_PLACES_API_KEY` | Browser key for Google Places API (New) autocomplete (HTTP referrer–restricted) |

**Local:** copy [`.env.example`](.env.example) to `.dev.vars` in the project root (gitignored). Include `VITE_GOOGLE_PLACES_API_KEY` there; Vite reads `VITE_*` values from `.dev.vars` during `npm run dev` and `npm run build`.

**Production:**

```bash
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
```

Set non-secret vars in `wrangler.jsonc` under `vars`, or use secrets for all four if you prefer.

## 5. Local development

```bash
npm install
npm run db:migrate:local
# configure .dev.vars
npm run dev
```

Open the URL Vite prints (typically `http://localhost:5173`).

## 6. Sample Kerala trip (dev)

After signing in once locally (so a row exists in `users`):

```bash
SEED_USER_EMAIL=you@gmail.com npm run db:seed
```

This inserts the **Kerala Anniversary Trip** and eight itinerary days into **local** D1 only.

## 7. Deploy to Cloudflare

```bash
npm run deploy
npm run db:migrate:remote
```

Configure the same secrets and `APP_URL` for your production URL before testing OAuth in production.

For production autocomplete, set `VITE_GOOGLE_PLACES_API_KEY` in the environment when running `npm run build` (Vite inlines `VITE_*` variables at build time).

**Production:** `https://tripmate.techsavyy.com` — set `APP_URL` to this origin (no trailing slash). Google redirect URI: `https://tripmate.techsavyy.com/auth/google/callback`.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite + Worker local dev |
| `npm run build` | Production build |
| `npm run deploy` | Build and `wrangler deploy` |
| `npm run db:migrate:local` | Apply migrations to local D1 |
| `npm run db:migrate:remote` | Apply migrations to remote D1 |
| `npm run db:seed` | Seed sample Kerala trip (local) |
| `npm run cf:types` | Generate Wrangler TypeScript bindings |

## Acceptance flow

1. **Continue with Google** on the landing page  
2. **My Trips** — list, delete, **+ New Trip**  
3. **Create trip** — saves to D1 and opens itinerary (empty day rows for each date in range)  
4. **Edit days** — modal saves to D1 via `PATCH /api/trips/:id/days/:dayId`  
5. Sign out from **Account**

## Security notes

- Session user id comes from the signed HttpOnly cookie only; API routes never trust client-supplied `user_id`.
- Trip and day queries always scope by the authenticated user.
- All SQL uses prepared statements.
