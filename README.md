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
Copy `.env` values from your environment (never committed). Server reads root `.env`:
`PORT`, `DOMAIN`, `SCHEDULE_NAME`, `HIKE_DAYS`, `ADMIN_API_KEY`, `NODE_ENV`, `CORS_ORIGINS`.
