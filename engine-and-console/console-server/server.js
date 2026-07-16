/**
 * server.js — SolarWash backend entrypoint.
 *
 *   /api/operator/*   operator + admin control plane (internal diagnostics)
 *   /api/customer/*   customer onboarding + curated dashboard (client-safe)
 *
 * Run:  npm install && npm start     (PORT, JWT_SECRET, SEED_DEMO via env)
 */
import express from "express";
import cors from "cors";
import { db, newId } from "./lib/store.js";
import { hashPassword, hashOtp } from "./lib/auth.js";
import operatorRoutes from "./routes/operator.js";
import customerRoutes from "./routes/customer.js";
import { startPolling } from "./lib/scheduler.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, sites: db.sites.size, time: new Date().toISOString() }));
app.use("/api/operator", operatorRoutes);
app.use("/api/customer", customerRoutes);

/* ---- seed an operator account (change in production) ---- */
export function seedOperator(username = process.env.ADMIN_USER || "admin", password = process.env.ADMIN_PASS || "admin1234") {
  const { salt, hash } = hashPassword(password);
  const id = newId("op");
  db.operators.set(id, { id, username, role: "admin", salt, hash });
  return { id, username };
}

/* ---- optional demo seed: a Tel Aviv site + linked customer, simulator on ---- */
export function seedDemo() {
  const siteId = newId("site");
  db.sites.set(siteId, {
    id: siteId, name: "מערכת גג — תל אביב (דמו)", lat: 32.08, lon: 34.78,
    altitudeM: 30, linkeTurbidity: 3.5, albedo: 0.2, inverterEff: 0.975, systemLossFrac: 0.97,
    tariffPerKWh: 0.55, panelsPerString: 8, panelCount: 24, daysSinceClean: 38, demo: true, polling: false,
    strings: [
      { id: 1, nameplateW: 3200, tiltDeg: 25, azimuthDeg: 180, demoFactor: 0.99 },
      { id: 2, nameplateW: 3200, tiltDeg: 25, azimuthDeg: 180, demoFactor: 0.88 },            // soiling
      { id: 3, nameplateW: 3200, tiltDeg: 25, azimuthDeg: 180, demoFactor: 0.98, demoShadeMorning: true }, // shading
    ],
    inverter: { slug: "huawei", conn: { host: "demo", port: 502, unitId: 1 }, access: { hasLan: true, hasModbus: true } },
  });
  const custId = newId("cust");
  db.customers.set(custId, {
    id: custId, name: "לקוח דמו", email: "demo@solarwash.co.il",
    userCode: "SW-100200", otpHash: hashOtp("123456"), verified: false,
    salt: null, hash: null, siteId, status: "pending",
  });
  const site = db.sites.get(siteId);
  startPolling(site, 30000);
  return { siteId, custId, userCode: "SW-100200", demoOtp: "123456" };
}

const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== "test") {
  seedOperator();
  if (process.env.SEED_DEMO !== "0") seedDemo();
  app.listen(PORT, () => console.log(`SolarWash backend on :${PORT}`));
}

export default app;
