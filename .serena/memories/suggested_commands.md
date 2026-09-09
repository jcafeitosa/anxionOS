# Suggested commands (Darwin)

## Repo root
- `npm run taskboard:ensure` / `taskboard:prework` — board gate
- `npm run graphify:index` / `graphify query "..."` — code graph
- `npm run orchestration:verify` — orchestration smoke
- `npm run frontend:dev` — Astro dev (port 4321)

## Backend (`cd backend`)
- `bun run dev` — API dev server
- `bun test` — all tests
- `bun run lint` / `bun run lint:fix` — Biome
- `bun run typecheck` — TS project refs
- `bun run boundaries` — dependency-cruiser

## Frontend (`cd frontend`)
- `npm run dev` — Astro dev
- `npm run typecheck` — astro check
- `npm run test:e2e` — Playwright

## Taskboard
- `node scripts/taskboard.mjs get ANX-N`
- `node scripts/taskboard.mjs move ANX-N in_progress` (needs taskctl + thread id)