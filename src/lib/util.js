// Time + geo helpers. All HYD-side times are shown in IST regardless of device timezone.
const fmtCache = {};
function fmt(opts) {
  const k = JSON.stringify(opts);
  return (fmtCache[k] ||= new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', ...opts }));
}

export const hhmm = (d) => (d ? fmt({ hour: '2-digit', minute: '2-digit', hour12: false }).format(d) : '--:--');
export const dayLabel = (d) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' }).formatToParts(d).map((x) => [x.type, x.value]));
  return `${p.weekday} ${p.day} ${p.month}`;
};
export const weekday = (d) => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(d);
export const hourIST = (d) => Number(fmt({ hour: '2-digit', hour12: false }).format(d)) % 24;

// Time at a place with fixed UTC offset in minutes
export function hhmmAtOffset(d, offMin) {
  if (!d) return '--:--';
  const t = new Date(d.getTime() + offMin * 60000);
  return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
}

export function tzLabel(offMin) {
  const map = { 330: 'IST', 240: 'GST', 180: 'AST', 480: 'SGT', 420: 'ICT', 60: 'BST', 120: 'CEST', 0: 'UTC' };
  if (map[offMin]) return map[offMin];
  const h = Math.trunc(offMin / 60), m = Math.abs(offMin % 60);
  return `UTC${h >= 0 ? '+' : ''}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

export function relMinutes(d, now = Date.now()) {
  return Math.round((d.getTime() - now) / 60000);
}

export function humanDur(min) {
  const m = Math.abs(Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

// ---- geo ----
const R = 6371;
const rad = (x) => (x * Math.PI) / 180;
const deg = (x) => (x * 180) / Math.PI;

export function distKm(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function bearing(a, b) {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

export function destPoint(p, brgDeg, km) {
  const d = km / R, b = rad(brgDeg), la = rad(p.lat), lo = rad(p.lon);
  const la2 = Math.asin(Math.sin(la) * Math.cos(d) + Math.cos(la) * Math.sin(d) * Math.cos(b));
  const lo2 = lo + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(la), Math.cos(d) - Math.sin(la) * Math.sin(la2));
  return { lat: deg(la2), lon: deg(lo2) };
}

export const angleDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// deterministic PRNG
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function haptic(ms = 8) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* unsupported */ }
}
