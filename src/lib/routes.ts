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

export function loadBundledRoutes(): Route[] {
  return Object.entries(modules)
    .map(([path, xml]) => buildRoute(filenameToName(path), xml))
    .sort((a, b) => a.name.localeCompare(b.name));
}
