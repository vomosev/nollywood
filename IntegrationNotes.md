# Integration Notes for nollywood

## Overview

**Nollywood** is a video distribution platform for Nigerian cinema. Visitors browse a curated catalogue of Nollywood films, filter by genre/year/language, read details and watch trailers or streams. Signed-in viewers keep a watchlist, track viewing history and post reviews.

The project ships as a **single repository with one root `package.json`** containing two runtimes:

| Tier | Technology | Public URL | Local port |
| --- | --- | --- | --- |
| Frontend | Next.js (App Router, JSX) | `https://nollywood.arx-app.com` | `4109` (dev & `next start`) |
| API | Express 4 + express-session | `https://nollywood-api.arx-app.com:50109` | `PORT` env var |
| Database | MySQL 8 via `mysql2/promise` | internal | `3306` |

```
Browser
  |
  |  HTTPS (fetch, credentials: 'include')
  v
Next.js App Router  ──────────────►  Express API  ──────────────►  MySQL 8
https://nollywood.arx-app.com        https://nollywood-api        users, movies,
(app/, components/, lib/)            .arx-app.com:50109           watchlist, reviews,
                                     (server/)                    watch_history, sessions
```

Key architectural decisions you should be aware of before integrating:

- **Auth is session-cookie based.** `express-session` + `express-mysql-session` persist sessions in the MySQL `sessions` table. The cookie is named `nollywood.sid` and is issued with `SameSite=None; Secure; Domain=.arx-app.com` so it is shared between `nollywood.arx-app.com` and `nollywood-api.arx-app.com`. Passwords are hashed with `bcryptjs` (10 rounds).
- **All browser→API calls go through `lib/api.js`**, which always sets `credentials: 'include'` and never executes at import time. No data fetching happens during `next build`; every page fetches inside `useEffect`.
- **Styling is one file.** `app/globals.css` is imported exactly once from `app/layout.jsx`. There are no CSS modules, no Tailwind, no inline style objects and no styled-components. All colours, spacing, radii, shadows and z-indices come from the `:root` token block.
- **No external image hosts.** Posters are deterministic CSS gradients derived from `movies.poster_hue`, plus inline SVG. `next.config.js` therefore declares no remote image domains.

## Prerequisites

- **Node.js 18.17+** (Node 20 LTS recommended — required by Next.js App Router).
- **npm 9+** (ships with Node 18/20).
- **MySQL 8.0+** reachable from the API host, with a database and user you can create tables in.
- **PM2** installed globally for production process management:
  ```bash
  npm install -g pm2
  ```
- **TLS material** if `SSL_ENABLED=true`: a certificate, a private key and optionally a CA bundle, readable by the process user. The deploy convention is:
  - `/home/arx-app/backends/certs/certificate.crt`
  - `/home/arx-app/backends/certs/private.key`
  - `/home/arx-app/backends/certs/ca_bundle.crt`
- DNS for `nollywood.arx-app.com` and `nollywood-api.arx-app.com`, with port `50109` open inbound for the API.

## Installation

```bash
# 1. Get the code onto the host
cd /home/arx-app/backends
git clone <your-remote> nollywood
cd nollywood

# 2. Install dependencies (single root package.json covers Next + Express)
npm install

# 3. Create your environment file from the documented template
cp .env.example .env
$EDITOR .env        # fill in DB_*, SESSION_SECRET, SSL_* values
```

Then create the schema and seed sample data. `server/db/seed.js` reads `schema.sql`, executes its statements one at a time through the pool, and then inserts ~18 Nollywood films, two demo users (admin + viewer) and a handful of reviews/watchlist rows. It is idempotent (`INSERT ... ON DUPLICATE KEY UPDATE` on `slug`/`email`), so it is safe to re-run.

```bash
# Option A — let the seeder apply schema.sql for you (recommended)
node server/db/seed.js

# Option B — apply the DDL manually first, then seed
mysql -h "$DB_HOST" -u "$DB_USER" -p "$DB_NAME" < schema.sql
node server/db/seed.js
```

`schema.sql` creates `users`, `movies`, `watchlist`, `reviews`, `watch_history` and the `express-mysql-session`-compatible `sessions` table (`session_id VARCHAR(128)` PK, `expires INT UNSIGNED`, `data MEDIUMTEXT`), all `utf8mb4`, with indexes on `movies(genre)`, `movies(release_year)` and `reviews(movie_id)`.

Verify the pool can connect before going further:

```bash
node -e "require('dotenv/config');require('./server/config/db').checkDatabaseConnection().then(ok=>console.log('db ok:',ok))"
```

## Environment Variables

Copy `.env.example` to `.env` and fill in real values. Never commit `.env`. The `NEXT_PUBLIC_*` variables are inlined into the client bundle at **build time** — change them and you must re-run `npm run build`.

| Variable | Description | Example |
| --- | --- | --- |
| `PORT` | Port the Express API binds to (assigned by the deploy script). Read in `server/index.js`; never hardcoded, never 3000. | `50109` |
| `NODE_ENV` | Node environment. When `production`, `server/middleware/errorHandler.js` hides stack traces. | `production` |
| `DB_HOST` | MySQL host name used by the `mysql2/promise` pool in `server/config/db.js`. | `db.internal.example.com` |
| `DB_USER` | MySQL user. | `nollywood_app` |
| `DB_PASSWORD` | MySQL password. | `your-secret-here` |
| `DB_NAME` | MySQL database name. | `nollywood` |
| `SESSION_SECRET` | Secret used to sign the session cookie (`server/config/session.js`). Use a long random string; rotating it invalidates all sessions. | `change-this-long-random-string` |
| `SESSION_COOKIE_DOMAIN` | Cookie domain so the session cookie is shared across `arx-app.com` subdomains. Must start with a dot. | `.arx-app.com` |
| `SSL_ENABLED` | Set to `'true'` to terminate TLS directly in the Express process; otherwise `server/index.js` falls back to `http.createServer(app)`. | `true` |
| `SSL_CERT_PATH` | Absolute path to the TLS certificate. | `/home/arx-app/backends/certs/certificate.crt` |
| `SSL_KEY_PATH` | Absolute path to the TLS private key. | `/home/arx-app/backends/certs/private.key` |
| `SSL_CA_PATH` | Optional absolute path to a CA bundle. | `/home/arx-app/backends/certs/ca_bundle.crt` |
| `NEXT_PUBLIC_API_BASE_URL` | Base URL the browser uses to reach the API. Consumed by `lib/api.js` as `API_BASE_URL`, with a fallback to the same value. | `https://nollywood-api.arx-app.com:50109` |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the frontend; used for `metadataBase` and canonical links. | `https://nollywood.arx-app.com` |

## Running the Application

### Local development

Run the API and the Next dev server in two terminals — the scripts block is intentionally minimal (no `concurrently`):

```bash
# Terminal 1 — Express API on $PORT
npm run server

# Terminal 2 — Next.js dev server on port 4109
npm run dev
```

Open `http://localhost:4109`. For local work, set `NEXT_PUBLIC_API_BASE_URL` to wherever your API is listening (e.g. `http://localhost:50109`), set `SSL_ENABLED=false`, and note that a cookie with `SameSite=None; Secure` will **not** be stored by the browser over plain `http://` on a non-localhost origin — keep both on `localhost` during development, or run the API behind local TLS.

Health checks (these never require auth):

```bash
curl -s https://nollywood-api.arx-app.com:50109/health      # {"status":"ok"}
curl -s https://nollywood-api.arx-app.com:50109/health/db   # {"status":"ok","database":true} or 503
```

### Production

`START.sh` is the one-shot deploy entrypoint. It loads `.env` if present, runs `npm install --omit=dev || npm install`, runs `npm run build` to produce the `.next` production build, launches the API in the background via `nohup node server/index.js > logs/api.log 2>&1 &`, then starts the Next.js production server under PM2 using `ecosystem.config.js`, and echoes both public URLs.

```bash
mkdir -p logs
chmod +x START.sh
./START.sh
```

Equivalent manual sequence:

```bash
npm install
npm run build
nohup node server/index.js > logs/api.log 2>&1 &
pm2 start ecosystem.config.js
pm2 save
pm2 startup          # print the systemd hook so PM2 survives reboot
```

Useful operational commands:

```bash
pm2 status
pm2 logs nollywood        # Next.js frontend logs
tail -f logs/api.log      # Express API logs
pm2 restart nollywood     # after a rebuild
```

> **Note on `ecosystem.config.js`:** it runs `node_modules/.bin/next start` with `cwd: /home/arx-app/backends/nollywood` and `env: { NODE_ENV: 'production', PORT: 50109 }`. If you deploy to a different absolute path, update `cwd` accordingly.

### API surface

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | — | Liveness, never touches the DB |
| `GET` | `/health/db` | — | Pool ping; `503` when degraded |
| `POST` | `/api/auth/signup` | — | Create viewer account (password min 8 chars) |
| `POST` | `/api/auth/login` | — | Sign in, sets `nollywood.sid` |
| `POST` | `/api/auth/logout` | — | Destroy session, clear cookie |
| `GET` | `/api/auth/session` | — | `{ user }` or `{ user: null }` |
| `GET` | `/api/movies` | optional | List with `q`, `genre`, `year`, `language`, `featured`, `sort`, `limit`, `offset` |
| `GET` | `/api/movies/filters` | — | Distinct genres / years / languages |
| `GET` | `/api/movies/:idOrSlug` | optional | Detail incl. avg rating and in-watchlist flag |
| `GET` | `/api/movies/:movieId/reviews` | — | Reviews newest-first + average |
| `POST` | `/api/movies/:movieId/reviews` | required | Upsert the caller's review (`rating` 1–5, `body` ≤1000 chars) |
| `GET` | `/api/watchlist` | required | Watchlist joined to movies |
| `POST` | `/api/watchlist` | required | Body `{ movieId }` |
| `DELETE` | `/api/watchlist/:movieId` | required | Remove entry |
| `GET` | `/api/history` | required | 25 most recent watch-history rows |
| `POST` | `/api/history` | required | Body `{ movieId, seconds }` |

## Project Structure

```
nollywood/
├── package.json              # single root manifest: dev / build / start / server
├── next.config.js            # reactStrictMode, poweredByHeader:false, security headers()
├── ecosystem.config.js       # PM2 app definition for the Next.js production server
├── START.sh                  # install → build → API in background → pm2 start
├── .env.example              # documented placeholder env file
├── schema.sql                # utf8mb4 DDL: users, movies, watchlist, reviews, watch_history, sessions
├── README.md                 # full project documentation & API reference
├── app/                      # Next.js App Router (JSX)
│   ├── globals.css           # THE single stylesheet — tokens, base type, layout, components
│   ├── layout.jsx            # imports globals.css once; AuthProvider + SiteHeader/main/SiteFooter
│   ├── page.jsx              # home: hero, Featured this week, Recently added
│   ├── not-found.jsx         # 404 via PageShell + EmptyState
│   ├── movies/page.jsx       # catalogue with FilterBar, debounced fetch, Load more
│   ├── movies/[id]/page.jsx  # detail: Poster, badges, VideoPlayer, watchlist toggle, ReviewList
│   ├── login/page.jsx        # AuthForm mode='login'
│   ├── signup/page.jsx       # AuthForm mode='signup'
│   ├── watchlist/page.jsx    # protected list with per-card remove
│   └── account/page.jsx      # profile card + watch-history Table + sign out
├── components/
│   ├── layout/               # SiteHeader, SiteFooter, PageShell
│   ├── ui/                   # Button, Field, Card, Modal, Table, Badge, Spinner, EmptyState
│   ├── movies/               # Poster, MovieCard, MovieGrid, FilterBar, VideoPlayer, ReviewList
│   ├── auth/AuthForm.jsx     # shared login/signup form
│   └── providers/AuthProvider.jsx  # { user, status, error } + login/signup/logout/refresh
├── lib/
│   ├── api.js                # fetch client, credentials:'include', ApiError
│   └── format.js             # formatRuntime/formatDate/formatRating/hueToGradient, etc.
└── server/
    ├── index.js              # entry: PORT, https when SSL_ENABLED, graceful shutdown
    ���── app.js                # express app: trust proxy, json, cors allowlist, session, routes
    ├── config/db.js          # mysql2/promise pool + checkDatabaseConnection
    ├── config/session.js     # express-session + express-mysql-session ('sessions' table)
    ├── middleware/           # auth.js (requireAuth/requireAdmin/attachUser), errorHandler.js
    ├── utils/validate.js     # isEmail, requireFields, clampInt, sanitiseText, HttpError
    ├── controllers/          # authController, moviesController, watchlistController, reviewsController
    ├── routes/               # health, auth, movies, reviews, watchlist + index.js aggregator
    └── db/seed.js            # applies schema.sql then inserts idempotent sample data
```

**UI conventions to preserve when extending:** every page is wrapped in `PageShell` so max-width, padding and vertical rhythm are identical; every list view renders explicit *loading* (skeletons with reserved `aspect-ratio: 2/3`), *error* (`EmptyState variant="error"` + Retry) and *empty* states; spacing is always `gap` on a flex/grid parent, never margins on children; `Modal` renders through `createPortal` into `document.body`; `overflow-wrap: break-word` is applied only to `.movie-card__title`, `.review__body` and user-name containers.

## Next Steps / Production Considerations

1. **Rotate secrets.** Generate a real `SESSION_SECRET` (`openssl rand -hex 48`) and a dedicated MySQL user with only `SELECT, INSERT, UPDATE, DELETE` on the `nollywood` schema. Remove or change the two demo accounts created by `server/db/seed.js` before going public.
2. **Re-check cross-subdomain cookies.** `server/app.js` sets `app.set('trust proxy', 1)`; if you place the API behind a reverse proxy, the proxy must forward `X-Forwarded-Proto: https` or `secure: true` cookies will be dropped. The CORS origin allowlist is the regex `/^https:\/\/([a-z0-9-]+\.)*arx-app\.com(:\d+)?$/` — widen it deliberately if you add another domain.
3. **Session table hygiene.** `express-mysql-session` prunes expired rows on an interval, but verify the `sessions` table is not growing unbounded and add a scheduled `DELETE FROM sessions WHERE expires < UNIX_TIMESTAMP()` if needed.
4. **Rate limiting and brute-force protection.** `POST /api/auth/login`, `/api/auth/signup` and review submission are currently unthrottled. Add `express-rate-limit` in `server/app.js` before the aggregate router, and consider a short lockout after repeated failed logins.
5. **Run the API under PM2 too.** `START.sh` backgrounds it with `nohup`, which will not restart it after a crash or reboot. Add a second app entry to `ecosystem.config.js` (`script: 'server/index.js'`, `env: { PORT: 50109 }`) so both tiers are supervised, then `pm2 save`.
6. **Certificate renewal.** If `SSL_ENABLED=true`, renewing the files at `SSL_CERT_PATH`/`SSL_KEY_PATH` requires an API restart to pick them up. Alternatively terminate TLS at a reverse proxy and set `SSL_ENABLED=false`.
7. **Database backups and migrations.** `schema.sql` is a create-from-scratch DDL, not a migration tool. Introduce a migration runner before the first schema change in production, and schedule `mysqldump` backups.
8. **Observability.** Replace the tiny request logger in `server/app.js` with structured logging, ship `logs/api.log` and `pm2 logs nollywood` to your aggregator, and wire `/health` + `/health/db` into your uptime monitor (`/health/db` returns `503` when the pool is unreachable, which is the correct signal for a load balancer).
9. **Streaming media.** `VideoPlayer` renders a native `<video>` only when `movie.stream_url` is set and otherwise shows the licensing fallback panel. For real distribution, front your assets with a CDN, use signed/expiring URLs, and consider HLS with `Range` support rather than a plain MP4 URL.
10. **Caching and performance.** Add `Cache-Control` headers to `GET /api/movies` and `GET /api/movies/filters`, and review the security headers in `next.config.js` (`headers()`) — a tightened `Content-Security-Policy` is straightforward here because there are no third-party scripts, fonts or image hosts.
11. **Accessibility and visual regression.** The design system already guarantees ≥44px hit areas, visible `:focus-visible` rings and `prefers-reduced-motion` handling; add an automated axe pass and a 360px-viewport check to CI so future components keep those properties.

## Database Provisioning

A mysql database has been automatically provisioned for this app.

- **Database:** app_nollywood
- **Host:** testdb.gridiron-app.com
- **Port:** 3306
- **User:** nollywood
- **Credentials stored in Vault at:** `secret/data/mysql/nollywood`

Retrieve the password securely from Vault and set it as an environment variable (e.g. `DB_PASSWORD`) in your deployment settings — do not commit it to source control.
