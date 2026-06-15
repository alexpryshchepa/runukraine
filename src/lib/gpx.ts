import type { RoutePoint } from '../types';
import { AppError } from './errors';

export function parseGpx(xml: string): RoutePoint[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new AppError('gpxInvalidXml');
  }
  let nodes = Array.from(doc.getElementsByTagNameNS('*', 'trkpt'));
  if (nodes.length === 0) nodes = Array.from(doc.getElementsByTagNameNS('*', 'rtept'));
  if (nodes.length === 0) nodes = Array.from(doc.getElementsByTagNameNS('*', 'wpt'));

  const points: RoutePoint[] = [];
  for (const n of nodes) {
    const lat = Number(n.getAttribute('lat'));
    const lon = Number(n.getAttribute('lon'));
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
    const point: RoutePoint = { lat, lon };
    const ele = n.getElementsByTagNameNS('*', 'ele')[0]?.textContent?.trim();
    if (ele) point.ele = Number(ele);
    points.push(point);
  }

  if (points.length < 2) {
    throw new AppError('gpxTooFewPoints');
  }
  return points;
}
