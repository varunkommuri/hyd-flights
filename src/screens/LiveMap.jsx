import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp, useNow } from '../lib/store.jsx';
import { go } from '../lib/nav.js';
import { HYD } from '../lib/config.js';
import { project as deadReckon } from '../lib/aircraft.js';
import { resolveAircraft, airlineInfo, callsignToFlight } from '../lib/reference.js';
import { effTime } from '../lib/flights.js';
import { hhmm, distKm, clamp, haptic } from '../lib/util.js';
import { ISearch, ILayers, IPlus, IMinus, ILocate, IChevron, IX } from '../components/Icons.jsx';
import { PlaneGlyph } from '../components/Icons.jsx';
import { AirlineBadge, SourceTag } from '../components/UI.jsx';

// ---------- Web-Mercator helpers ----------
const TILE = 256;
const worldSize = (z) => TILE * 2 ** z;
function toWorld(lat, lon, z) {
  const s = Math.sin((clamp(lat, -85, 85) * Math.PI) / 180);
  const W = worldSize(z);
  return { x: ((lon + 180) / 360) * W, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * W };
}
function fromWorld(x, y, z) {
  const W = worldSize(z);
  const lon = (x / W) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / W;
  return { lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), lon };
}

const LANDMARKS = [
  { n: 'HITEC City', lat: 17.4474, lon: 78.3762 }, { n: 'Gachibowli', lat: 17.418, lon: 78.335 },
  { n: 'Secunderabad', lat: 17.4399, lon: 78.4983 }, { n: 'Hyderabad', lat: 17.37, lon: 78.6, big: true },
  { n: 'Charminar', lat: 17.3616, lon: 78.4747 }, { n: 'Shamshabad', lat: 17.2604, lon: 78.3969 },
];
const RINGS = [10, 25, 50, 75, 100, 150];
const CLS = { arr: { c: '#7CB6FF', l: 'Arriving' }, dep: { c: '#F6A04D', l: 'Departing' }, ovf: { c: '#D6DDF2', l: 'Overflying' }, gnd: { c: '#8C97B8', l: 'On ground' } };

export default function LiveMap({ query }) {
  const { aircraftAt, air, byId, weather } = useApp();
  const now = useNow(1000);
  const wrap = useRef(null);
  const [size, setSize] = useState({ w: 390, h: 800 });
  const [view, setView] = useState({ lat: HYD.lat + 0.05, lon: HYD.lon, z: 9.4 });
  const viewRef = useRef(view); viewRef.current = view;
  const [zooming, setZooming] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sel, setSel] = useState(null);
  const [filters, setFilters] = useState({ arr: true, dep: true, ovf: true });
  const [layers, setLayers] = useState({ open: false, labels: true, trails: true, style: 'dark' });
  const [q, setQ] = useState('');
  const history = useRef(new Map());

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ----- aircraft for this frame -----
  const aircraft = useMemo(() => aircraftAt(now).map((a) => deadReckon(a, now)), [aircraftAt, now]);
  // trails: live -> sampled history; simulated -> evaluate the model in the past
  const trails = useMemo(() => {
    const out = new Map();
    if (!layers.trails) return out;
    if (air.source === 'sim' || !air.list.length) {
      const past = [45, 90, 135, 180, 240].map((s) => aircraftAt(now - s * 1000));
      for (const a of aircraft) out.set(a.id, [a, ...past.map((l) => l.find((p) => p.id === a.id)).filter(Boolean)]);
    } else {
      for (const a of aircraft) {
        const h = history.current.get(a.id) || [];
        const last = h[h.length - 1];
        if (!last || distKm(last, a) > 0.6) { h.push({ lat: a.lat, lon: a.lon }); if (h.length > 14) h.shift(); history.current.set(a.id, h); }
        out.set(a.id, [a, ...h.slice().reverse()]);
      }
    }
    return out;
  }, [aircraft, layers.trails, air, aircraftAt, now]);

  const moveTo = useCallback((lat, lon, z) => {
    setView((v) => ({ lat, lon, z: z ?? v.z }));
  }, []);

  // focus a flight from the detail screen
  const focusDone = useRef(false);
  useEffect(() => {
    if (focusDone.current || !query.focus) return;
    const a = aircraft.find((x) => x.flightId === query.focus);
    if (a) { focusDone.current = true; setSel(a.id); moveTo(a.lat - 0.02, a.lon, Math.max(viewRef.current.z, 10.5)); }
  }, [aircraft, query.focus, moveTo]);

  // ----- projection for current view -----
  const center = toWorld(view.lat, view.lon, view.z);
  const toScreen = useCallback((lat, lon) => {
    const p = toWorld(lat, lon, view.z);
    return { x: p.x - center.x + size.w / 2, y: p.y - center.y + size.h / 2 };
  }, [view.z, center.x, center.y, size.w, size.h]);

  // ----- gestures -----
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const zoomTimer = useRef(null);

  const setZoomAbout = useCallback((newZ, sx, sy) => {
    const v = viewRef.current;
    newZ = clamp(newZ, 6, 15);
    const el = wrap.current.getBoundingClientRect();
    const px = sx ?? el.width / 2, py = sy ?? el.height / 2;
    const c = toWorld(v.lat, v.lon, v.z);
    const anchor = fromWorld(c.x + px - el.width / 2, c.y + py - el.height / 2, v.z);
    const a2 = toWorld(anchor.lat, anchor.lon, newZ);
    const nc = fromWorld(a2.x - (px - el.width / 2), a2.y - (py - el.height / 2), newZ);
    setZooming(true);
    clearTimeout(zoomTimer.current);
    zoomTimer.current = setTimeout(() => setZooming(false), 250);
    setView({ lat: nc.lat, lon: nc.lon, z: newZ });
  }, []);

  const onDown = (e) => {
    if (e.target.closest('.no-drag')) return;
    if (!e.target.closest('.ac-marker')) wrap.current.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current = { moved: 0, pinchD: null, z0: viewRef.current.z };
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.pinchD = Math.hypot(a.x - b.x, a.y - b.y);
    }
    setDragging(true);
  };
  const onMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (pointers.current.size === 1) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      g.moved += Math.abs(dx) + Math.abs(dy);
      const v = viewRef.current;
      const c = toWorld(v.lat, v.lon, v.z);
      const n = fromWorld(c.x - dx, c.y - dy, v.z);
      setView({ ...v, lat: n.lat, lon: n.lon });
    } else if (pointers.current.size === 2 && g.pinchD) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const r = wrap.current.getBoundingClientRect();
      g.moved += 10;
      setZoomAbout(g.z0 + Math.log2(d / g.pinchD), (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
    }
  };
  const onUp = (e) => {
    const g = gesture.current;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      setDragging(false);
      if (g && g.moved < 6 && !e.target.closest('.ac-marker') && !e.target.closest('.no-drag')) setSel(null);
    }
  };
  const onWheel = (e) => {
    const r = wrap.current.getBoundingClientRect();
    setZoomAbout(viewRef.current.z - e.deltaY * 0.0022, e.clientX - r.left, e.clientY - r.top);
  };
  const lastTap = useRef(0);
  const onDblTap = (e) => {
    const t = Date.now();
    if (t - lastTap.current < 280 && !e.target.closest('.ac-marker, .no-drag')) {
      const r = wrap.current.getBoundingClientRect();
      setZoomAbout(viewRef.current.z + 1, e.clientX - r.left, e.clientY - r.top);
    }
    lastTap.current = t;
  };


  // ----- visible aircraft -----
  const needle = q.trim().toLowerCase();
  const visible = aircraft.filter((a) => (a.cls === 'gnd' || filters[a.cls]) && (!needle || [a.callsign, a.number, a.type, a.reg, resolveAircraft(a.type)?.name, byId.get(a.flightId)?.airline.name, byId.get(a.flightId)?.other.city]
    .filter(Boolean).some((s) => s.toLowerCase().includes(needle))));
  const counts = aircraft.reduce((m, a) => ({ ...m, [a.cls]: (m[a.cls] || 0) + 1 }), {});
  const selected = aircraft.find((a) => a.id === sel);

  const pick = (a) => { haptic(); setSel(a.id); };
  const recenter = () => { haptic(); setZooming(true); setTimeout(() => setZooming(false), 250); moveTo(HYD.lat + 0.05, HYD.lon, 9.4); };
  const zoomBy = (d) => { haptic(); setZoomAbout(view.z + d); };
  const px = (km) => (km * 1000) / ((40075016 * Math.cos((view.lat * Math.PI) / 180)) / worldSize(view.z)); // km -> px

  const apt = toScreen(HYD.lat, HYD.lon);

  const renderTrails = (project) => layers.trails && visible.map((a) => {
    const t = trails.get(a.id);
    if (!t || t.length < 2 || a.cls === 'gnd') return null;
    const pts = t.map((p) => { const s = project(p.lat, p.lon); return `${s.x.toFixed(1)},${s.y.toFixed(1)}`; }).join(' ');
    return <polyline key={a.id} points={pts} className={'trail ' + a.cls} />;
  });
  const renderMarkers = (project, cull) => visible.map((a) => {
    const s = project(a.lat, a.lon);
    if (cull && (s.x < -60 || s.y < -60 || s.x > size.w + 60 || s.y > size.h + 60)) return null;
    const body = resolveAircraft(a.type)?.body || 'narrow';
    const color = CLS[a.cls].c;
    const label = a.number || a.callsign || a.reg || a.type;
    return (
      <button key={a.id} className={`ac-marker ${a.cls}${a.id === sel ? ' sel' : ''}`} style={{ transform: `translate(${s.x}px, ${s.y}px)` }}
        onClick={(e) => { e.stopPropagation(); pick(a); }} aria-label={`${label}, ${CLS[a.cls].l}`}>
        {a.id === sel && <span className="sel-ring" />}
        <span className="glyph" style={{ transform: `translate(-50%,-50%) rotate(${a.track}deg)` }}>
          <PlaneGlyph size={a.cls === 'gnd' ? 16 : body === 'wide' || body === 'jumbo' ? 30 : 25} color={a.id === sel ? '#fff' : color} body={body} />
        </span>
        {layers.labels && a.cls !== 'gnd' && label && <span className="ac-label mono">{label}</span>}
      </button>
    );
  });

  return (
    <div className="page map-page">
      <div ref={wrap} className={`map radar${dragging ? ' dragging' : ''}${zooming ? ' zooming' : ''}`}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel} onClick={onDblTap}>
        {/* rotating sweep centred on the airport */}
        <div className="radar-sweep" style={{ left: apt.x, top: apt.y, width: px(RINGS[RINGS.length - 1]) * 2, height: px(RINGS[RINGS.length - 1]) * 2 }} />

        <svg className="overlay" width={size.w} height={size.h}>
          {/* range rings + bearing spokes */}
          <g className="scope">
            {Array.from({ length: 12 }, (_, k) => {
              const ang = (k * 30 * Math.PI) / 180, R = px(RINGS[RINGS.length - 1]);
              return <line key={k} x1={apt.x} y1={apt.y} x2={apt.x + Math.sin(ang) * R} y2={apt.y - Math.cos(ang) * R} className={'spoke' + (k % 3 === 0 ? ' major' : '')} />;
            })}
            {RINGS.map((km) => <circle key={km} cx={apt.x} cy={apt.y} r={px(km)} className={'ring' + (km % 50 === 0 ? ' major' : '')} />)}
            {RINGS.map((km) => { const r = px(km); return r > 26 && <text key={'t' + km} x={apt.x - r * 0.707 - 4} y={apt.y + r * 0.707 + 14} className="ring-lbl" textAnchor="end">{km} km</text>; })}
            {['N', 'E', 'S', 'W'].map((t, k) => {
              const ang = (k * 90 * Math.PI) / 180, R = px(RINGS[RINGS.length - 1]) + 14;
              return <text key={t} x={apt.x + Math.sin(ang) * R} y={apt.y - Math.cos(ang) * R + 5} className="cardinal">{t}</text>;
            })}
          </g>
          {/* runways */}
          {HYD.runways.map((r) => {
            const a = toScreen(...r.a), b = toScreen(...r.b);
            return <line key={r.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="rwy" strokeWidth={Math.max(3, px(0.06))} />;
          })}
          {/* approach centreline for the active runway */}
          {weather && (() => {
            const hdg = weather.runwayHdg;
            const thr = hdg === 270 ? HYD.runways[1].b : HYD.runways[1].a;
            const s = toScreen(...thr);
            const dir = hdg === 270 ? 1 : -1;
            const e = toScreen(thr[0], thr[1] + dir * 0.19);
            return <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} className="centreline" />;
          })()}
          {renderTrails(toScreen)}
          {layers.labels && LANDMARKS.filter((l) => view.z >= 9.6 || l.big).map((l) => { const c = toScreen(l.lat, l.lon); return <text key={l.n} x={c.x} y={c.y} className={'place' + (l.big ? ' big' : '')}>{l.n}</text>; })}
        </svg>

        {view.z >= 9.3 && <div className="apt-label" style={{ transform: `translate(${apt.x}px, ${apt.y + px(2.2)}px)` }}>Rajiv Gandhi Intl Airport</div>}

        <div className="markers">{renderMarkers(toScreen, true)}</div>

        <div className="attrib no-drag">Radar view · distances from HYD</div>
      </div>

      {/* top controls */}
      <div className="map-top no-drag">
        <div className="map-search-row">
          <label className="search glass-strong">
            <ISearch size={20} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search flight, airline or aircraft"
              onKeyDown={(e) => { if (e.key === 'Enter' && visible[0]) { pick(visible[0]); const v = visible[0]; moveTo(v.lat - 0.02, v.lon); e.target.blur(); } }} />
            {q && <button onClick={() => setQ('')} aria-label="Clear"><IX size={18} /></button>}
          </label>
          <button className={'round-btn glass-strong' + (layers.open ? ' active' : '')} onClick={() => setLayers((l) => ({ ...l, open: !l.open }))} aria-label="Map layers"><ILayers /></button>
        </div>
        <div className="chips map-chips">
          {['arr', 'dep', 'ovf'].map((k) => (
            <button key={k} className={'chip glass-strong' + (filters[k] ? ' on-soft' : ' off')} onClick={() => { haptic(); setFilters((f) => ({ ...f, [k]: !f[k] })); }}>
              <i className="dot" style={{ background: CLS[k].c }} />{CLS[k].l}<span className="cnt">{counts[k] || 0}</span>
            </button>
          ))}
        </div>
        {layers.open && (
          <div className="layers-pop glass-strong">
            <Toggle label="Flight labels" on={layers.labels} set={(v) => setLayers((l) => ({ ...l, labels: v }))} />
            <Toggle label="Flight trails" on={layers.trails} set={(v) => setLayers((l) => ({ ...l, trails: v }))} />
            <div className="src-line"><SourceTag source={air.source === 'sim' ? 'sim' : 'live'} /> <span>{air.source === 'sim' ? 'Simulated positions' : `ADS-B via ${air.source}`}</span></div>
          </div>
        )}
      </div>

      <div className="map-ctrls no-drag">
        <button className="round-btn glass-strong" onClick={() => zoomBy(1)} aria-label="Zoom in"><IPlus /></button>
        <button className="round-btn glass-strong" onClick={() => zoomBy(-1)} aria-label="Zoom out"><IMinus /></button>
        <button className="round-btn glass-strong locate" onClick={recenter} aria-label="Centre on airport"><ILocate /></button>
      </div>

      {selected ? <AircraftSheet a={selected} onClose={() => setSel(null)} /> : (
        <div className="map-hint no-drag glass-strong">
          <SourceTag source={air.source === 'sim' ? 'sim' : 'live'} />
          <span>{visible.filter((a) => a.cls !== 'gnd').length} aircraft · tap a plane for details</span>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, on, set }) {
  return (
    <button className="toggle-row" onClick={() => set(!on)} role="switch" aria-checked={on}>
      <span>{label}</span><span className={'switch' + (on ? ' on' : '')}><i /></span>
    </button>
  );
}

function AircraftSheet({ a, onClose }) {
  const { byId } = useApp();
  const f = a.flightId ? byId.get(a.flightId) : null;
  const type = resolveAircraft(a.type) || f?.aircraft;
  const code = f?.airline.iata || (a.number || callsignToFlight(a.callsign) || '').split(' ')[0];
  const airline = f?.airline || (code ? airlineInfo(code) : null);
  const phase = a.onGround ? 'On ground' : a.vr < -300 ? 'Descending' : a.vr > 300 ? 'Climbing' : 'Cruising';
  const d = distKm(HYD, a);
  let route, third, pct;
  if (f) {
    route = f.dir === 'arr' ? `${f.other.city} → Hyderabad` : `Hyderabad → ${f.other.city}`;
    if (f.dir === 'arr') {
      third = a.onGround ? { l: 'Landed', v: hhmm(effTime(f)) } : { l: 'Lands', v: hhmm(new Date(Date.now() + (a.gs > 40 ? (d / (a.gs * 1.852)) * 3600000 : 0))) };
      pct = 1 - Math.min(1, d / Math.max(d, distKm(HYD, f.other)));
    } else {
      third = { l: 'Departed', v: hhmm(effTime(f)) };
      pct = Math.min(1, d / Math.max(d, distKm(HYD, f.other)));
    }
  } else {
    route = a.cls === 'ovf' ? 'Passing over Hyderabad' : a.cls === 'arr' ? 'Inbound to Hyderabad' : a.cls === 'dep' ? 'Outbound from Hyderabad' : 'At Hyderabad';
    third = { l: 'From HYD', v: `${Math.round(d)} km` };
    pct = null;
  }
  return (
    <div className="sheet glass-strong no-drag" role="dialog" aria-label="Aircraft details">
      <span className="grabber" />
      <button className="sheet-x" onClick={onClose} aria-label="Close"><IX size={18} /></button>
      <div className="sheet-head">
        {airline ? <AirlineBadge airline={airline} size={50} /> : <span className="al-badge" style={{ '--al': '#44507a', width: 50, height: 50 }}>✈</span>}
        <div className="sh-main">
          <div className="sh-al">{airline?.name || 'Aircraft'} <span className="mono dim">{a.number || a.callsign || a.reg}</span></div>
          <div className="sh-route">{route}</div>
          <div className="sh-type">{type ? <><span className="dim">{type.maker}</span> <b>{type.name.replace(type.maker, '').replace(' Dreamliner', '').trim()}</b></> : <span className="dim">Type unknown</span>}
            <span className={'phase ' + a.cls}>{phase}</span></div>
        </div>
        {f && <button className="go-btn" onClick={() => go('/flight/' + f.id)} aria-label="Open flight"><IChevron size={20} sw={2.4} /></button>}
      </div>
      <div className="sh-stats">
        <div><label>Altitude</label><b className="mono">{a.onGround ? 'Ground' : `${a.alt.toLocaleString('en-IN')} ft`}</b></div>
        <div><label>Speed</label><b className="mono">{Math.round(a.gs)} kt</b></div>
        <div><label>{third.l}</label><b className="mono">{third.v}</b></div>
      </div>
      {pct != null && <div className={'progress ' + (f?.dir === 'arr' ? 'arr' : a.cls)}><span style={{ width: `${Math.max(4, pct * 100)}%` }} /></div>}
      {a.reg && <div className="sh-foot subtle mono">{a.reg}{a.type ? ' · ' + a.type : ''}{a.squawk ? ' · SQK ' + a.squawk : ''}</div>}
    </div>
  );
}
