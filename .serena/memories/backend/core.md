# Backend layout

- Root: `backend/` Bun workspace — `apps/*`, `packages/*`, `modules/*`.
- Apps: `@anxionos/api` (Elysia composition root), `@anxionos/workers`.
- Each module: `domain/`, `application/`, `infrastructure/`, optional `api/`, `graph/`, `workers/`.
- Key active module example: `backend/modules/orchestration/` — task checkout, leases, heartbeats, webhooks.
- Shared packages: `contracts`, `eventing`, `database`, `observability`, `secrets` under `backend/packages/`.
- Config: `backend/.env.example`; dev routes behind `ENABLE_DEV_ROUTES`.
- Verify: `bun test`, `bun run boundaries`, integration tests under `backend/tests/`.