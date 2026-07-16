import { useState, useRef, useEffect, useMemo, createContext, useContext } from "react";
import {
  LayoutDashboard, Cpu, Grid, Calendar, BarChart3, Bot, Plus, Sun, AlertTriangle,
  CheckCircle, TrendingUp, TrendingDown, X, Trash2, Zap, Droplets, Send, RefreshCw,
  Wifi, Activity, Gauge, Thermometer, Plug, Power, Settings, SunMedium, CloudSun,
  Compass, Crosshair, CloudRain, Pencil
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const BACKEND_BASE = "";                       // set to your proxy → app uses real data; empty → demo
const INVERTER_API = `${BACKEND_BASE}/api/inverters`;
const AI_ENDPOINT  = BACKEND_BASE ? `${BACKEND_BASE}/api/chat` : "https://api.anthropic.com/v1/messages";
const DEFAULT_SITE = { lat:31.78, lon:35.21, albedo:0.2, livePOA:false }; // Jerusalem

// ─── THEME ──────────────────────────────────────────────────────────────────
const T = { bg:"#06080E", panel:"#0A111E", card:"#0C1422", cardBorder:"#182138", accent:"#F59E0B", green:"#10B981", red:"#EF4444", blue:"#3B82F6", purple:"#8B5CF6", cyan:"#06B6D4", textPrimary:"#F1F5F9", textSecondary:"#64748B", textMuted:"#2D3E58" };

// ─── i18n ─────────────────────────────────────────────────────────────────────
const LOCALES = { ru:{code:"ru-RU",dir:"ltr",label:"RU"}, en:{code:"en-US",dir:"ltr",label:"EN"}, he:{code:"he-IL",dir:"rtl",label:"עב"} };
const I18N = {
  en:{
    "nav.dashboard":"Dashboard","nav.inverters":"Inverters","nav.zones":"Zones","nav.schedule":"Schedule","nav.analytics":"Analytics","nav.ai":"AI Assistant",
    "brand.tag":"WEB · O&M","side.live":"Live","side.offline":"Offline","side.currentAc":"current AC output","side.settings":"Site settings",
    "mode.live":"Live backend","mode.demo":"Demo data","status.clean":"Clean","status.dirty":"Soiled","status.critical":"Critical","status.idle":"Idle",
    "dash.title":"Live Dashboard","dash.sub":"{n} inverters · {s} strings · real-time telemetry · {mode}",
    "dash.criticalAlert":"Soiling critical on {zones} — performance below 65%","dash.cleanAll":"Clean all critical",
    "st.acPower":"AC POWER","st.expected":"expected {v}","st.energyToday":"ENERGY TODAY","st.allInverters":"all inverters","st.avgPerf":"AVG PERFORMANCE","st.perfRatio":"performance ratio","st.soilingLoss":"SOILING LOSS","st.perDay":"≈ ${v}/day","st.poa":"AVG POA","st.irrSource":"source: {s}",
    "dash.powerChart":"SYSTEM POWER · ACTUAL vs EXPECTED (live)","lg.actual":"Actual AC output","lg.expected":"Expected (clean potential)","dash.fleetPR":"FLEET PERFORMANCE RATIO","ring.pr":"PR","dash.optimal":"✓ Optimal output","dash.recommend":"⚠ Cleaning recommended","dash.significant":"✗ Significant soiling loss","dash.stringStatus":"STRING STATUS","btn.clean":"Clean",
    "irr.ghi":"GHI","irr.poa":"POA","irr.elev":"Sun elevation","irr.modeled":"modeled","irr.live":"live",
    "site.title":"Site & Irradiance","site.lat":"Latitude","site.lon":"Longitude","site.albedo":"Ground albedo","site.usePoa":"Use live weather (POA)","site.usePoaDesc":"Fetch real irradiance from Open-Meteo. POA is computed per array from each string's tilt/azimuth.","site.save":"Save settings","site.perArray":"Tilt & azimuth are set per array on each zone card.",
    "inv.title":"Inverter Integrations","inv.sub":"Connect inverters via vendor APIs — data normalizes to a common schema","inv.connect":"Connect inverter","inv.supported":"SUPPORTED ADAPTERS","inv.none":"No inverters connected. Click “Connect inverter” to start.","inv.acPower":"AC Power","inv.dcInput":"DC Input","inv.energyToday":"Energy Today","inv.temp":"Temp",
    "tbl.string":"STRING","tbl.power":"POWER","tbl.voltage":"VOLTAGE","tbl.orient":"TILT/AZ","tbl.pr":"PR","tbl.status":"STATUS",
    "inv.vendor":"Vendor","inv.displayName":"Display name","inv.demoNote":"Demo mode: a live simulator starts immediately. In production these credentials hit {ep} on your backend (see INVERTERS.md).","modal.connectTitle":"Connect inverter","modal.connectSub":"Credentials are sent to your backend connector","btn.connect":"Connect",
    "zones.title":"Cleaning Zones","zones.sub":"Each zone maps to an inverter string · POA & PR computed per array orientation","zones.via":"via {v}","zones.output":"Output","zones.potential":"Potential","zones.perfRatio":"Performance ratio","zones.cleanNow":"Clean now","zones.scheduled":"Scheduled clean","zones.cleaning":"Cleaning…","zones.idleNight":"Idle — no irradiance","zones.orient":"Orientation","zones.poaTag":"POA",
    "orient.title":"Array orientation","orient.tilt":"Tilt (°)","orient.azimuth":"Azimuth (° from North)","orient.hint":"180° = South · 90° = East · 270° = West","orient.save":"Save","orient.edit":"Edit orientation","orient.auto":"Auto-detect",
    "lab.title":"Orientation auto-calibration","lab.desc":"Recovers tilt & azimuth purely from the array's clear-day production curve — no manual input, no datasheet. (Demo: profile synthesized from this array's orientation + measurement noise, then estimated blind.)","lab.run":"Run estimation","lab.running":"Fitting curve…","lab.configured":"Configured","lab.detected":"Detected","lab.err":"Error","lab.rmse":"Fit RMSE","lab.fit":"Measured vs fitted production (clear day)","lab.measured":"Measured","lab.fitted":"Fitted","lab.apply":"Apply detected orientation","lab.method":"Method: grid-search over tilt×azimuth, transposing a clear-sky model to each candidate and minimizing shape RMSE vs the measured curve.",
    "sched.title":"Cleaning Schedule","sched.sub":"Smart peak-hour protection (09:00–17:00) — never clean during peak generation","sched.smart":"SMART AUTOMATION","sched.peak":"Peak-hour protection","sched.peakDesc":"Block cleaning between 09:00 and 17:00 to protect generation","sched.rain":"Rain delay","sched.rainDesc":"Skip cleaning when rain is forecast within 48h","sched.dust":"Dust-storm auto-clean","sched.dustDesc":"Trigger cleaning automatically after dust events","sched.min":"{n} min","sched.removed":"— (string removed)",
    "fc.title":"7-DAY WEATHER FORECAST","fc.source":"source: {s}","fc.loading":"Loading forecast…","fc.unavailable":"Forecast unavailable","fc.rain":"Rain — natural cleaning","fc.clean":"Good cleaning window","fc.normal":"Normal","fc.recommend":"Recommendation: {r}","fc.nextRain":"Rain expected {d} — scheduled cleanings will be deferred","fc.dryClean":"Dry & clear ahead — good window to clean soiled arrays","fc.today":"Today",
    "ai.title":"AI Assistant","ai.sub":"Powered by Claude · reads your live inverter telemetry","ai.greeting":"Connected to {inv} inverter(s), {s} strings. Live AC {ac}, fleet PR {pr}%. {extra} Ask me anything about soiling, scheduling or your inverter data.","ai.needs":"{n} string(s) need cleaning: {names}.","ai.good":"All strings performing well.","ai.q1":"Which string is losing the most energy?","ai.q2":"Is the soiling worth cleaning today?","ai.q3":"Should I clean before the forecast rain?","ai.q4":"Best cleaning schedule for these strings","ai.placeholder":"Ask about your fleet…","ai.err":"Connection error. Check your network.","ai.langInstr":"Respond in English.",
    "day.Mon":"Mon","day.Tue":"Tue","day.Wed":"Wed","day.Thu":"Thu","day.Fri":"Fri","day.Sat":"Sat","day.Sun":"Sun",
  },
  ru:{
    "nav.dashboard":"Обзор","nav.inverters":"Инверторы","nav.zones":"Зоны","nav.schedule":"Расписание","nav.analytics":"Аналитика","nav.ai":"AI-ассистент",
    "brand.tag":"WEB · O&M","side.live":"Онлайн","side.offline":"Офлайн","side.currentAc":"текущая AC мощность","side.settings":"Настройки объекта",
    "mode.live":"Реальный бэкенд","mode.demo":"Демо-данные","status.clean":"Чисто","status.dirty":"Загрязнено","status.critical":"Критично","status.idle":"Простой",
    "dash.title":"Живой обзор","dash.sub":"{n} инверторов · {s} строк · телеметрия в реальном времени · {mode}",
    "dash.criticalAlert":"Критическое загрязнение: {zones} — эффективность ниже 65%","dash.cleanAll":"Помыть все критичные",
    "st.acPower":"AC МОЩНОСТЬ","st.expected":"ожидается {v}","st.energyToday":"ВЫРАБОТКА СЕГОДНЯ","st.allInverters":"все инверторы","st.avgPerf":"СРЕДНИЙ PR","st.perfRatio":"performance ratio","st.soilingLoss":"ПОТЕРЯ ОТ ГРЯЗИ","st.perDay":"≈ ${v}/день","st.poa":"СРЕДНИЙ POA","st.irrSource":"источник: {s}",
    "dash.powerChart":"МОЩНОСТЬ · ФАКТ vs ОЖИДАЕМАЯ (live)","lg.actual":"Фактическая AC","lg.expected":"Ожидаемая (чистый потенциал)","dash.fleetPR":"PERFORMANCE RATIO ФЛОТА","ring.pr":"PR","dash.optimal":"✓ Оптимальная выработка","dash.recommend":"⚠ Рекомендована мойка","dash.significant":"✗ Значительные потери от грязи","dash.stringStatus":"СОСТОЯНИЕ СТРОК","btn.clean":"Мойка",
    "irr.ghi":"GHI","irr.poa":"POA","irr.elev":"Высота солнца","irr.modeled":"модель","irr.live":"live",
    "site.title":"Объект и инсоляция","site.lat":"Широта","site.lon":"Долгота","site.albedo":"Альбедо поверхности","site.usePoa":"Реальная погода (POA)","site.usePoaDesc":"Брать реальную инсоляцию из Open-Meteo. POA считается отдельно для каждого массива по его наклону/азимуту.","site.save":"Сохранить","site.perArray":"Наклон и азимут задаются для каждого массива на карточке зоны.",
    "inv.title":"Интеграция инверторов","inv.sub":"Подключение инверторов через API вендоров — данные нормализуются в единую схему","inv.connect":"Подключить инвертор","inv.supported":"ПОДДЕРЖИВАЕМЫЕ АДАПТЕРЫ","inv.none":"Нет подключённых инверторов. Нажмите «Подключить инвертор».","inv.acPower":"AC мощность","inv.dcInput":"DC вход","inv.energyToday":"Выработка сегодня","inv.temp":"Темп.",
    "tbl.string":"СТРОКА","tbl.power":"МОЩНОСТЬ","tbl.voltage":"НАПРЯЖЕНИЕ","tbl.orient":"НАКЛ/АЗ","tbl.pr":"PR","tbl.status":"СТАТУС",
    "inv.vendor":"Вендор","inv.displayName":"Название","inv.demoNote":"Демо-режим: симулятор стартует сразу. В проде эти креды идут на {ep} вашего бэкенда (см. INVERTERS.md).","modal.connectTitle":"Подключить инвертор","modal.connectSub":"Креды отправляются на ваш бэкенд-коннектор","btn.connect":"Подключить",
    "zones.title":"Зоны мойки","zones.sub":"Каждая зона = строка инвертора · POA и PR считаются по ориентации каждого массива","zones.via":"через {v}","zones.output":"Выход","zones.potential":"Потенциал","zones.perfRatio":"Performance ratio","zones.cleanNow":"Помыть сейчас","zones.scheduled":"Плановая мойка","zones.cleaning":"Мойка…","zones.idleNight":"Простой — нет инсоляции","zones.orient":"Ориентация","zones.poaTag":"POA",
    "orient.title":"Ориентация массива","orient.tilt":"Наклон (°)","orient.azimuth":"Азимут (° от севера)","orient.hint":"180° = Юг · 90° = Восток · 270° = Запад","orient.save":"Сохранить","orient.edit":"Изменить ориентацию","orient.auto":"Авто-определение",
    "lab.title":"Авто-калибровка ориентации","lab.desc":"Восстанавливает наклон и азимут только по форме суточной кривой выработки на ясный день — без ручного ввода и даташита. (Демо: профиль синтезирован из ориентации этого массива + шум измерений, затем оценён вслепую.)","lab.run":"Запустить оценку","lab.running":"Подгонка кривой…","lab.configured":"Задано","lab.detected":"Определено","lab.err":"Ошибка","lab.rmse":"RMSE подгонки","lab.fit":"Измеренная vs подогнанная выработка (ясный день)","lab.measured":"Измерено","lab.fitted":"Подгонка","lab.apply":"Применить найденную ориентацию","lab.method":"Метод: перебор по сетке наклон×азимут, транспозиция clear-sky модели на каждого кандидата и минимизация RMSE формы относительно измеренной кривой.",
    "sched.title":"Расписание мойки","sched.sub":"Умная защита пиковых часов (09:00–17:00) — не мыть во время пиковой выработки","sched.smart":"УМНАЯ АВТОМАТИЗАЦИЯ","sched.peak":"Защита пиковых часов","sched.peakDesc":"Блокировать мойку с 09:00 до 17:00","sched.rain":"Отсрочка при дожде","sched.rainDesc":"Пропускать мойку при прогнозе дождя в 48ч","sched.dust":"Авто-мойка при пыли","sched.dustDesc":"Запуск мойки после пыльных бурь","sched.min":"{n} мин","sched.removed":"— (строка удалена)",
    "fc.title":"ПРОГНОЗ ПОГОДЫ НА 7 ДНЕЙ","fc.source":"источник: {s}","fc.loading":"Загрузка прогноза…","fc.unavailable":"Прогноз недоступен","fc.rain":"Дождь — естественная мойка","fc.clean":"Хорошее окно для мойки","fc.normal":"Норма","fc.recommend":"Рекомендация: {r}","fc.nextRain":"Ожидается дождь {d} — плановые мойки будут отложены","fc.dryClean":"Впереди сухо и ясно — хорошее окно помыть грязные массивы","fc.today":"Сегодня",
    "ai.title":"AI-ассистент","ai.sub":"На базе Claude · читает живую телеметрию инверторов","ai.greeting":"Подключено инверторов: {inv}, строк: {s}. Текущая AC {ac}, PR флота {pr}%. {extra} Спрашивайте про загрязнение, расписание или данные инверторов.","ai.needs":"Требуют мойки: {names} ({n}).","ai.good":"Все строки работают хорошо.","ai.q1":"Какая строка теряет больше всего энергии?","ai.q2":"Стоит ли мыть сегодня?","ai.q3":"Помыть до прогнозируемого дождя?","ai.q4":"Лучшее расписание мойки для этих строк","ai.placeholder":"Спросите про ваш флот…","ai.err":"Ошибка соединения. Проверьте сеть.","ai.langInstr":"Отвечай на русском.",
    "day.Mon":"Пн","day.Tue":"Вт","day.Wed":"Ср","day.Thu":"Чт","day.Fri":"Пт","day.Sat":"Сб","day.Sun":"Вс",
  },
  he:{
    "nav.dashboard":"לוח בקרה","nav.inverters":"ממירים","nav.zones":"אזורים","nav.schedule":"תזמון","nav.analytics":"אנליטיקה","nav.ai":"עוזר AI",
    "brand.tag":"WEB · O&M","side.live":"חי","side.offline":"לא מקוון","side.currentAc":"הספק AC נוכחי","side.settings":"הגדרות אתר",
    "mode.live":"שרת אמיתי","mode.demo":"נתוני דמו","status.clean":"נקי","status.dirty":"מלוכלך","status.critical":"קריטי","status.idle":"במנוחה",
    "dash.title":"לוח בקרה חי","dash.sub":"{n} ממירים · {s} מחרוזות · טלמטריה בזמן אמת · {mode}",
    "dash.criticalAlert":"לכלוך קריטי ב-{zones} — ביצועים מתחת ל-65%","dash.cleanAll":"נקה את כל הקריטיים",
    "st.acPower":"הספק AC","st.expected":"צפוי {v}","st.energyToday":"אנרגיה היום","st.allInverters":"כל הממירים","st.avgPerf":"PR ממוצע","st.perfRatio":"performance ratio","st.soilingLoss":"אובדן מלכלוך","st.perDay":"≈ ${v}/יום","st.poa":"POA ממוצע","st.irrSource":"מקור: {s}",
    "dash.powerChart":"הספק · בפועל מול צפוי (חי)","lg.actual":"הספק AC בפועל","lg.expected":"צפוי (פוטנציאל נקי)","dash.fleetPR":"PERFORMANCE RATIO של הצי","ring.pr":"PR","dash.optimal":"✓ תפוקה אופטימלית","dash.recommend":"⚠ מומלץ ניקוי","dash.significant":"✗ אובדן משמעותי מלכלוך","dash.stringStatus":"מצב מחרוזות","btn.clean":"נקה",
    "irr.ghi":"GHI","irr.poa":"POA","irr.elev":"גובה השמש","irr.modeled":"מודל","irr.live":"חי",
    "site.title":"אתר וקרינה","site.lat":"קו רוחב","site.lon":"קו אורך","site.albedo":"אלבדו קרקע","site.usePoa":"מזג אוויר חי (POA)","site.usePoaDesc":"משוך קרינה אמיתית מ-Open-Meteo. POA מחושב לכל מערך לפי השיפוע/אזימוט שלו.","site.save":"שמור","site.perArray":"שיפוע ואזימוט נקבעים לכל מערך בכרטיס האזור.",
    "inv.title":"אינטגרציית ממירים","inv.sub":"חבר ממירים דרך API של יצרנים — הנתונים מנורמלים לסכמה אחת","inv.connect":"חבר ממיר","inv.supported":"מתאמים נתמכים","inv.none":"אין ממירים מחוברים. לחץ “חבר ממיר”.","inv.acPower":"הספק AC","inv.dcInput":"כניסת DC","inv.energyToday":"אנרגיה היום","inv.temp":"טמפ׳",
    "tbl.string":"מחרוזת","tbl.power":"הספק","tbl.voltage":"מתח","tbl.orient":"שיפוע/אז","tbl.pr":"PR","tbl.status":"סטטוס",
    "inv.vendor":"יצרן","inv.displayName":"שם תצוגה","inv.demoNote":"מצב דמו: סימולטור חי מתחיל מיד. בפרודקשן הפרטים נשלחים אל {ep} בשרת שלך (ראה INVERTERS.md).","modal.connectTitle":"חבר ממיר","modal.connectSub":"הפרטים נשלחים למחבר בצד השרת","btn.connect":"חבר",
    "zones.title":"אזורי ניקוי","zones.sub":"כל אזור = מחרוזת ממיר · POA ו-PR מחושבים לפי כיוון כל מערך","zones.via":"דרך {v}","zones.output":"תפוקה","zones.potential":"פוטנציאל","zones.perfRatio":"Performance ratio","zones.cleanNow":"נקה עכשיו","zones.scheduled":"ניקוי מתוזמן","zones.cleaning":"מנקה…","zones.idleNight":"במנוחה — אין קרינה","zones.orient":"כיוון","zones.poaTag":"POA",
    "orient.title":"כיוון מערך","orient.tilt":"שיפוע (°)","orient.azimuth":"אזימוט (° מצפון)","orient.hint":"180° = דרום · 90° = מזרח · 270° = מערב","orient.save":"שמור","orient.edit":"ערוך כיוון","orient.auto":"זיהוי אוטומטי",
    "lab.title":"כיול כיוון אוטומטי","lab.desc":"משחזר שיפוע ואזימוט אך ורק מצורת עקומת הייצור של המערך ביום בהיר — ללא קלט ידני. (דמו: הפרופיל סונתז מכיוון המערך + רעש מדידה, ואז הוערך בעיוורון.)","lab.run":"הרץ הערכה","lab.running":"מתאים עקומה…","lab.configured":"מוגדר","lab.detected":"זוהה","lab.err":"שגיאה","lab.rmse":"RMSE התאמה","lab.fit":"מדידה מול התאמה (יום בהיר)","lab.measured":"נמדד","lab.fitted":"התאמה","lab.apply":"החל כיוון שזוהה","lab.method":"שיטה: חיפוש רשת על שיפוע×אזימוט, טרנספוזיציה של מודל שמיים בהירים לכל מועמד ומזעור RMSE של הצורה מול העקומה הנמדדת.",
    "sched.title":"תזמון ניקוי","sched.sub":"הגנת שעות שיא (09:00–17:00) — לא לנקות בזמן ייצור שיא","sched.smart":"אוטומציה חכמה","sched.peak":"הגנת שעות שיא","sched.peakDesc":"חסום ניקוי בין 09:00 ל-17:00","sched.rain":"דחייה בגשם","sched.rainDesc":"דלג על ניקוי אם צפוי גשם ב-48ש","sched.dust":"ניקוי אוטומטי בסופת אבק","sched.dustDesc":"הפעל ניקוי אוטומטית אחרי אירועי אבק","sched.min":"{n} דק׳","sched.removed":"— (מחרוזת הוסרה)",
    "fc.title":"תחזית מזג אוויר ל-7 ימים","fc.source":"מקור: {s}","fc.loading":"טוען תחזית…","fc.unavailable":"תחזית לא זמינה","fc.rain":"גשם — ניקוי טבעי","fc.clean":"חלון ניקוי טוב","fc.normal":"רגיל","fc.recommend":"המלצה: {r}","fc.nextRain":"צפוי גשם {d} — ניקויים מתוזמנים יידחו","fc.dryClean":"יבש ובהיר לפנינו — חלון טוב לנקות מערכים מלוכלכים","fc.today":"היום",
    "ai.title":"עוזר AI","ai.sub":"מבוסס Claude · קורא טלמטריה חיה של הממירים","ai.greeting":"מחוברים {inv} ממירים, {s} מחרוזות. הספק AC {ac}, PR של הצי {pr}%. {extra} שאל אותי על לכלוך, תזמון או נתוני הממירים.","ai.needs":"דורשות ניקוי: {names} ({n}).","ai.good":"כל המחרוזות מתפקדות היטב.","ai.q1":"איזו מחרוזת מאבדת הכי הרבה אנרגיה?","ai.q2":"האם כדאי לנקות היום?","ai.q3":"לנקות לפני הגשם הצפוי?","ai.q4":"התזמון הטוב ביותר לניקוי המחרוזות","ai.placeholder":"שאל על הצי שלך…","ai.err":"שגיאת חיבור. בדוק את הרשת.","ai.langInstr":"ענה בעברית.",
    "day.Mon":"ב׳","day.Tue":"ג׳","day.Wed":"ד׳","day.Thu":"ה׳","day.Fri":"ו׳","day.Sat":"שבת","day.Sun":"א׳",
  },
};
const LocaleCtx = createContext(null);
const useT = () => useContext(LocaleCtx);
function translate(lang,key,p){ let s=(I18N[lang]&&I18N[lang][key])??I18N.en[key]??key; if(p) for(const k in p) s=s.split(`{${k}}`).join(p[k]); return s; }

// ─── VENDOR REGISTRY ──────────────────────────────────────────────────────────
const VENDORS = {
  solaredge:{ name:"SolarEdge", color:"#E03127", txt:"#fff", kw:12.6, strings:4, fields:[["apiKey","API Key"],["siteId","Site ID"]], api:"Monitoring API · /site/{id}/power" },
  fronius:{ name:"Fronius", color:"#FFCB05", txt:"#000", kw:8.2, strings:2, fields:[["host","Inverter IP / host"]], api:"Local Solar API · GetInverterRealtimeData" },
  huawei:{ name:"Huawei FusionSolar", color:"#CF0A2C", txt:"#fff", kw:10.0, strings:3, fields:[["username","API Username"],["systemCode","System Code"],["stationCode","Plant Code"]], api:"NorthBound API · getDevRealKpi" },
  sma:{ name:"SMA", color:"#00A8E0", txt:"#fff", kw:7.5, strings:2, fields:[["host","Modbus TCP host"]], api:"Modbus / SunSpec" },
  enphase:{ name:"Enphase", color:"#F47920", txt:"#fff", kw:9.8, strings:4, fields:[["apiKey","API Key"],["accessToken","OAuth Token"],["systemId","System ID"]], api:"Enlighten API v4 · OAuth2" },
  growatt:{ name:"Growatt", color:"#E60012", txt:"#fff", kw:6.0, strings:2, fields:[["username","Username"],["password","Password"]], api:"ShineServer API" },
  sunspec:{ name:"Generic SunSpec / Modbus", color:"#64748B", txt:"#fff", kw:9.0, strings:3, fields:[["host","Modbus TCP host"],["port","Port (502)"],["unitId","Unit ID"]], api:"SunSpec model 103/160" },
};
const ARRAY_NAMES = ["Array A — South","Array B — West","Array C — East","Array D — North","Carport","Ground Mount"];
const DEFAULT_ORIENT = [{tilt:30,azimuth:180},{tilt:25,azimuth:270},{tilt:25,azimuth:90},{tilt:30,azimuth:0},{tilt:8,azimuth:180},{tilt:20,azimuth:180}];

// ─── SOLAR POSITION (NOAA) + POA + CLEAR-SKY ──────────────────────────────────
function solarPosition(date, latDeg, lonDeg){
  const rad=Math.PI/180, deg=180/Math.PI;
  const jday=(date.getTime()/86400000)+2440587.5, jc=(jday-2451545)/36525;
  const gmls=((280.46646+jc*(36000.76983+jc*0.0003032))%360+360)%360;
  const gmas=357.52911+jc*(35999.05029-0.0001537*jc);
  const eeo=0.016708634-jc*(0.000042037+0.0000001267*jc);
  const seqc=Math.sin(gmas*rad)*(1.914602-jc*(0.004817+0.000014*jc))+Math.sin(2*gmas*rad)*(0.019993-0.000101*jc)+Math.sin(3*gmas*rad)*0.000289;
  const sal=gmls+seqc-0.00569-0.00478*Math.sin((125.04-1934.136*jc)*rad);
  const moe=23+(26+((21.448-jc*(46.815+jc*(0.00059-jc*0.001813))))/60)/60;
  const oc=moe+0.00256*Math.cos((125.04-1934.136*jc)*rad);
  const declin=Math.asin(Math.sin(oc*rad)*Math.sin(sal*rad))*deg;
  const vary=Math.tan((oc/2)*rad)**2;
  const eqtime=4*deg*(vary*Math.sin(2*gmls*rad)-2*eeo*Math.sin(gmas*rad)+4*eeo*vary*Math.sin(gmas*rad)*Math.cos(2*gmls*rad)-0.5*vary*vary*Math.sin(4*gmls*rad)-1.25*eeo*eeo*Math.sin(2*gmas*rad));
  const minutes=date.getUTCHours()*60+date.getUTCMinutes()+date.getUTCSeconds()/60;
  const tst=((minutes+eqtime+4*lonDeg)%1440+1440)%1440;
  let ha=tst/4-180; if(ha<-180) ha+=360;
  const lat=latDeg*rad;
  const zen=Math.acos(Math.max(-1,Math.min(1,Math.sin(lat)*Math.sin(declin*rad)+Math.cos(lat)*Math.cos(declin*rad)*Math.cos(ha*rad))))*deg;
  const elev=90-zen, denom=Math.cos(lat)*Math.sin(zen*rad);
  let cosAz=denom!==0?(Math.sin(lat)*Math.cos(zen*rad)-Math.sin(declin*rad))/denom:0;
  cosAz=Math.max(-1,Math.min(1,cosAz));
  let az=Math.acos(cosAz)*deg; az=ha>0?(az+180)%360:(540-az)%360;
  return { zenithDeg:zen, elevationDeg:elev, azimuthDeg:az };
}
function computePOA(ghi,dni,dhi,zenDeg,sunAzDeg,tiltDeg,panelAzDeg,albedo){
  const rad=Math.PI/180;
  const cosAOI=Math.max(0, Math.cos(zenDeg*rad)*Math.cos(tiltDeg*rad)+Math.sin(zenDeg*rad)*Math.sin(tiltDeg*rad)*Math.cos((sunAzDeg-panelAzDeg)*rad));
  return Math.max(0, dni*cosAOI + dhi*(1+Math.cos(tiltDeg*rad))/2 + ghi*albedo*(1-Math.cos(tiltDeg*rad))/2);
}
// Simple clear-sky model (Kasten-Young air mass) — used only for orientation fitting.
function clearSky(zenithDeg){
  const cosz=Math.max(0,Math.cos(zenithDeg*Math.PI/180));
  if(cosz<=0.01) return { ghi:0, dni:0, dhi:0 };
  const AM=1/(cosz+0.50572*Math.pow(Math.max(0.1,96.07995-zenithDeg),-1.6364));
  const dni=900*Math.pow(0.7, Math.pow(AM,0.678));
  const dhi=0.10*dni*cosz+8;
  return { ghi:dni*cosz+dhi, dni, dhi };
}

// ─── ORIENTATION AUTO-ESTIMATOR ───────────────────────────────────────────────
// Synthesize a clear-day production curve from a known orientation (the "measured" data).
function syntheticDayProfile(lat, lon, tilt, az, albedo){
  const samples=[]; const base=new Date(); base.setUTCHours(0,0,0,0);
  for(let m=0;m<1440;m+=20){
    const date=new Date(base.getTime()+m*60000);
    const sp=solarPosition(date,lat,lon);
    if(sp.elevationDeg<4) continue;
    const cs=clearSky(sp.zenithDeg);
    const poa=computePOA(cs.ghi,cs.dni,cs.dhi,sp.zenithDeg,sp.azimuthDeg,tilt,az,albedo);
    samples.push({ date, power: poa*(0.94+Math.random()*0.12) }); // measurement noise + soiling scale
  }
  return samples;
}
// Recover tilt & azimuth from a production curve by grid-search + shape RMSE.
function estimateOrientation(samples, lat, lon, albedo){
  const meas=samples.map(s=>s.power), mMax=Math.max(...meas,1e-9), measN=meas.map(v=>v/mMax);
  let best={ tilt:30, azimuth:180, rmse:Infinity };
  for(let tilt=0; tilt<=60; tilt+=3){
    for(let az=80; az<=280; az+=3){
      let se=0; const mod=new Array(samples.length); let modMax=1e-9;
      for(let i=0;i<samples.length;i++){
        const sp=solarPosition(samples[i].date,lat,lon); const cs=clearSky(sp.zenithDeg);
        const v=computePOA(cs.ghi,cs.dni,cs.dhi,sp.zenithDeg,sp.azimuthDeg,tilt,az,albedo);
        mod[i]=v; if(v>modMax) modMax=v;
      }
      for(let i=0;i<mod.length;i++){ const d=mod[i]/modMax-measN[i]; se+=d*d; }
      const rmse=Math.sqrt(se/mod.length);
      if(rmse<best.rmse) best={ tilt, azimuth:az, rmse };
    }
  }
  // build fit profile for the chart (local-hour x-axis)
  const modMaxArr=samples.map(s=>{ const sp=solarPosition(s.date,lat,lon); const cs=clearSky(sp.zenithDeg); return computePOA(cs.ghi,cs.dni,cs.dhi,sp.zenithDeg,sp.azimuthDeg,best.tilt,best.azimuth,albedo); });
  const fitMax=Math.max(...modMaxArr,1e-9);
  const profile=samples.map((s,i)=>({ h:+(s.date.getUTCHours()+s.date.getUTCMinutes()/60).toFixed(2), measured:+(measN[i]*100).toFixed(1), fitted:+(modMaxArr[i]/fitMax*100).toFixed(1) }));
  return { ...best, rmse:+(best.rmse*100).toFixed(1), profile };
}

// ─── IRRADIANCE HOOK (sky only; POA computed per-string) ──────────────────────
function useIrradiance(site){
  const [s,setS]=useState({ ghi:900, dni:780, dhi:120, zenithDeg:35, sunAzDeg:180, elevationDeg:55, albedo:site.albedo, source:"modeled", live:false });
  const tRef=useRef(Math.random()*100);
  useEffect(()=>{
    let stop=false;
    if(!site.livePOA){
      const id=setInterval(()=>{
        tRef.current+=2; const t=tRef.current;
        const elevationDeg=52+8*Math.sin(t/30), sunAzDeg=(180+62*Math.sin(t/45)+360)%360, clear=0.92+0.05*Math.sin(t/9);
        setS({ ghi:Math.round(950*clear), dni:Math.round(820*clear), dhi:Math.round(120*clear), zenithDeg:90-elevationDeg, sunAzDeg, elevationDeg:Math.round(elevationDeg), albedo:site.albedo, source:"modeled", live:false });
      },2000);
      return ()=>clearInterval(id);
    }
    const run=async()=>{
      try{
        const u=`https://api.open-meteo.com/v1/forecast?latitude=${site.lat}&longitude=${site.lon}&hourly=shortwave_radiation,direct_normal_irradiance,diffuse_radiation&forecast_days=1&timezone=UTC`;
        const d=await (await fetch(u)).json(); const now=new Date(); const stamp=now.toISOString().slice(0,13);
        let idx=d.hourly.time.findIndex(x=>x.startsWith(stamp)); if(idx<0) idx=now.getUTCHours();
        const ghi=d.hourly.shortwave_radiation[idx]||0, dni=d.hourly.direct_normal_irradiance[idx]||0, dhi=d.hourly.diffuse_radiation[idx]||0;
        const sp=solarPosition(now, site.lat, site.lon);
        if(!stop) setS({ ghi:Math.round(ghi), dni:Math.round(dni), dhi:Math.round(dhi), zenithDeg:sp.zenithDeg, sunAzDeg:sp.azimuthDeg, elevationDeg:Math.round(sp.elevationDeg), albedo:site.albedo, source:"live · Open-Meteo", live:true });
      }catch{ if(!stop) setS(p=>({ ...p, source:"modeled · fetch failed", live:false })); }
    };
    run(); const id=setInterval(run,600000); return ()=>{ stop=true; clearInterval(id); };
  },[site.livePOA,site.lat,site.lon,site.albedo]);
  return s;
}

// ─── WEATHER FORECAST HOOK (Open-Meteo, open data) ────────────────────────────
function useForecast(site){
  const [fc,setFc]=useState({ days:[], loading:true, source:"Open-Meteo" });
  useEffect(()=>{
    let stop=false; setFc(f=>({ ...f, loading:true }));
    (async()=>{
      try{
        const u=`https://api.open-meteo.com/v1/forecast?latitude=${site.lat}&longitude=${site.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,shortwave_radiation_sum&forecast_days=7&timezone=auto`;
        const d=await (await fetch(u)).json();
        const days=d.daily.time.map((t,i)=>({ date:t, code:d.daily.weather_code[i], tmax:Math.round(d.daily.temperature_2m_max[i]), tmin:Math.round(d.daily.temperature_2m_min[i]), precip:d.daily.precipitation_sum[i]??0, precipProb:d.daily.precipitation_probability_max[i]??0, rad:Math.round(d.daily.shortwave_radiation_sum[i]??0) }));
        if(!stop) setFc({ days, loading:false, source:"live · Open-Meteo" });
      }catch{ if(!stop) setFc({ days:[], loading:false, source:"unavailable" }); }
    })();
    return ()=>{ stop=true; };
  },[site.lat,site.lon]);
  return fc;
}
const fcReco = d => (d.precipProb>=60||d.precip>=2) ? "rain" : (d.precip<0.2&&d.precipProb<20) ? "clean" : "normal";
function wxIcon(c){ if(c===0) return "☀️"; if([1,2].includes(c)) return "🌤️"; if(c===3) return "☁️"; if([45,48].includes(c)) return "🌫️"; if(c>=51&&c<=67) return "🌧️"; if(c>=71&&c<=77) return "❄️"; if(c>=80&&c<=82) return "🌦️"; if(c>=95) return "⛈️"; return "🌡️"; }

// ─── MOCK ENGINE (per-string POA factors) ─────────────────────────────────────
class MockEngine{
  constructor(capacityKw, soil){ this.capW=capacityKw*1000; this.n=soil.length; this.perStr=this.capW/this.n; this.soil=soil.slice(); this.energyWh=soil.map(()=>4000+Math.random()*6000); }
  tick(factors, dt=2){
    this.soil=this.soil.map(x=>Math.max(0.45,x-0.0009-Math.random()*0.0006));
    const strings=this.soil.map((s,i)=>{
      const f=Array.isArray(factors)?(factors[i]||0):factors;
      const acW=this.perStr*f*s*0.985, dcW=this.perStr*f*s; this.energyWh[i]+=acW*dt/3600;
      return { acW, dcW, voltage:Math.round(560+50*Math.sin(Date.now()/5000+i)), current:+(dcW/560).toFixed(1), energyWh:Math.round(this.energyWh[i]) };
    });
    const avgF=Array.isArray(factors)?factors.reduce((a,b)=>a+b,0)/Math.max(1,factors.length):factors;
    return { acPowerW:strings.reduce((a,b)=>a+b.acW,0), dcPowerW:strings.reduce((a,b)=>a+b.dcW,0), energyTodayWh:this.energyWh.reduce((a,b)=>a+b,0), tempC:Math.round(38+6*avgF+Math.random()*2), strings };
  }
  wash(i){ this.soil[i]=0.97; }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmtW=w=>w>=1000?`${(w/1000).toFixed(1)} kW`:`${Math.round(w)} W`;
const fmtKwh=wh=>`${(wh/1000).toFixed(1)} kWh`;
const prColor=p=>p>=85?T.green:p>=65?T.accent:T.red;
const prStatus=p=>p>=85?"clean":p>=65?"dirty":"critical";
const statusColor=s=>s==="clean"?T.green:s==="dirty"?T.accent:s==="critical"?T.red:T.textSecondary;
const COMPASS=["N","NE","E","SE","S","SW","W","NW"];
const azToCompass=az=>COMPASS[Math.round(((az%360)/45))%8];

// ─── FLEET HOOK ───────────────────────────────────────────────────────────────
const SEED=[{ id:"se-1", vendor:"solaredge", name:"Main Roof — SolarEdge", capacityKw:12.6, status:"online",
  strings:[{name:"Array A — South",tilt:30,azimuth:180},{name:"Array B — West",tilt:25,azimuth:270},{name:"Array C — East",tilt:25,azimuth:90},{name:"Carport",tilt:8,azimuth:180}], soil:[0.87,0.71,0.55,0.94] }];

function useFleet(sky){
  const [connectors,setConnectors]=useState(SEED);
  const [telemetry,setTelemetry]=useState({});
  const [powerHist,setPowerHist]=useState([]);
  const [mode,setMode]=useState("demo");
  const enginesRef=useRef({}); const skyRef=useRef(sky);
  useEffect(()=>{ skyRef.current=sky; },[sky]);

  useEffect(()=>{ if(!BACKEND_BASE) return; let ok=true;
    fetch(`${BACKEND_BASE}/health`).then(r=>{ if(r.ok&&ok) setMode("live"); }).catch(()=>{}); return ()=>{ ok=false; }; },[]);

  useEffect(()=>{
    const tick=async()=>{
      if(mode==="live"){
        try{ const data=await (await fetch(INVERTER_API)).json(); setTelemetry(data);
          const sysAc=Object.values(data).reduce((a,t)=>a+(t.acPowerW||0),0); setPowerHist(h=>[...h,{ac:Math.round(sysAc)}].slice(-30)); }catch{}
      } else {
        const sky=skyRef.current; const tel={}; let sysAc=0;
        for(const c of connectors){
          if(c.status!=="online") continue;
          if(!enginesRef.current[c.id]) enginesRef.current[c.id]=new MockEngine(c.capacityKw, c.soil||Array(c.strings.length).fill(0.92));
          const factors=c.strings.map(s=>computePOA(sky.ghi,sky.dni,sky.dhi,sky.zenithDeg,sky.sunAzDeg,s.tilt??30,s.azimuth??180,sky.albedo)/1000);
          const t=enginesRef.current[c.id].tick(factors,2); tel[c.id]=t; sysAc+=t.acPowerW;
        }
        for(const k of Object.keys(enginesRef.current)) if(!connectors.find(c=>c.id===k)) delete enginesRef.current[k];
        setTelemetry(tel); setPowerHist(h=>[...h,{ac:Math.round(sysAc)}].slice(-30));
      }
    };
    const id=setInterval(tick,2000); return ()=>clearInterval(id);
  },[connectors,mode]);

  // Per-string POA → expected → PR
  const zones=useMemo(()=>connectors.flatMap(c=>{
    const t=telemetry[c.id]; const N=c.strings.length; const perCapW=c.capacityKw*1000/N;
    return c.strings.map((s,i)=>{
      const tilt=s.tilt??30, azimuth=s.azimuth??180;
      const poa=computePOA(sky.ghi,sky.dni,sky.dhi,sky.zenithDeg,sky.sunAzDeg,tilt,azimuth,sky.albedo);
      const f=poa/1000, idle=f<0.06, expectedW=perCapW*f, acW=t?.strings?.[i]?.acW ?? 0;
      const pr=idle?null:(expectedW>1?Math.max(0,Math.min(120,Math.round(acW/expectedW*100))):null);
      return { id:`${c.id}:${i}`, connectorId:c.id, idx:i, name:s.name, tilt, azimuth, poa:Math.round(poa), vendor:c.vendor, vendorName:VENDORS[c.vendor].name, eff:pr??0, prNull:pr===null, acW, expectedW, voltage:t?.strings?.[i]?.voltage||0, status:pr===null?"idle":prStatus(pr) };
    });
  }),[connectors,telemetry,sky]);

  const addConnector=(vendor,name,creds)=>{ const v=VENDORS[vendor]; const id=`${vendor}-${Date.now()}`;
    const strings=Array.from({length:v.strings},(_,i)=>({ name:ARRAY_NAMES[i]||`String ${i+1}`, tilt:(DEFAULT_ORIENT[i]||{}).tilt??30, azimuth:(DEFAULT_ORIENT[i]||{}).azimuth??180 }));
    if(mode==="live") fetch(`${INVERTER_API}/${vendor}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,config:{...creds,capacityKw:v.kw,strings:v.strings}})}).catch(()=>{});
    setConnectors(p=>[...p,{ id, vendor, name:name||`${v.name} site`, capacityKw:v.kw, status:"online", strings, soil:strings.map(()=>0.90+Math.random()*0.07), creds }]); };
  const removeConnector=id=>{ delete enginesRef.current[id]; if(mode==="live") fetch(`${INVERTER_API}/${id}`,{method:"DELETE"}).catch(()=>{}); setConnectors(p=>p.filter(c=>c.id!==id)); };
  const washString=(cid,idx)=>{ if(mode==="live") fetch(`${BACKEND_BASE}/api/zones/${cid}:${idx}/clean`,{method:"POST"}).catch(()=>{}); else enginesRef.current[cid]?.wash(idx); };
  const updateString=(cid,idx,patch)=>setConnectors(p=>p.map(c=>c.id!==cid?c:{...c,strings:c.strings.map((s,i)=>i!==idx?s:{...s,...patch})}));

  return { connectors, telemetry, powerHist, zones, mode, addConnector, removeConnector, washString, updateString };
}

// ─── ATOMS ───────────────────────────────────────────────────────────────────
function Card({ children, style, onClick }){ const [h,setH]=useState(false);
  return <div onClick={onClick} onMouseEnter={()=>onClick&&setH(true)} onMouseLeave={()=>setH(false)} style={{ background:T.card, border:`1px solid ${h?T.accent+"44":T.cardBorder}`, borderRadius:14, padding:20, cursor:onClick?"pointer":"default", transition:"border-color .2s, transform .15s", transform:h?"translateY(-1px)":"none", ...style }}>{children}</div>; }
function Stat({ label, value, sub, icon:Icon, color=T.accent, live }){
  return <Card><div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}><div><div style={{ fontSize:11,color:T.textSecondary,marginBottom:8,letterSpacing:".04em",fontWeight:600,display:"flex",alignItems:"center",gap:6 }}>{label}{live&&<span style={{ width:6,height:6,borderRadius:3,background:T.green,animation:"pulse 1.6s infinite" }}/>}</div><div style={{ fontSize:24,fontWeight:700,color:T.textPrimary,fontFamily:"monospace",lineHeight:1 }}>{value}</div>{sub&&<div style={{ fontSize:12,color:T.textSecondary,marginTop:5 }}>{sub}</div>}</div><div style={{ width:40,height:40,borderRadius:10,background:color+"1A",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Icon size={18} color={color}/></div></div></Card>;
}
function MiniGauge({ value, idle }){ const c=idle?T.textSecondary:prColor(value);
  return <div style={{ display:"flex",alignItems:"center",gap:10 }}><div dir="ltr" style={{ flex:1,height:6,background:T.cardBorder,borderRadius:3,overflow:"hidden" }}><div style={{ width:`${idle?0:value}%`,height:"100%",background:`linear-gradient(90deg,${c}88,${c})`,borderRadius:3,transition:"width .6s ease" }}/></div><span style={{ fontSize:13,fontWeight:700,color:c,fontFamily:"monospace",minWidth:36,textAlign:"right" }}>{idle?"—":`${value}%`}</span></div>; }
function Ring({ value, label, size=170 }){ const r=(size-30)/2, circ=2*Math.PI*r, off=circ-(Math.min(value,100)/100)*circ, c=prColor(value);
  return <div dir="ltr" style={{ position:"relative",width:size,height:size }}><div style={{ position:"absolute",inset:0,borderRadius:"50%",boxShadow:`0 0 40px ${c}22` }}/><svg width={size} height={size} style={{ transform:"rotate(-90deg)",position:"absolute" }}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.cardBorder} strokeWidth={13}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c+"18"} strokeWidth={13} strokeDasharray="2 6"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={13} strokeDasharray={`${circ}`} strokeDashoffset={off} strokeLinecap="round" style={{ transition:"stroke-dashoffset 1s cubic-bezier(.4,0,.2,1), stroke .5s", filter:`drop-shadow(0 0 6px ${c}88)` }}/></svg><div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}><span style={{ fontSize:34,fontWeight:800,color:c,lineHeight:1,fontFamily:"monospace" }}>{value}<span style={{fontSize:17}}>%</span></span><span style={{ fontSize:10,color:T.textSecondary,marginTop:5,letterSpacing:".1em" }}>{label}</span></div></div>; }
function Toggle({ on, onChange }){ return <button onClick={onChange} dir="ltr" style={{ width:46,height:25,borderRadius:13,background:on?T.green:T.cardBorder,border:"none",cursor:"pointer",position:"relative",transition:"background .3s",flexShrink:0 }}><div style={{ position:"absolute",top:3,left:on?24:3,width:19,height:19,borderRadius:10,background:"#fff",transition:"left .3s",boxShadow:"0 1px 4px #0004" }}/></button>; }
function VendorBadge({ vendor, size=26 }){ const v=VENDORS[vendor]; if(!v) return null; return <div title={v.name} style={{ width:size,height:size,borderRadius:7,background:v.color,color:v.txt,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.42,fontWeight:800,flexShrink:0 }}>{v.name[0]}</div>; }
function StatusDot({ status }){ const c=status==="online"?T.green:status==="error"?T.red:T.textSecondary; return <span style={{ display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:c,fontWeight:600 }}><span style={{ width:7,height:7,borderRadius:4,background:c }}/>{status}</span>; }
function Header({ title, sub, right }){ return <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,gap:16 }}><div><h1 style={{ fontSize:22,fontWeight:800,color:T.textPrimary,margin:0,letterSpacing:"-.02em" }}>{title}</h1>{sub&&<p style={{ color:T.textSecondary,margin:"4px 0 0",fontSize:13 }}>{sub}</p>}</div>{right}</div>; }
function SectionTitle({ children, center, accent }){ return <div style={{ fontSize:11,fontWeight:700,color:accent?T.accent:T.textSecondary,marginBottom:16,letterSpacing:".06em",textAlign:center?"center":"start" }}>{children}</div>; }
function Legend({ color, label, dash }){ return <div style={{ display:"flex",alignItems:"center",gap:7 }}><div style={{ width:16,borderTop:`${dash?"2px dashed":"3px solid"} ${color}` }}/><span style={{ fontSize:11,color:T.textSecondary }}>{label}</span></div>; }
function FieldLabel({ children }){ return <div style={{ fontSize:12,color:T.textSecondary,marginBottom:7,marginTop:14,fontWeight:700,letterSpacing:".03em" }}>{children}</div>; }
function Input({ value, onChange, placeholder, type="text" }){ return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ width:"100%",padding:"11px 14px",background:T.bg,border:`1px solid ${T.cardBorder}`,borderRadius:10,color:T.textPrimary,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit" }}/>; }
function Overlay({ children }){ return <div style={{ position:"fixed",inset:0,background:"#000000CC",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>{children}</div>; }

// ─── SITE MODAL ───────────────────────────────────────────────────────────────
function SiteModal({ site, setSite, irr, onClose }){
  const { t }=useT(); const [f,setF]=useState(site);
  const save=()=>{ setSite({ ...f, lat:+f.lat, lon:+f.lon, albedo:+f.albedo }); onClose(); };
  return <Overlay><div style={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:18,padding:30,width:460,maxHeight:"88vh",overflow:"auto" }}>
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}><h2 style={{ margin:0,color:T.textPrimary,fontSize:18,fontWeight:800 }}>{t("site.title")}</h2><button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:T.textSecondary }}><X size={20}/></button></div>
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",background:T.bg,borderRadius:10,border:`1px solid ${T.cardBorder}` }}><div><div style={{ fontSize:14,fontWeight:600,color:T.textPrimary }}>{t("site.usePoa")}</div><div style={{ fontSize:12,color:T.textSecondary,marginTop:2,maxWidth:300 }}>{t("site.usePoaDesc")}</div></div><Toggle on={f.livePOA} onChange={()=>setF(p=>({...p,livePOA:!p.livePOA}))}/></div>
    {f.livePOA && <div dir="ltr" style={{ display:"flex",gap:16,fontSize:12,color:T.textSecondary,padding:"10px 4px 0" }}><span>{t("irr.ghi")}: <b style={{color:T.textPrimary}}>{irr.ghi} W/m²</b></span><span>{t("irr.elev")}: <b style={{color:T.accent}}>{irr.elevationDeg}°</b></span></div>}
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>{[["lat",t("site.lat")],["lon",t("site.lon")]].map(([k,l])=>(<div key={k}><FieldLabel>{l}</FieldLabel><Input type="number" value={f[k]} onChange={v=>setF(p=>({...p,[k]:v}))} placeholder={l}/></div>))}</div>
    <FieldLabel>{t("site.albedo")}</FieldLabel><Input type="number" value={f.albedo} onChange={v=>setF(p=>({...p,albedo:v}))} placeholder="0.2"/>
    <div style={{ fontSize:12,color:T.textMuted,marginTop:12 }}>{t("site.perArray")}</div>
    <button onClick={save} style={{ width:"100%",marginTop:16,padding:"13px",background:T.accent,border:"none",borderRadius:12,color:"#000",fontWeight:800,fontSize:15,cursor:"pointer" }}>{t("site.save")}</button>
  </div></Overlay>;
}

// ─── ORIENTATION MODAL (manual) ───────────────────────────────────────────────
function OrientationModal({ zone, onSave, onClose }){
  const { t }=useT(); const [tilt,setTilt]=useState(zone.tilt); const [az,setAz]=useState(zone.azimuth);
  return <Overlay><div style={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:18,padding:30,width:420 }}>
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}><h2 style={{ margin:0,color:T.textPrimary,fontSize:18,fontWeight:800 }}>{t("orient.title")}</h2><button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:T.textSecondary }}><X size={20}/></button></div>
    <div style={{ fontSize:13,color:T.textSecondary,marginBottom:6 }}>{zone.name}</div>
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}><div><FieldLabel>{t("orient.tilt")}</FieldLabel><Input type="number" value={tilt} onChange={setTilt} placeholder="30"/></div><div><FieldLabel>{t("orient.azimuth")}</FieldLabel><Input type="number" value={az} onChange={setAz} placeholder="180"/></div></div>
    <div dir="ltr" style={{ display:"flex",alignItems:"center",gap:8,marginTop:12,fontSize:13,color:T.accent,fontWeight:700 }}><Compass size={15}/> {Math.round(+az)}° · {azToCompass(+az)}</div>
    <div style={{ fontSize:11,color:T.textMuted,marginTop:6 }}>{t("orient.hint")}</div>
    <button onClick={()=>onSave({ tilt:+tilt, azimuth:((+az%360)+360)%360 })} style={{ width:"100%",marginTop:18,padding:"13px",background:T.accent,border:"none",borderRadius:12,color:"#000",fontWeight:800,fontSize:15,cursor:"pointer" }}>{t("orient.save")}</button>
  </div></Overlay>;
}

// ─── ORIENTATION AUTO-CALIBRATION LAB ─────────────────────────────────────────
function OrientationLab({ zone, site, onApply, onClose }){
  const { t }=useT(); const [running,setRunning]=useState(false); const [res,setRes]=useState(null);
  const run=()=>{ setRunning(true); setRes(null);
    setTimeout(()=>{ // let UI paint the spinner before the synchronous grid-search
      const samples=syntheticDayProfile(site.lat, site.lon, zone.tilt, zone.azimuth, site.albedo);
      const out=estimateOrientation(samples, site.lat, site.lon, site.albedo);
      setRes(out); setRunning(false);
    }, 40);
  };
  useEffect(()=>{ run(); /* auto-run on open */ },[]); // eslint-disable-line
  const dTilt=res?Math.abs(res.tilt-zone.tilt):0, dAz=res?Math.min(Math.abs(res.azimuth-zone.azimuth),360-Math.abs(res.azimuth-zone.azimuth)):0;
  return <Overlay><div style={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:18,padding:30,width:600,maxHeight:"90vh",overflow:"auto" }}>
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6 }}><div><h2 style={{ margin:0,color:T.textPrimary,fontSize:18,fontWeight:800,display:"flex",alignItems:"center",gap:9 }}><Crosshair size={19} color={T.accent}/>{t("lab.title")}</h2><div style={{ fontSize:13,color:T.textSecondary,marginTop:3 }}>{zone.name}</div></div><button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:T.textSecondary }}><X size={20}/></button></div>
    <p style={{ fontSize:12.5,color:T.textSecondary,lineHeight:1.6,margin:"10px 0 16px" }}>{t("lab.desc")}</p>

    {running && <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"40px 0",color:T.accent }}><RefreshCw size={18} style={{ animation:"spin 1s linear infinite" }}/> {t("lab.running")}</div>}

    {res && !running && <>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:18 }}>
        <div style={{ background:T.bg,borderRadius:12,padding:16,border:`1px solid ${T.cardBorder}` }}><div style={{ fontSize:11,color:T.textSecondary,marginBottom:8 }}>{t("lab.configured")}</div><div dir="ltr" style={{ fontSize:18,fontWeight:800,color:T.textPrimary,fontFamily:"monospace" }}>{zone.tilt}° / {zone.azimuth}°</div><div style={{ fontSize:11,color:T.textMuted,marginTop:3 }}>{azToCompass(zone.azimuth)}</div></div>
        <div style={{ background:T.accent+"12",borderRadius:12,padding:16,border:`1px solid ${T.accent}44` }}><div style={{ fontSize:11,color:T.accent,marginBottom:8 }}>{t("lab.detected")}</div><div dir="ltr" style={{ fontSize:18,fontWeight:800,color:T.accent,fontFamily:"monospace" }}>{res.tilt}° / {res.azimuth}°</div><div style={{ fontSize:11,color:T.textMuted,marginTop:3 }}>{azToCompass(res.azimuth)}</div></div>
        <div style={{ background:T.bg,borderRadius:12,padding:16,border:`1px solid ${T.cardBorder}` }}><div style={{ fontSize:11,color:T.textSecondary,marginBottom:8 }}>{t("lab.err")}</div><div dir="ltr" style={{ fontSize:18,fontWeight:800,color:dTilt+dAz<8?T.green:T.accent,fontFamily:"monospace" }}>±{dTilt}° / ±{dAz}°</div><div style={{ fontSize:11,color:T.textMuted,marginTop:3 }}>{t("lab.rmse")} {res.rmse}%</div></div>
      </div>
      <SectionTitle>{t("lab.fit")}</SectionTitle>
      <div dir="ltr"><ResponsiveContainer width="100%" height={210}>
        <LineChart data={res.profile} margin={{ top:5,right:10,bottom:5,left:-10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={T.cardBorder}/>
          <XAxis dataKey="h" tick={{ fill:T.textSecondary,fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`${Math.round(v)}h`}/>
          <YAxis tick={{ fill:T.textSecondary,fontSize:11 }} axisLine={false} tickLine={false} unit="%"/>
          <Tooltip contentStyle={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:10,color:T.textPrimary,fontSize:12 }} labelFormatter={v=>`${Math.round(v)}:00 UTC`}/>
          <Line type="monotone" dataKey="measured" stroke={T.cyan} strokeWidth={2.5} dot={false} name={t("lab.measured")}/>
          <Line type="monotone" dataKey="fitted" stroke={T.accent} strokeDasharray="5 4" strokeWidth={2} dot={false} name={t("lab.fitted")}/>
        </LineChart>
      </ResponsiveContainer></div>
      <div style={{ display:"flex",gap:18,margin:"6px 0 14px" }}><Legend color={T.cyan} label={t("lab.measured")}/><Legend color={T.accent} label={t("lab.fitted")} dash/></div>
      <div style={{ fontSize:11.5,color:T.textMuted,lineHeight:1.55,marginBottom:16 }}>{t("lab.method")}</div>
      <div style={{ display:"flex",gap:10 }}>
        <button onClick={run} style={{ flex:"0 0 auto",padding:"12px 18px",background:"transparent",border:`1px solid ${T.cardBorder}`,borderRadius:11,color:T.textSecondary,fontWeight:700,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",gap:8 }}><RefreshCw size={15}/> {t("lab.run")}</button>
        <button onClick={()=>{ onApply({ tilt:res.tilt, azimuth:res.azimuth }); onClose(); }} style={{ flex:1,padding:"12px",background:T.accent,border:"none",borderRadius:11,color:"#000",fontWeight:800,fontSize:14,cursor:"pointer" }}>{t("lab.apply")}</button>
      </div>
    </>}
  </div></Overlay>;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ fleet, irr }){
  const { t }=useT(); const { connectors, telemetry, powerHist, zones, washString, mode }=fleet;
  const sysExp=zones.reduce((a,z)=>a+z.expectedW,0), sysAc=zones.reduce((a,z)=>a+z.acW,0);
  const sysEnergy=Object.values(telemetry).reduce((a,tt)=>a+(tt.energyTodayWh||0),0);
  const active=zones.filter(z=>!z.prNull); const avgPr=active.length?Math.round(active.reduce((a,z)=>a+z.eff,0)/active.length):0;
  const avgPoa=zones.length?Math.round(zones.reduce((a,z)=>a+z.poa,0)/zones.length):0;
  const lossW=Math.max(0,sysExp-sysAc); const online=connectors.filter(c=>c.status==="online").length;
  const critical=zones.filter(z=>z.status==="critical"); const chartData=powerHist.map((p,i)=>({ i, ac:p.ac, exp:Math.round(sysExp) }));
  return <div style={{ padding:"24px 28px",maxWidth:1400 }}>
    <Header title={t("dash.title")} sub={t("dash.sub",{ n:online, s:zones.length, mode:mode==="live"?t("mode.live"):t("mode.demo") })}/>
    {critical.length>0 && <div style={{ display:"flex",alignItems:"center",gap:12,background:T.red+"12",border:`1px solid ${T.red}44`,borderRadius:12,padding:"12px 18px",marginBottom:22 }}><AlertTriangle size={17} color={T.red}/><span style={{ color:T.red,fontSize:13,fontWeight:600 }}>{t("dash.criticalAlert",{ zones:critical.map(z=>z.name).join(" · ") })}</span><button onClick={()=>critical.forEach(z=>washString(z.connectorId,z.idx))} style={{ marginInlineStart:"auto",padding:"5px 14px",borderRadius:8,background:T.red+"22",border:`1px solid ${T.red}55`,color:T.red,fontSize:12,fontWeight:700,cursor:"pointer" }}>{t("dash.cleanAll")}</button></div>}
    <div style={{ display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:22 }}>
      <Stat label={t("st.acPower")} value={fmtW(sysAc)} sub={t("st.expected",{v:fmtW(sysExp)})} icon={Zap} color={T.accent} live/>
      <Stat label={t("st.energyToday")} value={fmtKwh(sysEnergy)} sub={t("st.allInverters")} icon={Activity} color={T.blue}/>
      <Stat label={t("st.avgPerf")} value={`${avgPr}%`} sub={t("st.perfRatio")} icon={Gauge} color={prColor(avgPr)} live/>
      <Stat label={t("st.poa")} value={`${avgPoa} W/m²`} sub={t("st.irrSource",{s:irr.source})} icon={irr.live?SunMedium:CloudSun} color={T.cyan} live/>
      <Stat label={t("st.soilingLoss")} value={fmtW(lossW)} sub={t("st.perDay",{v:(lossW/1000*6*0.12).toFixed(2)})} icon={TrendingDown} color={T.red}/>
    </div>
    <div style={{ display:"grid",gridTemplateColumns:"1.7fr 1fr",gap:18 }}>
      <Card><SectionTitle>{t("dash.powerChart")}</SectionTitle><div dir="ltr"><ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData}><defs><linearGradient id="ac" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.accent} stopOpacity={0.3}/><stop offset="95%" stopColor={T.accent} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={T.cardBorder}/><XAxis dataKey="i" hide/><YAxis tick={{ fill:T.textSecondary,fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/><Tooltip contentStyle={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:10,color:T.textPrimary,fontSize:12 }} formatter={(v,n)=>[fmtW(v),n==="ac"?t("lg.actual"):t("lg.expected")]} labelFormatter={()=>""}/><Area type="monotone" dataKey="exp" stroke={T.textSecondary} strokeDasharray="4 4" fill="none" strokeWidth={1.5} dot={false}/><Area type="monotone" dataKey="ac" stroke={T.accent} fill="url(#ac)" strokeWidth={2.5} dot={false}/></AreaChart>
      </ResponsiveContainer></div><div style={{ display:"flex",gap:20,marginTop:8 }}><Legend color={T.accent} label={t("lg.actual")}/><Legend color={T.textSecondary} label={t("lg.expected")} dash/></div></Card>
      <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
        <Card style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:24 }}><SectionTitle center>{t("dash.fleetPR")}</SectionTitle><Ring value={avgPr} label={t("ring.pr")}/><div style={{ fontSize:13,fontWeight:600,color:prColor(avgPr),marginTop:14 }}>{avgPr>=85?t("dash.optimal"):avgPr>=65?t("dash.recommend"):t("dash.significant")}</div></Card>
        <Card><SectionTitle>{t("dash.stringStatus")}</SectionTitle><div style={{ display:"flex",flexDirection:"column",gap:13 }}>{zones.map(z=>(<div key={z.id}><div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}><div style={{ display:"flex",alignItems:"center",gap:8 }}><VendorBadge vendor={z.vendor} size={20}/><span style={{ fontSize:13,fontWeight:600,color:T.textPrimary }}>{z.name}</span></div>{z.prNull?<span style={{ fontSize:11,color:T.textSecondary }}>{t("status.idle")}</span>:z.status!=="clean"?<button onClick={()=>washString(z.connectorId,z.idx)} style={{ padding:"4px 11px",borderRadius:7,background:statusColor(z.status)+"18",border:`1px solid ${statusColor(z.status)}55`,color:statusColor(z.status),fontSize:11,fontWeight:700,cursor:"pointer" }}>{t("btn.clean")}</button>:<CheckCircle size={16} color={T.green}/>}</div><MiniGauge value={z.eff} idle={z.prNull}/></div>))}</div></Card>
      </div>
    </div>
  </div>;
}

// ─── INVERTERS ────────────────────────────────────────────────────────────────
function Inverters({ fleet }){
  const { t }=useT(); const { connectors, telemetry, zones, addConnector, removeConnector }=fleet;
  const zoneByKey={}; zones.forEach(z=>{ zoneByKey[z.id]=z; });
  const [showAdd,setShowAdd]=useState(false); const [vendor,setVendor]=useState("solaredge"); const [name,setName]=useState(""); const [creds,setCreds]=useState({});
  const submit=()=>{ addConnector(vendor,name,creds); setShowAdd(false); setName(""); setCreds({}); };
  return <div style={{ padding:"24px 28px",maxWidth:1400 }}>
    <Header title={t("inv.title")} sub={t("inv.sub")} right={<button onClick={()=>setShowAdd(true)} style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 20px",borderRadius:10,background:T.accent,border:"none",color:"#000",fontWeight:700,fontSize:14,cursor:"pointer" }}><Plus size={16}/> {t("inv.connect")}</button>}/>
    <Card style={{ marginBottom:18 }}><SectionTitle>{t("inv.supported")}</SectionTitle><div style={{ display:"flex",flexWrap:"wrap",gap:10 }}>{Object.entries(VENDORS).map(([k,v])=>(<div key={k} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 12px",background:T.bg,borderRadius:9,border:`1px solid ${T.cardBorder}` }}><VendorBadge vendor={k} size={22}/><div><div style={{ fontSize:12,fontWeight:600,color:T.textPrimary }}>{v.name}</div><div dir="ltr" style={{ fontSize:10,color:T.textMuted }}>{v.api}</div></div></div>))}</div></Card>
    <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
      {connectors.length===0 && <Card style={{ textAlign:"center",padding:40,color:T.textSecondary }}><Plug size={28} style={{ marginBottom:10,opacity:0.5 }}/><div style={{ fontSize:14 }}>{t("inv.none")}</div></Card>}
      {connectors.map(c=>{ const tt=telemetry[c.id]; const v=VENDORS[c.vendor];
        return <Card key={c.id}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16 }}><div style={{ display:"flex",alignItems:"center",gap:12 }}><VendorBadge vendor={c.vendor} size={40}/><div><div style={{ fontSize:16,fontWeight:700,color:T.textPrimary }}>{c.name}</div><div style={{ display:"flex",alignItems:"center",gap:12,marginTop:3 }}><StatusDot status={c.status}/><span style={{ fontSize:12,color:T.textSecondary }}>{v.name} · {c.capacityKw} kW · {c.strings.length} strings</span></div></div></div><button onClick={()=>removeConnector(c.id)} style={{ background:"none",border:`1px solid ${T.cardBorder}`,borderRadius:8,padding:"7px 9px",cursor:"pointer",color:T.textSecondary }}><Trash2 size={14}/></button></div>
          <div dir="ltr" style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",background:T.bg,borderRadius:10,overflow:"hidden",marginBottom:16 }}>{[[t("inv.acPower"),tt?fmtW(tt.acPowerW):"—",Zap,T.accent],[t("inv.dcInput"),tt?fmtW(tt.dcPowerW):"—",Power,T.cyan],[t("inv.energyToday"),tt?fmtKwh(tt.energyTodayWh):"—",Activity,T.blue],[t("inv.temp"),tt?`${tt.tempC}°C`:"—",Thermometer,T.red]].map(([l,val,Ic,col])=>(<div key={l} style={{ padding:"14px 16px",borderRight:`1px solid ${T.cardBorder}` }}><div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6 }}><Ic size={13} color={col}/><span style={{ fontSize:11,color:T.textSecondary }}>{l}</span></div><div style={{ fontSize:18,fontWeight:800,color:T.textPrimary,fontFamily:"monospace" }}>{val}</div></div>))}</div>
          <div dir="ltr" style={{ overflow:"hidden",borderRadius:10,border:`1px solid ${T.cardBorder}` }}>
            <div style={{ display:"grid",gridTemplateColumns:"1.4fr 0.9fr 0.8fr 0.9fr 0.7fr 1fr",padding:"10px 14px",background:T.panel,fontSize:11,fontWeight:700,color:T.textSecondary,letterSpacing:".03em" }}><div>{t("tbl.string")}</div><div>{t("tbl.power")}</div><div>{t("tbl.voltage")}</div><div>{t("tbl.orient")}</div><div>{t("tbl.pr")}</div><div>{t("tbl.status")}</div></div>
            {c.strings.map((s,i)=>{ const st=tt?.strings?.[i]; const z=zoneByKey[`${c.id}:${i}`]; const status=z?z.status:"idle"; const prShown=z&&!z.prNull?z.eff:null;
              return <div key={i} style={{ display:"grid",gridTemplateColumns:"1.4fr 0.9fr 0.8fr 0.9fr 0.7fr 1fr",padding:"11px 14px",fontSize:13,borderTop:`1px solid ${T.cardBorder}`,alignItems:"center" }}>
                <div style={{ color:T.textPrimary,fontWeight:600 }}>{s.name}</div>
                <div style={{ color:T.textSecondary,fontFamily:"monospace" }}>{st?fmtW(st.acW):"—"}</div>
                <div style={{ color:T.textSecondary,fontFamily:"monospace" }}>{st?`${st.voltage} V`:"—"}</div>
                <div style={{ color:T.textSecondary,fontFamily:"monospace",fontSize:12 }}>{(s.tilt??30)}°/{azToCompass(s.azimuth??180)}</div>
                <div style={{ color:prShown!=null?prColor(prShown):T.textSecondary,fontWeight:700,fontFamily:"monospace" }}>{prShown!=null?`${prShown}%`:"—"}</div>
                <div><span style={{ fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:statusColor(status)+"1A",color:statusColor(status) }}>{t("status."+status)}</span></div>
              </div>;
            })}
          </div>
        </Card>;
      })}
    </div>
    {showAdd && <Overlay><div style={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:18,padding:30,width:480,maxHeight:"86vh",overflow:"auto" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}><div><h2 style={{ margin:0,color:T.textPrimary,fontSize:18,fontWeight:800 }}>{t("modal.connectTitle")}</h2><p style={{ margin:"4px 0 0",color:T.textSecondary,fontSize:13 }}>{t("modal.connectSub")}</p></div><button onClick={()=>setShowAdd(false)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textSecondary }}><X size={20}/></button></div>
      <FieldLabel>{t("inv.vendor")}</FieldLabel><div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>{Object.entries(VENDORS).map(([k,v])=>(<button key={k} onClick={()=>{setVendor(k);setCreds({});}} style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 12px",borderRadius:10,border:`1px solid ${vendor===k?T.accent:T.cardBorder}`,background:vendor===k?T.accent+"14":T.bg,cursor:"pointer",textAlign:"start" }}><VendorBadge vendor={k} size={22}/><span style={{ fontSize:12,fontWeight:600,color:vendor===k?T.accent:T.textPrimary }}>{v.name}</span></button>))}</div>
      <FieldLabel>{t("inv.displayName")}</FieldLabel><Input value={name} onChange={setName} placeholder={`${VENDORS[vendor].name} site`}/>
      {VENDORS[vendor].fields.map(([k,label])=>(<div key={k}><FieldLabel>{label}</FieldLabel><Input value={creds[k]||""} onChange={v=>setCreds(p=>({...p,[k]:v}))} placeholder={label} type={/password/i.test(k)?"password":"text"}/></div>))}
      <div style={{ fontSize:12,color:T.textMuted,background:T.bg,border:`1px solid ${T.cardBorder}`,borderRadius:9,padding:"10px 12px",margin:"10px 0 16px" }}>{t("inv.demoNote",{ ep:`${INVERTER_API}/${vendor}` })}</div>
      <button onClick={submit} style={{ width:"100%",padding:"13px",background:T.accent,border:"none",borderRadius:12,color:"#000",fontWeight:800,fontSize:15,cursor:"pointer" }}>{t("btn.connect")}</button>
    </div></Overlay>}
  </div>;
}

// ─── ZONES ────────────────────────────────────────────────────────────────────
function Zones({ fleet, site }){
  const { t }=useT(); const { zones, washString, updateString }=fleet;
  const [washing,setWashing]=useState({}); const [editZone,setEditZone]=useState(null); const [labZone,setLabZone]=useState(null);
  const start=z=>{ setWashing(p=>({...p,[z.id]:true})); washString(z.connectorId,z.idx); setTimeout(()=>setWashing(p=>({...p,[z.id]:false})),2500); };
  return <div style={{ padding:"24px 28px",maxWidth:1400 }}>
    <Header title={t("zones.title")} sub={t("zones.sub")}/>
    <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16 }}>
      {zones.map(z=>{ const w=washing[z.id];
        return <Card key={z.id} style={{ position:"relative",overflow:"hidden" }}>
          {w && <div style={{ position:"absolute",inset:0,background:`linear-gradient(180deg,${T.blue}08,${T.blue}18,${T.blue}08)`,animation:"wash 1.2s infinite",zIndex:1,pointerEvents:"none" }}/>}
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}><div style={{ display:"flex",alignItems:"center",gap:10 }}><VendorBadge vendor={z.vendor} size={28}/><div><div style={{ fontSize:15,fontWeight:700,color:T.textPrimary }}>{z.name}</div><div style={{ fontSize:11,color:T.textMuted,marginTop:2 }}>{t("zones.via",{v:z.vendorName})}</div></div></div><span style={{ fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:20,background:statusColor(w?"clean":z.status)+"1A",color:statusColor(w?"clean":z.status) }}>{t("status."+(w?"clean":z.status))}</span></div>
          <div dir="ltr" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",background:T.bg,borderRadius:10,overflow:"hidden",marginBottom:10 }}>{[[t("zones.output"),fmtW(z.acW)],[t("zones.potential"),fmtW(z.expectedW)]].map(([l,v])=>(<div key={l} style={{ padding:"12px 14px",borderRight:`1px solid ${T.cardBorder}` }}><div style={{ fontSize:11,color:T.textSecondary,marginBottom:4 }}>{l}</div><div style={{ fontSize:17,fontWeight:800,color:T.textPrimary,fontFamily:"monospace" }}>{v}</div></div>))}</div>
          {/* orientation strip */}
          <div style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 12px",background:T.bg,borderRadius:10,marginBottom:12,border:`1px solid ${T.cardBorder}` }}>
            <Compass size={15} color={T.cyan}/>
            <span dir="ltr" style={{ fontSize:12.5,color:T.textPrimary,fontWeight:600 }}>{z.tilt}° · {azToCompass(z.azimuth)} <span style={{ color:T.textMuted,fontWeight:400 }}>({z.azimuth}°)</span></span>
            <span dir="ltr" style={{ marginInlineStart:"auto",fontSize:12,color:T.cyan,fontFamily:"monospace" }}>{t("zones.poaTag")} {z.poa}</span>
            <button title={t("orient.edit")} onClick={()=>setEditZone(z)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textSecondary,padding:2 }}><Pencil size={14}/></button>
            <button title={t("orient.auto")} onClick={()=>setLabZone(z)} style={{ background:"none",border:"none",cursor:"pointer",color:T.accent,padding:2 }}><Crosshair size={15}/></button>
          </div>
          <div style={{ marginBottom:14 }}><div style={{ fontSize:12,color:T.textSecondary,marginBottom:7 }}>{t("zones.perfRatio")}</div><MiniGauge value={z.eff} idle={z.prNull}/></div>
          {z.prNull ? <div style={{ textAlign:"center",padding:"11px",color:T.textSecondary,fontSize:13,border:`1px solid ${T.cardBorder}`,borderRadius:10 }}>{t("zones.idleNight")}</div>
            : <button onClick={()=>!w&&start(z)} disabled={w} style={{ width:"100%",padding:"11px",background:w?T.blue+"22":z.status==="clean"?T.cardBorder+"88":statusColor(z.status),border:`1px solid ${w?T.blue:z.status==="clean"?T.cardBorder:statusColor(z.status)+"88"}`,borderRadius:10,color:w?T.blue:z.status==="clean"?T.textSecondary:"#000",fontWeight:700,fontSize:14,cursor:w?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>{w?<><RefreshCw size={15} style={{ animation:"spin 1s linear infinite" }}/> {t("zones.cleaning")}</>:<><Droplets size={15}/> {z.status==="clean"?t("zones.scheduled"):t("zones.cleanNow")}</>}</button>}
        </Card>;
      })}
    </div>
    {editZone && <OrientationModal zone={editZone} onClose={()=>setEditZone(null)} onSave={patch=>{ updateString(editZone.connectorId,editZone.idx,patch); setEditZone(null); }}/>}
    {labZone && <OrientationLab zone={labZone} site={site} onClose={()=>setLabZone(null)} onApply={patch=>updateString(labZone.connectorId,labZone.idx,patch)}/>}
  </div>;
}

// ─── FORECAST CARD ────────────────────────────────────────────────────────────
function ForecastStrip({ site }){
  const { t, locale }=useT(); const fc=useForecast(site);
  const rainDay=fc.days.find(d=>fcReco(d)==="rain");
  const note = rainDay ? t("fc.nextRain",{ d:new Date(rainDay.date).toLocaleDateString(locale,{weekday:"long"}) }) : (fc.days.slice(0,3).every(d=>fcReco(d)!=="rain") ? t("fc.dryClean") : null);
  return <Card style={{ marginBottom:20 }}>
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}><SectionTitle>{t("fc.title")}</SectionTitle><span style={{ fontSize:11,color:T.textMuted }}>{t("fc.source",{ s:fc.source })}</span></div>
    {fc.loading && <div style={{ color:T.textSecondary,fontSize:13,padding:"10px 0" }}>{t("fc.loading")}</div>}
    {!fc.loading && fc.days.length===0 && <div style={{ color:T.textSecondary,fontSize:13,padding:"10px 0" }}>{t("fc.unavailable")}</div>}
    {fc.days.length>0 && <div dir="ltr" style={{ display:"grid",gridTemplateColumns:`repeat(${fc.days.length},1fr)`,gap:8 }}>
      {fc.days.map((d,i)=>{ const r=fcReco(d); const col=r==="rain"?T.blue:r==="clean"?T.green:T.textSecondary;
        return <div key={d.date} style={{ background:T.bg,borderRadius:10,padding:"12px 8px",textAlign:"center",border:`1px solid ${r!=="normal"?col+"44":T.cardBorder}` }}>
          <div style={{ fontSize:11,color:T.textSecondary,fontWeight:600 }}>{i===0?t("fc.today"):new Date(d.date).toLocaleDateString(locale,{weekday:"short"})}</div>
          <div style={{ fontSize:22,margin:"5px 0" }}>{wxIcon(d.code)}</div>
          <div style={{ fontSize:13,fontWeight:700,color:T.textPrimary,fontFamily:"monospace" }}>{d.tmax}°<span style={{ color:T.textMuted,fontSize:11 }}>/{d.tmin}°</span></div>
          <div style={{ fontSize:11,color:d.precipProb>=50?T.blue:T.textMuted,marginTop:3,display:"flex",alignItems:"center",justifyContent:"center",gap:3 }}><CloudRain size={11}/>{d.precipProb}%</div>
          <div style={{ marginTop:7,height:4,borderRadius:2,background:r!=="normal"?col:T.cardBorder }}/>
        </div>;
      })}
    </div>}
    {note && <div style={{ display:"flex",alignItems:"center",gap:9,marginTop:14,padding:"10px 14px",borderRadius:10,background:(rainDay?T.blue:T.green)+"10",border:`1px solid ${(rainDay?T.blue:T.green)}33`,fontSize:13,color:rainDay?T.blue:T.green,fontWeight:600 }}>{rainDay?<CloudRain size={15}/>:<CheckCircle size={15}/>}{note}</div>}
  </Card>;
}

// ─── SCHEDULE ─────────────────────────────────────────────────────────────────
const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const DAY_ORDER={ ru:DAYS, en:DAYS, he:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] };
function Schedule({ fleet, site }){
  const { t, lang }=useT(); const { zones }=fleet;
  const [peak,setPeak]=useState(true),[rain,setRain]=useState(true),[dust,setDust]=useState(true);
  const [scheds,setScheds]=useState(()=>[
    { id:1, zoneId:"se-1:0", time:"05:30", days:["Mon","Thu"], duration:8, active:true },
    { id:2, zoneId:"se-1:1", time:"06:00", days:["Tue","Fri"], duration:6, active:true },
    { id:3, zoneId:"se-1:2", time:"05:00", days:["Mon","Wed","Fri"], duration:10, active:false },
  ]);
  const zName=id=>zones.find(z=>z.id===id)?.name||t("sched.removed");
  const toggleDay=(sid,d)=>setScheds(p=>p.map(s=>s.id!==sid?s:{...s,days:s.days.includes(d)?s.days.filter(x=>x!==d):[...s.days,d]}));
  const order=DAY_ORDER[lang]||DAYS;
  return <div style={{ padding:"24px 28px",maxWidth:980 }}>
    <Header title={t("sched.title")} sub={t("sched.sub")}/>
    <ForecastStrip site={site}/>
    <Card style={{ marginBottom:20,borderColor:T.accent+"33",background:T.accent+"08" }}><SectionTitle accent>{t("sched.smart")}</SectionTitle>{[[peak,setPeak,t("sched.peak"),t("sched.peakDesc")],[rain,setRain,t("sched.rain"),t("sched.rainDesc")],[dust,setDust,t("sched.dust"),t("sched.dustDesc")]].map(([v,set,l,s])=>(<div key={l} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}><div><div style={{ fontSize:14,fontWeight:600,color:T.textPrimary }}>{l}</div><div style={{ fontSize:12,color:T.textSecondary,marginTop:2 }}>{s}</div></div><Toggle on={v} onChange={()=>set(x=>!x)}/></div>))}</Card>
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>{scheds.map(s=>{ const z=zones.find(x=>x.id===s.zoneId);
      return <Card key={s.id} style={{ opacity:s.active?1:.55 }}><div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16 }}><div style={{ flex:1 }}><div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:14 }}><span dir="ltr" style={{ fontSize:28,fontWeight:800,color:T.textPrimary,fontFamily:"monospace" }}>{s.time}</span><div><div style={{ fontSize:14,fontWeight:700,color:T.textPrimary }}>{zName(s.zoneId)}</div><div style={{ fontSize:12,color:T.textSecondary }}>{t("sched.min",{n:s.duration})}{z&&<span style={{ marginInlineStart:8,color:prColor(z.eff) }}>· {z.eff}% PR</span>}</div></div></div><div style={{ display:"flex",gap:7 }}>{order.map(d=>(<button key={d} onClick={()=>toggleDay(s.id,d)} style={{ width:38,height:38,borderRadius:9,border:`1px solid ${s.days.includes(d)?T.accent:T.cardBorder}`,background:s.days.includes(d)?T.accent+"1A":"transparent",color:s.days.includes(d)?T.accent:T.textSecondary,fontSize:11,fontWeight:700,cursor:"pointer" }}>{t("day."+d)}</button>))}</div></div><Toggle on={s.active} onChange={()=>setScheds(p=>p.map(x=>x.id===s.id?{...x,active:!x.active}:x))}/></div></Card>;
    })}</div>
  </div>;
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function Analytics({ fleet }){
  const { t }=useT(); const { connectors, telemetry, zones, powerHist }=fleet;
  const sysExp=zones.reduce((a,z)=>a+z.expectedW,0), sysAc=zones.reduce((a,z)=>a+z.acW,0);
  const lossW=Math.max(0,sysExp-sysAc); const lossKwhDay=(lossW/1000*6).toFixed(1); const lossUsd=(+lossKwhDay*0.12).toFixed(2);
  const prData=zones.map(z=>({ name:z.name.replace(/—.*/,"").trim(), pr:z.eff }));
  const energyData=connectors.map(c=>({ name:VENDORS[c.vendor].name.split(" ")[0], kwh:+((telemetry[c.id]?.energyTodayWh||0)/1000).toFixed(1) }));
  const prTrend=powerHist.map((p,i)=>({ i, pr: sysExp? Math.round(p.ac/sysExp*100):0 }));
  return <div style={{ padding:"24px 28px",maxWidth:1400 }}>
    <Header title={t("an.title")} sub={t("an.sub")}/>
    <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24 }}>
      <Stat label={t("an.soilingLoss")} value={`${lossKwhDay} kWh`} sub={t("an.perDayFleet")} icon={TrendingDown} color={T.red} live/>
      <Stat label={t("an.revenueRisk")} value={`$${lossUsd}`} sub={t("an.dailyAt")} icon={TrendingUp} color={T.green}/>
      <Stat label={t("an.monthlyLoss")} value={`$${(+lossUsd*30).toFixed(0)}`} sub={t("an.ifUncleaned")} icon={Activity} color={T.purple}/>
      <Stat label={t("an.stringsMon")} value={zones.length} sub={t("an.invN",{n:connectors.length})} icon={Gauge} color={T.blue}/>
    </div>
    <div style={{ display:"grid",gridTemplateColumns:"3fr 2fr",gap:18,marginBottom:18 }}>
      <Card><SectionTitle>{t("an.prTrend")}</SectionTitle><div dir="ltr"><ResponsiveContainer width="100%" height={230}><LineChart data={prTrend}><CartesianGrid strokeDasharray="3 3" stroke={T.cardBorder}/><XAxis dataKey="i" hide/><YAxis domain={[40,100]} tick={{ fill:T.textSecondary,fontSize:11 }} axisLine={false} tickLine={false} unit="%"/><Tooltip contentStyle={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:10,color:T.textPrimary,fontSize:12 }} formatter={v=>[`${v}%`,"PR"]} labelFormatter={()=>""}/><Line type="monotone" dataKey="pr" stroke={T.accent} strokeWidth={2.5} dot={false}/></LineChart></ResponsiveContainer></div></Card>
      <Card><SectionTitle>{t("an.energyByInv")}</SectionTitle><div dir="ltr"><ResponsiveContainer width="100%" height={230}><BarChart data={energyData} barSize={34}><CartesianGrid strokeDasharray="3 3" stroke={T.cardBorder} vertical={false}/><XAxis dataKey="name" tick={{ fill:T.textSecondary,fontSize:11 }} axisLine={false} tickLine={false}/><YAxis tick={{ fill:T.textSecondary,fontSize:11 }} axisLine={false} tickLine={false} unit=" kWh"/><Tooltip contentStyle={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:10,color:T.textPrimary,fontSize:12 }} formatter={v=>[`${v} kWh`,"Energy"]}/><Bar dataKey="kwh" fill={T.blue} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div></Card>
    </div>
    <Card><SectionTitle>{t("an.prByString")}</SectionTitle><div dir="ltr"><ResponsiveContainer width="100%" height={220}><BarChart data={prData} barSize={40}><CartesianGrid strokeDasharray="3 3" stroke={T.cardBorder} vertical={false}/><XAxis dataKey="name" tick={{ fill:T.textSecondary,fontSize:11 }} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tick={{ fill:T.textSecondary,fontSize:11 }} axisLine={false} tickLine={false} unit="%"/><Tooltip contentStyle={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:10,color:T.textPrimary,fontSize:12 }} formatter={v=>[`${v}%`,"PR"]}/><Bar dataKey="pr" fill={T.accent} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div></Card>
  </div>;
}
// analytics i18n fallback keys (kept in en/ru/he via inline below)
Object.assign(I18N.en,{ "an.title":"Analytics","an.sub":"Soiling economics · production by inverter · performance trends","an.soilingLoss":"SOILING LOSS","an.perDayFleet":"per day, fleet-wide","an.revenueRisk":"REVENUE AT RISK","an.dailyAt":"daily, at $0.12/kWh","an.monthlyLoss":"MONTHLY LOSS","an.ifUncleaned":"if left uncleaned","an.stringsMon":"STRINGS MONITORED","an.invN":"{n} inverters","an.prTrend":"PERFORMANCE RATIO TREND (live)","an.energyByInv":"ENERGY TODAY BY INVERTER","an.prByString":"PERFORMANCE RATIO BY STRING" });
Object.assign(I18N.ru,{ "an.title":"Аналитика","an.sub":"Экономика загрязнения · выработка по инверторам · тренды PR","an.soilingLoss":"ПОТЕРЯ ОТ ГРЯЗИ","an.perDayFleet":"в сутки по флоту","an.revenueRisk":"ДОХОД ПОД РИСКОМ","an.dailyAt":"в день, при $0.12/кВт·ч","an.monthlyLoss":"ПОТЕРЯ В МЕСЯЦ","an.ifUncleaned":"если не мыть","an.stringsMon":"СТРОК НА МОНИТОРИНГЕ","an.invN":"{n} инверторов","an.prTrend":"ТРЕНД PERFORMANCE RATIO (live)","an.energyByInv":"ВЫРАБОТКА ПО ИНВЕРТОРАМ","an.prByString":"PERFORMANCE RATIO ПО СТРОКАМ" });
Object.assign(I18N.he,{ "an.title":"אנליטיקה","an.sub":"כלכלת לכלוך · ייצור לפי ממיר · מגמות ביצועים","an.soilingLoss":"אובדן מלכלוך","an.perDayFleet":"ליום, כלל הצי","an.revenueRisk":"הכנסה בסיכון","an.dailyAt":"ליום, ב-$0.12/קוטש","an.monthlyLoss":"אובדן חודשי","an.ifUncleaned":"אם לא ינוקה","an.stringsMon":"מחרוזות במעקב","an.invN":"{n} ממירים","an.prTrend":"מגמת PERFORMANCE RATIO (חי)","an.energyByInv":"אנרגיה היום לפי ממיר","an.prByString":"PERFORMANCE RATIO לפי מחרוזת" });

// ─── AI ───────────────────────────────────────────────────────────────────────
function AI({ fleet }){
  const { t, lang }=useT(); const { connectors, telemetry, zones }=fleet;
  const sysAc=zones.reduce((a,z)=>a+z.acW,0); const active=zones.filter(z=>!z.prNull);
  const avgPr=active.length?Math.round(active.reduce((a,z)=>a+z.eff,0)/active.length):0;
  const needs=zones.filter(z=>z.status!=="clean"&&!z.prNull);
  const greet=()=>t("ai.greeting",{ inv:connectors.length, s:zones.length, ac:fmtW(sysAc), pr:avgPr, extra:needs.length?t("ai.needs",{n:needs.length,names:needs.map(z=>z.name).join(", ")}):t("ai.good") });
  const [messages,setMessages]=useState([{ role:"assistant", content:greet() }]);
  const [input,setInput]=useState(""); const [loading,setLoading]=useState(false); const ref=useRef(null);
  useEffect(()=>{ setMessages(m=>m.length<=1?[{role:"assistant",content:greet()}]:m); },[lang]); // eslint-disable-line
  const QUICK=[t("ai.q1"),t("ai.q2"),t("ai.q3"),t("ai.q4")];
  const sys=`You are the assistant of SolarWash Web, a solar O&M platform integrating inverters and managing panel cleaning. ${t("ai.langInstr")} Be concise, concrete, quantitative.
LIVE FLEET (${new Date().toLocaleString(LOCALES[lang].code)}):
${connectors.map(c=>{const tt=telemetry[c.id];return `Inverter "${c.name}" (${VENDORS[c.vendor].name}, ${c.capacityKw}kW): AC ${tt?fmtW(tt.acPowerW):"n/a"}, energy today ${tt?fmtKwh(tt.energyTodayWh):"n/a"}, temp ${tt?.tempC??"?"}°C`;}).join("\n")}
STRINGS: ${zones.map(z=>`• ${z.name} (${z.vendorName}, ${z.tilt}°/${azToCompass(z.azimuth)}): PR ${z.prNull?"idle":z.eff+"%"}, ${fmtW(z.acW)} of ${fmtW(z.expectedW)} potential, ${z.status}`).join("\n")}
Fleet avg PR ${avgPr}%. PR = actual/expected; expected derives from per-array POA irradiance. Lower PR = soiling. Give prioritized recommendations.`;
  const send=async(text)=>{ if(!text.trim()||loading)return; const u={role:"user",content:text}; setMessages(p=>[...p,u]); setInput(""); setLoading(true);
    try{ const hist=[...messages,u].map(m=>({role:m.role,content:m.content}));
      const r=await fetch(AI_ENDPOINT,{ method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ model:"claude-sonnet-4-6",max_tokens:700,system:sys,messages:hist }) });
      const d=await r.json(); setMessages(p=>[...p,{role:"assistant",content:d.content?.[0]?.text||t("ai.err")}]);
    }catch{ setMessages(p=>[...p,{role:"assistant",content:t("ai.err")}]); } setLoading(false); };
  useEffect(()=>{ ref.current?.scrollIntoView({behavior:"smooth"}); },[messages]);
  return <div style={{ padding:"24px 28px",maxWidth:880,height:"calc(100vh - 30px)",display:"flex",flexDirection:"column",boxSizing:"border-box" }}>
    <Header title={t("ai.title")} sub={t("ai.sub")}/>
    <div style={{ display:"flex",flexWrap:"wrap",gap:8,marginBottom:16 }}>{QUICK.map(q=><button key={q} onClick={()=>send(q)} disabled={loading} style={{ padding:"7px 14px",borderRadius:20,background:T.accent+"14",border:`1px solid ${T.accent}44`,color:T.accent,fontSize:12,cursor:loading?"default":"pointer",fontWeight:600 }}>{q}</button>)}</div>
    <Card style={{ flex:1,overflow:"auto",padding:20,display:"flex",flexDirection:"column",gap:14 }}>
      {messages.map((m,i)=>(<div key={i} style={{ display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start" }}>{m.role==="assistant" && <div style={{ width:28,height:28,borderRadius:8,background:T.accent+"18",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginInlineEnd:10,marginTop:2 }}><Sun size={14} color={T.accent}/></div>}<div style={{ maxWidth:"76%",padding:"12px 16px",borderRadius:14,background:m.role==="user"?T.accent+"1A":T.bg,border:`1px solid ${m.role==="user"?T.accent+"44":T.cardBorder}`,color:T.textPrimary,fontSize:14,lineHeight:1.65,whiteSpace:"pre-wrap" }}>{m.content}</div></div>))}
      {loading && <div style={{ display:"flex",alignItems:"center",gap:8 }}><div style={{ width:28,height:28,borderRadius:8,background:T.accent+"18",display:"flex",alignItems:"center",justifyContent:"center" }}><Sun size={14} color={T.accent}/></div><div dir="ltr" style={{ display:"flex",gap:5 }}>{[0,1,2].map(i=><div key={i} style={{ width:7,height:7,borderRadius:4,background:T.accent,animation:`dot 1.2s ease-in-out ${i*0.2}s infinite` }}/>)}</div></div>}
      <div ref={ref}/>
    </Card>
    <div style={{ display:"flex",gap:10,marginTop:14 }}><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send(input)} placeholder={t("ai.placeholder")} style={{ flex:1,padding:"13px 18px",background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:12,color:T.textPrimary,fontSize:14,outline:"none",fontFamily:"inherit" }}/><button onClick={()=>send(input)} disabled={loading||!input.trim()} style={{ width:48,height:48,borderRadius:12,flexShrink:0,background:input.trim()&&!loading?T.accent:T.cardBorder,border:"none",cursor:input.trim()&&!loading?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center" }}><Send size={18} color={input.trim()&&!loading?"#000":T.textSecondary}/></button></div>
  </div>;
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const NAV=[{ id:"dashboard",icon:LayoutDashboard,key:"nav.dashboard" },{ id:"inverters",icon:Cpu,key:"nav.inverters" },{ id:"zones",icon:Grid,key:"nav.zones" },{ id:"schedule",icon:Calendar,key:"nav.schedule" },{ id:"analytics",icon:BarChart3,key:"nav.analytics" },{ id:"ai",icon:Bot,key:"nav.ai" }];

export default function SolarWashWeb(){
  const [lang,setLang]=useState("ru"); const [view,setView]=useState("dashboard");
  const [site,setSite]=useState(DEFAULT_SITE); const [showSite,setShowSite]=useState(false);
  const irr=useIrradiance(site); const fleet=useFleet(irr);
  const dir=LOCALES[lang].dir, locale=LOCALES[lang].code; const t=(k,p)=>translate(lang,k,p);
  const online=fleet.connectors.filter(c=>c.status==="online").length;
  const critical=fleet.zones.filter(z=>z.status==="critical").length;
  const sysAc=fleet.zones.reduce((a,z)=>a+z.acW,0);
  const views={ dashboard:<Dashboard fleet={fleet} irr={irr}/>, inverters:<Inverters fleet={fleet}/>, zones:<Zones fleet={fleet} site={site}/>, schedule:<Schedule fleet={fleet} site={site}/>, analytics:<Analytics fleet={fleet}/>, ai:<AI fleet={fleet}/> };
  return <LocaleCtx.Provider value={{ lang, setLang, locale, dir, t }}>
    <div dir={dir} lang={lang} style={{ display:"flex",height:"100vh",background:T.bg,color:T.textPrimary,overflow:"hidden",fontFamily:"'Segoe UI','Arial',system-ui,-apple-system,sans-serif" }}>
      <div style={{ width:232,background:T.panel,borderInlineEnd:`1px solid ${T.cardBorder}`,display:"flex",flexDirection:"column",padding:"22px 0",flexShrink:0 }}>
        <div style={{ padding:"0 20px 24px",display:"flex",alignItems:"center",gap:11 }}><div style={{ width:38,height:38,borderRadius:12,background:`linear-gradient(135deg,${T.accent},#D97706)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 16px ${T.accent}40` }}><Sun size={18} color="#000"/></div><div><div style={{ fontSize:15,fontWeight:900,color:T.textPrimary,lineHeight:1 }}>SolarWash</div><div style={{ fontSize:10,color:T.accent,fontWeight:800,letterSpacing:".12em",marginTop:2 }}>{t("brand.tag")}</div></div></div>
        <div style={{ flex:1,padding:"0 10px",display:"flex",flexDirection:"column",gap:3 }}>{NAV.map(({id,icon:Icon,key})=>{ const a=view===id;
          return <button key={id} onClick={()=>setView(id)} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 13px",borderRadius:11,border:"none",background:a?T.accent+"18":"transparent",color:a?T.accent:T.textSecondary,fontSize:14,fontWeight:a?700:400,cursor:"pointer",transition:"all .18s",textAlign:"start",fontFamily:"inherit" }}><div style={{ display:"flex",alignItems:"center",gap:11 }}><Icon size={17}/>{t(key)}</div>{id==="zones"&&critical>0 && <span style={{ fontSize:11,fontWeight:700,minWidth:18,height:18,borderRadius:9,background:T.red,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>{critical}</span>}{id==="inverters" && <span style={{ fontSize:11,color:T.textMuted }}>{online}</span>}</button>;
        })}</div>
        <div style={{ padding:"0 14px 12px" }}>
          <button onClick={()=>setShowSite(true)} style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:`1px solid ${T.cardBorder}`,background:T.bg,color:T.textSecondary,fontSize:13,cursor:"pointer",fontFamily:"inherit",marginBottom:10 }}><Settings size={16}/> {t("side.settings")}<span dir="ltr" style={{ marginInlineStart:"auto",fontSize:11,color:site.livePOA?T.cyan:T.textMuted }}>{site.livePOA?t("irr.live"):t("irr.modeled")}</span></button>
          <div style={{ display:"flex",gap:6,background:T.bg,borderRadius:10,padding:4 }}>{Object.entries(LOCALES).map(([k,cfg])=>(<button key={k} onClick={()=>setLang(k)} style={{ flex:1,padding:"7px 0",borderRadius:7,border:"none",background:lang===k?T.accent:"transparent",color:lang===k?"#000":T.textSecondary,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>{cfg.label}</button>))}</div>
        </div>
        <div style={{ padding:"12px 20px 0",borderTop:`1px solid ${T.cardBorder}` }}><div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5 }}><Wifi size={13} color={online?T.green:T.textSecondary}/><span style={{ fontSize:12,color:online?T.green:T.textSecondary,fontWeight:600 }}>{online?t("side.live"):t("side.offline")}</span><span style={{ marginInlineStart:"auto",fontSize:10,color:fleet.mode==="live"?T.green:T.textMuted }}>{fleet.mode==="live"?t("mode.live"):t("mode.demo")}</span></div><div dir="ltr" style={{ fontSize:13,fontWeight:700,color:T.accent,fontFamily:"monospace" }}>{fmtW(sysAc)}</div><div style={{ fontSize:11,color:T.textMuted,marginTop:1 }}>{t("side.currentAc")}</div></div>
      </div>
      <div style={{ flex:1,overflow:"auto" }}>{views[view]}</div>
      {showSite && <SiteModal site={site} setSite={setSite} irr={irr} onClose={()=>setShowSite(false)}/>}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes wash{0%,100%{opacity:.6}50%{opacity:1}}@keyframes dot{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  </LocaleCtx.Provider>;
}
