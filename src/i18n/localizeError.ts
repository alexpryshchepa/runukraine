import { AppError } from '../lib/errors';

/**
 * Turn a thrown value into a user-facing message. Coded {@link AppError}s are
 * localized via `t`; plain errors keep their message; anything else is stringified.
 */
export function localizeError(err: unknown, t: (key: string) => string): string {
  if (err instanceof AppError) return t(`errors.${err.code}`);
  if (err instanceof Error) return err.message;
  return String(err);
}
