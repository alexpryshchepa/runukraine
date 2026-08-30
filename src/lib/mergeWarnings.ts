import type { MergeReport } from '../types';
import type { SportKind } from './sport';
import type { TParams } from '../i18n/i18n';

export interface MergeWarning {
  key: string;
  params: TParams;
}

const km = (m: number) => (m / 1000).toFixed(2);

/** Below this the activity is treated as noticeably shorter than the route. */
const STRETCH_RATIO = 0.95;
/** Above this the watch counted materially more distance than the route holds. */
const OVERCOUNT_RATIO = 1.05;

/**
 * The merge always spans the whole route, so the honest thing to flag is a
 * mismatch between what the watch counted and how long the route actually is:
 * short activities get stretched, jam-inflated ones get squeezed.
 */
export function mergeReportWarnings(report: MergeReport, kind: SportKind): MergeWarning[] {
  const recorded = km(report.recordedDistance);
  const route = km(report.routeLength);

  if (report.ratio < STRETCH_RATIO) {
    return [{ key: `mergeWarnStretched.${kind}`, params: { recorded, route } }];
  }
  if (report.ratio > OVERCOUNT_RATIO) {
    return [
      { key: 'mergeWarnRatio', params: { recorded, route, ratio: report.ratio.toFixed(1) } },
    ];
  }
  return [];
}
