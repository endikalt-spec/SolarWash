// ═══════════════════════════════════════════════════════════════════════════
//  SolarWash · Inverter Backend Proxy
//  Holds vendor credentials, talks to inverters via connectors, exposes a clean
//  normalized API to the web app. Also proxies the Claude AI calls.
//
//  Run:    node inverter-proxy.js
//  Env:    ANTHROPIC_API_KEY, plus per-connector secrets you choose to store.
// ═══════════════════════════════════════════════════════════════════════════

import express from "express";
import cors from "cors";
import { createConnector } from "./inverter-connectors.js";

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));

// In-memory connector registry. Use a DB + encryption for real deployments.
const connectors = new Map(); // id -> connector instance

// ── Connect an inverter ───────────────────────────────────────────────────────
// POST /api/inverters/:vendor   body: { id, config:{...credentials, capacityKw, strings} }
app.post("/api/inverters/:vendor", async (req, res) => {
  try {
    const { vendor } = req.params;
    const { id, config } = req.body;
    const conn = createConnector(vendor, config);
    const ok = await conn.connect();
    if (!ok) return res.status(400).json({ error: "connect_failed" });
    connectors.set(id, conn);
    res.json({ id, vendor, status: "online" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Live telemetry for one inverter (normalized schema) ───────────────────────
app.get("/api/inverters/:id/telemetry", async (req, res) => {
  const conn = connectors.get(req.params.id);
  if (!conn) return res.status(404).json({ error: "not_connected" });
  try {
    res.json(await conn.getTelemetry());
  } catch (e) {
    res.status(502).json({ error: "inverter_unreachable", detail: e.message });
  }
});

// ── Fleet snapshot (all inverters at once) ────────────────────────────────────
app.get("/api/inverters", async (_req, res) => {
  const out = {};
  await Promise.all([...connectors.entries()].map(async ([id, conn]) => {
    try { out[id] = await conn.getTelemetry(); }
    catch (e) { out[id] = { error: e.message }; }
  }));
  res.json(out);
});

// ── Disconnect ────────────────────────────────────────────────────────────────
app.delete("/api/inverters/:id", (req, res) => {
  connectors.get(req.params.id)?.disconnect?.();
  connectors.delete(req.params.id);
  res.json({ ok: true });
});

// ── Claude AI proxy (keeps the API key server-side) ───────────────────────────
app.post("/api/chat", async (req, res) => {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: req.body.model || "claude-sonnet-4-6",
        max_tokens: Math.min(req.body.max_tokens || 700, 1024),
        system: req.body.system,
        messages: req.body.messages,
      }),
    });
    res.status(r.status).json(await r.json());
  } catch (e) {
    res.status(500).json({ error: "ai_proxy_failed" });
  }
});

app.get("/health", (_req, res) => res.json({ ok: true, connected: connectors.size }));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`✓ SolarWash inverter proxy on :${PORT}`));
