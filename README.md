# SolarWash — consolidated repository

Solar-panel cleaning + O&M intelligence platform. Consolidated from many parallel
prototypes into **one product**: a single role-scoped **web** app on one backend.

> Decision (Council of High Intelligence, 2026-07-16): ship **ONE responsive web app**,
> role-scoped (homeowner → operator → admin). Native mobile is deferred to a
> PWA/Capacitor wrapper, not a parallel codebase. "1 kW → 1 GW" is honest at the
> **engine/data layer** (per-string PR is dimensionless/scale-invariant) and must be
> **qualified** at the product/UI/liability layer — never one screen for both a
> homeowner and a grid operator, and no *autonomous* utility-scale fault-detection
> claim until the soiling stability-gate is validated at that scale.

## Structure

```
solarwash-web.jsx          THE single frontend — role-scoped web app (admin/operator/viewer, i18n RU/EN/HE)

backend-proxy/             SHIPPING backend — what solarwash-web.jsx talks to today
  package.json               Node service metadata, scripts, and runtime dependencies
  inverter-proxy.js          /api/inverters, /api/chat  (Express)
  inverter-connectors.js     self-contained vendor connectors
  weather-proxy.js           standalone weather proxy
  INVERTERS.md               integration guide + endpoint contract

engine-and-console/        REAL IP — richer stack, TO BE MERGED into backend-proxy (see TODO)
  engine/                    per-string Performance Ratio + soiling/shading/fault classifier
    prEngine.js              PR vs clean-array physical model (NOAA solar pos, Erbs, POA, NOCT)
    soilingTemporal.js       SOILING vs SHADING vs FAULT, stability-gated alerts
    inverterAdapters.js      vendor registry (SunSpec/Modbus + cloud)
    irradiance.js, sunspecModbus.js, assessSite.js
  console-server/            operator/customer server (JWT auth, polling scheduler) that USES engine/
                             endpoints are /api/operator + /api/customer (NOT the frontend's /api/inverters)

docs/                      strategy/research artifacts (not product code)
_archive/                  retired frontends + duplicates (reversible; safe to delete once confident)
```


## Backend proxy service

`backend-proxy/` is an independent Node service. Run it from that directory:

```bash
npm install
npm start
```

For local development, use `npm run dev`; it starts `inverter-proxy.js` with
`NODE_ENV=development`.

Required environment variables:

| Variable | Purpose | Default / example |
| --- | --- | --- |
| `PORT` | HTTP port for the backend proxy. | `8787` |
| `ALLOWED_ORIGIN` | CORS origin allowed to call the proxy. Use `*` for open local access. | `http://localhost:3000` |
| `ANTHROPIC_API_KEY` | Server-side Anthropic API key used by `/api/chat`. | No default; must be set for AI chat. |

Deployment note: add a `Dockerfile` or unified deployment config for this service later.

## The one open decision — wire the engine into the shipping backend

The shipping `backend-proxy/` currently uses its **own simpler connectors** and does
**not** use the crown-jewel physics engine. The advanced per-string PR + soiling
classifier lives in `engine-and-console/` and is wired to the *Console* server
(different endpoints), whose frontend was retired.

**TODO (the real product-differentiator work):** port `engine/prEngine.js` +
`engine/soilingTemporal.js` into `backend-proxy/inverter-proxy.js` so the shipping
`/api/inverters` responses carry real per-string PR and soiling/shading/fault
classification. `console-server/scheduler.js` is the reference implementation for how
to call the engine (note: its `../../*.js` engine imports are stale — from the
grouped layout they resolve to `../engine/*.js`).

Also add, per the council: a per-alert **confidence score**, and a **consequence-class /
liability parameter** on the alert path (human-in-the-loop above the validated tier).

## What was consolidated (2026-07-16)

Archived to `_archive/` (reversible — this is not a git repo, so nothing was hard-deleted):
- **Duplicates:** `SolarWashDashboard 2.jsx` (byte-identical), `solarwash-web 2.jsx`
  (older 95 KB, superseded), `V!/solarwash-web.jsx` (identical to root),
  `Invertors connest start/` (strict subset of the engine folder).
- **Retired frontends:** `solarwash-pro.jsx` (mobile lineage), `SolarWashDashboard.jsx`
  (residential-only), `SolarWashOperatorConsole.jsx` (operator-only) — their intent
  folds into role-scoped views inside `solarwash-web.jsx`.

Open GTM question the founder must answer (blocks scope): **who is the first paying
buyer** — enterprise O&M / utility, or residential/small-commercial (and is there a
low-CAC installer channel)?
