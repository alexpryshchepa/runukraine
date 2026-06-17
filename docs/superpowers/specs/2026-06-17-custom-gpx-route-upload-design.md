# Custom .gpx Route Upload — Design Spec

> ⚠️ **SUPERSEDED** by `docs/superpowers/specs/2026-06-17-replot-rebrand-and-step3-route-toggle-design.md`.
> The "append + auto-select" design below was replaced by an Official ↔ Custom **toggle** in step 3.
> Kept for history; do not implement.

**Date:** 2026-06-17
**Status:** Superseded
**Builds on:** `docs/superpowers/specs/2026-06-15-edit-step-and-export-faq-design.md`

## Goal

In **step 3 (Choose the route)**, let the user upload their own `.gpx` route in addition to
the pre-populated (bundled) routes. The uploaded route behaves like any other route: it is
selectable and flows straight into the step-4 preview, merge, and download.

## UX decisions (settled during brainstorming)

1. **Append + auto-select.** A "Upload your own .gpx route" drop zone sits below the bundled
   route list. On a successful upload the parsed route is appended to the list as a normal
   selectable entry (marked with a "Custom" badge), **auto-selected**, and flows into step 4.
2. **One custom route at a time.** Re-uploading a `.gpx` **replaces** the previous custom
   route (no accumulation, no per-entry remove control).

## Approach

Reuse existing primitives — this is wiring + UI + i18n, not new parsing:

- `FileDrop` is already generic (takes an `accept` prop); reuse it with `accept=".gpx"`.
- `buildRoute(name, gpxXml)` + `parseGpx` + `filenameToName` already turn a GPX file into a
  `Route`. GPX error codes (`gpxInvalidXml`, `gpxTooFewPoints`) already exist and are already
  localized in both `en` and `uk`.

## Data model

- Add an optional flag to `Route`:

  ```ts
  export interface Route {
    name: string;
    points: RoutePoint[];
    cumulative: number[];
    length: number;
    custom?: boolean; // true for a user-uploaded route
  }
  ```

- Custom routes are **not persisted** — privacy-first, in-browser only. They live in React
  state and vanish on reload, matching the rest of the app.

## `src/App.tsx` wiring

- New state: `customRoute: Route | null` (initial `null`).
- The list handed to the picker becomes
  `const allRoutes = customRoute ? [...routes, customRoute] : routes;`
  (custom appended after the sorted bundled routes).
- New handler:

  ```ts
  function handleCustomRoute(text: string, filename: string) {
    try {
      const r: Route = { ...buildRoute(filenameToName(filename), text), custom: true };
      setCustomRoute(r);
      setRoute(r);        // auto-select
      setError(null);
    } catch (e) {
      setError(localizeError(e, t));
    }
  }
  ```

- `handleReplace` (the step-1 reset) also clears `customRoute` so a fresh start clears
  everything, consistent with its existing behavior of resetting `route`.
- The error surfaces in the **existing** top-level error banner (`error ?? mergeError`).

## `src/components/RoutePicker.tsx`

- New prop: `onUpload: (text: string, filename: string) => void`.
- Below the list, render `<FileDrop accept=".gpx" onFile={onUpload} … />` with localized
  title/hint/label.
- The custom entry renders in the same `<ul>` with a small "Custom" badge to distinguish it
  from bundled routes.
- **Robustness fix (in scope):** switch selection state and the React `key` from name-based
  (`selected?.name === r.name`, `key={r.name}`) to **identity-based** (`selected === r`, and a
  key that can't collide, e.g. `${r.custom ? 'custom' : 'bundled'}:${r.name}`). This prevents a
  custom route whose derived name happens to equal a bundled route's name from double-
  highlighting or causing a duplicate React key.

## i18n

Add keys to both `en` and `uk` in `src/i18n/messages.ts`:

- `uploadRouteTitle` — drop-zone heading, e.g. "Upload your own .gpx route" / "Завантажте власний маршрут .gpx".
- `uploadRouteHint` — drop-zone hint, e.g. "or click to browse — nothing leaves your device" / reuse the step-1 hint phrasing.
- `uploadRouteLabel` — accessible name for the hidden file input.
- `customBadge` — "Custom" / "Власний".

(GPX parse-error strings already exist in both languages — no new error keys needed.)

The `Messages` type in `messages.ts` gains the four new keys; the existing `i18n.test.ts`
parity check between `en` and `uk` continues to guard completeness.

## Styling

A small badge style for the custom entry and (if needed) spacing for the upload drop zone in
`src/index.css`, following existing class conventions (`route-*`, `file-drop`).

## Error handling

- Invalid GPX (bad XML / fewer than 2 points) → `buildRoute`/`parseGpx` throws `AppError`,
  caught in `handleCustomRoute`, shown via `localizeError` in the existing error banner. No
  custom route is set; the previously selected route (if any) is untouched.
- All existing error handling (TCX parse, merge) is unchanged.

## Testing (TDD, Vitest + Testing Library)

- **`RoutePicker`**: renders the upload control (drop zone with the localized label); calling
  the file input's change with a file invokes `onUpload`; a route with `custom: true` renders
  with the "Custom" badge; selection uses identity (selecting the custom entry marks only it as
  pressed even if a bundled route shares its name).
- **`App` integration**: uploading a valid `.gpx` in step 3 appends + auto-selects it, and the
  step-4 preview/stats appear; re-uploading replaces the custom entry (still one custom row);
  uploading an invalid `.gpx` shows the localized error and adds no entry.
- **i18n parity** test continues to pass with the new keys present in both languages.
- All existing tests remain green.

## Out of scope (YAGNI)

- Multiple custom routes coexisting.
- Persistence across reloads.
- Editing / renaming a custom route after upload.
- Drag-reordering routes.
- Accepting non-GPX route formats.
