# Track Merge Accuracy — Design

**Date:** 2026-06-17
**Status:** Approved (pending spec review)
**Scope:** Replace the global-scale track merge with a GPS-anchored merge that contains
localized GPS errors instead of smearing them across the whole activity, plus supporting
correctness fixes and user-facing diagnostics.

## Problem

`mergeActivityWithRoute` (`src/lib/merge.ts`) rebuilds every output position from the
official route using a **single global scale**:

```
garminTotal = lastSample.distance − firstSample.distance
scale       = route.length / garminTotal
mapped_i    = (sample_i.distance − firstSample.distance) * scale
pos_i       = interpolateAlongPath(route, mapped_i)
```

This is exactly right for a uniformly miscalibrated odometer (e.g. an uncalibrated
footpod that is 3% long), but it fails for the cases this tool actually exists to handle:

- **Localized GPS jamming.** When GPS is jammed-but-not-lost, many watches compute
  distance from garbage positions and over-count *during the jammed stretch only*
  (the "recorded 30 km, ran 10 km" case). A single global scale spreads that local
  error across the entire activity, mis-positioning the clean sections to pay for the
  jammed one.
- **Partial runs / DNF.** "Last sample always maps to the route finish" stretches a
  7 km run onto a 10 km route, inflating distance and faking pace.
- **Distance spikes, stuck distance, backward jitter** warp the global scale or are
  mishandled by the parser (see Correctness fixes).

The recorded GPS coordinates in the TCX (`GarminSample.lat/lon`) — trustworthy wherever
GPS worked — are currently **ignored entirely**.

## Decisions (locked)

1. **Anchored merge is the default**, automatically falling back to the current
   global-scale behavior when there are too few trustworthy GPS anchors. No new UI
   control for the algorithm itself.
2. **Partial runs stop where the runner stopped** when anchors prove it; otherwise fall
   back to stretch-to-finish.
3. **Output positions always snap to the route.** Clean GPS only *informs the mapping*;
   the runner's raw coordinates never appear in the output.
4. **Architecture: Approach A** — a monotone piecewise-linear map from recorded distance
   to route arc-length, with filtered GPS anchors as knots. Today's global scale is the
   degenerate zero-anchor case of this map, not a separate code path. (Rejected: robust
   regression / RANSAC — marginal gain, harder to keep deterministic; HMM/DTW
   map-matching — overkill for a known route, hard to test.)

## Architecture

### Data flow

```
TCX → parseTcx (dumb extraction)
        → cleanDistanceStream   (lap-reset fix, monotonic clamp, speed-outlier flags)
        → shiftActivityStart    (unchanged)
Route ──┐
        → mergeActivityWithRoute (orchestrator, rewritten)
              ├─ buildAnchors      (project clean GPS → route, forward-only, filter)
              ├─ buildDistanceMap  (monotone piecewise-linear knots → mapDistance())
              ├─ map every sample  (mapDistance → interpolateAlongPath)
              └─ resampleAtVertices (densify across route corners)
        → { MergedActivity, MergeReport }
              → App surfaces MergeReport warnings → MapPreview → serializeTcx
```

### Modules

| Module | Responsibility | New? |
|---|---|---|
| `lib/tcx.ts` | Parse XML → raw samples only. Lap-reset heuristic **moves out**. | modified (simplified) |
| `lib/clean.ts` | `cleanDistanceStream(samples, sport)`: robust lap-reset, monotonic clamp, per-step speed-outlier flags. | **new** |
| `lib/geo.ts` | add `projectPointToPath(points, cumulative, lat, lon, fromArc)` → `{arcLength, residualMeters}` via local equirectangular projection + forward search. | extended |
| `lib/anchors.ts` | `buildAnchors(samples, route)`: forward-only projection, keep low-residual monotone fixes. | **new** |
| `lib/distanceMap.ts` | `buildDistanceMap(anchors, samples, route)` → monotone `mapDistance(d, t)`; endpoint/partial/fallback logic. | **new** |
| `lib/resample.ts` | `resampleAtVertices(samples, route)`: insert vertex trackpoints with interpolated telemetry. | **new** |
| `lib/merge.ts` | Orchestrate the above; emit `MergedActivity` + `MergeReport`. | rewritten |
| `lib/mergeConfig.ts` | Tunable threshold constants. | **new** |
| `types.ts` | add `MergeReport`. | extended |
| `App.tsx` + i18n | Render non-blocking `MergeReport` banner. | extended |

## The mapping algorithm (the heart)

Everything reduces to one **monotone piecewise-linear function**
`mapDistance: recordedDistance → routeArcLength`, with positions read off the route at
the mapped arc-length.

### 1. Anchors — where clean GPS pins us to the route

Walk samples in time order tracking `minArc` (last accepted anchor's arc-length). For
each sample with lat/lon, project onto the route **searching forward only**
(arc ≥ `minArc`), getting `{arcLength, residual}`.

- Accept as an anchor if `residual ≤ RESIDUAL_MAX` → knot `(cleanedDistance_i, arcLength_i)`,
  advance `minArc`.
- Reject otherwise (off-route → jammed/garbage); the sample is still positioned later via
  the map.

Forward-only search is a lightweight map-match: anchors are monotone by construction, and
loops / out-and-backs are handled (a turnaround cannot snap backward).

### 2. The map — monotone PWL through anchor knots, with extrapolated ends

- Between consecutive anchors, interpolate linearly in arc-length. The interpolation
  **parameter** is the recorded-distance fraction **unless** that span contains a
  speed-outlier flag, in which case it uses the **time fraction** (trust the clock where
  distance is corrupt).
- **Before the first / after the last anchor:** extrapolate by
  `recordedDistanceDelta × localScale`, then clamp to `[0, routeLength]`. `localScale` is
  the slope (`Δarc/Δrecorded`) of the adjacent anchor segment; if only one anchor exists,
  use the global ratio `routeLength / recordedTotal`.

### 3. Endpoints, partial runs, and fallback — no special branches

- **Finish:** `finalArc = lastAnchorArc + recordedDistanceAfterLastAnchor × localScale`,
  clamped to `routeLength`. Truly stopped → trailing distance ≈ 0 → track ends at the
  last anchor (*stop where they stopped*). GPS died but footpod kept counting → trailing
  distance large → extrapolates forward and clamps at the finish (*completed*). The data
  answers "did they finish?", not a flag.
- **No usable anchors** (`anchorCount < MIN_ANCHORS`): the only knots are the synthetic
  endpoints `(firstD, 0)` and `(lastD, routeLength)`, so `mapDistance` becomes exactly
  `(d − firstD) × routeLength / recordedTotal` — **today's algorithm, bit-for-bit.** This
  is what keeps the existing merge tests green.

### 4. Per sample

`arc = mapDistance(cleanedDistance_i, time_i)`;
`pos = interpolateAlongPath(route, arc)`;
`altitude = sample_i.altitude ?? pos.ele` (unchanged — barometric altitude is not
GPS-dependent).

### Worked example — 30-vs-10 (clean 5 km, jammed +20 km phantom, clean 2 km)

- Clean opening/closing stretches produce anchors → those samples land at their **true**
  arc-lengths (the 5 km mark sits at 5 km, not 1.85 km).
- The jammed middle has no anchors and a speed-outlier flag → it is the single
  inter-anchor span between the 5 km and 8 km anchors, filled by **time fraction**, so the
  20 km of phantom distance is absorbed locally instead of taxing the clean sections.

## Correctness fixes (folded into the cleaning stage)

`cleanDistanceStream`, tracking previous *raw* distance:

- **Lap reset** only when the raw value drops sharply toward zero —
  `raw < prevRaw × RESET_RATIO` — then `offset += prevRaw`. Fixes the current bug where a
  small backward wobble (`100→95→200`) is misread as a reset and inflates the rest of the
  activity by +100 m.
- **Monotonic clamp:** `cum = max(cum, lastCum)` after offset handling. Small backward
  jitter is flattened, not amplified.
- **Speed-outlier flag:** per step `v = Δcum/Δt`; flag when `v > MAX_SPEED` (keyed off
  `activity.sport`). Distances are **not** mutated here — flags are metadata the distance
  map reads.

## Resampling at route vertices

When two consecutive output samples span one or more route vertices, insert a trackpoint
at **each route vertex** strictly between their arc-lengths, interpolating time / HR /
cadence / distance by arc-length fraction. The track hugs corners and Strava's
GPS-derived distance matches the route instead of under-counting on chords. If inserting
all vertices would exceed `MAX_TRACKPOINTS`, densify uniformly (keep every Nth vertex) so
the total stays under the ceiling.

## Tunable thresholds (`lib/mergeConfig.ts`)

| Const | Default | Meaning |
|---|---|---|
| `RESIDUAL_MAX` | 35 m | max GPS-to-route distance to trust a fix as an anchor |
| `MIN_ANCHORS` | 3 | below this → global-scale fallback |
| `RESET_RATIO` | 0.5 | raw drop fraction that counts as a lap reset |
| `MAX_SPEED` | 12.5 m/s run / 25 m/s bike | instantaneous speed cap for outlier flag |
| `PARTIAL_THRESHOLD` | 0.98 | coveredFraction below this → "partial" warning |
| `MAX_TRACKPOINTS` | 10,000 | resampling ceiling |

## MergeReport & warning UX

`MergeReport` fields: `recordedDistance`, `routeLength`, `ratio`, `anchorCount`,
`fallbackUsed`, `partial`, `coveredFraction`, `warnings[]`.

The App renders a **non-blocking** banner above the preview (download is always allowed),
via the existing i18n system:

- Extreme ratio (≥2 or ≤0.5): "Watch recorded {X} km vs {Y} km route ({N}×). Large gaps
  usually mean GPS jamming — check the preview."
- Fallback used: "Couldn't verify your position from GPS, so we stretched your run evenly
  onto the route."
- Partial: "Looks like you covered ~{X} of {Y} km — the merged track ends where your run
  did."

## Error handling

Keep existing `AppError` throws (`mergeNoSamples`, `mergeRouteTooFewPoints`,
`mergeNoDistance`). Projection guards degenerate (zero-length) segments and NaN coords.
No new throw paths — the new logic only narrows toward the existing fallback.

## Testing (TDD, per module)

- `geo`: point-to-segment projection — foot-point on/off segment, residual correctness.
- `clean`: sharp drop still resets; **small jitter does NOT reset** (the bug); monotonic
  clamp; speed flag.
- `anchors`: forward-only monotonicity; residual filtering; out-and-back turnaround does
  not snap backward.
- `distanceMap`: **zero-anchor ≡ global scale** (existing `merge.test.ts` stays green);
  partial-run ends short; localized-jam compression on synthetic 30-vs-10 data.
- `resample`: vertices inserted, telemetry interpolated, time/distance monotonic, ceiling
  respected.
- `merge` integration: localized jam, full jam → fallback, partial → stops short.

## Out of scope (YAGNI)

- HMM/DTW map-matching.
- User-selectable algorithm mode or per-activity "did you finish?" prompt.
- Keeping raw GPS in the output where clean.
- Re-deriving elevation from the route when the watch already has barometric altitude.
