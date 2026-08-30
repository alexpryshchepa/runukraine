import type { GarminSample } from '../types';
import { RESET_RATIO, maxSpeedForSport } from './mergeConfig';

/**
 * Turns the watch's raw cumulative distance into one monotonic, plausible
 * stream: lap-counter resets are stitched together, backward jitter is
 * clamped, and steps implying an impossible speed are capped.
 *
 * Capping matters because the merge scales this stream linearly onto the
 * route — a single jam-induced distance spike would otherwise compress the
 * entire track.
 */
export function cleanDistanceStream(samples: GarminSample[], sport?: string): GarminSample[] {
  const maxSpeed = maxSpeedForSport(sport);
  const out: GarminSample[] = [];
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
      const step = cum - prev.distance;
      const maxStep = dt > 0 ? maxSpeed * dt : 0;
      if (step > maxStep) {
        // Absorb the excess into `offset` so later samples stay consistent
        // with the capped value instead of snapping back to the raw stream.
        offset -= step - maxStep;
        cum = prev.distance + maxStep;
      }
    }

    out.push({ ...original, distance: cum });
    prevRaw = raw;
    lastCum = cum;
  }

  return out;
}
