import type { GarminActivity, MergedActivity, MergeReport, Route } from '../types';
import { interpolateAlongPath } from './geo';
import { cleanDistanceStream } from './clean';
import { buildDistanceMap } from './distanceMap';
import { resampleAtVertices, type ArcSample } from './resample';
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

  const cleaned = cleanDistanceStream(activity.samples, activity.sport);
  const first = cleaned[0];
  const last = cleaned[cleaned.length - 1];
  const recordedTotal = last.distance - first.distance;
  if (recordedTotal <= 0) {
    throw new AppError('mergeNoDistance');
  }

  const map = buildDistanceMap(cleaned, route);

  let prevArc = 0;
  const withArc: ArcSample[] = cleaned.map((s) => {
    let arc = map.mapDistance(s.distance);
    if (arc < prevArc) arc = prevArc; // belt-and-suspenders monotonicity
    prevArc = arc;
    const p = interpolateAlongPath(route.points, route.cumulative, arc);
    return { ...s, distance: arc, lat: p.lat, lon: p.lon, altitude: s.altitude ?? p.ele, arc };
  });

  const samples = resampleAtVertices(withArc, route);

  const report: MergeReport = {
    recordedDistance: recordedTotal,
    routeLength: route.length,
    ratio: route.length > 0 ? recordedTotal / route.length : 0,
  };

  return { samples, sport: activity.sport, report };
}
