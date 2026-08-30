import { describe, it, expect } from 'vitest';
import { buildDistanceMap } from './distanceMap';
import { cumulativeDistances } from './geo';
import type { GarminSample, Route, RoutePoint } from '../types';

function eastRoute(lonEnd: number): Route {
  const points: RoutePoint[] = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: lonEnd },
  ];
  const cumulative = cumulativeDistances(points);
  return { name: 'East', points, cumulative, length: cumulative[1] };
}

function s(tSec: number, distance: number): GarminSample {
  return { time: new Date(2026, 0, 1, 0, 0, tSec), distance };
}

describe('buildDistanceMap', () => {
  const route = eastRoute(0.09); // ~10018 m
  const samples = [s(0, 0), s(30, 5), s(60, 10)];

  it('maps the first recorded distance to the route start', () => {
    expect(buildDistanceMap(samples, route).mapDistance(0)).toBe(0);
  });

  it('maps the last recorded distance to exactly the route length', () => {
    expect(buildDistanceMap(samples, route).mapDistance(10)).toBe(route.length);
  });

  it('scales the interior linearly', () => {
    expect(buildDistanceMap(samples, route).mapDistance(5)).toBeCloseTo(route.length / 2, 9);
  });

  it('ignores where the activity thought it was — only the distance stream counts', () => {
    // identical distance stream, GPS fixes way off the route: same mapping
    const withGps = samples.map((x) => ({ ...x, lat: 40, lon: -70 }));
    expect(buildDistanceMap(withGps, route).mapDistance(5)).toBe(
      buildDistanceMap(samples, route).mapDistance(5),
    );
  });

  it('stretches a short activity across the whole route', () => {
    const short = [s(0, 0), s(30, 7000)];
    expect(buildDistanceMap(short, route).mapDistance(7000)).toBe(route.length);
  });

  it('does not start part-way along when the activity begins at a non-zero distance', () => {
    const offsetStream = [s(0, 4000), s(30, 9000)];
    const map = buildDistanceMap(offsetStream, route);
    expect(map.mapDistance(4000)).toBe(0);
    expect(map.mapDistance(9000)).toBe(route.length);
  });

  it('clamps distances outside the recorded range onto the route', () => {
    const map = buildDistanceMap(samples, route);
    expect(map.mapDistance(-5)).toBe(0);
    expect(map.mapDistance(999)).toBe(route.length);
  });
});
