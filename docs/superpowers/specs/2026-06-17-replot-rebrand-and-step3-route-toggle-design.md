# Replot Rebrand, File-name Rename, GA, and Step-3 Route Toggle — Design Spec

**Date:** 2026-06-17
**Status:** Approved (design), pending implementation plan
**Supersedes:** `docs/superpowers/specs/2026-06-17-custom-gpx-route-upload-design.md` and its plan
`docs/superpowers/plans/2026-06-17-custom-gpx-route-upload.md` (the earlier "append + auto-select"
design for custom routes is replaced by the toggle design in section 4).

## Goal

Four independent changes on the redesign branch:

1. Rename the misleading "Activity name" field to "File name" (it only controls the download filename).
2. Rebrand the app from "RunUkraine" to **Replot**.
3. Add Google Analytics (GA4) to the page.
4. In step 3, add an Official ↔ Custom **toggle** so the user can upload their own `.gpx` route to use
   *instead of* the bundled official routes.

Each change is small and self-contained; they share this one spec because they ship together.

---

## 1. Rename "Activity name" → "File name"

The `name` field feeds only `handleDownload` (`${name || 'activity'}.tcx`); it never enters the TCX
content or reaches Strava. So it is a file name, not an activity name. Rename the i18n **keys** (not
just their values) for future clarity.

- `src/i18n/messages.ts` — in the `Messages` type and both tables:
  - rename `activityName` → `fileName`: `'File name'` / `'Назва файлу'`
  - rename `activityNamePlaceholder` → `fileNamePlaceholder`: `'File name'` / `'Назва файлу'`
    (the placeholder mirrors the label, per the product decision)
  - change `step2` value: `'Name it and set the start'` → `'File name and start'` /
    `'Назва файлу та час старту'` (key unchanged)
- `src/components/ActivityEditor.tsx` — use `t('fileName')` and `t('fileNamePlaceholder')`.
- No logic change: `name` / `setName` and `handleDownload` are untouched.

## 2. Rebrand to "Replot"

"RunUkraine" is also a real race-organizer's name; "Replot" describes the action (re-plotting GPS onto
the real route) and removes that confusion. The brand stays Latin-script in both languages.

- `src/App.tsx` — `brand-name` text `'RunUkraine'` → `'Replot'`. `BrandMark` SVG is unchanged.
- `src/i18n/messages.ts`:
  - `htmlTitle` / `title`: `'Replot — track merger'` / `"Replot — об'єднувач треків"`
  - `tagline`: unchanged (`'Track merger'` / `"Об'єднувач треків"`)
  - `lede`: replace the brand mention only — en "RunUkraine paints…" → "Replot paints…"; uk
    "RunUkraine накладає…" → "Replot накладає…". Surrounding copy unchanged.
- `index.html` — `<title>` `"RunUkraine — об'єднувач треків"` → `"Replot — об'єднувач треків"`.
- `package.json` — `"name": "runukraine"` → `"name": "replot"`.
- `README.md` — update the title and the two brand mentions in the prose.
- `disclaimer` (en + uk): **unchanged** — it correctly disclaims affiliation with the RunUkraine race
  organizer, which is still accurate.
- `src/i18n/languageContext.ts` `LANG_STORAGE_KEY` (`'runukraine.lang'`): **unchanged** — it is an
  internal localStorage key; renaming it would silently reset every visitor's saved language for no
  user-visible benefit.

## 3. Google Analytics (GA4, hardcoded)

Add the standard GA4 `gtag.js` async snippet to the `<head>` of `index.html` with the real measurement
ID **`G-8BWSJYMF3K`** inline (no env var, no placeholder). It always loads and tracks page views only.

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

Privacy copy stays accurate: user files never leave the device; GA only sees page navigation. No
behavior change in the React app.

## 4. Step 3 — Official ↔ Custom route toggle

In step 3, a small segmented toggle switches between the bundled **Official routes** list and an
**Upload your own** `.gpx` drop zone. The custom route is used *instead of* the official routes (not
appended to the list). One custom route at a time; re-uploading replaces it. Not persisted (in-browser
React state only), matching the rest of the app.

### State (`src/App.tsx`)

Replace the single `route` state with a mode plus per-source selections; the active route is derived:

```ts
const [routeMode, setRouteMode] = useState<'official' | 'custom'>('official');
const [officialRoute, setOfficialRoute] = useState<Route | null>(null);
const [customRoute, setCustomRoute] = useState<Route | null>(null);
const route = routeMode === 'custom' ? customRoute : officialRoute;
```

- `route` (derived) continues to feed the merge `useMemo`, `MapPreview`, and `handleDownload` unchanged.
- Switching modes preserves both selections (toggling back to Official restores the prior pick).
- `RoutePicker` is wired `selected={officialRoute} onSelect={setOfficialRoute}` (official mode only).
- New `handleCustomRoute(text, filename)`:

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

- `handleReplace` (step-1 reset) also resets the route state:
  `setRouteMode('official'); setOfficialRoute(null); setCustomRoute(null);`

### UI (`src/App.tsx` + a small toggle)

Step 3 keeps its existing render gate (`activity && !startInvalid`). Inside:

- A segmented `RouteSourceToggle` (two `aria-pressed` buttons, `routeSourceOfficial` /
  `routeSourceCustom`) bound to `routeMode` / `setRouteMode`. It can be a tiny inline component in
  `App.tsx` or a small `src/components/RouteSourceToggle.tsx`; implementer's choice, single-purpose
  either way.
- **Official mode:** the existing `<RoutePicker routes={routes} selected={officialRoute}
  onSelect={setOfficialRoute} />` (unchanged — no `onUpload`, no badge, no `custom` flag).
- **Custom mode:**
  - if `customRoute` is null → `<FileDrop accept=".gpx" onFile={handleCustomRoute}
    title={t('uploadRouteTitle')} hint={t('uploadRouteHint')} label={t('uploadRouteLabel')} />`.
  - if `customRoute` is set → a compact loaded card reusing the step-1 `.loaded-card` markup: route
    name + `(X.XX km)` (via `t('units.km')`) and a **Replace** button (`t('replace')`) that calls
    `setCustomRoute(null)` to re-open the drop zone.

### Reuse, not reimplementation

`FileDrop` (already generic via `accept`), `buildRoute`, `filenameToName`, `parseGpx`, and the GPX
error codes (`gpxInvalidXml`, `gpxTooFewPoints`, already localized in en + uk) are all reused. No new
parsing logic and **no new error codes**. The `Route.custom` flag and identity-based selection fix from
the superseded append design are **not** needed here (official and custom never share one list).

### i18n (new keys, en + uk)

Add to the `Messages` type and both tables (the existing `i18n.test.ts` parity check guards them):

| key | en | uk |
|-----|----|----|
| `routeSourceOfficial` | `Official routes` | `Офіційні маршрути` |
| `routeSourceCustom` | `Upload your own` | `Власний файл` |
| `uploadRouteTitle` | `Upload your own .gpx route` | `Завантажте власний маршрут .gpx` |
| `uploadRouteHint` | `or click to browse — nothing leaves your device` | `або натисніть, щоб обрати — нічого не залишає ваш пристрій` |
| `uploadRouteLabel` | `Upload a .gpx route file` | `Завантажте файл маршруту .gpx` |

Also update two existing values whose "official" wording is now inaccurate when a custom route is used
(keys unchanged):

- `step3`: `'Choose the official route'` → `'Choose the route'` / `'Оберіть маршрут'`
- `mapRoute`: `'Official route'` → `'Route'` / `'Маршрут'`

### Styling (`src/index.css`)

A small segmented-toggle style (two buttons, pressed state) following existing class conventions
(`route-*`, `step-*`, button styles). Reuse `.loaded-card` for the custom-route confirmation.

### Error handling

Invalid GPX (bad XML / fewer than 2 points) → `buildRoute`/`parseGpx` throws `AppError`, caught in
`handleCustomRoute`, shown via `localizeError` in the existing top-level error banner. No custom route
is set; the previously selected official route is untouched. TCX and merge error handling unchanged.

### Testing (TDD, Vitest + Testing Library)

- **App integration:** default step 3 shows the official list; clicking the Custom toggle hides the
  list and shows the `.gpx` drop zone; uploading a valid `.gpx` sets the route and step 4
  (preview/stats/download) appears; uploading an invalid `.gpx` shows the localized error and adds no
  route; **Replace** clears the custom route back to the drop zone; toggling back to Official restores
  the previously selected official route.
- **i18n parity** test stays green with the new keys present in both languages.
- All existing tests remain green (RoutePicker is unchanged; ActivityEditor tests update for the renamed
  keys if they assert on label text).

---

## Out of scope (YAGNI)

- Multiple custom routes coexisting, or a list of uploaded routes.
- Persistence of the custom route across reloads.
- Editing / renaming a custom route after upload (beyond Replace).
- Env-var / consent-gated analytics (decided: hardcoded, always-on, page views only).
- Any change to the merge math, TCX writer, or download logic.
