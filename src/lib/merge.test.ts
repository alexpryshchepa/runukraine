import { describe, it, expect } from 'vitest';
import { mergeActivityWithRoute } from './merge';
import { cumulativeDistances } from './geo';
import type { GarminActivity, Route, RoutePoint } from '../types';

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
