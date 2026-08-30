import type { Route } from '../types';
import { parseGpx } from './gpx';
import { cumulativeDistances } from './geo';

export function buildRoute(name: string, gpxXml: string): Route {
  const points = parseGpx(gpxXml);
  const cumulative = cumulativeDistances(points);
  return { name, points, cumulative, length: cumulative[cumulative.length - 1] };
}

export function filenameToName(path: string): string {
  const base = path.split('/').pop() ?? path;
  const stem = base.replace(/\.gpx$/i, '');
  return stem
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const modules = import.meta.glob('../routes/*.gpx', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Routes named here are listed first, in this order; the rest follow alphabetically.
const pinnedNames = ['100km Kyivska Sotka 2026', '50km Kyivska Sotka 2026'];

function pinnedRank(name: string): number {
  const i = pinnedNames.indexOf(name);
  return i === -1 ? pinnedNames.length : i;
}

export function loadBundledRoutes(): Route[] {
  return Object.entries(modules)
    .map(([path, xml]) => buildRoute(filenameToName(path), xml))
    .sort((a, b) => pinnedRank(a.name) - pinnedRank(b.name) || a.name.localeCompare(b.name));
}
