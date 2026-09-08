# @anxionos/frontend

Consoles web anxionOS — **Astro 7** + **React 19** + **TypeScript** + **Tailwind CSS 4**.

## Stack obrigatória

| Camada | Tecnologia | Notas |
| --- | --- | --- |
| Framework | [Astro](https://astro.build) | Páginas `.astro`, SSG/SSR conforme necessidade |
| Interatividade | `@astrojs/react` | React islands (`client:load`, etc.) |
| Estilo | Tailwind CSS 4 (`@tailwindcss/vite`) | Tokens em `design-system/MASTER.md` e `src/styles/global.css` |
| Linguagem | TypeScript | `tsconfig.json` na raiz do pacote |

**Proibido** para consoles web deste repositório: Next.js, Vite SPA standalone (sem Astro), React Native.

## Setup

```bash
npm install
npm run dev          # http://localhost:4321
npm run build
npm run preview
```

Da raiz do monorepo:

```bash
npm run frontend:dev
npm run frontend:build
```

## API proxy (dev)

`astro.config.mjs` encaminha `/api` → `http://localhost:3000`. Suba o backend:

```bash
cd ../backend && bun run dev
```

## Estrutura

```
frontend/
├── astro.config.mjs      # Astro + React + Tailwind + proxy /api
├── design-system/        # MASTER.md (tokens ui-ux-pro-max)
├── public/
└── src/
    ├── components/       # React islands (OwnerShell, etc.)
    ├── pages/            # Rotas Astro (.astro)
    └── styles/global.css # @theme tokens
```

## Design system

Ver `design-system/MASTER.md`. Overrides por página em `design-system/pages/`.

## P07 scope

Owner Console — Company Dashboard shell com placeholders (empresa, C-level agents, connections). Operator, Platform e Partner consoles entram em fases posteriores.
