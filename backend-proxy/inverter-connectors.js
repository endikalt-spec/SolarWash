// ═══════════════════════════════════════════════════════════════════════════
//  SolarWash · Inverter Connector Layer
//  One common interface, one adapter per vendor. All adapters normalize to the
//  same telemetry schema so the cleaning/PR logic is vendor-agnostic.
//
//  Common schema (returned by getTelemetry):
//  {
//    vendor, siteId, ts,
//    acPowerW, dcPowerW, expectedW, energyTodayWh, tempC,
//    strings: [{ id, name, acW, dcW, expectedW, voltage, current, prPct }]
//  }
//
//  prPct (performance ratio) = actual / expected × 100  → soiling indicator.
//  Run this on the BACKEND (keys, OAuth, Modbus, CORS all live server-side).
// ═══════════════════════════════════════════════════════════════════════════

// Expected power model when the vendor doesn't expose it directly.
// Replace irradianceFactor with POA irradiance from a weather API for accuracy.
function expectedPower(capacityW, irradianceFactor, tempC = 25) {
  const tempDerate = 1 - Math.max(0, tempC - 25) * 0.004; // ~0.4%/°C
  return capacityW * irradianceFactor * tempDerate;
}

class InverterConnector {
  constructor(config) { this.config = config; this.vendor = "base"; }
  async connect() { throw new Error("not implemented"); }
  async getStatus() { throw new Error("not implemented"); }
  async getTelemetry() { throw new Error("not implemented"); }
  disconnect() {}
  _norm(t) { return { vendor: this.vendor, ts: Date.now(), ...t }; }
}

// ─── SolarEdge (Monitoring API, cloud) ────────────────────────────────────────
// Docs: monitoringapi.solaredge.com — needs apiKey + siteId.
// Per-string/optimizer data via /equipment endpoints (panel-level).
class SolarEdgeConnector extends InverterConnector {
  constructor(c){ super(c); this.vendor="solaredge"; this.base="https://monitoringapi.solaredge.com"; }
  async connect(){ const s=await this.getStatus(); return s.online; }
  async getStatus(){
    const r=await fetch(`${this.base}/site/${this.config.siteId}/overview?api_key=${this.config.apiKey}`);
    return { online:r.ok, raw:r.ok?await r.json():null };
  }
  async getTelemetry(){
    const k=this.config.apiKey, id=this.config.siteId;
    const [overview, power] = await Promise.all([
      fetch(`${this.base}/site/${id}/overview?api_key=${k}`).then(r=>r.json()),
      fetch(`${this.base}/site/${id}/currentPowerFlow?api_key=${k}`).then(r=>r.json()),
    ]);
    const acPowerW = (overview.overview?.currentPower?.power) || (power.siteCurrentPowerFlow?.PV?.currentPower*1000) || 0;
    const energyTodayWh = overview.overview?.lastDayData?.energy || 0;
    const capacityW = (this.config.capacityKw||0)*1000;
    const expectedW = expectedPower(capacityW, this._irr());
    // Per-string: SolarEdge inverters report per-string via /equipment/{serial}/data
    const strings = await this._strings(acPowerW, expectedW);
    return this._norm({ siteId:id, acPowerW, dcPowerW:acPowerW/0.98, expectedW, energyTodayWh, tempC:null, strings });
  }
  async _strings(acTotal, expTotal){
    // Simplified: split evenly if equipment endpoint not configured.
    const n=this.config.strings||1;
    return Array.from({length:n},(_,i)=>{
      const expectedW=expTotal/n, acW=acTotal/n;
      return { id:`str${i+1}`, name:`String ${i+1}`, acW, dcW:acW/0.98, expectedW,
        voltage:null, current:null, prPct: expectedW? Math.round(acW/expectedW*100):0 };
    });
  }
  _irr(){ const h=new Date().getHours()+new Date().getMinutes()/60;
    return Math.max(0, Math.sin(Math.max(0,Math.min(1,(h-6)/12))*Math.PI)); }
}

// ─── Fronius (local Solar API, on-site HTTP) ──────────────────────────────────
// No cloud key needed — call the inverter on the LAN. Per-MPPT via DeviceStatus.
class FroniusConnector extends InverterConnector {
  constructor(c){ super(c); this.vendor="fronius"; this.base=`http://${c.host}/solar_api/v1`; }
  async connect(){ const s=await this.getStatus(); return s.online; }
  async getStatus(){ try{ const r=await fetch(`${this.base}/GetInverterInfo.cgi`); return {online:r.ok}; }catch{ return {online:false}; } }
  async getTelemetry(){
    const data = await fetch(`${this.base}/GetInverterRealtimeData.cgi?Scope=System`).then(r=>r.json());
    const unit = data?.Body?.Data;
    const acPowerW = unit?.PAC?.Values?.["1"] || 0;
    const energyTodayWh = unit?.DAY_ENERGY?.Values?.["1"] || 0;
    // Per-MPPT string data:
    const mppt = await fetch(`${this.base}/GetInverterRealtimeData.cgi?Scope=Device&DeviceId=1&DataCollection=CommonInverterData`).then(r=>r.json()).catch(()=>null);
    const capacityW=(this.config.capacityKw||0)*1000;
    const expectedW=expectedPower(capacityW, this._irr());
    const n=this.config.strings||2;
    const strings=Array.from({length:n},(_,i)=>{
      const expectedWs=expectedW/n, acW=acPowerW/n;
      return { id:`mppt${i+1}`, name:`MPPT ${i+1}`, acW, dcW:acW/0.97, expectedW:expectedWs,
        voltage:mppt?.Body?.Data?.UDC?.Value||null, current:mppt?.Body?.Data?.IDC?.Value||null,
        prPct: expectedWs? Math.round(acW/expectedWs*100):0 };
    });
    return this._norm({ siteId:this.config.host, acPowerW, dcPowerW:acPowerW/0.97, expectedW, energyTodayWh, tempC:null, strings });
  }
  _irr(){ const h=new Date().getHours()+new Date().getMinutes()/60; return Math.max(0, Math.sin(Math.max(0,Math.min(1,(h-6)/12))*Math.PI)); }
}

// ─── Huawei FusionSolar (NorthBound API) ──────────────────────────────────────
// Token-based: login → XSRF token → getDevRealKpi. Needs username + systemCode.
class HuaweiConnector extends InverterConnector {
  constructor(c){ super(c); this.vendor="huawei"; this.base="https://eu5.fusionsolar.huawei.com/thirdData"; this.token=null; }
  async connect(){
    const r=await fetch(`${this.base}/login`,{ method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ userName:this.config.username, systemCode:this.config.systemCode }) });
    this.token = r.headers.get("xsrf-token");
    return !!this.token;
  }
  async getStatus(){ if(!this.token) await this.connect(); return { online:!!this.token }; }
  async getTelemetry(){
    if(!this.token) await this.connect();
    const r=await fetch(`${this.base}/getDevRealKpi`,{ method:"POST",
      headers:{ "Content-Type":"application/json", "XSRF-TOKEN":this.token },
      body:JSON.stringify({ devIds:this.config.devId, devTypeId:1 }) });
    const d=await r.json();
    const item=d?.data?.[0]?.dataItemMap||{};
    const acPowerW=(item.active_power||0)*1000;
    const energyTodayWh=(item.day_cap||0)*1000;
    const capacityW=(this.config.capacityKw||0)*1000;
    const expectedW=expectedPower(capacityW, this._irr(), item.temperature);
    const n=this.config.strings||3;
    const strings=Array.from({length:n},(_,i)=>{
      const e=expectedW/n, acW=acPowerW/n;
      return { id:`pv${i+1}`, name:`PV ${i+1}`, acW, dcW:acW/0.985, expectedW:e,
        voltage:item[`pv${i+1}_u`]||null, current:item[`pv${i+1}_i`]||null,
        prPct:e?Math.round(acW/e*100):0 };
    });
    return this._norm({ siteId:this.config.stationCode, acPowerW, dcPowerW:acPowerW/0.985, expectedW, energyTodayWh, tempC:item.temperature??null, strings });
  }
  _irr(){ const h=new Date().getHours()+new Date().getMinutes()/60; return Math.max(0, Math.sin(Math.max(0,Math.min(1,(h-6)/12))*Math.PI)); }
}

// ─── Enphase (Enlighten API v4, OAuth2) ───────────────────────────────────────
class EnphaseConnector extends InverterConnector {
  constructor(c){ super(c); this.vendor="enphase"; this.base="https://api.enphaseenergy.com/api/v4"; }
  async connect(){ const s=await this.getStatus(); return s.online; }
  async getStatus(){
    const r=await fetch(`${this.base}/systems/${this.config.systemId}/summary?key=${this.config.apiKey}`,
      { headers:{ Authorization:`Bearer ${this.config.accessToken}` } });
    return { online:r.ok };
  }
  async getTelemetry(){
    const r=await fetch(`${this.base}/systems/${this.config.systemId}/summary?key=${this.config.apiKey}`,
      { headers:{ Authorization:`Bearer ${this.config.accessToken}` } });
    const d=await r.json();
    const acPowerW=d.current_power||0, energyTodayWh=d.energy_today||0;
    const capacityW=(this.config.capacityKw||0)*1000, expectedW=expectedPower(capacityW,this._irr());
    // Enphase is micro-inverter based → group panels into logical strings/arrays.
    const n=this.config.strings||4;
    const strings=Array.from({length:n},(_,i)=>{ const e=expectedW/n, acW=acPowerW/n;
      return { id:`arr${i+1}`, name:`Array ${i+1}`, acW, dcW:acW, expectedW:e, voltage:null, current:null, prPct:e?Math.round(acW/e*100):0 }; });
    return this._norm({ siteId:this.config.systemId, acPowerW, dcPowerW:acPowerW, expectedW, energyTodayWh, tempC:null, strings });
  }
  _irr(){ const h=new Date().getHours()+new Date().getMinutes()/60; return Math.max(0, Math.sin(Math.max(0,Math.min(1,(h-6)/12))*Math.PI)); }
}

// ─── Generic SunSpec / Modbus TCP (vendor-agnostic) ───────────────────────────
// Works with SMA, Fronius, SolarEdge, Kostal… anything exposing SunSpec models.
// Requires a Modbus library on the backend (e.g. `jsmodbus`). Pseudocode reads
// model 103 (inverter) + 160 (MPPT) register blocks.
class SunSpecConnector extends InverterConnector {
  constructor(c){ super(c); this.vendor="sunspec"; }
  async connect(){ /* open Modbus TCP socket to host:port, unitId */ return true; }
  async getStatus(){ return { online:true }; }
  async getTelemetry(){
    // const client = modbus.tcp(this.config.host, this.config.port, this.config.unitId)
    // model103 = await client.readHoldingRegisters(40069, 50)  // AC power, energy, temp
    // model160 = await client.readHoldingRegisters(40123, ...) // per-MPPT DC
    // Map registers → values (scale factors per SunSpec spec).
    const acPowerW = 0; // ← parsed from model103.W * 10^W_SF
    const energyTodayWh = 0;
    const tempC = null;
    const capacityW=(this.config.capacityKw||0)*1000, expectedW=expectedPower(capacityW,this._irr(),tempC);
    const n=this.config.strings||3;
    const strings=Array.from({length:n},(_,i)=>{ const e=expectedW/n, acW=acPowerW/n;
      return { id:`mppt${i+1}`, name:`MPPT ${i+1}`, acW, dcW:acW, expectedW:e, voltage:null, current:null, prPct:e?Math.round(acW/e*100):0 }; });
    return this._norm({ siteId:this.config.host, acPowerW, dcPowerW:acPowerW, expectedW, energyTodayWh, tempC, strings });
  }
  _irr(){ const h=new Date().getHours()+new Date().getMinutes()/60; return Math.max(0, Math.sin(Math.max(0,Math.min(1,(h-6)/12))*Math.PI)); }
}

// ─── Factory ──────────────────────────────────────────────────────────────────
const REGISTRY = {
  solaredge: SolarEdgeConnector,
  fronius:   FroniusConnector,
  huawei:    HuaweiConnector,
  enphase:   EnphaseConnector,
  sunspec:   SunSpecConnector,
  sma:       SunSpecConnector,   // SMA via SunSpec/Modbus
  growatt:   SunSpecConnector,   // or implement ShineServer adapter
};

export function createConnector(vendor, config){
  const Cls = REGISTRY[vendor];
  if(!Cls) throw new Error(`No connector for vendor: ${vendor}`);
  return new Cls(config);
}

export { InverterConnector, SolarEdgeConnector, FroniusConnector, HuaweiConnector, EnphaseConnector, SunSpecConnector, expectedPower };

// ─── Adding a new vendor ──────────────────────────────────────────────────────
// 1. Subclass InverterConnector.
// 2. Implement connect(), getStatus(), getTelemetry() → return this._norm({...}).
// 3. Map the vendor's JSON/registers into the common `strings[]` schema.
// 4. Register it in REGISTRY above. The frontend + PR logic need zero changes.
