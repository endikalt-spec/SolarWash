/**
 * store.js — in-memory data store.
 * PRODUCTION: replace each Map with a real DB table (Postgres recommended).
 * Snapshots especially must persist (the soiling classifier needs days of history).
 */
import crypto from "crypto";

export const db = {
  operators: new Map(),   // id -> { id, username, role, salt, hash }
  customers: new Map(),   // id -> { id, name, email, userCode, otpHash, verified, salt, hash, siteId, status }
  sites: new Map(),       // id -> site config (incl. inverter conn + thresholds + polling flag)
  snapshots: new Map(),   // siteId -> [snapshot,...] bounded ring
  health: new Map(),      // siteId -> { lastPollTs, lastError, consecutiveFailures, latencyMs, transport }
};

export const newId = (p = "id") => `${p}_${crypto.randomBytes(6).toString("hex")}`;

export function pushSnapshot(siteId, snap, max = 5000) {
  const arr = db.snapshots.get(siteId) || [];
  arr.push(snap);
  if (arr.length > max) arr.splice(0, arr.length - max);
  db.snapshots.set(siteId, arr);
}
export function latestSnapshot(siteId) {
  const arr = db.snapshots.get(siteId);
  return arr && arr.length ? arr[arr.length - 1] : null;
}
