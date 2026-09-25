// Airport weather: Open-Meteo (free, no key) + optional raw METAR from aviationweather.gov
import { HYD } from './config.js';
import { angleDiff, hourIST } from './util.js';

export function wmo(code, isDay = true) {
  if (code === 0) return { text: isDay ? 'Clear sky' : 'Clear night', icon: isDay ? 'sun' : 'moon' };
  if (code === 1) return { text: 'Mostly clear', icon: isDay ? 'sun' : 'moon' };
  if (code === 2) return { text: 'Partly cloudy', icon: isDay ? 'partly' : 'partly-night' };
  if (code === 3) return { text: 'Overcast', icon: 'cloud' };
  if (code === 45 || code === 48) return { text: 'Fog', icon: 'fog' };
  if (code >= 51 && code <= 57) return { text: 'Drizzle', icon: 'rain' };
  if (code >= 61 && code <= 67) return { text: code >= 65 ? 'Heavy rain' : 'Rain', icon: 'rain' };
  if (code >= 71 && code <= 77) return { text: 'Snow', icon: 'cloud' };
  if (code >= 80 && code <= 82) return { text: 'Showers', icon: 'rain' };
  if (code >= 95) return { text: 'Thunderstorm', icon: 'storm' };
  return { text: 'Cloudy', icon: 'cloud' };
}

export function compass(deg) {
  const dirs = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  return dirs[Math.round(deg / 45) % 8];
}

// Land into the wind: west wind (270) -> runway 27
export function runwayInUse(windDir, windKt) {
  if (windKt == null || windKt < 3) return '27L'; // calm: preferred
  return angleDiff(windDir, 270) <= 90 ? '27L' : '09R';
}

export function crosswind(windDir, windKt, rwyHdg) {
  const a = ((windDir - rwyHdg) * Math.PI) / 180;
  return { cross: Math.abs(Math.round(windKt * Math.sin(a))), head: Math.round(windKt * Math.cos(a)) };
}

function flightCategory(visKm, ceilingFt) {
  if (visKm < 1.6 || (ceilingFt != null && ceilingFt < 500)) return { cat: 'LIFR', label: 'Low visibility', tone: 'red' };
  if (visKm < 5 || (ceilingFt != null && ceilingFt < 1000)) return { cat: 'IFR', label: 'Instrument conditions', tone: 'orange' };
  if (visKm < 8 || (ceilingFt != null && ceilingFt < 3000)) return { cat: 'MVFR', label: 'Fair conditions', tone: 'yellow' };
  return { cat: 'VFR', label: 'Good conditions', tone: 'green' };
}

function buildAlert(hourly) {
  const next = hourly.slice(1, 13);
  const storm = next.find((h) => h.code >= 95);
  if (storm) return { kind: 'storm', title: `Thunderstorms from ${String(storm.hour).padStart(2, '0')}:00`, short: `Thunderstorms likely after ${String(storm.hour).padStart(2, '0')}:00 — expect delays`, body: `Flights after ${String(storm.hour).padStart(2, '0')}:00 may be held or delayed. We'll alert you if a flight you follow is affected.` };
  const heavy = next.find((h) => h.code === 65 || h.code === 82 || (h.pop >= 80 && h.code >= 61));
  if (heavy) return { kind: 'rain', title: `Heavy rain around ${String(heavy.hour).padStart(2, '0')}:00`, short: `Heavy rain around ${String(heavy.hour).padStart(2, '0')}:00 — minor delays possible`, body: 'Ground operations may slow down. Leave a little extra time to reach the airport.' };
  const fog = next.find((h) => h.vis != null && h.vis < 2);
  if (fog) return { kind: 'fog', title: `Low visibility around ${String(fog.hour).padStart(2, '0')}:00`, short: `Low visibility expected around ${String(fog.hour).padStart(2, '0')}:00`, body: 'Arrivals may be spaced out further under low-visibility procedures.' };
  return null;
}

export async function fetchWeather(signal) {
  const url = 'https://api.open-meteo.com/v1/forecast?' + new URLSearchParams({
    latitude: HYD.lat, longitude: HYD.lon, timezone: HYD.tz, wind_speed_unit: 'kn', forecast_days: '6',
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,pressure_msl,cloud_cover,is_day,dew_point_2m',
    hourly: 'temperature_2m,weather_code,precipitation_probability,visibility,wind_speed_10m,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max,uv_index_max',
  });
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Weather unavailable');
  const j = await res.json();
  return shapeWeather(j);
}

export async function fetchMetar(signal) {
  try {
    const res = await fetch(`https://aviationweather.gov/api/data/metar?ids=${HYD.icao}&format=json`, { signal });
    if (!res.ok) return null;
    const j = await res.json();
    return j?.[0]?.rawOb || null;
  } catch { return null; }
}

function shapeWeather(j) {
  const c = j.current;
  const nowIdx = Math.max(0, j.hourly.time.findIndex((t) => t.slice(0, 13) === c.time.slice(0, 13)));
  const hourly = j.hourly.time.slice(nowIdx, nowIdx + 24).map((t, i) => ({
    hour: Number(t.slice(11, 13)),
    temp: Math.round(j.hourly.temperature_2m[nowIdx + i]),
    code: j.hourly.weather_code[nowIdx + i],
    pop: j.hourly.precipitation_probability[nowIdx + i],
    vis: j.hourly.visibility[nowIdx + i] != null ? j.hourly.visibility[nowIdx + i] / 1000 : null,
    isDay: !!j.hourly.is_day[nowIdx + i],
  }));
  const daily = j.daily.time.map((t, i) => ({
    date: new Date(t + 'T12:00:00+05:30'),
    code: j.daily.weather_code[i],
    max: Math.round(j.daily.temperature_2m_max[i]),
    min: Math.round(j.daily.temperature_2m_min[i]),
    pop: j.daily.precipitation_probability_max[i],
    uv: j.daily.uv_index_max?.[i],
    sunrise: j.daily.sunrise[i]?.slice(11, 16),
    sunset: j.daily.sunset[i]?.slice(11, 16),
  }));
  return finish({
    temp: Math.round(c.temperature_2m),
    feels: Math.round(c.apparent_temperature),
    humidity: Math.round(c.relative_humidity_2m),
    dew: Math.round(c.dew_point_2m),
    code: c.weather_code,
    isDay: !!c.is_day,
    windDir: Math.round(c.wind_direction_10m),
    windKt: Math.round(c.wind_speed_10m),
    gustKt: Math.round(c.wind_gusts_10m),
    visKm: c.visibility != null ? Math.min(10, c.visibility / 1000) : 10,
    qnh: Math.round(c.pressure_msl),
    cloud: c.cloud_cover,
    hourly, daily, source: 'live', updated: Date.now(),
  });
}

function finish(w) {
  const d = wmo(w.code, w.isDay);
  const ceilingFt = w.cloud > 60 ? (w.code >= 61 ? 1800 : 3500) : null; // rough estimate, METAR is authoritative
  const rwy = runwayInUse(w.windDir, w.windKt);
  return {
    ...w,
    text: d.text, icon: d.icon, ceilingFt,
    runway: rwy, runwayHdg: rwy.startsWith('27') ? 270 : 90,
    wind: crosswind(w.windDir, w.windKt, rwy.startsWith('27') ? 270 : 90),
    category: flightCategory(w.visKm, ceilingFt),
    alert: buildAlert(w.hourly),
    high: w.daily[0]?.max, low: w.daily[0]?.min,
  };
}

// Plausible Hyderabad late-monsoon conditions for offline/demo use
export function simulatedWeather(now = new Date()) {
  const h0 = hourIST(now);
  const hourly = Array.from({ length: 24 }, (_, i) => {
    const hour = (h0 + i) % 24;
    const temp = Math.round(23 + 7 * Math.sin(((hour - 9) / 24) * 2 * Math.PI));
    const code = hour >= 17 && hour <= 19 ? 95 : hour === 20 ? 61 : hour >= 11 && hour <= 16 ? 2 : hour >= 21 || hour <= 5 ? 3 : 1;
    return { hour, temp, code, pop: code >= 95 ? 70 : code >= 61 ? 55 : 15, vis: code >= 95 ? 4 : 8, isDay: hour >= 6 && hour < 18 };
  });
  const codes = [95, 80, 2, 61, 3, 2];
  const daily = codes.map((code, i) => ({
    date: new Date(now.getTime() + i * 86400000), code, max: 31 - (i % 3), min: 22 + (i % 2),
    pop: code >= 61 ? 60 : 20, uv: 7, sunrise: '06:04', sunset: '18:02',
  }));
  return finish({
    temp: hourly[0].temp, feels: hourly[0].temp + 4, humidity: 70, dew: 22, code: hourly[0].code, isDay: hourly[0].isDay,
    windDir: 270, windKt: 12, gustKt: 18, visKm: 6, qnh: 1007, cloud: 45,
    hourly, daily, source: 'sim', updated: Date.now(),
  });
}

export function reviveWeather(w) {
  if (!w) return w;
  return { ...w, daily: w.daily.map((d) => ({ ...d, date: new Date(d.date) })) };
}
