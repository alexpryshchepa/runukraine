import { describe, it, expect } from 'vitest';
import { mergeActivityWithRoute } from './merge';
import { cumulativeDistances } from './geo';
import type { GarminActivity, GarminSample, Route, RoutePoint } from '../types';

function straightRoute(): Route {
  const points: RoutePoint[] = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: 1 },
  ];
  const cumulative = cumulativeDistances(points);
  return { name: 'Straight', points, cumulative, length: cumulative[1] };
}

const activity: GarminActivity = {
  sport: 'Running',
  samples: [
    { time: new Date('2026-06-01T08:00:00Z'), distance: 0, hr: 130 },
    { time: new Date('2026-06-01T08:00:30Z'), distance: 5, hr: 150 },
    { time: new Date('2026-06-01T08:01:00Z'), distance: 10, hr: 170 },
  ],
};

describe('mergeActivityWithRoute', () => {
  it('maps the first sample to the route start and the last to the route finish', () => {
    const route = straightRoute();
    const merged = mergeActivityWithRoute(activity, route);
    expect(merged.samples[0].lon).toBeCloseTo(0, 5);
    expect(merged.samples[2].lon).toBeCloseTo(1, 5);
    expect(merged.samples[0].lat).toBeCloseTo(0, 5);
  });
  it('scales distances to the route length and keeps them monotonic', () => {
    const route = straightRoute();
    const merged = mergeActivityWithRoute(activity, route);
    expect(merged.samples[0].distance).toBeCloseTo(0, 5);
    expect(merged.samples[2].distance).toBeCloseTo(route.length, 3);
    expect(merged.samples[1].distance).toBeGreaterThan(merged.samples[0].distance);
    expect(merged.samples[1].distance).toBeLessThan(merged.samples[2].distance);
  });
  it('places the midpoint sample halfway along the route', () => {
    const route = straightRoute();
    const merged = mergeActivityWithRoute(activity, route);
    expect(merged.samples[1].lon).toBeCloseTo(0.5, 3);
  });
  it('preserves telemetry and sport', () => {
    const merged = mergeActivityWithRoute(activity, straightRoute());
    expect(merged.sport).toBe('Running');
    expect(merged.samples[2].hr).toBe(170);
  });
  it('throws when there is no usable distance', () => {
    const flat: GarminActivity = {
      samples: [
        { time: new Date('2026-06-01T08:00:00Z'), distance: 0 },
        { time: new Date('2026-06-01T08:00:30Z'), distance: 0 },
      ],
    };
    expect(() => mergeActivityWithRoute(flat, straightRoute())).toThrow(/distance/i);
  });
  it('throws when the route has fewer than 2 points', () => {
    const badRoute: Route = { name: 'x', points: [{ lat: 0, lon: 0 }], cumulative: [0], length: 0 };
    expect(() => mergeActivityWithRoute(activity, badRoute)).toThrow(/2 points/i);
  });
});

function eastRoute(lonEnd: number): Route {
  const points: RoutePoint[] = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: lonEnd },
  ];
  const cumulative = cumulativeDistances(points);
  return { name: 'East', points, cumulative, length: cumulative[1] };
}

function gs(tSec: number, distance: number, lat?: number, lon?: number) {
  return { time: new Date(2026, 0, 1, 0, 0, tSec), distance, lat, lon };
}

describe('mergeActivityWithRoute — route endpoints', () => {
  /**
   * The watch is jammed for the first 1 km and the last 1 km, so it under-counts
   * distance there and has no GPS fix. In between it tracks the route cleanly.
   * The merged track must still begin at the route's first point and end at its
   * last, because the route is used exactly as uploaded.
   */
  function jammedAtBothEnds(route: Route): GarminActivity {
    const arcToLon = (arc: number) => (arc / route.length) * 0.09;
    const samples: GarminSample[] = [];
    const at = (d: number, arc?: number) =>
      samples.push(gs(samples.length * 30, d, arc === undefined ? undefined : 0,
        arc === undefined ? undefined : arcToLon(arc)));

    at(0); // true arc 0, no fix
    at(150); // true arc ~500, no fix
    for (let i = 0; i <= 8; i++) at(300 + i * 1000, 1000 + i * 1000); // clean, arcs 1000..9000
    at(8600); // true arc = route.length, no fix

    return { sport: 'Running', samples };
  }

  it('starts exactly on the route start and ends exactly on the route finish', () => {
    const route = eastRoute(0.09);
    const merged = mergeActivityWithRoute(jammedAtBothEnds(route), route);
    const first = merged.samples[0];
    const last = merged.samples[merged.samples.length - 1];

    expect(first.lat).toBe(route.points[0].lat);
    expect(first.lon).toBe(route.points[0].lon);
    expect(last.lat).toBe(route.points[route.points.length - 1].lat);
    expect(last.lon).toBe(route.points[route.points.length - 1].lon);
  });

  it('spans the full route distance regardless of what the watch recorded', () => {
    const route = eastRoute(0.09);
    const merged = mergeActivityWithRoute(jammedAtBothEnds(route), route);
    expect(merged.samples[0].distance).toBe(0);
    expect(merged.samples[merged.samples.length - 1].distance).toBe(route.length);
  });
});
