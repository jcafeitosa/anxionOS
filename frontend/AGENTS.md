## Development

When starting the dev server, use background mode:

```
astro dev --background
```

If login/register islands stay disabled (Vite `504 Outdated Optimize Dep` on `lucide-react` / `better-auth/react` / `zod`), wipe the optimizer cache and restart — do not reuse a stale `frontend:dev` for Playwright:

```
rm -rf node_modules/.vite
npm run dev -- --host 127.0.0.1 --port 4321
```

`npm run test:e2e` starts the frontend via `e2e/scripts/start-frontend-e2e.mjs` (clears `.vite`). Reuse an already-running UI only with `E2E_REUSE_FRONTEND=1` after that restart.

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
