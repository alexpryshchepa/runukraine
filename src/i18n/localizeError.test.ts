import { describe, it, expect } from 'vitest';
import { localizeError } from './localizeError';
import { translate } from './i18n';
import { AppError } from '../lib/errors';

const tUk = (key: string) => translate('uk', key);

describe('localizeError', () => {
  it('localizes a coded AppError into the active language', () => {
    expect(localizeError(new AppError('tcxInvalidXml'), tUk)).toBe(
      'Не вдалося прочитати файл як TCX (некоректний XML).',
    );
  });

  it('passes through a plain Error message unchanged', () => {
    expect(localizeError(new Error('boom'), tUk)).toBe('boom');
  });

  it('stringifies non-Error values', () => {
    expect(localizeError('weird', tUk)).toBe('weird');
  });
});
