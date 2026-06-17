import type { Route } from '../types';
import { useT } from '../i18n/languageContext';

export function RoutePicker({
  routes,
  selected,
  onSelect,
}: {
  routes: Route[];
  selected: Route | null;
  onSelect: (route: Route) => void;
}) {
  const t = useT();
  if (routes.length === 0) {
    return <p>{t('noRoutes')}</p>;
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
            <span className="route-name">
              <span className="route-dot" aria-hidden="true" />
              <span className="route-label">{r.name}</span>
            </span>
            <span className="route-km">
              {(r.length / 1000).toFixed(2)} {t('units.km')}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
