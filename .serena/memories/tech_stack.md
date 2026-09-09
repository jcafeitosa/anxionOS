# Tech stack

- Runtime: Bun (backend), Node >=22 (frontend Astro).
- Backend: TypeScript, Elysia API, workers, modules in `backend/modules/`.
- Frontend: Astro 7 + React islands + Tailwind 4 + TypeScript.
- Lint/format (backend): Biome. Typecheck: `tsc --build`.
- Tests: `bun test` (backend), Playwright e2e (frontend).
- Python: Graphify `.graphify/.venv`.
- Go: planned `backend/services/`; gopls em `~/go/bin`.

## Serena LSP
- `typescript` — Bun/TS/JS (sem LSP bun separado)
- `python` — Pyright via uvx
- `go` — gopls; path local em `.serena/project.local.yml`