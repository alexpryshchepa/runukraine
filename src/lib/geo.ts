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
