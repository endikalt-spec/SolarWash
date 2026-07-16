/**
 * prEngine.js
 * ---------------------------------------------------------------------------
 * SolarWash — Per-String Performance Ratio (PR) engine.
 *
 * Core differentiator: PR is computed PER STRING against that string's OWN
 * tilt/azimuth, on the DC side (the only side measurable per string from a
 * single inverter, via SunSpec model 160). System PR is computed on AC.
 *
 *   PR_string = actual_DC / expected_DC_clean
 *   expected_DC_clean = nameplate * (POA/1000) * tempFactor
 *
 * IMPORTANT (business logic): expected_DC_clean assumes a CLEAN, HEALTHY array.
 * It deliberately does NOT bake in soiling — so any sustained shortfall surfaces
 * as PR < 1, i.e. a measurable cleaning/maintenance opportunity.
 *
 * All functions are PURE (no sockets/clock) and unit-testable offline.
 * Models: NOAA solar position, Erbs GHI->DNI/DHI, isotropic POA transposition,
 * NOCT cell-temperature. Perez transposition is the documented upgrade path.
 * ---------------------------------------------------------------------------
 */

export const DEFAULTS = {
  albedo: 0.2,            // ground reflectance (grass/concrete ~0.2)
  noct: 45,              // Nominal Operating Cell Temp (°C)
  gammaPmax: -0.0037,    // power temp coefficient (/°C), typical mono-PERC
  inverterEff: 0.975,    // for system AC PR
  systemLossFrac: 0.97,  // wiring/availability baseline for AC PR (NOT soiling)
  panelAzimuth: 180,     // clockwise from North; 180 = due south (N. hemisphere)
  lowLightFloor: 0.03,   // skip PR when expected < 3% of nameplate (dawn/dusk noise)
  soilingFlagFrac: 0.05, // site soiling >5% => cleaning recommendation
};

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

/* ----------------------------- solar position ---------------------------- */
/**
 * NOAA solar position from a UTC instant.
 * @param {Date|number} when  Date or epoch ms (interpreted as UTC instant)
 * @returns {{zenithDeg, elevationDeg, azimuthDeg}}  azimuth clockwise from North
 */
export function solarPosition(when, latDeg, lonDeg) {
  const ms = when instanceof Date ? when.getTime() : when;
  const jd = ms / 86400000 + 2440587.5;
  const jc = (jd - 2451545) / 36525;

  const L0 = mod360(280.46646 + jc * (36000.76983 + jc * 0.0003032));
  const M = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
  const e = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
  const C =
    Math.sin(M * D2R) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
    Math.sin(2 * M * D2R) * (0.019993 - 0.000101 * jc) +
    Math.sin(3 * M * D2R) * 0.000289;
  const trueLong = L0 + C;
  const appLong = trueLong - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * jc) * D2R);
  const meanObliq = 23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60;
  const obliqCorr = meanObliq + 0.00256 * Math.cos((125.04 - 1934.136 * jc) * D2R);
  const declDeg = Math.asin(Math.sin(obliqCorr * D2R) * Math.sin(appLong * D2R)) * R2D;

  const varY = Math.tan((obliqCorr / 2) * D2R) ** 2;
  const eqTime =
    4 *
    R2D *
    (varY * Math.sin(2 * L0 * D2R) -
      2 * e * Math.sin(M * D2R) +
      4 * e * varY * Math.sin(M * D2R) * Math.cos(2 * L0 * D2R) -
      0.5 * varY * varY * Math.sin(4 * L0 * D2R) -
      1.25 * e * e * Math.sin(2 * M * D2R));

  const utcMin = ((ms % 86400000) + 86400000) % 86400000 / 60000;
  const trueSolarMin = mod(utcMin + eqTime + 4 * lonDeg, 1440);
  let ha = trueSolarMin / 4;
  ha = ha < 0 ? ha + 180 : ha - 180; // hour angle, deg

  const latR = latDeg * D2R;
  const declR = declDeg * D2R;
  const haR = ha * D2R;
  const cosZ = Math.sin(latR) * Math.sin(declR) + Math.cos(latR) * Math.cos(declR) * Math.cos(haR);
  const zenithDeg = Math.acos(clamp(cosZ, -1, 1)) * R2D;
  const elevationDeg = 90 - zenithDeg;

  // azimuth (clockwise from north)
  const denom = Math.cos(latR) * Math.sin(zenithDeg * D2R);
  let azimuthDeg = 180;
  if (Math.abs(denom) > 1e-9) {
    const cosAz = clamp((Math.sin(latR) * Math.cos(zenithDeg * D2R) - Math.sin(declR)) / denom, -1, 1);
    const a = Math.acos(cosAz) * R2D;
    azimuthDeg = ha > 0 ? mod360(a + 180) : mod360(540 - a);
  }
  return { zenithDeg, elevationDeg, azimuthDeg, declinationDeg: declDeg };
}

/** Angle of incidence (deg) of beam on a tilted plane. */
export function angleOfIncidence(tiltDeg, panelAzDeg, sunZenithDeg, sunAzDeg) {
  const t = tiltDeg * D2R;
  const z = sunZenithDeg * D2R;
  const cosAoi =
    Math.cos(z) * Math.cos(t) + Math.sin(z) * Math.sin(t) * Math.cos((sunAzDeg - panelAzDeg) * D2R);
  return Math.acos(clamp(cosAoi, -1, 1)) * R2D;
}

/* --------------------------- irradiance models --------------------------- */
/** Extraterrestrial normal irradiance (W/m²) for day-of-year. */
export function extraterrestrial(doy) {
  return 1367 * (1 + 0.033 * Math.cos((360 * doy / 365) * D2R));
}
function dayOfYear(ms) {
  const d = new Date(ms);
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((ms - start) / 86400000);
}

/**
 * Erbs decomposition: split GHI into DNI + DHI when only GHI is measured.
 * @returns {{dni, dhi, kt}}
 */
export function erbs(ghi, sunZenithDeg, doy) {
  const cosZ = Math.cos(sunZenithDeg * D2R);
  if (ghi <= 0 || cosZ <= 0.01) return { dni: 0, dhi: Math.max(0, ghi), kt: 0 };
  const i0 = extraterrestrial(doy) * cosZ;
  const kt = clamp(ghi / i0, 0, 1);
  let df;
  if (kt <= 0.22) df = 1 - 0.09 * kt;
  else if (kt <= 0.8) df = 0.9511 - 0.1604 * kt + 4.388 * kt ** 2 - 16.638 * kt ** 3 + 12.336 * kt ** 4;
  else df = 0.165;
  const dhi = ghi * df;
  const dni = (ghi - dhi) / cosZ;
  return { dni: Math.max(0, dni), dhi: Math.max(0, dhi), kt };
}

/**
 * Isotropic plane-of-array irradiance (W/m²) for one orientation.
 * @returns {{poa, beam, diffuse, ground, aoiDeg}}
 */
export function poaIrradiance({ ghi, dni, dhi, tiltDeg, panelAzDeg, sunZenithDeg, sunAzDeg, albedo }) {
  const aoiDeg = angleOfIncidence(tiltDeg, panelAzDeg, sunZenithDeg, sunAzDeg);
  const t = tiltDeg * D2R;
  const beam = Math.max(0, dni * Math.cos(aoiDeg * D2R));
  const diffuse = dhi * (1 + Math.cos(t)) / 2;
  const ground = ghi * albedo * (1 - Math.cos(t)) / 2;
  return { poa: beam + diffuse + ground, beam, diffuse, ground, aoiDeg };
}

/* --------------------------- temperature & power ------------------------- */
/** NOCT cell-temperature model (°C). */
export function cellTemp(poa, ambientC, noct = DEFAULTS.noct) {
  return ambientC + (poa / 800) * (noct - 20);
}

/** Expected CLEAN DC power (W) for a string at given POA + cell temp. */
export function expectedDcPowerW({ nameplateW, poa, cellTempC, gammaPmax = DEFAULTS.gammaPmax }) {
  const tempFactor = 1 + gammaPmax * (cellTempC - 25);
  return Math.max(0, nameplateW * (poa / 1000) * tempFactor);
}

/* ----------------------------- orchestrator ------------------------------ */
/**
 * Evaluate per-string + system PR for one polling snapshot.
 *
 * @param {object} args
 *   ts       Date|ms (UTC instant of the reading)
 *   site     { lat, lon, albedo?, inverterEff?, systemLossFrac?,
 *              strings:[{ id, nameplateW, tiltDeg, azimuthDeg?, noct?, gammaPmax? }] }
 *   weather  { ghi, ambientC?, dni?, dhi?, tariffPerKWh? }
 *   reading  from sunspecModbus: { acPowerW, dcStrings:[{id, pDc}] }
 */
export function evaluateSite({ ts, site, weather, reading }) {
  const ms = ts instanceof Date ? ts.getTime() : ts;
  const albedo = site.albedo ?? DEFAULTS.albedo;
  const inverterEff = site.inverterEff ?? DEFAULTS.inverterEff;
  const systemLossFrac = site.systemLossFrac ?? DEFAULTS.systemLossFrac;

  const sun = solarPosition(ms, site.lat, site.lon);
  const doy = dayOfYear(ms);

  // decompose GHI once (per-site sun geometry); transpose per string orientation
  const decomp = weather.dni != null && weather.dhi != null
    ? { dni: weather.dni, dhi: weather.dhi, kt: null }
    : erbs(weather.ghi, sun.zenithDeg, doy);
  const ambientC = weather.ambientC ?? 25;

  const byId = new Map((reading.dcStrings || []).map((s) => [s.id, s]));
  let sumExpectedDc = 0;
  let soilingWeighted = 0;
  let soilingNameplate = 0;

  const strings = site.strings.map((cfg) => {
    const az = cfg.azimuthDeg ?? DEFAULTS.panelAzimuth;
    const { poa, aoiDeg } = poaIrradiance({
      ghi: weather.ghi, dni: decomp.dni, dhi: decomp.dhi,
      tiltDeg: cfg.tiltDeg, panelAzDeg: az,
      sunZenithDeg: sun.zenithDeg, sunAzDeg: sun.azimuthDeg, albedo,
    });
    const tCell = cellTemp(poa, ambientC, cfg.noct ?? DEFAULTS.noct);
    const expectedDcW = expectedDcPowerW({
      nameplateW: cfg.nameplateW, poa, cellTempC: tCell, gammaPmax: cfg.gammaPmax,
    });
    sumExpectedDc += expectedDcW;

    const meas = byId.get(cfg.id);
    const actualDcW = meas ? (meas.pDc ?? null) : null;

    let pr = null, status = 'low_light', soilingLossFrac = null;
    const floor = DEFAULTS.lowLightFloor * cfg.nameplateW;

    if (expectedDcW < floor || sun.elevationDeg <= 3) {
      status = 'low_light';
    } else if (actualDcW == null) {
      status = 'no_data';
    } else if (actualDcW <= 0.01 * cfg.nameplateW) {
      status = 'offline'; pr = 0;
    } else {
      pr = actualDcW / expectedDcW;
      if (pr >= 0.95) status = 'ok';
      else if (pr >= 0.80) status = 'soiling_suspected';
      else status = 'fault_or_shading';
      soilingLossFrac = clamp(1 - pr, 0, 0.5);
      // only count soiling-band deficits toward site soiling (exclude hard faults/shading)
      if (status === 'soiling_suspected') {
        soilingWeighted += soilingLossFrac * cfg.nameplateW;
        soilingNameplate += cfg.nameplateW;
      }
    }

    return {
      id: cfg.id, poa: round(poa, 1), aoiDeg: round(aoiDeg, 1),
      cellTempC: round(tCell, 1), expectedDcW: round(expectedDcW, 0),
      actualDcW: actualDcW == null ? null : round(actualDcW, 0),
      pr: pr == null ? null : round(pr, 3), status, soilingLossFrac,
    };
  });

  // system AC PR
  const expectedAcW = sumExpectedDc * inverterEff * systemLossFrac;
  const actualAcW = reading.acPowerW ?? null;
  const systemPr =
    expectedAcW > DEFAULTS.lowLightFloor * sumExpectedDc && actualAcW != null
      ? round(actualAcW / expectedAcW, 3)
      : null;

  const siteSoilingLossFrac = soilingNameplate > 0 ? soilingWeighted / soilingNameplate : 0;

  const result = {
    ts: new Date(ms).toISOString(),
    sun: { elevationDeg: round(sun.elevationDeg, 1), azimuthDeg: round(sun.azimuthDeg, 1) },
    clearnessKt: decomp.kt == null ? null : round(decomp.kt, 2),
    strings,
    system: { expectedAcW: round(expectedAcW, 0), actualAcW, pr: systemPr },
    siteSoilingLossFrac: round(siteSoilingLossFrac, 3),
    recommendation: null,
  };

  if (siteSoilingLossFrac >= DEFAULTS.soilingFlagFrac) {
    result.recommendation = {
      action: 'cleaning_recommended',
      siteSoilingLossPct: round(siteSoilingLossFrac * 100, 1),
      recoveredValue: weather.tariffPerKWh
        ? recoveredValue({
            soilingLossFrac: siteSoilingLossFrac,
            nameplateW: site.strings.reduce((a, s) => a + s.nameplateW, 0),
            tariffPerKWh: weather.tariffPerKWh,
          })
        : null,
    };
  }
  return result;
}

/**
 * Estimate recoverable production value from cleaning (feeds ROI model).
 * Heuristic: recovered annual kWh ≈ soilingLoss × nameplate(kWp) × specificYield.
 */
export function recoveredValue({ soilingLossFrac, nameplateW, tariffPerKWh, specificYieldKwhPerKwp = 1700 }) {
  const kWp = nameplateW / 1000;
  const recoveredKWhYear = soilingLossFrac * kWp * specificYieldKwhPerKwp;
  return {
    recoveredKWhYear: round(recoveredKWhYear, 0),
    recoveredValueYear: round(recoveredKWhYear * tariffPerKWh, 0),
  };
}

/* ------------------------------- helpers --------------------------------- */
function mod(x, m) { return ((x % m) + m) % m; }
function mod360(x) { return mod(x, 360); }
function round(x, dp) { const f = 10 ** dp; return Math.round(x * f) / f; }

export default evaluateSite;
