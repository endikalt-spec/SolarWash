import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceArea, Cell,
} from "recharts";
import {
  Sun, CloudSun, Wind, Droplets, Battery, Home, Zap, Gauge,
  AlertTriangle, Sparkles, LogIn, ShieldCheck, KeyRound, ArrowLeft, X,
} from "lucide-react";

/* ============================== brand tokens ============================== */
const C = {
  pineDeep: "#0A1F3C",
  pine: "#123257",
  pineSoft: "#1E4A7A",
  gold: "#C9A24B",
  goldBright: "#E3C36A",
  cream: "#F5F1E6",
  creamDim: "#E0E6F0",
  ink: "#0C1626",
  // panel status
  ok: "#1F9D55",
  amber: "#E8902A",
  burnt: "#C2570F",
  red: "#C0392B",
};

/* site + tariff config (single edit point) */
const SITE = { name: "מערכת גג — תל אביב", lat: 32.08, lon: 34.78, panelCount: 24, kWp: 9.6 };
// Israeli time-of-use bands (demo defaults — set to the customer's actual plan)
const TOU = [
  { from: 0, to: 7, label: "שעות מתות", color: "#15233A" },
  { from: 7, to: 17, label: "שעות רגילות", color: "#1C3A5C" },
  { from: 17, to: 22, label: "שעות שיא", color: "#3A2C14" },
  { from: 22, to: 24, label: "שעות מתות", color: "#15233A" },
];

/* ============================ solar geometry ============================= */
function solarElevation(date, lat, lon) {
  const ms = date.getTime();
  const jd = ms / 86400000 + 2440587.5;
  const jc = (jd - 2451545) / 36525;
  const L0 = (280.46646 + jc * (36000.76983 + jc * 0.0003032)) % 360;
  const M = 357.52911 + jc * (35999.05029 - 0.0001537 * jc);
  const e = 0.016708634 - jc * (0.000042037 + 0.0000001267 * jc);
  const C2 =
    Math.sin(d2r(M)) * (1.914602 - jc * (0.004817 + 0.000014 * jc)) +
    Math.sin(d2r(2 * M)) * (0.019993 - 0.000101 * jc) +
    Math.sin(d2r(3 * M)) * 0.000289;
  const trueLong = L0 + C2;
  const appLong = trueLong - 0.00569 - 0.00478 * Math.sin(d2r(125.04 - 1934.136 * jc));
  const obliq =
    23 + (26 + (21.448 - jc * (46.815 + jc * (0.00059 - jc * 0.001813))) / 60) / 60 +
    0.00256 * Math.cos(d2r(125.04 - 1934.136 * jc));
  const decl = r2d(Math.asin(Math.sin(d2r(obliq)) * Math.sin(d2r(appLong))));
  const varY = Math.tan(d2r(obliq / 2)) ** 2;
  const eqTime =
    4 * r2d(varY * Math.sin(2 * d2r(L0)) - 2 * e * Math.sin(d2r(M)) +
      4 * e * varY * Math.sin(d2r(M)) * Math.cos(2 * d2r(L0)) -
      0.5 * varY * varY * Math.sin(4 * d2r(L0)) - 1.25 * e * e * Math.sin(2 * d2r(M)));
  const utcMin = ((ms % 86400000) + 86400000) % 86400000 / 60000;
  const tst = (utcMin + eqTime + 4 * lon + 1440) % 1440;
  let ha = tst / 4; ha = ha < 0 ? ha + 180 : ha - 180;
  const cosZ =
    Math.sin(d2r(lat)) * Math.sin(d2r(decl)) +
    Math.cos(d2r(lat)) * Math.cos(d2r(decl)) * Math.cos(d2r(ha));
  return 90 - r2d(Math.acos(Math.max(-1, Math.min(1, cosZ))));
}
const d2r = (x) => (x * Math.PI) / 180;
const r2d = (x) => (x * 180) / Math.PI;

/* sample elevation across today, return {hours:[{h,elev}], sunrise, sunset, noonH} */
function sunCurve(lat, lon, base) {
  const start = new Date(base); start.setHours(0, 0, 0, 0);
  const pts = [];
  for (let m = 0; m <= 24 * 60; m += 15) {
    const t = new Date(start.getTime() + m * 60000);
    pts.push({ h: m / 60, elev: Math.max(0, solarElevation(t, lat, lon)) });
  }
  const lit = pts.filter((p) => p.elev > 0);
  const sunrise = lit.length ? lit[0].h : 6;
  const sunset = lit.length ? lit[lit.length - 1].h : 18;
  const noon = pts.reduce((a, b) => (b.elev > a.elev ? b : a), pts[0]);
  return { pts, sunrise, sunset, noonH: noon.h, maxElev: noon.elev };
}

/* ============================== demo data ================================ */
function makePanels() {
  // mostly healthy, a few degraded to exercise the status colors
  const seed = [99, 98, 97, 96, 95, 94, 93, 92, 91, 97, 88, 86, 95, 96, 84, 82, 96, 95, 78, 74, 95, 96, 68, 93];
  return seed.map((pr, i) => ({ id: i + 1, pr, string: Math.floor(i / 8) + 1 }));
}
function statusColor(pr) {
  if (pr >= 90) return C.ok;
  if (pr >= 80) return C.amber;
  if (pr >= 70) return C.burnt;
  return C.red;
}
function statusLabel(pr) {
  if (pr >= 90) return "תקין";
  if (pr >= 80) return "ירידה קלה";
  if (pr >= 70) return "ירידה ניכרת";
  return "טעון טיפול";
}

/* ================================ styles ================================= */
function StyleBlock() {
  return (
    <style>{`
@import url('https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900&family=Heebo:wght@300;400;500;700&display=swap');
.sw-root{direction:rtl;font-family:'Heebo',system-ui,sans-serif;color:${C.cream};
  background:radial-gradient(120% 80% at 80% -10%, #123257 0%, ${C.pineDeep} 55%, #061629 100%);
  min-height:100vh;width:100%;overflow-x:hidden;}
.sw-serif{font-family:'Frank Ruhl Libre',serif;}
*{box-sizing:border-box;}
.sw-wrap{max-width:1180px;margin:0 auto;padding:18px;}
/* auth */
.sw-auth{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
.sw-card{width:100%;max-width:440px;background:rgba(245,241,230,0.04);
  border:1px solid rgba(201,162,75,0.35);border-radius:20px;padding:34px 30px;
  box-shadow:0 30px 70px rgba(0,0,0,0.45);backdrop-filter:blur(6px);}
.sw-logo{display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:6px;}
.sw-logo b{font-family:'Frank Ruhl Libre',serif;font-weight:900;font-size:26px;color:${C.cream};letter-spacing:.5px;}
.sw-sub{text-align:center;color:${C.creamDim};font-size:13px;margin-bottom:24px;opacity:.8;}
.sw-label{font-size:13px;color:${C.goldBright};margin:14px 0 6px;font-weight:500;}
.sw-input{width:100%;background:rgba(0,0,0,0.25);border:1px solid rgba(201,162,75,0.4);
  border-radius:11px;padding:13px 14px;color:${C.cream};font-size:15px;outline:none;font-family:inherit;}
.sw-input:focus{border-color:${C.gold};box-shadow:0 0 0 3px rgba(201,162,75,0.18);}
.sw-btn{width:100%;margin-top:22px;background:linear-gradient(180deg,${C.goldBright},${C.gold});
  color:#221a06;font-weight:700;font-size:15px;border:none;border-radius:12px;padding:14px;
  cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:transform .12s,filter .12s;}
.sw-btn:hover{filter:brightness(1.06);transform:translateY(-1px);}
.sw-btn.ghost{background:transparent;color:${C.creamDim};border:1px solid rgba(201,162,75,0.3);font-weight:500;margin-top:12px;}
.sw-sys{margin-top:18px;background:rgba(201,162,75,0.1);border:1px dashed rgba(201,162,75,0.5);
  border-radius:12px;padding:14px;font-size:13px;line-height:1.7;}
.sw-sys .code{font-family:ui-monospace,monospace;font-size:18px;color:${C.goldBright};letter-spacing:3px;font-weight:700;}
.sw-err{color:#ffb4a8;font-size:13px;margin-top:10px;text-align:center;min-height:18px;}
.sw-steps{display:flex;gap:6px;justify-content:center;margin-bottom:20px;}
.sw-dot{height:5px;width:34px;border-radius:3px;background:rgba(245,241,230,0.15);}
.sw-dot.on{background:${C.gold};}
/* dashboard */
.sw-top{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;
  padding:14px 18px;background:rgba(0,0,0,0.22);border:1px solid rgba(201,162,75,0.2);border-radius:16px;}
.sw-top h1{font-family:'Frank Ruhl Libre',serif;font-size:20px;margin:0;font-weight:700;}
.sw-top .who{font-size:12px;color:${C.creamDim};}
.sw-weather{display:flex;align-items:center;gap:14px;background:rgba(201,162,75,0.08);
  border:1px solid rgba(201,162,75,0.25);border-radius:13px;padding:8px 14px;flex-wrap:wrap;}
.sw-wx{display:flex;align-items:center;gap:6px;font-size:13px;color:${C.cream};}
.sw-wx small{color:${C.creamDim};font-size:11px;}
.sw-grid{display:grid;grid-template-columns:1.35fr 1fr;gap:16px;margin-top:16px;}
@media(max-width:900px){.sw-grid{grid-template-columns:1fr;}}
.sw-panel{background:rgba(245,241,230,0.045);border:1px solid rgba(201,162,75,0.2);
  border-radius:16px;padding:16px 18px;}
.sw-h{font-family:'Frank Ruhl Libre',serif;font-size:16px;font-weight:700;margin:0 0 12px;
  display:flex;align-items:center;gap:8px;color:${C.goldBright};}
.sw-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:16px;}
@media(max-width:760px){.sw-kpis{grid-template-columns:repeat(2,1fr);}}
.sw-kpi{background:rgba(0,0,0,0.2);border:1px solid rgba(201,162,75,0.18);border-radius:14px;padding:13px;}
.sw-kpi .v{font-family:'Frank Ruhl Libre',serif;font-size:24px;font-weight:900;line-height:1;}
.sw-kpi .l{font-size:11.5px;color:${C.creamDim};margin-top:6px;display:flex;align-items:center;gap:5px;}
.sw-flow{display:flex;flex-direction:column;gap:10px;}
.sw-flowrow{display:flex;align-items:center;justify-content:space-between;gap:10px;
  background:rgba(0,0,0,0.18);border-radius:11px;padding:11px 13px;border:1px solid rgba(201,162,75,0.12);}
.sw-flowrow .ic{display:flex;align-items:center;gap:9px;font-size:13.5px;}
.sw-bar{height:7px;border-radius:5px;background:rgba(255,255,255,0.08);overflow:hidden;flex:1;margin:0 12px;}
.sw-bar i{display:block;height:100%;border-radius:5px;}
.sw-pg{display:grid;grid-template-columns:repeat(8,1fr);gap:7px;}
@media(max-width:760px){.sw-pg{grid-template-columns:repeat(6,1fr);}}
.sw-tile{aspect-ratio:1/1.15;border-radius:9px;display:flex;flex-direction:column;align-items:center;
  justify-content:center;font-weight:700;font-size:13px;color:#0c1410;position:relative;cursor:default;
  border:1px solid rgba(0,0,0,0.2);transition:transform .1s;}
.sw-tile:hover{transform:scale(1.07);z-index:2;}
.sw-tile small{font-size:8.5px;font-weight:500;opacity:.8;}
.sw-legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:12px;font-size:11.5px;color:${C.creamDim};}
.sw-legend span{display:flex;align-items:center;gap:5px;}
.sw-chip{height:11px;width:11px;border-radius:3px;display:inline-block;}
.sw-soil{display:flex;flex-direction:column;gap:12px;}
.sw-soilbar{background:rgba(0,0,0,0.2);border-radius:11px;padding:13px;border:1px solid rgba(201,162,75,0.15);}
.sw-soilbar .row{display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;}
.sw-meter{height:9px;border-radius:5px;background:rgba(255,255,255,0.08);overflow:hidden;}
.sw-meter i{display:block;height:100%;background:linear-gradient(90deg,${C.ok},${C.amber},${C.red});}
/* popup */
.sw-modal-bg{position:fixed;inset:0;background:rgba(6,18,13,0.72);backdrop-filter:blur(3px);
  display:flex;align-items:center;justify-content:center;z-index:50;padding:20px;animation:fade .25s;}
.sw-modal{max-width:420px;width:100%;background:linear-gradient(180deg,#163A63,#0A1F3C);
  border:1px solid ${C.gold};border-radius:18px;padding:26px;box-shadow:0 30px 80px rgba(0,0,0,.6);position:relative;}
.sw-modal .close{position:absolute;top:14px;left:14px;background:none;border:none;color:${C.creamDim};cursor:pointer;}
.sw-modal h3{font-family:'Frank Ruhl Libre',serif;font-size:21px;margin:6px 0 4px;display:flex;gap:9px;align-items:center;}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{r:7;opacity:1}50%{r:10;opacity:.85}}
.sw-sun-disk{animation:pulse 2.6s ease-in-out infinite;}
.sw-hint{font-size:12px;color:${C.creamDim};opacity:.75;margin-top:8px;line-height:1.6;}
.sw-tag{display:inline-block;font-size:10.5px;padding:2px 8px;border-radius:20px;
  background:rgba(201,162,75,0.18);color:${C.goldBright};border:1px solid rgba(201,162,75,0.3);}
    `}</style>
  );
}

/* ============================== AUTH FLOW ================================ */
function Auth({ onDone }) {
  const [step, setStep] = useState(0); // 0 register, 1 otp, 2 newpass, 3 login
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [issued, setIssued] = useState(null); // {code, otp}
  const [otpIn, setOtpIn] = useState("");
  const [p1, setP1] = useState(""); const [p2, setP2] = useState("");
  const [loginCode, setLoginCode] = useState(""); const [loginPass, setLoginPass] = useState("");
  const [err, setErr] = useState("");

  const register = () => {
    setErr("");
    if (!name.trim() || !email.includes("@")) { setErr("נא למלא שם ואימייל תקין."); return; }
    const code = "SW-" + Math.floor(100000 + Math.random() * 900000);
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    setIssued({ code, otp });
    setStep(1);
  };
  const verify = () => {
    setErr("");
    if (otpIn.trim() !== issued.otp) { setErr("הקוד החד-פעמי שגוי. בדקו את ההודעה מהמערכת."); return; }
    setStep(2);
  };
  const savePass = () => {
    setErr("");
    if (p1.length < 6) { setErr("הסיסמה צריכה לפחות 6 תווים."); return; }
    if (p1 !== p2) { setErr("הסיסמאות אינן תואמות."); return; }
    onDone({ name, code: issued.code });
  };
  const login = () => {
    setErr("");
    if (!loginCode.trim() || !loginPass.trim()) { setErr("נא להזין קוד משתמש וסיסמה."); return; }
    onDone({ name: "לקוח SolarWash", code: loginCode.trim() });
  };

  return (
    <div className="sw-root">
      <StyleBlock />
      <div className="sw-auth">
        <div className="sw-card">
          <div className="sw-logo"><Sun color={C.gold} size={26} /><b>SolarWash</b></div>
          <div className="sw-sub">ניטור חכם ותחזוקת ניקיון למערכת הסולארית שלך</div>

          {step < 3 && (
            <div className="sw-steps">
              <div className={"sw-dot" + (step >= 0 ? " on" : "")} />
              <div className={"sw-dot" + (step >= 1 ? " on" : "")} />
              <div className={"sw-dot" + (step >= 2 ? " on" : "")} />
            </div>
          )}

          {step === 0 && (
            <>
              <div className="sw-label">שם מלא</div>
              <input className="sw-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ישראל ישראלי" />
              <div className="sw-label">אימייל</div>
              <input className="sw-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />
              <button className="sw-btn" onClick={register}><ShieldCheck size={17} /> הרשמה וקבלת קוד גישה</button>
              <button className="sw-btn ghost" onClick={() => setStep(3)}><LogIn size={16} /> כבר רשום? כניסה</button>
              <div className="sw-err">{err}</div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="sw-sys">
                המערכת הנפיקה עבורך פרטי גישה ראשוניים<br />
                קוד משתמש: <span className="code">{issued.code}</span><br />
                סיסמה חד-פעמית: <span className="code">{issued.otp}</span>
                <div className="sw-hint">בגרסה החיה הפרטים נשלחים ב-SMS ובאימייל. כאן הם מוצגים לצורך הדגמה.</div>
              </div>
              <div className="sw-label">הזנת הסיסמה החד-פעמית</div>
              <input className="sw-input" value={otpIn} onChange={(e) => setOtpIn(e.target.value)} placeholder="6 ספרות" inputMode="numeric" />
              <button className="sw-btn" onClick={verify}><KeyRound size={17} /> אימות</button>
              <button className="sw-btn ghost" onClick={() => setStep(0)}><ArrowLeft size={15} /> חזרה</button>
              <div className="sw-err">{err}</div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="sw-sub" style={{ marginBottom: 8 }}>בחר/י סיסמה אישית קבועה</div>
              <div className="sw-label">סיסמה חדשה</div>
              <input className="sw-input" type="password" value={p1} onChange={(e) => setP1(e.target.value)} placeholder="לפחות 6 תווים" />
              <div className="sw-label">אימות סיסמה</div>
              <input className="sw-input" type="password" value={p2} onChange={(e) => setP2(e.target.value)} placeholder="הקלדה חוזרת" />
              <button className="sw-btn" onClick={savePass}><Sparkles size={17} /> שמירה וכניסה למערכת</button>
              <div className="sw-err">{err}</div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="sw-label">קוד משתמש</div>
              <input className="sw-input" value={loginCode} onChange={(e) => setLoginCode(e.target.value)} placeholder="SW-XXXXXX" />
              <div className="sw-label">סיסמה</div>
              <input className="sw-input" type="password" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} placeholder="הסיסמה שלך" />
              <button className="sw-btn" onClick={login}><LogIn size={17} /> כניסה</button>
              <button className="sw-btn ghost" onClick={() => setStep(0)}><ArrowLeft size={15} /> להרשמה</button>
              <div className="sw-err">{err}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================== DASHBOARD ================================ */
function Dashboard({ user }) {
  const [now, setNow] = useState(new Date());
  const [panels, setPanels] = useState(makePanels);
  const [showClean, setShowClean] = useState(false);
  const popped = useRef(false);

  // live clock + gentle telemetry jitter
  useEffect(() => {
    const t = setInterval(() => {
      setNow(new Date());
      setPanels((ps) => ps.map((p) => ({ ...p, pr: clamp(p.pr + (Math.random() - 0.5) * 0.6, 55, 100) })));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const sun = useMemo(() => sunCurve(SITE.lat, SITE.lon, now), [now]);
  const elevNow = Math.max(0, solarElevation(now, SITE.lat, SITE.lon));
  const hourNow = now.getHours() + now.getMinutes() / 60;

  // system soiling = average shortfall from 100%
  const avgPr = panels.reduce((a, p) => a + p.pr, 0) / panels.length;
  const soilingPct = +(100 - avgPr).toFixed(1);

  // production scaled by sun elevation (sin of elevation) and soiling
  const sunFactor = Math.max(0, Math.sin(d2r(elevNow)));
  const powerKw = +(SITE.kWp * sunFactor * (avgPr / 100)).toFixed(2);
  const toBattery = +(powerKw * 0.32).toFixed(2);
  const toHome = +(powerKw * 0.5).toFixed(2);
  const toGrid = +Math.max(0, powerKw - toBattery - toHome).toFixed(2);
  const deadKwhToday = +(SITE.kWp * 5.2 * (soilingPct / 100)).toFixed(1); // lost daily production

  // popup when system drop >= 5%
  useEffect(() => {
    if (soilingPct >= 5 && !popped.current) { popped.current = true; setShowClean(true); }
  }, [soilingPct]);

  // hourly production series for the chart
  const hourly = useMemo(() => {
    const base = new Date(now); base.setHours(0, 0, 0, 0);
    return Array.from({ length: 24 }, (_, h) => {
      const t = new Date(base.getTime() + h * 3600000);
      const el = Math.max(0, solarElevation(t, SITE.lat, SITE.lon));
      const kw = +(SITE.kWp * Math.max(0, Math.sin(d2r(el))) * (avgPr / 100)).toFixed(2);
      return { h, label: String(h).padStart(2, "0"), kw };
    });
  }, [now, avgPr]);

  const lowPanels = panels.filter((p) => p.pr < 90).length;
  const daysSinceClean = 38;
  const cleanLossPct = 6.4;

  const wx = { temp: 31, cond: "בהיר", hum: 44, wind: 12, dust: "בינוני" };

  return (
    <div className="sw-root">
      <StyleBlock />
      <div className="sw-wrap">
        {/* top bar */}
        <div className="sw-top">
          <div>
            <h1><Sun color={C.gold} size={18} style={{ verticalAlign: "-3px", marginLeft: 6 }} />SolarWash</h1>
            <div className="who">{SITE.name} · {user.code}</div>
          </div>
          <div className="sw-weather">
            <div className="sw-wx"><CloudSun size={18} color={C.goldBright} /> {wx.temp}°<small>{wx.cond}</small></div>
            <div className="sw-wx"><Droplets size={15} color="#9fd6ff" /> {wx.hum}%<small>לחות</small></div>
            <div className="sw-wx"><Wind size={15} color="#cfe9d8" /> {wx.wind}<small>קמ"ש</small></div>
            <div className="sw-wx"><span className="sw-tag">אבק: {wx.dust}</span></div>
          </div>
        </div>

        {/* HERO — sun path */}
        <div className="sw-panel" style={{ marginTop: 16 }}>
          <div className="sw-h"><Sun size={16} /> מסלול השמש היום · תפוקה לפי שעה</div>
          <SunArc sun={sun} hourNow={hourNow} elevNow={elevNow} />
          <div className="sw-hint">
            שיא השמש על הפנלים סביב {fmtH(sun.noonH)} (גובה {Math.round(sun.maxElev)}°). זריחה {fmtH(sun.sunrise)} · שקיעה {fmtH(sun.sunset)}.
            התפוקה הגבוהה ביותר בחלון שמסומן בזהב; בקצוות היום הזווית נמוכה והתפוקה יורדת.
          </div>
        </div>

        {/* KPIs */}
        <div className="sw-kpis">
          <Kpi v={SITE.panelCount} l={<><Gauge size={12} /> פנלים</>} color={C.cream} />
          <Kpi v={powerKw + " kW"} l={<><Zap size={12} /> הספק נוכחי</>} color={C.goldBright} />
          <Kpi v={toHome + " kW"} l={<><Home size={12} /> לצריכה</>} color={C.ok} />
          <Kpi v={toBattery + " kW"} l={<><Battery size={12} /> לאגירה</>} color="#7cc6ff" />
          <Kpi v={deadKwhToday + " kWh"} l={<><AlertTriangle size={12} /> חשמל אבוד היום</>} color={C.red} />
        </div>

        {/* main grid */}
        <div className="sw-grid">
          {/* left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="sw-panel">
              <div className="sw-h"><Zap size={15} /> תפוקה שעתית · 24 שעות</div>
              <HourlyChart data={hourly} hourNow={hourNow} />
              <div className="sw-legend">
                <span><i className="sw-chip" style={{ background: "#3A2C14" }} /> שעות שיא</span>
                <span><i className="sw-chip" style={{ background: "#1C3A5C" }} /> שעות רגילות</span>
                <span><i className="sw-chip" style={{ background: "#15233A" }} /> שעות מתות</span>
              </div>
            </div>

            <div className="sw-panel">
              <div className="sw-h"><Battery size={15} /> חלוקת ההספק כעת</div>
              <div className="sw-flow">
                <FlowRow icon={<Home size={15} color={C.ok} />} label="צריכה בבית" val={toHome} max={powerKw} color={C.ok} />
                <FlowRow icon={<Battery size={15} color="#7cc6ff" />} label="טעינת אגירה" val={toBattery} max={powerKw} color="#7cc6ff" />
                <FlowRow icon={<Zap size={15} color={C.gold} />} label="יצוא לרשת" val={toGrid} max={powerKw} color={C.gold} />
              </div>
            </div>
          </div>

          {/* right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="sw-panel">
              <div className="sw-h"><Gauge size={15} /> מצב הפנלים · {lowPanels} בירידה</div>
              <div className="sw-pg">
                {panels.map((p) => (
                  <div key={p.id} className="sw-tile" style={{ background: statusColor(p.pr), color: p.pr < 80 ? "#fff" : "#0c1410" }} title={`פנל ${p.id} · ${statusLabel(p.pr)}`}>
                    {Math.round(p.pr)}%
                    <small>#{p.id}</small>
                  </div>
                ))}
              </div>
              <div className="sw-legend">
                <span><i className="sw-chip" style={{ background: C.ok }} /> 90–100%</span>
                <span><i className="sw-chip" style={{ background: C.amber }} /> 80–90%</span>
                <span><i className="sw-chip" style={{ background: C.burnt }} /> 70–80%</span>
                <span><i className="sw-chip" style={{ background: C.red }} /> מתחת ל-70%</span>
              </div>
            </div>

            <div className="sw-panel">
              <div className="sw-h"><Droplets size={15} /> זיהום ולכלוך פנלים</div>
              <div className="sw-soil">
                <div className="sw-soilbar">
                  <div className="row"><span>מאז הניקוי האחרון</span><span style={{ color: C.goldBright }}>{daysSinceClean} ימים</span></div>
                  <div className="row" style={{ fontSize: 12, color: C.creamDim }}><span>ירידת תפוקה מצטברת</span><span>{cleanLossPct}%</span></div>
                  <div className="sw-meter"><i style={{ width: Math.min(100, cleanLossPct * 8) + "%" }} /></div>
                </div>
                <div className="sw-soilbar">
                  <div className="row"><span>מצב נוכחי</span>
                    <span style={{ color: soilingPct >= 5 ? C.red : C.ok }}>ירידה של {soilingPct}%</span></div>
                  <div className="sw-meter"><i style={{ width: Math.min(100, soilingPct * 8) + "%" }} /></div>
                  <div className="sw-hint">
                    {soilingPct >= 5
                      ? "חצינו את סף ה-5% — מומלץ לתאם ניקוי בקרוב כדי לשחזר תפוקה."
                      : "התפוקה תקינה. נמשיך לנטר מול תחזית האבק והגשם באזורך."}
                  </div>
                </div>
                {soilingPct >= 5 && (
                  <button className="sw-btn" style={{ marginTop: 2 }} onClick={() => setShowClean(true)}>
                    <Sparkles size={16} /> תיאום ניקוי
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="sw-hint" style={{ textAlign: "center", marginTop: 18 }}>
          נתוני הדגמה חיים המונעים מזווית-השמש האמיתית לשעה זו. בגרסת הייצור הנתונים מגיעים מהממיר ומתחזית מזג-האוויר באזורך.
        </div>
      </div>

      {showClean && (
        <div className="sw-modal-bg" onClick={() => setShowClean(false)}>
          <div className="sw-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close" onClick={() => setShowClean(false)}><X size={18} /></button>
            <h3><Droplets size={20} color={C.goldBright} /> מומלץ לתאם ניקוי</h3>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: C.cream }}>
              זיהינו ירידת תפוקה של <b style={{ color: C.goldBright }}>{soilingPct}%</b> במערכת — מעבר לסף של 5%.
              ניקוי מקצועי צפוי לשחזר את רוב ההפרש. נתאם מועד בהתאם לתחזית (ללא גשם צפוי בימים הקרובים).
            </p>
            <button className="sw-btn" onClick={() => setShowClean(false)}><Sparkles size={16} /> אישור — צרו איתי קשר</button>
            <button className="sw-btn ghost" onClick={() => setShowClean(false)}>אזכיר מאוחר יותר</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ small components =========================== */
function Kpi({ v, l, color }) {
  return (
    <div className="sw-kpi">
      <div className="v" style={{ color }}>{v}</div>
      <div className="l">{l}</div>
    </div>
  );
}
function FlowRow({ icon, label, val, max, color }) {
  const pct = max > 0 ? (val / max) * 100 : 0;
  return (
    <div className="sw-flowrow">
      <div className="ic">{icon} {label}</div>
      <div className="sw-bar"><i style={{ width: pct + "%", background: color }} /></div>
      <div style={{ fontWeight: 700, fontSize: 13, minWidth: 64, textAlign: "left" }}>{val} kW</div>
    </div>
  );
}

function HourlyChart({ data, hourNow }) {
  return (
    <div style={{ width: "100%", height: 190 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
          {TOU.map((b, i) => (
            <ReferenceArea key={i} x1={b.from} x2={b.to} fill={b.color} fillOpacity={0.55} ifOverflow="extendDomain" />
          ))}
          <XAxis dataKey="h" type="number" domain={[0, 24]} ticks={[0, 6, 12, 18, 24]}
            tick={{ fill: "#cfc6ad", fontSize: 11 }} tickFormatter={(v) => v + ":00"} />
          <YAxis tick={{ fill: "#cfc6ad", fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#0A1F3C", border: "1px solid " + C.gold, borderRadius: 10, color: C.cream }}
            labelFormatter={(v) => `שעה ${String(v).padStart(2, "0")}:00`}
            formatter={(v) => [v + " kW", "תפוקה"]} />
          <ReferenceArea x1={Math.floor(hourNow)} x2={Math.floor(hourNow) + 1} fill={C.gold} fillOpacity={0.18} />
          <Bar dataKey="kw" radius={[3, 3, 0, 0]} maxBarSize={16}>
            {data.map((d, i) => (
              <Cell key={i} fill={Math.floor(hourNow) === d.h ? C.goldBright : C.pineSoft} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* signature SVG: the sun's daily arc with the live sun on the path */
function SunArc({ sun, hourNow, elevNow }) {
  const W = 1000, H = 200, pad = 26;
  const maxE = Math.max(20, sun.maxElev);
  const xOf = (h) => pad + (h / 24) * (W - pad * 2);
  const yOf = (e) => H - pad - (e / maxE) * (H - pad * 2);
  const path = sun.pts.map((p, i) => `${i ? "L" : "M"}${xOf(p.h).toFixed(1)},${yOf(p.elev).toFixed(1)}`).join(" ");
  const sunX = xOf(hourNow), sunY = yOf(Math.max(0, elevNow));
  const noonX = xOf(sun.noonH);
  return (
    <div style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#245A8F" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0A1F3C" stopOpacity="0.1" />
          </linearGradient>
          <radialGradient id="glow"><stop offset="0%" stopColor={C.goldBright} /><stop offset="100%" stopColor={C.gold} stopOpacity="0" /></radialGradient>
        </defs>
        {/* max-sun window highlight */}
        <rect x={xOf(sun.noonH - 2)} y={pad} width={xOf(sun.noonH + 2) - xOf(sun.noonH - 2)} height={H - pad * 2}
          fill={C.gold} opacity="0.12" rx="8" />
        {/* horizon + fill under arc */}
        <path d={`${path} L${xOf(24)},${H - pad} L${xOf(0)},${H - pad} Z`} fill="url(#sky)" />
        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(201,162,75,0.25)" />
        <path d={path} fill="none" stroke={C.goldBright} strokeWidth="2.4" strokeOpacity="0.85" />
        {/* hour ticks */}
        {[6, 12, 18].map((h) => (
          <g key={h}>
            <line x1={xOf(h)} y1={H - pad} x2={xOf(h)} y2={H - pad + 5} stroke="rgba(245,241,230,0.4)" />
            <text x={xOf(h)} y={H - 6} fill="#cfc6ad" fontSize="12" textAnchor="middle">{h}:00</text>
          </g>
        ))}
        {/* solar noon marker */}
        <line x1={noonX} y1={pad} x2={noonX} y2={H - pad} stroke={C.gold} strokeDasharray="3 4" opacity="0.5" />
        <text x={noonX} y={pad - 8} fill={C.goldBright} fontSize="12" textAnchor="middle" fontFamily="Frank Ruhl Libre">שיא שמש</text>
        {/* live sun */}
        {elevNow > 0 && (
          <>
            <circle cx={sunX} cy={sunY} r="20" fill="url(#glow)" />
            <circle className="sw-sun-disk" cx={sunX} cy={sunY} r="7" fill={C.goldBright} stroke="#fff7e0" strokeWidth="1.5" />
          </>
        )}
      </svg>
    </div>
  );
}

/* ================================ helpers =============================== */
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function fmtH(h) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

/* ================================== APP ================================= */
export default function App() {
  const [user, setUser] = useState(null);
  return user ? <Dashboard user={user} /> : <Auth onDone={setUser} />;
}
