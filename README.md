# HYD Flights ✈ — Rajiv Gandhi International (VOHS)

A mobile-first, installable web app (PWA) for Hyderabad airport:

- **Home** – live clock, airport weather, split-flap "next departure / next arrival" cards, delay count, live radar
- **Flights** – searchable arrivals/departures (city, airline, flight no., aircraft model or registration), filters for domestic / international / delays / wide-body
- **Board** – airport-style FIDS with the **aircraft model on every row**
- **Flight detail** – route, revised times (both time zones), terminal/gate/check-in or belt, a full **aircraft card** (model, type code, registration, seats, engines, range), timeline, follow + share
- **Live map** – radar-style scope centred on HYD (range rings, bearings, sweep) with aircraft moving in real time, arriving/departing/overflying filters, trails, tap a plane for altitude/speed/ETA
- **Weather** – hourly + 6-day forecast, thunderstorm/fog alerts, wind compass vs runway, runway in use, visibility, QNH, raw METAR

## Data sources

| What | Source | Key? |
|---|---|---|
| Arrivals, departures, gates, aircraft type & reg | AeroDataBox (via RapidAPI) | Free key — paste in **Settings** |
| Aircraft positions | adsb.lol → airplanes.live → OpenSky (auto-fallback) | No |
| Weather | Open-Meteo + NOAA aviationweather.gov (METAR) | No |
| Gates, terminals, baggage belts (optional) | AirLabs schedules — fills gaps AeroDataBox leaves for HYD | Free key — paste in **Settings** |
| Airline logos | pics.avs.io, images.kiwi.com (fallback: coloured code tile) | No |

Without a key (or if a feed is unreachable) the app runs on a realistic simulation and is clearly labelled **Demo data**, so it never shows a blank screen.

Get a flight key: https://rapidapi.com/aedbx-aedbx/api/aerodatabox → subscribe to the free Basic plan → copy `X-RapidAPI-Key`.

## Run it

**Option A — no build (fastest):** the `dist/` folder is ready to host.
1. Go to https://app.netlify.com/drop and drag the `dist` folder in (or use Vercel / GitHub Pages / Cloudflare Pages).
2. Open the https URL on your phone → **Add to Home Screen** (iPhone: Safari → Share; Android: Chrome → ⋮ → Install app).

**Option B — develop:**
```bash
npm install
npm run dev        # opens on your LAN, e.g. http://192.168.x.x:5173 — open that on your phone
npm run build      # production build into dist/
```

## Project layout
```
src/
  lib/        config, reference data (airlines, airports, aircraft types), feeds, simulation, store
  components/ icons, badges, split-flap, weather illustrations
  screens/    Home, Flights, FlightDetail, Board, LiveMap, Weather, Settings
public/       manifest, service worker, icons
```

Notes: the API key lives only in your browser's storage. Not for operational or navigational use.
