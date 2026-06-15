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
    expect(screen.getByText('5.00 km')).toBeInTheDocument();
    expect(screen.getByText('30:30')).toBeInTheDocument();
    expect(screen.getByText('150 bpm')).toBeInTheDocument();
  });
  it('omits heart rate rows when absent', () => {
    render(<StatsSummary stats={{ distanceMeters: 1000, elapsedSeconds: 300 }} />);
    expect(screen.queryByText(/bpm/)).not.toBeInTheDocument();
  });
});
