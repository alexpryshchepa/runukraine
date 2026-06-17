import { describe, it, expect } from 'vitest';
import { computeStats } from './stats';
import type { GarminSample } from '../types';

const samples: GarminSample[] = [
  { time: new Date('2026-06-01T08:00:00Z'), distance: 0, hr: 130, cadence: 80 },
  { time: new Date('2026-06-01T08:00:30Z'), distance: 100, hr: 150, cadence: 90 },
  { time: new Date('2026-06-01T08:01:00Z'), distance: 200, hr: 170, cadence: 88 },
];

describe('computeStats', () => {
  it('computes distance, elapsed time, hr and cadence', () => {
    const s = computeStats(samples);
    expect(s.distanceMeters).toBe(200);
    expect(s.elapsedSeconds).toBe(60);
    expect(s.avgHr).toBe(150);
    expect(s.maxHr).toBe(170);
    expect(s.avgCadence).toBe(86);
    expect(s.avgPaceSecondsPerKm).toBe(300);
  });
  it('omits hr and cadence when absent', () => {
    const s = computeStats([
      { time: new Date('2026-06-01T08:00:00Z'), distance: 0 },
      { time: new Date('2026-06-01T08:00:10Z'), distance: 50 },
    ]);
    expect(s.avgHr).toBeUndefined();
    expect(s.maxHr).toBeUndefined();
    expect(s.avgCadence).toBeUndefined();
  });
  it('returns zeros for an empty activity', () => {
    const s = computeStats([]);
    expect(s.distanceMeters).toBe(0);
    expect(s.elapsedSeconds).toBe(0);
    expect(s.avgPaceSecondsPerKm).toBeUndefined();
  });
});
