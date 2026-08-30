import type { ActivityStats } from '../types';
import type { SportKind } from '../lib/sport';
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

function Tile({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {value}
        {unit ? <span className="unit">{unit}</span> : null}
      </dd>
    </div>
  );
}

/**
 * Riders read speed and rpm; runners read pace and spm. Anything else falls
 * back to pace, which suits the walk/hike/ski activities TCX lumps into "Other".
 */
export function StatsSummary({ stats, kind }: { stats: ActivityStats; kind: SportKind }) {
  const t = useT();
  const isRide = kind === 'ride';

  return (
    <dl className="stats">
      <Tile label={t('distance')} value={(stats.distanceMeters / 1000).toFixed(2)} unit={t('units.km')} />
      <Tile label={t('time')} value={formatDuration(stats.elapsedSeconds)} />

      {isRide
        ? stats.avgSpeedKmh !== undefined && (
            <Tile label={t('speed')} value={stats.avgSpeedKmh.toFixed(1)} unit={t('units.kmh')} />
          )
        : stats.avgPaceSecondsPerKm !== undefined && (
            <Tile
              label={t('pace')}
              value={formatPace(stats.avgPaceSecondsPerKm)}
              unit={t('units.minPerKm')}
            />
          )}

      {stats.avgHr !== undefined && (
        <Tile label={t('avgHr')} value={String(stats.avgHr)} unit={t('units.bpm')} />
      )}
      {stats.maxHr !== undefined && (
        <Tile label={t('maxHr')} value={String(stats.maxHr)} unit={t('units.bpm')} />
      )}
      {stats.avgCadence !== undefined && (
        <Tile
          label={t('avgCadence')}
          value={String(stats.avgCadence)}
          unit={isRide ? t('units.rpm') : t('units.spm')}
        />
      )}
    </dl>
  );
}
