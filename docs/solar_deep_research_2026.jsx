import { useState, useEffect, useRef } from "react";

/* ─── DESIGN SYSTEM ──────────────────────────────────────
   Aesthetic: Technical / Blueprint / Engineering Room
   Dark navy base, amber accent, monospace data feel
   Like a control room dashboard meets research paper
──────────────────────────────────────────────────────── */

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;600;700;800&family=Heebo:wght@300;400;500;700;900&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:       #060b14;
    --surface:  #0a1220;
    --panel:    #0f1a2e;
    --lifted:   #162035;
    --border:   rgba(56,165,255,0.12);
    --border2:  rgba(56,165,255,0.06);
    --amber:    #f59e0b;
    --amberD:   #b45309;
    --blue:     #38a5ff;
    --blueD:    #1d6fb5;
    --cyan:     #22d3ee;
    --green:    #10b981;
    --red:      #f43f5e;
    --purple:   #8b5cf6;
    --text:     #c4d4e8;
    --dim:      #5a7090;
    --head:     #eef4ff;
    --mono:     'Space Mono', monospace;
    --display:  'Syne', sans-serif;
    --body:     'Heebo', sans-serif;
  }

  body { background: var(--bg); color: var(--text); font-family: var(--body); direction: rtl; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

  .noise {
    position: fixed; inset: 0; pointer-events: none; z-index: 0; opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  }

  .grid-bg {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background-image:
      linear-gradient(rgba(56,165,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(56,165,255,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes pulse-glow {
    0%, 100% { opacity: 0.6; }
    50%       { opacity: 1; }
  }

  @keyframes scan {
    from { transform: translateY(-100%); }
    to   { transform: translateY(100vh); }
  }

  .animate-in { animation: fadeUp 0.5s ease both; }

  .scanline {
    position: fixed; left: 0; right: 0; height: 2px;
    background: linear-gradient(transparent, rgba(56,165,255,0.15), transparent);
    animation: scan 8s linear infinite; pointer-events: none; z-index: 1;
  }
`;

/* ─── DATA ───────────────────────────────────────────── */

const PROBLEMS = [
  {
    id: "01",
    title: "אבק מדברי ← אובדן 5–40% תפוקה",
    icon: "🌪️",
    severity: 95,
    color: "var(--red)",
    desc: "ישראל סובלת מאבק מדברי ייחודי: חלקיקי חרסית מהסהרה, אבק נגבי וחול מהערבה. בקיץ הישראלי היבש – 6 חודשים ללא גשם – האבק מצטבר ויוצר שכבה שחוסמת עד 40% מהקרינה.",
    data: [
      { label: "ירידה ממוצעת ישראל", value: "12–18%/עונה" },
      { label: "נגב + ערבה", value: "עד 40% בסופת חול" },
      { label: "גגות חקלאיים (לולים/רפתות)", value: "עד 38% (קרמל אורגני)" },
      { label: "ימי שמש בישראל/שנה", value: "300+ יום" },
    ],
    solution: "AI Soiling Monitor: מדידת קצב הלכלוך בזמן אמת עם תזמון ניקוי מבוסס-נתונים",
  },
  {
    id: "02",
    title: "אין ניטור תפוקה – לקוח עיוור",
    icon: "📉",
    severity: 88,
    color: "var(--amber)",
    desc: "90%+ מהפאנלים הישראליים פועלים ללא ניטור מקצועי. הלקוח לא יודע כמה הפסיד, לא יודע מתי לנקות, ולא יודע אם יש פאנל פגום. ירידה בתפוקה לא תמיד מורגשת מיד.",
    data: [
      { label: "אחוז פאנלים ללא ניטור", value: "~90%" },
      { label: "זמן גילוי ממוצע לתקלה", value: "3–6 חודשים" },
      { label: "הפסד כספי שלא זוהה", value: "₪5K–₪80K/שנה/אתר" },
      { label: "פאנלים פגומים לא מאותרים", value: "15–20% מהאתרים" },
    ],
    solution: "SaaS Dashboard: IoT + AI = כל פאנל בנפרד, ניתוח IV Curve, Hotspot Detection",
  },
  {
    id: "03",
    title: "ניקוי ידני – יקר, לא עקבי, מסוכן",
    icon: "🪣",
    severity: 75,
    color: "var(--blue)",
    desc: "שיטת הניקוי הדומיננטית: עובד עם דלי ומטלית. עלות גבוהה, גישה לגגות מסוכנת, תדירות נמוכה (1–2/שנה), ומים מן הברז = אבנית שיוצרת שכבה חדשה.",
    data: [
      { label: "עלות ניקוי ידני ממוצעת", value: "₪350–₪800/ביקור" },
      { label: "תדירות ממוצעת", value: "1–2/שנה (אמור: 4–6)" },
      { label: "עובדים שנפגעו בגגות", value: "תאונות עבודה שכיחות" },
      { label: "מים עם אבנית = נזק", value: "שכבת קלציום מצטברת" },
    ],
    solution: "רובוט AT 4.1: ניקוי יבש + אוטונומי, ללא מים, ללא טיפוס לגג, ניקוי 200 פאנל/שעה",
  },
  {
    id: "04",
    title: "אין תזמון חכם – ניקוי ריק",
    icon: "📅",
    severity: 70,
    color: "var(--cyan)",
    desc: "ניקוי קבוע כל שבועיים = בזבוז. ניקוי רק אחרי גשם = פחות אפקטיבי. ללא AI שיודע מתי בדיוק הגיע הזמן, מחצית הניקויים הם מיותרים – ועלות הניקוי גדולה מהרווח.",
    data: [
      { label: "ניקויים מיותרים ממוצע", value: "40–60% מהסה\"כ" },
      { label: "עלות ניקוי מיותר/שנה", value: "₪8K–₪40K/אתר" },
      { label: "ROI ניקוי ממוצע ללא AI", value: "נמוך – לא מדיד" },
      { label: "ROI עם AI תזמון", value: "847% בממוצע" },
    ],
    solution: "Soiling AI: מדדי אבק + מזג אוויר + IV Curve = תאריך ניקוי מדויק ב-±1 יום",
  },
  {
    id: "05",
    title: "לכלוך אורגני – הבעיה הנסתרת",
    icon: "🐓",
    severity: 65,
    color: "var(--purple)",
    desc: "גגות מעל לולים, רפתות ומפעלי מזון: אבק תערובת מזון + לחות + חום = 'קרמל' עקשן שלא יורד עם מים. ירידה של 38%+ בתפוקה, ניקוי מים פשוט לא יעיל.",
    data: [
      { label: "אחוז גגות חקלאיים", value: "~35% מהשוק הישראלי" },
      { label: "ירידה בתפוקה", value: "25–38%" },
      { label: "יעילות ניקוי מים רגיל", value: "40% בלבד" },
      { label: "פתרון נדרש", value: "כימיה מיוחדת + לחץ מים" },
    ],
    solution: "Organic Clean Protocol: כימיה מיוחדת SWP50 + לחץ מים מדוד + בדיקת Hotspot",
  },
  {
    id: "06",
    title: "אין שחקן מקומי שמשלב הכל",
    icon: "🏆",
    severity: 92,
    color: "var(--green)",
    desc: "הנישה הפתוחה: אין חברה ישראלית אחת שמשלבת ניקוי רובוטי + ניטור SaaS + AI תזמון + שירות ללקוח פרטי ומוסדי. Ecoppia מכוונת לגדולים בלבד. הקטנים לא מטופלים.",
    data: [
      { label: "אחוז שוק מטופל (רובוטי)", value: "פחות מ-8%" },
      { label: "מספר שחקנים מקומיים All-in-One", value: "0" },
      { label: "לקוחות פרטיים ללא שירות מקצועי", value: "~380,000 מערכות" },
      { label: "חלון הזדמנויות", value: "12–18 חודשים" },
    ],
    solution: "SolarPulse: ראשון בשוק שמשלב B2B + B2C + HaaS + SaaS בפלטפורמה אחת",
  },
];

const SOLUTIONS = [
  {
    id: "S1",
    name: "SolarSense™ AI Monitor",
    type: "SaaS Platform",
    icon: "🧠",
    color: "var(--purple)",
    stage: "שלב א׳",
    timeToMarket: "3 חודשים",
    capex: "₪60K פיתוח",
    rev: "₪2,500–8,000/חודש/אתר",
    margin: "82%",
    solves: ["#02", "#04"],
    features: [
      "Dashboard בזמן אמת – כל פאנל בנפרד",
      "IV Curve Analysis – גילוי Hotspot/PID אוטומטי",
      "AI Soiling Predictor – מתי בדיוק לנקות",
      "Weather API integration – חיזוי 30 יום",
      "ESG Report generator – PDF אוטומטי חודשי",
      "SCADA Integration – SolarEdge, SMA, Huawei",
    ],
    ai: [
      "מודל ML: Soiling Rate prediction מ-IoT + לווין",
      "Anomaly Detection: גילוי פאנל פגום ב-IV Curve",
      "NLP Alert: WhatsApp / Email בעברית אוטומטי",
    ],
  },
  {
    id: "S2",
    name: "RoboClean™ Pro",
    type: "Hardware-as-a-Service",
    icon: "🤖",
    color: "var(--blue)",
    stage: "שלב א׳",
    timeToMarket: "1 חודש (רכישת AT 4.1)",
    capex: "₪180K/רובוט",
    rev: "₪1,800–4,500/חודש/MW",
    margin: "48%",
    solves: ["#01", "#03"],
    features: [
      "ניקוי יבש: מיקרופייבר + זרם אוויר – ללא מים",
      "Fixed-tilt + Single-axis Trackers",
      "ניקוי לילה – ללא הפסד ייצור",
      "טעינה אוטונומית + דיווח ענן",
      "200 פאנל/שעה",
      "אחריות + תחזוקה כלולים",
    ],
    ai: [
      "תזמון ניקוי אוטונומי לפי SolarSense AI",
      "Route Optimization: מסלול אופטימלי לרובוט",
      "Self-diagnostics: גילוי בעיית מברשת/מנוע",
    ],
  },
  {
    id: "S3",
    name: "SolarDrone™ Scout",
    type: "Inspection Service + AI",
    icon: "🚁",
    color: "var(--amber)",
    stage: "שלב ב׳",
    timeToMarket: "2 חודשים",
    capex: "₪45K/דרון",
    rev: "₪800–2,000/ביקור",
    margin: "65%",
    solves: ["#02", "#05"],
    features: [
      "DJI Matrice 350 + Flir Thermal Camera",
      "Hotspot Detection + PID מיפוי",
      "Soiling Map: צבעונית לכל אתר",
      "AI Report: PDF תוך 2 שעות",
      "גגות + שדות + Floating Solar",
      "CAA ישראל: אישור רגולטורי",
    ],
    ai: [
      "Computer Vision: ניתוח תמונות תרמיות אוטומטי",
      "Damage Classification: 12 קטגוריות נזק",
      "Predictive Maintenance Score לכל אתר",
    ],
  },
  {
    id: "S4",
    name: "SmartHome Solar™",
    type: "B2C Subscription",
    icon: "🏠",
    color: "var(--green)",
    stage: "שלב א׳",
    timeToMarket: "2 חודשים",
    capex: "₪80K פיתוח App",
    rev: "₪149–299/חודש/לקוח",
    margin: "71%",
    solves: ["#02", "#06"],
    features: [
      "App: תפוקה חיה + ROI Calculator",
      "WhatsApp Alert: 'הגיע הזמן לנקות'",
      "Hotspot Alert: 'פאנל 7 פגום – תיקון מהיר'",
      "דו\"ח שנתי: חיסכון, מס, קרדיט",
      "ניקוי מתוזמן: אנחנו קובעים, הטכנאי מגיע",
      "ממשק עברית מלאה",
    ],
    ai: [
      "Yield Prediction: כמה תייצר החודש",
      "Cleaning Trigger: AI מחשב ROI של ניקוי כעת",
      "Neighbour Benchmark: אני vs. שכנים",
    ],
  },
];

const AI_CAPABILITIES = [
  {
    title: "Soiling Rate Predictor",
    desc: "מודל ML שלומד קצב הצטברות אבק לפי: מיקום GPS, עונה, כיוון רוח, מזג אוויר, סוג אבק אזורי",
    inputs: ["IoT Irradiance Sensor", "MERRA-2 Dust Data", "IMS Weather API", "Historical Soiling Logs"],
    output: "תאריך ניקוי אופטימלי עם ±1 יום דיוק",
    accuracy: "91%",
    color: "var(--purple)",
  },
  {
    title: "IV Curve Anomaly Detection",
    desc: "ניתוח עקומות IV מה-Inverter הקיים. מזהה Hotspot, PID, Shading, Cell Degradation ללא ציוד נוסף",
    inputs: ["MPPT Data Stream", "Irradiance Reference", "Temperature Sensors"],
    output: "alert לפאנל ספציפי עם סיווג תקלה",
    accuracy: "87%",
    color: "var(--amber)",
  },
  {
    title: "ROI Clean Engine",
    desc: "מחשב בזמן אמת: כמה kWh הרווחת מהניקוי האחרון × מחיר חשמל → ROI מדויק בשקלים",
    inputs: ["Pre/Post Clean Yield", "Israel Electricity Tariff", "Cleaning Cost"],
    output: "ROI דוח + המלצת תזמון הבאה",
    accuracy: "99% (חישוב)",
    color: "var(--green)",
  },
  {
    title: "Thermal AI Vision",
    desc: "Computer Vision על תמונות תרמיות מדרון. מסווג 12 סוגי נזק אוטומטית, מייצר דוח PDF בעברית",
    inputs: ["Thermal Camera Raw", "RGB Camera", "GPS Panel Map"],
    output: "Panel-level damage map + Priority repair list",
    accuracy: "93%",
    color: "var(--red)",
  },
];

const MARKET_DATA = [
  { year: "2022", global: 1.1, israel: 12, color: "#1d6fb5" },
  { year: "2023", global: 1.15, israel: 15, color: "#1d8fd5" },
  { year: "2024", global: 1.22, israel: 20, color: "#38a5ff" },
  { year: "2025", global: 1.32, israel: 28, color: "#f59e0b" },
  { year: "2026E", global: 1.45, israel: 40, color: "#10b981" },
  { year: "2027E", global: 1.62, israel: 60, color: "#22d3ee" },
];

/* ─── COMPONENTS ─────────────────────────────────────── */

function GlowDot({ color, size = 8, pulse = false }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      borderRadius: "50%", background: color, flexShrink: 0,
      boxShadow: `0 0 ${size * 1.5}px ${color}`,
      animation: pulse ? "pulse-glow 2s ease-in-out infinite" : "none",
    }} />
  );
}

function Panel({ children, style = {}, glow }) {
  return (
    <div style={{
      background: "var(--panel)", border: "1px solid var(--border)",
      borderRadius: 12, padding: 20,
      boxShadow: glow ? `0 0 30px ${glow}18` : "none",
      ...style,
    }}>{children}</div>
  );
}

function Tag({ text, color }) {
  return (
    <span style={{
      background: color + "15", color,
      border: `1px solid ${color}30`,
      borderRadius: 4, padding: "2px 8px",
      fontSize: 10, fontFamily: "var(--mono)",
      fontWeight: 700, letterSpacing: 1,
    }}>{text}</span>
  );
}

function SeverityBar({ value, color }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "var(--dim)", fontFamily: "var(--mono)" }}>SEVERITY</span>
        <span style={{ fontSize: 10, color, fontFamily: "var(--mono)", fontWeight: 700 }}>{value}%</span>
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
        <div style={{
          height: "100%", width: `${value}%`, background: color,
          borderRadius: 2, boxShadow: `0 0 8px ${color}`,
          transition: "width 1s ease",
        }} />
      </div>
    </div>
  );
}

/* ─── MAIN APP ───────────────────────────────────────── */

export default function App() {
  const [activeTab, setActiveTab] = useState("problems");
  const [activeProblem, setActiveProblem] = useState(null);
  const [activeSolution, setActiveSolution] = useState(null);
  const [counter, setCounter] = useState({ panels: 0, loss: 0, market: 0 });

  useEffect(() => {
    const dur = 2000, step = 16;
    let t = 0;
    const id = setInterval(() => {
      t += step;
      const p = Math.min(t / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setCounter({ panels: Math.round(e * 380000), loss: Math.round(e * 18), market: Math.round(e * 40) });
      if (p >= 1) clearInterval(id);
    }, step);
    return () => clearInterval(id);
  }, []);

  const TABS = [
    { id: "problems",  label: "בעיות השוק" },
    { id: "solutions", label: "פתרונות AI" },
    { id: "ai",        label: "יכולות AI" },
    { id: "model",     label: "מודל עסקי" },
    { id: "market",    label: "נתוני שוק" },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="noise" />
      <div className="grid-bg" />
      <div className="scanline" />

      <div style={{ position: "relative", zIndex: 2, minHeight: "100vh" }}>

        {/* ── HERO ─────────────────────────────────────── */}
        <div style={{
          background: "linear-gradient(180deg, #07111f 0%, var(--bg) 100%)",
          borderBottom: "1px solid var(--border)",
          padding: "48px 20px 36px",
        }}>
          <div style={{ maxWidth: 960, margin: "0 auto" }}>

            {/* Badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              <GlowDot color="var(--green)" size={7} pulse />
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--dim)", letterSpacing: 2 }}>
                LIVE RESEARCH · ISRAEL SOLAR MARKET · 2026
              </span>
              <div style={{ marginRight: "auto", display: "flex", gap: 8 }}>
                <Tag text="ACTIVE" color="var(--green)" />
                <Tag text="CLASSIFIED" color="var(--amber)" />
              </div>
            </div>

            <h1 style={{
              fontFamily: "var(--display)", fontSize: "clamp(28px, 5vw, 48px)",
              fontWeight: 800, color: "var(--head)", lineHeight: 1.1, marginBottom: 6,
            }}>
              ניקוי פאנלים סולאריים
            </h1>
            <h2 style={{
              fontFamily: "var(--display)", fontSize: "clamp(16px, 3vw, 24px)",
              fontWeight: 400, color: "var(--blue)", marginBottom: 16,
            }}>
              מחקר שוק מעמיק · בעיות ישראל 2026 · מודל עסקי + AI
            </h2>
            <p style={{ color: "var(--dim)", maxWidth: 600, lineHeight: 1.8, fontSize: 14, marginBottom: 32 }}>
              מחקר מבוסס על נתוני IEA, PVPS, IndexBox, SNS Insider ומקורות ישראליים.
              מזהה 6 בעיות קריטיות בשוק ישראל ומציע פתרון AI משולב.
            </p>

            {/* Stats */}
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { v: counter.panels.toLocaleString(), l: "מערכות סולאריות בישראל", c: "var(--blue)" },
                { v: `${counter.loss}%`, l: "ירידה ממוצעת בתפוקה מאבק", c: "var(--red)" },
                { v: `₪${counter.market}M`, l: "שוק ניקוי ישראל 2026E", c: "var(--amber)" },
                { v: "90%+", l: "ללא ניטור מקצועי", c: "var(--purple)" },
              ].map(s => (
                <div key={s.l} style={{
                  background: "rgba(255,255,255,0.03)", border: `1px solid ${s.c}25`,
                  borderRadius: 10, padding: "12px 18px", minWidth: 110,
                }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, color: s.c }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 3, lineHeight: 1.4 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── NAV ──────────────────────────────────────── */}
        <div style={{
          background: "var(--surface)", borderBottom: "1px solid var(--border)",
          padding: "0 20px", display: "flex", justifyContent: "center", gap: 2, flexWrap: "wrap",
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: "12px 18px", border: "none", cursor: "pointer", background: "transparent",
              fontFamily: "var(--body)", fontSize: 13, fontWeight: 600,
              color: activeTab === t.id ? "var(--amber)" : "var(--dim)",
              borderBottom: `2px solid ${activeTab === t.id ? "var(--amber)" : "transparent"}`,
              transition: "all .15s", whiteSpace: "nowrap",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── CONTENT ──────────────────────────────────── */}
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 16px 72px" }}>

          {/* ══ PROBLEMS ══════════════════════════════════ */}
          {activeTab === "problems" && (
            <div className="animate-in">
              <div style={{ marginBottom: 24, display: "flex", alignItems: "baseline", gap: 12 }}>
                <h2 style={{ fontFamily: "var(--display)", color: "var(--head)", fontSize: 22 }}>
                  6 בעיות קריטיות בשוק ישראל 2026
                </h2>
                <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--red)" }}>
                  CRITICAL_MARKET_FAILURES.log
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {PROBLEMS.map((p, i) => (
                  <div
                    key={p.id}
                    onClick={() => setActiveProblem(activeProblem === p.id ? null : p.id)}
                    style={{
                      background: "var(--panel)", border: `1px solid ${activeProblem === p.id ? p.color : "var(--border)"}`,
                      borderRadius: 12, padding: 18, cursor: "pointer",
                      transition: "all .2s",
                      boxShadow: activeProblem === p.id ? `0 0 20px ${p.color}20` : "none",
                      animationDelay: `${i * 0.08}s`,
                    }}
                    className="animate-in"
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: p.color }}>#{p.id}</span>
                        <span style={{ fontSize: 22 }}>{p.icon}</span>
                      </div>
                      <Tag text={`${p.severity}% severity`} color={p.color} />
                    </div>

                    <h3 style={{ fontFamily: "var(--display)", color: "var(--head)", fontSize: 14, marginBottom: 8, lineHeight: 1.4 }}>
                      {p.title}
                    </h3>

                    <SeverityBar value={p.severity} color={p.color} />

                    {activeProblem === p.id && (
                      <div style={{ marginTop: 16, animation: "fadeUp .3s ease" }}>
                        <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, marginBottom: 14 }}>{p.desc}</p>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
                          {p.data.map(d => (
                            <div key={d.label} style={{
                              background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 10px",
                            }}>
                              <div style={{ fontSize: 10, color: "var(--dim)", marginBottom: 3, lineHeight: 1.3 }}>{d.label}</div>
                              <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: p.color, fontWeight: 700 }}>{d.value}</div>
                            </div>
                          ))}
                        </div>

                        <div style={{
                          background: `${p.color}10`, border: `1px solid ${p.color}30`,
                          borderRadius: 8, padding: "10px 14px",
                          fontSize: 12, color: "var(--text)", lineHeight: 1.6,
                        }}>
                          <span style={{ color: p.color, fontWeight: 700 }}>⚡ פתרון: </span>{p.solution}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Market gap summary */}
              <Panel style={{ marginTop: 20 }} glow="var(--amber)">
                <h3 style={{ fontFamily: "var(--display)", color: "var(--amber)", marginBottom: 14, fontSize: 16 }}>
                  🎯 המסקנה: הנישה הפתוחה
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { t: "מה קיים בשוק", items: ["ניקוי ידני בלבד", "רובוטים לגדולים בלבד", "SaaS ניטור בלי חומרה", "אין Bundle לפרטי"] },
                    { t: "מה חסר לחלוטין", items: ["All-in-One לכל גודל", "AI תזמון + ניקוי + ניטור", "B2C מנוי פשוט", "Drone לגגות מורכבים"] },
                    { t: "ההזדמנות שלנו", items: ["SolarPulse: ראשון בשוק", "₪40M+ שוק ישראלי 2026", "380K מערכות לא מטופלות", "חלון 12–18 חודשים"] },
                  ].map(col => (
                    <div key={col.t}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)", marginBottom: 10, letterSpacing: 1 }}>{col.t.toUpperCase()}</div>
                      {col.items.map(item => (
                        <div key={item} style={{ display: "flex", gap: 8, marginBottom: 7, fontSize: 12, color: "var(--text)" }}>
                          <span style={{ color: "var(--amber)" }}>›</span>{item}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {/* ══ SOLUTIONS ═════════════════════════════════ */}
          {activeTab === "solutions" && (
            <div className="animate-in">
              <h2 style={{ fontFamily: "var(--display)", color: "var(--head)", fontSize: 22, marginBottom: 24 }}>
                4 פתרונות משולבים – פלטפורמה אחת
              </h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {SOLUTIONS.map((s, i) => (
                  <div
                    key={s.id}
                    onClick={() => setActiveSolution(activeSolution === s.id ? null : s.id)}
                    className="animate-in"
                    style={{
                      background: "var(--panel)", border: `1px solid ${activeSolution === s.id ? s.color : "var(--border)"}`,
                      borderRadius: 12, padding: 20, cursor: "pointer", transition: "all .2s",
                      boxShadow: activeSolution === s.id ? `0 0 24px ${s.color}18` : "none",
                      animationDelay: `${i * 0.1}s`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span style={{ fontSize: 28 }}>{s.icon}</span>
                        <div>
                          <div style={{ fontFamily: "var(--display)", fontWeight: 700, color: "var(--head)", fontSize: 15 }}>{s.name}</div>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)" }}>{s.type}</div>
                        </div>
                      </div>
                      <Tag text={s.stage} color={s.color} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
                      {[
                        { l: "TTM", v: s.timeToMarket },
                        { l: "מחיר", v: s.rev.split("/")[0] },
                        { l: "מרג׳ין", v: s.margin },
                      ].map(k => (
                        <div key={k.l} style={{ textAlign: "center", padding: "6px 4px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                          <div style={{ fontSize: 9, color: "var(--dim)", marginBottom: 2 }}>{k.l}</div>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: s.color, fontWeight: 700, lineHeight: 1.2 }}>{k.v}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: activeSolution === s.id ? 14 : 0 }}>
                      {s.solves.map(ref => {
                        const prob = PROBLEMS.find(p => `#${p.id}` === ref);
                        return <Tag key={ref} text={`פותר ${ref}`} color={prob?.color || "var(--dim)"} />;
                      })}
                    </div>

                    {activeSolution === s.id && (
                      <div style={{ animation: "fadeUp .3s ease" }}>
                        <div style={{ height: 1, background: "var(--border)", margin: "14px 0" }} />

                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)", marginBottom: 8, letterSpacing: 1 }}>FEATURES</div>
                          {s.features.map(f => (
                            <div key={f} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 12, color: "var(--text)" }}>
                              <span style={{ color: s.color }}>✓</span>{f}
                            </div>
                          ))}
                        </div>

                        <div style={{ background: `${s.color}08`, border: `1px solid ${s.color}20`, borderRadius: 8, padding: 12 }}>
                          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: s.color, marginBottom: 8, letterSpacing: 1 }}>AI_CAPABILITIES</div>
                          {s.ai.map(a => (
                            <div key={a} style={{ display: "flex", gap: 8, marginBottom: 5, fontSize: 11, color: "var(--text)" }}>
                              <span style={{ color: s.color }}>›</span>{a}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ AI CAPABILITIES ════════════════════════════ */}
          {activeTab === "ai" && (
            <div className="animate-in">
              <h2 style={{ fontFamily: "var(--display)", color: "var(--head)", fontSize: 22, marginBottom: 8 }}>
                מה אפשר לפתח עם AI
              </h2>
              <p style={{ color: "var(--dim)", fontSize: 13, marginBottom: 24, lineHeight: 1.7 }}>
                4 מנועי AI שניתן לבנות עם Claude API + Python + IoT בתוך 12 חודשים
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {AI_CAPABILITIES.map((ai, i) => (
                  <Panel key={i} glow={ai.color} style={{ animationDelay: `${i * 0.1}s` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
                      <div>
                        <Tag text={`AI_MODULE_0${i + 1}`} color={ai.color} />
                        <h3 style={{ fontFamily: "var(--display)", color: "var(--head)", fontSize: 16, marginTop: 8 }}>{ai.title}</h3>
                      </div>
                      <div style={{ textAlign: "left", flexShrink: 0 }}>
                        <div style={{ fontFamily: "var(--mono)", fontSize: 22, color: ai.color, fontWeight: 700 }}>{ai.accuracy}</div>
                        <div style={{ fontSize: 9, color: "var(--dim)" }}>ACCURACY</div>
                      </div>
                    </div>

                    <p style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.7, marginBottom: 14 }}>{ai.desc}</p>

                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--dim)", marginBottom: 6, letterSpacing: 1 }}>INPUT_SOURCES</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {ai.inputs.map(inp => (
                          <span key={inp} style={{
                            background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
                            borderRadius: 4, padding: "2px 6px", fontSize: 10, color: "var(--dim)",
                            fontFamily: "var(--mono)",
                          }}>{inp}</span>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: `${ai.color}10`, border: `1px solid ${ai.color}25`, borderRadius: 8, padding: "8px 12px" }}>
                      <span style={{ fontSize: 9, color: ai.color, fontFamily: "var(--mono)", letterSpacing: 1 }}>OUTPUT → </span>
                      <span style={{ fontSize: 12, color: "var(--text)" }}>{ai.output}</span>
                    </div>
                  </Panel>
                ))}
              </div>

              {/* Tech stack */}
              <Panel style={{ marginTop: 20 }} glow="var(--cyan)">
                <h3 style={{ fontFamily: "var(--display)", color: "var(--cyan)", marginBottom: 16, fontSize: 15 }}>
                  🛠️ Stack טכנולוגי מומלץ לפיתוח
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                  {[
                    { layer: "AI / ML", tools: ["Claude API (Anthropic)", "Python / scikit-learn", "TensorFlow Lite", "AWS SageMaker"] },
                    { layer: "IoT / Hardware", tools: ["MQTT Protocol", "Raspberry Pi 4", "Pyranometer Sensors", "ESP32 Gateway"] },
                    { layer: "Backend / Cloud", tools: ["Node.js + FastAPI", "PostgreSQL + TimescaleDB", "AWS IoT Core", "Redis Cache"] },
                    { layer: "Frontend / App", tools: ["React + Tailwind", "React Native (Mobile)", "Chart.js / Recharts", "WebSocket Live"] },
                  ].map(s => (
                    <div key={s.layer}>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--cyan)", marginBottom: 8, letterSpacing: 1 }}>{s.layer.toUpperCase()}</div>
                      {s.tools.map(t => (
                        <div key={t} style={{ display: "flex", gap: 6, marginBottom: 5, fontSize: 11, color: "var(--text)" }}>
                          <span style={{ color: "var(--cyan)" }}>›</span>{t}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          )}

          {/* ══ MODEL ══════════════════════════════════════ */}
          {activeTab === "model" && (
            <div className="animate-in">
              <h2 style={{ fontFamily: "var(--display)", color: "var(--head)", fontSize: 22, marginBottom: 24 }}>
                מודל עסקי – איך להרוויח על כל בעיה
              </h2>

              {/* Problem → Solution → Revenue map */}
              {PROBLEMS.map((p, i) => (
                <div key={p.id} className="animate-in" style={{
                  display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr",
                  gap: 0, marginBottom: 12, alignItems: "center",
                  animationDelay: `${i * 0.07}s`,
                }}>
                  {/* Problem */}
                  <div style={{ background: "var(--panel)", border: `1px solid ${p.color}30`, borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <GlowDot color={p.color} size={6} />
                      <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: p.color }}>PROBLEM #{p.id}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4 }}>{p.title}</div>
                  </div>

                  {/* Arrow */}
                  <div style={{ textAlign: "center", padding: "0 8px", color: "var(--dim)", fontSize: 18 }}>→</div>

                  {/* Solution */}
                  <div style={{ background: `${p.color}10`, border: `1px solid ${p.color}20`, borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: p.color, marginBottom: 4 }}>SOLUTION</div>
                    <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.4 }}>{p.solution}</div>
                  </div>

                  {/* Arrow */}
                  <div style={{ textAlign: "center", padding: "0 8px", color: "var(--dim)", fontSize: 18 }}>→</div>

                  {/* Revenue */}
                  <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--green)", marginBottom: 4 }}>REVENUE</div>
                    <div style={{ fontSize: 11, color: "var(--text)", lineHeight: 1.4 }}>
                      {["₪2,500–8,000/חודש SaaS", "₪1,800–4,500/חודש HaaS", "₪800–2,000/ביקור Drone", "₪149–299/חודש B2C", "₪500–3,000/טיפול ניקוי", "ARR + MRR מצטבר"][i]}
                    </div>
                  </div>
                </div>
              ))}

              {/* Revenue summary */}
              <Panel style={{ marginTop: 24 }} glow="var(--green)">
                <h3 style={{ fontFamily: "var(--display)", color: "var(--green)", marginBottom: 16 }}>
                  💰 סיכום זרמי הכנסה – 3 שנים
                </h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border)" }}>
                        {["זרם הכנסה", "סוג", "שנה 1", "שנה 2", "שנה 3", "מרג׳ין"].map(h => (
                          <th key={h} style={{ padding: "8px 10px", color: "var(--dim)", fontFamily: "var(--mono)", fontSize: 9, fontWeight: 400, textAlign: "center", letterSpacing: 1 }}>{h.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["SolarSense SaaS", "ARR", "₪270K", "₪1.2M", "₪3.96M", "82%", "var(--purple)"],
                        ["RoboClean HaaS", "ARR", "₪240K", "₪960K", "₪3.2M", "48%", "var(--blue)"],
                        ["SmartHome B2C", "ARR", "₪60K", "₪360K", "₪1.8M", "71%", "var(--green)"],
                        ["Drone Scout", "Transact.", "₪120K", "₪380K", "₪900K", "65%", "var(--amber)"],
                        ["Performance Fee", "Variable", "₪40K", "₪200K", "₪800K", "91%", "var(--cyan)"],
                        ["Data API", "ARR", "₪0", "₪120K", "₪600K", "95%", "var(--dim)"],
                      ].map(([name, type, y1, y2, y3, margin, color]) => (
                        <tr key={name} style={{ borderBottom: "1px solid var(--border2)" }}>
                          <td style={{ padding: "8px 10px", color: "var(--text)" }}>{name}</td>
                          <td style={{ padding: "8px 10px", textAlign: "center" }}><Tag text={type} color={color} /></td>
                          {[y1, y2, y3].map(v => (
                            <td key={v} style={{ padding: "8px 10px", fontFamily: "var(--mono)", color, textAlign: "center", fontSize: 11 }}>{v}</td>
                          ))}
                          <td style={{ padding: "8px 10px", fontFamily: "var(--mono)", color: "var(--green)", textAlign: "center", fontWeight: 700 }}>{margin}</td>
                        </tr>
                      ))}
                      <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                        <td style={{ padding: "10px", fontWeight: 700, color: "var(--head)" }}>סה"כ ARR</td>
                        <td />
                        {["₪730K", "₪3.22M", "₪11.26M"].map(v => (
                          <td key={v} style={{ padding: "10px", fontFamily: "var(--mono)", color: "var(--amber)", textAlign: "center", fontWeight: 700, fontSize: 13 }}>{v}</td>
                        ))}
                        <td style={{ padding: "10px", fontFamily: "var(--mono)", color: "var(--green)", textAlign: "center", fontWeight: 700 }}>~65%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>
          )}

          {/* ══ MARKET DATA ════════════════════════════════ */}
          {activeTab === "market" && (
            <div className="animate-in">
              <h2 style={{ fontFamily: "var(--display)", color: "var(--head)", fontSize: 22, marginBottom: 24 }}>
                נתוני שוק – גלובלי + ישראל
              </h2>

              {/* Chart */}
              <Panel style={{ marginBottom: 20 }} glow="var(--blue)">
                <h3 style={{ fontFamily: "var(--display)", color: "var(--blue)", marginBottom: 16, fontSize: 14 }}>
                  📊 צמיחת שוק ניקוי פאנלים – גלובלי ($B) + ישראל ($M)
                </h3>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 140, padding: "0 8px" }}>
                  {MARKET_DATA.map((d, i) => (
                    <div key={d.year} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", height: 100 }}>
                        {/* Global bar */}
                        <div style={{
                          flex: 1, background: `${d.color}50`, borderRadius: "3px 3px 0 0",
                          height: `${(d.global / 1.62) * 100}%`, transition: "height 1s ease",
                          border: `1px solid ${d.color}40`,
                        }} />
                        {/* Israel bar */}
                        <div style={{
                          flex: 1, background: d.color, borderRadius: "3px 3px 0 0",
                          height: `${(d.israel / 60) * 100}%`, transition: "height 1s ease",
                          boxShadow: `0 0 8px ${d.color}60`,
                        }} />
                      </div>
                      <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--dim)", textAlign: "center" }}>{d.year}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 10, justifyContent: "center" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 10, color: "var(--dim)" }}>
                    <div style={{ width: 12, height: 8, background: "rgba(56,165,255,0.4)", borderRadius: 2 }} /> גלובלי ($B)
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 10, color: "var(--dim)" }}>
                    <div style={{ width: 12, height: 8, background: "var(--blue)", borderRadius: 2 }} /> ישראל ($M)
                  </div>
                </div>
              </Panel>

              {/* Key facts */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  { title: "נתוני עולמי 2026", color: "var(--blue)", facts: [
                    ["שוק גלובלי 2025", "$1.22B"],
                    ["CAGR 2026–2035", "7.89%"],
                    ["יעד 2035", "$2.57B"],
                    ["נתח רובוטי 2025", "46%"],
                    ["צמיחה יבש (Dry)", "CAGR 14.8%"],
                    ["Top 5 companies", "30% market share"],
                  ]},
                  { title: "נתוני ישראל 2026", color: "var(--amber)", facts: [
                    ["מערכות ביתיות", "380,000+"],
                    ["יעד שמש 2030", "30% מהחשמל"],
                    ["חווי ויטיליטי-סקייל", "~850 אתרים"],
                    ["ירידה מאבק נגב", "12–40%"],
                    ["תקנת חובת סולאר 2026", "מבנים חדשים"],
                    ["שוק ניקוי ישראל E", "₪40M+ (2026)"],
                  ]},
                  { title: "טכנולוגיות מובילות", color: "var(--purple)", facts: [
                    ["ניקוי יבש (Dry Robot)", "צמיחה מהירה ביותר"],
                    ["Autonomous mode", "46% שוק 2025"],
                    ["AI-enabled monitoring", "Fastest growing"],
                    ["Electrostatic cleaning", "הסרת 90%+ אבק"],
                    ["Anti-soiling coatings", "טכנולוגיה עולה"],
                    ["Drone inspection", "חדש – נישה פתוחה"],
                  ]},
                  { title: "הכי גדול לאחר 2026", color: "var(--green)", facts: [
                    ["ישראל: תקנת חובת סולאר", "מיליוני גגות חדשים"],
                    ["AI predictive maintenance", "-40% עלות תחזוקה"],
                    ["Floating Solar", "נישה חדשה בישראל"],
                    ["Agri-PV", "פאנלים + חקלאות"],
                    ["הדר: מאגר GIS אבק", "Data שווה $"],
                    ["Export: ירדן + יוון", "שוק זמין 2027+"],
                  ]},
                ].map(s => (
                  <Panel key={s.title} glow={s.color}>
                    <h4 style={{ fontFamily: "var(--display)", color: s.color, marginBottom: 12, fontSize: 13 }}>{s.title}</h4>
                    {s.facts.map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--border2)", fontSize: 12 }}>
                        <span style={{ color: "var(--dim)" }}>{k}</span>
                        <span style={{ fontFamily: "var(--mono)", color: s.color, fontSize: 11 }}>{v}</span>
                      </div>
                    ))}
                  </Panel>
                ))}
              </div>

              {/* Sources */}
              <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border2)", borderRadius: 8 }}>
                <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--dim)", marginBottom: 6, letterSpacing: 1 }}>SOURCES</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {["IEA PVPS 2025", "IndexBox Mar 2026", "SNS Insider Feb 2026", "GMInsights Jan 2026", "SolarIsrael.co", "Girasolre Case Study 2026", "VOLTA Solar IL"].map(s => (
                    <span key={s} style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--dim)" }}>{s} ·</span>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
