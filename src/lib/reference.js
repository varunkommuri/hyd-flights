// Reference data: airlines, airports, aircraft types
export const AIRLINES = {
  '6E': { icao: 'IGO', name: 'IndiGo', color: '#3346C8' },
  AI: { icao: 'AIC', name: 'Air India', color: '#C4283F' },
  IX: { icao: 'AXB', name: 'Air India Express', color: '#D4531F' },
  QP: { icao: 'AKJ', name: 'Akasa Air', color: '#EA6A20' },
  SG: { icao: 'SEJ', name: 'SpiceJet', color: '#D91F33' },
  '9I': { icao: 'LLR', name: 'Alliance Air', color: '#B8323A' },
  S5: { icao: 'SDG', name: 'Star Air', color: '#1F4E9A' },
  EK: { icao: 'UAE', name: 'Emirates', color: '#B51F2E' },
  QR: { icao: 'QTR', name: 'Qatar Airways', color: '#6B1639' },
  EY: { icao: 'ETD', name: 'Etihad', color: '#A7812F' },
  SQ: { icao: 'SIA', name: 'Singapore Airlines', color: '#1D3C78' },
  G9: { icao: 'ABY', name: 'Air Arabia', color: '#C8102E' },
  FZ: { icao: 'FDB', name: 'flydubai', color: '#1B5AA6' },
  WY: { icao: 'OMA', name: 'Oman Air', color: '#8C6B2F' },
  SV: { icao: 'SVA', name: 'Saudia', color: '#0E6B4F' },
  GF: { icao: 'GFA', name: 'Gulf Air', color: '#8A6D2C' },
  KU: { icao: 'KAC', name: 'Kuwait Airways', color: '#1F4C8F' },
  TG: { icao: 'THA', name: 'Thai Airways', color: '#5B2A86' },
  MH: { icao: 'MAS', name: 'Malaysia Airlines', color: '#0B3C7A' },
  BA: { icao: 'BAW', name: 'British Airways', color: '#1E3A8A' },
  LH: { icao: 'DLH', name: 'Lufthansa', color: '#0A1D3D' },
  UL: { icao: 'ALK', name: 'SriLankan', color: '#1C3F94' },
  '3L': { icao: 'ADY', name: 'Air Arabia Abu Dhabi', color: '#C8102E' },
  CX: { icao: 'CPA', name: 'Cathay Pacific', color: '#006564' },
  FX: { icao: 'FDX', name: 'FedEx', color: '#4D148C' },
  '5X': { icao: 'UPS', name: 'UPS', color: '#5A3A1F' },
  BZ: { icao: 'BDA', name: 'Blue Dart', color: '#1D4F91' },
};

const ICAO_TO_IATA = Object.fromEntries(Object.entries(AIRLINES).map(([k, v]) => [v.icao, k]));

export function airlineInfo(iata, fallbackName) {
  const a = AIRLINES[iata];
  if (a) return { iata, ...a };
  let h = 0;
  for (const c of iata || '?') h = (h * 31 + c.charCodeAt(0)) % 360;
  return { iata: iata || '??', icao: '', name: fallbackName || iata || 'Unknown', color: `hsl(${h} 55% 42%)` };
}

// "IGO6021" -> "6E 6021"
export function callsignToFlight(cs) {
  if (!cs) return null;
  const m = cs.trim().toUpperCase().match(/^([A-Z]{3})(\d+[A-Z]?)$/);
  if (!m) return null;
  const iata = ICAO_TO_IATA[m[1]];
  return iata ? `${iata} ${m[2].replace(/^0+/, '')}` : null;
}

// Airports served from HYD (coords for route drawing + tz offset in minutes)
export const AIRPORTS = {
  HYD: { city: 'Hyderabad', lat: 17.2403, lon: 78.4294, tz: 330, country: 'IN' },
  DEL: { city: 'Delhi', lat: 28.5562, lon: 77.1, tz: 330, country: 'IN' },
  BOM: { city: 'Mumbai', lat: 19.0896, lon: 72.8656, tz: 330, country: 'IN' },
  BLR: { city: 'Bengaluru', lat: 13.1986, lon: 77.7066, tz: 330, country: 'IN' },
  MAA: { city: 'Chennai', lat: 12.9941, lon: 80.1709, tz: 330, country: 'IN' },
  CCU: { city: 'Kolkata', lat: 22.6547, lon: 88.4467, tz: 330, country: 'IN' },
  COK: { city: 'Kochi', lat: 10.152, lon: 76.4019, tz: 330, country: 'IN' },
  GOX: { city: 'Goa', lat: 15.7303, lon: 73.8636, tz: 330, country: 'IN' },
  PNQ: { city: 'Pune', lat: 18.5821, lon: 73.9197, tz: 330, country: 'IN' },
  AMD: { city: 'Ahmedabad', lat: 23.0772, lon: 72.6347, tz: 330, country: 'IN' },
  JAI: { city: 'Jaipur', lat: 26.8242, lon: 75.8122, tz: 330, country: 'IN' },
  TIR: { city: 'Tirupati', lat: 13.6325, lon: 79.5433, tz: 330, country: 'IN' },
  VTZ: { city: 'Visakhapatnam', lat: 17.7212, lon: 83.2245, tz: 330, country: 'IN' },
  LKO: { city: 'Lucknow', lat: 26.7606, lon: 80.8893, tz: 330, country: 'IN' },
  BBI: { city: 'Bhubaneswar', lat: 20.2444, lon: 85.8178, tz: 330, country: 'IN' },
  NAG: { city: 'Nagpur', lat: 21.0922, lon: 79.0472, tz: 330, country: 'IN' },
  VGA: { city: 'Vijayawada', lat: 16.5304, lon: 80.7968, tz: 330, country: 'IN' },
  IXE: { city: 'Mangaluru', lat: 12.9613, lon: 74.8901, tz: 330, country: 'IN' },
  TRV: { city: 'Thiruvananthapuram', lat: 8.4821, lon: 76.9201, tz: 330, country: 'IN' },
  GAU: { city: 'Guwahati', lat: 26.1061, lon: 91.5859, tz: 330, country: 'IN' },
  DXB: { city: 'Dubai', lat: 25.2532, lon: 55.3657, tz: 240, country: 'AE' },
  AUH: { city: 'Abu Dhabi', lat: 24.433, lon: 54.6511, tz: 240, country: 'AE' },
  SHJ: { city: 'Sharjah', lat: 25.3286, lon: 55.5172, tz: 240, country: 'AE' },
  DOH: { city: 'Doha', lat: 25.2731, lon: 51.6081, tz: 180, country: 'QA' },
  MCT: { city: 'Muscat', lat: 23.5933, lon: 58.2844, tz: 240, country: 'OM' },
  JED: { city: 'Jeddah', lat: 21.6796, lon: 39.1565, tz: 180, country: 'SA' },
  RUH: { city: 'Riyadh', lat: 24.9576, lon: 46.6988, tz: 180, country: 'SA' },
  KWI: { city: 'Kuwait', lat: 29.2266, lon: 47.9689, tz: 180, country: 'KW' },
  BAH: { city: 'Bahrain', lat: 26.2708, lon: 50.6336, tz: 180, country: 'BH' },
  SIN: { city: 'Singapore', lat: 1.3644, lon: 103.9915, tz: 480, country: 'SG' },
  BKK: { city: 'Bangkok', lat: 13.69, lon: 100.7501, tz: 420, country: 'TH' },
  KUL: { city: 'Kuala Lumpur', lat: 2.7456, lon: 101.7099, tz: 480, country: 'MY' },
  CMB: { city: 'Colombo', lat: 7.1808, lon: 79.8841, tz: 330, country: 'LK' },
  LHR: { city: 'London', lat: 51.47, lon: -0.4543, tz: 60, country: 'GB' },
  FRA: { city: 'Frankfurt', lat: 50.0379, lon: 8.5622, tz: 120, country: 'DE' },
  HKG: { city: 'Hong Kong', lat: 22.308, lon: 113.9185, tz: 480, country: 'HK' },
};

// Aircraft types keyed by ICAO designator
export const AIRCRAFT = {
  A20N: { name: 'Airbus A320neo', maker: 'Airbus', short: 'A320neo', body: 'narrow', seats: '180–186', engines: '2 × CFM LEAP-1A / PW1100G', range: '6,300 km' },
  A21N: { name: 'Airbus A321neo', maker: 'Airbus', short: 'A321neo', body: 'narrow', seats: '222–232', engines: '2 × CFM LEAP-1A / PW1100G', range: '7,400 km' },
  A320: { name: 'Airbus A320', maker: 'Airbus', short: 'A320', body: 'narrow', seats: '162–180', engines: '2 × CFM56 / V2500', range: '6,100 km' },
  A321: { name: 'Airbus A321', maker: 'Airbus', short: 'A321', body: 'narrow', seats: '185–220', engines: '2 × CFM56 / V2500', range: '5,900 km' },
  A319: { name: 'Airbus A319', maker: 'Airbus', short: 'A319', body: 'narrow', seats: '124–144', engines: '2 × CFM56 / V2500', range: '6,900 km' },
  A332: { name: 'Airbus A330-200', maker: 'Airbus', short: 'A330-200', body: 'wide', seats: '246–300', engines: '2 × Trent 700 / CF6', range: '13,400 km' },
  A333: { name: 'Airbus A330-300', maker: 'Airbus', short: 'A330-300', body: 'wide', seats: '277–335', engines: '2 × Trent 700 / CF6', range: '11,750 km' },
  A339: { name: 'Airbus A330-900neo', maker: 'Airbus', short: 'A330neo', body: 'wide', seats: '260–300', engines: '2 × Trent 7000', range: '13,300 km' },
  A359: { name: 'Airbus A350-900', maker: 'Airbus', short: 'A350-900', body: 'wide', seats: '300–325', engines: '2 × Trent XWB-84', range: '15,000 km' },
  A35K: { name: 'Airbus A350-1000', maker: 'Airbus', short: 'A350-1000', body: 'wide', seats: '350–410', engines: '2 × Trent XWB-97', range: '16,100 km' },
  A388: { name: 'Airbus A380', maker: 'Airbus', short: 'A380', body: 'jumbo', seats: '489–615', engines: '4 × GP7200 / Trent 900', range: '15,000 km' },
  B738: { name: 'Boeing 737-800', maker: 'Boeing', short: '737-800', body: 'narrow', seats: '162–189', engines: '2 × CFM56-7B', range: '5,400 km' },
  B38M: { name: 'Boeing 737 MAX 8', maker: 'Boeing', short: '737 MAX 8', body: 'narrow', seats: '162–197', engines: '2 × CFM LEAP-1B', range: '6,500 km' },
  B737: { name: 'Boeing 737-700', maker: 'Boeing', short: '737-700', body: 'narrow', seats: '126–149', engines: '2 × CFM56-7B', range: '6,000 km' },
  B39M: { name: 'Boeing 737 MAX 9', maker: 'Boeing', short: '737 MAX 9', body: 'narrow', seats: '178–220', engines: '2 × CFM LEAP-1B', range: '6,100 km' },
  B77W: { name: 'Boeing 777-300ER', maker: 'Boeing', short: '777-300ER', body: 'wide', seats: '354–396', engines: '2 × GE90-115B', range: '13,650 km' },
  B772: { name: 'Boeing 777-200', maker: 'Boeing', short: '777-200', body: 'wide', seats: '305–320', engines: '2 × GE90 / PW4000', range: '9,700 km' },
  B77L: { name: 'Boeing 777-200LR', maker: 'Boeing', short: '777-200LR', body: 'wide', seats: '300–320', engines: '2 × GE90-110B', range: '15,800 km' },
  B788: { name: 'Boeing 787-8 Dreamliner', maker: 'Boeing', short: '787-8', body: 'wide', seats: '242–256', engines: '2 × GEnx-1B / Trent 1000', range: '13,600 km' },
  B789: { name: 'Boeing 787-9 Dreamliner', maker: 'Boeing', short: '787-9', body: 'wide', seats: '290–296', engines: '2 × GEnx-1B / Trent 1000', range: '14,000 km' },
  B78X: { name: 'Boeing 787-10 Dreamliner', maker: 'Boeing', short: '787-10', body: 'wide', seats: '318–336', engines: '2 × GEnx-1B / Trent 1000', range: '11,900 km' },
  B744: { name: 'Boeing 747-400', maker: 'Boeing', short: '747-400', body: 'jumbo', seats: '416–524', engines: '4 × CF6 / PW4000 / RB211', range: '13,450 km' },
  B748: { name: 'Boeing 747-8', maker: 'Boeing', short: '747-8', body: 'jumbo', seats: '410–467', engines: '4 × GEnx-2B', range: '14,300 km' },
  B763: { name: 'Boeing 767-300', maker: 'Boeing', short: '767-300', body: 'wide', seats: '218–269', engines: '2 × CF6 / PW4000', range: '11,000 km' },
  AT76: { name: 'ATR 72-600', maker: 'ATR', short: 'ATR 72-600', body: 'turboprop', seats: '70–78', engines: '2 × PW127M', range: '1,400 km' },
  AT75: { name: 'ATR 72-500', maker: 'ATR', short: 'ATR 72-500', body: 'turboprop', seats: '68–74', engines: '2 × PW127F', range: '1,500 km' },
  AT72: { name: 'ATR 72', maker: 'ATR', short: 'ATR 72', body: 'turboprop', seats: '68–74', engines: '2 × PW127', range: '1,500 km' },
  DH8D: { name: 'De Havilland Dash 8-400', maker: 'De Havilland', short: 'Q400', body: 'turboprop', seats: '78–90', engines: '2 × PW150A', range: '2,000 km' },
  E190: { name: 'Embraer E190', maker: 'Embraer', short: 'E190', body: 'regional', seats: '96–114', engines: '2 × CF34-10E', range: '4,500 km' },
  E195: { name: 'Embraer E195', maker: 'Embraer', short: 'E195', body: 'regional', seats: '100–124', engines: '2 × CF34-10E', range: '4,200 km' },
  E75L: { name: 'Embraer E175', maker: 'Embraer', short: 'E175', body: 'regional', seats: '76–88', engines: '2 × CF34-8E', range: '3,700 km' },
  CRJ9: { name: 'Bombardier CRJ900', maker: 'Bombardier', short: 'CRJ900', body: 'regional', seats: '76–90', engines: '2 × CF34-8C', range: '2,900 km' },
  A306: { name: 'Airbus A300-600F', maker: 'Airbus', short: 'A300F', body: 'wide', seats: 'Freighter', engines: '2 × CF6-80C2', range: '4,850 km' },
  B752: { name: 'Boeing 757-200', maker: 'Boeing', short: '757-200', body: 'narrow', seats: '200–239', engines: '2 × RB211 / PW2000', range: '7,200 km' },
  C208: { name: 'Cessna 208 Caravan', maker: 'Cessna', short: 'Caravan', body: 'light', seats: '9–13', engines: '1 × PT6A', range: '1,700 km' },
  PC12: { name: 'Pilatus PC-12', maker: 'Pilatus', short: 'PC-12', body: 'light', seats: '6–9', engines: '1 × PT6A', range: '3,400 km' },
  C56X: { name: 'Cessna Citation Excel', maker: 'Cessna', short: 'Citation XLS', body: 'bizjet', seats: '8–10', engines: '2 × PW545', range: '3,700 km' },
  GLF6: { name: 'Gulfstream G650', maker: 'Gulfstream', short: 'G650', body: 'bizjet', seats: '11–19', engines: '2 × BR725', range: '13,000 km' },
  FA7X: { name: 'Dassault Falcon 7X', maker: 'Dassault', short: 'Falcon 7X', body: 'bizjet', seats: '12–16', engines: '3 × PW307A', range: '11,000 km' },
};

const BODY_LABEL = {
  narrow: 'Narrow-body jet', wide: 'Wide-body jet', jumbo: 'Four-engine wide-body',
  turboprop: 'Turboprop', regional: 'Regional jet', light: 'Light aircraft', bizjet: 'Business jet',
};
export const bodyLabel = (b) => BODY_LABEL[b] || 'Aircraft';

// Resolve a model string from any source ("Airbus A320 NEO", "A20N", "Boeing 777-300ER") to a type record
export function resolveAircraft(modelOrCode) {
  if (!modelOrCode) return null;
  const raw = String(modelOrCode).trim();
  const up = raw.toUpperCase();
  if (AIRCRAFT[up]) return { code: up, ...AIRCRAFT[up] };
  const norm = up.replace(/[^A-Z0-9]/g, '');
  let best = null;
  for (const [code, t] of Object.entries(AIRCRAFT)) {
    const n = t.name.toUpperCase().replace(/DREAMLINER|[^A-Z0-9]/g, '');
    if (norm === n) { best = { code, len: 999 }; break; }
    if (norm.startsWith(n) && (!best || n.length > best.len)) best = { code, len: n.length };
  }
  // Heuristics for loose strings from schedule feeds
  if (!best) {
    const pick = (code) => ({ code, len: 0 });
    if (/A320.*NEO|A20N/.test(norm)) best = pick('A20N');
    else if (/A321.*NEO|A21N/.test(norm)) best = pick('A21N');
    else if (/7378MAX|737MAX8|B38M/.test(norm)) best = pick('B38M');
    else if (/777300/.test(norm)) best = pick('B77W');
    else if (/7879/.test(norm)) best = pick('B789');
    else if (/7878/.test(norm)) best = pick('B788');
    else if (/ATR72/.test(norm)) best = pick('AT76');
    else if (/A350/.test(norm)) best = pick('A359');
    else if (/A380/.test(norm)) best = pick('A388');
    else if (/7378|737800/.test(norm)) best = pick('B738');
    else if (/Q400|DHC8/.test(norm)) best = pick('DH8D');
  }
  if (best) return { code: best.code, ...AIRCRAFT[best.code] };
  // Unknown: prettify what we got
  const pretty = raw.replace(/\bNEO\b/gi, 'neo');
  const maker = pretty.split(' ')[0];
  return { code: '', name: pretty, maker, short: pretty.replace(/^(Airbus|Boeing)\s+/i, ''), body: 'narrow', seats: '—', engines: '—', range: '—' };
}
