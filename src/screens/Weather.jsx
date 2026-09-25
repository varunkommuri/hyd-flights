import { useApp } from '../lib/store.jsx';
import { wmo, compass } from '../lib/weather.js';
import { weekday } from '../lib/util.js';
import { IBolt, IDrop, IEye, IGauge, ISunrise, IWind } from '../components/Icons.jsx';
import WeatherIcon from '../components/WeatherIcon.jsx';
import { SourceTag } from '../components/UI.jsx';

export default function Weather() {
  const { weather: w, metar } = useApp();
  if (!w) return null;
  const tMin = Math.min(...w.daily.map((d) => d.min)), tMax = Math.max(...w.daily.map((d) => d.max));
  const rwyHdg = w.runwayHdg;

  return (
    <div className="page weather">
      <header>
        <div className="kicker blue">Weather · HYD</div>
        <h1 className="title-lg">At the airport</h1>
      </header>

      <section className="glass card wx-hero">
        <div>
          <div className="temp-xxl">{w.temp}°</div>
          <div className="wx-hero-text">{w.text}</div>
          <div className="subtle">Feels like {w.feels}° · H {w.high}° L {w.low}°</div>
        </div>
        <WeatherIcon kind={w.icon} size={130} animated />
      </section>

      {w.alert && (
        <section className="alert-card">
          <IBolt size={22} />
          <div><b>{w.alert.title}</b><p>{w.alert.body}</p></div>
        </section>
      )}

      <section className="glass card">
        <div className="kicker">Next hours</div>
        <div className="hours">
          {w.hourly.slice(0, 12).map((h, i) => {
            const d = wmo(h.code, h.isDay);
            const warn = h.code >= 95;
            return (
              <div key={i} className={'hour' + (i === 0 ? ' now' : '') + (warn ? ' warn' : '')}>
                <span className="h-l">{i === 0 ? 'Now' : String(h.hour).padStart(2, '0')}</span>
                <WeatherIcon kind={d.icon} size={30} />
                <span className="mono h-t">{h.temp}°</span>
                {h.pop >= 30 && <span className="h-pop"><IDrop size={10} />{h.pop}%</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="glass card flying">
        <div className="card-head">
          <div className="kicker">For flying</div>
          <span className={`pill tone-${w.category.tone}`}>{w.category.label}</span>
        </div>
        <div className="fly-grid">
          <Compass dir={w.windDir} rwy={rwyHdg} />
          <div className="fly-text">
            <div className="subtle">Wind from the {compass(w.windDir)}</div>
            <div className="mono wind-big">{String(w.windDir).padStart(3, '0')}° · {w.windKt} kt</div>
            {w.gustKt > w.windKt + 5 && <div className="subtle">Gusting {w.gustKt} kt</div>}
            <div className="rwy-line"><span className="rwy-chip mono">RWY {w.runway}</span><span className="subtle">in use</span></div>
            <div className="subtle small">{w.wind.head >= 0 ? `${w.wind.head} kt headwind` : `${-w.wind.head} kt tailwind`} · {w.wind.cross} kt crosswind</div>
          </div>
        </div>
        <div className="tiles2">
          <Tile icon={<IEye size={16} />} label="Visibility" value={`${w.visKm >= 10 ? '10+' : w.visKm.toFixed(1)} km`} />
          <Tile icon={<IGauge size={16} />} label="QNH" value={`${w.qnh} hPa`} />
          <Tile icon={<IDrop size={16} />} label="Humidity · dew" value={`${w.humidity}% · ${w.dew}°`} />
          <Tile icon={<IWind size={16} />} label="Cloud cover" value={`${w.cloud}%`} />
        </div>
        {metar && <div className="metar mono"><label>METAR</label>{metar}</div>}
      </section>

      <section className="glass card">
        <div className="kicker">Next 6 days</div>
        {w.daily.map((d, i) => {
          const x = wmo(d.code, true);
          const l = ((d.min - tMin) / (tMax - tMin || 1)) * 100, r = ((d.max - tMin) / (tMax - tMin || 1)) * 100;
          return (
            <div key={i} className="day-row">
              <span className="d-name">{i === 0 ? 'Today' : weekday(d.date)}</span>
              <WeatherIcon kind={x.icon} size={28} />
              <span className="d-pop">{d.pop >= 30 ? `${d.pop}%` : ''}</span>
              <span className="mono d-min">{d.min}°</span>
              <span className="d-bar"><i style={{ left: `${l}%`, width: `${Math.max(6, r - l)}%` }} /></span>
              <span className="mono d-max">{d.max}°</span>
            </div>
          );
        })}
        <div className="sun-row subtle"><ISunrise size={18} /> Sunrise {w.daily[0].sunrise} · Sunset {w.daily[0].sunset}{w.daily[0].uv ? ` · UV ${Math.round(w.daily[0].uv)}` : ''}</div>
      </section>

      <div className="list-meta center"><SourceTag source={w.source === 'live' ? 'live' : 'sim'} /><span>{w.source === 'live' ? 'Open-Meteo forecast for the airfield' : 'Weather feed unreachable — showing sample conditions'}</span></div>
    </div>
  );
}

function Tile({ icon, label, value }) {
  return <div className="tile"><label>{icon}{label}</label><b className="mono">{value}</b></div>;
}

function Compass({ dir, rwy }) {
  return (
    <svg viewBox="0 0 120 120" width="124" height="124" className="compass" aria-label={`Wind from ${dir} degrees`}>
      <circle cx="60" cy="60" r="54" fill="rgba(255,255,255,.04)" stroke="rgba(160,180,255,.3)" strokeWidth="1.5" />
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i * 10 * Math.PI) / 180, r1 = i % 9 === 0 ? 44 : 48;
        return <line key={i} x1={60 + Math.sin(a) * r1} y1={60 - Math.cos(a) * r1} x2={60 + Math.sin(a) * 52} y2={60 - Math.cos(a) * 52} stroke="rgba(180,195,255,.35)" strokeWidth={i % 9 === 0 ? 2 : 1} />;
      })}
      {['N', 'E', 'S', 'W'].map((t, i) => {
        const a = (i * 90 * Math.PI) / 180;
        return <text key={t} x={60 + Math.sin(a) * 35} y={60 - Math.cos(a) * 35 + 4} textAnchor="middle" className="cmp-t">{t}</text>;
      })}
      {/* runway */}
      <g transform={`rotate(${rwy - 90} 60 60)`}>
        <rect x="30" y="56" width="60" height="8" rx="2" fill="rgba(255,255,255,.18)" />
        <line x1="34" y1="60" x2="86" y2="60" stroke="rgba(255,255,255,.6)" strokeDasharray="4 3" />
      </g>
      {/* wind arrow: points where the wind blows TO */}
      <g transform={`rotate(${dir} 60 60)`} className="cmp-arrow">
        <line x1="60" y1="14" x2="60" y2="88" stroke="#7CB6FF" strokeWidth="3" strokeLinecap="round" />
        <path d="M52 80 60 94 68 80z" fill="#7CB6FF" />
      </g>
    </svg>
  );
}
