import type { Route } from '../types';

export function RoutePicker({
  routes,
  selected,
  onSelect,
}: {
  routes: Route[];
  selected: Route | null;
  onSelect: (route: Route) => void;
}) {
  if (routes.length === 0) {
    return (
      <p>
        No routes available yet. Add <code>.gpx</code> files to <code>src/routes/</code>.
      </p>
    );
  }
  return (
    <ul className="route-picker">
      {routes.map((r) => (
        <li key={r.name}>
          <button
            type="button"
            aria-pressed={selected?.name === r.name}
            onClick={() => onSelect(r)}
          >
            {r.name} — {(r.length / 1000).toFixed(2)} km
          </button>
        </li>
      ))}
    </ul>
  );
}
