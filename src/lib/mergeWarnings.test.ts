import { describe, it, expect } from 'vitest';
import { mergeReportWarnings } from './mergeWarnings';
import type { MergeReport } from '../types';

function report(over: Partial<MergeReport> = {}): MergeReport {
  return { recordedDistance: 10000, routeLength: 10000, ratio: 1, ...over };
}

describe('mergeReportWarnings', () => {
  it('returns nothing when the activity matches the route length', () => {
    expect(mergeReportWarnings(report(), 'run')).toEqual([]);
  });

  it('stays quiet about the small overcount a healthy GPS produces', () => {
    expect(mergeReportWarnings(report({ recordedDistance: 10200, ratio: 1.02 }), 'run')).toEqual([]);
  });

  it('warns that a short activity was stretched over the whole route', () => {
    const w = mergeReportWarnings(report({ recordedDistance: 7000, ratio: 0.7 }), 'run');
    expect(w.map((x) => x.key)).toEqual(['mergeWarnStretched.run']);
    expect(w[0].params).toMatchObject({ recorded: '7.00', route: '10.00' });
  });

  it('names the activity type in the stretch warning', () => {
    const w = mergeReportWarnings(report({ recordedDistance: 7000, ratio: 0.7 }), 'ride');
    expect(w[0].key).toBe('mergeWarnStretched.ride');
  });

  it('warns when the watch recorded far more distance than the route holds', () => {
    const w = mergeReportWarnings(report({ recordedDistance: 27000, ratio: 2.7 }), 'run');
    expect(w.map((x) => x.key)).toEqual(['mergeWarnRatio']);
    expect(w[0].params).toMatchObject({ recorded: '27.00', route: '10.00', ratio: '2.7' });
  });

  it('never reports a stretch and an overcount at once', () => {
    for (const ratio of [0.3, 0.7, 0.99, 1.0, 1.02, 1.5, 3]) {
      const w = mergeReportWarnings(report({ ratio, recordedDistance: 10000 * ratio }), 'run');
      expect(w.length).toBeLessThanOrEqual(1);
    }
  });
});
