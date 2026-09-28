import { useState } from 'react';
import { statusOf } from '../lib/flights.js';
import { IS_PREVIEW } from '../lib/config.js';

// Airline logo from public logo CDNs, falling back to a coloured code tile
const LOGO_SOURCES = [
  (c) => `https://pics.avs.io/160/160/${c}.png`,
  (c) => `https://images.kiwi.com/airlines/128/${c}.png`,
];
const logoMiss = new Map(); // iata -> number of sources that failed (shared across badges)

export function AirlineBadge({ airline, size = 40 }) {
  const code = airline.iata;
  const [idx, setIdx] = useState(() => logoMiss.get(code) || 0);
  const [loaded, setLoaded] = useState(false);
  const src = /^[A-Z0-9]{2}$/.test(code || '') && idx < LOGO_SOURCES.length ? LOGO_SOURCES[idx](code) : null;
  const style = { '--al': airline.color, width: size, height: size, fontSize: size * 0.32 };
  if (!src) return <span className="al-badge" style={style} title={airline.name}>{code}</span>;
  return (
    <span className={'al-badge al-logo' + (loaded ? ' is-loaded' : '')} style={style} title={airline.name}>
      <span className="al-fallback">{code}</span>
      <img src={src} alt={airline.name} loading="lazy" decoding="async" draggable="false"
        onLoad={(e) => { if (e.currentTarget.naturalWidth > 8) setLoaded(true); else { logoMiss.set(code, idx + 1); setIdx(idx + 1); } }}
        onError={() => { logoMiss.set(code, idx + 1); setIdx(idx + 1); setLoaded(false); }} />
    </span>
  );
}

export function StatusPill({ flight, small, compact }) {
  const s = statusOf(flight);
  return <span className={`pill tone-${s.tone}${small ? ' pill-sm' : ''}`}>{compact ? s.short : s.label}</span>;
}

export function SourceTag({ source, error }) {
  const map = { live: ['Live', 'live'], cache: ['Saved data', 'warn'], sim: ['Demo data', 'demo'] };
  const [label, cls] = map[source] || [source, 'live'];
  return <span className={`src-tag ${cls}`} title={error || ''}><i />{label}</span>;
}

// Shown only inside claude.ai, where outside data can never load
export function PreviewNotice() {
  if (!IS_PREVIEW) return null;
  return (
    <div className="preview-note" role="note">
      <b>Preview mode — live data can’t load here</b>
      <span>claude.ai blocks this page from contacting outside services, so flights, aircraft, weather and logos all fall back to demo data, even with your keys. Host the <code>dist</code> folder (e.g. Netlify Drop) and open that link for live data.</span>
    </div>
  );
}
