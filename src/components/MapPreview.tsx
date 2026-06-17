import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import type { LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import type { MergedSample, GarminSample } from '../types';
import { useT } from '../i18n/languageContext';

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
  routeName,
  distanceKm,
}: {
  merged: MergedSample[];
  original?: GarminSample[];
  routeName?: string;
  distanceKm?: number;
}) {
  const t = useT();
  const mergedLine: LatLngExpression[] = merged.map((s) => [s.lat, s.lon]);
  const originalLine: LatLngExpression[] = (original ?? [])
    .filter((s) => s.lat !== undefined && s.lon !== undefined)
    .map((s) => [s.lat as number, s.lon as number]);
  const center: LatLngExpression = mergedLine[0] ?? [50.45, 30.52];
  const start = mergedLine[0];
  const finish = mergedLine[mergedLine.length - 1];

  return (
    <div className="map-frame">
      <MapContainer
        center={center}
        zoom={13}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          subdomains="abc"
        />
        {originalLine.length > 1 && (
          <Polyline
            positions={originalLine}
            pathOptions={{ color: 'rgba(255,255,255,0.55)', weight: 2, dashArray: '3 6' }}
          />
        )}
        {mergedLine.length > 1 && (
          <Polyline
            positions={mergedLine}
            pathOptions={{
              color: '#5ca0f2',
              weight: 14,
              opacity: 0.32,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}
        {mergedLine.length > 1 && (
          <Polyline
            positions={mergedLine}
            pathOptions={{ color: '#5ca0f2', weight: 4.5, lineCap: 'round', lineJoin: 'round' }}
          />
        )}
        {start && (
          <CircleMarker
            center={start}
            radius={6}
            pathOptions={{ color: '#0e0d12', weight: 3, fillColor: '#ffd23f', fillOpacity: 1 }}
          />
        )}
        {finish && mergedLine.length > 1 && (
          <CircleMarker
            center={finish}
            radius={6}
            pathOptions={{ color: '#0e0d12', weight: 3, fillColor: '#5ca0f2', fillOpacity: 1 }}
          />
        )}
        <FitBounds line={mergedLine} />
      </MapContainer>

      {(routeName || distanceKm !== undefined) && (
        <div className="map-badge">
          <div className="map-badge-label">{t('mapRoute')}</div>
          <div className="map-badge-value">
            {routeName}
            {routeName && distanceKm !== undefined ? ' · ' : ''}
            {distanceKm !== undefined ? `${distanceKm.toFixed(2)} ${t('units.km')}` : ''}
          </div>
        </div>
      )}

      <div className="map-legend">
        <div>
          <span className="legend-merged" />
          {t('legendMerged')}
        </div>
        {originalLine.length > 1 && (
          <div>
            <span className="legend-original" />
            {t('legendOriginal')}
          </div>
        )}
      </div>
    </div>
  );
}
