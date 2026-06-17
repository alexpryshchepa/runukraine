import type { GarminSample } from '../types';
import { RESET_RATIO, maxSpeedForSport } from './mergeConfig';

export interface CleanedStream {
  samples: GarminSample[];
  flagged: boolean[];
}

export function cleanDistanceStream(samples: GarminSample[], sport?: string): CleanedStream {
  const maxSpeed = maxSpeedForSport(sport);
  const out: GarminSample[] = [];
  const flagged: boolean[] = [];
  let offset = 0;
  let prevRaw = Number.NEGATIVE_INFINITY;
  let lastCum = Number.NEGATIVE_INFINITY;

  for (const original of samples) {
    const raw = original.distance;
    if (prevRaw !== Number.NEGATIVE_INFINITY && raw < prevRaw * RESET_RATIO) {
      offset += prevRaw; // sharp drop toward zero → lap counter reset
    }
    let cum = raw + offset;
    if (cum < lastCum) cum = lastCum; // monotonic clamp for small backward jitter

    if (out.length > 0) {
      const prev = out[out.length - 1];
      const dt = (original.time.getTime() - prev.time.getTime()) / 1000;
      const dd = cum - prev.distance;
      const v = dt > 0 ? dd / dt : Number.POSITIVE_INFINITY;
      flagged.push(v > maxSpeed);
    } else {
      flagged.push(false);
    }

    out.push({ ...original, distance: cum });
    prevRaw = raw;
    lastCum = cum;
  }

  return { samples: out, flagged };
}
