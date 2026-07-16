/**
 * soilingTemporal.js
 * ---------------------------------------------------------------------------
 * SolarWash — Temporal aggregation layer.
 *
 * Distinguishes SOILING (cleaning opportunity) from SHADING and FAULT by the
 * signature of per-string PR across sun position and across days, then fires a
 * STABILITY-GATED cleaning alert (no firing on a single noisy snapshot).
 *
 * Signatures used:
 *   soiling  -> deficit is FLAT across morning/midday/afternoon, persistent
 *               over days, recovers abruptly after rain. (band spread small)
 *   shading  -> deficit is PEAKED in a specific sun-azimuth sector while other
 *               sectors are healthy, reproducible daily. (band spread large)
 *   fault    -> severe + flat + persistent, no rain recovery. (low median)
 *
 * Consumes snapshots from prEngine.evaluateSite(). Pure functions + a small
 * in-memory tracker. In production, snapshots should be persisted (DB) and
 * replayed here; this module holds only a bounded ring buffer.
 * ---------------------------------------------------------------------------
 */

export const DEFAULTS = {
  minSunElevation: 8,     // ignore very low-sun samples (noisy POA)
  minSamplesPerString: 12,
  minDaysForSoiling: 3,   // stability gate: sustained over >= N days
  minConfidence: 0.6,     // gate: classifier confidence to act

  healthyPR: 0.94,
  soilingLo: 0.78,        // below this is "too deep" for plain soiling
  soilingHi: 0.95,
  faultPR: 0.55,          // median below this (and flat) => fault

  flatMax: 0.12,          // band spread <= flatMax  => "flat" (soiling/fault)
  shadingSpread: 0.15,    // band spread >= this + a healthy sector => shading
  rainResetJump: 0.08,    // last-day median jump up => treat as rain-cleaned

  sectorBounds: { morningMax: 150, afternoonMin: 210 }, // azimuth deg (N. hemi)
};

/* ------------------------------- helpers --------------------------------- */
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function round(x, dp = 3) { if (x == null) return null; const f = 10 ** dp; return Math.round(x * f) / f; }
function sectorOf(azimuthDeg, b = DEFAULTS.sectorBounds) {
  if (azimuthDeg < b.morningMax) return 'morning';
  if (azimuthDeg > b.afternoonMin) return 'afternoon';
  return 'midday';
}
function dayKeyUTC(ts) { return new Date(ts).toISOString().slice(0, 10); }
function linregSlope(ys) {
  const n = ys.length;
  if (n < 2) return 0;
  const xs = ys.map((_, i) => i);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  return den ? num / den : 0;
}

/* --------------------------- sample extraction --------------------------- */
/**
 * Flatten evaluateSite snapshots into qualifying per-string samples.
 * @returns Map<stringId, [{ts, pr, sector, day, elevation, status}]>
 */
export function extractSamples(snapshots, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const byString = new Map();
  for (const snap of snapshots) {
    const el = snap.sun?.elevationDeg ?? 0;
    const az = snap.sun?.azimuthDeg ?? 180;
    if (el < o.minSunElevation) continue;
    const ts = typeof snap.ts === 'string' ? Date.parse(snap.ts) : snap.ts;
    const day = (opts.dayKey || dayKeyUTC)(ts);
    const sector = sectorOf(az, o.sectorBounds);
    for (const s of snap.strings || []) {
      if (s.pr == null) continue;
      if (s.status === 'low_light' || s.status === 'no_data') continue;
      if (!byString.has(s.id)) byString.set(s.id, []);
      byString.get(s.id).push({ ts, pr: s.pr, sector, day, elevation: el, status: s.status });
    }
  }
  return byString;
}

/* ----------------------------- summarize --------------------------------- */
/** Robust per-string statistics across sun sectors and days. */
export function summarizeString(samples, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const prs = samples.map((s) => s.pr);
  const overallMedian = median(prs);

  const sectorMedians = {};
  for (const sec of ['morning', 'midday', 'afternoon']) {
    const v = samples.filter((s) => s.sector === sec).map((s) => s.pr);
    sectorMedians[sec] = v.length ? median(v) : null;
  }
  const present = Object.values(sectorMedians).filter((v) => v != null);
  const bandSpread = present.length >= 2 ? Math.max(...present) - Math.min(...present) : 0;

  // per-day medians (chronological)
  const days = [...new Set(samples.map((s) => s.day))].sort();
  const dailyMedian = days.map((d) => median(samples.filter((s) => s.day === d).map((s) => s.pr)));
  const trendPerDay = linregSlope(dailyMedian);

  // rain-reset signal: last day jumps up vs earlier days
  let recentJump = 0;
  if (dailyMedian.length >= 2) {
    const last = dailyMedian[dailyMedian.length - 1];
    const earlier = median(dailyMedian.slice(0, -1));
    recentJump = last - earlier;
  }

  return {
    samples: samples.length,
    days: days.length,
    overallMedian: round(overallMedian),
    sectorMedians: Object.fromEntries(Object.entries(sectorMedians).map(([k, v]) => [k, round(v)])),
    bandSpread: round(bandSpread),
    trendPerDay: round(trendPerDay, 4),
    recentJump: round(recentJump),
    dailyMedian: dailyMedian.map((v) => round(v)),
  };
}

/* ----------------------------- classify ---------------------------------- */
/** Classify one string's behavior from its summary. */
export function classifyString(sum, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const evidence = [];

  if (sum.samples < o.minSamplesPerString || sum.days < 2) {
    return { class: 'insufficient_data', confidence: 0, evidence: ['not enough samples/days'], ...sum };
  }

  const m = sum.overallMedian;
  const spread = sum.bandSpread;
  const healthySectors = Object.values(sum.sectorMedians).filter((v) => v != null && v >= o.healthyPR);
  const depressedSectors = Object.values(sum.sectorMedians).filter((v) => v != null && v <= o.soilingHi);

  // rain recovery overrides — abrupt jump up means recently cleaned by rain
  if (sum.recentJump >= o.rainResetJump) {
    evidence.push(`recent PR jump +${sum.recentJump} (rain/clean reset)`);
    return { class: 'recovered', confidence: 0.7, evidence, ...sum };
  }

  // fault: severe + flat + persistent
  if (m < o.faultPR && spread < o.shadingSpread) {
    evidence.push(`median ${m} < fault threshold, flat across sectors`);
    return { class: 'fault', confidence: clamp(0.6 + sum.days * 0.1, 0, 0.95), evidence, ...sum };
  }

  // shading: peaked — healthy in some sector, depressed in another
  if (spread >= o.shadingSpread && healthySectors.length >= 1 && depressedSectors.length >= 1) {
    const conf = clamp(0.5 + (spread - o.shadingSpread) * 2 + sum.days * 0.05, 0, 0.95);
    evidence.push(`band spread ${spread} with a healthy sector => directional shading`);
    return { class: 'shading', confidence: round(conf, 2), evidence, ...sum };
  }

  // soiling: flat deficit within the soiling band, persistent
  if (m >= o.soilingLo && m < o.soilingHi && spread < o.flatMax) {
    let conf = 0.5 + sum.days * 0.08 + (o.flatMax - spread) * 1.5;
    if (sum.trendPerDay < 0) { conf += 0.1; evidence.push(`downward trend ${sum.trendPerDay}/day (accumulating)`); }
    evidence.push(`flat deficit (spread ${spread}), median ${m} in soiling band`);
    return { class: 'soiling', confidence: round(clamp(conf, 0, 0.98), 2), evidence, ...sum };
  }

  if (m >= o.healthyPR) {
    return { class: 'healthy', confidence: 0.9, evidence: [`median ${m} healthy`], ...sum };
  }

  evidence.push(`median ${m}, spread ${spread} — pattern unclear`);
  return { class: 'degraded_unclear', confidence: 0.3, evidence, ...sum };
}

/* --------------------------- site-level decision ------------------------- */
/**
 * Aggregate snapshots over a window into per-string verdicts + a gated decision.
 * @param {Array} snapshots  evaluateSite outputs over the window
 * @param {object} opts      thresholds + optional { nameplateById:{id:W} }
 */
export function aggregateWindow(snapshots, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const byString = extractSamples(snapshots, o);

  const strings = [];
  for (const [id, samples] of byString) {
    const sum = summarizeString(samples, o);
    const cls = classifyString(sum, o);
    strings.push({ id, ...cls });
  }

  const np = opts.nameplateById || {};
  const wOf = (id) => np[id] || 1;

  const soiling = strings.filter(
    (s) => s.class === 'soiling' && s.confidence >= o.minConfidence && s.days >= o.minDaysForSoiling
  );
  const faults = strings.filter((s) => s.class === 'fault');
  const shading = strings.filter((s) => s.class === 'shading');

  let action = 'ok';
  const reasons = [];

  if (soiling.length) {
    action = 'cleaning_recommended';
    reasons.push(`${soiling.length} string(s) show sustained flat soiling over >=${o.minDaysForSoiling} days`);
  } else if (faults.length) {
    action = 'maintenance_alert';
    reasons.push(`${faults.length} string(s) show fault signature (severe, persistent)`);
  } else if (shading.length) {
    action = 'monitor';
    reasons.push(`${shading.length} string(s) show directional shading — NOT a cleaning issue`);
  } else if (strings.some((s) => s.class === 'insufficient_data') && !strings.some((s) => s.class === 'soiling')) {
    action = 'insufficient_data';
    reasons.push('not enough qualifying samples/days yet');
  }

  // nameplate-weighted soiling loss across the soiling strings
  let estSoilingLossFrac = 0;
  if (soiling.length) {
    const wsum = soiling.reduce((a, s) => a + wOf(s.id), 0);
    estSoilingLossFrac = soiling.reduce((a, s) => a + (1 - s.overallMedian) * wOf(s.id), 0) / wsum;
  }

  return {
    action,
    reasons,
    affectedStrings: soiling.map((s) => s.id),
    faultStrings: faults.map((s) => s.id),
    shadedStrings: shading.map((s) => s.id),
    estSoilingLossFrac: round(estSoilingLossFrac),
    stableDays: soiling.length ? Math.min(...soiling.map((s) => s.days)) : 0,
    strings,
  };
}

/* --------------------------- stateful tracker ---------------------------- */
/**
 * Bounded in-memory tracker for the polling loop. Feed evaluateSite outputs;
 * call evaluate() to get the gated decision. Persist snapshots to a DB in prod.
 */
export function createSoilingTracker(opts = {}) {
  const maxSnapshots = opts.maxSnapshots || 5000;
  let buffer = [];
  return {
    add(snapshot) {
      buffer.push(snapshot);
      if (buffer.length > maxSnapshots) buffer = buffer.slice(buffer.length - maxSnapshots);
      return buffer.length;
    },
    evaluate(evalOpts = {}) { return aggregateWindow(buffer, { ...opts, ...evalOpts }); },
    size() { return buffer.length; },
    clear() { buffer = []; },
  };
}

export default aggregateWindow;
