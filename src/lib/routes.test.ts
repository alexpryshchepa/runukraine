import { describe, it, expect } from 'vitest';
import { buildRoute, filenameToName, loadBundledRoutes } from './routes';

const gpx = `<?xml version="1.0"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg>
  <trkpt lat="0" lon="0"></trkpt>
  <trkpt lat="0" lon="1"></trkpt>
</trkseg></trk></gpx>`;

describe('buildRoute', () => {
  it('builds a route with cumulative distances and length', () => {
    const r = buildRoute('Test', gpx);
    expect(r.name).toBe('Test');
    expect(r.points).toHaveLength(2);
    expect(r.cumulative[0]).toBe(0);
    expect(r.length).toBeGreaterThan(100000);
    expect(r.length).toBe(r.cumulative[r.cumulative.length - 1]);
  });
});

describe('filenameToName', () => {
  it('turns a file path into a title', () => {
    expect(filenameToName('../routes/kyiv-half_marathon.gpx')).toBe('Kyiv Half Marathon');
  });
});

describe('loadBundledRoutes', () => {
  it('loads at least the sample route, each with a positive length', () => {
    const routes = loadBundledRoutes();
    expect(routes.length).toBeGreaterThanOrEqual(1);
    for (const r of routes) {
      expect(r.length).toBeGreaterThan(0);
      expect(r.name.length).toBeGreaterThan(0);
    }
  });
});
