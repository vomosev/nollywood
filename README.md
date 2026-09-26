# Nollywood — Stream the best of Nigerian cinema

Nollywood is a video distribution platform built around Nigerian cinema. Visitors browse a curated
catalogue of Nollywood films, filter by genre, year and language, read full details, watch trailers
or streams, and — once signed in — keep a watchlist, track their viewing history and post reviews.

- **Frontend:** https://nollywood.arx-app.com (Next.js App Router, port `4109` locally)
- **API:** https://nollywood-api.arx-app.com:50109 (Express + MySQL, session-cookie auth)

---

## Table of contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Database setup](#database-setup)
5. [Environment variables](#environment-variables)
6. [Local development](#local-development)
7. [Production deployment](#production-deployment)
8. [API reference](#api-reference)
9. [Project structure](#project-structure)
10. [Styling conventions](#styling-conventions)
11. [Troubleshooting](#troubleshooting)

---

## Features

### Catalogue & discovery
- Curated catalogue of Nollywood feature films with synopsis, director, cast, runtime, certificate
  and language metadata.
- Full-text style search across titles and synopses (`?q=`), plus filters for **genre**, **release
  year** and **language**.
- Sorting by `newest`, `title` or `year`, with offset/limit pagination and a "Load more" control.
- Featured rail ("Featured this week") and a "Recently added" rail on the home page.
- Deterministic, generated poster art: every film stores a `poster_hue` which is converted into a
  CSS gradient plus an inline SVG film-strip motif — no hotlinked or invented image URLs anywhere
  in the project.

### Viewing
- Native HTML5 player (`<video controls playsInline preload="metadata">`) in a reserved 16/9 box when
  a `stream_url` is present.
- Graceful, token-styled fallback panel — *"This title is not yet licensed for streaming in your
  region"* — when a title has no stream URL.
- Throttled progress reporting writes back to `watch_history` so users can see what they watched and
  how far they got.

### Accounts
- Email + password sign-up and sign-in, passwords hashed with `bcryptjs` (10 rounds).
- Server-side sessions persisted in MySQL through `express-mysql-session`, cookie name
  `nollywood.sid`, `httpOnly`, `secure`, `sameSite=none` and a shared `.arx-app.com` domain so the
  frontend and API subdomains share the session.
- Roles: `viewer` (default) and `admin`.

### Personalisation
- **Watchlist** — add/remove any title, listed newest-first.
- **Watch history** — the 25 most recent titles with progress and timestamps.
- **Reviews** — one review per user per film (1–5 stars + body text, upserted), with an average
  rating and review count surfaced on cards and detail pages.

### UX guarantees
- Every data-driven view renders explicit **loading**, **error**, **empty** and **unauthenticated**
  states — the UI never blanks out and never crashes when the API is unavailable.
- Skeletons reserve the exact final dimensions (posters use `aspect-ratio: 2 / 3`) so nothing
  reflows when data lands.
- Works down to a 360px viewport with no horizontal scrolling; all interactive controls keep a
  minimum 44px hit area and visible `:hover`, `:focus-visible`, `:active` and `:disabled` states.
- `prefers-reduced-motion: reduce` disables all transitions.

---

## Architecture

```
                         ┌──────────────────────────────────────────┐
                         │                Browser                   │
                         │  https://nollywood.arx-app.com           │
                         └───────────────┬──────────────────────────┘
                                         │
                       HTML / RSC payload│            fetch(credentials:'include')
                                         │                     │
                                         ▼                     ▼
        ┌────────────────────────────────────────┐   ┌──────────────────────────────────────┐
        │  Next.js App Router (frontend)         │   │  Express API (backend)               │
        │  pm2 process "nollywood"               │   │  node server/index.js                │
        │  next start -p 4109 (PORT 50109 prod)  │   │  https://nollywood-api.arx-app.com   │
        │                                        │   │            :50109                    │
        │  app/          routes & pages          │   │  server/app.js      cors + session   │
        │  components/   UI + movie primitives   │   │  server/routes/     route modules    │
        │  lib/api.js    HTTP client             │   │  server/controllers/ business logic  │
        │  lib/format.js pure formatters         │   │  server/middleware/ auth + errors    │
        │  app/globals.css  ← ALL styling        │   │  server/config/db.js  mysql2 pool    │
        └────────────────────────────────────────┘   └──────────────────┬───────────────────┘
                                                                        │ mysql2/promise pool
                                                                        ▼
                                                     ┌──────────────────────────────────────┐
                                                     │              MySQL 8                 │
                                                     │  users · movies · watchlist          │
                                                     │  reviews · watch_history · sessions  │
                                                     └──────────────────────────────────────┘
```

**Request flow (example: adding to a watchlist)**

1. The browser clicks "Add to watchlist" on `/movies/{slug}`.
2. `lib/api.js` issues `POST https://nollywood-api.arx-app.com:50109/api/watchlist` with
   `credentials: 'include'` and a JSON body `{ movieId }`.
3. Express CORS allows the origin (any `*.arx-app.com` over HTTPS) with `credentials: true`.
4. `express-session` reads `nollywood.sid`, loads the row from the `sessions` table and populates
   `req.session.userId`.
5. `requireAuth` passes, `watchlistController.addToWatchlist` runs an `INSERT IGNORE` against the
   `watchlist` table and responds `201 { ok: true }`.

**Key design decisions**

| Decision | Rationale |
| --- | --- |
| Single root `package.json` | Frontend and API ship as one deployable unit; one `npm install`. |
| Session cookies over JWT | Server-side revocation, `httpOnly` storage, shared subdomain cookie. |
| MySQL session store | Sessions survive restarts and are shared across processes. |
| Client-side data fetching in `useEffect` | Nothing hits the API during `next build`, so builds never fail because the API or DB is down. |
| Generated posters from `poster_hue` | Zero external image dependencies, deterministic art, no broken images. |
| One global stylesheet | Design tokens in `:root` guarantee consistent spacing, colour and rhythm. |

---

## Prerequisites

| Requirement | Version | Notes |
| --- | --- | --- |
| Node.js | >= 18.18 | Required by Next.js App Router. |
| npm | >= 9 | Ships with Node 18+. |
| MySQL | >= 8.0 (5.7 works) | Must support `utf8mb4`. |
| pm2 | latest | Only needed for production (`npm i -g pm2`). |
| TLS certificate | optional | Only when `SSL_ENABLED=true`. |

---

## Database setup

### 1. Create the database and user

```sql
CREATE DATABASE nollywood CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nollywood'@'localhost' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON nollywood.* TO 'nollywood'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Apply the schema

`schema.sql` contains all the DDL (utf8mb4, `CREATE TABLE IF NOT EXISTS`, indexes):

```bash
mysql -u nollywood -p nollywood < schema.sql
```

### 3. Seed sample data

The seed script reads `schema.sql`, executes each statement through the pool (so it is safe to run
on a fresh database), then inserts realistic Nollywood sample content. It is idempotent —
`INSERT ... ON DUPLICATE KEY UPDATE` keyed on `movies.slug` and `users.email`:

```bash
node server/db/seed.js
```

This creates:

- ~18 films spanning Drama, Comedy, Thriller, Romance, Epic and Family, released 2014–2024, with
  English, Yoruba, Igbo and Pidgin language tags and a mix of featured flags.
- Two demo accounts:

  | Role | Email | Password |
  | --- | --- | --- |
  | admin | `admin@nollywood.test` | `Nollywood2024!` |
  | viewer | `viewer@nollywood.test` | `Nollywood2024!` |

  > These are demo credentials for local development only. Change or delete them before exposing a
  > deployment publicly.
- A handful of reviews and watchlist rows so every screen has content on first load.

### Schema overview

| Table | Purpose | Key columns |
| --- | --- | --- |
| `users` | Accounts | `id`, `name`, `email` (UNIQUE), `password_hash`, `role` ENUM('viewer','admin'), `created_at` |
| `movies` | Catalogue | `id`, `slug` (UNIQUE), `title`, `synopsis`, `release_year`, `runtime_minutes`, `genre`, `language`, `rating_certificate`, `director`, `cast_list`, `poster_hue`, `stream_url`, `trailer_url`, `is_featured`, `created_at` |
| `watchlist` | Saved titles | `user_id` FK, `movie_id` FK, UNIQUE(`user_id`,`movie_id`), cascade delete |
| `reviews` | Ratings + text | `user_id` FK, `movie_id` FK, `rating` TINYINT 1–5, `body`, UNIQUE(`user_id`,`movie_id`) |
| `watch_history` | Playback progress | `user_id` FK, `movie_id` FK, `progress_seconds`, `watched_at` |
| `sessions` | express-mysql-session | `session_id` VARCHAR(128) PK, `expires` INT UNSIGNED, `data` MEDIUMTEXT |

Indexes exist on `movies(genre)`, `movies(release_year)` and `reviews(movie_id)`.

---

## Environment variables

Copy the example file and edit it — never commit a real `.env`:

```bash
cp .env.example .env
```

| Variable | Required | Example | Description |
| --- | --- | --- | --- |
| `PORT` | yes | `50109` | Port the Express API binds to. Assigned by the deploy script; never hardcoded. |
| `NODE_ENV` | yes | `production` | `development` or `production`. Hides stack traces when `production`. |
| `DB_HOST` | yes | `localhost` | MySQL host name. |
| `DB_USER` | yes | `nollywood` | MySQL user. |
| `DB_PASSWORD` | yes | `your-db-password` | MySQL password (placeholder in `.env.example`). |
| `DB_NAME` | yes | `nollywood` | MySQL database name. |
| `SESSION_SECRET` | yes | `replace-with-a-long-random-string` | Secret used to sign the session cookie. |
| `SESSION_COOKIE_DOMAIN` | no | `.arx-app.com` | Cookie domain so the session is shared across subdomains. Defaults to `.arx-app.com`. |
| `SSL_ENABLED` | no | `true` | `true` terminates TLS inside the Express process; anything else falls back to plain HTTP. |
| `SSL_CERT_PATH` | when SSL | `/home/arx-app/backends/certs/certificate.crt` | Absolute path to the TLS certificate. |
| `SSL_KEY_PATH` | when SSL | `/home/arx-app/backends/certs/private.key` | Absolute path to the TLS private key. |
| `SSL_CA_PATH` | no | `/home/arx-app/backends/certs/ca_bundle.crt` | Optional CA bundle. |
| `NEXT_PUBLIC_API_BASE_URL` | yes | `https://nollywood-api.arx-app.com:50109` | Base URL the browser uses to reach the API. Must be set at **build** time. |
| `NEXT_PUBLIC_SITE_URL` | yes | `https://nollywood.arx-app.com` | Public URL of the frontend. |

> Variables prefixed with `NEXT_PUBLIC_` are inlined into the client bundle at build time — only put
> non-secret values there.

---

## Local development

```bash
# 1. Install dependencies (single root package.json)
npm install

# 2. Configure the environment
cp .env.example .env
$EDITOR .env

# 3. Create the schema and seed data
mysql -u root -p < schema.sql        # or: mysql -u nollywood -p nollywood < schema.sql
node server/db/seed.js

# 4. Start the API (terminal 1)
npm run server
#    -> listening on http://0.0.0.0:$PORT

# 5. Start the Next.js dev server (terminal 2)
npm run dev
#    -> http://localhost:4109
```

### Scripts

| Script | Command | What it does |
| --- | --- | --- |
| `npm run dev` | `next dev -p 4109` | Next.js dev server with hot reload on port 4109. |
| `npm run build` | `next build` | Produces the optimised `.next` production build. |
| `npm start` | `next start -p 4109` | Serves the production build on port 4109. |
| `npm run server` | `node server/index.js` | Starts the Express API on `process.env.PORT`. |

### Local cookie note

The session cookie is configured with `secure: true` and `sameSite: 'none'`, which browsers only
accept over HTTPS. For plain-HTTP local development, either:

- run both processes behind a local HTTPS proxy, **or**
- temporarily relax `cookie.secure` / `cookie.sameSite` in `server/config/session.js` and unset
  `SESSION_COOKIE_DOMAIN` so the cookie defaults to `localhost`.

Everything except authenticated routes (catalogue, detail pages, reviews list, health) works fine
over plain HTTP without any change.

---

## Production deployment

### One-shot start script

```bash
chmod +x START.sh
./START.sh
```

`START.sh` will:

1. Load `.env` if present.
2. Run `npm install --omit=dev || npm install`.
3. Run `npm run build` to produce the `.next` production build.
4. Launch the Express API in the background: `nohup node server/index.js > logs/api.log 2>&1 &`.
5. Start the Next.js production server with pm2 using `ecosystem.config.js`.
6. Echo the public URLs:
   - Frontend — https://nollywood.arx-app.com
   - API — https://nollywood-api.arx-app.com:50109

### pm2

`ecosystem.config.js` defines the frontend process:

```js
module.exports = {
  apps: [{
    name: 'nollywood',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/home/arx-app/backends/nollywood',
    env: { NODE_ENV: 'production', PORT: 50109 }
  }]
};
```

Useful commands:

```bash
pm2 start ecosystem.config.js
pm2 restart nollywood
pm2 logs nollywood
pm2 status
tail -f logs/api.log      # Express API log
```

### TLS

When `SSL_ENABLED=true`, `server/index.js` reads the certificate/key (and optional CA bundle) from
`SSL_CERT_PATH`, `SSL_KEY_PATH` and `SSL_CA_PATH` and creates an `https` server. If SSL is disabled
or the files are missing it falls back to `http.createServer(app)` so the process always boots.

The API also awaits `checkDatabaseConnection()` at boot: an unreachable database logs a warning but
**does not** exit, and `GET /health` keeps returning `200` so process supervisors stay happy.

---

## API reference

**Base URL:** `https://nollywood-api.arx-app.com:50109`

All responses are JSON. All authenticated requests must be sent with `credentials: 'include'` so the
`nollywood.sid` cookie travels with them. Errors use the shape:

```json
{ "error": "Human readable message", "details": ["optional", "field", "names"] }
```

| Status | Meaning |
| --- | --- |
| `400` | Validation failure (missing/invalid fields). |
| `401` | `Authentication required` — no valid session. |
| `403` | Admin-only route. |
| `404` | `Route not found` or resource missing. |
| `409` | Conflict (e.g. email already registered). |
| `500` | Unexpected server error (stack hidden in production). |

### Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | — | Always `200 { "status": "ok" }`. Never touches the database. |
| `GET` | `/health/db` | — | `200 { "status":"ok", "database": true }` or `503 { "status":"degraded", "database": false }`. |

### Auth — `/api/auth`

| Method | Path | Auth | Body | Description |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | — | `{ name, email, password }` | Creates a viewer account. Password min 8 chars. `409` if the email exists. Returns `201 { user }`. |
| `POST` | `/api/auth/login` | — | `{ email, password }` | Verifies with bcrypt and starts a session. Returns `200 { user }` or `401`. |
| `POST` | `/api/auth/logout` | — | — | Destroys the session and clears the cookie. Returns `{ ok: true }`. |
| `GET` | `/api/auth/session` | — | — | Returns `{ user }` when signed in, otherwise `{ user: null }`. |

`user` shape: `{ id, name, email, role, created_at }` — the password hash is never returned.

```bash
curl -i -c cookies.txt -X POST https://nollywood-api.arx-app.com:50109/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"viewer@nollywood.test","password":"Nollywood2024!"}'
```

### Movies — `/api/movies`

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/movies` | optional | Paginated catalogue list. |
| `GET` | `/api/movies/filters` | — | `{ genres: [], years: [], languages: [] }` for the filter bar. |
| `GET` | `/api/movies/:idOrSlug` | optional | Single film by numeric id or slug. `404` when missing. |

**`GET /api/movies` query parameters**

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| `q` | string | — | Search title/synopsis. |
| `genre` | string | — | Exact genre match. |
| `year` | int | — | Exact `release_year`. |
| `language` | string | — | Exact language match. |
| `featured` | `true`/`false` | — | Only `is_featured = 1`. |
| `sort` | `newest` \| `title` \| `year` | `newest` | Result ordering. |
| `limit` | int 1–48 | `12` | Page size. |
| `offset` | int >= 0 | `0` | Pagination offset. |

```json
{
  "items": [
    {
      "id": 3,
      "slug": "the-lagos-inheritance",
      "title": "The Lagos Inheritance",
      "synopsis": "When a shipping magnate dies without a will…",
      "release_year": 2022,
      "runtime_minutes": 108,
      "genre": "Drama",
      "language": "English",
      "rating_certificate": "15",
      "director": "Ifeoma Nwachukwu",
      "cast_list": "Bimbo Ademoye, Gabriel Afolayan",
      "poster_hue": 38,
      "stream_url": null,
      "trailer_url": null,
      "is_featured": 1,
      "avg_rating": 4.3,
      "review_count": 6
    }
  ],
  "total": 18,
  "limit": 12,
  "offset": 0
}
```

`GET /api/movies/:idOrSlug` returns the same object plus `in_watchlist` (boolean) when a session
exists.

### Reviews — `/api/movies/:movieId/reviews`

| Method | Path | Auth | Body | Description |
| --- | --- | --- | --- | --- |
| `GET` | `/api/movies/:movieId/reviews` | — | — | `{ items: [...], average, count }`, newest-first, joined to reviewer name. |
| `POST` | `/api/movies/:movieId/reviews` | required | `{ rating, body }` | Creates or updates the caller's review. `rating` clamped 1–5, `body` sanitised to 1000 chars. Returns the saved review. |

### Watchlist & history — `/api`

All of these require an authenticated session.

| Method | Path | Body | Description |
| --- | --- | --- | --- |
| `GET` | `/api/watchlist` | — | The caller's saved films, newest-first, joined to `movies`. |
| `POST` | `/api/watchlist` | `{ movieId }` | `INSERT IGNORE`. `404` if the film does not exist. Returns `201 { ok: true }`. |
| `DELETE` | `/api/watchlist/:movieId` | — | Removes the row. Returns `{ ok: true }`. |
| `GET` | `/api/history` | — | The 25 most recent watch-history rows joined to `movies`. |
| `POST` | `/api/history` | `{ movieId, seconds }` | Upserts `progress_seconds` and refreshes `watched_at`. |

### Client helper

`lib/api.js` wraps every endpoint above and is the only place the frontend talks HTTP:

```js
import {
  API_BASE_URL, getHealth,
  signup, login, logout, getSession,
  getMovies, getMovie, getFilterOptions,
  getWatchlist, addToWatchlist, removeFromWatchlist,
  getReviews, createReview,
  getWatchHistory, saveWatchProgress
} from '../lib/api';
```

Every call sends `credentials: 'include'`, parses JSON defensively and throws an `ApiError`
(`{ status, message }`) on non-2xx responses. Nothing executes at import time, so importing the
module during a build is always safe.

---

## Project structure

```
nollywood/
├── app/                              # Next.js App Router
│   ├── globals.css                   # THE single stylesheet (tokens + components)
│   ├── layout.jsx                    # Root layout: AuthProvider + header/main/footer
│   ├── page.jsx                      # Home: hero, featured rail, recently added
│   ├── not-found.jsx                 # 404 — "We couldn't find that reel"
│   ├── movies/
│   │   ├── page.jsx                  # Catalogue with filters + pagination
│   │   └── [id]/
│   │       └── page.jsx              # Movie detail: player, watchlist, reviews
│   ├── login/page.jsx                # Sign in
│   ├── signup/page.jsx               # Create account
│   ├── watchlist/page.jsx            # Protected watchlist
│   └── account/page.jsx              # Profile + watch history table
├── components/
│   ├── layout/
│   │   ├── SiteHeader.jsx            # Sticky header, nav, hamburger, auth cluster
│   │   ├── SiteFooter.jsx            # Three-column footer
│   │   └── PageShell.jsx             # Shared page wrapper (title/intro/actions)
│   ├── ui/
│   │   ├── Button.jsx                # .btn variants + sizes, loading state
│   │   ├── Field.jsx                 # Field, Input, Textarea, Select
│   │   ├── Card.jsx                  # Card + CardHeader/CardBody/CardFooter
│   │   ├── Modal.jsx                 # Portal modal, focus trap, Esc/backdrop close
│   │   ├── Table.jsx                 # Scrollable semantic table
│   │   ├── Badge.jsx                 # Pill badge with tones
│   │   ├── Spinner.jsx               # Accessible loading indicator
│   │   └── EmptyState.jsx            # empty | error | auth variants
│   ├── movies/
│   │   ├── Poster.jsx                # Generated 2/3 gradient poster
│   │   ├── MovieCard.jsx             # Poster + title + badges + meta
│   │   ├── MovieGrid.jsx             # Responsive grid + skeletons/empty/error
│   │   ├── FilterBar.jsx             # Search + genre/year/language/sort
│   │   ├── VideoPlayer.jsx           # 16/9 player + licensing fallback
│   │   └── ReviewList.jsx            # Average, form, review list
│   ├── auth/
│   │   └── AuthForm.jsx              # Shared login/signup form
│   └── providers/
│       └── AuthProvider.jsx          # Auth context: user/status/login/logout
├── lib/
│   ├── api.js                        # Browser API client + ApiError
│   └── format.js                     # formatRuntime/formatDate/hueToGradient…
├── server/
│   ├── index.js                      # HTTP/HTTPS entry point, graceful shutdown
│   ├── app.js                        # Express app: cors, session, routes, errors
│   ├── config/
│   │   ├── db.js                     # mysql2/promise pool + checkDatabaseConnection
│   │   └── session.js                # express-session + express-mysql-session
│   ├── middleware/
│   │   ├── auth.js                   # requireAuth, requireAdmin, attachUser
│   │   └── errorHandler.js           # notFound + errorHandler
│   ├── utils/
│   │   └── validate.js               # isEmail, requireFields, clampInt, HttpError
│   ├── controllers/
│   │   ├── authController.js         # signup/login/logout/session
│   │   ├── moviesController.js       # listMovies/getMovie/getFilterOptions
│   │   ├── watchlistController.js    # watchlist + watch history
│   │   └── reviewsController.js      # listReviews/upsertReview
│   ├── routes/
│   │   ├── index.js                  # Aggregate router
│   │   ├── health.routes.js          # /health, /health/db
│   │   ├── auth.routes.js            # /api/auth/*
│   │   ├── movies.routes.js          # /api/movies/*
│   │   ├── reviews.routes.js         # /api/movies/:movieId/reviews
│   │   └── watchlist.routes.js       # /api/watchlist, /api/history
│   └── db/
│       └── seed.js                   # Schema runner + idempotent sample data
├── logs/                             # nohup API log target (created by START.sh)
├── schema.sql                        # MySQL DDL (utf8mb4) for every table
├── ecosystem.config.js               # pm2 process definition
├── next.config.js                    # Strict mode + security headers
├── START.sh                          # Install → build → API → pm2
├── .env.example                      # Documented placeholder environment
├── package.json                      # Single root manifest for app + API
└── README.md
```

---

## Styling conventions

**All styling for the entire project lives in `app/globals.css`**, imported exactly once from
`app/layout.jsx` and nowhere else. There are no CSS modules, no Tailwind, no inline `style` objects
and no CSS-in-JS anywhere in the codebase — components only ever apply semantic class names.

The stylesheet is layered in a fixed order:

1. **Reset** — `box-sizing: border-box`, zeroed margins on `body`, headings, paragraphs and lists,
   `img, svg, video { display: block; max-width: 100% }`.
2. **Design tokens on `:root`** — colour roles (`--color-bg` deep charcoal, `--color-surface`,
   `--color-surface-raised`, `--color-border`, `--color-text`, `--color-text-muted`,
   `--color-accent` warm Nollywood gold/amber, `--color-accent-hover`, `--color-accent-contrast`,
   `--color-success`, `--color-warning`, `--color-danger`); a 4px spacing scale
   (`--space-1` 4px … `--space-16` 64px); a type scale (`--text-xs` … `--text-4xl`) with paired
   line-heights; radii (`--radius-sm/md/lg/pill`); three elevations
   (`--shadow-1/2/3`); and z-index tokens (`--z-dropdown` 100, `--z-sticky` 200, `--z-overlay` 300,
   `--z-modal` 400, `--z-toast` 500).
3. **Base typography** — bare `h1`–`h6`, `p`, lists, `a`, `blockquote`, `code`. Headings use
   `line-height: 1.15`, `text-wrap: balance` and a top margin clearly larger than the bottom;
   paragraphs use `line-height: 1.6`, `text-wrap: pretty` and `max-width: 68ch`.
4. **Layout utilities** — `.shell` (max-width 1200px, centred, responsive inline padding), `.stack`,
   `.cluster`, `.grid-auto`. All spacing comes from flex/grid `gap`; never margins on children, never
   `<br>` tags, never spacer divs.
5. **Component classes** — header, footer, `.btn` (+ `.btn-primary/.btn-ghost/.btn-danger` and
   `.btn-sm/.btn-md/.btn-lg`), fields, cards, badges, tables, modal/overlay, spinner, skeletons,
   empty states, movie grid/poster/player/review list.

Additional rules the codebase follows:

- Mobile-first with `min-width` breakpoints at **640px / 768px / 1024px**; verified at 360px with no
  horizontal scroll.
- Poster and skeleton boxes use `aspect-ratio: 2 / 3` with `object-fit: cover` so layouts never
  reflow when data arrives.
- `overflow-wrap: break-word` is applied **only** to `.movie-card__title`, `.review__body` and
  user-name containers — never to `body`, `*`, headings, buttons or badges. Truncating flex children
  get `min-width: 0` plus `text-overflow: ellipsis`.
- Every interactive element has visible `:hover`, `:focus-visible` (2px accent outline with offset),
  `:active` and `:disabled` states; `outline: none` is never used without a replacement.
- Transitions target specific properties, stay under 200ms and are disabled entirely under
  `@media (prefers-reduced-motion: reduce)`.
- No hardcoded hex values or magic pixel numbers outside the `:root` token block.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Pages render but every grid shows the error state | API unreachable or CORS blocked | Check `curl $NEXT_PUBLIC_API_BASE_URL/health`; confirm the origin matches `^https://([a-z0-9-]+\.)*arx-app\.com(:\d+)?$`. |
| Sign-in appears to succeed but `/api/auth/session` returns `{ user: null }` | Cookie rejected | The cookie is `secure` + `sameSite=none` — both sides must be HTTPS and `SESSION_COOKIE_DOMAIN` must be a parent of both hosts. |
| `GET /health/db` returns 503 | MySQL down or bad credentials | Verify `DB_HOST/DB_USER/DB_PASSWORD/DB_NAME`; test with `mysql -h $DB_HOST -u $DB_USER -p`. |
| `ER_NO_SUCH_TABLE: ... 'sessions'` | Schema not applied | Run `mysql ... < schema.sql` or `node server/db/seed.js`. |
| Build succeeds but the client calls `undefined/api/...` | `NEXT_PUBLIC_API_BASE_URL` missing at build time | Set it in `.env` **before** `npm run build`, then rebuild. |
| `EADDRINUSE` on API start | Port already bound | `lsof -i :$PORT`, stop the old process, or change `PORT`. |
| pm2 process restarts in a loop | Missing `.next` build | Run `npm run build`, then `pm2 restart nollywood`. |

---

## Licence

Sample film titles, synopses, cast lists and reviews included in `server/db/seed.js` are fictional
demonstration content created for this project.