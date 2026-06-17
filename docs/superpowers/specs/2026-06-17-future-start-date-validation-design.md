# Future Start-Date Validation — Design Spec

**Date:** 2026-06-17
**Status:** Approved (design), pending implementation plan
**Builds on:** `docs/superpowers/specs/2026-06-15-edit-step-and-export-faq-design.md` (the edit step that introduced the start-time field)

## Goal

Prevent the user from producing an activity whose start time is in the future. The start-time
field in step 2 (`ActivityEditor`) is validated against the current moment:

- When the chosen start time is **after now**, highlight the field with a danger pale-red style,
  show a short localized error message beneath it, and **hide the downstream steps** (route
  picker and preview/download).
- As soon as the user changes it back to a non-future time, the steps reappear.

## What counts as "in the future"

Only the **start time** itself. The check is `chosenStart > now`. The activity's end time is
intentionally **not** considered (decided during brainstorming — matches the literal "start date
field" wording and keeps the rule predictable).

Edge cases:

- Empty / cleared / unparseable field → **not** future (returns `false`). This preserves the
  existing fall-back-to-original behavior and is out of scope for this change.
- Exactly equal to now → not future (strict `>`).

## Architecture / changes

### `src/lib/editActivity.ts` (pure, unit-tested) — new function

```ts
// true only when `value` parses to a valid datetime-local that is strictly after `now`
export function isStartInFuture(value: string, now: Date): boolean;
```

Implementation: parse with the existing `localInputToDate(value)`; if `Number.isNaN(d.getTime())`
return `false`; otherwise return `d.getTime() > now.getTime()`. `now` is injected (not read from
`Date.now()` inside) so the function is deterministically unit-testable.

### `src/components/ActivityEditor.tsx` — new props

Add `{ startInvalid: boolean; startError: string }`. When `startInvalid`:

- The start-time `<input>` gets an additional `input-danger` class.
- A `<p className="field-error" role="alert">{startError}</p>` is rendered directly beneath the
  start-time field.

The component stays presentational — it receives the validity verdict and message, it does not
compute them. Name field is unaffected.

### `src/App.tsx` — wiring

- Compute `const startInFuture = isStartInFuture(startInput, new Date());` during render.
- Pass `startInvalid={startInFuture}` and `startError={t('futureStartError')}` to `ActivityEditor`.
- Gate **step 3** on `activity && !startInFuture`.
- Gate **step 4** additionally on `!startInFuture` (alongside the existing `merged && stats`).

No change to `editedActivity` / merge logic — a future start still merges fine internally; we
simply don't surface the downstream steps while the field is invalid.

### `src/index.css` — new styles

- `.activity-editor input.input-danger` — pale red background + red border (and matching focus
  ring), consistent with the existing input styling.
- `.field-error` — small red helper text under the field.

### `src/i18n/messages.ts` — new key

Add `futureStartError` to both `en` and `uk`:

- `en`: "Start time can't be in the future."
- `uk`: "Час початку не може бути в майбутньому."

(Final wording confirmed during the implementation plan; both locales must be present — the
`i18n.test.ts` parity test enforces that every key exists in every language.)

## Error handling

- Invalid/empty `startInput` → `isStartInFuture` returns `false`; field is not flagged and steps
  show as today.
- All existing error handling (parse errors, merge errors, the top-level error banner) is
  unchanged. The future-date message is a field-level message, separate from the existing banner.

## Testing (TDD)

- `isStartInFuture` (`editActivity.test.ts`): future → `true`; past → `false`; empty/garbage →
  `false`; exactly-now → `false`. Uses a fixed injected `now`.
- `App.test.tsx`: load an activity, set a future start time → step 3 (route picker) is not in the
  document and the start field carries the danger class / shows the message; then set a past time
  → step 3 reappears.
- All existing tests remain green.

## Out of scope

- Validating the activity end time or duration.
- Any handling of empty/invalid (non-future) input beyond current behavior.
- Auto-correcting or clamping the date — the user fixes it themselves.
- Changes to the TCX writer or merge.
