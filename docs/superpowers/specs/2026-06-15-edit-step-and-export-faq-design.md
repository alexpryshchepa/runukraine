# Edit Step + Export FAQ — Design Spec

**Date:** 2026-06-15
**Status:** Approved (design), pending implementation plan
**Builds on:** `docs/superpowers/specs/2026-06-14-runukraine-design.md` (the MVP, branch `feat/runukraine-mvp`)

## Goal

Three changes to the RunUkraine flow:

1. Make step 1 source-agnostic — the uploaded `.tcx` can come from any app, not just Garmin.
2. Add a collapsible FAQ to step 1 explaining how to export a `.tcx` from common tracking apps.
3. Add a new step 2 where the user can edit the activity's **start time** and **name**.

## New step flow

The current flow is ① Upload → ② Pick route → ③ Preview & download. The new flow inserts an edit step:

1. **Upload** your `.tcx` (generic wording + export FAQ)
2. **Edit activity** — start time + name *(new)*
3. **Pick route**
4. **Preview & download**

## Change 1 — generic wording

Remove user-facing "Garmin" references (no logic change):

- `FileDrop` default label: `"Choose your Garmin .tcx file"` → `"Choose a .tcx file"`.
- App step-1 heading: `"1. Your Garmin activity"` → `"1. Your activity file"`.
- App intro line: `"Paint your Garmin telemetry onto..."` → `"Paint your watch's telemetry onto..."`.

## Change 2 — export FAQ (in step 1)

A collapsible block beneath the upload control, implemented with native `<details>`/`<summary>`
elements (accessible, keyboard-friendly, no extra React state). The whole block is collapsed
by default behind a summary like "How do I export a `.tcx` file?". Inside, one `<details>`
entry per app, each containing concrete, current step-by-step export instructions.

Apps covered: **Garmin Connect, Polar Flow, Coros, Suunto, Wahoo, Strava**, plus a final
generic "Other apps" note.

Accuracy requirement (not a placeholder — the implementation must satisfy this):

- Each entry gives the actual current menu path to export a `.tcx`.
- Apps that do **not** export TCX directly (notably **Strava**, which exports GPX/original
  only) must say so explicitly and steer the user to export from the original device app
  instead. Rationale: a GPX from these apps derives distance from the (broken) GPS, so it
  lacks the reliable `DistanceMeters` stream the distance-based merge needs — only a true
  TCX works.

The exact wording for each entry is drafted and verified during the implementation plan.

## Change 3 — edit step (new step 2)

A small controlled form, pre-filled from the uploaded activity, that re-merges live as the
user edits (matching the existing `useMemo` data-flow):

### Start time

- A `datetime-local` input, pre-filled from the activity's first sample timestamp.
- Editing it **shifts every sample's timestamp by the same delta** (newStart − originalStart),
  preserving all gaps between points. Pace, durations, and ordering are unchanged; the whole
  activity simply moves to the new start.
- The input value is interpreted as the user's **local browser time**. On export it is
  serialized to UTC (via `toISOString()` in the existing TCX writer). Strava re-displays the
  time in the activity's local timezone, which it derives from the route's GPS coordinates.

### Name

- A text input, pre-filled from the uploaded filename (without `.tcx`).
- Used **only** to build the download filename (e.g. `Odesa-10K.tcx`). It is **not** written
  into the TCX file (Strava ignores names inside uploaded TCX files anyway — it auto-names
  TCX uploads by time of day). The user renames the activity in Strava after upload if desired.

## Architecture / new units

### `src/lib/editActivity.ts` (pure, unit-tested)

```ts
// shift all sample timestamps so the activity starts at newStart, preserving spacing
export function shiftActivityStart(activity: GarminActivity, newStart: Date): GarminActivity;

// format a Date as a datetime-local input value ("YYYY-MM-DDTHH:mm") in LOCAL time
export function dateToLocalInput(d: Date): string;

// parse a datetime-local input value as a LOCAL-time Date
export function localInputToDate(value: string): Date;
```

- `shiftActivityStart`: `delta = newStart - activity.samples[0].time`; returns a new
  `GarminActivity` with each sample's `time` advanced by `delta` and all other fields
  unchanged. If `samples` is empty, returns the activity unchanged.
- `localInputToDate(value)` returns `new Date(value)` (a `datetime-local` string without a
  timezone is parsed as local time). Returns an `Invalid Date` for empty/garbage input;
  callers guard against that.

### Components

- `src/components/ExportFaq.tsx` — static `<details>` list (no props).
- `src/components/ActivityEditor.tsx` — controlled form. Props:
  `{ name: string; startInput: string; onNameChange(v: string): void; onStartChange(v: string): void }`.
  Renders a labeled `datetime-local` field and a labeled text field.

### `src/App.tsx` wiring

- New state: `name: string`, `startInput: string`.
- On successful file load (`handleFile`): set `name` from the filename and
  `startInput = dateToLocalInput(activity.samples[0].time)`.
- Compute `editedActivity` (useMemo): if `activity` and `startInput` parses to a valid Date,
  `shiftActivityStart(activity, localInputToDate(startInput))`, else fall back to `activity`.
- The merge consumes `editedActivity` instead of the raw `activity`.
- Download filename derives from `name` (sanitized: spaces → dashes), keeping the `.tcx` output.
- Render order: step 1 (upload + `ExportFaq`), step 2 (`ActivityEditor`, shown once an activity
  is loaded), step 3 (`RoutePicker`), step 4 (preview + download). Steps renumbered in headings.

## Error handling

- Invalid/empty `startInput` → fall back to the original activity start (no crash, no shift).
- Empty activity → `shiftActivityStart` returns it unchanged.
- All existing error handling (parse errors, merge errors) is unchanged.

## Testing

- `shiftActivityStart`: shifting forward and backward moves the first sample to `newStart`,
  preserves inter-sample gaps, preserves HR/cadence/distance/altitude, and handles the
  empty-samples case. (Vitest, TDD.)
- `dateToLocalInput` / `localInputToDate`: round-trip a known local Date → string → Date.
- `ExportFaq`: renders a `<summary>` per covered app.
- `ActivityEditor`: pre-fills both fields from props and fires `onNameChange`/`onStartChange`.
- The existing 34 tests remain green.

## Out of scope

- GPX output / writing the name into the file.
- Editing any other activity fields (sport, per-sample edits, trimming).
- Accepting non-TCX input formats.
