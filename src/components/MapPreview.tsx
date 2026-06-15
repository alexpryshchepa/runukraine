import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import type { LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import type { MergedSample, GarminSample } from '../types';

function FitBounds({ line }: { line: LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (line.length > 1) {
      map.fitBounds(line as LatLngBoundsExpression);
    }
  }, [map, line]);
  return null;
}

export function MapPreview({
  merged,
  original,
}: {
  merged: MergedSample[];
  original?: GarminSample[];
}) {
  const mergedLine: LatLngExpression[] = merged.map((s) => [s.lat, s.lon]);
  const originalLine: LatLngExpression[] = (original ?? [])
    .filter((s) => s.lat !== undefined && s.lon !== undefined)
    .map((s) => [s.lat as number, s.lon as number]);
  const center: LatLngExpression = mergedLine[0] ?? [50.45, 30.52];

  return (
    <MapContainer center={center} zoom={13} style={{ height: 400, width: '100%' }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {originalLine.length > 1 && (
        <Polyline positions={originalLine} pathOptions={{ color: '#bbb', weight: 2, dashArray: '4' }} />
      )}
      {mergedLine.length > 1 && (
        <Polyline positions={mergedLine} pathOptions={{ color: '#0a84ff', weight: 4 }} />
      )}
      <FitBounds line={mergedLine} />
    </MapContainer>
  );
}
