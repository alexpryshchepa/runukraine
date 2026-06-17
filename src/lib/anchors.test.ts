import { describe, it, expect } from 'vitest';
import { buildAnchors } from './anchors';
import { cumulativeDistances } from './geo';
import type { GarminSample, Route, RoutePoint } from '../types';

const M_PER_DEG_LON = 111320; // at the equator

function eastRoute(lonEnd: number): Route {
  const points: RoutePoint[] = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: lonEnd },
  ];
  const cumulative = cumulativeDistances(points);
  return { name: 'East', points, cumulative, length: cumulative[1] };
}

function gpsSample(tSec: number, distance: number, lat: number, lon: number): GarminSample {
  return { time: new Date(2026, 0, 1, 0, 0, tSec), distance, lat, lon };
}

describe('buildAnchors', () => {
  it('anchors clean on-route fixes at their true arc-length', () => {
    const route = eastRoute(0.05); // ~5566 m
    const samples: GarminSample[] = [0, 1000, 2000, 3000].map((d, i) =>
      gpsSample(i * 30, d, 0, d / M_PER_DEG_LON),
    );
    const anchors = buildAnchors(samples, route);
    expect(anchors).toHaveLength(4);
    for (const a of anchors) {
      expect(a.routeArcLength).toBeCloseTo(a.recordedDistance, -1); // within ~10 m
    }
  });

  it('rejects fixes that are far off the route', () => {
    const route = eastRoute(0.05);
    const samples: GarminSample[] = [
      gpsSample(0, 0, 0, 0),
      gpsSample(30, 1000, 0.01, 1000 / M_PER_DEG_LON), // ~1.1 km north — jammed
      gpsSample(60, 2000, 0, 2000 / M_PER_DEG_LON),
    ];
    const anchors = buildAnchors(samples, route);
    expect(anchors.map((a) => a.sampleIndex)).toEqual([0, 2]);
  });

  it('keeps arc-length monotonic across an out-and-back turnaround', () => {
    // route goes east then back west to the start
    const points: RoutePoint[] = [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 0.02 },
      { lat: 0, lon: 0 },
    ];
    const cumulative = cumulativeDistances(points);
    const route: Route = { name: 'OutBack', points, cumulative, length: cumulative[2] };
    const outLen = cumulative[1];
    // runner near the turnaround then slightly back toward start
    const samples: GarminSample[] = [
      gpsSample(0, 0, 0, 0.018),
      gpsSample(30, 200, 0, 0.02),
      gpsSample(60, 400, 0, 0.018), // same longitude as sample 0, but later on the route
    ];
    const anchors = buildAnchors(samples, route);
    const arcs = anchors.map((a) => a.routeArcLength);
    for (let i = 1; i < arcs.length; i++) {
      expect(arcs[i]).toBeGreaterThanOrEqual(arcs[i - 1]);
    }
    expect(arcs[arcs.length - 1]).toBeGreaterThan(outLen); // last fix is on the return leg
  });
});
