# HYD Flights ✈ — Rajiv Gandhi International (VOHS)

Two views of the same live data:

- **HYD Live broadcast** (`#/tv`): a 1920×1080 airport-style screen made for **YouTube Live**. Nobody can interact with it, so everything rotates on its own: departures and arrivals (domestic and international, paged), delays and disruptions, weather and runway, and travel info. Cancellations, diversions and gate changes also jump in as full-screen **breaking** alerts. The header clock, alerts sidebar and English/Telugu news ticker stay on screen the whole time. Between 01:00 and 05:00 a **quiet hours** screen shows the next departures.
- **Phone app** (`#/`): the same boards in five tabs (Departures, Arrivals, Delays, Weather, Info), a rotating alert strip, English/తెలుగు switch, light/dark theme, flight details, live radar map and settings.

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

## Stream HYD Live to YouTube

Only the computer running the stream calls the flight API. Viewers just watch the video.

1. Host the `dist/` folder (see below) and open `https://<your-site>/#/tv` in a browser to check it.
2. Install [OBS Studio](https://obsproject.com) on an always-on PC.
3. In OBS: **Settings → Video** → Base and Output resolution **1920×1080**, 30 fps.
4. **Sources → + → Browser**: URL `https://<your-site>/#/tv`, width **1920**, height **1080**. Untick "Shutdown source when not visible".
5. In YouTube Studio: **Create → Go live → Stream**, copy the **stream key**.
6. In OBS: **Settings → Stream** → Service **YouTube - RTMPS**, paste the key → **Start Streaming**.

URL options (add after `#/tv?`, joined with `&`):

| Option | What it does | Example |
|---|---|---|
| `rotate` | Seconds each board page stays up (default 12) | `rotate=15` |
| `refresh` | Minutes between flight-schedule API calls on this machine | `refresh=30` |
| `only` | Pin one scene, handy for previews: `dep`, `arr`, `delays`, `weather`, `info`, `quiet`, `breaking` | `only=weather` |

**API quota:** the free AeroDataBox plan allows about 200 schedule refreshes a month. A 24/7 stream refreshing every 30 min needs about 1,440, so use a paid plan for a public stream, or set `refresh` high (for example `refresh=240`). Weather and aircraft positions are free.

**Note:** anyone who opens the phone app still calls the APIs from their own phone. To keep it to a single caller, point viewers at the YouTube stream, or add a small server-side cache later.

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
  lib/        config, reference data, feeds, simulation, store, broadcast (alerts/disruptions), i18n (English/Telugu)
  components/ icons, airline badges, weather illustrations, wind compass, QR code
  tv/         HYD Live 1920×1080 broadcast screen (#/tv)
  phone/      phone app frame and tabs
  screens/    FlightDetail, LiveMap, Settings
public/       manifest, service worker, icons
```

Notes: the API key lives only in your browser's storage. Not for operational or navigational use.
