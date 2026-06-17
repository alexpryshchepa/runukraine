# Replot Rebrand, File-name Rename, GA, and Step-3 Route Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the "Activity name" field to "File name", rebrand the app from RunUkraine to Replot, add Google Analytics, and add an Official ↔ Custom toggle in step 3 so users can upload their own `.gpx` route instead of the bundled ones.

**Architecture:** Four independent changes. (1)–(3) are i18n/markup edits. (4) replaces step 3's single `route` state with a `routeMode` plus per-source selections (`officialRoute`, `customRoute`) and a derived `route`; the existing `RoutePicker` is reused for official mode and `FileDrop` (already generic via `accept`) for custom mode, with `buildRoute`/`filenameToName` turning the uploaded GPX into a `Route`. No new parsing logic and no new error codes.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest + @testing-library/react (jsdom). i18n via a small `translate`/`useT` layer with `en` + `uk` string tables; the `Messages` type enforces en/uk key parity at compile time.

## Global Constraints

- **i18n parity:** every user-facing string must exist in BOTH `en` and `uk`. Adding a key to the `Messages` type in `src/i18n/messages.ts` requires adding it to both the `en` and `uk` tables (compile-time enforced).
- **Reuse, don't reimplement:** use `FileDrop` (with `accept=".gpx"`), `buildRoute(name, gpxXml)`, `filenameToName(path)`, `parseGpx`. The GPX error codes `gpxInvalidXml` / `gpxTooFewPoints` already exist and are already localized — do NOT add new error codes.
- **Privacy:** custom routes are NOT persisted (React state only); they vanish on reload, like the rest of the app.
- **Brand:** the app name is **Replot** (Latin script in both languages). The `disclaimer` strings and the `LANG_STORAGE_KEY` value (`'runukraine.lang'`) are intentionally left UNCHANGED.
- **GA measurement ID:** `G-8BWSJYMF3K` (hardcoded inline in `index.html`).
- **Process:** TDD (failing test first where unit-testable), frequent commits, one deliverable per task.
- **Commands:** full suite `npm test` (alias for `vitest run`); one file `npx vitest run <path>`; typecheck `npx tsc -b`; lint `npm run lint`; build `npm run build`.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/i18n/messages.ts` | Rename file-name keys; rebrand titles/lede; add 5 route-toggle keys; reword `step3`/`mapRoute` | Modify |
| `src/components/ActivityEditor.tsx` | Use renamed `fileName`/`fileNamePlaceholder` keys | Modify |
| `src/components/ActivityEditor.test.tsx` | Assert on the "File name" label | Modify |
| `src/App.tsx` | Brand text; route state refactor (`routeMode`/`officialRoute`/`customRoute`); custom upload handler; step-3 toggle UI | Modify |
| `src/App.test.tsx` | "Replot" brand assertion; updated step-3 heading; custom-upload integration tests | Modify |
| `src/i18n/i18n.test.ts` | Assert the new route-toggle strings resolve in both languages | Modify |
| `src/index.css` | `.route-source-toggle` segmented-control style | Modify |
| `index.html` | `<title>` rebrand; GA4 gtag snippet | Modify |
| `package.json` | `"name": "replot"` | Modify |
| `README.md` | Title + brand mentions | Modify |

---

## Task 1: Rename "Activity name" → "File name"

The `name` state feeds only the download filename (`handleDownload`), never the TCX content. Rename the i18n keys (`activityName` → `fileName`, `activityNamePlaceholder` → `fileNamePlaceholder`) and the step-2 heading. No logic change.

**Files:**
- Modify: `src/i18n/messages.ts`
- Modify: `src/components/ActivityEditor.tsx`
- Test: `src/components/ActivityEditor.test.tsx`

**Interfaces:**
- Consumes: `useT()` from `../i18n/languageContext`.
- Produces: i18n keys `fileName`, `fileNamePlaceholder` (replacing `activityName`, `activityNamePlaceholder`); `step2` reworded. `ActivityEditor` renders a "File name" label.

- [ ] **Step 1: Update the failing test**

In `src/components/ActivityEditor.test.tsx`, change the label lookup on line 17 from `'Activity name'` to `'File name'`:

```tsx
    const nameInput = screen.getByLabelText('File name') as HTMLInputElement;
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/ActivityEditor.test.tsx`
Expected: FAIL — `getByLabelText('File name')` finds nothing (the component still renders the "Activity name" label).

- [ ] **Step 3: Rename the keys in `messages.ts`**

In `src/i18n/messages.ts`, in the `Messages` type, replace these two lines:

```ts
  activityName: string;
  activityNamePlaceholder: string;
```

with:

```ts
  fileName: string;
  fileNamePlaceholder: string;
```

In the `en` table, replace:

```ts
  activityName: 'Activity name',
  activityNamePlaceholder: 'My activity',
```

with:

```ts
  fileName: 'File name',
  fileNamePlaceholder: 'File name',
```

and change the `en` `step2` value from `'Name it and set the start'` to:

```ts
  step2: 'File name and start',
```

In the `uk` table, replace:

```ts
  activityName: 'Назва тренування',
  activityNamePlaceholder: 'Моє тренування',
```

with:

```ts
  fileName: 'Назва файлу',
  fileNamePlaceholder: 'Назва файлу',
```

and change the `uk` `step2` value from `'Назва та час старту'` to:

```ts
  step2: 'Назва файлу та час старту',
```

- [ ] **Step 4: Update `ActivityEditor.tsx` to use the renamed keys**

In `src/components/ActivityEditor.tsx`, change line 22 from `{t('activityName')}` to `{t('fileName')}` and line 27 from `placeholder={t('activityNamePlaceholder')}` to `placeholder={t('fileNamePlaceholder')}`:

```tsx
        {t('fileName')}
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t('fileNamePlaceholder')}
        />
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/ActivityEditor.test.tsx`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `npx tsc -b`
Expected: no errors (no remaining references to `activityName`/`activityNamePlaceholder`).

- [ ] **Step 7: Commit**

```bash
git add src/i18n/messages.ts src/components/ActivityEditor.tsx src/components/ActivityEditor.test.tsx
git commit -m "feat: rename the Activity name field to File name"
```

---

## Task 2: Rebrand to "Replot"

Replace the "RunUkraine" brand text in the header, titles, and lede with "Replot". Leave the `disclaimer` (which disclaims the RunUkraine race organizer) and `LANG_STORAGE_KEY` unchanged.

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/i18n/messages.ts`
- Modify: `index.html`
- Modify: `package.json`
- Modify: `README.md`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: header renders the text "Replot"; document title and i18n titles say "Replot".

- [ ] **Step 1: Add a failing brand assertion**

In `src/App.test.tsx`, add this test inside the existing `describe('App localization', ...)` block (after the existing tests, before the closing `});`):

```tsx
  it('shows the Replot brand name in the header', () => {
    renderApp();
    expect(screen.getByText('Replot')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — the header still renders "RunUkraine", so `getByText('Replot')` finds nothing.

- [ ] **Step 3: Update the header brand text in `App.tsx`**

In `src/App.tsx`, change line 112 from `<span className="brand-name">RunUkraine</span>` to:

```tsx
            <span className="brand-name">Replot</span>
```

- [ ] **Step 4: Update titles and lede in `messages.ts`**

In `src/i18n/messages.ts`, `en` table:

```ts
  htmlTitle: 'Replot — track merger',
  title: 'Replot — track merger',
```

and change the `en` `lede` value, replacing "RunUkraine paints" with "Replot paints" (rest of the string unchanged):

```ts
  lede: 'When the signal was jammed, your watch still kept the truth — your time, distance, heart rate and cadence. Replot paints that telemetry onto the real event route, so your run finally looks the way it felt.',
```

In the `uk` table:

```ts
  htmlTitle: "Replot — об'єднувач треків",
  title: "Replot — об'єднувач треків",
```

and change the `uk` `lede`, replacing "RunUkraine накладає" with "Replot накладає":

```ts
  lede: 'Коли сигнал глушили, годинник усе одно зберіг головне — ваш час, дистанцію, пульс і каденс. Replot накладає цю телеметрію на справжній маршрут забігу, щоб результат нарешті виглядав так, як відчувався.',
```

(Leave `tagline` and both `disclaimer` strings exactly as they are.)

- [ ] **Step 5: Update `index.html` title**

In `index.html`, change line 13 from `<title>RunUkraine — об'єднувач треків</title>` to:

```html
    <title>Replot — об'єднувач треків</title>
```

- [ ] **Step 6: Update `package.json` name**

In `package.json`, change line 2 from `"name": "runukraine",` to:

```json
  "name": "replot",
```

- [ ] **Step 7: Update `README.md`**

In `README.md`, change the first line from `# RunUkraine` to `# Replot`, and in the third paragraph replace `Strava. 100% client-side` line's surrounding brand — specifically replace the two prose mentions of the tool name. Change the opening sentence to read "Merge a Garmin `.tcx` activity …" (no brand change needed there), and update the "## Why" section's tool reference: change `This tool paints that telemetry` (no brand) — these are already brand-free. The only branded line is the title. Confirm with:

```bash
grep -n "RunUkraine\|runukraine" README.md
```

Expected after the title edit: only matches (if any) are inside an explicit disclaimer/affiliation context; if a prose sentence names the tool "RunUkraine" as the product, change it to "Replot". (As of this plan the only occurrence is the `# RunUkraine` title.)

- [ ] **Step 8: Run the test to verify it passes**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS (the new brand test plus the existing localization tests).

- [ ] **Step 9: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/App.tsx src/i18n/messages.ts src/App.test.tsx index.html package.json README.md
git commit -m "feat: rebrand the app from RunUkraine to Replot"
```

---

## Task 3: Add Google Analytics (GA4)

Add the GA4 `gtag.js` snippet to `index.html` with the real measurement ID inline. Guard it with a test that asserts the ID is present so it cannot be silently dropped.

**Files:**
- Modify: `index.html`
- Test: `src/ga.test.ts` (new)

**Interfaces:**
- Consumes: nothing.
- Produces: `index.html` loads GA4 for `G-8BWSJYMF3K`.

- [ ] **Step 1: Write the failing test**

Create `src/ga.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Google Analytics', () => {
  it('embeds the GA4 gtag snippet with the measurement ID in index.html', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('https://www.googletagmanager.com/gtag/js?id=G-8BWSJYMF3K');
    expect(html).toContain("gtag('config', 'G-8BWSJYMF3K')");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ga.test.ts`
Expected: FAIL — `index.html` does not yet contain the GA snippet.

- [ ] **Step 3: Add the GA snippet to `index.html`**

In `index.html`, insert the snippet inside `<head>`, immediately before the closing `</head>` (after the `<title>` line):

```html
    <!-- Google Analytics (GA4) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-8BWSJYMF3K"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() { dataLayer.push(arguments); }
      gtag('js', new Date());
      gtag('config', 'G-8BWSJYMF3K');
    </script>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ga.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify the production build still succeeds**

Run: `npm run build`
Expected: build completes with no errors (Vite leaves the external gtag script tag intact in the emitted `dist/index.html`).

- [ ] **Step 6: Commit**

```bash
git add index.html src/ga.test.ts
git commit -m "feat: add Google Analytics (GA4) to index.html"
```

---

## Task 4: Step-3 Official ↔ Custom route toggle

Replace step 3's single `route` state with `routeMode` plus `officialRoute` and `customRoute`, with `route` derived. Render a segmented toggle: Official mode shows the existing `RoutePicker`; Custom mode shows a `.gpx` `FileDrop`, or — once a route is uploaded — a compact loaded card with a Replace button. Reword `step3`/`mapRoute` so they no longer say "official".

**Files:**
- Modify: `src/i18n/messages.ts`
- Modify: `src/i18n/i18n.test.ts`
- Modify: `src/index.css`
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `buildRoute`, `filenameToName`, `loadBundledRoutes` from `./lib/routes`; `FileDrop` (props `{ onFile, accept?, label?, title?, hint? }`); `RoutePicker` (props `{ routes, selected, onSelect }`); `localizeError` (already imported in `App.tsx`); the 5 new i18n keys.
- Produces: a working step-3 toggle. New i18n keys: `routeSourceOfficial`, `routeSourceCustom`, `uploadRouteTitle`, `uploadRouteHint`, `uploadRouteLabel`. New App handler `handleCustomRoute(text: string, filename: string): void`.

- [ ] **Step 1: Add the new i18n keys and reword `step3`/`mapRoute`**

In `src/i18n/messages.ts`, add these five lines to the `Messages` type (e.g. right after `mapRoute: string;`):

```ts
  routeSourceOfficial: string;
  routeSourceCustom: string;
  uploadRouteTitle: string;
  uploadRouteHint: string;
  uploadRouteLabel: string;
```

In the `en` table, change the `step3` and `mapRoute` values and add the five new entries (e.g. group them after `step4`):

```ts
  step3: 'Choose the route',
```
```ts
  mapRoute: 'Route',
```
```ts
  routeSourceOfficial: 'Official routes',
  routeSourceCustom: 'Upload your own',
  uploadRouteTitle: 'Upload your own .gpx route',
  uploadRouteHint: 'or click to browse — nothing leaves your device',
  uploadRouteLabel: 'Upload a .gpx route file',
```

In the `uk` table, change `step3` and `mapRoute` and add the five new entries:

```ts
  step3: 'Оберіть маршрут',
```
```ts
  mapRoute: 'Маршрут',
```
```ts
  routeSourceOfficial: 'Офіційні маршрути',
  routeSourceCustom: 'Власний файл',
  uploadRouteTitle: 'Завантажте власний маршрут .gpx',
  uploadRouteHint: 'або натисніть, щоб обрати — нічого не залишає ваш пристрій',
  uploadRouteLabel: 'Завантажте файл маршруту .gpx',
```

(The em dash `—` in the `en` `uploadRouteHint` matches the existing `dropHint` string — copy it exactly.)

- [ ] **Step 2: Add the i18n parity test for the new keys**

In `src/i18n/i18n.test.ts`, add this `it` block inside the existing `describe('translate', ...)`:

```ts
  it('provides the route-source toggle strings in both languages', () => {
    expect(translate('en', 'routeSourceOfficial')).toBe('Official routes');
    expect(translate('uk', 'routeSourceOfficial')).toBe('Офіційні маршрути');
    expect(translate('en', 'routeSourceCustom')).toBe('Upload your own');
    expect(translate('uk', 'routeSourceCustom')).toBe('Власний файл');
    expect(translate('en', 'uploadRouteLabel')).toBe('Upload a .gpx route file');
    expect(translate('uk', 'uploadRouteLabel')).toBe('Завантажте файл маршруту .gpx');
  });
```

- [ ] **Step 3: Run the i18n test to verify it passes**

Run: `npx vitest run src/i18n/i18n.test.ts`
Expected: PASS (the `Messages` type already forced both tables to include the keys; this confirms the values).

- [ ] **Step 4: Add the toggle styles to `index.css`**

In `src/index.css`, immediately after the `.route-picker button[aria-pressed='true'] .route-km { ... }` block (ends at line 467), add:

```css
/* Route source toggle (Official / Custom) */
.route-source-toggle {
  display: inline-flex;
  gap: 4px;
  border-radius: var(--radius-pill);
  padding: 3px;
  background: var(--surface-2);
  margin-bottom: 14px;
}
.route-source-toggle button {
  padding: 7px 16px;
  border: none;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  background: transparent;
  color: var(--text-faint);
  transition: background 0.15s, color 0.15s;
}
.route-source-toggle button[aria-pressed='true'] {
  background: var(--yellow);
  color: var(--on-yellow);
}
```

- [ ] **Step 5: Write/Update the failing App tests**

In `src/App.test.tsx`, make these changes:

(a) In the `describe('App start-date validation', ...)` block, replace every occurrence of the string `'Choose the official route'` with `'Choose the route'` (there are three: in the first test's `queryByText`, and in the second test's `queryByText` and two `getByText`/`queryByText`).

(b) Add these GPX fixtures right after the existing `sampleTcx` constant (around line 35):

```tsx
const gpx = `<?xml version="1.0"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg>
  <trkpt lat="50.00" lon="30.00"></trkpt>
  <trkpt lat="50.01" lon="30.01"></trkpt>
</trkseg></trk></gpx>`;

const gpx2 = `<?xml version="1.0"?>
<gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg>
  <trkpt lat="49.00" lon="24.00"></trkpt>
  <trkpt lat="49.02" lon="24.02"></trkpt>
</trkseg></trk></gpx>`;
```

(c) Add this whole `describe` block at the end of the file (before the final newline):

```tsx
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
```

- [ ] **Step 6: Run the App tests to verify they fail**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — no "Upload your own" toggle button / no `Upload a .gpx route file` input yet, and the start-date tests now look for the not-yet-present `'Choose the route'` string.

- [ ] **Step 7: Import the route builders in `App.tsx`**

In `src/App.tsx`, change line 3 from `import { loadBundledRoutes } from './lib/routes';` to:

```ts
import { buildRoute, filenameToName, loadBundledRoutes } from './lib/routes';
```

- [ ] **Step 8: Replace the `route` state with mode + per-source state**

In `src/App.tsx`, replace line 47 (`const [route, setRoute] = useState<Route | null>(null);`) with:

```ts
  const [routeMode, setRouteMode] = useState<'official' | 'custom'>('official');
  const [officialRoute, setOfficialRoute] = useState<Route | null>(null);
  const [customRoute, setCustomRoute] = useState<Route | null>(null);
  const route = routeMode === 'custom' ? customRoute : officialRoute;
```

(`route` stays a `Route | null` used by the existing merge `useMemo`, `MapPreview`, and `handleDownload` — no other change needed there.)

- [ ] **Step 9: Reset the route state in `handleReplace`**

In `src/App.tsx`, in `handleReplace`, replace the single `setRoute(null);` line with:

```ts
    setRouteMode('official');
    setOfficialRoute(null);
    setCustomRoute(null);
```

- [ ] **Step 10: Add the custom-route upload handler**

In `src/App.tsx`, add this function immediately after `handleReplace`:

```ts
  function handleCustomRoute(text: string, filename: string) {
    try {
      setCustomRoute(buildRoute(filenameToName(filename), text));
      setError(null);
    } catch (e) {
      setError(localizeError(e, t));
    }
  }
```

- [ ] **Step 11: Replace the step-3 body with the toggle UI**

In `src/App.tsx`, replace the single line `<RoutePicker routes={routes} selected={route} onSelect={setRoute} />` with:

```tsx
            <div className="route-source-toggle" role="group" aria-label={t('step3')}>
              <button
                type="button"
                aria-pressed={routeMode === 'official'}
                onClick={() => setRouteMode('official')}
              >
                {t('routeSourceOfficial')}
              </button>
              <button
                type="button"
                aria-pressed={routeMode === 'custom'}
                onClick={() => setRouteMode('custom')}
              >
                {t('routeSourceCustom')}
              </button>
            </div>
            {routeMode === 'official' ? (
              <RoutePicker routes={routes} selected={officialRoute} onSelect={setOfficialRoute} />
            ) : customRoute ? (
              <div className="loaded-card">
                <div className="loaded-icon" aria-hidden="true">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
                <div className="loaded-info">
                  <div className="loaded-name">{customRoute.name}</div>
                  <div className="loaded-points">
                    {(customRoute.length / 1000).toFixed(2)} {t('units.km')}
                  </div>
                </div>
                <button type="button" className="btn-replace" onClick={() => setCustomRoute(null)}>
                  {t('replace')}
                </button>
              </div>
            ) : (
              <FileDrop
                accept=".gpx"
                onFile={handleCustomRoute}
                label={t('uploadRouteLabel')}
                title={t('uploadRouteTitle')}
                hint={t('uploadRouteHint')}
              />
            )}
```

- [ ] **Step 12: Run the App tests to verify they pass**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS (the localization + brand tests, the reworded start-date tests, and the five new toggle tests).

- [ ] **Step 13: Run the full suite, typecheck, and lint**

Run: `npm test && npx tsc -b && npm run lint`
Expected: all tests green, no type errors, no lint errors.

- [ ] **Step 14: Commit**

```bash
git add src/i18n/messages.ts src/i18n/i18n.test.ts src/index.css src/App.tsx src/App.test.tsx
git commit -m "feat: toggle between official routes and a custom .gpx upload in step 3"
```

---

## Self-Review

**Spec coverage:**
- §1 File-name rename (keys, placeholder mirrors label, step-2 heading, ActivityEditor) → Task 1.
- §2 Rebrand (brand text, titles, lede, index.html, package.json, README; disclaimer + lang key unchanged) → Task 2 (+ constraint note).
- §3 GA4 hardcoded `G-8BWSJYMF3K` in index.html → Task 3.
- §4 Step-3 toggle: `routeMode` + `officialRoute`/`customRoute` + derived `route` (Task 4 Step 8); toggle UI + RoutePicker/FileDrop/loaded-card (Step 11); `handleCustomRoute` reusing `buildRoute`/`filenameToName`, existing GPX errors (Step 10); `handleReplace` reset (Step 9); 5 new i18n keys + `step3`/`mapRoute` reword (Step 1); `.route-source-toggle` CSS (Step 4); integration tests incl. invalid-error and toggle-preserves-selection (Step 5).
- Out-of-scope items (multiple custom routes, persistence, post-upload rename, env-var/consent analytics, merge/TCX changes) → not implemented.

**Placeholder scan:** none — every code/test step contains full content and exact commands. README Step 7 includes a `grep` to confirm there are no further brand mentions beyond the title.

**Type consistency:** `route: Route | null` (derived) preserves the type the merge `useMemo`/`MapPreview`/`handleDownload` already consume. `handleCustomRoute(text: string, filename: string): void` matches `FileDrop`'s `onFile` signature. `buildRoute(name: string, gpxXml: string): Route` and `filenameToName(path: string): string` match `src/lib/routes.ts`. `RoutePicker` is called with its existing `{ routes, selected, onSelect }` props (unchanged). The five new i18n keys are added to the `Messages` type before they are used via `t(...)`. The English values asserted in Task 4 Step 2's i18n test (`'Official routes'`, `'Upload your own'`, `'Upload a .gpx route file'`) are exactly the strings the Step 5 App tests query by (`getByRole('button', { name: 'Upload your own' })`, `getByLabelText('Upload a .gpx route file')`).
