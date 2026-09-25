import { useEffect, useRef, useState } from 'react';
import { statusOf } from '../lib/flights.js';
import { IS_PREVIEW } from '../lib/config.js';
import { IPlane } from './Icons.jsx';

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

export function AircraftChip({ aircraft, reg }) {
  if (!aircraft) return <span className="ac-chip muted"><IPlane size={14} /> Aircraft TBC</span>;
  const maker = aircraft.maker && aircraft.name.startsWith(aircraft.maker) ? aircraft.maker : '';
  const model = maker ? aircraft.name.slice(maker.length).trim() : aircraft.name;
  return (
    <span className="ac-chip">
      <IPlane size={14} style={{ color: 'var(--orange)', transform: 'rotate(90deg)' }} />
      {maker && <span className="ac-maker">{maker}</span>}
      <b>{model.replace(' Dreamliner', '')}</b>
      {reg && <span className="ac-reg">{reg}</span>}
    </span>
  );
}

// Split-flap digit that flips when its value changes
export function Flap({ ch }) {
  const [prev, setPrev] = useState(ch);
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    if (ch === prev) return;
    setFlip(true);
    const id = setTimeout(() => { setPrev(ch); setFlip(false); }, 420);
    return () => clearTimeout(id);
  }, [ch, prev]);
  const H = (cls, c) => <span className={'half ' + cls}><span className="ch">{c}</span></span>;
  return (
    <span className="flap">
      {H('top', flip ? ch : prev)}
      {H('bottom', prev)}
      {flip && H('top leaf-a', prev)}
      {flip && H('bottom leaf-b', ch)}
      <span className="flap-hinge" />
    </span>
  );
}

export function FlapClock({ text }) {
  return (
    <div className="flap-clock" aria-label={text}>
      {text.split('').map((c, i) => (c === ':' ? <span key={i} className="flap-colon">:</span> : <Flap key={i} ch={c} />))}
    </div>
  );
}

// Scrambles characters briefly before settling — airport board feel
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
export function FlapText({ text, delay = 0, className }) {
  const [shown, setShown] = useState(text);
  const first = useRef(true);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setShown(text); return; }
    let frame = 0, raf, start;
    const total = 14;
    const run = (ts) => {
      start ??= ts;
      if (ts - start < delay) { raf = requestAnimationFrame(run); return; }
      frame++;
      const settled = Math.floor((frame / total) * text.length);
      setShown(text.split('').map((c, i) => (i < settled || c === ' ' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join(''));
      if (frame < total) raf = requestAnimationFrame(run); else setShown(text);
    };
    if (first.current || text !== shown) raf = requestAnimationFrame(run);
    first.current = false;
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return <span className={className}>{shown}</span>;
}

export function Segmented({ value, onChange, options }) {
  const idx = options.findIndex((o) => o.value === value);
  return (
    <div className="segmented" role="tablist" style={{ '--n': options.length, '--i': idx }}>
      <span className="seg-thumb" />
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}

export function SourceTag({ source, error }) {
  const map = { live: ['Live', 'live'], cache: ['Saved data', 'warn'], sim: ['Demo data', 'demo'] };
  const [label, cls] = map[source] || [source, 'live'];
  return <span className={`src-tag ${cls}`} title={error || ''}><i />{label}</span>;
}

export function Skeleton({ h = 90 }) {
  return <div className="skeleton" style={{ height: h }} />;
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
