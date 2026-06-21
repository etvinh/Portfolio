# Brick Voyage — Full-Stack Build Spec

Handoff for Claude Code. This repo currently contains an **interactive 3D prototype** (`Brick Voyage.dc.html`) — a toy LEGO/voxel archipelago you sail a brick boat around; each island is a portfolio section. The task is to rebuild it as a **production Next.js full-stack app** while preserving the look, feel, and gameplay of the prototype.

> Read `Brick Voyage.dc.html` first. It is the source of truth for the 3D scene, controls, camera, water, islands, docking, achievements, and HUD. Port that logic faithfully — do not redesign the world.

---

## 1. Goals

1. Migrate the single-file prototype into a real Next.js + React + Three.js app.
2. Add a **Postgres** backend for two server-aggregated features:
   - **Global leaderboard / visitor analytics** ("1,240 explorers found all islands") surfaced on a **new island**.
   - **A boat-racing minigame** where players save a score under a **username + password**.
3. Full **Vitest** test suite: UI/component tests + backend service tests.

---

## 2. Tech Stack (required)

| Layer | Choice |
|---|---|
| Framework | **Next.js** (App Router, TypeScript) |
| UI / client state | **React** (hooks/context; no heavy state lib unless justified) |
| 3D | **Three.js** (port the prototype's scene) |
| DB | **Postgres** |
| DB access | **`postgres`** (postgres.js) driver — raw SQL via tagged-template queries (auto-parameterized, safe from SQLi). Schema lives in `db/schema.sql`; no migration system — schema changes ship by wiping and replaying. No ORM. |
| Testing | **Vitest** — UI tests (Testing Library + jsdom) **and** backend service tests |
| Auth (minigame) | Username + password, **bcryptjs** hashing + **jose** httpOnly JWT session |

Keep dependencies lean. Don't add a UI kit — the prototype is styled with inline styles (fonts: **Baloo 2** + **Nunito**); keep that visual language.

### Starter files already in this repo (turnkey)

These are scaffolded — wire your code to them, don't reinvent:

| File | Purpose |
|---|---|
| `package.json` | Pinned deps + scripts (`dev`, `db:up`, `db:reset`, `test`, `test:ui`, `test:services`, `setup`, `package`) |
| `docker-compose.yml` | Local Postgres 16 with healthcheck. Postgres runs as its own container — **not** bundled into the app image. |
| `db/database.sql` | First-boot DB bootstrap: `citext` extension + creates the `brickvoyage_test` DB. |
| `db/schema.sql` | Canonical table DDL (mirrors §7). Applied to dev DB on first boot; the Vitest service-test setup re-applies it to `brickvoyage_test`. |
| `db/data.sql` | Sample data — to be populated. Runs after `schema.sql`. |
| `.env.example` | `DATABASE_URL`, `DATABASE_URL_TEST`, `SESSION_SECRET` |
| `vitest.config.ts` | jsdom for `test/ui/**`, node for `test/services/**`; service tests run single-threaded |
| `test/setup.ts` | jest-dom matchers + WebGL/WebAudio stubs for jsdom |

**One-command bootstrap:** `npm run setup` (copies `.env`, installs, starts the Postgres container — `database.sql` → `schema.sql` → `data.sql` run automatically on first boot of the empty volume). Then `npm run dev`.

**No migrations.** Schema evolves by editing `db/schema.sql` and running `npm run db:reset` (wipes the volume + replays the three files). This is fine for a portfolio; revisit if/when real user data needs to survive a schema change.

Files you still need to create: `lib/db/client.ts`, the `lib/services/*`, the Next.js app, and the test files.

---

## 3. Architecture

```
app/
  page.tsx                 # the game (mounts the Three.js canvas + HUD)
  api/
    stats/route.ts         # GET global aggregate stats (visitor + explorer counts)
    visits/route.ts        # POST a visit/achievement event (island discovered)
    leaderboard/route.ts   # GET top race scores; POST a new score (auth required)
    auth/register/route.ts # POST create account (username + password)
    auth/login/route.ts    # POST login -> session
components/
  Game/                    # Three.js scene, boat, islands, follow-cam, water
  Hud/                     # minimap, compass, dock prompt, achievement toast, sound toggle
  Panels/                  # per-island overlay cards (About, Contact, Projects, Leaderboard...)
  Race/                    # minigame UI (start, timer, results, save-score form)
lib/
  three/                   # scene setup, island builders, collision, camera (ported)
  db/                      # schema.sql, database.sql, data.sql (at repo root, not under lib/)
  services/                # business logic (TESTED with Vitest service tests)
    stats.service.ts
    leaderboard.service.ts
    auth.service.ts
test/
  ui/                      # component/interaction tests
  services/                # backend service tests (hit a test Postgres)
```

**Rule:** keep DB/business logic in `lib/services/*` as pure, testable functions. API routes are thin wrappers that call services. This is what the service tests target.

---

## 4. Porting the prototype (the game itself)

From `Brick Voyage.dc.html`, port into `components/Game` + `lib/three`:

- **Sea**: large plane, GPU vertex-wave displacement + monotone tonal wave-band fragment shader (`onBeforeCompile`). No glare, no white ripple lines. Reduced-motion calms it.
- **Boat**: blocky voxel tug (hull, wheelhouse, funnel, mast/sail, life-ring, railings). Arcade movement — velocity + drag + turning, **not** physics. WASD/arrows + mobile joystick.
- **Follow camera**: custom high, pulled-back ~3/4 Smashy-Road angle (NOT OrbitControls). Arcs to frame an island while its panel is open, eases back on close.
- **Islands**: irregular voxel coastlines (lump clusters) with beaches; everything built from **boxes only** (no cones/cylinders/spheres for props). Voxel trees, rocks, flowers, lamps.
- **Collision**: per-lump circle colliders + pier-piling colliders; push-out resolution. Boat can still nose up to a dock.
- **Docking**: proximity prompt ("Press E / tap to dock"); opens that island's overlay panel; sailing away closes it.
- **HUD**: minimap/compass (visited islands gold-ringed, unvisited dimmed), "Lost? Sail home" autopilot, sound toggle.
- **Sound**: synthesized WebAudio (ambient ocean loop, dock chime, UI clicks), muted by default.
- **Lighting**: moody late-afternoon (warm low sun, dim ambient, ACES tone mapping).
- **Reduced-motion**: calmer water/camera/animation throughout.

**Islands & their panels (existing):**
- `home` — Home Harbor (welcome / guide)
- `house` — **About Me** (bio, resume summary/experience/education/skills, Download PDF)
- `socials` — **Contact** (LinkedIn, GitHub, email)
- `neon` — **Projects** (marble town hall; project cards)
- `library` — Library Light (project)

Replace placeholder content (name, bio, resume, URLs, projects + screenshots/repo links) — leave clear TODO markers; the owner will supply real content.

### Achievements (migrate + extend)
- Prototype stores discovered islands in `localStorage` (`brickVoyage.visited.v1`). **Keep localStorage** as the source of per-visitor truth.
- **Additionally**, POST a discovery event to `/api/visits` so the server can aggregate global stats (see §5). Fire-and-forget; the game must work even if the request fails.

---

## 5. New Island #1 — Lighthouse/Observatory: Global Stats

Add a **new island** (e.g. an Observatory or beacon) with its own panel showing **server-aggregated analytics**:

- "**1,240 explorers** have set sail"
- "**312 explorers** found all islands"
- per-island discovery counts / most-visited island
- (optional) total races run, fastest lap

**Data flow:**
- `POST /api/visits` — body `{ event: 'visit' | 'island_discovered' | 'all_found', islandId? , anonId }`. Use a client-generated anonymous id (uuid in localStorage) so counts dedupe per visitor without accounts.
- `GET /api/stats` — returns the aggregates the panel renders. Cache briefly (e.g. 30–60s) to avoid hammering the DB.

The panel polls/loads `/api/stats` when docked. Show a graceful loading + error state.

---

## 6. New Island #2 — Race Cove: Boat-Racing Minigame

Add a **new island** ("Race Cove") whose panel launches a **timed boat race**:

- A buoy/checkpoint course on the water; the player steers the same boat through gates against the clock.
- Track lap/finish time; on finish, show results and a **"Save your score"** form.
- Saving requires a **username + password**:
  - New username → registers an account (store hashed password).
  - Existing username → must match password to claim/append the score.
- The panel shows a **leaderboard** (top N times) with usernames.

**Auth requirements (do this properly even though it's a game):**
- **Never store plaintext passwords.** Hash with **bcrypt or argon2**.
- Validate/normalize usernames (length, allowed chars, uniqueness, case-folding).
- Rate-limit register/login and score submission.
- Session via httpOnly cookie (signed/JWT) — don't trust client-submitted times blindly; at minimum sanity-check times server-side (min plausible lap, monotonic checkpoints).
- Keep it scoped: this is a game leaderboard, not SSO. No email, no password reset flows unless asked.

---

## 7. Postgres schema

Lives in `db/schema.sql` (already in the repo). The starting layout:

```sql
-- visitors / analytics
CREATE TABLE visitors (
  anon_id      UUID PRIMARY KEY,
  first_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen    TIMESTAMPTZ NOT NULL DEFAULT now(),
  found_all    BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE island_discoveries (
  anon_id     UUID REFERENCES visitors(anon_id),
  island_id   TEXT NOT NULL,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (anon_id, island_id)
);

-- accounts (minigame)
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  username      CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- race scores
CREATE TABLE race_scores (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id),
  time_ms     INTEGER NOT NULL,           -- finish time
  course      TEXT NOT NULL DEFAULT 'cove',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON race_scores (course, time_ms);
```

Aggregates for `/api/stats`:
- explorers = `COUNT(*) FROM visitors`
- found-all = `COUNT(*) FROM visitors WHERE found_all`
- per-island = `island_id, COUNT(*) FROM island_discoveries GROUP BY island_id`

Use a **separate test database** for Vitest service tests (`brickvoyage_test`, created by `db/database.sql`). The service-test setup re-applies `db/schema.sql` against it on suite startup, then truncates between tests.

---

## 8. Testing (Vitest — required)

**UI tests** (`test/ui`, Testing Library + jsdom):
- HUD renders; achievement counter increments on simulated dock.
- Dock prompt shows/hides with proximity state.
- Sound toggle flips label.
- Race save-score form: validation, error on wrong password, success path (mock fetch).
- Leaderboard panel renders rows from mocked API.
- Mock Three.js / WebGL and WebAudio — don't render a real GL context in jsdom; test React/HUD logic, not pixels.

**Service tests** (`test/services`, against a test Postgres):
- `stats.service`: discovery events aggregate correctly; dedupe per `anon_id`; found-all flips when all islands discovered.
- `leaderboard.service`: insert score, top-N ordering, ties, course filter.
- `auth.service`: register hashes password; login rejects wrong password; duplicate username rejected; password never returned.
- Score submission sanity checks reject implausible times.

Use transactional fixtures or truncate-between-tests. Add `pnpm test` / `npm test` running the full suite; aim for meaningful coverage of `lib/services` (the money paths), not 100% of the Three.js code.

---

## 9. Env & ops

- `.env`: `DATABASE_URL`, `DATABASE_URL_TEST`, `SESSION_SECRET`, plus any pool config.
- Document local setup: `docker compose up` Postgres (the three SQL files auto-apply on first boot), then `npm run dev`.

### Deployment: behind nginx (TLS terminated upstream)

Production traffic path: **browser (HTTPS) → nginx (terminates TLS) → Next.js (HTTP)**. The Node app never sees TLS — nginx handles certs and forwards plain HTTP on a private/loopback network. Implications the app code must respect:

- **Trust the proxy.** Read `X-Forwarded-Proto`, `X-Forwarded-For`, and `X-Forwarded-Host` to reconstruct the request — treat it as HTTPS even though the socket is HTTP. nginx must set these explicitly; do not pass through client-supplied values.
- **Session cookies must still be `Secure`.** The *browser* sees HTTPS, so the JWT session cookie sets `Secure: true; HttpOnly: true; SameSite: Lax` even though the local socket is HTTP. That is correct, not a contradiction.
- **Rate-limit on the forwarded client IP**, not the socket peer (which is always nginx). Use the leftmost untrusted entry of `X-Forwarded-For`; only trust the header when the request came from the known proxy address.
- **No app-level HTTPS redirects.** nginx handles HTTP→HTTPS at the edge — the app should never try to upgrade the scheme.
- **HSTS, compression, and static-asset caching** live in nginx, not Next.js.

Ship a sample `nginx.conf` snippet alongside `docker-compose.yml` showing `proxy_pass`, `proxy_set_header X-Forwarded-Proto $scheme`, `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for`, and `proxy_set_header Host $host`.

- Pool Postgres connections for a long-lived Node server (not serverless). A single pool sized to app concurrency is fine.

### Packaging & deploy: web container on EC2 (Postgres is a sibling)

Production layout on the EC2 host:

- **`brick-voyage-web` container** — nginx (TLS terminator + reverse proxy) + Next.js Node server. This is the artifact `npm run package` produces.
- **`brick-voyage-db` container** — Postgres 16, run from the official `postgres:16` image with the same `db/*.sql` files mounted into `docker-entrypoint-initdb.d/` (mirroring `docker-compose.yml`). Lives on a named volume (`brickvoyage-pgdata`).

The web container talks to the DB container over Docker's user-defined bridge network. **Postgres is never in the web image.** This keeps the deploy artifact small, lets us restart the app without touching the DB, and lets us swap Postgres for RDS later without code changes.

**Build / ship / run loop (web only):**

1. **Local:** `npm run package` runs `next build`, builds the web image, and `docker save`s it as `dist/brick-voyage.tar.gz`.
2. **Ship:** `scp dist/brick-voyage.tar.gz ec2:/tmp/`.
3. **EC2:** `docker load -i /tmp/brick-voyage.tar.gz && docker compose up -d` (the prod compose file declares both `web` and `db` services on a shared network).

**Web container layout:**
- **Multi-stage `Dockerfile`:** builder stage runs `next build` (use Next.js `output: 'standalone'` to slim the runtime image); runtime stage installs nginx + Node, copies the standalone output, ships a small entrypoint that starts Next.js in the background and execs nginx in the foreground (PID 1).
- **Persistent state on a named Docker volume for TLS material** (`brickvoyage-tls`).
- **`DATABASE_URL` inside the web container** points at `db:5432` (the compose service name on the shared network), not `localhost`.

**Not in the web image:**
- `.env` (mount via `--env-file` at run time).
- TLS cert + key material (mount the `brickvoyage-tls` volume; certs renewed on host).
- Postgres — separate container.

**The `package` script** (add to `package.json`):
```json
"package": "next build && docker build -t brick-voyage-web:latest . && mkdir -p dist && docker save brick-voyage-web:latest | gzip > dist/brick-voyage.tar.gz"
```

**Out of scope** for this build: zero-downtime deploys (a brief `docker compose up -d` is fine for a portfolio — only `web` restarts, the DB container stays up), DB backups (document a `pg_dump` cron, don't implement), multi-host orchestration.

**Local dev is unchanged** — `docker-compose.yml` runs Postgres only; the Next.js dev server runs on the host via `npm run dev`. The packaged web image is a production artifact, not a development tool.

---

## 10. Definition of done

- [ ] Prototype 3D world ported and feels identical (controls, camera, water, collision, docking, HUD, sound, reduced-motion).
- [ ] Existing islands/panels migrated with TODO content markers.
- [ ] Stats island: live server aggregates render; visits/discoveries recorded.
- [ ] Race Cove: playable timed race, score save behind username+password (hashed), leaderboard renders.
- [ ] `db/database.sql`, `db/schema.sql`, `db/data.sql` boot a working Postgres on `npm run db:up`. `data.sql` has sample rows that make the leaderboard + stats panels render with real-looking data.
- [ ] Vitest UI **and** service suites pass; service tests reapply `schema.sql` to `brickvoyage_test` and truncate between tests; `npm test` green in CI.
- [ ] No secrets committed; passwords hashed; basic rate limiting on auth + score endpoints (rate-limit keyed on the `X-Forwarded-For` client IP).
- [ ] `npm run package` produces `dist/brick-voyage.tar.gz` — the web image (nginx + Next.js + entrypoint, **no Postgres**), deployable to EC2 with `docker load` + `docker compose up -d`.
- [ ] Sample `nginx.conf` ships in the web image and terminates TLS, sets `X-Forwarded-Proto`/`-For`/`Host`, and proxies to Next.js on `localhost`.
- [ ] Production `docker-compose.yml` declares `web` + `db` services on a shared network; web's `DATABASE_URL` resolves `db` by service name.

---

## Notes / non-goals

- Don't introduce a backend for anything that works client-side (per-visitor achievements stay in localStorage; the server only *aggregates*).
- Don't recreate any third party's branded UI.
- Ask the owner for real content (name, bio, resume PDF, social URLs, project screenshots + repo links) — leave TODOs, don't invent final copy.
