/**
 * routes/operator.js — operator + admin control plane.
 * All routes require role operator|admin. Returns INTERNAL diagnostics.
 */
import { Router } from "express";
import { db, newId } from "./store.js";
import { requireAuth, requireRole, verifyPassword, signToken } from "./auth.js";
import { toOperatorView } from "./projection.js";
import { pollNow, startPolling, stopPolling, decisionFor } from "./scheduler.js";
import INVERTER_ADAPTERS, { getAdapter } from "../engine/inverterAdapters.js";

const r = Router();

/* operator login */
r.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  const op = [...db.operators.values()].find((o) => o.username === username);
  if (!op || !verifyPassword(password || "", op.salt, op.hash))
    return res.status(401).json({ error: "bad credentials" });
  res.json({ token: signToken({ sub: op.id, role: op.role, username: op.username }), role: op.role });
});

r.use(requireAuth, requireRole("operator", "admin"));

/* catalog of supported inverters (drives the console dropdown + the connection doc) */
r.get("/adapters", (_req, res) => {
  res.json(Object.entries(INVERTER_ADAPTERS).map(([slug, a]) => ({
    slug, vendor: a.vendor, he: a.he, transports: a.transports,
    resolution: a.resolution, tier: a.tier, defaultPort: a.local?.port ?? null,
  })));
});

/* create a site */
r.post("/sites", (req, res) => {
  const b = req.body || {};
  if (!b.name || b.lat == null || b.lon == null || !Array.isArray(b.strings))
    return res.status(400).json({ error: "name, lat, lon, strings required" });
  const id = newId("site");
  const site = {
    id, name: b.name, lat: b.lat, lon: b.lon,
    altitudeM: b.altitudeM ?? 0, linkeTurbidity: b.linkeTurbidity ?? 3.5,
    albedo: b.albedo ?? 0.2, inverterEff: b.inverterEff ?? 0.975, systemLossFrac: b.systemLossFrac ?? 0.97,
    tariffPerKWh: b.tariffPerKWh ?? null, panelsPerString: b.panelsPerString ?? 1,
    panelCount: b.panelCount ?? null, daysSinceClean: b.daysSinceClean ?? 0,
    strings: b.strings, inverter: null, polling: false, demo: !!b.demo,
    soilingOpts: b.soilingOpts || null, customerId: b.customerId || null,
  };
  db.sites.set(id, site);
  res.status(201).json({ id, site });
});

r.get("/sites", (_req, res) => {
  res.json([...db.sites.values()].map((s) => ({
    id: s.id, name: s.name, polling: s.polling, demo: s.demo,
    inverter: s.inverter ? { slug: s.inverter.slug } : null,
    health: db.health.get(s.id) || null,
  })));
});

/* connect / configure an inverter on a site */
r.post("/sites/:id/inverter", (req, res) => {
  const site = db.sites.get(req.params.id);
  if (!site) return res.status(404).json({ error: "site not found" });
  const { slug, conn = {}, access = {} } = req.body || {};
  if (!getAdapter(slug) || slug === "generic_closed")
    return res.status(400).json({ error: "unknown or unsupported inverter slug", known: Object.keys(INVERTER_ADAPTERS) });
  site.inverter = {
    slug,
    conn: { host: conn.host || null, port: conn.port || null, unitId: conn.unitId ?? null, base: conn.base ?? null },
    access: { hasLan: !!access.hasLan, hasModbus: !!access.hasModbus, hasLocalHttp: !!access.hasLocalHttp, hasCloudCreds: !!access.hasCloudCreds },
  };
  res.json({ ok: true, inverter: site.inverter, adapter: getAdapter(slug).vendor });
});

/* test connection — one poll, return internal diagnostics */
r.post("/sites/:id/test", async (req, res) => {
  const site = db.sites.get(req.params.id);
  if (!site) return res.status(404).json({ error: "site not found" });
  try {
    const out = await pollNow(site, { irradianceOpts: req.body?.irradianceOpts });
    res.json({
      ok: true,
      view: toOperatorView({
        site, snapshot: out.snapshot, weather: out.weather,
        decision: decisionFor(site), health: db.health.get(site.id),
      }),
    });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e.message || e), health: db.health.get(site.id) });
  }
});

/* polling control */
r.post("/sites/:id/poll/start", (req, res) => {
  const site = db.sites.get(req.params.id);
  if (!site) return res.status(404).json({ error: "site not found" });
  if (!site.inverter && !site.demo) return res.status(400).json({ error: "configure an inverter first" });
  startPolling(site, req.body?.intervalMs || 60000);
  res.json({ ok: true, polling: true });
});
r.post("/sites/:id/poll/stop", (req, res) => {
  const site = db.sites.get(req.params.id);
  if (!site) return res.status(404).json({ error: "site not found" });
  stopPolling(site.id);
  res.json({ ok: true, polling: false });
});

/* full internal diagnostics */
r.get("/sites/:id", (req, res) => {
  const site = db.sites.get(req.params.id);
  if (!site) return res.status(404).json({ error: "site not found" });
  const arr = db.snapshots.get(site.id) || [];
  res.json(toOperatorView({
    site, snapshot: arr[arr.length - 1] || null, weather: null,
    decision: decisionFor(site), health: db.health.get(site.id),
  }));
});

/* tune soiling thresholds */
r.patch("/sites/:id/thresholds", (req, res) => {
  const site = db.sites.get(req.params.id);
  if (!site) return res.status(404).json({ error: "site not found" });
  site.soilingOpts = { ...(site.soilingOpts || {}), ...(req.body || {}) };
  res.json({ ok: true, soilingOpts: site.soilingOpts });
});

export default r;
