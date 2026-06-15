import type { ActivityStats } from '../types';

function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function StatsSummary({ stats }: { stats: ActivityStats }) {
  return (
    <dl className="stats">
      <div>
        <dt>Distance</dt>
        <dd>{(stats.distanceMeters / 1000).toFixed(2)} km</dd>
      </div>
      <div>
        <dt>Time</dt>
        <dd>{formatDuration(stats.elapsedSeconds)}</dd>
      </div>
      {stats.avgHr !== undefined && (
        <div>
          <dt>Avg HR</dt>
          <dd>{stats.avgHr} bpm</dd>
        </div>
      )}
      {stats.maxHr !== undefined && (
        <div>
          <dt>Max HR</dt>
          <dd>{stats.maxHr} bpm</dd>
        </div>
      )}
      {stats.avgCadence !== undefined && (
        <div>
          <dt>Avg cadence</dt>
          <dd>{stats.avgCadence} spm</dd>
        </div>
      )}
    </dl>
  );
}
