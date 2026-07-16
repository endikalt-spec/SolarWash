/**
 * sunspecModbus.js
 * ---------------------------------------------------------------------------
 * SunSpec Modbus TCP reader for the SolarWash polling layer.
 *
 * Reads:
 *   - Inverter model (101 single-phase / 103 three-phase)  -> AC power (actual_AC for PR)
 *   - MPPT model 160 ("Multiple MPPT Inverter Extension")  -> per-STRING DC I/V/W
 *
 * Design:
 *   - Pure decode/parse functions (exported) operate on plain uint16 arrays,
 *     so they are unit-testable OFFLINE without any device or socket.
 *   - The networked part (`readInverterSunSpec`) dynamically imports
 *     'modbus-serial' ONLY when called, so importing this module never
 *     requires the dependency to be installed.
 *
 * Register layout per SunSpec Alliance spec. Values shifted by scale factors:
 *     actual = raw * 10^SF      (SF is a signed int16; 0x8000 = "not implemented")
 *
 * Endianness: registers are 16-bit big-endian; 32-bit values are high-word-first.
 * ---------------------------------------------------------------------------
 */

export const SUNSPEC_BASES = [40000, 50000, 0]; // probe order (PDU addresses)
export const SUNSPEC_MARKER = [0x5375, 0x6e53]; // 'SunS'
export const MODEL = { INVERTER_1PH: 101, INVERTER_SPLIT: 102, INVERTER_3PH: 103, MPPT: 160 };
const SF_NOT_IMPLEMENTED = 0x8000;
const END_MODEL = 0xffff;

/* ----------------------------- pure decoders ----------------------------- */

export function u16(regs, i) {
  return regs[i] & 0xffff;
}
export function s16(regs, i) {
  const v = regs[i] & 0xffff;
  return v & 0x8000 ? v - 0x10000 : v;
}
export function u32(regs, i) {
  // high word first
  return (regs[i] & 0xffff) * 0x10000 + (regs[i + 1] & 0xffff);
}
export function str(regs, i, lenRegs) {
  let s = '';
  for (let k = 0; k < lenRegs; k++) {
    const r = regs[i + k] & 0xffff;
    const hi = (r >> 8) & 0xff;
    const lo = r & 0xff;
    if (hi) s += String.fromCharCode(hi);
    if (lo) s += String.fromCharCode(lo);
  }
  return s.replace(/\0/g, '').trim();
}
/** Apply a SunSpec scale factor. Returns null if value/SF is unimplemented. */
export function applySF(raw, sf) {
  if (raw === undefined || raw === null) return null;
  if ((sf & 0xffff) === SF_NOT_IMPLEMENTED) return raw; // no scaling
  return raw * Math.pow(10, sf);
}

/* --------------------------- model 160 parser ---------------------------- */
/**
 * Parse the payload of MPPT model 160 into per-string readings.
 * Header (8 regs): DCA_SF, DCV_SF, DCW_SF, DCWH_SF, Evt(2), N, TmsPer
 * Then N repeating blocks of 20 regs each.
 * @param {number[]} p  payload registers (NOT including the [ID,L] header)
 */
export function parseModel160(p) {
  const dcaSf = s16(p, 0);
  const dcvSf = s16(p, 1);
  const dcwSf = s16(p, 2);
  const n = u16(p, 6);

  const BLOCK = 20;
  const HEAD = 8;
  const strings = [];

  for (let m = 0; m < n; m++) {
    const o = HEAD + m * BLOCK;
    if (o + BLOCK > p.length) break; // guard against short reads
    strings.push({
      id: u16(p, o + 0),
      label: str(p, o + 1, 8),
      iDc: applySF(u16(p, o + 9), dcaSf),   // amps
      vDc: applySF(u16(p, o + 10), dcvSf),  // volts
      pDc: applySF(u16(p, o + 11), dcwSf),  // watts
      energyWh: u32(p, o + 12),
      tempC: s16(p, o + 16),
      status: u16(p, o + 17),
    });
  }
  return { count: n, strings };
}

/* ------------------------- inverter model parser ------------------------- */
/**
 * Parse AC power (and AC energy) from inverter model 101/102/103 payload.
 * W at payload offset 12, W_SF at 13. WH (acc32) at 22-23, WH_SF at 24.
 */
export function parseInverterModel(p) {
  const w = s16(p, 12);
  const wSf = s16(p, 13);
  const wh = u32(p, 22);
  const whSf = s16(p, 24);
  return {
    acPowerW: applySF(w, wSf),
    acEnergyWh: applySF(wh, whSf),
  };
}

/* ----------------------------- chain walker ------------------------------ */
/**
 * Walk the SunSpec model chain.
 * @param {(addr:number,len:number)=>Promise<number[]>} readRegs
 * @param {number} base
 * @returns {Promise<Object|null>} map: { [modelId]: { payloadAddr, len } } or null
 */
export async function walkModels(readRegs, base) {
  let marker;
  try {
    marker = await readRegs(base, 2);
  } catch {
    return null;
  }
  if (!(marker[0] === SUNSPEC_MARKER[0] && marker[1] === SUNSPEC_MARKER[1])) return null;

  const models = {};
  let ptr = base + 2;
  for (let i = 0; i < 96; i++) {
    const hdr = await readRegs(ptr, 2);
    const id = u16(hdr, 0);
    const len = u16(hdr, 1);
    if (id === END_MODEL) break;
    models[id] = { payloadAddr: ptr + 2, len };
    ptr += 2 + len;
  }
  return models;
}

/* ------------------------- networked entry point ------------------------- */
/**
 * Connect over Modbus TCP, locate SunSpec, read inverter + per-string data,
 * and return a normalized reading for the PR engine.
 *
 * @param {object} conn { host, port=502, unitId=1, base? }
 * @returns normalized reading:
 *   { ts, transport, acPowerW, acEnergyWh, perStringAvailable, dcStrings[], status }
 */
export async function readInverterSunSpec(conn) {
  const { host, port = 502, unitId = 1, base: forcedBase } = conn;
  const { default: ModbusRTU } = await import('modbus-serial');
  const client = new ModbusRTU();

  // chunked reader (Modbus max 125 regs/read; stay safe at 100)
  const readRegs = async (addr, len) => {
    const out = [];
    let off = 0;
    while (off < len) {
      const take = Math.min(100, len - off);
      const { data } = await client.readHoldingRegisters(addr + off, take);
      out.push(...data);
      off += take;
    }
    return out;
  };

  try {
    await client.connectTCP(host, { port });
    client.setID(unitId);
    client.setTimeout(4000);

    // locate SunSpec base
    let models = null;
    const bases = forcedBase != null ? [forcedBase] : SUNSPEC_BASES;
    for (const b of bases) {
      models = await walkModels(readRegs, b);
      if (models) break;
    }
    if (!models) {
      return { ts: Date.now(), transport: 'modbus_tcp', status: 'no_sunspec',
        acPowerW: null, acEnergyWh: null, perStringAvailable: false, dcStrings: [] };
    }

    // inverter model (prefer three-phase, fall back to others)
    let ac = { acPowerW: null, acEnergyWh: null };
    const invId = [MODEL.INVERTER_3PH, MODEL.INVERTER_1PH, MODEL.INVERTER_SPLIT].find((id) => models[id]);
    if (invId) {
      const p = await readRegs(models[invId].payloadAddr, models[invId].len);
      ac = parseInverterModel(p);
    }

    // per-string MPPT model 160 (true string inverters)
    let dcStrings = [];
    let perStringAvailable = false;
    if (models[MODEL.MPPT]) {
      const p = await readRegs(models[MODEL.MPPT].payloadAddr, models[MODEL.MPPT].len);
      dcStrings = parseModel160(p).strings;
      perStringAvailable = dcStrings.length > 0;
    }

    return {
      ts: Date.now(),
      transport: 'modbus_tcp',
      status: 'ok',
      acPowerW: ac.acPowerW,
      acEnergyWh: ac.acEnergyWh,
      perStringAvailable,
      dcStrings,
    };
  } finally {
    try { client.close(); } catch { /* noop */ }
  }
}

export default readInverterSunSpec;
