// Minimal line-icon set (24px grid, currentColor)
const P = (d, extra) => (props) => (
  <svg viewBox="0 0 24 24" width={props.size || 22} height={props.size || 22} fill="none" stroke="currentColor"
    strokeWidth={props.sw || 1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...extra} style={props.style} className={props.className}>
    {d}
  </svg>
);

export const IHome = P(<><path d="M3.5 10.5 12 4l8.5 6.5" /><path d="M5.5 9v10.5h13V9" /><path d="M10 19.5v-5h4v5" /></>);
export const IPlane = P(<path d="M21 15.5v-1.7l-7.5-4.6V4.3a1.5 1.5 0 0 0-3 0v4.9L3 13.8v1.7l7.5-2.3v4.9l-2 1.5v1.3L12 20l3.5.9v-1.3l-2-1.5v-4.9z" />);
export const IBoard = P(<><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><path d="M7 9h10M7 12h10M7 15h6" /></>);
export const IMap = P(<><path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2z" /><path d="M9 4.5v13M15 6.5v13" /></>);
export const ICloud = P(<path d="M7.5 18.5h9.5a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 7 9.6 4.5 4.5 0 0 0 7.5 18.5z" />);
export const ISearch = P(<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>);
export const IBack = P(<path d="M15 5l-7 7 7 7" />);
export const IChevron = P(<path d="M9 5l7 7-7 7" />);
export const IBell = P(<><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>);
export const IBellOn = P(<><path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 1.5h-15z" fill="currentColor" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>);
export const IShare = P(<><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8" /><path d="M5 12.5v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></>);
export const IGear = P(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>);
export const IPlus = P(<path d="M12 5v14M5 12h14" />);
export const IMinus = P(<path d="M5 12h14" />);
export const ILocate = P(<><circle cx="12" cy="12" r="4" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" /></>);
export const ILayers = P(<><path d="m12 3.5 9 5-9 5-9-5z" /><path d="m3 13.5 9 5 9-5" /></>);
export const IBolt = P(<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z" />);
export const IRefresh = P(<><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" /><path d="M4 3.5V8h4.5" /><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" /><path d="M20 20.5V16h-4.5" /></>);
export const IX = P(<path d="M6 6l12 12M18 6 6 18" />);
export const IWind = P(<path d="M3 8.5h11a2.5 2.5 0 1 0-2.5-2.5M3 12.5h16a2.5 2.5 0 1 1-2.5 2.5M3 16.5h8" />);
export const IEye = P(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>);
export const IDrop = P(<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z" />);
export const IGauge = P(<><path d="M4 16a8 8 0 1 1 16 0" /><path d="m12 16 4-5" /></>);
export const ISunrise = P(<><path d="M5 17a7 7 0 0 1 14 0" /><path d="M3 20.5h18M12 3.5v4M9.5 6 12 3.5 14.5 6M4.2 10.2l1.5 1.3M19.8 10.2l-1.5 1.3" /></>);
export const IBag = P(<><rect x="4.5" y="7.5" width="15" height="12" rx="2.5" /><path d="M9 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5v2" /></>);
export const IKey = P(<><circle cx="8" cy="15" r="4" /><path d="m11 12 9-9M16 7l2.5 2.5M14 9l2 2" /></>);

export const ITakeoff = P(<><path d="M3 20.5h18" /><path d="m4.5 14.5 3.6 1.2c.6.2 1.2.1 1.7-.2L20 10.3a1.6 1.6 0 0 0-1.6-2.8l-3.3 1.6-5.5-3.4-1.8.9 3.2 4-3.3 1.6-2.3-1.3-1.4.7z" /></>);
export const ILanding = P(<><path d="M3 20.5h18" /><path d="m3.8 7.4 1.3-.9 2.3 1.4.4-3.9 1.8-.6 2.2 5.7 3.4 1.3a1.6 1.6 0 0 1-.9 3L7 11.7a2.3 2.3 0 0 1-1.4-1z" /></>);

// Filled top-down aircraft silhouette used on the map (points "up" = north)
export function PlaneGlyph({ size = 26, color = '#fff', body = 'narrow' }) {
  const wide = body === 'wide' || body === 'jumbo';
  const prop = body === 'turboprop' || body === 'light';
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <g fill={color} stroke="rgba(5,10,30,.55)" strokeWidth=".8" strokeLinejoin="round">
        {prop ? (
          <path d="M15 3.5c0-1 2-1 2 0v8.5l12 1.7v2.3l-12-.5v7.5l3.2 2.2V27l-4.2-1-4.2 1v-1.8L15 23V15.5l-12 .5v-2.3l12-1.7z" />
        ) : (
          <path d={wide
            ? 'M14.6 3.2c.3-2 2.5-2 2.8 0l.4 8.6 12.2 6.6v2.5l-12.4-3.6-.3 6.9 3.5 2.6v2l-4.8-1.3-4.8 1.3v-2l3.5-2.6-.3-6.9L2 20.9v-2.5l12.2-6.6z'
            : 'M15 3.5c.2-1.8 1.8-1.8 2 0l.4 8.8 11 6.3v2.2l-11.2-3.3-.3 6.8 3 2.3V28.5L16 27.3l-3.9 1.2v-1.9l3-2.3-.3-6.8L3.6 20.8v-2.2l11-6.3z'} />
        )}
      </g>
    </svg>
  );
}
