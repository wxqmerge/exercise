# exercise-app

React 19 + Vite 8 + Tailwind CSS 4 frontend with an Express/TypeScript API server.

## Stack
- Vite 8, React 19, react-router-dom 7
- Tailwind CSS 4 (via `@tailwindcss/postcss`)
- ESLint 9 (flat config), Vitest 4 + jsdom + Testing Library
- Express 4 + TypeScript (server/), shared types in `shared/types/`

## Getting Started
```
npm install
cd server && npm install && cd ..
npm run dev:all
```

- Vite dev server: http://localhost:5173
- API server: http://localhost:3000 (`/health`, `/api/config`)

## Scripts
| Script | Description |
| --- | --- |
| `npm run dev:all` | Vite + Express concurrently |
| `npm run build:all` | Build client + server |
| `npm run test:run` | Run tests |
| `npm run lint` | ESLint |

## Environment
Copy `.env` values from your environment (never committed). Server reads `server/.env`:
`PORT`, `DOMAIN`, `APP_KEY`, `DAY_MODE`, `DAY_COUNT`, `ADMIN_API_KEY`, `NODE_ENV`, `CORS_ORIGINS`.

- `APP_KEY` is optional. When set, the API requires it on every request and the app asks for this key on first load (stored in browser localStorage). When empty, the API is open and the app loads without a key.

- `DAY_MODE=odd-even` → workout day is Odd / Even by day-of-year parity
- `DAY_MODE=numbered` + `DAY_COUNT=3` → workout day is Day 1 / Day 2 / Day 3 by day of year
- The in-app **Settings** page (Settings button on the workout screen) can change the day mode / day count at runtime; the choice is saved to `data/config.json` on the server and overrides the env values. It also lists all workouts.

## How it works
1. The day is picked automatically from the Julian date (day of year): `Day 1/2/3` cycles, with days divisible by 3 → Day 3 (odd/even mode uses day parity)
2. Each exercise shows its image, or a "No image — click to search" link (Google image search)

### Adding an exercise image
Two ways:
1. **Paste a link in the app** — on an exercise without an image, paste the image URL and hit Save. The server downloads it into `data/images/`.
2. **Import a file** — click the small **Import** button and pick an image from your device; it is uploaded to the server.
3. **Drop a file** — save any image (jpg/png/gif) into `data/images/` named after the exercise id from `src/data/exercises.local.js` (e.g. `data/images/goblet-squat.jpg`). Reload the app — it appears automatically.
4. Enter reps (3 sets) and weight per set, use the ‹ › arrows to move between exercises
5. Summary screen lists all exercises with reps/weight and total volume
6. **Backup** — the Export button downloads `exercise-backup.json` (all images); Import restores it on this or another server
