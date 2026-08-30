import { describe, it, expect } from 'vitest';
import { serializeTcx } from './tcxWriter';
import { parseTcx } from './tcx';
import type { MergedActivity } from '../types';

const merged: MergedActivity = {
  sport: 'Running',
  samples: [
    { time: new Date('2026-06-01T08:00:00Z'), distance: 0, lat: 50.1, lon: 30.1, hr: 140, cadence: 85, altitude: 120 },
    { time: new Date('2026-06-01T08:00:30Z'), distance: 100, lat: 50.2, lon: 30.2, hr: 150, cadence: 88, altitude: 122 },
  ],
};

describe('serializeTcx', () => {
  it('produces valid XML that round-trips through parseTcx', () => {
    const xml = serializeTcx(merged);
    expect(xml).toContain('<LatitudeDegrees>');
    const reparsed = parseTcx(xml);
    expect(reparsed.sport).toBe('Running');
    expect(reparsed.samples).toHaveLength(2);
    expect(reparsed.samples[0].distance).toBeCloseTo(0, 2);
    expect(reparsed.samples[1].distance).toBeCloseTo(100, 2);
    expect(reparsed.samples[0].hr).toBe(140);
    expect(reparsed.samples[0].cadence).toBe(85);
    expect(reparsed.samples[0].altitude).toBeCloseTo(120, 2);
    expect(reparsed.samples[1].lat).toBeCloseTo(50.2, 5);
    expect(reparsed.samples[1].lon).toBeCloseTo(30.2, 5);
  });
  it('throws on an empty activity', () => {
    expect(() => serializeTcx({ samples: [] })).toThrow();
  });
});

describe('serializeTcx — activity type', () => {
  const bike: MergedActivity = { ...merged, sport: 'Biking' };

  it('writes the original sport back out unchanged', () => {
    expect(serializeTcx(bike)).toContain('<Activity Sport="Biking">');
    expect(serializeTcx({ ...merged, sport: 'Other' })).toContain('<Activity Sport="Other">');
  });

  it('does not guess Running when the source had no sport', () => {
    expect(serializeTcx({ samples: merged.samples })).toContain('<Activity Sport="Other">');
  });

  it('writes bike cadence as a Trackpoint Cadence element, not RunCadence', () => {
    const xml = serializeTcx(bike);
    expect(xml).toContain('<Cadence>85</Cadence>');
    expect(xml).not.toContain('RunCadence');
  });

  it('writes running cadence as the RunCadence extension', () => {
    const xml = serializeTcx(merged);
    expect(xml).toContain('<ns3:RunCadence>85</ns3:RunCadence>');
  });

  it('round-trips bike cadence back through parseTcx', () => {
    expect(parseTcx(serializeTcx(bike)).samples[0].cadence).toBe(85);
  });
});
