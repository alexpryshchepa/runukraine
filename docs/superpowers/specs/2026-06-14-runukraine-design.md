# RunUkraine — Design Spec

**Date:** 2026-06-14
**Status:** Approved (design), pending implementation plan

## Problem

In regions where GPS is jammed (e.g. Ukraine during the war), a Garmin watch still
records full telemetry for a run — time, cumulative distance (from wrist accelerometer
or footpod), heart rate, cadence, barometric altitude — but the GPS track is missing or
garbage. Official running events publish the true course as a `.gpx` file but with no
telemetry. The goal: rebuild a usable activity by painting the real telemetry onto the
true course, then upload the result to Strava.

## Constraints

- **100% client-side.** No backend, no server, no OAuth. The only network traffic is
  OpenStreetMap map tiles for the preview.
- Garmin data comes in as a **manually exported `.tcx`** file (no Garmin API).
- The merged result is **downloaded as a file** and the user uploads it to Strava
  manually (no Strava API).

These two file-based decisions eliminate all OAuth/secret/backend concerns, because
both Garmin's and Strava's APIs require server-side token exchange (Strava has no PKCE),
which is incompatible with a browser-only app.

## User flow

A 3-step wizard:

1. **Upload** your Garmin `.tcx` (real telemetry, broken GPS).
2. **Pick** an official route from the bundled list (clean GPS, no telemetry).
3. **Preview & download** the merged `.tcx`, then upload it to Strava manually.

## Architecture

Pure file-in → transform → file-out.

```
src/
  lib/                 ← all pure, unit-tested, no React
    tcx.ts             parseTcx(xml)      → GarminActivity { samples[] }
    gpx.ts             parseGpx(xml)      → RoutePoint[]
    geo.ts             haversine, cumulativeDistances, interpolateAlongPath
    merge.ts           mergeActivityWithRoute(activity, route) → MergedActivity
    tcxWriter.ts       serializeTcx(merged) → xml string
    routes.ts          loads bundled routes via import.meta.glob
    download.ts        Blob download helper
  components/          FileDrop, RoutePicker, MapPreview, StatsSummary
  App.tsx              wizard orchestration: Upload → Pick route → Preview & download
  types.ts            shared types
```

### Key decisions (defaults)

- **XML parsing:** browser built-in `DOMParser` for both TCX and GPX (no parser
  dependency). TCX output built with `XMLSerializer`.
- **Elevation source:** keep the Garmin barometric altitude (real measured data); fall
  back to route elevation only when the Garmin file has no altitude.
- **Output format:** TCX only for v1 (same format in and out, lossless for
  HR/cadence/distance/altitude, read cleanly by Strava). GPX output is a possible later
  addition.

## Data model

```ts
interface GarminSample {
  time: Date;
  distance: number;   // cumulative meters from activity start
  hr?: number;        // bpm
  cadence?: number;   // rpm/spm
  altitude?: number;  // meters
}
interface GarminActivity {
  samples: GarminSample[];   // sorted by time, distance monotonic non-decreasing
  sport?: string;
}
interface RoutePoint { lat: number; lon: number; ele?: number; }
interface Route {
  name: string;          // from filename
  points: RoutePoint[];
  cumulative: number[];  // cumulative arc-length per point, meters
  length: number;        // total route length, meters
}
interface MergedSample extends GarminSample {
  lat: number; lon: number;   // from route
}
interface MergedActivity { samples: MergedSample[]; sport?: string; }
```

## The merge (core algorithm)

1. Parse TCX → samples, **flattening all laps** into one stream with monotonic
   cumulative distance (add per-lap offset if a file resets distance per lap).
2. Parse GPX → points; compute cumulative arc-length with haversine → `routeLength`.
3. **Scale to fit:** `scale = routeLength / garminTotalDistance`. Multiply every
   sample's distance by `scale` so the runner's start maps to the route start and the
   finish maps exactly to the route finish line. (The official route distance is
   authoritative for an event.)
4. For each sample's scaled distance, binary-search the route segment
   `[i, i+1]` where `cumulative[i] <= d <= cumulative[i+1]`, compute fraction
   `f = (d - cumulative[i]) / (cumulative[i+1] - cumulative[i])` (guard divide-by-zero
   when consecutive route points coincide), and linearly interpolate `lat/lon/ele`.
5. Emit a `MergedSample` with the **original time, HR, cadence**, the **route's
   lat/lon**, route-aligned cumulative distance, and altitude per the elevation rule.

The whole pass is O(n + m) using a forward pointer over the monotonic route cumulative
array (binary search acceptable too).

## Bundled routes

Official `.gpx` files are dropped into `src/routes/`. The app auto-discovers them at
build time via Vite `import.meta.glob('./routes/*.gpx', { query: '?raw', import:
'default', eager: true })` — no manifest to maintain. Display name is derived from the
filename; route distance is computed from the parsed file. Adding a route = drop file +
rebuild.

## Preview

- Map (`react-leaflet` + OpenStreetMap tiles) showing the merged track on the real
  course, with a faint overlay of the original (broken) GPS track for contrast.
- Stats summary below: distance, total elapsed time (last sample time − first), average
  & max HR, average cadence. (Moving time is intentionally excluded from v1 — it needs a
  pause-detection rule.)

## Error handling

Each surfaces a clear inline message rather than failing silently:

- TCX has no distance stream.
- TCX distance is all zero or non-monotonic.
- Route GPX has fewer than 2 points.
- Empty or unparseable file.
- Wrong file type dropped.
- Garmin total distance is 0 (cannot scale).

## Stack & testing

- **Stack:** Vite + React + TypeScript, `react-leaflet` + `leaflet`.
- **Testing:** Vitest, test-first (TDD) for the `lib/` pure functions:
  - `geo.ts`: haversine against known distances; cumulative; interpolation at exact,
    midpoint, and boundary fractions.
  - `tcx.ts`: parse fixture → correct samples; lap flattening; missing-distance handling.
  - `gpx.ts`: parse fixture → points + total length.
  - `merge.ts`: scaling correctness on a synthetic straight-line route (first sample at
    route start, last at route finish, midpoint mapping); distance monotonicity; every
    error case.
  - `tcxWriter.ts`: round-trip write → re-parse equals input within tolerance; valid XML.

## Out of scope (v1)

- FIT input support.
- Upload-your-own-route GPX.
- GPX output / multiple output formats.
- Manual trim/offset/scale-toggle controls.
- Pace/HR/elevation charts.
- Any live Garmin or Strava API integration.
