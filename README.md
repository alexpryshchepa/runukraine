# Replot

Merge a `.tcx` activity (real telemetry, broken GPS) with an official event route
`.gpx` (clean path, no telemetry), then download a merged `.tcx` to upload to
Strava. 100% client-side — no backend, no accounts.

## Why

Where GPS is jammed, a watch still records time, distance, heart rate, cadence and
altitude, but the GPS track is missing or garbage. This tool paints that telemetry
onto the true course so the activity looks right.

## How the merge works

The watch records cumulative distance even without GPS. The route has a known length.
The app scales your distance stream linearly onto the route: the first sample lands on
the route's first coordinate, the last on its last, and a sample at fraction *f* of your
recorded distance lands at fraction *f* along the route. Your real time, heart rate and
cadence are preserved; only the GPS coordinates are rebuilt from the route.

**The uploaded route is used exactly as-is.** The activity's own GPS is deliberately
ignored — it is the thing that was broken, so trusting it is what pushed merged tracks
off the course start and finish. Before mapping, the distance stream is cleaned: lap
counter resets are stitched together, backward jitter is clamped, and steps implying an
impossible speed are capped so one jam-induced spike cannot compress the whole track.

The trade-off is that an activity you abandoned part-way is stretched across the full
route rather than stopping where you stopped. When your recorded distance is more than
5% off the route length, the preview says so.

## Activity types

The `<Activity Sport>` value from your file is preserved verbatim in the export, and it
drives what the app shows: runs get pace and cadence in spm, rides get average speed and
cadence in rpm (written as TCX `<Cadence>` rather than `RunCadence`, so Strava keeps it),
and anything else falls back to pace. The interface copy follows the same distinction in
both English and Ukrainian.

## Develop

```bash
npm install
npm run dev      # start the dev server
npm test         # run the unit tests
npm run build    # production build
```

## Add official routes

Drop event `.gpx` files into `src/routes/` and rebuild. They appear automatically in the
route picker; the display name comes from the filename (e.g.
`5km - Odesa half marathon 2026.gpx` → "5km Odesa Half Marathon 2026").

## Use

1. Export your activity from Garmin Connect as **TCX** and upload it.
2. Pick the official route.
3. Preview the merged track, download the `.tcx`, and upload it at
   [strava.com/upload](https://www.strava.com/upload/select).
