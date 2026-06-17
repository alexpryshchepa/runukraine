import { describe, it, expect } from 'vitest';
import { mergeReportWarnings } from './mergeWarnings';
import type { MergeReport } from '../types';

function report(over: Partial<MergeReport> = {}): MergeReport {
  return {
    recordedDistance: 10000,
    routeLength: 10000,
    ratio: 1,
    anchorCount: 50,
    fallbackUsed: false,
    partial: false,
    coveredFraction: 1,
    ...over,
  };
}

describe('mergeReportWarnings', () => {
  it('returns nothing for a clean full merge', () => {
    expect(mergeReportWarnings(report())).toEqual([]);
  });

  it('warns when the recorded distance is wildly off the route', () => {
    const w = mergeReportWarnings(report({ recordedDistance: 27000, ratio: 2.7 }));
    expect(w.map((x) => x.key)).toContain('mergeWarnRatio');
  });

  it('warns when the merge fell back to global scaling', () => {
    const w = mergeReportWarnings(report({ fallbackUsed: true }));
    expect(w.map((x) => x.key)).toContain('mergeWarnFallback');
  });

  it('warns on a partial run', () => {
    const w = mergeReportWarnings(report({ partial: true, coveredFraction: 0.7 }));
    expect(w.map((x) => x.key)).toContain('mergeWarnPartial');
  });
});
