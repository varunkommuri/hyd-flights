import { useEffect, useState } from 'react';
import { useApp, useNow } from './lib/store.jsx';
import { statusOf, effTime } from './lib/flights.js';
import { go } from './lib/nav.js';
import { IHome, IPlane, IBoard, IMap, ICloud, IChevron } from './components/Icons.jsx';
import { AirlineBadge } from './components/UI.jsx';
import PullToRefresh from './components/PullToRefresh.jsx';
import Home from './screens/Home.jsx';
import Flights from './screens/Flights.jsx';
import FlightDetail from './screens/FlightDetail.jsx';
import Board from './screens/Board.jsx';
import LiveMap from './screens/LiveMap.jsx';
import Weather from './screens/Weather.jsx';
import Settings from './screens/Settings.jsx';

// Tiny hash router: #/flights?dir=arr  |  #/flight/<id>  |  #/map?focus=<id>
function parseHash() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [path, q = ''] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  return { name: parts[0] || 'home', arg: parts.slice(1).join('/'), query: Object.fromEntries(new URLSearchParams(q)) };
}


const TABS = [
  { name: 'home', label: 'Home', Icon: IHome },
  { name: 'flights', label: 'Flights', Icon: IPlane },
  { name: 'board', label: 'Board', Icon: IBoard },
  { name: 'map', label: 'Live map', Icon: IMap },
  { name: 'weather', label: 'Weather', Icon: ICloud },
];

export default function App() {
  const [route, setRoute] = useState(parseHash);
  const { toast, refreshAll } = useApp();

  useEffect(() => {
    const on = () => { setRoute(parseHash()); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  useEffect(() => {
    if (route.name !== 'map') document.querySelector('.screen')?.scrollTo?.({ top: 0 });
  }, [route.name, route.arg]);

  const activeTab = route.name === 'flight' ? 'flights' : route.name === 'settings' ? 'home' : route.name;
  let screen;
  switch (route.name) {
    case 'flights': screen = <Flights query={route.query} />; break;
    case 'flight': screen = <FlightDetail id={route.arg} />; break;
    case 'board': screen = <Board query={route.query} />; break;
    case 'map': screen = <LiveMap query={route.query} />; break;
    case 'weather': screen = <Weather />; break;
    case 'settings': screen = <Settings />; break;
    default: screen = <Home />;
  }

  return (
    <div className={`app route-${route.name}`}>
      <Sky />
      <PullToRefresh className="screen" key={route.name + route.arg + (route.name === 'map' ? '' : JSON.stringify(route.query))}
        onRefresh={refreshAll} disabled={route.name === 'map' || route.name === 'settings'}>{screen}</PullToRefresh>
      {route.name !== 'flight' && route.name !== 'settings' && <FollowPill hidden={route.name === 'map'} />}
      <nav className="tabbar" aria-label="Main">
        {TABS.map(({ name, label, Icon }) => (
          <button key={name} className={activeTab === name ? 'on' : ''} onClick={() => go('/' + name)} aria-current={activeTab === name ? 'page' : undefined}>
            <span className="tab-ico"><Icon size={22} /></span>
            <span className="tab-lbl">{label}</span>
          </button>
        ))}
      </nav>
      {toast && <div className={`toast tone-${toast.tone}`} key={toast.id} role="status">{toast.msg}</div>}
    </div>
  );
}

function Sky() {
  return (
    <div className="sky" aria-hidden="true">
      <div className="stars s1" /><div className="stars s2" />
      <div className="horizon" />
    </div>
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
