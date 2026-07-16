# SolarWash Web — Inverter Integration Guide

The web app is fully working in the browser with a live data simulator. To wire it to **real inverters**, drop in the backend (`inverter-proxy.js` + `inverter-connectors.js`) and switch the frontend from the simulator to the API.

## Architecture in one diagram

```
┌──────────────┐   normalized JSON   ┌───────────────────┐   vendor APIs   ┌──────────────┐
│ Web app (UI) │ ◀────────────────── │  Inverter Proxy   │ ◀────────────── │  Inverters   │
│  React       │   /api/inverters    │  (your backend)   │  REST/OAuth/    │ SolarEdge,   │
│  PR + zones  │ ──────────────────▶ │  connectors.js    │  Modbus/SunSpec │ Fronius, …   │
└──────────────┘                     └───────────────────┘                 └──────────────┘
```

The app never speaks a vendor dialect — every inverter is normalized to one schema by a connector. Add a vendor = add one adapter; UI and cleaning logic don't change.

## The common telemetry schema

Every connector's `getTelemetry()` returns:

```js
{
  vendor, siteId, ts,
  acPowerW, dcPowerW, expectedW, energyTodayWh, tempC,
  strings: [
    { id, name, acW, dcW, expectedW, voltage, current, prPct }
  ]
}
```

`prPct` (performance ratio = actual ÷ expected × 100) is the soiling signal. A string drifting below ~85% is dirtying; below ~65% is critical. Per-string PR is what lets the app say *which* array to clean — not just "the system is down."

## Supported vendors

| Vendor | Method | Credentials | Per-string data |
|--------|--------|-------------|-----------------|
| **SolarEdge** | Monitoring API (cloud) | `apiKey`, `siteId` | Yes (optimizer/equipment endpoints) |
| **Fronius** | Solar API (local LAN) | `host` (inverter IP) | Yes (per-MPPT) |
| **Huawei FusionSolar** | NorthBound API | `username`, `systemCode`, `stationCode` | Yes (`pvN_u/i` registers) |
| **Enphase** | Enlighten API v4 (OAuth2) | `apiKey`, `accessToken`, `systemId` | Grouped (micro-inverters) |
| **SMA** | Modbus / SunSpec | `host` | Yes (model 160) |
| **Growatt** | ShineServer | `username`, `password` | Plant-level |
| **Generic SunSpec** | Modbus TCP | `host`, `port`, `unitId` | Yes (model 103 + 160) |

SunSpec is the universal fallback — most modern inverters expose it, so one Modbus adapter covers many brands.

## Expected-power model

When a vendor doesn't return expected output, `expectedPower()` estimates it:

```
expectedW = capacityW × irradianceFactor × tempDerate
```

The included version uses a sine daylight curve for `irradianceFactor`. **For production accuracy, replace it with plane-of-array (POA) irradiance** from a weather/solar API (e.g. Solcast, PVGIS, OpenWeather). Better irradiance → cleaner separation between "cloudy" and "dirty."

## Wiring the frontend to real data

In `solarwash-web.jsx` the `useFleet()` hook drives everything from `MockEngine`. To go live, replace the interval body with a fetch:

```js
useEffect(() => {
  const id = setInterval(async () => {
    const res = await fetch(`${INVERTER_API}`);   // GET /api/inverters
    const data = await res.json();                // { connId: telemetry, ... }
    setTelemetry(data);
    // append rolling power history from the summed AC power…
  }, 5000);
  return () => clearInterval(id);
}, [connectors]);
```

And `addConnector()` should `POST /api/inverters/:vendor` with the credentials instead of spinning up a `MockEngine`. Everything downstream (zones, PR, charts, AI) already consumes the normalized schema, so no other change is needed.

## Backend setup

```bash
npm install express cors
# for SunSpec/Modbus vendors:
npm install jsmodbus
ANTHROPIC_API_KEY=sk-ant-... node inverter-proxy.js
```

Endpoints:
- `POST /api/inverters/:vendor` — connect (body: `{ id, config }`)
- `GET  /api/inverters` — fleet snapshot (all telemetry)
- `GET  /api/inverters/:id/telemetry` — one inverter
- `DELETE /api/inverters/:id` — disconnect
- `POST /api/chat` — Claude proxy (key stays server-side)

## Security checklist

- [ ] **Never** store vendor keys or OAuth tokens in the frontend — they live only on the backend.
- [ ] Encrypt credentials at rest (the demo uses an in-memory Map; use a DB + KMS).
- [ ] Lock CORS to your app's origin (`ALLOWED_ORIGIN`), not `*`.
- [ ] Rate-limit `/api/inverters/*` — vendor APIs have quotas (SolarEdge: 300 req/day/site).
- [ ] Cache telemetry 30–60s; don't hammer inverters on every UI tick.
- [ ] For local connectors (Fronius/Modbus), the backend must sit on the same network or reach the inverter via VPN.

## Adding a new vendor

1. Subclass `InverterConnector` in `inverter-connectors.js`.
2. Implement `connect()`, `getStatus()`, `getTelemetry()` returning `this._norm({...})`.
3. Map the vendor's response into the common `strings[]` schema.
4. Register it in `REGISTRY`. Done — the UI and PR logic need zero changes.
