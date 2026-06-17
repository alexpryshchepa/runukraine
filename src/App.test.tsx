import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { LanguageProvider } from './i18n/LanguageProvider';

beforeEach(() => localStorage.clear());

function renderApp() {
  return render(
    <LanguageProvider>
      <App />
    </LanguageProvider>,
  );
}

const sampleTcx = `<?xml version="1.0"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities>
    <Activity Sport="Running">
      <Lap>
        <Track>
          <Trackpoint>
            <Time>2026-06-01T08:00:00Z</Time>
            <Position><LatitudeDegrees>50.1</LatitudeDegrees><LongitudeDegrees>30.1</LongitudeDegrees></Position>
            <DistanceMeters>0</DistanceMeters>
          </Trackpoint>
          <Trackpoint>
            <Time>2026-06-01T08:00:30Z</Time>
            <DistanceMeters>100</DistanceMeters>
          </Trackpoint>
        </Track>
      </Lap>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;

// Render in English, upload the sample activity, and wait for the editor to appear.
async function loadActivityInEnglish() {
  renderApp();
  fireEvent.click(screen.getByRole('button', { name: /EN/i }));
  const fileInput = screen.getByLabelText('Choose a .tcx file') as HTMLInputElement;
  const file = new File([sampleTcx], 'run.tcx', { type: 'application/xml' });
  fireEvent.change(fileInput, { target: { files: [file] } });
  return (await screen.findByLabelText('Start time')) as HTMLInputElement;
}

describe('App localization', () => {
  it('renders the first step in Ukrainian by default', () => {
    renderApp();
    expect(screen.getByText('Додайте файл тренування')).toBeInTheDocument();
  });

  it('switches the interface to English via the language toggle', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /EN/i }));
    expect(screen.getByText('Add your activity file')).toBeInTheDocument();
  });
});

describe('App start-date validation', () => {
  it('hides later steps and flags the field when the start is in the future', async () => {
    const start = await loadActivityInEnglish();

    fireEvent.change(start, { target: { value: '2999-01-01T08:00' } });

    expect(screen.queryByText('Choose the official route')).not.toBeInTheDocument();
    expect(screen.getByText("Start time can't be in the future.")).toBeInTheDocument();
    expect(start).toHaveClass('input-danger');
  });

  it('shows the steps again once the start is back in the past', async () => {
    const start = await loadActivityInEnglish();

    fireEvent.change(start, { target: { value: '2999-01-01T08:00' } });
    expect(screen.queryByText('Choose the official route')).not.toBeInTheDocument();

    fireEvent.change(start, { target: { value: '2000-01-01T08:00' } });

    expect(screen.getByText('Choose the official route')).toBeInTheDocument();
    expect(screen.queryByText("Start time can't be in the future.")).not.toBeInTheDocument();
    expect(start).not.toHaveClass('input-danger');
  });
});
