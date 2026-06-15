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
            {r.name} — {(r.length / 1000).toFixed(2)} {t('units.km')}
          </button>
        </li>
      ))}
    </ul>
  );
}
