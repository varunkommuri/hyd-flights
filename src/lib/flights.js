// Flight schedule: live (AeroDataBox via RapidAPI) + realistic simulated fallback
import { HYD } from './config.js';
import { AIRPORTS, airlineInfo, resolveAircraft, AIRLINES } from './reference.js';
import { distKm, seeded, hashStr } from './util.js';

// ---------- status presentation ----------
export const STATUS = {
  scheduled: { label: 'On time', tone: 'green' },
  checkin: { label: 'Check-in open', tone: 'blue' },
  gateopen: { label: 'Gate open', tone: 'blue' },
  boarding: { label: 'Boarding', tone: 'blue' },
  finalcall: { label: 'Final call', tone: 'orange' },
  gateclosed: { label: 'Gate closed', tone: 'orange' },
  departed: { label: 'Departed', tone: 'grey' },
  enroute: { label: 'En route', tone: 'blue' },
  approaching: { label: 'Landing soon', tone: 'blue' },
  landed: { label: 'Landed', tone: 'green' },
  arrived: { label: 'At gate', tone: 'grey' },
  delayed: { label: 'Delayed', tone: 'yellow' },
  cancelled: { label: 'Cancelled', tone: 'red' },
  diverted: { label: 'Diverted', tone: 'red' },
  unknown: { label: 'Scheduled', tone: 'grey' },
};

export function statusOf(f) {
  const base = STATUS[f.status] || STATUS.unknown;
  if (f.status === 'delayed' || ((f.delayMin ?? 0) >= 15 && ['scheduled', 'checkin', 'unknown', 'enroute'].includes(f.status))) {
    return { label: `Delayed ${f.delayMin} min`, short: 'Delayed', tone: 'yellow' };
  }
  return { ...base, short: base.label };
}

export const effTime = (f) => f.actual || f.est || f.sched;
// One definition of "disrupted", shared by the Home card and the Flights filter
export const isDisrupted = (f) => (f.delayMin ?? 0) >= 15 || ['cancelled', 'diverted', 'delayed'].includes(f.status);
// Finished flights older than 20 min drop off the main lists (still under "Show earlier")
export const isEarlier = (f, now = Date.now()) => isDone(f) && effTime(f) < now - 20 * 60000;
export const isDone = (f) => ['departed', 'arrived', 'landed', 'cancelled', 'diverted'].includes(f.status);

// ---------- AeroDataBox normalisation ----------
const str = (v) => (Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v).trim());
function parseT(t) {
  if (!t) return null;
  const s = t.utc || t.local;
  if (!s) return null;
  const d = new Date(s.replace(' ', 'T'));
  return isNaN(d) ? null : d;
}
function offsetOf(t) {
  const m = t?.local?.match(/([+-])(\d\d):(\d\d)$/);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : null;
}

const ADB_STATUS = {
  Expected: 'scheduled', CheckIn: 'checkin', Boarding: 'boarding', GateClosed: 'gateclosed',
  Departed: 'departed', EnRoute: 'enroute', Approaching: 'approaching', Arrived: 'arrived',
  Delayed: 'delayed', Canceled: 'cancelled', CanceledUncertain: 'cancelled', Diverted: 'diverted', Unknown: 'unknown',
};

function normaliseAdb(raw, dir) {
  // withLeg=true -> raw.departure/raw.arrival ; otherwise raw.movement (with airport = other end)
  const here = raw.departure && raw.arrival ? (dir === 'dep' ? raw.departure : raw.arrival) : raw.movement;
  const there = raw.departure && raw.arrival ? (dir === 'dep' ? raw.arrival : raw.departure) : raw.movement;
  if (!here) return null;
  const ap = there?.airport || {};
  const iata = ap.iata || ap.icao || '???';
  const ref = AIRPORTS[iata];
  const sched = parseT(here.scheduledTime);
  if (!sched) return null;
  const est = parseT(here.revisedTime) || parseT(here.predictedTime);
  const actual = parseT(here.runwayTime);
  const hasLeg = !!(raw.departure && raw.arrival);
  const otherSched = hasLeg ? parseT(there.scheduledTime) : null;
  const otherEst = hasLeg ? parseT(there.revisedTime) || parseT(there.predictedTime) : null;
  const otherTz = (hasLeg && offsetOf(there.scheduledTime)) ?? ref?.tz ?? 330;
  const al = raw.airline || {};
  const number = (raw.number || '').replace(/\s+/, ' ').trim();
  const code = al.iata || number.split(' ')[0];
  const airline = airlineInfo(code, al.name);
  const delayMin = est ? Math.max(0, Math.round((est - sched) / 60000)) : 0;
  let status = ADB_STATUS[raw.status] || 'unknown';
  status = refineStatus(dir, status, actual || est || sched);
  const aircraft = resolveAircraft(raw.aircraft?.model);
  return {
    id: `${dir}-${number.replace(/\s/g, '')}-${sched.toISOString().slice(0, 10)}`,
    dir, number, airline, callsign: raw.callSign || '',
    other: {
      iata, city: ap.municipalityName || ref?.city || ap.name || iata, name: ap.name || '',
      lat: ap.location?.lat ?? ref?.lat, lon: ap.location?.lon ?? ref?.lon, tz: otherTz,
    },
    sched, est, actual, otherSched, otherEst,
    terminal: str(here.terminal ?? raw.movement?.terminal), gate: str(here.gate ?? raw.movement?.gate),
    checkIn: str(here.checkInDesk ?? here.checkInDesks ?? raw.movement?.checkInDesk),
    belt: str(here.baggageBelt ?? raw.movement?.baggageBelt), runway: str(here.runway),
    quality: here.quality || [],
    status, delayMin,
    aircraft, reg: raw.aircraft?.reg || '',
    intl: isInternational(ap, ref, there?.scheduledTime), intlSrc: 1,
    cargo: !!raw.isCargo,
    source: 'live',
  };
}

// Domestic vs international, from the most reliable signal available.
// Feeds don't always include countryCode, so fall back to the ICAO code
// (every Indian airport starts VA/VE/VI/VO), the airport's time zone,
// our own airport table, and finally the UTC offset of its local time.
export function isInternational(ap = {}, ref, timeObj) {
  const cc = (ap.countryCode || ap.country?.code || '').toUpperCase();
  if (cc) return cc !== 'IN';
  const icao = (ap.icao || '').toUpperCase();
  if (/^[A-Z]{4}$/.test(icao)) return !/^V[AEIO]/.test(icao);
  if (ap.timeZone) return ap.timeZone !== 'Asia/Kolkata' && ap.timeZone !== 'Asia/Calcutta';
  if (ref?.country) return ref.country !== 'IN';
  const off = offsetOf(timeObj);
  if (off != null) return off !== 330;
  return false;
}

// Fill gaps in feed status using time (feeds often leave "Expected" until departure)
function refineStatus(dir, status, t) {
  if (!['scheduled', 'unknown'].includes(status)) return status;
  const m = (t - Date.now()) / 60000;
  if (dir === 'dep') {
    if (m < -5) return 'departed';
    if (m < 15) return 'gateclosed';
    if (m < 45) return 'boarding';
    if (m < 60) return 'gateopen';
    if (m < 150) return 'checkin';
    return 'scheduled';
  }
  if (m < -15) return 'arrived';
  if (m < 0) return 'landed';
  if (m < 25) return 'approaching';
  return status === 'unknown' ? 'enroute' : status;
}

export async function fetchLiveSchedule(apiKey, signal) {
  const url = `https://aerodatabox.p.rapidapi.com/flights/airports/icao/${HYD.icao}` +
    `?offsetMinutes=-120&durationMinutes=720&withLeg=true&direction=Both&withCancelled=true` +
    `&withCodeshared=false&withCargo=true&withPrivate=false&withLocation=false`;
  const res = await fetch(url, {
    signal,
    headers: { 'X-RapidAPI-Key': apiKey, 'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com' },
  });
  if (res.status === 401 || res.status === 403) throw new Error('API key rejected — check it in Settings');
  if (res.status === 429) throw new Error('API quota reached — showing last saved data');
  if (!res.ok) throw new Error(`Schedule feed error ${res.status}`);
  const json = await res.json();
  try { window.__hydFeedSample = { departure: json.departures?.[0], arrival: json.arrivals?.[0] }; } catch { /* ignore */ }
  const deps = (json.departures || []).map((r) => normaliseAdb(r, 'dep')).filter(Boolean);
  const arrs = (json.arrivals || []).map((r) => normaliseAdb(r, 'arr')).filter(Boolean);
  return dedupe([...deps, ...arrs]).sort((a, b) => a.sched - b.sched);
}

function dedupe(list) {
  const seen = new Map();
  for (const f of list) if (!seen.has(f.id)) seen.set(f.id, f);
  return [...seen.values()];
}

// Revive dates after JSON cache round-trip
export function reviveFlights(list) {
  const d = (v) => (v ? new Date(v) : null);
  return (list || []).map((f) => ({
    ...f, sched: d(f.sched), est: d(f.est), actual: d(f.actual), otherSched: d(f.otherSched), otherEst: d(f.otherEst),
    intl: f.intlSrc ? f.intl : (AIRPORTS[f.other?.iata] ? AIRPORTS[f.other.iata].country !== 'IN' : f.other?.tz != null && f.other.tz !== 330 ? true : f.intl),
  }));
}

// ---------- simulated schedule ----------
const ROUTES = [
  // [iata, weight, carriers]
  ['DEL', 10, ['6E', 'AI', 'QP', 'SG']], ['BOM', 9, ['6E', 'AI', 'QP', 'SG']], ['BLR', 9, ['6E', 'AI', 'QP', 'IX']],
  ['MAA', 6, ['6E', 'AI', 'IX']], ['CCU', 5, ['6E', 'AI', 'IX']], ['COK', 3, ['6E', 'IX']], ['GOX', 3, ['6E', 'QP']],
  ['PNQ', 4, ['6E', 'SG']], ['AMD', 3, ['6E', 'QP']], ['JAI', 2, ['6E']], ['TIR', 2, ['6E', '9I']], ['VTZ', 3, ['6E', 'AI']],
  ['LKO', 2, ['6E', 'IX']], ['BBI', 2, ['6E']], ['NAG', 2, ['6E']], ['VGA', 2, ['6E', '9I']], ['IXE', 1, ['6E']],
  ['TRV', 1, ['6E', 'AI']], ['GAU', 1, ['6E']],
  ['DXB', 4, ['EK', '6E', 'FZ', 'AI']], ['DOH', 3, ['QR', '6E']], ['AUH', 2, ['EY', '6E']], ['SHJ', 2, ['G9', 'IX']],
  ['MCT', 2, ['WY', 'IX']], ['JED', 2, ['SV', '6E']], ['RUH', 1, ['SV']], ['KWI', 1, ['KU']], ['BAH', 1, ['GF']],
  ['SIN', 2, ['SQ', '6E']], ['BKK', 1, ['TG', '6E']], ['KUL', 1, ['MH']], ['LHR', 1, ['BA']], ['FRA', 1, ['LH']], ['CMB', 1, ['UL']],
];
const FLEET = {
  '6E': ['A20N', 'A20N', 'A20N', 'A21N', 'A320', 'AT76'], AI: ['A20N', 'A21N', 'A320', 'A321'], IX: ['B38M', 'B38M', 'B738'],
  QP: ['B38M'], SG: ['B738', 'B38M', 'DH8D'], '9I': ['AT76'], EK: ['B77W', 'A388'], QR: ['B788', 'A359', 'B77W'],
  EY: ['B789', 'A20N'], SQ: ['A359'], G9: ['A320'], FZ: ['B38M'], WY: ['B738'], SV: ['A320', 'A333'], KU: ['A20N'],
  GF: ['A20N'], TG: ['A20N', 'B788'], MH: ['B738'], BA: ['B788'], LH: ['A359'], UL: ['A320'],
};
const REG_PREFIX = { '6E': 'VT-I', AI: 'VT-R', IX: 'VT-B', QP: 'VT-Y', SG: 'VT-S', '9I': 'VT-A', EK: 'A6-E', QR: 'A7-B', EY: 'A6-B', SQ: '9V-S', G9: 'A6-A', FZ: 'A6-F', WY: 'A4O-', SV: 'HZ-A', KU: '9K-A', GF: 'A9C-', TG: 'HS-T', MH: '9M-M', BA: 'G-Z', LH: 'D-AI', UL: '4R-A' };

const totalW = ROUTES.reduce((s, r) => s + r[1], 0);
const pickRoute = (r) => {
  let x = r() * totalW;
  for (const route of ROUTES) { x -= route[1]; if (x <= 0) return route; }
  return ROUTES[0];
};
const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

const SLOT = 5 * 60000;

export function simulateSchedule(now = Date.now()) {
  const flights = [];
  const from = Math.floor((now - 3 * 3600000) / SLOT), to = Math.floor((now + 14 * 3600000) / SLOT);
  for (let s = from; s <= to; s++) {
    for (const dir of ['dep', 'arr']) {
      const r = seeded(hashStr(`${dir}:${s}`));
      const istHour = (((s * SLOT) / 3600000 + 5.5) % 24 + 24) % 24;
      const busy = istHour >= 1 && istHour < 5 ? 0.22 : 0.62;
      if (r() > busy) continue;
      const [iata, , carriers] = pickRoute(r);
      const code = carriers[Math.floor(r() * carriers.length)];
      const ap = AIRPORTS[iata];
      const intl = ap.country !== 'IN';
      const typeCode = FLEET[code][Math.floor(r() * FLEET[code].length)];
      const numBase = intl && !['6E', 'AI', 'IX'].includes(code) ? 200 + Math.floor(r() * 700) : 100 + Math.floor(r() * 7800);
      const number = `${code} ${numBase}`;
      const sched = new Date(s * SLOT + Math.floor(r() * 5) * 60000);
      const durMin = Math.round((distKm(HYD, ap) / 790) * 60 + 25);
      const dRoll = r();
      let delayMin = dRoll < 0.13 ? 15 + Math.floor(r() * 50) : dRoll < 0.35 ? Math.floor(r() * 9) : 0;
      const cancelled = r() < 0.018;
      const est = delayMin ? new Date(sched.getTime() + delayMin * 60000) : null;
      const eff = est || sched;
      const m = (eff - now) / 60000;
      let status;
      if (cancelled) { status = 'cancelled'; delayMin = 0; }
      else if (dir === 'dep') {
        status = m < -3 ? 'departed' : m < 15 ? 'gateclosed' : m < 45 ? 'boarding' : m < 60 ? 'gateopen' : m < (intl ? 180 : 120) ? 'checkin' : 'scheduled';
        if (delayMin >= 15 && m > 45) status = 'delayed';
      } else {
        status = m < -18 ? 'arrived' : m < 0 ? 'landed' : m < 25 ? 'approaching' : m < durMin ? 'enroute' : 'scheduled';
        if (delayMin >= 15 && m > 25) status = 'delayed';
      }
      const gateN = intl ? 1 + Math.floor(r() * 12) : 14 + Math.floor(r() * 32);
      const letter = L[Math.floor(r() * 10)];
      const ci = intl ? `${letter}1–${letter}8` : `${letter}${1 + Math.floor(r() * 4)}–${letter}${6 + Math.floor(r() * 8)}`;
      const reg = REG_PREFIX[code] + Array.from({ length: 3 }, () => L[Math.floor(r() * L.length)]).join('');
      const legMs = durMin * 60000 * (dir === 'dep' ? 1 : -1);
      const actual = (dir === 'dep' && status === 'departed') || (dir === 'arr' && ['landed', 'arrived'].includes(status)) ? eff : null;
      flights.push({
        id: `${dir}-${number.replace(/\s/g, '')}-${sched.toISOString().slice(0, 13)}`,
        dir, number, airline: airlineInfo(code), callsign: `${AIRLINES[code].icao}${numBase}`,
        other: { iata, city: ap.city, name: '', lat: ap.lat, lon: ap.lon, tz: ap.tz },
        sched, est, actual,
        otherSched: new Date(sched.getTime() + legMs),
        otherEst: est ? new Date(est.getTime() + legMs) : null,
        terminal: intl ? 'Intl' : 'Dom', gate: String(gateN), checkIn: dir === 'dep' ? ci : '',
        belt: dir === 'arr' ? String(1 + Math.floor(r() * 12)) : '', runway: '',
        status, delayMin, aircraft: resolveAircraft(typeCode), reg, intl, cargo: false, durMin,
        source: 'sim',
      });
    }
  }
  return flights.sort((a, b) => a.sched - b.sched);
}

// Typical check-in window at HYD when the airline hasn't published counters:
// opens 3 h (intl) / 2 h (domestic) before, closes 60 / 45 min before departure
export function checkInWindow(f) {
  if (f.dir !== 'dep') return null;
  const eff = effTime(f);
  return {
    opens: new Date(f.sched.getTime() - (f.intl ? 180 : 120) * 60000),
    closes: new Date(eff.getTime() - (f.intl ? 60 : 45) * 60000),
  };
}

// ---------- timeline for detail screen ----------
export function timelineFor(f, runway) {
  const eff = effTime(f);
  const T = (d, mins) => new Date(d.getTime() + mins * 60000);
  const now = Date.now();
  let steps;
  if (f.dir === 'dep') {
    steps = [
      { k: 'Check-in opens', t: T(f.sched, f.intl ? -180 : -120), sub: f.checkIn ? `Counters ${f.checkIn}` : 'Counters not published yet — check airport screens' },
      { k: 'Check-in closes', t: T(eff, f.intl ? -60 : -45), sub: f.intl ? 'International: 60 min before departure' : 'Domestic: 45 min before departure' },
      { k: 'Boarding', t: T(eff, -45), sub: f.gate ? `Gate ${f.gate}` : 'Gate usually announced about an hour before' },
      { k: 'Gate closes', t: T(eff, -15) },
      { k: 'Take-off', t: eff, sub: [runway && `Runway ${runway}`, flightDurationMin(f) && `${fmtDur(flightDurationMin(f))} flight`].filter(Boolean).join(' · ') },
    ];
  } else {
    const dep = f.otherEst || f.otherSched;
    steps = [
      ...(dep ? [{ k: `Departed ${f.other.city}`, t: dep }] : []),
      { k: 'Approach & landing', t: T(eff, -8), sub: runway ? `Runway ${runway}` : '' },
      { k: 'At gate', t: T(eff, 6), sub: f.gate ? `Gate ${f.gate}` : '' },
      { k: 'Bags on belt', t: T(eff, 22), sub: f.belt ? `Belt ${f.belt}` : '' },
    ];
  }
  let currentIdx = -1;
  steps.forEach((s, i) => { if (s.t.getTime() <= now) currentIdx = i; });
  return steps.map((s, i) => ({ ...s, state: f.status === 'cancelled' ? 'off' : i < currentIdx ? 'done' : i === currentIdx ? 'now' : 'next' }));
}

function fmtDur(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${m} min` : `${m} min`;
}

export function flightDurationMin(f) {
  if (f.durMin) return f.durMin;
  if (f.otherSched && f.sched) return Math.abs(Math.round((f.otherSched - f.sched) / 60000));
  if (f.other.lat != null) return Math.round((distKm(HYD, f.other) / 790) * 60 + 25);
  return null;
}
