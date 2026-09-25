import { useMemo, useState } from 'react';
import { useApp, useNow } from '../lib/store.jsx';
import { go } from '../lib/nav.js';
import { effTime } from '../lib/flights.js';
import { hhmm } from '../lib/util.js';
import { ITakeoff, ILanding } from '../components/Icons.jsx';
import { Segmented, FlapText, SourceTag, AirlineBadge } from '../components/UI.jsx';

function remark(f) {
  const late = f.delayMin >= 15;
  switch (f.status) {
    case 'cancelled': return { t: 'CANCELLED', c: 'red' };
    case 'diverted': return { t: 'DIVERTED', c: 'red' };
    case 'boarding': return { t: 'BOARDING', c: 'green', blink: true };
    case 'finalcall': return { t: 'FINAL CALL', c: 'orange', blink: true };
    case 'gateclosed': return { t: 'GATE CLOSED', c: 'orange' };
    case 'departed': return { t: `DEPARTED ${hhmm(effTime(f))}`, c: 'grey' };
    case 'gateopen': return { t: 'GATE OPEN', c: 'white' };
    case 'checkin': return late ? { t: 'DELAYED', sub: hhmm(f.est), c: 'yellow' } : { t: 'CHECK-IN', c: 'white' };
    case 'approaching': return { t: 'LANDING', c: 'green', blink: true };
    case 'landed': return { t: `LANDED ${hhmm(effTime(f))}`, c: 'green' };
    case 'arrived': return { t: 'AT GATE', c: 'grey' };
    case 'enroute': return late ? { t: 'EXPECTED', sub: hhmm(f.est), c: 'yellow' } : { t: 'ON TIME', c: 'green' };
    default: return late ? { t: 'DELAYED', sub: hhmm(f.est), c: 'yellow' } : { t: 'ON TIME', c: 'green' };
  }
}

export default function Board({ query }) {
  const { flights, schedule, has } = useApp();

  const [dir, setDir] = useState(query.dir === 'arr' ? 'arr' : 'dep');
  const [scope, setScope] = useState(query.scope || 'all'); // all | dom | intl
  const now = useNow(1000);
  const rows = useMemo(() => {
    const from = Date.now() - 15 * 60000;
    return flights
      .filter((f) => f.dir === dir && effTime(f) >= from && (scope === 'all' || (scope === 'intl') === !!f.intl))
      .sort((a, b) => a.sched - b.sched).slice(0, 40);
  }, [flights, dir, scope]);

  const showGate = dir === 'dep' ? has.gate : has.gate || has.belt;
  return (
    <div className="page board">
      <header className="row-head">
        <div>
          <div className="kicker orange">HYD · Terminal 1</div>
          <h1 className="title-lg">Live board</h1>
        </div>
        <div className="board-clock"><b className="mono">{hhmm(new Date(now))}</b><span>Local time</span></div>
      </header>
      <Segmented value={dir} onChange={setDir} options={[
        { value: 'dep', label: 'Departures', icon: <ITakeoff size={18} /> },
        { value: 'arr', label: 'Arrivals', icon: <ILanding size={18} /> },
      ]} />

      <div className="chips board-chips">
        {[['all', 'All'], ['dom', 'Domestic'], ['intl', 'International']].map(([k, l]) => (
          <button key={k} className={'chip' + (scope === k ? ' on' : '')} onClick={() => setScope(k)}>{l}</button>
        ))}
      </div>

      <div className={'fids' + (showGate ? '' : ' no-gate')}>
        <div className="fids-banner">
          <span>{scope === 'intl' ? 'INTL ' : scope === 'dom' ? 'DOMESTIC ' : ''}{dir === 'dep' ? 'DEPARTURES' : 'ARRIVALS'}</span>
          {dir === 'dep' ? <ITakeoff size={34} sw={2.2} /> : <ILanding size={34} sw={2.2} />}
        </div>
        <div className="fids-head">
          <span>Time</span><span>{dir === 'dep' ? 'Destination' : 'Origin'} <em>· aircraft · flight</em></span>{showGate && <span>{dir === 'dep' ? 'Gate' : 'Belt'}</span>}<span>Remarks</span>
        </div>
        {rows.map((f, i) => {
          const r = remark(f);
          return (
            <button key={f.id + dir} className={`fids-row tap${f.status === 'departed' || f.status === 'arrived' ? ' dim' : ''}`} onClick={() => go('/flight/' + f.id)}>
              <span className="f-time">{hhmm(f.sched)}</span>
              <span className="f-dest">
                <span className="f-city"><AirlineBadge airline={f.airline} size={26} /><FlapText text={f.other.city.toUpperCase()} delay={i * 35} /></span>
                <span className="f-ac">{f.aircraft ? f.aircraft.short.toUpperCase() : 'TBC'}{f.aircraft?.body === 'wide' || f.aircraft?.body === 'jumbo' ? <span className="wb">WIDE</span> : ''} <span className="f-num">· {f.number}</span></span>
              </span>
              {showGate && <GateCell f={f} dir={dir} />}
              <span className={`f-rem c-${r.c}${r.blink ? ' blink' : ''}`}>{r.t}{r.sub && <small>{r.sub}</small>}</span>
            </button>
          );
        })}
        {!rows.length && <div className="fids-empty">No {scope === 'intl' ? 'international ' : scope === 'dom' ? 'domestic ' : ''}{dir === 'dep' ? 'departures' : 'arrivals'} in this window</div>}
      </div>
      <div className="list-meta center"><SourceTag source={schedule.source} error={schedule.error} /><span>Tap any row for full details</span></div>
    </div>
  );
}

// Departures: gate. Arrivals: baggage belt, with the arrival gate underneath (or instead, if no belt yet)
function GateCell({ f, dir }) {
  const main = dir === 'dep' ? f.gate : f.belt || f.gate;
  const sub = dir === 'arr' && f.belt && f.gate ? `G${f.gate}` : dir === 'arr' && !f.belt && f.gate ? 'gate' : '';
  if (!main) return <span className="f-gate tba">TBA</span>;
  return (
    <span className={'f-gate' + (String(main).length > 3 ? ' long' : '')}>
      {main}{sub && <small>{sub}</small>}
    </span>
  );
}
