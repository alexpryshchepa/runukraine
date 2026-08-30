/**
 * TCX only permits three values in `<Activity Sport>`: Running, Biking and
 * Other. `SportKind` is the app-side view of that attribute — it drives which
 * metrics and which copy the UI shows. The raw string from the file is what
 * gets written back out, so nothing about the user's activity type is lost.
 */
export type SportKind = 'run' | 'ride' | 'other';

export function classifySport(sport?: string): SportKind {
  switch ((sport ?? '').trim().toLowerCase()) {
    case 'running':
      return 'run';
    case 'biking':
      return 'ride';
    default:
      return 'other';
  }
}
