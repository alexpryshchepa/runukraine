# Custom .gpx Route Upload Implementation Plan

> ⚠️ **SUPERSEDED** by the step-3 toggle design
> (`docs/superpowers/specs/2026-06-17-replot-rebrand-and-step3-route-toggle-design.md`). Kept for
> history; do not implement.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In step 3, let the user upload their own `.gpx` route alongside the bundled routes; the uploaded route is appended to the list, auto-selected, and flows into the step-4 preview/merge/download.

**Architecture:** Reuse existing primitives — `FileDrop` (already generic via its `accept` prop), and `buildRoute` + `parseGpx` + `filenameToName` (already turn GPX XML into a `Route`). Add a `custom?` flag to `Route`, hold a single `customRoute` in `App` state (re-upload replaces it), append it to the picker list, and add an upload drop zone + "Custom" badge to `RoutePicker`. No new parsing logic.

**Tech Stack:** React + TypeScript, Vite, Vitest + @testing-library/react (jsdom). i18n via a small `translate`/`useT` layer with `en` + `uk` string tables.

## Global Constraints

- **Privacy:** custom routes are NOT persisted (in-browser only, React state) — they vanish on reload, like the rest of the app.
- **One custom route at a time:** re-uploading a `.gpx` replaces the previous custom route. No accumulation, no per-entry remove control.
- **i18n parity:** every user-facing string must exist in BOTH `en` and `uk`. The `Messages` type in `src/i18n/messages.ts` enforces this at compile time — adding a key to the type requires adding it to both tables.
- **Reuse, don't reimplement:** use `FileDrop` (with `accept=".gpx"`), `buildRoute`, `filenameToName`, `parseGpx`. The GPX error codes (`gpxInvalidXml`, `gpxTooFewPoints`) already exist and are already localized — do NOT add new error codes.
- **Process:** TDD (failing test first), frequent commits, one deliverable per task.
- **Commands:** run the full test suite with `npm test` (alias for `vitest run`); run one file with `npx vitest run <path>`; typecheck with `npx tsc -b`; lint with `npm run lint`.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/i18n/messages.ts` | Add 4 user-facing strings (`en` + `uk`) and their `Messages` type entries | Modify |
| `src/i18n/i18n.test.ts` | Assert the new strings resolve in both languages | Modify |
| `src/types.ts` | Add optional `custom?: boolean` to `Route` | Modify |
| `src/components/RoutePicker.tsx` | Identity-based selection/keys; render "Custom" badge; render an `accept=".gpx"` upload drop zone via an optional `onUpload` prop | Modify |
| `src/components/RoutePicker.test.tsx` | Tests for badge, upload control, identity selection | Modify |
| `src/index.css` | `.route-badge` style + spacing for the upload drop zone | Modify |
| `src/App.tsx` | `customRoute` state, `allRoutes`, `handleCustomRoute`, wire `onUpload`, clear on replace | Modify |
| `src/App.test.tsx` | Integration tests: append+auto-select+preview, replace, invalid-error | Modify |

---

## Task 1: i18n strings for the GPX uploader

**Files:**
- Modify: `src/i18n/messages.ts`
- Test: `src/i18n/i18n.test.ts`

**Interfaces:**
- Consumes: existing `translate(lang, key)` from `src/i18n/i18n.ts`.
- Produces: four resolvable keys — `uploadRouteTitle`, `uploadRouteHint`, `uploadRouteLabel`, `customBadge` — present in both `en` and `uk`. Exact English values used by later tasks' tests:
  - `uploadRouteTitle` → `Upload your own .gpx route`
  - `uploadRouteHint` → `or click to browse — nothing leaves your device`
  - `uploadRouteLabel` → `Upload a .gpx route file`
  - `customBadge` → `Custom`

- [ ] **Step 1: Write the failing test**

Add this `it` block inside the existing `describe('translate', ...)` in `src/i18n/i18n.test.ts`:

```ts
  it('provides the custom-route upload strings in both languages', () => {
    expect(translate('en', 'customBadge')).toBe('Custom');
    expect(translate('uk', 'customBadge')).toBe('Власний');
    expect(translate('en', 'uploadRouteTitle')).toBe('Upload your own .gpx route');
    expect(translate('uk', 'uploadRouteTitle')).toBe('Завантажте власний маршрут .gpx');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/i18n/i18n.test.ts`
Expected: FAIL — `translate('en', 'customBadge')` returns the key `'customBadge'` (fallback), not `'Custom'`.

- [ ] **Step 3: Add the keys to the `Messages` type**

In `src/i18n/messages.ts`, add these four lines to the `Messages` type (e.g. right after `replace: string;`):

```ts
  uploadRouteTitle: string;
  uploadRouteHint: string;
  uploadRouteLabel: string;
  customBadge: string;
```

- [ ] **Step 4: Add the English values**

In the `en: Messages = { ... }` object, add (e.g. right after `replace: 'Replace',`):

```ts
  uploadRouteTitle: 'Upload your own .gpx route',
  uploadRouteHint: 'or click to browse — nothing leaves your device',
  uploadRouteLabel: 'Upload a .gpx route file',
  customBadge: 'Custom',
```

(The em dash `—` in `uploadRouteHint` matches the existing `dropHint` string — copy it exactly.)

- [ ] **Step 5: Add the Ukrainian values**

In the `uk: Messages = { ... }` object, add (e.g. right after `replace: 'Замінити',`):

```ts
  uploadRouteTitle: 'Завантажте власний маршрут .gpx',
  uploadRouteHint: 'або натисніть, щоб обрати — нічого не залишає ваш пристрій',
  uploadRouteLabel: 'Завантажте файл маршруту .gpx',
  customBadge: 'Власний',
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/i18n/i18n.test.ts`
Expected: PASS (all `translate` tests, including the new one).

- [ ] **Step 7: Commit**

```bash
git add src/i18n/messages.ts src/i18n/i18n.test.ts
git commit -m "i18n: add custom .gpx route upload strings (en/uk)"
```

---

## Task 2: RoutePicker — custom badge, identity selection, upload drop zone

**Files:**
- Modify: `src/types.ts`
- Modify: `src/components/RoutePicker.tsx`
- Modify: `src/index.css`
- Test: `src/components/RoutePicker.test.tsx`

**Interfaces:**
- Consumes: `FileDrop` from `./FileDrop` (props `{ onFile, accept?, label?, title?, hint? }`), `useT` from `../i18n/languageContext`, the i18n keys from Task 1.
- Produces: `RoutePicker` with a new optional prop `onUpload?: (text: string, filename: string) => void`. When provided, renders `<FileDrop accept=".gpx" onFile={onUpload} … />` below the list. Selection and React keys are identity/flag-based. `Route` now has `custom?: boolean`.

- [ ] **Step 1: Add `custom?` to the `Route` type**

In `src/types.ts`, add the field to the `Route` interface:

```ts
export interface Route {
  name: string;
  points: RoutePoint[];
  cumulative: number[]; // cumulative arc-length per point, meters
  length: number; // total route length, meters
  custom?: boolean; // true for a user-uploaded route (not persisted)
}
```

- [ ] **Step 2: Write the failing tests**

Replace the entire contents of `src/components/RoutePicker.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoutePicker } from './RoutePicker';
import type { Route } from '../types';

const routes: Route[] = [
  { name: 'Kyiv 10K', points: [{ lat: 0, lon: 0 }, { lat: 0, lon: 1 }], cumulative: [0, 1000], length: 10000 },
];

describe('RoutePicker', () => {
  it('lists routes with their distance and fires onSelect', () => {
    const onSelect = vi.fn();
    render(<RoutePicker routes={routes} selected={null} onSelect={onSelect} />);
    const button = screen.getByRole('button', { name: /Kyiv 10K/ });
    expect(button).toHaveTextContent('10.00 km');
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith(routes[0]);
  });

  it('shows a hint when there are no routes', () => {
    render(<RoutePicker routes={[]} selected={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/no routes available/i)).toBeInTheDocument();
  });

  it('marks a custom route with a badge', () => {
    const custom: Route = { ...routes[0], name: 'My Route', custom: true };
    render(<RoutePicker routes={[custom]} selected={null} onSelect={vi.fn()} />);
    const button = screen.getByRole('button', { name: /My Route/ });
    expect(button).toHaveTextContent('Custom');
  });

  it('renders an upload control and fires onUpload with the file text and name', async () => {
    const onUpload = vi.fn();
    render(<RoutePicker routes={routes} selected={null} onSelect={vi.fn()} onUpload={onUpload} />);
    const input = screen.getByLabelText('Upload a .gpx route file') as HTMLInputElement;
    const file = new File(['<gpx/>'], 'loop.gpx', { type: 'application/xml' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith('<gpx/>', 'loop.gpx'));
  });

  it('selects by identity so a custom route sharing a bundled name does not double-highlight', () => {
    const bundled: Route = { ...routes[0], name: 'Shared Name' };
    const custom: Route = { ...routes[0], name: 'Shared Name', custom: true };
    render(<RoutePicker routes={[bundled, custom]} selected={custom} onSelect={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'false'); // bundled
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'true'); // custom (selected)
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/components/RoutePicker.test.tsx`
Expected: FAIL — the badge, upload-control, and identity tests fail (no `onUpload`, no badge, name-based selection).

- [ ] **Step 4: Rewrite RoutePicker**

Replace the entire contents of `src/components/RoutePicker.tsx` with:

```tsx
import type { Route } from '../types';
import { useT } from '../i18n/languageContext';
import { FileDrop } from './FileDrop';

export function RoutePicker({
  routes,
  selected,
  onSelect,
  onUpload,
}: {
  routes: Route[];
  selected: Route | null;
  onSelect: (route: Route) => void;
  /** When provided, renders a .gpx upload drop zone below the list. */
  onUpload?: (text: string, filename: string) => void;
}) {
  const t = useT();
  return (
    <>
      {routes.length === 0 ? (
        <p>{t('noRoutes')}</p>
      ) : (
        <ul className="route-picker">
          {routes.map((r) => (
            <li key={`${r.custom ? 'custom' : 'bundled'}:${r.name}`}>
              <button type="button" aria-pressed={selected === r} onClick={() => onSelect(r)}>
                <span className="route-name">
                  <span className="route-dot" aria-hidden="true" />
                  <span className="route-label">{r.name}</span>
                  {r.custom && <span className="route-badge">{t('customBadge')}</span>}
                </span>
                <span className="route-km">
                  {(r.length / 1000).toFixed(2)} {t('units.km')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {onUpload && (
        <FileDrop
          accept=".gpx"
          onFile={onUpload}
          label={t('uploadRouteLabel')}
          title={t('uploadRouteTitle')}
          hint={t('uploadRouteHint')}
        />
      )}
    </>
  );
}
```

- [ ] **Step 5: Add the badge + spacing styles**

In `src/index.css`, immediately after the `.route-km` / `.route-picker button[aria-pressed='true'] .route-km { ... }` block (around line 454), add:

```css
.route-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(92, 160, 242, 0.16);
  color: var(--blue);
  flex-shrink: 0;
}
.route-picker + .file-drop {
  margin-top: 14px;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/RoutePicker.test.tsx`
Expected: PASS (all five tests).

- [ ] **Step 7: Typecheck**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/types.ts src/components/RoutePicker.tsx src/components/RoutePicker.test.tsx src/index.css
git commit -m "feat: RoutePicker supports custom routes and .gpx upload"
```

---

## Task 3: App wiring — upload, append, auto-select, replace

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `buildRoute`, `filenameToName` from `./lib/routes`; `RoutePicker`'s `onUpload` prop (Task 2); `localizeError` (already imported).
- Produces: end-to-end behavior — a valid `.gpx` uploaded in step 3 becomes a selected `custom` route feeding step 4; an invalid `.gpx` shows the localized error and adds no route; re-upload replaces the single custom route.

- [ ] **Step 1: Write the failing integration tests**

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

const tcx = `<?xml version="1.0"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
  <Activities><Activity Sport="Running"><Lap><Track>
    <Trackpoint><Time>2026-06-01T08:00:00Z</Time><DistanceMeters>0</DistanceMeters></Trackpoint>
    <Trackpoint><Time>2026-06-01T08:00:30Z</Time><DistanceMeters>100</DistanceMeters></Trackpoint>
  </Track></Lap></Activity></Activities>
</TrainingCenterDatabase>`;

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

function loadActivity() {
  fireEvent.change(screen.getByLabelText('Choose a .tcx file'), {
    target: { files: [new File([tcx], 'my-run.tcx', { type: 'application/xml' })] },
  });
  return screen.findByText('2 points loaded');
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

describe('custom .gpx route upload', () => {
  it('appends and auto-selects an uploaded route, then shows the preview', async () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /EN/i }));
    await loadActivity();

    fireEvent.change(screen.getByLabelText('Upload a .gpx route file'), {
      target: { files: [new File([gpx], 'evening-loop.gpx', { type: 'application/xml' })] },
    });

    const customBtn = await screen.findByRole('button', { name: /Evening Loop/ });
    expect(customBtn).toHaveAttribute('aria-pressed', 'true');
    expect(customBtn).toHaveTextContent('Custom');
    expect(await screen.findByText('Preview and download')).toBeInTheDocument();
  });

  it('replaces the custom route when another .gpx is uploaded', async () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /EN/i }));
    await loadActivity();

    const gpxInput = screen.getByLabelText('Upload a .gpx route file');
    fireEvent.change(gpxInput, { target: { files: [new File([gpx], 'evening-loop.gpx')] } });
    await screen.findByRole('button', { name: /Evening Loop/ });

    fireEvent.change(gpxInput, { target: { files: [new File([gpx2], 'morning-dash.gpx')] } });
    await screen.findByRole('button', { name: /Morning Dash/ });

    expect(screen.queryByRole('button', { name: /Evening Loop/ })).not.toBeInTheDocument();
  });

  it('shows a localized error and adds no entry for an invalid .gpx', async () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /EN/i }));
    await loadActivity();

    fireEvent.change(screen.getByLabelText('Upload a .gpx route file'), {
      target: { files: [new File(['not gpx <<<'], 'broken.gpx')] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(/as GPX/i);
    expect(screen.queryByRole('button', { name: /Broken/ })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — `getByLabelText('Upload a .gpx route file')` finds no input (App does not yet pass `onUpload` to `RoutePicker`).

- [ ] **Step 3: Import the route builders**

In `src/App.tsx`, change the routes import (line 3):

```ts
import { buildRoute, filenameToName, loadBundledRoutes } from './lib/routes';
```

- [ ] **Step 4: Add `customRoute` state**

In `src/App.tsx`, immediately after `const [route, setRoute] = useState<Route | null>(null);` add:

```ts
  const [customRoute, setCustomRoute] = useState<Route | null>(null);
```

- [ ] **Step 5: Clear the custom route on replace**

In `handleReplace`, add a line so a fresh start clears the custom route too:

```ts
  function handleReplace() {
    setActivity(null);
    setRoute(null);
    setCustomRoute(null);
    setFileName('');
    setName('activity');
    setStartInput('');
    setError(null);
  }
```

- [ ] **Step 6: Add the upload handler**

In `src/App.tsx`, add this function immediately after `handleReplace`:

```ts
  function handleCustomRoute(text: string, filename: string) {
    try {
      const r: Route = { ...buildRoute(filenameToName(filename), text), custom: true };
      setCustomRoute(r);
      setRoute(r); // auto-select the uploaded route
      setError(null);
    } catch (e) {
      setError(localizeError(e, t));
    }
  }
```

- [ ] **Step 7: Compute the combined route list**

In `src/App.tsx`, add this line immediately after `const stats = merged ? computeStats(merged.samples) : null;`:

```ts
  const allRoutes = customRoute ? [...routes, customRoute] : routes;
```

- [ ] **Step 8: Wire the picker**

In `src/App.tsx`, replace the existing `<RoutePicker ... />` usage with:

```tsx
            <RoutePicker
              routes={allRoutes}
              selected={route}
              onSelect={setRoute}
              onUpload={handleCustomRoute}
            />
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS (localization tests + the three custom-upload tests).

- [ ] **Step 10: Run the full suite + typecheck**

Run: `npm test && npx tsc -b`
Expected: all tests green, no type errors.

- [ ] **Step 11: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: upload a custom .gpx route in step 3"
```

---

## Self-Review

**Spec coverage:**
- Append + auto-select → Task 3 (Steps 6–8) + App test "appends and auto-selects".
- One custom route, re-upload replaces → single `customRoute` state (Task 3) + App test "replaces the custom route".
- Reuse `FileDrop`/`buildRoute`/`filenameToName`/`parseGpx`, existing GPX error codes → Task 2 (FileDrop with `accept=".gpx"`), Task 3 (`buildRoute`/`filenameToName`); no new error codes added.
- `Route.custom` flag, not persisted → Task 2 Step 1 (type), Task 3 (state only, no storage).
- Identity-based selection/keys robustness fix → Task 2 (RoutePicker rewrite) + test "selects by identity".
- "Custom" badge → Task 2 (badge render + `.route-badge` CSS) + test "marks a custom route with a badge".
- 4 i18n keys in en + uk → Task 1 (+ `Messages` type enforces parity) + i18n test.
- Error surfaces in existing banner → Task 3 `handleCustomRoute` catch → `setError`; App test "shows a localized error".
- Tests at picker + App level, existing tests stay green → Tasks 2 & 3 preserve the original RoutePicker/App localization tests verbatim.

**Placeholder scan:** none — every code/test step contains full content and exact commands.

**Type consistency:** `onUpload?: (text: string, filename: string) => void` matches `FileDrop`'s `onFile` signature and `handleCustomRoute`'s signature. `buildRoute(name, gpxXml): Route` and `filenameToName(path): string` match `src/lib/routes.ts`. `custom?: boolean` is the single new `Route` field used in the picker key/badge and the App handler. The English i18n values asserted in Task 1's test (`'Custom'`, `'Upload a .gpx route file'`, `'Upload your own .gpx route'`) are exactly the strings the Task 2/3 tests query by (`/Custom/` badge text, `getByLabelText('Upload a .gpx route file')`).

**Out of scope (unchanged):** multiple custom routes, persistence, post-upload rename/edit, drag-reorder, non-GPX formats.
