# @anxionos/frontend

Consoles web anxionOS — **Astro 7** + **React 19** + **TypeScript 7** + **Tailwind CSS 4**.

## Stack obrigatória

| Camada | Tecnologia | Notas |
| --- | --- | --- |
| Framework | [Astro](https://astro.build) | Páginas `.astro`, SSG/SSR conforme necessidade |
| Interatividade | `@astrojs/react` | React islands (`client:load`, etc.) |
| Estilo | Tailwind CSS 4 (`@tailwindcss/vite`) | Tokens em [design-system](../../frontend/design-system/MASTER.md) e `src/styles/global.css` |
| Linguagem | TypeScript 7.0.2 | `tsconfig.json` na raiz do pacote (`paths` sem `baseUrl`) |

**Proibido** para consoles web deste repositório: Next.js, Vite SPA standalone (sem Astro), React Native.

## Setup

```bash
npm install
npm run dev          # http://localhost:4321
npm run build
npm run preview
```

Se o botão **Entrar** / **Criar conta** ficar `disabled` no dev (ilhas sem hidratar) e o browser mostrar `504 Outdated Optimize Dep`, limpe o cache do Vite e suba de novo:

```bash
cd frontend
rm -rf node_modules/.vite
npm run dev -- --host 127.0.0.1 --port 4321
```

Playwright (`npm run test:e2e`) já limpa `node_modules/.vite` ao subir o frontend. `E2E_REUSE_API=1` não reutiliza o UI stale; só `E2E_REUSE_FRONTEND=1` reusa `127.0.0.1:4321`.

Da raiz do monorepo:

```bash
npm run frontend:dev
npm run frontend:build
```

## API proxy (dev)

`astro.config.mjs` encaminha `/api` e `/health` → `http://localhost:3000`. Suba o backend:

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

Tokens e regras globais: [frontend/design-system/MASTER.md](../../frontend/design-system/MASTER.md). Overrides por página em `frontend/design-system/pages/`. Índice documental: [design-system/README.md](../design-system/README.md).

## Cliente API (Eden Treaty)

`src/lib/api-client.ts` usa `@elysiajs/eden` com o tipo `App` exportado por `backend/apps/api`. Better Auth permanece em `src/lib/auth-client.ts`. Exemplo: `ApiHealthBadge` consulta `GET /health` via `api.health.get()`.


## Realtime (Owner dashboard)

`src/lib/realtime-client.ts` — `createRealtimeConnection(channels)` com fallback WS → SSE → poll (`credentials: include`).

`src/lib/useRealtimeConnection.ts` — hook React: `state`, `tier`, `lastEvent`, `events[]` (ring buffer 100).

`DashboardPage` no Owner shell (`/app`) assina `health.deps` + `dashboard.metrics` via `useRealtimeConnection`.

## Gráficos (Lightweight Charts)

Biblioteca: [`lightweight-charts`](https://tradingview.github.io/lightweight-charts/) v5 (TradingView).

| Componente | Caminho | Função |
| --- | --- | --- |
| `ChartPanel` | `src/components/dashboard/ChartPanel.tsx` | Wrapper React da API `createChart` + `LineSeries` |
| `LiveLineChart` | `src/components/dashboard/LiveLineChart.tsx` | Card com valor tabular, badge stale, skeleton e empty state |
| `ChartGrid` | `src/components/dashboard/ChartGrid.tsx` | Grid 2×2 de séries ao vivo |
| `DashboardPage` | `src/components/dashboard/DashboardPage.tsx` | Painel tempo real + grid de gráficos |

Payload `dashboard.metrics` inclui `series[]` com `{ id, name, unit, latest, changePct, points: [{ time, value }] }` (`time` = Unix segundos). Badge **Desatualizado** quando `envelope.stale === true`. Tema escuro via tokens OLED (`--color-surface`, `--color-accent`).


## Desenvolvimento local: login de teste

Após `bun run seed:dev` no backend:

| Campo | Valor |
| --- | --- |
| E-mail | `dev@anxionos.local` |
| Senha | valor de `DEV_SEED_PASSWORD` no `.env` do backend (padrão: `anxionos-dev-pass`) |

Use em `/login` para acessar `/app` (dashboard Owner com gráficos e painel realtime).

### E2E (Playwright)

```bash
# Terminal 1: backend + frontend (ou deixe o Playwright subir via webServer)
cd backend && bun run dev
cd frontend && npm run dev

# Seed + teste
cd backend && bun run seed:dev
npm run test:e2e
```

Em CI, o teste é ignorado se `DEV_SEED_PASSWORD` não estiver definido (stack completa opcional).

**Jornada institucional (ANX-35):** `e2e/institutional-journey.spec.ts` — login → seção Empresa (Agency UI) → `POST /v1/organizations/agencies` → `POST /v1/graph/traversal/neighbors` → dashboard realtime. O `webServer` do Playwright injeta `ORG_INVITE_TOKEN_PEPPER` e demais vars de dev (ver `playwright.config.ts`).

## P07 scope

Owner Console — Company Dashboard shell com placeholders (empresa, C-level agents, connections). Operator, Platform e Partner consoles entram em fases posteriores.

## 2FA TOTP (autenticador)

Fluxo com Better Auth + `react-qr-code` (URI `otpauth://` padrão RFC 6238).

### Configuração (`/mfa/setup`)

1. Usuário autenticado confirma a senha.
2. `authClient.twoFactor.enable({ password, method: "totp", issuer: "anxionOS" })` retorna `totpURI` e `backupCodes`.
3. QR code renderizado a partir de `totpURI`; chave manual com botão copiar.
4. Usuário escaneia no Google/Microsoft Authenticator (ou compatível) e informa o código de 6 dígitos.
5. `authClient.twoFactor.verifyTotp({ code })` ativa o 2FA → redireciona para `/app`.

### Login com 2FA (`/mfa`)

1. `signIn.email` retorna `twoFactorRedirect: true` quando 2FA está ativo.
2. Frontend redireciona para `/mfa?email=...`.
3. `authClient.twoFactor.verifyTotp({ code, trustDevice })` conclui o sign-in.
4. Alternativa: link **Usar código de recuperação** → `authClient.twoFactor.verifyBackupCode({ code, trustDevice })` com um dos códigos exibidos em `/mfa/setup` (formato `XXXXX-XXXXX`, uso único).

Compatível com Google Authenticator, Microsoft Authenticator, 1Password, Authy e demais apps TOTP.
