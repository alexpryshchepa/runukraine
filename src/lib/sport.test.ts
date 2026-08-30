import { describe, it, expect } from 'vitest';
import { classifySport } from './sport';

describe('classifySport', () => {
  it('classifies the TCX Running sport as a run', () => {
    expect(classifySport('Running')).toBe('run');
  });

  it('classifies the TCX Biking sport as a ride', () => {
    expect(classifySport('Biking')).toBe('ride');
  });

  it('ignores case when matching the sport attribute', () => {
    expect(classifySport('running')).toBe('run');
    expect(classifySport('BIKING')).toBe('ride');
  });

  it('classifies an unrecognised sport as other', () => {
    expect(classifySport('Other')).toBe('other');
    expect(classifySport('Swimming')).toBe('other');
  });

  it('classifies a missing sport as other', () => {
    expect(classifySport(undefined)).toBe('other');
  });
});
