// Departures / Arrivals tabs: domestic + international boards that page automatically
// (like the broadcast screen) instead of one long scrolling list, plus the quiet-hours hero
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { remarkOf, estOf } from '../lib/broadcast.js';
import { effTime } from '../lib/flights.js';
import { hhmm } from '../lib/util.js';
import { go } from '../lib/nav.js';
import { useT, useLang, cityName, pageLabel } from '../lib/i18n.js';
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

// Fixed sizes (px) the pager uses to work out how many rows fit on screen — keep in sync with phone.css
const ROW_H = 80, BOARD_CHROME = 44 + 34 + 4, GAP = 10;
const PAGE_MS = 8000, MAX_PAGES = 10;

// Height of an element, kept up to date
function useHeight() {
  const ref = useRef(null);
  const [h, setH] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setH(el.clientHeight));
    ro.observe(el);
    setH(el.clientHeight);
    return () => ro.disconnect();
  }, []);
  return [ref, h];
}

// Auto-advancing pages. pagesFor(height) says how many pages the content needs at the
// measured height of boxRef; resetKey restarts at page 1.
export function usePager(pagesFor, resetKey) {
  const [boxRef, h] = useHeight();
  const pages = h ? Math.min(MAX_PAGES, Math.max(1, pagesFor(h))) : 1;
  const [page, setPage] = useState(0);
  const [tick, setTick] = useState(0);
  useEffect(() => { setPage(0); }, [resetKey]);
  useEffect(() => {
    if (pages < 2) return;
    const id = setTimeout(() => { setPage((p) => (p + 1) % pages); setTick((x) => x + 1); }, PAGE_MS);
    return () => clearTimeout(id);
  }, [page, pages, tick]);
  const go = (i) => { setPage(i); setTick((x) => x + 1); };
  return { boxRef, h, pages, page: page % pages, tick, go, resetKey };
}

// Progress bar + "Page 1 of 3" + dots (tap a dot to jump)
export function Pager({ page, pages, tick, go, resetKey }) {
  const t = useT();
  const lang = useLang();
  return (
    <div className="ph-pager">
      <span className="php-bar"><i key={`${resetKey}-${page}-${tick}`} style={{ animationDuration: pages > 1 ? PAGE_MS + 'ms' : '0ms' }} className={pages > 1 ? '' : 'full'} /></span>
      <span className="php-label">{pageLabel(page + 1, pages, lang)}</span>
      <span className="php-dots">
        {Array.from({ length: pages }, (_, i) => (
          <button key={i} className={i === page ? 'on' : ''} onClick={() => go(i)} aria-label={`${t('Page')} ${i + 1}`} />
        ))}
      </span>
    </div>
  );
}

export default function Boards({ dir, lists, scope, setScope, quiet, stale, now }) {
  const both = scope === 'all';
  // Rows per page: split the space 60/40 between domestic and international when both show
  const split = (h) => {
    if (both) {
      const total = Math.max(2, Math.floor((h - 2 * BOARD_CHROME - GAP) / ROW_H));
      const dom = Math.max(1, Math.round(total * 0.6));
      return { dom, intl: Math.max(1, total - dom) };
    }
    const per = Math.max(1, Math.floor((h - BOARD_CHROME) / ROW_H));
    return scope === 'dom' ? { dom: per, intl: 0 } : { dom: 0, intl: per };
  };
  const pagesOf = (rows, n) => (n ? Math.min(MAX_PAGES, Math.max(1, Math.ceil(rows.length / n))) : 1);
  const pagesAt = (hh) => {
    const n = split(hh);
    return Math.max(scope !== 'intl' ? pagesOf(lists.dom, n.dom) : 1, scope !== 'dom' ? pagesOf(lists.intl, n.intl) : 1);
  };
  const pager = usePager(pagesAt, `${dir}-${scope}`);
  const h = pager.h;
  const per = h ? split(h) : { dom: 0, intl: 0 };
  const domPages = pagesOf(lists.dom, per.dom), intlPages = pagesOf(lists.intl, per.intl);

  return (
    <div className="ph-page fit">
      <ScopeChips scope={scope} setScope={setScope} />
      {dir === 'dep' && quiet && <QuietHero lists={lists} stale={stale} now={now} />}
      <Pager {...pager} />
      <div className="ph-boards" ref={pager.boxRef}>
        {h > 0 && scope !== 'intl' && <Board kind="dom" dir={dir} rows={lists.dom} per={per.dom} page={pager.page % domPages} pages={domPages} />}
        {h > 0 && scope !== 'dom' && <Board kind="intl" dir={dir} rows={lists.intl} per={per.intl} page={pager.page % intlPages} pages={intlPages} />}
      </div>
    </div>
  );
}

function Board({ kind, dir, rows, per, page, pages }) {
  const t = useT();
  const shown = rows.slice(page * per, page * per + per);
  const title = `${kind === 'dom' ? 'Domestic' : 'International'} ${dir === 'dep' ? 'departures' : 'arrivals'}`;
  return (
    <section className={'ph-board ' + kind} style={{ height: BOARD_CHROME + per * ROW_H }}>
      <div className="phb-banner">
        {kind === 'dom' ? (dir === 'dep' ? <ITakeoff size={22} sw={2.3} /> : <ILanding size={22} sw={2.3} />) : <IGlobe />}
        <span>{t(title)}</span>
        {pages > 1 && <small>{page + 1}/{pages}</small>}
        <em>{rows.length}</em>
      </div>
      <div className="phb-head">
        <span>{t('Sched')}<br />{t('Est')}</span>
        <span>{t(dir === 'dep' ? 'Flight · destination' : 'Flight · from')}</span>
        <span>{t(dir === 'dep' ? 'Gate' : 'Belt')}</span>
      </div>
      <div className="phb-rows" key={page}>
        {shown.map((f) => <Row key={f.id} f={f} dir={dir} />)}
      </div>
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
