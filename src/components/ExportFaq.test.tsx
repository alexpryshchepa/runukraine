import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExportFaq } from './ExportFaq';

describe('ExportFaq', () => {
  it('renders a summary entry for each covered app', () => {
    render(<ExportFaq />);
    for (const app of ['Garmin Connect', 'Polar Flow', 'COROS', 'Strava', 'Suunto', 'Wahoo']) {
      expect(screen.getByText(app)).toBeInTheDocument();
    }
  });
});
