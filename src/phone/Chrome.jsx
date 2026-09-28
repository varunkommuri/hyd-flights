// Phone app frame: header, rotating alert strip + alert sheet, news ticker, tab bar
import { useEffect, useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { effTime } from '../lib/flights.js';
import { hhmm } from '../lib/util.js';
import { go } from '../lib/nav.js';
import { useT, useLang, cityName } from '../lib/i18n.js';
import { AirlineBadge } from '../components/UI.jsx';
import { ITakeoff, ILanding, ICloud, IChevron, IX } from '../components/Icons.jsx';

export function PhoneHeader({ now }) {
  const { weather: w, settings, update } = useApp();
  const lang = useLang();
  return (
    <header className="ph-head">
      <span className="ph-logo"><ITakeoff size={26} sw={2.2} /></span>
      <div className="ph-brand">
        <b>HYD <em>LIVE</em></b>
        <span>RGIA · {cityName('Hyderabad', lang)}</span>
      </div>
      <button className="ph-lang" onClick={() => update({ lang: settings.lang === 'te' ? 'en' : 'te' })}
        aria-label={lang === 'te' ? 'Switch to English' : 'Switch to Telugu'}>
        {lang === 'te' ? 'English' : 'తెలుగు'}
      </button>
      <div className="ph-clock">
        <b>{hhmm(new Date(now))}</b>
        {w && <span>{w.temp}° · {w.text}</span>}
      </div>
    </header>
  );
}

// One alert at a time; rotates every 5 s, tap to open the full list
export function AlertStrip({ alerts, onOpen }) {
  const t = useT();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (alerts.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % alerts.length), 5000);
    return () => clearInterval(id);
  }, [alerts.length]);
  if (!alerts.length) return null;
  const idx = i % alerts.length;
  const a = alerts[idx];
  return (
    <button className={'ph-strip k-' + a.kind} onClick={() => onOpen(idx)}>
      <span className="ph-tag">{t(a.tag)}</span>
      <b key={a.id}>{a.title}</b>
      <span className="ph-count">{idx + 1}/{alerts.length}</span>
      <IChevron size={18} sw={2.4} />
    </button>
  );
}

export function AlertSheet({ alerts, index, onIndex, onClose }) {
  const t = useT();
  const lang = useLang();
  const a = alerts[index];
  useEffect(() => { if (!a) onClose(); }, [a, onClose]);
  if (!a) return null;
  const f = a.flight;
  const action = a.kind === 'cancelled' ? `Contact ${f.airline.name} for rebooking`
    : a.kind === 'diverted' ? `Check with ${f.airline.name} for updates`
      : a.kind === 'gate' ? `Please go to Gate ${a.gate}${f.status === 'boarding' ? ' — boarding now' : ''}`
        : a.kind === 'delayed' ? `New time ${hhmm(effTime(f))}` : 'Allow extra time to reach the airport';
  return (
    <div className="ph-sheet-wrap" onClick={onClose}>
      <div className={'ph-sheet k-' + a.kind} role="dialog" aria-label="Alert" onClick={(e) => e.stopPropagation()}>
        <div className="phs-top">
          <span className="phs-tag">⚠ {t(a.tag)}</span>
          <span className="phs-n">{index + 1}/{alerts.length}</span>
          <button className="phs-x" onClick={onClose} aria-label="Close"><IX size={20} /></button>
        </div>
        {f ? (
          <div className="phs-flight">
            <AirlineBadge airline={f.airline} size={52} />
            <div>
              <b>{f.number} {f.dir === 'dep' ? 'to' : 'from'} {cityName(f.other.city, lang)}</b>
              <span>{f.dir === 'dep' ? 'Departs' : 'Arrives'} {hhmm(effTime(f))}{a.prevGate ? ` · was Gate ${a.prevGate}` : ''}</span>
            </div>
          </div>
        ) : <div className="phs-flight"><div><b>{a.title}</b><span>{a.sub}</span></div></div>}
        {a.kind === 'gate' && <div className="phs-gate"><span>New boarding gate</span><b>{a.gate}</b></div>}
        <p className="phs-action">{action}</p>
        {f && <button className="phs-link" onClick={() => { onClose(); go('/flight/' + f.id); }}>Flight details</button>}
        <div className="phs-btns">
          <button onClick={() => onIndex((index - 1 + alerts.length) % alerts.length)} disabled={alerts.length < 2}>Previous</button>
          <button className="on" onClick={() => onIndex((index + 1) % alerts.length)} disabled={alerts.length < 2}>Next alert</button>
        </div>
      </div>
    </div>
  );
}

export function NewsTicker({ items }) {
  const t = useT();
  const lang = useLang();
  // English: English items only. Telugu: everything, so flight alerts (English-only) still show.
  const list = lang === 'te' ? items : items.filter((it) => !it.te);
  const chars = list.reduce((s, it) => s + it.text.length + 8, 0);
  const row = list.map((it, i) => (
    <span key={i} className={'pht-item' + (it.te ? ' te' : '')}><em>{t(it.tag)}</em>{it.text}</span>
  ));
  return (
    <div className="ph-ticker">
      <span className="pht-label">{t('News')}</span>
      <div className="pht-rail">
        <div className="pht-track" style={{ animationDuration: `${Math.max(40, chars * 0.16)}s` }}>
          <div className="pht-seg">{row}</div><div className="pht-seg" aria-hidden="true">{row}</div>
        </div>
      </div>
    </div>
  );
}

const TAB_ICONS = {
  departures: <ITakeoff size={24} />,
  arrivals: <ILanding size={24} />,
  delays: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="13" r="7.5" /><path d="M12 9v4l2.5 2M9.5 3h5" /></svg>,
  weather: <ICloud size={24} />,
  info: <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8v.2" /></svg>,
};
const TAB_LABEL = { departures: 'Departures', arrivals: 'Arrivals', delays: 'Delays', weather: 'Weather', info: 'Info' };

export function TabBar({ active, badge }) {
  const t = useT();
  return (
    <nav className="ph-tabs" aria-label="Main">
      {Object.keys(TAB_LABEL).map((k) => (
        <button key={k} className={active === k ? 'on' : ''} onClick={() => go('/' + k)} aria-current={active === k ? 'page' : undefined}>
          <span className="ph-ico">{TAB_ICONS[k]}{k === 'delays' && badge > 0 && <i>{badge}</i>}</span>
          <span className="ph-lbl">{t('tab:' + TAB_LABEL[k])}</span>
        </button>
      ))}
    </nav>
  );
}
