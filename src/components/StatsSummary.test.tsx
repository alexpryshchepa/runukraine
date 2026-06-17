import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatsSummary } from './StatsSummary';

describe('StatsSummary', () => {
  it('renders distance, time and heart rate', () => {
    render(
      <StatsSummary
        stats={{ distanceMeters: 5000, elapsedSeconds: 1830, avgHr: 150, maxHr: 175, avgCadence: 86 }}
      />,
    );
    expect(screen.getByText('5.00')).toBeInTheDocument();
    expect(screen.getByText('30:30')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getAllByText('km').length).toBeGreaterThan(0);
    expect(screen.getAllByText('bpm').length).toBe(2);
  });
  it('renders the pace tile when avgPaceSecondsPerKm is present', () => {
    render(
      <StatsSummary stats={{ distanceMeters: 10000, elapsedSeconds: 3300, avgPaceSecondsPerKm: 330 }} />,
    );
    expect(screen.getByText('5:30')).toBeInTheDocument();
    expect(screen.getByText('/km')).toBeInTheDocument();
  });
  it('omits heart rate rows when absent', () => {
    render(<StatsSummary stats={{ distanceMeters: 1000, elapsedSeconds: 300 }} />);
    expect(screen.queryByText(/bpm/)).not.toBeInTheDocument();
  });
  it('omits the pace tile when avgPaceSecondsPerKm is absent', () => {
    render(<StatsSummary stats={{ distanceMeters: 1000, elapsedSeconds: 300 }} />);
    expect(screen.queryByText('/km')).not.toBeInTheDocument();
  });
});
