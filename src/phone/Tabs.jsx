// Delays, Weather and Info tabs of the phone app
import { useApp } from '../lib/store.jsx';
import { usePager, Pager } from './Boards.jsx';
import { effTime } from '../lib/flights.js';
import { wmo } from '../lib/weather.js';
import { hhmm, weekday } from '../lib/util.js';
import { go } from '../lib/nav.js';
import { useT, useLang, cityName } from '../lib/i18n.js';
import { AirlineBadge, SourceTag, PreviewNotice } from '../components/UI.jsx';
import WeatherIcon from '../components/WeatherIcon.jsx';
import { WindCompass } from '../components/Broadcast.jsx';
import { IBolt, IChevron, IMap, IGear } from '../components/Icons.jsx';

const CARD_H = 104, CARD_GAP = 10;

export function DelaysTab({ dis }) {
  const t = useT();
  const lang = useLang();
  const perAt = (h) => Math.max(1, Math.floor((h + CARD_GAP) / (CARD_H + CARD_GAP)));
  const pager = usePager((h) => Math.ceil(dis.list.length / perAt(h)), 'delays');
  const per = pager.h ? perAt(pager.h) : 0;
  const shown = dis.list.slice(pager.page * per, pager.page * per + per);
  return (
    <div className="ph-page fit">
      <h1 className="ph-h1">{t('Delays & disruptions')}</h1>
      <div className="phd-stats">
        <div className="y"><b>{dis.delayed}</b><span>{t('Delayed')}</span></div>
        <div className="r"><b>{dis.cancelled}</b><span>{t('Cancelled')}</span></div>
        <div><b>{dis.diverted}</b><span>{t('Diverted')}</span></div>
        <div><b>{dis.avgDelay}m</b><span>{t('Avg delay')}</span></div>
      </div>
      {!dis.list.length && (
        <div className="phd-clear">
          <span>✓</span>
          <b>{t('All flights running on time')}</b>
          <p>No delays, cancellations or diversions in the next 3 hours · {dis.domCount} domestic · {dis.intlCount} international</p>
        </div>
      )}
      {dis.list.length > 0 && <Pager {...pager} />}
      <div className="phd-list" ref={pager.boxRef}>
      <div className="phb-rows phd-rows" key={pager.page}>
      {shown.map((f) => {
        const off = f.status === 'cancelled' || f.status === 'diverted';
        const note = f.status === 'cancelled' ? `Contact ${f.airline.name}` : f.status === 'diverted' ? `Check with ${f.airline.name}`
          : f.dir === 'dep' ? (f.gate ? `Gate ${f.gate}` : 'Gate TBA') : (f.belt ? `Belt ${f.belt}` : 'Belt TBA');
        return (
          <button key={f.id} className={'phd-card' + (off ? ' red' : '')} onClick={() => go('/flight/' + f.id)}>
            <div className="phd-top">
              <AirlineBadge airline={f.airline} size={40} />
              <div><b>{lang === 'te' ? cityName(f.other.city, lang) : f.other.city.toUpperCase()}</b><span>{f.number} · {f.dir === 'dep' ? 'Departure' : 'Arrival'}</span></div>
              <em className={f.intl ? 'intl' : ''}>{f.intl ? 'INTL' : 'DOM'}</em>
            </div>
            <div className="phd-times">
              <s>{hhmm(f.sched)}</s><span>→</span>
              {off ? <strong className="red">{t(f.status === 'cancelled' ? 'CANCELLED' : 'DIVERTED')}</strong> : <strong>{hhmm(effTime(f))}</strong>}
              <small>{note}</small>
            </div>
          </button>
        );
      })}
      </div>
      </div>
    </div>
  );
}

export function WeatherTab() {
  const { weather: w } = useApp();
  const t = useT();
  if (!w) return null;
  const rain = Math.max(w.daily[0]?.pop ?? 0, ...w.hourly.slice(0, 6).map((h) => h.pop ?? 0));
  return (
    <div className="ph-page">
      {w.alert && <div className="phw-alert"><IBolt size={22} sw={2.2} /><span>{w.alert.short}</span></div>}
      <section className="ph-card phw-now">
        <WeatherIcon kind={w.icon} size={78} animated />
        <b>{w.temp}°</b>
        <div><label>At the airport now</label><strong>{w.text}</strong><span>Feels like {w.feels}° · Humidity {w.humidity}%</span></div>
      </section>
      <section className="ph-card phw-wind">
        <WindCompass dir={w.windDir} rwyHdg={w.runwayHdg} size={104} />
        <div>
          <label>Wind vs runway</label>
          <strong>From the {windWord(w.windDir)} · {w.windDir}° · {w.windKt} kt</strong>
          <span>{w.wind.head >= 0 ? `Headwind ${w.wind.head} kt` : `Tailwind ${-w.wind.head} kt`} · {w.wind.cross ? `crosswind ${w.wind.cross} kt` : 'no crosswind'}</span>
        </div>
      </section>
      <div className="phw-tiles">
        <div className="white"><label>Runway</label><b>{w.runway}</b></div>
        <div><label>Visibility</label><b>{w.visKm >= 10 ? '10+' : Math.round(w.visKm)} km</b></div>
        <div><label>QNH</label><b>{w.qnh}</b></div>
        <div><label>Rain chance</label><b className="o">{rain}%</b></div>
      </div>
      <section className="ph-card">
        <label className="ph-label">Next 8 hours</label>
        <div className="phw-hours">
          {w.hourly.slice(0, 8).map((h, i) => (
            <div key={i} className={h.code >= 95 || (h.code >= 61 && h.pop >= 60) ? 'warn' : ''}>
              <span>{String(h.hour).padStart(2, '0')}</span>
              <WeatherIcon kind={wmo(h.code, h.isDay).icon} size={34} />
              <b>{h.temp}°</b>
            </div>
          ))}
        </div>
      </section>
      <section className="ph-card phw-days">
        {w.daily.slice(1, 5).map((d, i) => {
          const x = wmo(d.code, true);
          return (
            <div key={i}>
              <b>{weekday(d.date)}</b><WeatherIcon kind={x.icon} size={34} /><span>{x.text}</span><em>{d.max}° / {d.min}°</em>
            </div>
          );
        })}
      </section>
      <div className="ph-src"><SourceTag source={w.source === 'live' ? 'live' : 'sim'} />{t('Weather')} · Open-Meteo</div>
    </div>
  );
}
const windWord = (deg) => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(deg / 45) % 8];

export function InfoTab() {
  const t = useT();
  const { schedule } = useApp();
  return (
    <div className="ph-page">
      <PreviewNotice />
      <h1 className="ph-h1">{t('Travel info')}</h1>
      <section className="ph-card phi-card">
        <h3>Check-in closes</h3>
        <p><em>DOM</em>45 min before</p><p><em className="intl">INTL</em>60 min before</p>
      </section>
      <section className="ph-card phi-card">
        <h3>Reach the airport</h3>
        <p><em>DOM</em>2 h before</p><p><em className="intl">INTL</em>3 h before</p>
      </section>
      <section className="ph-card phi-card">
        <h3>Security</h3>
        <p>Keep laptops and liquids ready to take out</p><p className="g">Power banks in cabin bags only</p>
      </section>
      <section className="ph-card phi-card">
        <h3>Baggage claim</h3>
        <p>Belt numbers appear on the Arrivals tab once the flight lands</p>
      </section>
      <section className="ph-card phi-card">
        <h3>Getting here</h3>
        <p>Pushpak airport bus from the city</p><p>Cabs from the arrivals forecourt</p>
      </section>
      <div className="phi-links">
        <button className="ph-card" onClick={() => go('/map')}><IMap size={22} /><span>Live radar map</span><IChevron size={18} /></button>
        <button className="ph-card" onClick={() => go('/tv')}><TvIcon /><span>Big-screen view (HYD Live)</span><IChevron size={18} /></button>
        <button className="ph-card" onClick={() => go('/settings')}><IGear size={22} /><span>Settings · theme, data sources</span><IChevron size={18} /></button>
      </div>
      <div className="ph-src"><SourceTag source={schedule.source} error={schedule.error} />Not for operational use</div>
    </div>
  );
}
const TvIcon = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 20.5h8" /></svg>;
