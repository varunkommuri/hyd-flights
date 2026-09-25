import { useApp, useNow } from '../lib/store.jsx';
import { back, go } from '../lib/nav.js';
import { effTime, statusOf, timelineFor, flightDurationMin, checkInWindow } from '../lib/flights.js';
import { bodyLabel } from '../lib/reference.js';
import { hhmm, hhmmAtOffset, tzLabel, humanDur } from '../lib/util.js';
import { IBack, IBell, IBellOn, IShare, IMap } from '../components/Icons.jsx';
import { AirlineBadge, StatusPill } from '../components/UI.jsx';

export default function FlightDetail({ id }) {
  const { byId, followed, toggleFollow, weather, notify, aircraftAt, has } = useApp();
  const now = useNow(10000);
  const f = byId.get(id);

  if (!f) {
    return (
      <div className="page detail">
        <div className="topbar"><button className="round-btn" onClick={back} aria-label="Back"><IBack /></button></div>
        <div className="empty glass"><b>This flight is no longer on the board</b><span>It may have left the 12-hour window.</span>
          <button className="btn-primary" onClick={() => go('/flights')}>Browse flights</button></div>
      </div>
    );
  }

  const isDep = f.dir === 'dep';
  const eff = effTime(f);
  const late = f.delayMin >= 15 && f.status !== 'cancelled';
  const s = statusOf(f);
  const dur = flightDurationMin(f);
  const otherT = f.otherEst || f.otherSched || (dur ? new Date(eff.getTime() + (isDep ? 1 : -1) * dur * 60000) : null);
  const otherSched = f.otherSched;
  const fromCode = isDep ? 'HYD' : f.other.iata, toCode = isDep ? f.other.iata : 'HYD';
  const fromCity = isDep ? 'Hyderabad' : f.other.city, toCity = isDep ? f.other.city : 'Hyderabad';

  // progress along the route (0 before departure, 1 after arrival)
  const depT = isDep ? eff : otherT, arrT = isDep ? otherT : eff;
  const prog = depT && arrT ? Math.min(1, Math.max(0, (now - depT) / (arrT - depT))) : 0;
  const inAir = prog > 0 && prog < 1 && f.status !== 'cancelled';
  const onMap = aircraftAt(now).some((a) => a.flightId === f.id);

  const share = async () => {
    const text = `${f.number} ${fromCode}→${toCode} · ${s.label} · ${isDep ? 'Departs' : 'Arrives'} ${hhmm(eff)} IST${f.gate ? ' · Gate ' + f.gate : ''}${f.aircraft ? ' · ' + f.aircraft.name : ''}`;
    try {
      if (navigator.share) await navigator.share({ title: f.number, text, url: location.href });
      else { await navigator.clipboard.writeText(text); notify('Flight details copied'); }
    } catch { /* cancelled */ }
  };

  const following = followed?.id === f.id;
  // quadratic arc for the route line
  const P0 = [24, 70], P2 = [276, 70], P1 = [150, 6];
  const pt = (t) => [(1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0], (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1]];
  const [px, py] = pt(prog);
  const tang = Math.atan2(2 * (1 - prog) * (P1[1] - P0[1]) + 2 * prog * (P2[1] - P1[1]), 2 * (1 - prog) * (P1[0] - P0[0]) + 2 * prog * (P2[0] - P1[0]));

  return (
    <div className="page detail">
      <div className="topbar">
        <button className="round-btn" onClick={back} aria-label="Back"><IBack /></button>
        <span className="mono tb-title">{f.number}</span>
        <div className="head-actions">
          <button className={'round-btn' + (following ? ' active' : '')} onClick={() => toggleFollow(f)} aria-label={following ? 'Stop following' : 'Follow this flight'}>
            {following ? <IBellOn size={20} /> : <IBell size={20} />}
          </button>
          <button className="round-btn" onClick={share} aria-label="Share"><IShare size={20} /></button>
        </div>
      </div>

      <section className="glass card route-card">
        <div className="card-head">
          <div className="al-row">
            <AirlineBadge airline={f.airline} size={46} />
            <div><b className="al-name">{f.airline.name}</b><div className="subtle">{f.number} · {isDep ? 'Departure' : 'Arrival'}</div></div>
          </div>
          <StatusPill flight={f} />
        </div>

        <div className="route">
          <div className="rt-end"><b>{fromCode}</b><span>{fromCity}</span></div>
          <svg className="rt-arc" viewBox="0 0 300 84" preserveAspectRatio="none" aria-hidden="true">
            <path d={`M${P0} Q${P1} ${P2}`} fill="none" stroke="var(--orange)" strokeWidth="2" strokeDasharray="3 6" strokeLinecap="round" opacity=".9" />
            {prog > 0 && <path d={`M${P0} Q${P1} ${P2}`} fill="none" stroke="var(--orange)" strokeWidth="2.6" pathLength="1" strokeDasharray={`${prog} 1`} />}
            <circle cx={P0[0]} cy={P0[1]} r="5" fill="var(--orange)" />
            <circle cx={P2[0]} cy={P2[1]} r="5" fill="none" stroke="var(--orange)" strokeWidth="2" />
            {inAir && <g transform={`translate(${px} ${py}) rotate(${(tang * 180) / Math.PI + 90})`}><path d="M0-9 2 -2 9 2v2l-7-2 -.5 5 2.5 2v1.5L0 9.5-3 10.5V9l2.5-2-.5-5-7 2v-2l7-4z" fill="var(--ink)" /></g>}
          </svg>
          <div className="rt-end right"><b>{toCode}</b><span>{toCity}</span></div>
        </div>

        <div className="times">
          <div>
            <label>Departs ({isDep ? 'IST' : tzLabel(f.other.tz)})</label>
            <div className="t-row">
              <span className={`mono t-big${isDep && late ? ' late' : ''}`}>{isDep ? hhmm(eff) : hhmmAtOffset(otherT, f.other.tz)}</span>
              {isDep && late && <s className="mono">{hhmm(f.sched)}</s>}
            </div>
          </div>
          <div className="right">
            <label>Arrives ({isDep ? tzLabel(f.other.tz) : 'IST'})</label>
            <div className="t-row">
              {!isDep && late && <s className="mono">{hhmm(f.sched)}</s>}
              {isDep && late && otherSched && <s className="mono">{hhmmAtOffset(otherSched, f.other.tz)}</s>}
              <span className={`mono t-big${!isDep && late ? ' late' : ''}`}>{isDep ? hhmmAtOffset(otherT, f.other.tz) : hhmm(eff)}</span>
            </div>
          </div>
        </div>
        {dur && <div className="dur subtle">{humanDur(dur)} flight{inAir ? ` · ${Math.round(prog * 100)}% complete` : ''}</div>}

        {(() => {
          const tiles = [<div key="t" className="tile"><label>Terminal</label><b>{f.terminal || (f.intl ? 'Intl' : 'Dom')}</b></div>];
          if (has.gate || f.gate) tiles.push(<div key="g" className={'tile' + (f.gate ? ' hot' : ' pending')}><label>Gate</label><b>{f.gate || 'TBA'}</b></div>);
          if (isDep) tiles.push(<div key="c" className="tile"><label>Check-in</label>{f.checkIn ? <b>{f.checkIn}</b> : <span className="ci-stack"><span>Opens <b className="mono">{hhmm(checkInWindow(f).opens)}</b></span><span>Closes <b className="mono">{hhmm(checkInWindow(f).closes)}</b></span></span>}</div>);
          else if (has.belt || f.belt) tiles.push(<div key="b" className="tile"><label>Bag belt</label><b>{f.belt || 'TBA'}</b></div>);
          return <div className={'info ' + (tiles.length === 3 ? 'tiles3' : tiles.length === 2 ? 'tiles2 flat' : 'tiles1')}>{tiles}</div>;
        })()}
        {f.source !== 'sim' && ((isDep && !f.checkIn) || (has.gate && !f.gate)) && (
          <p className="data-note">{isDep && !f.checkIn ? 'Check-in times are the usual HYD window (counters aren’t published by the data provider). ' : ''}{has.gate && !f.gate ? 'Gate not announced yet — usually 1–3 hours before departure.' : ''}</p>
        )}
      </section>

      <AircraftCard f={f} />

      <section className="glass card timeline">
        <div className="kicker">Timeline</div>
        {timelineFor(f, weather?.runway).map((st) => (
          <div key={st.k} className={'tl-step ' + st.state}>
            <i />
            <div className="tl-main"><b>{st.k}</b>{st.sub && <small>{st.sub}</small>}</div>
            <span className="mono">{hhmm(st.t)}</span>
          </div>
        ))}
      </section>

      <button className={'btn-primary wide' + (onMap ? '' : ' ghost')} onClick={() => go('/map?focus=' + encodeURIComponent(f.id))}>
        <IMap size={20} /> {onMap ? 'Track on live map' : 'Open live map'}
      </button>
      {!onMap && <p className="hint">Shows up on the map when it’s within ~150 km of Hyderabad.</p>}
    </div>
  );
}

function AircraftCard({ f }) {
  const a = f.aircraft;
  if (!a) {
    return <section className="glass card ac-card"><div className="kicker blue">Aircraft</div><div className="subtle">The airline hasn’t assigned an aircraft yet.</div></section>;
  }
  return (
    <section className="glass card ac-card">
      <div className="ac-grid-bg" />
      <div className="card-head">
        <div className="kicker blue">Aircraft</div>
        {a.code && <span className="code-chip mono">{a.code}</span>}
      </div>
      <div className="ac-hero">
        <AircraftArt body={a.body} />
        <div>
          <div className="ac-maker-lg">{a.maker}</div>
          <div className="ac-model">{a.name.replace(a.maker, '').replace(' Dreamliner', '').trim()}</div>
          <div className="subtle">{bodyLabel(a.body)}{a.name.includes('Dreamliner') ? ' · Dreamliner' : ''}</div>
        </div>
      </div>
      <div className="spec-grid">
        <div><label>Registration</label><b className="mono">{f.reg || '—'}</b></div>
        <div><label>Typical seats</label><b>{a.seats}</b></div>
        <div><label>Engines</label><b>{a.engines}</b></div>
        <div><label>Range</label><b>{a.range}</b></div>
      </div>
    </section>
  );
}

// Side-profile illustration scaled by body type
function AircraftArt({ body }) {
  const wide = body === 'wide' || body === 'jumbo';
  const prop = body === 'turboprop';
  return (
    <svg className="ac-art" viewBox="0 0 160 64" width="140" height="56" aria-hidden="true">
      <defs>
        <linearGradient id="fus" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#B9C4E4" /></linearGradient>
      </defs>
      <path d={wide ? 'M12 30c0-6 8-10 20-10h92c12 0 24 5 30 10-6 5-18 10-30 10H32c-12 0-20-4-20-10z' : 'M16 31c0-5 7-8 17-8h86c11 0 22 4 27 8-5 4-16 8-27 8H33c-10 0-17-3-17-8z'} fill="url(#fus)" />
      <path d={wide ? 'M16 22 6 4h12l22 17z' : 'M20 24 11 8h10l19 16z'} fill="#E0E6F7" />
      <path d={prop ? 'M60 25h50l-12-14h-10z' : 'M58 33h46l-26 20h-10z'} fill="#CBD4EE" />
      {!prop && <rect x={wide ? 70 : 72} y={wide ? 40 : 38} width={wide ? 22 : 16} height={wide ? 9 : 7} rx="4" fill="#9AA7CC" />}
      {prop && <><rect x="80" y="18" width="14" height="6" rx="3" fill="#9AA7CC" /><rect x="94" y="12" width="2" height="18" rx="1" fill="#9AA7CC" /></>}
      <g fill="#34467E">{Array.from({ length: wide ? 16 : 12 }, (_, i) => <rect key={i} x={40 + i * (wide ? 5.4 : 6.2)} y={wide ? 25 : 26} width="2.6" height="3" rx="1" />)}</g>
      <path d={wide ? 'M136 23c6 1 11 3 14 6h-12z' : 'M130 25c5 1 9 3 12 5h-10z'} fill="#34467E" />
    </svg>
  );
}
