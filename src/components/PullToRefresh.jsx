import { useEffect, useRef, useState } from 'react';
import { haptic } from '../lib/util.js';
import { IRefresh } from './Icons.jsx';

const TRIGGER = 72; // px of pull needed to refresh
const MAX = 120;

// Wraps a scroll container: pulling down from the very top shows a spinner and runs onRefresh
export default function PullToRefresh({ onRefresh, disabled, children, className, ...rest }) {
  const ref = useRef(null);
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const st = useRef({ y0: null, active: false, armed: false });

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled) return;
    const start = (e) => {
      if (busy || el.scrollTop > 0 || e.touches.length !== 1) { st.current.y0 = null; return; }
      st.current = { y0: e.touches[0].clientY, active: false, armed: false };
    };
    const move = (e) => {
      const s = st.current;
      if (s.y0 == null) return;
      const dy = e.touches[0].clientY - s.y0;
      if (dy <= 0 || el.scrollTop > 0) { if (s.active) { s.active = false; setPull(0); } return; }
      s.active = true;
      if (e.cancelable) e.preventDefault(); // stop the page bouncing while we pull
      const d = Math.min(MAX, dy * 0.5); // rubber-band resistance
      if (!s.armed && d >= TRIGGER) { s.armed = true; haptic(10); }
      if (s.armed && d < TRIGGER) s.armed = false;
      setPull(d);
    };
    const end = async () => {
      const s = st.current;
      st.current = { y0: null, active: false, armed: false };
      if (!s.active) return;
      if (s.armed) {
        setBusy(true); setPull(TRIGGER * 0.8);
        try { await onRefresh(); } finally {
          await new Promise((r) => setTimeout(r, 350));
          setBusy(false); setPull(0);
        }
      } else setPull(0);
    };
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    return () => {
      el.removeEventListener('touchstart', start);
      el.removeEventListener('touchmove', move);
      el.removeEventListener('touchend', end);
      el.removeEventListener('touchcancel', end);
    };
  }, [onRefresh, disabled, busy]);

  const progress = Math.min(1, pull / TRIGGER);
  const settling = !st.current.active;
  return (
    <main ref={ref} className={className} {...rest}>
      {!disabled && (
        <div className={'ptr' + (busy ? ' busy' : '') + (progress >= 1 ? ' armed' : '')} aria-hidden={!busy && !pull}
          style={{ transform: `translate(-50%, ${pull - 56}px)`, opacity: Math.min(1, pull / 30), transition: settling ? 'transform .3s cubic-bezier(.2,.9,.3,1.1), opacity .3s' : 'none' }}>
          <span className="ptr-ico" style={{ transform: busy ? undefined : `rotate(${progress * 270}deg)` }}><IRefresh size={20} sw={2.2} /></span>
        </div>
      )}
      <div className="ptr-content" style={{ transform: pull ? `translateY(${pull * 0.6}px)` : undefined, transition: settling ? 'transform .3s cubic-bezier(.2,.9,.3,1.1)' : 'none' }}>
        {children}
      </div>
      {busy && <span className="sr-only" role="status">Refreshing</span>}
    </main>
  );
}
