# @anxionos/frontend

Consoles web anxionOS — **Astro 7** + **React 19** + **TypeScript** + **Tailwind CSS 4** + **Better Auth**.

## Stack obrigatória

| Camada | Tecnologia | Notas |
| --- | --- | --- |
| Framework | [Astro](https://astro.build) | Páginas `.astro`, SSG/SSR conforme necessidade |
| Interatividade | `@astrojs/react` | React islands (`client:load`, etc.) |
| Autenticação | [Better Auth](https://better-auth.com) | Cliente em `src/lib/auth-client.ts` |
| Estilo | Tailwind CSS 4 (`@tailwindcss/vite`) | Tokens em `design-system/MASTER.md` e `src/styles/global.css` |
| Linguagem | TypeScript 7.0.2 | `tsconfig.json` na raiz do pacote (`paths` sem `baseUrl`) |

**Proibido** para consoles web deste repositório: Next.js, Vite SPA standalone (sem Astro), React Native.

## Setup

```bash
cp .env.example .env   # opcional
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

## Rotas de autenticação

| Rota | Descrição |
| --- | --- |
| `/` | Landing page institucional |
| `/landing` | Alias → `/` |
| `/login` | Entrar |
| `/register`, `/cadastro` | Criar conta |
| `/forgot-password` | Solicitar recuperação de senha |
| `/reset-password?token=` | Redefinir senha |
| `/verify-email?token=` | Verificar e-mail (auto) ou reenviar |
| `/mfa` | Desafio 2FA após login |
| `/mfa/setup` | Configurar autenticador TOTP |
| `/two-factor` | Alias → `/mfa` |
| `/app` | Owner Console (protegido) |

## Variáveis de ambiente

| Variável | Descrição | Padrão dev |
| --- | --- | --- |
| `PUBLIC_APP_URL` | Origem do frontend | `http://localhost:4321` |
| `PUBLIC_AUTH_BASE_URL` | Base do cliente auth (opcional) | mesma origem + proxy `/api` |

Backend (ver `backend/.env.example`):

| Variável | Descrição |
| --- | --- |
| `BETTER_AUTH_SECRET` | Segredo de sessão |
| `BETTER_AUTH_URL` | URL pública da API (`http://localhost:3000`) |
| `FRONTEND_URL` | Origem confiável CORS (`http://localhost:4321`) |

## Estrutura

```
frontend/
├── astro.config.mjs      # Astro + React + Tailwind + proxy /api
├── design-system/        # MASTER.md + pages/auth.md
├── public/
└── src/
    ├── components/
    │   ├── auth/           # Formulários e AuthGuard
    │   ├── landing/        # Landing page
    │   └── ui/             # Button, Input
    ├── layouts/            # BaseLayout.astro
    ├── lib/                # auth-client, auth-utils
    ├── pages/              # Rotas Astro
    └── styles/global.css   # @theme tokens
```

## Design system

Ver `design-system/MASTER.md`. Overrides de auth em `design-system/pages/auth.md`.

## P07 scope

Owner Console em `/app` com `AuthGuard` (sessão Better Auth). Landing e fluxos de conta completos. Operator, Platform e Partner consoles entram em fases posteriores.
