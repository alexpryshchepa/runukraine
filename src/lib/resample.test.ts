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
