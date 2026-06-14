# RunUkraine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A 100% client-side React/Vite app that paints a Garmin `.tcx` activity's telemetry onto an official event route `.gpx`, then exports a merged `.tcx` to upload to Strava.

**Architecture:** Pure file-in → transform → file-out. All domain logic lives in small pure functions under `src/lib/` (parse TCX, parse GPX, geo math, distance-based merge, write TCX), unit-tested with Vitest first. Thin React components handle upload, route selection, map preview, and download. No backend, no OAuth; only OpenStreetMap tiles touch the network.

**Tech Stack:** Vite + React + TypeScript, react-leaflet + leaflet, Vitest + @testing-library/react (jsdom). XML via the browser's built-in `DOMParser`; TCX output via string templating.

**Spec:** `docs/superpowers/specs/2026-06-14-runukraine-design.md`

**Commit convention:** every commit message ends with the trailer:
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

---

## File map

```
src/
  types.ts                 shared interfaces (Task 2)
  lib/
    geo.ts                 haversine, cumulativeDistances, interpolateAlongPath (Task 3)
    stats.ts               computeStats (Task 4)
    tcx.ts                 parseTcx (Task 5)
    gpx.ts                 parseGpx (Task 6)
    routes.ts              buildRoute, filenameToName, loadBundledRoutes (Task 7)
    merge.ts               mergeActivityWithRoute (Task 8)
    tcxWriter.ts           serializeTcx (Task 9)
    download.ts            downloadText (Task 10)
  components/
    StatsSummary.tsx       (Task 11)
    RoutePicker.tsx        (Task 12)
    FileDrop.tsx           (Task 13)
    MapPreview.tsx         (Task 14)
  App.tsx                  wizard wiring (Task 15)
  main.tsx                 entry + leaflet CSS (Task 15)
  routes/sample-loop.gpx   placeholder route for testing (Task 7)
```

---

## Task 1: Scaffold project and test tooling

**Files:**
- Create: `package.json`, `vite.config.ts`, `src/test/setup.ts`, app scaffold (via Vite)

- [ ] **Step 1: Scaffold Vite React-TS into a temp dir, then move it into the repo root**

The repo root already contains `docs/`, `.git/`, and `.gitignore`, so scaffold into a temp folder (avoids the interactive "directory not empty" prompt) and copy the files up.

```bash
npm create vite@latest tmp-vite -- --template react-ts
cp -R tmp-vite/. .
rm -rf tmp-vite
npm install
```

- [ ] **Step 2: Install test and map dependencies**

```bash
npm install leaflet react-leaflet
npm install -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @types/leaflet
```

- [ ] **Step 3: Configure Vitest inside the Vite config**

Replace `vite.config.ts` with:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

- [ ] **Step 4: Add the test setup file**

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Add test scripts to package.json**

In `package.json`, add to the `"scripts"` object:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Add a trivial smoke test to verify the toolchain**

Create `src/lib/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('toolchain', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2);
  });
  it('has a DOM (jsdom)', () => {
    const doc = new DOMParser().parseFromString('<a>x</a>', 'application/xml');
    expect(doc.documentElement.textContent).toBe('x');
  });
});
```

- [ ] **Step 7: Run the smoke test**

Run: `npm test`
Expected: PASS, 2 tests passing.

- [ ] **Step 8: Remove the smoke test and commit**

```bash
rm src/lib/smoke.test.ts
git add -A
git commit -m "chore: scaffold Vite React-TS app with Vitest and leaflet

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Shared types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create the shared types**

Create `src/types.ts`:

```ts
export interface GarminSample {
  time: Date;
  distance: number; // cumulative meters from start
  hr?: number;
  cadence?: number;
  altitude?: number;
  lat?: number; // original recorded position (may be missing or garbage)
  lon?: number;
}

export interface GarminActivity {
  samples: GarminSample[];
  sport?: string;
}

export interface RoutePoint {
  lat: number;
  lon: number;
  ele?: number;
}

export interface Route {
  name: string;
  points: RoutePoint[];
  cumulative: number[]; // cumulative arc-length per point, meters
  length: number; // total route length, meters
}

export interface MergedSample extends GarminSample {
  lat: number;
  lon: number;
}

export interface MergedActivity {
  samples: MergedSample[];
  sport?: string;
}

export interface ActivityStats {
  distanceMeters: number;
  elapsedSeconds: number;
  avgHr?: number;
  maxHr?: number;
  avgCadence?: number;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors. (The Vite template uses project references, so `tsc -b` is the correct typecheck command.)

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add shared domain types

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Geo math (`geo.ts`)

**Files:**
- Create: `src/lib/geo.ts`
- Test: `src/lib/geo.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/geo.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { haversine, cumulativeDistances, interpolateAlongPath } from './geo';
import type { RoutePoint } from '../types';

describe('haversine', () => {
  it('is 0 for the same point', () => {
    expect(haversine(50, 30, 50, 30)).toBe(0);
  });
  it('is ~111195 m for 1 degree of longitude at the equator', () => {
    expect(Math.abs(haversine(0, 0, 0, 1) - 111194.9)).toBeLessThan(1);
  });
});

describe('cumulativeDistances', () => {
  it('starts at 0 and increases monotonically', () => {
    const pts: RoutePoint[] = [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 1 },
      { lat: 0, lon: 2 },
    ];
    const cum = cumulativeDistances(pts);
    expect(cum[0]).toBe(0);
    expect(cum[1]).toBeGreaterThan(0);
    expect(cum[2]).toBeGreaterThan(cum[1]);
  });
});

describe('interpolateAlongPath', () => {
  const pts: RoutePoint[] = [
    { lat: 0, lon: 0, ele: 100 },
    { lat: 0, lon: 1, ele: 200 },
  ];
  const cum = cumulativeDistances(pts);

  it('returns the first point at distance 0', () => {
    const p = interpolateAlongPath(pts, cum, 0);
    expect(p.lat).toBeCloseTo(0, 6);
    expect(p.lon).toBeCloseTo(0, 6);
    expect(p.ele).toBeCloseTo(100, 3);
  });
  it('returns the last point at full distance', () => {
    const p = interpolateAlongPath(pts, cum, cum[1]);
    expect(p.lon).toBeCloseTo(1, 6);
    expect(p.ele).toBeCloseTo(200, 3);
  });
  it('interpolates the midpoint', () => {
    const p = interpolateAlongPath(pts, cum, cum[1] / 2);
    expect(p.lon).toBeCloseTo(0.5, 4);
    expect(p.ele).toBeCloseTo(150, 1);
  });
  it('clamps distances beyond the path end', () => {
    const p = interpolateAlongPath(pts, cum, cum[1] * 2);
    expect(p.lon).toBeCloseTo(1, 6);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/geo.test.ts`
Expected: FAIL — `haversine`/`cumulativeDistances`/`interpolateAlongPath` are not exported.

- [ ] **Step 3: Implement `geo.ts`**

Create `src/lib/geo.ts`:

```ts
import type { RoutePoint } from '../types';

const EARTH_RADIUS_M = 6371000;

export function haversine(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function cumulativeDistances(points: RoutePoint[]): number[] {
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const d = haversine(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
    cum.push(cum[i - 1] + d);
  }
  return cum;
}

export interface PointOnPath {
  lat: number;
  lon: number;
  ele?: number;
}

export function interpolateAlongPath(
  points: RoutePoint[],
  cumulative: number[],
  dist: number,
): PointOnPath {
  const total = cumulative[cumulative.length - 1];
  const d = Math.max(0, Math.min(dist, total));
  // binary search: largest index with cumulative[index] <= d
  let lo = 0;
  let hi = cumulative.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (cumulative[mid] <= d) lo = mid;
    else hi = mid - 1;
  }
  const i = Math.min(lo, points.length - 2);
  const segLen = cumulative[i + 1] - cumulative[i];
  const f = segLen === 0 ? 0 : (d - cumulative[i]) / segLen;
  const a = points[i];
  const b = points[i + 1];
  const lerp = (x: number, y: number) => x + (y - x) * f;
  const result: PointOnPath = { lat: lerp(a.lat, b.lat), lon: lerp(a.lon, b.lon) };
  if (a.ele !== undefined && b.ele !== undefined) {
    result.ele = lerp(a.ele, b.ele);
  } else if (a.ele !== undefined) {
    result.ele = a.ele;
  } else if (b.ele !== undefined) {
    result.ele = b.ele;
  }
  return result;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/geo.test.ts`
Expected: PASS, all tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/lib/geo.ts src/lib/geo.test.ts
git commit -m "feat: add geo helpers (haversine, cumulative, interpolate)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Activity stats (`stats.ts`)

**Files:**
- Create: `src/lib/stats.ts`
- Test: `src/lib/stats.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeStats } from './stats';
import type { GarminSample } from '../types';

const samples: GarminSample[] = [
  { time: new Date('2026-06-01T08:00:00Z'), distance: 0, hr: 130, cadence: 80 },
  { time: new Date('2026-06-01T08:00:30Z'), distance: 100, hr: 150, cadence: 90 },
  { time: new Date('2026-06-01T08:01:00Z'), distance: 200, hr: 170, cadence: 88 },
];

describe('computeStats', () => {
  it('computes distance, elapsed time, hr and cadence', () => {
    const s = computeStats(samples);
    expect(s.distanceMeters).toBe(200);
    expect(s.elapsedSeconds).toBe(60);
    expect(s.avgHr).toBe(150);
    expect(s.maxHr).toBe(170);
    expect(s.avgCadence).toBe(86);
  });
  it('omits hr and cadence when absent', () => {
    const s = computeStats([
      { time: new Date('2026-06-01T08:00:00Z'), distance: 0 },
      { time: new Date('2026-06-01T08:00:10Z'), distance: 50 },
    ]);
    expect(s.avgHr).toBeUndefined();
    expect(s.maxHr).toBeUndefined();
    expect(s.avgCadence).toBeUndefined();
  });
  it('returns zeros for an empty activity', () => {
    const s = computeStats([]);
    expect(s.distanceMeters).toBe(0);
    expect(s.elapsedSeconds).toBe(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/stats.test.ts`
Expected: FAIL — `computeStats` not exported.

- [ ] **Step 3: Implement `stats.ts`**

Create `src/lib/stats.ts`:

```ts
import type { GarminSample, ActivityStats } from '../types';

export function computeStats(samples: GarminSample[]): ActivityStats {
  if (samples.length === 0) {
    return { distanceMeters: 0, elapsedSeconds: 0 };
  }
  const first = samples[0];
  const last = samples[samples.length - 1];
  const distanceMeters = last.distance - first.distance;
  const elapsedSeconds = (last.time.getTime() - first.time.getTime()) / 1000;

  const hrs = samples.map((s) => s.hr).filter((v): v is number => v !== undefined);
  const cads = samples.map((s) => s.cadence).filter((v): v is number => v !== undefined);

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined;

  const avgHrVal = avg(hrs);
  const avgCadVal = avg(cads);

  return {
    distanceMeters,
    elapsedSeconds,
    avgHr: avgHrVal === undefined ? undefined : Math.round(avgHrVal),
    maxHr: hrs.length ? Math.max(...hrs) : undefined,
    avgCadence: avgCadVal === undefined ? undefined : Math.round(avgCadVal),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/stats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats.ts src/lib/stats.test.ts
git commit -m "feat: add activity stats computation

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: TCX parser (`tcx.ts`)

**Files:**
- Create: `src/lib/tcx.ts`
- Test: `src/lib/tcx.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/tcx.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseTcx } from './tcx';

const oneLap = `<?xml version="1.0"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="Running">
      <Lap>
        <Track>
          <Trackpoint>
            <Time>2026-06-01T08:00:00Z</Time>
            <Position><LatitudeDegrees>50.1</LatitudeDegrees><LongitudeDegrees>30.1</LongitudeDegrees></Position>
            <AltitudeMeters>120</AltitudeMeters>
            <DistanceMeters>0</DistanceMeters>
            <HeartRateBpm><Value>140</Value></HeartRateBpm>
            <Extensions><TPX xmlns="http://www.garmin.com/xmlschemas/ActivityExtension/v2"><RunCadence>85</RunCadence></TPX></Extensions>
          </Trackpoint>
          <Trackpoint>
            <Time>2026-06-01T08:00:30Z</Time>
            <AltitudeMeters>121</AltitudeMeters>
            <DistanceMeters>100</DistanceMeters>
            <HeartRateBpm><Value>150</Value></HeartRateBpm>
            <Extensions><TPX xmlns="http://www.garmin.com/xmlschemas/ActivityExtension/v2"><RunCadence>88</RunCadence></TPX></Extensions>
          </Trackpoint>
        </Track>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

const twoLapsReset = `<?xml version="1.0"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities><Activity Sport="Running">
    <Lap><Track>
      <Trackpoint><Time>2026-06-01T08:00:00Z</Time><DistanceMeters>0</DistanceMeters></Trackpoint>
      <Trackpoint><Time>2026-06-01T08:00:30Z</Time><DistanceMeters>500</DistanceMeters></Trackpoint>
    </Track></Lap>
    <Lap><Track>
      <Trackpoint><Time>2026-06-01T08:01:00Z</Time><DistanceMeters>0</DistanceMeters></Trackpoint>
      <Trackpoint><Time>2026-06-01T08:01:30Z</Time><DistanceMeters>400</DistanceMeters></Trackpoint>
    </Track></Lap>
  </Activity></Activities>
</TrainingCenterDatabase>`;

const noDistance = `<?xml version="1.0"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities><Activity><Lap><Track>
    <Trackpoint><Time>2026-06-01T08:00:00Z</Time></Trackpoint>
  </Track></Lap></Activity></Activities>
</TrainingCenterDatabase>`;

describe('parseTcx', () => {
  it('parses trackpoints with full telemetry', () => {
    const a = parseTcx(oneLap);
    expect(a.sport).toBe('Running');
    expect(a.samples).toHaveLength(2);
    expect(a.samples[0].distance).toBe(0);
    expect(a.samples[0].hr).toBe(140);
    expect(a.samples[0].cadence).toBe(85);
    expect(a.samples[0].altitude).toBe(120);
    expect(a.samples[0].lat).toBeCloseTo(50.1, 5);
    expect(a.samples[0].lon).toBeCloseTo(30.1, 5);
    expect(a.samples[1].distance).toBe(100);
  });
  it('flattens laps into one monotonic distance stream even when the counter resets', () => {
    const a = parseTcx(twoLapsReset);
    const distances = a.samples.map((s) => s.distance);
    expect(distances).toEqual([0, 500, 500, 900]);
  });
  it('throws when there is no distance data', () => {
    expect(() => parseTcx(noDistance)).toThrow(/no distance/i);
  });
  it('throws on invalid XML', () => {
    expect(() => parseTcx('not xml <<<')).toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/tcx.test.ts`
Expected: FAIL — `parseTcx` not exported.

- [ ] **Step 3: Implement `tcx.ts`**

Create `src/lib/tcx.ts`:

```ts
import type { GarminActivity, GarminSample } from '../types';

function textNS(parent: Element, local: string): string | undefined {
  const el = parent.getElementsByTagNameNS('*', local)[0];
  const t = el?.textContent?.trim();
  return t ? t : undefined;
}

export function parseTcx(xml: string): GarminActivity {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Could not read this file as TCX (invalid XML).');
  }
  const trackpoints = Array.from(doc.getElementsByTagNameNS('*', 'Trackpoint'));
  if (trackpoints.length === 0) {
    throw new Error('No trackpoints found in this TCX file.');
  }

  const activityEl = doc.getElementsByTagNameNS('*', 'Activity')[0];
  const sport = activityEl?.getAttribute('Sport') ?? undefined;

  const samples: GarminSample[] = [];
  let offset = 0;
  let lastCum = -Infinity;

  for (const tp of trackpoints) {
    const timeStr = textNS(tp, 'Time');
    const distStr = textNS(tp, 'DistanceMeters');
    if (!timeStr || distStr === undefined) continue; // both are required for the merge

    let cum = Number(distStr) + offset;
    if (cum < lastCum) {
      // the device reset its distance counter (new lap) — continue from where we were
      offset = lastCum;
      cum = Number(distStr) + offset;
    }
    lastCum = cum;

    const sample: GarminSample = { time: new Date(timeStr), distance: cum };

    const hrEl = tp.getElementsByTagNameNS('*', 'HeartRateBpm')[0];
    const hrVal = hrEl?.getElementsByTagNameNS('*', 'Value')[0]?.textContent?.trim();
    if (hrVal) sample.hr = Number(hrVal);

    const cad = textNS(tp, 'RunCadence') ?? textNS(tp, 'Cadence');
    if (cad !== undefined) sample.cadence = Number(cad);

    const alt = textNS(tp, 'AltitudeMeters');
    if (alt !== undefined) sample.altitude = Number(alt);

    const lat = textNS(tp, 'LatitudeDegrees');
    const lon = textNS(tp, 'LongitudeDegrees');
    if (lat !== undefined && lon !== undefined) {
      sample.lat = Number(lat);
      sample.lon = Number(lon);
    }

    samples.push(sample);
  }

  if (samples.length === 0) {
    throw new Error('This TCX file has no distance data, so it cannot be merged.');
  }
  return { samples, sport };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/tcx.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tcx.ts src/lib/tcx.test.ts
git commit -m "feat: add TCX parser with lap flattening

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: GPX parser (`gpx.ts`)

**Files:**
- Create: `src/lib/gpx.ts`
- Test: `src/lib/gpx.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/gpx.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseGpx } from './gpx';

const trackGpx = `<?xml version="1.0"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1">
  <trk><trkseg>
    <trkpt lat="50.0" lon="30.0"><ele>100</ele></trkpt>
    <trkpt lat="50.0" lon="30.01"><ele>110</ele></trkpt>
    <trkpt lat="50.0" lon="30.02"></trkpt>
  </trkseg></trk>
</gpx>`;

const routeGpx = `<?xml version="1.0"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1">
  <rte>
    <rtept lat="49.0" lon="31.0"></rtept>
    <rtept lat="49.0" lon="31.01"></rtept>
  </rte>
</gpx>`;

const onePoint = `<?xml version="1.0"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1">
  <trk><trkseg><trkpt lat="50.0" lon="30.0"></trkpt></trkseg></trk>
</gpx>`;

describe('parseGpx', () => {
  it('parses track points with optional elevation', () => {
    const pts = parseGpx(trackGpx);
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ lat: 50.0, lon: 30.0, ele: 100 });
    expect(pts[2].ele).toBeUndefined();
  });
  it('falls back to route points when there is no track', () => {
    const pts = parseGpx(routeGpx);
    expect(pts).toHaveLength(2);
    expect(pts[0].lat).toBe(49.0);
  });
  it('throws when there are fewer than 2 points', () => {
    expect(() => parseGpx(onePoint)).toThrow(/at least 2/i);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/gpx.test.ts`
Expected: FAIL — `parseGpx` not exported.

- [ ] **Step 3: Implement `gpx.ts`**

Create `src/lib/gpx.ts`:

```ts
import type { RoutePoint } from '../types';

export function parseGpx(xml: string): RoutePoint[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Could not read this file as GPX (invalid XML).');
  }
  let nodes = Array.from(doc.getElementsByTagNameNS('*', 'trkpt'));
  if (nodes.length === 0) nodes = Array.from(doc.getElementsByTagNameNS('*', 'rtept'));
  if (nodes.length === 0) nodes = Array.from(doc.getElementsByTagNameNS('*', 'wpt'));

  const points: RoutePoint[] = [];
  for (const n of nodes) {
    const lat = Number(n.getAttribute('lat'));
    const lon = Number(n.getAttribute('lon'));
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
    const point: RoutePoint = { lat, lon };
    const ele = n.getElementsByTagNameNS('*', 'ele')[0]?.textContent?.trim();
    if (ele) point.ele = Number(ele);
    points.push(point);
  }

  if (points.length < 2) {
    throw new Error('This route GPX must contain at least 2 points.');
  }
  return points;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/gpx.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/gpx.ts src/lib/gpx.test.ts
git commit -m "feat: add GPX parser (track and route points)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Route loading (`routes.ts`) + sample route

**Files:**
- Create: `src/lib/routes.ts`, `src/lib/routes.test.ts`, `src/routes/sample-loop.gpx`

- [ ] **Step 1: Add a sample route file (so the app and glob have data to load)**

Create `src/routes/sample-loop.gpx`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="runukraine-sample" xmlns="http://www.topografix.com/GPX/1/1">
  <trk>
    <name>Sample Loop</name>
    <trkseg>
      <trkpt lat="50.4501" lon="30.5234"><ele>180</ele></trkpt>
      <trkpt lat="50.4530" lon="30.5234"><ele>182</ele></trkpt>
      <trkpt lat="50.4530" lon="30.5290"><ele>185</ele></trkpt>
      <trkpt lat="50.4501" lon="30.5290"><ele>183</ele></trkpt>
      <trkpt lat="50.4501" lon="30.5234"><ele>180</ele></trkpt>
    </trkseg>
  </trk>
</gpx>
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/routes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildRoute, filenameToName, loadBundledRoutes } from './routes';

const gpx = `<?xml version="1.0"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg>
  <trkpt lat="0" lon="0"></trkpt>
  <trkpt lat="0" lon="1"></trkpt>
</trkseg></trk></gpx>`;

describe('buildRoute', () => {
  it('builds a route with cumulative distances and length', () => {
    const r = buildRoute('Test', gpx);
    expect(r.name).toBe('Test');
    expect(r.points).toHaveLength(2);
    expect(r.cumulative[0]).toBe(0);
    expect(r.length).toBeGreaterThan(100000);
    expect(r.length).toBe(r.cumulative[r.cumulative.length - 1]);
  });
});

describe('filenameToName', () => {
  it('turns a file path into a title', () => {
    expect(filenameToName('../routes/kyiv-half_marathon.gpx')).toBe('Kyiv Half Marathon');
  });
});

describe('loadBundledRoutes', () => {
  it('loads at least the sample route, each with a positive length', () => {
    const routes = loadBundledRoutes();
    expect(routes.length).toBeGreaterThanOrEqual(1);
    for (const r of routes) {
      expect(r.length).toBeGreaterThan(0);
      expect(r.name.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/routes.test.ts`
Expected: FAIL — `routes` module not found / functions not exported.

- [ ] **Step 4: Implement `routes.ts`**

Create `src/lib/routes.ts`:

```ts
import type { Route } from '../types';
import { parseGpx } from './gpx';
import { cumulativeDistances } from './geo';

export function buildRoute(name: string, gpxXml: string): Route {
  const points = parseGpx(gpxXml);
  const cumulative = cumulativeDistances(points);
  return { name, points, cumulative, length: cumulative[cumulative.length - 1] };
}

export function filenameToName(path: string): string {
  const base = path.split('/').pop() ?? path;
  const stem = base.replace(/\.gpx$/i, '');
  return stem
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const modules = import.meta.glob('../routes/*.gpx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export function loadBundledRoutes(): Route[] {
  return Object.entries(modules)
    .map(([path, xml]) => buildRoute(filenameToName(path), xml))
    .sort((a, b) => a.name.localeCompare(b.name));
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/routes.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/routes.ts src/lib/routes.test.ts src/routes/sample-loop.gpx
git commit -m "feat: load bundled GPX routes via import.meta.glob

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: The merge (`merge.ts`)

**Files:**
- Create: `src/lib/merge.ts`
- Test: `src/lib/merge.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/merge.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mergeActivityWithRoute } from './merge';
import { cumulativeDistances } from './geo';
import type { GarminActivity, Route, RoutePoint } from '../types';

function straightRoute(): Route {
  const points: RoutePoint[] = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: 1 },
  ];
  const cumulative = cumulativeDistances(points);
  return { name: 'Straight', points, cumulative, length: cumulative[1] };
}

const activity: GarminActivity = {
  sport: 'Running',
  samples: [
    { time: new Date('2026-06-01T08:00:00Z'), distance: 0, hr: 130 },
    { time: new Date('2026-06-01T08:00:30Z'), distance: 5, hr: 150 },
    { time: new Date('2026-06-01T08:01:00Z'), distance: 10, hr: 170 },
  ],
};

describe('mergeActivityWithRoute', () => {
  it('maps the first sample to the route start and the last to the route finish', () => {
    const route = straightRoute();
    const merged = mergeActivityWithRoute(activity, route);
    expect(merged.samples[0].lon).toBeCloseTo(0, 5);
    expect(merged.samples[2].lon).toBeCloseTo(1, 5);
    expect(merged.samples[0].lat).toBeCloseTo(0, 5);
  });
  it('scales distances to the route length and keeps them monotonic', () => {
    const route = straightRoute();
    const merged = mergeActivityWithRoute(activity, route);
    expect(merged.samples[0].distance).toBeCloseTo(0, 5);
    expect(merged.samples[2].distance).toBeCloseTo(route.length, 3);
    expect(merged.samples[1].distance).toBeGreaterThan(merged.samples[0].distance);
    expect(merged.samples[1].distance).toBeLessThan(merged.samples[2].distance);
  });
  it('places the midpoint sample halfway along the route', () => {
    const route = straightRoute();
    const merged = mergeActivityWithRoute(activity, route);
    expect(merged.samples[1].lon).toBeCloseTo(0.5, 3);
  });
  it('preserves telemetry and sport', () => {
    const merged = mergeActivityWithRoute(activity, straightRoute());
    expect(merged.sport).toBe('Running');
    expect(merged.samples[2].hr).toBe(170);
  });
  it('throws when there is no usable distance', () => {
    const flat: GarminActivity = {
      samples: [
        { time: new Date('2026-06-01T08:00:00Z'), distance: 0 },
        { time: new Date('2026-06-01T08:00:30Z'), distance: 0 },
      ],
    };
    expect(() => mergeActivityWithRoute(flat, straightRoute())).toThrow(/distance/i);
  });
  it('throws when the route has fewer than 2 points', () => {
    const badRoute: Route = { name: 'x', points: [{ lat: 0, lon: 0 }], cumulative: [0], length: 0 };
    expect(() => mergeActivityWithRoute(activity, badRoute)).toThrow(/2 points/i);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/merge.test.ts`
Expected: FAIL — `mergeActivityWithRoute` not exported.

- [ ] **Step 3: Implement `merge.ts`**

Create `src/lib/merge.ts`:

```ts
import type { GarminActivity, MergedActivity, MergedSample, Route } from '../types';
import { interpolateAlongPath } from './geo';

export function mergeActivityWithRoute(
  activity: GarminActivity,
  route: Route,
): MergedActivity {
  if (activity.samples.length === 0) {
    throw new Error('This activity has no samples to merge.');
  }
  if (route.points.length < 2) {
    throw new Error('The route must have at least 2 points.');
  }
  const first = activity.samples[0];
  const last = activity.samples[activity.samples.length - 1];
  const garminTotal = last.distance - first.distance;
  if (garminTotal <= 0) {
    throw new Error('This activity has no usable distance to map onto the route.');
  }
  const scale = route.length / garminTotal;

  const samples: MergedSample[] = activity.samples.map((s) => {
    const mapped = (s.distance - first.distance) * scale;
    const p = interpolateAlongPath(route.points, route.cumulative, mapped);
    return {
      ...s,
      distance: mapped,
      lat: p.lat,
      lon: p.lon,
      altitude: s.altitude ?? p.ele,
    };
  });

  return { samples, sport: activity.sport };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/merge.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/merge.ts src/lib/merge.test.ts
git commit -m "feat: add distance-based merge (scale telemetry onto route)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: TCX writer (`tcxWriter.ts`)

**Files:**
- Create: `src/lib/tcxWriter.ts`
- Test: `src/lib/tcxWriter.test.ts`

- [ ] **Step 1: Write the failing tests (round-trip through the parser)**

Create `src/lib/tcxWriter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { serializeTcx } from './tcxWriter';
import { parseTcx } from './tcx';
import type { MergedActivity } from '../types';

const merged: MergedActivity = {
  sport: 'Running',
  samples: [
    { time: new Date('2026-06-01T08:00:00Z'), distance: 0, lat: 50.1, lon: 30.1, hr: 140, cadence: 85, altitude: 120 },
    { time: new Date('2026-06-01T08:00:30Z'), distance: 100, lat: 50.2, lon: 30.2, hr: 150, cadence: 88, altitude: 122 },
  ],
};

describe('serializeTcx', () => {
  it('produces valid XML that round-trips through parseTcx', () => {
    const xml = serializeTcx(merged);
    expect(xml).toContain('<LatitudeDegrees>');
    const reparsed = parseTcx(xml);
    expect(reparsed.sport).toBe('Running');
    expect(reparsed.samples).toHaveLength(2);
    expect(reparsed.samples[0].distance).toBeCloseTo(0, 2);
    expect(reparsed.samples[1].distance).toBeCloseTo(100, 2);
    expect(reparsed.samples[0].hr).toBe(140);
    expect(reparsed.samples[0].cadence).toBe(85);
    expect(reparsed.samples[0].altitude).toBeCloseTo(120, 2);
    expect(reparsed.samples[1].lat).toBeCloseTo(50.2, 5);
    expect(reparsed.samples[1].lon).toBeCloseTo(30.2, 5);
  });
  it('throws on an empty activity', () => {
    expect(() => serializeTcx({ samples: [] })).toThrow();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/tcxWriter.test.ts`
Expected: FAIL — `serializeTcx` not exported.

- [ ] **Step 3: Implement `tcxWriter.ts`**

Create `src/lib/tcxWriter.ts`:

```ts
import type { MergedActivity, MergedSample } from '../types';

function fmt(n: number, digits = 6): string {
  return n.toFixed(digits);
}

function trackpointXml(s: MergedSample): string {
  const parts: string[] = [
    '        <Trackpoint>',
    `          <Time>${s.time.toISOString()}</Time>`,
    '          <Position>',
    `            <LatitudeDegrees>${fmt(s.lat)}</LatitudeDegrees>`,
    `            <LongitudeDegrees>${fmt(s.lon)}</LongitudeDegrees>`,
    '          </Position>',
  ];
  if (s.altitude !== undefined) {
    parts.push(`          <AltitudeMeters>${fmt(s.altitude, 2)}</AltitudeMeters>`);
  }
  parts.push(`          <DistanceMeters>${fmt(s.distance, 2)}</DistanceMeters>`);
  if (s.hr !== undefined) {
    parts.push(`          <HeartRateBpm><Value>${Math.round(s.hr)}</Value></HeartRateBpm>`);
  }
  if (s.cadence !== undefined) {
    parts.push(
      `          <Extensions><ns3:TPX><ns3:RunCadence>${Math.round(s.cadence)}</ns3:RunCadence></ns3:TPX></Extensions>`,
    );
  }
  parts.push('        </Trackpoint>');
  return parts.join('\n');
}

export function serializeTcx(activity: MergedActivity): string {
  const { samples } = activity;
  if (samples.length === 0) throw new Error('Cannot export an empty activity.');
  const sport = activity.sport ?? 'Running';
  const startTime = samples[0].time.toISOString();
  const totalSeconds =
    (samples[samples.length - 1].time.getTime() - samples[0].time.getTime()) / 1000;
  const totalDistance = samples[samples.length - 1].distance;
  const trackpoints = samples.map(trackpointXml).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase
  xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
  <Activities>
    <Activity Sport="${sport}">
      <Id>${startTime}</Id>
      <Lap StartTime="${startTime}">
        <TotalTimeSeconds>${fmt(totalSeconds, 2)}</TotalTimeSeconds>
        <DistanceMeters>${fmt(totalDistance, 2)}</DistanceMeters>
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
        <Track>
${trackpoints}
        </Track>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/tcxWriter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tcxWriter.ts src/lib/tcxWriter.test.ts
git commit -m "feat: add TCX writer with round-trip telemetry

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Download helper (`download.ts`)

**Files:**
- Create: `src/lib/download.ts`
- Test: `src/lib/download.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/download.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadText } from './download';

describe('downloadText', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  it('creates an anchor with the given filename and clicks it', () => {
    const downloads: string[] = [];
    const original = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    };

    downloadText('out.tcx', '<xml/>');

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(downloads).toEqual(['out.tcx']);

    HTMLAnchorElement.prototype.click = original;
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/download.test.ts`
Expected: FAIL — `downloadText` not exported.

- [ ] **Step 3: Implement `download.ts`**

Create `src/lib/download.ts`:

```ts
export function downloadText(
  filename: string,
  text: string,
  mime = 'application/xml',
): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/download.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/download.ts src/lib/download.test.ts
git commit -m "feat: add browser download helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: StatsSummary component

**Files:**
- Create: `src/components/StatsSummary.tsx`
- Test: `src/components/StatsSummary.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/StatsSummary.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsSummary } from './StatsSummary';

describe('StatsSummary', () => {
  it('renders distance, time and heart rate', () => {
    render(
      <StatsSummary
        stats={{ distanceMeters: 5000, elapsedSeconds: 1830, avgHr: 150, maxHr: 175, avgCadence: 86 }}
      />,
    );
    expect(screen.getByText('5.00 km')).toBeInTheDocument();
    expect(screen.getByText('30:30')).toBeInTheDocument();
    expect(screen.getByText('150 bpm')).toBeInTheDocument();
  });
  it('omits heart rate rows when absent', () => {
    render(<StatsSummary stats={{ distanceMeters: 1000, elapsedSeconds: 300 }} />);
    expect(screen.queryByText(/bpm/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/StatsSummary.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `StatsSummary.tsx`**

Create `src/components/StatsSummary.tsx`:

```tsx
import type { ActivityStats } from '../types';

function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function StatsSummary({ stats }: { stats: ActivityStats }) {
  return (
    <dl className="stats">
      <div>
        <dt>Distance</dt>
        <dd>{(stats.distanceMeters / 1000).toFixed(2)} km</dd>
      </div>
      <div>
        <dt>Time</dt>
        <dd>{formatDuration(stats.elapsedSeconds)}</dd>
      </div>
      {stats.avgHr !== undefined && (
        <div>
          <dt>Avg HR</dt>
          <dd>{stats.avgHr} bpm</dd>
        </div>
      )}
      {stats.maxHr !== undefined && (
        <div>
          <dt>Max HR</dt>
          <dd>{stats.maxHr} bpm</dd>
        </div>
      )}
      {stats.avgCadence !== undefined && (
        <div>
          <dt>Avg cadence</dt>
          <dd>{stats.avgCadence} spm</dd>
        </div>
      )}
    </dl>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/StatsSummary.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/StatsSummary.tsx src/components/StatsSummary.test.tsx
git commit -m "feat: add StatsSummary component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: RoutePicker component

**Files:**
- Create: `src/components/RoutePicker.tsx`
- Test: `src/components/RoutePicker.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/RoutePicker.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RoutePicker } from './RoutePicker';
import type { Route } from '../types';

const routes: Route[] = [
  { name: 'Kyiv 10K', points: [{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }], cumulative: [0, 1000], length: 10000 },
];

describe('RoutePicker', () => {
  it('lists routes with their distance and fires onSelect', () => {
    const onSelect = vi.fn();
    render(<RoutePicker routes={routes} selected={null} onSelect={onSelect} />);
    const button = screen.getByRole('button', { name: /Kyiv 10K/ });
    expect(button).toHaveTextContent('10.00 km');
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith(routes[0]);
  });
  it('shows a hint when there are no routes', () => {
    render(<RoutePicker routes={[]} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/no routes available/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/RoutePicker.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `RoutePicker.tsx`**

Create `src/components/RoutePicker.tsx`:

```tsx
import type { Route } from '../types';

export function RoutePicker({
  routes,
  selected,
  onSelect,
}: {
  routes: Route[];
  selected: Route | null;
  onSelect: (route: Route) => void;
}) {
  if (routes.length === 0) {
    return (
      <p>
        No routes available yet. Add <code>.gpx</code> files to <code>src/routes/</code>.
      </p>
    );
  }
  return (
    <ul className="route-picker">
      {routes.map((r) => (
        <li key={r.name}>
          <button
            type="button"
            aria-pressed={selected?.name === r.name}
            onClick={() => onSelect(r)}
          >
            {r.name} — {(r.length / 1000).toFixed(2)} km
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/RoutePicker.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/RoutePicker.tsx src/components/RoutePicker.test.tsx
git commit -m "feat: add RoutePicker component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 13: FileDrop component

**Files:**
- Create: `src/components/FileDrop.tsx`
- Test: `src/components/FileDrop.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/FileDrop.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileDrop } from './FileDrop';

describe('FileDrop', () => {
  it('reads the chosen file and calls onFile with its text and name', async () => {
    const onFile = vi.fn();
    render(<FileDrop onFile={onFile} label="Choose file" />);
    const input = screen.getByLabelText('Choose file') as HTMLInputElement;
    const file = new File(['<tcx/>'], 'run.tcx', { type: 'application/xml' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onFile).toHaveBeenCalledWith('<tcx/>', 'run.tcx'));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/FileDrop.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `FileDrop.tsx`**

Create `src/components/FileDrop.tsx`:

```tsx
export function FileDrop({
  onFile,
  accept = '.tcx',
  label = 'Choose your Garmin .tcx file',
}: {
  onFile: (text: string, filename: string) => void;
  accept?: string;
  label?: string;
}) {
  async function handle(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    onFile(text, file.name);
  }
  return (
    <div className="file-drop">
      <label>
        {label}
        <input
          type="file"
          accept={accept}
          onChange={(e) => handle(e.target.files?.[0])}
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/FileDrop.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/FileDrop.tsx src/components/FileDrop.test.tsx
git commit -m "feat: add FileDrop component

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 14: MapPreview component

**Files:**
- Create: `src/components/MapPreview.tsx`

No unit test: react-leaflet renders a real Leaflet map that needs DOM sizing not available in jsdom. This component is verified manually in Task 16.

- [ ] **Step 1: Implement `MapPreview.tsx`**

Create `src/components/MapPreview.tsx`:

```tsx
import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import type { LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import type { MergedSample, GarminSample } from '../types';

function FitBounds({ line }: { line: LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (line.length > 1) {
      map.fitBounds(line as LatLngBoundsExpression);
    }
  }, [map, line]);
  return null;
}

export function MapPreview({
  merged,
  original,
}: {
  merged: MergedSample[];
  original?: GarminSample[];
}) {
  const mergedLine: LatLngExpression[] = merged.map((s) => [s.lat, s.lon]);
  const originalLine: LatLngExpression[] = (original ?? [])
    .filter((s) => s.lat !== undefined && s.lon !== undefined)
    .map((s) => [s.lat as number, s.lon as number]);
  const center: LatLngExpression = mergedLine[0] ?? [50.45, 30.52];

  return (
    <MapContainer center={center} zoom={13} style={{ height: 400, width: '100%' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {originalLine.length > 1 && (
        <Polyline positions={originalLine} pathOptions={{ color: '#bbb', weight: 2, dashArray: '4' }} />
      )}
      {mergedLine.length > 1 && (
        <Polyline positions={mergedLine} pathOptions={{ color: '#0a84ff', weight: 4 }} />
      )}
      <FitBounds line={mergedLine} />
    </MapContainer>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc -b`
Expected: no errors. (The Vite template uses project references, so `tsc -b` is the correct typecheck command.)

- [ ] **Step 3: Commit**

```bash
git add src/components/MapPreview.tsx
git commit -m "feat: add MapPreview with before/after polylines

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 15: Wire up the app (`App.tsx`, `main.tsx`, styles)

**Files:**
- Modify: `src/App.tsx` (replace template contents)
- Modify: `src/main.tsx` (add leaflet CSS import)
- Modify: `src/index.css` (replace with minimal styles)
- Delete: `src/App.css` (template leftover, if present)

- [ ] **Step 1: Replace `src/App.tsx`**

Replace the entire contents of `src/App.tsx` with:

```tsx
import { useMemo, useState } from 'react';
import { parseTcx } from './lib/tcx';
import { loadBundledRoutes } from './lib/routes';
import { mergeActivityWithRoute } from './lib/merge';
import { computeStats } from './lib/stats';
import { serializeTcx } from './lib/tcxWriter';
import { downloadText } from './lib/download';
import { FileDrop } from './components/FileDrop';
import { RoutePicker } from './components/RoutePicker';
import { MapPreview } from './components/MapPreview';
import { StatsSummary } from './components/StatsSummary';
import type { GarminActivity, MergedActivity, Route } from './types';

export default function App() {
  const routes = useMemo(() => loadBundledRoutes(), []);
  const [activity, setActivity] = useState<GarminActivity | null>(null);
  const [filename, setFilename] = useState<string>('activity');
  const [route, setRoute] = useState<Route | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(text: string, name: string) {
    try {
      setActivity(parseTcx(text));
      setFilename(name.replace(/\.tcx$/i, ''));
      setError(null);
    } catch (e) {
      setActivity(null);
      setError((e as Error).message);
    }
  }

  const { merged, mergeError } = useMemo<{
    merged: MergedActivity | null;
    mergeError: string | null;
  }>(() => {
    if (!activity || !route) return { merged: null, mergeError: null };
    try {
      return { merged: mergeActivityWithRoute(activity, route), mergeError: null };
    } catch (e) {
      return { merged: null, mergeError: (e as Error).message };
    }
  }, [activity, route]);

  function handleDownload() {
    if (!merged) return;
    const safe = `${filename}-${route?.name ?? 'route'}.tcx`.replace(/\s+/g, '-');
    downloadText(safe, serializeTcx(merged));
  }

  return (
    <main className="app">
      <h1>RunUkraine — track merger</h1>
      <p className="lede">
        Paint your Garmin telemetry onto an official event route when GPS was jammed.
      </p>

      {(error || mergeError) && (
        <p className="error" role="alert">
          {error ?? mergeError}
        </p>
      )}

      <section>
        <h2>1. Your Garmin activity</h2>
        <FileDrop onFile={handleFile} />
        {activity && <p>Loaded {activity.samples.length} points.</p>}
      </section>

      {activity && (
        <section>
          <h2>2. Pick the official route</h2>
          <RoutePicker routes={routes} selected={route} onSelect={setRoute} />
        </section>
      )}

      {merged && (
        <section>
          <h2>3. Preview &amp; download</h2>
          <MapPreview merged={merged.samples} original={activity?.samples} />
          <StatsSummary stats={computeStats(merged.samples)} />
          <button type="button" onClick={handleDownload}>
            Download merged .tcx
          </button>
          <p>
            Then upload it at{' '}
            <a href="https://www.strava.com/upload/select" target="_blank" rel="noreferrer">
              strava.com/upload
            </a>
            .
          </p>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Update `src/main.tsx` to import Leaflet's CSS**

Replace the entire contents of `src/main.tsx` with:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 3: Replace `src/index.css` with minimal styles**

Replace the entire contents of `src/index.css` with:

```css
:root {
  font-family: system-ui, sans-serif;
  color: #1c1c1e;
  background: #f7f7f8;
}
body {
  margin: 0;
}
.app {
  max-width: 760px;
  margin: 0 auto;
  padding: 24px;
}
.lede {
  color: #555;
}
section {
  margin: 24px 0;
  padding: 16px;
  background: #fff;
  border: 1px solid #e3e3e6;
  border-radius: 10px;
}
.error {
  background: #ffe5e5;
  color: #a40000;
  padding: 10px 12px;
  border-radius: 8px;
}
.route-picker {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.route-picker button {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border: 1px solid #d0d0d4;
  border-radius: 8px;
  background: #fafafa;
  cursor: pointer;
}
.route-picker button[aria-pressed='true'] {
  border-color: #0a84ff;
  background: #eaf3ff;
}
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin: 16px 0;
}
.stats dt {
  font-size: 12px;
  color: #777;
}
.stats dd {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
button {
  font: inherit;
}
```

- [ ] **Step 4: Remove the template's leftover `App.css` import and file (if present)**

If `src/App.tsx` previously imported `./App.css`, that import is already gone (we replaced the file). Delete the now-unused file if it exists:

```bash
rm -f src/App.css
```

- [ ] **Step 5: Run the full test suite and typecheck**

Run: `npm test && npx tsc -b`
Expected: all tests PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: wire up upload -> route -> preview -> download flow

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 16: End-to-end manual verification + README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Build the app (catches production-only errors)**

Run: `npm run build`
Expected: build succeeds, `dist/` produced, no errors.

- [ ] **Step 2: Run the dev server and verify the full flow in a browser**

Run: `npm run dev`
Then in the browser at the printed URL:
- Confirm the page loads with heading "RunUkraine — track merger".
- Export a `.tcx` from Garmin Connect (or use any TCX with a distance stream) and choose it under step 1; confirm "Loaded N points."
- Under step 2, pick "Sample Loop".
- Under step 3, confirm the map shows a blue merged track following the sample loop, stats show distance/time/HR, and clicking "Download merged .tcx" downloads a file.
- Re-import the downloaded file at step 1 to confirm it parses (round-trip sanity check).

Expected: all steps work; no console errors except possibly tile-loading if offline.

- [ ] **Step 3: Write the README**

Create `README.md`:

```markdown
# RunUkraine

Merge a Garmin `.tcx` activity (real telemetry, broken GPS) with an official event
route `.gpx` (clean path, no telemetry), then download a merged `.tcx` to upload to
Strava. 100% client-side — no backend, no accounts.

## Why

Where GPS is jammed, a Garmin watch still records time, distance, heart rate, cadence
and altitude, but the GPS track is missing or garbage. This tool paints that telemetry
onto the true course (scaled to fit the official distance) so the activity looks right.

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
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Done

All domain logic is unit-tested; the UI is wired and manually verified end-to-end. To add
real events, drop their `.gpx` files into `src/routes/` and rebuild.
