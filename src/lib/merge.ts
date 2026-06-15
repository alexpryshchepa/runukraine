import type { GarminActivity, MergedActivity, MergedSample, Route } from '../types';
import { interpolateAlongPath } from './geo';
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
  const first = activity.samples[0];
  const last = activity.samples[activity.samples.length - 1];
  const garminTotal = last.distance - first.distance;
  if (garminTotal <= 0) {
    throw new AppError('mergeNoDistance');
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
