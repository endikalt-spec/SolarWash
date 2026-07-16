// ═══════════════════════════════════════════════════════════════════════════
//  SolarWash · Weather Forecast API
//  Open data source: Open-Meteo (https://open-meteo.com) — free, no API key,
//  CC-BY 4.0. This service fetches the forecast, normalizes it, derives soiling /
//  cleaning recommendations, and caches results so you don't hammer the source.
//
//  Run:   node weather-proxy.js
//  Endpoints:
//    GET /api/forecast?lat=&lon=          → 7-day daily forecast + recommendations
//    GET /api/forecast/irradiance?lat=&lon= → hourly POA-ready irradiance (today+tomorrow)
//    GET /api/forecast/clean-windows?lat=&lon= → suggested cleaning days
//    GET /health
// ═══════════════════════════════════════════════════════════════════════════

import express from "express";
import cors from "cors";

const app = express();
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));

const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";
const CACHE_TTL = 30 * 60 * 1000;           // 30 min
const cache = new Map();                     // key -> { ts, data }

function cacheKey(path, lat, lon) { return `${path}:${(+lat).toFixed(3)},${(+lon).toFixed(3)}`; }
function getCached(key) { const e = cache.get(key); return e && Date.now() - e.ts < CACHE_TTL ? e.data : null; }
function setCached(key, data) { cache.set(key, { ts: Date.now(), data }); }

async function fetchOpenMeteo(params) {
  const url = `${OPEN_METEO}?${new URLSearchParams(params)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`open-meteo ${r.status}`);
  return r.json();
}

// WMO weather code → label
function wmo(code) {
  if (code === 0) return "clear";
  if ([1, 2, 3].includes(code)) return "partly_cloudy";
  if ([45, 48].includes(code)) return "fog";
  if (code >= 51 && code <= 67) return "rain";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 80 && code <= 82) return "rain_showers";
  if (code >= 95) return "thunderstorm";
  return "unknown";
}

// Cleaning recommendation from a day's forecast
function recommend(day) {
  if (day.precipProbMax >= 60 || day.precipSum >= 2)
    return { action: "defer", reason: "rain_expected", note: "Rain forecast — let nature clean the panels; skip manual cleaning." };
  if (day.precipSum < 0.2 && day.precipProbMax < 20)
    return { action: "clean_ok", reason: "dry_clear", note: "Dry and clear — good window for manual cleaning of soiled arrays." };
  return { action: "normal", reason: "neutral", note: "No strong signal; clean per soiling thresholds." };
}

// ── 7-day daily forecast + recommendations ────────────────────────────────────
app.get("/api/forecast", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "lat & lon required" });
  const key = cacheKey("daily", lat, lon);
  const hit = getCached(key);
  if (hit) return res.json({ ...hit, cached: true });
  try {
    const d = await fetchOpenMeteo({
      latitude: lat, longitude: lon, timezone: "auto", forecast_days: 7,
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,shortwave_radiation_sum,wind_speed_10m_max",
    });
    const days = d.daily.time.map((t, i) => {
      const day = {
        date: t,
        condition: wmo(d.daily.weather_code[i]),
        weatherCode: d.daily.weather_code[i],
        tempMax: d.daily.temperature_2m_max[i],
        tempMin: d.daily.temperature_2m_min[i],
        precipSum: d.daily.precipitation_sum[i] ?? 0,
        precipProbMax: d.daily.precipitation_probability_max[i] ?? 0,
        radiationSum: d.daily.shortwave_radiation_sum[i] ?? 0,
        windMax: d.daily.wind_speed_10m_max[i] ?? 0,
      };
      return { ...day, recommendation: recommend(day) };
    });
    const out = { source: "Open-Meteo", license: "CC-BY 4.0", lat: +lat, lon: +lon, timezone: d.timezone, days };
    setCached(key, out);
    res.json(out);
  } catch (e) {
    res.status(502).json({ error: "forecast_unavailable", detail: e.message });
  }
});

// ── Hourly irradiance (feed POA computation server-side if desired) ───────────
app.get("/api/forecast/irradiance", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "lat & lon required" });
  const key = cacheKey("irr", lat, lon);
  const hit = getCached(key);
  if (hit) return res.json({ ...hit, cached: true });
  try {
    const d = await fetchOpenMeteo({
      latitude: lat, longitude: lon, timezone: "UTC", forecast_days: 2,
      hourly: "shortwave_radiation,direct_normal_irradiance,diffuse_radiation,temperature_2m,cloud_cover",
    });
    const hours = d.hourly.time.map((t, i) => ({
      time: t,
      ghi: d.hourly.shortwave_radiation[i],          // global horizontal W/m²
      dni: d.hourly.direct_normal_irradiance[i],     // direct normal W/m²
      dhi: d.hourly.diffuse_radiation[i],            // diffuse horizontal W/m²
      temp: d.hourly.temperature_2m[i],
      cloudCover: d.hourly.cloud_cover[i],
    }));
    const out = { source: "Open-Meteo", license: "CC-BY 4.0", lat: +lat, lon: +lon, note: "Transpose GHI/DNI/DHI to plane-of-array per panel tilt/azimuth.", hours };
    setCached(key, out);
    res.json(out);
  } catch (e) {
    res.status(502).json({ error: "irradiance_unavailable", detail: e.message });
  }
});

// ── Suggested cleaning windows (next dry/clear days, post-rain opportunities) ──
app.get("/api/forecast/clean-windows", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "lat & lon required" });
  try {
    const base = await fetch(`http://localhost:${PORT}/api/forecast?lat=${lat}&lon=${lon}`).then(r => r.json());
    const windows = base.days
      .map((d, i) => ({ ...d, i }))
      .filter(d => d.recommendation.action === "clean_ok")
      .map(d => ({ date: d.date, reason: d.recommendation.reason, radiationSum: d.radiationSum }));
    // "Rain then dry" = clean right after the last rain day cluster ends
    const lastRain = [...base.days].reverse().find(d => d.recommendation.action === "defer");
    res.json({ source: "Open-Meteo", recommendedWindows: windows, deferWhileRain: !!lastRain, nextRainDate: lastRain?.date || null });
  } catch (e) {
    res.status(502).json({ error: "unavailable", detail: e.message });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true, cached: cache.size, source: "Open-Meteo" }));

const PORT = process.env.PORT || 8788;
app.listen(PORT, () => console.log(`✓ SolarWash weather forecast API on :${PORT} (source: Open-Meteo, CC-BY)`));
