# Future Start-Date Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block exporting an activity whose start time is in the future — flag the start-time field in pale red, show a localized message, and hide the route/preview steps until the user picks a non-future time.

**Architecture:** A pure `isStartInFuture(value, now)` helper lives beside the existing date helpers in `editActivity.ts`. `App.tsx` computes it during render, passes the verdict + localized message into the presentational `ActivityEditor`, and gates the rendering of step 3 and step 4 on it. Styling is a `.input-danger` / `.field-error` pair in the dark theme's existing red palette.

**Tech Stack:** React + TypeScript, Vitest + @testing-library/react, CSS (hand-rolled, dark theme).

## Global Constraints

- **i18n parity:** every message key must exist in **both** `en` and `uk`. The shared `Messages` type enforces this at compile time — both tables are typed `Messages`, so a missing key is a TypeScript error.
- **Validation rule:** start is "in the future" only when it parses to a valid date **strictly greater than** `now`. Empty / unparseable input is **not** future (`false`).
- **Scope:** start time only — do **not** consider the activity end time. Do not auto-correct the date. No changes to merge or the TCX writer.
- **Test framework:** Vitest. Run a single file with `npx vitest run <path>`; run everything with `npx vitest run`.
- **Theme:** dark. "Pale red" = translucent red fill + red border, matching the existing `.error` banner palette (`rgba(255, 90, 90, …)` / text `#ff9b9b`).

---

### Task 1: `isStartInFuture` helper

**Files:**
- Modify: `src/lib/editActivity.ts` (append one function)
- Test: `src/lib/editActivity.test.ts` (append one `describe` block; extend the import)

**Interfaces:**
- Consumes: existing `localInputToDate(value: string): Date`, `dateToLocalInput(d: Date): string` from `./editActivity`.
- Produces: `export function isStartInFuture(value: string, now: Date): boolean` — `true` iff `value` parses to a valid datetime-local strictly after `now`; `false` for past, equal, empty, or unparseable input.

- [ ] **Step 1: Write the failing test**

In `src/lib/editActivity.test.ts`, change the first import line to include the new symbol:

```ts
import {
  shiftActivityStart,
  dateToLocalInput,
  localInputToDate,
  isStartInFuture,
} from './editActivity';
```

Append this block to the end of the file:

```ts
describe('isStartInFuture', () => {
  const now = new Date('2026-06-17T12:00:00Z');

  it('returns true when the start is after now', () => {
    const future = dateToLocalInput(new Date(now.getTime() + 3_600_000));
    expect(isStartInFuture(future, now)).toBe(true);
  });

  it('returns false when the start is before now', () => {
    const past = dateToLocalInput(new Date(now.getTime() - 3_600_000));
    expect(isStartInFuture(past, now)).toBe(false);
  });

  it('returns false when the start equals now', () => {
    expect(isStartInFuture(dateToLocalInput(now), now)).toBe(false);
  });

  it('returns false for empty or unparseable input', () => {
    expect(isStartInFuture('', now)).toBe(false);
    expect(isStartInFuture('not-a-date', now)).toBe(false);
  });
});
```

(`dateToLocalInput` has minute precision; `now` is on a whole minute with zero seconds, so the equal-to-now round-trip stays exactly equal.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/editActivity.test.ts -t "isStartInFuture"`
Expected: FAIL — `isStartInFuture is not a function` / `is not exported`.

- [ ] **Step 3: Write minimal implementation**

Append to `src/lib/editActivity.ts`:

```ts
export function isStartInFuture(value: string, now: Date): boolean {
  const d = localInputToDate(value);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() > now.getTime();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/editActivity.test.ts`
Expected: PASS (all `shiftActivityStart`, round-trip, and `isStartInFuture` tests green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/editActivity.ts src/lib/editActivity.test.ts
git commit -m "feat: add isStartInFuture validation helper"
```

---

### Task 2: `futureStartError` message (en + uk)

**Files:**
- Modify: `src/i18n/messages.ts` (add field to `Messages` type + both tables)
- Test: `src/i18n/i18n.test.ts` (add one test)

**Interfaces:**
- Consumes: existing `translate(lang, key, params?)` from `./i18n`.
- Produces: a new translatable key `futureStartError` resolvable via `t('futureStartError')` / `translate(lang, 'futureStartError')`.
  - `en`: `Start time can't be in the future.`
  - `uk`: `Час початку не може бути в майбутньому.`

- [ ] **Step 1: Write the failing test**

Append to the `describe('translate', …)` block in `src/i18n/i18n.test.ts`:

```ts
  it('returns the future-start error in both languages', () => {
    expect(translate('en', 'futureStartError')).toBe("Start time can't be in the future.");
    expect(translate('uk', 'futureStartError')).toBe('Час початку не може бути в майбутньому.');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/i18n/i18n.test.ts -t "future-start error"`
Expected: FAIL — `translate` falls back to the key, returning `'futureStartError'` instead of the sentences.

- [ ] **Step 3: Write minimal implementation**

In `src/i18n/messages.ts`, add the field to the `Messages` type, immediately after `startTime: string;`:

```ts
  startTime: string;
  futureStartError: string;
```

In the `en` table, add after the `startTime` line (`startTime: 'Start time',`):

```ts
  startTime: 'Start time',
  futureStartError: "Start time can't be in the future.",
```

In the `uk` table, add after the `startTime` line (`startTime: 'Час старту',`):

```ts
  startTime: 'Час старту',
  futureStartError: 'Час початку не може бути в майбутньому.',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/i18n/i18n.test.ts`
Expected: PASS. (TypeScript also now requires the key in both tables — a missing one fails the build.)

- [ ] **Step 5: Commit**

```bash
git add src/i18n/messages.ts src/i18n/i18n.test.ts
git commit -m "feat: add futureStartError message (en/uk)"
```

---

### Task 3: Wire validation into the UI (editor + gating + styles)

**Files:**
- Modify: `src/components/ActivityEditor.tsx` (two new props, danger class + message)
- Modify: `src/index.css` (add `.input-danger` + `.field-error`)
- Modify: `src/App.tsx` (compute `startInFuture`, pass props, gate steps 3 & 4)
- Test: `src/App.test.tsx` (integration test for show/hide + flag)

**Interfaces:**
- Consumes: `isStartInFuture` (Task 1), `t('futureStartError')` (Task 2), existing `ActivityEditor` props `{ name, startInput, onNameChange, onStartChange }`.
- Produces: `ActivityEditor` gains required props `startInvalid: boolean` and `startError: string`. When `startInvalid`, the start-time input carries class `input-danger` and a `<p className="field-error" role="alert">{startError}</p>` is shown.

- [ ] **Step 1: Write the failing test**

Replace the entire contents of `src/App.test.tsx` with:

```tsx
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
```

(`2999`/`2000` are always future/past relative to the real clock, so the test is deterministic without mocking time. Step 3's heading "Choose the official route" is the show/hide signal; step 4 needs a selected route and is covered transitively by the same `!startInFuture` gate.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.test.tsx -t "start-date validation"`
Expected: FAIL — with a future date, step 3 ("Choose the official route") is still in the document and there is no `input-danger` / error message yet.

- [ ] **Step 3a: Update `ActivityEditor`**

Replace the entire contents of `src/components/ActivityEditor.tsx` with:

```tsx
import { useT } from '../i18n/languageContext';

export function ActivityEditor({
  name,
  startInput,
  startInvalid,
  startError,
  onNameChange,
  onStartChange,
}: {
  name: string;
  startInput: string;
  startInvalid: boolean;
  startError: string;
  onNameChange: (v: string) => void;
  onStartChange: (v: string) => void;
}) {
  const t = useT();
  return (
    <div className="activity-editor">
      <label>
        {t('activityName')}
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('activityNamePlaceholder')}
        />
      </label>
      <label>
        {t('startTime')}
        <input
          type="datetime-local"
          className={startInvalid ? 'input-danger' : undefined}
          aria-invalid={startInvalid}
          value={startInput}
          onChange={(e) => onStartChange(e.target.value)}
        />
        {startInvalid && (
          <p className="field-error" role="alert">
            {startError}
          </p>
        )}
      </label>
    </div>
  );
}
```

- [ ] **Step 3b: Add the styles**

In `src/index.css`, immediately after the `.activity-editor input:focus { … }` rule (the block ending right before the `/* Route picker */` comment), add:

```css
.activity-editor input.input-danger {
  border-color: rgba(255, 90, 90, 0.6);
  background: rgba(255, 90, 90, 0.12);
}
.activity-editor input.input-danger:focus {
  border-color: #ff5a5a;
}
.field-error {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: #ff9b9b;
}
```

- [ ] **Step 3c: Wire `App.tsx`**

In `src/App.tsx`, extend the editActivity import (line 8) to include the new helper:

```ts
import {
  shiftActivityStart,
  dateToLocalInput,
  localInputToDate,
  isStartInFuture,
} from './lib/editActivity';
```

After the `const stats = merged ? computeStats(merged.samples) : null;` line, add:

```ts
  const startInFuture = isStartInFuture(startInput, new Date());
```

Replace the `ActivityEditor` usage with the two new props:

```tsx
            <ActivityEditor
              name={name}
              startInput={startInput}
              startInvalid={startInFuture}
              startError={t('futureStartError')}
              onNameChange={setName}
              onStartChange={setStartInput}
            />
```

Gate step 3 — change its opening `{activity && (` to:

```tsx
        {activity && !startInFuture && (
```

Gate step 4 — change its opening `{merged && stats && (` to:

```tsx
        {merged && stats && !startInFuture && (
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS (localization + start-date validation describe blocks all green).

Then run the full suite:

Run: `npx vitest run`
Expected: PASS — all pre-existing tests still green.

- [ ] **Step 5: Commit**

```bash
git add src/components/ActivityEditor.tsx src/index.css src/App.tsx src/App.test.tsx
git commit -m "feat: block future start dates in the activity editor"
```

---

## Self-Review

**Spec coverage:**
- "highlight field pale red" → Task 3 (`input-danger` + CSS). ✓
- "show localized message" → Task 2 (`futureStartError` en/uk) + Task 3 (`.field-error` / `role="alert"`). ✓
- "do not show next steps" → Task 3 (step 3 & 4 gating). ✓
- "show steps once valid" → Task 3 second integration test (past date → step 3 returns). ✓
- "start time only / empty not future / strict >" → Task 1 helper + tests. ✓
- Pure, injectable `now` for testability → Task 1 signature. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every command has an expected result. ✓

**Type consistency:** `isStartInFuture(value: string, now: Date): boolean` is defined in Task 1 and consumed verbatim in Task 3's `App.tsx`. `ActivityEditor` props `startInvalid: boolean` / `startError: string` are defined and passed with matching names/types. Message key `futureStartError` is identical across Task 2 (definition) and Task 3 (`t('futureStartError')`). ✓
