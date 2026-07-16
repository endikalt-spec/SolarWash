import React, { useState, useEffect, useMemo } from "react";
import {
  Sun, Server, Plug, Activity, ShieldCheck, LogIn, Cpu, Wifi, WifiOff,
  Play, Square, Gauge, AlertTriangle, Droplets, CheckCircle2, XCircle,
  ArrowLeft, Plus, Trash2, RefreshCw, Cloud, HardDrive,
} from "lucide-react";

/* ============================ config (edit here) ========================= */
const BASE_URL = "http://localhost:4000"; // SolarWash backend
const DEMO_FALLBACK = true;               // serve mock data if backend unreachable

/* =============================== palette ================================ */
const C = {
  navyDeep: "#0A1F3C", navy: "#123257", navySoft: "#1E4A7A",
  gold: "#C9A24B", goldBright: "#E3C36A", cream: "#F5F1E6", creamDim: "#E0E6F0",
  ok: "#1F9D55", amber: "#E8902A", burnt: "#C2570F", red: "#C0392B", blue: "#7CC6FF",
};
const statusColor = (pr) => (pr >= 0.9 ? C.ok : pr >= 0.8 ? C.amber : pr >= 0.7 ? C.burnt : C.red);

/* ====================== in-memory mock backend ========================== */
const ADAPTERS = [
  { slug: "solaredge", vendor: "SolarEdge", he: "סולאראדג'", defaultPort: 1502, tier: "open", resolution: "panel" },
  { slug: "huawei", vendor: "Huawei (SUN2000)", he: "חואווי", defaultPort: 502, tier: "gated", resolution: "string" },
  { slug: "sungrow", vendor: "Sungrow", he: "סאנגרו", defaultPort: 502, tier: "open", resolution: "string" },
  { slug: "fronius", vendor: "Fronius", he: "פרוניוס", defaultPort: 502, tier: "open", resolution: "string" },
  { slug: "sma", vendor: "SMA", he: "SMA", defaultPort: 502, tier: "open", resolution: "inverter" },
  { slug: "goodwe", vendor: "GoodWe", he: "גודווי", defaultPort: 502, tier: "gated", resolution: "inverter" },
  { slug: "solis", vendor: "Solis", he: "סוליס", defaultPort: 502, tier: "open", resolution: "string" },
  { slug: "growatt", vendor: "Growatt", he: "גרואט", defaultPort: 502, tier: "unstable", resolution: "inverter" },
  { slug: "enphase", vendor: "Enphase", he: "אנפייס", defaultPort: 443, tier: "gated", resolution: "panel" },
  { slug: "central_utility", vendor: "Central (Utility)", he: "ממיר מרכזי", defaultPort: 502, tier: "open", resolution: "plant" },
];
const MOCK = {
  sites: [
    {
      id: "site_demo", name: "מערכת גג — תל אביב (דמו)", polling: true, demo: true,
      inverter: { slug: "huawei", conn: { host: "192.168.1.20", port: 502, unitId: 1 }, access: { hasLan: true, hasModbus: true } },
      health: { lastPollTs: new Date().toISOString(), latencyMs: 64, transport: "modbus_tcp", consecutiveFailures: 0 },
      strings: [
        { id: 1, nameplateW: 3200, tiltDeg: 25, azimuthDeg: 180, demoFactor: 0.99 },
        { id: 2, nameplateW: 3200, tiltDeg: 25, azimuthDeg: 180, demoFactor: 0.88 },
        { id: 3, nameplateW: 3200, tiltDeg: 25, azimuthDeg: 180, demoFactor: 0.98, shade: true },
      ],
    },
  ],
};
function mockReading(site) {
  return {
    system: { expectedAcW: 7600, actualAcW: 7050, pr: 0.928 },
    strings: site.strings.map((s) => {
      const pr = s.demoFactor ?? 0.97;
      const exp = Math.round((s.nameplateW || 3200) * 0.74);
      return { id: s.id, poa: 905, expectedDcW: exp, actualDcW: Math.round(exp * pr), cellTempC: 47, pr: +pr.toFixed(3), status: pr >= 0.95 ? "ok" : pr >= 0.8 ? "soiling_suspected" : "fault_or_shading" };
    }),
    clearnessKt: 0.74,
  };
}
function mockClassifier(site) {
  return {
    action: "cleaning_recommended",
    reasons: ["1 string(s) show sustained flat soiling over >=3 days"],
    estSoilingLossFrac: 0.12,
    stableDays: 4,
    strings: site.strings.map((s) => {
      const f = s.demoFactor ?? 0.97;
      const cls = s.shade ? "shading" : f < 0.95 ? "soiling" : "healthy";
      return {
        id: s.id, class: cls, confidence: cls === "healthy" ? 0.9 : cls === "shading" ? 0.95 : 0.98,
        overallMedian: +f.toFixed(3), bandSpread: s.shade ? 0.37 : 0.01,
        evidence: cls === "soiling" ? ["flat deficit across sectors", "downward trend (accumulating)"] : cls === "shading" ? ["band spread with a healthy sector => directional shading"] : ["median healthy"],
      };
    }),
  };
}
function mockApi(path, method, body) {
  if (path === "/api/operator/login") return { token: "demo.token", role: "admin" };
  if (path === "/api/operator/adapters") return ADAPTERS;
  if (path === "/api/operator/sites" && method === "GET")
    return MOCK.sites.map((s) => ({ id: s.id, name: s.name, polling: s.polling, demo: s.demo, inverter: s.inverter ? { slug: s.inverter.slug } : null, health: s.health }));
  if (path === "/api/operator/sites" && method === "POST") {
    const id = "site_" + Math.random().toString(16).slice(2, 8);
    const site = { id, name: body.name, polling: false, demo: !!body.demo, inverter: null, health: null, strings: body.strings, lat: body.lat, lon: body.lon };
    MOCK.sites.push(site);
    return { id, site };
  }
  const m = path.match(/^\/api\/operator\/sites\/([^/]+)(\/.*)?$/);
  if (m) {
    const site = MOCK.sites.find((s) => s.id === m[1]);
    if (!site) return { error: "not found" };
    const sub = m[2] || "";
    if (sub === "/inverter") {
      site.inverter = { slug: body.slug, conn: body.conn, access: body.access };
      return { ok: true, inverter: site.inverter, adapter: (ADAPTERS.find((a) => a.slug === body.slug) || {}).vendor };
    }
    if (sub === "/test") {
      site.health = { lastPollTs: new Date().toISOString(), latencyMs: 40 + Math.floor(Math.random() * 60), transport: site.demo ? "demo" : "modbus_tcp", consecutiveFailures: 0 };
      return { ok: true, view: { site: { id: site.id, name: site.name, polling: site.polling, demo: site.demo }, inverter: site.inverter, connectionHealth: site.health, reading: mockReading(site), soilingClassifier: mockClassifier(site) } };
    }
    if (sub === "/poll/start") { site.polling = true; return { ok: true, polling: true }; }
    if (sub === "/poll/stop") { site.polling = false; return { ok: true, polling: false }; }
    if (!sub) return { site: { id: site.id, name: site.name, polling: site.polling, demo: site.demo }, inverter: site.inverter, connectionHealth: site.health, reading: site.health ? mockReading(site) : null, soilingClassifier: site.health ? mockClassifier(site) : null };
  }
  return { error: "mock: unhandled " + path };
}
async function api(path, { method = "GET", body, token } = {}) {
  try {
    const res = await fetch(BASE_URL + path, {
      method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(String(res.status));
    return { data: await res.json(), live: true };
  } catch (e) {
    if (!DEMO_FALLBACK) throw e;
    return { data: mockApi(path, method, body), live: false };
  }
}

/* =============================== styles ================================= */
function StyleBlock() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900&family=Heebo:wght@300;400;500;700&display=swap');
.op-root{direction:rtl;font-family:'Heebo',system-ui,sans-serif;color:${C.cream};min-height:100vh;
  background:radial-gradient(120% 80% at 80% -10%, ${C.navy} 0%, ${C.navyDeep} 55%, #061629 100%);}
.op-serif{font-family:'Frank Ruhl Libre',serif;}
*{box-sizing:border-box;}
.op-wrap{max-width:1120px;margin:0 auto;padding:18px;}
.op-auth{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
.op-card{width:100%;max-width:420px;background:rgba(245,241,230,0.04);border:1px solid rgba(201,162,75,0.35);
  border-radius:18px;padding:32px;box-shadow:0 30px 70px rgba(0,0,0,.45);}
.op-logo{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:4px;}
.op-logo b{font-family:'Frank Ruhl Libre',serif;font-weight:900;font-size:24px;}
.op-sub{text-align:center;color:${C.creamDim};font-size:13px;margin-bottom:22px;opacity:.85;}
.op-label{font-size:13px;color:${C.goldBright};margin:14px 0 6px;font-weight:500;}
.op-input,.op-select{width:100%;background:rgba(0,0,0,0.25);border:1px solid rgba(201,162,75,0.4);border-radius:11px;
  padding:12px 13px;color:${C.cream};font-size:14px;outline:none;font-family:inherit;}
.op-input:focus,.op-select:focus{border-color:${C.gold};box-shadow:0 0 0 3px rgba(201,162,75,0.18);}
.op-btn{background:linear-gradient(180deg,${C.goldBright},${C.gold});color:#221a06;font-weight:700;font-size:14px;
  border:none;border-radius:11px;padding:12px 16px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;
  justify-content:center;transition:transform .12s,filter .12s;}
.op-btn:hover{filter:brightness(1.06);transform:translateY(-1px);}
.op-btn.ghost{background:transparent;color:${C.creamDim};border:1px solid rgba(201,162,75,0.3);font-weight:500;}
.op-btn.danger{background:transparent;color:#ffb4a8;border:1px solid rgba(192,57,43,0.5);}
.op-btn.full{width:100%;margin-top:18px;}
.op-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;
  background:rgba(0,0,0,0.22);border:1px solid rgba(201,162,75,0.2);border-radius:15px;flex-wrap:wrap;}
.op-top h1{font-family:'Frank Ruhl Libre',serif;font-size:19px;margin:0;display:flex;gap:8px;align-items:center;}
.op-mode{font-size:11px;padding:3px 10px;border-radius:20px;border:1px solid;display:inline-flex;gap:5px;align-items:center;}
.op-mode.live{color:${C.ok};border-color:rgba(31,157,85,.5);background:rgba(31,157,85,.1);}
.op-mode.demo{color:${C.goldBright};border-color:rgba(201,162,75,.4);background:rgba(201,162,75,.1);}
.op-panel{background:rgba(245,241,230,0.045);border:1px solid rgba(201,162,75,0.2);border-radius:15px;padding:16px 18px;margin-top:14px;}
.op-h{font-family:'Frank Ruhl Libre',serif;font-size:16px;font-weight:700;margin:0 0 12px;display:flex;align-items:center;gap:8px;color:${C.goldBright};}
.op-sites{display:grid;grid-template-columns:repeat(auto-fill,minmax(330px,1fr));gap:12px;}
.op-site{background:rgba(0,0,0,0.2);border:1px solid rgba(201,162,75,0.18);border-radius:13px;padding:14px;cursor:pointer;transition:border-color .12s;}
.op-site:hover{border-color:${C.gold};}
.op-site .nm{font-weight:700;font-size:15px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;}
.op-meta{font-size:12px;color:${C.creamDim};display:flex;flex-direction:column;gap:4px;}
.op-meta b{color:${C.cream};font-weight:500;}
.op-pill{font-size:10.5px;padding:2px 9px;border-radius:20px;display:inline-flex;gap:4px;align-items:center;}
.op-pill.on{background:rgba(31,157,85,.16);color:${C.ok};border:1px solid rgba(31,157,85,.4);}
.op-pill.off{background:rgba(255,255,255,.06);color:${C.creamDim};border:1px solid rgba(255,255,255,.12);}
.op-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:760px){.op-grid2{grid-template-columns:1fr;}}
.op-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.op-toggles{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;}
.op-tog{font-size:12px;padding:7px 12px;border-radius:20px;cursor:pointer;border:1px solid rgba(201,162,75,0.3);
  color:${C.creamDim};background:rgba(0,0,0,0.2);user-select:none;}
.op-tog.on{background:rgba(201,162,75,0.2);color:${C.goldBright};border-color:${C.gold};}
.op-table{width:100%;border-collapse:collapse;font-size:12.5px;}
.op-table th,.op-table td{padding:8px 10px;text-align:right;border-bottom:1px solid rgba(201,162,75,0.12);}
.op-table th{color:${C.goldBright};font-weight:600;font-size:11.5px;}
.op-kv{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:13px;}
.op-kv .k{color:${C.creamDim};}
.op-tag{font-size:10px;padding:2px 8px;border-radius:20px;background:rgba(201,162,75,0.15);color:${C.goldBright};border:1px solid rgba(201,162,75,0.3);}
.op-err{color:#ffb4a8;font-size:13px;margin-top:10px;min-height:18px;}
.op-diag{background:rgba(0,0,0,0.22);border:1px solid rgba(201,162,75,0.2);border-radius:12px;padding:14px;margin-top:12px;}
.op-evi{font-size:11.5px;color:${C.creamDim};margin:2px 0;}
    `}</style>
  );
}

/* =============================== login ================================= */
function Login({ onLogin }) {
  const [u, setU] = useState("admin"); const [p, setP] = useState("admin1234");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const go = async () => {
    setErr(""); setBusy(true);
    const { data, live } = await api("/api/operator/login", { method: "POST", body: { username: u, password: p } });
    setBusy(false);
    if (data.token) onLogin({ token: data.token, role: data.role, live });
    else setErr("פרטי התחברות שגויים.");
  };
  return (
    <div className="op-root"><StyleBlock />
      <div className="op-auth"><div className="op-card">
        <div className="op-logo"><Server color={C.gold} size={24} /><b>SolarWash · אופרטור</b></div>
        <div className="op-sub">קונסול בקרה — חיבור וניהול ממירים</div>
        <div className="op-label">שם משתמש</div>
        <input className="op-input" value={u} onChange={(e) => setU(e.target.value)} />
        <div className="op-label">סיסמה</div>
        <input className="op-input" type="password" value={p} onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()} />
        <button className="op-btn full" onClick={go} disabled={busy}><LogIn size={16} /> {busy ? "מתחבר..." : "כניסה"}</button>
        <div className="op-err">{err}</div>
      </div></div>
    </div>
  );
}

/* =========================== sites list view =========================== */
function SitesList({ session, onOpen, onConnect, onLogout }) {
  const [sites, setSites] = useState([]); const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); const { data } = await api("/api/operator/sites", { token: session.token }); setSites(Array.isArray(data) ? data : []); setLoading(false); };
  useEffect(() => { load(); }, []);
  const toggle = async (s) => {
    await api(`/api/operator/sites/${s.id}/poll/${s.polling ? "stop" : "start"}`, { method: "POST", token: session.token });
    load();
  };
  return (
    <div className="op-root"><StyleBlock />
      <div className="op-wrap">
        <div className="op-top">
          <h1><Sun color={C.gold} size={18} /> SolarWash · קונסול אופרטור</h1>
          <div className="op-row">
            <span className={"op-mode " + (session.live ? "live" : "demo")}>{session.live ? <><Wifi size={12} /> מחובר לבק</> : <><WifiOff size={12} /> מצב דמו</>}</span>
            <button className="op-btn ghost" onClick={load}><RefreshCw size={14} /> רענון</button>
            <button className="op-btn ghost" onClick={onLogout}>יציאה</button>
          </div>
        </div>

        <div className="op-panel">
          <div className="op-row" style={{ justifyContent: "space-between" }}>
            <div className="op-h" style={{ margin: 0 }}><Server size={15} /> אתרים מחוברים ({sites.length})</div>
            <button className="op-btn" onClick={onConnect}><Plus size={15} /> חיבור ממיר חדש</button>
          </div>
          {loading ? <div className="op-meta" style={{ marginTop: 12 }}>טוען...</div> : (
            <div className="op-sites" style={{ marginTop: 14 }}>
              {sites.map((s) => (
                <div key={s.id} className="op-site" onClick={() => onOpen(s.id)}>
                  <div className="nm">{s.name}
                    <span className={"op-pill " + (s.polling ? "on" : "off")}>{s.polling ? <><Activity size={11} /> פעיל</> : <>מושהה</>}</span>
                  </div>
                  <div className="op-meta">
                    <span>ממיר: <b>{s.inverter ? s.inverter.slug : "לא מחובר"}</b> {s.demo && <span className="op-tag">דמו</span>}</span>
                    {s.health ? <>
                      <span>טרנספורט: <b>{s.health.transport}</b> · השהיה: <b>{s.health.latencyMs}ms</b></span>
                      <span>poll אחרון: <b>{fmtTime(s.health.lastPollTs)}</b> · כשלים: <b>{s.health.consecutiveFailures}</b></span>
                    </> : <span>טרם בוצע poll</span>}
                  </div>
                  <div className="op-row" style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                    <button className={"op-btn " + (s.polling ? "danger" : "")} onClick={() => toggle(s)}>
                      {s.polling ? <><Square size={13} /> עצור</> : <><Play size={13} /> הפעל</>}
                    </button>
                    <button className="op-btn ghost" onClick={() => onOpen(s.id)}><Activity size={13} /> דיאגנוסטיקה</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========================= connect inverter wizard ====================== */
function ConnectWizard({ session, onBack, onDone }) {
  const [adapters, setAdapters] = useState([]);
  const [name, setName] = useState("מערכת חדשה");
  const [lat, setLat] = useState("32.08"); const [lon, setLon] = useState("34.78");
  const [demo, setDemo] = useState(true);
  const [strings, setStrings] = useState([{ nameplateW: 3200, tiltDeg: 25, azimuthDeg: 180 }, { nameplateW: 3200, tiltDeg: 25, azimuthDeg: 180 }]);
  const [slug, setSlug] = useState("huawei");
  const [host, setHost] = useState("192.168.1.20"); const [port, setPort] = useState(502); const [unitId, setUnitId] = useState(1);
  const [access, setAccess] = useState({ hasLan: true, hasModbus: true, hasLocalHttp: false, hasCloudCreds: false });
  const [result, setResult] = useState(null); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);

  useEffect(() => { api("/api/operator/adapters", { token: session.token }).then(({ data }) => setAdapters(data)); }, []);
  useEffect(() => { const a = adapters.find((x) => x.slug === slug); if (a) setPort(a.defaultPort); }, [slug, adapters]);

  const tog = (k) => setAccess((a) => ({ ...a, [k]: !a[k] }));
  const setStr = (i, k, v) => setStrings((s) => s.map((r, j) => (j === i ? { ...r, [k]: Number(v) } : r)));

  const test = async () => {
    setErr(""); setBusy(true); setResult(null);
    const siteRes = await api("/api/operator/sites", { method: "POST", token: session.token, body: {
      name, lat: Number(lat), lon: Number(lon), demo, panelsPerString: 8,
      strings: strings.map((s, i) => ({ id: i + 1, ...s, demoFactor: i === 1 ? 0.88 : 0.98 })),
    }});
    const siteId = siteRes.data.id;
    await api(`/api/operator/sites/${siteId}/inverter`, { method: "POST", token: session.token, body: { slug, conn: { host, port: Number(port), unitId: Number(unitId) }, access } });
    const t = await api(`/api/operator/sites/${siteId}/test`, { method: "POST", token: session.token, body: { irradianceOpts: { preferClearSky: true } } });
    setBusy(false);
    if (t.data.ok) setResult({ siteId, view: t.data.view });
    else setErr("בדיקת החיבור נכשלה: " + (t.data.error || "לא ידוע"));
  };
  const startPolling = async () => { await api(`/api/operator/sites/${result.siteId}/poll/start`, { method: "POST", token: session.token }); onDone(); };

  return (
    <div className="op-root"><StyleBlock />
      <div className="op-wrap">
        <div className="op-top">
          <h1><Plug color={C.gold} size={18} /> חיבור ממיר חדש</h1>
          <button className="op-btn ghost" onClick={onBack}><ArrowLeft size={14} /> חזרה לאתרים</button>
        </div>

        <div className="op-grid2">
          <div className="op-panel">
            <div className="op-h"><HardDrive size={15} /> פרטי אתר</div>
            <div className="op-label">שם האתר</div>
            <input className="op-input" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="op-row" style={{ marginTop: 10 }}>
              <div style={{ flex: 1 }}><div className="op-label">קו רוחב</div><input className="op-input" value={lat} onChange={(e) => setLat(e.target.value)} /></div>
              <div style={{ flex: 1 }}><div className="op-label">קו אורך</div><input className="op-input" value={lon} onChange={(e) => setLon(e.target.value)} /></div>
            </div>
            <div className="op-label" style={{ marginTop: 12 }}>מחרוזות (סטרינגים)</div>
            {strings.map((s, i) => (
              <div className="op-row" key={i} style={{ marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: C.creamDim, minWidth: 20 }}>#{i + 1}</span>
                <input className="op-input" style={{ flex: 1 }} value={s.nameplateW} onChange={(e) => setStr(i, "nameplateW", e.target.value)} placeholder="W" />
                <input className="op-input" style={{ width: 70 }} value={s.tiltDeg} onChange={(e) => setStr(i, "tiltDeg", e.target.value)} placeholder="tilt" />
                <input className="op-input" style={{ width: 80 }} value={s.azimuthDeg} onChange={(e) => setStr(i, "azimuthDeg", e.target.value)} placeholder="az" />
                <button className="op-btn ghost" onClick={() => setStrings((a) => a.filter((_, j) => j !== i))}><Trash2 size={13} /></button>
              </div>
            ))}
            <button className="op-btn ghost" onClick={() => setStrings((a) => [...a, { nameplateW: 3200, tiltDeg: 25, azimuthDeg: 180 }])}><Plus size={13} /> הוסף מחרוזת</button>
            <div className="op-toggles" style={{ marginTop: 12 }}>
              <span className={"op-tog " + (demo ? "on" : "")} onClick={() => setDemo((d) => !d)}>אתר דמו (סימולטור — ללא חומרה)</span>
            </div>
          </div>

          <div className="op-panel">
            <div className="op-h"><Cpu size={15} /> חיבור הממיר</div>
            <div className="op-label">מותג</div>
            <select className="op-select" value={slug} onChange={(e) => setSlug(e.target.value)}>
              {adapters.map((a) => <option key={a.slug} value={a.slug}>{a.vendor} ({a.he})</option>)}
            </select>
            <div className="op-row" style={{ marginTop: 10 }}>
              <div style={{ flex: 2 }}><div className="op-label">host / IP</div><input className="op-input" value={host} onChange={(e) => setHost(e.target.value)} /></div>
              <div style={{ flex: 1 }}><div className="op-label">פורט</div><input className="op-input" value={port} onChange={(e) => setPort(e.target.value)} /></div>
              <div style={{ flex: 1 }}><div className="op-label">unitId</div><input className="op-input" value={unitId} onChange={(e) => setUnitId(e.target.value)} /></div>
            </div>
            <div className="op-label" style={{ marginTop: 12 }}>גישה (access)</div>
            <div className="op-toggles">
              {["hasLan", "hasModbus", "hasLocalHttp", "hasCloudCreds"].map((k) => (
                <span key={k} className={"op-tog " + (access[k] ? "on" : "")} onClick={() => tog(k)}>{k}</span>
              ))}
            </div>
            <button className="op-btn full" onClick={test} disabled={busy}>{busy ? "בודק חיבור..." : <><Activity size={15} /> בדיקת חיבור</>}</button>
            <div className="op-err">{err}</div>
          </div>
        </div>

        {result && (
          <div className="op-panel">
            <div className="op-h"><CheckCircle2 size={16} color={C.ok} /> החיבור הצליח — דיאגנוסטיקה פנימית</div>
            <Diagnostics view={result.view} />
            <button className="op-btn full" onClick={startPolling}><Play size={15} /> שמירה והפעלת ניטור</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================= site detail ============================= */
function SiteDetail({ session, siteId, onBack }) {
  const [view, setView] = useState(null); const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); const { data } = await api(`/api/operator/sites/${siteId}`, { token: session.token }); setView(data); setLoading(false); };
  useEffect(() => { load(); }, [siteId]);
  const retest = async () => { setLoading(true); const { data } = await api(`/api/operator/sites/${siteId}/test`, { method: "POST", token: session.token, body: { irradianceOpts: { preferClearSky: true } } }); setView(data.view || data); setLoading(false); };
  const poll = async (act) => { await api(`/api/operator/sites/${siteId}/poll/${act}`, { method: "POST", token: session.token }); load(); };

  return (
    <div className="op-root"><StyleBlock />
      <div className="op-wrap">
        <div className="op-top">
          <h1><Activity color={C.gold} size={18} /> {view?.site?.name || "אתר"}</h1>
          <div className="op-row">
            <button className="op-btn ghost" onClick={retest}><RefreshCw size={14} /> בדיקה חוזרת</button>
            <button className="op-btn" onClick={() => poll("start")}><Play size={13} /> הפעל</button>
            <button className="op-btn danger" onClick={() => poll("stop")}><Square size={13} /> עצור</button>
            <button className="op-btn ghost" onClick={onBack}><ArrowLeft size={14} /> חזרה</button>
          </div>
        </div>
        {loading ? <div className="op-panel">טוען דיאגנוסטיקה...</div> :
          view ? <div className="op-panel"><Diagnostics view={view} /></div> :
          <div className="op-panel">לא נמצאו נתונים.</div>}
      </div>
    </div>
  );
}

/* ===================== shared diagnostics renderer ===================== */
function Diagnostics({ view }) {
  const inv = view.inverter, h = view.connectionHealth, r = view.reading, cls = view.soilingClassifier;
  const clsColor = (c) => (c === "soiling" ? C.amber : c === "shading" ? C.blue : c === "fault" ? C.red : C.ok);
  return (
    <div>
      <div className="op-grid2">
        <div className="op-diag">
          <div className="op-h" style={{ fontSize: 14 }}><Cpu size={14} /> ממיר וחיבור <span className="op-tag" style={{ marginInlineStart: 6 }}>פנימי</span></div>
          <div className="op-kv">
            <span className="k">מותג</span><span>{inv?.slug || "—"}</span>
            <span className="k">host</span><span>{inv?.conn?.host || "—"}</span>
            <span className="k">פורט / unitId</span><span>{inv?.conn?.port ?? "—"} / {inv?.conn?.unitId ?? "—"}</span>
            <span className="k">טרנספורט</span><span>{h?.transport || "—"}</span>
            <span className="k">השהיה</span><span>{h?.latencyMs != null ? h.latencyMs + " ms" : "—"}</span>
            <span className="k">כשלים רצופים</span><span>{h?.consecutiveFailures ?? "—"}</span>
            <span className="k">poll אחרון</span><span>{h?.lastPollTs ? fmtTime(h.lastPollTs) : "—"}</span>
          </div>
        </div>
        <div className="op-diag">
          <div className="op-h" style={{ fontSize: 14 }}><Gauge size={14} /> PR מערכתי</div>
          {r?.system ? (
            <div className="op-kv">
              <span className="k">צפוי AC</span><span>{Math.round(r.system.expectedAcW)} W</span>
              <span className="k">בפועל AC</span><span>{Math.round(r.system.actualAcW)} W</span>
              <span className="k">PR</span><span style={{ color: statusColor(r.system.pr), fontWeight: 700 }}>{r.system.pr}</span>
              <span className="k">בהירות (kt)</span><span>{r.clearnessKt ?? "—"}</span>
            </div>
          ) : <div className="op-meta">אין קריאה זמינה.</div>}
        </div>
      </div>

      {r?.strings && (
        <div className="op-diag">
          <div className="op-h" style={{ fontSize: 14 }}><Activity size={14} /> נתוני סטרינג גולמיים <span className="op-tag" style={{ marginInlineStart: 6 }}>פנימי</span></div>
          <table className="op-table">
            <thead><tr><th>סטרינג</th><th>POA</th><th>צפוי DC</th><th>בפועל DC</th><th>טמפ'</th><th>PR</th><th>סטטוס</th></tr></thead>
            <tbody>
              {r.strings.map((s) => (
                <tr key={s.id}>
                  <td>#{s.id}</td><td>{Math.round(s.poa)}</td><td>{Math.round(s.expectedDcW)}W</td>
                  <td>{Math.round(s.actualDcW)}W</td><td>{Math.round(s.cellTempC)}°</td>
                  <td style={{ color: statusColor(s.pr), fontWeight: 700 }}>{s.pr}</td><td>{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cls && (
        <div className="op-diag">
          <div className="op-h" style={{ fontSize: 14 }}><Droplets size={14} /> מסווג זיהום ·
            <span style={{ color: cls.action === "cleaning_recommended" ? C.amber : C.ok, marginInlineStart: 6 }}>{cls.action}</span>
            <span className="op-tag" style={{ marginInlineStart: 6 }}>פנימי</span>
          </div>
          {cls.reasons?.map((rr, i) => <div className="op-evi" key={i}>· {rr}</div>)}
          <table className="op-table" style={{ marginTop: 8 }}>
            <thead><tr><th>סטרינג</th><th>סיווג</th><th>ביטחון</th><th>חציון PR</th><th>ספרד</th><th>ראיות</th></tr></thead>
            <tbody>
              {cls.strings.map((s) => (
                <tr key={s.id}>
                  <td>#{s.id}</td>
                  <td style={{ color: clsColor(s.class), fontWeight: 700 }}>{s.class}</td>
                  <td>{s.confidence}</td><td>{s.overallMedian}</td><td>{s.bandSpread}</td>
                  <td style={{ fontSize: 11, color: C.creamDim }}>{(s.evidence || []).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {cls.estSoilingLossFrac != null && (
            <div className="op-meta" style={{ marginTop: 8 }}>
              אובדן זיהום משוער: <b style={{ color: C.goldBright }}>{(cls.estSoilingLossFrac * 100).toFixed(1)}%</b> · יציב על פני <b>{cls.stableDays}</b> ימים
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ================================ helpers ============================== */
function fmtTime(iso) { try { return new Date(iso).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit", second: "2-digit" }); } catch { return iso; } }

/* ================================== app =============================== */
export default function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("sites"); // sites | connect | detail
  const [siteId, setSiteId] = useState(null);

  if (!session) return <Login onLogin={(s) => { setSession(s); setView("sites"); }} />;
  if (view === "connect") return <ConnectWizard session={session} onBack={() => setView("sites")} onDone={() => setView("sites")} />;
  if (view === "detail") return <SiteDetail session={session} siteId={siteId} onBack={() => setView("sites")} />;
  return <SitesList session={session} onOpen={(id) => { setSiteId(id); setView("detail"); }} onConnect={() => setView("connect")} onLogout={() => setSession(null)} />;
}
