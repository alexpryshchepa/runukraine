import { describe, it, expect } from 'vitest';
import { buildDistanceMap } from './distanceMap';
import { cumulativeDistances } from './geo';
import { buildAnchors } from './anchors';
import { cleanDistanceStream } from './clean';
import type { GarminSample, Route, RoutePoint } from '../types';

const M_PER_DEG_LON = 111320;

function eastRoute(lonEnd: number): Route {
  const points: RoutePoint[] = [
    { lat: 0, lon: 0 },
    { lat: 0, lon: lonEnd },
  ];
  const cumulative = cumulativeDistances(points);
  return { name: 'East', points, cumulative, length: cumulative[1] };
}

function s(tSec: number, distance: number, lat?: number, lon?: number): GarminSample {
  return { time: new Date(2026, 0, 1, 0, 0, tSec), distance, lat, lon };
}

describe('buildDistanceMap', () => {
  it('falls back to a global linear scale when there are too few anchors', () => {
    const route = eastRoute(0.09);
    const samples = [s(0, 0), s(30, 5), s(60, 10)]; // no GPS → 0 anchors
    const { samples: cleaned, flagged } = cleanDistanceStream(samples);
    const map = buildDistanceMap(cleaned, [], flagged, route);
    expect(map.fallbackUsed).toBe(true);
    expect(map.mapDistance(0, 0)).toBeCloseTo(0, 5);
    expect(map.mapDistance(10, 0)).toBeCloseTo(route.length, 3);
    expect(map.mapDistance(5, 0)).toBeCloseTo(route.length / 2, 3);
  });

  it('places a clean sample at its true arc despite a localized jam inflating total distance', () => {
    const route = eastRoute(0.09); // ~10018 m
    // clean 0..5000, jammed +20000 (no GPS), clean 25000..27000
    const samples: GarminSample[] = [];
    for (let d = 0; d <= 5000; d += 1000) samples.push(s(samples.length * 30, d, 0, d / M_PER_DEG_LON));
    samples.push(s(samples.length * 30, 15000));
    samples.push(s(samples.length * 30, 25000));
    const lastClean = [25000, 26000, 27000];
    // these clean fixes are at true arcs 8000..10000
    const trueArcs = [8000, 9000, 10000];
    lastClean.forEach((d, i) => samples.push(s(samples.length * 30, d, 0, trueArcs[i] / M_PER_DEG_LON)));

    const { samples: cleaned, flagged } = cleanDistanceStream(samples);
    const anchors = buildAnchors(cleaned, route);
    const map = buildDistanceMap(cleaned, anchors, flagged, route);

    expect(map.fallbackUsed).toBe(false);
    // recorded 5000 sample should land near arc 5000, NOT ~1855 (global scale of 27000→10018)
    expect(map.mapDistance(5000, cleaned[5].time.getTime())).toBeGreaterThan(4000);
  });

  it('ends short for a partial run (stops where the runner stopped)', () => {
    const route = eastRoute(0.09); // ~10018 m
    const samples: GarminSample[] = [];
    for (let d = 0; d <= 7000; d += 1000) samples.push(s(samples.length * 30, d, 0, d / M_PER_DEG_LON));
    const { samples: cleaned, flagged } = cleanDistanceStream(samples);
    const anchors = buildAnchors(cleaned, route);
    const map = buildDistanceMap(cleaned, anchors, flagged, route);
    expect(map.finalArc).toBeGreaterThan(6000);
    expect(map.finalArc).toBeLessThan(8000); // well short of ~10018
  });
});
