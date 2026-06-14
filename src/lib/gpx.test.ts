import { describe, it, expect } from 'vitest';
import { parseGpx } from './gpx';

const trackGpx = `<?xml version="1.0"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1">
  <trk><trkseg>
    <trkpt lat="50.0" lon="30.0"><ele>100</ele></trkpt>
    <trkpt lat="50.0" lon="30.01"><ele>110</ele></trkpt>
    <trkpt lat="50.0" lon="30.02"></trkpt>
  </trkseg></trk>
</gpx>`;

const routeGpx = `<?xml version="1.0"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1">
  <rte>
    <rtept lat="49.0" lon="31.0"></rtept>
    <rtept lat="49.0" lon="31.01"></rtept>
  </rte>
</gpx>`;

const onePoint = `<?xml version="1.0"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1">
  <trk><trkseg><trkpt lat="50.0" lon="30.0"></trkpt></trkseg></trk>
</gpx>`;

describe('parseGpx', () => {
  it('parses track points with optional elevation', () => {
    const pts = parseGpx(trackGpx);
    expect(pts).toHaveLength(3);
    expect(pts[0]).toEqual({ lat: 50.0, lon: 30.0, ele: 100 });
    expect(pts[2].ele).toBeUndefined();
  });
  it('falls back to route points when there is no track', () => {
    const pts = parseGpx(routeGpx);
    expect(pts).toHaveLength(2);
    expect(pts[0].lat).toBe(49.0);
  });
  it('throws when there are fewer than 2 points', () => {
    expect(() => parseGpx(onePoint)).toThrow(/at least 2/i);
  });
});
