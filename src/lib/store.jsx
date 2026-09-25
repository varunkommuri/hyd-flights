import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadSettings, saveSettings, cacheGet, cacheSet, cacheAge, rapidKeyOf } from './config.js';
import { fetchLiveSchedule, simulateSchedule, reviveFlights, statusOf } from './flights.js';
import { fetchWeather, fetchMetar, simulatedWeather, reviveWeather } from './weather.js';
import { fetchAircraft, simulateAircraft, classify } from './aircraft.js';
import { callsignToFlight } from './reference.js';
import { fetchAirlabsGates, mergeGates } from './airlabs.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

// Re-render every `ms` — used locally by clocks/maps so the whole tree doesn't tick
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function useVisible() {
  const [v, setV] = useState(typeof document === 'undefined' ? true : !document.hidden);
  useEffect(() => {
    const on = () => setV(!document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return v;
}

export function AppProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings);
  const visible = useVisible();
  const [tick, setTick] = useState(0); // 20 s heartbeat to advance simulated statuses
  const [toast, setToast] = useState(null);

  const [schedule, setSchedule] = useState(() => ({ flights: simulateSchedule(), source: 'sim', updated: Date.now(), error: null, loading: false }));
  const [weather, setWeather] = useState(() => reviveWeather(cacheGet('weather', 3 * 3600000)) || simulatedWeather());
  const [metar, setMetar] = useState(null);
  const [air, setAir] = useState({ list: [], source: 'sim', updated: Date.now(), error: null });

  const update = useCallback((patch) => {
    setSettings((s) => { const n = { ...s, ...patch }; saveSettings(n); return n; });
  }, []);

  const notify = useCallback((msg, tone = 'info') => {
    setToast({ msg, tone, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 20000);
    return () => clearInterval(id);
  }, []);

  const rapidKey = rapidKeyOf(settings);
  const liveSchedule = !!rapidKey && !settings.forceDemo;

  // ---- schedule ----
  const loadSchedule = useCallback(async (manual = false) => {
    if (!liveSchedule) {
      setSchedule({ flights: simulateSchedule(), source: 'sim', updated: Date.now(), error: null, loading: false });
      return;
    }
    // Save quota: reuse a recent live copy instead of calling the API on every open/tick
    const age = cacheAge('schedule');
    if (manual && age < 2 * 60000) { notify('Flights are already up to date'); return; } // protects the free-plan quota
    if (!manual && age < settings.scheduleRefreshMin * 60000) {
      setSchedule((s) => (s.source === 'live' && s.updated === Date.now() - age ? s : {
        flights: reviveFlights(cacheGet('schedule')), source: 'live', updated: Date.now() - age, error: null, loading: false,
      }));
      return;
    }
    setSchedule((s) => ({ ...s, loading: true }));
    try {
      const flights = await fetchLiveSchedule(rapidKey);
      cacheSet('schedule', flights);
      setSchedule({ flights, source: 'live', updated: Date.now(), error: null, loading: false });
      if (manual) notify('Flights updated');
    } catch (e) {
      const cached = cacheGet('schedule', 6 * 3600000);
      setSchedule({
        flights: cached ? reviveFlights(cached) : simulateSchedule(),
        source: cached ? 'cache' : 'sim', updated: Date.now(), error: e.message, loading: false,
      });
      if (manual) notify(e.message, 'warn');
    }
  }, [liveSchedule, rapidKey, settings.scheduleRefreshMin, notify]);

  useEffect(() => {
    if (!visible) return;
    loadSchedule();
    const id = setInterval(loadSchedule, liveSchedule ? 60000 : 30000); // live: checks cache age each minute
    return () => clearInterval(id);
  }, [visible, loadSchedule, liveSchedule, settings.scheduleRefreshMin]);

  // ---- weather ----
  const loadWeather = useCallback(async () => {
    try {
      const w = await fetchWeather();
      cacheSet('weather', w);
      setWeather(w);
    } catch {
      setWeather((w) => (w?.source === 'live' ? w : simulatedWeather()));
    }
    fetchMetar().then((m) => m && setMetar(m));
  }, []);
  useEffect(() => {
    if (!visible) return;
    loadWeather();
    const id = setInterval(loadWeather, 10 * 60000);
    return () => clearInterval(id);
  }, [visible, loadWeather]);

  // ---- aircraft ----
  const airFail = useRef(0);
  useEffect(() => {
    if (!visible || settings.aircraftSource === 'sim') { setAir((a) => ({ ...a, source: 'sim', list: [] })); return; }
    let alive = true, timer;
    const ctl = new AbortController();
    const poll = async () => {
      try {
        const r = await fetchAircraft(settings.aircraftSource, ctl.signal);
        if (!alive) return;
        airFail.current = 0;
        setAir({ list: r.list, source: r.source, key: r.key, updated: Date.now(), error: null });
        timer = setTimeout(poll, r.key === 'opensky' ? 15000 : 8000);
      } catch (e) {
        if (!alive || e.name === 'AbortError') return;
        airFail.current++;
        setAir((a) => ({ ...a, source: 'sim', list: [], error: e.message }));
        // back off; keep trying occasionally in case the network comes back
        timer = setTimeout(poll, Math.min(120000, 15000 * airFail.current));
      }
    };
    poll();
    return () => { alive = false; ctl.abort(); clearTimeout(timer); };
  }, [visible, settings.aircraftSource]);

  // ---- derived ----
  // ---- gates/belts from AirLabs (optional second source) ----
  const [gates, setGates] = useState(() => ({ rows: cacheGet('airlabs', 6 * 3600000) || [], error: null, updated: null }));
  const airlabsKey = (settings.airlabsKey || '').trim();
  const loadGates = useCallback(async (force = false) => {
    if (!airlabsKey || schedule.source === 'sim') return;
    if (!force && cacheAge('airlabs') < settings.scheduleRefreshMin * 60000) return;
    try {
      const rows = await fetchAirlabsGates(airlabsKey);
      cacheSet('airlabs', rows);
      setGates({ rows, error: null, updated: Date.now() });
    } catch (e) {
      setGates((g) => ({ ...g, error: /fetch|network|load/i.test(e.message) ? 'Couldn’t reach AirLabs' : e.message }));
    }
  }, [airlabsKey, schedule.source, settings.scheduleRefreshMin]);
  useEffect(() => {
    if (!visible || !airlabsKey) return;
    loadGates();
    const id = setInterval(() => loadGates(), 60000);
    return () => clearInterval(id);
  }, [visible, airlabsKey, loadGates]);

  const flights = useMemo(() => (airlabsKey && schedule.source !== 'sim' ? mergeGates(schedule.flights, gates.rows) : schedule.flights), [schedule.flights, schedule.source, gates.rows, airlabsKey]);
  // Which optional fields the current feed actually provides — screens hide what's never there
  const has = useMemo(() => (schedule.source === 'sim' ? { gate: true, belt: true, checkIn: true }
    : { gate: flights.some((f) => f.gate), belt: flights.some((f) => f.belt), checkIn: flights.some((f) => f.checkIn) }), [flights, schedule.source]);
  const byId = useMemo(() => new Map(flights.map((f) => [f.id, f])), [flights]);
  const byNumber = useMemo(() => {
    const m = new Map();
    const now = Date.now();
    // prefer the leg closest to now for repeated numbers
    for (const f of flights) {
      const cur = m.get(f.number);
      if (!cur || Math.abs(f.sched - now) < Math.abs(cur.sched - now)) m.set(f.number, f);
    }
    return m;
  }, [flights]);

  // Positions: live list enriched, or simulated from the schedule (recomputed by the map every second)
  const aircraftAt = useCallback((now = Date.now()) => {
    if (air.source !== 'sim' && air.list.length) {
      return air.list.map((a) => {
        const num = callsignToFlight(a.callsign);
        const f = num ? byNumber.get(num) : null;
        return { ...a, flightId: f?.id || null, number: num, cls: classify(a, f) };
      });
    }
    return simulateAircraft(flights, weather?.runwayHdg || 270, now).map((a) => ({ ...a, number: byId.get(a.flightId)?.number || callsignToFlight(a.callsign) }));
  }, [air, flights, byNumber, byId, weather?.runwayHdg]);

  // ---- follow a flight + status-change alerts ----
  const followed = settings.followed ? byId.get(settings.followed) : null;
  const lastStatus = useRef(null);
  useEffect(() => {
    if (!followed) { lastStatus.current = null; return; }
    const s = statusOf(followed).label + '|' + followed.gate;
    if (lastStatus.current && lastStatus.current !== s) {
      const msg = `${followed.number}: ${statusOf(followed).label}${followed.gate ? ' · Gate ' + followed.gate : ''}`;
      notify(msg);
      try {
        if ('Notification' in window && Notification.permission === 'granted') new Notification('HYD Flights', { body: msg, icon: 'icons/icon-192.png' });
      } catch { /* ignore */ }
    }
    lastStatus.current = s;
  }, [followed, notify]);

  const toggleFollow = useCallback((f) => {
    if (settings.followed === f.id) { update({ followed: null }); notify('Stopped following ' + f.number); return; }
    update({ followed: f.id });
    notify(`Following ${f.number} — we'll flag any changes`);
    try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission(); } catch { /* ignore */ }
  }, [settings.followed, update, notify]);

  const value = {
    settings, update, tick, toast, notify,
    schedule, flights, byId, loadSchedule, gates, loadGates, has,
    // Pull-to-refresh: flights (quota-guarded), weather, gates
    refreshAll: async () => {
      await Promise.allSettled([loadSchedule(true), loadWeather(), airlabsKey ? loadGates(true) : null]);
    },
    applyGates: (rows) => { cacheSet('airlabs', rows); setGates({ rows, error: null, updated: Date.now() }); },
    weather, metar, loadWeather,
    air, aircraftAt,
    followed, toggleFollow,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
