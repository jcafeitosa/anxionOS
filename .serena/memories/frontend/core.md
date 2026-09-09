# Frontend layout

- Astro app at `frontend/` — Owner console shell (P07); proxy `/api` → `localhost:3000`.
- Structure: `src/pages/` (`.astro`), `src/components/` (React islands), `src/layouts/`.
- Stack: Astro 7, React 19, Tailwind 4, Better Auth, Eden client for API.
- Dev: `npm run dev` (or `astro dev --background` per frontend AGENTS.md).
- E2E: Playwright in `frontend/e2e/`.
- Typecheck: `astro check`.
- Design system docs: `docs/design-system/README.md`.