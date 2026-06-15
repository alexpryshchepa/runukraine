import { useMemo, useState } from 'react';
import { parseTcx } from './lib/tcx';
import { loadBundledRoutes } from './lib/routes';
import { mergeActivityWithRoute } from './lib/merge';
import { computeStats } from './lib/stats';
import { serializeTcx } from './lib/tcxWriter';
import { downloadText } from './lib/download';
import { shiftActivityStart, dateToLocalInput, localInputToDate } from './lib/editActivity';
import { FileDrop } from './components/FileDrop';
import { ExportFaq } from './components/ExportFaq';
import { ActivityEditor } from './components/ActivityEditor';
import { RoutePicker } from './components/RoutePicker';
import { MapPreview } from './components/MapPreview';
import { StatsSummary } from './components/StatsSummary';
import { useT } from './i18n/languageContext';
import { LanguageToggle } from './i18n/LanguageToggle';
import { localizeError } from './i18n/localizeError';
import type { GarminActivity, MergedActivity, Route } from './types';

export default function App() {
  const t = useT();
  const routes = useMemo(() => loadBundledRoutes(), []);
  const [activity, setActivity] = useState<GarminActivity | null>(null);
  const [name, setName] = useState<string>('activity');
  const [startInput, setStartInput] = useState<string>('');
  const [route, setRoute] = useState<Route | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(text: string, filename: string) {
    try {
      const parsed = parseTcx(text);
      setActivity(parsed);
      setName(filename.replace(/\.tcx$/i, ''));
      setStartInput(dateToLocalInput(parsed.samples[0].time));
      setError(null);
    } catch (e) {
      setActivity(null);
      setError(localizeError(e, t));
    }
  }

  const editedActivity = useMemo<GarminActivity | null>(() => {
    if (!activity) return null;
    const d = localInputToDate(startInput);
    if (Number.isNaN(d.getTime())) return activity;
    return shiftActivityStart(activity, d);
  }, [activity, startInput]);

  const { merged, mergeError } = useMemo<{
    merged: MergedActivity | null;
    mergeError: string | null;
  }>(() => {
    if (!editedActivity || !route) return { merged: null, mergeError: null };
    try {
      return { merged: mergeActivityWithRoute(editedActivity, route), mergeError: null };
    } catch (e) {
      return { merged: null, mergeError: localizeError(e, t) };
    }
  }, [editedActivity, route, t]);

  function handleDownload() {
    if (!merged) return;
    const safe = `${name || 'activity'}.tcx`.replace(/\s+/g, '-');
    downloadText(safe, serializeTcx(merged));
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>{t('title')}</h1>
        <LanguageToggle />
      </header>
      <p className="lede">{t('lede')}</p>

      {(error || mergeError) && (
        <p className="error" role="alert">
          {error ?? mergeError}
        </p>
      )}

      <section>
        <h2>{t('step1')}</h2>
        <FileDrop onFile={handleFile} label={t('chooseFile')} />
        {activity && <p>{t('loaded', { n: activity.samples.length })}</p>}
        <ExportFaq />
      </section>

      {activity && (
        <section>
          <h2>{t('step2')}</h2>
          <ActivityEditor
            name={name}
            startInput={startInput}
            onNameChange={setName}
            onStartChange={setStartInput}
          />
        </section>
      )}

      {activity && (
        <section>
          <h2>{t('step3')}</h2>
          <RoutePicker routes={routes} selected={route} onSelect={setRoute} />
        </section>
      )}

      {merged && (
        <section>
          <h2>{t('step4')}</h2>
          <MapPreview merged={merged.samples} original={editedActivity?.samples} />
          <StatsSummary stats={computeStats(merged.samples)} />
          <button type="button" onClick={handleDownload}>
            {t('download')}
          </button>
          <p>
            {t('uploadPrefix')}
            <a href="https://www.strava.com/upload/select" target="_blank" rel="noreferrer">
              strava.com/upload
            </a>
            {t('uploadSuffix')}
          </p>
        </section>
      )}

      <footer className="app-footer">
        <p>{t('disclaimer')}</p>
      </footer>
    </main>
  );
}
