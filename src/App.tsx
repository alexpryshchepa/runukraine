import { useMemo, useState } from 'react';
import { parseTcx } from './lib/tcx';
import { loadBundledRoutes } from './lib/routes';
import { mergeActivityWithRoute } from './lib/merge';
import { computeStats } from './lib/stats';
import { serializeTcx } from './lib/tcxWriter';
import { downloadText } from './lib/download';
import { FileDrop } from './components/FileDrop';
import { RoutePicker } from './components/RoutePicker';
import { MapPreview } from './components/MapPreview';
import { StatsSummary } from './components/StatsSummary';
import type { GarminActivity, MergedActivity, Route } from './types';

export default function App() {
  const routes = useMemo(() => loadBundledRoutes(), []);
  const [activity, setActivity] = useState<GarminActivity | null>(null);
  const [filename, setFilename] = useState<string>('activity');
  const [route, setRoute] = useState<Route | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(text: string, name: string) {
    try {
      setActivity(parseTcx(text));
      setFilename(name.replace(/\.tcx$/i, ''));
      setError(null);
    } catch (e) {
      setActivity(null);
      setError((e as Error).message);
    }
  }

  const { merged, mergeError } = useMemo<{
    merged: MergedActivity | null;
    mergeError: string | null;
  }>(() => {
    if (!activity || !route) return { merged: null, mergeError: null };
    try {
      return { merged: mergeActivityWithRoute(activity, route), mergeError: null };
    } catch (e) {
      return { merged: null, mergeError: (e as Error).message };
    }
  }, [activity, route]);

  function handleDownload() {
    if (!merged) return;
    const safe = `${filename}-${route?.name ?? 'route'}.tcx`.replace(/\s+/g, '-');
    downloadText(safe, serializeTcx(merged));
  }

  return (
    <main className="app">
      <h1>RunUkraine — track merger</h1>
      <p className="lede">
        Paint your Garmin telemetry onto an official event route when GPS was jammed.
      </p>

      {(error || mergeError) && (
        <p className="error" role="alert">
          {error ?? mergeError}
        </p>
      )}

      <section>
        <h2>1. Your Garmin activity</h2>
        <FileDrop onFile={handleFile} />
        {activity && <p>Loaded {activity.samples.length} points.</p>}
      </section>

      {activity && (
        <section>
          <h2>2. Pick the official route</h2>
          <RoutePicker routes={routes} selected={route} onSelect={setRoute} />
        </section>
      )}

      {merged && (
        <section>
          <h2>3. Preview &amp; download</h2>
          <MapPreview merged={merged.samples} original={activity?.samples} />
          <StatsSummary stats={computeStats(merged.samples)} />
          <button type="button" onClick={handleDownload}>
            Download merged .tcx
          </button>
          <p>
            Then upload it at{' '}
            <a href="https://www.strava.com/upload/select" target="_blank" rel="noreferrer">
              strava.com/upload
            </a>
            .
          </p>
        </section>
      )}
    </main>
  );
}
