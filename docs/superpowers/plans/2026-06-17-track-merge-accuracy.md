# Track Merge Accuracy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the global-scale track merge with a GPS-anchored, monotone piecewise-linear distance→route mapping that contains localized GPS errors locally, plus the supporting cleaning fixes, vertex resampling, and a non-blocking discrepancy warning.

**Architecture:** A monotone piecewise-linear function `mapDistance: recordedDistance → routeArcLength` is built from GPS "anchors" (clean fixes projected onto the route). Positions are read off the route at the mapped arc-length. Today's global scale is the degenerate zero-anchor case (two synthetic endpoint knots), so the fallback is the same code path with different inputs.

**Tech Stack:** TypeScript (~6.0), React 19, Vite 8, Vitest 4. 100% client-side, no new dependencies.

## Global Constraints

- 100% client-side; no backend, no new npm dependencies.
- Do not change existing `AppError` codes; reuse `mergeNoSamples`, `mergeRouteTooFewPoints`, `mergeNoDistance`.
- i18n uses a typed `Messages` table (`src/i18n/messages.ts`): any new key must be added to the `Messages` type **and** to both the `en` and `uk` tables. `{name}` placeholders are filled by `t(key, params)`.
- Existing tests must stay green — in particular `src/lib/merge.test.ts` (the global-scale assertions become the zero-anchor fallback).
- Tunable thresholds live in one file, `src/lib/mergeConfig.ts`.
- TDD: write the failing test first, watch it fail, implement minimally, watch it pass, commit.
- Test runner command form: `npx vitest run <file>` (single file) or `npx vitest run` (all).

---

### Task 1: Point-to-path projection (`geo.projectPointToPath`)

**Files:**
- Modify: `src/lib/geo.ts`
- Test: `src/lib/geo.test.ts`

**Interfaces:**
- Consumes: existing `RoutePoint`, `cumulativeDistances`.
- Produces: `interface PathProjection { arcLength: number; residualMeters: number }` and `projectPointToPath(points: RoutePoint[], cumulative: number[], lat: number, lon: number, fromArc?: number): PathProjection`. Projects a lat/lon onto the route polyline, searching only at arc-lengths ≥ `fromArc` (default 0), returning the minimum-residual foot point. Uses a local equirectangular (flat-earth) projection per segment — accurate at running scales.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/geo.test.ts`:

```ts
import { haversine, cumulativeDistances, interpolateAlongPath, projectPointToPath } from './geo';

describe('projectPointToPath', () => {
  const pts: RoutePoint[] = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: 1 }, // ~111195 m east along the equator
  ];
  const cum = cumulativeDistances(pts);

  it('projects a point on the path to ~0 residual at its arc-length', () => {
    const r = projectPointToPath(pts, cum, 0, 0.5);
    expect(r.residualMeters).toBeLessThan(1);
    expect(r.arcLength).toBeCloseTo(cum[1] / 2, -1); // within ~10 m
  });

  it('measures perpendicular offset as the residual', () => {
    const r = projectPointToPath(pts, cum, 0.001, 0.5); // ~111 m north of the line
    expect(r.residualMeters).toBeGreaterThan(100);
    expect(r.residualMeters).toBeLessThan(125);
  });

  it('clamps the foot point to the segment ends', () => {
    const r = projectPointToPath(pts, cum, 0, 2); // beyond the east end
    expect(r.arcLength).toBeCloseTo(cum[1], -1);
  });

  it('never returns an arc-length earlier than fromArc', () => {
    const r = projectPointToPath(pts, cum, 0, 0.1, cum[1] / 2);
    expect(r.arcLength).toBeGreaterThanOrEqual(cum[1] / 2 - 1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/geo.test.ts`
Expected: FAIL — `projectPointToPath is not a function` / not exported.

- [ ] **Step 3: Implement `projectPointToPath`**

Append to `src/lib/geo.ts`:

```ts
export interface PathProjection {
  arcLength: number;
  residualMeters: number;
}

export function projectPointToPath(
  points: RoutePoint[],
  cumulative: number[],
  lat: number,
  lon: number,
  fromArc = 0,
): PathProjection {
  const total = cumulative[cumulative.length - 1];
  const from = Math.max(0, Math.min(fromArc, total));
  const mPerDegLat = 111320;
  const toRad = (d: number) => (d * Math.PI) / 180;

  // start at the first segment whose far end is at/after `from`
  let startSeg = 0;
  while (startSeg < points.length - 2 && cumulative[startSeg + 1] < from) startSeg++;

  let best: PathProjection = { arcLength: from, residualMeters: Infinity };
  for (let i = startSeg; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segLen = cumulative[i + 1] - cumulative[i];
    if (segLen === 0) continue;
    const mPerDegLon = mPerDegLat * Math.cos(toRad(a.lat));
    const bx = (b.lon - a.lon) * mPerDegLon;
    const by = (b.lat - a.lat) * mPerDegLat;
    const px = (lon - a.lon) * mPerDegLon;
    const py = (lat - a.lat) * mPerDegLat;
    const len2 = bx * bx + by * by;
    let t = len2 === 0 ? 0 : (px * bx + py * by) / len2;
    // clamp so the foot's arc-length stays within [from, segment end]
    const tMin = Math.max(0, (from - cumulative[i]) / segLen);
    t = Math.max(tMin, Math.min(1, t));
    const fx = t * bx;
    const fy = t * by;
    const residual = Math.hypot(px - fx, py - fy);
    if (residual < best.residualMeters) {
      best = { arcLength: cumulative[i] + t * segLen, residualMeters: residual };
    }
  }
  return best;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/geo.test.ts`
Expected: PASS (all `projectPointToPath` tests plus the pre-existing geo tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/geo.ts src/lib/geo.test.ts
git commit -m "feat(geo): add projectPointToPath for GPS-to-route projection"
```

---

### Task 2: Distance cleaning + dumb parser (`clean.cleanDistanceStream`, `mergeConfig`)

Moves the lap-reset heuristic out of the parser into a testable cleaning function, fixes the jitter-misread-as-reset bug, adds monotonic clamping and speed-outlier flags, and creates the shared config file.

**Files:**
- Create: `src/lib/mergeConfig.ts`
- Create: `src/lib/clean.ts`
- Create: `src/lib/clean.test.ts`
- Modify: `src/lib/tcx.ts` (remove offset/reset logic; emit raw per-trackpoint distance)
- Modify: `src/lib/tcx.test.ts` (parser now returns raw distances)

**Interfaces:**
- Consumes: `GarminSample` (existing).
- Produces:
  - `mergeConfig.ts`: `RESIDUAL_MAX=35`, `MIN_ANCHORS=3`, `RESET_RATIO=0.5`, `MAX_SPEED_RUN=12.5`, `MAX_SPEED_BIKE=25`, `PARTIAL_THRESHOLD=0.98`, `MAX_TRACKPOINTS=10000`, and `maxSpeedForSport(sport?: string): number`.
  - `clean.ts`: `interface CleanedStream { samples: GarminSample[]; flagged: boolean[] }` and `cleanDistanceStream(samples: GarminSample[], sport?: string): CleanedStream`. Returns samples with monotonic, lap-merged `distance`; `flagged[i]` is true when the step from sample `i-1` to `i` implies an implausible speed (`flagged[0]` is always false).

- [ ] **Step 1: Create the config file**

Create `src/lib/mergeConfig.ts`:

```ts
export const RESIDUAL_MAX = 35; // m — max GPS-to-route distance to trust a fix as an anchor
export const MIN_ANCHORS = 3; // below this → global-scale fallback
export const RESET_RATIO = 0.5; // raw drop fraction that counts as a lap reset
export const MAX_SPEED_RUN = 12.5; // m/s (~45 km/h)
export const MAX_SPEED_BIKE = 25; // m/s (~90 km/h)
export const PARTIAL_THRESHOLD = 0.98; // coveredFraction below this → "partial" warning
export const MAX_TRACKPOINTS = 10000; // resampling ceiling

export function maxSpeedForSport(sport?: string): number {
  const s = (sport ?? '').toLowerCase();
  if (s.includes('bik') || s.includes('cycl') || s.includes('ride')) return MAX_SPEED_BIKE;
  return MAX_SPEED_RUN;
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/clean.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { cleanDistanceStream } from './clean';
import type { GarminSample } from '../types';

function sample(tSec: number, distance: number): GarminSample {
  return { time: new Date(2026, 0, 1, 0, 0, tSec), distance };
}

describe('cleanDistanceStream', () => {
  it('merges lap-reset distance counters into one monotonic stream', () => {
    const { samples } = cleanDistanceStream([
      sample(0, 0),
      sample(30, 500),
      sample(60, 0), // new lap — counter reset to ~0
      sample(90, 400),
    ]);
    expect(samples.map((s) => s.distance)).toEqual([0, 500, 500, 900]);
  });

  it('does NOT treat a small backward jitter as a reset (clamps monotonically)', () => {
    const { samples } = cleanDistanceStream([
      sample(0, 100),
      sample(30, 95), // 5 m GPS wobble, not a lap reset
      sample(60, 200),
    ]);
    expect(samples.map((s) => s.distance)).toEqual([100, 100, 200]);
  });

  it('flags steps implying an impossible running speed', () => {
    const { flagged } = cleanDistanceStream([
      sample(0, 0),
      sample(1, 10), // 10 m in 1 s = 36 km/h — ok for running
      sample(2, 100), // 90 m in 1 s = 324 km/h — impossible
    ]);
    expect(flagged).toEqual([false, false, true]);
  });

  it('uses the bike speed cap for cycling activities', () => {
    const fast = [sample(0, 0), sample(1, 20)]; // 72 km/h
    expect(cleanDistanceStream(fast, 'Running').flagged[1]).toBe(true);
    expect(cleanDistanceStream(fast, 'Biking').flagged[1]).toBe(false);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/clean.test.ts`
Expected: FAIL — `cleanDistanceStream is not a function` / module not found.

- [ ] **Step 4: Implement `cleanDistanceStream`**

Create `src/lib/clean.ts`:

```ts
import type { GarminSample } from '../types';
import { RESET_RATIO, maxSpeedForSport } from './mergeConfig';

export interface CleanedStream {
  samples: GarminSample[];
  flagged: boolean[];
}

export function cleanDistanceStream(samples: GarminSample[], sport?: string): CleanedStream {
  const maxSpeed = maxSpeedForSport(sport);
  const out: GarminSample[] = [];
  const flagged: boolean[] = [];
  let offset = 0;
  let prevRaw = Number.NEGATIVE_INFINITY;
  let lastCum = Number.NEGATIVE_INFINITY;

  for (const original of samples) {
    const raw = original.distance;
    if (prevRaw !== Number.NEGATIVE_INFINITY && raw < prevRaw * RESET_RATIO) {
      offset += prevRaw; // sharp drop toward zero → lap counter reset
    }
    let cum = raw + offset;
    if (cum < lastCum) cum = lastCum; // monotonic clamp for small backward jitter

    if (out.length > 0) {
      const prev = out[out.length - 1];
      const dt = (original.time.getTime() - prev.time.getTime()) / 1000;
      const dd = cum - prev.distance;
      const v = dt > 0 ? dd / dt : Number.POSITIVE_INFINITY;
      flagged.push(v > maxSpeed);
    } else {
      flagged.push(false);
    }

    out.push({ ...original, distance: cum });
    prevRaw = raw;
    lastCum = cum;
  }

  return { samples: out, flagged };
}
```

- [ ] **Step 5: Run the new tests to verify they pass**

Run: `npx vitest run src/lib/clean.test.ts`
Expected: PASS.

- [ ] **Step 6: Simplify the parser to emit raw distance**

In `src/lib/tcx.ts`, replace the per-trackpoint loop body so it no longer applies offset/reset. Change these lines:

Remove:
```ts
  let offset = 0;
  let lastCum = -Infinity;
```
and inside the loop replace:
```ts
    let cum = Number(distStr) + offset;
    if (cum < lastCum) {
      // the device reset its distance counter (new lap) — continue from where we were
      offset = lastCum;
      cum = Number(distStr) + offset;
    }
    lastCum = cum;

    const sample: GarminSample = { time: new Date(timeStr), distance: cum };
```
with:
```ts
    const sample: GarminSample = { time: new Date(timeStr), distance: Number(distStr) };
```

(The lap-merging now happens in `cleanDistanceStream`.)

- [ ] **Step 7: Update the parser test for raw extraction**

In `src/lib/tcx.test.ts`, replace the `flattens laps` test with a raw-extraction test:

```ts
  it('extracts raw per-trackpoint distances (lap merging happens in clean)', () => {
    const a = parseTcx(twoLapsReset);
    expect(a.samples.map((s) => s.distance)).toEqual([0, 500, 0, 400]);
  });
```

- [ ] **Step 8: Run the parser tests + clean tests to verify they pass**

Run: `npx vitest run src/lib/tcx.test.ts src/lib/clean.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/mergeConfig.ts src/lib/clean.ts src/lib/clean.test.ts src/lib/tcx.ts src/lib/tcx.test.ts
git commit -m "feat(clean): move lap merging out of parser, fix jitter bug, add speed flags"
```

---

### Task 3: Build GPS anchors (`anchors.buildAnchors`)

**Files:**
- Create: `src/lib/anchors.ts`
- Create: `src/lib/anchors.test.ts`

**Interfaces:**
- Consumes: `projectPointToPath` (Task 1), `RESIDUAL_MAX` (Task 2), `GarminSample`, `Route`.
- Produces: `interface Anchor { sampleIndex: number; recordedDistance: number; routeArcLength: number }` and `buildAnchors(samples: GarminSample[], route: Route): Anchor[]`. Walks samples in order; for each with lat/lon, projects forward-only (arc ≥ last accepted anchor's arc); keeps fixes with `residualMeters ≤ RESIDUAL_MAX`. Anchors are monotone in `routeArcLength` by construction.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/anchors.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildAnchors } from './anchors';
import { cumulativeDistances } from './geo';
import type { GarminSample, Route, RoutePoint } from '../types';

const M_PER_DEG_LON = 111320; // at the equator

function eastRoute(lonEnd: number): Route {
  const points: RoutePoint[] = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: lonEnd },
  ];
  const cumulative = cumulativeDistances(points);
  return { name: 'East', points, cumulative, length: cumulative[1] };
}

function gpsSample(tSec: number, distance: number, lat: number, lon: number): GarminSample {
  return { time: new Date(2026, 0, 1, 0, 0, tSec), distance, lat, lon };
}

describe('buildAnchors', () => {
  it('anchors clean on-route fixes at their true arc-length', () => {
    const route = eastRoute(0.05); // ~5566 m
    const samples: GarminSample[] = [0, 1000, 2000, 3000].map((d, i) =>
      gpsSample(i * 30, d, 0, d / M_PER_DEG_LON),
    );
    const anchors = buildAnchors(samples, route);
    expect(anchors).toHaveLength(4);
    for (const a of anchors) {
      expect(a.routeArcLength).toBeCloseTo(a.recordedDistance, -1); // within ~10 m
    }
  });

  it('rejects fixes that are far off the route', () => {
    const route = eastRoute(0.05);
    const samples: GarminSample[] = [
      gpsSample(0, 0, 0, 0),
      gpsSample(30, 1000, 0.01, 1000 / M_PER_DEG_LON), // ~1.1 km north — jammed
      gpsSample(60, 2000, 0, 2000 / M_PER_DEG_LON),
    ];
    const anchors = buildAnchors(samples, route);
    expect(anchors.map((a) => a.sampleIndex)).toEqual([0, 2]);
  });

  it('keeps arc-length monotonic across an out-and-back turnaround', () => {
    // route goes east then back west to the start
    const points: RoutePoint[] = [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 0.02 },
      { lat: 0, lon: 0 },
    ];
    const cumulative = cumulativeDistances(points);
    const route: Route = { name: 'OutBack', points, cumulative, length: cumulative[2] };
    const outLen = cumulative[1];
    // runner near the turnaround then slightly back toward start
    const samples: GarminSample[] = [
      gpsSample(0, 0, 0, 0.018),
      gpsSample(30, 200, 0, 0.02),
      gpsSample(60, 400, 0, 0.018), // same longitude as sample 0, but later on the route
    ];
    const anchors = buildAnchors(samples, route);
    const arcs = anchors.map((a) => a.routeArcLength);
    for (let i = 1; i < arcs.length; i++) {
      expect(arcs[i]).toBeGreaterThanOrEqual(arcs[i - 1]);
    }
    expect(arcs[arcs.length - 1]).toBeGreaterThan(outLen); // last fix is on the return leg
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/anchors.test.ts`
Expected: FAIL — `buildAnchors is not a function`.

- [ ] **Step 3: Implement `buildAnchors`**

Create `src/lib/anchors.ts`:

```ts
import type { GarminSample, Route } from '../types';
import { projectPointToPath } from './geo';
import { RESIDUAL_MAX } from './mergeConfig';

export interface Anchor {
  sampleIndex: number;
  recordedDistance: number;
  routeArcLength: number;
}

export function buildAnchors(samples: GarminSample[], route: Route): Anchor[] {
  const anchors: Anchor[] = [];
  let minArc = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    if (s.lat === undefined || s.lon === undefined) continue;
    const proj = projectPointToPath(route.points, route.cumulative, s.lat, s.lon, minArc);
    if (proj.residualMeters <= RESIDUAL_MAX) {
      anchors.push({
        sampleIndex: i,
        recordedDistance: s.distance,
        routeArcLength: proj.arcLength,
      });
      minArc = proj.arcLength;
    }
  }
  return anchors;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/anchors.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/anchors.ts src/lib/anchors.test.ts
git commit -m "feat(anchors): project clean GPS onto the route as monotone anchors"
```

---

### Task 4: Build the distance map (`distanceMap.buildDistanceMap`)

**Files:**
- Create: `src/lib/distanceMap.ts`
- Create: `src/lib/distanceMap.test.ts`

**Interfaces:**
- Consumes: `Anchor` (Task 3), `MIN_ANCHORS` (Task 2), `GarminSample`, `Route`.
- Produces: `interface DistanceMap { mapDistance(recordedDistance: number, timeMs: number): number; fallbackUsed: boolean; finalArc: number }` and `buildDistanceMap(samples: GarminSample[], anchors: Anchor[], flagged: boolean[], route: Route): DistanceMap`.
  - With `< MIN_ANCHORS` anchors: two synthetic endpoint knots `(firstDistance, 0)` and `(lastDistance, routeLength)` → `mapDistance` is exactly the current global linear scale; `fallbackUsed = true`.
  - Otherwise: anchors are the knots. Inside a span, interpolate arc-length by recorded-distance fraction, unless the span contains a speed-flagged step, in which case interpolate by time fraction. Outside the anchor range, extrapolate by the adjacent segment's slope and clamp to `[0, routeLength]`.
  - `finalArc = mapDistance(lastDistance, lastTimeMs)` — used for `coveredFraction`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/distanceMap.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildDistanceMap } from './distanceMap';
import { cumulativeDistances } from './geo';
import { buildAnchors } from './anchors';
import { cleanDistanceStream } from './clean';
import type { GarminSample, Route, RoutePoint } from '../types';

const M_PER_DEG_LON = 111320;

function eastRoute(lonEnd: number): Route {
  const points: RoutePoint[] = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: lonEnd },
  ];
  const cumulative = cumulativeDistances(points);
  return { name: 'East', points, cumulative, length: cumulative[1] };
}

function s(tSec: number, distance: number, lat?: number, lon?: number): GarminSample {
  return { time: new Date(2026, 0, 1, 0, 0, tSec), distance, lat, lon };
}

describe('buildDistanceMap', () => {
  it('falls back to a global linear scale when there are too few anchors', () => {
    const route = eastRoute(0.09);
    const samples = [s(0, 0), s(30, 5), s(60, 10)]; // no GPS → 0 anchors
    const { samples: cleaned, flagged } = cleanDistanceStream(samples);
    const map = buildDistanceMap(cleaned, [], flagged, route);
    expect(map.fallbackUsed).toBe(true);
    expect(map.mapDistance(0, 0)).toBeCloseTo(0, 5);
    expect(map.mapDistance(10, 0)).toBeCloseTo(route.length, 3);
    expect(map.mapDistance(5, 0)).toBeCloseTo(route.length / 2, 3);
  });

  it('places a clean sample at its true arc despite a localized jam inflating total distance', () => {
    const route = eastRoute(0.09); // ~10018 m
    // clean 0..5000, jammed +20000 (no GPS), clean 25000..27000
    const samples: GarminSample[] = [];
    for (let d = 0; d <= 5000; d += 1000) samples.push(s(samples.length * 30, d, 0, d / M_PER_DEG_LON));
    samples.push(s(samples.length * 30, 15000));
    samples.push(s(samples.length * 30, 25000));
    const lastClean = [25000, 26000, 27000];
    // these clean fixes are at true arcs 8000..10000
    const trueArcs = [8000, 9000, 10000];
    lastClean.forEach((d, i) => samples.push(s(samples.length * 30, d, 0, trueArcs[i] / M_PER_DEG_LON)));

    const { samples: cleaned, flagged } = cleanDistanceStream(samples);
    const anchors = buildAnchors(cleaned, route);
    const map = buildDistanceMap(cleaned, anchors, flagged, route);

    expect(map.fallbackUsed).toBe(false);
    // recorded 5000 sample should land near arc 5000, NOT ~1855 (global scale of 27000→10018)
    expect(map.mapDistance(5000, cleaned[5].time.getTime())).toBeGreaterThan(4000);
  });

  it('ends short for a partial run (stops where the runner stopped)', () => {
    const route = eastRoute(0.09); // ~10018 m
    const samples: GarminSample[] = [];
    for (let d = 0; d <= 7000; d += 1000) samples.push(s(samples.length * 30, d, 0, d / M_PER_DEG_LON));
    const { samples: cleaned, flagged } = cleanDistanceStream(samples);
    const anchors = buildAnchors(cleaned, route);
    const map = buildDistanceMap(cleaned, anchors, flagged, route);
    expect(map.finalArc).toBeGreaterThan(6000);
    expect(map.finalArc).toBeLessThan(8000); // well short of ~10018
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/distanceMap.test.ts`
Expected: FAIL — `buildDistanceMap is not a function`.

- [ ] **Step 3: Implement `buildDistanceMap`**

Create `src/lib/distanceMap.ts`:

```ts
import type { GarminSample, Route } from '../types';
import type { Anchor } from './anchors';
import { MIN_ANCHORS } from './mergeConfig';

export interface DistanceMap {
  mapDistance(recordedDistance: number, timeMs: number): number;
  fallbackUsed: boolean;
  finalArc: number;
}

interface Knot {
  recordedDistance: number;
  arcLength: number;
  timeMs: number;
  flaggedAfter: boolean; // a speed outlier exists in the span starting at this knot
}

export function buildDistanceMap(
  samples: GarminSample[],
  anchors: Anchor[],
  flagged: boolean[],
  route: Route,
): DistanceMap {
  const first = samples[0];
  const last = samples[samples.length - 1];
  const recordedTotal = last.distance - first.distance;
  const globalScale = recordedTotal > 0 ? route.length / recordedTotal : 0;

  let knots: Knot[];
  let fallbackUsed: boolean;

  if (anchors.length < MIN_ANCHORS) {
    knots = [
      { recordedDistance: first.distance, arcLength: 0, timeMs: first.time.getTime(), flaggedAfter: false },
      { recordedDistance: last.distance, arcLength: route.length, timeMs: last.time.getTime(), flaggedAfter: false },
    ];
    fallbackUsed = true;
  } else {
    knots = anchors.map((a) => ({
      recordedDistance: a.recordedDistance,
      arcLength: a.routeArcLength,
      timeMs: samples[a.sampleIndex].time.getTime(),
      flaggedAfter: false,
    }));
    // a span is "flagged" if any step strictly after this anchor up to the next is flagged
    for (let k = 0; k < anchors.length - 1; k++) {
      const from = anchors[k].sampleIndex;
      const to = anchors[k + 1].sampleIndex;
      for (let j = from + 1; j <= to; j++) {
        if (flagged[j]) {
          knots[k].flaggedAfter = true;
          break;
        }
      }
    }
    fallbackUsed = false;
  }

  const clamp = (x: number) => Math.max(0, Math.min(route.length, x));
  const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

  function slope(k0: Knot, k1: Knot): number {
    const dd = k1.recordedDistance - k0.recordedDistance;
    return dd > 0 ? (k1.arcLength - k0.arcLength) / dd : globalScale;
  }

  function mapDistance(d: number, timeMs: number): number {
    const k0 = knots[0];
    const kN = knots[knots.length - 1];
    if (d <= k0.recordedDistance) {
      return clamp(k0.arcLength + (d - k0.recordedDistance) * slope(k0, knots[1]));
    }
    if (d >= kN.recordedDistance) {
      return clamp(kN.arcLength + (d - kN.recordedDistance) * slope(knots[knots.length - 2], kN));
    }
    let k = 0;
    while (k < knots.length - 2 && knots[k + 1].recordedDistance < d) k++;
    const a = knots[k];
    const b = knots[k + 1];
    let frac: number;
    if (a.flaggedAfter && b.timeMs > a.timeMs) {
      frac = (timeMs - a.timeMs) / (b.timeMs - a.timeMs);
    } else {
      const denom = b.recordedDistance - a.recordedDistance;
      frac = denom > 0 ? (d - a.recordedDistance) / denom : 0;
    }
    frac = clamp01(frac);
    return clamp(a.arcLength + frac * (b.arcLength - a.arcLength));
  }

  return { mapDistance, fallbackUsed, finalArc: mapDistance(last.distance, last.time.getTime()) };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/distanceMap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/distanceMap.ts src/lib/distanceMap.test.ts
git commit -m "feat(distanceMap): monotone PWL map with anchors, time-fill, and fallback"
```

---

### Task 5: Resample at route vertices (`resample.resampleAtVertices`)

**Files:**
- Create: `src/lib/resample.ts`
- Create: `src/lib/resample.test.ts`

**Interfaces:**
- Consumes: `MergedSample`, `Route`, `MAX_TRACKPOINTS` (Task 2).
- Produces: `type ArcSample = MergedSample & { arc: number }` and `resampleAtVertices(samples: ArcSample[], route: Route): MergedSample[]`. For each consecutive pair whose arc-lengths span route vertices, inserts a trackpoint at each interior vertex (exact route coordinates), interpolating time / distance / hr / cadence / altitude by arc-length fraction. If inserting every vertex would exceed `MAX_TRACKPOINTS`, keeps every Nth vertex so the total stays under the ceiling. The returned samples have `arc` stripped.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/resample.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resampleAtVertices, type ArcSample } from './resample';
import { cumulativeDistances } from './geo';
import type { Route, RoutePoint } from '../types';

function squareRoute(): Route {
  // 0,0 -> 0,0.01 -> 0.01,0.01 -> 0.01,0 (three segments, two interior vertices)
  const points: RoutePoint[] = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: 0.01 },
    { lat: 0.01, lon: 0.01 },
    { lat: 0.01, lon: 0 },
  ];
  const cumulative = cumulativeDistances(points);
  return { name: 'Square', points, cumulative, length: cumulative[cumulative.length - 1] };
}

function arcSample(arc: number, lat: number, lon: number, tSec: number): ArcSample {
  return { time: new Date(2026, 0, 1, 0, 0, tSec), distance: arc, arc, lat, lon, hr: 150 };
}

describe('resampleAtVertices', () => {
  it('inserts a trackpoint at each route vertex between two distant samples', () => {
    const route = squareRoute();
    const start = arcSample(0, 0, 0, 0);
    const end = arcSample(route.length, 0.01, 0, 100);
    const out = resampleAtVertices([start, end], route);
    // start + 2 interior vertices + end
    expect(out).toHaveLength(4);
    expect(out[1].lat).toBeCloseTo(route.points[1].lat, 6);
    expect(out[1].lon).toBeCloseTo(route.points[1].lon, 6);
    expect(out[2].lat).toBeCloseTo(route.points[2].lat, 6);
    // times and distances stay monotonic
    for (let i = 1; i < out.length; i++) {
      expect(out[i].time.getTime()).toBeGreaterThanOrEqual(out[i - 1].time.getTime());
      expect(out[i].distance).toBeGreaterThanOrEqual(out[i - 1].distance);
    }
  });

  it('leaves samples within a single segment untouched', () => {
    const route = squareRoute();
    const a = arcSample(10, 0, 10 / 111320, 0);
    const b = arcSample(20, 0, 20 / 111320, 10);
    const out = resampleAtVertices([a, b], route);
    expect(out).toHaveLength(2);
  });

  it('does not exceed the trackpoint ceiling', () => {
    const points: RoutePoint[] = [];
    for (let i = 0; i <= 30000; i++) points.push({ lat: 0, lon: i * 0.00001 });
    const cumulative = cumulativeDistances(points);
    const route: Route = { name: 'Dense', points, cumulative, length: cumulative[cumulative.length - 1] };
    const out = resampleAtVertices(
      [arcSample(0, 0, 0, 0), arcSample(route.length, 0, points[points.length - 1].lon, 100)],
      route,
    );
    expect(out.length).toBeLessThanOrEqual(10000);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/resample.test.ts`
Expected: FAIL — `resampleAtVertices is not a function`.

- [ ] **Step 3: Implement `resampleAtVertices`**

Create `src/lib/resample.ts`:

```ts
import type { MergedSample, Route } from '../types';
import { MAX_TRACKPOINTS } from './mergeConfig';

export type ArcSample = MergedSample & { arc: number };

function lerp(x: number, y: number, f: number): number {
  return x + (y - x) * f;
}

export function resampleAtVertices(samples: ArcSample[], route: Route): MergedSample[] {
  if (samples.length < 2) return samples.map(strip);

  // count interior vertices we would insert, to decide a stride under the ceiling
  let interior = 0;
  for (let i = 0; i < samples.length - 1; i++) {
    interior += countVerticesBetween(route, samples[i].arc, samples[i + 1].arc);
  }
  const budget = MAX_TRACKPOINTS - samples.length;
  const stride = budget > 0 ? Math.max(1, Math.ceil(interior / budget)) : Number.POSITIVE_INFINITY;

  const out: MergedSample[] = [];
  let seen = 0;
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i];
    const b = samples[i + 1];
    out.push(strip(a));
    if (b.arc <= a.arc) continue;
    for (let v = 0; v < route.points.length; v++) {
      const arc = route.cumulative[v];
      if (arc <= a.arc || arc >= b.arc) continue;
      seen++;
      if (seen % stride !== 0) continue;
      const f = (arc - a.arc) / (b.arc - a.arc);
      out.push(interpolatedVertex(a, b, route, v, arc, f));
    }
  }
  out.push(strip(samples[samples.length - 1]));
  return out;
}

function countVerticesBetween(route: Route, arc0: number, arc1: number): number {
  if (arc1 <= arc0) return 0;
  let n = 0;
  for (let v = 0; v < route.points.length; v++) {
    const arc = route.cumulative[v];
    if (arc > arc0 && arc < arc1) n++;
  }
  return n;
}

function interpolatedVertex(
  a: ArcSample,
  b: ArcSample,
  route: Route,
  v: number,
  arc: number,
  f: number,
): MergedSample {
  const p = route.points[v];
  const out: MergedSample = {
    time: new Date(lerp(a.time.getTime(), b.time.getTime(), f)),
    distance: lerp(a.distance, b.distance, f),
    lat: p.lat,
    lon: p.lon,
  };
  out.altitude = p.ele ?? interpOptional(a.altitude, b.altitude, f);
  out.hr = interpOptional(a.hr, b.hr, f);
  out.cadence = interpOptional(a.cadence, b.cadence, f);
  if (out.altitude === undefined) delete out.altitude;
  if (out.hr === undefined) delete out.hr;
  if (out.cadence === undefined) delete out.cadence;
  return out;
}

function interpOptional(x: number | undefined, y: number | undefined, f: number): number | undefined {
  if (x === undefined || y === undefined) return undefined;
  return lerp(x, y, f);
}

function strip(s: ArcSample): MergedSample {
  const { arc: _arc, ...rest } = s;
  void _arc;
  return rest;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/resample.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/resample.ts src/lib/resample.test.ts
git commit -m "feat(resample): densify the merged track at route vertices"
```

---

### Task 6: Rewire the merge orchestrator + `MergeReport`

**Files:**
- Modify: `src/types.ts` (add `MergeReport`, add `report?` to `MergedActivity`)
- Modify: `src/lib/merge.ts` (rewrite orchestrator)
- Modify: `src/lib/merge.test.ts` (keep existing tests; add integration tests)

**Interfaces:**
- Consumes: `cleanDistanceStream` (T2), `buildAnchors` (T3), `buildDistanceMap` (T4), `resampleAtVertices`/`ArcSample` (T5), `interpolateAlongPath` (existing), `PARTIAL_THRESHOLD` (T2).
- Produces: `interface MergeReport { recordedDistance; routeLength; ratio; anchorCount; fallbackUsed; partial; coveredFraction }` (all `number` except the two booleans), `MergedActivity.report?: MergeReport`, and the rewritten `mergeActivityWithRoute(activity, route): MergedActivity` returning samples + sport + report.

- [ ] **Step 1: Add the types**

In `src/types.ts`, add after `ActivityStats`:

```ts
export interface MergeReport {
  recordedDistance: number;
  routeLength: number;
  ratio: number;
  anchorCount: number;
  fallbackUsed: boolean;
  partial: boolean;
  coveredFraction: number;
}
```

and change `MergedActivity`:

```ts
export interface MergedActivity {
  samples: MergedSample[];
  sport?: string;
  report?: MergeReport;
}
```

- [ ] **Step 2: Write the failing integration tests**

Append to `src/lib/merge.test.ts` (keep all existing tests as-is):

```ts
const M_PER_DEG_LON = 111320;

function eastRoute(lonEnd: number): Route {
  const points: RoutePoint[] = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: lonEnd },
  ];
  const cumulative = cumulativeDistances(points);
  return { name: 'East', points, cumulative, length: cumulative[1] };
}

function gs(tSec: number, distance: number, lat?: number, lon?: number) {
  return { time: new Date(2026, 0, 1, 0, 0, tSec), distance, lat, lon };
}

describe('mergeActivityWithRoute — accuracy', () => {
  it('reports a fallback merge when there is no usable GPS', () => {
    const route = eastRoute(0.09);
    const merged = mergeActivityWithRoute(
      { samples: [gs(0, 0), gs(30, 13500), gs(60, 27000)] },
      route,
    );
    expect(merged.report?.fallbackUsed).toBe(true);
    expect(merged.samples[merged.samples.length - 1].distance).toBeCloseTo(route.length, 0);
  });

  it('keeps a clean section on its true arc despite a localized jam', () => {
    const route = eastRoute(0.09);
    const samples = [];
    for (let d = 0; d <= 5000; d += 1000) samples.push(gs(samples.length * 30, d, 0, d / M_PER_DEG_LON));
    samples.push(gs(samples.length * 30, 15000)); // jammed, no GPS
    [25000, 26000, 27000].forEach((d, i) =>
      samples.push(gs(samples.length * 30, d, 0, (8000 + i * 1000) / M_PER_DEG_LON)),
    );
    const merged = mergeActivityWithRoute({ samples, sport: 'Running' }, route);
    expect(merged.report?.fallbackUsed).toBe(false);
    // sample recorded at 5000 m lands near arc 5000, not ~1855 (27000→10018 global scale)
    const fifth = merged.samples[5];
    expect(fifth.distance).toBeGreaterThan(4000);
  });

  it('stops where the runner stopped on a partial run', () => {
    const route = eastRoute(0.09);
    const samples = [];
    for (let d = 0; d <= 7000; d += 1000) samples.push(gs(samples.length * 30, d, 0, d / M_PER_DEG_LON));
    const merged = mergeActivityWithRoute({ samples, sport: 'Running' }, route);
    expect(merged.report?.partial).toBe(true);
    expect(merged.samples[merged.samples.length - 1].distance).toBeLessThan(8000);
  });
});
```

Add the missing imports at the top of `src/lib/merge.test.ts`:

```ts
import { cumulativeDistances } from './geo';
```

(already imported — verify it is; `RoutePoint`/`Route` are already imported.)

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/lib/merge.test.ts`
Expected: FAIL — `report` is undefined / accuracy assertions not met (old global-scale merge still runs).

- [ ] **Step 4: Rewrite the orchestrator**

Replace the entire body of `src/lib/merge.ts` with:

```ts
import type { GarminActivity, MergedActivity, MergeReport, Route } from '../types';
import { interpolateAlongPath } from './geo';
import { cleanDistanceStream } from './clean';
import { buildAnchors } from './anchors';
import { buildDistanceMap } from './distanceMap';
import { resampleAtVertices, type ArcSample } from './resample';
import { PARTIAL_THRESHOLD } from './mergeConfig';
import { AppError } from './errors';

export function mergeActivityWithRoute(
  activity: GarminActivity,
  route: Route,
): MergedActivity {
  if (activity.samples.length === 0) {
    throw new AppError('mergeNoSamples');
  }
  if (route.points.length < 2) {
    throw new AppError('mergeRouteTooFewPoints');
  }

  const { samples: cleaned, flagged } = cleanDistanceStream(activity.samples, activity.sport);
  const first = cleaned[0];
  const last = cleaned[cleaned.length - 1];
  const recordedTotal = last.distance - first.distance;
  if (recordedTotal <= 0) {
    throw new AppError('mergeNoDistance');
  }

  const anchors = buildAnchors(cleaned, route);
  const map = buildDistanceMap(cleaned, anchors, flagged, route);

  let prevArc = 0;
  const withArc: ArcSample[] = cleaned.map((s) => {
    let arc = map.mapDistance(s.distance, s.time.getTime());
    if (arc < prevArc) arc = prevArc; // belt-and-suspenders monotonicity
    prevArc = arc;
    const p = interpolateAlongPath(route.points, route.cumulative, arc);
    return { ...s, distance: arc, lat: p.lat, lon: p.lon, altitude: s.altitude ?? p.ele, arc };
  });

  const samples = resampleAtVertices(withArc, route);

  const coveredFraction = route.length > 0 ? map.finalArc / route.length : 0;
  const report: MergeReport = {
    recordedDistance: recordedTotal,
    routeLength: route.length,
    ratio: route.length > 0 ? recordedTotal / route.length : 0,
    anchorCount: anchors.length,
    fallbackUsed: map.fallbackUsed,
    partial: coveredFraction < PARTIAL_THRESHOLD,
    coveredFraction,
  };

  return { samples, sport: activity.sport, report };
}
```

- [ ] **Step 5: Run the full merge test file to verify pass**

Run: `npx vitest run src/lib/merge.test.ts`
Expected: PASS — both the original global-scale tests (now exercising the fallback path) and the new accuracy tests.

- [ ] **Step 6: Run the entire suite to catch regressions**

Run: `npx vitest run`
Expected: PASS (App/serializer/stats tests unaffected — `report` is additive/optional).

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/lib/merge.ts src/lib/merge.test.ts
git commit -m "feat(merge): anchored merge orchestrator with MergeReport"
```

---

### Task 7: Surface non-blocking warnings in the UI

**Files:**
- Create: `src/lib/mergeWarnings.ts`
- Create: `src/lib/mergeWarnings.test.ts`
- Modify: `src/i18n/messages.ts` (add 3 keys to the `Messages` type and both tables)
- Modify: `src/App.tsx` (render the warnings above the preview)

**Interfaces:**
- Consumes: `MergeReport` (Task 6), `TParams` (from `src/i18n/i18n.ts`).
- Produces: `interface MergeWarning { key: string; params: TParams }` and `mergeReportWarnings(report: MergeReport): MergeWarning[]`. Returns the applicable warnings (fallback, extreme ratio, partial) with i18n params; empty when nothing is notable.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/mergeWarnings.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mergeReportWarnings } from './mergeWarnings';
import type { MergeReport } from '../types';

function report(over: Partial<MergeReport> = {}): MergeReport {
  return {
    recordedDistance: 10000,
    routeLength: 10000,
    ratio: 1,
    anchorCount: 50,
    fallbackUsed: false,
    partial: false,
    coveredFraction: 1,
    ...over,
  };
}

describe('mergeReportWarnings', () => {
  it('returns nothing for a clean full merge', () => {
    expect(mergeReportWarnings(report())).toEqual([]);
  });

  it('warns when the recorded distance is wildly off the route', () => {
    const w = mergeReportWarnings(report({ recordedDistance: 27000, ratio: 2.7 }));
    expect(w.map((x) => x.key)).toContain('mergeWarnRatio');
  });

  it('warns when the merge fell back to global scaling', () => {
    const w = mergeReportWarnings(report({ fallbackUsed: true }));
    expect(w.map((x) => x.key)).toContain('mergeWarnFallback');
  });

  it('warns on a partial run', () => {
    const w = mergeReportWarnings(report({ partial: true, coveredFraction: 0.7 }));
    expect(w.map((x) => x.key)).toContain('mergeWarnPartial');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/mergeWarnings.test.ts`
Expected: FAIL — `mergeReportWarnings is not a function`.

- [ ] **Step 3: Implement `mergeReportWarnings`**

Create `src/lib/mergeWarnings.ts`:

```ts
import type { MergeReport } from '../types';
import type { TParams } from '../i18n/i18n';

export interface MergeWarning {
  key: string;
  params: TParams;
}

const km = (m: number) => (m / 1000).toFixed(2);

export function mergeReportWarnings(report: MergeReport): MergeWarning[] {
  const warnings: MergeWarning[] = [];

  if (report.fallbackUsed) {
    warnings.push({ key: 'mergeWarnFallback', params: {} });
  }
  if (report.ratio >= 2 || report.ratio <= 0.5) {
    warnings.push({
      key: 'mergeWarnRatio',
      params: {
        recorded: km(report.recordedDistance),
        route: km(report.routeLength),
        ratio: report.ratio.toFixed(1),
      },
    });
  }
  if (report.partial) {
    warnings.push({
      key: 'mergeWarnPartial',
      params: {
        covered: km(report.coveredFraction * report.routeLength),
        route: km(report.routeLength),
      },
    });
  }

  return warnings;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/mergeWarnings.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the i18n keys**

In `src/i18n/messages.ts`, add to the `Messages` type (after `invalidStartError`):

```ts
  mergeWarnRatio: string;
  mergeWarnFallback: string;
  mergeWarnPartial: string;
```

Add to the `en` table (after `invalidStartError`):

```ts
  mergeWarnRatio:
    'Your watch recorded {recorded} km but this route is {route} km ({ratio}×). Large gaps usually mean GPS jamming — check the preview.',
  mergeWarnFallback:
    "We couldn't verify your position from GPS, so your run was stretched evenly onto the route.",
  mergeWarnPartial:
    'Looks like you covered about {covered} of {route} km — the merged track ends where your run did.',
```

Add to the `uk` table (after `invalidStartError`):

```ts
  mergeWarnRatio:
    'Годинник записав {recorded} км, але цей маршрут — {route} км ({ratio}×). Велика різниця зазвичай означає глушіння GPS — перевірте попередній перегляд.',
  mergeWarnFallback:
    'Не вдалося підтвердити ваше положення за GPS, тому забіг рівномірно розтягнуто на маршрут.',
  mergeWarnPartial:
    'Схоже, ви подолали близько {covered} з {route} км — об’єднаний трек завершується там, де закінчився ваш забіг.',
```

- [ ] **Step 6: Render the warnings in `App.tsx`**

In `src/App.tsx`, add the import near the other lib imports:

```ts
import { mergeReportWarnings } from './lib/mergeWarnings';
```

Inside the step-4 section, immediately after `<h2>{t('step4')}</h2></div>` and before `<MapPreview …>`, insert:

```tsx
            {merged.report &&
              mergeReportWarnings(merged.report).map((w) => (
                <p key={w.key} className="merge-note" role="note">
                  {t(w.key, w.params)}
                </p>
              ))}
```

- [ ] **Step 7: Run the full suite + typecheck**

Run: `npx vitest run`
Expected: PASS.

Run: `npm run build`
Expected: succeeds (TypeScript compiles — the new `Messages` keys are present in both tables, so the typed table check passes).

- [ ] **Step 8: Commit**

```bash
git add src/lib/mergeWarnings.ts src/lib/mergeWarnings.test.ts src/i18n/messages.ts src/App.tsx
git commit -m "feat(ui): surface non-blocking merge discrepancy warnings"
```

---

## Self-Review

**Spec coverage:**
- Anchored default + auto-fallback → Tasks 3, 4 (fallback at `MIN_ANCHORS`), 6. ✓
- Partial runs stop where the runner stopped → Task 4 `finalArc`, Task 6 last-sample distance. ✓
- Always snap to route → Task 6 positions from `interpolateAlongPath(route, arc)` only. ✓
- Approach A monotone PWL with anchor knots → Task 4. ✓
- Lap-reset/jitter fix + monotonic clamp + speed flags → Task 2. ✓
- Time-fill in flagged spans → Task 4 (`flaggedAfter` → time fraction). ✓
- Vertex resampling + ceiling → Task 5. ✓
- MergeReport + non-blocking warnings (ratio/fallback/partial) → Tasks 6, 7. ✓
- Thresholds in one file → Task 2 `mergeConfig.ts`. ✓
- Existing AppError codes unchanged; existing merge tests stay green via fallback → Tasks 2, 6. ✓

**Placeholder scan:** No TBD/TODO; every code step contains complete code; commands have expected output. ✓

**Type consistency:** `PathProjection`, `CleanedStream`, `Anchor`, `DistanceMap`, `ArcSample`, `MergeReport`, `MergeWarning` are each defined once and consumed with matching field/param names. `mapDistance(recordedDistance, timeMs)` signature is consistent across Tasks 4 and 6. `report?` is optional on `MergedActivity` so serializer/stats consumers are unaffected. ✓

## Notes for the implementer

- Run tests file-by-file as written; run `npx vitest run` after Tasks 6 and 7 to catch cross-module regressions.
- `App.test.tsx` should keep passing without edits because `report` is additive. If a snapshot or strict object assertion there fails, update it to allow the new optional field — do not remove warning rendering.
- Performance: `projectPointToPath` is O(remaining segments) per call and `resampleAtVertices` counts vertices per gap; both are fine for client-side single-file use at half-marathon scale.
