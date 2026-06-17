import type { MergeReport } from '../types';
import type { TParams } from '../i18n/i18n';

export interface MergeWarning {
  key: string;
  params: TParams;
}

const km = (m: number) => (m / 1000).toFixed(2);

export function mergeReportWarnings(report: MergeReport): MergeWarning[] {
  const warnings: MergeWarning[] = [];

  if (report.fallbackUsed) {
    warnings.push({ key: 'mergeWarnFallback', params: {} });
  }
  if (report.ratio >= 2 || report.ratio <= 0.5) {
    warnings.push({
      key: 'mergeWarnRatio',
      params: {
        recorded: km(report.recordedDistance),
        route: km(report.routeLength),
        ratio: report.ratio.toFixed(1),
      },
    });
  }
  if (report.partial) {
    warnings.push({
      key: 'mergeWarnPartial',
      params: {
        covered: km(report.coveredFraction * report.routeLength),
        route: km(report.routeLength),
      },
    });
  }

  return warnings;
}
