import { classifySport } from './sport';

export const RESET_RATIO = 0.5; // raw drop fraction that counts as a lap reset
export const MAX_SPEED_RUN = 12.5; // m/s (~45 km/h)
export const MAX_SPEED_BIKE = 25; // m/s (~90 km/h)
export const MAX_TRACKPOINTS = 10000; // resampling ceiling

export function maxSpeedForSport(sport?: string): number {
  return classifySport(sport) === 'ride' ? MAX_SPEED_BIKE : MAX_SPEED_RUN;
}
