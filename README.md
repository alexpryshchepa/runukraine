# RunUkraine

Merge a Garmin `.tcx` activity (real telemetry, broken GPS) with an official event
route `.gpx` (clean path, no telemetry), then download a merged `.tcx` to upload to
Strava. 100% client-side — no backend, no accounts.

## Why

Where GPS is jammed, a Garmin watch still records time, distance, heart rate, cadence
and altitude, but the GPS track is missing or garbage. This tool paints that telemetry
onto the true course (scaled to fit the official distance) so the activity looks right.

## How the merge works

The watch records cumulative distance even without GPS. The route has a known length.
For each telemetry sample at distance *d*, the app places it at the point *d* meters
along the official route — scaling your distance stream so your start lands at the route
start and your finish at the route finish. Your real time, heart rate, and cadence are
preserved; only the GPS coordinates are rebuilt from the route.

## Develop

```bash
npm install
npm run dev      # start the dev server
npm test         # run the unit tests
npm run build    # production build
```

## Add official routes

Drop event `.gpx` files into `src/routes/` and rebuild. They appear automatically in the
route picker; the display name comes from the filename (e.g. `kyiv-half-marathon.gpx` →
"Kyiv Half Marathon"). The bundled `sample-loop.gpx` is just for testing — replace or
remove it.

## Use

1. Export your activity from Garmin Connect as **TCX** and upload it.
2. Pick the official route.
3. Preview the merged track, download the `.tcx`, and upload it at
   [strava.com/upload](https://www.strava.com/upload/select).
