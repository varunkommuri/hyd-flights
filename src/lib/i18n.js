// English / Telugu strings for the broadcast screen and the phone app.
// Telugu copy should be reviewed by a native speaker before going public.
import { createContext, useContext } from 'react';

const TE = {
  'Departures': 'బయలుదేరే విమానాలు',
  'Arrivals': 'రాక విమానాలు',
  'Delays': 'ఆలస్యాలు',
  'Weather': 'వాతావరణం',
  'Info': 'సమాచారం',
  'All': 'అన్నీ',
  'Domestic': 'దేశీయ',
  'International': 'అంతర్జాతీయ',
  'Domestic departures': 'దేశీయ బయలుదేరే విమానాలు',
  'International departures': 'అంతర్జాతీయ బయలుదేరే విమానాలు',
  'Domestic arrivals': 'దేశీయ రాక విమానాలు',
  'International arrivals': 'అంతర్జాతీయ రాక విమానాలు',
  'Sched': 'నిర్ణీత',
  'Est': 'అంచనా',
  'Flight · destination': 'విమానం · గమ్యం',
  'Flight · from': 'విమానం · ఎక్కడి నుండి',
  'Gate': 'గేట్',
  'Belt': 'బెల్ట్',
  'News': 'వార్తలు',
  'Delays & disruptions': 'ఆలస్యాలు & అంతరాయాలు',
  'Delayed': 'ఆలస్యం',
  'Cancelled': 'రద్దు',
  'Diverted': 'దారి మళ్లింపు',
  'Avg delay': 'సగటు ఆలస్యం',
  'Travel info': 'ప్రయాణ సమాచారం',
  'No flights in this window': 'ఈ సమయంలో విమానాలు లేవు',
  'All flights running on time': 'అన్ని విమానాలు సమయానికి నడుస్తున్నాయి',
  'Quiet hours · next departure': 'నిశ్శబ్ద సమయం · తదుపరి విమానం',
  'Flight data may be delayed — last update': 'విమాన సమాచారం ఆలస్యంగా ఉండవచ్చు — చివరి నవీకరణ',
  // statuses
  'ON TIME': 'సరైన సమయానికి',
  'DELAYED': 'ఆలస్యం',
  'CANCELLED': 'రద్దు',
  'DIVERTED': 'దారి మళ్లింపు',
  'BOARDING': 'బోర్డింగ్',
  'FINAL CALL': 'చివరి పిలుపు',
  'GATE CLOSED': 'గేట్ మూసివేశారు',
  'GATE OPEN': 'గేట్ తెరిచారు',
  'CHECK-IN': 'చెక్-ఇన్',
  'DEPARTED': 'బయలుదేరింది',
  'LANDING': 'దిగుతోంది',
  'LANDED': 'దిగింది',
  'AT GATE': 'గేట్ వద్ద',
  'EARLY': 'ముందుగా',
  'EXPECTED': 'అంచనా',
  'GATE CHANGE': 'గేట్ మార్పు',
  'WEATHER': 'వాతావరణం',
  'INFO': 'సమాచారం',
  'TIP': 'సూచన',
  'ALL CLEAR': 'అంతా సజావుగా',
  'DEPARTURES': 'బయలుదేరడం',
  'ARRIVALS': 'రాక',
  'DELAYS': 'ఆలస్యాలు',
  'QUIET HOURS': 'నిశ్శబ్ద సమయం',
  'BREAKING': 'తాజా వార్త',
  'ALERTS': 'హెచ్చరికలు',
  'Scheduled': 'నిర్ణీత సమయం',
  'Estimated': 'అంచనా సమయం',
  'Flight': 'విమానం',
  'Airline': 'విమానయాన సంస్థ',
  'Destination': 'గమ్యం',
  'From': 'ఎక్కడి నుండి',
  'Belt · gate': 'బెల్ట్ · గేట్',
  'Status': 'స్థితి',
  'Next': 'తదుపరి',
  'Page': 'పేజీ',
  'Departure': 'బయలుదేరే విమానం',
  'Arrival': 'రాక విమానం',
  'At the airport now': 'ఇప్పుడు విమానాశ్రయంలో',
  'Wind vs runway': 'గాలి & రన్‌వే',
  'Runway': 'రన్‌వే',
  'Visibility': 'దృశ్యమానత',
  'Rain chance': 'వర్షం అవకాశం',
  'Next 8 hours': 'తదుపరి 8 గంటలు',
  'Check-in closes': 'చెక్-ఇన్ ముగింపు',
  'Reach the airport': 'విమానాశ్రయానికి చేరుకోండి',
  'Security': 'భద్రతా తనిఖీ',
  'Baggage': 'సామాను',
  'Baggage claim': 'సామాను సేకరణ',
  'Getting here': 'ఇక్కడికి చేరుకోవడం',
  '45 min before': '45 నిమిషాల ముందు',
  '60 min before': '60 నిమిషాల ముందు',
  '2 h before': '2 గంటల ముందు',
  '3 h before': '3 గంటల ముందు',
  'Keep laptops and liquids ready to take out': 'ల్యాప్‌టాప్‌లు, ద్రవాలను బయటకు తీయడానికి సిద్ధంగా ఉంచండి',
  'Power banks in cabin bags only': 'పవర్ బ్యాంకులు క్యాబిన్ బ్యాగుల్లో మాత్రమే',
  'Belt numbers appear on the Arrivals board once the flight lands': 'విమానం దిగిన తర్వాత బెల్ట్ నంబర్లు రాక విమానాల బోర్డులో కనిపిస్తాయి',
  'Pushpak airport bus from the city': 'నగరం నుండి పుష్పక్ విమానాశ్రయ బస్సు',
  'Cabs from the arrivals forecourt': 'రాక ద్వారం ముందు నుండి క్యాబ్‌లు',
  'Scan to see this on your phone': 'మీ ఫోన్‌లో చూడటానికి స్కాన్ చేయండి',
  'No delays, cancellations or diversions in the next 3 hours': 'తదుపరి 3 గంటల్లో ఆలస్యాలు, రద్దులు లేదా దారి మళ్లింపులు లేవు',
  'domestic': 'దేశీయ',
  'international': 'అంతర్జాతీయ',
  'disrupted': 'అంతరాయం',
  'Checked': 'తనిఖీ',
  'New gate': 'కొత్త గేట్',
  'DOMESTIC': 'దేశీయ',
  'INTERNATIONAL': 'అంతర్జాతీయ',
  'DOM': 'దేశీయ',
  'INTL': 'అంతర్జాతీయ',
  'First domestic departure': 'మొదటి దేశీయ విమానం',
  'International check-in opens 3 h before': 'అంతర్జాతీయ చెక్-ఇన్ 3 గంటల ముందు ప్రారంభం',
  'No disruptions': 'అంతరాయాలు లేవు',
  'All flights on time for the next 3 hours': 'తదుపరి 3 గంటల పాటు అన్ని విమానాలు సమయానికి',
  '45 min domestic · 60 min international': 'దేశీయ 45 నిమిషాలు · అంతర్జాతీయ 60 నిమిషాలు',
  'Demo data · add a flight API key to go live': 'డెమో డేటా · లైవ్ కోసం API కీ జోడించండి',
  'Rajiv Gandhi International Airport · Hyderabad': 'రాజీవ్ గాంధీ అంతర్జాతీయ విమానాశ్రయం · హైదరాబాద్',
  'No departures scheduled before morning': 'ఉదయం వరకు విమానాలు లేవు',
  // weather conditions
  'Clear sky': 'నిర్మలమైన ఆకాశం', 'Clear night': 'నిర్మలమైన రాత్రి', 'Mostly clear': 'చాలావరకు నిర్మలం',
  'Partly cloudy': 'పాక్షికంగా మేఘావృతం', 'Overcast': 'మేఘావృతం', 'Fog': 'పొగమంచు', 'Drizzle': 'చిరుజల్లులు',
  'Rain': 'వర్షం', 'Heavy rain': 'భారీ వర్షం', 'Snow': 'మంచు', 'Showers': 'జల్లులు', 'Thunderstorm': 'ఉరుములతో వర్షం', 'Cloudy': 'మేఘాలు',
};

const WIND_TE = { north: 'ఉత్తరం', 'north-east': 'ఈశాన్యం', east: 'తూర్పు', 'south-east': 'ఆగ్నేయం', south: 'దక్షిణం', 'south-west': 'నైరుతి', west: 'పడమర', 'north-west': 'వాయువ్యం' };
export const windWord = (deg) => ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'][Math.round(deg / 45) % 8];
export function windLine(w, lang) {
  const dir = windWord(w.windDir);
  return lang === 'te' ? `${WIND_TE[dir]} నుండి గాలి · ${w.windDir}° · ${w.windKt} kt` : `From the ${dir} · ${w.windDir}° · ${w.windKt} kt`;
}
export function windSub(w, lang) {
  const h = w.wind.head, c = w.wind.cross;
  if (lang === 'te') return `${h >= 0 ? `ఎదురుగాలి ${h} kt` : `వెనుకగాలి ${-h} kt`} · ${c ? `అడ్డగాలి ${c} kt` : 'అడ్డగాలి లేదు'}`;
  return `${h >= 0 ? `Headwind ${h} kt` : `Tailwind ${-h} kt`} · ${c ? `crosswind ${c} kt` : 'no crosswind'}`;
}

// "to Mumbai" / "from Mumbai" in either language (Telugu uses case suffixes)
export function toCity(f, lang) {
  if (lang !== 'te') return `to ${placeName(f, lang)}`;
  const c = placeName(f, lang);
  const last = c.slice(-1);
  if (last === '\u0C4D') return c + '\u200Cకు'; // ends in virama: keep it visible (దుబాయ్‌కు)
  return c + ('\u0C3F\u0C40\u0C48\u0C46\u0C47'.includes(last) ? 'కి' : 'కు');
}
export const pageLabel = (p, n, lang) => (lang === 'te' ? `పేజీ ${p}/${n}` : `Page ${p} of ${n}`);
export const fromCity = (f, lang) => (lang === 'te' ? `${placeName(f, lang)} నుండి` : `from ${placeName(f, lang)}`);
export const routeText = (f, lang) => (f.dir === 'dep' ? `${f.number} ${toCity(f, lang)}` : lang === 'te' ? `${fromCity(f, lang)} ${f.number}` : `${f.number} ${fromCity(f, lang)}`);

const dateFmt = {};
export function dateLabel(d, lang) {
  const k = lang === 'te' ? 'te-IN' : 'en-GB';
  dateFmt[k] ||= new Intl.DateTimeFormat(k, { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });
  return dateFmt[k].format(d).replace(',', '');
}
export function weekdayLabel(d, lang) {
  return new Intl.DateTimeFormat(lang === 'te' ? 'te-IN' : 'en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(d);
}

const CITY_TE = {
  Hyderabad: 'హైదరాబాద్', Delhi: 'ఢిల్లీ', Mumbai: 'ముంబై', Bengaluru: 'బెంగళూరు', Chennai: 'చెన్నై', Kolkata: 'కోల్‌కతా',
  Kochi: 'కొచ్చి', Goa: 'గోవా', Pune: 'పుణే', Ahmedabad: 'అహ్మదాబాద్', Jaipur: 'జైపూర్', Tirupati: 'తిరుపతి',
  Visakhapatnam: 'విశాఖపట్నం', Lucknow: 'లక్నో', Bhubaneswar: 'భువనేశ్వర్', Nagpur: 'నాగ్‌పూర్', Vijayawada: 'విజయవాడ',
  Mangaluru: 'మంగళూరు', Thiruvananthapuram: 'తిరువనంతపురం', Guwahati: 'గువాహటి', Dubai: 'దుబాయ్', 'Abu Dhabi': 'అబుదాబి',
  Sharjah: 'షార్జా', Doha: 'దోహా', Muscat: 'మస్కట్', Jeddah: 'జెద్దా', Riyadh: 'రియాద్', Kuwait: 'కువైట్', Bahrain: 'బహ్రెయిన్',
  Singapore: 'సింగపూర్', Bangkok: 'బ్యాంకాక్', 'Kuala Lumpur': 'కౌలాలంపూర్', Colombo: 'కొలంబో', London: 'లండన్',
  Frankfurt: 'ఫ్రాంక్‌ఫర్ట్', 'Hong Kong': 'హాంకాంగ్',
};

// Airport code -> [English, Telugu]. Live feeds give municipality names ("Vasco da Gama",
// "Belgaum"); passengers know the city ("Goa", "Belagavi"), and Telugu needs a real name.
const PLACE = {
  HYD: ['Hyderabad', 'హైదరాబాద్'], DEL: ['Delhi', 'ఢిల్లీ'], BOM: ['Mumbai', 'ముంబై'], NMI: ['Navi Mumbai', 'నవీ ముంబై'],
  BLR: ['Bengaluru', 'బెంగళూరు'], MAA: ['Chennai', 'చెన్నై'], CCU: ['Kolkata', 'కోల్‌కతా'], COK: ['Kochi', 'కొచ్చి'],
  GOI: ['Goa', 'గోవా'], GOX: ['Goa (Mopa)', 'గోవా (మోపా)'], PNQ: ['Pune', 'పుణే'], AMD: ['Ahmedabad', 'అహ్మదాబాద్'],
  JAI: ['Jaipur', 'జైపూర్'], TIR: ['Tirupati', 'తిరుపతి'], VTZ: ['Visakhapatnam', 'విశాఖపట్నం'], LKO: ['Lucknow', 'లక్నో'],
  BBI: ['Bhubaneswar', 'భువనేశ్వర్'], NAG: ['Nagpur', 'నాగ్‌పూర్'], VGA: ['Vijayawada', 'విజయవాడ'], IXE: ['Mangaluru', 'మంగళూరు'],
  TRV: ['Thiruvananthapuram', 'తిరువనంతపురం'], GAU: ['Guwahati', 'గువాహటి'], IXG: ['Belagavi', 'బెళగావి'],
  IXB: ['Bagdogra', 'బాగ్‌డోగ్రా'], IXC: ['Chandigarh', 'చండీగఢ్'], IDR: ['Indore', 'ఇండోర్'], BHO: ['Bhopal', 'భోపాల్'],
  RPR: ['Raipur', 'రాయ్‌పూర్'], PAT: ['Patna', 'పట్నా'], VNS: ['Varanasi', 'వారణాసి'], IXR: ['Ranchi', 'రాంచీ'],
  CJB: ['Coimbatore', 'కోయంబత్తూరు'], IXM: ['Madurai', 'మదురై'], TRZ: ['Tiruchirappalli', 'తిరుచిరాపల్లి'],
  CCJ: ['Kozhikode', 'కోజికోడ్'], CNN: ['Kannur', 'కన్నూర్'], IXZ: ['Port Blair', 'పోర్ట్ బ్లెయిర్'], SXR: ['Srinagar', 'శ్రీనగర్'],
  IXJ: ['Jammu', 'జమ్మూ'], ATQ: ['Amritsar', 'అమృత్‌సర్'], UDR: ['Udaipur', 'ఉదయ్‌పూర్'], DED: ['Dehradun', 'డెహ్రాడూన్'],
  IXU: ['Aurangabad', 'ఔరంగాబాద్'], HBX: ['Hubballi', 'హుబ్బళ్లి'], MYQ: ['Mysuru', 'మైసూరు'], KJB: ['Kurnool', 'కర్నూలు'],
  RJA: ['Rajahmundry', 'రాజమండ్రి'], CDP: ['Kadapa', 'కడప'], TCR: ['Thoothukudi', 'తూత్తుకుడి'], PNY: ['Puducherry', 'పుదుచ్చేరి'],
  IXA: ['Agartala', 'అగర్తలా'], IMF: ['Imphal', 'ఇంఫాల్'], DIB: ['Dibrugarh', 'దిబ్రూగఢ్'], JLR: ['Jabalpur', 'జబల్‌పూర్'],
  BDQ: ['Vadodara', 'వడోదర'], STV: ['Surat', 'సూరత్'], RAJ: ['Rajkot', 'రాజ్‌కోట్'], HSR: ['Rajkot', 'రాజ్‌కోట్'], NDC: ['Nanded', 'నాందేడ్'],
  KLH: ['Kolhapur', 'కొల్హాపూర్'], SAG: ['Shirdi', 'షిర్డీ'], JGB: ['Jagdalpur', 'జగదల్‌పూర్'], AYJ: ['Ayodhya', 'అయోధ్య'],
  IXD: ['Prayagraj', 'ప్రయాగ్‌రాజ్'], GWL: ['Gwalior', 'గ్వాలియర్'], GOP: ['Gorakhpur', 'గోరఖ్‌పూర్'], JRG: ['Jharsuguda', 'ఝార్సుగూడ'],
  IXS: ['Silchar', 'సిల్చార్'], DGH: ['Deoghar', 'దేవ్‌ఘర్'], BEP: ['Ballari', 'బళ్లారి'], KQH: ['Kishangarh', 'కిషన్‌గఢ్'],
  DXB: ['Dubai', 'దుబాయ్'], DWC: ['Dubai (DWC)', 'దుబాయ్ (DWC)'], AUH: ['Abu Dhabi', 'అబుదాబి'], SHJ: ['Sharjah', 'షార్జా'],
  RKT: ['Ras Al Khaimah', 'రస్ అల్ ఖైమా'], DOH: ['Doha', 'దోహా'], MCT: ['Muscat', 'మస్కట్'], SLL: ['Salalah', 'సలాలా'],
  JED: ['Jeddah', 'జెద్దా'], RUH: ['Riyadh', 'రియాద్'], DMM: ['Dammam', 'దమ్మామ్'], MED: ['Madinah', 'మదీనా'],
  KWI: ['Kuwait', 'కువైట్'], BAH: ['Bahrain', 'బహ్రెయిన్'], SIN: ['Singapore', 'సింగపూర్'], BKK: ['Bangkok', 'బ్యాంకాక్'],
  HKT: ['Phuket', 'ఫుకెట్'], KUL: ['Kuala Lumpur', 'కౌలాలంపూర్'], CMB: ['Colombo', 'కొలంబో'], MLE: ['Male', 'మాలే'],
  DAC: ['Dhaka', 'ఢాకా'], KTM: ['Kathmandu', 'ఖాట్మండు'], HKG: ['Hong Kong', 'హాంకాంగ్'], LHR: ['London', 'లండన్'],
  FRA: ['Frankfurt', 'ఫ్రాంక్‌ఫర్ట్'], ORD: ['Chicago', 'చికాగో'], JFK: ['New York', 'న్యూయార్క్'], EWR: ['New York', 'న్యూయార్క్'],
  SFO: ['San Francisco', 'శాన్ ఫ్రాన్సిస్కో'], IST: ['Istanbul', 'ఇస్తాంబుల్'],
};
// Display name of the other airport, in English or Telugu
export function placeName(f, lang) {
  const p = PLACE[f.other.iata];
  if (p) return lang === 'te' ? p[1] : p[0];
  return lang === 'te' ? CITY_TE[f.other.city] || f.other.city : f.other.city;
}

export const LangCtx = createContext('en');
export const useLang = () => useContext(LangCtx);

export function tr(s, lang) {
  return lang === 'te' ? TE[s] || s : s;
}

