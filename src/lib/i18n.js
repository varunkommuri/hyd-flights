// English / Telugu strings for the broadcast screen and the phone app.
// Telugu copy should be reviewed by a native speaker before going public.
import { createContext, useContext } from 'react';

const TE = {
  'Departures': 'బయలుదేరే విమానాలు',
  'Arrivals': 'రాక విమానాలు',
  'tab:Departures': 'బయలుదేరడం',
  'tab:Arrivals': 'రాక',
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
};

const CITY_TE = {
  Hyderabad: 'హైదరాబాద్', Delhi: 'ఢిల్లీ', Mumbai: 'ముంబై', Bengaluru: 'బెంగళూరు', Chennai: 'చెన్నై', Kolkata: 'కోల్‌కతా',
  Kochi: 'కొచ్చి', Goa: 'గోవా', Pune: 'పుణే', Ahmedabad: 'అహ్మదాబాద్', Jaipur: 'జైపూర్', Tirupati: 'తిరుపతి',
  Visakhapatnam: 'విశాఖపట్నం', Lucknow: 'లక్నో', Bhubaneswar: 'భువనేశ్వర్', Nagpur: 'నాగ్‌పూర్', Vijayawada: 'విజయవాడ',
  Mangaluru: 'మంగళూరు', Thiruvananthapuram: 'తిరువనంతపురం', Guwahati: 'గువాహటి', Dubai: 'దుబాయ్', 'Abu Dhabi': 'అబుదాబి',
  Sharjah: 'షార్జా', Doha: 'దోహా', Muscat: 'మస్కట్', Jeddah: 'జెద్దా', Riyadh: 'రియాద్', Kuwait: 'కువైట్', Bahrain: 'బహ్రెయిన్',
  Singapore: 'సింగపూర్', Bangkok: 'బ్యాంకాక్', 'Kuala Lumpur': 'కౌలాలంపూర్', Colombo: 'కొలంబో', London: 'లండన్',
  Frankfurt: 'ఫ్రాంక్‌ఫర్ట్', 'Hong Kong': 'హాంకాంగ్',
};

export const LangCtx = createContext('en');
export const useLang = () => useContext(LangCtx);

export function tr(s, lang) {
  // 'tab:X' = the short form used on the tab bar, falling back to the normal translation
  if (s.startsWith('tab:')) { const base = s.slice(4); return lang === 'te' ? TE[s] || TE[base] || base : base; }
  return lang === 'te' ? TE[s] || s : s;
}
export const cityName = (city, lang) => (lang === 'te' ? CITY_TE[city] || city : city);

// Returns t() bound to the current language
export function useT() {
  const lang = useLang();
  return (s) => tr(s, lang);
}
