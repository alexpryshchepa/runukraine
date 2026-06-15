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
