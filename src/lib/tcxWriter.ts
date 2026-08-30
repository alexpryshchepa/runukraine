import type { MergedActivity, MergedSample } from '../types';
import { classifySport } from './sport';
import { AppError } from './errors';

function fmt(n: number, digits = 6): string {
  return n.toFixed(digits);
}

function trackpointXml(s: MergedSample, isRide: boolean): string {
  const parts: string[] = [
    '        <Trackpoint>',
    `          <Time>${s.time.toISOString()}</Time>`,
    '          <Position>',
    `            <LatitudeDegrees>${fmt(s.lat)}</LatitudeDegrees>`,
    `            <LongitudeDegrees>${fmt(s.lon)}</LongitudeDegrees>`,
    '          </Position>',
  ];
  if (s.altitude !== undefined) {
    parts.push(`          <AltitudeMeters>${fmt(s.altitude, 2)}</AltitudeMeters>`);
  }
  parts.push(`          <DistanceMeters>${fmt(s.distance, 2)}</DistanceMeters>`);
  if (s.hr !== undefined) {
    parts.push(`          <HeartRateBpm><Value>${Math.round(s.hr)}</Value></HeartRateBpm>`);
  }
  if (s.cadence !== undefined) {
    const cadence = Math.round(s.cadence);
    // TCX keeps bike cadence (rpm) in Trackpoint/Cadence and run cadence (spm)
    // in the ActivityExtension. Writing a ride's cadence as RunCadence makes
    // Strava drop it, so the element has to follow the activity type.
    parts.push(
      isRide
        ? `          <Cadence>${cadence}</Cadence>`
        : `          <Extensions><ns3:TPX><ns3:RunCadence>${cadence}</ns3:RunCadence></ns3:TPX></Extensions>`,
    );
  }
  parts.push('        </Trackpoint>');
  return parts.join('\n');
}

export function serializeTcx(activity: MergedActivity): string {
  const { samples } = activity;
  if (samples.length === 0) throw new AppError('exportEmpty');
  // The user's own activity type is written back verbatim; when the source
  // carried none there is nothing to preserve, so it stays deliberately
  // unclaimed rather than being guessed as a run.
  const sport = activity.sport ?? 'Other';
  const isRide = classifySport(sport) === 'ride';
  const startTime = samples[0].time.toISOString();
  const totalSeconds =
    (samples[samples.length - 1].time.getTime() - samples[0].time.getTime()) / 1000;
  const totalDistance = samples[samples.length - 1].distance;
  const trackpoints = samples.map((s) => trackpointXml(s, isRide)).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase
  xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2">
  <Activities>
    <Activity Sport="${sport}">
      <Id>${startTime}</Id>
      <Lap StartTime="${startTime}">
        <TotalTimeSeconds>${fmt(totalSeconds, 2)}</TotalTimeSeconds>
        <DistanceMeters>${fmt(totalDistance, 2)}</DistanceMeters>
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
        <Track>
${trackpoints}
        </Track>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;
}
