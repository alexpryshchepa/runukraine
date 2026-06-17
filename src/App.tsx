import { useMemo, useState } from 'react';
import { parseTcx } from './lib/tcx';
import { loadBundledRoutes } from './lib/routes';
import { mergeActivityWithRoute } from './lib/merge';
import { computeStats } from './lib/stats';
import { serializeTcx } from './lib/tcxWriter';
import { downloadText } from './lib/download';
import {
  shiftActivityStart,
  dateToLocalInput,
  localInputToDate,
  isStartInFuture,
} from './lib/editActivity';
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

function BrandMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 18 C 8 18 8 10 12 10 C 16 10 16 6 20 6"
        stroke="#5ca0f2"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="4" cy="18" r="2.6" fill="#ffd23f" />
      <circle cx="20" cy="6" r="2.2" fill="#5ca0f2" />
    </svg>
  );
}

export default function App() {
  const t = useT();
  const routes = useMemo(() => loadBundledRoutes(), []);
  const [activity, setActivity] = useState<GarminActivity | null>(null);
  const [name, setName] = useState<string>('activity');
  const [fileName, setFileName] = useState<string>('');
  const [startInput, setStartInput] = useState<string>('');
  const [route, setRoute] = useState<Route | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(text: string, filename: string) {
    try {
      const parsed = parseTcx(text);
      setActivity(parsed);
      setFileName(filename);
      setName(filename.replace(/\.tcx$/i, ''));
      setStartInput(dateToLocalInput(parsed.samples[0].time));
      setError(null);
    } catch (e) {
      setActivity(null);
      setError(localizeError(e, t));
    }
  }

  function handleReplace() {
    setActivity(null);
    setRoute(null);
    setFileName('');
    setName('activity');
    setStartInput('');
    setError(null);
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

  const stats = merged ? computeStats(merged.samples) : null;
  const startInFuture = isStartInFuture(startInput, new Date());

  function handleDownload() {
    if (!merged) return;
    const safe = `${name || 'activity'}.tcx`.replace(/\s+/g, '-');
    downloadText(safe, serializeTcx(merged));
  }

  return (
    <main className="app">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">
            <BrandMark />
          </div>
          <div className="brand-text">
            <span className="brand-name">RunUkraine</span>
            <span className="brand-tagline">{t('tagline')}</span>
          </div>
        </div>
        <LanguageToggle />
      </header>

      <div className="hero">
        <h1>{t('heroTitle')}</h1>
        <p className="lede">{t('lede')}</p>
      </div>

      {(error || mergeError) && (
        <p className="error" role="alert">
          {error ?? mergeError}
        </p>
      )}

      <div className="steps">
        <section>
          <div className="step-head">
            <div className="step-badge">1</div>
            <h2>{t('step1')}</h2>
          </div>

          {activity ? (
            <div className="loaded-card">
              <div className="loaded-icon" aria-hidden="true">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <div className="loaded-info">
                <div className="loaded-name">{fileName}</div>
                <div className="loaded-points">{t('loaded', { n: activity.samples.length })}</div>
              </div>
              <button type="button" className="btn-replace" onClick={handleReplace}>
                {t('replace')}
              </button>
            </div>
          ) : (
            <FileDrop
              onFile={handleFile}
              label={t('chooseFile')}
              title={t('dropTitle')}
              hint={t('dropHint')}
            />
          )}

          <div className="privacy">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>{t('privacy')}</span>
          </div>

          <ExportFaq />
        </section>

        {activity && (
          <section>
            <div className="step-head">
              <div className="step-badge">2</div>
              <h2>{t('step2')}</h2>
            </div>
            <ActivityEditor
              name={name}
              startInput={startInput}
              startInvalid={startInFuture}
              startError={t('futureStartError')}
              onNameChange={setName}
              onStartChange={setStartInput}
            />
          </section>
        )}

        {activity && !startInFuture && (
          <section>
            <div className="step-head">
              <div className="step-badge">3</div>
              <h2>{t('step3')}</h2>
            </div>
            <RoutePicker routes={routes} selected={route} onSelect={setRoute} />
          </section>
        )}

        {merged && stats && !startInFuture && (
          <section>
            <div className="step-head">
              <div className="step-badge">4</div>
              <h2>{t('step4')}</h2>
            </div>
            <MapPreview
              merged={merged.samples}
              original={editedActivity?.samples}
              routeName={route?.name}
              distanceKm={stats.distanceMeters / 1000}
            />
            <StatsSummary stats={stats} />
            <button type="button" className="btn-download" onClick={handleDownload}>
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3v12" />
                <path d="M7 11l5 5 5-5" />
                <path d="M4 20h16" />
              </svg>
              {t('download')}
            </button>
            <p className="upload-hint">
              {t('uploadPrefix')}
              <a href="https://www.strava.com/upload/select" target="_blank" rel="noreferrer">
                strava.com/upload
              </a>
              {t('uploadSuffix')}
            </p>
          </section>
        )}
      </div>

      <footer className="app-footer">
        <p>{t('disclaimer')}</p>
      </footer>
    </main>
  );
}
