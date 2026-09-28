// Departures / Arrivals tabs: domestic + international boards, quiet-hours hero
import { remarkOf, estOf } from '../lib/broadcast.js';
import { effTime } from '../lib/flights.js';
import { hhmm } from '../lib/util.js';
import { go } from '../lib/nav.js';
import { useT, useLang, cityName } from '../lib/i18n.js';
import { AirlineBadge } from '../components/UI.jsx';
import { ITakeoff, ILanding } from '../components/Icons.jsx';

export function ScopeChips({ scope, setScope }) {
  const t = useT();
  return (
    <div className="ph-scope">
      {[['all', 'All'], ['dom', 'Domestic'], ['intl', 'International']].map(([k, l]) => (
        <button key={k} className={(scope === k ? 'on ' : '') + k} onClick={() => setScope(k)}>{k !== 'all' && <i />}{t(l)}</button>
      ))}
    </div>
  );
}

export default function Boards({ dir, lists, scope, setScope, quiet, stale, now }) {
  return (
    <div className="ph-page">
      <ScopeChips scope={scope} setScope={setScope} />
      {dir === 'dep' && quiet && <QuietHero lists={lists} stale={stale} now={now} />}
      {scope !== 'intl' && <Board kind="dom" dir={dir} rows={lists.dom} />}
      {scope !== 'dom' && <Board kind="intl" dir={dir} rows={lists.intl} />}
    </div>
  );
}

function Board({ kind, dir, rows }) {
  const t = useT();
  const title = `${kind === 'dom' ? 'Domestic' : 'International'} ${dir === 'dep' ? 'departures' : 'arrivals'}`;
  return (
    <section className={'ph-board ' + kind}>
      <div className="phb-banner">
        {kind === 'dom' ? (dir === 'dep' ? <ITakeoff size={22} sw={2.3} /> : <ILanding size={22} sw={2.3} />) : <IGlobe />}
        <span>{t(title)}</span>
        <em>{rows.length}</em>
      </div>
      <div className="phb-head">
        <span>{t('Sched')}<br />{t('Est')}</span>
        <span>{t(dir === 'dep' ? 'Flight · destination' : 'Flight · from')}</span>
        <span>{t(dir === 'dep' ? 'Gate' : 'Belt')}</span>
      </div>
      {rows.map((f) => <Row key={f.id} f={f} dir={dir} />)}
      {!rows.length && <div className="phb-empty">{t('No flights in this window')}</div>}
    </section>
  );
}

function Row({ f, dir }) {
  const t = useT();
  const lang = useLang();
  const r = remarkOf(f);
  const e = estOf(f);
  return (
    <button className={'phb-row' + (f.status === 'departed' ? ' done' : '')} onClick={() => go('/flight/' + f.id)}>
      <span className="phb-times"><b>{hhmm(f.sched)}</b><span className={e.c}>{e.t}</span></span>
      <span className="phb-main">
        <span className="phb-fl"><AirlineBadge airline={f.airline} size={26} /><b>{f.number}</b>{f.aircraft && <small>{f.aircraft.short.toUpperCase()}</small>}</span>
        <b className={'phb-city' + (lang === 'te' ? ' te' : '')}>{lang === 'te' ? cityName(f.other.city, lang) : f.other.city.toUpperCase()}</b>
        <span className={`phb-rem c-${r.c}${r.pill ? ' is-pill' : ''}`}>{t(r.t)}</span>
      </span>
      {dir === 'dep'
        ? <span className={'phb-gate' + (f.gate ? '' : ' tba')}>{f.gate || 'TBA'}</span>
        : <span className={'phb-gate' + (f.belt || f.gate ? '' : ' tba')}>{f.belt || (f.gate ? '' : 'TBA')}{f.gate && <small>G{f.gate}</small>}</span>}
    </button>
  );
}

function QuietHero({ lists, stale, now }) {
  const t = useT();
  const first = [...lists.dom, ...lists.intl].filter((f) => effTime(f) > now && f.status !== 'cancelled').sort((a, b) => effTime(a) - effTime(b))[0];
  if (!first) return null;
  return (
    <section className="ph-quiet">
      <label>{t('Quiet hours · next departure')}</label>
      <div className="phq-line">
        <b>{hhmm(effTime(first))}</b>
        <div>
          <strong>{first.number} to {first.other.city}</strong>
          <span>{[first.gate && `Gate ${first.gate}`, `check-in opens ${hhmm(new Date(first.sched - (first.intl ? 180 : 120) * 60000))}`].filter(Boolean).join(' · ')}</span>
        </div>
      </div>
      {stale && <div className="phq-stale">{t('Flight data may be delayed — last update')} {hhmm(stale.since)}</div>}
    </section>
  );
}

const IGlobe = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.1"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z" /></svg>;
