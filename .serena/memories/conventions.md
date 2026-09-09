# Code conventions

- Zero tolerance: no TODO/FIXME without `ANX-*`, no stubs/mocks in production paths, no silent catch, no hardcoded secrets/tenant ids.
- Backend modules: public API via `index.ts`; `application` uses domain ports only — never imports `infrastructure` or Drizzle from application layer.
- Cross-module: contracts/events/SDK only; no private repo imports across modules.
- State pattern: journal + outbox atomic per domain; graph projections from events.
- Frontend: Astro pages + React islands only (no Next/Vite SPA); design tokens in `frontend/design-system/`.
- Commits/PRs: must reference `ANX-*` issue; `done` only with explicit user acceptance.
- Language: user-facing docs/chat PT-BR; code identifiers English.
- Exploration order: graphify/code-review-graph → Serena symbols → targeted file reads.