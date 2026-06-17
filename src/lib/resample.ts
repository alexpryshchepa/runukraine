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
