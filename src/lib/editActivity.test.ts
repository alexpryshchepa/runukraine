import { describe, it, expect } from 'vitest';
import {
  shiftActivityStart,
  dateToLocalInput,
  localInputToDate,
  isStartInFuture,
} from './editActivity';
import type { GarminActivity } from '../types';

const activity: GarminActivity = {
  sport: 'Running',
  samples: [
    { time: new Date('2026-06-01T08:00:00Z'), distance: 0, hr: 130, cadence: 80 },
    { time: new Date('2026-06-01T08:00:30Z'), distance: 100, hr: 150, cadence: 82 },
  ],
};

describe('shiftActivityStart', () => {
  it('moves the first sample to the new start, preserving gaps and telemetry', () => {
    const out = shiftActivityStart(activity, new Date('2026-06-01T09:15:00Z'));
    expect(out.samples[0].time.toISOString()).toBe('2026-06-01T09:15:00.000Z');
    expect(out.samples[1].time.getTime() - out.samples[0].time.getTime()).toBe(30000);
    expect(out.samples[0].hr).toBe(130);
    expect(out.samples[1].distance).toBe(100);
    expect(out.samples[1].cadence).toBe(82);
    expect(out.sport).toBe('Running');
  });
  it('shifts backward too', () => {
    const out = shiftActivityStart(activity, new Date('2026-06-01T07:00:00Z'));
    expect(out.samples[0].time.toISOString()).toBe('2026-06-01T07:00:00.000Z');
    expect(out.samples[1].time.toISOString()).toBe('2026-06-01T07:00:30.000Z');
  });
  it('does not mutate the input activity', () => {
    shiftActivityStart(activity, new Date('2026-06-01T10:00:00Z'));
    expect(activity.samples[0].time.toISOString()).toBe('2026-06-01T08:00:00.000Z');
  });
  it('returns the activity unchanged when there are no samples', () => {
    const empty: GarminActivity = { samples: [] };
    expect(shiftActivityStart(empty, new Date('2026-06-01T09:00:00Z'))).toBe(empty);
  });
});

describe('dateToLocalInput / localInputToDate', () => {
  it('round-trips a local datetime through the input format', () => {
    const d = new Date(2026, 5, 1, 8, 30); // local June 1 2026, 08:30
    const s = dateToLocalInput(d);
    expect(s).toBe('2026-06-01T08:30');
    expect(localInputToDate(s).getTime()).toBe(d.getTime());
  });
  it('returns an invalid date for empty input', () => {
    expect(Number.isNaN(localInputToDate('').getTime())).toBe(true);
  });
});

describe('isStartInFuture', () => {
  const now = new Date('2026-06-17T12:00:00Z');

  it('returns true when the start is after now', () => {
    const future = dateToLocalInput(new Date(now.getTime() + 3_600_000));
    expect(isStartInFuture(future, now)).toBe(true);
  });

  it('returns false when the start is before now', () => {
    const past = dateToLocalInput(new Date(now.getTime() - 3_600_000));
    expect(isStartInFuture(past, now)).toBe(false);
  });

  it('returns false when the start equals now', () => {
    expect(isStartInFuture(dateToLocalInput(now), now)).toBe(false);
  });

  it('returns false for empty or unparseable input', () => {
    expect(isStartInFuture('', now)).toBe(false);
    expect(isStartInFuture('not-a-date', now)).toBe(false);
  });
});
