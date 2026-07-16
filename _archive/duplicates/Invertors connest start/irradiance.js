/**
 * irradiance.js
 * ---------------------------------------------------------------------------
 * SolarWash — Irradiance source layer.
 *
 * Produces the `weather` object that prEngine.evaluateSite() consumes:
 *     { ghi, ambientC, dni, dhi, source, isFallback }
 *
 * Two sources, with graceful fallback:
 *   1. Live API (Open-Meteo: free, no key, global) -> measured/forecast GHI,
 *      DNI, DHI, 2 m air temperature.
 *   2. Ineichen-Perez clear-sky model -> physics fallback when the API is
 *      unavailable. Tuned for Israel via configurable Linke turbidity (dust).
 *
 * The clear-sky functions are PURE and testable offline. The networked fetch
 * accepts an injectable `fetchImpl`, so parsing is testable without a socket.
 *
 * NOTE: api.open-meteo.com must be reachable from the runtime. If blocked,
 * update the network/allowlist; the clear-sky fallback keeps the pipeline live.
 * ---------------------------------------------------------------------------
 */

import { solarPosition, extraterrestrial } from './prEngine.js';

export const DEFAULTS = {
  altitudeM: 0,
  linkeTurbidity: 3.5,    // Israel summer is dusty; 3 (clear) .. 5+ (hazy)
  defaultAmbientC: 25,    // used only when no temperature source is available
  baseUrl: 'https://api.open-meteo.com/v1/forecast',
};

const D2R = Math.PI / 180;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
function round(x, dp = 1) { if (x == null) return null; const f = 10 ** dp; return Math.round(x * f) / f; }
function dayOfYear(ms) {
  const d = new Date(ms);
  return Math.floor((ms - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
}

/* ------------------------------- airmass --------------------------------- */
/** Kasten-Young relative air mass; 0 when sun is at/below horizon. */
export function airmass(zenithDeg) {
  if (zenithDeg >= 90) return 0;
  return 1 / (Math.cos(zenithDeg * D2R) + 0.50572 * Math.pow(96.07995 - zenithDeg, -1.6364));
}
/** Standard-atmosphere pressure (Pa) at altitude (m). */
export function pressureAt(altitudeM) {
  return 101325 * Math.pow(1 - 2.25577e-5 * altitudeM, 5.25588);
}

/* --------------------------- Ineichen clear-sky -------------------------- */
/**
 * Ineichen-Perez clear-sky irradiance.
 * @returns {{ghi, dni, dhi, zenithDeg}}  W/m²
 */
export function clearSkyIneichen({ ts, lat, lon, altitudeM = DEFAULTS.altitudeM, linkeTurbidity = DEFAULTS.linkeTurbidity }) {
  const ms = ts instanceof Date ? ts.getTime() : ts;
  const { zenithDeg } = solarPosition(ms, lat, lon);
  const cosZ = Math.cos(zenithDeg * D2R);
  if (zenithDeg >= 90 || cosZ <= 0) return { ghi: 0, dni: 0, dhi: 0, zenithDeg };

  const I0 = extraterrestrial(dayOfYear(ms));
  const amRel = airmass(zenithDeg);
  const amAbs = amRel * (pressureAt(altitudeM) / 101325);
  const TL = linkeTurbidity;

  const fh1 = Math.exp(-altitudeM / 8000);
  const fh2 = Math.exp(-altitudeM / 1250);
  const cg1 = 5.09e-5 * altitudeM + 0.868;
  const cg2 = 3.92e-5 * altitudeM + 0.0387;

  let ghi = cg1 * I0 * cosZ * Math.exp(-cg2 * amAbs * (fh1 + fh2 * (TL - 1))) * Math.exp(0.01 * Math.pow(amAbs, 1.8));
  ghi = Math.max(0, ghi);

  const b = 0.664 + 0.163 / fh1;
  let dni = b * I0 * Math.exp(-0.09 * amAbs * (TL - 1));
  dni = Math.max(0, dni);
  // keep physically consistent: beam contribution can't exceed GHI
  if (dni * cosZ > ghi) dni = ghi / cosZ;
  const dhi = Math.max(0, ghi - dni * cosZ);

  return { ghi: round(ghi), dni: round(dni), dhi: round(dhi), zenithDeg: round(zenithDeg, 2) };
}

/** Haurwitz clear-sky GHI (zenith-only, ultra-simple alternative). */
export function clearSkyHaurwitz(zenithDeg) {
  const cosZ = Math.cos(zenithDeg * D2R);
  if (cosZ <= 0) return 0;
  return round(Math.max(0, 1098 * cosZ * Math.exp(-0.059 / cosZ)));
}

/* ----------------------------- Open-Meteo -------------------------------- */
/**
 * Parse an Open-Meteo hourly response, selecting the hour nearest to ts.
 * Expects hourly arrays: time[], shortwave_radiation[], direct_normal_irradiance[],
 * diffuse_radiation[], temperature_2m[].
 */
export function parseOpenMeteo(json, ts) {
  const h = json?.hourly;
  if (!h || !Array.isArray(h.time) || !h.time.length) return null;
  const target = ts instanceof Date ? ts.getTime() : ts;

  let bestIdx = 0, bestDelta = Infinity;
  for (let i = 0; i < h.time.length; i++) {
    const t = Date.parse(h.time[i] + (h.time[i].endsWith('Z') ? '' : 'Z'));
    const d = Math.abs(t - target);
    if (d < bestDelta) { bestDelta = d; bestIdx = i; }
  }
  const at = (arr) => (Array.isArray(arr) ? arr[bestIdx] : null);
  return {
    ghi: at(h.shortwave_radiation),
    dni: at(h.direct_normal_irradiance),
    dhi: at(h.diffuse_radiation),
    ambientC: at(h.temperature_2m),
    matchedTime: h.time[bestIdx],
    matchHoursOff: round(bestDelta / 3600000, 2),
  };
}

/** Build the Open-Meteo request URL. */
export function openMeteoUrl({ lat, lon, ts, baseUrl = DEFAULTS.baseUrl }) {
  const day = new Date(ts instanceof Date ? ts.getTime() : ts).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    latitude: String(lat), longitude: String(lon),
    hourly: 'shortwave_radiation,direct_normal_irradiance,diffuse_radiation,temperature_2m',
    timezone: 'UTC', start_date: day, end_date: day,
  });
  return `${baseUrl}?${params.toString()}`;
}

/** Fetch + parse Open-Meteo. fetchImpl is injectable for testing. */
export async function fetchOpenMeteo({ lat, lon, ts, baseUrl = DEFAULTS.baseUrl }, { fetchImpl } = {}) {
  const f = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!f) throw new Error('no fetch available');
  const url = openMeteoUrl({ lat, lon, ts, baseUrl });
  const res = await f(url);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const json = await res.json();
  const parsed = parseOpenMeteo(json, ts);
  if (!parsed || parsed.ghi == null) throw new Error('open-meteo: no usable hour');
  return { ...parsed, source: 'open-meteo' };
}

/* ----------------------------- orchestrator ------------------------------ */
/**
 * Resolve irradiance for a site/time into a prEngine-ready weather object.
 * Tries the live API; on any failure falls back to the clear-sky model.
 *
 * @param {object} args  { ts, lat, lon, altitudeM?, linkeTurbidity?, tariffPerKWh? }
 * @param {object} opts  { fetchImpl?, preferClearSky?, sanityClampToClearSky? }
 * @returns weather: { ghi, ambientC, dni, dhi, source, isFallback, clearSkyGhi }
 */
export async function getIrradiance(args, opts = {}) {
  const { ts, lat, lon, altitudeM = DEFAULTS.altitudeM, linkeTurbidity = DEFAULTS.linkeTurbidity, tariffPerKWh } = args;
  const cs = clearSkyIneichen({ ts, lat, lon, altitudeM, linkeTurbidity });

  const finish = (w) => ({ ...w, clearSkyGhi: cs.ghi, ...(tariffPerKWh != null ? { tariffPerKWh } : {}) });

  if (opts.preferClearSky) {
    return finish({ ghi: cs.ghi, dni: cs.dni, dhi: cs.dhi,
      ambientC: opts.defaultAmbientC ?? DEFAULTS.defaultAmbientC, source: 'clearsky', isFallback: true });
  }

  try {
    const live = await fetchOpenMeteo({ lat, lon, ts }, opts);
    let { ghi, dni, dhi, ambientC } = live;
    // sanity: cloud-edge enhancement allowed, but reject absurd spikes
    if (opts.sanityClampToClearSky && cs.ghi > 0 && ghi > cs.ghi * 1.4) ghi = cs.ghi * 1.4;
    return finish({
      ghi, dni, dhi,
      ambientC: ambientC ?? opts.defaultAmbientC ?? DEFAULTS.defaultAmbientC,
      source: 'open-meteo', isFallback: false,
      matchHoursOff: live.matchHoursOff,
    });
  } catch (e) {
    return finish({ ghi: cs.ghi, dni: cs.dni, dhi: cs.dhi,
      ambientC: opts.defaultAmbientC ?? DEFAULTS.defaultAmbientC,
      source: 'clearsky', isFallback: true, fallbackReason: String(e.message || e) });
  }
}

export default getIrradiance;
