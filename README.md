# starter

The reference layout for every Next.js + FastAPI + Postgres project in `~/Code`.

**This is a reference, not a template.** Don't copy this folder and build on top of it. Read it,
then write the new project fresh, following the same structure and conventions under the new
project's own name. The code here is small on purpose, so the structure stays easy to see. The
`notes` resource exists only to show the whole path, from table to screen, working end to end.

`blueprint` and `radar` are real projects built this way. Blueprint shows a background task in
`lifespan` (a file watcher) and binary data in Postgres; radar is the smallest complete example.

## Layout

```
<project>/
├── docker-compose.yml        root: `include`s the three below, nothing else
├── .env.example              every variable any piece reads, with comments; .env is gitignored
├── .gitignore
├── README.md                 how to run it, back it up, and what the app does
│
├── database/
│   ├── docker-compose.yml    Postgres 16 + the `backup` and `restore` tools (profile: tools)
│   └── dumps/                pg_dump -Fc files, committed to git (the live data is a volume)
│
├── backend/                  FastAPI
│   ├── docker-compose.yml    the `api` service
│   ├── Dockerfile
│   ├── requirements.txt      pinned versions
│   ├── migrations/           001_init.sql, 002_*.sql … applied at startup, never edited once applied
│   └── app/
│       ├── main.py           app, lifespan (db connect + migrate), CORS, router registration
│       ├── db.py             psycopg async pool, connect-with-retry, migration runner
│       ├── auth.py           one username/password → signed session cookie
│       ├── schemas.py        pydantic request bodies
│       └── routers/          one file per resource; auth.py is the login/logout/me router
│
└── frontend/                 Next.js 14 (app router) + Tailwind
    ├── docker-compose.yml    the `web` service
    ├── Dockerfile            NEXT_PUBLIC_API_URL as a build arg; V8 heap capped for this host
    ├── next.config.js        single-CPU build settings (required on this VPS)
    ├── middleware.ts         redirects to /login when the session cookie is missing
    ├── lib/api.ts            the only place that calls fetch: one typed function per endpoint
    └── app/                  layout.tsx, globals.css (component classes), login/, page.tsx
```

## Conventions

### Names

Pick a lowercase **slug** (`radar`, `blueprint`) and use it everywhere this starter says `starter`:

| Thing                    | Pattern                             | Example (`starter`)          |
| ------------------------ | ----------------------------------- | ---------------------------- |
| Root compose project     | `<slug>-app`                        | `starter-app`                |
| Per-folder projects      | `<slug>-app-db` / `-api` / `-web`   | `starter-app-db`             |
| Containers               | `<slug>-db` / `-api` / `-web`       | `starter-db`                 |
| Network                  | `<slug>-net`                        | `starter-net`                |
| Postgres volume          | `<slug>-db_pgdata`                  | `starter-db_pgdata`          |
| DB name and user         | `<slug>`                            | `starter`                    |
| Session cookie           | `<slug>_session`                    | `starter_session`            |
| Dumps                    | `<slug>-<utc yyyymmdd-hhmmss>.dump` | `starter-20260924-091500.dump` |
| Pre-restore safety copy  | `<slug>.pre-restore-<utc>.dump`     | `starter.pre-restore-…dump`  |

The safety copy uses a `.` after the slug, not a `-`, so restore's `<slug>-*.dump` glob never
picks it up as the newest dump.

### Ports

Each project gets a block of 1000 ports: **web on X000, API on X100, Postgres on X200**. The API
is always web + 100, and `lib/api.ts` relies on that to find the API from whatever hostname the
page was opened on (localhost, LAN IP or Tailscale), with no rebuild needed.

| Block | Project  | Web  | API  | DB (loopback)  |
| ----- | -------- | ---- | ---- | -------------- |
| 1     | librol   | 1000 | 1100 | 1200           |
| 2     | spyder   | 2000 | 2100 | 2200           |
| 3     | spyder-web (~lay) | 3000 | 3100 | 3200  |
| 4     | alfred   | 4000 | 4100 | (internal)     |
| 5     | radar    | 5000 | 5100 | 5200           |
| 7     | blueprint | 7000 | 7100 | 7200          |
| 8     | mail     | -    | 8100 (loopback) | - |
| 9     | starter  | 9000 | 9100 | 9200           |
| 10    | flow     | 10000 | 10100 | (none)       |
| 11    | post     | 11000 | 11100 | 11200        |
| 12    | manifest | 12000 | 12100 | 12200        |
| 13    | console  | 13000 | 13100 | 13200        |
| 14    | kata     | 14000 | 14100 | 14200        |
| 15    | motion   | 15000 | 15100 | 15200        |
| 16    | cache    | 16000 | 16100 | 16200        |
| 17    | breen    | 17000 | 17100 | 17200        |
| 18    | peak     | 18000 | 18100 | 18200        |

Skip block 6: Chrome refuses to open port 6000 (it's on its list of unsafe ports). Check what's actually taken with `docker ps --format '{{.Names}} {{.Ports}}'` before choosing a
block, and add the new project to this table.

Postgres runs on its X200 port **inside the network as well** (`postgres -p X200`), so the same
port works everywhere. The host port binds to `127.0.0.1` only.

### Compose

- Each of `database/`, `backend/` and `frontend/` has its own `docker-compose.yml` that runs on
  its own: `cd backend && docker compose --env-file ../.env up -d --build`.
- The root file only `include`s the three, each with `env_file: .env`. Run everything from the
  root: `docker compose up -d --build`, or rebuild one piece with `docker compose up -d --build api`.
- All three files declare the same network under a fixed name (`name: <slug>-net`), so services
  find each other by container name whether they were started together or separately.
- There is **no `depends_on` across files.** Instead, the API retries the database until it
  answers (`db.connect()`).
- Required secrets use `${VAR:?message}`, so a missing `.env` fails loudly instead of starting
  with an empty password. Everything else gets a `${VAR:-default}`.

### Database, backup and restore

The live database is the `<slug>-db_pgdata` Docker volume and is never committed. Its **dumps
are committed**, so a clone plus a restore rebuilds the data on a new machine.

```bash
docker compose run --rm backup                                          # → database/dumps/<slug>-<utc>.dump
docker compose run --rm restore                                         # newest <slug>-*.dump
docker compose run --rm -e DUMP=starter-20260924-091500.dump restore   # a specific one
```

- Both tools run in the `postgres:16` image under the `tools` profile, so `up` never starts them
  and the host needs nothing but Docker. Keep the image pinned: a dump from a newer `pg_dump`
  can't be read by an older `pg_restore`.
- Newest means the last filename in sorted order (UTC timestamps sort correctly). File mtimes
  aren't used because a git clone resets them.
- Restore saves the current database as a safety copy first (unless it's empty), then drops and
  recreates the database (`WITH (FORCE)`) and loads the dump. The API can stay up: its pool checks
  connections and reconnects on its own.

For a shell: `docker exec -it starter-db psql -U starter -d starter -p 9200`

### Schema and migrations

The API owns the schema. `backend/migrations/NNN_name.sql` files are applied in filename order
at startup, each in its own transaction, and recorded in `schema_migrations`. To change the
schema, add the next numbered file. Never edit one that has already been applied, because it
won't run again.

### Backend

- Handwritten SQL through psycopg 3's async pool, with parameters as `%s` and rows as dicts
  (`dict_row`). There's no ORM. Keep the SQL in the router while it stays short, and move it to a
  `queries.py` once several routers share it.
- One router per resource under `app/routers/`, registered in `main.py` with
  `dependencies=[Depends(auth.require_auth)]`, so auth is applied in one place.
- Request bodies are pydantic models in `schemas.py`. For updates, every field is optional and
  the route changes only the fields that were sent (`model_dump(exclude_none=True)`).
- Errors are `HTTPException(status, "Message a person can read")`. The frontend shows `detail`
  as-is.
- CORS: `PUBLIC_URL`'s origin, plus a regex covering localhost, LAN and Tailscale on the web
  port. `allow_credentials=True` requires explicit origins, so `*` won't work.
- Background work (schedulers, mail, watchers) goes in `lifespan` as asyncio tasks. See
  blueprint's `content.watch()` in `app/main.py`.

### Auth

This is a single-user app: one `AUTH_USERNAME`/`AUTH_PASSWORD` pair from `.env`, and an
HMAC-signed `<slug>_session` cookie that lasts 30 days (`httponly`, `samesite=lax`, and `secure`
only when `COOKIE_SECURE=true`, i.e. behind HTTPS). Cookies are scoped by host, not port, so the
cookie set by the API on :X100 is visible to the frontend's `middleware.ts` on :X000. The
middleware only checks that the cookie exists. The API verifies it on every request, and
`apiFetch` redirects to `/login` on a 401.

### Frontend

- Next.js 14 app router, TypeScript strict, Tailwind 3, `lucide-react` for icons. Pages are
  client components that load data in `useEffect` through `lib/api.ts`.
- **All network calls go through `lib/api.ts`:** one exported, typed function per endpoint, with
  the response types declared next to them. Components never call `fetch` directly.
- `globals.css` defines the whole UI kit once: `.card`, `.label`, `.meta`, `.num`, `.field`,
  `.btn-primary`, `.btn-secondary`, `.btn-danger`. New screens reuse these instead of restyling.
  The accent is a single CSS variable (`--accent`), and fonts come from `next/font` as
  `--font-sans`/`--font-mono`. Each project chooses its own accent and fonts.
- `NEXT_PUBLIC_API_URL` is a build argument, because Next inlines it at build time. Leave it empty
  for the port +100 rule, or set it when a reverse proxy serves the API from the same origin.
- Keep `next.config.js`'s `cpus: 1, workerThreads: false` and the Dockerfile's
  `--max-old-space-size=640`. Without them, builds on this single-vCPU, low-RAM host silently
  produce nothing.

## Starting a new project

1. Choose a slug and a free port block, and add them to the ports table above.
2. Create `~/Code/<slug>/` with the layout above. Write each file for the new project, using the
   matching file here as the guide for structure, comments and conventions. Replace `notes` with
   the project's real resources; don't carry it over.
3. Write `.env.example` with every variable, then `cp .env.example .env` and fill it in.
4. `docker compose up -d --build`, then open `http://localhost:<X000>`.
5. `docker compose run --rm backup`, and commit the dump along with the code.
6. Write the project's own README: what it does, how to run it, backup and restore, and anything
   unusual. Keep the Run / Backup and restore sections in the same shape as blueprint's.

## Running this reference

It runs, so the conventions can be checked in practice:

```bash
cp .env.example .env
docker compose up -d --build        # app on :9000, sign in with AUTH_USERNAME / AUTH_PASSWORD
docker compose down -v              # stop it and delete its volume when done
```
