# AGENTS.md

## Repo Layout
- `server/`: Express/TS API server
- `scripts/`: Build helpers (`flatten-server-dist.js`, `build-static.py`)
- `data/images/`: User-picked exercise images (never commit)
- **Never commit**: `.env*`, `server/.env`, `node_modules/`, `dist/`, `server/dist/`, `data/`, `src/data/exercises.local.js`

## Exercise Program
The real program lives in `src/data/exercises.local.js` (gitignored, never committed). The tracked `src/data/exercises.js` is a loader that uses `exercises.local.js` when present and falls back to a generic sample otherwise. Edit `exercises.local.js` to change the program.

## Exercise Images
Images are user-picked, not hardcoded. Drop an image file into `data/images/` named `<exercise-id>.<ext>` (id from `src/data/exercises.local.js`, e.g. `squat.jpg`, `bench-press.gif`). The server lists them via `GET /api/images` (`{ id: url }`) and serves them at `/api/images/<file>`; the client shows the image when present, otherwise the "No image — click to search" link. Reload the app after adding files.

## Commands
```
npm run dev:all        # Vite (5173) + Express (3000) concurrently
npm run build:all      # Vite build + server TypeScript build
npm run test:run       # Run all tests (Vitest)
npm run test:coverage  # Tests with V8 coverage
npm run lint           # ESLint on src/ only
```

## Architecture

### Config (Server Is Source of Truth)
The client does NOT read config from env vars at build time. Instead, the server exposes `/api/config` (`{ dayMode, dayCount, days, exerciseSwaps, workoutType }`) and the client fetches it at runtime.
- `DAY_MODE=odd-even` → `days: ["Odd", "Even"]`
- `DAY_MODE=numbered` + `DAY_COUNT=3` → `days: ["Day 1", "Day 2", "Day 3"]`
- Server reads only `server/.env` (never committed). `PUT /api/config` persists overrides to `data/config.json` (gitignored), which take precedence over the env values. The in-app Settings page (Settings button on the workout/summary screens) changes day mode / day count, swaps exercises, and lists all workouts.

### App Key (Optional)
- `APP_KEY` in `server/.env` gates the entire API. If it is set, every `/api/*` request must carry a matching `X-App-Key` header (401 on mismatch). If it is empty/unset, the API is open and no key is required.
- On load with no stored key, the client probes `/api/config`: a 401 means a key is required → show the key-gate screen; a 200 means no key is needed → go straight to the workout.
- The key can also be given in the URL path (not a query): `/<base>/<key>/` (e.g. `/exercise/<key>/`). On load the app extracts it (`getKeyFromUrl` in `src/utils/api.js`), stores it in `localStorage` (`exercise-key`), and unlocks.
- The client stores the key in `localStorage` (`exercise-key`) and sends it as the `X-App-Key` header on every request via `apiFetch` in `src/utils/api.js`.
- A 401 from the server shows a "Change key" button that clears the stored key and returns to the gate.

### Day Selection (Automatic + Manual Pulldown)
The default day is derived from the Julian date (day of year) in `src/utils/day.js`:
- `numbered`: `days[(doy - 1) mod N]` — doy divisible by 3 → Day 3
- `odd-even`: odd doy → Odd, even doy → Even

A Day pulldown (bottom row of the workout screen and the summary screen) overrides the auto day for the session (`selectedDay` in `App.jsx`; not persisted). Workout entries are stored per type and day in localStorage (`exercise-entries`: `{ [workoutType]: { [day]: { [exerciseId]: { reps, weights } } } }`), saved on Next/Finish, cleared by "Start over". Legacy stores keyed by day only are auto-migrated under the `dumbbells` type on read. The reps/weight form shows the saved values for the first exercise on mount and after a day/type change (so Next without edits is a no-op); "Back" restores the previous exercise's saved values or resets to defaults. Weights are restricted to 5 lb increments: they are snapped to the nearest multiple of 5 on blur, on save (Next/Finish), and when saved values load (nudge buttons step by ±5). Typing a weight fills the other empty sets only once the value has at least two digits (so partial input doesn't propagate). The config error screen offers a Retry button for non-401 failures.

### Workout Types (Multiple Routines)
Programs live in `src/data/exercises.local.js` as `PROGRAMS: { [typeId]: { name, ODD_EVEN_WORKOUTS, NUMBERED_WORKOUTS } }` (currently `dumbbells` + `hotel`; `hotel` is numbered-only). `src/data/exercises.js` exports `PROGRAMS`, `DEFAULT_TYPE`, `getProgram(typeId)`, and `getDayWorkout(typeId, dayMode, day)`.
- The selected type is persisted in the server config (`workoutType`, default `dumbbells`) and switched via a "Workout" pulldown on the workout, summary, and settings screens (`changeType` in `App.jsx` PUTs just `{ workoutType }`; omitted fields keep their values).
- The type name shows on the workout, summary, and settings screens (derived client-side from `PROGRAMS[type].name`).
- Entries, the `.tab` export, and the Settings "All workouts" list are scoped to the selected type. Images are shared across types (keyed by exercise id). Swaps stay keyed by day name, so a swap only bites when that day + exercise id exist in the selected type.
- The static builder (`scripts/build-static.py`) reads `PROGRAMS` and emits `exercise/index.html` (hub) + one page per routine (`exercise/dumbbells.html`, `exercise/hotel.html`). Each exercise card carries a `.log` line (data-type/data-day/data-ex) that a small inline script fills at load from the browser's `exercise-entries` localStorage: a single value each (the last non-empty set) renders as `Weight 50 · Reps 10` (missing parts omitted; the line stays hidden when the exercise has no entry), so values appear only when the page is opened in a browser that shares the app's localStorage (same origin). `hotel.md`/`routine.md` are human-readable copies, not sources of truth.

### Exercise Swaps (Permanent Replacements)
`exerciseSwaps` in the config is `{ [day]: { [originalExerciseId]: replacementExerciseId } }` — a permanent, server-persisted replacement of one program exercise with another, per day.
- Edited on the Settings page: each exercise row in "All workouts" has a "replace with" dropdown (any other program exercise, `—` for none); Save persists via `PUT /api/config`.
- Applied client-side in `src/utils/swaps.js` (`applySwaps`): the workout screen, entries, images, and the `.tab` export all use the replacement exercise (keyed by its id). Unknown replacement ids fall back to the original.
- Swaps are keyed by day name, so they only apply while that day exists in the current mode (e.g. an "Odd" swap is inert in numbered mode).

### Server Build
`server/package.json` build script runs 2 steps in order:
1. `npx tsc` — TypeScript compilation (rootDir is the repo root, so output nests at `server/dist/server/src/`)
2. `flatten-server-dist.js` — flattens that nested output to `server/dist/` (package main is `dist/index.js`)

## API Quirks
- All `/api/*` endpoints require the `X-App-Key` header matching `APP_KEY` when `APP_KEY` is set (401 on mismatch); when `APP_KEY` is empty the API is open
- Only `/api/admin/ping` uses the `requireAdminKey` middleware (`X-API-Key`); all other write endpoints are gated by the app key alone
- **`/api/config`**: GET returns `{ dayMode, dayCount, days, exerciseSwaps, workoutType }` — client should not hardcode the day list. `workoutType` (default `'dumbbells'`) is the selected workout type; the client resolves its name from `PROGRAMS`. PUT is partial — every field optional (`dayMode?`, `dayCount?`, `exerciseSwaps?`, `workoutType?`); omitted fields keep their current values, provided fields are validated (dayMode `odd-even`|`numbered`, dayCount 1–10, exerciseSwaps `{ [day]: { [exerciseId]: replacementId } }`, workoutType non-empty string) and persisted to `data/config.json`, overriding the env values.
- **`/api/export` / `/api/import`**: Plain-JSON backup of all images (base64, no encryption).

## Dev Server Gotchas
- Dev: Vite proxies `/api` and `/health` to `localhost:3000`
- Dev: Express proxies non-API routes to `localhost:5173` (Vite)
- Production: Express serves `dist/` static files and falls back to `index.html` for SPA routing
- Production port is `$PORT` env var (default 3000), not hardcoded

## Deploy
`deploy/` holds server-side bash scripts (run on the Linux host, not on this Windows dev box):
- `update.sh` — stash/pull, validate `server/.env`, clean, npm install (7-day cooldown, `--force`), `VITE_BASE=/<service>/` build, fix perms, (re)create systemd service + nginx config, certbot, restart
- `verify.sh` — git/node/build/`server/.env`/permissions/nginx/service/disk/SSL/HTTPS checks plus an API key-gate check (401 when `APP_KEY` set, 200 when empty); `--fix` prints fix commands
- `manage_versions.sh` — `add|remove|list` version instances: instance name = directory name (URL-safe), port from `server/.env`, one systemd service per instance
- `exercise-app.service` / `exercise.conf.example` — templates used by `update.sh`
The deploy directory name must match the service name; the frontend is served at `/<name>/`, the API at the domain root.

## Testing
- Vitest 4 + jsdom + testing-library
- Test setup in `src/test/setup.ts` re-mocks `fetch` per test via `beforeEach`
- `globalThis.__TEST_MOCK_DATA__` exposes mock data for test modifications
- ESLint ignores `server/` and `scripts/` — only lints `src/`
