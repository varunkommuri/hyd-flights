import { useCallback, useEffect, useState } from 'react';
import { useApp, useNow } from './lib/store.jsx';
import { statusOf, effTime } from './lib/flights.js';
import { go } from './lib/nav.js';
import { useBroadcastData } from './lib/broadcast.js';
import { LangCtx } from './lib/i18n.js';
import { IChevron } from './components/Icons.jsx';
import { AirlineBadge } from './components/UI.jsx';
import PullToRefresh from './components/PullToRefresh.jsx';
import FlightDetail from './screens/FlightDetail.jsx';
import LiveMap from './screens/LiveMap.jsx';
import Settings from './screens/Settings.jsx';
import TvApp from './tv/TvApp.jsx';
import { PhoneHeader, AlertStrip, AlertSheet, NewsTicker, TabBar } from './phone/Chrome.jsx';
import Boards from './phone/Boards.jsx';
import { DelaysTab, WeatherTab, InfoTab } from './phone/Tabs.jsx';
import './phone/phone.css';

// Tiny hash router: #/departures  |  #/flight/<id>  |  #/map?focus=<id>  |  #/tv (broadcast screen)
function parseHash() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [path, q = ''] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(q));
  let name = parts[0] || 'departures';
  // Routes from the previous version of the app
  if (name === 'home' || name === 'board' || name === 'flights') name = query.dir === 'arr' ? 'arrivals' : 'departures';
  return { name, arg: parts.slice(1).join('/'), query };
}

const TAB_FOR = { flight: null, map: 'info', settings: 'info' };

export default function App() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const on = () => { setRoute(parseHash()); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  if (route.name === 'tv') return <TvApp query={route.query} />;
  return <PhoneApp route={route} />;
}

function PhoneApp({ route }) {
  const { toast, refreshAll, settings } = useApp();
  const now = useNow(1000);
  const d = useBroadcastData(now);
  const [scope, setScope] = useState('all');
  const [sheet, setSheet] = useState(null);
  const closeSheet = useCallback(() => setSheet(null), []);
  const lang = settings.lang === 'te' ? 'te' : 'en';

  useEffect(() => {
    if (route.name !== 'map') document.querySelector('.screen')?.scrollTo?.({ top: 0 });
  }, [route.name, route.arg]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const active = route.name in TAB_FOR ? TAB_FOR[route.name] : route.name;
  let screen;
  switch (route.name) {
    case 'arrivals': screen = <Boards dir="arr" lists={d.arrs} scope={scope} setScope={setScope} now={now} />; break;
    case 'delays': screen = <DelaysTab dis={d.dis} />; break;
    case 'weather': screen = <WeatherTab />; break;
    case 'info': screen = <InfoTab />; break;
    case 'flight': screen = <FlightDetail id={route.arg} />; break;
    case 'map': screen = <LiveMap query={route.query} />; break;
    case 'settings': screen = <Settings />; break;
    default: screen = <Boards dir="dep" lists={d.deps} scope={scope} setScope={setScope} quiet={d.quiet} stale={d.stale} now={now} />;
  }
  const legacy = route.name === 'flight' || route.name === 'map' || route.name === 'settings';

  return (
    <LangCtx.Provider value={lang}>
      <div className={`app ph-app route-${route.name}`}>
        {!legacy && <PhoneHeader now={now} />}
        {!legacy && <AlertStrip alerts={d.alerts} onOpen={setSheet} />}
        <div className="ph-body">
          <PullToRefresh className="screen" key={route.name + route.arg + (route.name === 'map' ? '' : JSON.stringify(route.query))}
            onRefresh={refreshAll} disabled={route.name === 'map' || route.name === 'settings'}>{screen}</PullToRefresh>
          {route.name !== 'flight' && route.name !== 'settings' && <FollowPill hidden={route.name === 'map'} />}
        </div>
        <NewsTicker items={d.ticker} />
        <TabBar active={active} badge={d.dis.list.length} />
        {sheet != null && <AlertSheet alerts={d.alerts} index={sheet} onIndex={setSheet} onClose={closeSheet} />}
        {toast && <div className={`toast tone-${toast.tone}`} key={toast.id} role="status">{toast.msg}</div>}
      </div>
    </LangCtx.Provider>
  );
}

// Floating card for the flight the user follows (like a live activity)
function FollowPill({ hidden }) {
  const { followed } = useApp();
  const now = useNow(15000);
  if (!followed || hidden) return null;
  const s = statusOf(followed);
  const eff = effTime(followed);
  const mins = Math.round((eff - now) / 60000);
  let sub, pct;
  if (followed.dir === 'dep') {
    const close = mins - 15;
    sub = followed.status === 'departed' ? `Departed to ${followed.other.city}`
      : close > 0 ? `${followed.number} to ${followed.other.city} · gate closes in ${close > 90 ? Math.round(close / 60) + ' h' : close + ' min'}`
        : `${followed.number} to ${followed.other.city} · departs ${mins > 0 ? 'in ' + mins + ' min' : 'now'}`;
    pct = Math.max(0.04, Math.min(1, 1 - (mins - 15) / 120));
  } else {
    sub = mins > 0 ? `${followed.number} from ${followed.other.city} · lands in ${mins > 90 ? Math.round(mins / 60) + ' h' : mins + ' min'}` : `${followed.number} from ${followed.other.city} · ${followed.belt ? 'belt ' + followed.belt : 'arrived'}`;
    pct = Math.max(0.04, Math.min(1, 1 - mins / 180));
  }
  const C = 2 * Math.PI * 15;
  return (
    <button className="follow-pill" onClick={() => go('/flight/' + followed.id)}>
      <AirlineBadge airline={followed.airline} size={44} />
      <span className="fp-text">
        <b>{s.label}{followed.gate ? ` · Gate ${followed.gate}` : ''}</b>
        <small>{sub}</small>
      </span>
      <span className="fp-ring">
        <svg viewBox="0 0 36 36" width="40" height="40">
          <circle cx="18" cy="18" r="15" stroke="rgba(255,255,255,.15)" strokeWidth="3" fill="none" />
          <circle cx="18" cy="18" r="15" stroke="var(--orange)" strokeWidth="3" fill="none" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 18 18)" />
        </svg>
        <IChevron size={16} sw={2.4} />
      </span>
    </button>
  );
}
