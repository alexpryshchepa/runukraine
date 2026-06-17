import { describe, it, expect } from 'vitest';
import { translate } from './i18n';

describe('translate', () => {
  it('returns the Ukrainian string for a simple key', () => {
    expect(translate('uk', 'download')).toBe("Завантажити об'єднаний .tcx");
  });

  it('returns the English string for a simple key', () => {
    expect(translate('en', 'download')).toBe('Download merged .tcx');
  });

  it('resolves dot-path keys for errors', () => {
    expect(translate('en', 'errors.gpxTooFewPoints')).toBe(
      'This route GPX must contain at least 2 points.',
    );
    expect(translate('uk', 'errors.gpxTooFewPoints')).toBe(
      'Цей GPX-маршрут має містити щонайменше 2 точки.',
    );
  });

  it('interpolates named params', () => {
    expect(translate('en', 'loaded', { n: 42 })).toBe('42 points loaded');
    expect(translate('uk', 'loaded', { n: 42 })).toBe('Завантажено точок: 42');
  });

  it('falls back to the key itself when missing in all languages', () => {
    expect(translate('uk', 'does.not.exist')).toBe('does.not.exist');
  });

  it('returns the future-start error in both languages', () => {
    expect(translate('en', 'futureStartError')).toBe("Start time can't be in the future.");
    expect(translate('uk', 'futureStartError')).toBe('Час початку не може бути в майбутньому.');
  });

  it('returns the invalid-start error in both languages', () => {
    expect(translate('en', 'invalidStartError')).toBe('Enter a valid start time.');
    expect(translate('uk', 'invalidStartError')).toBe('Вкажіть коректний час старту.');
  });

  it('provides the route-source toggle strings in both languages', () => {
    expect(translate('en', 'routeSourceOfficial')).toBe('Official routes');
    expect(translate('uk', 'routeSourceOfficial')).toBe('Офіційні маршрути');
    expect(translate('en', 'routeSourceCustom')).toBe('Upload your own');
    expect(translate('uk', 'routeSourceCustom')).toBe('Власний файл');
    expect(translate('en', 'uploadRouteLabel')).toBe('Upload a .gpx route file');
    expect(translate('uk', 'uploadRouteLabel')).toBe('Завантажте файл маршруту .gpx');
  });
});
