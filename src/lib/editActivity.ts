import type { GarminActivity } from '../types';

export function shiftActivityStart(activity: GarminActivity, newStart: Date): GarminActivity {
  if (activity.samples.length === 0) return activity;
  const delta = newStart.getTime() - activity.samples[0].time.getTime();
  if (delta === 0) return activity;
  return {
    ...activity,
    samples: activity.samples.map((s) => ({
      ...s,
      time: new Date(s.time.getTime() + delta),
    })),
  };
}

export function dateToLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export function localInputToDate(value: string): Date {
  return new Date(value);
}

export type StartTimeError = 'future' | 'invalid';

/**
 * Validate a datetime-local start value against `now`.
 * - 'invalid' — empty or unparseable input
 * - 'future'  — a valid date strictly after `now`
 * - null      — a valid, non-future date
 */
export function validateStartTime(value: string, now: Date): StartTimeError | null {
  const d = localInputToDate(value);
  if (Number.isNaN(d.getTime())) return 'invalid';
  if (d.getTime() > now.getTime()) return 'future';
  return null;
}
