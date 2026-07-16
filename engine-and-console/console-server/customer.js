/**
 * routes/customer.js — customer onboarding + curated dashboard.
 * Onboarding mirrors the SolarWash dashboard flow: register -> OTP -> set
 * password -> login. Dashboard returns ONLY the client-safe projection.
 */
import { Router } from "express";
import { db, newId, latestSnapshot } from "../lib/store.js";
import {
  requireAuth, requireRole, hashPassword, verifyPassword, signToken,
  genUserCode, genOtp, hashOtp,
} from "../lib/auth.js";
import { toCustomerView } from "../lib/projection.js";
import { decisionFor } from "../lib/scheduler.js";

const r = Router();
const DEV = process.env.NODE_ENV !== "production";

/* register -> issue user code + OTP (in prod, delivered by SMS/email) */
r.post("/register", (req, res) => {
  const { name, email } = req.body || {};
  if (!name || !email || !email.includes("@")) return res.status(400).json({ error: "name + valid email required" });
  const id = newId("cust");
  const userCode = genUserCode();
  const otp = genOtp();
  db.customers.set(id, {
    id, name, email, userCode, otpHash: hashOtp(otp), verified: false,
    salt: null, hash: null, siteId: req.body.siteId || null, status: "pending",
  });
  // OTP returned only in dev/demo; production sends it out-of-band
  res.status(201).json({ userCode, ...(DEV ? { otp, note: "dev only — delivered by SMS/email in production" } : {}) });
});

/* verify OTP -> short-lived setup token */
r.post("/verify", (req, res) => {
  const { userCode, otp } = req.body || {};
  const c = [...db.customers.values()].find((x) => x.userCode === userCode);
  if (!c || c.otpHash !== hashOtp(otp || "")) return res.status(401).json({ error: "invalid code or OTP" });
  c.verified = true;
  res.json({ setupToken: signToken({ sub: c.id, role: "customer_setup" }, "15m") });
});

/* set permanent password using the setup token */
r.post("/set-password", requireAuth, requireRole("customer_setup"), (req, res) => {
  const c = db.customers.get(req.user.sub);
  if (!c) return res.status(404).json({ error: "customer not found" });
  const { password } = req.body || {};
  if (!password || password.length < 6) return res.status(400).json({ error: "password >= 6 chars" });
  const { salt, hash } = hashPassword(password);
  c.salt = salt; c.hash = hash; c.status = "active";
  res.json({ token: signToken({ sub: c.id, role: "customer" }), name: c.name });
});

/* login */
r.post("/login", (req, res) => {
  const { userCode, password } = req.body || {};
  const c = [...db.customers.values()].find((x) => x.userCode === userCode);
  if (!c || c.status !== "active" || !verifyPassword(password || "", c.salt, c.hash))
    return res.status(401).json({ error: "bad credentials" });
  res.json({ token: signToken({ sub: c.id, role: "customer" }), name: c.name });
});

/* curated dashboard — client-safe fields ONLY */
r.get("/dashboard", requireAuth, requireRole("customer"), (req, res) => {
  const c = db.customers.get(req.user.sub);
  if (!c || !c.siteId) return res.status(404).json({ error: "no site linked to this account" });
  const site = db.sites.get(c.siteId);
  if (!site) return res.status(404).json({ error: "site not found" });
  const snapshot = latestSnapshot(site.id);
  res.json(toCustomerView({ site, snapshot, decision: decisionFor(site), weather: snapshot?.weather || null }));
});

export default r;
