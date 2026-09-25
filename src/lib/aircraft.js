// Live aircraft positions around HYD (ADS-B community feeds, no key) + simulated fallback
import { HYD } from './config.js';
import { AIRPORTS } from './reference.js';
import { bearing, destPoint, distKm, angleDiff, hashStr, seeded } from './util.js';

const RADIUS_NM = 80;

const PROVIDERS = {
  adsblol: { label: 'adsb.lol', url: `https://api.adsb.lol/v2/point/${HYD.lat}/${HYD.lon}/${RADIUS_NM}`, parse: parseReadsb },
  airplaneslive: { label: 'airplanes.live', url: `https://api.airplanes.live/v2/point/${HYD.lat}/${HYD.lon}/${RADIUS_NM}`, parse: parseReadsb },
  opensky: {
    label: 'OpenSky',
    url: `https://opensky-network.org/api/states/all?lamin=${HYD.lat - 1.3}&lomin=${HYD.lon - 1.35}&lamax=${HYD.lat + 1.3}&lomax=${HYD.lon + 1.35}`,
    parse: parseOpenSky,
  },
};

function parseReadsb(j) {
  const ts = j.now ? Number(j.now) : Date.now();
  return (j.ac || j.aircraft || [])
    .filter((a) => a.lat != null && a.lon != null)
    .map((a) => ({
      id: a.hex,
      callsign: (a.flight || '').trim(),
      reg: a.r || '',
      type: a.t || '',
      lat: a.lat, lon: a.lon,
      alt: a.alt_baro === 'ground' ? 0 : a.alt_baro ?? a.alt_geom ?? 0,
      onGround: a.alt_baro === 'ground',
      gs: a.gs ?? 0,
      track: a.track ?? a.true_heading ?? 0,
      vr: a.baro_rate ?? a.geom_rate ?? 0,
      squawk: a.squawk || '',
      ts: ts - (a.seen_pos ?? a.seen ?? 0) * 1000,
    }));
}

function parseOpenSky(j) {
  return (j.states || [])
    .filter((s) => s[5] != null && s[6] != null)
    .map((s) => ({
      id: s[0], callsign: (s[1] || '').trim(), reg: '', type: '',
      lat: s[6], lon: s[5],
      alt: Math.round((s[7] ?? s[13] ?? 0) * 3.28084),
      onGround: !!s[8],
      gs: Math.round((s[9] ?? 0) * 1.94384),
      track: s[10] ?? 0,
      vr: Math.round((s[11] ?? 0) * 196.85),
      squawk: s[14] || '',
      ts: (s[3] || j.time) * 1000,
    }));
}

export async function fetchAircraft(pref, signal) {
  const order = pref && pref !== 'auto' ? [pref] : ['airplaneslive', 'adsblol', 'opensky'];
  let lastErr;
  for (const key of order) {
    const p = PROVIDERS[key];
    if (!p) continue;
    try {
      const res = await fetch(p.url, { signal });
      if (!res.ok) throw new Error(`${p.label} ${res.status}`);
      const list = p.parse(await res.json());
      return { list, source: p.label, key };
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      lastErr = e;
    }
  }
  throw lastErr || new Error('No aircraft feed reachable');
}

// ----- classification + enrichment -----
export function classify(ac, flight) {
  if (ac.onGround || (ac.alt < 2600 && ac.gs < 60 && distKm(HYD, ac) < 6)) return 'gnd';
  if (flight) return flight.dir === 'arr' ? 'arr' : 'dep';
  const d = distKm(HYD, ac);
  const toApt = bearing(ac, HYD);
  const heading = ac.track;
  if (d < 90 && ac.alt < 16000 && ac.vr <= 200 && angleDiff(heading, toApt) < 75) return 'arr';
  if (d < 90 && ac.alt < 20000 && ac.vr >= 200 && angleDiff(heading, toApt) > 100) return 'dep';
  return 'ovf';
}

// dead-reckon a live fix forward so markers glide smoothly between polls
export function project(ac, now = Date.now()) {
  if (ac.sim || ac.onGround || !ac.gs) return ac;
  const dt = Math.min(45, Math.max(0, (now - ac.ts) / 1000));
  const km = (ac.gs * 1.852 * dt) / 3600;
  const p = destPoint(ac, ac.track, km);
  return { ...ac, lat: p.lat, lon: p.lon, alt: Math.max(0, Math.round(ac.alt + (ac.vr * dt) / 60)) };
}

// ----- simulation, driven by the (simulated or live) schedule -----
const FIELD_ELEV = 2024;
const T27L = { lat: 17.229, lon: 78.452 };  // runway 27L threshold (east end)
const T09R = { lat: 17.229, lon: 78.406 };  // runway 09R threshold (west end)

export function simulateAircraft(flights, runwayHdg = 270, now = Date.now()) {
  const out = [];
  const landThr = runwayHdg === 270 ? T27L : T09R;
  const depEnd = runwayHdg === 270 ? T09R : T27L;
  const finalBrg = (runwayHdg + 180) % 360; // where finals come from
  for (const f of flights) {
    if (f.status === 'cancelled') continue;
    const eff = (f.actual || f.est || f.sched).getTime();
    const m = (eff - now) / 60000;
    const other = f.other.lat != null ? f.other : AIRPORTS[f.other.iata];
    if (!other) continue;
    const typeCode = f.aircraft?.code || '';
    const base = { id: 'sim-' + f.id, callsign: f.callsign, reg: f.reg, type: typeCode, sim: true, flightId: f.id, squawk: '' };
    if (f.dir === 'arr' && m > -1.5 && m < 28) {
      const tmin = Math.max(0, m);
      const faf = destPoint(landThr, finalBrg, 22);
      let p, track, alt, gs;
      if (tmin <= 5.5) {
        const d = tmin * 4.0;
        p = destPoint(landThr, finalBrg, d);
        track = runwayHdg; gs = 140 + tmin * 4; alt = FIELD_ELEV + d * 172;
      } else {
        const brgOut = bearing(faf, other);
        const d = (tmin - 5.5) * (6 + Math.min(6, (tmin - 5.5) * 0.35));
        p = destPoint(faf, brgOut, d);
        track = (brgOut + 180) % 360; gs = Math.min(450, 180 + (tmin - 5.5) * 14);
        alt = Math.min(37000, FIELD_ELEV + 3800 + d * 330);
      }
      if (m < 0) { // rolling out
        p = destPoint(landThr, runwayHdg, Math.min(2.8, -m * 2.2));
        track = runwayHdg; gs = 60; alt = FIELD_ELEV;
      }
      out.push({ ...base, ...p, track, alt: Math.round(alt / 25) * 25, gs: Math.round(gs), vr: tmin > 0 ? -800 : 0, onGround: m < 0, cls: m < 0 ? 'gnd' : 'arr', ts: now });
    } else if (f.dir === 'dep' && m < 0.3 && m > -22) {
      const t = Math.max(0, -m);
      const leg1 = Math.min(t, 2.5) * 4.6;
      let p = destPoint(depEnd, runwayHdg, leg1 + 3.5), track = runwayHdg;
      if (t > 2.5) {
        const brgOut = bearing(p, other);
        const turn = Math.min(1, (t - 2.5) / 1.5);
        track = runwayHdg + ((((brgOut - runwayHdg) % 360) + 540) % 360 - 180) * turn;
        p = destPoint(p, brgOut, (t - 2.5) * 7.2);
      }
      const alt = Math.min(24000, FIELD_ELEV + t * 2600);
      out.push({ ...base, ...p, track: (track + 360) % 360, alt: Math.round(alt / 25) * 25, gs: Math.round(Math.min(420, 170 + t * 22)), vr: 2400, onGround: false, cls: 'dep', ts: now });
    }
  }
  // Overflights on high-altitude airways crossing the region
  const AIRWAYS = [
    { from: AIRPORTS.DEL, to: AIRPORTS.BLR, cs: 'AIC503', type: 'A21N', alt: 35000 },
    { from: AIRPORTS.CCU, to: AIRPORTS.BOM, cs: 'IGO5317', type: 'A20N', alt: 37000 },
    { from: AIRPORTS.BOM, to: AIRPORTS.VTZ, cs: 'AKJ1291', type: 'B38M', alt: 33000 },
    { from: AIRPORTS.MAA, to: AIRPORTS.AMD, cs: 'IGO6143', type: 'A20N', alt: 36000 },
    { from: AIRPORTS.SIN, to: AIRPORTS.DXB, cs: 'UAE353', type: 'A388', alt: 39000 },
  ];
  AIRWAYS.forEach((w, i) => {
    const period = 26 * 60000;
    const phase = ((now + i * 9.3 * 60000) % period) / period; // 0..1
    const brg = bearing(w.from, w.to);
    const entry = destPoint(HYD, (brg + 180) % 360, 170 + i * 3);
    const offset = destPoint(entry, (brg + 90) % 360, (i - 2) * 22);
    const p = destPoint(offset, brg, phase * 340);
    const r = seeded(hashStr(w.cs));
    out.push({ id: 'ovf-' + w.cs, callsign: w.cs, reg: '', type: w.type, lat: p.lat, lon: p.lon, track: brg, alt: w.alt, gs: 440 + Math.round(r() * 40), vr: 0, onGround: false, cls: 'ovf', sim: true, ts: now });
  });
  return out;
}
