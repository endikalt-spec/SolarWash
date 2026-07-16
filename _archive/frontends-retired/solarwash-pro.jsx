import { useState, useRef, useEffect, createContext, useContext } from "react";
import {
  LayoutDashboard, Droplets, Calendar, BarChart3, Bot,
  Plus, Sun, AlertTriangle, CheckCircle, Clock, TrendingUp,
  TrendingDown, X, Trash2, Zap, Wind, Send, RefreshCw,
  Grid, Activity, Wifi
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

// ─── PRODUCTION NOTE ──────────────────────────────────────────────────────────
// In the artifact sandbox the API key is injected automatically.
// For a SHIPPED app (App Store / Google Play) point API_BASE at YOUR backend
// proxy (see server-proxy.js + DEPLOY.md). NEVER ship the API key in the client.
const API_BASE = "https://api.anthropic.com/v1/messages";

// ─── THEME ──────────────────────────────────────────────────────────────────
const T = {
  bg:"#06080E", card:"#0C1422", cardBorder:"#182138",
  accent:"#F59E0B", green:"#10B981", red:"#EF4444",
  blue:"#3B82F6", purple:"#8B5CF6",
  textPrimary:"#F1F5F9", textSecondary:"#64748B", textMuted:"#2D3E58",
};

// ─── LOCALES ──────────────────────────────────────────────────────────────────
const LOCALES = {
  ru: { code:"ru-RU", dir:"ltr", label:"RU" },
  en: { code:"en-US", dir:"ltr", label:"EN" },
  he: { code:"he-IL", dir:"rtl", label:"עב" },
};

const DAY_KEYS = ["mon","tue","wed","thu","fri","sat","sun"];
const DAY_ORDER = {
  ru:["mon","tue","wed","thu","fri","sat","sun"],
  en:["mon","tue","wed","thu","fri","sat","sun"],
  he:["sun","mon","tue","wed","thu","fri","sat"],
};

const I18N = {
  ru:{
    "nav.dashboard":"Обзор","nav.zones":"Зоны","nav.schedule":"Расписание",
    "nav.analytics":"Аналитика","nav.ai":"AI-ассистент","brand.pro":"PRO",
    "status.online":"Онлайн","status.clean":"Чистые","status.dirty":"Требует мойки","status.critical":"Критично",
    "common.panelsCount":"{n} панелей","common.zonesCount":"{n} зон",
    "common.zonesPanels":"{z} зон · {p} панелей","common.kwInstalled":"{cap} кВт установлено",
    "dash.title":"Панель управления","dash.installed":"{cap} кВт установленной мощности",
    "dash.criticalAlert":"Критично: {zones} — эффективность ниже 65%","dash.washAllCritical":"Помыть все критичные",
    "dash.avgEffLabel":"СРЕДНЯЯ ЭФФЕКТИВНОСТЬ","dash.byAllZones":"по всем зонам",
    "dash.needsWashLabel":"ТРЕБУЮТ МОЙКИ","dash.allClean":"Все чистые",
    "dash.nextWashLabel":"СЛЕДУЮЩАЯ МОЙКА","dash.noSchedule":"Нет расписания",
    "dash.dustRiskLabel":"РИСК ПЫЛИ","dash.windRain":"Ветер {wind} м/с · дождь через {days} дн",
    "dash.zoneStatusTitle":"СОСТОЯНИЕ ЗОН","dash.lastWash":"Мойка: {date}",
    "dash.washBtn":"Помыть","dash.systemEffTitle":"СИСТЕМНАЯ ЭФФЕКТИВНОСТЬ",
    "dash.normal":"✓ Система в норме","dash.recommendWash":"⚠ Рекомендована мойка","dash.criticalDirt":"✗ Критическое загрязнение",
    "dash.lossPerDay":"Потеря: ~{n} кВт·ч/день","dash.weatherTitle":"ПОГОДА СЕЙЧАС",
    "ring.system":"СИСТЕМА",
    "weather.temp":"Температура","weather.humidity":"Влажность","weather.wind":"Ветер",
    "weather.dustRisk":"Риск пыли","weather.nextRain":"Ближайший дождь","weather.inDays":"через {n} дн",
    "dust.medium":"Средний","units.ms":"м/с","units.kwh":"кВт·ч","units.liters":"л","units.days":"дн","units.min":"мин",
    "zones.title":"Зоны панелей","zones.addZone":"Добавить зону",
    "zones.mPanels":"панелей","zones.mTilt":"наклон","zones.mKw":"кВт",
    "zones.efficiency":"Эффективность","zones.lastWash":"Последняя мойка: {date}",
    "zones.washNow":"Помыть сейчас","zones.scheduledWash":"Плановая мойка","zones.washing":"Идёт мойка...",
    "zones.never":"Никогда","zones.justNow":"Только что",
    "zones.newZone":"Новая зона","zones.addArrayDesc":"Добавьте массив солнечных панелей","zones.addBtn":"Добавить зону",
    "form.zoneName":"Название зоны","form.panelCount":"Количество панелей","form.tiltAngle":"Угол наклона (°)","form.power":"Мощность (кВт)",
    "form.namePh":"Массив D — Север",
    "sched.title":"Расписание","sched.subtitle":"Умная защита пиковых часов выработки (09:00–17:00)",
    "sched.smartTitle":"УМНЫЕ НАСТРОЙКИ",
    "sched.peakProtect":"Защита пиковых часов","sched.peakProtectDesc":"Блокировать мойку с 09:00 до 17:00",
    "sched.weatherDelay":"Отсрочка при дожде","sched.weatherDelayDesc":"Перенести мойку если прогноз дождь",
    "sched.dustAlert":"Алерт при пыльной буре","sched.dustAlertDesc":"Push-уведомление и авто-запуск мойки",
    "sched.durationPanels":"{d} мин · {p} панелей",
    "an.title":"Аналитика","an.subtitle":"Эффективность · Расход воды · ROI мойки панелей",
    "an.lossDirtLabel":"ПОТЕРЯ ИЗ-ЗА ГРЯЗИ","an.perDaySystem":"в сутки по системе",
    "an.revenueLabel":"ПОТЕНЦИАЛ ДОХОДА","an.cleanPerDay":"при чистых панелях / день",
    "an.waterLabel":"РАСХОД ВОДЫ / МЕС","an.waterSub":"≈ ${usd} · {panels} панелей",
    "an.paybackLabel":"ОКУПАЕМОСТЬ МОЙКИ","an.paybackSub":"водные расходы → доп. выработка",
    "an.effDynamics":"ДИНАМИКА ЭФФЕКТИВНОСТИ","an.waterUsageWeeks":"РАСХОД ВОДЫ (НЕДЕЛИ)",
    "an.zoneComparison":"СРАВНЕНИЕ ЗОН","an.over7days":"{delta}% за 7 дн","an.waterTip":"Расход","an.week":"Нед",
    "ai.title":"AI-ассистент","ai.poweredBy":"Powered by Claude · знает ваши зоны",
    "ai.greeting":"Привет! Я анализирую вашу систему: {zones} зон, {panels} панелей, средняя эффективность {eff}%. {extra} Чем могу помочь?",
    "ai.extraDirty":"{n} зон требуют внимания: {names}.","ai.extraClean":"Все зоны чистые.",
    "ai.q1":"Какие зоны помыть первыми?","ai.q2":"Оптимальное время мойки для этого сезона",
    "ai.q3":"Сколько денег теряем из-за загрязнения?","ai.q4":"Как защититься от пыльных бурь?",
    "ai.placeholder":"Спросите об оптимизации мойки...","ai.connError":"Ошибка подключения к AI-сервису. Проверьте соединение.",
    "ai.langInstruction":"Отвечай ТОЛЬКО на русском языке.",
    "zone.arrayA_south":"Массив A — Юг","zone.arrayB_west":"Массив B — Запад","zone.arrayC_east":"Массив C — Восток","zone.carport":"Навес — Парковка",
    "day.mon":"Пн","day.tue":"Вт","day.wed":"Ср","day.thu":"Чт","day.fri":"Пт","day.sat":"Сб","day.sun":"Вс",
  },
  en:{
    "nav.dashboard":"Dashboard","nav.zones":"Zones","nav.schedule":"Schedule",
    "nav.analytics":"Analytics","nav.ai":"AI assistant","brand.pro":"PRO",
    "status.online":"Online","status.clean":"Clean","status.dirty":"Needs washing","status.critical":"Critical",
    "common.panelsCount":"{n} panels","common.zonesCount":"{n} zones",
    "common.zonesPanels":"{z} zones · {p} panels","common.kwInstalled":"{cap} kW installed",
    "dash.title":"Dashboard","dash.installed":"{cap} kW installed capacity",
    "dash.criticalAlert":"Critical: {zones} — efficiency below 65%","dash.washAllCritical":"Wash all critical",
    "dash.avgEffLabel":"AVG EFFICIENCY","dash.byAllZones":"across all zones",
    "dash.needsWashLabel":"NEEDS WASHING","dash.allClean":"All clean",
    "dash.nextWashLabel":"NEXT WASH","dash.noSchedule":"No schedule",
    "dash.dustRiskLabel":"DUST RISK","dash.windRain":"Wind {wind} m/s · rain in {days}d",
    "dash.zoneStatusTitle":"ZONE STATUS","dash.lastWash":"Washed: {date}",
    "dash.washBtn":"Wash","dash.systemEffTitle":"SYSTEM EFFICIENCY",
    "dash.normal":"✓ System healthy","dash.recommendWash":"⚠ Washing recommended","dash.criticalDirt":"✗ Critical soiling",
    "dash.lossPerDay":"Loss: ~{n} kWh/day","dash.weatherTitle":"WEATHER NOW",
    "ring.system":"SYSTEM",
    "weather.temp":"Temperature","weather.humidity":"Humidity","weather.wind":"Wind",
    "weather.dustRisk":"Dust risk","weather.nextRain":"Next rain","weather.inDays":"in {n}d",
    "dust.medium":"Medium","units.ms":"m/s","units.kwh":"kWh","units.liters":"L","units.days":"d","units.min":"min",
    "zones.title":"Panel zones","zones.addZone":"Add zone",
    "zones.mPanels":"panels","zones.mTilt":"tilt","zones.mKw":"kW",
    "zones.efficiency":"Efficiency","zones.lastWash":"Last wash: {date}",
    "zones.washNow":"Wash now","zones.scheduledWash":"Scheduled wash","zones.washing":"Washing...",
    "zones.never":"Never","zones.justNow":"Just now",
    "zones.newZone":"New zone","zones.addArrayDesc":"Add a solar panel array","zones.addBtn":"Add zone",
    "form.zoneName":"Zone name","form.panelCount":"Panel count","form.tiltAngle":"Tilt angle (°)","form.power":"Power (kW)",
    "form.namePh":"Array D — North",
    "sched.title":"Schedule","sched.subtitle":"Smart peak-hour protection (09:00–17:00)",
    "sched.smartTitle":"SMART SETTINGS",
    "sched.peakProtect":"Peak-hour protection","sched.peakProtectDesc":"Block washing between 09:00 and 17:00",
    "sched.weatherDelay":"Rain delay","sched.weatherDelayDesc":"Postpone washing if rain is forecast",
    "sched.dustAlert":"Dust-storm alert","sched.dustAlertDesc":"Push notification and auto-start washing",
    "sched.durationPanels":"{d} min · {p} panels",
    "an.title":"Analytics","an.subtitle":"Efficiency · Water usage · Wash ROI",
    "an.lossDirtLabel":"LOSS FROM DIRT","an.perDaySystem":"per day, system-wide",
    "an.revenueLabel":"REVENUE POTENTIAL","an.cleanPerDay":"with clean panels / day",
    "an.waterLabel":"WATER / MONTH","an.waterSub":"≈ ${usd} · {panels} panels",
    "an.paybackLabel":"WASH PAYBACK","an.paybackSub":"water cost → extra output",
    "an.effDynamics":"EFFICIENCY TREND","an.waterUsageWeeks":"WATER USAGE (WEEKS)",
    "an.zoneComparison":"ZONE COMPARISON","an.over7days":"{delta}% over 7d","an.waterTip":"Usage","an.week":"Wk",
    "ai.title":"AI assistant","ai.poweredBy":"Powered by Claude · knows your zones",
    "ai.greeting":"Hi! I'm analyzing your system: {zones} zones, {panels} panels, average efficiency {eff}%. {extra} How can I help?",
    "ai.extraDirty":"{n} zone(s) need attention: {names}.","ai.extraClean":"All zones are clean.",
    "ai.q1":"Which zones to wash first?","ai.q2":"Best wash time for this season",
    "ai.q3":"How much money are we losing to dirt?","ai.q4":"How to protect against dust storms?",
    "ai.placeholder":"Ask about wash optimization...","ai.connError":"Connection error. Check your network.",
    "ai.langInstruction":"Respond ONLY in English.",
    "zone.arrayA_south":"Array A — South","zone.arrayB_west":"Array B — West","zone.arrayC_east":"Array C — East","zone.carport":"Carport — Parking",
    "day.mon":"Mon","day.tue":"Tue","day.wed":"Wed","day.thu":"Thu","day.fri":"Fri","day.sat":"Sat","day.sun":"Sun",
  },
  he:{
    "nav.dashboard":"לוח בקרה","nav.zones":"אזורים","nav.schedule":"תזמון",
    "nav.analytics":"אנליטיקה","nav.ai":"עוזר AI","brand.pro":"PRO",
    "status.online":"מחובר","status.clean":"נקי","status.dirty":"דרוש ניקוי","status.critical":"קריטי",
    "common.panelsCount":"{n} פאנלים","common.zonesCount":"{n} אזורים",
    "common.zonesPanels":"{z} אזורים · {p} פאנלים","common.kwInstalled":"{cap} kW מותקן",
    "dash.title":"לוח בקרה","dash.installed":"{cap} kW הספק מותקן",
    "dash.criticalAlert":"קריטי: {zones} — יעילות מתחת ל-65%","dash.washAllCritical":"נקה את כל הקריטיים",
    "dash.avgEffLabel":"יעילות ממוצעת","dash.byAllZones":"בכל האזורים",
    "dash.needsWashLabel":"דרוש ניקוי","dash.allClean":"הכל נקי",
    "dash.nextWashLabel":"ניקוי הבא","dash.noSchedule":"אין תזמון",
    "dash.dustRiskLabel":"סיכון אבק","dash.windRain":"רוח {wind} מ/ש · גשם בעוד {days} ימים",
    "dash.zoneStatusTitle":"מצב האזורים","dash.lastWash":"ניקוי: {date}",
    "dash.washBtn":"נקה","dash.systemEffTitle":"יעילות המערכת",
    "dash.normal":"✓ המערכת תקינה","dash.recommendWash":"⚠ מומלץ ניקוי","dash.criticalDirt":"✗ זיהום קריטי",
    "dash.lossPerDay":'אובדן: ~{n} קוט"ש/יום',"dash.weatherTitle":"מזג אוויר עכשיו",
    "ring.system":"מערכת",
    "weather.temp":"טמפרטורה","weather.humidity":"לחות","weather.wind":"רוח",
    "weather.dustRisk":"סיכון אבק","weather.nextRain":"גשם קרוב","weather.inDays":"בעוד {n} ימים",
    "dust.medium":"בינוני","units.ms":"מ/ש","units.kwh":'קוט"ש',"units.liters":"ליטר","units.days":"ימים","units.min":"דק׳",
    "zones.title":"אזורי פאנלים","zones.addZone":"הוסף אזור",
    "zones.mPanels":"פאנלים","zones.mTilt":"זווית","zones.mKw":"kW",
    "zones.efficiency":"יעילות","zones.lastWash":"ניקוי אחרון: {date}",
    "zones.washNow":"נקה עכשיו","zones.scheduledWash":"ניקוי מתוזמן","zones.washing":"מנקה...",
    "zones.never":"אף פעם","zones.justNow":"הרגע",
    "zones.newZone":"אזור חדש","zones.addArrayDesc":"הוסף מערך פאנלים סולאריים","zones.addBtn":"הוסף אזור",
    "form.zoneName":"שם האזור","form.panelCount":"מספר פאנלים","form.tiltAngle":"זווית הטיה (°)","form.power":"הספק (kW)",
    "form.namePh":"מערך D — צפון",
    "sched.title":"תזמון","sched.subtitle":"הגנה חכמה על שעות שיא (09:00–17:00)",
    "sched.smartTitle":"הגדרות חכמות",
    "sched.peakProtect":"הגנת שעות שיא","sched.peakProtectDesc":"חסום ניקוי בין 09:00 ל-17:00",
    "sched.weatherDelay":"דחייה בגשם","sched.weatherDelayDesc":"דחה ניקוי אם צפוי גשם",
    "sched.dustAlert":"התראת סופת אבק","sched.dustAlertDesc":"התראה והפעלת ניקוי אוטומטית",
    "sched.durationPanels":"{d} דק׳ · {p} פאנלים",
    "an.title":"אנליטיקה","an.subtitle":"יעילות · צריכת מים · החזר על ניקוי",
    "an.lossDirtLabel":"אובדן עקב לכלוך","an.perDaySystem":"ליום, כלל המערכת",
    "an.revenueLabel":"פוטנציאל הכנסה","an.cleanPerDay":"עם פאנלים נקיים / יום",
    "an.waterLabel":"מים / חודש","an.waterSub":"≈ ${usd} · {panels} פאנלים",
    "an.paybackLabel":"החזר על ניקוי","an.paybackSub":"עלות מים → תפוקה נוספת",
    "an.effDynamics":"מגמת יעילות","an.waterUsageWeeks":"צריכת מים (שבועות)",
    "an.zoneComparison":"השוואת אזורים","an.over7days":"{delta}% ב-7 ימים","an.waterTip":"צריכה","an.week":"שב׳",
    "ai.title":"עוזר AI","ai.poweredBy":"מבוסס Claude · מכיר את האזורים שלך",
    "ai.greeting":"שלום! אני מנתח את המערכת שלך: {zones} אזורים, {panels} פאנלים, יעילות ממוצעת {eff}%. {extra} איך אפשר לעזור?",
    "ai.extraDirty":"{n} אזורים דורשים תשומת לב: {names}.","ai.extraClean":"כל האזורים נקיים.",
    "ai.q1":"אילו אזורים לנקות קודם?","ai.q2":"זמן הניקוי האופטימלי לעונה",
    "ai.q3":"כמה כסף אנחנו מפסידים מלכלוך?","ai.q4":"איך להתגונן מפני סופות אבק?",
    "ai.placeholder":"שאל על אופטימיזציית ניקוי...","ai.connError":"שגיאת חיבור. בדוק את הרשת.",
    "ai.langInstruction":"ענה אך ורק בעברית.",
    "zone.arrayA_south":"מערך A — דרום","zone.arrayB_west":"מערך B — מערב","zone.arrayC_east":"מערך C — מזרח","zone.carport":"סוכך — חניה",
    "day.mon":"ב׳","day.tue":"ג׳","day.wed":"ד׳","day.thu":"ה׳","day.fri":"ו׳","day.sat":"שבת","day.sun":"א׳",
  },
};

// ─── LOCALE CONTEXT ───────────────────────────────────────────────────────────
const LocaleCtx = createContext(null);
const useT = () => useContext(LocaleCtx);

function translate(lang, key, params){
  let s = (I18N[lang] && I18N[lang][key]) ?? I18N.en[key] ?? key;
  if(params) for(const k in params) s = s.split(`{${k}}`).join(params[k]);
  return s;
}

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const INITIAL_ZONES = [
  { id:1, nameKey:"zone.arrayA_south", panels:12, tilt:30, lastWash:"2026-06-12", efficiency:87, status:"dirty",    capacity:3.6 },
  { id:2, nameKey:"zone.arrayB_west",  panels:8,  tilt:25, lastWash:"2026-06-08", efficiency:71, status:"dirty",    capacity:2.4 },
  { id:3, nameKey:"zone.arrayC_east",  panels:16, tilt:35, lastWash:"2026-06-01", efficiency:55, status:"critical", capacity:4.8 },
  { id:4, nameKey:"zone.carport",      panels:6,  tilt:10, lastWash:"2026-06-14", efficiency:94, status:"clean",    capacity:1.8 },
];
const INITIAL_SCHEDULES = [
  { id:1, zoneId:1, time:"05:30", days:["mon","thu"], duration:8,  active:true  },
  { id:2, zoneId:2, time:"06:00", days:["tue","fri"], duration:6,  active:true  },
  { id:3, zoneId:3, time:"05:00", days:["mon","wed","fri"], duration:10, active:false },
  { id:4, zoneId:4, time:"06:30", days:["sat"], duration:5, active:true },
];
const EFF_HISTORY = [
  { day:"10", a:91, b:88, c:79, d:95 },{ day:"11", a:90, b:85, c:74, d:94 },
  { day:"12", a:87, b:81, c:68, d:95 },{ day:"13", a:86, b:76, c:63, d:93 },
  { day:"14", a:85, b:71, c:58, d:94 },{ day:"15", a:84, b:70, c:56, d:93 },
  { day:"16", a:87, b:71, c:55, d:94 },
];
const WATER_DATA = [118,94,142,107];
const WEATHER = { temp:34, humidity:18, wind:2.1, dustKey:"medium", nextRainDays:8 };

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const statusColor = s => s==="clean" ? T.green : s==="dirty" ? T.accent : T.red;
const effColor    = e => e>=85 ? T.green : e>=65 ? T.accent : T.red;

function fmtLastWash(z, t, locale){
  if(z.lastWash==="justNow") return t("zones.justNow");
  if(z.lastWash==="never")  return t("zones.never");
  try { return new Date(z.lastWash).toLocaleDateString(locale,{day:"numeric",month:"short"}); }
  catch { return z.lastWash; }
}

// ─── ATOMS ───────────────────────────────────────────────────────────────────
function Card({ children, style, onClick }){
  const [hov,setHov]=useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={()=>onClick&&setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:T.card, border:`1px solid ${hov?T.accent+"44":T.cardBorder}`,
        borderRadius:14, padding:20, cursor:onClick?"pointer":"default",
        transition:"border-color .2s, transform .15s", transform:hov?"translateY(-1px)":"none", ...style }}>
      {children}
    </div>
  );
}
function Badge({ status }){
  const { t } = useT(); const c=statusColor(status);
  const lbl = status==="clean"?t("status.clean"):status==="dirty"?t("status.dirty"):t("status.critical");
  return <span style={{ fontSize:10, fontWeight:700, letterSpacing:".06em", padding:"3px 9px",
    borderRadius:20, background:c+"1A", color:c, border:`1px solid ${c}33` }}>{lbl}</span>;
}
function MiniGauge({ value }){
  const c=effColor(value);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div dir="ltr" style={{ flex:1, height:6, background:T.cardBorder, borderRadius:3, overflow:"hidden" }}>
        <div style={{ width:`${value}%`, height:"100%",
          background:`linear-gradient(90deg, ${c}88, ${c})`, borderRadius:3, transition:"width .9s ease" }}/>
      </div>
      <span style={{ fontSize:13, fontWeight:700, color:c, fontFamily:"monospace", minWidth:36, textAlign:"right" }}>{value}%</span>
    </div>
  );
}
function StatCard({ label, value, sub, icon:Icon, color=T.accent }){
  return (
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:11, color:T.textSecondary, marginBottom:8, letterSpacing:".05em", fontWeight:600 }}>{label}</div>
          <div style={{ fontSize:26, fontWeight:700, color:T.textPrimary, fontFamily:"monospace", lineHeight:1 }}>{value}</div>
          {sub && <div style={{ fontSize:12, color:T.textSecondary, marginTop:5 }}>{sub}</div>}
        </div>
        <div style={{ width:40, height:40, borderRadius:10, background:color+"1A",
          display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Icon size={18} color={color}/>
        </div>
      </div>
    </Card>
  );
}
function EfficiencyRing({ value, label, size=180 }){
  const r=(size-30)/2, circ=2*Math.PI*r, offset=circ-(Math.min(value,100)/100)*circ, c=effColor(value);
  return (
    <div dir="ltr" style={{ position:"relative", width:size, height:size }}>
      <div style={{ position:"absolute", inset:0, borderRadius:"50%", boxShadow:`0 0 40px ${c}22`, pointerEvents:"none" }}/>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)", position:"absolute" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.cardBorder} strokeWidth={14}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c+"18"} strokeWidth={14} strokeDasharray="2 6"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={14}
          strokeDasharray={`${circ}`} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1), stroke .5s ease", filter:`drop-shadow(0 0 6px ${c}88)` }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <span style={{ fontSize:36, fontWeight:800, color:c, lineHeight:1, fontFamily:"monospace" }}>{value}<span style={{ fontSize:18 }}>%</span></span>
        <span style={{ fontSize:10, color:T.textSecondary, marginTop:5, letterSpacing:".12em" }}>{label}</span>
      </div>
    </div>
  );
}
function Toggle({ on, onChange }){
  return (
    <button onClick={onChange} dir="ltr" style={{ width:48, height:26, borderRadius:13,
      background:on?T.green:T.cardBorder, border:"none", cursor:"pointer", position:"relative",
      transition:"background .3s", flexShrink:0 }}>
      <div style={{ position:"absolute", top:3, left:on?24:3, width:20, height:20, borderRadius:10,
        background:"#fff", transition:"left .3s", boxShadow:"0 1px 4px #0004" }}/>
    </button>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ zones, schedules, onWash }){
  const { t, locale } = useT();
  const zName = z => z.name || t(z.nameKey);
  const avgEff=Math.round(zones.reduce((s,z)=>s+z.efficiency,0)/zones.length);
  const totalPanels=zones.reduce((s,z)=>s+z.panels,0);
  const totalCap=zones.reduce((s,z)=>s+z.capacity,0);
  const critical=zones.filter(z=>z.status==="critical");
  const dirty=zones.filter(z=>z.status!=="clean");
  const nextSched=schedules.find(s=>s.active);
  const now=new Date();
  const dateStr=now.toLocaleDateString(locale,{day:"numeric",month:"long",year:"numeric"});
  const timeStr=now.toLocaleTimeString(locale,{hour:"2-digit",minute:"2-digit"});

  return (
    <div style={{ padding:"28px 32px", maxWidth:1280 }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:T.textPrimary, margin:0, letterSpacing:"-.02em" }}>{t("dash.title")}</h1>
        <p style={{ color:T.textSecondary, margin:"4px 0 0", fontSize:13 }}>
          {dateStr} · {timeStr} · {t("common.panelsCount",{n:totalPanels})} · {t("dash.installed",{cap:totalCap.toFixed(1)})}
        </p>
      </div>

      {critical.length>0 && (
        <div style={{ display:"flex", alignItems:"center", gap:12, background:T.red+"12",
          border:`1px solid ${T.red}44`, borderRadius:12, padding:"12px 18px", marginBottom:24 }}>
          <AlertTriangle size={17} color={T.red}/>
          <span style={{ color:T.red, fontSize:13, fontWeight:600 }}>{t("dash.criticalAlert",{zones:critical.map(zName).join(" · ")})}</span>
          <button onClick={()=>critical.forEach(z=>onWash(z.id))} style={{ marginInlineStart:"auto", padding:"5px 14px",
            borderRadius:8, background:T.red+"22", border:`1px solid ${T.red}55`, color:T.red, fontSize:12, fontWeight:700, cursor:"pointer" }}>
            {t("dash.washAllCritical")}
          </button>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:16, marginBottom:24 }}>
        <StatCard label={t("dash.avgEffLabel")} value={`${avgEff}%`} sub={t("dash.byAllZones")} icon={Zap} color={effColor(avgEff)}/>
        <StatCard label={t("dash.needsWashLabel")} value={dirty.length}
          sub={dirty.length?dirty.map(zName).join(", "):t("dash.allClean")} icon={Droplets} color={dirty.length?T.accent:T.green}/>
        <StatCard label={t("dash.nextWashLabel")} value={nextSched?nextSched.time:"—"}
          sub={nextSched?`${nextSched.days.map(d=>t("day."+d)).join(", ")}`:t("dash.noSchedule")} icon={Clock} color={T.blue}/>
        <StatCard label={t("dash.dustRiskLabel")} value={t("dust."+WEATHER.dustKey)}
          sub={t("dash.windRain",{wind:WEATHER.wind,days:WEATHER.nextRainDays})} icon={Wind} color={T.red}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1.6fr 1fr", gap:20 }}>
        <Card>
          <div style={{ fontSize:11, fontWeight:700, color:T.textSecondary, marginBottom:20, letterSpacing:".06em" }}>{t("dash.zoneStatusTitle")}</div>
          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
            {zones.map(z=>(
              <div key={z.id}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:T.textPrimary, marginBottom:4 }}>{zName(z)}</div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <Badge status={z.status}/>
                      <span style={{ fontSize:11, color:T.textSecondary }}>{t("dash.lastWash",{date:fmtLastWash(z,t,locale)})}</span>
                    </div>
                  </div>
                  {z.status!=="clean"
                    ? <button onClick={()=>onWash(z.id)} style={{ padding:"6px 14px", borderRadius:8,
                        background:statusColor(z.status)+"18", border:`1px solid ${statusColor(z.status)}55`,
                        color:statusColor(z.status), fontSize:12, fontWeight:700, cursor:"pointer" }}>{t("dash.washBtn")}</button>
                    : <CheckCircle size={18} color={T.green}/>}
                </div>
                <MiniGauge value={z.efficiency}/>
              </div>
            ))}
          </div>
        </Card>

        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:32 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.textSecondary, marginBottom:22, letterSpacing:".06em" }}>{t("dash.systemEffTitle")}</div>
            <EfficiencyRing value={avgEff} label={t("ring.system")}/>
            <div style={{ marginTop:22, textAlign:"center" }}>
              <div style={{ fontSize:13, fontWeight:600, color:effColor(avgEff) }}>
                {avgEff>=85?t("dash.normal"):avgEff>=65?t("dash.recommendWash"):t("dash.criticalDirt")}
              </div>
              <div style={{ fontSize:12, color:T.textSecondary, marginTop:4 }}>
                {t("dash.lossPerDay",{n:Math.round((100-avgEff)*totalCap*6/100*10)/10})}
              </div>
            </div>
          </Card>
          <Card>
            <div style={{ fontSize:11, fontWeight:700, color:T.textSecondary, marginBottom:14, letterSpacing:".06em" }}>{t("dash.weatherTitle")}</div>
            {[
              [t("weather.temp"), `${WEATHER.temp}°C`, T.accent],
              [t("weather.humidity"), `${WEATHER.humidity}%`, T.blue],
              [t("weather.wind"), `${WEATHER.wind} ${t("units.ms")}`, T.textPrimary],
              [t("weather.dustRisk"), t("dust."+WEATHER.dustKey), T.red],
              [t("weather.nextRain"), t("weather.inDays",{n:WEATHER.nextRainDays}), T.red],
            ].map(([label,val,c])=>(
              <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <span style={{ fontSize:13, color:T.textSecondary }}>{label}</span>
                <span style={{ fontSize:13, fontWeight:700, color:c, fontFamily:"monospace" }}>{val}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── ZONES ────────────────────────────────────────────────────────────────────
function ZonesView({ zones, setZones }){
  const { t, locale } = useT();
  const zName = z => z.name || t(z.nameKey);
  const [showAdd,setShowAdd]=useState(false);
  const [washing,setWashing]=useState({});
  const [form,setForm]=useState({ name:"", panels:8, tilt:30, capacity:2.4 });

  const addZone=()=>{
    if(!form.name.trim())return;
    setZones(p=>[...p,{ name:form.name, id:Date.now(), panels:Number(form.panels),
      tilt:Number(form.tilt), capacity:Number(form.capacity), lastWash:"never", efficiency:92, status:"clean" }]);
    setShowAdd(false); setForm({ name:"", panels:8, tilt:30, capacity:2.4 });
  };
  const deleteZone=id=>setZones(p=>p.filter(z=>z.id!==id));
  const startWash=id=>{
    setWashing(p=>({...p,[id]:true}));
    setTimeout(()=>{
      setZones(p=>p.map(z=>z.id===id?{...z,lastWash:"justNow",efficiency:Math.min(z.efficiency+23,97),status:"clean"}:z));
      setWashing(p=>({...p,[id]:false}));
    },2500);
  };

  return (
    <div style={{ padding:"28px 32px", maxWidth:1280 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800, color:T.textPrimary, margin:0, letterSpacing:"-.02em" }}>{t("zones.title")}</h1>
          <p style={{ color:T.textSecondary, margin:"4px 0 0", fontSize:13 }}>
            {t("common.zonesCount",{n:zones.length})} · {t("common.panelsCount",{n:zones.reduce((s,z)=>s+z.panels,0)})} · {zones.reduce((s,z)=>s+z.capacity,0).toFixed(1)} kW
          </p>
        </div>
        <button onClick={()=>setShowAdd(true)} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px",
          borderRadius:10, background:T.accent, border:"none", color:"#000", fontWeight:700, fontSize:14, cursor:"pointer" }}>
          <Plus size={16}/> {t("zones.addZone")}
        </button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        {zones.map(z=>{
          const isWashing=washing[z.id];
          return (
            <Card key={z.id} style={{ position:"relative", overflow:"hidden" }}>
              {isWashing && <div style={{ position:"absolute", inset:0,
                background:`linear-gradient(180deg, ${T.blue}08 0%, ${T.blue}18 50%, ${T.blue}08 100%)`,
                animation:"washPulse 1.2s ease-in-out infinite", borderRadius:14, zIndex:1, pointerEvents:"none" }}/>}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:700, color:T.textPrimary, marginBottom:6 }}>{zName(z)}</div>
                  <Badge status={isWashing?"clean":z.status}/>
                </div>
                <button onClick={()=>deleteZone(z.id)} style={{ background:"none", border:`1px solid ${T.cardBorder}`,
                  borderRadius:8, padding:"6px 8px", cursor:"pointer", color:T.textSecondary }}><Trash2 size={14}/></button>
              </div>
              <div dir="ltr" style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", marginBottom:18, background:T.bg, borderRadius:10, overflow:"hidden" }}>
                {[[z.panels,t("zones.mPanels")],[`${z.tilt}°`,t("zones.mTilt")],[`${z.capacity}`,t("zones.mKw")]].map(([v,l])=>(
                  <div key={l} style={{ padding:"14px 0", textAlign:"center", borderRight:`1px solid ${T.cardBorder}` }}>
                    <div style={{ fontSize:22, fontWeight:800, color:T.textPrimary, fontFamily:"monospace" }}>{v}</div>
                    <div style={{ fontSize:11, color:T.textSecondary, marginTop:2 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom:16 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
                  <span style={{ fontSize:12, color:T.textSecondary }}>{t("zones.efficiency")}</span>
                  <span style={{ fontSize:12, color:T.textSecondary }}>{t("zones.lastWash",{date:fmtLastWash(z,t,locale)})}</span>
                </div>
                <MiniGauge value={z.efficiency}/>
              </div>
              <button onClick={()=>!isWashing&&startWash(z.id)} disabled={isWashing} style={{ width:"100%", padding:"11px",
                background:isWashing?T.blue+"22":z.status==="clean"?T.cardBorder+"88":statusColor(z.status),
                border:`1px solid ${isWashing?T.blue:z.status==="clean"?T.cardBorder:statusColor(z.status)+"88"}`,
                borderRadius:10, color:isWashing?T.blue:z.status==="clean"?T.textSecondary:"#000",
                fontWeight:700, fontSize:14, cursor:isWashing?"default":"pointer",
                display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .2s" }}>
                {isWashing
                  ? <><RefreshCw size={15} style={{ animation:"spin 1s linear infinite" }}/> {t("zones.washing")}</>
                  : <><Droplets size={15}/> {z.status==="clean"?t("zones.scheduledWash"):t("zones.washNow")}</>}
              </button>
            </Card>
          );
        })}
      </div>

      {showAdd && (
        <div style={{ position:"fixed", inset:0, background:"#000000CC", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:18, padding:36, width:440 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:26 }}>
              <div>
                <h2 style={{ margin:0, color:T.textPrimary, fontSize:18, fontWeight:800 }}>{t("zones.newZone")}</h2>
                <p style={{ margin:"4px 0 0", color:T.textSecondary, fontSize:13 }}>{t("zones.addArrayDesc")}</p>
              </div>
              <button onClick={()=>setShowAdd(false)} style={{ background:"none", border:"none", cursor:"pointer", color:T.textSecondary }}><X size={20}/></button>
            </div>
            {[
              { label:t("form.zoneName"), key:"name", ph:t("form.namePh"), type:"text" },
              { label:t("form.panelCount"), key:"panels", ph:"8", type:"number" },
              { label:t("form.tiltAngle"), key:"tilt", ph:"30", type:"number" },
              { label:t("form.power"), key:"capacity", ph:"2.4", type:"number" },
            ].map(({label,key,ph,type})=>(
              <div key={key} style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, color:T.textSecondary, marginBottom:7, fontWeight:700, letterSpacing:".03em" }}>{label}</div>
                <input type={type} placeholder={ph} value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                  style={{ width:"100%", padding:"11px 14px", background:T.bg, border:`1px solid ${T.cardBorder}`,
                    borderRadius:10, color:T.textPrimary, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}/>
              </div>
            ))}
            <button onClick={addZone} style={{ width:"100%", marginTop:8, padding:"13px", background:T.accent,
              border:"none", borderRadius:12, color:"#000", fontWeight:800, fontSize:15, cursor:"pointer" }}>{t("zones.addBtn")}</button>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes washPulse{0%,100%{opacity:.6}50%{opacity:1}}`}</style>
    </div>
  );
}

// ─── SCHEDULE ─────────────────────────────────────────────────────────────────
function ScheduleView({ zones, schedules, setSchedules }){
  const { t, lang } = useT();
  const zName = z => z.name || t(z.nameKey);
  const [peakProtect,setPeakProtect]=useState(true);
  const [weatherDelay,setWeatherDelay]=useState(true);
  const [dustAlert,setDustAlert]=useState(true);
  const toggleSched=id=>setSchedules(p=>p.map(s=>s.id===id?{...s,active:!s.active}:s));
  const toggleDay=(sid,day)=>setSchedules(p=>p.map(s=>{
    if(s.id!==sid)return s;
    const days=s.days.includes(day)?s.days.filter(d=>d!==day):[...s.days,day];
    return {...s,days};
  }));
  const dayOrder=DAY_ORDER[lang]||DAY_KEYS;

  return (
    <div style={{ padding:"28px 32px", maxWidth:900 }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:T.textPrimary, margin:0, letterSpacing:"-.02em" }}>{t("sched.title")}</h1>
        <p style={{ color:T.textSecondary, margin:"4px 0 0", fontSize:13 }}>{t("sched.subtitle")}</p>
      </div>

      <Card style={{ marginBottom:22, borderColor:T.accent+"33", background:T.accent+"08" }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.accent, marginBottom:16, letterSpacing:".06em" }}>{t("sched.smartTitle")}</div>
        {[
          [peakProtect,setPeakProtect,t("sched.peakProtect"),t("sched.peakProtectDesc")],
          [weatherDelay,setWeatherDelay,t("sched.weatherDelay"),t("sched.weatherDelayDesc")],
          [dustAlert,setDustAlert,t("sched.dustAlert"),t("sched.dustAlertDesc")],
        ].map(([val,set,label,sub])=>(
          <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:T.textPrimary }}>{label}</div>
              <div style={{ fontSize:12, color:T.textSecondary, marginTop:2 }}>{sub}</div>
            </div>
            <Toggle on={val} onChange={()=>set(p=>!p)}/>
          </div>
        ))}
      </Card>

      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {schedules.map(sched=>{
          const zone=zones.find(z=>z.id===sched.zoneId);
          return (
            <Card key={sched.id} style={{ opacity:sched.active?1:.55 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:16 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
                    <span dir="ltr" style={{ fontSize:28, fontWeight:800, color:T.textPrimary, fontFamily:"monospace" }}>{sched.time}</span>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:T.textPrimary }}>{zone?zName(zone):"—"}</div>
                      <div style={{ fontSize:12, color:T.textSecondary }}>
                        {t("sched.durationPanels",{d:sched.duration,p:zone?.panels})}
                        {zone && <span style={{ marginInlineStart:8, color:effColor(zone.efficiency) }}>· {zone.efficiency}%</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:7 }}>
                    {dayOrder.map(day=>(
                      <button key={day} onClick={()=>toggleDay(sched.id,day)} style={{ width:38, height:38, borderRadius:9,
                        border:`1px solid ${sched.days.includes(day)?T.accent:T.cardBorder}`,
                        background:sched.days.includes(day)?T.accent+"1A":"transparent",
                        color:sched.days.includes(day)?T.accent:T.textSecondary, fontSize:11, fontWeight:700,
                        cursor:"pointer", transition:"all .18s" }}>{t("day."+day)}</button>
                    ))}
                  </div>
                </div>
                <Toggle on={sched.active} onChange={()=>toggleSched(sched.id)}/>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function AnalyticsView({ zones }){
  const { t } = useT();
  const zName = z => z.name || t(z.nameKey);
  const totalCap=zones.reduce((s,z)=>s+z.capacity,0);
  const avgEff=zones.reduce((s,z)=>s+z.efficiency,0)/zones.length;
  const lostKwh=((100-avgEff)/100*totalCap*6).toFixed(1);
  const potentialUsd=(parseFloat(lostKwh)*0.12).toFixed(2);
  const washRoiDays=(1.85/Math.max(parseFloat(potentialUsd),0.01)).toFixed(1);
  const ZC={ a:T.green, b:T.accent, c:T.red, d:T.blue };
  const keys=["a","b","c","d"];
  const waterChart=WATER_DATA.map((l,i)=>({ week:`${t("an.week")} ${i+1}`, liters:l }));

  return (
    <div style={{ padding:"28px 32px", maxWidth:1200 }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:T.textPrimary, margin:0, letterSpacing:"-.02em" }}>{t("an.title")}</h1>
        <p style={{ color:T.textSecondary, margin:"4px 0 0", fontSize:13 }}>{t("an.subtitle")}</p>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:16, marginBottom:26 }}>
        <StatCard label={t("an.lossDirtLabel")} value={`${lostKwh} ${t("units.kwh")}`} sub={t("an.perDaySystem")} icon={TrendingDown} color={T.red}/>
        <StatCard label={t("an.revenueLabel")} value={`$${potentialUsd}`} sub={t("an.cleanPerDay")} icon={TrendingUp} color={T.green}/>
        <StatCard label={t("an.waterLabel")} value={`461 ${t("units.liters")}`} sub={t("an.waterSub",{usd:"1.85",panels:zones.reduce((s,z)=>s+z.panels,0)})} icon={Droplets} color={T.blue}/>
        <StatCard label={t("an.paybackLabel")} value={`${washRoiDays} ${t("units.days")}`} sub={t("an.paybackSub")} icon={Activity} color={T.purple}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:20, marginBottom:20 }}>
        <Card>
          <div style={{ fontSize:11, fontWeight:700, color:T.textSecondary, marginBottom:20, letterSpacing:".06em" }}>{t("an.effDynamics")}</div>
          <div style={{ display:"flex", gap:18, marginBottom:14, flexWrap:"wrap" }}>
            {zones.slice(0,4).map((z,i)=>(
              <div key={z.id} style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:12, height:3, borderRadius:2, background:ZC[keys[i]] }}/>
                <span style={{ fontSize:11, color:T.textSecondary }}>{zName(z)}</span>
              </div>
            ))}
          </div>
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={EFF_HISTORY}>
                <defs>{keys.map(k=>(
                  <linearGradient key={k} id={`g${k}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ZC[k]} stopOpacity={0.2}/><stop offset="95%" stopColor={ZC[k]} stopOpacity={0}/>
                  </linearGradient>))}</defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.cardBorder}/>
                <XAxis dataKey="day" tick={{ fill:T.textSecondary, fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis domain={[50,100]} tick={{ fill:T.textSecondary, fontSize:11 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:10, color:T.textPrimary, fontSize:12 }}/>
                {keys.map(k=><Area key={k} type="monotone" dataKey={k} stroke={ZC[k]} fill={`url(#g${k})`} strokeWidth={2} dot={false}/>)}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div style={{ fontSize:11, fontWeight:700, color:T.textSecondary, marginBottom:20, letterSpacing:".06em" }}>{t("an.waterUsageWeeks")}</div>
          <div dir="ltr">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={waterChart} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.cardBorder} vertical={false}/>
                <XAxis dataKey="week" tick={{ fill:T.textSecondary, fontSize:11 }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill:T.textSecondary, fontSize:11 }} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:10, color:T.textPrimary, fontSize:12 }}
                  formatter={v=>[`${v} ${t("units.liters")}`,t("an.waterTip")]}/>
                <Bar dataKey="liters" fill={T.blue} radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ fontSize:11, fontWeight:700, color:T.textSecondary, marginBottom:18, letterSpacing:".06em" }}>{t("an.zoneComparison")}</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
          {zones.slice(0,4).map((z,i)=>{
            const c=ZC[keys[i]]||T.accent;
            const lastEff=EFF_HISTORY[0][keys[i]]||z.efficiency;
            const delta=z.efficiency-lastEff;
            return (
              <div key={z.id} style={{ padding:16, background:T.bg, borderRadius:12, border:`1px solid ${T.cardBorder}` }}>
                <div style={{ fontSize:12, fontWeight:700, color:c, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{zName(z)}</div>
                <div style={{ fontSize:28, fontWeight:800, color:T.textPrimary, fontFamily:"monospace" }}>{z.efficiency}<span style={{ fontSize:14 }}>%</span></div>
                <div style={{ fontSize:12, color:delta>=0?T.green:T.red, marginTop:3 }}>{delta>=0?"+":""}{t("an.over7days",{delta})}</div>
                <div style={{ marginTop:10 }}><MiniGauge value={z.efficiency}/></div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─── AI ASSISTANT ─────────────────────────────────────────────────────────────
function AIView({ zones }){
  const { t, lang } = useT();
  const zName = z => z.name || t(z.nameKey);
  const totalPanels=zones.reduce((s,z)=>s+z.panels,0);
  const avgEff=Math.round(zones.reduce((s,z)=>s+z.efficiency,0)/zones.length);
  const needsWash=zones.filter(z=>z.status!=="clean");

  const buildGreeting=()=>{
    const extra = needsWash.length
      ? t("ai.extraDirty",{ n:needsWash.length, names:needsWash.map(zName).join(", ") })
      : t("ai.extraClean");
    return t("ai.greeting",{ zones:zones.length, panels:totalPanels, eff:avgEff, extra });
  };

  const [messages,setMessages]=useState([{ role:"assistant", content:buildGreeting() }]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const bottomRef=useRef(null);

  // Refresh greeting when language changes (only if conversation hasn't started)
  useEffect(()=>{
    setMessages(m => m.length<=1 ? [{ role:"assistant", content:buildGreeting() }] : m);
    // eslint-disable-next-line
  },[lang]);

  const QUICK=[t("ai.q1"),t("ai.q2"),t("ai.q3"),t("ai.q4")];

  const langName = lang==="ru"?"Russian (Русский)":lang==="he"?"Hebrew (עברית)":"English";
  const systemPrompt =
`You are the smart assistant of SolarWash Pro, a solar-panel cleaning management app. ${t("ai.langInstruction")} Be concise, concrete, use numbers.

Current system data (${new Date().toLocaleDateString(LOCALES[lang].code)}):
${zones.map(z=>`• ${zName(z)}: ${z.panels} panels, ${z.capacity} kW, tilt ${z.tilt}°, efficiency ${z.efficiency}%, status ${z.status}`).join("\n")}

Weather: ${WEATHER.temp}°C, humidity ${WEATHER.humidity}%, wind ${WEATHER.wind} m/s, dust risk ${t("dust."+WEATHER.dustKey)}, rain in ${WEATHER.nextRainDays} days. System average efficiency ${avgEff}%.

Give concrete recommendations about wash prioritization, scheduling and optimization.`;

  const send=async(text)=>{
    if(!text.trim()||loading)return;
    const userMsg={ role:"user", content:text };
    setMessages(p=>[...p,userMsg]); setInput(""); setLoading(true);
    try{
      const history=[...messages,userMsg].map(m=>({ role:m.role, content:m.content }));
      const res=await fetch(API_BASE,{ method:"POST", headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:600, system:systemPrompt, messages:history }) });
      const data=await res.json();
      const reply=data.content?.[0]?.text || t("ai.connError");
      setMessages(p=>[...p,{ role:"assistant", content:reply }]);
    }catch{ setMessages(p=>[...p,{ role:"assistant", content:t("ai.connError") }]); }
    setLoading(false);
  };

  useEffect(()=>{ bottomRef.current?.scrollIntoView({ behavior:"smooth" }); },[messages]);

  return (
    <div style={{ padding:"28px 32px", maxWidth:820, height:"calc(100vh - 40px)", display:"flex", flexDirection:"column", boxSizing:"border-box" }}>
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:T.textPrimary, margin:0, letterSpacing:"-.02em" }}>{t("ai.title")}</h1>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:5 }}>
          <div style={{ width:7, height:7, borderRadius:4, background:T.green }}/>
          <span style={{ color:T.textSecondary, fontSize:13 }}>{t("ai.poweredBy")}</span>
        </div>
      </div>

      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:18 }}>
        {QUICK.map(q=>(
          <button key={q} onClick={()=>send(q)} disabled={loading} style={{ padding:"7px 14px", borderRadius:20,
            background:T.accent+"14", border:`1px solid ${T.accent}44`, color:T.accent, fontSize:12,
            cursor:loading?"default":"pointer", fontWeight:600, transition:"background .2s" }}>{q}</button>
        ))}
      </div>

      <Card style={{ flex:1, overflow:"auto", padding:20, display:"flex", flexDirection:"column", gap:14 }}>
        {messages.map((msg,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:msg.role==="user"?"flex-end":"flex-start" }}>
            {msg.role==="assistant" && (
              <div style={{ width:28, height:28, borderRadius:8, background:T.accent+"18",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginInlineEnd:10, marginTop:2 }}>
                <Sun size={14} color={T.accent}/>
              </div>
            )}
            <div style={{ maxWidth:"76%", padding:"12px 16px", borderRadius:14,
              background:msg.role==="user"?T.accent+"1A":T.bg,
              border:`1px solid ${msg.role==="user"?T.accent+"44":T.cardBorder}`,
              color:T.textPrimary, fontSize:14, lineHeight:1.65, whiteSpace:"pre-wrap" }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:28, height:28, borderRadius:8, background:T.accent+"18", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Sun size={14} color={T.accent}/>
            </div>
            <div dir="ltr" style={{ display:"flex", gap:5, alignItems:"center" }}>
              {[0,1,2].map(i=><div key={i} style={{ width:7, height:7, borderRadius:4, background:T.accent, animation:`dot 1.2s ease-in-out ${i*0.2}s infinite` }}/>)}
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </Card>

      <div style={{ display:"flex", gap:10, marginTop:14 }}>
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send(input)} placeholder={t("ai.placeholder")}
          style={{ flex:1, padding:"13px 18px", background:T.card, border:`1px solid ${T.cardBorder}`,
            borderRadius:12, color:T.textPrimary, fontSize:14, outline:"none", fontFamily:"inherit" }}/>
        <button onClick={()=>send(input)} disabled={loading||!input.trim()} style={{ width:48, height:48, borderRadius:12,
          flexShrink:0, background:input.trim()&&!loading?T.accent:T.cardBorder, border:"none",
          cursor:input.trim()&&!loading?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", transition:"background .2s" }}>
          <Send size={18} color={input.trim()&&!loading?"#000":T.textSecondary}/>
        </button>
      </div>
      <style>{`@keyframes dot{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}`}</style>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive, zones }){
  const { t, lang, setLang } = useT();
  const critical=zones.filter(z=>z.status==="critical").length;
  const NAV=[
    { id:"dashboard", icon:LayoutDashboard, label:t("nav.dashboard") },
    { id:"zones",     icon:Grid,            label:t("nav.zones") },
    { id:"schedule",  icon:Calendar,        label:t("nav.schedule") },
    { id:"analytics", icon:BarChart3,       label:t("nav.analytics") },
    { id:"ai",        icon:Bot,             label:t("nav.ai") },
  ];
  return (
    <div style={{ width:224, background:T.card, borderInlineEnd:`1px solid ${T.cardBorder}`,
      display:"flex", flexDirection:"column", padding:"24px 0", flexShrink:0 }}>
      <div style={{ padding:"0 20px 30px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:11 }}>
          <div style={{ width:38, height:38, borderRadius:12, background:`linear-gradient(135deg, ${T.accent}, #D97706)`,
            display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 4px 16px ${T.accent}40`, flexShrink:0 }}>
            <Sun size={18} color="#000"/>
          </div>
          <div>
            <div style={{ fontSize:15, fontWeight:900, color:T.textPrimary, lineHeight:1, letterSpacing:"-.02em" }}>SolarWash</div>
            <div style={{ fontSize:10, color:T.accent, fontWeight:800, letterSpacing:".12em", marginTop:2 }}>{t("brand.pro")}</div>
          </div>
        </div>
      </div>

      <div style={{ flex:1, padding:"0 10px", display:"flex", flexDirection:"column", gap:3 }}>
        {NAV.map(({ id, icon:Icon, label })=>{
          const isActive=active===id;
          return (
            <button key={id} onClick={()=>setActive(id)} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"10px 13px", borderRadius:11, border:"none", background:isActive?T.accent+"18":"transparent",
              color:isActive?T.accent:T.textSecondary, fontSize:14, fontWeight:isActive?700:400, cursor:"pointer",
              transition:"all .18s", textAlign:"start", fontFamily:"inherit" }}>
              <div style={{ display:"flex", alignItems:"center", gap:11 }}><Icon size={17}/>{label}</div>
              {id==="zones" && critical>0 && (
                <span style={{ fontSize:11, fontWeight:700, minWidth:18, height:18, borderRadius:9, background:T.red, color:"#fff",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>{critical}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Language switcher */}
      <div style={{ padding:"0 14px 14px" }}>
        <div style={{ display:"flex", gap:6, background:T.bg, borderRadius:10, padding:4 }}>
          {Object.entries(LOCALES).map(([key,cfg])=>(
            <button key={key} onClick={()=>setLang(key)} style={{ flex:1, padding:"7px 0", borderRadius:7, border:"none",
              background:lang===key?T.accent:"transparent", color:lang===key?"#000":T.textSecondary,
              fontSize:12, fontWeight:700, cursor:"pointer", transition:"all .18s", fontFamily:"inherit" }}>{cfg.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"14px 20px 0", borderTop:`1px solid ${T.cardBorder}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
          <Wifi size={13} color={T.green}/>
          <span style={{ fontSize:12, color:T.green, fontWeight:600 }}>{t("status.online")}</span>
        </div>
        <div style={{ fontSize:11, color:T.textSecondary }}>{t("common.zonesPanels",{z:zones.length,p:zones.reduce((s,z)=>s+z.panels,0)})}</div>
        <div style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>{t("common.kwInstalled",{cap:zones.reduce((s,z)=>s+z.capacity,0).toFixed(1)})}</div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function SolarWashPro(){
  const [lang,setLang]=useState("ru");
  const [view,setView]=useState("dashboard");
  const [zones,setZones]=useState(INITIAL_ZONES);
  const [schedules,setSchedules]=useState(INITIAL_SCHEDULES);

  const locale=LOCALES[lang].code;
  const dir=LOCALES[lang].dir;
  const t=(key,params)=>translate(lang,key,params);

  const handleWash=id=>setZones(p=>p.map(z=>z.id===id?{...z,lastWash:"justNow",efficiency:Math.min(z.efficiency+23,97),status:"clean"}:z));

  const views={
    dashboard:<Dashboard zones={zones} schedules={schedules} onWash={handleWash}/>,
    zones:<ZonesView zones={zones} setZones={setZones}/>,
    schedule:<ScheduleView zones={zones} schedules={schedules} setSchedules={setSchedules}/>,
    analytics:<AnalyticsView zones={zones}/>,
    ai:<AIView zones={zones}/>,
  };

  return (
    <LocaleCtx.Provider value={{ lang, setLang, locale, dir, t }}>
      <div dir={dir} lang={lang} style={{ display:"flex", height:"100vh", background:T.bg, color:T.textPrimary,
        overflow:"hidden", fontFamily:"'Segoe UI', 'Arial', system-ui, -apple-system, sans-serif" }}>
        <Sidebar active={view} setActive={setView} zones={zones}/>
        <div style={{ flex:1, overflow:"auto" }}>{views[view]}</div>
      </div>
    </LocaleCtx.Provider>
  );
}
