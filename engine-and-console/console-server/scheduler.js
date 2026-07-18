/**
 * scheduler.js — per-site polling loop.
 *
 * Real sites poll the inverter via the pipeline (pollInverter -> Modbus/cloud).
 * Demo sites (site.demo === true) use a physics-based simulator so the system
 * runs end-to-end with no hardware (onboarding, sales demos, tests).
 */
import { createSiteAssessor } from "../engine/assessSite.js";
import { clearSkyIneichen } from "../engine/irradiance.js";
import { solarPosition, poaIrradiance, cellTemp, expectedDcPowerW } from "../engine/prEngine.js";
import { db, pushSnapshot } from "./store.js";

const timers = new Map();      // siteId -> interval handle
const assessors = new Map();   // siteId -> assessor

/* physics-based demo device: production scales with real sun angle, per-string soiling */
function demoReadingProvider(site) {
  return async (s, ms) => {
    const cs = clearSkyIneichen({ ts: ms, lat: s.lat, lon: s.lon, altitudeM: s.altitudeM, linkeTurbidity: s.linkeTurbidity });
    const sun = solarPosition(ms, s.lat, s.lon);
    const morning = sun.azimuthDeg < 150;
    const dcStrings = s.strings.map((st) => {
      const { poa } = poaIrradiance({
        ghi: cs.ghi, dni: cs.dni, dhi: cs.dhi, tiltDeg: st.tiltDeg,
        panelAzDeg: st.azimuthDeg ?? 180, sunZenithDeg: sun.zenithDeg, sunAzDeg: sun.azimuthDeg, albedo: 0.2,
      });
      const tCell = cellTemp(poa, 30, st.noct ?? 45);
      const expW = expectedDcPowerW({ nameplateW: st.nameplateW, poa, cellTempC: tCell });
      const f = st.demoFactor ?? 0.97; // per-string health for the demo
      const factor = st.demoShadeMorning && morning ? 0.6 : f;
      return { id: st.id, pDc: expW * factor };
    });
    const acPowerW = dcStrings.reduce((a, d) => a + d.pDc, 0) * (s.inverterEff ?? 0.975) * (s.systemLossFrac ?? 0.97);
    return { acPowerW, dcStrings, perStringAvailable: true, transport: "demo" };
  };
}

export function getAssessor(site) {
  let a = assessors.get(site.id);
  if (!a) { a = createSiteAssessor(site, { soilingOpts: site.soilingOpts }); assessors.set(site.id, a); }
  return a;
}

/** Run one poll now; returns { snapshot, weather, reading }. Updates health. */
export async function pollNow(site, { irradianceOpts } = {}) {
  const a = getAssessor(site);
  const opts = { irradianceOpts: irradianceOpts || (site.demo ? { preferClearSky: true } : {}) };
  if (site.demo) opts.readingProvider = demoReadingProvider(site);

  const t0 = Date.now();
  try {
    const out = await a.poll(opts);
    pushSnapshot(site.id, out.snapshot);
    db.health.set(site.id, {
      lastPollTs: new Date().toISOString(),
      latencyMs: Date.now() - t0,
      transport: out.reading?.transport || "n/a",
      consecutiveFailures: 0,
      lastError: null,
    });
    return out;
  } catch (e) {
    const prev = db.health.get(site.id) || {};
    db.health.set(site.id, {
      ...prev, lastPollTs: new Date().toISOString(),
      consecutiveFailures: (prev.consecutiveFailures || 0) + 1, lastError: String(e.message || e),
    });
    throw e;
  }
}

export function startPolling(site, intervalMs = 60000) {
  stopPolling(site.id);
  site.polling = true;
  pollNow(site).catch(() => {});
  const h = setInterval(() => pollNow(site).catch(() => {}), intervalMs);
  timers.set(site.id, h);
}
export function stopPolling(siteId) {
  const h = timers.get(siteId);
  if (h) { clearInterval(h); timers.delete(siteId); }
  const site = db.sites.get(siteId);
  if (site) site.polling = false;
}
export function decisionFor(site) {
  return getAssessor(site).decision({ nameplateById: Object.fromEntries(site.strings.map((s) => [s.id, s.nameplateW])) });
}
