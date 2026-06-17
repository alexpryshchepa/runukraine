import type { ActivityStats } from '../types';
import { useT } from '../i18n/languageContext';

function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

function formatPace(secondsPerKm: number): string {
  const total = Math.round(secondsPerKm);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function StatsSummary({ stats }: { stats: ActivityStats }) {
  const t = useT();
  return (
    <dl className="stats">
      <div>
        <dt>{t('distance')}</dt>
        <dd>
          {(stats.distanceMeters / 1000).toFixed(2)}
          <span className="unit">{t('units.km')}</span>
        </dd>
      </div>
      <div>
        <dt>{t('time')}</dt>
        <dd>{formatDuration(stats.elapsedSeconds)}</dd>
      </div>
      {stats.avgPaceSecondsPerKm !== undefined && (
        <div>
          <dt>{t('pace')}</dt>
          <dd>
            {formatPace(stats.avgPaceSecondsPerKm)}
            <span className="unit">{t('units.minPerKm')}</span>
          </dd>
        </div>
      )}
      {stats.avgHr !== undefined && (
        <div>
          <dt>{t('avgHr')}</dt>
          <dd>
            {stats.avgHr}
            <span className="unit">{t('units.bpm')}</span>
          </dd>
        </div>
      )}
      {stats.maxHr !== undefined && (
        <div>
          <dt>{t('maxHr')}</dt>
          <dd>
            {stats.maxHr}
            <span className="unit">{t('units.bpm')}</span>
          </dd>
        </div>
      )}
      {stats.avgCadence !== undefined && (
        <div>
          <dt>{t('avgCadence')}</dt>
          <dd>
            {stats.avgCadence}
            <span className="unit">{t('units.spm')}</span>
          </dd>
        </div>
      )}
    </dl>
  );
}
