// Hands-free scene rotation shared by the TV broadcast and the phone view.
// build(d, n) returns the scenes for cycle n: [{ type, dur (s), key, ... }].
// New cancellations, diversions and gate changes interrupt as 'breaking' scenes.
// Each scene is English for its first half and Telugu for its second (langMode 'both').
import { useEffect, useRef, useState } from 'react';

export const URGENT = new Set(['cancelled', 'diverted', 'gate']);

// Seconds each scene stays up (half English, half Telugu). Flight boards need the most reading
// time; alerts, weather and info are quick to take in.
export const DUR = { board: 12, delays: 10, alerts: 10, quiet: 10, breaking: 8, weather: 8, info: 8 };

export function useSceneRotation(d, build, now, { langMode = 'both', breakingDur = DUR.breaking } = {}) {
  const buildRef = useRef(build);
  buildRef.current = build;
  const dRef = useRef(d);
  dRef.current = d;
  const [rot, setRot] = useState(() => ({ n: 0, idx: 0, scenes: build(d, 0), started: Date.now() }));

  const scene = rot.scenes[rot.idx] || rot.scenes[0];
  useEffect(() => {
    const id = setTimeout(() => setRot((r) => {
      if (r.idx + 1 < r.scenes.length) return { ...r, idx: r.idx + 1, started: Date.now() };
      return { n: r.n + 1, idx: 0, scenes: buildRef.current(dRef.current, r.n + 1), started: Date.now() };
    }), scene.dur * 1000);
    return () => clearTimeout(id);
  }, [rot.idx, rot.n, scene.dur]);

  // New urgent alerts jump the queue
  const seen = useRef(null);
  useEffect(() => {
    const urgent = d.alerts.filter((a) => URGENT.has(a.kind));
    if (!seen.current) { seen.current = new Set(urgent.map((a) => a.id)); return; }
    const fresh = urgent.filter((a) => !seen.current.has(a.id));
    fresh.forEach((a) => seen.current.add(a.id));
    if (!fresh.length) return;
    setRot((r) => {
      const ins = fresh.map((a, i) => ({ type: 'breaking', alertId: a.id, dur: breakingDur, key: `u-${a.id}-${Date.now()}-${i}` }));
      return { ...r, scenes: [...r.scenes.slice(0, r.idx + 1), ...ins, ...r.scenes.slice(r.idx + 1)] };
    });
  }, [d.alerts, breakingDur]);

  // A breaking alert that has since cleared: move on
  const breakingAlert = scene.type === 'breaking' ? d.alerts.find((a) => a.id === scene.alertId) : null;
  useEffect(() => {
    if (scene.type === 'breaking' && !breakingAlert) setRot((r) => (r.idx + 1 < r.scenes.length ? { ...r, idx: r.idx + 1, started: Date.now() } : r));
  }, [scene.type, breakingAlert]);

  const elapsed = Math.max(0, (now - rot.started) / 1000);
  return {
    scene,
    next: rot.scenes[rot.idx + 1],
    elapsed,
    left: Math.max(0, Math.ceil(scene.dur - elapsed)),
    lang: langMode === 'both' ? (elapsed < scene.dur / 2 ? 'en' : 'te') : langMode,
    breakingAlert,
  };
}
