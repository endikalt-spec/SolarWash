/**
 * projection.js — THE data-separation boundary.
 *
 * Internal-only (NEVER sent to customers): inverter host/IP, ports, unit ids,
 * transport internals, rate limits, register maps, raw per-string DC volts/amps/
 * watts, energy registers, classifier band-medians/spreads/evidence, connection
 * health, latency, error strings.
 *
 * Customer-safe: panel health %, current power + split, lost kWh, soiling status
 * (action + % + days since clean), weather, public sun-path. Exactly what the
 * customer dashboard renders — nothing more.
 */

function panelStatus(pr) {
  const pct = Math.round(pr * 100);
  let band = "red";
  if (pct >= 90) band = "ok";
  else if (pct >= 80) band = "amber";
  else if (pct >= 70) band = "burnt";
  return { pct, band };
}

/**
 * @param {object} site      site config
 * @param {object} snapshot  evaluateSite() output (internal)
 * @param {object} decision  soilingTemporal decision (internal)
 * @param {object} weather   resolved weather (we expose only display fields)
 */
export function toCustomerView({ site, snapshot, decision, weather }) {
  const strings = snapshot?.strings || [];
  const panelsPerString = site.panelsPerString || 1;

  // expand string health into per-panel tiles (status only — no watts/volts)
  const panels = [];
  for (const s of strings) {
    const pr = s.pr == null ? 1 : s.pr;
    for (let i = 0; i < panelsPerString; i++) {
      const st = panelStatus(pr);
      panels.push({ id: panels.length + 1, string: s.id, pct: st.pct, band: st.band });
    }
  }

  const sys = snapshot?.system || {};
  const acW = sys.actualAcW ?? 0;
  const kw = +(acW / 1000).toFixed(2);

  return {
    site: { name: site.name, panelCount: panels.length || site.panelCount || 0 },
    power: {
      kw,
      toHomeKw: +(kw * 0.5).toFixed(2),
      toBatteryKw: +(kw * 0.32).toFixed(2),
      toGridKw: +Math.max(0, kw - kw * 0.82).toFixed(2),
      lostKwhToday: site.lostKwhToday ?? null, // computed by scheduler from soiling
    },
    panels,
    soiling: {
      action: decision?.action || "ok",                    // ok | cleaning_recommended | monitor | maintenance_alert
      systemDropPct: +(((1 - (sys.pr ?? 1)) * 100)).toFixed(1),
      estSoilingLossPct: decision ? +(decision.estSoilingLossFrac * 100).toFixed(1) : 0,
      daysSinceClean: site.daysSinceClean ?? null,
      recommendCleaning: decision?.action === "cleaning_recommended",
    },
    weather: weather
      ? { tempC: weather.ambientC, source: weather.source, isFallback: weather.isFallback,
          // dust/condition are display hints; raw API payload stays server-side
          dust: weather.dust ?? null }
      : null,
    sun: snapshot?.sun || null, // elevation/azimuth are public sky facts
    ts: snapshot?.ts || null,
  };
}

/**
 * Operator/admin internal view — full diagnostics. Includes everything the
 * customer view omits, for connection debugging and tuning.
 */
export function toOperatorView({ site, snapshot, decision, health, weather }) {
  return {
    site: {
      id: site.id, name: site.name, lat: site.lat, lon: site.lon,
      polling: !!site.polling, demo: !!site.demo,
    },
    inverter: site.inverter
      ? {
          slug: site.inverter.slug,
          conn: site.inverter.conn,         // host/port/unitId — INTERNAL
          access: site.inverter.access,
        }
      : null,
    connectionHealth: health || null,        // latency, errors, transport — INTERNAL
    reading: snapshot
      ? {
          system: snapshot.system,           // expected/actual AC
          strings: snapshot.strings,         // raw per-string POA/expected/actual/PR — INTERNAL
          clearnessKt: snapshot.clearnessKt,
        }
      : null,
    weather: weather || null,                // full weather incl. source/fallback reason
    soilingClassifier: decision
      ? {
          action: decision.action, reasons: decision.reasons,
          strings: decision.strings,         // band medians, spreads, confidence, evidence — INTERNAL
          estSoilingLossFrac: decision.estSoilingLossFrac, stableDays: decision.stableDays,
        }
      : null,
    thresholds: site.soilingOpts || null,
  };
}
