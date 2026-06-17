export interface GarminSample {
  time: Date;
  distance: number; // cumulative meters from start
  hr?: number;
  cadence?: number;
  altitude?: number;
  lat?: number; // original recorded position (may be missing or garbage)
  lon?: number;
}

export interface GarminActivity {
  samples: GarminSample[];
  sport?: string;
}

export interface RoutePoint {
  lat: number;
  lon: number;
  ele?: number;
}

export interface Route {
  name: string;
  points: RoutePoint[];
  cumulative: number[]; // cumulative arc-length per point, meters
  length: number; // total route length, meters
}

export interface MergedSample extends GarminSample {
  lat: number;
  lon: number;
}

export interface MergeReport {
  recordedDistance: number;
  routeLength: number;
  ratio: number;
  anchorCount: number;
  fallbackUsed: boolean;
  partial: boolean;
  coveredFraction: number;
}

export interface MergedActivity {
  samples: MergedSample[];
  sport?: string;
  report?: MergeReport;
}

export interface ActivityStats {
  distanceMeters: number;
  elapsedSeconds: number;
  avgHr?: number;
  maxHr?: number;
  avgCadence?: number;
  avgPaceSecondsPerKm?: number;
}
