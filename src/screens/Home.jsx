import { useMemo } from 'react';
import { useApp, useNow } from '../lib/store.jsx';
import { go } from '../lib/nav.js';
import { HYD } from '../lib/config.js';
import { effTime, isDone, isEarlier, isDisrupted, statusOf } from '../lib/flights.js';
import { hhmm, dayLabel, distKm, bearing } from '../lib/util.js';
import { ISearch, IGear, IChevron, IBolt, ITakeoff, ILanding } from '../components/Icons.jsx';
import { AirlineBadge, AircraftChip, FlapClock, StatusPill, SourceTag, PreviewNotice } from '../components/UI.jsx';
import WeatherIcon from '../components/WeatherIcon.jsx';

export default function Home() {
  const { flights, weather, schedule, aircraftAt, air } = useApp();
  const now = useNow(1000);
  const nowMin = Math.floor(now / 60000);

  const { nextDep, nextArr, deps3, arrs3, delayed, landing, departing } = useMemo(() => {
    const t = nowMin * 60000;
    const upcoming = flights.filter((f) => !isDone(f) && effTime(f) > t - 5 * 60000);
    const deps = upcoming.filter((f) => f.dir === 'dep' && !['gateclosed'].includes(f.status));
    const arrs = upcoming.filter((f) => f.dir === 'arr');
    const in3 = (f) => effTime(f) - t < 3 * 3600000;
    return {
      nextDep: deps.sort((a, b) => effTime(a) - effTime(b))[0],
      nextArr: arrs.sort((a, b) => effTime(a) - effTime(b))[0],
      deps3: upcoming.filter((f) => f.dir === 'dep' && in3(f)).length,
      arrs3: arrs.filter(in3).length,
      // same rule and window as the Flights → "Delays & cancellations" filter
      delayed: (() => {
        const d = flights.filter((f) => isDisrupted(f) && !isEarlier(f, t));
        return { dep: d.filter((f) => f.dir === 'dep').length, arr: d.filter((f) => f.dir === 'arr').length };
      })(),
      landing: arrs.slice(0, 4),
      departing: upcoming.filter((f) => f.dir === 'dep' && f.status !== 'departed').sort((a, b) => effTime(a) - effTime(b)).slice(0, 4),
    };
  }, [flights, nowMin]);

  const aircraft = useMemo(() => aircraftAt(Math.floor(now / 2000) * 2000), [aircraftAt, Math.floor(now / 2000)]); // eslint-disable-line
  const airborne = aircraft.filter((a) => a.cls !== 'gnd').length;

  return (
    <div className="page home">
      <header className="hero-head">
        <div>
          <div className="kicker orange">HYD · {HYD.icao}</div>
          <h1 className="title-xl">Rajiv Gandhi<br />International</h1>
          <div className="subtle">Hyderabad · {dayLabel(new Date(now))} · <span className="mono">{hhmm(new Date(now))}</span> IST</div>
        </div>
        <div className="head-actions">
          <button className="round-btn" aria-label="Search flights" onClick={() => go('/flights?search=1')}><ISearch /></button>
          <button className="round-btn" aria-label="Settings" onClick={() => go('/settings')}><IGear size={20} /></button>
        </div>
      </header>

      <PreviewNotice />

      {weather && (
        <button className="glass card wx-card tap" onClick={() => go('/weather')}>
          <div className="wx-top">
            <WeatherIcon kind={weather.icon} size={58} animated />
            <div className="wx-main">
              <div className="wx-line"><span className="temp-lg">{weather.temp}°</span><span className="wx-text">{weather.text}</span></div>
              <div className="subtle">Feels like {weather.feels}° · Humidity {weather.humidity}%</div>
            </div>
            <IChevron className="chev" />
          </div>
          <div className="tiles3">
            <div className="tile"><label>Wind</label><span className="mono">{String(weather.windDir).padStart(3, '0')}°<br />{weather.windKt}kt</span></div>
            <div className="tile"><label>Visibility</label><span className="mono">{weather.visKm >= 10 ? '10+' : weather.visKm.toFixed(0)} km</span></div>
            <div className="tile"><label>Runway</label><span className="mono">{weather.runway}</span></div>
          </div>
          {weather.alert && <div className="alert-strip"><IBolt size={18} /><span>{weather.alert.short}</span></div>}
        </button>
      )}

      <div className="snap-row">
        {nextDep && <UpNext f={nextDep} now={now} />}
        {nextArr && <UpNext f={nextArr} now={now} />}
      </div>

      <div className="stat-grid">
        <Stat label="Departures" sub="next 3 h" value={deps3} onClick={() => go('/flights?dir=dep')} icon={<ITakeoff size={18} />} />
        <Stat label="Arrivals" sub="next 3 h" value={arrs3} onClick={() => go('/flights?dir=arr')} icon={<ILanding size={18} />} />
        <Stat label="Delays & cancel." sub={`${delayed.dep} dep · ${delayed.arr} arr`} value={delayed.dep + delayed.arr} tone={delayed.dep + delayed.arr ? 'yellow' : ''}
          onClick={() => go(`/flights?filter=delays&dir=${delayed.arr > delayed.dep ? 'arr' : 'dep'}`)} />
        <Stat label="In the air" sub="near HYD" value={airborne} tone="blue" onClick={() => go('/map')} />
      </div>

      <button className="glass card radar-card tap" onClick={() => go('/map')}>
        <Radar aircraft={aircraft} />
        <div className="radar-info">
          <div className="kicker blue">Live airspace</div>
          <div className="title-md">{airborne} aircraft</div>
          <div className="subtle" style={{ marginTop: -8 }}>within 150 km of HYD</div>
          <div className="legend">
            <span><i className="dot arr" />Arriving</span>
            <span><i className="dot dep" />Departing</span>
            <span><i className="dot ovf" />Overflying</span>
          </div>
          <span className="link">Open live map <IChevron size={14} /></span>
          <SourceTag source={air.source === 'sim' ? 'sim' : 'live'} />
        </div>
      </button>

      <section className="glass card list-card">
        <div className="card-head">
          <div className="kicker">Departing soon</div>
          <button className="link" onClick={() => go('/flights?dir=dep')}>All departures <IChevron size={14} /></button>
        </div>
        {departing.map((f) => <MiniRow key={f.id} f={f} />)}
        {!departing.length && <div className="subtle mini-empty">No departures in the next few hours</div>}
      </section>

      <section className="glass card list-card">
        <div className="card-head">
          <div className="kicker">Landing soon</div>
          <button className="link" onClick={() => go('/flights?dir=arr')}>All arrivals <IChevron size={14} /></button>
        </div>
        {landing.map((f) => <MiniRow key={f.id} f={f} />)}
        {!landing.length && <div className="subtle mini-empty">No arrivals in the next few hours</div>}
      </section>

      <footer className="foot-note">
        <SourceTag source={schedule.source} error={schedule.error} />
        <span>Schedule updated {hhmm(new Date(schedule.updated))}</span>
        {schedule.error && <span className="foot-err">{schedule.error}</span>}
        {schedule.source === 'sim' && <button className="link" onClick={() => go('/settings')}>Connect live data</button>}
      </footer>
    </div>
  );
}

function UpNext({ f, now }) {
  const eff = effTime(f);
  const mins = Math.round((eff - now) / 60000);
  const isDep = f.dir === 'dep';
  // progress toward boarding (dep) or landing (arr)
  const pct = isDep ? Math.min(1, Math.max(0.03, 1 - (mins - 15) / 150)) : Math.min(1, Math.max(0.03, 1 - mins / 150));
  const s = statusOf(f);
  return (
    <button className="glass card upnext tap" onClick={() => go('/flight/' + f.id)}>
      <div className="glow" />
      <div className="card-head">
        <div className="kicker orange">{isDep ? 'Next departure' : 'Next arrival'}</div>
        <StatusPill flight={f} small />
      </div>
      <div className="un-mid">
        <FlapClock text={hhmm(eff)} />
        <div className="gate-big"><label>{isDep ? 'Gate' : 'Belt'}</label><b>{(isDep ? f.gate : f.belt) || '—'}</b></div>
      </div>
      <div className="un-city">{isDep ? '' : 'from '}{f.other.city} <em>{f.other.iata}</em></div>
      <div className="un-meta">
        <AirlineBadge airline={f.airline} size={30} />
        <span className="un-al">{f.airline.name} <span className="mono dim">{f.number}</span></span>
      </div>
      <AircraftChip aircraft={f.aircraft} />
      <div className="progress"><span style={{ width: `${pct * 100}%` }} /></div>
      <div className="un-foot subtle">{mins > 0 ? `${isDep ? 'Departs' : 'Lands'} in ${mins >= 60 ? Math.floor(mins / 60) + ' h ' + (mins % 60) + ' min' : mins + ' min'}` : s.label}{f.delayMin >= 15 ? ` · was ${hhmm(f.sched)}` : ''}</div>
    </button>
  );
}

function MiniRow({ f }) {
  const late = f.delayMin >= 15 && f.status !== 'cancelled';
  const { has } = useApp();
  const where = f.dir === 'dep' ? (f.gate ? `Gate ${f.gate}` : has.gate ? 'Gate TBA' : '') : (f.belt ? `Belt ${f.belt}` : '');
  return (
    <button className="mini-row tap" onClick={() => go('/flight/' + f.id)}>
      <span className="mr-time">
        <span className={'mono t' + (late ? ' late' : '')}>{hhmm(effTime(f))}</span>
        {late && <s className="mono">{hhmm(f.sched)}</s>}
      </span>
      <AirlineBadge airline={f.airline} size={32} />
      <span className="mr-main">
        <b>{f.other.city} <em>{f.other.iata}</em></b>
        <small>{f.number} · {f.aircraft?.short || 'Aircraft TBC'}</small>
      </span>
      <span className="mr-right">
        <StatusPill flight={f} small compact />
        {where && <span className={'mr-where' + (/TBA/.test(where) ? ' tba' : '')}>{where}</span>}
      </span>
    </button>
  );
}

function Stat({ label, sub, value, tone, onClick, icon }) {
  return (
    <button className={`glass stat tap ${tone ? 'tone-' + tone : ''}`} onClick={onClick}>
      <span className="stat-top">{icon}<b className="mono">{value}</b></span>
      <span className="stat-l">{label}</span>
      <small>{sub}</small>
    </button>
  );
}

function Radar({ aircraft }) {
  const R = 150; // km radius
  const size = 150, c = size / 2;
  return (
    <svg className="radar" viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id="radarBg"><stop offset="0" stopColor="rgba(80,130,255,.28)" /><stop offset="1" stopColor="rgba(20,30,80,.1)" /></radialGradient>
        <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="rgba(124,182,255,0)" /><stop offset="1" stopColor="rgba(124,182,255,.45)" /></linearGradient>
      </defs>
      <circle cx={c} cy={c} r={c - 2} fill="url(#radarBg)" stroke="rgba(150,180,255,.35)" />
      {[0.33, 0.66].map((k) => <circle key={k} cx={c} cy={c} r={(c - 2) * k} fill="none" stroke="rgba(150,180,255,.2)" />)}
      <line x1={c} y1="4" x2={c} y2={size - 4} stroke="rgba(150,180,255,.15)" />
      <line x1="4" y1={c} x2={size - 4} y2={c} stroke="rgba(150,180,255,.15)" />
      <g className="sweep" style={{ transformOrigin: `${c}px ${c}px` }}>
        <path d={`M${c} ${c} L${c} 2 A${c - 2} ${c - 2} 0 0 1 ${c + (c - 2) * Math.sin(Math.PI / 4)} ${c - (c - 2) * Math.cos(Math.PI / 4)} Z`} fill="url(#sweep)" />
      </g>
      <rect x={c - 5} y={c - 1.5} width="10" height="3" rx="1" fill="#fff" opacity=".85" />
      {aircraft.filter((a) => a.cls !== 'gnd').map((a) => {
        const d = distKm(HYD, a);
        if (d > R) return null;
        const b = (bearing(HYD, a) * Math.PI) / 180;
        const x = c + Math.sin(b) * (d / R) * (c - 6), y = c - Math.cos(b) * (d / R) * (c - 6);
        return <circle key={a.id} cx={x} cy={y} r="3.2" className={'blip ' + a.cls} />;
      })}
    </svg>
  );
}
