import { describe, it, expect } from 'vitest';
import { parseTcx } from './tcx';

const oneLap = `<?xml version="1.0"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="Running">
      <Lap>
        <Track>
          <Trackpoint>
            <Time>2026-06-01T08:00:00Z</Time>
            <Position><LatitudeDegrees>50.1</LatitudeDegrees><LongitudeDegrees>30.1</LongitudeDegrees></Position>
            <AltitudeMeters>120</AltitudeMeters>
            <DistanceMeters>0</DistanceMeters>
            <HeartRateBpm><Value>140</Value></HeartRateBpm>
            <Extensions><TPX xmlns="http://www.garmin.com/xmlschemas/ActivityExtension/v2"><RunCadence>85</RunCadence></TPX></Extensions>
          </Trackpoint>
          <Trackpoint>
            <Time>2026-06-01T08:00:30Z</Time>
            <AltitudeMeters>121</AltitudeMeters>
            <DistanceMeters>100</DistanceMeters>
            <HeartRateBpm><Value>150</Value></HeartRateBpm>
            <Extensions><TPX xmlns="http://www.garmin.com/xmlschemas/ActivityExtension/v2"><RunCadence>88</RunCadence></TPX></Extensions>
          </Trackpoint>
        </Track>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

const twoLapsReset = `<?xml version="1.0"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities><Activity Sport="Running">
    <Lap><Track>
      <Trackpoint><Time>2026-06-01T08:00:00Z</Time><DistanceMeters>0</DistanceMeters></Trackpoint>
      <Trackpoint><Time>2026-06-01T08:00:30Z</Time><DistanceMeters>500</DistanceMeters></Trackpoint>
    </Track></Lap>
    <Lap><Track>
      <Trackpoint><Time>2026-06-01T08:01:00Z</Time><DistanceMeters>0</DistanceMeters></Trackpoint>
      <Trackpoint><Time>2026-06-01T08:01:30Z</Time><DistanceMeters>400</DistanceMeters></Trackpoint>
    </Track></Lap>
  </Activity></Activities>
</TrainingCenterDatabase>`;

const noDistance = `<?xml version="1.0"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities><Activity><Lap><Track>
    <Trackpoint><Time>2026-06-01T08:00:00Z</Time></Trackpoint>
  </Track></Lap></Activity></Activities>
</TrainingCenterDatabase>`;

describe('parseTcx', () => {
  it('parses trackpoints with full telemetry', () => {
    const a = parseTcx(oneLap);
    expect(a.sport).toBe('Running');
    expect(a.samples).toHaveLength(2);
    expect(a.samples[0].distance).toBe(0);
    expect(a.samples[0].hr).toBe(140);
    expect(a.samples[0].cadence).toBe(85);
    expect(a.samples[0].altitude).toBe(120);
    expect(a.samples[0].lat).toBeCloseTo(50.1, 5);
    expect(a.samples[0].lon).toBeCloseTo(30.1, 5);
    expect(a.samples[1].distance).toBe(100);
  });
  it('extracts raw per-trackpoint distances (lap merging happens in clean)', () => {
    const a = parseTcx(twoLapsReset);
    expect(a.samples.map((s) => s.distance)).toEqual([0, 500, 0, 400]);
  });
  it('throws when there is no distance data', () => {
    expect(() => parseTcx(noDistance)).toThrow(/no distance/i);
  });
  it('throws on invalid XML', () => {
    expect(() => parseTcx('not xml <<<')).toThrow();
  });
});
