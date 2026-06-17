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
