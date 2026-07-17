# SolarWash — Real System: Inverter Connectivity + Drone Thermal Analysis + Cleaning Dispatch

**Status:** Approved by user, ready for implementation planning
**Date:** 2026-07-17
**Supersedes:** the "wire the engine into backend-proxy" TODO in the repo root `README.md`

## Context

Following the earlier consolidation (single role-scoped web app, one product; see repo `README.md`), the founder confirmed the first paying customer is **all three segments simultaneously** (residential/small-business, C&I O&M, utility) — served through the existing role-scoped model (admin/operator/viewer), not three separate products.

This spec covers building the first genuinely **real, working system**: actual inverter telemetry, drone thermal imagery analysis, a fusion layer that combines the two, and a cleaning-dispatch system triggered by schedule, confirmed soiling, or PR drop. This replaces the in-memory demo/prototype backends with a persistent, real system.

## Goals

1. Real per-string PR telemetry from physical inverters over SunSpec/Modbus TCP.
2. Drone thermal imagery (DJI R-JPEG) upload, parsing, and threshold-based anomaly detection, manually mapped to panels/zones.
3. A fusion layer that combines inverter-derived soiling/shading/fault classification with thermal findings into one explainable verdict per string/panel.
4. A cleaning-schedule and work-order dispatch system, triggered by calendar schedule, confirmed soiling, PR drop, or a fleet-wide dust-storm signature — with human approval before real-world dispatch, and guardrails (peak-hour protection, rain delay).
5. Real, persistent Postgres-backed data model and authentication, replacing the current in-memory `Map`-based stores.
6. Integration with an automated panel-cleaning robot — a vendor-agnostic control abstraction with physical safety interlocks (wind, human presence, resource level), wired into the same work-order lifecycle as human-crew dispatch.

## Non-goals (explicitly out of scope for this build)

- **ML-based thermal defect classification** (defect-type recognition from thermal shape). v1 uses threshold/delta-T rules only — no training data exists yet.
- **Automatic GPS-based photo→panel projection.** v1 is manual zone assignment by the operator; GPS/altitude/gimbal-yaw is captured and stored from every image's EXIF for a future v2 auto-projection feature, but auto-projection itself is not built now.
- **`LOCAL_HTTP` and `CLOUD_API` inverter transports** (Fronius local HTTP, SolarEdge/Enphase cloud, etc.) — remain stubs. Only `MODBUS_TCP` (SunSpec) is wired to real I/O in this phase, per the founder's confirmed first-vendor choice.
- **A specific cleaning-robot vendor integration.** No vendor is chosen yet; this build ships a vendor-agnostic control abstraction (`robotAdapters.js`, same registry pattern as `inverterAdapters.js`) with no real implementation behind it — the first real vendor adapter is a follow-up once one is selected.
- **Certifying or replacing the cleaning robot's own physical safety systems.** Our software is a coordination layer that assumes the underlying hardware has its own certified interlocks (wind/tip-over/emergency-stop, etc.) — the safety checks in this spec are an additional software-level layer, not a substitute for vendor-certified hardware safety.
- **Automatic recalibration of the soiling classifier from post-wash PR results.** The post-wash PR reading is captured and stored (closes the loop for human review) but does not feed an automated retraining/calibration pipeline yet.
- **S3/object-storage migration.** Thermal images are stored on local disk in v1, behind a storage interface that can be swapped later without changing callers.
- Unresolved from the earlier Council verdict and intentionally NOT re-litigated here: the exact liability tier above which autonomous claims become dishonest, and whether utility buyers need white-label/SSO/on-prem. Those remain open business questions; this spec only builds the technical system, with the fusion layer and dispatch system designed to keep a human in the loop for consequential actions (this is a deliberate control, not an accident).

## Architecture

```
solarwash-web.jsx  ──HTTP──▶  backend/  ──Modbus TCP──▶  real inverters (SunSpec, MPPT model 160)
                                 │
                                 ├── Postgres (single source of truth)
                                 └── local disk: storage/thermal/{flightId}/  (behind a storage interface)
```

One new Express service, `backend/`, replacing both existing partial backends (`backend-proxy/` and `engine-and-console/console-server`), which move to `_archive/` as reference once `backend/` is live. Single process, modular by responsibility — not microservices; this is a small-team system, and the existing prototypes already over-fragmented into too many partial backends.

```
backend/
  api/            auth.js, inverters.js, thermal.js, workorders.js, robots.js, chat.js  (HTTP routes)
  engine/         prEngine.js, soilingTemporal.js, inverterAdapters.js,
                  sunspecModbus.js, assessSite.js, irradiance.js               (moved as-is from engine-and-console/engine)
  thermal/        upload.js, exifParse.js, thermalMatrix.js, anomalyDetect.js  (new)
  fusion/         verdict.js                                                   (new)
  dispatch/       scheduler.js, guardrails.js, workOrders.js                   (new)
  robot/          robotAdapters.js, robotSafety.js                             (new)
  weather.js      (moved as-is from backend-proxy/weather-proxy.js)
  auth.js         (moved as-is from engine-and-console/console-server/auth.js)
  db/             migrations/, pool.js  (plain SQL via `pg`, no ORM)
  scheduler.js    inverter polling loop (adapted from console-server/scheduler.js)
  server.js       app assembly
storage/
  thermal/{flightId}/{imageId}.jpg      (raw uploaded files; storage interface, local disk in v1)
```

## Data model (PostgreSQL)

```sql
-- identity & sites
users(id, email, password_hash, salt, role, site_id_nullable, created_at)
  -- role: admin | operator | viewer. viewer.site_id_nullable scopes a homeowner to one site.
sites(id, name, owner_user_id, lat, lon, kw_capacity, tier, created_at)
strings(id, site_id, nameplate_w, tilt_deg, azimuth_deg, inverter_slug, inverter_host, inverter_port, inverter_unit_id)
panels(id, string_id, position_in_string, lat_nullable, lon_nullable)

-- inverter telemetry (real, from SunSpec/Modbus polling)
telemetry_readings(id, string_id, ts, ac_w, dc_w, expected_w, pr_pct, transport)
soiling_events(id, string_id, ts, classification, confidence)
  -- classification: SOILING | SHADING | FAULT | none  (soilingTemporal.js output, unchanged)
inverter_health(id, site_id, last_poll_ts, latency_ms, consecutive_failures, last_error, transport)

-- drone thermal imagery
thermal_flights(id, site_id, pilot_user_id, flown_at, zone_note, created_at)
thermal_images(id, flight_id, panel_id_nullable, string_id_nullable, gps_lat, gps_lon,
                alt_m, gimbal_yaw_deg, gimbal_pitch_deg, captured_at, storage_path,
                status, parse_error_nullable)
  -- status: uploaded | parsed | parse_failed
thermal_findings(id, image_id, kind, delta_t, severity, panel_id_nullable)
  -- kind: hot_spot | hot_panel | string_break

-- fusion (computed on read, not materialized — see Fusion layer)

-- cleaning schedule & dispatch
cleaning_schedules(id, site_id, string_id_nullable, interval_days, next_due_date, active)
work_orders(id, site_id, string_id_nullable, trigger_reason, verdict_evidence_id_nullable,
            status, requested_at, approved_by_user_id, approved_at, dispatched_at,
            completed_at, completed_by_user_id, pr_before_pct, pr_after_pct, notes)
  -- trigger_reason: MANUAL | VERDICT_SOILING | PR_DROP | SCHEDULED | DUST_EVENT
  -- status: PENDING_APPROVAL | REJECTED | QUEUED | BLOCKED_PEAK_HOURS |
  --         BLOCKED_RAIN_FORECAST | SATISFIED_BY_RAIN | BLOCKED_WIND |
  --         BLOCKED_PRESENCE_DETECTED | BLOCKED_ROBOT_RESOURCE | DISPATCHED |
  --         IN_PROGRESS | NEEDS_ATTENTION | COMPLETED | CANCELLED
  -- CANCELLED is reachable from QUEUED/BLOCKED_*/DISPATCHED — an operator aborting
  -- an already-queued or dispatched job (crew unavailable, conditions changed).
  -- Distinct from REJECTED, which only applies to declining a PENDING_APPROVAL suggestion.
  -- NEEDS_ATTENTION is reached only from a mid-run robot abort (see Component 6) —
  -- never auto-retried, always requires a human decision before the order moves again.
guardrail_settings(site_id, peak_start, peak_end, rain_delay_enabled, rain_delay_hours,
                    wind_speed_limit_ms)

-- automated cleaning robot
cleaning_robots(id, site_id, string_id_nullable, vendor_slug, transport, conn_json,
                 capabilities_json, status, resource_level_pct_nullable, last_status_ts)
  -- transport: LOCAL | CLOUD  (same TRANSPORT enum as inverterAdapters.js)
  -- capabilities_json: { presenceSensor: bool, resourceLevel: bool }  — declares which
  --   safety signals this vendor's hardware actually supports (see Component 6:
  --   "not supported" skips that guardrail; "supported but unreadable" hard-blocks).
  -- status: idle | cleaning | fault | offline
robot_runs(id, work_order_id, robot_id, started_at, completed_at, status, stop_reason_nullable, telemetry_json)
  -- status: running | completed | aborted_safety | aborted_fault | aborted_manual
```

`panels`/`strings` are the shared key that both inverter telemetry and thermal findings attach to — this is what makes the fusion layer possible.

## Components

### 1. Real inverter connectivity (SunSpec/Modbus TCP)

`sunspecModbus.js`'s `readInverterSunSpec()` and `inverterAdapters.js`'s `pollInverter()` MODBUS_TCP branch are **already fully implemented**, not stubs — verified by reading the source. `assessSite.js`'s `createSiteAssessor(site).poll()` already chains irradiance → inverter read → `prEngine.evaluateSite()` → soiling tracker.

`backend/scheduler.js` (adapted from `console-server/scheduler.js`, which already implements this pattern) creates one `assessor` per site with a Modbus-reachable inverter and polls it on a fixed interval, **default 60 seconds per site** (not the ~1s figure in `sunspecModbus.js: updateSeconds`, which describes the register's own refresh rate, not a sensible polling cadence for a multi-site scheduler) — configurable per site via `guardrail_settings` or a new per-site `poll_interval_seconds` column if finer control turns out to be needed. Each poll writes a row to `telemetry_readings`; when the soiling tracker's classification changes, write a row to `soiling_events`.

`LOCAL_HTTP` and `CLOUD_API` transports remain stubs (throwing `TODO` errors) — out of scope per Non-goals.

### 2. Drone thermal imagery (DJI R-JPEG)

No pure-JS library decodes DJI's embedded thermal data; the pipeline shells out to two external, well-established tools:

```
Upload (multipart) → exiftool (GPS/altitude/gimbal angles/capture time)
                   → DJI Thermal SDK's `dji_irp` CLI (temperature matrix)
                   → thermal/anomalyDetect.js (mean + stddev per frame; delta-T > threshold → finding)
```

`POST /api/thermal/flights` creates a `thermal_flights` row; each uploaded file becomes a `thermal_images` row, stored on local disk (`storage/thermal/{flightId}/`) behind a storage interface (swap to S3-compatible later without changing callers). EXIF (GPS/alt/yaw) is parsed and stored for **every** image regardless of v1/v2 status, since it costs nothing now and is required for the deferred auto-projection feature.

The operator manually assigns each flight (or individual images) to a zone/string via a dropdown in the UI — this writes `panel_id`/`string_id` on `thermal_images`.

**Deployment dependency:** the server needs `exiftool` (`brew install exiftool` / `apt install libimage-exiftool-perl`) and DJI's Thermal SDK (downloaded directly from DJI, not via a package manager, under DJI's license) installed. This is the one external-binary dependency in the whole system and must be documented in deploy instructions.

### 3. Fusion layer

`fusion/verdict.js` — a pure function, no ML, fully explainable, computed on read (not materialized/cached, to avoid drift from source tables):

| PR engine says | Thermal says | Verdict | Action |
|---|---|---|---|
| SOILING | no hot spots | `SOILING_CONFIRMED` | schedule wash |
| SOILING | hot spot present | `CONTRADICTION_NEEDS_REVIEW` | do not auto-wash — needs human review |
| FAULT | hot panel present | `HARDWARE_FAULT_CONFIRMED` | dispatch technician, not cleaning crew |
| FAULT | no hot spots | `FAULT_UNCONFIRMED` | dispatch technician cautiously — thermal didn't confirm |
| SHADING | no anomalies | `SHADING_STRUCTURAL` | no action — structural, log only |
| none (healthy PR) | hot spot present | `SILENT_THERMAL_DEFECT` | early warning — schedule inspection |
| insufficient recent data on either side | — | `INSUFFICIENT_DATA` | wait |

Each verdict carries `evidence` — the specific `soiling_events.id` and `thermal_findings.id[]` it was computed from — so the UI can show "why" on click. Thermal findings are only considered "recent" within a configurable window (default 30 days), since drone flights are periodic, not continuous, unlike near-real-time inverter polling.

### 4. Cleaning schedule & dispatch

Work orders are created by five trigger types (`MANUAL`, `VERDICT_SOILING`, `PR_DROP`, `SCHEDULED`, `DUST_EVENT` — see Data model). **Confirmed decision: orders triggered by `VERDICT_SOILING`, `PR_DROP`, or `DUST_EVENT` are created in `PENDING_APPROVAL` status and require an operator/admin to approve before they can be dispatched** — the system never dispatches a real-world crew autonomously based on its own inferred verdicts.

`MANUAL` and `SCHEDULED` orders skip `PENDING_APPROVAL` and go straight to `QUEUED`: a `MANUAL` order's approval already happened when the operator clicked "clean now," and a `SCHEDULED` order's approval already happened when an admin set up the recurring `cleaning_schedules` rule — gating them again would be redundant, not safer. Any queued or in-flight order (any trigger type) can be moved to `CANCELLED` by an operator/admin at any point before `COMPLETED`.

`DUST_EVENT` detection is a heuristic, not a separate data feed: if a large fraction of a site's strings show a correlated, simultaneous PR drop in the same short window (distinct from a single string drifting down over days, which is soiling's normal signature), that is itself the dust-storm signal.

Guardrails run when a `QUEUED` order is about to move to `DISPATCHED`:
- **Peak-hour protection** — blocks dispatch inside the site's local peak window (default 09:00–17:00, per `guardrail_settings`).
- **Rain delay** — checks `weather.js` (Open-Meteo forecast, moved as-is from `backend-proxy/weather-proxy.js`); if rain is forecast, blocks and later marks the order `SATISFIED_BY_RAIN` instead of dispatching, once rain occurs (saves a real truck roll).
- If the weather check itself fails (API unreachable), the guardrail is **skipped**, not treated as a block — an indefinite silent hang is worse than asking a human to decide.
- **Three more guardrails apply only when the string/site has a registered `cleaning_robots` entry** — wind speed, human presence, and robot resource level. See Component 6 for why these are hard blocks rather than skip-on-failure like the weather check above.

When a crew marks an order `COMPLETED`, the next telemetry poll for that string's PR is captured into `pr_after_pct` — a simple, honest record of whether the wash worked, visible to the operator. This does not feed any automated recalibration (see Non-goals).

### 5. Auth & roles

`console-server/auth.js` (scrypt + salt via Node's built-in `crypto`, JWT via `jsonwebtoken`, `requireAuth`/`requireRole` middleware) is correct as designed and moves to `backend/auth.js` unchanged, with its data source switched from the in-memory `db.operators` `Map` to a `users` Postgres table. Roles remain `admin` / `operator` / `viewer` (unchanged from the existing role-scoped frontend). Hardcoded `DEMO_USERS` are removed from the production build. `viewer` role is scoped to a single `site_id` (a homeowner sees only their own site).

### 6. Automated cleaning robot integration

`robot/robotAdapters.js` follows the exact registry pattern already used by `inverterAdapters.js`: a common contract (`connect()`, `start(params)`, `stop()`, `getStatus()` → `{status, resourceLevel, telemetry}`) that a concrete vendor implements later, without changing anything upstream. `TRANSPORT.LOCAL`/`TRANSPORT.CLOUD` reuses the same enum as inverter connectivity — most commercial cleaning robots (Ecoppia and similar) are reachable one of these two ways, same as inverters.

**No real vendor ships in this phase** (see Non-goals) — this component builds the abstraction and the safety-interlock logic only, tested against a mock adapter.

**Safety interlocks**, checked as three additional guardrails (alongside peak-hour/rain, see Component 4) before a `QUEUED` order can reach `DISPATCHED`, but *only when the string/site has a registered `cleaning_robots` entry*:

| Interlock | Check | Missing/unreadable signal |
|---|---|---|
| Wind speed | `weather.js` forecast/current reading vs `guardrail_settings.wind_speed_limit_ms` | Same skip-on-failure as rain delay (weather API itself is down) |
| Human presence on site | `cleaning_robots` reports a presence sensor is present and clear | **Hard block** — "signal unavailable" is treated the same as "presence detected," never the same as "clear" |
| Robot resource level (water/battery) | `getStatus().resourceLevel` above a configured minimum | **Hard block**, flagged for maintenance follow-up rather than silently retried forever |

**Capability-aware, not one-size-fits-all:** not every future vendor will expose every signal (e.g., a robot with no presence sensor at all). `cleaning_robots.capabilities_json` declares upfront which signals a given robot supports — same pattern as `inverterAdapters.js`'s `supportsPerStringPR()`. If a capability is declared unsupported, that guardrail is skipped entirely (the site operator accepts the residual risk operationally, e.g., schedule-only cleaning windows). If a capability **is** declared supported but the live read fails or errors, that is the "missing/unreadable signal" case above — hard block, never treated as "fine, proceed."

**Auto-start (confirmed decision):** once a robot-equipped order clears all applicable guardrails and reaches `DISPATCHED`, that transition itself triggers `robotAdapter.start()` — no separate manual "start robot" click, since human approval already happened earlier in the lifecycle (Component 4). A `robot_runs` row is created with `status = 'running'`.

**Completion and mid-run safety:** when the robot reports (via poll or vendor callback) `status = 'completed'`, the work order auto-transitions to `COMPLETED` and captures `pr_after_pct`, same as a human-crew order. If wind or presence conditions cross the threshold **while the robot is running**, the backend calls `robotAdapter.stop()` as an additional software-level safety layer — explicitly **not** a replacement for the vendor's own certified hardware interlocks (see Non-goals). A mid-run abort (`aborted_safety` / `aborted_fault`) moves the work order to `NEEDS_ATTENTION`, never automatically back to `QUEUED` — an automatic retry loop on a real safety abort is worse than asking a human to look at it.

## Error handling

1. **Inverter polling failures** (Modbus timeouts/disconnects are expected on real networks) — `inverter_health.consecutive_failures` tracked per site; after a configurable threshold, the site's UI status flips to `offline` rather than silently displaying stale data as live.
2. **Thermal parsing failures** (`exiftool`/`dji_irp` on a corrupt or non-DJI file) — the specific image is marked `thermal_images.status = 'parse_failed'` with the error text; the rest of the batch's images are processed independently and are not blocked by one failure.
3. **Guardrail check failures** (weather API unreachable) — the check is skipped with a `weather_check_skipped: true` flag rather than blocking indefinitely; the human approver sees this and decides.
4. **Robot safety-signal failures are the deliberate opposite policy of (3).** A cleaning-robot presence or resource signal that is unreadable is a **hard block**, never skipped — see Component 6. This asymmetry is intentional: a stale forecast risks a wasted trip, but a stale presence sensor risks a person. Implementers should not "fix" this by making it consistent with (3).

## Testing

- `engine/*.js` — already pure functions with no sockets/clock dependency (documented in their own header comments); existing tests carry over unchanged.
- `fusion/verdict.js` — pure function; the 7-row rule table above becomes 7+ unit test cases, explicitly including `CONTRADICTION_NEEDS_REVIEW`.
- Real Modbus I/O and external binaries (`dji_irp`, `exiftool`) are **not** mocked in unit tests — emulating Modbus register responses would give false confidence that real hardware behaves the same way. These are covered by an integration smoke test run against real hardware/files at deploy time instead.
- `robot/robotSafety.js` — pure guardrail logic, unit-tested against a mock `robotAdapter` covering all combinations of capability-supported/unsupported × signal-clear/blocked/unreadable. No real robot exists yet, so there is no hardware smoke test for this component until a vendor is chosen — this is a real gap, not an oversight, and should be revisited the moment a vendor is selected.
- `api/*.js` routes — tested with `supertest` against a real Postgres test database (Docker), not a mocked DB layer.

## Suggested implementation phasing

(For the implementation plan to sequence, not a rigid mandate.)

1. Postgres schema + migrations; `backend/auth.js` on real `users` table.
2. Real inverter polling wired end-to-end (`backend/scheduler.js`, `api/inverters.js`) — this alone makes `/api/inverters` return real per-string PR data, which the existing frontend already consumes.
3. Thermal ingestion pipeline (`upload.js`, `exifParse.js`, `thermalMatrix.js`, `anomalyDetect.js`) + manual zone-assignment UI.
4. Fusion layer (`fusion/verdict.js`) — depends on both (2) and (3) having real data to combine.
5. Cleaning schedule & dispatch (`dispatch/*`) — depends on (4) for `VERDICT_SOILING`/`PR_DROP` triggers, but `MANUAL` and `SCHEDULED` triggers can be built and tested independently earlier if useful.
6. Robot integration (`robot/robotAdapters.js`, `robot/robotSafety.js`) — depends on (5)'s work-order lifecycle existing (the guardrails and auto-start hook into it). Can be built and fully unit-tested against a mock adapter before any real vendor is chosen; wiring a real vendor is a separate follow-up task once one is selected.

## Open questions (not blocking this spec, but should be resolved before/during implementation)

- Exact PR-drop threshold and dust-event correlation threshold (how many strings, what window) — needs either founder domain input or a first batch of real telemetry to calibrate sensibly; ship with a conservative documented default, tunable per site.
- Default thermal delta-T anomaly threshold — same: ship a literature-reasonable default (this needs a real number sourced from IEC 62446-3 or equivalent thermographic-inspection guidance during implementation), make it configurable.
- Whether DJI Thermal SDK's licensing terms permit the intended deployment (server-side, commercial) — verify before relying on it in production.
- Default wind-speed limit for robot dispatch — needs a real number, likely sourced from whichever vendor is eventually chosen (their own certified operating envelope should set this, not an arbitrary guess); ship a conservative placeholder and revisit once a vendor is selected.
- Which cleaning-robot vendor to integrate first, and whether it exposes `LOCAL` or `CLOUD` transport (or both) — directly determines the first real `robotAdapters.js` implementation.
