import { describe, it, expect } from 'vitest';
import { haversine, cumulativeDistances, interpolateAlongPath } from './geo';
import type { RoutePoint } from '../types';

describe('haversine', () => {
  it('is 0 for the same point', () => {
    expect(haversine(50, 30, 50, 30)).toBe(0);
  });
  it('is ~111195 m for 1 degree of longitude at the equator', () => {
    expect(Math.abs(haversine(0, 0, 0, 1) - 111194.9)).toBeLessThan(1);
  });
});

describe('cumulativeDistances', () => {
  it('starts at 0 and increases monotonically', () => {
    const pts: RoutePoint[] = [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 1 },
      { lat: 0, lon: 2 },
    ];
    const cum = cumulativeDistances(pts);
    expect(cum[0]).toBe(0);
    expect(cum[1]).toBeGreaterThan(0);
    expect(cum[2]).toBeGreaterThan(cum[1]);
  });
});

describe('interpolateAlongPath', () => {
  const pts: RoutePoint[] = [
    { lat: 0, lon: 0, ele: 100 },
    { lat: 0, lon: 1, ele: 200 },
  ];
  const cum = cumulativeDistances(pts);

  it('returns the first point at distance 0', () => {
    const p = interpolateAlongPath(pts, cum, 0);
    expect(p.lat).toBeCloseTo(0, 6);
    expect(p.lon).toBeCloseTo(0, 6);
    expect(p.ele).toBeCloseTo(100, 3);
  });
  it('returns the last point at full distance', () => {
    const p = interpolateAlongPath(pts, cum, cum[1]);
    expect(p.lon).toBeCloseTo(1, 6);
    expect(p.ele).toBeCloseTo(200, 3);
  });
  it('interpolates the midpoint', () => {
    const p = interpolateAlongPath(pts, cum, cum[1] / 2);
    expect(p.lon).toBeCloseTo(0.5, 4);
    expect(p.ele).toBeCloseTo(150, 1);
  });
  it('clamps distances beyond the path end', () => {
    const p = interpolateAlongPath(pts, cum, cum[1] * 2);
    expect(p.lon).toBeCloseTo(1, 6);
  });
});
