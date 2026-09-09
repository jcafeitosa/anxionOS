# Tech stack

- Runtime: Bun (backend), Node >=22 (frontend Astro).
- Backend: TypeScript, Elysia API (`backend/apps/api`), workers (`backend/apps/workers`), 23 planned modules in `backend/modules/`.
- Frontend: Astro 7 + React islands + Tailwind 4 + TypeScript; Better Auth client.
- Data (planned/accepted): PostgreSQL + TimescaleDB + pgvector (transactions/series), Neo4j (institutional graph).
- Validation: Zod; ORM preference Drizzle; auth Better Auth; OpenAPI via Scalar/Elysia.
- Lint/format (backend): Biome. Typecheck: `tsc --build` in backend.
- Tests: `bun test` (backend), Playwright e2e (frontend), node:test for orchestration scripts.
- Python: Graphify venv at `.graphify/.venv` (indexing only, not app runtime).