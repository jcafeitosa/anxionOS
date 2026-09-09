# anxionOS — core

- Monorepo: `backend/` (Bun workspaces), `frontend/` (Astro), `scripts/`, `.cursor/orchestration/` (agent tooling), `docs/` (public), `brain/` (local OKF, gitignored).
- Product: multi-tenant autonomous investment platform governed by institutional graph (agents, capital, strategies, audit).
- Agent gates: read `AGENTS.md` → `npm run taskboard:ensure` + claim `ANX-*` → graphify before mass exploration → execute issue scope only.
- Canonical backend layout: ADR0002 modular monolith under `backend/modules/*` with `domain` → `application` → `infrastructure`; apps in `backend/apps/` compose runtimes.
- Cross-cutting tooling: Graphify (`.graphify/out/`), Archify (`.archify/specs/`), Dashi taskboard (`http://127.0.0.1:47823`).
- Deeper refs: stack `mem:tech_stack`; commands `mem:suggested_commands`; style `mem:conventions`; done-checklist `mem:task_completion`; backend `mem:backend/core`; frontend `mem:frontend/core`.