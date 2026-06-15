import { describe, it, expect } from 'vitest';
import { AppError } from './errors';
import { parseTcx } from './tcx';
import { parseGpx } from './gpx';
import { mergeActivityWithRoute } from './merge';
import { serializeTcx } from './tcxWriter';
import type { GarminActivity, Route } from '../types';

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (e) {
    if (e instanceof AppError) return e.code;
    return `not-an-AppError: ${(e as Error).message}`;
  }
  return 'did-not-throw';
}

describe('AppError', () => {
  it('carries a code and an English message', () => {
    const err = new AppError('exportEmpty');
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('exportEmpty');
    expect(err.message).toBe('Cannot export an empty activity.');
  });
});

describe('lib functions throw coded AppErrors', () => {
  const twoPointRoute: Route = {
    name: 'r',
    points: [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 1 },
    ],
    cumulative: [0, 1000],
    length: 1000,
  };

  it('parseTcx → tcxInvalidXml', () => {
    expect(codeOf(() => parseTcx('not xml <<<'))).toBe('tcxInvalidXml');
  });

  it('parseTcx → tcxNoTrackpoints', () => {
    expect(codeOf(() => parseTcx('<TrainingCenterDatabase></TrainingCenterDatabase>'))).toBe(
      'tcxNoTrackpoints',
    );
  });

  it('parseTcx → tcxNoDistance', () => {
    const noDistance =
      '<TrainingCenterDatabase><Activities><Activity Sport="Running"><Lap><Track>' +
      '<Trackpoint><Time>2026-06-01T08:00:00Z</Time></Trackpoint>' +
      '</Track></Lap></Activity></Activities></TrainingCenterDatabase>';
    expect(codeOf(() => parseTcx(noDistance))).toBe('tcxNoDistance');
  });

  it('parseGpx → gpxInvalidXml', () => {
    expect(codeOf(() => parseGpx('not xml <<<'))).toBe('gpxInvalidXml');
  });

  it('parseGpx → gpxTooFewPoints', () => {
    expect(codeOf(() => parseGpx('<gpx><trkpt lat="0" lon="0"></trkpt></gpx>'))).toBe(
      'gpxTooFewPoints',
    );
  });

  it('mergeActivityWithRoute → mergeNoSamples', () => {
    const empty: GarminActivity = { samples: [] };
    expect(codeOf(() => mergeActivityWithRoute(empty, twoPointRoute))).toBe('mergeNoSamples');
  });

  it('mergeActivityWithRoute → mergeRouteTooFewPoints', () => {
    const activity: GarminActivity = { samples: [{ time: new Date('2026-06-01T08:00:00Z'), distance: 0 }] };
    const badRoute: Route = { name: 'r', points: [{ lat: 0, lon: 0 }], cumulative: [0], length: 0 };
    expect(codeOf(() => mergeActivityWithRoute(activity, badRoute))).toBe('mergeRouteTooFewPoints');
  });

  it('mergeActivityWithRoute → mergeNoDistance', () => {
    const activity: GarminActivity = {
      samples: [
        { time: new Date('2026-06-01T08:00:00Z'), distance: 0 },
        { time: new Date('2026-06-01T08:10:00Z'), distance: 0 },
      ],
    };
    expect(codeOf(() => mergeActivityWithRoute(activity, twoPointRoute))).toBe('mergeNoDistance');
  });

  it('serializeTcx → exportEmpty', () => {
    expect(codeOf(() => serializeTcx({ samples: [] }))).toBe('exportEmpty');
  });
});
