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
