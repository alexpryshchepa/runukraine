import { describe, it, expect } from 'vitest';
import { cleanDistanceStream } from './clean';
import type { GarminSample } from '../types';

function sample(tSec: number, distance: number): GarminSample {
  return { time: new Date(2026, 0, 1, 0, 0, tSec), distance };
}

describe('cleanDistanceStream', () => {
  it('merges lap-reset distance counters into one monotonic stream', () => {
    const samples = cleanDistanceStream([
      sample(0, 0),
      sample(30, 100),
      sample(60, 0), // new lap — counter reset to ~0
      sample(90, 80),
    ]);
    expect(samples.map((s) => s.distance)).toEqual([0, 100, 100, 180]);
  });

  it('does NOT treat a small backward jitter as a reset (clamps monotonically)', () => {
    const samples = cleanDistanceStream([
      sample(0, 100),
      sample(30, 95), // 5 m GPS wobble, not a lap reset
      sample(60, 200),
    ]);
    expect(samples.map((s) => s.distance)).toEqual([100, 100, 200]);
  });

  it('clamps a step implying an impossible running speed to the speed cap', () => {
    const samples = cleanDistanceStream([
      sample(0, 0),
      sample(1, 10), // 10 m in 1 s = 36 km/h — ok for running
      sample(2, 100), // 90 m in 1 s = 324 km/h — impossible
    ]);
    // the spike is capped at MAX_SPEED_RUN (12.5 m/s) × 1 s
    expect(samples.map((s) => s.distance)).toEqual([0, 10, 22.5]);
  });

  it('keeps counting normally after a clamped spike', () => {
    const samples = cleanDistanceStream([
      sample(0, 0),
      sample(1, 1000), // spike
      sample(2, 1005), // a plausible 5 m step on top of the spike
      sample(3, 1010),
    ]);
    expect(samples.map((s) => s.distance)).toEqual([0, 12.5, 17.5, 22.5]);
  });

  it('uses the bike speed cap for cycling activities', () => {
    const fast = [sample(0, 0), sample(1, 20)]; // 72 km/h
    expect(cleanDistanceStream(fast, 'Running')[1].distance).toBe(12.5);
    expect(cleanDistanceStream(fast, 'Biking')[1].distance).toBe(20);
  });
});
