/**
 * inverterAdapters.js
 * ---------------------------------------------------------------------------
 * SolarWash — Inverter Integration Registry (single source of truth).
 *
 * Edit values ONLY in INVERTER_ADAPTERS below. The polling layer consumes this
 * registry to decide HOW to talk to each site (local Modbus vs cloud API) and
 * AT WHAT CADENCE — without any brand-specific logic leaking into the scheduler.
 *
 * STATUS: production-structured config + transport resolver (REAL).
 *         Actual Modbus/HTTP I/O is stubbed at the bottom (clearly marked TODO).
 *
 * Numbers marked `~` are approximate and MUST be re-confirmed against current
 * vendor docs — they shift over time (knowledge baseline: Jan 2026).
 * ---------------------------------------------------------------------------
 */

import { readInverterSunSpec } from './sunspecModbus.js';

export const TRANSPORT = {
  MODBUS_TCP: 'modbus_tcp',   // LAN, SunSpec or proprietary, lowest latency, no rate limit
  MODBUS_RTU: 'modbus_rtu',   // RS485 serial, needs gateway
  LOCAL_HTTP: 'local_http',   // vendor local JSON/REST on the device LAN
  CLOUD_API:  'cloud_api',    // vendor cloud, rate-limited, higher latency
};

export const RESOLUTION = {
  PANEL:    'panel',     // per-module (MLPE / microinverter) — best for residential PR
  STRING:   'string',    // per-MPPT/string — the core PR granularity for C&I + fields
  INVERTER: 'inverter',  // device-level totals only
  PLANT:    'plant',     // combiner/block level (central/utility)
};

// Connectivity tier — drives onboarding flow + upsell logic.
export const TIER = {
  OPEN:     'open',      // open local interface, no gatekeeping
  GATED:    'gated',     // works but needs NDA / partner status / quota mgmt
  UNSTABLE: 'unstable',  // cloud unreliable for 3rd parties — prefer local
  CLOSED:   'closed',    // no comms without adding external datalogger/meter
};

/**
 * SunSpec register hints. For true string inverters, per-string DC data lives in
 * the repeating SunSpec MPPT model (160) — this is the canonical path to
 * per-string Performance Ratio. Base register is vendor-dependent.
 */
export const SUNSPEC = {
  COMMON_MODEL: 1,
  INVERTER_SINGLE_PHASE: 101,
  INVERTER_THREE_PHASE: 103,
  MPPT_MODULE: 160,        // <-- per-string DC current/voltage/power lives here
  TYPICAL_BASE_TCP: 40000, // many vendors map SunSpec from 40000; SolarEdge uses 40000 too
};

/**
 * The registry. Key = stable slug used everywhere in the app/db.
 * he = Hebrew label for UI. perStringDataVia = where PR-grade string data comes from.
 */
export const INVERTER_ADAPTERS = {
  solaredge: {
    he: 'סולאראדג\'',
    vendor: 'SolarEdge',
    transports: [TRANSPORT.MODBUS_TCP, TRANSPORT.CLOUD_API],
    resolution: RESOLUTION.PANEL,
    perStringDataVia: 'panel_cloud', // panel/optimizer data via cloud Monitoring API; Modbus gives inverter+meter
    registerMap: 'sunspec',          // SunSpec-based, with proprietary extensions
    local: {
      protocol: TRANSPORT.MODBUS_TCP,
      port: 1502,                    // installer must enable Modbus TCP (SetApp/LCD)
      unitId: 126,                   // typical SE unit id
      updateSeconds: 1,
      constraints: 'SINGLE concurrent TCP connection only — may need to release the cloud link',
    },
    cloud: {
      api: 'SolarEdge Monitoring API',
      auth: 'api_key (per account + site id)',
      updateSeconds: 900,            // ~15 min energy/power resolution
      rateLimit: '~300 calls/day per account (+ per-site caps) — CONFIRM current',
      panelLevel: true,              // optimizer/panel data exposed here, not on standard Modbus
    },
    tier: TIER.OPEN,
    notes: 'Israeli, panel-level. For per-PANEL PR use cloud; for fast inverter totals use Modbus.',
  },

  huawei: {
    he: 'חואווי',
    vendor: 'Huawei (SUN2000 / FusionSolar)',
    transports: [TRANSPORT.MODBUS_TCP, TRANSPORT.CLOUD_API],
    resolution: RESOLUTION.STRING,
    perStringDataVia: 'modbus_mppt',
    registerMap: 'sunspec',          // via SmartLogger / SDongle
    local: {
      protocol: TRANSPORT.MODBUS_TCP,
      port: 502,                     // SmartLogger3000 / SDongle gateway
      unitId: null,                  // per-inverter id under the logger
      updateSeconds: 5,
      constraints: 'Requires SmartLogger or SDongle-A on the LAN',
    },
    cloud: {
      api: 'FusionSolar Northbound / OpenAPI',
      auth: 'northbound user + systemCode + station codes',
      updateSeconds: 300,            // ~5 min on own account
      rateLimit: 'STRICT per-user quota — vendors recommend 24h sync for 3rd parties; 1 account per plant',
      panelLevel: false,
    },
    tier: TIER.GATED,
    notes: 'Cloud quota is the bottleneck. Prefer local Modbus for real-time string PR.',
  },

  sungrow: {
    he: 'סאנגרו',
    vendor: 'Sungrow',
    transports: [TRANSPORT.MODBUS_TCP, TRANSPORT.CLOUD_API],
    resolution: RESOLUTION.STRING,
    perStringDataVia: 'modbus_mppt',
    registerMap: 'proprietary',      // Sungrow register map (well documented)
    local: {
      protocol: TRANSPORT.MODBUS_TCP,
      port: 502,
      unitId: 1,
      updateSeconds: 5,
      constraints: 'WiNet-S dongle or Logger1000 for fleet/field',
    },
    cloud: {
      api: 'iSolarCloud OpenAPI',
      auth: 'oauth2 (non-standard flow) + appkey',
      updateSeconds: 300,            // data updates ~every 5 min
      rateLimit: 'present; API relatively new — expect gaps per model',
      panelLevel: false,
    },
    tier: TIER.OPEN,
    notes: 'Dominant in IL utility/fields. OAuth2 quirks — local Modbus is steadier.',
  },

  fronius: {
    he: 'פרוניוס',
    vendor: 'Fronius',
    transports: [TRANSPORT.LOCAL_HTTP, TRANSPORT.MODBUS_TCP, TRANSPORT.CLOUD_API],
    resolution: RESOLUTION.STRING,
    perStringDataVia: 'local_http',  // Solar API JSON + SunSpec MPPT model
    registerMap: 'sunspec',
    local: {
      protocol: TRANSPORT.LOCAL_HTTP,
      port: 80,                      // Solar API: GET /solar_api/v1/GetInverterRealtimeData.cgi
      unitId: null,
      updateSeconds: 10,             // ~10s over wired ethernet
      constraints: 'Open JSON, no auth on LAN; Modbus TCP 502 also available',
    },
    cloud: {
      api: 'Solar.web',
      auth: 'account / access key',
      updateSeconds: 300,
      rateLimit: 'lenient',
      panelLevel: false,
    },
    tier: TIER.OPEN,
    notes: 'Most open vendor. Local Solar API needs no credentials — easiest onboarding.',
  },

  sma: {
    he: 'SMA',
    vendor: 'SMA',
    transports: [TRANSPORT.MODBUS_TCP, TRANSPORT.CLOUD_API],
    resolution: RESOLUTION.INVERTER,
    perStringDataVia: 'modbus_mppt', // model-dependent
    registerMap: 'sunspec',          // + SMA Speedwire
    local: {
      protocol: TRANSPORT.MODBUS_TCP,
      port: 502,
      unitId: 3,                     // SMA default susyid-based; verify per model
      updateSeconds: 5,
      constraints: 'Modbus must be enabled in device UI; write/control is SMA-specific',
    },
    cloud: {
      api: 'ennexOS / Sunny Portal',
      auth: 'account',
      updateSeconds: 300,
      rateLimit: 'moderate',
      panelLevel: false,
    },
    tier: TIER.OPEN,
    notes: 'Strong for C&I ground-mounts and central. Reliable Modbus.',
  },

  goodwe: {
    he: 'גודווי',
    vendor: 'GoodWe',
    transports: [TRANSPORT.MODBUS_TCP, TRANSPORT.CLOUD_API],
    resolution: RESOLUTION.INVERTER,
    perStringDataVia: 'modbus_mppt',
    registerMap: 'proprietary',
    local: {
      protocol: TRANSPORT.MODBUS_TCP,
      port: 502,
      unitId: 247,
      updateSeconds: 5,
      constraints: 'RS485/Modbus on most hybrids',
    },
    cloud: {
      api: 'SEMS Portal API',
      auth: 'sems account (MD5 password) — NDA REQUIRED to enable API',
      updateSeconds: 300,
      rateLimit: '3600 calls/hour per account',
      panelLevel: false,
    },
    tier: TIER.GATED,
    notes: 'Cloud needs signed NDA via sales rep. Local Modbus avoids the gate.',
  },

  enphase: {
    he: 'אנפייס',
    vendor: 'Enphase',
    transports: [TRANSPORT.LOCAL_HTTP, TRANSPORT.CLOUD_API],
    resolution: RESOLUTION.PANEL,
    perStringDataVia: 'panel_micro', // microinverter = native per-panel
    registerMap: 'n/a',
    local: {
      protocol: TRANSPORT.LOCAL_HTTP,
      port: 443,                     // IQ Gateway (Envoy) local REST + token
      unitId: null,
      updateSeconds: 5,
      constraints: 'Local Envoy token required (rotates)',
    },
    cloud: {
      api: 'Enlighten Partner API (v4)',
      auth: 'oauth2 + api_key',
      updateSeconds: 900,
      rateLimit: 'Partner plan = installer with 10+ installs only',
      panelLevel: true,
    },
    tier: TIER.GATED,
    notes: 'True per-panel like SolarEdge. Partner API gated by install count.',
  },

  growatt: {
    he: 'גרואט',
    vendor: 'Growatt',
    transports: [TRANSPORT.MODBUS_TCP, TRANSPORT.CLOUD_API],
    resolution: RESOLUTION.INVERTER,
    perStringDataVia: 'modbus_mppt',
    registerMap: 'proprietary',
    local: {
      protocol: TRANSPORT.MODBUS_TCP,
      port: 502,                     // via ShineWiFi-X / datalogger
      unitId: 1,
      updateSeconds: 5,
      constraints: 'Datalogger/RS485 — most reliable path for Growatt',
    },
    cloud: {
      api: 'Growatt OpenAPI (ShinePhone)',
      auth: 'token (officially supported) OR user/pass (flaky)',
      updateSeconds: 300,
      rateLimit: 'frequent permission_denied for 3rd-party/individual accounts',
      panelLevel: false,
    },
    tier: TIER.UNSTABLE,
    notes: 'Cloud unreliable for integrators. Default to local Modbus.',
  },

  solis: {
    he: 'סוליס',
    vendor: 'Solis (Ginlong)',
    transports: [TRANSPORT.MODBUS_TCP, TRANSPORT.CLOUD_API],
    resolution: RESOLUTION.STRING,
    perStringDataVia: 'modbus_mppt',
    registerMap: 'proprietary',
    local: {
      protocol: TRANSPORT.MODBUS_TCP,
      port: 502,
      unitId: 1,
      updateSeconds: 5,
      constraints: 'RS485 datalogger',
    },
    cloud: {
      api: 'SolisCloud API',
      auth: 'key_id + secret (HMAC-signed requests)',
      updateSeconds: 300,
      rateLimit: 'moderate',
      panelLevel: false,
    },
    tier: TIER.OPEN,
    notes: 'Reasonable HMAC-signed cloud API; Modbus also solid.',
  },

  central_utility: {
    he: 'ממיר מרכזי (Utility)',
    vendor: 'Central — Sungrow SG / SMA Sunny Central / TMEIC / Sineng',
    transports: [TRANSPORT.MODBUS_TCP, TRANSPORT.CLOUD_API],
    resolution: RESOLUTION.PLANT,
    perStringDataVia: 'scada_combiner', // string-combiner monitoring units
    registerMap: 'sunspec',             // + IEC 61850 / DNP3 in many plants
    local: {
      protocol: TRANSPORT.MODBUS_TCP,
      port: 502,
      unitId: null,
      updateSeconds: 1,
      constraints: 'Plant SCADA / IEC 61850 — built for real-time telemetry',
    },
    cloud: {
      api: 'vendor SCADA / portal',
      auth: 'project-specific',
      updateSeconds: 60,
      rateLimit: 'n/a (on-prem SCADA)',
      panelLevel: false,
    },
    tier: TIER.OPEN,
    notes: 'Solar farms. Designed for real-time — Modbus/61850 at combiner block level.',
  },

  generic_closed: {
    he: 'ממיר ללא תקשורת',
    vendor: 'No-name / legacy (no datalogger)',
    transports: [],
    resolution: RESOLUTION.INVERTER,
    perStringDataVia: 'none',
    registerMap: 'n/a',
    local: null,
    cloud: null,
    tier: TIER.CLOSED,
    notes: 'UPSELL: add external SunSpec datalogger or CT-clamp meter to make it pollable.',
  },
};

/* ===========================================================================
 * RESOLVER LAYER  (real, framework-agnostic)
 * =========================================================================== */

/** Fetch an adapter by slug, falling back to the closed-tier handler. */
export function getAdapter(slug) {
  return INVERTER_ADAPTERS[slug] || INVERTER_ADAPTERS.generic_closed;
}

/**
 * Decide the best transport for a given site, given what access we actually have.
 * Preference order: local (no rate limit, low latency) > cloud.
 *
 * @param {object} adapter   one entry from INVERTER_ADAPTERS
 * @param {object} access    { hasLan, hasModbus, hasLocalHttp, hasCloudCreds }
 * @returns {{transport:string|null, pollSeconds:number|null, reason:string}}
 */
export function selectTransport(adapter, access = {}) {
  const { hasLan, hasModbus, hasLocalHttp, hasCloudCreds } = access;

  if (adapter.tier === TIER.CLOSED) {
    return { transport: null, pollSeconds: null,
      reason: 'No comms interface — recommend external datalogger/meter (upsell).' };
  }

  const supports = (t) => adapter.transports.includes(t);

  // 1) Prefer local HTTP (e.g. Fronius Solar API, Enphase Envoy) — easiest + fast.
  if (hasLan && hasLocalHttp && supports(TRANSPORT.LOCAL_HTTP)) {
    return { transport: TRANSPORT.LOCAL_HTTP, pollSeconds: adapter.local.updateSeconds,
      reason: 'Local HTTP on LAN — no rate limit, lowest friction.' };
  }

  // 2) Local Modbus TCP — canonical per-string PR path, no rate limit.
  if (hasLan && hasModbus && supports(TRANSPORT.MODBUS_TCP)) {
    return { transport: TRANSPORT.MODBUS_TCP, pollSeconds: adapter.local.updateSeconds,
      reason: `Local Modbus TCP:${adapter.local.port} — best for real-time string data.` };
  }

  // 3) Cloud API — only when no LAN; respect vendor cadence.
  if (hasCloudCreds && supports(TRANSPORT.CLOUD_API) && adapter.cloud) {
    return { transport: TRANSPORT.CLOUD_API, pollSeconds: adapter.cloud.updateSeconds,
      reason: `Cloud ${adapter.cloud.api} — rate-limited (${adapter.cloud.rateLimit}).` };
  }

  return { transport: null, pollSeconds: null,
    reason: 'No usable transport with current access — collect Modbus/LAN or cloud creds.' };
}

/** Can this site yield per-STRING (PR-grade) data on the chosen transport? */
export function supportsPerStringPR(adapter, transport) {
  if (transport === TRANSPORT.CLOUD_API) {
    // Most clouds expose inverter/string aggregates, not raw per-string DC.
    return adapter.perStringDataVia === 'panel_cloud' || adapter.perStringDataVia === 'panel_micro';
  }
  return ['modbus_mppt', 'local_http', 'panel_micro', 'scada_combiner'].includes(adapter.perStringDataVia);
}

/* ===========================================================================
 * DISPATCH STUB  — TODO: wire real I/O before production.
 * Plug in: jsmodbus / modbus-serial (Modbus), axios/fetch (HTTP/cloud).
 * Each branch should return a normalized reading:
 *   { ts, inverterId, acPowerW, dcStrings:[{id, vDc, iDc, pDc}], status }
 * which then feeds the per-string PR engine (actual_AC / expected_AC by orientation).
 * =========================================================================== */
export async function pollInverter(slug, access, conn) {
  const adapter = getAdapter(slug);
  const { transport } = selectTransport(adapter, access);

  switch (transport) {
    case TRANSPORT.MODBUS_TCP: {
      // Real SunSpec read: inverter AC power + per-string DC (MPPT model 160).
      const reading = await readInverterSunSpec({
        host: conn.host,
        port: conn.port || adapter.local?.port || 502,
        unitId: conn.unitId ?? adapter.local?.unitId ?? 1,
        base: conn.base, // optional override; otherwise auto-probed
      });
      reading.adapter = slug;
      reading.resolution = reading.perStringAvailable ? RESOLUTION.STRING : RESOLUTION.INVERTER;
      return reading;
    }
    case TRANSPORT.LOCAL_HTTP:
      // TODO: GET vendor local endpoint (e.g. Fronius GetInverterRealtimeData / Envoy).
      throw new Error('TODO: implement local HTTP read.');
    case TRANSPORT.CLOUD_API:
      // TODO: call adapter.cloud.api with conn creds; respect adapter.cloud.rateLimit.
      throw new Error('TODO: implement cloud API read.');
    default:
      return { ts: Date.now(), inverterId: null, acPowerW: null, dcStrings: [],
        status: 'no_transport', reason: 'closed or missing access' };
  }
}

export default INVERTER_ADAPTERS;
