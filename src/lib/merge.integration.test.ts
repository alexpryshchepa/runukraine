import { describe, it, expect } from 'vitest';
import { loadBundledRoutes } from './routes';
import { mergeActivityWithRoute } from './merge';
import { serializeTcx } from './tcxWriter';
import { parseTcx } from './tcx';
import type { GarminActivity } from '../types';

/**
 * Regression guard for the endpoint contract on real event routes, which have
 * thousands of vertices and exercise the arc-length search and resampling in a
 * way the synthetic two-point fixtures cannot.
 */
function activityOver(meters: number, sport: string): GarminActivity {
  const samples = [];
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    samples.push({
      time: new Date(Date.UTC(2026, 5, 1, 8, 0, i * 30)),
      distance: (meters * i) / steps,
      hr: 140,
      cadence: 85,
    });
  }
  return { sport, samples };
}

const routes = loadBundledRoutes();

describe('merge on the bundled event routes', () => {
  it('has routes to test', () => {
    expect(routes.length).toBeGreaterThan(0);
  });

  for (const route of routes) {
    describe(route.name, () => {
      // Deliberately mismatched: the watch under-counted by 12%.
      const merged = mergeActivityWithRoute(activityOver(route.length * 0.88, 'Running'), route);
      const first = merged.samples[0];
      const last = merged.samples[merged.samples.length - 1];
      const routeStart = route.points[0];
      const routeFinish = route.points[route.points.length - 1];

      it('starts on the exact first coordinate of the uploaded route', () => {
        expect(first.lat).toBe(routeStart.lat);
        expect(first.lon).toBe(routeStart.lon);
      });

      it('finishes on the exact last coordinate of the uploaded route', () => {
        expect(last.lat).toBe(routeFinish.lat);
        expect(last.lon).toBe(routeFinish.lon);
      });

      it('spans exactly the route length', () => {
        expect(first.distance).toBe(0);
        expect(last.distance).toBe(route.length);
      });

      it('keeps every merged point on the route and moving forward', () => {
        for (let i = 1; i < merged.samples.length; i++) {
          expect(merged.samples[i].distance).toBeGreaterThanOrEqual(merged.samples[i - 1].distance);
          expect(merged.samples[i].time.getTime()).toBeGreaterThanOrEqual(
            merged.samples[i - 1].time.getTime(),
          );
        }
      });

      it('survives a round-trip through the TCX writer with its endpoints intact', () => {
        const reparsed = parseTcx(serializeTcx(merged));
        expect(reparsed.sport).toBe('Running');
        // the writer emits 6 decimal places, so compare at that precision
        expect(reparsed.samples[0].lat).toBeCloseTo(routeStart.lat, 6);
        expect(reparsed.samples[0].lon).toBeCloseTo(routeStart.lon, 6);
        const end = reparsed.samples[reparsed.samples.length - 1];
        expect(end.lat).toBeCloseTo(routeFinish.lat, 6);
        expect(end.lon).toBeCloseTo(routeFinish.lon, 6);
      });
    });
  }
});
