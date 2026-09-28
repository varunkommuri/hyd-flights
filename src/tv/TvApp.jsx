// HYD Live — 1920×1080 broadcast screen for YouTube Live (via OBS).
// No interaction: scenes rotate on a timer, urgent alerts jump the queue.
// Each scene is shown in English for the first half of its time, then in Telugu.
// URL options: #/tv?rotate=12 (seconds per board page) &refresh=15 (minutes between schedule calls)
//              &lang=both|en|te (default both: alternate English and Telugu)
//              &only=weather (pin one scene: dep | arr | delays | weather | info | quiet | breaking)
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useApp, useNow } from '../lib/store.jsx';
import { useSceneRotation, URGENT, DUR } from '../lib/rotation.js';
import { useBroadcastData, remarkOf, estOf, alertText } from '../lib/broadcast.js';
import { effTime } from '../lib/flights.js';
import { wmo } from '../lib/weather.js';
import { hhmm } from '../lib/util.js';
import { LangCtx, useLang, tr, placeName, routeText, pageLabel, windLine, windSub, dateLabel, weekdayLabel } from '../lib/i18n.js';
import WeatherIcon from '../components/WeatherIcon.jsx';
import { WindCompass, QrCode, phoneUrl, AirlineLogo } from '../components/Broadcast.jsx';
import { ITakeoff, ILanding, IBell, IBolt } from '../components/Icons.jsx';
import './tv.css';

const DOM_ROWS = 6, INTL_ROWS = 4, MAX_PAGES = 3;

// ---------- scale the fixed 1920×1080 stage to the window ----------
function useStageScale() {
  const [s, setS] = useState(1);
  useLayoutEffect(() => {
    const fit = () => setS(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return s;
}

const pagesFor = (dom, intl) => Math.min(MAX_PAGES, Math.max(1, Math.ceil(dom.length / DOM_ROWS), Math.ceil(intl.length / INTL_ROWS)));

function buildCycle(d, n, rot, only) {
  if (only) return pinned(d, n, rot, only);
  const s = [];
  if (d.quiet) s.push({ type: 'quiet', dur: DUR.quiet });
  else {
    const p = pagesFor(d.deps.dom, d.deps.intl);
    for (let i = 0; i < p; i++) s.push({ type: 'dep', page: i, pages: p, dur: rot });
  }
  const pa = pagesFor(d.arrs.dom, d.arrs.intl);
  for (let i = 0; i < pa; i++) s.push({ type: 'arr', page: i, pages: pa, dur: rot });
  s.push({ type: 'delays', round: n, dur: DUR.delays });
  const urgent = d.alerts.filter((a) => URGENT.has(a.kind));
  if (urgent.length) s.push({ type: 'breaking', alertId: urgent[n % urgent.length].id, dur: DUR.breaking });
  s.push({ type: 'weather', dur: DUR.weather }, { type: 'info', dur: DUR.info });
  return s.map((x, i) => ({ ...x, key: `${n}-${i}` }));
}

function pinned(d, n, rot, only) {
  if (only === 'quiet') return [{ type: 'quiet', dur: DUR.quiet, key: `${n}-q` }];
  if (only === 'breaking') {
    const a = d.alerts.find((x) => URGENT.has(x.kind));
    return [a ? { type: 'breaking', alertId: a.id, dur: DUR.breaking, key: `${n}-b` } : { type: 'delays', round: n, dur: DUR.delays, key: `${n}-b` }];
  }
  const all = buildCycle({ ...d, quiet: false }, n, rot).filter((x) => x.type === only);
  return all.length ? all : buildCycle(d, n, rot);
}

export default function TvApp({ query }) {
  const { settings, update, schedule, weather } = useApp();
  const now = useNow(1000);
  const d = useBroadcastData(now);
  const scale = useStageScale();
  const rot = Math.max(6, Number(query.rotate) || DUR.board);
  const langMode = ['en', 'te'].includes(query.lang) ? query.lang : 'both';

  // Optional per-stream refresh interval (persisted for this browser only)
  useEffect(() => {
    const r = Number(query.refresh);
    if (r >= 5 && r !== settings.scheduleRefreshMin) update({ scheduleRefreshMin: r });
  }, [query.refresh]); // eslint-disable-line react-hooks/exhaustive-deps

  const { scene, next, elapsed, left, lang, breakingAlert } = useSceneRotation(d, (dd, n) => buildCycle(dd, n, rot, query.only), now, { langMode });

  let body;
  switch (scene.type) {
    case 'dep': body = <BoardScene dir="dep" lists={d.deps} page={scene.page} pages={scene.pages} />; break;
    case 'arr': body = <BoardScene dir="arr" lists={d.arrs} page={scene.page} pages={scene.pages} />; break;
    case 'delays': body = <DelaysScene dis={d.dis} round={scene.round} now={now} />; break;
    case 'weather': body = <WeatherScene w={weather} />; break;
    case 'info': body = <InfoScene />; break;
    case 'quiet': body = <QuietScene deps={d.deps} stale={d.stale} now={now} />; break;
    case 'breaking': body = breakingAlert ? <BreakingScene alert={breakingAlert} dur={scene.dur} elapsed={elapsed} key={scene.key} /> : null; break;
    default: body = null;
  }

  return (
    <LangCtx.Provider value={lang}>
      <div className="tv-root">
        <div className="tv-stage" lang={lang} style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
          <Header scene={scene} next={next} left={left} weather={weather} now={now} quiet={d.quiet} startedKey={scene.key} langMode={langMode} />
          <main className="tv-main" key={scene.key + lang}>{body}</main>
          <AlertsPanel alerts={d.alerts} stale={d.stale} schedule={schedule} settings={settings} />
          <Ticker items={d.ticker} />
        </div>
      </div>
    </LangCtx.Provider>
  );
}

// ---------- header ----------
const TAB_LABEL = { dep: 'DEPARTURES', arr: 'ARRIVALS', delays: 'DELAYS', weather: 'WEATHER', info: 'INFO', quiet: 'QUIET HOURS', breaking: 'BREAKING' };
const SCENE_NAME = { dep: 'Departures', arr: 'Arrivals', delays: 'Delays', weather: 'Weather', info: 'Travel info', quiet: 'Quiet hours', breaking: 'Breaking' };
const SCENE_NAME_TE = { dep: 'బయలుదేరే విమానాలు', arr: 'రాక విమానాలు', delays: 'ఆలస్యాలు', weather: 'వాతావరణం', info: 'ప్రయాణ సమాచారం', quiet: 'నిశ్శబ్ద సమయం', breaking: 'తాజా వార్త' };

function Header({ scene, next, left, weather: w, now, quiet, startedKey, langMode }) {
  const lang = useLang();
  const t = (x) => tr(x, lang);
  const sceneName = (x) => (lang === 'te' ? SCENE_NAME_TE : SCENE_NAME)[x.type];
  const tabs = [quiet ? 'quiet' : 'dep', 'arr', 'delays', 'weather', 'info'];
  if (scene.type === 'breaking') tabs.splice(3, 0, 'breaking');
  const nextLabel = !next ? sceneName({ type: 'dep' }) : next.type === scene.type && next.page != null ? (lang === 'te' ? `పేజీ ${next.page + 1}` : `page ${next.page + 1}`) : sceneName(next);
  return (
    <header className="tv-head">
      <div className="tv-brand">
        <span className="tv-logo"><ITakeoff size={46} sw={2.2} /></span>
        <div>
          <div className="tv-title">HYD <em>LIVE</em> <span className="tv-live"><i />LIVE</span></div>
          <div className="tv-sub">{t('Rajiv Gandhi International Airport · Hyderabad')}</div>
        </div>
      </div>
      <div className="tv-nav">
        <div className={'tv-tabs' + (tabs.length > 5 ? ' many' : '')}>
          {tabs.map((k) => {
            const on = k === scene.type;
            return (
              <span key={k} className={'tv-tab' + (on ? ' on' : '') + (k === 'breaking' ? ' red' : '')}>
                {t(TAB_LABEL[k])}{on && scene.pages > 1 ? (lang === 'te' ? ` · ${scene.page + 1}/${scene.pages}` : ` · ${scene.page + 1} of ${scene.pages}`) : ''}
              </span>
            );
          })}
        </div>
        <div className="tv-prog">
          <span className="tv-bar"><i key={startedKey} style={{ animationDuration: scene.dur + 's' }} /></span>
          {langMode === 'both' && <span className="tv-lang"><b className={lang === 'en' ? 'on' : ''}>EN</b><b className={lang === 'te' ? 'on' : ''}>తెలుగు</b></span>}
          <span className="tv-next">{t('Next')}: {nextLabel} · {left}s</span>
        </div>
      </div>
      {w && (
        <div className="tv-wx">
          <WeatherIcon kind={w.icon} size={58} />
          <div><b>{w.temp}°</b><span>{t(w.text)} · RWY {w.runway}</span></div>
        </div>
      )}
      <div className="tv-clock">
        <b>{hhmm(new Date(now))}</b>
        <span>{dateLabel(new Date(now), lang)} · IST</span>
      </div>
    </header>
  );
}

// ---------- boards ----------
function BoardScene({ dir, lists, page, pages }) {
  return (
    <div className="tv-boards">
      <Board kind="dom" dir={dir} rows={lists.dom} per={DOM_ROWS} page={page} />
      <Board kind="intl" dir={dir} rows={lists.intl} per={INTL_ROWS} page={page} />
    </div>
  );
}

function Board({ kind, dir, rows, per, page }) {
  const pages = Math.min(MAX_PAGES, Math.max(1, Math.ceil(rows.length / per)));
  const p = page % pages;
  const shown = rows.slice(p * per, p * per + per);
  const lang = useLang();
  const t = (x) => tr(x, lang);
  const title = t(`${kind === 'dom' ? 'Domestic' : 'International'} ${dir === 'dep' ? 'departures' : 'arrivals'}`);
  return (
    <section className={`tv-board ${kind}`} style={{ '--rows': per }}>
      <div className="tvb-banner">
        {kind === 'dom' ? (dir === 'dep' ? <ITakeoff size={40} sw={2.3} /> : <ILanding size={40} sw={2.3} />) : <IGlobe size={38} />}
        <span>{title}</span>
        <em>{pageLabel(p + 1, pages, lang)}</em>
      </div>
      <div className="tvb-head">
        <span>{t('Scheduled')}</span><span>{t('Estimated')}</span><span>{t('Airline')}</span><span>{t('Flight')}</span><span>{t(dir === 'dep' ? 'Destination' : 'From')}</span>
        <span>{t(dir === 'dep' ? 'Gate' : 'Belt · gate')}</span><span>{t('Status')}</span>
      </div>
      {shown.map((f) => <BoardRow key={f.id} f={f} dir={dir} />)}
      {!shown.length && <div className="tvb-empty">{t('No flights in this window')}</div>}
    </section>
  );
}

function BoardRow({ f, dir }) {
  const lang = useLang();
  const r = remarkOf(f);
  const e = estOf(f);
  return (
    <div className={'tvb-row' + (f.status === 'departed' ? ' done' : '')}>
      <span className="tvb-time">{hhmm(f.sched)}</span>
      <span className={'tvb-time est ' + e.c}>{e.t}</span>
      <span className="tvb-logo"><AirlineLogo airline={f.airline} h={46} /></span>
      <span className="tvb-flight">{f.number}</span>
      <span className="tvb-city">{lang === 'te' ? placeName(f, lang) : placeName(f, lang).toUpperCase()}{f.aircraft && <small>{f.aircraft.short.toUpperCase()}</small>}</span>
      <GateCell f={f} dir={dir} />
      <span className={`tvb-rem c-${r.c}${r.pill ? ' is-pill' : ''}${r.blink ? ' blink' : ''}`}>{tr(r.t, lang)}</span>
    </div>
  );
}

function GateCell({ f, dir }) {
  if (dir === 'dep') return <span className={'tvb-gate' + (f.gate ? '' : ' tba')}>{f.gate || 'TBA'}</span>;
  if (!f.belt && !f.gate) return <span className="tvb-gate tba">TBA</span>;
  return <span className="tvb-gate">{f.belt || ''}{f.gate && <small>G{f.gate}</small>}</span>;
}

// ---------- delays ----------
function DelaysScene({ dis, round, now }) {
  const lang = useLang();
  const t = (x) => tr(x, lang);
  if (!dis.list.length) {
    return (
      <div className="tv-clear">
        <div className="tvc-check"><svg viewBox="0 0 24 24" width="96" height="96"><path d="M5 12.5 10 17.5 19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
        <h2>{t('All flights running on time')}</h2>
        <p>{t('No delays, cancellations or diversions in the next 3 hours')}</p>
        <div className="tvc-counts">
          <span><b className="y">{dis.domCount}</b> {t('domestic')}</span>
          <span><b className="o">{dis.intlCount}</b> {t('international')}</span>
          <span><b className="g">0</b> {t('disrupted')}</span>
        </div>
        <small>{t('Checked')} {hhmm(new Date(now))}</small>
      </div>
    );
  }
  const per = 6;
  const start = dis.list.length > per ? (round * per) % dis.list.length : 0;
  const shown = [...dis.list, ...dis.list].slice(start, start + Math.min(per, dis.list.length));
  return (
    <div className="tv-delays">
      <div className="tvd-stats">
        <div className="tvd-stat y"><b>{dis.delayed}</b><span>{t('Delayed')}</span></div>
        <div className="tvd-stat r"><b>{dis.cancelled}</b><span>{t('Cancelled')}</span></div>
        <div className="tvd-stat"><b>{dis.diverted}</b><span>{t('Diverted')}</span></div>
        <div className="tvd-stat"><b>{dis.avgDelay}m</b><span>{lang === 'te' ? t('Avg delay') : <>Avg<br />delay</>}</span></div>
      </div>
      <div className="tvd-grid">
        {shown.map((f) => <DisruptionCard key={f.id} f={f} />)}
      </div>
      {dis.list.length > per && <p className="tvd-foot">{lang === 'te'
        ? `తదుపరి 3 గంటల్లో ${dis.list.length} అంతరాయ విమానాలలో ${per} చూపిస్తున్నాం · మిగతావి తదుపరి రౌండ్‌లో`
        : `Showing ${per} of ${dis.list.length} disrupted flights in the next 3 hours · the rest appear next time round`}</p>}
    </div>
  );
}

function DisruptionCard({ f }) {
  const lang = useLang();
  const te = lang === 'te';
  const cancelled = f.status === 'cancelled', diverted = f.status === 'diverted';
  const note = cancelled || diverted ? (te ? `${f.airline.name}ను సంప్రదించండి` : `${cancelled ? 'Contact' : 'Check with'} ${f.airline.name}`)
    : f.dir === 'dep' ? (f.gate ? `${te ? 'గేట్' : 'Gate'} ${f.gate}` : te ? 'గేట్ ఇంకా ప్రకటించలేదు' : 'Gate not yet announced')
      : (f.belt ? `${te ? 'బెల్ట్' : 'Belt'} ${f.belt}` : te ? 'బెల్ట్ ఇంకా ప్రకటించలేదు' : 'Belt not yet announced');
  return (
    <div className={'tvd-card' + (cancelled || diverted ? ' red' : '')}>
      <div className="tvd-top">
        <AirlineLogo airline={f.airline} h={44} />
        <div><b>{te ? placeName(f, lang) : placeName(f, lang).toUpperCase()}</b><span>{f.number} · {tr(f.dir === 'dep' ? 'Departure' : 'Arrival', lang)}</span></div>
        <em className={f.intl ? 'intl' : ''}>{tr(f.intl ? 'INTL' : 'DOM', lang)}</em>
      </div>
      <div className="tvd-times">
        <s>{hhmm(f.sched)}</s><span className="arrow">→</span>
        {cancelled || diverted ? <span className="tvd-new red">{tr(cancelled ? 'CANCELLED' : 'DIVERTED', lang)}</span> : <span className="tvd-new">{hhmm(effTime(f))}</span>}
        <span className="tvd-note">{note}</span>
      </div>
    </div>
  );
}

// ---------- weather ----------
function WeatherScene({ w }) {
  const lang = useLang();
  const t = (x) => tr(x, lang);
  if (!w) return null;
  const hours = w.hourly.slice(0, 8);
  const days = w.daily.slice(1, 4);
  const rain = Math.max(w.daily[0]?.pop ?? 0, ...w.hourly.slice(0, 6).map((h) => h.pop ?? 0));
  return (
    <div className={'tv-weather' + (w.alert ? ' has-alert' : '')}>
      {w.alert && <div className="tvw-alert"><IBolt size={40} sw={2.2} /><span>{lang === 'te' && w.alert.te ? w.alert.te.short : w.alert.short}</span></div>}
      <div className="tvw-now tvw-card">
        <label>{t('At the airport now')}</label>
        <div className="tvw-temp"><WeatherIcon kind={w.icon} size={130} animated /><b>{w.temp}°</b></div>
        <div className="tvw-text">{t(w.text)}</div>
        <div className="tvw-feels">{lang === 'te' ? `అనుభూతి ${w.feels}° · తేమ ${w.humidity}%` : `Feels like ${w.feels}° · Humidity ${w.humidity}%`}</div>
      </div>
      <div className="tvw-wind tvw-card">
        <label>{t('Wind vs runway')}</label>
        <WindCompass dir={w.windDir} rwyHdg={w.runwayHdg} size={200} />
        <div className="tvw-wtext">{windLine(w, lang)}</div>
        <div className="tvw-feels">{windSub(w, lang)}</div>
      </div>
      <div className="tvw-tiles">
        <div className="tvw-tile white"><label>{t('Runway')}</label><b>{w.runway}</b></div>
        <div className="tvw-tile"><label>{t('Visibility')}</label><b>{w.visKm >= 10 ? '10+' : Math.round(w.visKm)} km</b></div>
        <div className="tvw-tile"><label>QNH</label><b>{w.qnh}</b></div>
        <div className="tvw-tile"><label>{t('Rain chance')}</label><b className="o">{rain}%</b></div>
      </div>
      <div className="tvw-hours tvw-card">
        <label>{t('Next 8 hours')}</label>
        <div className="tvw-hrow">
          {hours.map((h, i) => {
            const warn = h.code >= 95 || (h.code >= 61 && h.pop >= 60);
            return (
              <div key={i} className={'tvw-h' + (warn ? ' warn' : '')}>
                <span>{String(h.hour).padStart(2, '0')}</span>
                <WeatherIcon kind={wmo(h.code, h.isDay).icon} size={62} />
                <b>{h.temp}°</b>
              </div>
            );
          })}
        </div>
      </div>
      <div className="tvw-days">
        {days.map((dd, i) => {
          const x = wmo(dd.code, true);
          return (
            <div key={i} className="tvw-day tvw-card">
              <b>{weekdayLabel(dd.date, lang)}</b>
              <WeatherIcon kind={x.icon} size={60} />
              <div><span>{t(x.text)}</span><em>{dd.max}° / {dd.min}°</em></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- travel info ----------
function InfoScene() {
  const lang = useLang();
  const t = (x) => tr(x, lang);
  const url = phoneUrl();
  return (
    <div className="tv-info">
      <InfoTile icon={<IClock />} title={t('Check-in closes')}>
        <p><em className="dom">{t('DOM')}</em> {t('45 min before')}</p>
        <p><em className="intl">{t('INTL')}</em> {t('60 min before')}</p>
      </InfoTile>
      <InfoTile icon={<ITakeoff size={46} />} title={t('Reach the airport')}>
        <p><em className="dom">{t('DOM')}</em> {t('2 h before')}</p>
        <p><em className="intl">{t('INTL')}</em> {t('3 h before')}</p>
      </InfoTile>
      <InfoTile icon={<IShield />} title={t('Security')}>
        <p>{t('Keep laptops and liquids ready to take out')}</p>
        <p className="g">{t('Power banks in cabin bags only')}</p>
      </InfoTile>
      <InfoTile icon={<IBagIcon />} title={t('Baggage')}>
        <p>{t('Belt numbers appear on the Arrivals board once the flight lands')}</p>
      </InfoTile>
      <InfoTile icon={<IBus />} title={t('Getting here')}>
        <p>{t('Pushpak airport bus from the city')}</p>
        <p>{t('Cabs from the arrivals forecourt')}</p>
      </InfoTile>
      <div className="tvi-tile qr">
        <QrCode text={url} size={230} />
        <b>{t('Scan to see this on your phone')}</b>
        <span>{location.host || 'hyd-live'}</span>
      </div>
    </div>
  );
}
function InfoTile({ icon, title, children }) {
  return <div className="tvi-tile"><span className="tvi-ico">{icon}</span><h3>{title}</h3>{children}</div>;
}

// ---------- breaking takeover ----------
function BreakingScene({ alert: a, dur, elapsed }) {
  // The scene remounts when the language flips; start the countdown bar where it had got to
  const [offset] = useState(elapsed);
  const lang = useLang();
  const te = lang === 'te';
  const t = (x) => tr(x, lang);
  const f = a.flight;
  const red = a.kind !== 'gate';
  const action = te
    ? (a.kind === 'cancelled' ? `రీబుకింగ్ కోసం ${f.airline.name}ను సంప్రదించండి`
      : a.kind === 'diverted' ? `తాజా సమాచారం కోసం ${f.airline.name}ను సంప్రదించండి`
        : `దయచేసి గేట్ ${a.gate}కు వెళ్లండి${f.dir === 'dep' ? ` — బయలుదేరే సమయం ${hhmm(effTime(f))}` : ''}`)
    : (a.kind === 'cancelled' ? `Contact ${f.airline.name} for rebooking`
      : a.kind === 'diverted' ? `Check with ${f.airline.name} for updates`
        : `Please go to Gate ${a.gate}${f.dir === 'dep' ? ` — departs ${hhmm(effTime(f))}` : ''}`);
  return (
    <div className="tv-breaking-wrap">
      <div className={'tv-breaking' + (red ? '' : ' yellow')}>
        <div className="tvbk-top">
          <span className="tvbk-tag">⚠ {t(a.tag)}</span>
          <span className="tvbk-scope"><em>{t(f.intl ? 'INTERNATIONAL' : 'DOMESTIC')}</em>{t('BREAKING')}</span>
        </div>
        <div className="tvbk-main">
          <AirlineLogo airline={f.airline} h={84} />
          <div>
            <h2>{routeText(f, lang)}</h2>
            <p>{a.kind === 'gate' ? (te ? `గతంలో గేట్ ${a.prevGate}` : `Was Gate ${a.prevGate}`) : `${t('Scheduled')} ${hhmm(f.sched)}`}{f.aircraft ? ` · ${f.aircraft.short.toUpperCase()}` : ''}</p>
          </div>
          {a.kind === 'gate' && <div className="tvbk-gate"><label>{t('New gate')}</label><b>{a.gate}</b></div>}
        </div>
        <div className="tvbk-action">{action}</div>
        <span className="tvbk-bar"><i style={{ animationDuration: dur + 's', animationDelay: -offset + 's' }} /></span>
      </div>
    </div>
  );
}

// ---------- quiet hours ----------
function QuietScene({ deps, stale, now }) {
  const lang = useLang();
  const te = lang === 'te';
  const t = (x) => tr(x, lang);
  const up = (list) => list.filter((f) => effTime(f) > now && f.status !== 'cancelled');
  const dom = up(deps.dom), intl = up(deps.intl);
  const first = [...dom, ...intl].sort((a, b) => effTime(a) - effTime(b))[0];
  return (
    <div className="tv-quiet">
      <div className="tvq-hero">
        <span className="tvq-moon"><svg viewBox="0 0 24 24" width="80" height="80"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" strokeWidth="2" /></svg></span>
        {first ? (
          <div>
            <label>{t('Quiet hours · next departure')}</label>
            <div className="tvq-line">
              <b>{hhmm(effTime(first))}</b>
              <div>
                <h2>{routeText(first, lang)} {first.intl && <em>{t('INTL')}</em>}</h2>
                <p>{[first.gate && `${te ? 'గేట్' : 'Gate'} ${first.gate}`, first.aircraft?.short.toUpperCase(), `${te ? 'చెక్-ఇన్ ప్రారంభం' : 'check-in opens'} ${hhmm(new Date(first.sched - (first.intl ? 180 : 120) * 60000))}`].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
          </div>
        ) : <div><label>{t('QUIET HOURS')}</label><h2>{t('No departures scheduled before morning')}</h2></div>}
      </div>
      <div className="tvq-cols">
        <QuietList title={t('Domestic departures')} kind="dom" list={dom.slice(0, 5)} foot={dom[0] ? `${t('First domestic departure')} ${hhmm(effTime(dom[0]))}` : t('No flights in this window')} />
        <QuietList title={t('International departures')} kind="intl" list={intl.slice(0, 5)} foot={t('International check-in opens 3 h before')} />
      </div>
      {stale && <div className="tvq-stale">{t('Flight data may be delayed — last update')} {hhmm(stale.since)}</div>}
    </div>
  );
}
function QuietList({ title, kind, list, foot }) {
  const lang = useLang();
  return (
    <section className={'tvq-list ' + kind}>
      <div className="tvq-banner">{title}</div>
      {list.map((f) => (
        <div key={f.id} className="tvq-row">
          <b>{hhmm(effTime(f))}</b><AirlineLogo airline={f.airline} h={38} /><span className="mono">{f.number}</span>
          <strong>{lang === 'te' ? placeName(f, lang) : placeName(f, lang).toUpperCase()}</strong><em>{f.gate ? 'G' + f.gate : 'TBA'}</em>
        </div>
      ))}
      <p>{foot}</p>
    </section>
  );
}

// ---------- alerts sidebar ----------
function AlertsPanel({ alerts, stale, schedule, settings }) {
  const lang = useLang();
  const t = (x) => tr(x, lang);
  const boxRef = useRef(null), trackRef = useRef(null);
  const [loop, setLoop] = useState(0); // height of one copy of the list when it overflows, else 0
  const items = alerts.length ? alerts : [
    { id: 'clear', kind: 'clear', tag: 'ALL CLEAR', title: 'No disruptions', sub: 'All flights on time for the next 3 hours' },
    { id: 'i1', kind: 'info', tag: 'INFO', title: 'Check-in closes', sub: '45 min domestic · 60 min international' },
    { id: 'i2', kind: 'info', tag: 'INFO', title: 'Security', sub: 'Power banks in cabin bags only' },
  ];
  // Too many alerts to fit: show the list twice and scroll it upward in a seamless loop
  useLayoutEffect(() => {
    const t = trackRef.current, b = boxRef.current;
    if (!t || !b) return;
    const single = loop ? t.scrollHeight / 2 : t.scrollHeight;
    const next = single > b.clientHeight + 4 ? Math.round(single) : 0;
    if (Math.abs(next - loop) > 2) setLoop(next);
  }, [items, loop]);
  return (
    <aside className="tv-alerts">
      <div className="tva-head"><IBell size={34} sw={2.2} /><span>{t('ALERTS')}</span><em className={alerts.length ? '' : 'zero'}>{alerts.length}</em></div>
      <div className="tva-list" ref={boxRef}>
        <div className={'tva-track' + (loop ? ' loop' : '')} ref={trackRef} style={loop ? { animationDuration: `${Math.max(16, loop / 28)}s` } : undefined}>
          {(loop ? [...items, ...items] : items).map((a, i) => {
            const x = a.te ? alertText(a, lang) : { title: t(a.title), sub: t(a.sub) };
            return (
              <div key={a.id + '-' + i} className={'tva-card k-' + a.kind}>
                <span className="tva-tag">{t(a.tag)}</span>
                <b>{x.title}</b>
                <span>{x.sub}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className={'tva-foot' + (stale ? ' warn' : '')}>
        {stale ? `${t('Flight data may be delayed — last update')} ${hhmm(stale.since)}`
          : schedule.source === 'sim' ? t('Demo data · add a flight API key to go live')
            : lang === 'te' ? `నవీకరణ ${hhmm(new Date(schedule.updated))} · ప్రతి ${settings.scheduleRefreshMin} నిమిషాలకు రిఫ్రెష్`
              : `Updated ${hhmm(new Date(schedule.updated))} · refreshes every ${settings.scheduleRefreshMin} min`}
      </div>
    </aside>
  );
}

// ---------- news ticker ----------
function Ticker({ items }) {
  const content = useMemo(() => items.map((it, i) => (
    <span key={i} className={'tvt-item' + (it.te ? ' te' : '')}>
      <em className={it.te ? 'te' : ''}>{it.te ? TE_TAG[it.tag] || it.tag : it.tag}</em>{it.text}<i>•</i>
    </span>
  )), [items]);
  const chars = items.reduce((s, it) => s + it.text.length + 8, 0);
  return (
    <footer className="tv-ticker">
      <div className="tvt-label"><b>AIRPORT NEWS</b><span>విమానాశ్రయ వార్తలు</span></div>
      <div className="tvt-rail">
        <div className="tvt-track" style={{ animationDuration: `${Math.max(60, chars * 0.19)}s` }}>
          <div className="tvt-seg">{content}</div>
          <div className="tvt-seg" aria-hidden="true">{content}</div>
        </div>
      </div>
    </footer>
  );
}
const TE_TAG = { TIP: 'సూచన', INFO: 'సమాచారం', WEATHER: 'వాతావరణం', CANCELLED: 'రద్దు', DELAYED: 'ఆలస్యం', 'GATE CHANGE': 'గేట్ మార్పు', DIVERTED: 'దారి మళ్లింపు' };

// ---------- small icons ----------
const Svg = ({ children, size = 46 }) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
const IClock = () => <Svg><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M9.5 2.5h5" /></Svg>;
const IShield = () => <Svg><path d="M12 3 4.5 6v5.5c0 4.5 3.2 8 7.5 9.5 4.3-1.5 7.5-5 7.5-9.5V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></Svg>;
const IBagIcon = () => <Svg><rect x="4.5" y="7.5" width="15" height="12.5" rx="2.5" /><path d="M9 7.5V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2" /></Svg>;
const IBus = () => <Svg><rect x="5" y="3.5" width="14" height="14" rx="3" /><path d="M5 10.5h14M8 20.5v-3M16 20.5v-3" /><circle cx="8.5" cy="14" r=".8" fill="currentColor" /><circle cx="15.5" cy="14" r=".8" fill="currentColor" /></Svg>;
const IGlobe = ({ size }) => <Svg size={size}><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z" /></Svg>;
