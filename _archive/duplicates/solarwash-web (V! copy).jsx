import { useState, useRef, useEffect, useMemo, createContext, useContext } from "react";
import {
  LayoutDashboard, Cpu, Grid, Calendar, BarChart3, Bot, Plus, Sun, AlertTriangle,
  CheckCircle, TrendingUp, TrendingDown, X, Trash2, Zap, Droplets, Send, RefreshCw,
  Wifi, Activity, Gauge, Thermometer, Plug, Power, Settings, SunMedium, CloudSun,
  Compass, Crosshair, CloudRain, Pencil, Shield, LogOut, Lock, Users, UserPlus,
  ScrollText, Server, Eye
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ─── CONFIG (single point of integration) ─────────────────────────────────────
const BACKEND_BASE = "";
const INVERTER_API = `${BACKEND_BASE}/api/inverters`;
const AI_ENDPOINT  = BACKEND_BASE ? `${BACKEND_BASE}/api/chat`        : "https://api.anthropic.com/v1/messages";
const AUTH_ENDPOINT= BACKEND_BASE ? `${BACKEND_BASE}/api/auth/login`  : null;
const DEFAULT_SITE = { lat:31.78, lon:35.21, albedo:0.2, livePOA:false };

// ─── AUTH MODEL ───────────────────────────────────────────────────────────────
const ROLES = { admin:{ rank:3 }, operator:{ rank:2 }, viewer:{ rank:1 } };
const DEMO_USERS = [
  { id:1, name:"Daniel — Admin",   email:"admin@solarwash.io",    password:"admin123",    role:"admin",    status:"active" },
  { id:2, name:"Field Operator",   email:"operator@solarwash.io", password:"operator123", role:"operator", status:"active" },
  { id:3, name:"Client Viewer",    email:"viewer@solarwash.io",   password:"viewer123",   role:"viewer",   status:"active" },
];

// ─── THEME ──────────────────────────────────────────────────────────────────
const T = { bg:"#06080E", panel:"#0A111E", card:"#0C1422", cardBorder:"#182138", accent:"#F59E0B", green:"#10B981", red:"#EF4444", blue:"#3B82F6", purple:"#8B5CF6", cyan:"#06B6D4", textPrimary:"#F1F5F9", textSecondary:"#64748B", textMuted:"#2D3E58" };

// ─── i18n ─────────────────────────────────────────────────────────────────────
const LOCALES = { ru:{code:"ru-RU",dir:"ltr",label:"RU"}, en:{code:"en-US",dir:"ltr",label:"EN"}, he:{code:"he-IL",dir:"rtl",label:"עב"} };
const I18N = {
  en:{
    "nav.dashboard":"Dashboard","nav.inverters":"Inverters","nav.zones":"Zones","nav.schedule":"Schedule","nav.analytics":"Analytics","nav.ai":"AI Assistant","nav.admin":"Admin",
    "brand.tag":"WEB · O&M","side.live":"Live","side.offline":"Offline","side.currentAc":"current AC output","side.settings":"Site settings","side.logout":"Sign out",
    "mode.live":"Live backend","mode.demo":"Demo data","status.clean":"Clean","status.dirty":"Soiled","status.critical":"Critical","status.idle":"Idle",
    "role.admin":"Administrator","role.operator":"Operator","role.viewer":"Viewer",
    "login.title":"Sign in to SolarWash","login.sub":"O&M control panel · inverter integration","login.email":"Email","login.password":"Password","login.submit":"Sign in","login.signing":"Signing in…","login.errBad":"Invalid email or password","login.errNet":"Connection error — check the backend","login.demo":"Demo accounts — click to fill","login.secure":"This demo keeps the session in memory. Production authenticates against /api/auth/login with token-based sessions.",
    "dash.title":"Live Dashboard","dash.sub":"{n} inverters · {s} strings · real-time telemetry · {mode}",
    "dash.criticalAlert":"Soiling critical on {zones} — performance below 65%","dash.cleanAll":"Clean all critical",
    "st.acPower":"AC POWER","st.expected":"expected {v}","st.energyToday":"ENERGY TODAY","st.allInverters":"all inverters","st.avgPerf":"AVG PERFORMANCE","st.perfRatio":"performance ratio","st.soilingLoss":"SOILING LOSS","st.perDay":"≈ ${v}/day","st.poa":"AVG POA","st.irrSource":"source: {s}",
    "dash.powerChart":"SYSTEM POWER · ACTUAL vs EXPECTED (live)","lg.actual":"Actual AC output","lg.expected":"Expected (clean potential)","dash.fleetPR":"FLEET PERFORMANCE RATIO","ring.pr":"PR","dash.optimal":"✓ Optimal output","dash.recommend":"⚠ Cleaning recommended","dash.significant":"✗ Significant soiling loss","dash.stringStatus":"STRING STATUS","btn.clean":"Clean",
    "irr.ghi":"GHI","irr.poa":"POA","irr.elev":"Sun elevation","irr.modeled":"modeled","irr.live":"live",
    "site.title":"Site & Irradiance","site.lat":"Latitude","site.lon":"Longitude","site.albedo":"Ground albedo","site.usePoa":"Use live weather (POA)","site.usePoaDesc":"Fetch real irradiance from Open-Meteo. POA is computed per array from each string's tilt/azimuth.","site.save":"Save settings","site.perArray":"Tilt & azimuth are set per array on each zone card.",
    "inv.title":"Inverter Integrations","inv.sub":"Connect inverters via vendor APIs — data normalizes to a common schema","inv.connect":"Connect inverter","inv.supported":"SUPPORTED ADAPTERS","inv.none":"No inverters connected.","inv.acPower":"AC Power","inv.dcInput":"DC Input","inv.energyToday":"Energy Today","inv.temp":"Temp",
    "tbl.string":"STRING","tbl.power":"POWER","tbl.voltage":"VOLTAGE","tbl.orient":"TILT/AZ","tbl.pr":"PR","tbl.status":"STATUS",
    "inv.vendor":"Vendor","inv.displayName":"Display name","inv.demoNote":"Demo mode: a live simulator starts immediately. In production these credentials hit {ep} on your backend (see INVERTERS.md).","modal.connectTitle":"Connect inverter","modal.connectSub":"Credentials are sent to your backend connector","btn.connect":"Connect",
    "zones.title":"Cleaning Zones","zones.sub":"Each zone maps to an inverter string · POA & PR computed per array orientation","zones.via":"via {v}","zones.output":"Output","zones.potential":"Potential","zones.perfRatio":"Performance ratio","zones.cleanNow":"Clean now","zones.scheduled":"Scheduled clean","zones.cleaning":"Cleaning…","zones.idleNight":"Idle — no irradiance","zones.poaTag":"POA",
    "orient.title":"Array orientation","orient.tilt":"Tilt (°)","orient.azimuth":"Azimuth (° from North)","orient.hint":"180° = South · 90° = East · 270° = West","orient.save":"Save","orient.edit":"Edit orientation","orient.auto":"Auto-detect",
    "lab.title":"Orientation auto-calibration","lab.desc":"Recovers tilt & azimuth purely from the array's clear-day production curve — no manual input, no datasheet. (Demo: profile synthesized from this array's orientation + measurement noise, then estimated blind.)","lab.run":"Run estimation","lab.running":"Fitting curve…","lab.configured":"Configured","lab.detected":"Detected","lab.err":"Error","lab.rmse":"Fit RMSE","lab.fit":"Measured vs fitted production (clear day)","lab.measured":"Measured","lab.fitted":"Fitted","lab.apply":"Apply detected orientation","lab.method":"Method: grid-search over tilt×azimuth, transposing a clear-sky model to each candidate and minimizing shape RMSE vs the measured curve.",
    "sched.title":"Cleaning Schedule","sched.sub":"Smart peak-hour protection (09:00–17:00) — never clean during peak generation","sched.smart":"SMART AUTOMATION","sched.peak":"Peak-hour protection","sched.peakDesc":"Block cleaning between 09:00 and 17:00 to protect generation","sched.rain":"Rain delay","sched.rainDesc":"Skip cleaning when rain is forecast within 48h","sched.dust":"Dust-storm auto-clean","sched.dustDesc":"Trigger cleaning automatically after dust events","sched.min":"{n} min","sched.removed":"— (string removed)",
    "fc.title":"7-DAY WEATHER FORECAST","fc.source":"source: {s}","fc.loading":"Loading forecast…","fc.unavailable":"Forecast unavailable","fc.rain":"Rain — natural cleaning","fc.clean":"Good cleaning window","fc.normal":"Normal","fc.nextRain":"Rain expected {d} — scheduled cleanings will be deferred","fc.dryClean":"Dry & clear ahead — good window to clean soiled arrays","fc.today":"Today",
    "ai.title":"AI Assistant","ai.sub":"Powered by Claude · reads your live inverter telemetry","ai.greeting":"Connected to {inv} inverter(s), {s} strings. Live AC {ac}, fleet PR {pr}%. {extra} Ask me anything about soiling, scheduling or your inverter data.","ai.needs":"{n} string(s) need cleaning: {names}.","ai.good":"All strings performing well.","ai.q1":"Which string is losing the most energy?","ai.q2":"Is the soiling worth cleaning today?","ai.q3":"Should I clean before the forecast rain?","ai.q4":"Best cleaning schedule for these strings","ai.placeholder":"Ask about your fleet…","ai.err":"Connection error. Check your network.","ai.langInstr":"Respond in English.",
    "day.Mon":"Mon","day.Tue":"Tue","day.Wed":"Wed","day.Thu":"Thu","day.Fri":"Fri","day.Sat":"Sat","day.Sun":"Sun",
    "adm.title":"Admin Panel","adm.sub":"User management · API integration · system activity","adm.tab.users":"Users","adm.tab.system":"System & API","adm.tab.sites":"Sites","adm.tab.activity":"Activity",
    "adm.users.title":"USERS & ROLES","adm.users.add":"Add user","adm.users.name":"Name","adm.users.email":"Email","adm.users.role":"Role","adm.users.status":"Status","adm.users.active":"active","adm.users.you":"you","adm.users.addTitle":"Add user","adm.users.pw":"Temp password","adm.users.create":"Create user",
    "adm.sys.title":"API INTEGRATION & CONFIGURATION","adm.sys.note":"These map to the config constants at the top of the source. In production set them via environment / backend.","adm.sys.backend":"Backend base URL","adm.sys.backendHint":"Empty = demo (in-browser simulator). Set to your proxy to use live inverter / AI / weather APIs.","adm.sys.inverterApi":"Inverter API endpoint","adm.sys.aiEndpoint":"AI endpoint","adm.sys.auth":"Auth endpoint","adm.sys.pixel":"Facebook Pixel ID","adm.sys.sheet":"Google Sheets webhook URL","adm.sys.ipify":"Collect lead IP via ipify","adm.sys.save":"Save configuration","adm.sys.mode":"Current data mode","adm.sys.saved":"Configuration saved (in-memory for this session)","adm.sys.test":"Test connection","adm.sys.reachable":"reachable","adm.sys.unreachable":"unreachable / demo","adm.sys.endpoints":"ACTIVE ENDPOINTS",
    "adm.sites.title":"CONNECTED SITES & INVERTERS","adm.sites.none":"No connected inverters.","adm.sites.cap":"Capacity","adm.sites.strings":"Strings","adm.sites.pr":"Avg PR","adm.sites.vendor":"Vendor","adm.sites.status":"Status",
    "adm.act.title":"ACTIVITY LOG","adm.act.none":"No activity recorded yet.","adm.act.user":"User","adm.act.action":"Action","adm.act.detail":"Detail","adm.act.time":"Time",
    "act.login":"signed in","act.logout":"signed out","act.clean":"started cleaning","act.connect":"connected inverter","act.disconnect":"removed inverter","act.config":"updated configuration","act.userAdd":"added user","act.userRemove":"removed user","act.roleChange":"changed role","act.orient":"updated orientation",
  },
  ru:{
    "nav.dashboard":"Обзор","nav.inverters":"Инверторы","nav.zones":"Зоны","nav.schedule":"Расписание","nav.analytics":"Аналитика","nav.ai":"AI-ассистент","nav.admin":"Админка",
    "brand.tag":"WEB · O&M","side.live":"Онлайн","side.offline":"Офлайн","side.currentAc":"текущая AC мощность","side.settings":"Настройки объекта","side.logout":"Выйти",
    "mode.live":"Реальный бэкенд","mode.demo":"Демо-данные","status.clean":"Чисто","status.dirty":"Загрязнено","status.critical":"Критично","status.idle":"Простой",
    "role.admin":"Администратор","role.operator":"Оператор","role.viewer":"Наблюдатель",
    "login.title":"Вход в SolarWash","login.sub":"Панель O&M · интеграция инверторов","login.email":"Email","login.password":"Пароль","login.submit":"Войти","login.signing":"Вход…","login.errBad":"Неверный email или пароль","login.errNet":"Ошибка соединения — проверьте бэкенд","login.demo":"Демо-аккаунты — нажмите, чтобы заполнить","login.secure":"В демо сессия хранится в памяти. В проде — авторизация через /api/auth/login с токенами.",
    "dash.title":"Живой обзор","dash.sub":"{n} инверторов · {s} строк · телеметрия в реальном времени · {mode}",
    "dash.criticalAlert":"Критическое загрязнение: {zones} — эффективность ниже 65%","dash.cleanAll":"Помыть все критичные",
    "st.acPower":"AC МОЩНОСТЬ","st.expected":"ожидается {v}","st.energyToday":"ВЫРАБОТКА СЕГОДНЯ","st.allInverters":"все инверторы","st.avgPerf":"СРЕДНИЙ PR","st.perfRatio":"performance ratio","st.soilingLoss":"ПОТЕРЯ ОТ ГРЯЗИ","st.perDay":"≈ ${v}/день","st.poa":"СРЕДНИЙ POA","st.irrSource":"источник: {s}",
    "dash.powerChart":"МОЩНОСТЬ · ФАКТ vs ОЖИДАЕМАЯ (live)","lg.actual":"Фактическая AC","lg.expected":"Ожидаемая (чистый потенциал)","dash.fleetPR":"PERFORMANCE RATIO ФЛОТА","ring.pr":"PR","dash.optimal":"✓ Оптимальная выработка","dash.recommend":"⚠ Рекомендована мойка","dash.significant":"✗ Значительные потери от грязи","dash.stringStatus":"СОСТОЯНИЕ СТРОК","btn.clean":"Мойка",
    "irr.ghi":"GHI","irr.poa":"POA","irr.elev":"Высота солнца","irr.modeled":"модель","irr.live":"live",
    "site.title":"Объект и инсоляция","site.lat":"Широта","site.lon":"Долгота","site.albedo":"Альбедо поверхности","site.usePoa":"Реальная погода (POA)","site.usePoaDesc":"Брать реальную инсоляцию из Open-Meteo. POA считается отдельно для каждого массива по его наклону/азимуту.","site.save":"Сохранить","site.perArray":"Наклон и азимут задаются для каждого массива на карточке зоны.",
    "inv.title":"Интеграция инверторов","inv.sub":"Подключение инверторов через API вендоров — данные нормализуются в единую схему","inv.connect":"Подключить инвертор","inv.supported":"ПОДДЕРЖИВАЕМЫЕ АДАПТЕРЫ","inv.none":"Нет подключённых инверторов.","inv.acPower":"AC мощность","inv.dcInput":"DC вход","inv.energyToday":"Выработка сегодня","inv.temp":"Темп.",
    "tbl.string":"СТРОКА","tbl.power":"МОЩНОСТЬ","tbl.voltage":"НАПРЯЖЕНИЕ","tbl.orient":"НАКЛ/АЗ","tbl.pr":"PR","tbl.status":"СТАТУС",
    "inv.vendor":"Вендор","inv.displayName":"Название","inv.demoNote":"Демо-режим: симулятор стартует сразу. В проде эти креды идут на {ep} вашего бэкенда (см. INVERTERS.md).","modal.connectTitle":"Подключить инвертор","modal.connectSub":"Креды отправляются на ваш бэкенд-коннектор","btn.connect":"Подключить",
    "zones.title":"Зоны мойки","zones.sub":"Каждая зона = строка инвертора · POA и PR считаются по ориентации каждого массива","zones.via":"через {v}","zones.output":"Выход","zones.potential":"Потенциал","zones.perfRatio":"Performance ratio","zones.cleanNow":"Помыть сейчас","zones.scheduled":"Плановая мойка","zones.cleaning":"Мойка…","zones.idleNight":"Простой — нет инсоляции","zones.poaTag":"POA",
    "orient.title":"Ориентация массива","orient.tilt":"Наклон (°)","orient.azimuth":"Азимут (° от севера)","orient.hint":"180° = Юг · 90° = Восток · 270° = Запад","orient.save":"Сохранить","orient.edit":"Изменить ориентацию","orient.auto":"Авто-определение",
    "lab.title":"Авто-калибровка ориентации","lab.desc":"Восстанавливает наклон и азимут только по форме суточной кривой выработки на ясный день — без ручного ввода и даташита. (Демо: профиль синтезирован из ориентации этого массива + шум измерений, затем оценён вслепую.)","lab.run":"Запустить оценку","lab.running":"Подгонка кривой…","lab.configured":"Задано","lab.detected":"Определено","lab.err":"Ошибка","lab.rmse":"RMSE подгонки","lab.fit":"Измеренная vs подогнанная выработка (ясный день)","lab.measured":"Измерено","lab.fitted":"Подгонка","lab.apply":"Применить найденную ориентацию","lab.method":"Метод: перебор по сетке наклон×азимут, транспозиция clear-sky модели на каждого кандидата и минимизация RMSE формы относительно измеренной кривой.",
    "sched.title":"Расписание мойки","sched.sub":"Умная защита пиковых часов (09:00–17:00) — не мыть во время пиковой выработки","sched.smart":"УМНАЯ АВТОМАТИЗАЦИЯ","sched.peak":"Защита пиковых часов","sched.peakDesc":"Блокировать мойку с 09:00 до 17:00","sched.rain":"Отсрочка при дожде","sched.rainDesc":"Пропускать мойку при прогнозе дождя в 48ч","sched.dust":"Авто-мойка при пыли","sched.dustDesc":"Запуск мойки после пыльных бурь","sched.min":"{n} мин","sched.removed":"— (строка удалена)",
    "fc.title":"ПРОГНОЗ ПОГОДЫ НА 7 ДНЕЙ","fc.source":"источник: {s}","fc.loading":"Загрузка прогноза…","fc.unavailable":"Прогноз недоступен","fc.rain":"Дождь — естественная мойка","fc.clean":"Хорошее окно для мойки","fc.normal":"Норма","fc.nextRain":"Ожидается дождь {d} — плановые мойки будут отложены","fc.dryClean":"Впереди сухо и ясно — хорошее окно помыть грязные массивы","fc.today":"Сегодня",
    "ai.title":"AI-ассистент","ai.sub":"На базе Claude · читает живую телеметрию инверторов","ai.greeting":"Подключено инверторов: {inv}, строк: {s}. Текущая AC {ac}, PR флота {pr}%. {extra} Спрашивайте про загрязнение, расписание или данные инверторов.","ai.needs":"Требуют мойки: {names} ({n}).","ai.good":"Все строки работают хорошо.","ai.q1":"Какая строка теряет больше всего энергии?","ai.q2":"Стоит ли мыть сегодня?","ai.q3":"Помыть до прогнозируемого дождя?","ai.q4":"Лучшее расписание мойки для этих строк","ai.placeholder":"Спросите про ваш флот…","ai.err":"Ошибка соединения. Проверьте сеть.","ai.langInstr":"Отвечай на русском.",
    "day.Mon":"Пн","day.Tue":"Вт","day.Wed":"Ср","day.Thu":"Чт","day.Fri":"Пт","day.Sat":"Сб","day.Sun":"Вс",
    "adm.title":"Админ-панель","adm.sub":"Управление пользователями · интеграция API · активность системы","adm.tab.users":"Пользователи","adm.tab.system":"Система и API","adm.tab.sites":"Объекты","adm.tab.activity":"Активность",
    "adm.users.title":"ПОЛЬЗОВАТЕЛИ И РОЛИ","adm.users.add":"Добавить","adm.users.name":"Имя","adm.users.email":"Email","adm.users.role":"Роль","adm.users.status":"Статус","adm.users.active":"активен","adm.users.you":"вы","adm.users.addTitle":"Новый пользователь","adm.users.pw":"Временный пароль","adm.users.create":"Создать",
    "adm.sys.title":"ИНТЕГРАЦИЯ API И КОНФИГУРАЦИЯ","adm.sys.note":"Соответствуют константам в начале исходника. В проде задаются через окружение / бэкенд.","adm.sys.backend":"Базовый URL бэкенда","adm.sys.backendHint":"Пусто = демо (браузерный симулятор). Укажите ваш прокси для живых API инверторов / AI / погоды.","adm.sys.inverterApi":"Endpoint инверторов","adm.sys.aiEndpoint":"AI endpoint","adm.sys.auth":"Auth endpoint","adm.sys.pixel":"Facebook Pixel ID","adm.sys.sheet":"Google Sheets webhook URL","adm.sys.ipify":"Сбор IP лида через ipify","adm.sys.save":"Сохранить конфигурацию","adm.sys.mode":"Текущий режим данных","adm.sys.saved":"Конфигурация сохранена (в памяти сессии)","adm.sys.test":"Проверить соединение","adm.sys.reachable":"доступен","adm.sys.unreachable":"недоступен / демо","adm.sys.endpoints":"АКТИВНЫЕ ENDPOINTS",
    "adm.sites.title":"ПОДКЛЮЧЁННЫЕ ОБЪЕКТЫ И ИНВЕРТОРЫ","adm.sites.none":"Нет подключённых инверторов.","adm.sites.cap":"Мощность","adm.sites.strings":"Строки","adm.sites.pr":"Средний PR","adm.sites.vendor":"Вендор","adm.sites.status":"Статус",
    "adm.act.title":"ЖУРНАЛ АКТИВНОСТИ","adm.act.none":"Активность пока не зафиксирована.","adm.act.user":"Пользователь","adm.act.action":"Действие","adm.act.detail":"Детали","adm.act.time":"Время",
    "act.login":"вошёл в систему","act.logout":"вышел","act.clean":"запустил мойку","act.connect":"подключил инвертор","act.disconnect":"удалил инвертор","act.config":"обновил конфигурацию","act.userAdd":"добавил пользователя","act.userRemove":"удалил пользователя","act.roleChange":"изменил роль","act.orient":"обновил ориентацию",
  },
  he:{
    "nav.dashboard":"לוח בקרה","nav.inverters":"ממירים","nav.zones":"אזורים","nav.schedule":"תזמון","nav.analytics":"אנליטיקה","nav.ai":"עוזר AI","nav.admin":"ניהול",
    "brand.tag":"WEB · O&M","side.live":"חי","side.offline":"לא מקוון","side.currentAc":"הספק AC נוכחי","side.settings":"הגדרות אתר","side.logout":"התנתק",
    "mode.live":"שרת אמיתי","mode.demo":"נתוני דמו","status.clean":"נקי","status.dirty":"מלוכלך","status.critical":"קריטי","status.idle":"במנוחה",
    "role.admin":"מנהל","role.operator":"מפעיל","role.viewer":"צופה",
    "login.title":"כניסה ל-SolarWash","login.sub":"לוח בקרת O&M · אינטגרציית ממירים","login.email":"אימייל","login.password":"סיסמה","login.submit":"כניסה","login.signing":"מתחבר…","login.errBad":"אימייל או סיסמה שגויים","login.errNet":"שגיאת חיבור — בדוק את השרת","login.demo":"חשבונות דמו — לחץ למילוי","login.secure":"בדמו הסשן נשמר בזיכרון. בפרודקשן ההזדהות מול /api/auth/login עם טוקנים.",
    "dash.title":"לוח בקרה חי","dash.sub":"{n} ממירים · {s} מחרוזות · טלמטריה בזמן אמת · {mode}",
    "dash.criticalAlert":"לכלוך קריטי ב-{zones} — ביצועים מתחת ל-65%","dash.cleanAll":"נקה את כל הקריטיים",
    "st.acPower":"הספק AC","st.expected":"צפוי {v}","st.energyToday":"אנרגיה היום","st.allInverters":"כל הממירים","st.avgPerf":"PR ממוצע","st.perfRatio":"performance ratio","st.soilingLoss":"אובדן מלכלוך","st.perDay":"≈ ${v}/יום","st.poa":"POA ממוצע","st.irrSource":"מקור: {s}",
    "dash.powerChart":"הספק · בפועל מול צפוי (חי)","lg.actual":"הספק AC בפועל","lg.expected":"צפוי (פוטנציאל נקי)","dash.fleetPR":"PERFORMANCE RATIO של הצי","ring.pr":"PR","dash.optimal":"✓ תפוקה אופטימלית","dash.recommend":"⚠ מומלץ ניקוי","dash.significant":"✗ אובדן משמעותי מלכלוך","dash.stringStatus":"מצב מחרוזות","btn.clean":"נקה",
    "irr.ghi":"GHI","irr.poa":"POA","irr.elev":"גובה השמש","irr.modeled":"מודל","irr.live":"חי",
    "site.title":"אתר וקרינה","site.lat":"קו רוחב","site.lon":"קו אורך","site.albedo":"אלבדו קרקע","site.usePoa":"מזג אוויר חי (POA)","site.usePoaDesc":"משוך קרינה אמיתית מ-Open-Meteo. POA מחושב לכל מערך לפי השיפוע/אזימוט שלו.","site.save":"שמור","site.perArray":"שיפוע ואזימוט נקבעים לכל מערך בכרטיס האזור.",
    "inv.title":"אינטגרציית ממירים","inv.sub":"חבר ממירים דרך API של יצרנים — הנתונים מנורמלים לסכמה אחת","inv.connect":"חבר ממיר","inv.supported":"מתאמים נתמכים","inv.none":"אין ממירים מחוברים.","inv.acPower":"הספק AC","inv.dcInput":"כניסת DC","inv.energyToday":"אנרגיה היום","inv.temp":"טמפ׳",
    "tbl.string":"מחרוזת","tbl.power":"הספק","tbl.voltage":"מתח","tbl.orient":"שיפוע/אז","tbl.pr":"PR","tbl.status":"סטטוס",
    "inv.vendor":"יצרן","inv.displayName":"שם תצוגה","inv.demoNote":"מצב דמו: סימולטור חי מתחיל מיד. בפרודקשן הפרטים נשלחים אל {ep} בשרת שלך (ראה INVERTERS.md).","modal.connectTitle":"חבר ממיר","modal.connectSub":"הפרטים נשלחים למחבר בצד השרת","btn.connect":"חבר",
    "zones.title":"אזורי ניקוי","zones.sub":"כל אזור = מחרוזת ממיר · POA ו-PR מחושבים לפי כיוון כל מערך","zones.via":"דרך {v}","zones.output":"תפוקה","zones.potential":"פוטנציאל","zones.perfRatio":"Performance ratio","zones.cleanNow":"נקה עכשיו","zones.scheduled":"ניקוי מתוזמן","zones.cleaning":"מנקה…","zones.idleNight":"במנוחה — אין קרינה","zones.poaTag":"POA",
    "orient.title":"כיוון מערך","orient.tilt":"שיפוע (°)","orient.azimuth":"אזימוט (° מצפון)","orient.hint":"180° = דרום · 90° = מזרח · 270° = מערב","orient.save":"שמור","orient.edit":"ערוך כיוון","orient.auto":"זיהוי אוטומטי",
    "lab.title":"כיול כיוון אוטומטי","lab.desc":"משחזר שיפוע ואזימוט אך ורק מצורת עקומת הייצור של המערך ביום בהיר — ללא קלט ידני. (דמו: הפרופיל סונתז מכיוון המערך + רעש מדידה, ואז הוערך בעיוורון.)","lab.run":"הרץ הערכה","lab.running":"מתאים עקומה…","lab.configured":"מוגדר","lab.detected":"זוהה","lab.err":"שגיאה","lab.rmse":"RMSE התאמה","lab.fit":"מדידה מול התאמה (יום בהיר)","lab.measured":"נמדד","lab.fitted":"התאמה","lab.apply":"החל כיוון שזוהה","lab.method":"שיטה: חיפוש רשת על שיפוע×אזימוט, טרנספוזיציה של מודל שמיים בהירים לכל מועמד ומזעור RMSE של הצורה מול העקומה הנמדדת.",
    "sched.title":"תזמון ניקוי","sched.sub":"הגנת שעות שיא (09:00–17:00) — לא לנקות בזמן ייצור שיא","sched.smart":"אוטומציה חכמה","sched.peak":"הגנת שעות שיא","sched.peakDesc":"חסום ניקוי בין 09:00 ל-17:00","sched.rain":"דחייה בגשם","sched.rainDesc":"דלג על ניקוי אם צפוי גשם ב-48ש","sched.dust":"ניקוי אוטומטי בסופת אבק","sched.dustDesc":"הפעל ניקוי אוטומטית אחרי אירועי אבק","sched.min":"{n} דק׳","sched.removed":"— (מחרוזת הוסרה)",
    "fc.title":"תחזית מזג אוויר ל-7 ימים","fc.source":"מקור: {s}","fc.loading":"טוען תחזית…","fc.unavailable":"תחזית לא זמינה","fc.rain":"גשם — ניקוי טבעי","fc.clean":"חלון ניקוי טוב","fc.normal":"רגיל","fc.nextRain":"צפוי גשם {d} — ניקויים מתוזמנים יידחו","fc.dryClean":"יבש ובהיר לפנינו — חלון טוב לנקות מערכים מלוכלכים","fc.today":"היום",
    "ai.title":"עוזר AI","ai.sub":"מבוסס Claude · קורא טלמטריה חיה של הממירים","ai.greeting":"מחוברים {inv} ממירים, {s} מחרוזות. הספק AC {ac}, PR של הצי {pr}%. {extra} שאל אותי על לכלוך, תזמון או נתוני הממירים.","ai.needs":"דורשות ניקוי: {names} ({n}).","ai.good":"כל המחרוזות מתפקדות היטב.","ai.q1":"איזו מחרוזת מאבדת הכי הרבה אנרגיה?","ai.q2":"האם כדאי לנקות היום?","ai.q3":"לנקות לפני הגשם הצפוי?","ai.q4":"התזמון הטוב ביותר לניקוי המחרוזות","ai.placeholder":"שאל על הצי שלך…","ai.err":"שגיאת חיבור. בדוק את הרשת.","ai.langInstr":"ענה בעברית.",
    "day.Mon":"ב׳","day.Tue":"ג׳","day.Wed":"ד׳","day.Thu":"ה׳","day.Fri":"ו׳","day.Sat":"שבת","day.Sun":"א׳",
    "adm.title":"פאנל ניהול","adm.sub":"ניהול משתמשים · אינטגרציית API · פעילות מערכת","adm.tab.users":"משתמשים","adm.tab.system":"מערכת ו-API","adm.tab.sites":"אתרים","adm.tab.activity":"פעילות",
    "adm.users.title":"משתמשים ותפקידים","adm.users.add":"הוסף","adm.users.name":"שם","adm.users.email":"אימייל","adm.users.role":"תפקיד","adm.users.status":"סטטוס","adm.users.active":"פעיל","adm.users.you":"אתה","adm.users.addTitle":"משתמש חדש","adm.users.pw":"סיסמה זמנית","adm.users.create":"צור",
    "adm.sys.title":"אינטגרציית API והגדרות","adm.sys.note":"תואמים לקבועים בראש הקוד. בפרודקשן נקבעים דרך סביבה / שרת.","adm.sys.backend":"כתובת בסיס לשרת","adm.sys.backendHint":"ריק = דמו (סימולטור בדפדפן). הזן פרוקסי ל-API חי של ממירים / AI / מזג אוויר.","adm.sys.inverterApi":"Endpoint ממירים","adm.sys.aiEndpoint":"AI endpoint","adm.sys.auth":"Auth endpoint","adm.sys.pixel":"Facebook Pixel ID","adm.sys.sheet":"Google Sheets webhook URL","adm.sys.ipify":"איסוף IP של ליד דרך ipify","adm.sys.save":"שמור הגדרות","adm.sys.mode":"מצב נתונים נוכחי","adm.sys.saved":"ההגדרות נשמרו (בזיכרון הסשן)","adm.sys.test":"בדוק חיבור","adm.sys.reachable":"זמין","adm.sys.unreachable":"לא זמין / דמו","adm.sys.endpoints":"ENDPOINTS פעילים",
    "adm.sites.title":"אתרים וממירים מחוברים","adm.sites.none":"אין ממירים מחוברים.","adm.sites.cap":"הספק","adm.sites.strings":"מחרוזות","adm.sites.pr":"PR ממוצע","adm.sites.vendor":"יצרן","adm.sites.status":"סטטוס",
    "adm.act.title":"יומן פעילות","adm.act.none":"טרם נרשמה פעילות.","adm.act.user":"משתמש","adm.act.action":"פעולה","adm.act.detail":"פרטים","adm.act.time":"זמן",
    "act.login":"התחבר","act.logout":"התנתק","act.clean":"הפעיל ניקוי","act.connect":"חיבר ממיר","act.disconnect":"הסיר ממיר","act.config":"עדכן הגדרות","act.userAdd":"הוסיף משתמש","act.userRemove":"הסיר משתמש","act.roleChange":"שינה תפקיד","act.orient":"עדכן כיוון",
  },
};
const LocaleCtx = createContext(null);
const AuthCtx = createContext(null);
const useT = () => useContext(LocaleCtx);
const useAuth = () => useContext(AuthCtx);
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
function clearSky(zenithDeg){
  const cosz=Math.max(0,Math.cos(zenithDeg*Math.PI/180));
  if(cosz<=0.01) return { ghi:0, dni:0, dhi:0 };
  const AM=1/(cosz+0.50572*Math.pow(Math.max(0.1,96.07995-zenithDeg),-1.6364));
  const dni=900*Math.pow(0.7, Math.pow(AM,0.678));
  const dhi=0.10*dni*cosz+8;
  return { ghi:dni*cosz+dhi, dni, dhi };
}

// ─── ORIENTATION AUTO-ESTIMATOR ───────────────────────────────────────────────
function syntheticDayProfile(lat, lon, tilt, az, albedo){
  const samples=[]; const base=new Date(); base.setUTCHours(0,0,0,0);
  for(let m=0;m<1440;m+=20){
    const date=new Date(base.getTime()+m*60000);
    const sp=solarPosition(date,lat,lon);
    if(sp.elevationDeg<4) continue;
    const cs=clearSky(sp.zenithDeg);
    const poa=computePOA(cs.ghi,cs.dni,cs.dhi,sp.zenithDeg,sp.azimuthDeg,tilt,az,albedo);
    samples.push({ date, power: poa*(0.94+Math.random()*0.12) });
  }
  return samples;
}
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
  const modArr=samples.map(s=>{ const sp=solarPosition(s.date,lat,lon); const cs=clearSky(sp.zenithDeg); return computePOA(cs.ghi,cs.dni,cs.dhi,sp.zenithDeg,sp.azimuthDeg,best.tilt,best.azimuth,albedo); });
  const fitMax=Math.max(...modArr,1e-9);
  const profile=samples.map((s,i)=>({ h:+(s.date.getUTCHours()+s.date.getUTCMinutes()/60).toFixed(2), measured:+(measN[i]*100).toFixed(1), fitted:+(modArr[i]/fitMax*100).toFixed(1) }));
  return { ...best, rmse:+(best.rmse*100).toFixed(1), profile };
}

// ─── IRRADIANCE HOOK ──────────────────────────────────────────────────────────
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

// ─── WEATHER FORECAST HOOK (Open-Meteo) ───────────────────────────────────────
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

// ─── MOCK ENGINE ──────────────────────────────────────────────────────────────
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
const roleColor=r=>r==="admin"?T.accent:r==="operator"?T.blue:T.textSecondary;

// ─── FLEET HOOK ───────────────────────────────────────────────────────────────
const SEED=[{ id:"se-1", vendor:"solaredge", name:"Main Roof — SolarEdge", capacityKw:12.6, status:"online",
  strings:[{name:"Array A — South",tilt:30,azimuth:180},{name:"Array B — West",tilt:25,azimuth:270},{name:"Array C — East",tilt:25,azimuth:90},{name:"Carport",tilt:8,azimuth:180}], soil:[0.87,0.71,0.55,0.94] }];

function useFleet(sky, log){
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
    setConnectors(p=>[...p,{ id, vendor, name:name||`${v.name} site`, capacityKw:v.kw, status:"online", strings, soil:strings.map(()=>0.90+Math.random()*0.07), creds }]); log&&log("connect",v.name); };
  const removeConnector=id=>{ delete enginesRef.current[id]; if(mode==="live") fetch(`${INVERTER_API}/${id}`,{method:"DELETE"}).catch(()=>{}); setConnectors(p=>p.filter(c=>c.id!==id)); log&&log("disconnect",id); };
  const washString=(cid,idx)=>{ if(mode==="live") fetch(`${BACKEND_BASE}/api/zones/${cid}:${idx}/clean`,{method:"POST"}).catch(()=>{}); else enginesRef.current[cid]?.wash(idx); log&&log("clean",`${cid}:${idx}`); };
  const updateString=(cid,idx,patch)=>{ setConnectors(p=>p.map(c=>c.id!==cid?c:{...c,strings:c.strings.map((s,i)=>i!==idx?s:{...s,...patch})})); log&&log("orient",`${cid}:${idx} → ${patch.tilt}°/${patch.azimuth}°`); };
  return { connectors, telemetry, powerHist, zones, mode, addConnector, removeConnector, washString, updateString };
}

// ─── ATOMS ────────────────────────────────────────────────────────────────────
const Card=({children,style})=><div style={{ background:T.card, border:`1px solid ${T.cardBorder}`, borderRadius:16, padding:20, ...style }}>{children}</div>;
function Stat({label,value,sub,icon:Icon,color=T.accent,trend}){
  return <Card><div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}><div style={{ width:38,height:38,borderRadius:11,background:color+"18",display:"flex",alignItems:"center",justifyContent:"center" }}><Icon size={19} color={color}/></div>{trend!=null&&<div style={{ display:"flex",alignItems:"center",gap:3,fontSize:12,fontWeight:700,color:trend>=0?T.green:T.red }}>{trend>=0?<TrendingUp size={13}/>:<TrendingDown size={13}/>}{Math.abs(trend)}%</div>}</div><div style={{ fontSize:26,fontWeight:800,color:T.textPrimary,fontFamily:"monospace",lineHeight:1 }}>{value}</div><div style={{ fontSize:11,color:T.textSecondary,marginTop:7,fontWeight:600,letterSpacing:".04em" }}>{label}</div>{sub&&<div style={{ fontSize:11,color:T.textMuted,marginTop:3 }}>{sub}</div>}</Card>;
}
function Ring({pct,size=130,stroke=11,color}){
  const r=(size-stroke)/2, c=2*Math.PI*r, off=c-(Math.min(100,pct)/100)*c, col=color||prColor(pct);
  return <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}><circle cx={size/2} cy={size/2} r={r} stroke={T.cardBorder} strokeWidth={stroke} fill="none"/><circle cx={size/2} cy={size/2} r={r} stroke={col} strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" style={{ transition:"stroke-dashoffset .7s ease, stroke .4s" }}/></svg>;
}
function Toggle({on,onChange,disabled}){
  return <button onClick={disabled?undefined:onChange} disabled={disabled} style={{ width:42,height:24,borderRadius:12,border:"none",background:on?T.accent:T.cardBorder,position:"relative",cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.45:1,transition:"background .2s",flexShrink:0 }}><span style={{ position:"absolute",top:3,left:on?21:3,width:18,height:18,borderRadius:9,background:"#fff",transition:"left .2s" }}/></button>;
}
function VendorBadge({vendor,size=30}){ const v=VENDORS[vendor]; return <div style={{ width:size,height:size,borderRadius:size*0.28,background:v.color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><span style={{ color:v.txt,fontWeight:800,fontSize:size*0.42 }}>{v.name[0]}</span></div>; }
function StatusDot({status}){ const { t }=useT(); const c=statusColor(status); return <span style={{ display:"inline-flex",alignItems:"center",gap:6,fontSize:12,fontWeight:700,color:c }}><span style={{ width:7,height:7,borderRadius:4,background:c,boxShadow:`0 0 8px ${c}` }}/>{t("status."+status)}</span>; }
function SectionTitle({children}){ return <h3 style={{ margin:"0 0 2px",fontSize:12,fontWeight:800,color:T.textSecondary,letterSpacing:".09em" }}>{children}</h3>; }
function FieldLabel({children}){ return <label style={{ display:"block",fontSize:12,fontWeight:600,color:T.textSecondary,margin:"14px 0 6px" }}>{children}</label>; }
function Input({value,onChange,placeholder,type="text"}){ return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ width:"100%",boxSizing:"border-box",padding:"11px 13px",borderRadius:10,border:`1px solid ${T.cardBorder}`,background:T.bg,color:T.textPrimary,fontSize:14,fontFamily:"inherit",outline:"none" }}/>; }
function Overlay({children}){ return <div style={{ position:"fixed",inset:0,background:"rgba(2,4,10,.78)",backdropFilter:"blur(5px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:20 }}>{children}</div>; }
function RoleBadge({role}){ const { t }=useT(); const c=roleColor(role); return <span style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:7,background:c+"1A",color:c,fontSize:11,fontWeight:800,letterSpacing:".03em" }}>{role==="admin"?<Shield size={11}/>:role==="operator"?<Settings size={11}/>:<Eye size={11}/>}{t("role."+role)}</span>; }
const Header=({title,sub,right})=>(<div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12 }}><div><h1 style={{ margin:0,fontSize:23,fontWeight:900,color:T.textPrimary }}>{title}</h1><p style={{ margin:"5px 0 0",fontSize:13,color:T.textSecondary }}>{sub}</p></div>{right}</div>);

// ─── SITE MODAL ───────────────────────────────────────────────────────────────
function SiteModal({site,setSite,irr,onClose}){
  const { t }=useT(); const [f,setF]=useState(site);
  const save=()=>{ setSite({ lat:parseFloat(f.lat)||0, lon:parseFloat(f.lon)||0, albedo:parseFloat(f.albedo)||0.2, livePOA:f.livePOA }); onClose(); };
  return <Overlay><div style={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:18,padding:28,width:440,maxWidth:"100%" }}>
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}><h2 style={{ margin:0,color:T.textPrimary,fontSize:18,fontWeight:800 }}>{t("site.title")}</h2><button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:T.textSecondary }}><X size={20}/></button></div>
    <div style={{ display:"flex",gap:12 }}><div style={{ flex:1 }}><FieldLabel>{t("site.lat")}</FieldLabel><Input value={f.lat} onChange={v=>setF(p=>({...p,lat:v}))}/></div><div style={{ flex:1 }}><FieldLabel>{t("site.lon")}</FieldLabel><Input value={f.lon} onChange={v=>setF(p=>({...p,lon:v}))}/></div></div>
    <FieldLabel>{t("site.albedo")}</FieldLabel><Input value={f.albedo} onChange={v=>setF(p=>({...p,albedo:v}))}/>
    <div style={{ marginTop:18,padding:"13px 15px",background:T.bg,borderRadius:11,border:`1px solid ${T.cardBorder}` }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}><div style={{ fontSize:14,fontWeight:700,color:T.textPrimary }}>{t("site.usePoa")}</div><Toggle on={f.livePOA} onChange={()=>setF(p=>({...p,livePOA:!p.livePOA}))}/></div>
      <div style={{ fontSize:12,color:T.textMuted,marginTop:7,lineHeight:1.5 }}>{t("site.usePoaDesc")}</div>
      <div dir="ltr" style={{ display:"flex",gap:14,marginTop:11,fontSize:12,fontFamily:"monospace" }}><span style={{ color:T.textSecondary }}>{t("irr.ghi")}: <b style={{ color:T.accent }}>{irr.ghi}</b></span><span style={{ color:T.textSecondary }}>{t("irr.elev")}: <b style={{ color:T.accent }}>{irr.elevationDeg}°</b></span><span style={{ color:irr.live?T.cyan:T.textMuted }}>{irr.source}</span></div>
    </div>
    <div style={{ fontSize:11,color:T.textMuted,marginTop:12,lineHeight:1.5 }}>{t("site.perArray")}</div>
    <button onClick={save} style={{ width:"100%",marginTop:18,padding:"12px",background:T.accent,border:"none",borderRadius:11,color:"#000",fontWeight:800,fontSize:14,cursor:"pointer" }}>{t("site.save")}</button>
  </div></Overlay>;
}

// ─── ORIENTATION MODAL ────────────────────────────────────────────────────────
function OrientationModal({zone,onSave,onClose}){
  const { t }=useT(); const [tilt,setTilt]=useState(zone.tilt); const [az,setAz]=useState(zone.azimuth);
  return <Overlay><div style={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:18,padding:26,width:380,maxWidth:"100%" }}>
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}><h2 style={{ margin:0,color:T.textPrimary,fontSize:17,fontWeight:800 }}>{t("orient.title")}</h2><button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:T.textSecondary }}><X size={20}/></button></div>
    <div style={{ fontSize:13,color:T.accent,fontWeight:600,marginBottom:8 }}>{zone.name}</div>
    <FieldLabel>{t("orient.tilt")} — <b style={{ color:T.accent }}>{tilt}°</b></FieldLabel>
    <input type="range" min="0" max="60" value={tilt} onChange={e=>setTilt(+e.target.value)} style={{ width:"100%",accentColor:T.accent }}/>
    <FieldLabel>{t("orient.azimuth")} — <b style={{ color:T.accent }}>{az}° {azToCompass(az)}</b></FieldLabel>
    <input type="range" min="0" max="359" value={az} onChange={e=>setAz(+e.target.value)} style={{ width:"100%",accentColor:T.accent }}/>
    <div style={{ fontSize:11,color:T.textMuted,marginTop:8 }}>{t("orient.hint")}</div>
    <button onClick={()=>onSave({ tilt, azimuth:az })} style={{ width:"100%",marginTop:18,padding:"12px",background:T.accent,border:"none",borderRadius:11,color:"#000",fontWeight:800,fontSize:14,cursor:"pointer" }}>{t("orient.save")}</button>
  </div></Overlay>;
}

// ─── ORIENTATION LAB (auto-calibration) ───────────────────────────────────────
function OrientationLab({zone,site,onApply,onClose}){
  const { t }=useT(); const [busy,setBusy]=useState(true); const [res,setRes]=useState(null);
  useEffect(()=>{ let stop=false; setBusy(true);
    const id=setTimeout(()=>{ const samples=syntheticDayProfile(site.lat,site.lon,zone.tilt,zone.azimuth,site.albedo); const r=estimateOrientation(samples,site.lat,site.lon,site.albedo); if(!stop){ setRes(r); setBusy(false); } },350);
    return ()=>{ stop=true; clearTimeout(id); }; },[zone.tilt,zone.azimuth,site.lat,site.lon,site.albedo]);
  const errT=res?Math.abs(res.tilt-zone.tilt):0, errA=res?Math.abs(res.azimuth-zone.azimuth):0;
  return <Overlay><div style={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:18,padding:26,width:560,maxWidth:"100%" }}>
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}><h2 style={{ margin:0,color:T.textPrimary,fontSize:17,fontWeight:800,display:"flex",alignItems:"center",gap:9 }}><Crosshair size={18} color={T.accent}/>{t("lab.title")}</h2><button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",color:T.textSecondary }}><X size={20}/></button></div>
    <div style={{ fontSize:13,color:T.accent,fontWeight:600,marginBottom:6 }}>{zone.name}</div>
    <div style={{ fontSize:12,color:T.textMuted,lineHeight:1.5,marginBottom:14 }}>{t("lab.desc")}</div>
    {busy&&<div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10,padding:"36px 0",color:T.textSecondary }}><RefreshCw size={18} style={{ animation:"spin 1s linear infinite" }}/>{t("lab.running")}</div>}
    {!busy&&res&&<>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:16 }}>
        <div style={{ padding:"13px",background:T.bg,borderRadius:11,border:`1px solid ${T.cardBorder}` }}><div style={{ fontSize:11,color:T.textSecondary,marginBottom:6 }}>{t("lab.configured")}</div><div style={{ fontSize:15,fontWeight:800,color:T.textPrimary,fontFamily:"monospace" }}>{zone.tilt}° / {zone.azimuth}°</div></div>
        <div style={{ padding:"13px",background:T.accent+"14",borderRadius:11,border:`1px solid ${T.accent}55` }}><div style={{ fontSize:11,color:T.accent,marginBottom:6 }}>{t("lab.detected")}</div><div style={{ fontSize:15,fontWeight:800,color:T.accent,fontFamily:"monospace" }}>{res.tilt}° / {res.azimuth}°</div></div>
        <div style={{ padding:"13px",background:T.bg,borderRadius:11,border:`1px solid ${T.cardBorder}` }}><div style={{ fontSize:11,color:T.textSecondary,marginBottom:6 }}>{t("lab.err")} · {t("lab.rmse")}</div><div style={{ fontSize:15,fontWeight:800,color:errT+errA<10?T.green:T.accent,fontFamily:"monospace" }}>±{errT}/{errA}° · {res.rmse}%</div></div>
      </div>
      <div style={{ fontSize:12,color:T.textSecondary,marginBottom:8 }}>{t("lab.fit")}</div>
      <div dir="ltr" style={{ height:170 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={res.profile}><CartesianGrid strokeDasharray="3 3" stroke={T.cardBorder}/><XAxis dataKey="h" stroke={T.textSecondary} tick={{fontSize:10}} tickFormatter={v=>`${Math.round(v)}h`}/><YAxis stroke={T.textSecondary} tick={{fontSize:10}} domain={[0,105]}/><Tooltip contentStyle={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:10,fontSize:12 }}/><Line type="monotone" dataKey="measured" name={t("lab.measured")} stroke={T.textSecondary} strokeWidth={2} dot={false}/><Line type="monotone" dataKey="fitted" name={t("lab.fitted")} stroke={T.accent} strokeWidth={2.4} dot={false}/></LineChart></ResponsiveContainer></div>
      <div style={{ fontSize:11,color:T.textMuted,margin:"10px 0 0",lineHeight:1.5 }}>{t("lab.method")}</div>
      <button onClick={()=>onApply({ tilt:res.tilt, azimuth:res.azimuth })} style={{ width:"100%",marginTop:16,padding:"12px",background:T.accent,border:"none",borderRadius:11,color:"#000",fontWeight:800,fontSize:14,cursor:"pointer" }}>{t("lab.apply")}</button>
    </>}
  </div></Overlay>;
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({fleet,irr}){
  const { t }=useT(); const { canWrite }=useAuth();
  const { connectors, telemetry, powerHist, zones, washString, mode }=fleet;
  const active=zones.filter(z=>!z.prNull);
  const sysAc=zones.reduce((a,z)=>a+z.acW,0), sysExp=zones.reduce((a,z)=>a+z.expectedW,0);
  const energy=Object.values(telemetry).reduce((a,t)=>a+(t.energyTodayWh||0),0);
  const avgPR=active.length?Math.round(active.reduce((a,z)=>a+z.eff,0)/active.length):0;
  const loss=Math.max(0,sysExp-sysAc), lossPct=sysExp>1?Math.round(loss/sysExp*100):0;
  const avgPoa=zones.length?Math.round(zones.reduce((a,z)=>a+z.poa,0)/zones.length):0;
  const critical=zones.filter(z=>z.status==="critical");
  const chartData=powerHist.map((p,i)=>({ i, actual:p.ac, expected:Math.round(p.ac*(avgPR>0?100/avgPR:1.3)) }));
  return <div style={{ padding:"26px 30px" }}>
    <Header title={t("dash.title")} sub={t("dash.sub",{n:connectors.length,s:zones.length,mode:mode==="live"?t("mode.live"):t("mode.demo")})}/>
    {critical.length>0&&canWrite&&<div style={{ display:"flex",alignItems:"center",gap:13,padding:"13px 17px",background:T.red+"14",border:`1px solid ${T.red}44`,borderRadius:13,marginBottom:20 }}><AlertTriangle size={20} color={T.red}/><div style={{ flex:1,fontSize:13.5,color:T.textPrimary }}>{t("dash.criticalAlert",{zones:critical.map(z=>z.name).join(", ")})}</div><button onClick={()=>critical.forEach(z=>washString(z.connectorId,z.idx))} style={{ padding:"9px 15px",background:T.red,border:"none",borderRadius:9,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",whiteSpace:"nowrap" }}>{t("dash.cleanAll")}</button></div>}
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(195px,1fr))",gap:14,marginBottom:18 }}>
      <Stat icon={Zap} label={t("st.acPower")} value={fmtW(sysAc)} sub={t("st.expected",{v:fmtW(sysExp)})} color={T.accent}/>
      <Stat icon={Activity} label={t("st.energyToday")} value={fmtKwh(energy)} sub={t("st.allInverters")} color={T.green}/>
      <Stat icon={Gauge} label={t("st.avgPerf")} value={avgPR+"%"} sub={t("st.perfRatio")} color={prColor(avgPR)}/>
      <Stat icon={SunMedium} label={t("st.poa")} value={avgPoa+" W/m²"} sub={t("st.irrSource",{s:irr.live?"live":"modeled"})} color={T.cyan}/>
      <Stat icon={Droplets} label={t("st.soilingLoss")} value={lossPct+"%"} sub={t("st.perDay",{v:Math.round(loss/1000*8*0.5)})} color={lossPct>15?T.red:T.accent}/>
    </div>
    <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:16 }}>
      <Card><SectionTitle>{t("dash.powerChart")}</SectionTitle><div dir="ltr" style={{ height:240,marginTop:14 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent} stopOpacity={0.4}/><stop offset="100%" stopColor={T.accent} stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={T.cardBorder}/><XAxis dataKey="i" stroke={T.textSecondary} tick={{fontSize:10}}/><YAxis stroke={T.textSecondary} tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/><Tooltip contentStyle={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:10,fontSize:12 }} formatter={v=>fmtW(v)}/><Area type="monotone" dataKey="expected" name={t("lg.expected")} stroke={T.textSecondary} strokeDasharray="5 5" fill="none" strokeWidth={1.5}/><Area type="monotone" dataKey="actual" name={t("lg.actual")} stroke={T.accent} strokeWidth={2.5} fill="url(#ga)"/></AreaChart></ResponsiveContainer></div></Card>
      <Card><SectionTitle>{t("dash.fleetPR")}</SectionTitle><div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:240 }}><div style={{ position:"relative" }}><Ring pct={avgPR}/><div style={{ position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}><div style={{ fontSize:34,fontWeight:900,color:prColor(avgPR),fontFamily:"monospace",lineHeight:1 }}>{avgPR}<span style={{ fontSize:18 }}>%</span></div><div style={{ fontSize:11,color:T.textSecondary,marginTop:3 }}>{t("ring.pr")}</div></div></div><div style={{ fontSize:12,color:avgPR>=85?T.green:avgPR>=65?T.accent:T.red,marginTop:16,textAlign:"center",fontWeight:600 }}>{avgPR>=85?t("dash.optimal"):avgPR>=65?t("dash.recommend"):t("dash.significant")}</div></div></Card>
    </div>
    <Card><SectionTitle>{t("dash.stringStatus")}</SectionTitle><div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:12,marginTop:14 }}>{zones.map(z=>(<div key={z.id} style={{ padding:14,background:T.bg,borderRadius:12,border:`1px solid ${z.status==="critical"?T.red+"55":T.cardBorder}` }}><div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9 }}><div style={{ display:"flex",alignItems:"center",gap:8,minWidth:0 }}><VendorBadge vendor={z.vendor} size={22}/><span style={{ fontSize:13,fontWeight:700,color:T.textPrimary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{z.name}</span></div></div><div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}><div><div style={{ fontSize:20,fontWeight:800,color:z.prNull?T.textSecondary:prColor(z.eff),fontFamily:"monospace" }}>{z.prNull?"—":z.eff+"%"}</div><div style={{ fontSize:11,color:T.textMuted,marginTop:2 }}>{z.prNull?t("status.idle"):fmtW(z.acW)}</div></div>{!z.prNull&&canWrite&&z.status!=="clean"&&<button onClick={()=>washString(z.connectorId,z.idx)} style={{ padding:"7px 12px",background:T.accent+"1A",border:`1px solid ${T.accent}55`,borderRadius:8,color:T.accent,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5 }}><Droplets size={13}/>{t("btn.clean")}</button>}{!z.prNull&&z.status==="clean"&&<CheckCircle size={20} color={T.green}/>}</div></div>))}</div></Card>
  </div>;
}

// ─── INVERTERS ────────────────────────────────────────────────────────────────
function Inverters({fleet}){
  const { t }=useT(); const { canWrite }=useAuth();
  const { connectors, telemetry, addConnector, removeConnector }=fleet;
  const [show,setShow]=useState(false); const [vendor,setVendor]=useState("solaredge"); const [name,setName]=useState(""); const [creds,setCreds]=useState({});
  const submit=()=>{ addConnector(vendor,name,creds); setShow(false); setName(""); setCreds({}); setVendor("solaredge"); };
  return <div style={{ padding:"26px 30px" }}>
    <Header title={t("inv.title")} sub={t("inv.sub")} right={canWrite&&<button onClick={()=>setShow(true)} style={{ display:"flex",alignItems:"center",gap:8,padding:"11px 17px",background:T.accent,border:"none",borderRadius:11,color:"#000",fontWeight:800,fontSize:14,cursor:"pointer" }}><Plus size={17}/>{t("inv.connect")}</button>}/>
    <Card style={{ marginBottom:16 }}><SectionTitle>{t("inv.supported")}</SectionTitle><div style={{ display:"flex",flexWrap:"wrap",gap:9,marginTop:12 }}>{Object.entries(VENDORS).map(([k,v])=>(<div key={k} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 12px",background:T.bg,borderRadius:9,border:`1px solid ${T.cardBorder}` }}><VendorBadge vendor={k} size={22}/><div><div style={{ fontSize:12.5,fontWeight:700,color:T.textPrimary }}>{v.name}</div><div style={{ fontSize:10,color:T.textMuted }}>{v.api}</div></div></div>))}</div></Card>
    {connectors.length===0&&<Card><div style={{ textAlign:"center",padding:"30px 0",color:T.textSecondary }}>{t("inv.none")}</div></Card>}
    <div style={{ display:"flex",flexDirection:"column",gap:14 }}>{connectors.map(c=>{ const t0=telemetry[c.id]||{};
      return <Card key={c.id}><div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16 }}><div style={{ display:"flex",alignItems:"center",gap:13 }}><VendorBadge vendor={c.vendor} size={44}/><div><div style={{ fontSize:16,fontWeight:800,color:T.textPrimary }}>{c.name}</div><div style={{ display:"flex",alignItems:"center",gap:8,marginTop:4 }}><span style={{ fontSize:12,color:T.textSecondary }}>{VENDORS[c.vendor].name} · {c.capacityKw} kW</span><span style={{ display:"inline-flex",alignItems:"center",gap:5,fontSize:11,color:T.green,fontWeight:700 }}><Wifi size={11}/>online</span></div></div></div>{canWrite&&<button onClick={()=>removeConnector(c.id)} style={{ background:"none",border:`1px solid ${T.cardBorder}`,borderRadius:9,padding:"8px",cursor:"pointer",color:T.textSecondary }}><Trash2 size={16}/></button>}</div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16 }}>{[[t("inv.acPower"),fmtW(t0.acPowerW||0),T.accent],[t("inv.dcInput"),fmtW(t0.dcPowerW||0),T.blue],[t("inv.energyToday"),fmtKwh(t0.energyTodayWh||0),T.green],[t("inv.temp"),(t0.tempC||0)+"°C",T.purple]].map(([l,v,col])=>(<div key={l} style={{ padding:"11px 13px",background:T.bg,borderRadius:10 }}><div style={{ fontSize:18,fontWeight:800,color:col,fontFamily:"monospace" }}>{v}</div><div style={{ fontSize:10.5,color:T.textSecondary,marginTop:3 }}>{l}</div></div>))}</div>
        <div dir="ltr" style={{ overflow:"hidden",borderRadius:10,border:`1px solid ${T.cardBorder}` }}><div style={{ display:"grid",gridTemplateColumns:"1.6fr 1fr 1fr 1fr 0.7fr 1fr",padding:"9px 13px",background:T.panel,fontSize:10.5,fontWeight:700,color:T.textSecondary }}><div>{t("tbl.string")}</div><div>{t("tbl.power")}</div><div>{t("tbl.voltage")}</div><div>{t("tbl.orient")}</div><div>{t("tbl.pr")}</div><div>{t("tbl.status")}</div></div>{c.strings.map((s,i)=>{ const st=t0.strings?.[i]||{}; const exp=c.capacityKw*1000/c.strings.length; const pr=st.acW!=null&&exp>1?Math.round(st.acW/exp*100):null;
          return <div key={i} style={{ display:"grid",gridTemplateColumns:"1.6fr 1fr 1fr 1fr 0.7fr 1fr",padding:"10px 13px",fontSize:12,borderTop:`1px solid ${T.cardBorder}`,alignItems:"center" }}><div style={{ color:T.textPrimary,fontWeight:600 }}>{s.name}</div><div style={{ color:T.textSecondary,fontFamily:"monospace" }}>{fmtW(st.acW||0)}</div><div style={{ color:T.textSecondary,fontFamily:"monospace" }}>{st.voltage||0} V</div><div style={{ color:T.textSecondary,fontFamily:"monospace",fontSize:11 }}>{s.tilt}° {azToCompass(s.azimuth)}</div><div style={{ fontFamily:"monospace",fontWeight:700,color:pr==null?T.textSecondary:prColor(pr) }}>{pr==null?"—":pr+"%"}</div><div><span style={{ width:7,height:7,borderRadius:4,background:statusColor(pr==null?"idle":prStatus(pr)),display:"inline-block" }}/></div></div>;
        })}</div></Card>;
    })}</div>
    {show&&<Overlay><div style={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:18,padding:28,width:440,maxWidth:"100%",maxHeight:"88vh",overflowY:"auto" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}><div><h2 style={{ margin:0,color:T.textPrimary,fontSize:18,fontWeight:800 }}>{t("modal.connectTitle")}</h2><div style={{ fontSize:12,color:T.textSecondary,marginTop:3 }}>{t("modal.connectSub")}</div></div><button onClick={()=>setShow(false)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textSecondary }}><X size={20}/></button></div>
      <FieldLabel>{t("inv.vendor")}</FieldLabel><div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8 }}>{Object.entries(VENDORS).map(([k,v])=>(<button key={k} onClick={()=>{ setVendor(k); setCreds({}); }} style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 11px",borderRadius:9,border:`1px solid ${vendor===k?T.accent:T.cardBorder}`,background:vendor===k?T.accent+"14":T.bg,cursor:"pointer" }}><VendorBadge vendor={k} size={20}/><span style={{ fontSize:12,fontWeight:600,color:vendor===k?T.accent:T.textSecondary }}>{v.name}</span></button>))}</div>
      <FieldLabel>{t("inv.displayName")}</FieldLabel><Input value={name} onChange={setName} placeholder={`${VENDORS[vendor].name} — Site 1`}/>
      {VENDORS[vendor].fields.map(([key,label])=>(<div key={key}><FieldLabel>{label}</FieldLabel><Input value={creds[key]||""} onChange={v=>setCreds(p=>({...p,[key]:v}))} placeholder={label}/></div>))}
      <div style={{ fontSize:11,color:T.textMuted,marginTop:14,lineHeight:1.5,padding:"10px 12px",background:T.bg,borderRadius:9 }}>{t("inv.demoNote",{ep:"/api/inverters/"+vendor})}</div>
      <button onClick={submit} style={{ width:"100%",marginTop:16,padding:"12px",background:T.accent,border:"none",borderRadius:11,color:"#000",fontWeight:800,fontSize:14,cursor:"pointer" }}>{t("btn.connect")}</button>
    </div></Overlay>}
  </div>;
}

// ─── ZONES ────────────────────────────────────────────────────────────────────
function Zones({fleet,site}){
  const { t }=useT(); const { canWrite }=useAuth();
  const { zones, washString, updateString }=fleet;
  const [editing,setEditing]=useState(null); const [lab,setLab]=useState(null); const [cleaning,setCleaning]=useState({});
  const clean=z=>{ setCleaning(p=>({...p,[z.id]:true})); washString(z.connectorId,z.idx); setTimeout(()=>setCleaning(p=>({...p,[z.id]:false})),2600); };
  return <div style={{ padding:"26px 30px" }}>
    <Header title={t("zones.title")} sub={t("zones.sub")}/>
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))",gap:15 }}>{zones.map(z=>{ const busy=cleaning[z.id];
      return <Card key={z.id} style={{ border:`1px solid ${z.status==="critical"?T.red+"55":T.cardBorder}`,position:"relative",overflow:"hidden" }}>
        {busy&&<div style={{ position:"absolute",inset:0,background:"rgba(6,8,14,.86)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:5,gap:10 }}><Droplets size={30} color={T.cyan} style={{ animation:"wash 1s ease-in-out infinite" }}/><div style={{ color:T.cyan,fontWeight:700,fontSize:14 }}>{t("zones.cleaning")}</div></div>}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}><div style={{ display:"flex",alignItems:"center",gap:10,minWidth:0 }}><VendorBadge vendor={z.vendor} size={32}/><div style={{ minWidth:0 }}><div style={{ fontSize:15,fontWeight:800,color:T.textPrimary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{z.name}</div><div style={{ fontSize:11,color:T.textSecondary }}>{t("zones.via",{v:z.vendorName})}</div></div></div>{!z.prNull&&<StatusDot status={z.status}/>}</div>
        <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:13,flexWrap:"wrap" }}>
          <div dir="ltr" style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"5px 9px",background:T.bg,borderRadius:8,border:`1px solid ${T.cardBorder}` }}><Compass size={12} color={T.textSecondary}/><span style={{ fontSize:11,color:T.textSecondary,fontFamily:"monospace" }}>{z.tilt}° · {azToCompass(z.azimuth)} · {z.azimuth}°</span></div>
          <div dir="ltr" style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"5px 9px",background:T.cyan+"14",borderRadius:8 }}><SunMedium size={12} color={T.cyan}/><span style={{ fontSize:11,color:T.cyan,fontFamily:"monospace" }}>{z.poa} {t("zones.poaTag")}</span></div>
          {canWrite&&<><button onClick={()=>setEditing(z)} title={t("orient.edit")} style={{ padding:"6px",background:T.bg,border:`1px solid ${T.cardBorder}`,borderRadius:8,cursor:"pointer",color:T.textSecondary }}><Pencil size={12}/></button><button onClick={()=>setLab(z)} title={t("orient.auto")} style={{ padding:"6px",background:T.accent+"14",border:`1px solid ${T.accent}44`,borderRadius:8,cursor:"pointer",color:T.accent }}><Crosshair size={12}/></button></>}
        </div>
        {z.prNull?<div style={{ padding:"22px 0",textAlign:"center",color:T.textSecondary,fontSize:13 }}><Power size={20} style={{ marginBottom:6,opacity:.6 }}/><div>{t("zones.idleNight")}</div></div>:<>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}><div><div style={{ fontSize:30,fontWeight:900,color:prColor(z.eff),fontFamily:"monospace",lineHeight:1 }}>{z.eff}%</div><div style={{ fontSize:11,color:T.textSecondary,marginTop:4 }}>{t("zones.perfRatio")}</div></div><div style={{ textAlign:"right" }}><div style={{ fontSize:13,color:T.textPrimary,fontFamily:"monospace",fontWeight:700 }}>{fmtW(z.acW)}</div><div style={{ fontSize:11,color:T.textMuted,marginTop:3 }}>{t("zones.output")} / {fmtW(z.expectedW)}</div></div></div>
          <div style={{ height:7,background:T.bg,borderRadius:4,overflow:"hidden",marginBottom:14 }}><div style={{ height:"100%",width:`${Math.min(100,z.eff)}%`,background:prColor(z.eff),transition:"width .5s" }}/></div>
          {canWrite&&<button onClick={()=>clean(z)} disabled={busy} style={{ width:"100%",padding:"11px",background:z.status==="clean"?T.bg:T.accent,border:z.status==="clean"?`1px solid ${T.cardBorder}`:"none",borderRadius:10,color:z.status==="clean"?T.textSecondary:"#000",fontWeight:800,fontSize:13.5,cursor:busy?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}><Droplets size={15}/>{z.status==="clean"?t("zones.scheduled"):t("zones.cleanNow")}</button>}
        </>}
      </Card>;
    })}</div>
    {editing&&<OrientationModal zone={editing} onClose={()=>setEditing(null)} onSave={p=>{ updateString(editing.connectorId,editing.idx,p); setEditing(null); }}/>}
    {lab&&<OrientationLab zone={lab} site={site} onClose={()=>setLab(null)} onApply={p=>{ updateString(lab.connectorId,lab.idx,p); setLab(null); }}/>}
  </div>;
}

// ─── FORECAST STRIP ───────────────────────────────────────────────────────────
function ForecastStrip({site}){
  const { t }=useT(); const fc=useForecast(site);
  if(fc.loading) return <Card style={{ marginBottom:16 }}><div style={{ display:"flex",alignItems:"center",gap:10,color:T.textSecondary,fontSize:13 }}><RefreshCw size={15} style={{ animation:"spin 1s linear infinite" }}/>{t("fc.loading")}</div></Card>;
  if(!fc.days.length) return <Card style={{ marginBottom:16 }}><div style={{ color:T.textSecondary,fontSize:13 }}>{t("fc.unavailable")}</div></Card>;
  const rainDay=fc.days.find((d,i)=>i>0&&i<=2&&fcReco(d)==="rain");
  const cleanWindow=!rainDay&&fc.days.slice(0,3).every(d=>fcReco(d)!=="rain")&&fc.days.slice(0,3).some(d=>fcReco(d)==="clean");
  const dayName=d=>{ const dt=new Date(d.date); const k=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dt.getDay()]; return t("day."+k); };
  return <Card style={{ marginBottom:16 }}>
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}><SectionTitle>{t("fc.title")}</SectionTitle><span style={{ fontSize:11,color:fc.source.startsWith("live")?T.cyan:T.textMuted }}>{t("fc.source",{s:fc.source})}</span></div>
    <div dir="ltr" style={{ display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8 }}>{fc.days.map((d,i)=>{ const rc=fcReco(d); const col=rc==="rain"?T.blue:rc==="clean"?T.green:T.textSecondary;
      return <div key={i} style={{ padding:"11px 6px",background:T.bg,borderRadius:11,border:`1px solid ${rc==="rain"?T.blue+"44":rc==="clean"?T.green+"33":T.cardBorder}`,textAlign:"center" }}><div style={{ fontSize:11,color:T.textSecondary,fontWeight:700,marginBottom:5 }}>{i===0?t("fc.today"):dayName(d)}</div><div style={{ fontSize:22,marginBottom:5 }}>{wxIcon(d.code)}</div><div style={{ fontSize:12,fontWeight:800,color:T.textPrimary,fontFamily:"monospace" }}>{d.tmax}°</div><div style={{ fontSize:10,color:T.textMuted,fontFamily:"monospace" }}>{d.tmin}°</div><div style={{ fontSize:10,color:col,marginTop:5,fontWeight:700 }}>{d.precipProb}%💧</div></div>;
    })}</div>
    {(rainDay||cleanWindow)&&<div style={{ display:"flex",alignItems:"center",gap:10,marginTop:13,padding:"10px 13px",background:rainDay?T.blue+"14":T.green+"12",borderRadius:10,border:`1px solid ${rainDay?T.blue+"33":T.green+"33"}` }}>{rainDay?<CloudRain size={17} color={T.blue}/>:<SunMedium size={17} color={T.green}/>}<div style={{ fontSize:12.5,color:T.textPrimary }}>{rainDay?t("fc.nextRain",{d:dayName(rainDay)}):t("fc.dryClean")}</div></div>}
  </Card>;
}

// ─── SCHEDULE ─────────────────────────────────────────────────────────────────
const DAYS_ORDER={ default:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], he:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] };
function Schedule({fleet,site}){
  const { t,lang }=useT(); const { canWrite }=useAuth(); const { zones }=fleet;
  const [peak,setPeak]=useState(true); const [rain,setRain]=useState(true); const [dust,setDust]=useState(false);
  const [days,setDays]=useState({Mon:true,Tue:false,Wed:true,Thu:false,Fri:true,Sat:false,Sun:false});
  const order=lang==="he"?DAYS_ORDER.he:DAYS_ORDER.default;
  const toggleDay=d=>canWrite&&setDays(p=>({...p,[d]:!p[d]}));
  return <div style={{ padding:"26px 30px" }}>
    <Header title={t("sched.title")} sub={t("sched.sub")}/>
    <ForecastStrip site={site}/>
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
      <Card><SectionTitle>{t("sched.smart")}</SectionTitle><div style={{ display:"flex",flexDirection:"column",gap:11,marginTop:14 }}>{[[t("sched.peak"),t("sched.peakDesc"),peak,setPeak],[t("sched.rain"),t("sched.rainDesc"),rain,setRain],[t("sched.dust"),t("sched.dustDesc"),dust,setDust]].map(([ti,de,val,set])=>(<div key={ti} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 15px",background:T.bg,borderRadius:11,border:`1px solid ${T.cardBorder}` }}><div style={{ flex:1,paddingInlineEnd:12 }}><div style={{ fontSize:13.5,fontWeight:700,color:T.textPrimary }}>{ti}</div><div style={{ fontSize:11.5,color:T.textMuted,marginTop:3,lineHeight:1.4 }}>{de}</div></div><Toggle on={val} onChange={()=>set(v=>!v)} disabled={!canWrite}/></div>))}</div></Card>
      <Card><SectionTitle>{t("nav.schedule")}</SectionTitle><div style={{ display:"flex",flexDirection:"column",gap:9,marginTop:14 }}>{order.map(d=>(<div key={d} onClick={()=>toggleDay(d)} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 15px",background:days[d]?T.accent+"14":T.bg,borderRadius:10,border:`1px solid ${days[d]?T.accent+"44":T.cardBorder}`,cursor:canWrite?"pointer":"default" }}><span style={{ fontSize:13.5,fontWeight:700,color:days[d]?T.accent:T.textSecondary }}>{t("day."+d)}</span>{days[d]&&<span style={{ fontSize:11,color:T.accent,fontWeight:700 }}>06:00</span>}</div>))}</div></Card>
    </div>
    <Card style={{ marginTop:16 }}><SectionTitle>{t("dash.stringStatus")}</SectionTitle><div style={{ display:"flex",flexDirection:"column",gap:8,marginTop:12 }}>{zones.map(z=>(<div key={z.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",background:T.bg,borderRadius:10 }}><div style={{ display:"flex",alignItems:"center",gap:10 }}><VendorBadge vendor={z.vendor} size={24}/><span style={{ fontSize:13,fontWeight:600,color:T.textPrimary }}>{z.name}</span></div><div style={{ display:"flex",alignItems:"center",gap:14 }}><span dir="ltr" style={{ fontSize:11,color:T.textMuted,fontFamily:"monospace" }}>{z.tilt}° {azToCompass(z.azimuth)}</span>{z.prNull?<span style={{ fontSize:12,color:T.textSecondary }}>{t("status.idle")}</span>:<span style={{ fontSize:13,fontWeight:700,color:prColor(z.eff),fontFamily:"monospace" }}>{z.eff}%</span>}</div></div>))}</div></Card>
  </div>;
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
Object.assign(I18N.en,{ "an.title":"Analytics","an.sub":"Per-string performance & soiling economics","an.prByString":"PR BY STRING","an.energyByString":"ENERGY TODAY BY STRING (kWh)","an.byOrient":"PERFORMANCE BY ORIENTATION","an.kpiAvgPR":"Avg fleet PR","an.kpiWorst":"Worst string","an.kpiLossDay":"Loss / day","an.kpiClean":"Clean strings" });
Object.assign(I18N.ru,{ "an.title":"Аналитика","an.sub":"Производительность по строкам и экономика загрязнения","an.prByString":"PR ПО СТРОКАМ","an.energyByString":"ВЫРАБОТКА СЕГОДНЯ ПО СТРОКАМ (кВтч)","an.byOrient":"ПРОИЗВОДИТЕЛЬНОСТЬ ПО ОРИЕНТАЦИИ","an.kpiAvgPR":"Средний PR флота","an.kpiWorst":"Худшая строка","an.kpiLossDay":"Потери / день","an.kpiClean":"Чистые строки" });
Object.assign(I18N.he,{ "an.title":"אנליטיקה","an.sub":"ביצועים לפי מחרוזת וכלכלת לכלוך","an.prByString":"PR לפי מחרוזת","an.energyByString":"אנרגיה היום לפי מחרוזת (קוט״ש)","an.byOrient":"ביצועים לפי כיוון","an.kpiAvgPR":"PR ממוצע של הצי","an.kpiWorst":"המחרוזת הגרועה","an.kpiLossDay":"אובדן / יום","an.kpiClean":"מחרוזות נקיות" });
function Analytics({fleet}){
  const { t }=useT(); const { zones, telemetry }=fleet;
  const active=zones.filter(z=>!z.prNull);
  const prData=active.map(z=>({ name:z.name.split("—")[0].trim().slice(0,10), pr:z.eff, fill:prColor(z.eff) }));
  const enData=zones.map(z=>{ const st=telemetry[z.connectorId]?.strings?.[z.idx]; return { name:z.name.split("—")[0].trim().slice(0,10), kwh:+((st?.energyWh||0)/1000).toFixed(1) }; });
  const orientMap={}; zones.forEach(z=>{ const k=azToCompass(z.azimuth); if(!orientMap[k]) orientMap[k]={sum:0,n:0}; if(!z.prNull){ orientMap[k].sum+=z.eff; orientMap[k].n++; } });
  const orientData=Object.entries(orientMap).filter(([,v])=>v.n>0).map(([k,v])=>({ name:k, pr:Math.round(v.sum/v.n) }));
  const avgPR=active.length?Math.round(active.reduce((a,z)=>a+z.eff,0)/active.length):0;
  const worst=active.length?active.reduce((m,z)=>z.eff<m.eff?z:m,active[0]):null;
  const sysExp=zones.reduce((a,z)=>a+z.expectedW,0), sysAc=zones.reduce((a,z)=>a+z.acW,0);
  const lossKwhDay=Math.max(0,(sysExp-sysAc)/1000*8), lossVal=lossKwhDay*0.5;
  const cleanN=active.filter(z=>z.status==="clean").length;
  return <div style={{ padding:"26px 30px" }}>
    <Header title={t("an.title")} sub={t("an.sub")}/>
    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(195px,1fr))",gap:14,marginBottom:18 }}>
      <Stat icon={Gauge} label={t("an.kpiAvgPR")} value={avgPR+"%"} color={prColor(avgPR)}/>
      <Stat icon={TrendingDown} label={t("an.kpiWorst")} value={worst?worst.eff+"%":"—"} sub={worst?worst.name.split("—")[0].trim():""} color={T.red}/>
      <Stat icon={Droplets} label={t("an.kpiLossDay")} value={"$"+lossVal.toFixed(1)} sub={lossKwhDay.toFixed(1)+" kWh"} color={T.accent}/>
      <Stat icon={CheckCircle} label={t("an.kpiClean")} value={cleanN+"/"+active.length} color={T.green}/>
    </div>
    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16 }}>
      <Card><SectionTitle>{t("an.prByString")}</SectionTitle><div dir="ltr" style={{ height:230,marginTop:14 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={prData}><CartesianGrid strokeDasharray="3 3" stroke={T.cardBorder}/><XAxis dataKey="name" stroke={T.textSecondary} tick={{fontSize:10}}/><YAxis stroke={T.textSecondary} tick={{fontSize:10}} domain={[0,120]}/><Tooltip contentStyle={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:10,fontSize:12 }} cursor={{fill:T.cardBorder+"55"}}/><Bar dataKey="pr" radius={[6,6,0,0]}>{prData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Bar></BarChart></ResponsiveContainer></div></Card>
      <Card><SectionTitle>{t("an.byOrient")}</SectionTitle><div dir="ltr" style={{ height:230,marginTop:14 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={orientData}><CartesianGrid strokeDasharray="3 3" stroke={T.cardBorder}/><XAxis dataKey="name" stroke={T.textSecondary} tick={{fontSize:11}}/><YAxis stroke={T.textSecondary} tick={{fontSize:10}} domain={[0,120]}/><Tooltip contentStyle={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:10,fontSize:12 }} cursor={{fill:T.cardBorder+"55"}}/><Bar dataKey="pr" fill={T.cyan} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div></Card>
    </div>
    <Card><SectionTitle>{t("an.energyByString")}</SectionTitle><div dir="ltr" style={{ height:230,marginTop:14 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={enData}><CartesianGrid strokeDasharray="3 3" stroke={T.cardBorder}/><XAxis dataKey="name" stroke={T.textSecondary} tick={{fontSize:10}}/><YAxis stroke={T.textSecondary} tick={{fontSize:10}}/><Tooltip contentStyle={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:10,fontSize:12 }} cursor={{fill:T.cardBorder+"55"}}/><Bar dataKey="kwh" fill={T.green} radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div></Card>
  </div>;
}

// ─── AI ASSISTANT ─────────────────────────────────────────────────────────────
function AI({fleet}){
  const { t }=useT(); const { zones }=fleet;
  const sysAc=zones.reduce((a,z)=>a+z.acW,0); const active=zones.filter(z=>!z.prNull);
  const avgPR=active.length?Math.round(active.reduce((a,z)=>a+z.eff,0)/active.length):0;
  const dirty=active.filter(z=>z.status!=="clean");
  const extra=dirty.length?t("ai.needs",{n:dirty.length,names:dirty.map(z=>z.name.split("—")[0].trim()).join(", ")}):t("ai.good");
  const greeting=t("ai.greeting",{inv:fleet.connectors.length,s:zones.length,ac:fmtW(sysAc),pr:avgPR,extra});
  const [msgs,setMsgs]=useState([{ role:"assistant", content:greeting }]);
  const [input,setInput]=useState(""); const [busy,setBusy]=useState(false); const endRef=useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs,busy]);
  const send=async(text)=>{ const q=(text??input).trim(); if(!q||busy) return; setInput(""); const next=[...msgs,{ role:"user", content:q }]; setMsgs(next); setBusy(true);
    const snapshot=zones.map(z=>`${z.name}: ${z.prNull?"idle(no sun)":z.eff+"% PR, "+fmtW(z.acW)+", tilt "+z.tilt+"deg/az "+z.azimuth+"deg("+azToCompass(z.azimuth)+"), POA "+z.poa}`).join("; ");
    const sys=`You are the SolarWash O&M assistant. Live fleet telemetry: ${snapshot}. System AC ${fmtW(sysAc)}, fleet PR ${avgPR}%. PR=actual/expected per string; expected uses each string's own plane-of-array (POA) irradiance from its tilt/azimuth, so low PR means soiling not orientation. Be concise and practical about cleaning priorities, soiling economics and scheduling. ${t("ai.langInstr")}`;
    try{
      const r=await fetch(AI_ENDPOINT,{ method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:1000, system:sys, messages:next.map(m=>({ role:m.role, content:m.content })) }) });
      const d=await r.json(); const txt=(d.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("\n")||d.completion||t("ai.err");
      setMsgs(m=>[...m,{ role:"assistant", content:txt }]);
    }catch{ setMsgs(m=>[...m,{ role:"assistant", content:t("ai.err") }]); }
    setBusy(false);
  };
  const chips=[t("ai.q1"),t("ai.q2"),t("ai.q3"),t("ai.q4")];
  return <div style={{ padding:"26px 30px",height:"100vh",boxSizing:"border-box",display:"flex",flexDirection:"column" }}>
    <Header title={t("ai.title")} sub={t("ai.sub")}/>
    <Card style={{ flex:1,display:"flex",flexDirection:"column",padding:0,overflow:"hidden",minHeight:0 }}>
      <div style={{ flex:1,overflowY:"auto",padding:22,display:"flex",flexDirection:"column",gap:14 }}>{msgs.map((m,i)=>(<div key={i} style={{ display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start" }}><div style={{ display:"flex",gap:10,maxWidth:"82%",flexDirection:m.role==="user"?"row-reverse":"row" }}>{m.role==="assistant"&&<div style={{ width:30,height:30,borderRadius:9,background:T.accent+"1A",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Bot size={16} color={T.accent}/></div>}<div style={{ padding:"11px 15px",borderRadius:14,background:m.role==="user"?T.accent:T.bg,color:m.role==="user"?"#000":T.textPrimary,fontSize:13.5,lineHeight:1.55,whiteSpace:"pre-wrap",border:m.role==="user"?"none":`1px solid ${T.cardBorder}` }}>{m.content}</div></div></div>))}{busy&&<div style={{ display:"flex",gap:10 }}><div style={{ width:30,height:30,borderRadius:9,background:T.accent+"1A",display:"flex",alignItems:"center",justifyContent:"center" }}><Bot size={16} color={T.accent}/></div><div style={{ display:"flex",gap:4,alignItems:"center",padding:"13px 16px",background:T.bg,borderRadius:14,border:`1px solid ${T.cardBorder}` }}>{[0,1,2].map(i=><span key={i} style={{ width:7,height:7,borderRadius:4,background:T.accent,animation:`dot 1.2s ${i*0.18}s infinite` }}/>)}</div></div>}<div ref={endRef}/></div>
      <div style={{ padding:"12px 16px",borderTop:`1px solid ${T.cardBorder}` }}>
        <div style={{ display:"flex",gap:7,marginBottom:11,flexWrap:"wrap" }}>{chips.map((c,i)=>(<button key={i} onClick={()=>send(c)} disabled={busy} style={{ padding:"7px 12px",background:T.bg,border:`1px solid ${T.cardBorder}`,borderRadius:18,color:T.textSecondary,fontSize:12,cursor:busy?"default":"pointer",fontFamily:"inherit" }}>{c}</button>))}</div>
        <div style={{ display:"flex",gap:10,alignItems:"center" }}><input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={t("ai.placeholder")} style={{ flex:1,padding:"12px 15px",borderRadius:11,border:`1px solid ${T.cardBorder}`,background:T.bg,color:T.textPrimary,fontSize:14,outline:"none",fontFamily:"inherit" }}/><button onClick={()=>send()} disabled={busy||!input.trim()} style={{ width:44,height:44,borderRadius:11,background:T.accent,border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:busy||!input.trim()?"default":"pointer",opacity:busy||!input.trim()?0.5:1,flexShrink:0 }}><Send size={18} color="#000"/></button></div>
      </div>
    </Card>
  </div>;
}

// ─── ADMIN: USERS ─────────────────────────────────────────────────────────────
function AdminUsers({users,setUsers,me,pushLog}){
  const { t }=useT(); const [showAdd,setShowAdd]=useState(false);
  const [nf,setNf]=useState({ name:"", email:"", role:"viewer", password:"" });
  const add=()=>{ if(!nf.name||!nf.email) return; const id=Date.now(); setUsers(p=>[...p,{ id, ...nf, status:"active" }]); pushLog("userAdd",nf.email); setShowAdd(false); setNf({ name:"",email:"",role:"viewer",password:"" }); };
  const remove=u=>{ setUsers(p=>p.filter(x=>x.id!==u.id)); pushLog("userRemove",u.email); };
  const changeRole=(u,role)=>{ setUsers(p=>p.map(x=>x.id===u.id?{...x,role}:x)); pushLog("roleChange",`${u.email} -> ${role}`); };
  return <Card>
    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}><SectionTitle>{t("adm.users.title")}</SectionTitle><button onClick={()=>setShowAdd(true)} style={{ display:"flex",alignItems:"center",gap:7,padding:"8px 14px",borderRadius:9,background:T.accent,border:"none",color:"#000",fontWeight:700,fontSize:13,cursor:"pointer" }}><UserPlus size={15}/>{t("adm.users.add")}</button></div>
    <div dir="ltr" style={{ overflow:"hidden",borderRadius:10,border:`1px solid ${T.cardBorder}` }}>
      <div style={{ display:"grid",gridTemplateColumns:"1.4fr 1.8fr 1.3fr 0.9fr 0.6fr",padding:"10px 14px",background:T.panel,fontSize:11,fontWeight:700,color:T.textSecondary }}><div>{t("adm.users.name")}</div><div>{t("adm.users.email")}</div><div>{t("adm.users.role")}</div><div>{t("adm.users.status")}</div><div></div></div>
      {users.map(u=>(<div key={u.id} style={{ display:"grid",gridTemplateColumns:"1.4fr 1.8fr 1.3fr 0.9fr 0.6fr",padding:"11px 14px",fontSize:13,borderTop:`1px solid ${T.cardBorder}`,alignItems:"center" }}>
        <div style={{ color:T.textPrimary,fontWeight:600 }}>{u.name}{u.id===me.id&&<span style={{ marginLeft:6,fontSize:10,color:T.accent }}>({t("adm.users.you")})</span>}</div>
        <div style={{ color:T.textSecondary,fontFamily:"monospace",fontSize:12 }}>{u.email}</div>
        <div><select value={u.role} disabled={u.id===me.id} onChange={e=>changeRole(u,e.target.value)} style={{ background:T.bg,color:roleColor(u.role),border:`1px solid ${T.cardBorder}`,borderRadius:7,padding:"5px 8px",fontSize:12,fontWeight:700,cursor:u.id===me.id?"not-allowed":"pointer",fontFamily:"inherit" }}>{Object.keys(ROLES).map(r=><option key={r} value={r} style={{ color:T.textPrimary }}>{t("role."+r)}</option>)}</select></div>
        <div><span style={{ display:"inline-flex",alignItems:"center",gap:5,fontSize:12,color:T.green }}><span style={{ width:6,height:6,borderRadius:3,background:T.green }}/>{t("adm.users.active")}</span></div>
        <div>{u.id!==me.id&&<button onClick={()=>remove(u)} style={{ background:"none",border:`1px solid ${T.cardBorder}`,borderRadius:7,padding:"5px 7px",cursor:"pointer",color:T.textSecondary }}><Trash2 size={13}/></button>}</div>
      </div>))}
    </div>
    {showAdd&&<Overlay><div style={{ background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:18,padding:28,width:420,maxWidth:"100%" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}><h2 style={{ margin:0,color:T.textPrimary,fontSize:17,fontWeight:800 }}>{t("adm.users.addTitle")}</h2><button onClick={()=>setShowAdd(false)} style={{ background:"none",border:"none",cursor:"pointer",color:T.textSecondary }}><X size={20}/></button></div>
      <FieldLabel>{t("adm.users.name")}</FieldLabel><Input value={nf.name} onChange={v=>setNf(p=>({...p,name:v}))} placeholder="Jane Doe"/>
      <FieldLabel>{t("adm.users.email")}</FieldLabel><Input value={nf.email} onChange={v=>setNf(p=>({...p,email:v}))} placeholder="jane@solarwash.io"/>
      <FieldLabel>{t("adm.users.pw")}</FieldLabel><Input type="password" value={nf.password} onChange={v=>setNf(p=>({...p,password:v}))} placeholder="******"/>
      <FieldLabel>{t("adm.users.role")}</FieldLabel><div style={{ display:"flex",gap:8 }}>{Object.keys(ROLES).map(r=>(<button key={r} onClick={()=>setNf(p=>({...p,role:r}))} style={{ flex:1,padding:"9px",borderRadius:9,border:`1px solid ${nf.role===r?roleColor(r):T.cardBorder}`,background:nf.role===r?roleColor(r)+"18":T.bg,color:nf.role===r?roleColor(r):T.textSecondary,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>{t("role."+r)}</button>))}</div>
      <button onClick={add} style={{ width:"100%",marginTop:18,padding:"12px",background:T.accent,border:"none",borderRadius:11,color:"#000",fontWeight:800,fontSize:14,cursor:"pointer" }}>{t("adm.users.create")}</button>
    </div></Overlay>}
  </Card>;
}

// ─── ADMIN: SYSTEM & API ──────────────────────────────────────────────────────
function AdminSystem({config,setConfig,pushLog}){
  const { t }=useT(); const [f,setF]=useState(config); const [saved,setSaved]=useState(false); const [test,setTest]=useState(null);
  const save=()=>{ setConfig(f); setSaved(true); pushLog("config",`backend=${f.backendBase||"(demo)"}`); setTimeout(()=>setSaved(false),2500); };
  const runTest=async()=>{ if(!f.backendBase){ setTest("unreachable"); return; } try{ const r=await fetch(`${f.backendBase}/health`); setTest(r.ok?"reachable":"unreachable"); }catch{ setTest("unreachable"); } };
  const mode=config.backendBase?"live":"demo";
  return <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
    <Card>
      <SectionTitle>{t("adm.sys.title")}</SectionTitle>
      <div style={{ fontSize:12,color:T.textMuted,margin:"6px 0 4px",lineHeight:1.5 }}>{t("adm.sys.note")}</div>
      <FieldLabel>{t("adm.sys.backend")}</FieldLabel><Input value={f.backendBase} onChange={v=>setF(p=>({...p,backendBase:v}))} placeholder="https://api.yourdomain.com"/>
      <div style={{ fontSize:11,color:T.textMuted,marginTop:5,lineHeight:1.5 }}>{t("adm.sys.backendHint")}</div>
      <FieldLabel>{t("adm.sys.pixel")}</FieldLabel><Input value={f.pixelId} onChange={v=>setF(p=>({...p,pixelId:v}))} placeholder="000000000000000"/>
      <FieldLabel>{t("adm.sys.sheet")}</FieldLabel><Input value={f.sheetUrl} onChange={v=>setF(p=>({...p,sheetUrl:v}))} placeholder="https://script.google.com/macros/s/.../exec"/>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16,padding:"11px 14px",background:T.bg,borderRadius:10,border:`1px solid ${T.cardBorder}` }}><div style={{ fontSize:13,fontWeight:600,color:T.textPrimary }}>{t("adm.sys.ipify")}</div><Toggle on={f.ipify} onChange={()=>setF(p=>({...p,ipify:!p.ipify}))}/></div>
      <div style={{ display:"flex",gap:10,marginTop:16,alignItems:"center",flexWrap:"wrap" }}>
        <button onClick={save} style={{ padding:"11px 18px",background:T.accent,border:"none",borderRadius:11,color:"#000",fontWeight:800,fontSize:14,cursor:"pointer" }}>{t("adm.sys.save")}</button>
        <button onClick={runTest} style={{ padding:"11px 18px",background:"transparent",border:`1px solid ${T.cardBorder}`,borderRadius:11,color:T.textSecondary,fontWeight:700,fontSize:14,cursor:"pointer" }}>{t("adm.sys.test")}</button>
        {test&&<span style={{ fontSize:13,fontWeight:700,color:test==="reachable"?T.green:T.red }}>{t("adm.sys."+test)}</span>}
        {saved&&<span style={{ fontSize:13,color:T.green }}>{t("adm.sys.saved")}</span>}
      </div>
    </Card>
    <Card>
      <SectionTitle>{t("adm.sys.endpoints")}</SectionTitle>
      <div dir="ltr" style={{ display:"flex",flexDirection:"column",gap:8,marginTop:12 }}>
        {[[t("adm.sys.mode"),mode==="demo"?t("mode.demo"):t("mode.live")],[t("adm.sys.inverterApi"),f.backendBase?`${f.backendBase}/api/inverters`:"in-browser simulator"],[t("adm.sys.aiEndpoint"),f.backendBase?`${f.backendBase}/api/chat`:"api.anthropic.com (sandbox)"],[t("adm.sys.auth"),f.backendBase?`${f.backendBase}/api/auth/login`:"in-memory (demo)"]].map(([l,v])=>(<div key={l} style={{ display:"flex",justifyContent:"space-between",gap:12,padding:"9px 12px",background:T.bg,borderRadius:8,border:`1px solid ${T.cardBorder}` }}><span style={{ fontSize:12,color:T.textSecondary }}>{l}</span><span style={{ fontSize:12,color:T.textPrimary,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"60%",textAlign:"right" }}>{v}</span></div>))}
      </div>
    </Card>
  </div>;
}

// ─── ADMIN: SITES ─────────────────────────────────────────────────────────────
function AdminSites({fleet}){
  const { t }=useT(); const { connectors, zones }=fleet;
  const prFor=cid=>{ const zs=zones.filter(z=>z.connectorId===cid&&!z.prNull); return zs.length?Math.round(zs.reduce((a,z)=>a+z.eff,0)/zs.length):null; };
  return <Card>
    <SectionTitle>{t("adm.sites.title")}</SectionTitle>
    {connectors.length===0&&<div style={{ color:T.textSecondary,fontSize:13,marginTop:12 }}>{t("adm.sites.none")}</div>}
    {connectors.length>0&&<div dir="ltr" style={{ overflow:"hidden",borderRadius:10,border:`1px solid ${T.cardBorder}`,marginTop:14 }}>
      <div style={{ display:"grid",gridTemplateColumns:"2fr 1.4fr 0.8fr 0.7fr 0.7fr 0.9fr",padding:"10px 14px",background:T.panel,fontSize:11,fontWeight:700,color:T.textSecondary }}><div>Site</div><div>{t("adm.sites.vendor")}</div><div>{t("adm.sites.cap")}</div><div>{t("adm.sites.strings")}</div><div>{t("adm.sites.pr")}</div><div>{t("adm.sites.status")}</div></div>
      {connectors.map(c=>{ const pr=prFor(c.id);
        return <div key={c.id} style={{ display:"grid",gridTemplateColumns:"2fr 1.4fr 0.8fr 0.7fr 0.7fr 0.9fr",padding:"11px 14px",fontSize:13,borderTop:`1px solid ${T.cardBorder}`,alignItems:"center" }}>
          <div style={{ display:"flex",alignItems:"center",gap:9 }}><VendorBadge vendor={c.vendor} size={22}/><span style={{ color:T.textPrimary,fontWeight:600 }}>{c.name}</span></div>
          <div style={{ color:T.textSecondary }}>{VENDORS[c.vendor].name}</div>
          <div style={{ color:T.textSecondary,fontFamily:"monospace" }}>{c.capacityKw} kW</div>
          <div style={{ color:T.textSecondary,fontFamily:"monospace" }}>{c.strings.length}</div>
          <div style={{ color:pr!=null?prColor(pr):T.textSecondary,fontWeight:700,fontFamily:"monospace" }}>{pr!=null?`${pr}%`:"-"}</div>
          <div><StatusDot status={pr==null?"idle":prStatus(pr)}/></div>
        </div>;
      })}
    </div>}
  </Card>;
}

// ─── ADMIN: ACTIVITY ──────────────────────────────────────────────────────────
function AdminActivity({log}){
  const { t,lang }=useT();
  return <Card>
    <SectionTitle>{t("adm.act.title")}</SectionTitle>
    {log.length===0&&<div style={{ color:T.textSecondary,fontSize:13,marginTop:12 }}>{t("adm.act.none")}</div>}
    {log.length>0&&<div dir="ltr" style={{ overflow:"hidden",borderRadius:10,border:`1px solid ${T.cardBorder}`,marginTop:14 }}>
      <div style={{ display:"grid",gridTemplateColumns:"1.1fr 1.3fr 1.4fr 1.6fr",padding:"10px 14px",background:T.panel,fontSize:11,fontWeight:700,color:T.textSecondary }}><div>{t("adm.act.time")}</div><div>{t("adm.act.user")}</div><div>{t("adm.act.action")}</div><div>{t("adm.act.detail")}</div></div>
      {log.slice(0,60).map(e=>{ const al=translate(lang,"act."+e.code); return <div key={e.id} style={{ display:"grid",gridTemplateColumns:"1.1fr 1.3fr 1.4fr 1.6fr",padding:"10px 14px",fontSize:12.5,borderTop:`1px solid ${T.cardBorder}`,alignItems:"center" }}>
        <div style={{ color:T.textSecondary,fontFamily:"monospace",fontSize:11 }}>{new Date(e.ts).toLocaleTimeString((LOCALES[lang]||LOCALES.en).code)}</div>
        <div style={{ color:T.textPrimary }}>{e.user}</div>
        <div style={{ color:T.accent,fontWeight:600 }}>{al==="act."+e.code?e.code:al}</div>
        <div style={{ color:T.textSecondary,fontFamily:"monospace",fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{e.detail}</div>
      </div>; })}
    </div>}
  </Card>;
}

// ─── ADMIN (container) ────────────────────────────────────────────────────────
function Admin({fleet,users,setUsers,log,config,setConfig,pushLog}){
  const { t }=useT(); const { user }=useAuth(); const [tab,setTab]=useState("users");
  const TABS=[["users",t("adm.tab.users"),Users],["system",t("adm.tab.system"),Server],["sites",t("adm.tab.sites"),Cpu],["activity",t("adm.tab.activity"),ScrollText]];
  return <div style={{ padding:"26px 30px" }}>
    <Header title={t("adm.title")} sub={t("adm.sub")}/>
    <div style={{ display:"flex",gap:8,marginBottom:20,flexWrap:"wrap" }}>{TABS.map(([id,label,Icon])=>(<button key={id} onClick={()=>setTab(id)} style={{ display:"flex",alignItems:"center",gap:8,padding:"10px 16px",borderRadius:11,border:`1px solid ${tab===id?T.accent:T.cardBorder}`,background:tab===id?T.accent+"14":T.card,color:tab===id?T.accent:T.textSecondary,fontSize:13.5,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}><Icon size={15}/>{label}</button>))}</div>
    {tab==="users"&&<AdminUsers users={users} setUsers={setUsers} me={user} pushLog={pushLog}/>}
    {tab==="system"&&<AdminSystem config={config} setConfig={setConfig} pushLog={pushLog}/>}
    {tab==="sites"&&<AdminSites fleet={fleet}/>}
    {tab==="activity"&&<AdminActivity log={log}/>}
  </div>;
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({onLogin}){
  const { t,lang,setLang }=useT();
  const [email,setEmail]=useState(""); const [pw,setPw]=useState(""); const [err,setErr]=useState(""); const [busy,setBusy]=useState(false);
  const submit=async()=>{ if(!email||!pw||busy) return; setBusy(true); setErr(""); const r=await onLogin(email,pw); if(!r.ok){ setErr(t(r.error==="network"?"login.errNet":"login.errBad")); setBusy(false); } };
  return <div dir={(LOCALES[lang]||LOCALES.en).dir} style={{ minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"'Segoe UI','Arial',system-ui,-apple-system,sans-serif",position:"relative",overflow:"hidden" }}>
    <div style={{ position:"absolute",top:"-20%",left:"50%",transform:"translateX(-50%)",width:600,height:600,borderRadius:"50%",background:`radial-gradient(circle,${T.accent}14,transparent 70%)`,pointerEvents:"none" }}/>
    <div style={{ position:"absolute",top:20,insetInlineEnd:20,display:"flex",gap:6,background:T.card,borderRadius:10,padding:4,border:`1px solid ${T.cardBorder}`,zIndex:2 }}>{Object.entries(LOCALES).map(([k,cfg])=>(<button key={k} onClick={()=>setLang(k)} style={{ padding:"6px 12px",borderRadius:7,border:"none",background:lang===k?T.accent:"transparent",color:lang===k?"#000":T.textSecondary,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>{cfg.label}</button>))}</div>
    <div style={{ width:400,maxWidth:"100%",position:"relative",zIndex:1 }}>
      <div style={{ display:"flex",flexDirection:"column",alignItems:"center",marginBottom:26 }}>
        <div style={{ width:56,height:56,borderRadius:16,background:`linear-gradient(135deg,${T.accent},#D97706)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 8px 28px ${T.accent}44`,marginBottom:16 }}><Sun size={26} color="#000"/></div>
        <h1 style={{ margin:0,fontSize:22,fontWeight:900,color:T.textPrimary }}>{t("login.title")}</h1>
        <p style={{ margin:"6px 0 0",fontSize:13,color:T.textSecondary }}>{t("login.sub")}</p>
      </div>
      <Card style={{ padding:26 }}>
        <FieldLabel>{t("login.email")}</FieldLabel><Input value={email} onChange={setEmail} placeholder="admin@solarwash.io"/>
        <FieldLabel>{t("login.password")}</FieldLabel>
        <div style={{ position:"relative" }}><Input type="password" value={pw} onChange={setPw} placeholder="********"/><Lock size={15} color={T.textMuted} style={{ position:"absolute",top:13,insetInlineEnd:13,pointerEvents:"none" }}/></div>
        {err&&<div style={{ marginTop:12,padding:"9px 12px",borderRadius:9,background:T.red+"14",border:`1px solid ${T.red}44`,color:T.red,fontSize:13,fontWeight:600 }}>{err}</div>}
        <button onClick={submit} disabled={busy} style={{ width:"100%",marginTop:18,padding:"13px",background:busy?T.cardBorder:T.accent,border:"none",borderRadius:12,color:busy?T.textSecondary:"#000",fontWeight:800,fontSize:15,cursor:busy?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>{busy?<><RefreshCw size={16} style={{ animation:"spin 1s linear infinite" }}/>{t("login.signing")}</>:t("login.submit")}</button>
      </Card>
      <div style={{ marginTop:18 }}>
        <div style={{ fontSize:11,color:T.textSecondary,marginBottom:8,textAlign:"center",letterSpacing:".04em" }}>{t("login.demo")}</div>
        <div style={{ display:"flex",flexDirection:"column",gap:7 }}>{DEMO_USERS.map(u=>(<button key={u.id} onClick={()=>{ setEmail(u.email); setPw(u.password); setErr(""); }} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 13px",borderRadius:10,border:`1px solid ${T.cardBorder}`,background:T.card,cursor:"pointer",fontFamily:"inherit" }}><span dir="ltr" style={{ fontSize:12.5,color:T.textPrimary,fontFamily:"monospace" }}>{u.email}</span><RoleBadge role={u.role}/></button>))}</div>
      </div>
      <div style={{ fontSize:11,color:T.textMuted,marginTop:16,textAlign:"center",lineHeight:1.5 }}>{t("login.secure")}</div>
    </div>
  </div>;
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const NAV=[{ id:"dashboard",icon:LayoutDashboard,key:"nav.dashboard" },{ id:"inverters",icon:Cpu,key:"nav.inverters" },{ id:"zones",icon:Grid,key:"nav.zones" },{ id:"schedule",icon:Calendar,key:"nav.schedule" },{ id:"analytics",icon:BarChart3,key:"nav.analytics" },{ id:"ai",icon:Bot,key:"nav.ai" }];

export default function SolarWashWeb(){
  const [lang,setLang]=useState("ru"); const [view,setView]=useState("dashboard");
  const [site,setSite]=useState(DEFAULT_SITE); const [showSite,setShowSite]=useState(false);
  const [user,setUser]=useState(null); const [users,setUsers]=useState(DEMO_USERS); const [log,setLog]=useState([]);
  const [config,setConfig]=useState({ backendBase:BACKEND_BASE, pixelId:"", sheetUrl:"", ipify:true });
  const dir=(LOCALES[lang]||LOCALES.en).dir, locale=(LOCALES[lang]||LOCALES.en).code; const t=(k,p)=>translate(lang,k,p);
  const pushLog=(code,detail)=>setLog(l=>[{ id:Date.now()+Math.random(), ts:new Date().toISOString(), user:(user&&user.name)||"system", code, detail:detail||"" },...l].slice(0,200));
  const login=async(email,password)=>{
    if(AUTH_ENDPOINT){ try{ const r=await fetch(AUTH_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})}); if(!r.ok) return { ok:false, error:"invalid" }; const d=await r.json(); setUser(d.user); setLog(l=>[{ id:Date.now(), ts:new Date().toISOString(), user:d.user.name, code:"login", detail:email },...l]); return { ok:true }; }catch{ return { ok:false, error:"network" }; } }
    const u=users.find(x=>x.email.toLowerCase()===email.toLowerCase()&&x.password===password);
    if(!u) return { ok:false, error:"invalid" };
    const su={ id:u.id, name:u.name, email:u.email, role:u.role }; setUser(su);
    setLog(l=>[{ id:Date.now(), ts:new Date().toISOString(), user:su.name, code:"login", detail:email },...l]);
    return { ok:true };
  };
  const logout=()=>{ pushLog("logout",user&&user.email); setUser(null); setView("dashboard"); };
  const role=user&&user.role; const isAdmin=role==="admin"; const canWrite=role==="admin"||role==="operator";

  const irr=useIrradiance(site); const fleet=useFleet(irr, pushLog);
  const online=fleet.connectors.filter(c=>c.status==="online").length;
  const critical=fleet.zones.filter(z=>z.status==="critical").length;
  const sysAc=fleet.zones.reduce((a,z)=>a+z.acW,0);

  const nav=isAdmin?[...NAV,{ id:"admin",icon:Shield,key:"nav.admin" }]:NAV;
  const views={ dashboard:<Dashboard fleet={fleet} irr={irr}/>, inverters:<Inverters fleet={fleet}/>, zones:<Zones fleet={fleet} site={site}/>, schedule:<Schedule fleet={fleet} site={site}/>, analytics:<Analytics fleet={fleet}/>, ai:<AI fleet={fleet}/>, admin:isAdmin?<Admin fleet={fleet} users={users} setUsers={setUsers} log={log} config={config} setConfig={setConfig} pushLog={pushLog}/>:null };

  return <LocaleCtx.Provider value={{ lang, setLang, locale, dir, t }}>
    <AuthCtx.Provider value={{ user, role, isAdmin, canWrite, login, logout }}>
      {!user ? <LoginScreen onLogin={login}/> : (
        <div dir={dir} lang={lang} style={{ display:"flex",height:"100vh",background:T.bg,color:T.textPrimary,overflow:"hidden",fontFamily:"'Segoe UI','Arial',system-ui,-apple-system,sans-serif" }}>
          <div style={{ width:232,background:T.panel,borderInlineEnd:`1px solid ${T.cardBorder}`,display:"flex",flexDirection:"column",padding:"22px 0",flexShrink:0 }}>
            <div style={{ padding:"0 20px 22px",display:"flex",alignItems:"center",gap:11 }}><div style={{ width:38,height:38,borderRadius:12,background:`linear-gradient(135deg,${T.accent},#D97706)`,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 4px 16px ${T.accent}40` }}><Sun size={18} color="#000"/></div><div><div style={{ fontSize:15,fontWeight:900,color:T.textPrimary,lineHeight:1 }}>SolarWash</div><div style={{ fontSize:10,color:T.accent,fontWeight:800,letterSpacing:".12em",marginTop:2 }}>{t("brand.tag")}</div></div></div>
            <div style={{ flex:1,padding:"0 10px",display:"flex",flexDirection:"column",gap:3 }}>{nav.map(({id,icon:Icon,key})=>{ const a=view===id;
              return <button key={id} onClick={()=>setView(id)} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 13px",borderRadius:11,border:"none",background:a?T.accent+"18":"transparent",color:a?T.accent:T.textSecondary,fontSize:14,fontWeight:a?700:400,cursor:"pointer",transition:"all .18s",textAlign:"start",fontFamily:"inherit" }}><div style={{ display:"flex",alignItems:"center",gap:11 }}><Icon size={17}/>{t(key)}</div>{id==="zones"&&critical>0&&<span style={{ fontSize:11,fontWeight:700,minWidth:18,height:18,borderRadius:9,background:T.red,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center" }}>{critical}</span>}{id==="inverters"&&<span style={{ fontSize:11,color:T.textMuted }}>{online}</span>}</button>;
            })}</div>
            <div style={{ padding:"0 14px 12px" }}>
              {canWrite&&<button onClick={()=>setShowSite(true)} style={{ width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:`1px solid ${T.cardBorder}`,background:T.bg,color:T.textSecondary,fontSize:13,cursor:"pointer",fontFamily:"inherit",marginBottom:10 }}><Settings size={16}/>{t("side.settings")}<span dir="ltr" style={{ marginInlineStart:"auto",fontSize:11,color:site.livePOA?T.cyan:T.textMuted }}>{site.livePOA?t("irr.live"):t("irr.modeled")}</span></button>}
              <div style={{ display:"flex",gap:6,background:T.bg,borderRadius:10,padding:4 }}>{Object.entries(LOCALES).map(([k,cfg])=>(<button key={k} onClick={()=>setLang(k)} style={{ flex:1,padding:"7px 0",borderRadius:7,border:"none",background:lang===k?T.accent:"transparent",color:lang===k?"#000":T.textSecondary,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit" }}>{cfg.label}</button>))}</div>
            </div>
            <div style={{ padding:"12px 14px 0",borderTop:`1px solid ${T.cardBorder}`,margin:"0 6px" }}>
              <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:11 }}>
                <div style={{ width:34,height:34,borderRadius:10,background:roleColor(role)+"1A",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>{role==="admin"?<Shield size={16} color={roleColor(role)}/>:role==="operator"?<Settings size={16} color={roleColor(role)}/>:<Eye size={16} color={roleColor(role)}/>}</div>
                <div style={{ minWidth:0,flex:1 }}><div style={{ fontSize:13,fontWeight:700,color:T.textPrimary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{user.name}</div><div style={{ fontSize:11,color:roleColor(role) }}>{t("role."+role)}</div></div>
                <button onClick={logout} title={t("side.logout")} style={{ background:"none",border:`1px solid ${T.cardBorder}`,borderRadius:8,padding:"6px",cursor:"pointer",color:T.textSecondary,flexShrink:0 }}><LogOut size={14}/></button>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:5 }}><Wifi size={13} color={online?T.green:T.textSecondary}/><span style={{ fontSize:12,color:online?T.green:T.textSecondary,fontWeight:600 }}>{online?t("side.live"):t("side.offline")}</span><span style={{ marginInlineStart:"auto",fontSize:10,color:fleet.mode==="live"?T.green:T.textMuted }}>{fleet.mode==="live"?t("mode.live"):t("mode.demo")}</span></div>
              <div dir="ltr" style={{ fontSize:13,fontWeight:700,color:T.accent,fontFamily:"monospace" }}>{fmtW(sysAc)}</div><div style={{ fontSize:11,color:T.textMuted,marginTop:1 }}>{t("side.currentAc")}</div>
            </div>
          </div>
          <div style={{ flex:1,overflow:"auto" }}>{views[view]||views.dashboard}</div>
          {showSite&&canWrite&&<SiteModal site={site} setSite={setSite} irr={irr} onClose={()=>setShowSite(false)}/>}
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes wash{0%,100%{opacity:.6}50%{opacity:1}}@keyframes dot{0%,80%,100%{transform:scale(.6);opacity:.4}40%{transform:scale(1);opacity:1}}`}</style>
    </AuthCtx.Provider>
  </LocaleCtx.Provider>;
}
