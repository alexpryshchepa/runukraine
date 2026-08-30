import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsSummary } from './StatsSummary';
import type { ActivityStats } from '../types';

const full: ActivityStats = {
  distanceMeters: 10000,
  elapsedSeconds: 3300,
  avgHr: 150,
  maxHr: 175,
  avgCadence: 86,
  avgPaceSecondsPerKm: 330,
  avgSpeedKmh: 10.9,
};

describe('StatsSummary', () => {
  it('renders distance, time and heart rate for any activity type', () => {
    render(<StatsSummary stats={{ ...full, distanceMeters: 5000, elapsedSeconds: 1830 }} kind="run" />);
    expect(screen.getByText('5.00')).toBeInTheDocument();
    expect(screen.getByText('30:30')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getAllByText('km').length).toBeGreaterThan(0);
    expect(screen.getAllByText('bpm').length).toBe(2);
  });
  it('omits heart rate rows when absent', () => {
    render(<StatsSummary stats={{ distanceMeters: 1000, elapsedSeconds: 300 }} kind="run" />);
    expect(screen.queryByText(/bpm/)).not.toBeInTheDocument();
  });
});

describe('StatsSummary — metrics follow the activity type', () => {
  it('shows pace in min/km and cadence in spm for a run', () => {
    render(<StatsSummary stats={full} kind="run" />);
    expect(screen.getByText('5:30')).toBeInTheDocument();
    expect(screen.getByText('/km')).toBeInTheDocument();
    expect(screen.getByText('spm')).toBeInTheDocument();
    expect(screen.queryByText('km/h')).not.toBeInTheDocument();
    expect(screen.queryByText('rpm')).not.toBeInTheDocument();
  });

  it('shows speed in km/h and cadence in rpm for a ride', () => {
    render(<StatsSummary stats={full} kind="ride" />);
    expect(screen.getByText('10.9')).toBeInTheDocument();
    expect(screen.getByText('km/h')).toBeInTheDocument();
    expect(screen.getByText('rpm')).toBeInTheDocument();
    expect(screen.queryByText('/km')).not.toBeInTheDocument();
    expect(screen.queryByText('spm')).not.toBeInTheDocument();
  });

  it('falls back to pace for an unrecognised activity type', () => {
    render(<StatsSummary stats={full} kind="other" />);
    expect(screen.getByText('/km')).toBeInTheDocument();
    expect(screen.queryByText('km/h')).not.toBeInTheDocument();
  });

  it('omits the speed tile entirely when the activity covered no ground', () => {
    render(<StatsSummary stats={{ distanceMeters: 0, elapsedSeconds: 300 }} kind="ride" />);
    expect(screen.queryByText('km/h')).not.toBeInTheDocument();
    expect(screen.queryByText('/km')).not.toBeInTheDocument();
  });
});
