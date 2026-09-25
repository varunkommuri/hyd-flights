import { useMemo, useState, useRef, useEffect } from 'react';
import { useApp } from '../lib/store.jsx';
import { go } from '../lib/nav.js';
import { effTime, isDone, isEarlier, isDisrupted, checkInWindow } from '../lib/flights.js';
import { hhmm } from '../lib/util.js';
import { ISearch, IX, ITakeoff, ILanding, IRefresh } from '../components/Icons.jsx';
import { AirlineBadge, AircraftChip, StatusPill, Segmented, SourceTag } from '../components/UI.jsx';

const FILTERS = [
  { k: 'all', label: 'All' },
  { k: 'dom', label: 'Domestic' },
  { k: 'intl', label: 'International' },
  { k: 'delays', label: 'Delays & cancellations' },
  { k: 'wide', label: 'Wide-body jets' },
];

export default function Flights({ query }) {
  const { flights, schedule, loadSchedule } = useApp();
  const [dir, setDir] = useState(query.dir === 'arr' ? 'arr' : 'dep');
  const [filter, setFilter] = useState(query.filter || 'all');
  const [q, setQ] = useState('');
  const [showEarlier, setShowEarlier] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { if (query.search) inputRef.current?.focus(); }, [query.search]);

  const { list, earlier } = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (f) => !needle || [f.other.city, f.other.iata, f.airline.name, f.number, f.number.replace(' ', ''), f.aircraft?.name, f.aircraft?.code, f.reg]
      .filter(Boolean).some((s) => s.toLowerCase().includes(needle));
    const pass = (f) => f.dir === dir && match(f) && (
      filter === 'all' || (filter === 'dom' && !f.intl) || (filter === 'intl' && f.intl) ||
      (filter === 'delays' && isDisrupted(f)) ||
      (filter === 'wide' && ['wide', 'jumbo'].includes(f.aircraft?.body)));
    const all = flights.filter(pass).sort((a, b) => effTime(a) - effTime(b));
    const now = Date.now();
    return {
      list: all.filter((f) => !isEarlier(f, now)),
      earlier: all.filter((f) => isEarlier(f, now)),
    };
  }, [flights, dir, filter, q]);

  const shown = showEarlier ? [...earlier, ...list] : list;
  // group by IST hour for easy scanning
  const groups = [];
  for (const f of shown) {
    const h = hhmm(effTime(f)).slice(0, 2) + ':00';
    if (!groups.length || groups[groups.length - 1].h !== h) groups.push({ h, items: [] });
    groups[groups.length - 1].items.push(f);
  }

  return (
    <div className="page flights">
      <div className="sticky-head">
        <header className="row-head">
          <div>
            <div className="kicker orange">HYD · Live board</div>
            <h1 className="title-lg">Flights</h1>
          </div>
          <button className="updated" onClick={() => loadSchedule(true)} aria-label="Refresh">
            <IRefresh size={15} className={schedule.loading ? 'spin' : ''} /> Updated {hhmm(new Date(schedule.updated))}
          </button>
        </header>
        <label className="search">
          <ISearch size={20} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="City, airline, flight or aircraft" enterKeyHint="search" />
          {q && <button onClick={() => setQ('')} aria-label="Clear"><IX size={18} /></button>}
        </label>
        <Segmented value={dir} onChange={setDir} options={[
          { value: 'arr', label: 'Arrivals', icon: <ILanding size={18} /> },
          { value: 'dep', label: 'Departures', icon: <ITakeoff size={18} /> },
        ]} />
        <div className="chips">
          {FILTERS.map((f) => (
            <button key={f.k} className={'chip' + (filter === f.k ? ' on' : '')} onClick={() => setFilter(f.k)}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="list-meta">
        <span>{list.length} {dir === 'dep' ? 'departures' : 'arrivals'} · next 12 hours</span>
        <SourceTag source={schedule.source} error={schedule.error} />
      </div>

      {earlier.length > 0 && (
        <button className="earlier-btn" onClick={() => setShowEarlier((v) => !v)}>
          {showEarlier ? 'Hide' : 'Show'} {earlier.length} earlier {dir === 'dep' ? 'departures' : 'arrivals'}
        </button>
      )}

      {groups.map((g) => (
        <section key={g.h} className="hour-group">
          <div className="hour-label"><span>{g.h}</span></div>
          {g.items.map((f) => <FlightCard key={f.id} f={f} />)}
        </section>
      ))}

      {!shown.length && (
        <div className="empty glass">
          <b>No flights match</b>
          <span>Try another city, airline or aircraft — e.g. “Dubai”, “IndiGo”, “A320neo” or “777”.</span>
        </div>
      )}
    </div>
  );
}

export function FlightCard({ f }) {
  const { has } = useApp();
  const late = f.delayMin >= 15 && f.status !== 'cancelled';
  const cancelled = f.status === 'cancelled';
  return (
    <button className={`glass fcard tap${cancelled ? ' is-cancelled' : ''}${isDone(f) ? ' is-done' : ''}`} onClick={() => go('/flight/' + f.id)}>
      <div className="fc-top">
        <AirlineBadge airline={f.airline} size={40} />
        <div className="fc-al">
          <b>{f.airline.name}</b>
          <span className="mono dim">{f.number}</span>
        </div>
        <StatusPill flight={f} small />
      </div>
      <div className="fc-body">
        <div className="fc-time">
          <span className={`mono big${late ? ' late' : ''}`}>{hhmm(effTime(f))}</span>
          {late && <s className="mono">{hhmm(f.sched)}</s>}
        </div>
        <div className="fc-city">
          <b>{f.dir === 'arr' && <span className="from">from </span>}{f.other.city} <em>{f.other.iata}</em>{f.intl && <span className="intl-tag">INTL</span>}</b>
          <AircraftChip aircraft={f.aircraft} />
          {f.dir === 'dep' && !isDone(f) && f.status !== 'cancelled' && (
            <span className="ci-line">Check-in {f.checkIn ? <>counters <b>{f.checkIn}</b></> : <>{hhmm(checkInWindow(f).opens)}–{hhmm(checkInWindow(f).closes)}</>}</span>
          )}
        </div>
        {(f.dir === 'dep' ? has.gate : has.gate || has.belt) && (
          <div className="fc-gate">
            <label>{f.dir === 'arr' && f.belt ? 'Belt' : 'Gate'}</label>
            <b className={(f.dir === 'arr' && f.belt ? f.belt : f.gate) ? '' : 'tba'}>{(f.dir === 'arr' && f.belt ? f.belt : f.gate) || 'TBA'}</b>
          </div>
        )}
      </div>
    </button>
  );
}
