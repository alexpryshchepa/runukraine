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

export function StatsSummary({ stats }: { stats: ActivityStats }) {
  const t = useT();
  return (
    <dl className="stats">
      <div>
        <dt>{t('distance')}</dt>
        <dd>
          {(stats.distanceMeters / 1000).toFixed(2)} {t('units.km')}
        </dd>
      </div>
      <div>
        <dt>{t('time')}</dt>
        <dd>{formatDuration(stats.elapsedSeconds)}</dd>
      </div>
      {stats.avgHr !== undefined && (
        <div>
          <dt>{t('avgHr')}</dt>
          <dd>
            {stats.avgHr} {t('units.bpm')}
          </dd>
        </div>
      )}
      {stats.maxHr !== undefined && (
        <div>
          <dt>{t('maxHr')}</dt>
          <dd>
            {stats.maxHr} {t('units.bpm')}
          </dd>
        </div>
      )}
      {stats.avgCadence !== undefined && (
        <div>
          <dt>{t('avgCadence')}</dt>
          <dd>
            {stats.avgCadence} {t('units.spm')}
          </dd>
        </div>
      )}
    </dl>
  );
}
