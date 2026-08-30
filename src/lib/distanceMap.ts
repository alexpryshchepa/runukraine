import type { GarminSample, Route } from '../types';

export interface DistanceMap {
  /** Route arc-length, in meters, for a cleaned cumulative recorded distance. */
  mapDistance(recordedDistance: number): number;
}

/**
 * Maps the watch's cumulative distance stream linearly onto the route: the
 * first sample lands on the route start, the last on the route finish.
 *
 * The activity's own GPS is deliberately ignored — the uploaded route is used
 * exactly as-is, so the merged track always begins and ends where the route
 * does. The trade-off is that a partial activity is stretched over the whole
 * route rather than stopping early; `mergeReportWarnings` surfaces that.
 */
export function buildDistanceMap(samples: GarminSample[], route: Route): DistanceMap {
  const first = samples[0];
  const last = samples[samples.length - 1];
  const span = last.distance - first.distance;

  function mapDistance(d: number): number {
    if (span <= 0) return 0;
    // Divide before multiplying: at d === last.distance the fraction is exactly
    // 1, so the result is exactly route.length rather than a float ULP short.
    const fraction = (d - first.distance) / span;
    return Math.max(0, Math.min(1, fraction)) * route.length;
  }

  return { mapDistance };
}
