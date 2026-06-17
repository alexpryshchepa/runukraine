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
