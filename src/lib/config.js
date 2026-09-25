// Central constants + persisted user settings
export const HYD = {
  iata: 'HYD',
  icao: 'VOHS',
  name: 'Rajiv Gandhi International',
  city: 'Hyderabad',
  lat: 17.2403,
  lon: 78.4294,
  tz: 'Asia/Kolkata',
  // Two parallel runways, headings 09/27
  runways: [
    { id: '09L/27R', a: [17.2452, 78.4115], b: [17.2452, 78.4505] },
    { id: '09R/27L', a: [17.2290, 78.4060], b: [17.2290, 78.4520] },
  ],
};

// Built-in AeroDataBox (RapidAPI) key, used when nothing is entered in Settings.
// A key typed in Settings always takes priority. Note: anything here ships inside
// the app's JavaScript, so anyone who opens the site can read it.
export const BUILT_IN_RAPIDAPI_KEY = '8435f1e5c0msh85f8903b76ff0a7p14f40fjsn48a933c2b6d4';

export const rapidKeyOf = (s) => (s.rapidApiKey || '').trim() || BUILT_IN_RAPIDAPI_KEY;

const KEY = 'hydflights.settings.v1';

export const DEFAULT_SETTINGS = {
  rapidApiKey: '',          // AeroDataBox via RapidAPI — powers arrivals/departures
  airlabsKey: '',           // AirLabs — only fills in gates, terminals and belts
  scheduleRefreshMin: 30,   // schedule poll — AeroDataBox free plan is only ~400 units/month
  aircraftSource: 'auto',   // auto | adsblol | airplaneslive | opensky | sim
  forceDemo: false,         // show simulated data even when a key is set
  followed: null,           // id of the flight the user follows
  haptics: true,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    if (s.scheduleRefreshMin < 15) s.scheduleRefreshMin = 30; // older builds polled far too often for the free plan
    return s;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

export function cacheGet(k, maxAgeMs) {
  try {
    const raw = localStorage.getItem('hydflights.cache.' + k);
    if (!raw) return null;
    const { t, v } = JSON.parse(raw);
    if (maxAgeMs && Date.now() - t > maxAgeMs) return null;
    return v;
  } catch { return null; }
}

export function cacheAge(k) {
  try { const raw = localStorage.getItem('hydflights.cache.' + k); return raw ? Date.now() - JSON.parse(raw).t : Infinity; } catch { return Infinity; }
}

// claude.ai previews block every outside website, so live feeds can never load there
export const IS_PREVIEW = typeof location !== 'undefined' && /claude|anthropic/i.test(location.hostname);

export function cacheSet(k, v) {
  try { localStorage.setItem('hydflights.cache.' + k, JSON.stringify({ t: Date.now(), v })); } catch { /* quota */ }
}
