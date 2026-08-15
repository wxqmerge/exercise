# AGENTS.md

## Repo Layout
- `server/`: Express/TS API server
- `shared/types/`: Shared TypeScript interfaces, compiled to JS via `scripts/compile-shared.js`
- `scripts/`: Build helpers (`compile-shared.js`, `patch-shared-imports.js`, `flatten-server-dist.js`)
- **Never commit**: `.env*`, `server/.env`, `node_modules/`, `dist/`, `server/dist/`

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
The client does NOT read config from env vars at build time. Instead, the server exposes `/api/config` (`{ dayMode, days }`) and the client fetches it at runtime.
- `DAY_MODE=odd-even` → `days: ["Odd", "Even"]`
- `DAY_MODE=numbered` + `DAY_COUNT=3` → `days: ["Day 1", "Day 2", "Day 3"]`
Server reads only root `.env` — `server/.env` is ignored (local-only, never committed).

### Day Selection (Automatic)
There is no day-picker screen. The day is derived from the Julian date (day of year) in `src/utils/day.js`:
- `numbered`: `days[(doy - 1) mod N]` — doy divisible by 3 → Day 3
- `odd-even`: odd doy → Odd, even doy → Even

### Shared Types Compilation
`server/package.json` build script runs 4 steps in order:
1. `compile-shared.js` — copies TS to temp dir, compiles with tsc
2. `npx tsc` — TypeScript compilation
3. `patch-shared-imports.js` — adds `.js` extensions to relative imports
4. `flatten-server-dist.js` — flattens nested output

## API Quirks
- Write endpoints (`PUT`, `DELETE`, `POST`) require `X-API-Key` header (see `requireAdminKey` middleware)
- **`/api/config`**: Returns `{ dayMode, days }` — client should not hardcode the day list.

## Dev Server Gotchas
- Dev: Vite proxies `/api` and `/health` to `localhost:3000`
- Dev: Express proxies non-API routes to `localhost:5173` (Vite)
- Production: Express serves `dist/` static files and falls back to `index.html` for SPA routing
- Production port is `$PORT` env var (default 3000), not hardcoded

## Testing
- Vitest 4 + jsdom + testing-library
- Test setup in `src/test/setup.ts` re-mocks `fetch` per test via `beforeEach`
- `globalThis.__TEST_MOCK_DATA__` exposes mock data for test modifications
- ESLint ignores `server/`, `scripts/`, `shared/` — only lints `src/`
