// HYD Live for phones: the broadcast in portrait. Nothing to tap — scenes rotate on their own
// (domestic/international departures and arrivals, delays, breaking alerts, weather, travel info),
// each shown in English for the first half of its time and Telugu for the second.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useApp, useNow } from '../lib/store.jsx';
import { useBroadcastData, remarkOf, estOf, alertText } from '../lib/broadcast.js';
import { useSceneRotation, URGENT, DUR } from '../lib/rotation.js';
import { effTime } from '../lib/flights.js';
import { wmo } from '../lib/weather.js';
import { hhmm } from '../lib/util.js';
import { LangCtx, useLang, tr, placeName, routeText, windLine, windSub, dateLabel, weekdayLabel } from '../lib/i18n.js';
import WeatherIcon from '../components/WeatherIcon.jsx';
import { WindCompass, AirlineLogo } from '../components/Broadcast.jsx';
import { ITakeoff, ILanding, IBolt, IBell } from '../components/Icons.jsx';
import './live.css';

// Sizes (px) used to work out how much fits — keep in sync with live.css
const ROW_H = 56, HEAD_H = 24, CARD_H = 64, CARD_GAP = 8, STATS_H = 58;
const SCENE_PAD = 16 + 3; // scene padding + board border
const BOARD_CAP = { dom: 3, intl: 2 };

const BOARDS = [
  { type: 'board', dir: 'dep', kind: 'dom' }, { type: 'board', dir: 'dep', kind: 'intl' },
  { type: 'board', dir: 'arr', kind: 'dom' }, { type: 'board', dir: 'arr', kind: 'intl' },
];

// only (preview): pin one scene type — board | delays | breaking | weather | info | quiet
// Flight rows that fit in a scene area of height h
const rowsFor = (h) => Math.max(3, Math.floor((h - SCENE_PAD - HEAD_H) / ROW_H));

function buildCycle(d, n, per, only) {
  if (only === 'quiet') return [{ type: 'quiet', dur: DUR.quiet, key: `${n}-q` }];
  if (only) {
    const pinned = buildCycle({ ...d, quiet: false }, n, per).filter((x) => x.type === only);
    if (pinned.length) return pinned;
  }
  const s = [];
  const rows = rowsFor(per.h);
  for (const b of BOARDS) {
    if (b.dir === 'dep' && d.quiet) { if (b.kind === 'dom') s.push({ type: 'quiet', dur: DUR.quiet }); continue; }
    const list = (b.dir === 'dep' ? d.deps : d.arrs)[b.kind];
    if (!list.length && b.kind === 'intl') continue;
    const pages = Math.min(BOARD_CAP[b.kind], Math.max(1, Math.ceil(list.length / rows)));
    for (let i = 0; i < pages; i++) s.push({ ...b, page: i, pages, rows, dur: DUR.board });
  }
  s.push({ type: 'delays', round: n, dur: DUR.delays });
  const urgent = d.alerts.filter((a) => URGENT.has(a.kind));
  if (urgent.length) s.push({ type: 'breaking', alertId: urgent[n % urgent.length].id, dur: DUR.breaking });
  s.push({ type: 'weather', dur: DUR.weather }, { type: 'info', dur: DUR.info });
  return s.map((x, i) => ({ ...x, key: `${n}-${i}` }));
}

// Height of the scene area, rounded so tiny changes don't restart the rotation
function useAreaHeight() {
  const ref = useRef(null);
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setH(Math.round(el.clientHeight / 8) * 8);
    const ro = new ResizeObserver(read);
    ro.observe(el);
    read();
    return () => ro.disconnect();
  }, []);
  return [ref, h];
}

export default function PhoneLive({ query = {} }) {
  const { weather, schedule } = useApp();
  const now = useNow(1000);
  const d = useBroadcastData(now);
  const [areaRef, h] = useAreaHeight();
  const per = { h: h || 460 };
  const { scene, next, elapsed, left, lang, breakingAlert } = useSceneRotation(d, (dd, n) => buildCycle(dd, n, per, query.only), now, {
    langMode: ['en', 'te'].includes(query.lang) ? query.lang : 'both',
  });

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  let body = null;
  switch (scene.type) {
    case 'board': body = <BoardScene scene={scene} rows={rowsFor(per.h)} list={(scene.dir === 'dep' ? d.deps : d.arrs)[scene.kind]} />; break;
    case 'delays': body = <DelaysScene dis={d.dis} round={scene.round} h={per.h} now={now} />; break;
    case 'breaking': body = breakingAlert ? <BreakingScene alert={breakingAlert} dur={scene.dur} elapsed={elapsed} key={scene.key} /> : null; break;
    case 'weather': body = <WeatherScene w={weather} h={per.h} />; break;
    case 'info': body = <InfoScene schedule={schedule} stale={d.stale} />; break;
    case 'quiet': body = <QuietScene deps={d.deps} stale={d.stale} now={now} h={per.h} />; break;
    default: break;
  }

  return (
    <LangCtx.Provider value={lang}>
      <div className="pl-root" lang={lang}>
        <Head now={now} weather={weather} />
        <SceneBar scene={scene} next={next} left={left} />
        <AlertStrip alerts={d.alerts} />
        <main className="pl-main" ref={areaRef}>
          <div className="pl-scene" key={scene.key + lang}>{body}</div>
        </main>
        <Ticker items={d.ticker} lang={lang} />
      </div>
    </LangCtx.Provider>
  );
}

// ---------- frame ----------
function Head({ now, weather: w }) {
  const lang = useLang();
  return (
    <header className="pl-head">
      <span className="pl-logo"><ITakeoff size={22} sw={2.3} /></span>
      <div className="pl-brand">
        <b>HYD <em>LIVE</em><i className="pl-live">● LIVE</i></b>
        <span>RGIA · {lang === 'te' ? 'హైదరాబాద్' : 'Hyderabad'}</span>
      </div>
      <div className="pl-clock">
        <b>{hhmm(new Date(now))}</b>
        <span>{w ? `${w.temp}° · ${tr(w.text, lang)}` : dateLabel(new Date(now), lang)}</span>
      </div>
    </header>
  );
}

const SCENE_EN = { quiet: 'Quiet hours', delays: 'Delays & disruptions', breaking: 'Breaking', weather: 'Weather & runway', info: 'Travel info' };
const SCENE_TE = { quiet: 'నిశ్శబ్ద సమయం', delays: 'ఆలస్యాలు & అంతరాయాలు', breaking: 'తాజా వార్త', weather: 'వాతావరణం & రన్‌వే', info: 'ప్రయాణ సమాచారం' };
function sceneTitle(s, lang) {
  if (s.type === 'board') return tr(`${s.kind === 'dom' ? 'Domestic' : 'International'} ${s.dir === 'dep' ? 'departures' : 'arrivals'}`, lang);
  return (lang === 'te' ? SCENE_TE : SCENE_EN)[s.type];
}
const tone = (s) => (s.type === 'board' ? s.kind : s.type === 'breaking' ? 'red' : s.type === 'delays' ? 'amber' : 'plain');

function SceneBar({ scene, next, left }) {
  const lang = useLang();
  const te = lang === 'te';
  const nextLabel = next ? (next.type === scene.type && next.kind === scene.kind && next.dir === scene.dir ? (te ? `పేజీ ${next.page + 1}` : `page ${next.page + 1}`) : sceneTitle(next, lang)) : sceneTitle({ type: 'board', dir: 'dep', kind: 'dom' }, lang);
  const Icon = scene.dir === 'arr' ? ILanding : ITakeoff;
  return (
    <div className={'pl-bar t-' + tone(scene)}>
      <div className="plb-top">
        {scene.type === 'board' && <Icon size={20} sw={2.3} />}
        <b>{sceneTitle(scene, lang)}</b>
        {scene.pages > 1 && <em>{scene.page + 1}/{scene.pages}</em>}
      </div>
      <div className="plb-prog">
        <span className="plb-lang"><i className={te ? '' : 'on'}>EN</i><i className={te ? 'on' : ''}>తెలుగు</i></span>
        <span className="plb-track"><i key={scene.key} style={{ animationDuration: scene.dur + 's' }} /></span>
        <small>{te ? 'తదుపరి' : 'Next'}: {nextLabel} · {left}s</small>
      </div>
    </div>
  );
}

// One alert at a time, changing every 5 s
function AlertStrip({ alerts }) {
  const lang = useLang();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (alerts.length < 2) return;
    const id = setInterval(() => setI((x) => x + 1), 5000);
    return () => clearInterval(id);
  }, [alerts.length]);
  if (!alerts.length) {
    return <div className="pl-strip k-clear"><IBell size={18} sw={2.2} /><span className="pls-tag">{tr('ALL CLEAR', lang)}</span><b>{lang === 'te' ? 'తదుపరి 3 గంటల్లో అంతరాయాలు లేవు' : 'No disruptions in the next 3 hours'}</b></div>;
  }
  const idx = i % alerts.length;
  const a = alerts[idx];
  const x = alertText(a, lang);
  return (
    <div className={'pl-strip k-' + a.kind}>
      <span className="pls-bell"><IBell size={18} sw={2.2} /><i>{alerts.length}</i></span>
      <span className="pls-tag">{tr(a.tag, lang)}</span>
      <div className="pls-text" key={a.id + lang}><b>{x.title}</b><span>{x.sub}</span></div>
      <em>{idx + 1}/{alerts.length}</em>
    </div>
  );
}

function Ticker({ items, lang }) {
  // Show items in the current language; flight alerts exist in both
  const list = items.filter((it) => (lang === 'te' ? it.te || !items.some((o) => o.te && o.tag === it.tag) : !it.te));
  const chars = list.reduce((s, it) => s + it.text.length + 6, 0);
  const row = list.map((it, k) => <span key={k} className="plt-item"><em>{tr(it.tag, lang)}</em>{it.text}</span>);
  return (
    <footer className="pl-ticker">
      <span className="plt-label">{lang === 'te' ? 'వార్తలు' : 'News'}</span>
      <div className="plt-rail">
        <div className="plt-track" style={{ animationDuration: `${Math.max(30, chars * 0.14)}s` }}>
          <div className="plt-seg">{row}</div><div className="plt-seg" aria-hidden="true">{row}</div>
        </div>
      </div>
    </footer>
  );
}

// ---------- boards ----------
// rows comes from the current height, so the board still fits if the phone's browser bar
// appears or the phone is rotated mid-cycle; the page count updates on the next cycle.
function BoardScene({ scene, list, rows }) {
  const lang = useLang();
  const t = (x) => tr(x, lang);
  const page = Math.min(scene.page, Math.max(0, Math.ceil(list.length / rows) - 1));
  const shown = list.slice(page * rows, page * rows + rows);
  return (
    <div className={'pl-board ' + scene.kind}>
      <div className="plb-head">
        <span>{t('Sched')} / {t('Est')}</span>
        <span>{t('Flight')}</span>
        <span>{t(scene.dir === 'dep' ? 'Destination' : 'From')}</span>
        <span>{t(scene.dir === 'dep' ? 'Gate' : 'Belt')}</span>
      </div>
      {shown.map((f) => <Row key={f.id} f={f} dir={scene.dir} />)}
      {!shown.length && <div className="pl-empty">{t('No flights in this window')}</div>}
    </div>
  );
}

function Row({ f, dir }) {
  const lang = useLang();
  const r = remarkOf(f);
  const e = estOf(f);
  const where = dir === 'dep' ? f.gate : f.belt || '';
  return (
    <div className={'pl-row' + (f.status === 'departed' ? ' done' : '')}>
      <span className="plr-time"><b>{hhmm(f.sched)}</b><span className={e.c}>{e.t}</span></span>
      <span className="plr-air"><AirlineLogo airline={f.airline} h={24} /><b>{f.number}</b></span>
      <span className="plr-main">
        <b className="plr-city">{lang === 'te' ? placeName(f, lang) : placeName(f, lang).toUpperCase()}</b>
        {f.aircraft && <small>{f.aircraft.short.toUpperCase()}</small>}
      </span>
      <span className="plr-right">
        <b className={'plr-gate' + (where ? '' : ' tba')}>{where || 'TBA'}{dir === 'arr' && f.gate && <small>G{f.gate}</small>}</b>
        <span className={`plr-rem c-${r.c}${r.pill ? ' pill' : ''}${r.blink ? ' blink' : ''}`}>{tr(r.t, lang)}</span>
      </span>
    </div>
  );
}

// ---------- delays ----------
function DelaysScene({ dis, round, h, now }) {
  const lang = useLang();
  const t = (x) => tr(x, lang);
  const te = lang === 'te';
  if (!dis.list.length) {
    return (
      <div className="pl-clear">
        <span>✓</span>
        <b>{t('All flights running on time')}</b>
        <p>{t('No delays, cancellations or diversions in the next 3 hours')}</p>
        <div><em className="y">{dis.domCount}</em> {t('domestic')} · <em className="o">{dis.intlCount}</em> {t('international')}</div>
        <small>{t('Checked')} {hhmm(new Date(now))}</small>
      </div>
    );
  }
  const per = Math.max(1, Math.floor((h - 16 - STATS_H) / (CARD_H + CARD_GAP)));
  const start = dis.list.length > per ? (round * per) % dis.list.length : 0;
  const shown = [...dis.list, ...dis.list].slice(start, start + Math.min(per, dis.list.length));
  return (
    <div className="pl-delays">
      <div className="pld-stats">
        <div className="y"><b>{dis.delayed}</b><span>{t('Delayed')}</span></div>
        <div className="r"><b>{dis.cancelled}</b><span>{t('Cancelled')}</span></div>
        <div><b>{dis.diverted}</b><span>{t('Diverted')}</span></div>
        <div><b>{dis.avgDelay}m</b><span>{t('Avg delay')}</span></div>
      </div>
      {shown.map((f) => {
        const off = f.status === 'cancelled' || f.status === 'diverted';
        const note = off ? (te ? `${f.airline.name}ను సంప్రదించండి` : `Contact ${f.airline.name}`)
          : f.dir === 'dep' ? (f.gate ? `${te ? 'గేట్' : 'Gate'} ${f.gate}` : '') : (f.belt ? `${te ? 'బెల్ట్' : 'Belt'} ${f.belt}` : '');
        return (
          <div key={f.id} className={'pld-card' + (off ? ' red' : '')}>
            <AirlineLogo airline={f.airline} h={28} />
            <div className="pld-mid">
              <b>{te ? placeName(f, lang) : placeName(f, lang).toUpperCase()} <em className={f.intl ? 'intl' : ''}>{t(f.intl ? 'INTL' : 'DOM')}</em></b>
              <span>{f.number} · {t(f.dir === 'dep' ? 'Departure' : 'Arrival')}{note && ` · ${note}`}</span>
            </div>
            <div className="pld-times">
              <s>{hhmm(f.sched)}</s>
              {off ? <strong className="red">{t(f.status === 'cancelled' ? 'CANCELLED' : 'DIVERTED')}</strong> : <strong>{hhmm(effTime(f))}</strong>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- breaking takeover ----------
function BreakingScene({ alert: a, dur, elapsed }) {
  const lang = useLang();
  const te = lang === 'te';
  const t = (x) => tr(x, lang);
  const [offset] = useState(elapsed); // keep the countdown going across the language flip
  const f = a.flight;
  const action = te
    ? (a.kind === 'cancelled' ? `రీబుకింగ్ కోసం ${f.airline.name}ను సంప్రదించండి`
      : a.kind === 'diverted' ? `తాజా సమాచారం కోసం ${f.airline.name}ను సంప్రదించండి` : `దయచేసి గేట్ ${a.gate}కు వెళ్లండి`)
    : (a.kind === 'cancelled' ? `Contact ${f.airline.name} for rebooking`
      : a.kind === 'diverted' ? `Check with ${f.airline.name} for updates` : `Please go to Gate ${a.gate}`);
  return (
    <div className={'pl-breaking k-' + a.kind}>
      <div className="plk-top">
        <span className="plk-tag">⚠ {t(a.tag)}</span>
        <span className="plk-scope">{t(f.intl ? 'INTERNATIONAL' : 'DOMESTIC')}</span>
      </div>
      <div className="plk-flight">
        <AirlineLogo airline={f.airline} h={44} />
        <div>
          <h2>{routeText(f, lang)}</h2>
          <p>{a.kind === 'gate' ? (te ? `గతంలో గేట్ ${a.prevGate}` : `Was Gate ${a.prevGate}`) : `${t('Scheduled')} ${hhmm(f.sched)}`}{f.aircraft ? ` · ${f.aircraft.short.toUpperCase()}` : ''}</p>
        </div>
      </div>
      {a.kind === 'gate' && <div className="plk-gate"><span>{t('New gate')}</span><b>{a.gate}</b></div>}
      <div className="plk-action">{action}</div>
      <span className="plk-bar"><i style={{ animationDuration: dur + 's', animationDelay: -offset + 's' }} /></span>
    </div>
  );
}

// ---------- weather ----------
function WeatherScene({ w, h }) {
  const lang = useLang();
  const t = (x) => tr(x, lang);
  if (!w) return null;
  const rain = Math.max(w.daily[0]?.pop ?? 0, ...w.hourly.slice(0, 6).map((x) => x.pop ?? 0));
  const roomy = h >= 500;
  return (
    <div className="pl-weather">
      {w.alert && <div className="plw-alert"><IBolt size={20} sw={2.3} /><span>{lang === 'te' && w.alert.te ? w.alert.te.short : w.alert.short}</span></div>}
      <div className="plw-top">
        <div className="plw-card plw-now">
          <label>{t('At the airport now')}</label>
          <div className="plw-temp"><WeatherIcon kind={w.icon} size={54} animated /><b>{w.temp}°</b></div>
          <strong>{t(w.text)}</strong>
          <span>{lang === 'te' ? `అనుభూతి ${w.feels}° · తేమ ${w.humidity}%` : `Feels ${w.feels}° · Humidity ${w.humidity}%`}</span>
        </div>
        <div className="plw-card plw-wind">
          <label>{t('Wind vs runway')}</label>
          <WindCompass dir={w.windDir} rwyHdg={w.runwayHdg} size={82} />
          <strong>{windLine(w, lang)}</strong>
          <span>{windSub(w, lang)}</span>
        </div>
      </div>
      <div className="plw-tiles">
        <div className="white"><label>{t('Runway')}</label><b>{w.runway}</b></div>
        <div><label>{t('Visibility')}</label><b>{w.visKm >= 10 ? '10+' : Math.round(w.visKm)} km</b></div>
        <div><label>QNH</label><b>{w.qnh}</b></div>
        <div><label>{t('Rain chance')}</label><b className="o">{rain}%</b></div>
      </div>
      <div className="plw-card plw-hours">
        {w.hourly.slice(0, 6).map((x, i) => (
          <div key={i} className={x.code >= 95 || (x.code >= 61 && x.pop >= 60) ? 'warn' : ''}>
            <span>{String(x.hour).padStart(2, '0')}</span>
            <WeatherIcon kind={wmo(x.code, x.isDay).icon} size={30} />
            <b>{x.temp}°</b>
          </div>
        ))}
      </div>
      {roomy && (
        <div className="plw-days">
          {w.daily.slice(1, 4).map((dd, i) => {
            const x = wmo(dd.code, true);
            return <div key={i} className="plw-card"><b>{weekdayLabel(dd.date, lang)}</b><WeatherIcon kind={x.icon} size={28} /><em>{dd.max}°/{dd.min}°</em></div>;
          })}
        </div>
      )}
    </div>
  );
}

// ---------- travel info ----------
function InfoScene({ schedule, stale }) {
  const lang = useLang();
  const t = (x) => tr(x, lang);
  const te = lang === 'te';
  return (
    <div className="pl-info">
      <div className="pli-tile"><h3>{t('Check-in closes')}</h3><p><em>{t('DOM')}</em>{t('45 min before')}</p><p><em className="intl">{t('INTL')}</em>{t('60 min before')}</p></div>
      <div className="pli-tile"><h3>{t('Reach the airport')}</h3><p><em>{t('DOM')}</em>{t('2 h before')}</p><p><em className="intl">{t('INTL')}</em>{t('3 h before')}</p></div>
      <div className="pli-tile"><h3>{t('Security')}</h3><p>{t('Keep laptops and liquids ready to take out')}</p><p className="g">{t('Power banks in cabin bags only')}</p></div>
      <div className="pli-tile"><h3>{t('Baggage')}</h3><p>{t('Belt numbers appear on the Arrivals board once the flight lands')}</p></div>
      <div className="pli-tile"><h3>{t('Getting here')}</h3><p>{t('Pushpak airport bus from the city')}</p><p>{t('Cabs from the arrivals forecourt')}</p></div>
      <div className={'pli-tile data' + (stale ? ' warn' : '')}>
        <h3>{te ? 'విమాన సమాచారం' : 'Flight data'}</h3>
        <p>{stale ? `${t('Flight data may be delayed — last update')} ${hhmm(stale.since)}`
          : schedule.source === 'sim' ? t('Demo data · add a flight API key to go live')
            : te ? `నవీకరణ ${hhmm(new Date(schedule.updated))}` : `Updated ${hhmm(new Date(schedule.updated))}`}</p>
        <p className="dim">{te ? 'సమయాలు IST · కార్యాచరణ ఉపయోగం కోసం కాదు' : 'Times in IST · not for operational use'}</p>
      </div>
    </div>
  );
}

// ---------- quiet hours ----------
function QuietScene({ deps, stale, now, h }) {
  const lang = useLang();
  const t = (x) => tr(x, lang);
  const te = lang === 'te';
  const up = [...deps.dom, ...deps.intl].filter((f) => effTime(f) > now && f.status !== 'cancelled').sort((a, b) => effTime(a) - effTime(b));
  const first = up[0];
  const rows = Math.max(2, Math.floor((h - 150) / ROW_H));
  return (
    <div className="pl-quiet">
      <div className="plq-hero">
        <label>{t('Quiet hours · next departure')}</label>
        {first ? (
          <>
            <b>{hhmm(effTime(first))}</b>
            <strong>{routeText(first, lang)}</strong>
            <span>{[first.gate && `${te ? 'గేట్' : 'Gate'} ${first.gate}`, `${te ? 'చెక్-ఇన్ ప్రారంభం' : 'check-in opens'} ${hhmm(new Date(first.sched - (first.intl ? 180 : 120) * 60000))}`].filter(Boolean).join(' · ')}</span>
          </>
        ) : <strong>{t('No departures scheduled before morning')}</strong>}
        {stale && <div className="plq-stale">{t('Flight data may be delayed — last update')} {hhmm(stale.since)}</div>}
      </div>
      <div className="pl-board dom">{up.slice(1, rows + 1).map((f) => <Row key={f.id} f={f} dir="dep" />)}</div>
    </div>
  );
}
