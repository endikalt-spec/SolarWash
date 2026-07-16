/**
 * assessSite.js
 * ---------------------------------------------------------------------------
 * SolarWash — end-to-end orchestrator.
 *
 * Chains the five layers into one flow per site:
 *
 *   irradiance.getIrradiance ── ghi/ambientC/dni/dhi (API + clear-sky fallback)
 *           │
 *   inverterAdapters.pollInverter ── transport select + read (Modbus/cloud)
 *           │            (sunspecModbus reads AC + per-string DC, model 160)
 *           ▼
 *   prEngine.evaluateSite ── per-string PR vs each string's tilt/azimuth
 *           ▼
 *   soilingTemporal ── accumulate snapshots; soiling vs shading vs fault;
 *                      stability-gated cleaning alert
 *
 * Use `createSiteAssessor(site)` per site in the polling loop:
 *   const a = createSiteAssessor(site);
 *   // on each tick:  await a.poll();
 *   // periodically:  a.decision();
 *
 * For tests/demo, inject `reading` or `readingProvider` to bypass real I/O.
 * ---------------------------------------------------------------------------
 */

import { getIrradiance } from './irradiance.js';
import { evaluateSite } from './prEngine.js';
import { pollInverter } from './inverterAdapters.js';
import { createSoilingTracker } from './soilingTemporal.js';

/** Normalize a site config into the shapes each layer expects. */
function nameplateMap(site) {
  return Object.fromEntries(site.strings.map((s) => [s.id, s.nameplateW]));
}

/**
 * One poll = one snapshot. Resolves irradiance, obtains an inverter reading,
 * evaluates per-string PR. Returns { snapshot, weather, reading }.
 *
 * @param {object} site
 * @param {object} opts
 *   now?            epoch ms / Date (default: Date.now())
 *   reading?        pre-supplied normalized reading (skips polling)
 *   readingProvider?(site, ms) => reading  (async; for sims/tests)
 *   irradianceOpts? passed to getIrradiance (fetchImpl, preferClearSky, ...)
 */
export async function pollOnce(site, opts = {}) {
  const ms = opts.now != null ? (opts.now instanceof Date ? opts.now.getTime() : opts.now) : Date.now();

  const weather = await getIrradiance(
    {
      ts: ms, lat: site.lat, lon: site.lon,
      altitudeM: site.altitudeM, linkeTurbidity: site.linkeTurbidity,
      tariffPerKWh: site.tariffPerKWh,
    },
    opts.irradianceOpts || {}
  );

  let reading;
  if (opts.reading) reading = opts.reading;
  else if (opts.readingProvider) reading = await opts.readingProvider(site, ms);
  else {
    const inv = site.inverter || {};
    reading = await pollInverter(inv.slug, inv.access || {}, inv.conn || {});
  }

  const snapshot = evaluateSite({ ts: ms, site, weather, reading });
  return { snapshot, weather, reading };
}

/**
 * Stateful per-site assessor: accumulates snapshots and exposes the gated
 * temporal decision. Wraps a bounded tracker (persist to DB in production).
 */
export function createSiteAssessor(site, opts = {}) {
  const tracker = createSoilingTracker({ maxSnapshots: opts.maxSnapshots || 5000 });
  const npById = nameplateMap(site);

  return {
    site,
    tracker,
    async poll(pollOpts = {}) {
      const out = await pollOnce(site, { ...opts, ...pollOpts });
      tracker.add(out.snapshot);
      return out;
    },
    decision(evalOpts = {}) {
      return tracker.evaluate({ nameplateById: npById, ...opts.soilingOpts, ...evalOpts });
    },
    size() { return tracker.size(); },
    reset() { tracker.clear(); },
  };
}

/**
 * One-shot convenience: single poll + immediate (likely insufficient_data)
 * decision. Mostly for smoke checks; real use accumulates via the assessor.
 */
export async function assessSite(site, opts = {}) {
  const a = createSiteAssessor(site, opts);
  const out = await a.poll(opts);
  return { ...out, decision: a.decision() };
}

export default assessSite;
