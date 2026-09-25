// Soft 3D-ish weather illustrations with gentle motion
export default function WeatherIcon({ kind = 'sun', size = 48, animated = false }) {
  const a = animated ? ' wx-anim' : '';
  const sun = (cx, cy, r, rays = true) => (
    <g className={'wx-sun' + a} style={{ transformOrigin: `${cx}px ${cy}px` }}>
      {rays && Array.from({ length: 8 }, (_, i) => {
        const ang = (i * Math.PI) / 4;
        return <line key={i} x1={cx + Math.cos(ang) * (r + 4)} y1={cy + Math.sin(ang) * (r + 4)} x2={cx + Math.cos(ang) * (r + 8)} y2={cy + Math.sin(ang) * (r + 8)} stroke="#F7A541" strokeWidth="2.6" strokeLinecap="round" />;
      })}
      <circle cx={cx} cy={cy} r={r} fill="url(#wxSun)" />
    </g>
  );
  const cloud = (dx = 0, dy = 0, s = 1, dark = false) => (
    <g className={'wx-cloud' + a} transform={`translate(${dx} ${dy}) scale(${s})`}>
      <path d="M18 52h34a12 12 0 0 0 1.2-23.9A16 16 0 0 0 22.4 25 13.5 13.5 0 0 0 18 52z" fill={dark ? 'url(#wxCloudDark)' : 'url(#wxCloud)'} />
    </g>
  );
  return (
    <svg viewBox="0 0 72 72" width={size} height={size} aria-hidden="true" className="wx-icon">
      <defs>
        <radialGradient id="wxSun" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#FFD36B" /><stop offset="1" stopColor="#F59E2E" /></radialGradient>
        <linearGradient id="wxCloud" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#D5DDF0" /></linearGradient>
        <linearGradient id="wxCloudDark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#B7C1DB" /><stop offset="1" stopColor="#7E8AAB" /></linearGradient>
        <radialGradient id="wxMoon" cx="35%" cy="35%" r="70%"><stop offset="0" stopColor="#FFF6D8" /><stop offset="1" stopColor="#E9D29A" /></radialGradient>
      </defs>
      {kind === 'sun' && sun(36, 36, 15)}
      {kind === 'moon' && <path d="M44 14a20 20 0 1 0 14 34A16 16 0 0 1 44 14z" fill="url(#wxMoon)" />}
      {kind === 'partly' && <>{sun(27, 26, 12)}{cloud(4, 6, 0.95)}</>}
      {kind === 'partly-night' && <><path d="M34 10a14 14 0 1 0 10 24A11 11 0 0 1 34 10z" fill="url(#wxMoon)" />{cloud(4, 8, 0.95)}</>}
      {kind === 'cloud' && <>{cloud(10, -4, 0.8, true)}{cloud(2, 6, 0.95)}</>}
      {kind === 'fog' && <>{cloud(2, -2, 0.95)}<g stroke="#C9D2EA" strokeWidth="3" strokeLinecap="round"><line x1="14" y1="58" x2="52" y2="58" /><line x1="20" y1="65" x2="58" y2="65" /></g></>}
      {kind === 'rain' && <>{cloud(2, -2, 0.95, true)}<g className={'wx-rain' + a} stroke="#7FB5FF" strokeWidth="2.6" strokeLinecap="round"><line x1="24" y1="56" x2="21" y2="64" /><line x1="36" y1="56" x2="33" y2="64" /><line x1="48" y1="56" x2="45" y2="64" /></g></>}
      {kind === 'storm' && <>{cloud(2, -4, 0.95, true)}<path className={'wx-bolt' + a} d="M37 48 29 60h7l-3 10 11-14h-7l4-8z" fill="#FFD34D" /><g stroke="#7FB5FF" strokeWidth="2.4" strokeLinecap="round"><line x1="22" y1="54" x2="19" y2="61" /><line x1="52" y1="54" x2="49" y2="61" /></g></>}
    </svg>
  );
}
