# Phase 1: Foundations (Postgres Schema + Real Auth) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the new `backend/` service with a real PostgreSQL schema (the full data model from the design spec) and working JWT-based authentication backed by that database, replacing the in-memory `Map` stores and hardcoded demo users used by the prototypes.

**Architecture:** A single new Express service at `backend/`, ESM (`"type": "module"`), talking to Postgres via the `pg` driver with hand-written SQL migrations (no ORM). Password hashing is scrypt+salt via Node's built-in `crypto`; sessions are JWTs via `jsonwebtoken`. This phase does not yet wire inverters, thermal imagery, fusion, dispatch, or robots — it only builds the schema those phases will use, plus a real login flow, so the service is genuinely bootable and testable on its own before anything else is added.

**Tech Stack:** Node.js (ESM), Express, PostgreSQL (`pg`, no ORM), `jsonwebtoken`, `cors`, Node's built-in test runner (`node --test`) + `supertest` for HTTP-level tests. No Docker (not installed on the target machine) — tests run against a real local Postgres database, not mocks.

## Global Constraints

- Backend is ESM (`"type": "module"` in `package.json`), matching the existing `engine-and-console/console-server/package.json` convention.
- Postgres is the single source of truth — no in-memory `Map`/array stores for anything persistent (per spec Architecture section).
- Plain SQL via `pg`, no ORM (per spec Architecture section, `db/` directory description).
- Row IDs are app-generated strings via `newId(prefix)` (e.g. `user_a1b2c3d4e5f6`), matching the existing convention already used in `engine-and-console/console-server/lib/store.js` — not Postgres `serial`/`uuid` columns.
- Auth mechanism is fixed by the spec: scrypt + random salt (Node's built-in `crypto`, not bcrypt) for passwords, `jsonwebtoken` for sessions, roles are exactly `admin` | `operator` | `viewer` (case-sensitive, per spec Data model).
- `POST /api/auth/login` must accept `{email, password}` and return `{token, role}` on success / `401 {error: "bad credentials"}` on failure — this exact contract is already expected by the existing frontend (`solarwash-web.jsx`'s `AUTH_ENDPOINT`).
- Every table, column, and enum value in this plan's migrations is copied verbatim from the "Data model (PostgreSQL)" section of `docs/superpowers/specs/2026-07-17-inverter-thermal-cleaning-system-design.md` — later phases depend on these exact names.

---

## File Structure

```
backend/
  package.json                    -- new: deps, scripts (start/migrate/seed/test)
  .env.example                    -- new: documents required env vars
  .gitignore                      -- new: .env, node_modules
  server.js                       -- new: createApp() factory + boot script
  auth.js                         -- new: scrypt hash/verify, JWT sign/verify, requireAuth/requireRole (pure, no DB import)
  db/
    pool.js                       -- new: pg Pool wrapper
    newId.js                      -- new: app-generated ID helper
    migrate.js                    -- new: migration runner
    usersRepo.js                  -- new: Postgres-backed user create/lookup
    seed.js                       -- new: bootstrap admin user script
    migrations/
      001_users_sites.sql         -- new: users, sites, strings, panels
      002_telemetry.sql           -- new: telemetry_readings, soiling_events, inverter_health
      003_thermal.sql             -- new: thermal_flights, thermal_images, thermal_findings
      004_dispatch.sql            -- new: cleaning_schedules, work_orders, guardrail_settings
      005_robot.sql                -- new: cleaning_robots, robot_runs
  api/
    auth.js                       -- new: POST /api/auth/login route
  test/
    db/
      pool.test.js                 -- new
      migrate.test.js              -- new
      schema.test.js               -- new
      usersRepo.test.js            -- new
    auth.test.js                   -- new
    seed.test.js                   -- new
    server.test.js                 -- new
```

Nothing in `backend-proxy/` or `engine-and-console/` is deleted or modified by this plan — they remain in place until a later phase explicitly moves logic out of them (per the spec's phasing, inverter-engine code moves over in Phase 2).

---

## Task 1: Postgres installed and reachable, connection pool wrapper

**Files:**
- Create: `backend/package.json`
- Create: `backend/.env.example`
- Create: `backend/.gitignore`
- Create: `backend/db/pool.js`
- Test: `backend/test/db/pool.test.js`

**Interfaces:**
- Produces: `pool` (a `pg.Pool` instance, exported from `backend/db/pool.js`), reads connection string from `process.env.DATABASE_URL`.

This machine has neither Homebrew, Docker, nor a local `psql` installed (verified during planning). Task 1 installs Postgres via Homebrew — the standard, scriptable path — rather than assuming any of these are already present.

- [ ] **Step 1: Install Homebrew (skip if `brew --version` already succeeds)**

Run: `brew --version`
If that fails with "command not found", run:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
Follow the printed post-install instructions to add `brew` to your shell PATH (the installer prints the exact `eval "$(/opt/homebrew/bin/brew shellenv)"` line to add to your shell profile), then re-run `brew --version` to confirm it now succeeds.

- [ ] **Step 2: Install and start PostgreSQL**

```bash
brew install postgresql@16
brew services start postgresql@16
```
Expected: `brew services start` prints `Successfully started \`postgresql@16\` (label: homebrew.mxcl.postgresql@16)`.

- [ ] **Step 3: Create the dev and test databases**

```bash
createdb solarwash_dev
createdb solarwash_test
psql -d solarwash_dev -c "SELECT 1 AS ok;"
```
Expected output of the last command:
```
 ok
----
  1
(1 row)
```

- [ ] **Step 4: Scaffold `backend/package.json`**

```json
{
  "name": "solarwash-backend",
  "version": "2.0.0",
  "type": "module",
  "description": "SolarWash backend — real inverter telemetry, thermal analysis, fusion, and cleaning dispatch.",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "migrate": "node db/migrate.js",
    "seed": "node db/seed.js",
    "pretest": "DATABASE_URL=postgresql://localhost:5432/solarwash_test node db/migrate.js",
    "test": "DATABASE_URL=postgresql://localhost:5432/solarwash_test node --test test/"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.12.0"
  },
  "devDependencies": {
    "supertest": "^7.0.0"
  }
}
```

- [ ] **Step 5: Install dependencies**

```bash
cd "backend" && npm install
```
Expected: `added N packages` with no errors.

- [ ] **Step 6: Create `backend/.env.example` and `backend/.gitignore`**

`backend/.env.example`:
```
DATABASE_URL=postgresql://localhost:5432/solarwash_dev
JWT_SECRET=change-me-in-production
PORT=4000
ADMIN_EMAIL=admin@solarwash.io
ADMIN_PASSWORD=change-me-now
```

`backend/.gitignore`:
```
node_modules/
.env
```

Then:
```bash
cp backend/.env.example backend/.env
```

- [ ] **Step 7: Write the failing test for the connection pool**

`backend/test/db/pool.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../db/pool.js';

test('pool connects and can run a query', async () => {
  const { rows } = await pool.query('SELECT 1 AS ok');
  assert.equal(rows[0].ok, 1);
});
```

- [ ] **Step 8: Run test to verify it fails**

Run: `cd backend && DATABASE_URL=postgresql://localhost:5432/solarwash_test node --test test/db/pool.test.js`
Expected: FAIL — `Cannot find module '../../db/pool.js'`

- [ ] **Step 9: Implement `backend/db/pool.js`**

```js
import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

- [ ] **Step 10: Run test to verify it passes**

Run: `cd backend && DATABASE_URL=postgresql://localhost:5432/solarwash_test node --test test/db/pool.test.js`
Expected: PASS — `# pass 1`

- [ ] **Step 11: Commit**

```bash
cd "/Users/macpro/Desktop/SolaWash Web"
git add backend/package.json backend/.env.example backend/.gitignore backend/db/pool.js backend/test/db/pool.test.js backend/package-lock.json
git commit -m "backend: scaffold package + Postgres connection pool"
```

---

## Task 2: Migration runner

**Files:**
- Create: `backend/db/migrate.js`
- Test: `backend/test/db/migrate.test.js`

**Interfaces:**
- Consumes: `pool` from `backend/db/pool.js` (Task 1).
- Produces: `migrate(dir?: string): Promise<void>` — exported from `backend/db/migrate.js`. Applies any `.sql` files in `dir` (default `backend/db/migrations/`) not yet recorded in a `schema_migrations` table, in filename order, each inside its own transaction.

- [ ] **Step 1: Write the failing test**

`backend/test/db/migrate.test.js`:
```js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pool } from '../../db/pool.js';
import { migrate } from '../../db/migrate.js';

let tmpDir;

before(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), 'sw-migrations-'));
  writeFileSync(
    join(tmpDir, '001_test_table.sql'),
    'CREATE TABLE IF NOT EXISTS migrate_test_table (id serial PRIMARY KEY);'
  );
  await pool.query('DROP TABLE IF EXISTS migrate_test_table');
  await pool.query('DROP TABLE IF EXISTS schema_migrations');
});

after(async () => {
  rmSync(tmpDir, { recursive: true, force: true });
  await pool.query('DROP TABLE IF EXISTS migrate_test_table');
  await pool.query('DROP TABLE IF EXISTS schema_migrations');
});

test('migrate creates the table and records it as applied', async () => {
  await migrate(tmpDir);

  const table = await pool.query(
    `SELECT to_regclass('public.migrate_test_table') AS exists`
  );
  assert.notEqual(table.rows[0].exists, null);

  const recorded = await pool.query(
    'SELECT filename FROM schema_migrations WHERE filename = $1',
    ['001_test_table.sql']
  );
  assert.equal(recorded.rows.length, 1);
});

test('migrate is idempotent — running it twice does not error or re-apply', async () => {
  await migrate(tmpDir);
  await migrate(tmpDir);

  const recorded = await pool.query(
    'SELECT filename FROM schema_migrations WHERE filename = $1',
    ['001_test_table.sql']
  );
  assert.equal(recorded.rows.length, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- test/db/migrate.test.js`
Expected: FAIL — `Cannot find module '../../db/migrate.js'`

- [ ] **Step 3: Implement `backend/db/migrate.js`**

```js
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_MIGRATIONS_DIR = join(__dirname, 'migrations');

export async function migrate(dir = DEFAULT_MIGRATIONS_DIR) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const applied = new Set(
    (await pool.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename)
  );

  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = readFileSync(join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Applied migration: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${file} failed: ${err.message}`);
    } finally {
      client.release();
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => {
      console.log('Migrations complete.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- test/db/migrate.test.js`
Expected: PASS — `# pass 2`

- [ ] **Step 5: Commit**

```bash
cd "/Users/macpro/Desktop/SolaWash Web"
git add backend/db/migrate.js backend/test/db/migrate.test.js
git commit -m "backend: add migration runner"
```

---

## Task 3: Core identity schema — users, sites, strings, panels

**Files:**
- Create: `backend/db/migrations/001_users_sites.sql`
- Test: `backend/test/db/schema.test.js` (this task writes the `users`/`sites`/`strings`/`panels` portion; Task 4 appends to the same file)

**Interfaces:**
- Produces: Postgres tables `users`, `sites`, `strings`, `panels` (columns exactly as below — Task 5/6/8 depend on the `users` column names; later phases depend on `sites`/`strings`/`panels`).

- [ ] **Step 1: Write the failing test**

`backend/test/db/schema.test.js`:
```js
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../db/pool.js';
import { migrate } from '../../db/migrate.js';

before(async () => {
  await migrate();
});

test('users table enforces role check constraint', async () => {
  await assert.rejects(
    pool.query(
      `INSERT INTO users (id, email, password_hash, salt, role) VALUES ($1,$2,$3,$4,$5)`,
      ['user_badrole', 'bad@example.com', 'x', 'y', 'not-a-real-role']
    ),
    /violates check constraint/
  );
});

test('sites.owner_user_id must reference an existing user', async () => {
  await assert.rejects(
    pool.query(
      `INSERT INTO sites (id, name, owner_user_id, lat, lon, kw_capacity) VALUES ($1,$2,$3,$4,$5,$6)`,
      ['site_orphan', 'Orphan Site', 'user_does_not_exist', 32.08, 34.78, 9.6]
    ),
    /violates foreign key constraint/
  );
});

test('a valid user, site, string, and panel can be inserted and read back', async () => {
  await pool.query(
    `INSERT INTO users (id, email, password_hash, salt, role) VALUES ($1,$2,$3,$4,$5)`,
    ['user_schema_test', 'schema-test@example.com', 'hash', 'salt', 'admin']
  );
  await pool.query(
    `INSERT INTO sites (id, name, owner_user_id, lat, lon, kw_capacity) VALUES ($1,$2,$3,$4,$5,$6)`,
    ['site_schema_test', 'Test Site', 'user_schema_test', 32.08, 34.78, 9.6]
  );
  await pool.query(
    `INSERT INTO strings (id, site_id, nameplate_w, tilt_deg, azimuth_deg) VALUES ($1,$2,$3,$4,$5)`,
    ['string_schema_test', 'site_schema_test', 3200, 25, 180]
  );
  await pool.query(
    `INSERT INTO panels (id, string_id, position_in_string) VALUES ($1,$2,$3)`,
    ['panel_schema_test', 'string_schema_test', 1]
  );

  const { rows } = await pool.query(
    `SELECT p.id, p.position_in_string, s.nameplate_w, si.name
     FROM panels p
     JOIN strings s ON s.id = p.string_id
     JOIN sites si ON si.id = s.site_id
     WHERE p.id = $1`,
    ['panel_schema_test']
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Test Site');
  assert.equal(Number(rows[0].nameplate_w), 3200);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npm test -- test/db/schema.test.js`
Expected: FAIL — relation "users" does not exist

- [ ] **Step 3: Implement `backend/db/migrations/001_users_sites.sql`**

```sql
CREATE TABLE users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  salt text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'operator', 'viewer')),
  site_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sites (
  id text PRIMARY KEY,
  name text NOT NULL,
  owner_user_id text NOT NULL REFERENCES users(id),
  lat double precision NOT NULL,
  lon double precision NOT NULL,
  kw_capacity double precision NOT NULL,
  tier text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE users
  ADD CONSTRAINT users_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

CREATE TABLE strings (
  id text PRIMARY KEY,
  site_id text NOT NULL REFERENCES sites(id),
  nameplate_w double precision NOT NULL,
  tilt_deg double precision NOT NULL,
  azimuth_deg double precision NOT NULL,
  inverter_slug text,
  inverter_host text,
  inverter_port integer,
  inverter_unit_id integer
);

CREATE TABLE panels (
  id text PRIMARY KEY,
  string_id text NOT NULL REFERENCES strings(id),
  position_in_string integer NOT NULL,
  lat double precision,
  lon double precision
);
```

(`users.site_id` is added via a separate `ALTER TABLE` after `sites` exists, because `users` and `sites` reference each other — `sites.owner_user_id → users.id` and `users.site_id → sites.id` — so the two tables cannot both be created with their cross-reference inline in one pass.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npm test -- test/db/schema.test.js`
Expected: PASS — `# pass 3`

- [ ] **Step 5: Commit**

```bash
cd "/Users/macpro/Desktop/SolaWash Web"
git add backend/db/migrations/001_users_sites.sql backend/test/db/schema.test.js
git commit -m "backend: add users/sites/strings/panels schema"
```

---

## Task 4: Remaining schema — telemetry, thermal, dispatch, robot tables

**Files:**
- Create: `backend/db/migrations/002_telemetry.sql`
- Create: `backend/db/migrations/003_thermal.sql`
- Create: `backend/db/migrations/004_dispatch.sql`
- Create: `backend/db/migrations/005_robot.sql`
- Modify: `backend/test/db/schema.test.js` (append tests)

**Interfaces:**
- Produces: all remaining Postgres tables from the spec's Data model — `telemetry_readings`, `soiling_events`, `inverter_health`, `thermal_flights`, `thermal_images`, `thermal_findings`, `cleaning_schedules`, `work_orders`, `guardrail_settings`, `cleaning_robots`, `robot_runs`. Column names and enum values match the design spec exactly; later phases depend on them.

- [ ] **Step 1: Write the failing tests (append to `backend/test/db/schema.test.js`)**

Add to the end of `backend/test/db/schema.test.js`:
```js
test('work_orders rejects an invalid trigger_reason', async () => {
  await assert.rejects(
    pool.query(
      `INSERT INTO work_orders (id, site_id, trigger_reason, status) VALUES ($1,$2,$3,$4)`,
      ['wo_bad', 'site_schema_test', 'NOT_A_REAL_REASON', 'QUEUED']
    ),
    /violates check constraint/
  );
});

test('work_orders rejects an invalid status', async () => {
  await assert.rejects(
    pool.query(
      `INSERT INTO work_orders (id, site_id, trigger_reason, status) VALUES ($1,$2,$3,$4)`,
      ['wo_bad2', 'site_schema_test', 'MANUAL', 'NOT_A_REAL_STATUS']
    ),
    /violates check constraint/
  );
});

test('a full telemetry -> soiling -> work_order -> robot_run chain can be inserted', async () => {
  await pool.query(
    `INSERT INTO telemetry_readings (id, string_id, ts, ac_w, dc_w, expected_w, pr_pct, transport)
     VALUES ($1,$2,now(),$3,$4,$5,$6,$7)`,
    ['tr_schema_test', 'string_schema_test', 2800, 2900, 3100, 90.3, 'modbus_tcp']
  );

  await pool.query(
    `INSERT INTO soiling_events (id, string_id, ts, classification, confidence)
     VALUES ($1,$2,now(),$3,$4)`,
    ['se_schema_test', 'string_schema_test', 'SOILING', 0.82]
  );

  await pool.query(
    `INSERT INTO work_orders (id, site_id, string_id, trigger_reason, status)
     VALUES ($1,$2,$3,$4,$5)`,
    ['wo_schema_test', 'site_schema_test', 'string_schema_test', 'VERDICT_SOILING', 'PENDING_APPROVAL']
  );

  await pool.query(
    `INSERT INTO cleaning_robots (id, site_id, string_id, vendor_slug, transport, status)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    ['robot_schema_test', 'site_schema_test', 'string_schema_test', 'generic-mock', 'LOCAL', 'idle']
  );

  await pool.query(
    `INSERT INTO robot_runs (id, work_order_id, robot_id, status)
     VALUES ($1,$2,$3,$4)`,
    ['run_schema_test', 'wo_schema_test', 'robot_schema_test', 'running']
  );

  const { rows } = await pool.query(
    `SELECT rr.status AS run_status, wo.status AS order_status, se.classification
     FROM robot_runs rr
     JOIN work_orders wo ON wo.id = rr.work_order_id
     JOIN soiling_events se ON se.string_id = wo.string_id
     WHERE rr.id = $1`,
    ['run_schema_test']
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].run_status, 'running');
  assert.equal(rows[0].order_status, 'PENDING_APPROVAL');
  assert.equal(rows[0].classification, 'SOILING');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test -- test/db/schema.test.js`
Expected: FAIL — relation "work_orders" does not exist

- [ ] **Step 3: Implement `backend/db/migrations/002_telemetry.sql`**

```sql
CREATE TABLE telemetry_readings (
  id text PRIMARY KEY,
  string_id text NOT NULL REFERENCES strings(id),
  ts timestamptz NOT NULL,
  ac_w double precision,
  dc_w double precision,
  expected_w double precision,
  pr_pct double precision,
  transport text
);
CREATE INDEX telemetry_readings_string_ts_idx ON telemetry_readings (string_id, ts DESC);

CREATE TABLE soiling_events (
  id text PRIMARY KEY,
  string_id text NOT NULL REFERENCES strings(id),
  ts timestamptz NOT NULL,
  classification text NOT NULL CHECK (classification IN ('SOILING', 'SHADING', 'FAULT', 'none')),
  confidence double precision
);
CREATE INDEX soiling_events_string_ts_idx ON soiling_events (string_id, ts DESC);

CREATE TABLE inverter_health (
  id text PRIMARY KEY,
  site_id text NOT NULL REFERENCES sites(id),
  last_poll_ts timestamptz,
  latency_ms integer,
  consecutive_failures integer NOT NULL DEFAULT 0,
  last_error text,
  transport text
);
```

- [ ] **Step 4: Implement `backend/db/migrations/003_thermal.sql`**

```sql
CREATE TABLE thermal_flights (
  id text PRIMARY KEY,
  site_id text NOT NULL REFERENCES sites(id),
  pilot_user_id text NOT NULL REFERENCES users(id),
  flown_at timestamptz NOT NULL,
  zone_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE thermal_images (
  id text PRIMARY KEY,
  flight_id text NOT NULL REFERENCES thermal_flights(id),
  panel_id text REFERENCES panels(id),
  string_id text REFERENCES strings(id),
  gps_lat double precision,
  gps_lon double precision,
  alt_m double precision,
  gimbal_yaw_deg double precision,
  gimbal_pitch_deg double precision,
  captured_at timestamptz,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'parsed', 'parse_failed')),
  parse_error text
);

CREATE TABLE thermal_findings (
  id text PRIMARY KEY,
  image_id text NOT NULL REFERENCES thermal_images(id),
  kind text NOT NULL CHECK (kind IN ('hot_spot', 'hot_panel', 'string_break')),
  delta_t double precision NOT NULL,
  severity text,
  panel_id text REFERENCES panels(id)
);
```

- [ ] **Step 5: Implement `backend/db/migrations/004_dispatch.sql`**

```sql
CREATE TABLE cleaning_schedules (
  id text PRIMARY KEY,
  site_id text NOT NULL REFERENCES sites(id),
  string_id text REFERENCES strings(id),
  interval_days integer NOT NULL,
  next_due_date date NOT NULL,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE work_orders (
  id text PRIMARY KEY,
  site_id text NOT NULL REFERENCES sites(id),
  string_id text REFERENCES strings(id),
  trigger_reason text NOT NULL CHECK (
    trigger_reason IN ('MANUAL', 'VERDICT_SOILING', 'PR_DROP', 'SCHEDULED', 'DUST_EVENT')
  ),
  verdict_evidence_id text,
  status text NOT NULL CHECK (
    status IN (
      'PENDING_APPROVAL', 'REJECTED', 'QUEUED', 'BLOCKED_PEAK_HOURS',
      'BLOCKED_RAIN_FORECAST', 'SATISFIED_BY_RAIN', 'BLOCKED_WIND',
      'BLOCKED_PRESENCE_DETECTED', 'BLOCKED_ROBOT_RESOURCE', 'DISPATCHED',
      'IN_PROGRESS', 'NEEDS_ATTENTION', 'COMPLETED', 'CANCELLED'
    )
  ),
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_by_user_id text REFERENCES users(id),
  approved_at timestamptz,
  dispatched_at timestamptz,
  completed_at timestamptz,
  completed_by_user_id text REFERENCES users(id),
  pr_before_pct double precision,
  pr_after_pct double precision,
  notes text
);
CREATE INDEX work_orders_site_status_idx ON work_orders (site_id, status);

CREATE TABLE guardrail_settings (
  site_id text PRIMARY KEY REFERENCES sites(id),
  peak_start time NOT NULL DEFAULT '09:00',
  peak_end time NOT NULL DEFAULT '17:00',
  rain_delay_enabled boolean NOT NULL DEFAULT true,
  rain_delay_hours integer NOT NULL DEFAULT 48,
  wind_speed_limit_ms double precision NOT NULL DEFAULT 12
);
```

- [ ] **Step 6: Implement `backend/db/migrations/005_robot.sql`**

```sql
CREATE TABLE cleaning_robots (
  id text PRIMARY KEY,
  site_id text NOT NULL REFERENCES sites(id),
  string_id text REFERENCES strings(id),
  vendor_slug text NOT NULL,
  transport text NOT NULL CHECK (transport IN ('LOCAL', 'CLOUD')),
  conn_json jsonb NOT NULL DEFAULT '{}',
  capabilities_json jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('idle', 'cleaning', 'fault', 'offline')),
  resource_level_pct double precision,
  last_status_ts timestamptz
);

CREATE TABLE robot_runs (
  id text PRIMARY KEY,
  work_order_id text NOT NULL REFERENCES work_orders(id),
  robot_id text NOT NULL REFERENCES cleaning_robots(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL CHECK (
    status IN ('running', 'completed', 'aborted_safety', 'aborted_fault', 'aborted_manual')
  ),
  stop_reason text,
  telemetry_json jsonb
);
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && npm test -- test/db/schema.test.js`
Expected: PASS — `# pass 6`

- [ ] **Step 8: Commit**

```bash
cd "/Users/macpro/Desktop/SolaWash Web"
git add backend/db/migrations/002_telemetry.sql backend/db/migrations/003_thermal.sql \
        backend/db/migrations/004_dispatch.sql backend/db/migrations/005_robot.sql \
        backend/test/db/schema.test.js
git commit -m "backend: add telemetry, thermal, dispatch, and robot schema"
```

---

## Task 5: Auth utilities — password hashing, JWT, middleware (pure, no DB)

**Files:**
- Create: `backend/auth.js`
- Test: `backend/test/auth.test.js`

**Interfaces:**
- Produces: `hashPassword(password: string): {salt, hash}`, `verifyPassword(password, salt, hash): boolean`, `signToken(payload, expiresIn?): string`, `verifyToken(token): object | null`, `requireAuth(req, res, next)`, `requireRole(...roles): (req, res, next) => void` — all exported from `backend/auth.js`. Task 6 and Task 8 import these directly; nothing in this file touches Postgres.

This is a straight, behavior-preserving port of `engine-and-console/console-server/auth.js` (verified correct during spec design — same scrypt+salt and JWT approach, unchanged), now getting its first real test coverage.

- [ ] **Step 1: Write the failing tests**

`backend/test/auth.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  requireAuth,
  requireRole,
} from '../auth.js';

test('hashPassword + verifyPassword round-trip correctly', () => {
  const { salt, hash } = hashPassword('correct horse battery staple');
  assert.equal(verifyPassword('correct horse battery staple', salt, hash), true);
  assert.equal(verifyPassword('wrong password', salt, hash), false);
});

test('verifyPassword returns false for missing salt/hash instead of throwing', () => {
  assert.equal(verifyPassword('anything', null, null), false);
});

test('signToken + verifyToken round-trip correctly', () => {
  const token = signToken({ sub: 'user_1', role: 'admin' });
  const claims = verifyToken(token);
  assert.equal(claims.sub, 'user_1');
  assert.equal(claims.role, 'admin');
});

test('verifyToken returns null for a garbage token', () => {
  assert.equal(verifyToken('not-a-real-token'), null);
});

test('requireAuth rejects requests with no token', async () => {
  const app = express();
  app.get('/protected', requireAuth, (req, res) => res.json({ ok: true }));

  const res = await request(app).get('/protected');
  assert.equal(res.status, 401);
});

test('requireAuth passes through requests with a valid token', async () => {
  const app = express();
  app.get('/protected', requireAuth, (req, res) => res.json({ user: req.user }));

  const token = signToken({ sub: 'user_1', role: 'admin' });
  const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.user.sub, 'user_1');
});

test('requireRole rejects a token with the wrong role', async () => {
  const app = express();
  app.get('/admin-only', requireAuth, requireRole('admin'), (req, res) => res.json({ ok: true }));

  const token = signToken({ sub: 'user_1', role: 'viewer' });
  const res = await request(app).get('/admin-only').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 403);
});

test('requireRole allows a token with an accepted role', async () => {
  const app = express();
  app.get('/admin-only', requireAuth, requireRole('admin', 'operator'), (req, res) =>
    res.json({ ok: true })
  );

  const token = signToken({ sub: 'user_1', role: 'operator' });
  const res = await request(app).get('/admin-only').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test -- test/auth.test.js`
Expected: FAIL — `Cannot find module '../auth.js'`

- [ ] **Step 3: Implement `backend/auth.js`**

```js
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-only-change-me';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(test, 'hex'), Buffer.from(hash, 'hex'));
}

export function signToken(payload, expiresIn = '12h') {
  return jwt.sign(payload, SECRET, { expiresIn });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

export function requireAuth(req, res, next) {
  const claims = verifyToken(bearer(req));
  if (!claims) return res.status(401).json({ error: 'unauthorized' });
  req.user = claims;
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ error: 'forbidden', need: roles });
    next();
  };
}
```

- [ ] **Step 4: Add `supertest` usage requires `express` as a dependency of the test — install it as a devDependency**

`express` is already a `dependencies` entry from Task 1, so no install is needed. Confirm:
```bash
cd backend && node -e "require('express'); console.log('express OK')"
```
Expected: `express OK`

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npm test -- test/auth.test.js`
Expected: PASS — `# pass 8`

- [ ] **Step 6: Commit**

```bash
cd "/Users/macpro/Desktop/SolaWash Web"
git add backend/auth.js backend/test/auth.test.js
git commit -m "backend: add auth utilities (scrypt hashing, JWT, role middleware)"
```

---

## Task 6: Postgres-backed user repository

**Files:**
- Create: `backend/db/newId.js`
- Create: `backend/db/usersRepo.js`
- Test: `backend/test/db/usersRepo.test.js`

**Interfaces:**
- Consumes: `pool` (Task 1), `hashPassword` (Task 5).
- Produces: `newId(prefix?: string): string` from `backend/db/newId.js`. `createUser({email, password, role, siteId?}): Promise<{id, email, role, siteId}>` and `findUserByEmail(email: string): Promise<UserRow | null>` from `backend/db/usersRepo.js` — `UserRow` includes `id, email, password_hash, salt, role, site_id, created_at`. Task 7 and Task 8 import both functions.

- [ ] **Step 1: Write the failing tests**

`backend/test/db/usersRepo.test.js`:
```js
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../../db/pool.js';
import { migrate } from '../../db/migrate.js';
import { createUser, findUserByEmail } from '../../db/usersRepo.js';

before(async () => {
  await migrate();
});

beforeEach(async () => {
  await pool.query(`DELETE FROM users WHERE email LIKE 'usersrepo-test%'`);
});

test('createUser stores a hashed password, never the plaintext', async () => {
  const user = await createUser({
    email: 'usersrepo-test@example.com',
    password: 'super-secret',
    role: 'operator',
  });
  assert.equal(user.email, 'usersrepo-test@example.com');
  assert.equal(user.role, 'operator');
  assert.ok(user.id.startsWith('user_'));

  const row = await findUserByEmail('usersrepo-test@example.com');
  assert.notEqual(row.password_hash, 'super-secret');
  assert.ok(row.salt);
  assert.ok(row.password_hash);
});

test('findUserByEmail returns null for a user that does not exist', async () => {
  const row = await findUserByEmail('usersrepo-test-does-not-exist@example.com');
  assert.equal(row, null);
});

test('createUser accepts an optional siteId', async () => {
  const user = await createUser({
    email: 'usersrepo-test-viewer@example.com',
    password: 'x',
    role: 'viewer',
    siteId: 'site_schema_test',
  });
  const row = await findUserByEmail('usersrepo-test-viewer@example.com');
  assert.equal(row.site_id, 'site_schema_test');
  assert.equal(user.siteId, 'site_schema_test');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test -- test/db/usersRepo.test.js`
Expected: FAIL — `Cannot find module '../../db/usersRepo.js'`

- [ ] **Step 3: Implement `backend/db/newId.js`**

```js
import crypto from 'node:crypto';

export function newId(prefix = 'id') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}
```

- [ ] **Step 4: Implement `backend/db/usersRepo.js`**

```js
import { pool } from './pool.js';
import { newId } from './newId.js';
import { hashPassword } from '../auth.js';

export async function createUser({ email, password, role, siteId = null }) {
  const { salt, hash } = hashPassword(password);
  const id = newId('user');
  await pool.query(
    `INSERT INTO users (id, email, password_hash, salt, role, site_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, email, hash, salt, role, siteId]
  );
  return { id, email, role, siteId };
}

export async function findUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0] || null;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npm test -- test/db/usersRepo.test.js`
Expected: PASS — `# pass 3`

- [ ] **Step 6: Commit**

```bash
cd "/Users/macpro/Desktop/SolaWash Web"
git add backend/db/newId.js backend/db/usersRepo.js backend/test/db/usersRepo.test.js
git commit -m "backend: add Postgres-backed user repository"
```

---

## Task 7: Bootstrap admin seed script

**Files:**
- Create: `backend/db/seed.js`
- Test: `backend/test/seed.test.js`

**Interfaces:**
- Consumes: `createUser`, `findUserByEmail` (Task 6).
- Produces: `seedAdmin(opts?: {email?, password?}): Promise<UserRow-like>` from `backend/db/seed.js`, idempotent — safe to run repeatedly.

Without this, there is no way to create the very first user: `POST /api/auth/login` (Task 8) has nothing to check credentials against on a freshly migrated database.

- [ ] **Step 1: Write the failing tests**

`backend/test/seed.test.js`:
```js
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../db/pool.js';
import { migrate } from '../db/migrate.js';
import { seedAdmin } from '../db/seed.js';

before(async () => {
  await migrate();
  await pool.query(`DELETE FROM users WHERE email = 'seed-test-admin@example.com'`);
});

test('seedAdmin creates an admin user', async () => {
  const user = await seedAdmin({ email: 'seed-test-admin@example.com', password: 'x' });
  assert.equal(user.role, 'admin');

  const { rows } = await pool.query(`SELECT role FROM users WHERE email = $1`, [
    'seed-test-admin@example.com',
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].role, 'admin');
});

test('seedAdmin is idempotent — running it twice does not create a duplicate', async () => {
  await seedAdmin({ email: 'seed-test-admin@example.com', password: 'x' });
  await seedAdmin({ email: 'seed-test-admin@example.com', password: 'x' });

  const { rows } = await pool.query(`SELECT id FROM users WHERE email = $1`, [
    'seed-test-admin@example.com',
  ]);
  assert.equal(rows.length, 1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test -- test/seed.test.js`
Expected: FAIL — `Cannot find module '../db/seed.js'`

- [ ] **Step 3: Implement `backend/db/seed.js`**

```js
import { findUserByEmail, createUser } from './usersRepo.js';

export async function seedAdmin({
  email = process.env.ADMIN_EMAIL || 'admin@solarwash.io',
  password = process.env.ADMIN_PASSWORD || 'change-me-now',
} = {}) {
  const existing = await findUserByEmail(email);
  if (existing) {
    console.log(`Admin user already exists: ${email}`);
    return existing;
  }
  const user = await createUser({ email, password, role: 'admin' });
  console.log(`Created admin user: ${email}`);
  return user;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test -- test/seed.test.js`
Expected: PASS — `# pass 2`

- [ ] **Step 5: Commit**

```bash
cd "/Users/macpro/Desktop/SolaWash Web"
git add backend/db/seed.js backend/test/seed.test.js
git commit -m "backend: add idempotent bootstrap admin seed script"
```

---

## Task 8: `server.js` assembly + `POST /api/auth/login` + `/health`

**Files:**
- Create: `backend/api/auth.js`
- Create: `backend/server.js`
- Test: `backend/test/server.test.js`

**Interfaces:**
- Consumes: `pool` (Task 1), `findUserByEmail` (Task 6), `verifyPassword`, `signToken` (Task 5).
- Produces: `createApp(): express.Express` from `backend/server.js` (used by tests and by the boot script at the bottom of the same file when run directly via `node server.js`); an Express `Router` (default export) from `backend/api/auth.js`, mounted by `server.js` at `/api/auth`.

These two files are written together in one task rather than split across two: the login route is inert without an app to mount into, and the app is not worth testing without a real route — splitting them would mean carrying a deliberately-failing test across a task boundary for no benefit.

- [ ] **Step 1: Write the failing tests**

`backend/test/server.test.js`:
```js
import { test, before, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { pool } from '../db/pool.js';
import { migrate } from '../db/migrate.js';
import { createUser } from '../db/usersRepo.js';
import { createApp } from '../server.js';

let app;

before(async () => {
  await migrate();
  app = createApp();
});

beforeEach(async () => {
  await pool.query(`DELETE FROM users WHERE email = 'login-test@example.com'`);
  await createUser({ email: 'login-test@example.com', password: 'correct-password', role: 'operator' });
});

test('POST /api/auth/login succeeds with correct credentials', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'login-test@example.com', password: 'correct-password' });

  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.role, 'operator');
});

test('POST /api/auth/login rejects a wrong password', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'login-test@example.com', password: 'wrong-password' });

  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'bad credentials');
});

test('POST /api/auth/login rejects an unknown email without leaking which emails exist', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'does-not-exist@example.com', password: 'anything' });

  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'bad credentials');
});

test('GET /health reports ok and a real site count from Postgres', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(typeof res.body.sites, 'number');
  assert.ok(res.body.time);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npm test -- test/server.test.js`
Expected: FAIL — `Cannot find module '../server.js'`

- [ ] **Step 3: Implement `backend/api/auth.js`**

```js
import { Router } from 'express';
import { findUserByEmail } from '../db/usersRepo.js';
import { verifyPassword, signToken } from '../auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await findUserByEmail(email || '');
  if (!user || !verifyPassword(password || '', user.salt, user.password_hash)) {
    return res.status(401).json({ error: 'bad credentials' });
  }
  const token = signToken({ sub: user.id, role: user.role, email: user.email });
  res.json({ token, role: user.role });
});

export default router;
```

- [ ] **Step 4: Implement `backend/server.js`**

```js
import express from 'express';
import cors from 'cors';
import { pool } from './db/pool.js';
import authRoutes from './api/auth.js';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', async (_req, res) => {
    const { rows } = await pool.query('SELECT count(*)::int AS sites FROM sites');
    res.json({ ok: true, sites: rows[0].sites, time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createApp();
  const port = process.env.PORT || 4000;
  app.listen(port, () => console.log(`SolarWash backend listening on :${port}`));
}
```

- [ ] **Step 5: Run all backend tests to verify everything passes together**

Run: `cd backend && npm test`
Expected: PASS — all test files report `# pass`, `# fail 0` overall.

- [ ] **Step 6: Boot the real server and smoke-test it manually**

```bash
cd backend
npm run migrate
npm run seed
npm start &
sleep 1
curl -s http://localhost:4000/health
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@solarwash.io","password":"change-me-now"}'
kill %1
```
Expected: `/health` returns `{"ok":true,"sites":0,...}`; `/api/auth/login` returns a JSON body containing a `token` and `"role":"admin"`.

- [ ] **Step 7: Commit**

```bash
cd "/Users/macpro/Desktop/SolaWash Web"
git add backend/api/auth.js backend/server.js backend/test/server.test.js
git commit -m "backend: assemble server.js, wire /health and POST /api/auth/login"
```

---

## Task 9: Local setup documentation

**Files:**
- Create: `backend/README.md`

**Interfaces:** None — documentation only.

- [ ] **Step 1: Write `backend/README.md`**

```markdown
# SolarWash backend

Real inverter telemetry, drone thermal analysis, fusion, and cleaning dispatch.
See `docs/superpowers/specs/2026-07-17-inverter-thermal-cleaning-system-design.md`
in the repo root for the full system design.

## Local setup

1. Install PostgreSQL (Homebrew):
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   ```
2. Create the databases:
   ```bash
   createdb solarwash_dev
   createdb solarwash_test
   ```
3. Install dependencies and configure environment:
   ```bash
   npm install
   cp .env.example .env
   ```
4. Run migrations and seed the first admin user:
   ```bash
   npm run migrate
   npm run seed
   ```
   Reads `ADMIN_EMAIL`/`ADMIN_PASSWORD` from `.env` (defaults to
   `admin@solarwash.io` / `change-me-now` — change this in `.env` before
   running in anything but local development).
5. Start the server:
   ```bash
   npm start
   ```
   Listens on `PORT` from `.env` (default `4000`). `GET /health` should
   return `{"ok":true,...}`.

## Running tests

```bash
npm test
```

Tests run against `solarwash_test` (a separate database from `solarwash_dev`,
created in step 2 above), not mocks — `pretest` runs migrations against it
automatically. Every test that touches the database cleans up its own rows;
no test relies on database state left over from another test file.

## What's here so far (Phase 1 of the system design)

- Full Postgres schema for the entire system (users, sites, strings, panels,
  telemetry, thermal imagery, dispatch, and robot integration tables) — later
  phases populate these, this phase only creates them.
- Real JWT authentication backed by Postgres, replacing the in-memory demo
  users used by the earlier prototypes.

Real inverter polling, thermal ingestion, the fusion layer, cleaning dispatch,
and robot integration are **not yet wired** — those are separate, later plans
(see `docs/superpowers/specs/2026-07-17-inverter-thermal-cleaning-system-design.md`'s
"Suggested implementation phasing").
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/macpro/Desktop/SolaWash Web"
git add backend/README.md
git commit -m "backend: add local setup documentation"
```

---

## Self-Review Notes

**Spec coverage (Phase 1 scope only — full spec coverage is tracked across all future phase plans):**
- "1. Postgres schema + migrations" ✅ Tasks 3–4 (every table from the spec's Data model section).
- "`backend/auth.js` on real `users` table" ✅ Tasks 5–6 (auth utilities + Postgres-backed repository).
- Login contract matching the existing frontend (`POST /api/auth/login` → `{token, role}` / 401) ✅ Task 8, verified in Task 8's own manual smoke test (Step 6).
- Bootstrap problem (spec doesn't say how the first user gets created) — identified as a real gap during planning, not in the original spec; resolved with an idempotent seed script (Task 7) following the same pattern as `console-server/server.js`'s `seedOperator()`. Not a scope-creep addition — without it, Task 8's login route would have nothing to authenticate against.

**Placeholder scan:** no "TBD"/"TODO"/"add appropriate error handling" found — every step has complete, runnable code.

**Type/name consistency check:** `createUser`/`findUserByEmail` signatures match across Task 6 (definition), Task 7 (seed.js usage), and Task 8 (login route usage and test setup). `pool` import path (`../db/pool.js` vs `../../db/pool.js`) verified correct relative to each test file's actual directory depth (`test/db/*.test.js` is two levels deep, `test/*.test.js` is one level deep). `migrate()` default-parameter signature (Task 2) matches its usage with an explicit `dir` argument in Task 2's own test and its no-argument usage in Tasks 3, 4, 6, 7, 8.

---

## What's Deliberately Not in This Plan

Per the design spec's Non-goals and "Suggested implementation phasing," none of the following are touched here — they are separate future plans: real Modbus/SunSpec polling (Phase 2), thermal image ingestion (Phase 3), the fusion layer (Phase 4), cleaning schedule/dispatch logic (Phase 5), or robot integration logic (Phase 6). This plan only creates the tables those phases will use and a working login — `strings.inverter_slug`/`inverter_host` etc. exist as columns now but nothing populates or reads them yet.
