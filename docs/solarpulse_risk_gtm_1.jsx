import { useState } from "react";

/* ─── DESIGN BRIEF ────────────────────────────────────────
   Subject: Risk & Marketing intelligence report for a solar
            O&M startup (SolarPulse, Israel 2026)
   Audience: Founders, potential investors, first sales hires
   Job: Surface hard truths clearly — risks, wins, GTM playbook

   Aesthetic: War-room intelligence briefing. Think CIA
   situation room meets McKinsey one-pager. Warm amber
   alert palette against deep charcoal. Dense, data-forward.
   NOT the usual startup "friendly dashboard green".

   Signature risk: The RISK DIAL — a live severity dial per
   risk item that looks like a threat-level indicator.
──────────────────────────────────────────────────────────── */

/* ─── PALETTE & TYPE ──────────────────────────────────────
   bg:        #0e0e0e  (near-black, not navy — deliberate)
   surface:   #161616
   card:      #1c1c1c
   amber:     #e8a020  (alert / warning — dominant accent)
   red:       #c0392b  (critical)
   green:     #1a9e5c  (success / mitigation)
   blue:      #2980b9  (neutral info)
   dim:       #5a5a5a
   text:      #c8c8c8
   head:      #f0f0f0
   mono:      IBM Plex Mono
   display:   Barlow Condensed (tight, military-report feel)
   body:      Heebo (Hebrew-native)
──────────────────────────────────────────────────────────── */

const P = {
  bg:      "#0e0e0e",
  surface: "#161616",
  card:    "#1c1c1c",
  lift:    "#222222",
  amber:   "#e8a020",
  amberD:  "#a06c10",
  red:     "#c0392b",
  redD:    "#7b241c",
  green:   "#1a9e5c",
  greenD:  "#0d5c34",
  blue:    "#2980b9",
  blueD:   "#1a5276",
  purple:  "#8e44ad",
  dim:     "#5a5a5a",
  text:    "#c8c8c8",
  head:    "#f0f0f0",
  border:  "rgba(255,255,255,0.07)",
};

/* ─── DATA ────────────────────────────────────────────────  */

const RISKS = [
  {
    id: "R1",
    category: "שוק",
    title: "לקוחות לא מוכנים לשלם על ניטור",
    severity: 78,
    probability: 65,
    impact: "גבוה",
    detail: "תרבות O&M בישראל נמוכה. רוב בעלי הפאנלים לא מדדו ROI מעולם ואינם מאמינים בחיסכון. מחזור מכירה ארוך מהצפוי.",
    mitigation: [
      "Pilot חינמי 60 יום ← שחרר נעל ← המרה 65%+",
      "ROI Calculator שמראה ₪ מוחשיים תוך 30 שניות",
      "Case Study עם מספרים אמיתיים מ-Pilot ראשון",
    ],
    mitigationScore: 55,
    color: P.amber,
  },
  {
    id: "R2",
    category: "תחרות",
    title: "Ecoppia / ECO-OPS מכניסה מוצר B2C",
    severity: 62,
    probability: 40,
    impact: "בינוני-גבוה",
    detail: "Ecoppia נמכרה ב-2024 אך ECO-OPS ממשיכה. עם מותג מוכר ו-50+ פטנטים, כניסה לשוק הקטן עלולה לחסום.",
    mitigation: [
      "בנה חפיר: נתוני Soiling Local ← AI מיומן על ישראל",
      "Lock-in: ממשק API ללקוח ← מחיר מעבר גבוה",
      "שיתוף: גש ל-ECO-OPS כ-OEM partner לא כמתחרה",
    ],
    mitigationScore: 60,
    color: P.amber,
  },
  {
    id: "R3",
    category: "פיתוח",
    title: "AI לא מדויק → לקוח לא מנקה בזמן הנכון",
    severity: 85,
    probability: 45,
    impact: "קריטי",
    detail: "אם תחזית הניקוי שגויה — לקוח מפסיד כסף בשמנו. נזק מוניטין חמור. מספיק מקרה אחד ויראלי להרוס את המוצר.",
    mitigation: [
      "תמיד הצג טווח: 'נקה בין יום X ל-Y' לא תאריך מדויק",
      "Disclaimer: 'AI ממליץ, החלטה שלך' — הוצאת אחריות",
      "A/B: השווה תחזית AI vs. ניקוי ידני ← בנה אמון בהדרגה",
    ],
    mitigationScore: 70,
    color: P.red,
  },
  {
    id: "R4",
    category: "פיננסי",
    title: "Cash Burn לפני הגעה ל-PMF",
    severity: 80,
    probability: 55,
    impact: "קריטי",
    detail: "6 עובדים + 2 רובוטים = ₪130K/חודש Burn. אם PMF לוקח 12 חודש לא 6 — נגמר הכסף. רוב Seed Stage נכשלות כאן.",
    mitigation: [
      "Keep it lean: 3 עובדים בלבד עד MRR ₪30K מוכח",
      "Revenue First: גבה ₪5K מ-Pilot גם חינמי (LOI)",
      "Default Alive חישוב: עד מתי יש כסף? כתוב על הלוח",
    ],
    mitigationScore: 65,
    color: P.red,
  },
  {
    id: "R5",
    category: "רגולציה",
    title: "רישוי דרונים (CAA) עוצר שירות",
    severity: 55,
    probability: 35,
    impact: "בינוני",
    detail: "DJI T50 קיבל אישור ב-2025 אבל CAA ישראל יכולה לשנות כללים. כל אירוע תאונה תעופתית = freeze רגולטורי.",
    mitigation: [
      "גיבוי: רובוט קרקעי (AT 4.1) ← לא תלוי ב-CAA",
      "שמור קשרים: עו\"ד מתמחה ב-UAS regulation",
      "Geofencing: תעוף רק מחוץ לאזורים מוגבלים",
    ],
    mitigationScore: 75,
    color: P.blue,
  },
  {
    id: "R6",
    category: "טכנולוגי",
    title: "IoT Sensors מתקלקלים בשדה",
    severity: 50,
    probability: 60,
    impact: "בינוני",
    detail: "חיישנים בחוץ ב-45°C + אבק + לחות = תוחלת חיים 8-14 חודש. תחזוקה שוטפת יקרה ולא מדרגית.",
    mitigation: [
      "API First: השתמש ב-SolarEdge / SMA API הקיים",
      "רק 1 חיישן אירדיאנס לאתר (לא לכל פאנל)",
      "Cloud-based inference: minimize edge hardware",
    ],
    mitigationScore: 72,
    color: P.amber,
  },
];

const SUCCESSES = [
  {
    id: "S1",
    category: "שוק",
    title: "נישה ריקה — First Mover ב-All-in-One",
    strength: 95,
    detail: "אין בישראל חברה אחת שמשלבת ניקוי רובוטי + ניטור AI + SaaS B2C. חלון 12–18 חודשים לפני שחקן גדול יגיע.",
    evidence: "מחקר שוק: 0 מתחרים ישירים בשוק ה-All-in-One ישראלי",
    upside: "First Mover = Brand recognition + Data moat",
    color: P.green,
  },
  {
    id: "S2",
    category: "כלכלי",
    title: "ROI מוכח ומדיד — ₪ בחשבון",
    strength: 90,
    detail: "לקוח מוסדי מפסיד ₪18K–₪85K/חודש מאבק. שנה 1 = ₪220K–₪1M הפסד. שירות ₪5K/חודש = ROI x10. קל למכור.",
    evidence: "Google הפסידה 32% תפוקה בחווה של 1.6MW",
    upside: "Self-selling product — הנתונים מדברים בעד עצמם",
    color: P.green,
  },
  {
    id: "S3",
    category: "רגולציה",
    title: "גל חקיקה ירוקה דוחף לשוק",
    strength: 82,
    detail: "חוק חובת פאנלים בבנייה חדשה 2026 + יעד 30% סולארי 2030 = גל של מערכות חדשות שדורשות O&M.",
    evidence: "כנסת ישראל: תיקון לחוק התכנון 2025",
    upside: "גידול שוק אוטומטי ← הלקוחות באים אלינו",
    color: P.green,
  },
  {
    id: "S4",
    category: "מוצר",
    title: "Claude AI: זמן פיתוח x10 מהיר מתחרים",
    strength: 88,
    detail: "AI Engine + דוח עברי + ניתוח IV Curve ב-Claude API = מוצר שלוקח 3 חודשים לבנות vs. 18 חודש לצוות מסורתי.",
    evidence: "MVP הוכח — פעיל עכשיו. זמן לשוק: 90 יום",
    upside: "Speed moat: לתחרות ייקח 12+ חודשים לבנות דומה",
    color: P.green,
  },
  {
    id: "S5",
    category: "לקוחות",
    title: "לקוחות כבר קיימים וניתנים לאיתור",
    strength: 85,
    detail: "רשות החשמל: רשימה ציבורית של כל חוות סולאריות בישראל. תיבה של 850 אתרים מוסדיים + 380K ביתיים — מיועדים לגישה.",
    evidence: "iec.org.il + solarblog.co.il = רשימות ציבוריות",
    upside: "Outbound מדויק ← לא צריך לבנות demand, הוא קיים",
    color: P.blue,
  },
  {
    id: "S6",
    category: "פיננסי",
    title: "מענקי מדינה מממנים 30–40% CapEx",
    strength: 78,
    detail: "רשות החדשנות: ₪200K ← ביטוח לאומי: ₪100K ← משרד הכלכלה: ₪150K. סך ₪450K ללא ערבות אישית.",
    evidence: "מסלולים פתוחים ל-2026 — מאומת",
    upside: "Risk-free capital ← מחסום כניסה נמוך מהצפוי",
    color: P.blue,
  },
];

const GTM_PHASES = [
  {
    phase: "חודשים 0–3",
    title: "בניית אמון ראשוני",
    budget: "₪12,000",
    icon: "🌱",
    color: P.green,
    actions: [
      {
        channel: "LinkedIn B2B",
        tactic: "פרופיל מייסד + 3 פוסטים/שבוע על נתוני אבק ישראלי",
        kpi: "500 followers, 5 leads",
        cost: "₪0 (זמן)",
        priority: "גבוה",
      },
      {
        channel: "WhatsApp Groups",
        tactic: "כניסה לקבוצות: מנהלי O&M, אגרונומים, קיבוצים אנרגיה",
        kpi: "3 קשרים → Pilot",
        cost: "₪0",
        priority: "גבוה",
      },
      {
        channel: "Landing Page",
        tactic: "דף נחיתה עם ROI Calculator חי — שולח לידים ל-WhatsApp",
        kpi: "CV > 4%",
        cost: "₪3,000",
        priority: "גבוה",
      },
      {
        channel: "כנס אנרגיה ישראל",
        tactic: "עמדה קטנה עם Demo חי של Dashboard ← LOI במקום",
        kpi: "10 כרטיסי ביקור → 3 פגישות",
        cost: "₪5,000",
        priority: "בינוני",
      },
      {
        channel: "אגודת הקיבוצים",
        tactic: "פנה ישירות לרכזי אנרגיה — שלח ניתוח ROI מותאם אישית",
        kpi: "2 Pilots ראשונים",
        cost: "₪4,000 (נסיעות)",
        priority: "גבוה",
      },
    ],
  },
  {
    phase: "חודשים 3–9",
    title: "הוכחת ערך + Scale",
    budget: "₪45,000",
    icon: "📈",
    color: P.amber,
    actions: [
      {
        channel: "Case Study Video",
        tactic: "סרטון 90 שניות: לקוח מדבר על ₪XX,XXX שנחסכו ← מופץ לכל הרשת",
        kpi: "100K צפיות, 50 leads",
        cost: "₪8,000",
        priority: "קריטי",
      },
      {
        channel: "Google Ads – Solar",
        tactic: '"ניקוי פאנלים ישראל" + "מוניטור סולארי" — Intent-based targeting',
        kpi: "CAC < ₪800 B2C",
        cost: "₪15,000/חודש",
        priority: "גבוה",
      },
      {
        channel: "SEO Content",
        tactic: "10 מאמרים: 'כמה הפסדתי מאבק על פאנלים' — Hebrew long-tail",
        kpi: "500 organic/חודש",
        cost: "₪5,000",
        priority: "בינוני",
      },
      {
        channel: "שיתוף מתקיני פאנלים",
        tactic: "הצע ל-10 חברות התקנה: Referral 15% מהמנוי הראשון",
        kpi: "5 שיתופי פעולה",
        cost: "₪0 (Commission)",
        priority: "גבוה",
      },
      {
        channel: "B2B Email Outreach",
        tactic: "רשימה: 850 אתרים רשות החשמל → Personalized ROI email",
        kpi: "Reply rate > 8%",
        cost: "₪2,000",
        priority: "גבוה",
      },
    ],
  },
  {
    phase: "חודשים 9–18",
    title: "אופטימיזציה + Referral Engine",
    budget: "₪80,000",
    icon: "🚀",
    color: P.blue,
    actions: [
      {
        channel: "Referral Program",
        tactic: "לקוח מביא לקוח: חודש חינם לשניהם. מודל Dropbox לאנרגיה.",
        kpi: "K-factor > 0.4",
        cost: "₪חינם (מנויים)",
        priority: "קריטי",
      },
      {
        channel: "Insurance Partnership",
        tactic: "שיתוף עם ביטוח הראל/כלל: ניטור SolarPulse = הנחה בפוליסה",
        kpi: "1 הסכם → 500 לקוחות",
        cost: "₪20,000 (מו\"מ)",
        priority: "גבוה",
      },
      {
        channel: "PR Tech Media",
        tactic: 'הודעה לעיתונות: "Startup ישראלי חוסך מיליונים בחוות סולאריות" — Globes, CTech',
        kpi: "3 כתבות גדולות",
        cost: "₪12,000 (יח\"צ)",
        priority: "בינוני",
      },
      {
        channel: "אינטגרציה SolarEdge",
        tactic: "הכנס ל-SolarEdge Marketplace ← גישה ל-200K לקוחות ישראלים",
        kpi: "Listed Q3/2027",
        cost: "₪0 (פיתוח API)",
        priority: "קריטי",
      },
      {
        channel: "B2B Enterprise Sales",
        tactic: "3 עסקאות Energix / EC Power / Doral ← Pilot → חוזה 5 שנים",
        kpi: "ARR +₪1.5M",
        cost: "₪30,000 (Sales)",
        priority: "קריטי",
      },
    ],
  },
];

const ICP = [
  {
    name: "מנהל O&M קיבוצי",
    icon: "🏕️",
    size: "~200 יעד",
    pain: "מפסיד ₪80K+/שנה ולא יודע",
    channel: "WhatsApp + כנסים",
    message: "תמדוד כמה הפסדת — ואנחנו נעצור את זה",
    cac: "₪3,200",
    ltv: "₪180,000",
    ratio: "56×",
    color: P.green,
  },
  {
    name: "בעל גג פרטי (200kW+)",
    icon: "🏭",
    size: "~15,000 יעד",
    pain: "לא יודע כמה הפאנלים מייצרים",
    channel: "Google Ads + App Store",
    message: "רואה בזמן אמת — יודע מתי לנקות",
    cac: "₪420",
    ltv: "₪10,800",
    ratio: "25×",
    color: P.blue,
  },
  {
    name: "EPC / חברת התקנה",
    icon: "🔧",
    size: "~80 חברות",
    pain: "לקוחות מתלוננים על ביצועים",
    channel: "LinkedIn + Referral",
    message: "תציע O&M חכם ← הכנסה חוזרת על כל לקוח",
    cac: "₪0 (Referral)",
    ltv: "₪500,000+ (Channel)",
    ratio: "∞",
    color: P.amber,
  },
  {
    name: "קרן נדל\"ן / Energy Developer",
    icon: "🏗️",
    size: "~30 קרנות",
    pain: "PPA obligations — חייב לעמוד בתפוקה",
    channel: "CFO Direct + VC Network",
    message: "SLA מוכח — אל תסכן את ה-PPA שלך",
    cac: "₪18,000",
    ltv: "₪2,400,000",
    ratio: "133×",
    color: P.purple,
  },
];

const SWOT_DATA = {
  strengths: [
    "First mover — אין מתחרה ישיר All-in-One",
    "Claude AI = TTM מהיר פי 10",
    "ROI מוכח, מדיד, בשקלים",
    "מענקי מדינה מכסים 40%+ CapEx",
    "SolarEdge API ← גישה ל-200K משתמשים",
  ],
  weaknesses: [
    "צוות קטן — לא מספיק להכל",
    "0 לקוחות עדיין — אין Social Proof",
    "AI accuracy טרם הוכחה בשטח",
    "תלות ב-HW (רובוטים) = עלות גבוהה",
    "אין Brand Awareness בשוק",
  ],
  opportunities: [
    "חוק חובת פאנלים 2026 = שוק חדש",
    "שוק הודו — פי 5 מישראל, דלת פתוחה",
    "SolarEdge Marketplace Listing",
    "Referral Partnerships עם 80 EPC",
    "ESG Reporting ← ביקוש גובר",
  ],
  threats: [
    "ECO-OPS / Airtouch נכנסת ל-B2C",
    "DJI / חברה סינית מוכרת SaaS זול",
    "CAA מגביל דרונים — שיבוש שירות",
    "Burn rate: נגמר כסף לפני PMF",
    "לקוח גדול מבקש White-Label",
  ],
};

/* ─── COMPONENTS ──────────────────────────────────────── */

function ThreatDial({ value, color, size = 52 }) {
  const r = size * 0.38;
  const cx = size / 2, cy = size / 2 + 4;
  const start = -200, range = 220;
  const angle = start + (value / 100) * range;
  const toR = d => (d * Math.PI) / 180;
  const nx = cx + (r - 4) * Math.cos(toR(angle));
  const ny = cy + (r - 4) * Math.sin(toR(angle));
  const arcEnd = start + range;
  const x1t = cx + r * Math.cos(toR(start)), y1t = cy + r * Math.sin(toR(start));
  const x2t = cx + r * Math.cos(toR(arcEnd)), y2t = cy + r * Math.sin(toR(arcEnd));
  const xa = cx + r * Math.cos(toR(angle)), ya = cy + r * Math.sin(toR(angle));
  const la = range > 180 ? 1 : 0;
  const la2 = angle - start > 180 ? 1 : 0;
  return (
    <svg width={size} height={size * 0.8} style={{ overflow: "visible" }}>
      <path d={`M${x1t} ${y1t} A${r} ${r} 0 ${la} 1 ${x2t} ${y2t}`}
        fill="none" stroke="#2a2a2a" strokeWidth={7} strokeLinecap="round" />
      <path d={`M${x1t} ${y1t} A${r} ${r} 0 ${la2} 1 ${xa} ${ya}`}
        fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 4px ${color}80)` }} />
      <line x1={cx} y1={cy} x2={nx} y2={ny}
        stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={3} fill={color} />
      <text x={cx} y={cy + 16} textAnchor="middle"
        fill={color} fontSize={11} fontWeight="700"
        fontFamily="'IBM Plex Mono', monospace">{value}</text>
    </svg>
  );
}

function Tag({ text, color = P.dim }) {
  return (
    <span style={{
      background: color + "18", color, border: `1px solid ${color}30`,
      borderRadius: 3, padding: "1px 7px", fontSize: 10,
      fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700,
      letterSpacing: 0.5, display: "inline-block",
    }}>{text}</span>
  );
}

function Card({ children, style = {}, accent }) {
  return (
    <div style={{
      background: P.card, border: `1px solid ${P.border}`,
      borderRadius: 10, padding: 18,
      ...(accent ? { borderTop: `2px solid ${accent}` } : {}),
      ...style,
    }}>{children}</div>
  );
}

function SectionHead({ label, sub }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 10, color: P.amber, letterSpacing: 3,
        textTransform: "uppercase", marginBottom: 4,
      }}>{label}</div>
      {sub && <h2 style={{ fontFamily: "'Heebo', sans-serif", fontSize: 20, fontWeight: 800, color: P.head, margin: 0 }}>{sub}</h2>}
    </div>
  );
}

/* ─── MAIN ────────────────────────────────────────────── */

export default function App() {
  const [tab, setTab] = useState("risks");
  const [expandedRisk, setExpandedRisk] = useState(null);
  const [expandedSuccess, setExpandedSuccess] = useState(null);

  const TABS = [
    { id: "risks",      label: "⚠ סיכונים" },
    { id: "successes",  label: "✓ גורמי הצלחה" },
    { id: "swot",       label: "SWOT" },
    { id: "icp",        label: "פרופיל לקוח" },
    { id: "gtm",        label: "תוכנית שיווק" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: P.bg,
      color: P.text, fontFamily: "'Heebo', 'Assistant', sans-serif",
      direction: "rtl",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=Heebo:wght@300;400;500;700;800;900&display=swap');
        * { box-sizing: border-box; }
        button:hover { opacity: 0.85; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        .fade { animation: fadeUp .35s ease; }
      `}</style>

      {/* ── TOP BAR ──────────────────────────────────── */}
      <div style={{
        background: "#111", borderBottom: `1px solid ${P.amber}22`,
        padding: "0 24px", display: "flex", alignItems: "center",
        height: 54, gap: 20,
      }}>
        {/* Logo */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 14, fontWeight: 700, color: P.amber, lineHeight: 1 }}>
            ☀ SolarPulse
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: P.dim, letterSpacing: 2 }}>
            RISK & GTM INTELLIGENCE
          </div>
        </div>

        {/* Tabs */}
        <nav style={{ display: "flex", gap: 2, marginRight: "auto", flexWrap: "wrap" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "6px 16px", border: "none", cursor: "pointer",
              background: tab === t.id ? P.amber + "18" : "transparent",
              color: tab === t.id ? P.amber : P.dim,
              borderBottom: `2px solid ${tab === t.id ? P.amber : "transparent"}`,
              fontFamily: "'Heebo', sans-serif", fontSize: 13,
              fontWeight: tab === t.id ? 700 : 400, whiteSpace: "nowrap",
              transition: "all .12s",
            }}>{t.label}</button>
          ))}
        </nav>

        {/* Status */}
        <div style={{
          fontFamily: "'IBM Plex Mono',monospace", fontSize: 10,
          color: P.dim, display: "flex", gap: 8, alignItems: "center",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: P.amber }} />
          CLASSIFIED · FOUNDERS ONLY
        </div>
      </div>

      {/* ── HERO STRIP ───────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #111 0%, #1a1208 100%)",
        borderBottom: `1px solid ${P.border}`, padding: "28px 24px 20px",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: P.amber, letterSpacing: 3, marginBottom: 8 }}>
            RISK & MARKETING INTELLIGENCE REPORT · ISRAEL 2026
          </div>
          <h1 style={{ fontFamily: "'Heebo',sans-serif", fontSize: 28, fontWeight: 900, color: P.head, margin: "0 0 6px" }}>
            ניתוח מלא: סיכונים, הצלחות ותוכנית שיווק
          </h1>
          <p style={{ color: P.dim, fontSize: 14, margin: 0 }}>
            SolarPulse · AI Solar O&M Platform · מבוסס על מחקר שוק ישראל 2022–2026
          </p>

          {/* Top KPIs */}
          <div style={{ display: "flex", gap: 14, marginTop: 20, flexWrap: "wrap" }}>
            {[
              { l: "סיכונים קריטיים", v: RISKS.filter(r => r.severity >= 80).length, c: P.red },
              { l: "סיכונים מנוהלים", v: RISKS.filter(r => r.severity < 80).length, c: P.amber },
              { l: "גורמי הצלחה מרכזיים", v: SUCCESSES.length, c: P.green },
              { l: "תקציב GTM שנה 1", v: "₪137K", c: P.blue },
              { l: "LTV:CAC ממוצע", v: "55×", c: P.amber },
            ].map(k => (
              <div key={k.l} style={{
                background: "#1a1a1a", border: `1px solid ${k.c}20`,
                borderRadius: 8, padding: "10px 16px", minWidth: 100,
              }}>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 20, color: k.c, fontWeight: 700 }}>{k.v}</div>
                <div style={{ fontSize: 10, color: P.dim, marginTop: 2 }}>{k.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 72px" }}>

        {/* ══ RISKS ══════════════════════════════════ */}
        {tab === "risks" && (
          <div className="fade">
            <SectionHead label="RISK MATRIX" sub="מה יכול להרוג את המוצר — ואיך מתמודדים" />

            {/* Risk legend */}
            <div style={{ display: "flex", gap: 16, marginBottom: 20, fontSize: 11, color: P.dim, alignItems: "center" }}>
              {[{ l: "קריטי (80+)", c: P.red }, { l: "גבוה (60–79)", c: P.amber }, { l: "בינוני (<60)", c: P.blue }].map(i => (
                <div key={i.l} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: i.c }} />
                  {i.l}
                </div>
              ))}
              <span style={{ marginRight: "auto" }}>לחץ על סיכון לפירוט ותוכנית הפחתה</span>
            </div>

            {RISKS.map((risk, i) => {
              const open = expandedRisk === risk.id;
              return (
                <div key={risk.id} style={{
                  background: P.card, borderRadius: 10, marginBottom: 10,
                  border: `1px solid ${open ? risk.color + "40" : P.border}`,
                  overflow: "hidden", transition: "border .2s",
                }}>
                  <div
                    onClick={() => setExpandedRisk(open ? null : risk.id)}
                    style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", cursor: "pointer" }}
                  >
                    {/* Dial */}
                    <div style={{ flexShrink: 0 }}>
                      <ThreatDial value={risk.severity} color={risk.color} size={52} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: P.dim }}>{risk.id}</span>
                        <Tag text={risk.category} color={risk.color} />
                        <Tag text={`הסתברות ${risk.probability}%`} color={P.dim} />
                        <Tag text={`השפעה: ${risk.impact}`} color={risk.color} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: P.head }}>{risk.title}</div>
                    </div>

                    {/* Severity bar */}
                    <div style={{ width: 140, flexShrink: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: P.dim, marginBottom: 4 }}>
                        <span>חומרה</span>
                        <span style={{ color: risk.color, fontFamily: "'IBM Plex Mono',monospace" }}>{risk.severity}/100</span>
                      </div>
                      <div style={{ height: 4, background: "#2a2a2a", borderRadius: 2 }}>
                        <div style={{ width: `${risk.severity}%`, height: "100%", background: risk.color, borderRadius: 2 }} />
                      </div>
                    </div>

                    <div style={{ color: P.dim, fontSize: 16 }}>{open ? "▲" : "▼"}</div>
                  </div>

                  {open && (
                    <div style={{ borderTop: `1px solid ${P.border}`, padding: "16px 18px", background: "#191919" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: P.dim, marginBottom: 8, letterSpacing: 1 }}>THREAT ANALYSIS</div>
                          <p style={{ fontSize: 13, lineHeight: 1.8, color: P.text }}>{risk.detail}</p>
                        </div>
                        <div>
                          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: P.green, marginBottom: 8, letterSpacing: 1 }}>MITIGATION PLAN</div>
                          {risk.mitigation.map((m, j) => (
                            <div key={j} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13, color: P.text }}>
                              <span style={{ color: P.green, flexShrink: 0 }}>✓</span>{m}
                            </div>
                          ))}
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontSize: 10, color: P.dim, marginBottom: 4 }}>יעילות הפחתה</div>
                            <div style={{ height: 4, background: "#2a2a2a", borderRadius: 2 }}>
                              <div style={{ width: `${risk.mitigationScore}%`, height: "100%", background: P.green, borderRadius: 2 }} />
                            </div>
                            <div style={{ fontSize: 10, color: P.green, marginTop: 3, fontFamily: "'IBM Plex Mono',monospace" }}>
                              {risk.mitigationScore}% risk reduction achievable
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Risk summary */}
            <Card accent={P.red} style={{ marginTop: 20 }}>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: P.amber, letterSpacing: 2, marginBottom: 12 }}>
                RISK VERDICT
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                {[
                  { t: "הסיכון הכי גדול שלך", d: "Cash Burn לפני PMF. פתרון: 3 עובדים עד ₪30K MRR מוכח. לא יותר.", c: P.red },
                  { t: "הסיכון הכי מוערך בחסר", d: "דיוק AI. לקוח אחד שלא ניקה בזמן ועמד בהפסד — מספיק להרוס עסקאות.", c: P.amber },
                  { t: "הסיכון שניתן להפוך להזדמנות", d: "ECO-OPS / Airtouch כמתחרה — גש כ-OEM Partner, לא כמתחרה. White-Label.", c: P.green },
                ].map(v => (
                  <div key={v.t} style={{ padding: 14, background: v.c + "0d", border: `1px solid ${v.c}25`, borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, color: v.c, marginBottom: 8, fontSize: 13 }}>{v.t}</div>
                    <div style={{ fontSize: 12, color: P.text, lineHeight: 1.7 }}>{v.d}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ══ SUCCESSES ══════════════════════════════ */}
        {tab === "successes" && (
          <div className="fade">
            <SectionHead label="SUCCESS FACTORS" sub="מה עובד לטובתנו — ואיך להנפיק ממנו" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              {SUCCESSES.map((s, i) => {
                const open = expandedSuccess === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setExpandedSuccess(open ? null : s.id)}
                    style={{
                      background: P.card, borderRadius: 10, padding: 18, cursor: "pointer",
                      border: `1px solid ${open ? s.color + "50" : P.border}`,
                      boxShadow: open ? `0 0 20px ${s.color}12` : "none",
                      transition: "all .2s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div>
                        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                          <Tag text={s.id} color={s.color} />
                          <Tag text={s.category} color={P.dim} />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: P.head, lineHeight: 1.3 }}>{s.title}</div>
                      </div>
                      <div style={{ textAlign: "center", flexShrink: 0, marginRight: 8 }}>
                        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, color: s.color, fontWeight: 700 }}>{s.strength}</div>
                        <div style={{ fontSize: 9, color: P.dim }}>STRENGTH</div>
                      </div>
                    </div>

                    {/* Strength bar */}
                    <div style={{ height: 3, background: "#2a2a2a", borderRadius: 2, marginBottom: 10 }}>
                      <div style={{ width: `${s.strength}%`, height: "100%", background: s.color, borderRadius: 2 }} />
                    </div>

                    {open && (
                      <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 14, marginTop: 4 }}>
                        <p style={{ fontSize: 13, lineHeight: 1.8, color: P.text, marginBottom: 12 }}>{s.detail}</p>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <div style={{ flex: 1, background: P.green + "0d", border: `1px solid ${P.green}20`, borderRadius: 8, padding: "10px 12px" }}>
                            <div style={{ fontSize: 10, color: P.green, fontFamily: "'IBM Plex Mono',monospace", marginBottom: 4 }}>EVIDENCE</div>
                            <div style={{ fontSize: 12, color: P.text }}>{s.evidence}</div>
                          </div>
                          <div style={{ flex: 1, background: s.color + "0d", border: `1px solid ${s.color}20`, borderRadius: 8, padding: "10px 12px" }}>
                            <div style={{ fontSize: 10, color: s.color, fontFamily: "'IBM Plex Mono',monospace", marginBottom: 4 }}>UPSIDE</div>
                            <div style={{ fontSize: 12, color: P.text }}>{s.upside}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Success verdict */}
            <Card accent={P.green}>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: P.green, letterSpacing: 2, marginBottom: 12 }}>SUCCESS VERDICT</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                {[
                  { t: "הנשק הכי חזק שלך", d: "ROI מדיד ומיידי. ₪18K–₪85K/חודש אובדים לכל לקוח מוסדי — זה לא pitch, זה מתמטיקה.", c: P.green },
                  { t: "היתרון שהם לא יכולים להעתיק", d: "נתוני Soiling ישראל — כל אתר שאתה מנטר = יותר דיוק. Data Moat שגדל כל חודש.", c: P.blue },
                  { t: "המהלך שיואץ הכל", d: "SolarEdge Marketplace Listing — גישה ל-200K מערכות בלחיצה אחת. זה ה-Distribution.", c: P.amber },
                ].map(v => (
                  <div key={v.t} style={{ padding: 14, background: v.c + "0d", border: `1px solid ${v.c}25`, borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, color: v.c, marginBottom: 8, fontSize: 13 }}>{v.t}</div>
                    <div style={{ fontSize: 12, color: P.text, lineHeight: 1.7 }}>{v.d}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ══ SWOT ════════════════════════════════════ */}
        {tab === "swot" && (
          <div className="fade">
            <SectionHead label="SWOT ANALYSIS" sub="תמונה מלאה — חוזקות, חולשות, הזדמנויות, איומים" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { title: "💪 Strengths — חוזקות", items: SWOT_DATA.strengths, color: P.green },
                { title: "⚠ Weaknesses — חולשות", items: SWOT_DATA.weaknesses, color: P.red },
                { title: "🚀 Opportunities — הזדמנויות", items: SWOT_DATA.opportunities, color: P.blue },
                { title: "⚡ Threats — איומים", items: SWOT_DATA.threats, color: P.amber },
              ].map(q => (
                <Card key={q.title} accent={q.color}>
                  <div style={{ fontWeight: 800, color: q.color, marginBottom: 14, fontSize: 14 }}>{q.title}</div>
                  {q.items.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: 10, fontSize: 13, color: P.text, alignItems: "flex-start" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: q.color, marginTop: 5, flexShrink: 0 }} />
                      <span style={{ lineHeight: 1.6 }}>{item}</span>
                    </div>
                  ))}
                </Card>
              ))}
            </div>

            {/* Strategic moves */}
            <Card style={{ marginTop: 16 }} accent={P.amber}>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: P.amber, letterSpacing: 2, marginBottom: 14 }}>
                STRATEGIC PRIORITIES FROM SWOT
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { t: "SO — הנפק חוזקה על הזדמנות", d: "First Mover + חוק 2026 = Launch בQ1 2026 לפני שהשוק מוצף. אל תחכה.", c: P.green },
                  { t: "WO — הכשל לתוך הזדמנות", d: "0 Brand? ← SolarEdge Marketplace Listing = Brand instant. עשה זאת ב-6 חודשים.", c: P.blue },
                  { t: "ST — הגן על חוזקה מפני איום", d: "Data Moat: כל חודש שעובר = יותר נתוני Soiling ← קשה יותר לתחרות להשיג.", c: P.amber },
                  { t: "WT — הפחת חולשה מול איום", d: "0 Social Proof + תחרות = Pilot חינמי ← Case Study ← Shield. עשה 3 Pilots תוך 90 יום.", c: P.red },
                ].map(s => (
                  <div key={s.t} style={{ padding: 14, background: s.c + "0a", border: `1px solid ${s.c}20`, borderRadius: 8 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: s.c, fontWeight: 700, marginBottom: 6 }}>{s.t}</div>
                    <div style={{ fontSize: 12, color: P.text, lineHeight: 1.7 }}>{s.d}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ══ ICP ════════════════════════════════════ */}
        {tab === "icp" && (
          <div className="fade">
            <SectionHead label="IDEAL CUSTOMER PROFILE" sub="מי הלקוח, מה הכאב, ומה ה-LTV:CAC" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              {ICP.map((c, i) => (
                <Card key={c.name} accent={c.color}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>{c.icon}</div>
                      <div style={{ fontWeight: 800, fontSize: 17, color: P.head }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: P.dim, marginTop: 2 }}>{c.size}</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 22, color: c.color, fontWeight: 700 }}>{c.ratio}</div>
                      <div style={{ fontSize: 9, color: P.dim }}>LTV:CAC</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                    {[
                      { l: "CAC", v: c.cac, col: P.red },
                      { l: "LTV", v: c.ltv, col: c.color },
                    ].map(k => (
                      <div key={k.l} style={{ background: "#1a1a1a", borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: P.dim, marginBottom: 3 }}>{k.l}</div>
                        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: k.col, fontWeight: 700 }}>{k.v}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: 13, marginBottom: 10 }}>
                    <span style={{ color: P.red }}>כאב: </span>
                    <span style={{ color: P.text }}>{c.pain}</span>
                  </div>
                  <div style={{ fontSize: 13, marginBottom: 10 }}>
                    <span style={{ color: c.color }}>ערוץ: </span>
                    <span style={{ color: P.text }}>{c.channel}</span>
                  </div>
                  <div style={{
                    padding: "10px 14px", background: c.color + "0d",
                    border: `1px solid ${c.color}25`, borderRadius: 8,
                    fontSize: 13, color: P.text, lineHeight: 1.5,
                  }}>
                    <span style={{ color: c.color }}>מסר: </span>"{c.message}"
                  </div>
                </Card>
              ))}
            </div>

            {/* Priority order */}
            <Card accent={P.amber}>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: P.amber, letterSpacing: 2, marginBottom: 14 }}>ACQUISITION ORDER</div>
              <div style={{ display: "flex", gap: 0, alignItems: "center", flexWrap: "wrap" }}>
                {[
                  { name: "EPC / מתקינים", note: "Referral 0-cost channel", c: P.amber },
                  { arrow: "→" },
                  { name: "קיבוצים O&M", note: "הכנסה מהירה + Case Study", c: P.green },
                  { arrow: "→" },
                  { name: "בעלי גגות B2C", note: "Scale ← App + Ads", c: P.blue },
                  { arrow: "→" },
                  { name: "Energy Developers", note: "ARR גדול + חוזים 5 שנה", c: P.purple },
                ].map((s, i) => (
                  s.arrow
                    ? <div key={i} style={{ fontSize: 20, color: P.dim, padding: "0 8px" }}>{s.arrow}</div>
                    : <div key={i} style={{ padding: "10px 16px", background: s.c + "12", border: `1px solid ${s.c}30`, borderRadius: 8, textAlign: "center", minWidth: 120 }}>
                        <div style={{ fontWeight: 700, color: s.c, fontSize: 13 }}>{s.name}</div>
                        <div style={{ fontSize: 10, color: P.dim, marginTop: 3 }}>{s.note}</div>
                      </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ══ GTM ════════════════════════════════════ */}
        {tab === "gtm" && (
          <div className="fade">
            <SectionHead label="GO-TO-MARKET PLAYBOOK" sub="תוכנית שיווק שלב-שלב | תקציב | KPIs" />

            {GTM_PHASES.map((phase, pi) => (
              <div key={pi} style={{ marginBottom: 24 }}>
                {/* Phase header */}
                <div style={{
                  display: "flex", gap: 14, alignItems: "center",
                  padding: "12px 18px",
                  background: phase.color + "12",
                  border: `1px solid ${phase.color}30`, borderRadius: 10,
                  marginBottom: 10,
                }}>
                  <span style={{ fontSize: 24 }}>{phase.icon}</span>
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: phase.color, letterSpacing: 1 }}>{phase.phase}</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: P.head }}>{phase.title}</div>
                  </div>
                  <div style={{ marginRight: "auto" }}>
                    <Tag text={`תקציב: ${phase.budget}`} color={phase.color} />
                  </div>
                </div>

                {/* Actions */}
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr>
                        {["ערוץ", "טקטיקה", "KPI יעד", "עלות", "עדיפות"].map(h => (
                          <th key={h} style={{
                            padding: "8px 12px", textAlign: "right",
                            fontFamily: "'IBM Plex Mono',monospace", fontSize: 9,
                            color: P.dim, letterSpacing: 1, fontWeight: 400,
                            borderBottom: `1px solid ${P.border}`,
                          }}>{h.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {phase.actions.map((a, ai) => (
                        <tr key={ai} style={{ background: ai % 2 === 0 ? "#191919" : "transparent" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: phase.color, borderBottom: `1px solid ${P.border}`, whiteSpace: "nowrap" }}>
                            {a.channel}
                          </td>
                          <td style={{ padding: "10px 12px", color: P.text, borderBottom: `1px solid ${P.border}`, lineHeight: 1.5 }}>
                            {a.tactic}
                          </td>
                          <td style={{ padding: "10px 12px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: P.amber, borderBottom: `1px solid ${P.border}`, whiteSpace: "nowrap" }}>
                            {a.kpi}
                          </td>
                          <td style={{ padding: "10px 12px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: P.green, borderBottom: `1px solid ${P.border}`, whiteSpace: "nowrap" }}>
                            {a.cost}
                          </td>
                          <td style={{ padding: "10px 12px", borderBottom: `1px solid ${P.border}` }}>
                            <Tag
                              text={a.priority}
                              color={a.priority === "קריטי" ? P.red : a.priority === "גבוה" ? P.amber : P.dim}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* First 90-day sprint */}
            <Card accent={P.red}>
              <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: P.red, letterSpacing: 2, marginBottom: 16 }}>
                🔴 SPRINT 90 — THE FIRST THREE MONTHS, WEEK BY WEEK
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                {[
                  { w: "שבוע 1–2", items: ["הקמת חברה + Landing Page", "LinkedIn Profile + 3 פוסטים", "גיבוש רשימת 50 לקוחות"], c: P.red },
                  { w: "שבוע 3–4", items: ["Outreach: 50 אנשי קשר", "כנס אנרגיה — Demo", "LOI ראשון ← Pilot Agreement"], c: P.amber },
                  { w: "שבוע 5–8", items: ["Pilot A: קיבוץ + Dashboard", "Pilot B: גג מסחרי + ROI", "Case Study ראשוני"], c: P.blue },
                  { w: "שבוע 9–12", items: ["MRR ₪15K+ מוכח", "הגשת מענק רשות החדשנות", "Deck Seed ← OurCrowd"], c: P.green },
                ].map(s => (
                  <div key={s.w} style={{ background: s.c + "0a", border: `1px solid ${s.c}20`, borderRadius: 8, padding: 12 }}>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: s.c, fontWeight: 700, marginBottom: 10 }}>{s.w}</div>
                    {s.items.map((item, i) => (
                      <div key={i} style={{ display: "flex", gap: 6, marginBottom: 7, fontSize: 12, color: P.text }}>
                        <span style={{ color: s.c, flexShrink: 0 }}>›</span>{item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* The one metric */}
              <div style={{ marginTop: 16, padding: "14px 18px", background: "#1a0d0d", border: `1px solid ${P.red}30`, borderRadius: 8, display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 36, color: P.red, fontWeight: 700, flexShrink: 0 }}>!</div>
                <div>
                  <div style={{ fontWeight: 700, color: P.head, marginBottom: 4 }}>המדד היחידי שחשוב ב-90 יום הראשונים</div>
                  <div style={{ fontSize: 13, color: P.text, lineHeight: 1.7 }}>
                    לקוח שילם כסף אמיתי (לא Pilot חינמי) ← חוזר לחודש שני ← מרוצה מספיק להמליץ.
                    שלושה כאלה ← יש Product-Market Fit. אפס כאלה ← שנה כיוון לפני שמגייסים.
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${P.border}`, padding: "12px 24px", display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: P.dim }}>SolarPulse™ · Risk & GTM Intelligence · 2026</span>
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: P.dim }}>For Founders · Confidential</span>
      </div>
    </div>
  );
}
