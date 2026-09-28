// Visual pieces shared by the TV broadcast and the phone app
import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

// Wind arrow (points where the wind blows TO) over the runway in use
export function WindCompass({ dir, rwyHdg, size = 190 }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className="wcmp" aria-label={`Wind from ${dir} degrees`}>
      <circle cx="60" cy="60" r="54" className="wcmp-ring" />
      {['N', 'E', 'S', 'W'].map((t, i) => {
        const a = (i * Math.PI) / 2;
        return <text key={t} x={60 + Math.sin(a) * 45} y={60 - Math.cos(a) * 45 + 4} textAnchor="middle" className="wcmp-t">{t}</text>;
      })}
      <g transform={`rotate(${rwyHdg - 90} 60 60)`}>
        <rect x="34" y="56" width="52" height="8" rx="2" className="wcmp-rwy" />
        <line x1="38" y1="60" x2="82" y2="60" className="wcmp-cl" />
      </g>
      <g transform={`rotate(${dir + 180} 60 60)`}>
        <line x1="60" y1="94" x2="60" y2="24" className="wcmp-arrow" />
        <path d="M51 30 60 14 69 30z" className="wcmp-head" />
      </g>
    </svg>
  );
}

// QR code as crisp SVG squares
export function QrCode({ text, size = 200 }) {
  const cells = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    const rects = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) rects.push(`M${c} ${r}h1v1h-1z`);
    return { n, d: rects.join('') };
  }, [text]);
  return (
    <svg viewBox={`-2 -2 ${cells.n + 4} ${cells.n + 4}`} width={size} height={size} shapeRendering="crispEdges" aria-label="QR code">
      <rect x="-2" y="-2" width={cells.n + 4} height={cells.n + 4} fill="#fff" />
      <path d={cells.d} fill="#0B1033" />
    </svg>
  );
}

// Where the phone version of this site lives (same host, home route)
export const phoneUrl = () => `${location.origin}${location.pathname}#/`;
