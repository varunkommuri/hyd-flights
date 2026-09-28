// Derived, display-ready data shared by the TV broadcast screen and the phone app:
// board rows, remarks, disruptions, alerts, gate changes, quiet hours and ticker items.
import { useMemo } from 'react';
import { useApp } from './store.jsx';
import { effTime, isDisrupted } from './flights.js';
import { hhmm, hourIST } from './util.js';
import { routeText } from './i18n.js';

// ---------- board remarks ----------
// c: colour key (green | yellow | red | white | grey | orange), pill: filled badge, blink: attention
export function remarkOf(f, now = Date.now()) {
  const late = (f.delayMin ?? 0) >= 15;
  const early = f.est && f.est < f.sched - 5 * 60000;
  switch (f.status) {
    case 'cancelled': return { t: 'CANCELLED', c: 'red', pill: true };
    case 'diverted': return { t: 'DIVERTED', c: 'red', pill: true };
    case 'boarding': return { t: 'BOARDING', c: 'green', blink: true };
    case 'finalcall': return { t: 'FINAL CALL', c: 'orange', blink: true };
    case 'gateclosed': return { t: 'GATE CLOSED', c: 'white' };
    case 'departed': return { t: 'DEPARTED', c: 'grey' };
    case 'gateopen': return { t: 'GATE OPEN', c: 'white' };
    case 'checkin': return late ? { t: 'DELAYED', c: 'yellow', pill: true } : { t: 'CHECK-IN', c: 'white' };
    case 'approaching': return { t: 'LANDING', c: 'green' };
    case 'landed': return { t: 'LANDED', c: 'green' };
    case 'arrived': return { t: 'AT GATE', c: 'white' };
    case 'delayed': return { t: 'DELAYED', c: 'yellow', pill: true };
    case 'enroute':
    default:
      if (late) return { t: 'DELAYED', c: 'yellow', pill: true };
      if (early && f.dir === 'arr' && effTime(f) > now) return { t: 'EARLY', c: 'green' };
      return { t: 'ON TIME', c: 'green' };
  }
}

// Estimated-time colour: later = yellow, earlier = green, same = dim
export function estOf(f) {
  if (f.status === 'cancelled' || f.status === 'diverted') return { t: '—', c: 'dim' };
  const e = effTime(f);
  const diff = (e - f.sched) / 60000;
  return { t: hhmm(e), c: diff >= 5 ? 'late' : diff <= -5 ? 'early' : 'dim' };
}

// ---------- board lists ----------
// Upcoming flights for a board: anything not finished more than 10 min ago
export function boardRows(flights, dir, now = Date.now()) {
  return flights
    .filter((f) => f.dir === dir && effTime(f) >= now - 10 * 60000 && f.sched <= now + 12 * 3600000)
    .sort((a, b) => a.sched - b.sched);
}

export function splitDomIntl(rows) {
  return { dom: rows.filter((f) => !f.intl), intl: rows.filter((f) => f.intl) };
}

// ---------- quiet hours / staleness ----------
export const isQuietHours = (now = new Date()) => { const h = hourIST(now); return h >= 1 && h < 5; };

export function staleness(schedule, now = Date.now()) {
  if (schedule.source === 'sim') return null;
  const age = now - schedule.updated;
  if (schedule.source === 'cache' || age > 30 * 60000) return { since: new Date(schedule.updated) };
  return null;
}

// ---------- gate changes ----------
// Feeds don't say "gate changed", so remember each flight's gate across refreshes (and reloads).
const GATE_KEY = 'hydflights.gates.v1';
let gateMem = null;
function loadGates() {
  if (gateMem) return gateMem;
  try { gateMem = JSON.parse(localStorage.getItem(GATE_KEY) || '{}'); } catch { gateMem = {}; }
  return gateMem;
}
export function trackGateChanges(flights, now = Date.now()) {
  const mem = loadGates();
  const seen = new Set();
  let dirty = false;
  for (const f of flights) {
    if (f.dir !== 'dep' || !f.gate) continue;
    seen.add(f.id);
    const m = mem[f.id];
    if (!m) { mem[f.id] = { gate: f.gate }; dirty = true; }
    else if (m.gate !== f.gate) { mem[f.id] = { gate: f.gate, prev: m.gate, at: now }; dirty = true; }
  }
  for (const id of Object.keys(mem)) if (!seen.has(id) && !flights.some((f) => f.id === id)) { delete mem[id]; dirty = true; }
  if (dirty) { try { localStorage.setItem(GATE_KEY, JSON.stringify(mem)); } catch { /* quota */ } }
  const changes = new Map();
  for (const [id, m] of Object.entries(mem)) if (m.prev && now - m.at < 60 * 60000) changes.set(id, m);
  return changes;
}

// ---------- disruptions ----------
// Flights in the next 3 hours (plus the last 30 min) that are delayed 15+ min, cancelled or diverted
export function disruptions(flights, now = Date.now()) {
  const list = flights.filter((f) => isDisrupted(f) && f.sched >= now - 30 * 60000 && f.sched <= now + 3 * 3600000);
  const rank = (f) => (f.status === 'cancelled' ? 0 : f.status === 'diverted' ? 1 : 2);
  list.sort((a, b) => rank(a) - rank(b) || (b.delayMin ?? 0) - (a.delayMin ?? 0));
  const delayed = list.filter((f) => f.status !== 'cancelled' && f.status !== 'diverted');
  const window = flights.filter((f) => f.sched >= now - 30 * 60000 && f.sched <= now + 3 * 3600000);
  return {
    list,
    delayed: delayed.length,
    cancelled: list.filter((f) => f.status === 'cancelled').length,
    diverted: list.filter((f) => f.status === 'diverted').length,
    avgDelay: delayed.length ? Math.round(delayed.reduce((s, f) => s + (f.delayMin || 0), 0) / delayed.length) : 0,
    domCount: window.filter((f) => !f.intl).length,
    intlCount: window.filter((f) => f.intl).length,
  };
}

// ---------- alerts ----------
// Each alert carries English fields plus a `te` object with the Telugu title/sub.
const route = (f) => routeText(f, 'en');
const routeTe = (f) => routeText(f, 'te');
const contactTe = (f) => `${f.airline.name}ను సంప్రదించండి`;

export function buildAlerts(flights, weather, gateChanges, now = Date.now()) {
  const soon = (f) => f.sched >= now - 30 * 60000 && f.sched <= now + 4 * 3600000;
  const out = [];
  for (const f of flights) {
    if (!soon(f)) continue;
    if (f.status === 'cancelled') {
      out.push({ id: 'x-' + f.id, kind: 'cancelled', rank: 0, tag: 'CANCELLED', title: route(f), flight: f,
        sub: `Was ${hhmm(f.sched)} · contact ${f.airline.name} for rebooking`,
        te: { title: routeTe(f), sub: `నిర్ణీత సమయం ${hhmm(f.sched)} · రీబుకింగ్ కోసం ${contactTe(f)}` } });
    } else if (f.status === 'diverted') {
      out.push({ id: 'v-' + f.id, kind: 'diverted', rank: 1, tag: 'DIVERTED', title: route(f), flight: f,
        sub: `Diverted · check with ${f.airline.name}`,
        te: { title: routeTe(f), sub: `దారి మళ్లించారు · ${contactTe(f)}` } });
    }
  }
  for (const f of flights) {
    const g = gateChanges.get(f.id);
    if (!g || f.status === 'departed' || f.status === 'cancelled') continue;
    out.push({ id: `g-${f.id}-${f.gate}`, kind: 'gate', rank: 2, tag: 'GATE CHANGE', title: route(f), flight: f, gate: f.gate, prevGate: g.prev,
      sub: `Now Gate ${f.gate} (was Gate ${g.prev}) · ${hhmm(effTime(f))}`,
      te: { title: routeTe(f), sub: `ఇప్పుడు గేట్ ${f.gate} (గతంలో గేట్ ${g.prev}) · ${hhmm(effTime(f))}` } });
  }
  const wa = weather?.alert;
  if (wa) {
    out.push({ id: 'w-' + wa.kind + wa.title, kind: 'weather', rank: 3, tag: 'WEATHER', title: wa.title, sub: wa.body.split('. ')[0],
      te: { title: wa.te?.title || wa.title, sub: wa.te?.body || wa.body.split('. ')[0] } });
  }
  const delayed = flights
    .filter((f) => soon(f) && (f.delayMin ?? 0) >= 30 && !['cancelled', 'diverted', 'departed', 'arrived', 'landed'].includes(f.status))
    .sort((a, b) => b.delayMin - a.delayMin).slice(0, 6);
  for (const f of delayed) {
    const where = f.dir === 'dep' ? (f.gate ? ` · Gate ${f.gate}` : '') : (f.belt ? ` · Belt ${f.belt}` : '');
    const whereTe = f.dir === 'dep' ? (f.gate ? ` · గేట్ ${f.gate}` : '') : (f.belt ? ` · బెల్ట్ ${f.belt}` : '');
    out.push({ id: 'd-' + f.id, kind: 'delayed', rank: 4, tag: 'DELAYED', title: route(f), flight: f,
      sub: `Now ${hhmm(effTime(f))} · ${f.delayMin} min late${where}`,
      te: { title: routeTe(f), sub: `ఇప్పుడు ${hhmm(effTime(f))} · ${f.delayMin} నిమిషాలు ఆలస్యం${whereTe}` } });
  }
  return out.sort((a, b) => a.rank - b.rank);
}

// Alert text in the requested language
export const alertText = (a, lang) => (lang === 'te' && a.te ? a.te : a);

// ---------- ticker ----------
export const TIPS = [
  { tag: 'TIP', en: 'Power banks go in cabin bags only', te: 'పవర్ బ్యాంకులు క్యాబిన్ బ్యాగుల్లో మాత్రమే' },
  { tag: 'INFO', en: 'Check-in closes 45 min before domestic and 60 min before international departures', te: 'చెక్-ఇన్ దేశీయ విమానాలకు 45 నిమిషాలు, అంతర్జాతీయ విమానాలకు 60 నిమిషాల ముందు ముగుస్తుంది' },
  { tag: 'TIP', en: 'Baggage belts are shown on the Arrivals board', te: 'సామాను బెల్ట్ నంబర్లు రాక విమానాల బోర్డులో కనిపిస్తాయి' },
  { tag: 'TIP', en: 'Keep laptops and liquids ready for security', te: 'భద్రతా తనిఖీ కోసం ల్యాప్‌టాప్‌లు, ద్రవాలను సిద్ధంగా ఉంచండి' },
  { tag: 'INFO', en: 'Reach the airport 2 h before domestic and 3 h before international flights', te: 'దేశీయ విమానాలకు 2 గంటలు, అంతర్జాతీయ విమానాలకు 3 గంటల ముందు విమానాశ్రయానికి చేరుకోండి' },
];

// Each item: { tag, text, te } — te items are shown with a Telugu tag. English and Telugu alternate.
export function tickerItems(alerts, quiet) {
  const items = [];
  for (const a of alerts.slice(0, 6)) {
    items.push({ tag: a.tag, text: `${a.title} — ${a.sub}` });
    if (a.te) items.push({ tag: a.tag, te: true, text: `${a.te.title} — ${a.te.sub}` });
  }
  if (quiet) items.push({ tag: 'INFO', text: 'Quiet hours — the board fills up again from 05:00' }, { tag: 'INFO', te: true, text: 'నిశ్శబ్ద సమయం — 05:00 నుండి మళ్లీ విమానాలు' });
  for (const tip of TIPS) items.push({ tag: tip.tag, text: tip.en }, { tag: tip.tag, te: true, text: tip.te });
  items.push({ tag: 'INFO', text: 'Times are local (IST) · not for operational use' });
  return items;
}

// ---------- one hook for everything ----------
export function useBroadcastData(now) {
  const { flights, weather, schedule } = useApp();
  const minute = Math.floor(now / 60000);
  return useMemo(() => {
    const t = minute * 60000;
    const gateChanges = trackGateChanges(flights, t);
    const alerts = buildAlerts(flights, weather, gateChanges, t);
    const quiet = isQuietHours(new Date(t));
    return {
      deps: splitDomIntl(boardRows(flights, 'dep', t)),
      arrs: splitDomIntl(boardRows(flights, 'arr', t)),
      dis: disruptions(flights, t),
      alerts, gateChanges, quiet,
      stale: staleness(schedule, t),
      ticker: tickerItems(alerts, quiet),
    };
  }, [flights, weather, schedule, minute]);
}
