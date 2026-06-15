# Edit Step + Export FAQ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make step 1 source-agnostic with a `.tcx` export FAQ, and add a new step 2 where the user edits the activity's start time and name before merging.

**Architecture:** Add a pure, unit-tested `editActivity.ts` (timestamp-shift + date↔input helpers) and two thin React components (`ExportFaq`, `ActivityEditor`). Wire them into the existing `App.tsx` flow, which already uses `useMemo` for the merge; the edit step feeds a shifted activity into that same pipeline. Output stays `.tcx`; the name only drives the download filename.

**Tech Stack:** React + Vite + TypeScript, Vitest + @testing-library/react (jsdom). Existing app on branch `feat/runukraine-mvp`.

**Spec:** `docs/superpowers/specs/2026-06-15-edit-step-and-export-faq-design.md`

**Commit convention:** every commit message ends with the trailer:
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

---

## File map

```
src/
  lib/
    editActivity.ts          shiftActivityStart, dateToLocalInput, localInputToDate (Task 1)
  components/
    ExportFaq.tsx            collapsible .tcx export FAQ (Task 2)
    ActivityEditor.tsx       start-time + name form (Task 3)
    FileDrop.tsx             (modify: generic default label — Task 4)
  App.tsx                    (modify: wiring, generic wording, new steps — Task 4)
  index.css                  (modify: styles for .faq and .activity-editor — Task 4)
```

---

## Task 1: Activity editing helpers (`editActivity.ts`)

**Files:**
- Create: `src/lib/editActivity.ts`
- Test: `src/lib/editActivity.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/editActivity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { shiftActivityStart, dateToLocalInput, localInputToDate } from './editActivity';
import type { GarminActivity } from '../types';

const activity: GarminActivity = {
  sport: 'Running',
  samples: [
    { time: new Date('2026-06-01T08:00:00Z'), distance: 0, hr: 130, cadence: 80 },
    { time: new Date('2026-06-01T08:00:30Z'), distance: 100, hr: 150, cadence: 82 },
  ],
};

describe('shiftActivityStart', () => {
  it('moves the first sample to the new start, preserving gaps and telemetry', () => {
    const out = shiftActivityStart(activity, new Date('2026-06-01T09:15:00Z'));
    expect(out.samples[0].time.toISOString()).toBe('2026-06-01T09:15:00.000Z');
    expect(out.samples[1].time.getTime() - out.samples[0].time.getTime()).toBe(30000);
    expect(out.samples[0].hr).toBe(130);
    expect(out.samples[1].distance).toBe(100);
    expect(out.samples[1].cadence).toBe(82);
    expect(out.sport).toBe('Running');
  });
  it('shifts backward too', () => {
    const out = shiftActivityStart(activity, new Date('2026-06-01T07:00:00Z'));
    expect(out.samples[0].time.toISOString()).toBe('2026-06-01T07:00:00.000Z');
    expect(out.samples[1].time.toISOString()).toBe('2026-06-01T07:00:30.000Z');
  });
  it('does not mutate the input activity', () => {
    shiftActivityStart(activity, new Date('2026-06-01T10:00:00Z'));
    expect(activity.samples[0].time.toISOString()).toBe('2026-06-01T08:00:00.000Z');
  });
  it('returns the activity unchanged when there are no samples', () => {
    const empty: GarminActivity = { samples: [] };
    expect(shiftActivityStart(empty, new Date('2026-06-01T09:00:00Z'))).toBe(empty);
  });
});

describe('dateToLocalInput / localInputToDate', () => {
  it('round-trips a local datetime through the input format', () => {
    const d = new Date(2026, 5, 1, 8, 30); // local June 1 2026, 08:30
    const s = dateToLocalInput(d);
    expect(s).toBe('2026-06-01T08:30');
    expect(localInputToDate(s).getTime()).toBe(d.getTime());
  });
  it('returns an invalid date for empty input', () => {
    expect(Number.isNaN(localInputToDate('').getTime())).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/editActivity.test.ts`
Expected: FAIL — module/functions not found.

- [ ] **Step 3: Implement `editActivity.ts`**

Create `src/lib/editActivity.ts`:

```ts
import type { GarminActivity } from '../types';

export function shiftActivityStart(activity: GarminActivity, newStart: Date): GarminActivity {
  if (activity.samples.length === 0) return activity;
  const delta = newStart.getTime() - activity.samples[0].time.getTime();
  if (delta === 0) return activity;
  return {
    ...activity,
    samples: activity.samples.map((s) => ({
      ...s,
      time: new Date(s.time.getTime() + delta),
    })),
  };
}

export function dateToLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export function localInputToDate(value: string): Date {
  return new Date(value);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/editActivity.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/editActivity.ts src/lib/editActivity.test.ts
git commit -m "feat: add activity start-time shift and datetime-local helpers

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Export FAQ component (`ExportFaq.tsx`)

**Files:**
- Create: `src/components/ExportFaq.tsx`
- Test: `src/components/ExportFaq.test.tsx`

The export steps below are verified against the apps' current (2026) official support docs. Use the exact content.

- [ ] **Step 1: Write the failing test**

Create `src/components/ExportFaq.test.tsx`:

```tsx
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ExportFaq.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ExportFaq.tsx`**

Create `src/components/ExportFaq.tsx`:

```tsx
export function ExportFaq() {
  return (
    <details className="faq">
      <summary>How do I export a .tcx file?</summary>
      <p>
        You need a <strong>.tcx</strong> file — it carries the distance, heart-rate and
        cadence data the merge relies on. A plain GPX won't work, because its distance comes
        from the GPS, which is exactly what was broken.
      </p>

      <details>
        <summary>Garmin Connect</summary>
        <ol>
          <li>Open the activity on <code>connect.garmin.com</code> (web only).</li>
          <li>Click the gear icon (⚙) in the top-right.</li>
          <li>Choose <strong>Export to TCX</strong>.</li>
        </ol>
      </details>

      <details>
        <summary>Polar Flow</summary>
        <ol>
          <li>Open the session on <code>flow.polar.com</code> → Diary (web only).</li>
          <li>Click the <strong>Export</strong> menu in the top-right.</li>
          <li>Choose <strong>TCX</strong>.</li>
        </ol>
      </details>

      <details>
        <summary>COROS</summary>
        <ol>
          <li>In the COROS app: Activities → open the activity → tap ⋯ (top-right).</li>
          <li>Choose <strong>Export Data</strong> → <strong>TCX</strong>.</li>
          <li>(Or on the web: COROS Training Hub → Activity List → Export Data → TCX.)</li>
        </ol>
      </details>

      <details>
        <summary>Strava</summary>
        <ol>
          <li>Strava's own menu only exports GPX, which won't work here.</li>
          <li>
            For a real TCX, open the activity on <code>strava.com</code> and add{' '}
            <code>/export_tcx</code> to the URL — e.g.{' '}
            <code>strava.com/activities/1234567890/export_tcx</code>.
          </li>
        </ol>
      </details>

      <details>
        <summary>Suunto</summary>
        <ol>
          <li>The Suunto app exports FIT or GPX, not TCX.</li>
          <li>
            Export the <strong>FIT</strong> file (⋯ → download FIT) and convert it to TCX with
            a file converter — or use the Strava trick above if it's synced there.
          </li>
        </ol>
      </details>

      <details>
        <summary>Wahoo</summary>
        <ol>
          <li>Wahoo exports FIT, not TCX.</li>
          <li>
            Convert the FIT to TCX with a file converter — or, if it's synced to Strava, use
            the <code>/export_tcx</code> trick above.
          </li>
        </ol>
      </details>

      <details>
        <summary>Other apps</summary>
        <ol>
          <li>Look for an <strong>Export</strong> option (usually in the web version) and pick <strong>TCX</strong>.</li>
          <li>If only GPX is offered it won't work — export TCX, or export a FIT and convert it.</li>
        </ol>
      </details>
    </details>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ExportFaq.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ExportFaq.tsx src/components/ExportFaq.test.tsx
git commit -m "feat: add collapsible .tcx export FAQ

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Activity editor component (`ActivityEditor.tsx`)

**Files:**
- Create: `src/components/ActivityEditor.tsx`
- Test: `src/components/ActivityEditor.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/ActivityEditor.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityEditor } from './ActivityEditor';

describe('ActivityEditor', () => {
  it('pre-fills both fields and fires change handlers', () => {
    const onNameChange = vi.fn();
    const onStartChange = vi.fn();
    render(
      <ActivityEditor
        name="My Run"
        startInput="2026-06-01T08:00"
        onNameChange={onNameChange}
        onStartChange={onStartChange}
      />,
    );
    const nameInput = screen.getByLabelText('Activity name') as HTMLInputElement;
    const startInput = screen.getByLabelText('Start time') as HTMLInputElement;
    expect(nameInput.value).toBe('My Run');
    expect(startInput.value).toBe('2026-06-01T08:00');

    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    expect(onNameChange).toHaveBeenCalledWith('New Name');

    fireEvent.change(startInput, { target: { value: '2026-06-01T09:30' } });
    expect(onStartChange).toHaveBeenCalledWith('2026-06-01T09:30');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ActivityEditor.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `ActivityEditor.tsx`**

Create `src/components/ActivityEditor.tsx`:

```tsx
export function ActivityEditor({
  name,
  startInput,
  onNameChange,
  onStartChange,
}: {
  name: string;
  startInput: string;
  onNameChange: (v: string) => void;
  onStartChange: (v: string) => void;
}) {
  return (
    <div className="activity-editor">
      <label>
        Activity name
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="My activity"
        />
      </label>
      <label>
        Start time
        <input
          type="datetime-local"
          value={startInput}
          onChange={(e) => onStartChange(e.target.value)}
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/ActivityEditor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ActivityEditor.tsx src/components/ActivityEditor.test.tsx
git commit -m "feat: add ActivityEditor (start time + name) form

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Wire into the app + generic wording + styles

**Files:**
- Modify: `src/components/FileDrop.tsx` (default label)
- Modify: `src/App.tsx` (replace entire contents)
- Modify: `src/index.css` (append styles)

- [ ] **Step 1: Make the FileDrop default label generic**

In `src/components/FileDrop.tsx`, change the default `label` parameter value from
`'Choose your Garmin .tcx file'` to `'Choose a .tcx file'`. The relevant line becomes:

```tsx
  label = 'Choose a .tcx file',
```

(Leave everything else in the file unchanged.)

- [ ] **Step 2: Replace `src/App.tsx`**

Replace the entire contents of `src/App.tsx` with:

```tsx
import { useMemo, useState } from 'react';
import { parseTcx } from './lib/tcx';
import { loadBundledRoutes } from './lib/routes';
import { mergeActivityWithRoute } from './lib/merge';
import { computeStats } from './lib/stats';
import { serializeTcx } from './lib/tcxWriter';
import { downloadText } from './lib/download';
import { shiftActivityStart, dateToLocalInput, localInputToDate } from './lib/editActivity';
import { FileDrop } from './components/FileDrop';
import { ExportFaq } from './components/ExportFaq';
import { ActivityEditor } from './components/ActivityEditor';
import { RoutePicker } from './components/RoutePicker';
import { MapPreview } from './components/MapPreview';
import { StatsSummary } from './components/StatsSummary';
import type { GarminActivity, MergedActivity, Route } from './types';

export default function App() {
  const routes = useMemo(() => loadBundledRoutes(), []);
  const [activity, setActivity] = useState<GarminActivity | null>(null);
  const [name, setName] = useState<string>('activity');
  const [startInput, setStartInput] = useState<string>('');
  const [route, setRoute] = useState<Route | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(text: string, filename: string) {
    try {
      const parsed = parseTcx(text);
      setActivity(parsed);
      setName(filename.replace(/\.tcx$/i, ''));
      setStartInput(dateToLocalInput(parsed.samples[0].time));
      setError(null);
    } catch (e) {
      setActivity(null);
      setError((e as Error).message);
    }
  }

  const editedActivity = useMemo<GarminActivity | null>(() => {
    if (!activity) return null;
    const d = localInputToDate(startInput);
    if (Number.isNaN(d.getTime())) return activity;
    return shiftActivityStart(activity, d);
  }, [activity, startInput]);

  const { merged, mergeError } = useMemo<{
    merged: MergedActivity | null;
    mergeError: string | null;
  }>(() => {
    if (!editedActivity || !route) return { merged: null, mergeError: null };
    try {
      return { merged: mergeActivityWithRoute(editedActivity, route), mergeError: null };
    } catch (e) {
      return { merged: null, mergeError: (e as Error).message };
    }
  }, [editedActivity, route]);

  function handleDownload() {
    if (!merged) return;
    const safe = `${name || 'activity'}.tcx`.replace(/\s+/g, '-');
    downloadText(safe, serializeTcx(merged));
  }

  return (
    <main className="app">
      <h1>RunUkraine — track merger</h1>
      <p className="lede">
        Paint your watch's telemetry onto an official event route when GPS was jammed.
      </p>

      {(error || mergeError) && (
        <p className="error" role="alert">
          {error ?? mergeError}
        </p>
      )}

      <section>
        <h2>1. Your activity file</h2>
        <FileDrop onFile={handleFile} />
        {activity && <p>Loaded {activity.samples.length} points.</p>}
        <ExportFaq />
      </section>

      {activity && (
        <section>
          <h2>2. Adjust start time &amp; name</h2>
          <ActivityEditor
            name={name}
            startInput={startInput}
            onNameChange={setName}
            onStartChange={setStartInput}
          />
        </section>
      )}

      {activity && (
        <section>
          <h2>3. Pick the official route</h2>
          <RoutePicker routes={routes} selected={route} onSelect={setRoute} />
        </section>
      )}

      {merged && (
        <section>
          <h2>4. Preview &amp; download</h2>
          <MapPreview merged={merged.samples} original={editedActivity?.samples} />
          <StatsSummary stats={computeStats(merged.samples)} />
          <button type="button" onClick={handleDownload}>
            Download merged .tcx
          </button>
          <p>
            Then upload it at{' '}
            <a href="https://www.strava.com/upload/select" target="_blank" rel="noreferrer">
              strava.com/upload
            </a>
            .
          </p>
        </section>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Append styles to `src/index.css`**

Append the following to the end of `src/index.css`:

```css
.faq {
  margin-top: 16px;
  font-size: 14px;
}
.faq > summary {
  cursor: pointer;
  font-weight: 600;
}
.faq details {
  margin: 8px 0 8px 12px;
}
.faq summary {
  cursor: pointer;
}
.faq code {
  background: #f0f0f2;
  padding: 1px 4px;
  border-radius: 4px;
}
.activity-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 360px;
}
.activity-editor label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #555;
}
.activity-editor input {
  padding: 8px 10px;
  border: 1px solid #d0d0d4;
  border-radius: 8px;
  font: inherit;
}
```

- [ ] **Step 4: Run the full test suite and typecheck**

Run: `npm test && npx tsc -b`
Expected: all tests PASS (the existing 34 plus the new editActivity/ExportFaq/ActivityEditor tests), no type errors.

- [ ] **Step 5: Build to catch production-only errors**

Run: `npm run build`
Expected: build succeeds, no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: generic upload wording, export FAQ, and edit step

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Manual verification (after Task 4)

Run `npm run dev` and confirm in the browser:
- Step 1 heading reads "1. Your activity file"; the "How do I export a .tcx file?" FAQ expands and shows all app entries.
- After loading a `.tcx`, step 2 "Adjust start time & name" appears with the start time pre-filled from the file and the name pre-filled from the filename.
- Changing the start time re-merges (the preview/stats update); changing the name changes the downloaded filename.
- Steps are numbered 1–4 and the download still produces a valid `.tcx`.

---

## Done

The upload step is source-agnostic with a verified export FAQ, and a new edit step lets the user
set the activity's start time (shifting all timestamps) and name (download filename) before the
merge. All pure logic is unit-tested; existing tests stay green.
