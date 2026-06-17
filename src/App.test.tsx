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

const gpx = `<?xml version="1.0"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg>
  <trkpt lat="50.00" lon="30.00"></trkpt>
  <trkpt lat="50.01" lon="30.01"></trkpt>
</trkseg></trk></gpx>`;

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

  it('shows the Replot brand name in the header', () => {
    renderApp();
    expect(screen.getByText('Replot')).toBeInTheDocument();
  });
});

describe('App start-date validation', () => {
  it('hides later steps and flags the field when the start is in the future', async () => {
    const start = await loadActivityInEnglish();

    fireEvent.change(start, { target: { value: '2999-01-01T08:00' } });

    expect(screen.queryByText('Choose the route')).not.toBeInTheDocument();
    expect(screen.getByText("Start time can't be in the future.")).toBeInTheDocument();
    expect(start).toHaveClass('input-danger');
  });

  it('shows the steps again once the start is back in the past', async () => {
    const start = await loadActivityInEnglish();

    fireEvent.change(start, { target: { value: '2999-01-01T08:00' } });
    expect(screen.queryByText('Choose the route')).not.toBeInTheDocument();

    fireEvent.change(start, { target: { value: '2000-01-01T08:00' } });

    expect(screen.getByText('Choose the route')).toBeInTheDocument();
    expect(screen.queryByText("Start time can't be in the future.")).not.toBeInTheDocument();
    expect(start).not.toHaveClass('input-danger');
  });

  it('hides later steps and flags the field when the start is empty or incomplete', async () => {
    const start = await loadActivityInEnglish();

    fireEvent.change(start, { target: { value: '' } });

    expect(screen.queryByText('Choose the route')).not.toBeInTheDocument();
    expect(screen.getByText('Enter a valid start time.')).toBeInTheDocument();
    expect(start).toHaveClass('input-danger');
  });
});

describe('step 3 custom .gpx route toggle', () => {
  it('switches to the custom drop zone and hides the official list', async () => {
    const start = await loadActivityInEnglish();
    fireEvent.change(start, { target: { value: '2000-01-01T08:00' } });

    expect(document.querySelector('.route-picker')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Upload your own' }));

    expect(screen.getByLabelText('Upload a .gpx route file')).toBeInTheDocument();
    expect(document.querySelector('.route-picker')).toBeNull();
  });

  it('uploads a valid .gpx, shows the loaded card, and reveals the preview', async () => {
    const start = await loadActivityInEnglish();
    fireEvent.change(start, { target: { value: '2000-01-01T08:00' } });

    fireEvent.click(screen.getByRole('button', { name: 'Upload your own' }));
    fireEvent.change(screen.getByLabelText('Upload a .gpx route file'), {
      target: { files: [new File([gpx], 'evening-loop.gpx', { type: 'application/xml' })] },
    });

    expect(await screen.findByText('Evening Loop')).toBeInTheDocument();
    expect(screen.getByText('Preview and download')).toBeInTheDocument();
  });

  it('shows a localized error and no loaded card for an invalid .gpx', async () => {
    const start = await loadActivityInEnglish();
    fireEvent.change(start, { target: { value: '2000-01-01T08:00' } });

    fireEvent.click(screen.getByRole('button', { name: 'Upload your own' }));
    fireEvent.change(screen.getByLabelText('Upload a .gpx route file'), {
      target: { files: [new File(['not gpx <<<'], 'broken.gpx')] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(/as GPX/i);
    expect(screen.queryByText('Broken')).not.toBeInTheDocument();
  });

  it('Replace clears the custom route and reopens the drop zone', async () => {
    const start = await loadActivityInEnglish();
    fireEvent.change(start, { target: { value: '2000-01-01T08:00' } });

    fireEvent.click(screen.getByRole('button', { name: 'Upload your own' }));
    fireEvent.change(screen.getByLabelText('Upload a .gpx route file'), {
      target: { files: [new File([gpx], 'evening-loop.gpx')] },
    });
    await screen.findByText('Evening Loop');

    // Two "Replace" buttons exist (step 1 file + step 3 custom route); the last is step 3.
    const replaceButtons = screen.getAllByRole('button', { name: 'Replace' });
    fireEvent.click(replaceButtons[replaceButtons.length - 1]);

    expect(screen.getByLabelText('Upload a .gpx route file')).toBeInTheDocument();
    expect(screen.queryByText('Evening Loop')).not.toBeInTheDocument();
  });

  it('preserves the official selection when toggling away and back', async () => {
    const start = await loadActivityInEnglish();
    fireEvent.change(start, { target: { value: '2000-01-01T08:00' } });

    const firstOfficial = document.querySelector('.route-picker button') as HTMLButtonElement;
    fireEvent.click(firstOfficial);
    expect(firstOfficial).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Upload your own' }));
    fireEvent.click(screen.getByRole('button', { name: 'Official routes' }));

    const firstAgain = document.querySelector('.route-picker button') as HTMLButtonElement;
    expect(firstAgain).toHaveAttribute('aria-pressed', 'true');
  });
});
