/**
 * Application error codes. Each maps to a user-facing message that the UI
 * localizes via the i18n layer (see src/i18n/messages.ts). The English text
 * below is the single source of truth and doubles as the thrown Error.message
 * (used as a fallback and asserted by the lib unit tests).
 */
export const ERROR_MESSAGES_EN = {
  tcxInvalidXml: 'Could not read this file as TCX (invalid XML).',
  tcxNoTrackpoints: 'No trackpoints found in this TCX file.',
  tcxNoDistance: 'This TCX file has no distance data, so it cannot be merged.',
  gpxInvalidXml: 'Could not read this file as GPX (invalid XML).',
  gpxTooFewPoints: 'This route GPX must contain at least 2 points.',
  mergeNoSamples: 'This activity has no samples to merge.',
  mergeRouteTooFewPoints: 'The route must have at least 2 points.',
  mergeNoDistance: 'This activity has no usable distance to map onto the route.',
  exportEmpty: 'Cannot export an empty activity.',
} as const;

export type ErrorCode = keyof typeof ERROR_MESSAGES_EN;

/**
 * An error carrying a stable `code` so the UI can show a localized message,
 * while `message` stays English for logging and test assertions.
 */
export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode) {
    super(ERROR_MESSAGES_EN[code]);
    this.name = 'AppError';
    this.code = code;
  }
}
