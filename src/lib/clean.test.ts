import { describe, it, expect } from 'vitest';
import { cleanDistanceStream } from './clean';
import type { GarminSample } from '../types';

function sample(tSec: number, distance: number): GarminSample {
  return { time: new Date(2026, 0, 1, 0, 0, tSec), distance };
}

describe('cleanDistanceStream', () => {
  it('merges lap-reset distance counters into one monotonic stream', () => {
    const { samples } = cleanDistanceStream([
      sample(0, 0),
      sample(30, 500),
      sample(60, 0), // new lap — counter reset to ~0
      sample(90, 400),
    ]);
    expect(samples.map((s) => s.distance)).toEqual([0, 500, 500, 900]);
  });

  it('does NOT treat a small backward jitter as a reset (clamps monotonically)', () => {
    const { samples } = cleanDistanceStream([
      sample(0, 100),
      sample(30, 95), // 5 m GPS wobble, not a lap reset
      sample(60, 200),
    ]);
    expect(samples.map((s) => s.distance)).toEqual([100, 100, 200]);
  });

  it('flags steps implying an impossible running speed', () => {
    const { flagged } = cleanDistanceStream([
      sample(0, 0),
      sample(1, 10), // 10 m in 1 s = 36 km/h — ok for running
      sample(2, 100), // 90 m in 1 s = 324 km/h — impossible
    ]);
    expect(flagged).toEqual([false, false, true]);
  });

  it('uses the bike speed cap for cycling activities', () => {
    const fast = [sample(0, 0), sample(1, 20)]; // 72 km/h
    expect(cleanDistanceStream(fast, 'Running').flagged[1]).toBe(true);
    expect(cleanDistanceStream(fast, 'Biking').flagged[1]).toBe(false);
  });
});
