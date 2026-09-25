import { useState } from 'react';
import { useApp } from '../lib/store.jsx';
import { back } from '../lib/nav.js';
import { fetchLiveSchedule } from '../lib/flights.js';
import { fetchAircraft } from '../lib/aircraft.js';
import { IBack, IKey } from '../components/Icons.jsx';
import { SourceTag, PreviewNotice } from '../components/UI.jsx';
import { fetchAirlabsGates } from '../lib/airlabs.js';
import { cacheSet, IS_PREVIEW, BUILT_IN_RAPIDAPI_KEY } from '../lib/config.js';

export default function Settings() {
  const { settings, update, schedule, air, weather, loadSchedule, notify, flights, gates, applyGates } = useApp();
  const [alKey, setAlKey] = useState(settings.airlabsKey || '');
  const [alTest, setAlTest] = useState(null);
  const saveAirlabs = async () => {
    const k = alKey.trim();
    if (!k) { update({ airlabsKey: '' }); setAlTest({ ok: true, msg: 'AirLabs key removed' }); return; }
    setAlTest({ busy: true, msg: 'Checking AirLabs…' });
    try {
      const rows = await fetchAirlabsGates(k);
      applyGates(rows);
      update({ airlabsKey: k }); // save after the check so it doesn't trigger a second fetch
      const g = rows.filter((r) => r.gate).length, b = rows.filter((r) => r.belt).length;
      setAlTest({ ok: rows.length > 0, msg: `Connected · ${rows.length} flights · ${g} with gates · ${b} with belts` + (g + b === 0 && rows.length ? ' (your AirLabs plan may not include gate fields)' : '') });
    } catch (e) {
      update({ airlabsKey: k });
      setAlTest({ ok: false, msg: IS_PREVIEW ? 'Blocked in the claude.ai preview — try on your hosted link.' : /fetch|network|load/i.test(e.message) ? 'Couldn’t reach AirLabs from this browser.' : e.message });
    }
  };
  const [key, setKey] = useState(settings.rapidApiKey);
  const [test, setTest] = useState(null);
  const [airTest, setAirTest] = useState(null);


  const saveKey = async () => {
    const k = key.trim();
    update({ rapidApiKey: k });
    if (!k) { setTest({ ok: true, msg: BUILT_IN_RAPIDAPI_KEY ? 'Your key removed — using the built-in key' : 'Key removed — showing demo schedule' }); setTimeout(() => loadSchedule(true), 50); return; }
    setTest({ busy: true, msg: 'Checking key…' });
    try {
      const list = await fetchLiveSchedule(k);
      cacheSet('schedule', list); // reuse this response so the test doesn't cost a second call
      setTest({ ok: true, msg: `Connected · ${list.length} flights loaded` });
      setTimeout(() => loadSchedule(), 50);
    } catch (e) {
      setTest({ ok: false, msg: IS_PREVIEW
        ? 'Blocked in the claude.ai preview — your key is saved, and will work on your hosted link.'
        : /fetch|network|load/i.test(e.message) ? 'Couldn’t reach AeroDataBox — check your internet connection.' : e.message });
    }
  };

  const testAir = async () => {
    setAirTest({ busy: true, msg: 'Contacting ADS-B feeds…' });
    try {
      const r = await fetchAircraft(settings.aircraftSource === 'sim' ? 'auto' : settings.aircraftSource);
      setAirTest({ ok: true, msg: `${r.source}: ${r.list.length} aircraft in range` });
    } catch (e) {
      setAirTest({ ok: false, msg: IS_PREVIEW
        ? 'Blocked in the claude.ai preview — open your hosted link to get live aircraft.'
        : `No ADS-B feed answered (${e.message}). Check your internet connection, or try another source above.` });
    }
  };

  return (
    <div className="page settings">
      <div className="topbar">
        <button className="round-btn" onClick={back} aria-label="Back"><IBack /></button>
        <span className="tb-title">Settings</span>
        <span style={{ width: 44 }} />
      </div>

      <PreviewNotice />
      <section className="glass card">
        <div className="kicker orange">Data sources</div>
        <div className="src-grid">
          <div><span>Arrivals &amp; departures</span><SourceTag source={schedule.source} error={schedule.error} /></div>
          <div><span>Aircraft on map</span><SourceTag source={air.source === 'sim' ? 'sim' : 'live'} /></div>
          <div><span>Weather</span><SourceTag source={weather?.source === 'live' ? 'live' : 'sim'} /></div>
        </div>
        {schedule.error && <p className="warn-text">Flights: {schedule.error}</p>}
        {air.error && air.source === 'sim' && <p className="warn-text">Aircraft: {air.error}</p>}
        {gates.error && settings.airlabsKey && <p className="warn-text">Gates: {gates.error}</p>}
        {schedule.source !== 'sim' && <FeedCoverage flights={flights} notify={notify} />}
      </section>

      <section className="glass card">
        <div className="kicker">Live flight schedule</div>
        <p className="body">Arrivals, departures, gates and aircraft types come from <b>AeroDataBox</b>. Get a free key at <a href="https://rapidapi.com/aedbx-aedbx/api/aerodatabox" target="_blank" rel="noreferrer">rapidapi.com → AeroDataBox</a> (subscribe to the Basic plan), then paste it here.</p>
        <label className="field">
          <IKey size={18} />
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="X-RapidAPI-Key" autoComplete="off" spellCheck="false" />
        </label>
        <div className="btn-row">
          <button className="btn-primary" onClick={saveKey} disabled={test?.busy}>{settings.rapidApiKey && key === settings.rapidApiKey ? 'Test again' : 'Save & connect'}</button>
          {settings.rapidApiKey && <button className="btn-ghost" onClick={() => { setKey(''); update({ rapidApiKey: '' }); setTest(null); }}>Remove</button>}
        </div>
        {BUILT_IN_RAPIDAPI_KEY && !settings.rapidApiKey && <p className="ok-text">Using the app’s built-in key. Enter your own above to use it instead.</p>}
        {test && <p className={test.ok ? 'ok-text' : test.busy ? 'subtle' : 'warn-text'}>{test.msg}</p>}

        <div className="set-row">
          <span>Refresh schedule every</span>
          <div className="seg-mini">
            {[15, 30, 60].map((m) => <button key={m} className={settings.scheduleRefreshMin === m ? 'on' : ''} onClick={() => update({ scheduleRefreshMin: m })}>{m} min</button>)}
          </div>
        </div>
        <p className="hint left">The free AeroDataBox plan gives about 400 units a month (roughly 200 refreshes). The app only refreshes while it’s open, and the ↻ button on Flights refreshes on demand.</p>
        <button className="toggle-row" onClick={() => update({ forceDemo: !settings.forceDemo })} role="switch" aria-checked={settings.forceDemo}>
          <span>Use demo data</span><span className={'switch' + (settings.forceDemo ? ' on' : '')}><i /></span>
        </button>
      </section>

      <section className="glass card">
        <div className="kicker">Gates &amp; baggage belts</div>
        <p className="body">AeroDataBox doesn’t publish gates, belts or terminals for Hyderabad. <b>AirLabs</b> can fill them in where it has them. Create a free key at <a href="https://airlabs.co/signup" target="_blank" rel="noreferrer">airlabs.co</a> and paste it here.</p>
        <label className="field">
          <IKey size={18} />
          <input id="airlabs-key" type="password" value={alKey} onChange={(e) => setAlKey(e.target.value)} placeholder="AirLabs API key" autoComplete="off" spellCheck="false" />
        </label>
        <div className="btn-row">
          <button className="btn-primary" onClick={saveAirlabs} disabled={alTest?.busy}>Save &amp; check</button>
          {settings.airlabsKey && <button className="btn-ghost" onClick={() => { setAlKey(''); update({ airlabsKey: '' }); setAlTest(null); }}>Remove</button>}
        </div>
        {alTest && <p className={alTest.ok ? 'ok-text' : alTest.busy ? 'subtle' : 'warn-text'}>{alTest.msg}</p>}
      </section>

      <section className="glass card">
        <div className="kicker">Live aircraft map</div>
        <p className="body">Aircraft positions come from free community ADS-B receivers — no key needed.</p>
        <div className="seg-mini wrap">
          {[['auto', 'Auto'], ['adsblol', 'adsb.lol'], ['airplaneslive', 'airplanes.live'], ['opensky', 'OpenSky'], ['sim', 'Simulated']].map(([k, l]) => (
            <button key={k} className={settings.aircraftSource === k ? 'on' : ''} onClick={() => update({ aircraftSource: k })}>{l}</button>
          ))}
        </div>
        <div className="btn-row"><button className="btn-ghost" onClick={testAir}>Test connection</button></div>
        {airTest && <p className={airTest.ok ? 'ok-text' : airTest.busy ? 'subtle' : 'warn-text'}>{airTest.msg}</p>}
      </section>

      <section className="glass card">
        <div className="kicker">Install on your phone</div>
        <p className="body"><b>iPhone:</b> open in Safari → Share → <i>Add to Home Screen</i>.<br /><b>Android:</b> open in Chrome → ⋮ menu → <i>Install app</i>.</p>
      </section>

      <p className="hint">Weather: Open-Meteo &amp; NOAA Aviation Weather · Map © OpenStreetMap contributors © CARTO · Not for operational or navigational use.</p>
    </div>
  );
}

// What the flight feed actually provides for HYD right now
function FeedCoverage({ flights, notify }) {
  const now = Date.now();
  const deps = flights.filter((f) => f.dir === 'dep' && f.sched > now - 3600000);
  const arrs = flights.filter((f) => f.dir === 'arr' && f.sched > now - 3600000);
  const n = (list, k) => list.filter((f) => f[k]).length;
  const copy = async () => {
    const sample = JSON.stringify(window.__hydFeedSample || {}, null, 2);
    try { await navigator.clipboard.writeText(sample); notify('Feed sample copied — paste it to Claude'); }
    catch { notify('Couldn’t copy on this device', 'warn'); }
  };
  return (
    <div className="coverage">
      <div className="kicker" style={{ marginTop: 14 }}>What the feed includes</div>
      <div className="cov-row"><span>Departure gates</span><b className="mono">{n(deps, 'gate')} / {deps.length}</b></div>
      <div className="cov-row"><span>Check-in counters</span><b className="mono">{n(deps, 'checkIn')} / {deps.length}</b></div>
      <div className="cov-row"><span>Arrival gates</span><b className="mono">{n(arrs, 'gate')} / {arrs.length}</b></div>
      <div className="cov-row"><span>Baggage belts</span><b className="mono">{n(arrs, 'belt')} / {arrs.length}</b></div>
      <div className="cov-row"><span>Aircraft type</span><b className="mono">{n(deps.concat(arrs), 'aircraft')} / {deps.length + arrs.length}</b></div>
      <div className="btn-row"><button className="btn-ghost" onClick={copy}>Copy feed sample</button></div>
    </div>
  );
}
