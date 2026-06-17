export const RESIDUAL_MAX = 35; // m — max GPS-to-route distance to trust a fix as an anchor
export const MIN_ANCHORS = 3; // below this → global-scale fallback
export const RESET_RATIO = 0.5; // raw drop fraction that counts as a lap reset
export const MAX_SPEED_RUN = 12.5; // m/s (~45 km/h)
export const MAX_SPEED_BIKE = 25; // m/s (~90 km/h)
export const PARTIAL_THRESHOLD = 0.98; // coveredFraction below this → "partial" warning
export const MAX_TRACKPOINTS = 10000; // resampling ceiling

export function maxSpeedForSport(sport?: string): number {
  const s = (sport ?? '').toLowerCase();
  if (s.includes('bik') || s.includes('cycl') || s.includes('ride')) return MAX_SPEED_BIKE;
  return MAX_SPEED_RUN;
}
