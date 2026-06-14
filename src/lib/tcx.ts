import type { GarminActivity, GarminSample } from '../types';

function textNS(parent: Element, local: string): string | undefined {
  const el = parent.getElementsByTagNameNS('*', local)[0];
  const t = el?.textContent?.trim();
  return t ? t : undefined;
}

export function parseTcx(xml: string): GarminActivity {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Could not read this file as TCX (invalid XML).');
  }
  const trackpoints = Array.from(doc.getElementsByTagNameNS('*', 'Trackpoint'));
  if (trackpoints.length === 0) {
    throw new Error('No trackpoints found in this TCX file.');
  }

  const activityEl = doc.getElementsByTagNameNS('*', 'Activity')[0];
  const sport = activityEl?.getAttribute('Sport') ?? undefined;

  const samples: GarminSample[] = [];
  let offset = 0;
  let lastCum = -Infinity;

  for (const tp of trackpoints) {
    const timeStr = textNS(tp, 'Time');
    const distStr = textNS(tp, 'DistanceMeters');
    if (!timeStr || distStr === undefined) continue; // both are required for the merge

    let cum = Number(distStr) + offset;
    if (cum < lastCum) {
      // the device reset its distance counter (new lap) — continue from where we were
      offset = lastCum;
      cum = Number(distStr) + offset;
    }
    lastCum = cum;

    const sample: GarminSample = { time: new Date(timeStr), distance: cum };

    const hrEl = tp.getElementsByTagNameNS('*', 'HeartRateBpm')[0];
    const hrVal = hrEl?.getElementsByTagNameNS('*', 'Value')[0]?.textContent?.trim();
    if (hrVal) sample.hr = Number(hrVal);

    const cad = textNS(tp, 'RunCadence') ?? textNS(tp, 'Cadence');
    if (cad !== undefined) sample.cadence = Number(cad);

    const alt = textNS(tp, 'AltitudeMeters');
    if (alt !== undefined) sample.altitude = Number(alt);

    const lat = textNS(tp, 'LatitudeDegrees');
    const lon = textNS(tp, 'LongitudeDegrees');
    if (lat !== undefined && lon !== undefined) {
      sample.lat = Number(lat);
      sample.lon = Number(lon);
    }

    samples.push(sample);
  }

  if (samples.length === 0) {
    throw new Error('This TCX file has no distance data, so it cannot be merged.');
  }
  return { samples, sport };
}
