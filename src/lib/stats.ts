import type { GarminSample, ActivityStats } from '../types';

export function computeStats(samples: GarminSample[]): ActivityStats {
  if (samples.length === 0) {
    return { distanceMeters: 0, elapsedSeconds: 0 };
  }
  const first = samples[0];
  const last = samples[samples.length - 1];
  const distanceMeters = last.distance - first.distance;
  const elapsedSeconds = (last.time.getTime() - first.time.getTime()) / 1000;

  const hrs = samples.map((s) => s.hr).filter((v): v is number => v !== undefined);
  const cads = samples.map((s) => s.cadence).filter((v): v is number => v !== undefined);

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : undefined;

  const avgHrVal = avg(hrs);
  const avgCadVal = avg(cads);

  return {
    distanceMeters,
    elapsedSeconds,
    avgHr: avgHrVal === undefined ? undefined : Math.round(avgHrVal),
    maxHr: hrs.length ? Math.max(...hrs) : undefined,
    avgCadence: avgCadVal === undefined ? undefined : Math.round(avgCadVal),
  };
}
