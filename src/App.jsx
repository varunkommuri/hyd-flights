import { useEffect, useState } from 'react';
import { useApp } from './lib/store.jsx';
import PullToRefresh from './components/PullToRefresh.jsx';
import FlightDetail from './screens/FlightDetail.jsx';
import LiveMap from './screens/LiveMap.jsx';
import Settings from './screens/Settings.jsx';
import TvApp from './tv/TvApp.jsx';
import PhoneLive from './phone/PhoneLive.jsx';

// Tiny hash router.
//   #/            HYD Live, layout picked from the screen: TV broadcast on wide landscape
//                 screens (monitors, TVs, laptops), portrait view on phones
//   #/tv          always the TV broadcast (1920×1080, for YouTube via OBS)
//   #/mobile      always the portrait phone view
//   #/settings    data sources and API keys (for whoever runs the site)
//   #/flight/<id>, #/map  detail pages, reachable by direct link only
function parseHash() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [path, q = ''] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  return { name: parts[0] || 'live', arg: parts.slice(1).join('/'), query: Object.fromEntries(new URLSearchParams(q)) };
}

const PAGES = { flight: FlightDetail, map: LiveMap, settings: Settings };

// Wide and landscape → big-screen layout. Re-checked on resize and rotation.
const WIDE = '(min-width: 900px) and (min-aspect-ratio: 5/4)';
function useWideScreen() {
  const [wide, setWide] = useState(() => window.matchMedia?.(WIDE).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(WIDE);
    if (!mq) return;
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

export default function App() {
  const [route, setRoute] = useState(parseHash);
  const wide = useWideScreen();
  useEffect(() => {
    const on = () => { setRoute(parseHash()); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  if (PAGES[route.name]) return <Page route={route} />;
  if (route.name === 'tv' || (route.name !== 'mobile' && wide)) return <TvApp query={route.query} />;
  return <PhoneLive query={route.query} />;
}

// Detail pages keep their own layout (back button, theme)
function Page({ route }) {
  const { toast, refreshAll } = useApp();
  const Screen = PAGES[route.name];
  return (
    <div className={`app route-${route.name}`} style={{ '--tabbar-h': '0px' }}>
      <PullToRefresh className="screen" key={route.name + route.arg} onRefresh={refreshAll} disabled={route.name !== 'flight'}>
        {route.name === 'flight' ? <Screen id={route.arg} /> : <Screen query={route.query} />}
      </PullToRefresh>
      {toast && <div className={`toast tone-${toast.tone}`} key={toast.id} role="status">{toast.msg}</div>}
    </div>
  );
}
