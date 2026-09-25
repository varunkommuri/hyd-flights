// AirLabs schedules — used only to fill in gates, terminals and baggage belts
// that AeroDataBox doesn't publish for Hyderabad.
import { HYD } from './config.js';

const FIELDS = 'flight_iata,flight_icao,flight_number,airline_iata,dep_iata,arr_iata,dep_time_utc,arr_time_utc,dep_terminal,dep_gate,arr_terminal,arr_gate,arr_baggage';

async function page(key, side, signal) {
  const url = `https://airlabs.co/api/v9/schedules?${side}_iata=${HYD.iata}&_fields=${FIELDS}&limit=50&api_key=${encodeURIComponent(key)}`;
  let j = await (await fetch(url, { signal })).json().catch(() => ({ error: { message: 'unexpected response' } }));
  // Free plan: if asking for specific fields is refused, fall back to whatever the plan returns by default
  if (j.error) j = await (await fetch(url.replace(/&_fields=[^&]*/, ''), { signal })).json().catch(() => ({ error: { message: 'unexpected response' } }));
  if (j.error) throw new Error(`AirLabs: ${j.error.message || j.error.code || 'request refused'}`);
  return Array.isArray(j.response) ? j.response : [];
}

export async function fetchAirlabsGates(key, signal) {
  const [deps, arrs] = await Promise.all([page(key, 'dep', signal), page(key, 'arr', signal)]);
  const t = (s) => (s ? new Date(s.replace(' ', 'T') + 'Z').getTime() : null);
  const rows = [];
  for (const r of deps) rows.push({ dir: 'dep', num: norm(r.flight_iata), t: t(r.dep_time_utc), terminal: r.dep_terminal, gate: r.dep_gate });
  for (const r of arrs) rows.push({ dir: 'arr', num: norm(r.flight_iata), t: t(r.arr_time_utc), terminal: r.arr_terminal, gate: r.arr_gate, belt: r.arr_baggage });
  return rows.filter((r) => r.num);
}

const norm = (n) => (n || '').toUpperCase().replace(/\s+/g, '').replace(/^([A-Z0-9]{2})0+(\d)/, '$1$2');

// Fill empty gate/terminal/belt fields on our flights from AirLabs rows (never overwrite feed values)
export function mergeGates(flights, rows) {
  if (!rows?.length) return flights;
  const idx = new Map();
  for (const r of rows) {
    const k = r.dir + ':' + r.num;
    if (!idx.has(k)) idx.set(k, []);
    idx.get(k).push(r);
  }
  return flights.map((f) => {
    const cands = idx.get(f.dir + ':' + norm(f.number));
    if (!cands) return f;
    // same flight number can repeat across days: take the closest scheduled time (within 3 h)
    let best = null, bestD = 3 * 3600000;
    for (const c of cands) {
      const d = c.t == null ? 0 : Math.abs(c.t - f.sched.getTime());
      if (d <= bestD) { best = c; bestD = d; }
    }
    if (!best) return f;
    const s = (v) => (v == null || v === '' ? '' : String(v));
    const gate = f.gate || s(best.gate), belt = f.belt || s(best.belt), terminal = f.terminal || s(best.terminal);
    if (gate === f.gate && belt === f.belt && terminal === f.terminal) return f;
    return { ...f, gate, belt, terminal, gateSrc: 'airlabs' };
  });
}
